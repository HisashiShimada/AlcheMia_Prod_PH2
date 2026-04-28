# REPORT11: パブリックサブネットとプライベートサブネットの違い、および検証環境のセキュリティ上の問題点

- **作成日**: 2026-04-23
- **対象**: 検証環境（`ARCHITECTURE.md` Section 10 参照）
- **テーマ**: VPCサブネット設計・ECS Fargateタスクの配置・セキュリティリスク

---

## 1. パブリックサブネット vs プライベートサブネットの違い

| 比較項目 | パブリックサブネット | プライベートサブネット |
|---------|-----------------|------------------|
| インターネットゲートウェイ | ルートテーブルに **あり**（直接通信可能） | ルートテーブルに **なし** |
| MapPublicIp | **True**（リソースに自動でパブリックIPが付与される） | **False**（パブリックIPは付与されない） |
| 外部からの到達性 | SG が許可していれば**インターネットから直接到達可能** | インターネットから**直接到達不可**（VPC内からのみ到達可能） |
| 検証環境の配置リソース | NLBノード、ECS Fargate タスク（nginx/frontend） | Aurora インスタンス、ElastiCache ノード、踏み台EC2 |

**核心的な違い**：パブリックサブネットは「インターネットゲートウェイ経由でインターネットと直接通信できるサブネット」であり、プライベートサブネットは「インターネットと直接通信できないサブネット」です。

### 検証環境のサブネット構成（図3より）

```
VPC: vpc-037a0cb50e47092a0 (alchemia-staging-vpc)  CIDR: 10.1.0.0/16

  AZ: ap-northeast-1a                     AZ: ap-northeast-1c
  ┌─────────────────────────┐             ┌─────────────────────────┐
  │ パブリックサブネット      │             │ パブリックサブネット      │
  │ alchemia-public-1a      │             │ alchemia-public-1c      │
  │ 10.1.1.0/24             │             │ 10.1.2.0/24             │
  │ MapPublicIp: True       │             │ MapPublicIp: True       │
  │ 配置: NLBノード、         │             │ 配置: NLBノード、         │
  │       ECS Fargateタスク  │             │       ECS Fargateタスク  │
  │       (assignPublicIp   │             │       (assignPublicIp   │
  │        =ENABLED)        │             │        =ENABLED)        │
  └─────────────────────────┘             └─────────────────────────┘

  ┌─────────────────────────┐             ┌─────────────────────────┐
  │ プライベートサブネット    │             │ プライベートサブネット    │
  │ alchemia-private-1a     │             │ alchemia-private-1c     │
  │ 10.1.11.0/24            │             │ 10.1.12.0/24            │
  │ MapPublicIp: False      │             │ MapPublicIp: False      │
  │ 配置: Aurora、           │             │ 配置: Aurora、           │
  │       ElastiCache、      │             │       ElastiCache        │
  │       踏み台EC2          │             │                         │
  └─────────────────────────┘             └─────────────────────────┘
```

---

## 2. パブリックサブネットの ECS Fargate タスクの特定

**パブリックサブネットに配置されているのは `alchemia-nginx-service`（nginx/frontend タスク）です。**

図2のリソース設定値一覧より：

```
ECS nginx/frontend サービス（alchemia-nginx-service）:
  ・launchType=FARGATE
  ・assignPublicIp=ENABLED  ← パブリックIPが付与される → パブリックサブネット
  ・コンテナ: mmdpf-nginx(443/80) + mmdpf-frontend(3000)

ECS backend サービス（alchemia-backend-service）:
  ・launchType=FARGATE
  ・assignPublicIp=DISABLED ← パブリックIPなし → プライベートサブネット
  ・コンテナ: mmdpf-backend(3001)
```

| ECS サービス | コンテナ | サブネット種別 | assignPublicIp |
|------------|--------|-------------|---------------|
| `alchemia-nginx-service` | mmdpf-nginx + mmdpf-frontend | **パブリック** | ENABLED |
| `alchemia-backend-service` | mmdpf-backend | **プライベート** | DISABLED |

---

## 3. インターネットからの直接アクセス可否（セキュリティ問題）

**結論：検証環境では nginx/frontend タスクにインターネットから直接アクセス可能な状態です。⚠️**

図4のセキュリティグループを確認すると：

```
sg-08569630d4e399b60 (alchemia-nginx-sg / nginx+frontend ECS タスク用)
  インバウンド:
    TCP:80   0.0.0.0/0  ← インターネット全開放
    TCP:443  0.0.0.0/0  ← インターネット全開放 ⚠️
```

### セキュリティリスクの構造

```
インターネット
  │
  ├─ 正規ルート ─▶ NLB → nginx/frontend タスク
  │
  └─ ⚠️ 直接アクセス ─▶ nginx/frontend タスクのパブリックIPへ直接到達可能
                        （SG が 0.0.0.0/0 で全開放のため）
```

`assignPublicIp=ENABLED` によりタスクがパブリックIPを持ち、かつ SG が `0.0.0.0/0` で開放されているため、NLB を経由せずにインターネットから ECS タスクへ直接アクセスできてしまいます。

---

## 4. nginx タスクがパブリックサブネットに配置されている理由

**主因はコスト最適化（NAT Gateway 不要）のためです。NLBの存在は副次的な理由です。**

### 理由1：ECS Fargate タスクのアウトバウンド通信の確保（主因）

ECS Fargate タスクは起動・稼働時に以下のためにインターネットへの**アウトバウンド通信**が必要です：

- **ECR からコンテナイメージを Pull する**
- **CloudWatch Logs にログを送信する**
- **AWS API（SSM, Secrets Manager 等）を呼び出す**

このアウトバウンド通信を確保する方法は2つあります：

| 方法 | 設定 | コスト |
|-----|------|--------|
| ① パブリックサブネット + `assignPublicIp=ENABLED` | パブリックIPを直接持つ → インターネットゲートウェイ経由 | **安い（追加コストなし）** |
| ② プライベートサブネット + NAT Gateway | プライベートIPのみ → NAT Gateway 経由 | **高い（NAT GW は約 $30/月〜）** |

検証環境では **①のシンプル・安価な方法** を選択した結果、パブリックサブネットに配置されています。

### 理由2：NLB との関係（インバウンド・副次的）

NLB はパブリックサブネットに配置されていますが、NLB のターゲット（ECS タスク）は**プライベートサブネットでも技術的には到達可能**です（VPC 内 IP で転送できるため）。

ただし、理由1（アウトバウンド）のために nginx タスクが「パブリックサブネット + パブリックIP付き」の構成になった結果、NLB からの TCP:443 のインバウンドもそのまま受け取れる状態になっています。

### まとめ

```
nginx タスクがパブリックサブネットにある理由:

  ① アウトバウンド（主因）
     NAT Gateway を使わずに ECR/CloudWatch/AWS API へ
     アクセスするための最安構成
     → パブリックサブネット + assignPublicIp=ENABLED

  ② インバウンド（副次的）
     NLB → TCP:443 パススルー → nginx タスク へのルーティング
     （NLB はプライベートサブネットのタスクも対象にできるが、
       ①の理由で結果的にパブリックになった）

  ⚠️ 副作用
     パブリックIPを持つ + SG が 0.0.0.0/0 全開放 =
     インターネットから直接タスクへアクセス可能という
     セキュリティリスクが生じた
```

---

## 5. 本番環境での改善策（ARCHITECTURE.md Section 1〜5 より）

本番環境ではこの問題を以下の方法で解決しています：

```
【検証環境（問題あり）】
インターネット
  ├─ NLB → nginx/frontend タスク（パブリックIP + SG全開放）⚠️
  └─ 直接アクセス可能（SG が 0.0.0.0/0 のため）⚠️

【本番環境（改善後）】
インターネット
  └─ ALB のみ（HTTPS:443、mTLS検証）
       ├─ /api/* → backend タスク（プライベートサブネット）
       └─ /*     → frontend タスク（プライベートサブネット）

backend/frontend SG:
  TCP:3001/3000  alchemia-alb-sg のみ ← ALB以外からのアクセスを完全遮断
```

| 改善点 | 検証環境 | 本番環境 |
|--------|---------|---------|
| nginx タスクの有無 | あり（パブリックサブネット） | **廃止** |
| frontend タスクの配置 | nginx と同居（パブリック） | **独立サービス（プライベート）** |
| backend タスクの配置 | プライベート | プライベート（変更なし） |
| ECS タスクへの直接アクセス | 可能（SG 全開放）⚠️ | **不可（SG を ALB からのみに限定）** |
| アウトバウンド通信 | パブリックIP経由 | **NAT Gateway または VPC Endpoint 経由** |

---

## 参照

- `ARCHITECTURE.md` Section 1: 本番環境アーキテクチャ全体図
- `ARCHITECTURE.md` Section 5: セキュリティグループ設計
- `ARCHITECTURE.md` Section 10 図2: 検証環境リソース設定値一覧
- `ARCHITECTURE.md` Section 10 図3: VPC・サブネット構成（検証環境）
- `ARCHITECTURE.md` Section 10 図4: セキュリティグループ詳細（検証環境）

---

## 6. AWS CLI による追加調査結果（2026-04-23）

### 6.1 調査コマンドと結果

#### backend タスクが配置されているサブネットの確認

```bash
# タスク ARN 取得
aws ecs list-tasks --cluster alchemia-staging --service-name alchemia-backend-service --region ap-northeast-1
# → arn:aws:ecs:ap-northeast-1:137068252939:task/alchemia-staging/2a485ecd855a40e3a6b4fee65efb785f

# タスク詳細でサブネット確認
aws ecs describe-tasks --cluster alchemia-staging \
  --tasks arn:aws:ecs:ap-northeast-1:137068252939:task/alchemia-staging/2a485ecd855a40e3a6b4fee65efb785f \
  --region ap-northeast-1 \
  --query "tasks[*].attachments"
```

**結果:**
```
subnetId: subnet-0388f1051ba7b98ce
privateIPv4Address: 10.1.2.82
networkInterfaceId: eni-053cbd8000f19ec0e
```

#### サブネット種別の確認

```bash
aws ec2 describe-subnets --subnet-ids subnet-0388f1051ba7b98ce --region ap-northeast-1
```

**結果:**
```
SubnetId: subnet-0388f1051ba7b98ce
CidrBlock: 10.1.2.0/24
MapPublicIpOnLaunch: true
Tags: Name = alchemia-public-1c   ← パブリックサブネット
```

#### ルートテーブルの確認

```bash
aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=subnet-0388f1051ba7b98ce" \
  --region ap-northeast-1
```

**結果:**
```
10.1.0.0/16 → local
0.0.0.0/0   → igw-0744bf531576177f4   ← インターネットゲートウェイ直結
```

#### ENI のパブリックIP確認

```bash
aws ec2 describe-network-interfaces --network-interface-ids eni-053cbd8000f19ec0e --region ap-northeast-1
```

**結果:**
```
PrivateIpAddress: 10.1.2.82
Association.PublicIp: 13.115.91.45   ← パブリックIPが付いている
Association.IpOwnerId: amazon
```

#### NAT Gateway / VPC Endpoint の確認

```bash
aws ec2 describe-nat-gateways \
  --filter "Name=vpc-id,Values=vpc-037a0cb50e47092a0" "Name=state,Values=available" \
  --region ap-northeast-1
# → [] （NAT Gateway なし）

aws ec2 describe-vpc-endpoints \
  --filters "Name=vpc-id,Values=vpc-037a0cb50e47092a0" \
  --region ap-northeast-1
```

**結果:**
```
VpcEndpointId: vpce-0ee5195b5aa319aeb
ServiceName: com.amazonaws.ap-northeast-1.bedrock-runtime
State: available
VpcEndpointType: Interface

※ ECR / CloudWatch / S3 / SSM の VPC Endpoint は存在しない
```

---

### 6.2 調査結果まとめ

| 調査項目 | ARCHITECTURE.md の記載 | 実際の状態（調査結果） |
|---------|----------------------|-------------------|
| backend タスクのサブネット | プライベートサブネット | **パブリックサブネット（alchemia-public-1c）** ⚠️ |
| assignPublicIp | DISABLED | DISABLED（ECS設定値は DISABLED のまま） |
| 実際のパブリックIP | なし（想定） | **あり（13.115.91.45）** |
| パブリックIP付与の原因 | — | サブネットの `MapPublicIpOnLaunch: true` により ENI に自動付与 |
| アウトバウンド経路 | NAT GW / VPC Endpoint | **IGW 直接（パブリックIP経由）** |
| NAT Gateway | — | **なし** |
| VPC Endpoint | — | bedrock-runtime のみ（ECR/S3/SSM/CloudWatch は VPC Endpoint なし） |

---

### 6.3 アウトバウンド通信が機能している理由

**backend タスクが ECR からイメージを Pull できている理由：**

```
backend タスク（alchemia-public-1c に配置）
  PrivateIP: 10.1.2.82
  PublicIP:  13.115.91.45  ← MapPublicIpOnLaunch=true により ENI に自動付与
  ルートテーブル: 0.0.0.0/0 → igw-0744bf531576177f4

アウトバウンド経路:
  タスク（PublicIP: 13.115.91.45）
  → IGW（インターネットゲートウェイ）
  → ECR / CloudWatch / S3 / SSM
```

`assignPublicIp=DISABLED` はECSの設定値だが、**サブネットの `MapPublicIpOnLaunch: true` が ENI レベルで直接作用**し、パブリックIPが付与されている。その結果、IGW 経由でアウトバウンド通信が可能になっている。

---

### 6.4 ARCHITECTURE.md Section 10 との差異（修正点）

以下の記載が実態と異なっており、ARCHITECTURE.md の修正が必要：

1. **図1（アーキテクチャ全体図）**  
   `alchemia-backend-service` のブロックが「プライベートサブネット」の枠内に描かれているが、実際は **パブリックサブネット（alchemia-public-1c）** に配置されている。

2. **図2（リソース設定値一覧）**  
   `assignPublicIp=DISABLED` の記載はECS設定値としては正しいが、**サブネットの `MapPublicIpOnLaunch=true` により実際にはパブリックIPが付与される**ことを追記する必要がある。

3. **図3（VPC・サブネット構成）**  
   パブリックサブネットの「配置リソース」に `ECS Fargate タスク (assignPublicIp=ENABLED)` とのみ記載されているが、実際には **backend タスク（assignPublicIp=DISABLED だがパブリックIPを持つ）も配置されている**。プライベートサブネットには backend タスクは存在しない。

---

### 6.5 本番環境への影響

| リスク | 内容 |
|--------|------|
| ⚠️ セキュリティリスク | backend タスクもパブリックIPを持つため、SG設定次第でインターネットから直接アクセス可能 |
| ⚠️ 設計意図との乖離 | `assignPublicIp=DISABLED` の意図（プライベート配置）と実態が乖離している |
| ✅ 現時点での緩和策 | backend SG のインバウンドが nginx SG からのみに制限されていれば直接アクセスは防げている |
| 🔧 本番環境での対策 | ECS タスクをプライベートサブネットに移動（NAT Gateway または VPC Endpoint を追加） |

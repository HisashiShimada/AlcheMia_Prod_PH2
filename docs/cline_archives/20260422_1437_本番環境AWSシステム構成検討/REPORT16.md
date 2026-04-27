# REPORT16: Internet Gateway 調査レポート

**作成日時**: 2026-04-24 15:53  
**対象**: AWS Internet Gateway（インターネットゲートウェイ）の概要と動作確認方法

---

## 1. Internet Gateway（IGW）とは

**Internet Gateway（IGW）** は、AWS VPC（Virtual Private Cloud）とインターネットの間の通信を可能にする、AWSが提供するマネージドなネットワークコンポーネントです。

### 基本特性

| 項目 | 内容 |
|------|------|
| **配置場所** | VPCの境界上（VPCにアタッチする形で存在） |
| **管理** | AWSフルマネージド（冗長化・スケーリング不要） |
| **コスト** | IGW自体の使用料は無料（データ転送量は課金対象） |
| **水平スケーリング** | 自動で行われるため帯域制限なし |

### 主な機能

#### 双方向の通信を実現
- インターネット → VPC内のリソース（インバウンド通信）
- VPC内のリソース → インターネット（アウトバウンド通信）

#### NATの役割（パブリックサブネット向け）
- VPC内リソースの **プライベートIPアドレス** を、インターネットで使える **パブリックIPアドレス** に変換する
- これを **1:1 NAT（Network Address Translation）** と呼ぶ

---

## 2. 構成図における役割

```
インターネット
     ↓
Internet Gateway  ← VPCの入口（公開された窓口）
     ↓
ALB（Application Load Balancer）  ← パブリックサブネットに配置
     ↓
Fargate Container  ← プライベートサブネットに配置
```

1. 外部からのHTTPSリクエストがインターネットから来ると、まずInternet Gatewayを通過
2. IGWがパブリックIPをプライベートIPに変換してALBへ転送
3. ALBが各Fargateコンテナにリクエストを振り分ける

---

## 3. 類似サービスとの違い

| サービス | 用途 |
|---------|------|
| **Internet Gateway** | パブリックサブネットのリソースが**双方向**でインターネット通信するため |
| **NAT Gateway** | **プライベートサブネット**のリソースが**アウトバウンドのみ**インターネット通信するため |
| **VPC Endpoint** | インターネットを経由せず、AWSサービス（S3、ECRなど）と**内部通信**するため |

> 構成図右側に見える「ECR Endpoints」「S3 Endpoint」「DynamoDB Endpoint」はVPC Endpointであり、Internet Gatewayを通らずに直接AWSサービスへアクセスする仕組み。セキュリティ向上とデータ転送コスト削減に寄与する。

---

## 4. Internet Gatewayを有効化するために必要な設定

Internet Gatewayは自動では機能しない。以下の **3点セット** を明示的に設定する必要がある。

### 設定1: Internet GatewayをVPCにアタッチする
```
VPCコンソール → Internet Gateways → 作成 → VPCにアタッチ
```

### 設定2: パブリックサブネットのルートテーブルにIGWへのルートを追加する
```
送信先: 0.0.0.0/0  →  ターゲット: igw-xxxxxxxx
```
これがないと、パケットがIGWに向かわず、インターネットに出られない。

### 設定3: リソース（ALB等）にパブリックIPを付与する
ALBやEC2にパブリックIPが割り当てられていないと、外部から到達できない。

### 設定状態と通信可否

| 状況 | インターネット通信 |
|------|-----------------|
| IGWを作成・アタッチしていない | ❌ 不可 |
| IGWはあるがルートテーブル未設定 | ❌ 不可 |
| 全部設定済み | ✅ 可能 |

---

## 5. AWS CLIによるアタッチメント確認方法

### 方法1: すべてのIGWを一覧表示（最もシンプル）

```bash
aws ec2 describe-internet-gateways
```

出力例：
```json
{
    "InternetGateways": [
        {
            "InternetGatewayId": "igw-0abc12345678",
            "Attachments": [
                {
                    "State": "available",
                    "VpcId": "vpc-0xyz98765"
                }
            ],
            "Tags": [
                {
                    "Key": "Name",
                    "Value": "my-igw"
                }
            ]
        }
    ]
}
```

- `Attachments` の `State` が **`"available"`** → VPCにアタッチ済み
- `Attachments` が **空配列 `[]`** → どのVPCにもアタッチされていない

### 方法2: 特定のVPCのIGWだけを絞り込む

```bash
aws ec2 describe-internet-gateways \
  --filters "Name=attachment.vpc-id,Values=vpc-xxxxxxxxx"
```

### 方法3: VPC一覧を先に確認してからIGWを検索する

```bash
# まずVPCの一覧を確認
aws ec2 describe-vpcs \
  --query "Vpcs[*].{VpcId:VpcId,Name:Tags[?Key=='Name']|[0].Value,CIDR:CidrBlock}" \
  --output table
```

### 方法4: テーブル形式で見やすく表示

```bash
aws ec2 describe-internet-gateways \
  --query "InternetGateways[*].{IGW_ID:InternetGatewayId,VPC_ID:Attachments[0].VpcId,State:Attachments[0].State,Name:Tags[?Key=='Name']|[0].Value}" \
  --output table
```

---

## 6. IGWなしでWebシステムを公開できるケース

IGWが不要なケースも存在する。ただし、使えるアーキテクチャが限定される。

### IGWが不要なケース

#### パターンA: サーバーレス構成（CloudFront + API Gateway + Lambda）

```
インターネット
     ↓
CloudFront（CDN）
     ↓
API Gateway（フルマネージド）
     ↓
Lambda（サーバーレス）
     ↓
DynamoDB / S3
```

これらのサービスはVPCの外（AWSのグローバルネットワーク上）に存在するため、IGW不要。

#### パターンB: S3 + CloudFrontの静的サイト

```
インターネット → CloudFront → S3バケット
```

完全にIGW不要で静的Webサイトを公開できる。

### IGWが必須なケース

VPC内にALB + ECS/Fargateを配置する一般的なWebシステム構成ではIGWは必須。

```
インターネット → IGW（必須）→ ALB → ECS/Fargate
```

VPC内のリソースがパブリックIPを持ってインターネットと通信するには、IGWを通る以外の方法はない。

### アーキテクチャ別まとめ

| アーキテクチャ | IGW必要か | 備考 |
|-------------|---------|------|
| VPC内のALB + ECS/Fargate | **必須** | 一般的なWebシステム |
| CloudFront + API Gateway + Lambda | **不要** | サーバーレス構成 |
| S3静的サイト + CloudFront | **不要** | フロントエンドのみ |
| VPC内Lambda（VPCアタッチ）→外部公開 | **必要** | LambdaをVPCに入れた場合 |

> **覚え方**: 「サーバーレス構成ならIGW不要、コンテナ・サーバー構成ならIGW必要」

---

## 7. まとめ

- Internet Gatewayは、VPC内のリソースをインターネットに公開するための**必須のエントリーポイント**
- 自動では有効にならず、**VPCへのアタッチ ＋ ルートテーブル設定 ＋ パブリックIPの3点セット**が必要
- CloudFormationやTerraformを使うと自動設定されるため意識しにくいが、裏では必ず設定されている
- VPC内にコンテナ（ECS/Fargate）を配置する構成ではIGWは避けられない必須コンポーネント
- サーバーレス構成（CloudFront + API Gateway + Lambda）ではIGWを不要にすることができる

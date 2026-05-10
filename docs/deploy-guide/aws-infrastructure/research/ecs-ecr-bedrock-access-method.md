# REPORT13: ECSからECR/Bedrockへのアクセス方式比較

**作成日時**: 2026-04-24 11:04  
**対象**: 本番環境プライベートサブネットのECSタスクからECR/Bedrockへのアクセス方式  
**結論**: **方法2（VPC Interface Endpoint）を採用**

---

## 1. 概要

本番環境のプライベートサブネットに配置したECSタスクからECR/Bedrockにアクセスするには、以下の2つの方法があります。

```
方法1: ECS（プライベートサブネット）→ NAT Gateway → インターネット → ECR/Bedrock
方法2: ECS（プライベートサブネット）→ VPC Endpoint（PrivateLink）→ ECR/Bedrock
```

---

## 2. 方法1：NAT Gateway経由

### 仕組み

```
ECS Task（プライベートサブネット）
  ↓
NAT Gateway（パブリックサブネット）
  ↓
インターネットゲートウェイ（IGW）
  ↓
インターネット
  ↓
ECR / Bedrock（AWS Public Endpoint）
```

- NAT（Network Address Translation）Gatewayが、プライベートサブネット内のECSタスクのプライベートIPを**自身のパブリックIPに変換**してインターネットに送出する
- ECR/Bedrockはインターネット経由で公開されているAWSサービスのエンドポイントに到達する
- 通信は**インターネットを経由**するが、TLS暗号化によって保護される

### 必要なリソース

| リソース | 説明 |
|---------|------|
| NAT Gateway | パブリックサブネットに1つ以上配置 |
| Elastic IP | NAT Gatewayに割り当て（静的パブリックIP） |
| ルートテーブル | プライベートサブネット → NAT Gatewayへのルート |
| インターネットゲートウェイ | VPCに1つ（パブリックサブネット用） |

### メリット

✅ **設定がシンプル**
- ルートテーブルに1行追加するだけでほぼ設定完了
- Terraformやコンソールで数分で構築できる

✅ **汎用性が高い**
- AWSサービスだけでなく、**インターネット上の任意のエンドポイント**（外部API、npm registry、DockerHub等）にもアクセスできる

✅ **マルチAZ対応が容易**
- 各AZにNAT Gatewayを配置するだけ

✅ **IPの固定が可能**
- Elastic IPが固定されるため、送信元IPの制限（外部APIのIPホワイトリスト等）に対応しやすい

### デメリット

❌ **コストが高い**
- NAT Gateway自体の**時間課金**：約$0.062/時（AZごと）≒ 月約$45/AZ
- **データ処理コスト**：$0.062/GB（NAT Gatewayを通過するデータ量に比例）
- ECRのイメージpullはGB単位になるため、積み重なると高額になりやすい

❌ **セキュリティ的にインターネットを経由する**
- 通信はTLSで暗号化されているが、パケットが物理的にインターネットを通る
- 厳格なセキュリティ要件（金融・医療・政府系）では許容されないケースがある

❌ **帯域のボトルネックになりうる**
- 大量のECSタスクが同時にイメージpullを行うと、NAT Gatewayが集中点になる

---

## 3. 方法2：VPC Interface Endpoint（PrivateLink）経由

### 仕組み

```
ECS Task（プライベートサブネット）
  ↓
VPC Interface Endpoint（ENI：プライベートIP）
  ↓
AWS PrivateLink（AWSバックボーンネットワーク）
  ↓
ECR / Bedrock（AWSサービス）
```

- VPC内に**ENI（Elastic Network Interface）**が作成され、そのプライベートIPアドレスがAWSサービスのエンドポイントとして機能する
- 通信はAWSのバックボーンネットワーク内で完結し、**インターネットに出ない**
- ECSタスクからみると「VPC内のIPアドレスへの通信」として処理される

### ECRに必要な3つのエンドポイント

ECRは単一のエンドポイントでは動作せず、以下**3つすべて**が必要です：

| エンドポイント | サービス名 | 役割 |
|--------------|-----------|-----|
| `com.amazonaws.{region}.ecr.api` | ECR API | `docker pull`の認証・マニフェスト取得 |
| `com.amazonaws.{region}.ecr.dkr` | ECR Docker | イメージレイヤーのpull（Docker protocol） |
| `com.amazonaws.{region}.s3` | S3 Gateway | ECRのイメージレイヤーはS3に実際に保存されているため |

> ⚠️ S3は**Interface**ではなく**Gateway Endpoint**（無料）です。Interface EndpointとGateway Endpointは種類が異なります。

### Bedrockに必要なエンドポイント

| エンドポイント | サービス名 | 役割 |
|--------------|-----------|-----|
| `com.amazonaws.{region}.bedrock-runtime` | Bedrock Runtime | 推論API（InvokeModel等） |
| `com.amazonaws.{region}.bedrock` | Bedrock | モデル一覧・設定API（必要に応じて） |

### メリット

✅ **インターネットを経由しない（高セキュリティ）**
- 通信がAWS内で完結するため、外部への経路が不要
- セキュリティ監査・コンプライアンス要件を満たしやすい

✅ **データ転送コストの削減**
- NAT Gatewayのデータ処理費用（$0.062/GB）が不要
- 同一リージョン内のPrivateLink通信は低コスト（$0.01/GB程度）

✅ **レイテンシが低い**
- AWSバックボーン経由のため、インターネット経由より安定・高速

✅ **セキュリティグループで制御可能**
- EndpointのENIにセキュリティグループを設定し、アクセス元（ECSタスク）を明示的に制限できる

### デメリット

❌ **設定が複雑**
- ECR用だけで3つのエンドポイントが必要（ecr.api + ecr.dkr + s3）
- DNS設定（`enableDnsHostnames`、`enableDnsSupport`）の有効化が必要
- セキュリティグループの設定（ポート443許可）が必要

❌ **コストが発生する（Interface Endpointの時間課金）**
- Interface Endpoint：約$0.014/時/AZ ≒ 月約$10/エンドポイント/AZ
- 例：ECRで2エンドポイント × 2AZ = 月約$40（＋S3 Gateway Endpointは無料）
- 少量の転送量の場合、NAT Gatewayより高くなることも

❌ **インターネットアクセスを完全に代替できない**
- あくまでAWSサービスへのアクセスのみ
- 外部サービス（DockerHub、npm等）は別途NAT Gatewayが必要な場合がある

❌ **サービスごとにエンドポイントが必要**
- 使用するAWSサービス（ECR、Bedrock、Secrets Manager、CloudWatch等）ごとに追加が必要
- エンドポイント数が増えるとコスト・管理コストも増加

---

## 4. 総合比較表

| 比較項目 | NAT Gateway | VPC Interface Endpoint |
|---------|------------|----------------------|
| **設定の容易さ** | ⭐⭐⭐ 簡単 | ⭐ 複雑 |
| **セキュリティ** | △ インターネット経由 | ✅ AWS内で完結 |
| **初期コスト** | 低 | 中（エンドポイント数に依存） |
| **データ転送コスト** | 高（$0.062/GB） | 低（$0.01/GB程度） |
| **時間課金** | $0.062/時/AZ | $0.014/時/AZ/エンドポイント |
| **レイテンシ** | 普通 | 低い |
| **汎用性** | ✅ 任意の宛先 | AWSサービスのみ |
| **AWSサービス数が多い場合** | コスト有利 | エンドポイントが増えすぎる |
| **コンプライアンス** | △ | ✅ |

---

## 5. 本番環境での採用方針

**本番環境では VPC Interface Endpoint（方法2）を採用します。**

### 採用理由

1. **セキュリティ**: プライベートサブネットからインターネットへの経路を排除し、通信をAWS内に閉じる
2. **コンプライアンス**: 将来的な監査・認証取得を見据えたネットワーク設計
3. **コスト**: ECRのイメージpullやBedrockの推論通信はデータ量が多く、NAT Gatewayのデータ処理コストが積み重なる

### 必要なエンドポイント一覧

| エンドポイント | 種類 | 対象サービス | 料金 |
|--------------|------|------------|------|
| `ecr.api` | Interface | ECR API | 有料（$0.014/時/AZ） |
| `ecr.dkr` | Interface | ECR Docker（イメージpull） | 有料（$0.014/時/AZ） |
| `s3` | **Gateway** | S3（ECRレイヤー取得） | **無料** |
| `bedrock-runtime` | Interface | Bedrock 推論API | 有料（$0.014/時/AZ） |
| `secretsmanager` | Interface | Secrets Manager | 有料（$0.014/時/AZ） |
| `logs` | Interface | CloudWatch Logs | 有料（$0.014/時/AZ） |

### ベストプラクティス構成（ハイブリッド）

```
プライベートサブネット内 ECS Task
├── VPC Endpoint (ecr.api)       → ECR（コンテナイメージ取得）
├── VPC Endpoint (ecr.dkr)       → ECR（レイヤー取得）
├── VPC Endpoint (s3 Gateway)    → S3（ECRレイヤー＋アプリデータ）
├── VPC Endpoint (bedrock-runtime) → Bedrock（AI推論）
├── VPC Endpoint (secretsmanager)  → Secrets Manager（機密情報）
└── VPC Endpoint (logs)           → CloudWatch Logs（ログ送信）
```

---

## 6. 参考コスト試算（2AZ構成・月額）

### NAT Gateway 方式
- NAT Gateway時間課金: $0.062 × 24h × 30日 × 2AZ ≒ **$89.3/月**
- データ処理（仮: ECRpull 50GB/月 + Bedrock 10GB/月）: $0.062 × 60GB ≒ **$3.7/月**
- **合計: 約$93/月**

### VPC Interface Endpoint 方式
- Interface Endpoint (ecr.api + ecr.dkr + bedrock + secretsmanager + logs = 5本 × 2AZ):  
  $0.014 × 24h × 30日 × 5 × 2AZ ≒ **$100.8/月**
- S3 Gateway Endpoint: **$0/月**
- PrivateLinkデータ処理: $0.01 × 60GB ≒ **$0.6/月**
- **合計: 約$101/月**

> 📝 コスト単体では大きな差はありませんが、データ転送量が増えるほどVPC Endpoint方式が有利になります。また、セキュリティ・コンプライアンス面での優位性が本採用の主な理由です。

---

*作成: Cline（2026-04-24）*

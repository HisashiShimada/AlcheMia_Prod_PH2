# REPORT14: AWS サービス配置に関する調査・修正レポート

## 調査日時
2026-04-24

## 調査の背景

`production-architecture.drawio` において、Aurora PostgreSQL と ElastiCache Redis が VPC 内に配置されていることへの疑問、および AWS Secrets Manager / Amazon CloudWatch の VPC 内配置の妥当性について調査を行った。

---

## 1. Aurora PostgreSQL / ElastiCache Redis の VPC 内配置について

### 結論：正しい配置である

Aurora PostgreSQL と ElastiCache Redis は **VPC 内リソース（サブネット配置が必須のサービス）** であり、VPC の枠内に配置されていることは正確な表現である。

### 理由

AWS のサービスには大きく 2 種類の性質がある。

| 性質 | 代表サービス | VPC との関係 |
|------|------------|------------|
| **VPC 内リソース**（サブネットに ENI を持つ） | Aurora, ElastiCache, EC2, ECS Fargate | VPC のサブネット内に配置。プライベート IP を持ち、セキュリティグループで制御 |
| **リージョンサービス**（VPC 外のフルマネージド） | S3, ECR, Bedrock, Secrets Manager, CloudWatch | AWS の内部ネットワーク上に存在。VPC から接続するには VPC Endpoint が必要 |

Aurora PostgreSQL と ElastiCache Redis は以下の理由で VPC 内に配置される。

- **Aurora** → `DBSubnetGroup` を指定してデプロイ → VPC 内のサブネットに ENI（ネットワークインターフェース）が作成される
- **ElastiCache** → `CacheSubnetGroup` を指定してデプロイ → 同様に VPC 内のサブネットに ENI が作成される

これらは S3 や ECR のような「AWS がホストするリージョン全体のサービス」ではなく、**「お客様の VPC 内に配置されるマネージドサービス」** である。

---

## 2. AWS Secrets Manager / Amazon CloudWatch の配置について

### 結論：VPC 内への配置は誤りであった

AWS Secrets Manager と Amazon CloudWatch は **VPC 外のリージョンサービス** であり、VPC の枠内に描かれていたことは構成図の誤りである。

### 正しい分類

| サービス | 実際の性質 | VPC 内に ENI を持つか | VPC からのアクセス方法 |
|---------|-----------|---------------------|----------------------|
| Aurora PostgreSQL | VPC 内リソース | ✅ 持つ（サブネット配置必須） | 直接 TCP/5432 |
| ElastiCache Redis | VPC 内リソース | ✅ 持つ（サブネット配置必須） | 直接 TCP/6379 |
| **Secrets Manager** | **VPC 外リージョンサービス** | ❌ 持たない | VPC Interface Endpoint 経由 |
| **Amazon CloudWatch** | **VPC 外リージョンサービス** | ❌ 持たない | VPC Interface Endpoint 経由 |

### なぜ VPC Endpoint が必要なのか

Secrets Manager・CloudWatch は S3・ECR・Bedrock と同様に VPC の外側に存在するリージョンサービスである。  
VPC 外のサービスだからこそ VPC Endpoint が必要となる。

構成図の `secrets-manager` / `cloudwatch` ボックスのコメントにも以下のように明記されていた。

```
VPC Interface Endpoint 経由でアクセス
```

これはまさに「VPC 外サービスへの接続手段として Endpoint が必要」であることを意味しており、VPC 内リソースであれば Endpoint は不要である。

### VPC Endpoint の ENI についての補足

VPC Interface Endpoint を作成すると、**Endpoint 自体の ENI が VPC のサブネット内に配置** される。これは Secrets Manager へのアクセス「窓口」が VPC 内に作られるイメージである。しかし **Secrets Manager 本体** は VPC 外にあり、その窓口（Endpoint の ENI）だけが VPC 内に存在する。

---

## 3. 修正内容（drawio ファイル）

### 修正前の問題

| 要素 | 修正前の配置 | 問題 |
|------|------------|------|
| `secrets-manager` | VPC 内（`parent="vpc"`） | VPC 外リージョンサービスなのに VPC 内に配置 |
| `cloudwatch` | VPC 内（`parent="vpc"`） | 同上 |

### 修正後の配置

| 要素 | 修正後の配置 |
|------|------------|
| `secrets-manager` | 「外部 AWS サービス（VPC 外）」エリア内 |
| `cloudwatch` | 「外部 AWS サービス（VPC 外）」エリア内 |

### 追加した接続矢印

修正に合わせて、VPC Endpoint から外部サービスへの接続矢印を追加。

- `ep-secretsmanager` → `secrets-manager`（AWSバックボーン経由、破線）
- `ep-logs` → `cloudwatch`（AWSバックボーン経由、破線）

---

## 4. 正しいサービス分類まとめ

```
VPC 内に物理的に存在（サブネット配置が必須）
  → ECS Fargate タスク
  → Aurora PostgreSQL    ✅ VPC 内（正しい）
  → ElastiCache Redis    ✅ VPC 内（正しい）
  → VPC Endpoints（ENI として VPC 内サブネットに配置される）

VPC 外の AWS 管理インフラ上に存在（VPC Endpoint でプライベート接続）
  → Amazon S3            ✅ VPC 外（正しい）
  → Amazon ECR           ✅ VPC 外（正しい）
  → AWS Bedrock          ✅ VPC 外（正しい）
  → AWS Secrets Manager  ❌ VPC 内に配置されていた → 修正済み
  → Amazon CloudWatch    ❌ VPC 内に配置されていた → 修正済み
```

---

## 5. 関連ファイル

- `docs/20260422_1437_本番環境AWSシステム構成検討/production-architecture.drawio` — 構成図（修正済み）
- `scripts/fix_drawio_vpc_placement.js` — drawio 修正スクリプト

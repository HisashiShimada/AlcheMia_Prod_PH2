# Aurora PostgreSQL + pgvector 構築手順（AWS CLI版）

## 前提条件

- AWS CLI がインストール済みであること
- AWS CLI の認証情報が設定済みであること

---

## 事前確認

```bash
# AWS CLI のバージョン確認
aws --version

# 認証情報と接続確認
aws sts get-caller-identity

# 利用可能な Aurora PostgreSQL バージョンの確認（任意）
aws rds describe-db-engine-versions \
  --engine aurora-postgresql \
  --region ap-northeast-1 \
  --query 'DBEngineVersions[*].EngineVersion'
```

---

## STEP 1: DBサブネットグループの確認・作成

### 1-1. 既存のDBサブネットグループを確認

```bash
aws rds describe-db-subnet-groups \
  --region ap-northeast-1 \
  --query 'DBSubnetGroups[*].{Name:DBSubnetGroupName,VPC:VpcId,Status:SubnetGroupStatus}' \
  --output table
```

**出力例（存在する場合）：**
```
---------------------------------------------------------------------------
|                       DescribeDBSubnetGroups                            |
+-------------------------------------------+-----------+----------------+
|                   Name                    |  Status   |     VPC        |
+-------------------------------------------+-----------+----------------+
|  alchemia-staging-db-subnet-group         | Complete  | vpc-xxxxxxxxxx |
+-------------------------------------------+-----------+----------------+
```

特定のサブネットグループ名で絞り込みたい場合：

```bash
aws rds describe-db-subnet-groups \
  --db-subnet-group-name alchemia-staging-db-subnet-group \
  --region ap-northeast-1 \
  --query 'DBSubnetGroups[0].{Name:DBSubnetGroupName,VPC:VpcId,Status:SubnetGroupStatus}'
```

> ⚠️ 存在しない場合は以下のエラーが返ります：
> `An error occurred (DBSubnetGroupNotFoundFault) when calling the DescribeDBSubnetGroups operation`
> → エラーが出た場合は **1-2 へ進んで作成**してください。

### 1-2. DBサブネットグループの作成（未作成の場合のみ）

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name alchemia-staging-db-subnet-group \
  --db-subnet-group-description "Alchemia Staging DB Subnet Group" \
  --subnet-ids <alchemia-db-1aのSubnetId> <alchemia-db-1cのSubnetId> \
  --region ap-northeast-1
```

> 💡 SubnetId の確認方法（忘れた場合）：
> ```bash
> aws ec2 describe-subnets \
>   --region ap-northeast-1 \
>   --query 'Subnets[*].{SubnetId:SubnetId,Name:Tags[?Key==`Name`].Value|[0],CIDR:CidrBlock}' \
>   --output table
> ```

---

## STEP 2: パラメータグループ・セキュリティグループの準備

### 2-1. パラメータグループ作成

```bash
aws rds create-db-cluster-parameter-group \
  --db-cluster-parameter-group-name alchemia-aurora-pg15-params \
  --db-parameter-group-family aurora-postgresql15 \
  --description "Alchemia Aurora PostgreSQL 15 params with pgvector" \
  --region ap-northeast-1
```

> ⚠️ **pgvector は `shared_preload_libraries` への設定は不要です。**
>
> Aurora PostgreSQL の `shared_preload_libraries` に設定できる拡張機能は
> `pgaudit`, `pg_stat_statements`, `pg_cron` など、サーバー起動時に共有ライブラリを
> 事前ロードする必要があるものに限られており、pgvector はその対象外です。
>
> pgvector は Aurora PostgreSQL に組み込み済みのため、**STEP 7** の
> `CREATE EXTENSION IF NOT EXISTS vector;` を実行するだけで有効化できます。

### 2-2. 既存のセキュリティグループを確認

```bash
aws ec2 describe-security-groups \
  --region ap-northeast-1 \
  --filters "Name=group-name,Values=alchemia-rds-sg" \
  --query 'SecurityGroups[*].{GroupId:GroupId,GroupName:GroupName,VPC:VpcId}' \
  --output table
```

- **出力があれば** → `GroupId`（例: `sg-0abc1234def56789`）を控えて **STEP 3 へ進む**
- **出力が空なら** → **2-3 へ進んで作成**する

### 2-3. セキュリティグループの作成（未作成の場合のみ）

まず VPC ID を確認します：

```bash
aws ec2 describe-vpcs \
  --region ap-northeast-1 \
  --query 'Vpcs[*].{VpcId:VpcId,Name:Tags[?Key==`Name`].Value|[0],CIDR:CidrBlock}' \
  --output table
```

確認した VPC ID を使って RDS 用セキュリティグループを作成します：

```bash
aws ec2 create-security-group \
  --group-name alchemia-rds-sg \
  --description "Security group for Alchemia Aurora RDS" \
  --vpc-id <上で確認したVpcId> \
  --region ap-northeast-1
```

**出力例：**
```json
{
    "GroupId": "sg-0abc1234def56789"
}
```

> 💡 作成直後はインバウンドルールが空の状態で問題ありません。
> ECS タスクや踏み台 EC2 からの接続許可は **STEP 6** で追加します。

---

## STEP 3: Aurora DBクラスターの作成

```bash
aws rds create-db-cluster \
  --db-cluster-identifier alchemia-staging-aurora \
  --engine aurora-postgresql \
  --engine-version 15.4 \
  --master-username maiml_user \
  --master-user-password "YOUR_STRONG_PASSWORD" \
  --database-name maiml_db \
  --db-subnet-group-name alchemia-staging-db-subnet-group \
  --vpc-security-group-ids <alchemia-rds-sgのGroupId> \
  --db-cluster-parameter-group-name alchemia-aurora-pg15-params \
  --storage-encrypted \
  --region ap-northeast-1
```

> 💡 **パスワードについて**
>
> `--master-user-password` は Aurora PostgreSQL のマスターユーザー（`maiml_user`）のパスワードです。
> ここで設定した値が、アプリケーションの **`DB_PASSWORD`** 環境変数に対応します。
>
> - **ECS タスク定義** (`aws/ecs-task-definition-alchemia-backend.json`) の `DB_PASSWORD` に同じ値を設定してください
> - **`.env`** を使用する場合は `.env.prod.aws.example` の `DB_PASSWORD` に設定してください
>
> ⚠️ 推測されにくい強力なパスワードを設定してください（例: `openssl rand -base64 32` で生成）

---

## STEP 4: Aurora DBインスタンスの作成

```bash
aws rds create-db-instance \
  --db-instance-identifier alchemia-staging-aurora-instance-1 \
  --db-cluster-identifier alchemia-staging-aurora \
  --engine aurora-postgresql \
  --db-instance-class db.t3.medium \
  --region ap-northeast-1
```

---

## STEP 5: 作成完了の待機・エンドポイント確認

```bash
# ステータスが "available" になるまで繰り返し確認（約10〜15分）
aws rds describe-db-clusters \
  --db-cluster-identifier alchemia-staging-aurora \
  --region ap-northeast-1 \
  --query 'DBClusters[0].{Status:Status,Endpoint:Endpoint,Port:Port}'
```

**出力例（完了時）：**
```json
{
    "Status": "available",
    "Endpoint": "alchemia-staging-aurora.cluster-xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com",
    "Port": 5432
}
```

---

## STEP 6: セキュリティグループにインバウンドルール追加

### 6-1. alchemia-ecs-sg の GroupId を確認する

`alchemia-ecs-sg` は、**ECS Fargate タスク（`alchemia-backend-service`）に紐付けられたセキュリティグループ**です。

```
[ECS Fargate タスク]          [Aurora RDS]
alchemia-backend-service  →  alchemia-staging-aurora
  ↑ このタスクに付いている SG     ↑ このSGのインバウンドに許可追加
= alchemia-ecs-sg の GroupId     = alchemia-rds-sg の GroupId
```

**方法1: ECS サービスに紐付いている SG を確認**（ECS サービスが作成済みの場合）

```bash
aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-backend-service \
  --region ap-northeast-1 \
  --query 'services[0].networkConfiguration.awsvpcConfiguration.securityGroups'
```

**方法2: SG 名で直接検索**

```bash
aws ec2 describe-security-groups \
  --region ap-northeast-1 \
  --filters "Name=group-name,Values=alchemia-ecs-sg" \
  --query 'SecurityGroups[*].{GroupId:GroupId,GroupName:GroupName,VPC:VpcId}' \
  --output table
```

> ⚠️ **ECS サービスがまだ未作成の場合**
>
> `alchemia-ecs-sg` 自体がまだ存在しない可能性があります。その場合は先に作成し、
> ECS サービス作成時にも同じ SG を指定してください。
>
> ```bash
> # ECS タスク用 SG を作成（未作成の場合のみ）
> aws ec2 create-security-group \
>   --group-name alchemia-ecs-sg \
>   --description "Security group for Alchemia ECS Tasks" \
>   --vpc-id <上で確認したVpcId> \
>   --region ap-northeast-1
> ```
>
> **出力例：**
> ```json
> {
>     "GroupId": "sg-0yyy9999zzz88888"
> }
> ```
> 出力された `GroupId` を控えておいてください。

### 6-2. インバウンドルールを追加する

```bash
# ECSタスクのSGからのアクセスを許可
aws ec2 authorize-security-group-ingress \
  --group-id <alchemia-rds-sgのGroupId> \
  --protocol tcp \
  --port 5432 \
  --source-group <alchemia-ecs-sgのGroupId> \
  --region ap-northeast-1

# 踏み台EC2のSGからのアクセスを許可（管理用）
aws ec2 authorize-security-group-ingress \
  --group-id <alchemia-rds-sgのGroupId> \
  --protocol tcp \
  --port 5432 \
  --source-group <踏み台EC2のセキュリティグループId> \
  --region ap-northeast-1
```

---

## STEP 7: 踏み台EC2からpsqlで接続 → pgvector拡張機能を有効化

```bash
# 踏み台EC2にSSHログイン
ssh -i your-key.pem ec2-user@<踏み台EC2のパブリックIP>

# psqlインストール（未インストールの場合）
sudo yum install -y postgresql15

# Aurora に接続して pgvector を有効化
PGPASSWORD='YOUR_STRONG_PASSWORD' psql \
  -h alchemia-staging-aurora.cluster-xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com \
  -p 5432 \
  -U maiml_user \
  -d maiml_db \
  --set=sslmode=require \
  -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 有効化の確認
PGPASSWORD='YOUR_STRONG_PASSWORD' psql \
  -h alchemia-staging-aurora.cluster-xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com \
  -p 5432 \
  -U maiml_user \
  -d maiml_db \
  --set=sslmode=require \
  -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

---

## STEP 8: ECSタスク定義への反映

Aurora 作成後、得られたエンドポイントを ECS タスク定義に設定します。

`aws/ecs-task-definition-alchemia-backend.json` を編集：

```json
{ "name": "DB_HOST",     "value": "alchemia-staging-aurora.cluster-xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com" },
{ "name": "DB_PASSWORD", "value": "YOUR_STRONG_PASSWORD" },
{ "name": "DB_NAME",     "value": "maiml_db" },
{ "name": "DB_USER",     "value": "maiml_user" },
{ "name": "DB_SSL",      "value": "true" }
```

---

## 手順まとめ

| STEP | 内容 | 備考 |
|------|------|------|
| 事前確認 | AWS CLI 認証確認 | `aws sts get-caller-identity` |
| STEP 1-1 | DBサブネットグループの存在確認 | 既存の場合は1-2をスキップ |
| STEP 1-2 | DBサブネットグループ作成 | 未作成の場合のみ |
| STEP 2-1 | パラメータグループ作成 | pgvectorはshared_preload_libraries設定不要 |
| STEP 2-2 | セキュリティグループの存在確認 | 既存の場合は2-3をスキップ |
| STEP 2-3 | セキュリティグループ作成 | 未作成の場合のみ。インバウンドルールはSTEP 6で追加 |
| STEP 3 | Aurora DBクラスター作成 | パラメータグループ・SGを指定 |
| STEP 4 | Aurora DBインスタンス作成 | クラスターにアタッチ |
| STEP 5 | 作成完了・エンドポイント確認 | `available` になるまで待機（約10〜15分） |
| STEP 6 | セキュリティグループ設定 | ECS・踏み台からのアクセス許可 |
| STEP 7 | pgvector 拡張機能の有効化 | 踏み台経由でSQL実行 |
| STEP 8 | ECSタスク定義への反映 | エンドポイント・パスワードを設定 |

---

## 作成後の接続情報（記録用）

Aurora 作成完了後、以下の情報を記録してください：

| 項目 | 値 |
|------|-----|
| クラスターエンドポイント | `alchemia-staging-aurora.cluster-xxxxxx.ap-northeast-1.rds.amazonaws.com` |
| ポート | `5432` |
| データベース名 | `maiml_db` |
| ユーザー名 | `maiml_user` |
| パスワード | （設定した値） |

---

## 参考: AWS CLI のインストール・認証設定

### AWS CLI インストール（Windows）

1. 下記URLからインストーラーをダウンロードして実行
   ```
   https://awscli.amazonaws.com/AWSCLIV2.msi
   ```

2. インストール確認
   ```bash
   aws --version
   ```

### 認証情報の設定

```bash
aws configure
# AWS Access Key ID: <アクセスキーID>
# AWS Secret Access Key: <シークレットアクセスキー>
# Default region name: ap-northeast-1
# Default output format: json
```

### 設定済みかどうかの確認

```bash
# 設定値の確認（キーはマスク表示）
aws configure list

# 有効性の確認（AWSへの接続テスト）
aws sts get-caller-identity
```

# ElastiCache for Redis 構築手順（AWS CLI版）

## 前提条件

- AWS CLI がインストール済みであること
- AWS CLI の認証情報が設定済みであること
- VPC・サブネット（`alchemia-db-1a` / `alchemia-db-1c`）が作成済みであること

---

## 事前確認

```bash
# AWS CLI のバージョン確認
aws --version

# 認証情報と接続確認
aws sts get-caller-identity

# 利用可能な Redis バージョンの確認（任意）
aws elasticache describe-cache-engine-versions \
  --engine redis \
  --region ap-northeast-1 \
  --query 'CacheEngineVersions[*].EngineVersion' \
  --output table
```

---

## STEP 1: キャッシュサブネットグループの確認・作成

### 1-1. 既存のキャッシュサブネットグループを確認

```bash
aws elasticache describe-cache-subnet-groups \
  --region ap-northeast-1 \
  --query 'CacheSubnetGroups[*].{Name:CacheSubnetGroupName,VPC:VpcId,Status:SubnetGroupStatus}' \
  --output table
```

**出力例（存在する場合）：**
```
------------------------------------------------------------------------
|                    DescribeCacheSubnetGroups                         |
+----------------------------------------+-----------+----------------+
|                   Name                 |  Status   |     VPC        |
+----------------------------------------+-----------+----------------+
|  alchemia-cache-subnet-group           | Complete  | vpc-xxxxxxxxxx |
+----------------------------------------+-----------+----------------+
```

特定のサブネットグループ名で絞り込みたい場合：

```bash
aws elasticache describe-cache-subnet-groups \
  --cache-subnet-group-name alchemia-cache-subnet-group \
  --region ap-northeast-1 \
  --query 'CacheSubnetGroups[0].{Name:CacheSubnetGroupName,VPC:VpcId,Status:SubnetGroupStatus}'
```

> ⚠️ 存在しない場合は以下のエラーが返ります：
> `An error occurred (CacheSubnetGroupNotFoundFault) when calling the DescribeCacheSubnetGroups operation`
> → エラーが出た場合は **1-2 へ進んで作成**してください。

### 1-2. キャッシュサブネットグループの作成（未作成の場合のみ）

> 💡 SubnetId の確認方法（忘れた場合）：
> ```bash
> aws ec2 describe-subnets \
>   --region ap-northeast-1 \
>   --query 'Subnets[*].{SubnetId:SubnetId,Name:Tags[?Key==`Name`].Value|[0],CIDR:CidrBlock,AZ:AvailabilityZone}' \
>   --output table
> ```
> `alchemia-db-1a` と `alchemia-db-1c` の SubnetId を確認してください。

```bash
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name alchemia-cache-subnet-group \
  --cache-subnet-group-description "Alchemia Staging Cache Subnet Group" \
  --subnet-ids <alchemia-db-1aのSubnetId> <alchemia-db-1cのSubnetId> \
  --region ap-northeast-1
```

---

## STEP 2: セキュリティグループの確認・作成

### 2-1. 既存のセキュリティグループを確認

```bash
aws ec2 describe-security-groups \
  --region ap-northeast-1 \
  --filters "Name=group-name,Values=alchemia-redis-sg" \
  --query 'SecurityGroups[*].{GroupId:GroupId,GroupName:GroupName,VPC:VpcId}' \
  --output table
```

- **出力があれば** → `GroupId`（例: `sg-0abc1234def56789`）を控えて **STEP 3 へ進む**
- **出力が空なら** → **2-2 へ進んで作成**する

### 2-2. セキュリティグループの作成（未作成の場合のみ）

まず VPC ID を確認します：

```bash
aws ec2 describe-vpcs \
  --region ap-northeast-1 \
  --query 'Vpcs[*].{VpcId:VpcId,Name:Tags[?Key==`Name`].Value|[0],CIDR:CidrBlock}' \
  --output table
```

確認した VPC ID を使って Redis 用セキュリティグループを作成します：

```bash
aws ec2 create-security-group \
  --group-name alchemia-redis-sg \
  --description "Security group for Alchemia ElastiCache Redis" \
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
> ECS タスクや踏み台 EC2 からの接続許可は **STEP 5** で追加します。

---

## STEP 3: ElastiCache Redis クラスター（Replication Group）の作成

> 💡 **認証トークン（パスワード）について**
>
> `--auth-token` は Redis の認証パスワードです。
> ここで設定した値が、アプリケーションの **`REDIS_PASSWORD`** 環境変数に対応します。
>
> - **ECS タスク定義** (`aws/ecs-task-definition-alchemia-backend.json`) の `REDIS_PASSWORD` に同じ値を設定してください
> - 最低16文字以上の英数字で構成してください
>
> ⚠️ 推測されにくい強力なパスワードを設定してください（例: `openssl rand -hex 32` で生成）

```bash
aws elasticache create-replication-group \
  --replication-group-id alchemia-staging-redis \
  --replication-group-description "Alchemia Staging Redis" \
  --engine redis \
  --engine-version 7.1 \
  --cache-node-type cache.t3.small \
  --num-cache-clusters 1 \
  --cache-subnet-group-name alchemia-cache-subnet-group \
  --security-group-ids <alchemia-redis-sgのGroupId> \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --auth-token "YOUR_STRONG_REDIS_PASSWORD" \
  --region ap-northeast-1
```

> ℹ️ **パラメータの説明**
>
> | パラメータ | 値 | 説明 |
> |---|---|---|
> | `--cache-node-type` | `cache.t3.small` | 検証環境向けの小〜中規模インスタンス |
> | `--num-cache-clusters` | `1` | シングルノード（検証用。本番は2以上推奨） |
> | `--at-rest-encryption-enabled` | - | 保存データの暗号化（推奨） |
> | `--transit-encryption-enabled` | - | 通信の暗号化・TLS。`--auth-token` 指定には必須 |
> | `--auth-token` | パスワード文字列 | Redisの認証パスワード |

---

## STEP 4: 作成完了の待機・エンドポイント確認

```bash
# ステータスが "available" になるまで繰り返し確認（約5〜10分）
aws elasticache describe-replication-groups \
  --replication-group-id alchemia-staging-redis \
  --region ap-northeast-1 \
  --query 'ReplicationGroups[0].{Status:Status,Endpoint:NodeGroups[0].PrimaryEndpoint.Address,Port:NodeGroups[0].PrimaryEndpoint.Port}'
```

**出力例（作成中）：**
```json
{
    "Status": "creating",
    "Endpoint": null,
    "Port": null
}
```

**出力例（完了時）：**
```json
{
    "Status": "available",
    "Endpoint": "alchemia-staging-redis.xxxxxx.ng.0001.apne1.cache.amazonaws.com",
    "Port": 6379
}
```

> 💡 エンドポイントが表示されたら控えておいてください。STEP 7 で使用します。

---

## STEP 5: セキュリティグループにインバウンドルール追加

### 5-1. alchemia-ecs-sg の GroupId を確認する

`alchemia-ecs-sg` は、**ECS Fargate タスク（`alchemia-backend-service`）に紐付けられたセキュリティグループ**です。

```
[ECS Fargate タスク]          [ElastiCache Redis]
alchemia-backend-service  →  alchemia-staging-redis
  ↑ このタスクに付いている SG     ↑ このSGのインバウンドに許可追加
= alchemia-ecs-sg の GroupId     = alchemia-redis-sg の GroupId
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

### 5-2. インバウンドルールを追加する

```bash
# ECSタスクのSGからのアクセスを許可
aws ec2 authorize-security-group-ingress \
  --group-id <alchemia-redis-sgのGroupId> \
  --protocol tcp \
  --port 6379 \
  --source-group <alchemia-ecs-sgのGroupId> \
  --region ap-northeast-1

# 踏み台EC2のSGからのアクセスを許可（管理用・接続確認用）
aws ec2 authorize-security-group-ingress \
  --group-id <alchemia-redis-sgのGroupId> \
  --protocol tcp \
  --port 6379 \
  --source-group <踏み台EC2のセキュリティグループId> \
  --region ap-northeast-1
```

> 💡 踏み台EC2のセキュリティグループIDの確認方法：
> ```bash
> aws ec2 describe-instances \
>   --region ap-northeast-1 \
>   --filters "Name=tag:Name,Values=*bastion*" \
>   --query 'Reservations[*].Instances[*].{InstanceId:InstanceId,SG:SecurityGroups[0].GroupId,Name:Tags[?Key==`Name`].Value|[0]}' \
>   --output table
> ```

---

## STEP 6: 踏み台EC2からRedisへの接続確認

```bash
# 踏み台EC2にSSHログイン
ssh -i your-key.pem ec2-user@<踏み台EC2のパブリックIP>

# redis-cli のインストール（未インストールの場合）
# ※ Amazon Linux 2023 では "redis" というパッケージ名は存在しないため、バージョン付きで指定する
sudo dnf install -y redis6

# Redis に接続（TLS + 認証トークンあり）
redis-cli \
  -h alchemia-staging-redis.xxxxxx.ng.0001.apne1.cache.amazonaws.com \
  -p 6379 \
  --tls \
  -a "YOUR_STRONG_REDIS_PASSWORD" \
  ping
```

**期待レスポンス：**
```
PONG
```

**接続確認コマンド（追加）：**

```bash
# Redis のバージョン確認
redis-cli \
  -h alchemia-staging-redis.xxxxxx.ng.0001.apne1.cache.amazonaws.com \
  -p 6379 \
  --tls \
  -a "YOUR_STRONG_REDIS_PASSWORD" \
  info server | grep redis_version

# キーの読み書きテスト
redis-cli \
  -h alchemia-staging-redis.xxxxxx.ng.0001.apne1.cache.amazonaws.com \
  -p 6379 \
  --tls \
  -a "YOUR_STRONG_REDIS_PASSWORD" \
  set test-key "hello"

redis-cli \
  -h alchemia-staging-redis.xxxxxx.ng.0001.apne1.cache.amazonaws.com \
  -p 6379 \
  --tls \
  -a "YOUR_STRONG_REDIS_PASSWORD" \
  get test-key
# 期待レスポンス: "hello"
```

---

## STEP 7: ECSタスク定義への反映

ElastiCache 作成後、得られたエンドポイントを ECS タスク定義に設定します。

`aws/ecs-task-definition-alchemia-backend.json` を編集：

```json
{ "name": "REDIS_HOST",     "value": "alchemia-staging-redis.xxxxxx.ng.0001.apne1.cache.amazonaws.com" },
{ "name": "REDIS_PORT",     "value": "6379" },
{ "name": "REDIS_PASSWORD", "value": "YOUR_STRONG_REDIS_PASSWORD" }
```

> ⚠️ `REDIS_PASSWORD` は STEP 3 で `--auth-token` に設定した値と同一にしてください。

---

## STEP 8: ECSサービスの再デプロイ

タスク定義を更新後、ECS サービスを再デプロイして新しい設定を反映します。

```bash
# スクリプト経由でデプロイ（推奨）
./scripts/deploy.ecr.sh --backend

# または ECS サービスを強制再起動
aws ecs update-service \
  --cluster alchemia-staging \
  --service alchemia-backend-service \
  --force-new-deployment \
  --region ap-northeast-1
```

---

## 手順まとめ

| STEP | 内容 | 備考 |
|------|------|------|
| 事前確認 | AWS CLI 認証確認 | `aws sts get-caller-identity` |
| STEP 1-1 | キャッシュサブネットグループの存在確認 | 既存の場合は1-2をスキップ |
| STEP 1-2 | キャッシュサブネットグループ作成 | 未作成の場合のみ |
| STEP 2-1 | セキュリティグループの存在確認 | 既存の場合は2-2をスキップ |
| STEP 2-2 | セキュリティグループ作成 | 未作成の場合のみ。インバウンドルールはSTEP 5で追加 |
| STEP 3 | ElastiCache Redisクラスター作成 | TLS・認証トークン・暗号化を有効化 |
| STEP 4 | 作成完了・エンドポイント確認 | `available` になるまで待機（約5〜10分） |
| STEP 5 | セキュリティグループ設定 | ECS・踏み台からのアクセス許可（ポート6379） |
| STEP 6 | 踏み台EC2から接続確認 | `redis-cli --tls` で PING テスト |
| STEP 7 | ECSタスク定義への反映 | エンドポイント・パスワードを設定 |
| STEP 8 | ECSサービスの再デプロイ | タスク定義更新を反映 |

---

## 作成後の接続情報（記録用）

ElastiCache 作成完了後、以下の情報を記録してください：

| 項目 | 値 |
|------|-----|
| エンドポイント | `alchemia-staging-redis.xxxxxx.ng.0001.apne1.cache.amazonaws.com` |
| ポート | `6379` |
| 認証トークン（パスワード） | （設定した値） |
| TLS | 有効（`--tls` オプション必須） |

---

## 参考: トラブルシューティング

### Redis に接続できない場合

```bash
# セキュリティグループのインバウンドルールを確認
aws ec2 describe-security-groups \
  --group-ids <alchemia-redis-sgのGroupId> \
  --region ap-northeast-1 \
  --query 'SecurityGroups[0].IpPermissions'

# ElastiCache クラスターの状態確認
aws elasticache describe-replication-groups \
  --replication-group-id alchemia-staging-redis \
  --region ap-northeast-1 \
  --query 'ReplicationGroups[0].{Status:Status,Endpoint:NodeGroups[0].PrimaryEndpoint.Address}'
```

### ECS タスクから Redis に接続できない場合

```bash
# ECS タスク定義の REDIS_HOST / REDIS_PASSWORD 設定を確認
aws ecs describe-task-definition \
  --task-definition alchemia-backend \
  --region ap-northeast-1 \
  --query 'taskDefinition.containerDefinitions[0].environment[?name==`REDIS_HOST`||name==`REDIS_PORT`]'
```

### `WRONGPASS` エラーが出る場合

- ECS タスク定義の `REDIS_PASSWORD` と ElastiCache の `--auth-token` が一致しているか確認してください。
- 認証トークンを変更する場合は、ElastiCache クラスターの `modify-replication-group` で更新が必要です。

```bash
# 認証トークンの変更（必要な場合のみ）
aws elasticache modify-replication-group \
  --replication-group-id alchemia-staging-redis \
  --auth-token "NEW_PASSWORD" \
  --auth-token-update-strategy ROTATE \
  --apply-immediately \
  --region ap-northeast-1
```

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

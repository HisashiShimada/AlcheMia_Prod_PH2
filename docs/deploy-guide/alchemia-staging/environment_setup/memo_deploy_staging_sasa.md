# 検証環境デプロイ作業メモ
- [検証環境デプロイ作業メモ](#検証環境デプロイ作業メモ)
  - [Aurora PostgreSQL 新規立ち上げ手順](#aurora-postgresql-新規立ち上げ手順)
    - [STEP 1: DBサブネットグループの作成](#step-1-dbサブネットグループの作成)
      - [1-1 既存サブネットグループの確認](#1-1-既存サブネットグループの確認)
      - [1-2 使用するサブネットグループの決定](#1-2-使用するサブネットグループの決定)
    - [STEP 2: pgvector用カスタムパラメータグループの作成](#step-2-pgvector用カスタムパラメータグループの作成)
      - [2-1. パラメータグループ作成](#2-1-パラメータグループ作成)
      - [2-2. 既存のセキュリティグループを確認](#2-2-既存のセキュリティグループを確認)
      - [2-3. VPC IDの確認](#2-3-vpc-idの確認)
      - [2-4. セキュリティグループの作成（未作成の場合のみ）](#2-4-セキュリティグループの作成未作成の場合のみ)
    - [STEP 3: Aurora DBクラスターの作成](#step-3-aurora-dbクラスターの作成)
    - [STEP 4: Aurora DBインスタンスの作成](#step-4-aurora-dbインスタンスの作成)
    - [STEP 5: 作成完了の待機・エンドポイント確認](#step-5-作成完了の待機エンドポイント確認)
    - [STEP 6: セキュリティグループにインバウンドルール追加](#step-6-セキュリティグループにインバウンドルール追加)
      - [`<alchemia-ecs-sgのGroupId>`の確認](#alchemia-ecs-sgのgroupidの確認)
        - [ECSタスクのSGからのアクセスを許可](#ecsタスクのsgからのアクセスを許可)
      - [踏み台EC2のセキュリティグループIdを取得](#踏み台ec2のセキュリティグループidを取得)
      - [踏み台EC2のSGからのアクセスを許可（管理用）](#踏み台ec2のsgからのアクセスを許可管理用)
    - [STEP 7: 踏み台EC2からpsqlで接続 → pgvector拡張機能を有効化](#step-7-踏み台ec2からpsqlで接続--pgvector拡張機能を有効化)
      - [Aurora に接続して pgvector を有効化](#aurora-に接続して-pgvector-を有効化)
      - [有効化の確認](#有効化の確認)
  - [ElastiCache for Redis 構築](#elasticache-for-redis-構築)
    - [STEP 0: 事前確認](#step-0-事前確認)
      - [0-1 AWS CLI のバージョン確認](#0-1-aws-cli-のバージョン確認)
      - [0-2 認証情報と接続確認](#0-2-認証情報と接続確認)
      - [0-3 利用可能な Redis バージョンの確認（任意）](#0-3-利用可能な-redis-バージョンの確認任意)
    - [STEP 1: キャッシュサブネットグループの確認・作成](#step-1-キャッシュサブネットグループの確認作成)
      - [1-2. キャッシュサブネットグループの作成](#1-2-キャッシュサブネットグループの作成)
    - [STEP 2: セキュリティグループの確認・作成](#step-2-セキュリティグループの確認作成)
      - [2-2. セキュリティグループの作成（未作成の場合のみ）](#2-2-セキュリティグループの作成未作成の場合のみ)
    - [STEP 3: ElastiCache Redis クラスター（Replication Group）の作成](#step-3-elasticache-redis-クラスターreplication-groupの作成)
    - [STEP 4: 作成完了の待機・エンドポイント確認](#step-4-作成完了の待機エンドポイント確認)
  - [STEP 5: セキュリティグループにインバウンドルール追加](#step-5-セキュリティグループにインバウンドルール追加)
    - [5-2. インバウンドルールを追加する](#5-2-インバウンドルールを追加する)
      - [ECSタスクのSGからのアクセスを許可](#ecsタスクのsgからのアクセスを許可-1)
      - [踏み台EC2のSGからのアクセスを許可（管理用・接続確認用）](#踏み台ec2のsgからのアクセスを許可管理用接続確認用)
  - [S3 バケットの作成](#s3-バケットの作成)
    - [STEP 1: バケット作成](#step-1-バケット作成)
      - [1-1. バケット名を変数に設定](#1-1-バケット名を変数に設定)
      - [1-2. バケット作成](#1-2-バケット作成)
    - [STEP 2: パブリックアクセスをすべてブロック](#step-2-パブリックアクセスをすべてブロック)
    - [STEP 3: バケット暗号化の設定](#step-3-バケット暗号化の設定)
    - [STEP 4: IAM ポリシーを `ecsTaskRole` に付与](#step-4-iam-ポリシーを-ecstaskrole-に付与)
      - [4-1. ポリシードキュメントを作成](#4-1-ポリシードキュメントを作成)
      - [4-2. ポリシーをロールにアタッチ](#4-2-ポリシーをロールにアタッチ)
    - [STEP 5: 作成確認](#step-5-作成確認)
      - [5-1. バケットが作成されていることを確認](#5-1-バケットが作成されていることを確認)
      - [5-2. パブリックアクセスブロック設定の確認](#5-2-パブリックアクセスブロック設定の確認)
      - [5-3. 暗号化設定の確認](#5-3-暗号化設定の確認)
  - [ECS クラスター `alchemia-staging` の作成](#ecs-クラスター-alchemia-staging-の作成)
    - [作成](#作成)
    - [作成確認](#作成確認)
  - [ECR リポジトリ 3 つの作成手順](#ecr-リポジトリ-3-つの作成手順)
  - [NLB の作成手順](#nlb-の作成手順)
    - [STEP 1: ターゲットグループ作成（ポート443）](#step-1-ターゲットグループ作成ポート443)
    - [STEP 2: ターゲットグループ作成（ポート80）](#step-2-ターゲットグループ作成ポート80)
    - [STEP 3: NLB作成](#step-3-nlb作成)
      - [3-1. subnetsの確認](#3-1-subnetsの確認)
      - [3-2. NLB作成](#3-2-nlb作成)
    - [STEP 4: リスナー作成（ポート443/TCP）](#step-4-リスナー作成ポート443tcp)
    - [STEP 5:リスナー作成（ポート80/TCP）](#step-5リスナー作成ポート80tcp)
  - [ECS サービス 2 つの作成](#ecs-サービス-2-つの作成)
    - [タスク定義の登録](#タスク定義の登録)
      - [AWS CLIでService Discoveryの設定](#aws-cliでservice-discoveryの設定)
        - [VPC IDの確認](#vpc-idの確認)
        - [プライベートDNS名前空間の作成](#プライベートdns名前空間の作成)
        - [名前空間IDの確認](#名前空間idの確認)
        - [Cloud Mapサービスの作成](#cloud-mapサービスの作成)
    - [タスク定義をAWSに登録](#タスク定義をawsに登録)
        - [backend タスク定義の登録](#backend-タスク定義の登録)
        - [nginx タスク定義の登録](#nginx-タスク定義の登録)
    - [サービス1：`alchemia-backend-service` の作成](#サービス1alchemia-backend-service-の作成)
    - [サービス2：`alchemia-nginx-service` の作成](#サービス2alchemia-nginx-service-の作成)
    - [作成後の確認](#作成後の確認)
  - [実行コマンド](#実行コマンド)
    - [Aurora PostgreSQL 新規立ち上げ手順](#aurora-postgresql-新規立ち上げ手順-1)
      - [セキュリティグループの作成（未作成の場合のみ）](#セキュリティグループの作成未作成の場合のみ)
      - [STEP 3: Aurora DBクラスターの作成(実行コマンド)](#step-3-aurora-dbクラスターの作成実行コマンド)
  - [実行結果](#実行結果)
    - [Aurora PostgreSQL 新規立ち上げ手順](#aurora-postgresql-新規立ち上げ手順-2)
      - [RDS 用セキュリティグループを作成](#rds-用セキュリティグループを作成)
      - [Aurora DBクラスターの作成](#aurora-dbクラスターの作成)
      - [STEP 4: Aurora DBインスタンスの作成(実行結果)](#step-4-aurora-dbインスタンスの作成実行結果)

## Aurora PostgreSQL 新規立ち上げ手順
### STEP 1: DBサブネットグループの作成
#### 1-1 既存サブネットグループの確認
```bash
aws rds describe-db-subnet-groups \
  --region ap-northeast-1 \
  --query 'DBSubnetGroups[*].{Name:DBSubnetGroupName,VPC:VpcId,Status:SubnetGroupStatus}' \
  --output table
```

#### 1-2 使用するサブネットグループの決定
既存のサブネットグループを使用する
- Name:maiml-viewer-db-subnet-group
- Status:Complete
- VPC:pc-0f27d999ea3a8ba0e

### STEP 2: pgvector用カスタムパラメータグループの作成
#### 2-1. パラメータグループ作成
```bash
aws rds create-db-cluster-parameter-group \
  --db-cluster-parameter-group-name alchemia-aurora-pg15-params \
  --db-parameter-group-family aurora-postgresql15 \
  --description "Alchemia Aurora PostgreSQL 15 params with pgvector" \
  --region ap-northeast-1
```

#### 2-2. 既存のセキュリティグループを確認
```bash
aws ec2 describe-security-groups \
  --region ap-northeast-1 \
  --filters "Name=group-name,Values=alchemia-rds-sg" \
  --query 'SecurityGroups[*].{GroupId:GroupId,GroupName:GroupName,VPC:VpcId}' \
  --output table
```
出力が空だったので、2-3.へ。

#### 2-3. VPC IDの確認
```bash
aws ec2 describe-vpcs \
  --region ap-northeast-1 \
  --query 'Vpcs[*].{VpcId:VpcId,Name:Tags[?Key==`Name`].Value|[0],CIDR:CidrBlock}' \
  --output table
```
- CIDR:10.0.0.0/16
- Name: maiml-viewer-production-vpc
- VpcId:vpc-0f27d999ea3a8ba0e

#### 2-4. セキュリティグループの作成（未作成の場合のみ）
確認した VPC ID を使って RDS 用セキュリティグループを作成します：
```bash
aws ec2 create-security-group \
  --group-name alchemia-rds-sg \
  --description "Security group for Alchemia Aurora RDS" \
  --vpc-id <上で確認したVpcId> \
  --region ap-northeast-1
```
- `<上で確認したVpcId>`:vpc-0f27d999ea3a8ba0e

[実行コマンド](#セキュリティグループの作成未作成の場合のみ)  
[実行結果](#rds-用セキュリティグループを作成)

### STEP 3: Aurora DBクラスターの作成
```bash
aws rds create-db-cluster \
  --db-cluster-identifier alchemia-staging-aurora \
  --engine aurora-postgresql \
  --engine-version 15.4 \
  --master-username maiml_user \
  --master-user-password "YOUR_STRONG_PASSWORD" \
  --database-name maiml_db \
  --db-subnet-group-name <サブネットグループ> \
  --vpc-security-group-ids <alchemia-rds-sgのGroupId> \
  --db-cluster-parameter-group-name alchemia-aurora-pg15-params \
  --storage-encrypted \
  --region ap-northeast-1
```
- `YOUR_STRONG_PASSWORD`：maiml_user
- `サブネットグループ`：maiml-viewer-db-subnet-group
- `<alchemia-rds-sgのGroupId>`：sg-02d0638a1a2185f47

[実行コマンド](#step-3-aurora-dbクラスターの作成実行コマンド)  
[実行結果](#aurora-dbクラスターの作成)

### STEP 4: Aurora DBインスタンスの作成
```bash
aws rds create-db-instance \
  --db-instance-identifier alchemia-staging-aurora-instance-1 \
  --db-cluster-identifier alchemia-staging-aurora \
  --engine aurora-postgresql \
  --db-instance-class db.t3.medium \
  --region ap-northeast-1
```
[実行結果](#step-4-aurora-dbインスタンスの作成実行結果)

### STEP 5: 作成完了の待機・エンドポイント確認
ステータスが "available" になるまで繰り返し確認（約10〜15分）
```bash
aws rds describe-db-clusters \
  --db-cluster-identifier alchemia-staging-aurora \
  --region ap-northeast-1 \
  --query 'DBClusters[0].{Status:Status,Endpoint:Endpoint,Port:Port}'
```
実行結果
```
{
    "Status": "available",
    "Endpoint": "alchemia-staging-aurora.cluster-c7u0cw0em9f8.ap-northeast-1.rds.amazonaws.com",
    "Port": 5432
}
```

### STEP 6: セキュリティグループにインバウンドルール追加

#### `<alchemia-ecs-sgのGroupId>`の確認
```
aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-backend-service \
  --region ap-northeast-1 \
  --query 'services[0].networkConfiguration.awsvpcConfiguration.securityGroups'
```
実行結果
```
[
    "sg-09de1ef2b9ce88b67"
]
```

##### ECSタスクのSGからのアクセスを許可
```bash
aws ec2 authorize-security-group-ingress \
  --group-id <alchemia-rds-sgのGroupId> \
  --protocol tcp \
  --port 5432 \
  --source-group <alchemia-ecs-sgのGroupId> \
  --region ap-northeast-1
```
- `<alchemia-rds-sgのGroupId>`:sg-02d0638a1a2185f47
- `<alchemia-ecs-sgのGroupId>`:sg-078007f4ff79cba5a

```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-02d0638a1a2185f47 \
  --protocol tcp \
  --port 5432 \
  --source-group sg-078007f4ff79cba5a \
  --region ap-northeast-1
```

#### 踏み台EC2のセキュリティグループIdを取得
```
# 自分のインスタンスIDを取得
INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/instance-id)

echo "Instance ID: $INSTANCE_ID"

# そのインスタンスのSGIDを取得
aws ec2 describe-instances \
  --region ap-northeast-1 \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].SecurityGroups[*].{GroupId:GroupId,GroupName:GroupName}' \
  --output table
```

#### 踏み台EC2のSGからのアクセスを許可（管理用）
```
aws ec2 authorize-security-group-ingress \
  --group-id <alchemia-rds-sgのGroupId> \
  --protocol tcp \
  --port 5432 \
  --source-group <踏み台EC2のセキュリティグループId> \
  --region ap-northeast-1
```
- `<alchemia-rds-sgのGroupId>`:sg-02d0638a1a2185f47
- `<踏み台EC2のセキュリティグループId>`:sg-0e22cd8f637e8d514
```
aws ec2 authorize-security-group-ingress \
  --group-id sg-02d0638a1a2185f47 \
  --protocol tcp \
  --port 5432 \
  --source-group sg-0e22cd8f637e8d514 \
  --region ap-northeast-1
```
```
aws ec2 authorize-security-group-ingress \
  --group-id sg-02d0638a1a2185f47 \
  --protocol tcp \
  --port 5432 \
  --cidr 10.1.11.44/32 \
  --region ap-northeast-1
```

### STEP 7: 踏み台EC2からpsqlで接続 → pgvector拡張機能を有効化
#### Aurora に接続して pgvector を有効化
```
PGPASSWORD='YOUR_STRONG_PASSWORD' psql \
  -h alchemia-staging-aurora.cluster-xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com \
  -p 5432 \
  -U maiml_user \
  -d maiml_db \
  --set=sslmode=require \
  -c "CREATE EXTENSION IF NOT EXISTS vector;"
```
- `alchemia-staging-aurora.cluster-xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com`:alchemia-staging-aurora.cluster-c7u0cw0em9f8.ap-northeast-1.rds.amazonaws.com
- `YOUR_STRONG_PASSWORD`:maiml_user
```
PGPASSWORD='maiml_user' psql \
  -h alchemia-staging-aurora.cluster-c7u0cw0em9f8.ap-northeast-1.rds.amazonaws.com \
  -p 5432 \
  -U maiml_user \
  -d maiml_db \
  --set=sslmode=require \
  -c "CREATE EXTENSION IF NOT EXISTS vector;"
```
#### 有効化の確認
```
PGPASSWORD='YOUR_STRONG_PASSWORD' psql \
  -h alchemia-staging-aurora.cluster-xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com \
  -p 5432 \
  -U maiml_user \
  -d maiml_db \
  --set=sslmode=require \
  -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```
```
PGPASSWORD='maiml_user' psql \
  -h alchemia-staging-aurora.cluster-c7u0cw0em9f8.ap-northeast-1.rds.amazonaws.com \
  -p 5432 \
  -U maiml_user \
  -d maiml_db \
  --set=sslmode=require \
  -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

## ElastiCache for Redis 構築
### STEP 0: 事前確認
#### 0-1 AWS CLI のバージョン確認
```bash
aws --version
```
#### 0-2 認証情報と接続確認
```bash
aws sts get-caller-identity
```
#### 0-3 利用可能な Redis バージョンの確認（任意）
``` bash
aws elasticache describe-cache-engine-versions \
  --engine redis \
  --region ap-northeast-1 \
  --query 'CacheEngineVersions[*].EngineVersion' \
  --output table
```
### STEP 1: キャッシュサブネットグループの確認・作成
#### 1-2. キャッシュサブネットグループの作成
SubnetId の確認
```
aws rds describe-db-subnet-groups \
  --db-subnet-group-name alchemia-staging-db-subnet-group \
  --region ap-northeast-1 \
  --query 'DBSubnetGroups[0].Subnets[*].{SubnetId:SubnetIdentifier,AZ:SubnetAvailabilityZone.Name}'
```
実行結果
```
[
    {
        "SubnetId": "subnet-07f168ac7f7902dfe",
        "AZ": "ap-northeast-1c"
    },
    {
        "SubnetId": "subnet-0b0981a2507f1042c",
        "AZ": "ap-northeast-1a"
    }
]
```
```bash
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name alchemia-cache-subnet-group \
  --cache-subnet-group-description "Alchemia Staging Cache Subnet Group" \
  --subnet-ids <alchemia-db-1aのSubnetId> <alchemia-db-1cのSubnetId> \
  --region ap-northeast-1
```
- `<alchemia-db-1aのSubnetId>`:subnet-0b0981a2507f1042c
- `<alchemia-db-1cのSubnetId>`:subnet-0b0981a2507f1042c
```
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name alchemia-cache-subnet-group \
  --cache-subnet-group-description "Alchemia Staging Cache Subnet Group" \
  --subnet-ids subnet-0b0981a2507f1042c subnet-0b0981a2507f1042c \
  --region ap-northeast-1
```
実行結果
```
{
    "CacheSubnetGroup": {
        "CacheSubnetGroupName": "alchemia-cache-subnet-group",
        "CacheSubnetGroupDescription": "Alchemia Staging Cache Subnet Group",
        "VpcId": "vpc-037a0cb50e47092a0",
        "Subnets": [
            {
                "SubnetIdentifier": "subnet-0b0981a2507f1042c",
                "SubnetAvailabilityZone": {
                    "Name": "ap-northeast-1a"
                },
                "SupportedNetworkTypes": [
                    "ipv4"
                ]
            }
        ],
        "ARN": "arn:aws:elasticache:ap-northeast-1:137068252939:subnetgroup:alchemia-cache-subnet-group",
        "SupportedNetworkTypes": [
            "ipv4"
        ]
    }
}
```
### STEP 2: セキュリティグループの確認・作成
#### 2-2. セキュリティグループの作成（未作成の場合のみ）
まず VPC ID を確認します：
```bash
aws ec2 describe-vpcs \
  --region ap-northeast-1 \
  --query 'Vpcs[*].{VpcId:VpcId,Name:Tags[?Key==`Name`].Value|[0],CIDR:CidrBlock}' \
  --output table
```
- `VpcId`:vpc-037a0cb50e47092a0
確認した VPC ID を使って Redis 用セキュリティグループを作成します：
```bash
aws ec2 create-security-group \
  --group-name alchemia-redis-sg \
  --description "Security group for Alchemia ElastiCache Redis" \
  --vpc-id <上で確認したVpcId> \
  --region ap-northeast-1
```
```bash
aws ec2 create-security-group \
  --group-name alchemia-redis-sg \
  --description "Security group for Alchemia ElastiCache Redis" \
  --vpc-id vpc-037a0cb50e47092a0 \
  --region ap-northeast-1
```
実行結果
```
{
    "GroupId": "sg-0e21f75613471063b",
    "SecurityGroupArn": "arn:aws:ec2:ap-northeast-1:137068252939:security-group/sg-0e21f75613471063b"
}
```
### STEP 3: ElastiCache Redis クラスター（Replication Group）の作成
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
- `<alchemia-redis-sgのGroupId>`:sg-0e21f75613471063b
- `YOUR_STRONG_REDIS_PASSWORD`:773e900e08b512076008c4e7c229779f
```bash
aws elasticache create-replication-group \
  --replication-group-id alchemia-staging-redis \
  --replication-group-description "Alchemia Staging Redis" \
  --engine redis \
  --engine-version 7.1 \
  --cache-node-type cache.t3.small \
  --num-cache-clusters 1 \
  --cache-subnet-group-name alchemia-cache-subnet-group \
  --security-group-ids sg-0e21f75613471063b \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --auth-token "773e900e08b512076008c4e7c229779f" \
  --region ap-northeast-1
```
実行結果
```
{
    "ReplicationGroup": {
        "ReplicationGroupId": "alchemia-staging-redis",
        "Description": "Alchemia Staging Redis",
        "GlobalReplicationGroupInfo": {},
        "Status": "creating",
        "PendingModifiedValues": {},
        "MemberClusters": [
            "alchemia-staging-redis-001"
        ],
        "AutomaticFailover": "disabled",
        "MultiAZ": "disabled",
        "SnapshotRetentionLimit": 0,
        "SnapshotWindow": "15:00-16:00",
        "ClusterEnabled": false,
        "CacheNodeType": "cache.t3.small",
        "TransitEncryptionEnabled": true,
        "AtRestEncryptionEnabled": true,
        "ARN": "arn:aws:elasticache:ap-northeast-1:137068252939:replicationgroup:alchemia-staging-redis",
        "LogDeliveryConfigurations": [],
        "ReplicationGroupCreateTime": "2026-04-07T05:17:32.577000+00:00",
        "DataTiering": "disabled",
        "AutoMinorVersionUpgrade": true,
        "NetworkType": "ipv4",
        "IpDiscovery": "ipv4",
        "TransitEncryptionMode": "required",
        "ClusterMode": "disabled",
        "Engine": "redis"
    }
}
```
### STEP 4: 作成完了の待機・エンドポイント確認

## STEP 5: セキュリティグループにインバウンドルール追加
### 5-2. インバウンドルールを追加する
#### ECSタスクのSGからのアクセスを許可
```bash
aws ec2 authorize-security-group-ingress \
  --group-id <alchemia-redis-sgのGroupId> \
  --protocol tcp \
  --port 6379 \
  --source-group <alchemia-ecs-sgのGroupId> \
  --region ap-northeast-1
```
- `<alchemia-redis-sgのGroupId>`:sg-0e21f75613471063b
- `<alchemia-ecs-sgのGroupId>`:sg-09de1ef2b9ce88b67

```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-0e21f75613471063b \
  --protocol tcp \
  --port 6379 \
  --source-group sg-09de1ef2b9ce88b67 \
  --region ap-northeast-1
```
実行結果
```bash
{
    "Return": true,
    "SecurityGroupRules": [
        {
            "SecurityGroupRuleId": "sgr-06ccf0380316292ea",
            "GroupId": "sg-0e21f75613471063b",
            "GroupOwnerId": "137068252939",
            "IsEgress": false,
            "IpProtocol": "tcp",
            "FromPort": 6379,
            "ToPort": 6379,
            "ReferencedGroupInfo": {
                "GroupId": "sg-09de1ef2b9ce88b67",
                "UserId": "137068252939"
            },
            "SecurityGroupRuleArn": "arn:aws:ec2:ap-northeast-1:137068252939:security-group-rule/sgr-06ccf0380316292ea"
        }
    ]
}
```

#### 踏み台EC2のSGからのアクセスを許可（管理用・接続確認用）
```
aws ec2 authorize-security-group-ingress \
  --group-id <alchemia-redis-sgのGroupId> \
  --protocol tcp \
  --port 6379 \
  --source-group <踏み台EC2のセキュリティグループId> \
  --region ap-northeast-1
```
- `<alchemia-redis-sgのGroupId>`:sg-0e21f75613471063b
- `<踏み台EC2のセキュリティグループId>`:sg-0e22cd8f637e8d514
```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-0e21f75613471063b \
  --protocol tcp \
  --port 6379 \
  --source-group sg-0e22cd8f637e8d514 \
  --region ap-northeast-1
```
実行結果
```bash
{
    "Return": true,
    "SecurityGroupRules": [
        {
            "SecurityGroupRuleId": "sgr-0232a3038ce2f8076",
            "GroupId": "sg-0e21f75613471063b",
            "GroupOwnerId": "137068252939",
            "IsEgress": false,
            "IpProtocol": "tcp",
            "FromPort": 6379,
            "ToPort": 6379,
            "ReferencedGroupInfo": {
                "GroupId": "sg-0e22cd8f637e8d514",
                "UserId": "137068252939"
            },
            "SecurityGroupRuleArn": "arn:aws:ec2:ap-northeast-1:137068252939:security-group-rule/sgr-0232a3038ce2f8076"
        }
    ]
}
```
## S3 バケットの作成
### STEP 1: バケット作成
#### 1-1. バケット名を変数に設定
```bash
BUCKET_NAME=mmdpf-files-production
REGION=ap-northeast-1
```
#### 1-2. バケット作成
```bash
aws s3api create-bucket \
  --bucket ${BUCKET_NAME} \
  --region ${REGION} \
  --create-bucket-configuration LocationConstraint=${REGION}
```
実行結果
```
{
    "Location": "http://mmdpf-files-production.s3.amazonaws.com/",
    "BucketArn": "arn:aws:s3:::mmdpf-files-production"
}
```
### STEP 2: パブリックアクセスをすべてブロック
ECSからIAMロール経由でのみアクセスするため、パブリックアクセスは全てブロック
```bash
aws s3api put-public-access-block \
  --bucket ${BUCKET_NAME} \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```
### STEP 3: バケット暗号化の設定
```bash
aws s3api put-bucket-encryption \
  --bucket ${BUCKET_NAME} \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      },
      "BucketKeyEnabled": true
    }]
  }'
```
### STEP 4: IAM ポリシーを `ecsTaskRole` に付与
ECSタスク定義（`ecs-task-definition-alchemia-backend.json`）では `ecsTaskRole` を使用しています。\
このロールにS3アクセス権限を追加します。
#### 4-1. ポリシードキュメントを作成
```
cat > /tmp/s3-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::mmdpf-files-production",
        "arn:aws:s3:::mmdpf-files-production/*"
      ]
    }
  ]
}
EOF
```
#### 4-2. ポリシーをロールにアタッチ
```bash
aws iam put-role-policy \
  --role-name ecsTaskRole \
  --policy-name S3AccessPolicy \
  --policy-document file:///tmp/s3-policy.json
```
### STEP 5: 作成確認
#### 5-1. バケットが作成されていることを確認
```bash
aws s3 ls s3://${BUCKET_NAME}/ --region ${REGION}
```
#### 5-2. パブリックアクセスブロック設定の確認
```
aws s3api get-public-access-block --bucket ${BUCKET_NAME}
```
#### 5-3. 暗号化設定の確認
```
aws s3api get-bucket-encryption --bucket ${BUCKET_NAME}
```

## ECS クラスター `alchemia-staging` の作成
### 作成
```
aws ecs create-cluster \
  --cluster-name alchemia-staging \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy \
    capacityProvider=FARGATE,weight=1,base=1 \
  --region ap-northeast-1 \
  --tags key=Project,value=mmdpf key=Env,value=staging
```

### 作成確認
```
aws ecs describe-clusters \
  --clusters alchemia-staging \
  --region ap-northeast-1 \
  --query 'clusters[0].{name:clusterName,status:status,activeServices:activeServicesCount}'
```

## ECR リポジトリ 3 つの作成手順
CR リポジトリ 3 つの作成（`mmdpf-backend`、`mmdpf-frontend`、`mmdpf-nginx`）

リージョンを変数に設定（東京リージョン）
```
REGION=ap-northeast-1
```
mmdpf-backend リポジトリ作成
```
aws ecr create-repository \
  --repository-name mmdpf-backend \
  --region ${REGION}
```
mmdpf-frontend リポジトリ作成
```
aws ecr create-repository \
  --repository-name mmdpf-frontend \
  --region ${REGION}
```
mmdpf-nginx リポジトリ作成
```
aws ecr create-repository \
  --repository-name mmdpf-nginx \
  --region ${REGION}
```
実行後の確認
```
aws ecr describe-repositories \
  --region ap-northeast-1 \
  --query 'repositories[*].{name:repositoryName,uri:repositoryUri}' \
  --output table
```

## NLB の作成手順
### STEP 1: ターゲットグループ作成（ポート443）
```bash
aws elbv2 create-target-group \
  --name alchemia-nginx-tg-443 \
  --protocol TCP \
  --port 443 \
  --target-type ip \
  --vpc-id vpc-xxxxxxxxxx \
  --health-check-protocol TCP \
  --health-check-port 443 \
  --region ap-northeast-1
```
- `vpc-id`:`alchemia-staging-vpc`のvpc id
  - vpc-037a0cb50e47092a0

実行結果
```
{
    "TargetGroups": [
        {
            "TargetGroupArn": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/alchemia-nginx-tg-443/f36e0a0540fba3cb",
            "TargetGroupName": "alchemia-nginx-tg-443",
            "Protocol": "TCP",
            "Port": 443,
            "VpcId": "vpc-037a0cb50e47092a0",
            "HealthCheckProtocol": "TCP",
            "HealthCheckPort": "443",
            "HealthCheckEnabled": true,
            "HealthCheckIntervalSeconds": 30,
            "HealthCheckTimeoutSeconds": 10,
            "HealthyThresholdCount": 5,
            "UnhealthyThresholdCount": 2,
            "TargetType": "ip",
            "IpAddressType": "ipv4"
        }
    ]
}
```
### STEP 2: ターゲットグループ作成（ポート80）
```bash
aws elbv2 create-target-group \
  --name alchemia-nginx-tg-80 \
  --protocol TCP \
  --port 80 \
  --target-type ip \
  --vpc-id vpc-xxxxxxxxxx \
  --health-check-protocol TCP \
  --health-check-port 80 \
  --region ap-northeast-1
```

実行結果
```
{
    "TargetGroups": [
        {
            "TargetGroupArn": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/alchemia-nginx-tg-80/aa9ece423aabc438",
            "TargetGroupName": "alchemia-nginx-tg-80",
            "Protocol": "TCP",
            "Port": 80,
            "VpcId": "vpc-037a0cb50e47092a0",
            "HealthCheckProtocol": "TCP",
            "HealthCheckPort": "80",
            "HealthCheckEnabled": true,
            "HealthCheckIntervalSeconds": 30,
            "HealthCheckTimeoutSeconds": 10,
            "HealthyThresholdCount": 5,
            "UnhealthyThresholdCount": 2,
            "TargetType": "ip",
            "IpAddressType": "ipv4"
        }
    ]
}
```

### STEP 3: NLB作成
#### 3-1. subnetsの確認
```bash
aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=vpc-037a0cb50e47092a0" \
  --region ap-northeast-1 \
  --query 'Subnets[*].{SubnetId:SubnetId, AZ:AvailabilityZone, Name:Tags[?Key==`Name`].Value|[0], MapPublicIp:MapPublicIpOnLaunch, CIDR:CidrBlock}' \
  --output table
```
`MapPublicIp`が`True`のものを選択
#### 3-2. NLB作成
```bash
aws elbv2 create-load-balancer \
  --name alchemia-nlb \
  --type network \
  --scheme internet-facing \
  --subnets subnet-xxxxxxxxxx subnet-yyyyyyyyyy \
  --region ap-northeast-1
```
- `subnet-xxxxxxxxxx`:subnet-0c386da2db38952dc
- `subnet-yyyyyyyyyy`:subnet-0388f1051ba7b98ce

実行結果
```
{
    "LoadBalancers": [
        {
            "LoadBalancerArn": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:loadbalancer/net/alchemia-nlb/c2dddce911d02463",
            "DNSName": "alchemia-nlb-c2dddce911d02463.elb.ap-northeast-1.amazonaws.com",
            "CanonicalHostedZoneId": "Z31USIVHYNEOWT",
            "CreatedTime": "2026-04-07T10:42:36.758000+00:00",
            "LoadBalancerName": "alchemia-nlb",
            "Scheme": "internet-facing",
            "VpcId": "vpc-037a0cb50e47092a0",
            "State": {
                "Code": "provisioning"
            },
            "Type": "network",
            "AvailabilityZones": [
                {
                    "ZoneName": "ap-northeast-1a",
                    "SubnetId": "subnet-0c386da2db38952dc",
                    "LoadBalancerAddresses": []
                },
                {
                    "ZoneName": "ap-northeast-1c",
                    "SubnetId": "subnet-0388f1051ba7b98ce",
                    "LoadBalancerAddresses": []
                }
            ],
            "IpAddressType": "ipv4",
            "EnablePrefixForIpv6SourceNat": "off"
        }
    ]
}
```

### STEP 4: リスナー作成（ポート443/TCP）
```bash
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:...:loadbalancer/net/alchemia-nlb/... \
  --protocol TCP \
  --port 443 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...:targetgroup/alchemia-nginx-tg-443/... \
  --region ap-northeast-1
```
- `load-balancer-arn`:3-2. NLB作成で返されるARN
  - "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:loadbalancer/net/alchemia-nlb/c2dddce911d02463"
- `TargetGroupArn`:STEP 2: ターゲットグループ作成で返されるARN
  - "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/alchemia-nginx-tg-443/f36e0a0540fba3cb"
実行結果
```
{
    "Listeners": [
        {
            "ListenerArn": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:listener/net/alchemia-nlb/c2dddce911d02463/67efb90c79de2286",
            "LoadBalancerArn": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:loadbalancer/net/alchemia-nlb/c2dddce911d02463",
            "Port": 443,
            "Protocol": "TCP",
            "DefaultActions": [
                {
                    "Type": "forward",
                    "TargetGroupArn": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/alchemia-nginx-tg-443/f36e0a0540fba3cb",
                    "ForwardConfig": {
                        "TargetGroups": [
                            {
                                "TargetGroupArn": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/alchemia-nginx-tg-443/f36e0a0540fba3cb"
                            }
                        ],
                        "TargetGroupStickinessConfig": {
                            "Enabled": false
                        }
                    }
                }
            ]
        }
    ]
}
```
### STEP 5:リスナー作成（ポート80/TCP）
```bash
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:...:loadbalancer/net/alchemia-nlb/... \
  --protocol TCP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...:targetgroup/alchemia-nginx-tg-80/... \
  --region ap-northeast-1
```
- `load-balancer-arn`:3-2. NLB作成で返されるARN
  - "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:loadbalancer/net/alchemia-nlb/c2dddce911d02463"
- `TargetGroupArn`:STEP 2: ターゲットグループ作成で返されるARN
  - "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/alchemia-nginx-tg-80/aa9ece423aabc438"
実行結果
```
{
    "Listeners": [
        {
            "ListenerArn": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:listener/net/alchemia-nlb/c2dddce911d02463/6815e9659239959f",
            "LoadBalancerArn": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:loadbalancer/net/alchemia-nlb/c2dddce911d02463",
            "Port": 80,
            "Protocol": "TCP",
            "DefaultActions": [
                {
                    "Type": "forward",
                    "TargetGroupArn": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/alchemia-nginx-tg-80/aa9ece423aabc438",
                    "ForwardConfig": {
                        "TargetGroups": [
                            {
                                "TargetGroupArn": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/alchemia-nginx-tg-80/aa9ece423aabc438"
                            }
                        ],
                        "TargetGroupStickinessConfig": {
                            "Enabled": false
                        }
                    }
                }
            ]
        }
    ]
}
```
## ECS サービス 2 つの作成
ECS サービス 2 つの作成（`alchemia-backend-service`、`alchemia-nginx-service`）

### タスク定義の登録
`aws/ecs-task-definition-alchemia-backend.json` を編集
// 変更が必要な箇所
{ "name": "DB_HOST",       "value": "実際のAuroraエンドポイント" },
{ "name": "DB_PASSWORD",   "value": "実際のDBパスワード" },
{ "name": "REDIS_HOST",    "value": "実際のElastiCacheエンドポイント" },
{ "name": "REDIS_PASSWORD","value": "実際のRedisパスワード" },
{ "name": "JWT_SECRET",    "value": "64文字以上のランダム文字列" },
{ "name": "SESSION_SECRET","value": "64文字以上のランダム文字列" },
{ "name": "CORS_ORIGIN",   "value": "https://実際のNLBドメイン" },
{ "name": "FRONTEND_URL",  "value": "https://実際のNLBドメイン" }

`aws/ecs-task-definition-alchemia-nginx.json` も編集
{ "name": "BACKEND_HOST", "value": "実際のService Discovery DNS" }

#### AWS CLIでService Discoveryの設定
##### VPC IDの確認
```bash
aws ec2 describe-vpcs \
  --region ap-northeast-1 \
  --query 'Vpcs[*].{VpcId:VpcId, Name:Tags[?Key==`Name`].Value|[0], CIDR:CidrBlock}' \
  --output table
```
- `Name`: alchemia-staging-vpc
- `VpcId`:vpc-037a0cb50e47092a0

##### プライベートDNS名前空間の作成
```bash
aws servicediscovery create-private-dns-namespace \
  --name alchemia.local \
  --vpc vpc-xxxxxxxxxxxxxxxxx \
  --region ap-northeast-1
```
実行結果
```
{
    "OperationId": "kewf4c4zs2uf4zxue345l3s3ndjjlmud-jmrllvne"
}
```
##### 名前空間IDの確認
```bash
aws servicediscovery list-namespaces \
  --region ap-northeast-1 \
  --query 'Namespaces[*].{Name:Name, Id:Id}' \
  --output table
```
- `Id`:ns-qpfu4ddhzvys7xqb
- `Name`:alchemia.local

##### Cloud Mapサービスの作成
```bash
aws servicediscovery create-service \
  --name alchemia-backend \
  --namespace-id ns-xxxxxxxxxxxxxxxxxx \
  --dns-config "NamespaceId=ns-xxxxxxxxxxxxxxxxxx,DnsRecords=[{Type=A,TTL=10}]" \
  --health-check-custom-config "FailureThreshold=1" \
  --region ap-northeast-1
```
実行結果
```
{
    "Service": {
        "Id": "srv-ohk4a5wcrxi5cs3c",
        "Arn": "arn:aws:servicediscovery:ap-northeast-1:137068252939:service/srv-ohk4a5wcrxi5cs3c",
        "ResourceOwner": "137068252939",
        "Name": "alchemia-backend",
        "NamespaceId": "ns-qpfu4ddhzvys7xqb",
        "DnsConfig": {
            "NamespaceId": "ns-qpfu4ddhzvys7xqb",
            "RoutingPolicy": "MULTIVALUE",
            "DnsRecords": [
                {
                    "Type": "A",
                    "TTL": 10
                }
            ]
        },
        "Type": "DNS_HTTP",
        "HealthCheckCustomConfig": {
            "FailureThreshold": 1
        },
        "CreateDate": "2026-04-07T11:29:49.201000+00:00",
        "CreatorRequestId": "0e76b95e-e4f8-4cbf-a633-dc002a8af99b",
        "CreatedByAccount": "137068252939"
    }
}
```
### タスク定義をAWSに登録
##### backend タスク定義の登録
aws ecs register-task-definition \
  --cli-input-json file://aws/ecs-task-definition-alchemia-backend.json \
  --region ap-northeast-1

##### nginx タスク定義の登録
aws ecs register-task-definition \
  --cli-input-json file://aws/ecs-task-definition-alchemia-nginx.json \
  --region ap-northeast-1

### サービス1：`alchemia-backend-service` の作成
```bash
aws ecs create-service \
  --cluster alchemia-staging \
  --service-name alchemia-backend-service \
  --task-definition alchemia-backend:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-xxxxxxxxxx,subnet-yyyyyyyyyy],
    securityGroups=[sg-xxxxxxxxxx],
    assignPublicIp=DISABLED
  }" \
  --service-registries "registryArn=arn:aws:servicediscovery:ap-northeast-1:137068252939:service/srv-xxxxxxxxxx" \
  --region ap-northeast-1
  ```
  - `subnet-xxxxxxxxxx`:subnet-0b0981a2507f1042c
  - `subnet-yyyyyyyyyy`:subnet-07f168ac7f7902dfe
  - `sg-xxxxxxxxxx`:sg-0920f1a670e75b444
  - `registryArn`:arn:aws:servicediscovery:ap-northeast-1:137068252939:service/srv-ohk4a5wcrxi5cs3c

### サービス2：`alchemia-nginx-service` の作成
```bash
aws ecs create-service \
  --cluster alchemia-staging \
  --service-name alchemia-nginx-service \
  --task-definition alchemia-nginx:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-xxxxxxxxxx,subnet-yyyyyyyyyy],
    securityGroups=[sg-yyyyyyyyyy],
    assignPublicIp=ENABLED
  }" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/alchemia-nginx-tg-443/xxxxxxxxxx,containerName=mmdpf-nginx,containerPort=443" \
  --region ap-northeast-1
  ```
- `subnet-xxxxxxxxxx`:subnet-0388f1051ba7b98ce
- `subnet-yyyyyyyyyy`:subnet-0c386da2db38952dc
- `sg-xxxxxxxxxx`:sg-08569630d4e399b60
- `targetGroupArn`:arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/alchemia-nginx-tg-443/f36e0a0540fba3cb

### 作成後の確認
``` bash
aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-backend-service alchemia-nginx-service \
  --region ap-northeast-1 \
  --query 'services[*].{name:serviceName, running:runningCount, desired:desiredCount, status:status}'
```






## 実行コマンド
### Aurora PostgreSQL 新規立ち上げ手順
#### セキュリティグループの作成（未作成の場合のみ）
```
aws ec2 create-security-group \
  --group-name alchemia-rds-sg \
  --description "Security group for Alchemia Aurora RDS" \
  --vpc-id vpc-0f27d999ea3a8ba0e \
  --region ap-northeast-1
```
[コマンド](#2-4-セキュリティグループの作成未作成の場合のみ)
#### STEP 3: Aurora DBクラスターの作成(実行コマンド)
```
aws rds create-db-cluster \
  --db-cluster-identifier alchemia-staging-aurora \
  --engine aurora-postgresql \
  --engine-version 15.8 \
  --master-username maiml_user \
  --master-user-password "maiml_user" \
  --database-name maiml_db \
  --db-subnet-group-name maiml-viewer-db-subnet-group \
  --vpc-security-group-ids sg-02d0638a1a2185f47 \
  --db-cluster-parameter-group-name alchemia-aurora-pg15-params \
  --storage-encrypted \
  --region ap-northeast-1
```
[コマンド](#step-3-aurora-dbクラスターの作成)

## 実行結果
### Aurora PostgreSQL 新規立ち上げ手順
#### RDS 用セキュリティグループを作成
```
{
    "GroupId": "sg-02d0638a1a2185f47",
    "SecurityGroupArn": "arn:aws:ec2:ap-northeast-1:137068252939:security-group/sg-02d0638a1a2185f47"
}
```
[実行コマンド](#2-3-セキュリティグループの作成未作成の場合のみ)
#### Aurora DBクラスターの作成
```
{
    "DBCluster": {
        "AllocatedStorage": 1,
        "AvailabilityZones": [
            "ap-northeast-1c",
            "ap-northeast-1d",
            "ap-northeast-1a"
        ],
        "BackupRetentionPeriod": 1,
        "DatabaseName": "maiml_db",
        "DBClusterIdentifier": "alchemia-staging-aurora",
        "DBClusterParameterGroup": "alchemia-aurora-pg15-params",
        "DBSubnetGroup": "maiml-viewer-db-subnet-group",
        "Status": "creating",
        "Endpoint": "alchemia-staging-aurora.cluster-c7u0cw0em9f8.ap-northeast-1.rds.amazonaws.com",
        "ReaderEndpoint": "alchemia-staging-aurora.cluster-ro-c7u0cw0em9f8.ap-northeast-1.rds.amazonaws.com",
        "MultiAZ": false,
        "Engine": "aurora-postgresql",
        "EngineVersion": "15.8",
        "Port": 5432,
        "MasterUsername": "maiml_user",
        "PreferredBackupWindow": "15:29-15:59",
        "PreferredMaintenanceWindow": "tue:19:31-tue:20:01",
        "UpgradeRolloutOrder": "second",
        "ReadReplicaIdentifiers": [],
        "DBClusterMembers": [],
        "VpcSecurityGroups": [
            {
                "VpcSecurityGroupId": "sg-02d0638a1a2185f47",
                "Status": "active"
            }
        ],
        "HostedZoneId": "Z24O6O9L7SGTNB",
        "StorageEncrypted": true,
        "KmsKeyId": "arn:aws:kms:ap-northeast-1:137068252939:key/8ddb1c72-68a8-4e3d-9dd0-90d005ab971d",
        "DbClusterResourceId": "cluster-V5S4RUE7HTAA6QPF6UDI4TUD7Y",
        "DBClusterArn": "arn:aws:rds:ap-northeast-1:137068252939:cluster:alchemia-staging-aurora",
        "AssociatedRoles": [],
        "IAMDatabaseAuthenticationEnabled": false,
        "ClusterCreateTime": "2026-04-07T00:42:42.508000+00:00",
        "EngineMode": "provisioned",
        "AutoMinorVersionUpgrade": true,
        "DeletionProtection": false,
        "HttpEndpointEnabled": false,
        "CopyTagsToSnapshot": false,
        "CrossAccountClone": false,
        "DomainMemberships": [],
        "TagList": [],
        "NetworkType": "IPV4",
        "DatabaseInsightsMode": "standard",
        "LocalWriteForwardingStatus": "disabled",
        "EngineLifecycleSupport": "open-source-rds-extended-support"
    }
}
```
[実行コマンド](#step-3-aurora-dbクラスターの作成)

#### STEP 4: Aurora DBインスタンスの作成(実行結果)
```
{
    "DBInstance": {
        "DBInstanceIdentifier": "alchemia-staging-aurora-instance-1",
        "DBInstanceClass": "db.t3.medium",
        "Engine": "aurora-postgresql",
        "DBInstanceStatus": "creating",
        "MasterUsername": "maiml_user",
        "DBName": "maiml_db",
        "AllocatedStorage": 1,
        "PreferredBackupWindow": "15:29-15:59",
        "BackupRetentionPeriod": 1,
        "DBSecurityGroups": [],
        "VpcSecurityGroups": [
            {
                "VpcSecurityGroupId": "sg-02d0638a1a2185f47",
                "Status": "active"
            }
        ],
        "DBParameterGroups": [
            {
                "DBParameterGroupName": "default.aurora-postgresql15",
                "ParameterApplyStatus": "in-sync"
            }
        ],
        "DBSubnetGroup": {
            "DBSubnetGroupName": "maiml-viewer-db-subnet-group",
            "DBSubnetGroupDescription": "Subnet group for MaiML Viewer Aurora PostgreSQL",
            "VpcId": "vpc-0f27d999ea3a8ba0e",
            "SubnetGroupStatus": "Complete",
            "Subnets": [
                {
                    "SubnetIdentifier": "subnet-0a133932e4f0366c1",
                    "SubnetAvailabilityZone": {
                        "Name": "ap-northeast-1a"
                    },
                    "SubnetOutpost": {},
                    "SubnetStatus": "Active"
                },
                {
                    "SubnetIdentifier": "subnet-0306644e4d8134f8a",
                    "SubnetAvailabilityZone": {
                        "Name": "ap-northeast-1c"
                    },
                    "SubnetOutpost": {},
                    "SubnetStatus": "Active"
                }
            ]
        },
        "PreferredMaintenanceWindow": "tue:13:22-tue:13:52",
        "UpgradeRolloutOrder": "second",
        "PendingModifiedValues": {},
        "MultiAZ": false,
        "EngineVersion": "15.8",
        "AutoMinorVersionUpgrade": true,
        "ReadReplicaDBInstanceIdentifiers": [],
        "LicenseModel": "postgresql-license",
        "StorageThroughput": 0,
        "OptionGroupMemberships": [
            {
                "OptionGroupName": "default:aurora-postgresql-15",
                "Status": "in-sync"
            }
        ],
        "PubliclyAccessible": false,
        "StorageType": "aurora",
        "DbInstancePort": 0,
        "DBClusterIdentifier": "alchemia-staging-aurora",
        "StorageEncrypted": true,
        "KmsKeyId": "arn:aws:kms:ap-northeast-1:137068252939:key/8ddb1c72-68a8-4e3d-9dd0-90d005ab971d",
        "DbiResourceId": "db-IIWUJ3FDGCW44UY7JTFOAVVENE",
        "CACertificateIdentifier": "rds-ca-rsa2048-g1",
        "DomainMemberships": [],
        "CopyTagsToSnapshot": false,
        "MonitoringInterval": 0,
        "PromotionTier": 1,
        "DBInstanceArn": "arn:aws:rds:ap-northeast-1:137068252939:db:alchemia-staging-aurora-instance-1",
        "IAMDatabaseAuthenticationEnabled": false,
        "DatabaseInsightsMode": "standard",
        "PerformanceInsightsEnabled": false,
        "DeletionProtection": false,
        "AssociatedRoles": [],
        "TagList": [],
        "CustomerOwnedIpEnabled": false,
        "NetworkType": "IPV4",
        "BackupTarget": "region",
        "CertificateDetails": {
            "CAIdentifier": "rds-ca-rsa2048-g1"
        },
        "DedicatedLogVolume": false,
        "EngineLifecycleSupport": "open-source-rds-extended-support"
    }
}
```
[コマンド](#step-4-aurora-dbインスタンスの作成)
# mmdpf SaaS版 デプロイ手順書（AWS ECS Fargate）

- **作成日**: 2026-04-06
- **対象**: SaaS版 AWS環境（ECS Fargate + Aurora + ElastiCache + S3 + Bedrock）
- **デプロイ方式**: ECR イメージプッシュ → ECS ローリングデプロイ

> **オンプレミス版のデプロイ手順** は `deploy-guide-dev.md` / `deploy-guide-server.md` を参照してください。

---

## 目次

1. [システム構成](#1-システム構成)
2. [AWSリソース一覧](#2-awsリソース一覧)
3. [前提条件](#3-前提条件)
4. [初回セットアップ](#4-初回セットアップ)
5. [デプロイ手順](#5-デプロイ手順)
6. [DBマイグレーション](#6-dbマイグレーション)
7. [デプロイ後の確認](#7-デプロイ後の確認)
8. [ロールバック手順](#8-ロールバック手順)
9. [運用コマンド集](#9-運用コマンド集)
10. [トラブルシューティング](#10-トラブルシューティング)
11. [デプロイチェックリスト](#11-デプロイチェックリスト)

---

## 1. システム構成

### アーキテクチャ概要

```
ブラウザ
  │ TCP/443（TLSパススルー）
  ▼
NLB (Network Load Balancer)  ※TCPリスナー（TLSを終端しない）
  └── 全トラフィック → alchemia-nginx-service (ECS Fargate)

alchemia-nginx-service タスク:
  ├── mmdpf-nginx コンテナ    (ポート 80/443)
  │     SSL終端 + クライアント証明書認証 + organization_id 抽出
  │     /api/ → alchemia-backend-service（VPC内 Service Discovery）
  │     /     → localhost:3000
  └── mmdpf-frontend コンテナ (ポート 3000)

alchemia-backend-service タスク:
  └── mmdpf-backend コンテナ  (ポート 3001)  ※nginx 経由でのみアクセス
        ├── Aurora PostgreSQL  ← マネージドDB（Swiftの代替）
        ├── ElastiCache Redis  ← マネージドキャッシュ
        ├── S3                 ← オブジェクトストレージ（Swiftの代替）
        └── AWS Bedrock        ← AI モデル（Ollamaの代替）
```

> **重要: NLB（TCPパススルー）を使う理由**
>
> このシステムはnginxでクライアント証明書認証（mTLS）を行い、証明書のCN（UUID）から
> `organization_id` を抽出してマルチテナント分離を実現しています。
>
> ALBでHTTPS終端（TLS Termination）を行うとクライアント証明書の情報がALBで消えてしまい、
> nginxに届かなくなります。そのため **NLBのTCPリスナー（ポート443）** でTLSをパススルーし、
> nginxがSSL終端・クライアント証明書検証・`X-Organization-Id`ヘッダー付与を
> すべて担う構成にする必要があります。
>
> また、backendへの直接ルーティングをなくすことで、すべてのAPIアクセスが必ず
> nginx（クライアント証明書認証）を経由することが保証されます。

### オンプレ版との対応関係

| オンプレ版コンポーネント | SaaS版コンポーネント | 備考 |
|---|---|---|
| `mmdpf-postgres` コンテナ | **Aurora PostgreSQL** | マネージドDB。SSL接続必須 |
| `mmdpf-redis` コンテナ | **ElastiCache for Redis** | マネージドキャッシュ |
| `mmdpf-swift` コンテナ | **Amazon S3** | オブジェクトストレージ。IAMロールで認証 |
| `mmdpf-ollama` コンテナ | **AWS Bedrock** | AI モデル。IAMロールで認証 |
| `mmdpf-nginx` コンテナ | **ECS Fargate (nginx タスク)** | frontend と同居 |
| `mmdpf-frontend` コンテナ | **ECS Fargate (nginx タスク)** | nginx と同居 |
| `mmdpf-backend` コンテナ | **ECS Fargate (backend タスク)** | 単独タスク |

---

## 2. AWSリソース一覧

| 項目 | 値 |
|---|---|
| AWSアカウントID | `137068252939` |
| リージョン | `ap-northeast-1` |
| ECSクラスター | `alchemia-staging` |
| NLB URL | `https://your-nlb-domain.ap-northeast-1.elb.amazonaws.com/` |
| **ECR Backend** | `137068252939.dkr.ecr.ap-northeast-1.amazonaws.com/mmdpf-backend` |
| **ECR Frontend** | `137068252939.dkr.ecr.ap-northeast-1.amazonaws.com/mmdpf-frontend` |
| **ECR Nginx** | `137068252939.dkr.ecr.ap-northeast-1.amazonaws.com/mmdpf-nginx` |
| **ECS Backend Service** | `alchemia-backend-service` |
| **ECS Nginx Service** | `alchemia-nginx-service` |
| タスク定義 (Backend) | `aws/ecs-task-definition-alchemia-backend.json` |
| タスク定義 (Nginx) | `aws/ecs-task-definition-alchemia-nginx.json` |
| Aurora エンドポイント | `YOUR_AURORA_ENDPOINT.cluster-xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com` |
| ElastiCache エンドポイント | `YOUR_ELASTICACHE_ENDPOINT.xxxxxx.ng.0001.apne1.cache.amazonaws.com` |
| S3 バケット | `mmdpf-files-production` |
| Bedrock リージョン | `ap-northeast-1` |

### ECSタスク構成

**alchemia-backend-service**

| コンテナ名 | イメージ | 役割 |
|---|---|---|
| `mmdpf-backend` | `ECR/mmdpf-backend:staging` | Node.js APIサーバー |

**alchemia-nginx-service**

| コンテナ名 | イメージ | 役割 |
|---|---|---|
| `mmdpf-frontend` | `ECR/mmdpf-frontend:staging` | Next.js フロントエンド（ポート 3000） |
| `mmdpf-nginx` | `ECR/mmdpf-nginx:staging` | リバースプロキシ（ポート 80/443） |

---

## 3. 前提条件

### 開発機の要件

| 項目 | 要件 |
|---|---|
| AWS CLI | v2.x 以上、設定済み |
| Docker | 26.x 以上 |
| psql | PostgreSQL クライアント（`--migrate` 使用時のみ） |
| IAM 権限 | ECR push、ECS update-service、register-task-definition |

### AWS事前準備（初回のみ）

- [ ] Aurora PostgreSQL クラスターの作成
- [ ] ElastiCache for Redis クラスターの作成
- [ ] S3 バケットの作成
- [ ] Bedrock モデルアクセスの有効化（コンソールから申請）
- [ ] ECS クラスター `alchemia-staging` の作成
- [ ] ECR リポジトリ 3 つの作成（`mmdpf-backend`、`mmdpf-frontend`、`mmdpf-nginx`）
- [ ] NLB の作成（TCPリスナー ポート443・ポート80、ターゲットグループ設定）※TLSを終端しないTCPパススルー構成
- [ ] ECS サービス 2 つの作成（`alchemia-backend-service`、`alchemia-nginx-service`）
- [ ] IAM ロールへの Bedrock 権限付与（`ecsTaskRole`）
- [ ] セキュリティグループの設定（ECS タスク間通信、Aurora/ElastiCache アクセス許可）

---

## 4. 初回セットアップ

### 4.1 環境変数ファイルの準備

```bash
# テンプレートをコピーして編集
cp .env.prod.aws.example .env.prod.aws
vi .env.prod.aws
```

**必ず変更が必要な項目：**

```dotenv
# Aurora エンドポイント
DB_HOST=YOUR_AURORA_ENDPOINT.cluster-xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# ElastiCache エンドポイント
REDIS_HOST=YOUR_ELASTICACHE_ENDPOINT.xxxxxx.ng.0001.apne1.cache.amazonaws.com
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD

# S3 バケット名
AWS_S3_BUCKET=your-actual-bucket-name

# JWT / Session シークレット（64文字以上のランダム文字列）
# 生成コマンド: openssl rand -hex 64
JWT_SECRET=CHANGE_ME_64CHARS_RANDOM
SESSION_SECRET=CHANGE_ME_64CHARS_RANDOM

# NLB URL（NLBのDNS名を設定。nginxがSSL終端するため、CORS_ORIGIN はnginx側のドメインを指定）
CORS_ORIGIN=https://your-nlb-domain.ap-northeast-1.elb.amazonaws.com
FRONTEND_URL=https://your-nlb-domain.ap-northeast-1.elb.amazonaws.com
```

### 4.2 ECSタスク定義JSONの更新

`aws/ecs-task-definition-alchemia-backend.json` を実環境の値に合わせて編集します。

```bash
vi aws/ecs-task-definition-alchemia-backend.json
```

変更が必要な箇所：

```json
{ "name": "DB_HOST",    "value": "YOUR_AURORA_ENDPOINT.cluster-xxxxxxxxxx..." },
{ "name": "DB_PASSWORD","value": "実際のパスワード" },
{ "name": "REDIS_HOST", "value": "YOUR_ELASTICACHE_ENDPOINT..." },
{ "name": "JWT_SECRET", "value": "実際のシークレット" },
{ "name": "SESSION_SECRET", "value": "実際のシークレット" },
{ "name": "CORS_ORIGIN","value": "https://実際のNLBドメイン" }
```

### 4.3 DBセットアップ（スキーマ＋設定データ投入）

Aurora への初回セットアップは以下の手順で行います。スキーマ適用 → 設定データ投入 → マイグレーション差分適用の順に実行してください。

> **注意**: Aurora に接続するためのネットワーク経路（VPN、踏み台サーバー等）が必要です。
> ローカルから直接接続できない場合は、踏み台サーバー経由で実行してください。

```bash
# 接続情報を環境変数に設定（以降の手順で共通して使用）
export AURORA_HOST=YOUR_AURORA_ENDPOINT.cluster-xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com
export DB_PORT=5432
export DB_NAME=maiml_db
export DB_USER=maiml_user
export DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD
```

#### 手順1: スキーマの適用

```bash
# スキーマを適用（テーブル・インデックス・制約を作成）
PGPASSWORD=${DB_PASSWORD} psql \
  -h ${AURORA_HOST} \
  -p ${DB_PORT} \
  -U ${DB_USER} \
  -d ${DB_NAME} \
  --set=sslmode=require \
  -f dist/mmdpf-schema.sql

echo "✅ スキーマ適用完了"
```

#### 手順2: テーブル作成の確認

```bash
# テーブル一覧を確認（主要テーブルが存在すること）
PGPASSWORD=${DB_PASSWORD} psql \
  -h ${AURORA_HOST} \
  -p ${DB_PORT} \
  -U ${DB_USER} \
  -d ${DB_NAME} \
  --set=sslmode=require \
  -c "\dt"
```

#### 手順3: 設定データの投入

```bash
# 設定データを投入（organization, department, role 等）
PGPASSWORD=${DB_PASSWORD} psql \
  -h ${AURORA_HOST} \
  -p ${DB_PORT} \
  -U ${DB_USER} \
  -d ${DB_NAME} \
  --set=sslmode=require \
  -f dist/mmdpf-config-data.sql

echo "✅ 設定データ投入完了"
```

#### 手順4: データ投入の確認

```bash
# 組織データの確認
PGPASSWORD=${DB_PASSWORD} psql \
  -h ${AURORA_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} \
  --set=sslmode=require \
  -c "SELECT organization_id, organization_name FROM organization;"

# ロールデータの確認
PGPASSWORD=${DB_PASSWORD} psql \
  -h ${AURORA_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} \
  --set=sslmode=require \
  -c "SELECT role_id, role_name FROM role LIMIT 10;"

# ユーザー認証情報の確認
PGPASSWORD=${DB_PASSWORD} psql \
  -h ${AURORA_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} \
  --set=sslmode=require \
  -c "SELECT user_id, login_id FROM user_authentication LIMIT 10;"
```

#### 手順5: マイグレーション差分の適用

スキーマダンプ後に追加されたマイグレーションがある場合、`--migrate` オプションで差分を適用します。

```bash
# 環境変数を設定してマイグレーション実行
export DB_HOST=${AURORA_HOST}

./scripts/deploy.ecr.sh --migrate --no-build --no-push --no-deploy
```

> **注意**: `--migrate` は `backend/migrations/*.sql`（rollbackファイルを除く）を日付順に全て適用します。
> スキーマダンプ適用済みのテーブルへの重複適用を防ぐため、SQLファイルは `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` 等でべき等に作成してください。

---

## 5. デプロイ手順

### デプロイスクリプト: `scripts/deploy.ecr.sh`

SaaS版向けの **ECRデプロイ自動化スクリプト**です。以下のステップを一括実行します：

1. 前提条件チェック（Docker, AWS CLI, 認証, ECSクラスター）
2. ECRログイン
3. Dockerイメージビルド（backend / frontend / nginx）
4. ECRプッシュ
5. DBマイグレーション（オプション）
6. ECSタスク定義の登録 & サービス更新（ローリングデプロイ）
7. 安定化待ち（オプション）

### オプション一覧

| オプション | 説明 | デフォルト |
|---|---|---|
| `--no-build` | イメージのビルドをスキップ | false |
| `--no-push` | ECRへのプッシュをスキップ | false |
| `--no-deploy` | ECSデプロイをスキップ | false |
| `--migrate` | DBマイグレーションを実行（Aurora直接接続） | false |
| `--backend` | バックエンドのみ対象 | 両方 |
| `--nginx` | nginx（frontend含む）のみ対象 | 両方 |
| `--wait` | ECSサービス安定化まで待機 | false |
| `--tag <TAG>` | イメージタグを指定 | `staging` |

### ① フルデプロイ（標準）

```bash
# リポジトリを最新化
git pull

# AWS CLI 認証確認
aws sts get-caller-identity

# フルデプロイ（backend + nginx(frontend含む) 両方）
./scripts/deploy.ecr.sh
```

### ② DBマイグレーション付きフルデプロイ

スキーマ変更を含むリリース時は `--migrate` を追加します。

```bash
# Aurora への接続情報を環境変数で渡す
export DB_HOST=YOUR_AURORA_ENDPOINT.cluster-xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com
export DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD

./scripts/deploy.ecr.sh --migrate
```

> **注意**: `--migrate` は `backend/migrations/*.sql`（rollbackファイルを除く）を日付順に全て適用します。
> SQLファイルは `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` 等でべき等に作成してください。

### ③ バックエンドのみデプロイ

APIのみ更新する場合：

```bash
./scripts/deploy.ecr.sh --backend
```

### ④ nginx（frontend含む）のみデプロイ

UI変更のみの場合：

```bash
./scripts/deploy.ecr.sh --nginx
```

### ⑤ 安定化まで待機

デプロイ後にECSサービスが完全に起動するまで待つ場合：

```bash
./scripts/deploy.ecr.sh --wait
```

### ⑥ 再デプロイ（ビルドなし）

イメージを再ビルドせず既存のECRイメージでECSタスクを再起動する場合：

```bash
./scripts/deploy.ecr.sh --no-build --no-push
```

---

## 6. DBマイグレーション

### 手動マイグレーション（特定ファイルのみ）

特定のSQLファイルだけを Aurora に適用する場合：

```bash
# Aurora に直接 psql で接続して適用
PGPASSWORD=YOUR_PASSWORD psql \
  -h YOUR_AURORA_ENDPOINT.cluster-xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com \
  -p 5432 \
  -U maiml_user \
  -d maiml_db \
  --set=sslmode=require \
  -f backend/migrations/YYYYMMDD_your_migration.sql
```

### マイグレーション規約

- **ファイル名**: `backend/migrations/YYYYMMDD_<説明>.sql`
- **べき等性必須**: `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` を使用
- **ロールバックファイル**: 必要に応じて `YYYYMMDD_rollback_<説明>.sql` を作成
- **ロールバックファイルは自動適用されない**（`--migrate` では `rollback` を含むファイルを除外）

### SQLファイルの記述例

```sql
-- maiml_draftsテーブルにproject_idカラムを追加
ALTER TABLE maiml_drafts
ADD COLUMN IF NOT EXISTS project_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_maiml_drafts_project_id
  ON maiml_drafts(project_id);

COMMENT ON COLUMN maiml_drafts.project_id IS 'プロジェクトID（Draft特定用）';
```

---

## 7. デプロイ後の確認

### ECSサービス状態確認

```bash
# backend サービス
aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-backend-service \
  --region ap-northeast-1 \
  --query 'services[0].{running:runningCount,pending:pendingCount,desired:desiredCount}'

# nginx サービス（frontend含む）
aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-nginx-service \
  --region ap-northeast-1 \
  --query 'services[0].{running:runningCount,pending:pendingCount,desired:desiredCount}'
```

### ヘルスチェック

```bash
# APIヘルスチェック
curl https://your-nlb-domain.ap-northeast-1.elb.amazonaws.com/api/health

# 期待レスポンス: {"status":"ok"}
```

### ログ確認

```bash
# バックエンドログ（直近10分）
aws logs tail /ecs/alchemia-backend --region ap-northeast-1 --since 10m

# nginx / frontend ログ（直近10分）
aws logs tail /ecs/alchemia-nginx --region ap-northeast-1 --since 10m

# リアルタイム追跡
aws logs tail /ecs/alchemia-backend --region ap-northeast-1 --follow
```

### AWSコンソール

- ECSクラスター: https://console.aws.amazon.com/ecs/home?region=ap-northeast-1#/clusters/alchemia-staging/services
- CloudWatch (Backend): https://console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#logsV2:log-groups/log-group/%2Fecs%2Falchemia-backend
- CloudWatch (Nginx): https://console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#logsV2:log-groups/log-group/%2Fecs%2Falchemia-nginx

---

## 8. ロールバック手順

### 前バージョンへのロールバック

```bash
# タスク定義リビジョン一覧を確認
aws ecs list-task-definitions \
  --family-prefix alchemia-backend \
  --region ap-northeast-1 \
  --sort DESC \
  --query 'taskDefinitionArns[:5]'

# 前のリビジョンにロールバック（例: リビジョン10に戻す）
aws ecs update-service \
  --cluster alchemia-staging \
  --service alchemia-backend-service \
  --task-definition alchemia-backend:10 \
  --force-new-deployment \
  --region ap-northeast-1

# nginx もロールバックする場合
aws ecs update-service \
  --cluster alchemia-staging \
  --service alchemia-nginx-service \
  --task-definition alchemia-nginx:10 \
  --force-new-deployment \
  --region ap-northeast-1
```

---

## 9. 運用コマンド集

### サービスの再起動

```bash
# backend サービスを強制再起動（新しいタスクを起動）
aws ecs update-service \
  --cluster alchemia-staging \
  --service alchemia-backend-service \
  --force-new-deployment \
  --region ap-northeast-1

# nginx サービスを強制再起動
aws ecs update-service \
  --cluster alchemia-staging \
  --service alchemia-nginx-service \
  --force-new-deployment \
  --region ap-northeast-1
```

### タスクの確認

```bash
# 稼働中のタスク一覧
aws ecs list-tasks \
  --cluster alchemia-staging \
  --service-name alchemia-backend-service \
  --region ap-northeast-1

# タスクの詳細確認
aws ecs describe-tasks \
  --cluster alchemia-staging \
  --tasks <TASK_ARN> \
  --region ap-northeast-1
```

### Aurora への接続（踏み台経由）

```bash
# 踏み台サーバー経由でポートフォワード
ssh -L 5432:YOUR_AURORA_ENDPOINT:5432 user@bastion-host

# ローカルから接続
PGPASSWORD=YOUR_PASSWORD psql \
  -h localhost \
  -p 5432 \
  -U maiml_user \
  -d maiml_db \
  --set=sslmode=require
```

### S3 操作確認

```bash
# バケット内のオブジェクト一覧確認
aws s3 ls s3://mmdpf-files-production/ --region ap-northeast-1

# 特定組織のファイル確認
aws s3 ls s3://mmdpf-files-production/YOUR_ORG_ID/ --region ap-northeast-1
```

---

## 10. トラブルシューティング

### コンテナが起動しない

```bash
# タスク失敗の詳細確認
aws ecs describe-tasks \
  --cluster alchemia-staging \
  --tasks $(aws ecs list-tasks \
    --cluster alchemia-staging \
    --service-name alchemia-backend-service \
    --region ap-northeast-1 \
    --query 'taskArns[0]' \
    --output text) \
  --region ap-northeast-1 \
  --query 'tasks[0].containers[*].{name:name,reason:reason,status:lastStatus}'

# CloudWatch ログを確認
aws logs tail /ecs/alchemia-backend --region ap-northeast-1 --since 30m
```

### Aurora に接続できない

```bash
# セキュリティグループの確認（ECSタスクのSGからAuroraのSGへ5432の許可があるか）
aws ec2 describe-security-groups \
  --group-ids sg-xxxxxxxxxx \
  --region ap-northeast-1 \
  --query 'SecurityGroups[0].IpPermissions'

# タスク定義の DB_HOST 設定確認
aws ecs describe-task-definition \
  --task-definition alchemia-backend \
  --region ap-northeast-1 \
  --query 'taskDefinition.containerDefinitions[0].environment[?name==`DB_HOST`]'
```

### ElastiCache に接続できない

```bash
# セキュリティグループの確認（ECSタスクのSGからElastiCacheのSGへ6379の許可があるか）
# タスク定義の REDIS_HOST 設定確認
aws ecs describe-task-definition \
  --task-definition alchemia-backend \
  --region ap-northeast-1 \
  --query 'taskDefinition.containerDefinitions[0].environment[?name==`REDIS_HOST`]'
```

### Bedrock の呼び出しが失敗する

```bash
# ECS Task Role の Bedrock 権限確認
aws iam get-role-policy \
  --role-name ecsTaskRole \
  --policy-name BedrockPolicy 2>/dev/null || \
aws iam list-attached-role-policies \
  --role-name ecsTaskRole

# Bedrock モデルアクセスの確認（コンソールで確認推奨）
# https://console.aws.amazon.com/bedrock/home?region=ap-northeast-1#/modelaccess
```

### ECRプッシュが失敗する

```bash
# ECR 再ログイン
aws ecr get-login-password --region ap-northeast-1 \
  | docker login --username AWS --password-stdin \
    137068252939.dkr.ecr.ap-northeast-1.amazonaws.com

# ECR リポジトリの存在確認
aws ecr describe-repositories \
  --region ap-northeast-1 \
  --query 'repositories[*].repositoryName'
```

---

## 11. デプロイチェックリスト

### 初回セットアップ（DBセットアップ）

- [ ] Aurora への接続経路（VPN、踏み台サーバー等）が確保されている
- [ ] `dist/mmdpf-schema.sql` が用意されている（`deploy-guide-dev.md` の STEP 2.5 参照）
- [ ] `dist/mmdpf-config-data.sql` が用意されている（`deploy-guide-dev.md` の STEP 2.5 参照）
- [ ] スキーマ適用完了（`dist/mmdpf-schema.sql`）
- [ ] テーブル一覧で主要テーブルが作成されていることを確認済み（`\dt`）
- [ ] 設定データ投入完了（`dist/mmdpf-config-data.sql`）
- [ ] organization / role / user_authentication データが存在することを確認済み
- [ ] マイグレーション差分がある場合は `--migrate` で適用済み

### デプロイ前

- [ ] `git pull` で最新コードを取得済み
- [ ] テストが通過している
- [ ] `backend/migrations/` に新しいSQLがあれば内容確認済み
- [ ] ECSタスク定義 JSON の環境変数が実環境の値になっている
- [ ] AWS CLIの認証が有効（`aws sts get-caller-identity`）
- [ ] スキーマ変更がある場合は `--migrate` の実行計画を確認済み

### デプロイ後

- [ ] `alchemia-backend-service` の `runningCount` が `desiredCount` と一致
- [ ] `alchemia-nginx-service` の `runningCount` が `desiredCount` と一致
- [ ] `GET /api/health` が `{"status":"ok"}` を返す
- [ ] CloudWatch Logs にエラーがない
- [ ] NLB URL でブラウザアクセスができる

---

## ベストプラクティス

### DO（推奨）

✅ デプロイ前に必ず `git pull` で最新化する  
✅ マイグレーションはSQLをべき等に書く（`IF NOT EXISTS`）  
✅ 大きな変更は `--wait` で安定化を確認する  
✅ デプロイ後は必ずヘルスチェックを実施する  
✅ ロールバック先のタスク定義リビジョンを事前に確認しておく  
✅ デプロイログは `logs/deploy-ecr-*.log` に自動保存される  
✅ タスク定義 JSON の機密情報は AWS Secrets Manager に移行することを推奨  
✅ Bedrock 権限は ECS Task Role の IAM で付与し、アクセスキーを使わない  

### DON'T（非推奨）

❌ マイグレーションSQLをべき等なしで作成しない  
❌ テスト未実施のままデプロイしない  
❌ ロールバック手順を確認せずにデプロイしない  
❌ タスク定義JSONに平文パスワードを書いたままコミットしない（Secrets Manager を利用する）  
❌ タスク定義JSONを直接AWSコンソールで変更しない（JSONファイルを更新してスクリプト経由で適用）  
❌ Bedrock アクセスキーをコンテナ環境変数にハードコーディングしない  

---

*本手順書はmmdpfプロジェクトのSaaS版（AWS ECS Fargate）デプロイ用です。オンプレミス版のデプロイは `deploy-guide-dev.md` / `deploy-guide-server.md` を参照してください。*

# デプロイ規約

## 概要

MaiML ViewerはAWS ECSを使用したコンテナベースのデプロイを採用しています。フロントエンドとバックエンドは別々のサービスとして管理され、Docker Composeによる開発環境とECSによる本番環境を提供しています。

## デプロイメント環境

### 開発環境
- **ツール**: Docker Compose
- **起動方法**: `docker-compose up -d`
- **ポート**: フロントエンド (3000)、バックエンド (3001)
- **データベース**: PostgreSQL コンテナ

### 本番環境
- **インフラ**: AWS ECS (Elastic Container Service)
- **実行モード**: Fargate
- **Webサーバー**: Nginx（リバースプロキシ）
- **データベース**: AWS Aurora PostgreSQL
- **ストレージ**: AWS S3
- **検索エンジン**: AWS Athena + Glue

## デプロイスクリプト

### 利用可能なスクリプト

#### フルデプロイ（ECS）
```bash
./scripts/deployment/deploy-ecs-service-connect.sh
```
- フロントエンドとバックエンドの両方をデプロイ
- ECS Service Connectを使用
- ローリングアップデートで無停止デプロイ

#### フロントエンドのみ
```bash
./scripts/deployment/deploy-frontend-service-connect.sh
```
- フロントエンドのみを更新
- 静的ファイルの更新に使用

#### バックエンドのみ（ホットフィックス）
```bash
./scripts/deployment/deploy-backend-hotfix.sh
```
- バックエンドのみを緊急更新
- バグ修正や小規模な変更に使用

### デプロイワークフロー

#### 1. ビルド前の確認
- [ ] すべてのテストが成功している
- [ ] Lintエラーがない
- [ ] 機密情報が含まれていない
- [ ] 環境変数が正しく設定されている
- [ ] バージョン番号が更新されている

#### 2. Dockerイメージのビルド
```bash
# フロントエンド
cd frontend
docker build -t maiml-viewer-frontend:latest .

# バックエンド
cd backend
docker build -t maiml-viewer-backend:latest .
```

#### 3. イメージのテスト
```bash
# ローカルでコンテナを起動してテスト
docker run -p 3000:3000 maiml-viewer-frontend:latest
docker run -p 3001:3001 maiml-viewer-backend:latest
```

#### 4. ECRへのプッシュ
```bash
# AWS ECRにログイン
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.ap-northeast-1.amazonaws.com

# イメージをタグ付け
docker tag maiml-viewer-frontend:latest <ECR_REPOSITORY_URL>/maiml-viewer-frontend:latest
docker tag maiml-viewer-backend:latest <ECR_REPOSITORY_URL>/maiml-viewer-backend:latest

# プッシュ
docker push <ECR_REPOSITORY_URL>/maiml-viewer-frontend:latest
docker push <ECR_REPOSITORY_URL>/maiml-viewer-backend:latest
```

#### 5. ECSサービスの更新
```bash
# デプロイスクリプトを実行
./scripts/deployment/deploy-ecs-service-connect.sh
```

#### 6. デプロイ後の確認
- [ ] ヘルスチェックが成功している
- [ ] ログにエラーがない
- [ ] 主要機能が正常に動作している
- [ ] データベース接続が正常
- [ ] S3アクセスが正常

## Docker設定

### フロントエンド Dockerfile
- **ベースイメージ**: node:18-alpine
- **マルチステージビルド**: 使用
- **Nginxサーバー**: 本番環境で使用
- **ポート**: 3000

### バックエンド Dockerfile
- **ベースイメージ**: node:18-alpine
- **作業ディレクトリ**: /app
- **ポート**: 3001
- **環境変数**: .env経由で設定

### docker-compose.yml
- **サービス**: frontend, backend, database
- **ネットワーク**: bridge
- **ボリューム**: データベース永続化

## 環境変数管理

### 開発環境
- `.env.development` (フロントエンド)
- `.env` (バックエンド)
- Git管理外（.gitignoreに含める）

### 本番環境
- AWS Secrets Manager で管理
- ECSタスク定義で環境変数を注入
- 機密情報は暗号化して保存

### 必須環境変数

#### フロントエンド
```
REACT_APP_API_URL=<バックエンドURL>
REACT_APP_VERSION=<バージョン>
```

#### バックエンド
```
NODE_ENV=production
PORT=3001
DB_HOST=<Auroraエンドポイント>
DB_PORT=5432
DB_NAME=maiml_db
DB_USER=<ユーザー名>
DB_PASSWORD=<パスワード>
JWT_SECRET=<秘密鍵>
SESSION_SECRET=<セッション秘密鍵>
AWS_REGION=ap-northeast-1
AWS_S3_BUCKET=<S3バケット名>
AWS_ACCESS_KEY_ID=<アクセスキー>
AWS_SECRET_ACCESS_KEY=<シークレットキー>
```

## ロールバック手順

### 問題発生時の対応

#### 1. 即座にロールバック
```bash
# 前のタスク定義にロールバック
aws ecs update-service \
  --cluster maiml-cluster \
  --service maiml-backend-service \
  --task-definition maiml-backend:previous-version
```

#### 2. ログの確認
```bash
# CloudWatch Logsでエラー確認
aws logs tail /ecs/maiml-backend --follow
```

#### 3. データベースのロールバック
- マイグレーションスクリプトを使用
- バックアップからの復元（必要に応じて）

#### 4. 原因調査と修正
- エラーログの詳細分析
- ローカル環境で再現テスト
- 修正後、再デプロイ

## モニタリング

### ヘルスチェック

#### フロントエンド
```bash
curl http://localhost:3000
```

#### バックエンド
```bash
curl http://localhost:3001/api/health
```

### ログ確認

#### ローカル
```bash
# フロントエンド
docker logs maiml-frontend

# バックエンド
docker logs maiml-backend
npm run logs  # Winston logs
```

#### 本番環境
- AWS CloudWatch Logs
- ECSタスクログ
- アプリケーションログ（Winston）

### メトリクス

- **CPU使用率**: CloudWatch
- **メモリ使用率**: CloudWatch
- **リクエスト数**: Application Load Balancer
- **エラー率**: CloudWatch Logs Insights
- **レスポンス時間**: X-Ray（オプション）

## データベースマイグレーション

### マイグレーション実行
```bash
cd backend
npm run db:migrate
```

### ロールバック
```bash
npm run db:rollback
```

### バックアップ
```bash
# 定期バックアップ
./scripts/aws/backup-database.sh

# 手動バックアップ
pg_dump -h <host> -U <user> -d <database> > backup.sql
```

## セキュリティ

### デプロイ前のチェック
- [ ] 脆弱性スキャン（npm audit）
- [ ] Dockerイメージのスキャン
- [ ] 機密情報の削除確認
- [ ] アクセス権限の確認

### セキュリティグループ
- フロントエンド: ポート80, 443のみ公開
- バックエンド: VPC内からのみアクセス可能
- データベース: バックエンドからのみアクセス可能

## トラブルシューティング

### よくある問題

#### コンテナが起動しない
1. ログを確認
2. 環境変数を確認
3. ポート競合を確認
4. リソース不足を確認

#### データベース接続エラー
1. 接続情報を確認
2. セキュリティグループを確認
3. VPC設定を確認
4. 認証情報を確認

#### S3アクセスエラー
1. IAMロールを確認
2. バケットポリシーを確認
3. リージョン設定を確認
4. アクセスキーを確認

## ベストプラクティス

### DO（推奨）
✅ デプロイ前に必ずテストを実行する
✅ マイグレーションはデプロイ前に実行する
✅ ロールバック計画を準備する
✅ デプロイ後の動作確認を行う
✅ ログを監視する
✅ バックアップを定期的に取る
✅ セキュリティスキャンを実行する
✅ タグ付けでバージョン管理する

### DON'T（非推奨）
❌ 本番環境で直接修正しない
❌ テストなしでデプロイしない
❌ ロールバック手順を確認せずにデプロイしない
❌ 機密情報をコードに含めない
❌ デプロイ後の確認を怠らない
❌ ログを無視しない
❌ バックアップを取らずにマイグレーションしない

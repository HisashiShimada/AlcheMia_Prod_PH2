# MMDPF (Multi-Modal Data Platform)

マルチモーダルデータプラットフォーム - 材料科学分野における実験データ管理・可視化システム

## 概要

MAIML（Materials Informatics Markup Language）形式のXMLファイルを基盤とし、Petri Net形式での実験ワークフローの可視化、実験記録の管理、ワーカーによる分散作業をサポートするマルチテナント対応Webアプリケーションです。

## 技術スタック

### フロントエンド
- **Next.js** 15系 (App Router)
- **Ant Design** v6
- **ReactFlow** 11.11.4
- **TypeScript** 5.7.2

### バックエンド
- **Node.js** 24系
- **Express.js** 4.21系
- **TypeScript** 5.7.2
- **PostgreSQL** 18+

### インフラ
- **Docker** & Docker Compose
- **AWS ECS** (本番環境)
- **AWS S3** (ファイルストレージ)

## 環境構築

### 必要な環境
- Node.js >= 24.0.0
- npm >= 11.0.0
- Docker & Docker Compose
- PostgreSQL 18+ (ローカル開発の場合)

### セットアップ手順

1. **リポジトリのクローン**
```bash
git clone <repository-url>
cd mmdpf
```

2. **環境変数の設定**

バックエンド:
```bash
cd backend
cp .env.example .env
# .envファイルを編集して適切な値を設定
```

フロントエンド:
```bash
cd frontend
cp .env.example .env.local
# .env.localファイルを編集して適切な値を設定
```

3. **依存関係のインストール**

バックエンド:
```bash
cd backend
npm install
```

フロントエンド:
```bash
cd frontend
npm install
```

4. **Docker Composeで起動**

```bash
# プロジェクトルートで実行
docker-compose up -d
```

サービスが起動したら:
- フロントエンド: http://localhost:3000
- バックエンド: http://localhost:3001
- PostgreSQL: localhost:5432

5. **Ollama（セマンティック検索）の起動**

セマンティック検索機能を使用する場合は、Ollamaサービスを別途起動してください。

> **前提**: 先に手順4のDocker Composeを起動し、`mmdpf-network` を作成しておく必要があります。

```bash
# プロジェクトルートで実行
docker compose -f docker-compose.ollama.yml up -d
```

初回起動時に `embeddinggemma:latest` モデルが自動ダウンロードされます（数分かかります）。
進捗はログで確認できます：

```bash
docker compose -f docker-compose.ollama.yml logs -f ollama-init
```

接続確認：
```bash
curl http://localhost:11434/api/tags
```

Embeddingテスト：
```bash
npx ts-node backend/scripts/test-ollama-embedding.ts
```

停止方法：
```bash
docker compose -f docker-compose.ollama.yml down
```

> **バックエンド環境変数の設定** (`backend/.env`):
> ```
> OLLAMA_HOST=http://localhost:11434
> OLLAMA_EMBEDDING_MODEL=embeddinggemma:latest
> ```
> Dockerコンテナ内のバックエンドから接続する場合は `http://ollama:11434` を使用してください。

6. **ローカル開発（Docker不使用）**

バックエンド:
```bash
cd backend
npm run dev
```

フロントエンド:
```bash
cd frontend
npm run dev
```

## 開発コマンド

### バックエンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # ビルド
npm start            # 本番モードで起動
npm test             # テスト実行
npm run test:watch   # テスト監視モード
npm run test:coverage # カバレッジ付きテスト
npm run lint         # ESLint実行
npm run lint:fix     # ESLint自動修正
npm run format       # Prettier実行
```

### フロントエンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # ビルド
npm start            # 本番モードで起動
npm run lint         # Next.js ESLint実行
```

## プロジェクト構造

```
mmdpf/
├── backend/              # バックエンド (Express + TypeScript)
│   ├── src/
│   │   ├── routes/       # APIルート
│   │   ├── middleware/   # Expressミドルウェア
│   │   ├── services/     # ビジネスロジック
│   │   ├── repository/   # データアクセス層
│   │   ├── config/       # 設定ファイル
│   │   ├── utils/        # ユーティリティ
│   │   ├── constants/    # 定数定義
│   │   └── server.ts     # エントリーポイント
│   ├── tests/            # テストコード
│   ├── logs/             # ログファイル
│   └── output/           # 生成ファイル
│
├── frontend/             # フロントエンド (Next.js 15)
│   └── src/
│       ├── app/          # App Router pages
│       ├── components/   # Reactコンポーネント
│       └── lib/          # ライブラリ・ユーティリティ
│
├── config/               # インフラ設定
│   ├── nginx/            # Nginx設定
│   ├── aws/              # AWS設定
│   └── ecs/              # ECS設定
│
├── scripts/              # スクリプト
│   ├── aws/              # AWSスクリプト
│   ├── database/         # DBマイグレーション
│   └── deployment/       # デプロイスクリプト
│
├── docs/                 # ドキュメント
│   ├── design/           # 設計書
│   └── .kiro/            # Kiro specs
│
├── specification/        # MAIML仕様
│   └── MaiML-Schema-1_0/ # スキーマ定義
│
└── docker-compose.yml    # Docker Compose設定
```

## 主要機能

### Phase 1（現在開発中）
- ✅ マルチテナント認証・認可システム
- ✅ ロール別メニュー（6種類のロール）
- ✅ MAIMLファイル管理（閲覧/編集/保存）
- ✅ Petri Net可視化エディタ（複数Method対応）
  - Undo/Redo、Draft自動保存
  - テンプレート編集、ドキュメント編集
  - Workflow追加、名前空間操作
  - Export機能（PNG/SVG/JSON）
- ✅ S3/Swift ベースのファイル管理
- ⏳ 実験記録管理
- ⏳ ワーカー協働機能
- ⏳ 多言語対応（日本語）

## テスト

### バックエンドテスト実行

```bash
cd backend
npm test                  # 全テスト実行
npm run test:unit         # ユニットテストのみ
npm run test:integration  # 統合テストのみ
npm run test:coverage     # カバレッジレポート生成
```

### テストカバレッジ目標
- Branches: 70%以上
- Functions: 70%以上
- Lines: 70%以上
- Statements: 70%以上

## デプロイ

### 前提条件

| ツール | バージョン |
|--------|-----------|
| Docker | 24.0以上 |
| Docker Compose | v2.0以上 |
| AWS CLI | v2.0以上（AWSデプロイ時） |

---

### オンプレ環境（Ubuntu + docker-compose）

Swift（オブジェクトストレージ）・nginx・PostgreSQL・Redis・backend・frontendを全て docker-compose で起動します。

#### 1. 環境変数の設定

```bash
cp .env.prod.onprem.example .env
vi .env   # 各値を実環境に合わせて編集（パスワード等を必ず変更）
```

#### 2. SSL証明書の配置

```bash
# サーバー証明書（nginx用）
backend/certs/server/server.crt
backend/certs/server/server.key

# CA証明書（クライアント証明書検証用）
backend/certs/ca/ca.crt

# 証明書を生成する場合
npm --prefix backend run generate:server-cert
```

#### 3. デプロイ実行

```bash
chmod +x scripts/deploy.onprem.sh
./scripts/deploy.onprem.sh
```

デプロイスクリプトが以下を自動実行します：
- Docker イメージのビルド
- PostgreSQL / Redis / Swift の起動
- DB マイグレーションの実行
- backend / frontend / nginx の起動
- ヘルスチェック

#### オプション

```bash
./scripts/deploy.onprem.sh --no-build    # イメージビルドをスキップ
./scripts/deploy.onprem.sh --no-migrate  # DBマイグレーションをスキップ
./scripts/deploy.onprem.sh --pull        # 最新ベースイメージをpullしてビルド
```

#### 手動起動（docker-compose コマンド直接使用）

```bash
# 全サービス起動（Swift + nginx 含む）
docker-compose -f docker-compose.prod.yml --profile onprem up -d

# ログ確認
docker-compose -f docker-compose.prod.yml --profile onprem logs -f

# 停止
docker-compose -f docker-compose.prod.yml --profile onprem down
```

サービスが起動したら:
- HTTPS: https://localhost/
- Backend API: http://localhost:3001/api/v1/

---

### AWS環境（ECS Fargate + RDS + ElastiCache + S3）

#### 前提: AWSリソースの準備

デプロイ前に以下のAWSリソースが必要です：

| リソース | 用途 |
|---------|------|
| ECR リポジトリ × 2 | backend / frontend イメージ保存 |
| ECS クラスター | コンテナ実行基盤 |
| ECS サービス × 2 | backend / frontend サービス管理 |
| RDS Aurora PostgreSQL | データベース |
| ElastiCache for Redis | セッションストア |
| S3 バケット | ファイルストレージ |
| ALB | ロードバランサー（HTTPS終端） |
| Secrets Manager | 機密情報管理（推奨） |
| IAM ロール | ECS タスクロール・実行ロール |

#### 1. 環境変数の設定

```bash
cp .env.prod.aws.example .env
vi .env   # AWS リソース情報（アカウントID・エンドポイント等）を設定
```

主要な設定項目：
```bash
AWS_ACCOUNT_ID=123456789012
AWS_ECR_REGION=ap-northeast-1
ECR_REPOSITORY_BACKEND=mmdpf-backend
ECR_REPOSITORY_FRONTEND=mmdpf-frontend
ECS_CLUSTER=mmdpf-production
ECS_SERVICE_BACKEND=mmdpf-backend-service
ECS_SERVICE_FRONTEND=mmdpf-frontend-service
DB_HOST=YOUR_RDS_ENDPOINT.rds.amazonaws.com
REDIS_HOST=YOUR_ELASTICACHE_ENDPOINT.cache.amazonaws.com
```

#### 2. ECS タスク定義の調整

`aws/ecs-task-definition-backend.json` と `aws/ecs-task-definition-frontend.json` 内の
`<PLACEHOLDER>` を実環境の値に合わせて確認・調整してください。

#### 3. デプロイ実行

```bash
chmod +x scripts/deploy.aws.sh
./scripts/deploy.aws.sh
```

デプロイスクリプトが以下を自動実行します：
- ECR へのログイン
- Docker イメージのビルド & ECR へのプッシュ（タグ: Gitコミットハッシュ）
- ECS タスク定義の更新
- ECS サービスのローリングデプロイ

#### オプション

```bash
./scripts/deploy.aws.sh --no-build          # イメージビルドをスキップ
./scripts/deploy.aws.sh --backend           # バックエンドのみデプロイ
./scripts/deploy.aws.sh --frontend          # フロントエンドのみデプロイ
./scripts/deploy.aws.sh --tag v1.2.3        # イメージタグを指定
```

---

### バージョン情報

| サービス | イメージ |
|---------|---------|
| PostgreSQL | `postgres:17-alpine` |
| Redis | `redis:8-alpine` |
| Node.js (backend/frontend) | `node:24-alpine` |
| nginx | `nginx:alpine` |

## セキュリティ

- JWT + Session Hybrid認証
- bcryptパスワードハッシュ化
- organization_id に基づくマルチテナント分離
- Parameterized Queries（SQLインジェクション対策）
- レート制限
- セキュリティヘッダー

詳細は `.clinerules/security.md` を参照してください。

## コーディング規約

プロジェクトのコーディング規約は `.clinerules/` ディレクトリに定義されています：

- `base.md` - 基本ルール
- `frontend.md` - フロントエンド規約
- `backend.md` - バックエンド規約
- `security.md` - セキュリティ規約
- `test.md` - テスト規約
- `deploy.md` - デプロイ規約

## ライセンス

UNLICENSED

## 開発チーム

Development Team

## 問い合わせ

プロジェクトに関する問い合わせは、開発チームまでご連絡ください。

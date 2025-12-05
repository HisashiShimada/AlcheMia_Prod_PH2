# プロジェクト概要

## 基本情報

### プロジェクト名
MAIML Viewer - Materials Informatics Markup Language Viewer

### バージョン
- **フロントエンド**: v2.0.0
- **バックエンド**: v2.0.2

### 目的
材料科学分野における実験データを管理・可視化するためのマルチテナントWebアプリケーション。MAIML（Materials Informatics Markup Language）形式のXMLファイルを基盤とし、Petri Net形式での実験ワークフローの可視化、実験記録の管理、ワーカーによる分散作業をサポートします。

### リポジトリURL
git@bitbucket.org:soft-service-ws/maiml_viewer.git

## 技術スタック

### フロントエンド
- **言語**: TypeScript (React 18.2.0)
- **UIフレームワーク**: Material-UI v5
- **ビジュアライゼーション**: ReactFlow 11.11.4（Petri Net可視化・編集）
- **HTTP通信**: Axios 1.9.0
- **XMLパース**: xml-js 1.6.11
- **その他のライブラリ**:
  - @emotion/react & @emotion/styled（スタイリング）
  - lucide-react（アイコン）
  - html-to-image（画像エクスポート）
  - papaparse（CSVパース）
  - react-draggable（ドラッグ&ドロップ）

### バックエンド
- **言語**: TypeScript (Node.js 18+)
- **フレームワーク**: Express.js 4.18.3
- **データベース**: PostgreSQL (AWS Aurora)
- **データベースクライアント**: pg 8.11.3
- **認証**: jsonwebtoken 9.0.2、bcrypt 6.0.0、express-session 1.18.2
- **AWS SDK**: 
  - @aws-sdk/client-s3（S3操作）
  - @aws-sdk/client-bedrock-runtime（Claude API）
  - aws-sdk v2（Athena, Glue）
- **その他のミドルウェア**:
  - helmet（セキュリティヘッダー）
  - cors（CORS対応）
  - morgan（ロギング）
  - multer（ファイルアップロード）
  - express-rate-limit（レート制限）

### インフラストラクチャ
- **コンテナ**: Docker、Docker Compose
- **本番環境**: AWS ECS (Elastic Container Service)
- **ストレージ**: AWS S3
- **データベース**: AWS Aurora PostgreSQL
- **拡張検索**: AWS Athena + Glue (Parquet形式)
- **Webサーバー**: Nginx (リバースプロキシ)

### 開発ツール
- **パッケージマネージャー**: npm
- **テスティング**: Jest 29.7.0、Supertest 6.3.3
- **ビルドツール**: react-app-rewired
- **ロギング**: winston 3.17.0、winston-daily-rotate-file

## フォルダ構成

```
maiml_viewer/
├── frontend/                    # フロントエンド（React）
│   ├── public/                  # 静的ファイル
│   ├── src/
│   │   ├── components/          # 再利用可能なコンポーネント
│   │   │   ├── PetriNetViewer/
│   │   │   ├── PetriNetEditorV2/
│   │   │   ├── WorkerDashboard/
│   │   │   ├── ExperimentRecorder/
│   │   │   └── ...
│   │   ├── pages/               # ページレベルのコンポーネント
│   │   ├── hooks/               # カスタムフック
│   │   ├── services/            # API通信サービス
│   │   ├── utils/               # ユーティリティ関数
│   │   ├── contexts/            # React Context
│   │   ├── constants/           # 定数定義
│   │   ├── css/                 # スタイルシート
│   │   ├── App.js               # メインアプリケーション
│   │   └── index.js             # エントリーポイント
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
│
├── backend/                     # バックエンド（Node.js + Express）
│   ├── routes/                  # APIルート定義
│   │   ├── authRoutes.js        # 認証関連
│   │   ├── adminRoutes.js       # 管理者専用
│   │   ├── managerRoutes.js     # マネージャー専用
│   │   ├── workerRoutes.js      # ワーカー専用
│   │   ├── s3Routes.js          # S3操作
│   │   ├── enhancedRoutes.js    # 拡張検索
│   │   ├── experimentRecordRoutes.js
│   │   ├── editRoutes.js
│   │   ├── claudeRoutes.js      # Claude API統合
│   │   ├── s3/                  # S3関連ルート（モジュール化）
│   │   ├── tenants/             # マルチテナント関連
│   │   ├── admin/               # 管理者専用ルート
│   │   ├── provider/            # プロバイダー管理
│   │   └── shared/              # 共有機能
│   ├── middleware/              # Expressミドルウェア
│   │   ├── auth.js              # JWT認証
│   │   ├── tenantIsolation.js  # テナント分離
│   │   ├── permissionCheck.js  # 権限チェック
│   │   ├── s3TenantGuard.js    # S3アクセス制御
│   │   ├── editMiddleware.js   # 編集権限
│   │   └── errorHandler.js     # エラーハンドリング
│   ├── services/                # ビジネスロジック
│   ├── database/                # DB接続・操作
│   │   └── db.js
│   ├── config/                  # 設定ファイル
│   │   └── database.js
│   ├── schemas/                 # MAIMLスキーマ定義（XSD）
│   │   ├── maiml.xsd
│   │   ├── maiml-core.xsd
│   │   ├── maiml-data.xsd
│   │   └── ...
│   ├── scripts/                 # ユーティリティスクリプト
│   │   ├── setupDatabase.js
│   │   ├── seedDatabase.js
│   │   └── ...
│   ├── tests/                   # テストコード
│   │   ├── utils/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── integration/
│   ├── utils/                   # ユーティリティ関数
│   ├── output/                  # 生成ファイル出力先
│   ├── logs/                    # ログファイル
│   ├── server.js                # エントリーポイント
│   ├── package.json
│   ├── Dockerfile
│   └── TEST_GUIDE.md            # テストガイド
│
├── config/                      # インフラ設定
│   ├── aws/                     # AWS設定
│   ├── ecs/                     # ECS設定
│   └── nginx/                   # Nginx設定
│
├── scripts/                     # デプロイメントスクリプト
│   ├── aws/                     # AWSスクリプト
│   ├── database/                # DBマイグレーション
│   └── deployment/              # デプロイスクリプト
│
├── docs/                        # ドキュメント
│   ├── api/                     # API仕様書
│   ├── ui/                      # UI設計書
│   ├── security/                # セキュリティ仕様書
│   ├── dev-guide/               # 開発ガイド
│   └── images/                  # 画像ファイル
│
├── specification/               # MAIML仕様・サンプルファイル
│   ├── *.maiml                  # MAIMLサンプルファイル
│   └── MaiML-Schema-1_0/        # スキーマ定義
│
├── .clinerules/                 # Clineルール定義
│   ├── base.md
│   ├── project.md
│   ├── security.md
│   ├── config.md
│   ├── frontend.md
│   ├── backend.md
│   ├── test.md
│   └── deploy.md
│
├── docker-compose.yml           # Docker Compose設定
├── package.json                 # ルートパッケージ
└── .gitignore
```

## 主要機能

### Phase 1: 基本機能
- マルチテナント認証・認可システム
- MAIML XMLファイルの閲覧・編集
- Petri Net可視化エディタ
- S3ベースのファイル管理
- ユーザー管理（Admin、Manager、Worker）

### Phase 2: 拡張機能
- ワーカーダッシュボード
- 実験記録システム
- タスク割り当て機能
- プログレストラッキング
- Claude API統合（AI支援）

### Phase 3: Enhanced Search (v2.0)
- Parquet形式への変換
- AWS Athenaによる高速検索
- AWS Glueデータカタログ統合
- 複雑な条件検索

## 環境要件

### 開発環境
- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker & Docker Compose
- PostgreSQL 14+

### 本番環境
- AWS ECS (Fargate)
- AWS Aurora PostgreSQL
- AWS S3
- AWS Athena & Glue

## 環境変数

### フロントエンド (.env.development / .env.production)
- `REACT_APP_API_URL`: バックエンドAPI URL
- `REACT_APP_VERSION`: アプリケーションバージョン

### バックエンド (.env)
- `NODE_ENV`: 環境（development/production）
- `PORT`: サーバーポート（デフォルト: 3001）
- `DB_HOST`: データベースホスト
- `DB_PORT`: データベースポート
- `DB_NAME`: データベース名
- `DB_USER`: データベースユーザー
- `DB_PASSWORD`: データベースパスワード
- `JWT_SECRET`: JWT署名シークレット
- `SESSION_SECRET`: セッションシークレット
- `AWS_REGION`: AWSリージョン
- `AWS_S3_BUCKET`: S3バケット名
- `AWS_ACCESS_KEY_ID`: AWS認証情報
- `AWS_SECRET_ACCESS_KEY`: AWS認証情報

## キーワード
- MAIML (Materials Informatics Markup Language)
- Petri Net
- マルチテナント
- 材料科学
- 実験管理
- ワークフロー可視化
- AWS
- PostgreSQL
- React
- Node.js

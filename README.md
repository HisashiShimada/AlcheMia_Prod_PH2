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

5. **ローカル開発（Docker不使用）**

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

## ユーザーロール

1. **Provider**: サービス提供者
2. **System Admin**: システム管理者（全組織アクセス可）
3. **Data Admin**: データ管理者（自組織内）
4. **Experiment Admin**: 実験管理者（自組織内）
5. **Experiment Worker**: 実験作業者
6. **MI Engineer**: Materials Informatics エンジニア

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

### Docker Composeでのデプロイ

```bash
docker-compose up -d --build
```

### AWS ECSへのデプロイ

```bash
./scripts/deployment/deploy-ecs-service-connect.sh
```

詳細は `docs/cline_archive/` 配下のデプロイガイドを参照してください。

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

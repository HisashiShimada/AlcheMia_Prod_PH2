# プロジェクト概要

## 基本情報

### プロジェクト名
mmdpf（マルチモーダルデータプラットフォーム）

### 目的
材料科学分野における実験データを管理・可視化するためのマルチテナントWebアプリケーション。MAIML（Materials Informatics Markup Language）形式のXMLファイルを基盤とし、Petri Net形式での実験ワークフローの可視化、実験記録の管理、ワーカーによる分散作業をサポートします。

### リポジトリURL
git@bitbucket.org:soft-service-ws/mmdpf.git

## 技術スタック

### インフラストラクチャ
- **コンテナ**: Docker、Docker Compose
- **本番環境(クラウド)**: AWS ECS (Elastic Container Service)
- **ストレージ(クラウド)**: AWS S3
- **本番環境(オンプレ)**: Ubuntu
- **ストレージ(オンプレ)**: Open Swift
- **データベース**: PostgreSQL
- **Webサーバー**: Nginx (リバースプロキシ)

### 開発ツール
- **パッケージマネージャー**: npm
- **テスティング**: Jest、Supertest

## フォルダ構成

```
maiml_viewer/
├── frontend/                    # フロントエンド（Next.js）
│
├── backend/                     # バックエンド（Node.js + Express）
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
- ロール毎のメニュー
	- プロバイダメニュー
	- システム管理
	- データ管理
	- 実験管理
	- 実験作業
- MAIML XMLファイルの閲覧・編集
- Petri Net可視化エディタ
- S3ベースのファイル管理
- ユーザー管理（provider、system_admin、data_admin、experiment_admin、experiment_worker、mi_engineer）

## 環境要件

### 開発環境
- Node.js >= 24.0.0
- npm >= 11.0.0
- Docker & Docker Compose
- PostgreSQL 18+

### 本番環境(クラウド)
- AWS ECS (Fargate)
- AWS PostgreSQL
- AWS S3

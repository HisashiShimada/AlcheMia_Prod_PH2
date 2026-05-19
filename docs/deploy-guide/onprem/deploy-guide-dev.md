# mmdpf オンプレミス デプロイ手順書【開発機でやること】

- **作成日**: 2026-03-14
- **対象**: 開発機（ビルド・エクスポート・転送を行う環境）
- **デプロイ方式**: Dockerイメージ tar エクスポート転送方式（git clone 不使用）

> **サーバ側の作業** は `deploy-guide-server.md` を参照してください。

---

## 目次

- [mmdpf オンプレミス デプロイ手順書【開発機でやること】](#mmdpf-オンプレミス-デプロイ手順書開発機でやること)
  - [目次](#目次)
  - [1. システム構成](#1-システム構成)
  - [2. 前提条件・必要なもの](#2-前提条件必要なもの)
    - [用意するもの（開発機側）](#用意するもの開発機側)
  - [3. STEP 1: デプロイ先サーバへ install-docker.sh を転送](#3-step-1-デプロイ先サーバへ-install-dockersh-を転送)
  - [4. STEP 2: Dockerイメージのビルド \& エクスポート](#4-step-2-dockerイメージのビルド--エクスポート)
    - [npm scripts（推奨）](#npm-scripts推奨)
  - [5. STEP 2.5: 開発環境DBからのデータエクスポート](#5-step-25-開発環境dbからのデータエクスポート)
    - [設定データ対象テーブル](#設定データ対象テーブル)
    - [手順1: 開発環境DBサーバへSSH接続](#手順1-開発環境dbサーバへssh接続)
    - [手順2: スキーマのみダンプ（開発環境DBサーバで実行）](#手順2-スキーマのみダンプ開発環境dbサーバで実行)
    - [手順3: 設定データのみダンプ（開発環境DBサーバで実行）](#手順3-設定データのみダンプ開発環境dbサーバで実行)
    - [手順4: ダンプファイルを開発機へ転送](#手順4-ダンプファイルを開発機へ転送)
  - [6. STEP 3: SSL証明書の準備](#6-step-3-ssl証明書の準備)
    - [CA証明書の生成（初回のみ）](#ca証明書の生成初回のみ)
    - [サーバー証明書の生成（初回のみ）](#サーバー証明書の生成初回のみ)
  - [7. STEP 4: デプロイパッケージの作成とサーバ転送](#7-step-4-デプロイパッケージの作成とサーバ転送)
    - [手順1: 環境変数ファイルの準備](#手順1-環境変数ファイルの準備)
    - [手順2: デプロイパッケージの作成](#手順2-デプロイパッケージの作成)
      - [npm scripts（推奨）](#npm-scripts推奨-1)
    - [手順3: サーバへ転送](#手順3-サーバへ転送)
  - [8. 付録: デプロイ前チェックリスト](#8-付録-デプロイ前チェックリスト)
    - [転送チェックリスト](#転送チェックリスト)

---

## 1. システム構成

デプロイ後に起動するコンテナ一覧：

| コンテナ名 | 役割 | 公開ポート |
|---|---|---|
| `mmdpf-postgres` | PostgreSQL データベース | 5432 |
| `mmdpf-redis` | セッションストア | 6379 |
| `mmdpf-swift` | オブジェクトストレージ (Swift) | 8080 |
| `mmdpf-backend` | Node.js API サーバー | 3001 |
| `mmdpf-frontend` | Next.js フロントエンド | 3000 |
| `mmdpf-nginx` | リバースプロキシ (HTTPS) | 80, 443 |
| `mmdpf-ollama` | AI Model Engine (Ollama) | 11434 |

```
ブラウザ
  │ HTTPS (443)
  ▼
mmdpf-nginx (リバースプロキシ / クライアント証明書認証)
  ├── /api/ → mmdpf-backend (3001)
  └── /     → mmdpf-frontend (3000)
               │
               └── mmdpf-postgres (5432)
               └── mmdpf-redis (6379)
               └── mmdpf-swift (8080)
               └── mmdpf-ollama (11434)  ← backend の OLLAMA_HOST で参照（セマンティック検索）
```

---

## 2. 前提条件・必要なもの

### 用意するもの（開発機側）

- ビルド済み Docker イメージ (`mmdpf-backend.tar.gz`, `mmdpf-frontend.tar.gz`)
- `docker-compose.prod.yml`
- `config/nginx/` ディレクトリ（nginx設定）
- `backend/certs/` ディレクトリ（SSL証明書）
- `backend/migrations/` ディレクトリ（DBマイグレーションSQL）
- `.env` ファイル（環境変数設定）

---

## 3. STEP 1: デプロイ先サーバへ install-docker.sh を転送

Docker インストールスクリプトをデプロイ先サーバへ転送します。

```bash
# install-docker.sh をデプロイ先サーバへ転送
scp scripts/install-docker.sh user@target-server-ip:~/install-docker.sh
```

> **続き（スクリプトの実行）** はデプロイ先サーバでの作業です。`deploy-guide-server.md` の STEP 1 を参照してください。

---

## 4. STEP 2: Dockerイメージのビルド & エクスポート

開発機（ビルドが行える環境）で以下を実施します。

### npm scripts（推奨）

プロジェクトルートで以下の npm コマンドを実行します。

```bash
# プロジェクトルートに移動
cd /path/to/mmdpf

# ビルド & エクスポートを実行（backend + frontend 両方）
npm run export
```

以下のコマンドで対象を絞ることもできます：

| コマンド | 説明 |
|---|---|
| `npm run export` | backend と frontend 両方をビルド & エクスポート |
| `npm run export:backend` | backend のみビルド & エクスポート |
| `npm run export:frontend` | frontend のみビルド & エクスポート |
| `npm run export:pull` | ベースイメージを pull してからビルド & エクスポート |

```bash
# 例: backend のみ再ビルドしてエクスポート
npm run export:backend

# 例: ベースイメージを最新化してからビルド
npm run export:pull
```

各コマンドは以下を自動で行います：

- backend / frontend イメージのビルド
- `dist/` ディレクトリへの tar.gz エクスポート
- 生成ファイルのサイズ確認

**出力ファイル：**

```
dist/
├── mmdpf-backend.tar.gz
└── mmdpf-frontend.tar.gz
```

---

<details>
<summary>📄 シェルスクリプトを使う場合（オプション）</summary>

`--output` で出力先ディレクトリを自由に指定したい場合など、よりきめ細かい制御が必要なときはシェルスクリプトを使用できます。

```bash
# スクリプトに実行権限を付与（初回のみ）
chmod +x scripts/build-and-export.sh

# ビルド & エクスポートを実行
./scripts/build-and-export.sh
```

**オプション：**

| オプション | 説明 |
|---|---|
| `--backend` | backend のみビルド & エクスポート |
| `--frontend` | frontend のみビルド & エクスポート |
| `--pull` | ベースイメージを pull してからビルド |
| `--output <dir>` | 出力先ディレクトリを指定（デフォルト: `./dist`） |

```bash
# 例: backend のみ再ビルドしてエクスポート
./scripts/build-and-export.sh --backend

# 例: ベースイメージを最新化してからビルド
./scripts/build-and-export.sh --pull

# 例: 出力先を指定してエクスポート
./scripts/build-and-export.sh --output /tmp/mmdpf-export
```

</details>

---

<details>
<summary>📄 手動コマンド（参考）</summary>

スクリプトを使わずに手動で実行する場合は以下のコマンドを使用します。

```bash
# プロジェクトルートに移動
cd /path/to/mmdpf

# 本番用イメージをビルド
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml build frontend

# ビルドされたイメージを確認
docker images | grep mmdpf

# 出力ディレクトリを作成
mkdir -p dist

# backend イメージをエクスポート
docker save mmdpf-backend:latest | gzip > dist/mmdpf-backend.tar.gz

# frontend イメージをエクスポート
docker save mmdpf-frontend:latest | gzip > dist/mmdpf-frontend.tar.gz

# ファイルサイズの確認
ls -lh dist/mmdpf-backend.tar.gz dist/mmdpf-frontend.tar.gz
```

</details>

---

## 5. STEP 2.5: 開発環境DBからのデータエクスポート

開発環境の DB サーバ（別サーバで稼働中の `mmdpf-postgres` コンテナ）から、スキーマと設定データをダンプして開発機へ転送します。

> **移行対象**: スキーマ（テーブル定義・インデックス等）＋設定データ（組織・ユーザー・ロール・部門等のマスターデータ）
> **移行対象外**: 実験データ・ファイルメタデータ・ログ等の運用データ

### 設定データ対象テーブル

| テーブル名 | 内容 |
|---|---|
| `organization` | 組織情報 |
| `department` | 部門情報 |
| `role` | ロール定義 |
| `role_permission` | ロール権限設定 |
| `user_role` | ユーザーとロールの紐付け |
| `code_master` | コードマスター |
| `organization_user` | 組織とユーザーの紐付け |
| `user_authentication` | ユーザー認証情報 |

### 手順1: 開発環境DBサーバへSSH接続

```bash
# 開発環境DBサーバにSSH接続
ssh user@dev-db-server
```

### 手順2: スキーマのみダンプ（開発環境DBサーバで実行）

```bash
# スキーマのみダンプ（--schema-only でデータを含めない）
docker exec postgres_pgvector pg_dump \
  -U maiml_user \
  --schema-only \
  --no-owner \
  --no-acl \
  maiml_db \
  > ~/mmdpf-schema.sql

# ファイル確認
ls -lh ~/mmdpf-schema.sql
```

### 手順3: 設定データのみダンプ（開発環境DBサーバで実行）

```bash
# 設定データ対象テーブルを --table オプションで指定してダンプ
docker exec postgres_pgvector pg_dump \
  -U maiml_user \
  --data-only \
  --no-owner \
  --no-acl \
  --disable-triggers \
  --table=organization \
  --table=department \
  --table=role \
  --table=role_permission \
  --table=user_role \
  --table=code_master \
  --table=organization_user \
  --table=user_authentication \
  maiml_db \
  > ~/mmdpf-config-data.sql

# ファイル確認
ls -lh ~/mmdpf-config-data.sql
```

> **補足**: 移行するテーブルを追加・変更する場合は `--table=<テーブル名>` を追記・削除してください。

### 手順4: ダンプファイルを開発機へ転送

```bash
# 開発環境DBサーバからダンプファイルを取得
mkdir -p dist
scp user@dev-db-server:~/mmdpf-schema.sql dist/mmdpf-schema.sql
scp user@dev-db-server:~/mmdpf-config-data.sql dist/mmdpf-config-data.sql

# 転送確認
ls -lh dist/mmdpf-schema.sql dist/mmdpf-config-data.sql
```

---

## 6. STEP 3: SSL証明書の準備

### CA証明書の生成（初回のみ）

CA証明書がまだない場合、開発機で生成します。

```bash
# CA証明書を生成
cd /path/to/mmdpf
npx ts-node backend/scripts/generate-ca-certificate.ts

# 生成確認
ls -la backend/certs/ca/
# ca.crt と ca.key が生成されていること
```

### サーバー証明書の生成（初回のみ）

```bash
# サーバー証明書を生成
npx ts-node backend/scripts/generate-server-cert.ts

# 生成確認
ls -la backend/certs/server/
# server.crt と server.key が生成されていること
```

証明書のディレクトリ構成：

```
backend/certs/
├── ca/
│   ├── ca.crt    ← クライアント証明書の検証に使用
│   └── ca.key
└── server/
    ├── server.crt ← nginx の HTTPS に使用
    └── server.key
```

> ⚠️ **注意**: `ca.key` と `server.key` は秘密鍵です。安全な方法で管理してください。

---

## 7. STEP 4: デプロイパッケージの作成とサーバ転送

### 手順1: 環境変数ファイルの準備

```bash
# テンプレートをコピーして編集
cp .env.prod.onprem.example .env.deploy
vi .env.deploy
```

**最低限変更が必要な項目：**

```dotenv
# ─── データベースパスワード ───
DB_PASSWORD=【強力なパスワードに変更】

# ─── Redis パスワード ───
REDIS_PASSWORD=【強力なパスワードに変更】

# ─── Swift パスワード ───
SWIFT_PASSWORD=【強力なパスワードに変更】

# ─── JWT / Session シークレット（64文字以上のランダム文字列）───
# 生成コマンド: openssl rand -hex 64
JWT_SECRET=【openssl rand -hex 64 の出力値】
SESSION_SECRET=【openssl rand -hex 64 の出力値】

# ─── CORS 設定（アクセス元ドメイン/IPアドレス）───
CORS_ORIGIN=https://your-server-ip-or-domain

# ─── Ollama（セマンティック検索）───
# オンプレ環境: docker-compose.prod.yml の ollama コンテナが起動するため以下の値を使用
# ※ モデルは初回起動時に ollama-init コンテナが自動でダウンロードします
OLLAMA_HOST=http://ollama:11434
```

シークレットキーの生成方法：

```bash
# JWT_SECRET 生成
openssl rand -hex 64

# SESSION_SECRET 生成
openssl rand -hex 64
```

### 手順2: デプロイパッケージの作成

すべてのファイルを1つの圧縮ファイル（`dist/mmdpf-deploy.tar.gz`）にまとめます。

#### npm scripts（推奨）

```bash
# プロジェクトルートに移動
cd /path/to/mmdpf

# パッケージを作成
npm run package
```

コマンドは以下を自動で行います：

- 前提ファイルの存在確認（不足があればエラーで停止）
- 必要なファイルをデプロイ先と同じディレクトリ構造に整理
- `.env.deploy` を `.env` にリネームして格納
- `dist/mmdpf-deploy.tar.gz` に圧縮

---

<details>
<summary>📄 シェルスクリプトを使う場合（オプション）</summary>

```bash
cd /path/to/mmdpf
chmod +x scripts/package-for-deploy.sh
./scripts/package-for-deploy.sh
```

</details>

---

**パッケージ内のディレクトリ構造（展開後）：**

```
~/mmdpf/
├── docker-compose.prod.yml
├── .env
├── mmdpf-backend.tar.gz
├── mmdpf-frontend.tar.gz
├── mmdpf-schema.sql
├── mmdpf-config-data.sql
├── scripts/
│   └── start-onprem.sh
├── config/
│   └── nginx/
│       ├── nginx.prod.conf
│       └── ssl.conf
└── backend/
    ├── certs/
    │   ├── ca/
    │   │   └── ca.crt
    │   └── server/
    │       ├── server.crt
    │       └── server.key
    └── migrations/
        └── *.sql
```

### 手順3: サーバへ転送

```bash
# 転送先の情報を変数に設定（適宜変更）
DEPLOY_USER=user
DEPLOY_HOST=target-server-ip

# 圧縮ファイルを1つ転送するだけでOK
scp dist/mmdpf-deploy.tar.gz ${DEPLOY_USER}@${DEPLOY_HOST}:~/
```

> **続き（サーバ上での展開・起動）** は `deploy-guide-server.md` を参照してください。

---

## 8. 付録: デプロイ前チェックリスト

`npm run package`（または `scripts/package-for-deploy.sh`）実行前に、以下がすべて揃っていることを確認してください。

| ファイル/ディレクトリ | 作成方法 |
|---|---|
| `dist/mmdpf-backend.tar.gz` | `npm run export:backend` |
| `dist/mmdpf-frontend.tar.gz` | `npm run export:frontend` |
| `dist/mmdpf-schema.sql` | STEP 2.5 参照 |
| `dist/mmdpf-config-data.sql` | STEP 2.5 参照 |
| `.env.deploy` | `.env.prod.onprem.example` をコピーして編集 |
| `backend/certs/ca/` | `generate-ca-certificate.ts` |
| `backend/certs/server/` | `generate-server-cert.ts` |
| `backend/migrations/` | リポジトリに含まれている |
| `config/nginx/` | リポジトリに含まれている |

### 転送チェックリスト

- [ ] `dist/mmdpf-deploy.tar.gz` をサーバへ転送済み（`scp dist/mmdpf-deploy.tar.gz user@server:~/`）
- [ ] `scripts/install-docker.sh` をサーバへ転送済み（STEP 1）

---

*本手順書はmmdpfプロジェクトのオンプレミスデプロイ用（開発機作業）です。サーバ側の作業は `deploy-guide-server.md` を参照してください。AWS環境へのデプロイは `scripts/deploy.aws.sh` を参照してください。*

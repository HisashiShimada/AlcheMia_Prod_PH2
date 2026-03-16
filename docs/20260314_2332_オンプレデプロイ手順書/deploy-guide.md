# mmdpf オンプレミス Linux サーバ デプロイ手順書

- **作成日**: 2026-03-14
- **対象環境**: オンプレミス Linux サーバ（Docker利用）
- **デプロイ方式**: Dockerイメージ tar エクスポート転送方式（git clone 不使用）

---

## 目次

1. [システム構成](#1-システム構成)
2. [前提条件・必要なもの](#2-前提条件必要なもの)
3. [STEP 1: デプロイ先サーバの準備](#3-step-1-デプロイ先サーバの準備)
4. [STEP 2: 開発機側での事前作業](#4-step-2-開発機側での事前作業)
5. [STEP 2.5: 開発環境DBからのデータエクスポート](#5-step-25-開発環境dbからのデータエクスポート)
6. [STEP 3: SSL証明書の準備](#6-step-3-ssl証明書の準備)
7. [STEP 4: ファイルのサーバ転送](#7-step-4-ファイルのサーバ転送)
8. [STEP 5: デプロイ先サーバでの起動作業](#8-step-5-デプロイ先サーバでの起動作業)
9. [STEP 6: DBセットアップ（スキーマ＋設定データ移行）](#9-step-6-dbセットアップスキーマ設定データ移行)
10. [STEP 7: 動作確認](#10-step-7-動作確認)
11. [運用コマンド集](#11-運用コマンド集)
12. [トラブルシューティング](#12-トラブルシューティング)

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
```

---

## 2. 前提条件・必要なもの

### デプロイ先サーバの要件

| 項目 | 要件 |
|---|---|
| OS | Ubuntu 20.04 / 22.04 / 24.04 LTS 推奨 |
| CPU | 2コア以上推奨 |
| メモリ | 4GB以上推奨 |
| ディスク空き容量 | 20GB 以上 |
| 開放ポート | 80 (HTTP), 443 (HTTPS) |
| Docker | 26.x 以上 |
| Docker Compose Plugin | v2.x 以上 |

### 用意するもの（開発機側）

- ビルド済み Docker イメージ (`mmdpf-backend.tar.gz`, `mmdpf-frontend.tar.gz`)
- `docker-compose.prod.yml`
- `config/nginx/` ディレクトリ（nginx設定）
- `backend/certs/` ディレクトリ（SSL証明書）
- `backend/migrations/` ディレクトリ（DBマイグレーションSQL）
- `.env` ファイル（環境変数設定）

---

## 3. STEP 1: デプロイ先サーバの準備

### Docker のインストール

インストールスクリプトを使って、コマンド1つで Docker をインストールします。

#### 手順1: スクリプトをサーバへ転送（開発機側で実行）

```bash
# install-docker.sh をデプロイ先サーバへ転送
scp scripts/install-docker.sh user@target-server-ip:~/install-docker.sh
```

#### 手順2: スクリプトを実行（デプロイ先サーバで実行）

```bash
sudo bash ~/install-docker.sh
```

スクリプトは以下の処理をすべて自動で行います：

- パッケージリストの更新
- 必要パッケージのインストール（`ca-certificates`, `curl`, `gnupg`, `lsb-release`）
- Docker 公式 GPG キーの追加
- Docker リポジトリの追加
- Docker CE / CLI / containerd / Compose Plugin のインストール
- Docker サービスの起動・自動起動設定
- 実行ユーザーの `docker` グループへの追加

> **補足**: Docker がすでにインストール済みの場合は、スキップするかどうかを確認するプロンプトが表示されます。

#### 手順3: docker グループの反映

スクリプト完了後、`docker` グループをセッションに反映させます。

```bash
# 現在のセッションに反映（推奨）
newgrp docker

# または、いったんログアウトして再ログイン
```

#### インストール確認

```bash
docker --version
docker compose version
```

### ファイアウォール設定

```bash
# HTTP / HTTPS ポートを開放
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# UFW が有効でない場合は有効化
sudo ufw enable

# 設定確認
sudo ufw status
```

### デプロイ用ディレクトリの作成

```bash
# デプロイ先ディレクトリを作成
mkdir -p ~/mmdpf
cd ~/mmdpf
```

---

## 4. STEP 2: 開発機側での事前作業

開発機（ビルドが行える環境）で以下を実施します。

### Docker イメージのビルド & エクスポート（スクリプト自動化）

以下のスクリプト1つで、ビルドからエクスポートまでを自動的に行います。

```bash
# プロジェクトルートに移動
cd /path/to/mmdpf

# スクリプトに実行権限を付与（初回のみ）
chmod +x scripts/build-and-export.sh

# ビルド & エクスポートを実行
./scripts/build-and-export.sh
```

スクリプトは以下を自動で行います：

- Docker の存在確認（前提条件チェック）
- backend / frontend イメージのビルド
- `dist/` ディレクトリへの tar.gz エクスポート
- 生成ファイルのサイズ確認

**出力ファイル：**

```
dist/
├── mmdpf-backend.tar.gz
└── mmdpf-frontend.tar.gz
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

---

<details>
<summary>📄 手動コマンド（参考）</summary>

スクリプトを使わずに手動で実行する場合は以下のコマンドを使用します。

### Docker イメージのビルド

```bash
# プロジェクトルートに移動
cd /path/to/mmdpf

# 本番用イメージをビルド
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml build frontend

# ビルドされたイメージを確認
docker images | grep mmdpf
```

### Docker イメージを tar.gz でエクスポート

```bash
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

以下のテーブルを移行対象とします。プロジェクト構成に応じて適宜追加・除外してください。

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

### 手順1: 開発環境DBサーバへSSH接続（開発機側で実行）

```bash
# 開発環境DBサーバにSSH接続
ssh user@dev-db-server
```

### 手順2: スキーマのみダンプ（開発環境DBサーバで実行）

```bash
# スキーマのみダンプ（--schema-only でデータを含めない）
docker exec mmdpf-postgres pg_dump \
  -U mmdpf_user \
  --schema-only \
  --no-owner \
  --no-acl \
  mmdpf_db \
  > ~/mmdpf-schema.sql

# ファイル確認
ls -lh ~/mmdpf-schema.sql
```

### 手順3: 設定データのみダンプ（開発環境DBサーバで実行）

```bash
# 設定データ対象テーブルを --table オプションで指定してダンプ
docker exec mmdpf-postgres pg_dump \
  -U mmdpf_user \
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
  mmdpf_db \
  > ~/mmdpf-config-data.sql

# ファイル確認
ls -lh ~/mmdpf-config-data.sql
```

> **補足**: 移行するテーブルを追加・変更する場合は `--table=<テーブル名>` を追記・削除してください。

### 手順4: ダンプファイルを開発機へ転送（開発機側で実行）

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

## 7. STEP 4: ファイルのサーバ転送

開発機から、デプロイ先サーバへ必要なファイルを転送します。

### 手順1: 環境変数ファイルの準備（開発機側）

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

# ─── Ollama（セマンティック検索を使う場合）───
OLLAMA_HOST=http://YOUR_OLLAMA_SERVER:11434
```

シークレットキーの生成方法：

```bash
# JWT_SECRET 生成
openssl rand -hex 64

# SESSION_SECRET 生成
openssl rand -hex 64
```

### 手順2: デプロイパッケージの作成（開発機側）

すべてのファイルを1つの圧縮ファイル（`dist/mmdpf-deploy.tar.gz`）にまとめます。

```bash
# プロジェクトルートに移動
cd /path/to/mmdpf

# スクリプトに実行権限を付与（初回のみ）
chmod +x scripts/package-for-deploy.sh

# パッケージを作成
./scripts/package-for-deploy.sh
```

スクリプトは以下を自動で行います：

- 前提ファイルの存在確認（不足があればエラーで停止）
- 必要なファイルをデプロイ先と同じディレクトリ構造に整理
- `.env.deploy` を `.env` にリネームして格納
- `dist/mmdpf-deploy.tar.gz` に圧縮

**パッケージ内のディレクトリ構造（展開後）：**

```
~/mmdpf/
├── docker-compose.prod.yml
├── .env
├── mmdpf-backend.tar.gz
├── mmdpf-frontend.tar.gz
├── mmdpf-schema.sql
├── mmdpf-config-data.sql
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

### 手順3: サーバへ転送（開発機側）

```bash
# 転送先の情報を変数に設定（適宜変更）
DEPLOY_USER=user
DEPLOY_HOST=target-server-ip

# 圧縮ファイルを1つ転送するだけでOK
scp dist/mmdpf-deploy.tar.gz ${DEPLOY_USER}@${DEPLOY_HOST}:~/
```

### 手順4: サーバ上で展開（デプロイ先サーバで実行）

```bash
# ホームディレクトリで展開（~/mmdpf/ が作成される）
tar -xzf ~/mmdpf-deploy.tar.gz -C ~/

# ディレクトリ構成を確認
cd ~/mmdpf
tree -L 3
```

> **補足**: `tree` コマンドがない場合は `find . -maxdepth 3 | sort` でも確認できます。

---

## 8. STEP 5: デプロイ先サーバでの起動作業

デプロイ先サーバにログインして作業します。

```bash
ssh user@target-server-ip
cd ~/mmdpf
```

### Docker イメージのロード

```bash
# backend イメージをロード
docker load < mmdpf-backend.tar.gz
# 出力例: Loaded image: mmdpf-backend:latest

# frontend イメージをロード
docker load < mmdpf-frontend.tar.gz
# 出力例: Loaded image: mmdpf-frontend:latest

# イメージが読み込まれたか確認
docker images | grep mmdpf
```

### ログディレクトリの作成

```bash
mkdir -p ~/mmdpf/logs
```

### コンテナの起動

```bash
# インフラサービス（postgres, redis, swift）を先に起動
docker compose -f docker-compose.prod.yml --profile onprem up -d postgres redis swift

# 起動状態を確認（healthy になるまで待機）
docker compose -f docker-compose.prod.yml --profile onprem ps

# PostgreSQL の起動待ち（healthy になるまで確認）
watch docker compose -f docker-compose.prod.yml --profile onprem ps
# → postgres の STATUS が "healthy" になったら Ctrl+C で抜ける
```

---

## 9. STEP 6: DBセットアップ（スキーマ＋設定データ移行）

デプロイ先サーバで PostgreSQL にスキーマを作成し、設定データを投入します。

> **前提**: STEP 5 で `mmdpf-postgres` コンテナが healthy 状態で起動していること

### 手順1: スキーマの適用（デプロイ先サーバで実行）

```bash
cd ~/mmdpf

# スキーマを適用（テーブル・インデックス・制約を作成）
docker exec -i mmdpf-postgres psql \
  -U mmdpf_user \
  -d mmdpf_db \
  < mmdpf-schema.sql

echo "✅ スキーマ適用完了"
```

### 手順2: テーブル作成の確認

```bash
# テーブル一覧を確認（主要テーブルが存在すること）
docker exec -it mmdpf-postgres psql \
  -U mmdpf_user \
  -d mmdpf_db \
  -c "\dt"
```

### 手順3: 設定データの投入（デプロイ先サーバで実行）

```bash
# 設定データを投入（organization, department, role 等）
docker exec -i mmdpf-postgres psql \
  -U mmdpf_user \
  -d mmdpf_db \
  < mmdpf-config-data.sql

echo "✅ 設定データ投入完了"
```

### 手順4: データ投入の確認

```bash
# 組織データの確認
docker exec -it mmdpf-postgres psql \
  -U mmdpf_user \
  -d mmdpf_db \
  -c "SELECT organization_id, organization_name FROM organization;"

# ロールデータの確認
docker exec -it mmdpf-postgres psql \
  -U mmdpf_user \
  -d mmdpf_db \
  -c "SELECT role_id, role_name FROM role LIMIT 10;"

# ユーザー認証情報の確認
docker exec -it mmdpf-postgres psql \
  -U mmdpf_user \
  -d mmdpf_db \
  -c "SELECT user_id, login_id FROM user_authentication LIMIT 10;"
```

### 手順5: マイグレーション差分の適用（必要な場合のみ）

開発環境のスキーマダンプに含まれていない最新のマイグレーションがある場合は追加で適用します。

```bash
# 開発環境のスキーマダンプ後に追加されたマイグレーションファイルがあれば適用
# ファイル名の日付順（古い順）に実行すること

for sql_file in $(ls backend/migrations/*.sql | grep -v rollback | sort); do
  echo "Applying: $sql_file"
  docker exec -i mmdpf-postgres psql \
    -U mmdpf_user \
    -d mmdpf_db \
    < "$sql_file" && echo "Done: $sql_file"
done
```

> ⚠️ **注意**: ロールバック用の SQL（`*_rollback.sql`）は適用しないでください。スキーマダンプ適用済みのテーブルに対して再度 CREATE TABLE を実行するとエラーになるため、既に存在するテーブルのマイグレーションはスキップしてください。

---

## 10. STEP 7: 動作確認

### 全サービスの起動

```bash
cd ~/mmdpf

# 全コンテナを起動（ビルドはスキップ）
docker compose -f docker-compose.prod.yml --profile onprem up -d

# コンテナの起動状態を確認
docker compose -f docker-compose.prod.yml --profile onprem ps
```

### ヘルスチェック

```bash
# backend API ヘルスチェック
curl -k https://localhost/api/v1/health

# または直接ポート確認
curl http://localhost:3001/api/v1/health

# 期待するレスポンス例:
# {"status":"ok"}
```

### ログの確認

```bash
# 全コンテナのログを確認（最新50行）
docker compose -f docker-compose.prod.yml --profile onprem logs --tail=50

# 特定コンテナのログをリアルタイム確認
docker logs mmdpf-backend -f
docker logs mmdpf-frontend -f
docker logs mmdpf-nginx -f
docker logs mmdpf-postgres -f
```

### ブラウザからのアクセス確認

1. ブラウザで `https://サーバIPまたはドメイン/` にアクセス
2. ログイン画面が表示されることを確認
3. ログインが正常に行えることを確認

> **補足**: クライアント証明書認証を使用する場合、ブラウザへの `.p12` 証明書インストールが別途必要です（組織作成後に管理画面からダウンロード可能）。

---

## 11. 運用コマンド集

### 停止・起動・再起動

```bash
# 全コンテナ停止
docker compose -f docker-compose.prod.yml --profile onprem down

# 全コンテナ起動
docker compose -f docker-compose.prod.yml --profile onprem up -d

# 全コンテナ再起動
docker compose -f docker-compose.prod.yml --profile onprem restart

# 特定コンテナのみ再起動
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml restart frontend
docker compose -f docker-compose.prod.yml restart nginx
```

### イメージ更新時の再デプロイ手順

```bash
# ① 開発機で新しいイメージをビルドしてエクスポート（開発機）
docker compose -f docker-compose.prod.yml build backend
docker save mmdpf-backend:latest | gzip > mmdpf-backend.tar.gz
scp mmdpf-backend.tar.gz user@target-server:~/mmdpf/

# ② デプロイ先でイメージを更新してコンテナ再起動（デプロイ先）
cd ~/mmdpf
docker load < mmdpf-backend.tar.gz
docker compose -f docker-compose.prod.yml --profile onprem up -d --no-build backend
```

### データのバックアップ

```bash
# PostgreSQL のバックアップ
docker exec mmdpf-postgres pg_dump \
  -U mmdpf_user mmdpf_db \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# バックアップファイルの確認
ls -lh backup_*.sql
```

### 状態確認コマンド

```bash
# コンテナ状態一覧
docker compose -f docker-compose.prod.yml --profile onprem ps

# Docker リソース使用状況
docker stats --no-stream

# ディスク使用量
docker system df
```

---

## 12. トラブルシューティング

### コンテナが起動しない

```bash
# ログでエラーを確認
docker logs mmdpf-backend --tail=100
docker logs mmdpf-frontend --tail=100

# コンテナの詳細情報確認
docker inspect mmdpf-backend
```

### データベースに接続できない

```bash
# postgres コンテナの状態確認
docker logs mmdpf-postgres --tail=50

# .env の DB 設定確認（DB_HOST が "postgres" になっているか）
grep DB_ ~/mmdpf/.env

# PostgreSQL への手動接続テスト
docker exec -it mmdpf-postgres psql -U mmdpf_user -d mmdpf_db -c "SELECT 1"
```

### nginx 起動エラー（SSL証明書関連）

```bash
# 証明書ファイルの存在確認
ls -la backend/certs/server/server.crt
ls -la backend/certs/server/server.key
ls -la backend/certs/ca/ca.crt

# nginx 設定のテスト
docker run --rm \
  -v $(pwd)/config/nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro \
  nginx:alpine nginx -t
```

### イメージのロードに失敗する

```bash
# tar.gz ファイルの整合性確認
gzip -t mmdpf-backend.tar.gz && echo "OK" || echo "ファイルが壊れています"

# 再転送してリトライ
```

### ポートが使用中のエラー

```bash
# 使用中のポートを確認
sudo ss -tlnp | grep -E '80|443|3000|3001|5432|6379|8080'

# 競合するプロセスを停止してからコンテナ起動
sudo systemctl stop apache2  # Apache が競合している場合など
```

---

## 付録: デプロイ前チェックリスト

### パッケージ作成前（開発機側）

`scripts/package-for-deploy.sh` 実行前に以下がすべて揃っていることを確認してください。

| ファイル/ディレクトリ | 作成方法 |
|---|---|
| `dist/mmdpf-backend.tar.gz` | `./scripts/build-and-export.sh` |
| `dist/mmdpf-frontend.tar.gz` | `./scripts/build-and-export.sh` |
| `dist/mmdpf-schema.sql` | STEP 2.5 参照 |
| `dist/mmdpf-config-data.sql` | STEP 2.5 参照 |
| `.env.deploy` | `.env.prod.onprem.example` をコピーして編集 |
| `backend/certs/ca/` | `generate-ca-certificate.ts` |
| `backend/certs/server/` | `generate-server-cert.ts` |
| `backend/migrations/` | リポジトリに含まれている |
| `config/nginx/` | リポジトリに含まれている |

### 転送チェックリスト

- [ ] `dist/mmdpf-deploy.tar.gz` をサーバへ転送済み（`scp dist/mmdpf-deploy.tar.gz user@server:~/`）
- [ ] サーバ上で `tar -xzf ~/mmdpf-deploy.tar.gz -C ~/` を実行済み
- [ ] `~/mmdpf/` に以下のファイルが展開されていること
  - [ ] `docker-compose.prod.yml`
  - [ ] `.env`（環境変数設定済み）
  - [ ] `mmdpf-backend.tar.gz`
  - [ ] `mmdpf-frontend.tar.gz`
  - [ ] `mmdpf-schema.sql`
  - [ ] `mmdpf-config-data.sql`
  - [ ] `config/nginx/nginx.prod.conf`
  - [ ] `backend/certs/ca/ca.crt`
  - [ ] `backend/certs/server/server.crt`
  - [ ] `backend/certs/server/server.key`
  - [ ] `backend/migrations/*.sql`

---

*本手順書はmmdpfプロジェクトのオンプレミスデプロイ用です。AWS環境へのデプロイは `scripts/deploy.aws.sh` を参照してください。*

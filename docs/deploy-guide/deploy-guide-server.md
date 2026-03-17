# mmdpf オンプレミス デプロイ手順書【デプロイ先サーバでやること】

- **作成日**: 2026-03-14
- **対象**: デプロイ先サーバ（オンプレミス Linux サーバ）
- **デプロイ方式**: Dockerイメージ tar エクスポート転送方式（git clone 不使用）

> **開発機側の作業**（イメージビルド・パッケージ作成・転送）は `deploy-guide-dev.md` を参照してください。

---

## 目次

1. [システム構成](#1-システム構成)
2. [デプロイ先サーバの要件](#2-デプロイ先サーバの要件)
3. [STEP 1: サーバの初期準備](#3-step-1-サーバの初期準備)
4. [STEP 2: デプロイパッケージの展開](#4-step-2-デプロイパッケージの展開)
5. [STEP 3: Dockerイメージのロードとコンテナ起動](#5-step-3-dockerイメージのロードとコンテナ起動)
6. [STEP 4: DBセットアップ（スキーマ＋設定データ移行）](#6-step-4-dbセットアップスキーマ設定データ移行)
7. [STEP 5: 動作確認](#7-step-5-動作確認)
8. [運用コマンド集](#8-運用コマンド集)
9. [トラブルシューティング](#9-トラブルシューティング)
10. [付録: 展開後チェックリスト](#10-付録-展開後チェックリスト)

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

## 2. デプロイ先サーバの要件

| 項目 | 要件 |
|---|---|
| OS | Ubuntu 20.04 / 22.04 / 24.04 LTS 推奨 |
| CPU | 2コア以上推奨 |
| メモリ | 4GB以上推奨 |
| ディスク空き容量 | 20GB 以上 |
| 開放ポート | 80 (HTTP), 443 (HTTPS) |
| Docker | 26.x 以上 |
| Docker Compose Plugin | v2.x 以上 |

---

## 3. STEP 1: サーバの初期準備

> **前提**: 開発機から `install-docker.sh` が転送済みであること（`deploy-guide-dev.md` の STEP 1 参照）

### Docker のインストール

#### 手順1: スクリプトを実行

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

#### 手順2: docker グループの反映

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

## 4. STEP 2: デプロイパッケージの展開

> **前提**: 開発機から `mmdpf-deploy.tar.gz` が転送済みであること（`deploy-guide-dev.md` の STEP 4 参照）

```bash
# ホームディレクトリで展開（~/mmdpf/ が作成される）
tar -xzf ~/mmdpf-deploy.tar.gz -C ~/

# ディレクトリ構成を確認
cd ~/mmdpf
find . -maxdepth 3 | sort
```

展開後のディレクトリ構成：

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

---

## 5. STEP 3: Dockerイメージのロードとコンテナ起動

```bash
ssh user@target-server-ip
cd ~/mmdpf
```

> 💡 **スクリプトで一括実行（オプション）**
> 以下の手順（イメージロード・ログディレクトリ作成・コンテナ起動）を1コマンドで実行したい場合は、起動スクリプトを使用できます。
> ```bash
> bash scripts/start-onprem.sh
> ```
> 手順を1つずつ確認しながら実行する場合は、以下の個別コマンドを使用してください。

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

## 6. STEP 4: DBセットアップ（スキーマ＋設定データ移行）

PostgreSQL にスキーマを作成し、設定データを投入します。

> **前提**: STEP 3 で `mmdpf-postgres` コンテナが healthy 状態で起動していること

### 手順1: スキーマの適用

```bash
cd ~/mmdpf

# スキーマを適用（テーブル・インデックス・制約を作成）
docker exec -i mmdpf-postgres psql \
  -U maiml_user \
  -d maiml_db \
  < mmdpf-schema.sql

echo "✅ スキーマ適用完了"
```

### 手順2: テーブル作成の確認

```bash
# テーブル一覧を確認（主要テーブルが存在すること）
docker exec -it mmdpf-postgres psql \
  -U maiml_user \
  -d maiml_db \
  -c "\dt"
```

### 手順3: 設定データの投入

```bash
# 設定データを投入（organization, department, role 等）
docker exec -i mmdpf-postgres psql \
  -U maiml_user \
  -d maiml_db \
  < mmdpf-config-data.sql

echo "✅ 設定データ投入完了"
```

### 手順4: データ投入の確認

```bash
# 組織データの確認
docker exec -it mmdpf-postgres psql \
  -U maiml_user \
  -d maiml_db \
  -c "SELECT organization_id, organization_name FROM organization;"

# ロールデータの確認
docker exec -it mmdpf-postgres psql \
  -U maiml_user \
  -d maiml_db \
  -c "SELECT role_id, role_name FROM role LIMIT 10;"

# ユーザー認証情報の確認
docker exec -it mmdpf-postgres psql \
  -U maiml_user \
  -d maiml_db \
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

## 7. STEP 5: 動作確認

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

## 8. 運用コマンド集

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
# ① 開発機で新しいイメージをビルド・転送後（deploy-guide-dev.md 参照）
# ② デプロイ先でイメージを更新してコンテナ再起動
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

## 9. トラブルシューティング

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

## 10. 付録: 展開後チェックリスト

サーバ上で以下のファイルがすべて揃っていることを確認してください。

- [ ] `~/mmdpf-deploy.tar.gz` をサーバへ転送済み
- [ ] `tar -xzf ~/mmdpf-deploy.tar.gz -C ~/` を実行済み
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

*本手順書はmmdpfプロジェクトのオンプレミスデプロイ用（サーバ作業）です。開発機側の作業は `deploy-guide-dev.md` を参照してください。AWS環境へのデプロイは `scripts/deploy.aws.sh` を参照してください。*

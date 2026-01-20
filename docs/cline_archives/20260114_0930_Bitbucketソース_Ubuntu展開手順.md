# BitbucketソースをWSL2 Ubuntu上で動かす手順

## 作成日時
2026-01-14 09:30

## 概要
Bitbucket上で管理しているmmdpfプロジェクト（Frontend/Backend）をWSL2のUbuntu上にクローンし、Dockerで動かすまでの手順をまとめます。

---

## 前提条件

### 完了している必要があること
- ✅ WSL2のインストール
- ✅ Ubuntu（WSL2）のインストール
- ✅ Dockerのインストール（[WSL2 Ubuntu Docker直接インストールガイド](./20260114_0816_WSL2_Ubuntu_Docker直接インストールガイド.md)参照）
- ✅ Docker Composeのインストール

### 必要な情報
- Bitbucketアカウント
- リポジトリURL: `https://ShutoShimogama@bitbucket.org/soft-service-ws/mmdpf.git`
- Bitbucketのパスワードまたはアプリパスワード

---

## 手順1: Gitのインストールと設定

### 1-1. Gitのインストール

```bash
# パッケージリストを更新
sudo apt update

# Gitをインストール
sudo apt install -y git

# バージョン確認
git --version
```

**期待される出力例:**
```
git version 2.34.1
```

### 1-2. Git設定（初回のみ）

```bash
# ユーザー名を設定
git config --global user.name "あなたの名前"

# メールアドレスを設定
git config --global user.email "your.email@example.com"

# 設定確認
git config --list
```

### 1-3. 認証情報の設定（推奨）

パスワードを毎回入力しなくて済むように、認証情報をキャッシュします。

```bash
# 認証情報を15分間キャッシュ（デフォルト）
git config --global credential.helper cache

# または、1時間キャッシュする場合
git config --global credential.helper 'cache --timeout=3600'

# または、永続的に保存する場合（セキュリティリスクあり）
# git config --global credential.helper store
```

---

## 手順2: Bitbucketからリポジトリをクローン

### 2-1. 作業ディレクトリの作成

```bash
# ホームディレクトリに移動
cd ~

# プロジェクト用ディレクトリを作成（任意の場所でOK）
mkdir -p ~/projects
cd ~/projects
```

### 2-2. リポジトリをクローン

```bash
# Bitbucketからクローン
git clone https://ShutoShimogama@bitbucket.org/soft-service-ws/mmdpf.git

# パスワードを要求されるので入力
# または、アプリパスワードを使用
```

**アプリパスワードの取得方法:**
1. Bitbucketにログイン
2. 右上のアイコン → `Personal settings`
3. 左メニュー → `App passwords`
4. `Create app password` をクリック
5. 適切な権限（Repository read/write）を選択して作成
6. 生成されたパスワードをコピーして使用

### 2-3. クローン確認

```bash
# プロジェクトディレクトリに移動
cd mmdpf

# ディレクトリ構造を確認
ls -la

# 期待される出力:
# backend/
# frontend/
# config/
# docs/
# docker-compose.yml
# README.md
# など
```

---

## 手順3: 環境変数ファイルの設定

### 3-1. バックエンドの環境変数設定

```bash
# バックエンドディレクトリに移動
cd ~/projects/mmdpf/backend

# サンプルファイルをコピー
cp .env.example .env

# 環境変数ファイルを編集
nano .env
```

**.env の設定内容:**
```bash
# Node.js Environment
NODE_ENV=development

# Server Configuration
PORT=3001
HOST=0.0.0.0

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=mmdpf_db
DB_USER=mmdpf_user
DB_PASSWORD=mmdpf_password

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=48h

# Session Configuration
SESSION_SECRET=your-session-secret-change-in-production
SESSION_COOKIE_MAX_AGE=172800000

# Swift Configuration (OpenStack Swift)
SWIFT_AUTH_URL=http://swift:8080/auth/v1.0
SWIFT_ACCOUNT=test
SWIFT_USER=tester
SWIFT_PASSWORD=testing
SWIFT_CONTAINER=mmdpf-files

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs
```

**保存方法（nanoエディタ）:**
- `Ctrl + O` で保存
- `Enter` で確認
- `Ctrl + X` で終了

### 3-2. フロントエンドの環境変数設定

```bash
# フロントエンドディレクトリに移動
cd ~/projects/mmdpf/frontend

# 開発環境用の環境変数ファイルを作成
nano .env.local
```

**.env.local の設定内容:**
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Environment
NEXT_PUBLIC_ENV=development

# Debug Mode
NEXT_PUBLIC_DEBUG=true
```

---

## 手順4: Dockerコンテナの起動

### 4-1. Docker Daemonの起動確認

```bash
# Dockerサービスの状態確認
sudo systemctl status docker

# 起動していない場合は起動
sudo systemctl start docker

# 自動起動を有効化
sudo systemctl enable docker
```

### 4-2. Docker Composeでコンテナを起動

```bash
# プロジェクトルートに移動
cd ~/projects/mmdpf

# すべてのコンテナを起動（初回はビルドに時間がかかります）
docker-compose up -d

# 起動状況を確認
docker-compose ps
```

**期待される出力:**
```
NAME                COMMAND                  SERVICE     STATUS      PORTS
mmdpf-backend       "docker-entrypoint.s…"   backend     running     0.0.0.0:3001->3001/tcp
mmdpf-frontend      "docker-entrypoint.s…"   frontend    running     0.0.0.0:3000->3000/tcp
mmdpf-postgres      "docker-entrypoint.s…"   postgres    running     0.0.0.0:5432->5432/tcp
mmdpf-swift         "/bin/sh -c /usr/loc…"   swift       running     0.0.0.0:8080->8080/tcp
```

### 4-3. ログの確認

```bash
# すべてのコンテナのログを表示
docker-compose logs

# 特定のコンテナのログを監視
docker-compose logs -f backend

# エラーがないか確認
docker-compose logs | grep -i error
```

---

## 手順5: データベースの初期化

### 5-1. PostgreSQLコンテナに接続

```bash
# PostgreSQLコンテナに入る
docker exec -it mmdpf-postgres psql -U mmdpf_user -d mmdpf_db
```

### 5-2. DDLの実行（テーブル作成）

**オプション1: SQLファイルを使用する場合**

```bash
# バックエンドコンテナからDDLを実行
docker exec -i mmdpf-postgres psql -U mmdpf_user -d mmdpf_db < backend/sql/ddl/*.sql
```

**オプション2: 手動でDDLを実行する場合**

```sql
-- PostgreSQLコンテナ内で実行
\i /path/to/ddl/file.sql

-- 終了
\q
```

### 5-3. テストデータの投入（任意）

```bash
# テストデータを投入
docker exec -i mmdpf-postgres psql -U mmdpf_user -d mmdpf_db < backend/sql/test_data_insert.sql
```

---

## 手順6: 動作確認

### 6-1. バックエンドAPI確認

```bash
# ヘルスチェックエンドポイント
curl http://localhost:3001/api/health

# 期待されるレスポンス:
# {"status":"ok","timestamp":"..."}
```

### 6-2. フロントエンド確認

**Windowsのブラウザでアクセス:**
```
http://localhost:3000
```

ログイン画面が表示されればOK。

### 6-3. データベース接続確認

```bash
# PostgreSQLに接続
docker exec -it mmdpf-postgres psql -U mmdpf_user -d mmdpf_db

# テーブル一覧を表示
\dt

# 終了
\q
```

### 6-4. Swift（オブジェクトストレージ）確認

```bash
# Swiftコンテナの状態確認
docker exec -it mmdpf-swift swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing stat
```

---

## 手順7: 開発作業の流れ

### 7-1. コードの変更

WSL2のUbuntu上でコードを編集する方法：

**方法1: VS Code Remote - WSL（推奨）**
```bash
# プロジェクトディレクトリで実行
cd ~/projects/mmdpf
code .
```

これでWindows側のVS CodeがWSL2のファイルシステムに接続します。

**方法2: Ubuntuのエディタを使用**
```bash
# vim または nano を使用
vim frontend/src/app/login/page.tsx
nano backend/src/server.ts
```

### 7-2. 変更の反映

**フロントエンド:**
- Next.jsのホットリロードが有効
- ファイルを保存すると自動的に反映される

**バックエンド:**
- TypeScriptのwatch modeが有効
- ファイルを保存すると自動的に再起動される

**手動で再起動する場合:**
```bash
# 特定のコンテナを再起動
docker-compose restart backend
docker-compose restart frontend

# すべてのコンテナを再起動
docker-compose restart
```

### 7-3. Gitでの変更管理

```bash
# 変更の確認
git status

# 変更をステージング
git add .

# コミット
git commit -m "変更内容を説明"

# Bitbucketにプッシュ
git push origin main
```

---

## 手順8: コンテナの停止と削除

### 8-1. コンテナの停止

```bash
# すべてのコンテナを停止
docker-compose stop

# 特定のコンテナを停止
docker-compose stop backend
```

### 8-2. コンテナの削除

```bash
# コンテナを停止して削除
docker-compose down

# ボリュームも含めて削除（データベースとSwiftのデータも削除される）
docker-compose down -v
```

⚠️ **注意:** `docker-compose down -v` を実行すると、データベースのデータとアップロードされたファイルもすべて削除されます。

---

## トラブルシューティング

### 問題1: Gitクローン時に認証エラー

**エラーメッセージ:**
```
fatal: Authentication failed for 'https://...'
```

**解決方法:**
1. Bitbucketのアプリパスワードを取得
2. パスワードの代わりにアプリパスワードを使用
3. または、SSH認証に切り替える

**SSH認証の設定:**
```bash
# SSH鍵を生成
ssh-keygen -t ed25519 -C "your.email@example.com"

# 公開鍵を表示
cat ~/.ssh/id_ed25519.pub

# Bitbucketに公開鍵を登録
# Settings → SSH keys → Add key

# SSH URLでクローン
git clone git@bitbucket.org:soft-service-ws/mmdpf.git
```

### 問題2: Dockerコンテナが起動しない

**原因1: ポートが既に使用されている**
```bash
# ポートの使用状況を確認
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :5432
sudo lsof -i :8080

# 使用中のプロセスを停止
sudo kill -9 <PID>
```

**原因2: Dockerサービスが起動していない**
```bash
# Dockerサービスを起動
sudo systemctl start docker

# 状態確認
sudo systemctl status docker
```

**原因3: 環境変数ファイルが存在しない**
```bash
# バックエンドの.envファイルが存在するか確認
ls -la ~/projects/mmdpf/backend/.env

# 存在しない場合は作成
cp ~/projects/mmdpf/backend/.env.example ~/projects/mmdpf/backend/.env
```

### 問題3: データベース接続エラー

**エラーメッセージ:**
```
Error: connect ECONNREFUSED postgres:5432
```

**解決方法:**
```bash
# PostgreSQLコンテナが起動しているか確認
docker-compose ps postgres

# PostgreSQLのログを確認
docker-compose logs postgres

# PostgreSQLコンテナを再起動
docker-compose restart postgres

# データベースの準備ができるまで待つ（30秒程度）
sleep 30
```

### 問題4: Swift接続エラー

**解決方法:**
```bash
# Swiftコンテナのログを確認
docker-compose logs swift

# Swiftコンテナは起動に時間がかかる（60秒程度）
# ヘルスチェックが成功するまで待つ
docker-compose ps swift

# 手動で接続テスト
docker exec -it mmdpf-swift swift -A http://localhost:8080/auth/v1.0 -U test:tester -K testing stat
```

### 問題5: フロントエンドが表示されない

**解決方法:**
```bash
# フロントエンドコンテナのログを確認
docker-compose logs -f frontend

# node_modulesを再インストール
docker-compose exec frontend npm install

# フロントエンドを再起動
docker-compose restart frontend

# ブラウザのキャッシュをクリア（Ctrl + Shift + R）
```

### 問題6: ファイルのパーミッションエラー

**エラーメッセージ:**
```
permission denied
```

**解決方法:**
```bash
# プロジェクトディレクトリの所有者を確認
ls -la ~/projects/mmdpf

# 所有者を自分に変更
sudo chown -R $USER:$USER ~/projects/mmdpf

# 実行権限を付与（必要に応じて）
chmod +x ~/projects/mmdpf/scripts/*.sh
```

---

## 便利なコマンド集

### Docker関連

```bash
# すべてのコンテナを起動
docker-compose up -d

# すべてのコンテナを停止
docker-compose stop

# すべてのコンテナを削除
docker-compose down

# 特定のコンテナのログを表示
docker-compose logs -f backend

# 特定のコンテナに入る
docker exec -it mmdpf-backend /bin/sh

# コンテナの状態確認
docker-compose ps

# コンテナのリソース使用状況
docker stats

# イメージの一覧
docker images

# 未使用のイメージを削除
docker image prune -a

# 未使用のボリュームを削除
docker volume prune
```

### Git関連

```bash
# 最新の変更を取得
git pull origin main

# ブランチ一覧
git branch -a

# 新しいブランチを作成して切り替え
git checkout -b feature/new-feature

# 変更を破棄
git checkout -- <file>

# すべての変更を破棄（注意）
git reset --hard HEAD

# リモートの最新状態に合わせる（注意）
git fetch origin
git reset --hard origin/main
```

### データベース関連

```bash
# PostgreSQLに接続
docker exec -it mmdpf-postgres psql -U mmdpf_user -d mmdpf_db

# データベースのバックアップ
docker exec mmdpf-postgres pg_dump -U mmdpf_user mmdpf_db > backup.sql

# バックアップから復元
docker exec -i mmdpf-postgres psql -U mmdpf_user -d mmdpf_db < backup.sql

# テーブル一覧
docker exec -it mmdpf-postgres psql -U mmdpf_user -d mmdpf_db -c '\dt'

# テーブルのレコード数確認
docker exec -it mmdpf-postgres psql -U mmdpf_user -d mmdpf_db -c 'SELECT COUNT(*) FROM users;'
```

---

## 次のステップ

### 開発環境のカスタマイズ

1. **VS Code拡張機能のインストール**
   - Remote - WSL
   - Docker
   - TypeScript
   - ESLint
   - Prettier

2. **デバッグ設定**
   - `.vscode/launch.json` の設定
   - Chrome DevTools の使用

3. **テストの実行**
   ```bash
   # バックエンドのテスト
   docker-compose exec backend npm test
   
   # フロントエンドのテスト
   docker-compose exec frontend npm test
   ```

### 本番環境への展開

- Nginx の有効化（クライアント証明書認証）
- 環境変数の本番用設定
- データベースのマイグレーション
- S3またはSwiftの本番環境設定

---

## まとめ

これでBitbucket上のソースコードをWSL2 Ubuntu上にクローンし、Dockerで動かすことができました。

### チェックリスト

- [x] Gitのインストールと設定
- [x] Bitbucketからリポジトリをクローン
- [x] 環境変数ファイルの設定
- [x] Dockerコンテナの起動
- [x] データベースの初期化
- [x] 動作確認
- [x] 開発作業の流れ
- [x] トラブルシューティング

### アクセスURL

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:3001/api
- **PostgreSQL**: localhost:5432
- **Swift**: http://localhost:8080

---

## 関連ドキュメント

- [WSL2 Ubuntu Docker直接インストールガイド](./20260114_0816_WSL2_Ubuntu_Docker直接インストールガイド.md)
- [Docker必要コンテナ一覧](./20260114_0833_Docker必要コンテナ一覧.md)
- [Nginxクライアント証明書認証実装](./20260113_1440_Nginxクライアント証明書認証実装_完了報告.md)
- [環境変数設定ガイド](./20250106_0930_環境変数設定ガイド.md)

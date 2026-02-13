# Windows環境 nginx + mmdpf 起動手順書

## 📋 概要

この手順書は、Windows環境でnginxをリバースプロキシとして使用し、mmdpfプロジェクト（フロントエンド + バックエンド）を起動する方法を説明します。

## ✅ 前提条件

- ✅ nginx 1.29.5をダウンロード済み（場所: `C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5`）
- ✅ Node.js v22.13.0インストール済み
- ✅ PostgreSQLが利用可能
- ✅ プロジェクトディレクトリ: `C:\Users\shuto.shimogama\Documents\mmdpf`

**重要:** nginxのZIPファイルを展開すると、二重フォルダになります。実際のnginx.exeがあるディレクトリは `nginx-1.29.5\nginx-1.29.5\` です。

## 🎯 アーキテクチャ

```
ブラウザ → http://localhost:8080
              ↓
          nginx (ポート8080)
              ↓
    ├─ /api/* → バックエンド (localhost:3001)
    └─ /* → フロントエンド (localhost:3000)
```

---

## 📝 手順1: nginx設定ファイルのコピー

### 1-1. 設定ファイルを配置

プロジェクトの設定ファイルをnginxディレクトリにコピーします。

**PowerShellまたはコマンドプロンプトで実行:**

```powershell
# プロジェクトディレクトリに移動
cd C:\Users\shuto.shimogama\Documents\mmdpf

# nginx設定ファイルをコピー
copy config\nginx\nginx-windows.conf C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\conf\nginx.conf
```

**確認:**
- `C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\conf\nginx.conf` が上書きされていることを確認

### 1-2. 設定ファイルのテスト

nginxディレクトリに移動して設定ファイルをテストします。

```powershell
cd C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5

# 設定ファイルの文法チェック
nginx.exe -t
```

**期待される出力:**
```
nginx: the configuration file C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5/conf/nginx.conf syntax is ok
nginx: configuration file C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5/conf/nginx.conf test is successful
```

---

## 📝 手順2: バックエンドの起動

### 2-1. 環境変数ファイルの確認

バックエンドの`.env`ファイルが存在するか確認します。

```powershell
cd C:\Users\shuto.shimogama\Documents\mmdpf\backend

# .envファイルの存在確認
dir .env
```

**`.env`ファイルが存在しない場合:**

以下の内容で`backend\.env`ファイルを作成してください。

```env
# データベース設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mmdpf_db
DB_USER=postgres
DB_PASSWORD=your_password_here

# サーバー設定
PORT=3001
NODE_ENV=development

# JWT設定
JWT_SECRET=your_jwt_secret_here_change_in_production
JWT_EXPIRES_IN=24h

# セッション設定
SESSION_SECRET=your_session_secret_here_change_in_production

# CORS設定
CORS_ORIGIN=http://localhost:3000,http://localhost:8080

# ログ設定
LOG_LEVEL=info

# Swift/S3設定（任意）
# STORAGE_TYPE=local
# SWIFT_AUTH_URL=http://localhost:8080/auth/v1.0
# SWIFT_USERNAME=test:tester
# SWIFT_PASSWORD=testing
# SWIFT_CONTAINER=mmdpf-files
```

**重要: データベースの接続情報（DB_PASSWORD等）を正しく設定してください。**

### 2-2. 依存関係のインストール

```powershell
cd C:\Users\shuto.shimogama\Documents\mmdpf\backend

npm install
```

**注意:** Node.jsバージョン警告が出る場合がありますが、v22.13.0でも動作します。

### 2-3. バックエンドの起動

新しいPowerShellウィンドウまたはコマンドプロンプトウィンドウを開いて実行:

```powershell
cd C:\Users\shuto.shimogama\Documents\mmdpf\backend

npm run dev
```

**期待される出力:**
```
[INFO] Server is running on port 3001
[INFO] Environment: development
[INFO] Database connected successfully
```

**動作確認:**

ブラウザまたは別のPowerShellウィンドウで:

```powershell
curl http://localhost:3001/api/health
```

または ブラウザで `http://localhost:3001/api/health` にアクセス

**このウィンドウは開いたままにしてください！**

---

## 📝 手順3: フロントエンドの起動

### 3-1. 環境変数ファイルの確認

フロントエンドの`.env.local`ファイルが存在するか確認します。

```powershell
cd C:\Users\shuto.shimogama\Documents\mmdpf\frontend

# .env.localファイルの存在確認
dir .env.local
```

**`.env.local`ファイルが存在しない場合:**

以下の内容で`frontend\.env.local`ファイルを作成してください。

```env
# バックエンドAPI URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# アプリケーション設定
NEXT_PUBLIC_APP_NAME=MMDPF
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### 3-2. 依存関係のインストール

```powershell
cd C:\Users\shuto.shimogama\Documents\mmdpf\frontend

npm install
```

### 3-3. フロントエンドの起動

**新しいPowerShellウィンドウ**を開いて実行:

```powershell
cd C:\Users\shuto.shimogama\Documents\mmdpf\frontend

npm run dev
```

**期待される出力:**
```
▲ Next.js 16.x.x
- Local:        http://localhost:3000
- Network:      準備完了

✓ Ready in 3.2s
```

**動作確認:**

ブラウザで `http://localhost:3000` にアクセス

**このウィンドウも開いたままにしてください！**

---

## 📝 手順4: nginxの起動

### 4-1. nginxの起動

**新しいPowerShellウィンドウ**を開いて実行:

```powershell
cd C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5

# nginxを起動
start nginx
```

**または、コマンドプロンプトで:**

```cmd
cd C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5
nginx.exe
```

**注意:** `start nginx`コマンドはバックグラウンドでnginxを起動します。エラーが出てもウィンドウには表示されません。

### 4-2. nginxの起動確認

```powershell
# nginxプロセスの確認
tasklist | findstr nginx
```

**期待される出力:**
```
nginx.exe                     1234 Console                    1     12,345 K
nginx.exe                     5678 Console                    1     12,345 K
```

2つのプロセス（マスタープロセスとワーカープロセス）が表示されればOKです。

### 4-3. ログファイルの確認

エラーがある場合はログファイルを確認:

```powershell
# エラーログ確認
type C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\logs\mmdpf-error.log

# アクセスログ確認
type C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\logs\mmdpf-access.log
```

---

## 📝 手順5: 動作確認

### 5-1. ヘルスチェック

```powershell
# nginxのヘルスチェック
curl http://localhost:8080/health
```

**期待される出力:** `OK`

### 5-2. ログイン画面へのアクセス

ブラウザで以下のURLにアクセス:

```
http://localhost:8080
```

**期待される結果:**
- ✅ ログイン画面が表示される
- ✅ 画面のスタイルが正しく適用されている
- ✅ ブラウザのコンソールにエラーが出ていない

### 5-3. APIの動作確認

ブラウザの開発者ツール（F12キー）を開いて、Networkタブを確認:

```powershell
# バックエンドAPIへの直接アクセス
curl http://localhost:8080/api/health
```

**期待される出力:** バックエンドからのレスポンス

---

## 🔧 nginxの停止と再起動

### nginxの停止

```powershell
cd C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5

# 正常停止（推奨）
nginx.exe -s quit

# 強制停止
nginx.exe -s stop
```

### nginxの再起動

```powershell
cd C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5

# 設定の再読み込み（nginxを停止せずに設定を反映）
nginx.exe -s reload
```

### すべてのnginxプロセスを強制終了

```powershell
taskkill /F /IM nginx.exe
```

---

## 🚨 トラブルシューティング

### 問題1: ポート8080が既に使用されている

**症状:**
```
nginx: [emerg] bind() to 0.0.0.0:8080 failed (10048: Only one usage of each socket address)
```

**原因:** 別のプログラムがポート8080を使用している

**解決方法:**

1. ポートを使用しているプロセスを確認:
   ```powershell
   netstat -ano | findstr :8080
   ```

2. プロセスを終了するか、nginx設定ファイルの`listen 8080;`を別のポート（例: `8081`）に変更

### 問題2: バックエンドが起動しない（データベース接続エラー）

**症状:**
```
[ERROR] Database connection failed
```

**解決方法:**

1. PostgreSQLが起動しているか確認
2. `backend\.env`ファイルの接続情報を確認
3. データベースが存在するか確認

```sql
-- PostgreSQLに接続して実行
CREATE DATABASE mmdpf_db;
```

### 問題3: nginxが起動しているように見えるが動作しない

**解決方法:**

1. すべてのnginxプロセスを終了:
   ```powershell
   taskkill /F /IM nginx.exe
   ```

2. ログファイルを確認:
   ```powershell
   type C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\logs\mmdpf-error.log
   ```

3. nginxを再起動:
   ```powershell
   cd C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5
   nginx.exe
   ```

### 問題4: フロントエンドが502 Bad Gatewayエラー

**症状:** ブラウザで`http://localhost:8080`にアクセスすると502エラー

**原因:** フロントエンドが起動していない

**解決方法:**

1. フロントエンドのプロセスが起動しているか確認
2. `http://localhost:3000`に直接アクセスして確認
3. フロントエンドを再起動

### 問題5: APIが404エラー

**症状:** `/api/*`へのリクエストが404エラー

**原因:** バックエンドが起動していない

**解決方法:**

1. バックエンドのプロセスが起動しているか確認
2. `http://localhost:3001/api/health`に直接アクセスして確認
3. バックエンドを再起動

### 問題6: Node.jsバージョン警告

**症状:**
```
npm warn EBADENGINE Unsupported engine
npm warn EBADENGINE   required: { node: '>=24.0.0', npm: '>=11.0.0' }
```

**解決方法:**

現在のv22.13.0でも動作しますが、可能であればNode.js v24以降にアップグレードすることを推奨します。

**Node.jsのアップグレード手順:**

1. [Node.js公式サイト](https://nodejs.org/)から最新のLTS版をダウンロード
2. インストーラーを実行
3. インストール後、PowerShellを再起動して確認:
   ```powershell
   node -v
   npm -v
   ```

---

## 📊 起動状態の確認チェックリスト

すべての項目にチェックが入れば正常に起動しています：

- [ ] **バックエンド**: `http://localhost:3001/api/health`にアクセスできる
- [ ] **フロントエンド**: `http://localhost:3000`にアクセスできる
- [ ] **nginx**: `tasklist | findstr nginx`で2つのプロセスが表示される
- [ ] **nginx経由フロントエンド**: `http://localhost:8080`でログイン画面が表示される
- [ ] **nginx経由バックエンド**: `http://localhost:8080/api/health`にアクセスできる
- [ ] **ログイン機能**: ログイン画面でフォームが正常に動作する

---

## 🔄 日常的な起動・停止手順

### 起動手順（簡易版）

3つのPowerShellウィンドウを開いて、それぞれ以下を実行:

**ウィンドウ1: バックエンド**
```powershell
cd C:\Users\shuto.shimogama\Documents\mmdpf\backend
npm run dev
```

**ウィンドウ2: フロントエンド**
```powershell
cd C:\Users\shuto.shimogama\Documents\mmdpf\frontend
npm run dev
```

**ウィンドウ3: nginx**
```powershell
cd C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5
start nginx
```

### 停止手順

**nginx停止:**
```powershell
cd C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5
nginx.exe -s quit
```

**バックエンド・フロントエンド停止:**
- 各PowerShellウィンドウで`Ctrl + C`を押す

---

## 📚 参考情報

### ポート番号一覧

| サービス | ポート番号 | URL |
|---------|----------|-----|
| nginx | 8080 | http://localhost:8080 |
| フロントエンド | 3000 | http://localhost:3000 |
| バックエンド | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | localhost:5432 |

### 重要なファイルパス

| 種類 | パス |
|-----|------|
| nginx設定ファイル | `C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\conf\nginx.conf` |
| nginxログ（エラー） | `C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\logs\mmdpf-error.log` |
| nginxログ（アクセス） | `C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\logs\mmdpf-access.log` |
| バックエンド環境変数 | `C:\Users\shuto.shimogama\Documents\mmdpf\backend\.env` |
| フロントエンド環境変数 | `C:\Users\shuto.shimogama\Documents\mmdpf\frontend\.env.local` |

---

## 📞 サポート

問題が解決しない場合は、以下の情報を収集して開発チームに連絡してください：

1. エラーメッセージの全文
2. nginxのエラーログ
3. バックエンドのログ出力
4. フロントエンドのログ出力
5. ブラウザのコンソールエラー（F12 → Consoleタブ）

---

## 📝 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-02-13 | 初版作成 | Cline |

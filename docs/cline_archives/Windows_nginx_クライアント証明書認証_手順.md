# Windows環境 nginx + クライアント証明書認証 設定手順書

## 📋 概要

この手順書は、Windows環境でnginxにクライアント証明書認証を設定し、HTTPS経由で安全にmmdpfにアクセスする方法を説明します。

## ✅ 前提条件

- ✅ nginx 1.29.5をダウンロード済み（場所: `C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5`）
- ✅ Node.js v22.13.0インストール済み
- ✅ PostgreSQLが利用可能
- ✅ プロジェクトディレクトリ: `C:\Users\shuto.shimogama\Documents\mmdpf`
- ✅ 証明書ファイルが存在: `mmdpf\certs\`

## 🎯 アーキテクチャ

```
ブラウザ（クライアント証明書）→ https://localhost
                                      ↓
                                  nginx (ポート443)
                                  - クライアント証明書認証
                                  - 組織ID抽出
                                      ↓
                              ├─ /api/* → バックエンド (localhost:3001)
                              └─ /* → フロントエンド (localhost:3000)
```

## 🔒 セキュリティ概要

### クライアント証明書認証の流れ

1. **ブラウザがHTTPSでnginxに接続**
2. **nginxがクライアント証明書を要求**
3. **ブラウザがインストール済みクライアント証明書を提示**
4. **nginxがCA証明書で検証**
5. **証明書のCNから組織IDを抽出**
6. **組織IDをURLクエリパラメータ（orgId）でバックエンド・フロントエンドに渡す**
7. **バックエンドが組織IDベースでデータを分離**

---

## 📝 手順1: 証明書ファイルの配置

### 1-1. nginxディレクトリに証明書フォルダを作成

```powershell
# nginxディレクトリに移動
cd C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5

# certsフォルダ構造を作成
mkdir certs
mkdir certs\ca
mkdir certs\server
```

### 1-2. 証明書ファイルをコピー

プロジェクトディレクトリからnginxディレクトリに証明書をコピーします。

```powershell
# プロジェクトディレクトリに戻る
cd C:\Users\shuto.shimogama\Documents\mmdpf

# CA証明書をコピー
copy certs\ca\ca.crt C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\certs\ca\

# サーバー証明書をコピー
copy certs\server\server.crt C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\certs\server\
copy certs\server\server.key C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\certs\server\
```

### 1-3. コピー確認

```powershell
# コピーされたファイルを確認
dir C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\certs -Recurse
```

**期待される出力:**
```
C:\...\nginx-1.29.5\nginx-1.29.5\certs
├── ca
│   └── ca.crt
└── server
    ├── server.crt
    └── server.key
```

---

## 📝 手順2: nginx設定ファイルの配置

### 2-1. SSL設定ファイルをコピー

```powershell
# プロジェクトディレクトリから
cd C:\Users\shuto.shimogama\Documents\mmdpf

# SSL設定ファイルをコピー
copy config\nginx\nginx-windows-ssl.conf C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\conf\nginx.conf
```

### 2-2. 設定ファイルのテスト

```powershell
cd C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5

# 設定ファイルの文法チェック
.\nginx.exe -t
```

**期待される出力:**
```
nginx: the configuration file C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5/conf/nginx.conf syntax is ok
nginx: configuration file C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5/conf/nginx.conf test is successful
```

---

## 📝 手順3: クライアント証明書のインストール（重要）

### 3-1. 利用可能なクライアント証明書

プロジェクトには2つの組織用クライアント証明書があります：

| 組織ID | 証明書ファイル（PKCS#12形式） | パスワード |
|--------|----------------------------|-----------|
| a0718dc5-21f3-44e6-87e9-cc2ae83f3385 | `certs\clients\a0718dc521f344e687e9cc2ae83f3385.p12` | 空パスワード |
| c9621ed6-5def-4970-8e7f-fbe97c98e3ed | `certs\clients\c9621ed65def49708e7ffbe97c98e3ed.p12` | 空パスワード |

### 3-2. Windowsへのクライアント証明書インストール

#### 方法1: ダブルクリックでインストール（推奨）

1. **証明書ファイルを開く**
   - エクスプローラーで `C:\Users\shuto.shimogama\Documents\mmdpf\certs\clients\` を開く
   - `a0718dc521f344e687e9cc2ae83f3385.p12` をダブルクリック

2. **証明書インポートウィザード**
   - 「現在のユーザー」を選択 → **次へ**
   - ファイル名が表示されることを確認 → **次へ**
   - パスワード: **空欄のまま** → 「このキーをエクスポート可能にする」にチェック → **次へ**
   - 「証明書の種類に基づいて、自動的に証明書ストアを選択する」を選択 → **次へ**
   - **完了**

3. **確認メッセージ**
   - 「正しくインポートされました」と表示されればOK

#### 方法2: コマンドプロンプトでインストール

```cmd
# プロジェクトディレクトリに移動
cd C:\Users\shuto.shimogama\Documents\mmdpf\certs\clients

# 証明書をインポート（パスワードなし）
certutil -user -p "" -importpfx a0718dc521f344e687e9cc2ae83f3385.p12
```

**期待される出力:**
```
CertUtil: -importPFX コマンドは正常に完了しました。
```

### 3-3. インストールされた証明書の確認

```powershell
# 個人証明書を確認
certutil -user -store My
```

**期待される出力に含まれる内容:**
```
証明書 "CN=a0718dc5-21f3-44e6-87e9-cc2ae83f3385"
```

---

## 📝 手順4: バックエンド・フロントエンドの起動

### 4-1. バックエンドの起動

**新しいPowerShellウィンドウ**を開いて実行:

```powershell
cd C:\Users\shuto.shimogama\Documents\mmdpf\backend
npm run dev
```

**期待される出力:**
```
[INFO] Server is running on port 3001
[INFO] Environment: development
```

### 4-2. フロントエンドの起動

**別の新しいPowerShellウィンドウ**を開いて実行:

```powershell
cd C:\Users\shuto.shimogama\Documents\mmdpf\frontend
npm run dev
```

**期待される出力:**
```
▲ Next.js 16.x.x
- Local:        http://localhost:3000
✓ Ready in 3.2s
```

---

## 📝 手順5: nginxの起動（SSL/TLS + クライアント証明書認証）

### 5-1. 既存のnginxプロセスを停止（もし起動していれば）

```powershell
cd C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5

# 既存のnginxを停止
.\nginx.exe -s quit

# または強制停止
taskkill /F /IM nginx.exe
```

### 5-2. nginxを起動

**新しいPowerShellウィンドウ**を開いて実行:

```powershell
cd C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5

# nginxを起動
.\nginx.exe
```

### 5-3. nginxプロセスの確認

```powershell
tasklist | findstr nginx
```

**期待される出力:**
```
nginx.exe                     1234 Console                    1     12,345 K
nginx.exe                     5678 Console                    1     12,345 K
```

### 5-4. エラーログの確認（トラブル時）

```powershell
type C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\logs\mmdpf-ssl-error.log
```

---

## 📝 手順6: ブラウザでのアクセス

### 6-1. ブラウザを開く

Google Chrome、Microsoft Edge、またはFirefoxを開きます。

### 6-2. HTTPSでアクセス

ブラウザのアドレスバーに以下を入力:

```
https://localhost
```

**注意:** `http://` ではなく `https://` です

### 6-3. 証明書エラーの対処

#### ステップ1: 自己署名証明書の警告

ブラウザに「この接続ではプライバシーが保護されません」と表示されます。

**Chromeの場合:**
1. 「詳細設定」をクリック
2. 「localhostにアクセスする（安全ではありません）」をクリック

**Edgeの場合:**
1. 「詳細情報」をクリック
2. 「Webページに移動（推奨されません）」をクリック

**Firefoxの場合:**
1. 「詳細設定」をクリック
2. 「例外として扱う」をクリック

#### ステップ2: クライアント証明書の選択

ブラウザが証明書を要求するダイアログを表示します。

**証明書選択ダイアログ:**
```
ユーザーの識別

localhost にクライアント証明書を提示:
⚪ CN=a0718dc5-21f3-44e6-87e9-cc2ae83f3385

[OK] [キャンセル]
```

1. `CN=a0718dc5-21f3-44e6-87e9-cc2ae83f3385` を選択
2. **OK** をクリック

### 6-4. ログイン画面の表示確認

✅ **成功の場合:**
- ログイン画面が表示される
- ブラウザのアドレスバーに「🔒」マークが表示される
- URLが `https://localhost` になっている

---

## 🔍 動作確認

### 確認1: HTTPS接続の確認

ブラウザのアドレスバーの「🔒」マークをクリック:
- 「この接続は保護されています」
- 証明書情報を表示 → サーバー証明書が `CN=localhost` であることを確認

### 確認2: クライアント証明書の確認

ブラウザの開発者ツール（F12キー）を開いて、Consoleタブで以下を確認:
- エラーが出ていないこと
- ネットワークリクエストが正常に完了していること

### 確認3: 組織IDの確認

バックエンドのログを確認:
```powershell
# バックエンドが起動しているPowerShellウィンドウで
# X-Organization-Id ヘッダーが正しく渡されているか確認
```

期待されるURLパラメータ:
```
https://localhost/api/endpoint?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
```

ブラウザの開発者ツール（F12 → Networkタブ）でAPIリクエストを確認すると、すべてのリクエストに`orgId`パラメータが自動的に付加されていることが確認できます。

---

## 🚨 トラブルシューティング

### 問題1: 「接続が拒否されました」

**症状:**
```
このサイトにアクセスできません
localhostで接続が拒否されました。
```

**原因:** nginxが起動していない

**解決方法:**
1. nginxプロセスを確認: `tasklist | findstr nginx`
2. nginxを起動: `cd C:\...\nginx-1.29.5\nginx-1.29.5 && start nginx`
3. エラーログを確認: `type logs\mmdpf-ssl-error.log`

---

### 問題2: 「証明書が信頼されていません」（ERR_CERT_AUTHORITY_INVALID）

**症状:**
ブラウザに「NET::ERR_CERT_AUTHORITY_INVALID」エラー

**原因:** サーバー証明書が自己署名証明書

**解決方法:**
1. 「詳細設定」→「localhostにアクセス」をクリック（開発環境では問題なし）
2. または、CA証明書をWindowsの信頼されたルート証明機関にインストール（オプション）

---

### 問題3: クライアント証明書の選択ダイアログが表示されない

**症状:**
ブラウザが証明書を要求するダイアログを表示しない

**原因1:** クライアント証明書がインストールされていない

**解決方法:**
1. 証明書がインストールされているか確認: `certutil -user -store My`
2. インストールされていない場合、手順3を再実行

**原因2:** ブラウザのキャッシュ

**解決方法:**
1. ブラウザを完全に終了
2. ブラウザを再起動して再度アクセス

---

### 問題4: 403 Forbidden エラー

**症状:**
```
403 Forbidden
Certificate CN format invalid. Expected: CN={uuid} or CN=uuid
```

**原因:** 証明書のCNから組織IDを抽出できない

**解決方法:**
1. 使用している証明書のCNを確認:
   ```powershell
   certutil -user -store My
   ```
2. CNが `CN=a0718dc5-21f3-44e6-87e9-cc2ae83f3385` 形式であることを確認
3. 正しい証明書を選択しているか確認

---

### 問題5: ポート443が使用中

**症状:**
```
nginx: [emerg] bind() to 0.0.0.0:443 failed (10048: Only one usage of each socket address)
```

**原因:** 別のプログラムがポート443を使用している

**解決方法:**

1. ポートを使用しているプロセスを確認:
   ```powershell
   netstat -ano | findstr :443
   ```

2. プロセスを終了するか、nginx設定ファイルのポート番号を変更（例: 8443）

**nginx設定ファイルを編集:**
```nginx
# conf/nginx.conf
server {
    listen 8443 ssl;  # 443から8443に変更
    # ... 他の設定 ...
}
```

アクセスURL: `https://localhost:8443`

---

## 📊 起動状態の確認チェックリスト

すべての項目にチェックが入れば正常に起動しています：

- [ ] **証明書配置**: nginxのcertsフォルダに証明書がコピーされている
- [ ] **クライアント証明書**: Windowsにクライアント証明書がインストールされている
- [ ] **バックエンド**: `http://localhost:3001/api/health`にアクセスできる
- [ ] **フロントエンド**: `http://localhost:3000`にアクセスできる
- [ ] **nginx起動**: `tasklist | findstr nginx`で2つのプロセスが表示される
- [ ] **HTTPS接続**: `https://localhost`でログイン画面が表示される
- [ ] **証明書認証**: 証明書選択ダイアログが表示され、証明書を選択できる
- [ ] **組織ID抽出**: ブラウザの開発者ツール（Networkタブ）でAPIリクエストURLに`?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385`が付加されていることを確認

---

## 🔄 日常的な起動・停止手順

### 起動手順（簡易版）

4つのPowerShellウィンドウを開いて、それぞれ以下を実行:

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
.\nginx.exe
```

**ウィンドウ4: ブラウザでアクセス**
```
https://localhost
```

### 停止手順

**nginx停止:**
```powershell
cd C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5
.\nginx.exe -s quit
```

**バックエンド・フロントエンド停止:**
- 各PowerShellウィンドウで`Ctrl + C`を押す

---

## 📚 参考情報

### ポート番号一覧

| サービス | ポート番号 | URL |
|---------|----------|-----|
| nginx (HTTPS) | 443 | https://localhost |
| nginx (HTTP リダイレクト) | 80 | http://localhost → https://localhost |
| フロントエンド | 3000 | http://localhost:3000 |
| バックエンド | 3001 | http://localhost:3001 |

### 重要なファイルパス

| 種類 | パス |
|-----|------|
| nginx SSL設定 | `C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\conf\nginx.conf` |
| CA証明書 | `C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\certs\ca\ca.crt` |
| サーバー証明書 | `C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\certs\server\server.crt` |
| サーバー秘密鍵 | `C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\certs\server\server.key` |
| クライアント証明書 | `C:\Users\shuto.shimogama\Documents\mmdpf\certs\clients\*.p12` |
| nginxログ（エラー） | `C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\logs\mmdpf-ssl-error.log` |
| nginxログ（アクセス） | `C:\Users\shuto.shimogama\Downloads\nginx-1.29.5\nginx-1.29.5\logs\mmdpf-ssl-access.log` |

### 証明書情報

| 項目 | 内容 |
|-----|------|
| CA証明書 CN | CN=MMDPF Root CA |
| サーバー証明書 CN | CN=localhost |
| クライアント証明書 CN | CN=a0718dc5-21f3-44e6-87e9-cc2ae83f3385 |
| 証明書形式 | X.509 v3 |
| キーアルゴリズム | RSA 2048 bit |

---

## 📝 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-02-13 | 初版作成 | Cline |

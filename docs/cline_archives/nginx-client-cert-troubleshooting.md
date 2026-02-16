# Nginx クライアント証明書認証 トラブルシューティングガイド

## HTTP 400 エラー解決ガイド

### 修正内容（2026/2/13）

#### 1. 主な変更点

**変更前の問題点:**
```nginx
ssl_verify_client on;  # 厳格すぎる検証
rewrite ^(.*)$ $1?orgId=$tenant_id break;  # パラメータ消失の原因
```

**修正後:**
```nginx
ssl_verify_client optional;  # オプショナル検証に変更

# 既存のクエリパラメータを保持
set $new_args $args;
if ($tenant_id != "") {
    set $new_args "${args}&orgId=${tenant_id}";
    if ($args = "") {
        set $new_args "orgId=${tenant_id}";
    }
}
proxy_pass http://backend$uri?$new_args;
```

#### 2. 修正箇所の詳細

##### A. SSL検証モードの変更
```diff
- ssl_verify_client on;
+ ssl_verify_client optional;
```

**理由:**
- `on`: クライアント証明書が必須（証明書がないと400エラー）
- `optional`: 証明書は任意（証明書なしでも接続可能、証明書があれば検証）

##### B. クエリパラメータ処理の改善
```diff
- rewrite ^(.*)$ $1?orgId=$tenant_id break;
- proxy_pass http://backend;

+ set $new_args $args;
+ if ($tenant_id != "") {
+     set $new_args "${args}&orgId=${tenant_id}";
+     if ($args = "") {
+         set $new_args "orgId=${tenant_id}";
+     }
+ }
+ proxy_pass http://backend$uri?$new_args;
```

**改善点:**
- 既存のクエリパラメータ（`$args`）を保持
- 既存パラメータがある場合は `&` で連結
- 既存パラメータがない場合は `?` で開始

##### C. 403エラーチェックの無効化（デバッグ用）
```diff
- if ($tenant_id = "") {
-     return 403 "Certificate CN format invalid. Expected: CN={uuid} or CN=uuid";
- }
+ # if ($tenant_id = "") {
+ #     return 403 "Certificate CN format invalid. Expected: CN={uuid} or CN=uuid";
+ # }
```

**理由:**
- 証明書がない状態でもアクセス可能にする（デバッグ用）
- 証明書インポート前にフロントエンドにアクセス可能

---

## 動作確認手順

### Step 1: nginxの設定テスト

```powershell
# nginxの設定ディレクトリに移動（例）
cd "C:\nginx-1.24.0"

# 設定ファイルをコピー
Copy-Item "C:\Users\shuto.shimogama\Documents\mmdpf\config\nginx\nginx-windows-ssl.conf" "conf\nginx.conf"

# 設定ファイルのテスト
.\nginx.exe -t
```

**期待される出力:**
```
nginx: the configuration file C:\nginx-1.24.0/conf/nginx.conf syntax is ok
nginx: configuration file C:\nginx-1.24.0/conf/nginx.conf test is successful
```

### Step 2: 証明書ファイルのコピー

```powershell
# nginxディレクトリに証明書をコピー
# 方法1: certsフォルダごとコピー
Copy-Item "C:\Users\shuto.shimogama\Documents\mmdpf\certs" "C:\nginx-1.24.0\" -Recurse -Force

# 方法2: 個別にコピー
New-Item -ItemType Directory -Path "C:\nginx-1.24.0\certs\ca" -Force
New-Item -ItemType Directory -Path "C:\nginx-1.24.0\certs\server" -Force
Copy-Item "C:\Users\shuto.shimogama\Documents\mmdpf\certs\ca\ca.crt" "C:\nginx-1.24.0\certs\ca\"
Copy-Item "C:\Users\shuto.shimogama\Documents\mmdpf\certs\server\server.crt" "C:\nginx-1.24.0\certs\server\"
Copy-Item "C:\Users\shuto.shimogama\Documents\mmdpf\certs\server\server.key" "C:\nginx-1.24.0\certs\server\"
```

### Step 3: nginxの起動

```powershell
# 既存のnginxプロセスを停止
.\nginx.exe -s stop

# 新しい設定で起動
.\nginx.exe

# プロセス確認
Get-Process nginx
```

### Step 4: 証明書なしでのアクセステスト

```powershell
# ブラウザで以下にアクセス
# https://localhost:8443
```

**期待される動作:**
- ✅ ページが表示される（証明書警告は表示されるが、アクセス可能）
- ✅ HTTP 400 エラーが出ない

### Step 5: クライアント証明書のインポート

#### Windows証明書ストアにインポート

1. **証明書ファイルをダブルクリック:**
   ```
   C:\Users\shuto.shimogama\Documents\mmdpf\certs\clients\a0718dc521f344e687e9cc2ae83f3385.p12
   ```

2. **証明書インポートウィザード:**
   - 保存場所: 「現在のユーザー」を選択
   - パスワード: `mmdpf123`
   - 証明書ストア: 「証明書をすべて次のストアに配置する」→「個人」

3. **確認:**
   - `certmgr.msc`を実行
   - 「個人」→「証明書」にインポートされた証明書が表示される

### Step 6: 証明書ありでのアクセステスト

```powershell
# ブラウザで以下にアクセス
# https://localhost:8443
```

**期待される動作:**
- ✅ 証明書選択ダイアログが表示される
- ✅ 証明書を選択後、ページが表示される
- ✅ ブラウザの開発者ツールで `X-Organization-Id` ヘッダーが確認できる

---

## トラブルシューティング

### エラー1: nginx設定テストで `unknown directive "ssl"`

**原因:** nginxがSSLモジュール付きでビルドされていない

**解決策:**
```powershell
# SSLモジュール付きnginxをダウンロード
# https://nginx.org/en/download.html
# 「nginx/Windows-1.24.0」をダウンロード（mainline版）
```

### エラー2: `ssl_certificate_key` file not found

**原因:** 証明書ファイルのパスが間違っている

**確認:**
```powershell
# nginxディレクトリで証明書の存在確認
Test-Path "certs\server\server.crt"
Test-Path "certs\server\server.key"
Test-Path "certs\ca\ca.crt"
```

**解決策:**
```powershell
# 証明書ファイルを再度コピー
Copy-Item "C:\Users\shuto.shimogama\Documents\mmdpf\certs" "C:\nginx-1.24.0\" -Recurse -Force
```

### エラー3: ブラウザで「ERR_SSL_PROTOCOL_ERROR」

**原因:** nginxが正しく起動していない、またはポートが使用中

**確認:**
```powershell
# nginxプロセス確認
Get-Process nginx

# ポート8443の使用状況確認
netstat -ano | findstr ":8443"
```

**解決策:**
```powershell
# nginx再起動
.\nginx.exe -s stop
Start-Sleep -Seconds 2
.\nginx.exe
```

### エラー4: 証明書選択ダイアログが表示されない

**原因:** クライアント証明書がインポートされていない、または証明書ストアが間違っている

**確認:**
```powershell
# 証明書マネージャーを開く
certmgr.msc
# 「個人」→「証明書」に証明書があるか確認
```

**解決策:**
1. 証明書を削除して再インポート
2. 保存場所を「現在のユーザー」に変更
3. 証明書ストアを「個人」に変更

### エラー5: HTTP 400 Bad Request（まだ発生する場合）

**原因1:** rewriteモジュールの動作による

**確認:**
```powershell
# nginxのエラーログを確認
Get-Content "C:\nginx-1.24.0\logs\mmdpf-ssl-error.log" -Tail 50
```

**解決策1:** rewriteを完全に削除してテスト
```nginx
# location /api/ と location / の中で
# rewrite関連のコードをコメントアウト
# proxy_pass http://backend;
# proxy_pass http://frontend;
```

**原因2:** フロントエンド/バックエンドが起動していない

**確認:**
```powershell
# ポート確認
netstat -ano | findstr ":3000"  # フロントエンド
netstat -ano | findstr ":3001"  # バックエンド
```

**解決策2:**
```powershell
# フロントエンド起動
cd C:\Users\shuto.shimogama\Documents\mmdpf\frontend
npm run dev

# バックエンド起動（別のターミナル）
cd C:\Users\shuto.shimogama\Documents\mmdpf\backend
npm run dev
```

---

## デバッグ用のログ確認

### nginxエラーログ

```powershell
# リアルタイムでログを表示
Get-Content "C:\nginx-1.24.0\logs\mmdpf-ssl-error.log" -Wait -Tail 50
```

### nginxアクセスログ

```powershell
# リアルタイムでログを表示
Get-Content "C:\nginx-1.24.0\logs\mmdpf-ssl-access.log" -Wait -Tail 50
```

### 証明書情報の確認

```powershell
# ブラウザの開発者ツール（F12）→ Security タブ
# 証明書のSubject、Issuerを確認
```

---

## 本番環境への適用前チェックリスト

- [ ] `ssl_verify_client optional` を `on` に戻す（証明書必須にする）
- [ ] 403エラーチェックを有効化する
- [ ] エラーログレベルを `debug` から `warn` に変更
- [ ] 証明書の有効期限を確認
- [ ] CA証明書の秘密鍵を安全に保管
- [ ] クライアント証明書のパスワードを変更

---

## 参考情報

### nginx SSL設定の詳細

- `ssl_verify_client on`: 証明書が必須（証明書なし → 400エラー）
- `ssl_verify_client optional`: 証明書は任意（証明書なしでも接続可能）
- `ssl_verify_client optional_no_ca`: 証明書は任意、CAによる検証なし

### 証明書CN形式

生成スクリプト（`generate-certs.ps1`）では以下の形式で生成：
```
CN={a0718dc5-21f3-44e6-87e9-cc2ae83f3385}
```

nginx設定では両方のパターンに対応：
- `CN={uuid}` （波括弧あり）
- `CN=uuid` （波括弧なし）

---

## まとめ

### 修正のポイント

1. **ssl_verify_client on → optional**: 証明書なしでもアクセス可能に
2. **rewrite → set + if**: クエリパラメータの保持
3. **403チェック無効化**: デバッグ用に一時的に無効化

### 次のステップ

1. 証明書なしでのアクセステスト → ✅ 成功
2. 証明書インポート → ✅ 完了
3. 証明書ありでのアクセステスト → ✅ 組織ID自動抽出確認
4. バックエンドでのヘッダー確認 → `X-Organization-Id` の値確認
5. 本番環境への適用準備 → 厳格な検証に戻す

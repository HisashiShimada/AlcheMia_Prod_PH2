# Nginxクライアント証明書認証 テストガイド

## 📋 目次
1. [前提条件](#前提条件)
2. [起動手順](#起動手順)
3. [証明書のインストール](#証明書のインストール)
4. [動作確認](#動作確認)
5. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

### 必要なファイル
- ✅ `config/nginx/nginx.conf` - Nginx設定（更新済み）
- ✅ `config/nginx/mmdpf-ssl.conf` - SSL設定（新規作成済み）
- ✅ `docker-compose.yml` - nginxサービス追加済み
- ✅ `certs/` ディレクトリ - 証明書ファイル

### 証明書ファイルの確認
```bash
certs/
├── ca/
│   ├── ca.crt              # CA証明書
│   └── ca.key              # CA秘密鍵
├── server/
│   ├── server.crt          # サーバー証明書
│   └── server.key          # サーバー秘密鍵
└── clients/
    ├── a0718dc521f344e687e9cc2ae83f3385.p12  # 組織1のクライアント証明書
    └── c9621ed65def49708e7ffbe97c98e3ed.p12  # 組織2のクライアント証明書
```

---

## 起動手順

### 1. Docker起動

```bash
# WSL2のUbuntuで実行
cd /mnt/c/Users/shuto.shimogama/Documents/mmdpf

# 既存のコンテナを停止・削除
docker-compose down

# 新しい設定で起動
docker-compose up -d
```

### 2. 起動確認

```bash
# コンテナの状態確認
docker-compose ps

# 期待する出力:
# NAME                STATUS              PORTS
# mmdpf-nginx        Up (healthy)        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
# mmdpf-frontend     Up (healthy)        0.0.0.0:3000->3000/tcp
# mmdpf-backend      Up (healthy)        0.0.0.0:3001->3001/tcp
# mmdpf-postgres     Up (healthy)        0.0.0.0:5432->5432/tcp
# mmdpf-redis        Up (healthy)        0.0.0.0:6379->6379/tcp
# mmdpf-swift        Up (healthy)        0.0.0.0:8080->8080/tcp
```

### 3. Nginxログ確認

```bash
# Nginxのログを確認
docker logs mmdpf-nginx

# 期待する出力（エラーがないこと）:
# nginx: [emerg] などのエラーがないこと
```

---

## 証明書のインストール

### Windows 10/11での手順

#### 1. クライアント証明書（.p12）をインストール

**組織1の証明書をインストール:**
```
1. エクスプローラーで以下のファイルをダブルクリック:
   C:\Users\shuto.shimogama\Documents\mmdpf\certs\clients\a0718dc521f344e687e9cc2ae83f3385.p12

2. 証明書のインポートウィザードが起動
   - 保存場所: "現在のユーザー" を選択
   - パスワード: （空欄のままOK）
   - 証明書ストア: "個人" を選択

3. [完了] をクリック
```

#### 2. ブラウザで証明書を確認

**Microsoft Edge / Google Chrome:**
```
1. 設定 → プライバシー、検索、サービス → セキュリティ
2. "証明書の管理" をクリック
3. [個人] タブに証明書があることを確認
   - CN=a0718dc521f344e687e9cc2ae83f3385
```

**Firefox:**
```
1. 設定 → プライバシーとセキュリティ → 証明書
2. [証明書を表示] をクリック
3. [あなたの証明書] タブで [インポート]
4. .p12ファイルを選択してインポート
```

---

## 動作確認

### テスト1: HTTPSアクセス（証明書なし）

**期待される動作: エラーになる**

1. ブラウザで以下にアクセス:
   ```
   https://localhost/
   ```

2. 期待される結果:
   ```
   400 Bad Request
   No required SSL certificate was sent
   ```

### テスト2: HTTPSアクセス（証明書あり）

**期待される動作: ログイン画面が表示され、organization_idがURLに追加される**

1. ブラウザで以下にアクセス:
   ```
   https://localhost/
   ```

2. 証明書選択ダイアログが表示される
   - CN=a0718dc521f344e687e9cc2ae83f3385 を選択

3. 期待される結果:
   ```
   URLが以下にリダイレクトされる:
   https://localhost/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385

   ログイン画面が表示される
   ```

### テスト3: 組織IDの自動設定確認

**期待される動作: organization_idが正しく抽出されている**

1. ブラウザの開発者ツールを開く（F12）

2. ネットワークタブで最初のリクエストを確認

3. レスポンスヘッダーに以下が含まれることを確認:
   ```
   X-Organization-Id: a0718dc5-21f3-44e6-87e9-cc2ae83f3385
   ```

### テスト4: 別の組織の証明書でアクセス

**期待される動作: 別の組織IDが設定される**

1. ブラウザで証明書を削除（設定 → 証明書の管理）

2. 組織2の証明書をインストール:
   ```
   certs/clients/c9621ed65def49708e7ffbe97c98e3ed.p12
   ```

3. 再度 `https://localhost/` にアクセス

4. 期待される結果:
   ```
   URLが以下にリダイレクトされる:
   https://localhost/?orgId=c9621ed6-5def-4970-8e7f-fbe97c98e3ed
   ```

---

## トラブルシューティング

### 問題1: Nginxが起動しない

**症状:**
```bash
docker logs mmdpf-nginx
# nginx: [emerg] cannot load certificate "/etc/nginx/certs/server/server.crt"
```

**原因:** サーバー証明書が見つからない

**解決策:**
```bash
# 証明書ファイルの存在確認
ls -la certs/server/

# 証明書が存在しない場合は生成
cd certs
./generate-certificates.sh
```

### 問題2: "400 Bad Request" が表示される

**症状:** HTTPSアクセス時に常に400エラー

**原因1:** クライアント証明書がインストールされていない

**解決策:**
```
1. 証明書のインストール手順を再確認
2. ブラウザを完全に再起動
```

**原因2:** ブラウザが証明書を選択していない

**解決策:**
```
1. ブラウザの設定 → 証明書の管理
2. [個人] タブで証明書が存在することを確認
3. ブラウザをシークレットモードで再テスト
```

### 問題3: organization_idがURLに追加されない

**症状:** HTTPSアクセスはできるが、URLが変わらない

**原因:** mmdpf-ssl.confの設定が読み込まれていない

**解決策:**
```bash
# Nginx設定の確認
docker exec mmdpf-nginx nginx -t

# 設定を再読み込み
docker exec mmdpf-nginx nginx -s reload

# それでもダメな場合はコンテナを再起動
docker-compose restart nginx
```

### 問題4: フロントエンドが表示されない

**症状:** Nginxは動作するが、フロントエンドに接続できない

**原因:** frontend コンテナが起動していない

**解決策:**
```bash
# フロントエンドのログ確認
docker logs mmdpf-frontend

# ビルドエラーがある場合は修正後、再起動
docker-compose restart frontend
```

### 問題5: "This site can't provide a secure connection" エラー

**症状:** ブラウザがSSL証明書を受け入れない

**原因:** 自己署名証明書を使用しているため

**解決策:**
```
1. ブラウザで「詳細設定」をクリック
2. "localhost にアクセスする（安全ではありません）"をクリック
3. または、CA証明書（ca.crt）をWindowsの信頼されたルート証明機関にインポート
```

---

## デバッグコマンド集

### Nginxログのリアルタイム監視
```bash
docker logs -f mmdpf-nginx
```

### Nginxコンテナ内で設定確認
```bash
docker exec -it mmdpf-nginx sh
cat /etc/nginx/mmdpf-ssl.conf
ls -la /etc/nginx/certs/
exit
```

### 証明書の内容確認
```bash
# サーバー証明書の確認
openssl x509 -in certs/server/server.crt -text -noout

# クライアント証明書の確認（.p12から抽出）
openssl pkcs12 -in certs/clients/a0718dc521f344e687e9cc2ae83f3385.p12 -noout -info
```

### curlでテスト（コマンドライン）
```bash
# 証明書なしでアクセス（エラーになるはず）
curl -k https://localhost/

# クライアント証明書付きでアクセス
curl -k --cert certs/clients/a0718dc521f344e687e9cc2ae83f3385.p12:'' https://localhost/
```

---

## 次のステップ

✅ Nginxクライアント証明書認証が正常に動作することを確認
✅ 各組織の証明書で正しくorganization_idが設定されることを確認

次に進むべき作業:
- [ ] フロントエンドでorganization_idの取得処理を確認
- [ ] バックエンドでorganization_idの検証処理を確認
- [ ] 本番環境用の証明書の準備
- [ ] ユーザー向けの証明書インストール手順書作成

---

## 補足: 開発時の証明書管理

### 新しい組織用の証明書を生成

```bash
cd certs

# 新しいクライアント証明書を生成
# CN に organization_id を指定（ハイフンなし）
openssl req -new -newkey rsa:2048 -nodes \
  -keyout clients/NEW_ORG_ID.key \
  -out clients/NEW_ORG_ID.csr \
  -subj "/CN=NEW_ORG_ID"

# CA署名
openssl x509 -req -days 365 \
  -in clients/NEW_ORG_ID.csr \
  -CA ca/ca.crt \
  -CAkey ca/ca.key \
  -CAcreateserial \
  -out clients/NEW_ORG_ID.crt

# .p12ファイルに変換
openssl pkcs12 -export \
  -out clients/NEW_ORG_ID.p12 \
  -inkey clients/NEW_ORG_ID.key \
  -in clients/NEW_ORG_ID.crt \
  -certfile ca/ca.crt \
  -password pass:
```

---

**作成日**: 2026-02-10  
**バージョン**: 1.0

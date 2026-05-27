# openssl req コマンド解説

対象コマンド（`prod-verification-alb-build-guide.md` STEP 1-1 より）:

```bash
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout /tmp/acm-cert/cert.key \
  -out    /tmp/acm-cert/cert.pem \
  -days   365 \
  -subj   "/CN=prod-verification-alb"
```

---

## `openssl req` とは

`openssl` の **`req`** サブコマンドは、主に以下の2つの用途に使います。

| 用途 | 説明 |
|------|------|
| **CSR（証明書署名要求）の生成** | CA に署名を依頼するための申請書を作る |
| **自己署名証明書の生成** | `-x509` オプションを付けると、CSR を経由せず直接証明書を作れる |

今回は `-x509` を付けているため、**自己署名証明書を直接生成**しています。

---

## 各オプションの説明

### `-x509`

**「CSR ではなく、自己署名証明書を直接生成せよ」** という指示。  
通常 `req` は CSR（.csr ファイル）を生成しますが、このオプションを付けることで CA による署名なしに証明書（.pem）を直接出力します。  
検証環境やローカル環境でよく使われるパターンです。

---

### `-newkey rsa:2048`

**新しい秘密鍵を同時に生成する**オプション。

- `rsa` → RSA アルゴリズムを使用
- `2048` → 鍵長を 2048 ビットに指定

`-newkey` を使うことで、「鍵の生成」と「証明書の作成」を 1 コマンドで完結させています。

---

### `-nodes`

**"No DES（暗号化なし）"** の略。  
生成した秘密鍵をパスフレーズで暗号化**しない**ようにします。

これがないと秘密鍵ファイルを使うたびにパスフレーズ入力が求められ、ALB や自動化スクリプトからの利用が困難になります。

---

### `-keyout /tmp/acm-cert/cert.key`

**秘密鍵の出力先ファイルパス**を指定します。  
このファイルが後で以下のコマンドに渡されます。

```bash
aws acm import-certificate --private-key fileb:///tmp/acm-cert/cert.key
```

---

### `-out /tmp/acm-cert/cert.pem`

**証明書（公開鍵を含む）の出力先ファイルパス**を指定します。  
このファイルが後で以下のコマンドに渡されます。

```bash
aws acm import-certificate \
  --certificate       fileb:///tmp/acm-cert/cert.pem \
  --certificate-chain fileb:///tmp/acm-cert/cert.pem   # 自己署名のため同一ファイルを指定
```

> 自己署名証明書は CA チェーンが存在しないため、`--certificate-chain` には証明書ファイル自身を指定します。

---

### `-days 365`

**証明書の有効期限**を日数で指定します。  
ここでは 365 日（1 年間）有効な証明書を生成します。

---

### `-subj "/CN=prod-verification-alb"`

**証明書のサブジェクト（識別情報）をコマンドラインで直接指定**します。  
これがないと対話形式で国名・組織名・コモンネームなどを 1 項目ずつ入力する必要があります。

`/CN=prod-verification-alb` の意味:

| フィールド | 値 | 意味 |
|-----------|-----|------|
| `CN`（Common Name） | `prod-verification-alb` | 証明書の識別名。通常は FQDN（ドメイン名）を入れるが、検証環境なので任意の名前にしている |

> ⚠️ 本番の正規証明書では `CN` に実際のドメイン名（例: `prod-verification.your-company.com`）を指定します。  
> 今回は正式ドメインが未決定のため任意名を使っています。

**`-subj` で指定できる主なフィールド（参考）:**

| フィールド略称 | フルネーム | 例 |
|-------------|-----------|-----|
| `C` | Country（国コード） | `JP` |
| `ST` | State（都道府県） | `Tokyo` |
| `L` | Locality（市区町村） | `Chiyoda` |
| `O` | Organization（組織名） | `My Company` |
| `OU` | Organizational Unit（部署名） | `Dev` |
| `CN` | Common Name（コモンネーム） | `example.com` |

---

## コマンド実行結果まとめ

| 生成ファイル | 内容 | 用途 |
|------------|------|------|
| `/tmp/acm-cert/cert.key` | RSA 2048bit 秘密鍵（パスフレーズなし） | `aws acm import-certificate --private-key` |
| `/tmp/acm-cert/cert.pem` | 自己署名証明書（有効期限 365 日） | `aws acm import-certificate --certificate` および `--certificate-chain` |

---

## 自己署名証明書の制限事項

| 制限 | 内容 |
|-----|------|
| ブラウザ警告 | 「この接続ではプライバシーが保護されません」等の証明書エラーが表示される |
| curl での確認 | `-k`（SSL 検証スキップ）フラグが必要 |
| 信頼性 | 第三者 CA による署名がないため、外部公開には不向き |
| 対処 | 正規ドメイン決定後に `prod-verification-alb-build-guide.md` 付録の手順で ACM 証明書を差し替える |

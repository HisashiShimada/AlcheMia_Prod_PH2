# サーバー証明書再発行・OS登録手順書

- **作成日**: 2026-05-07
- **対象環境**: alchemia-staging（prod-verification-alb）
- **目的**: ALBのHTTPS接続でブラウザの「保護されていない通信」警告を解消する

---

## 問題の概要

現在 ALB に設定されているサーバー証明書は、CN（Common Name）が以下のようになっています。

```
CN=prod-verification-alb.internal
```

しかし実際にブラウザでアクセスするURLのホスト名は以下です。

```
prod-verification-alb-1495997713.ap-northeast-1.elb.amazonaws.com
```

**CN／SAN とホスト名が一致しないため、CA証明書をOSにインストールしても警告は解消されません。**  
正しいFQDNで証明書を再生成する必要があります。

---

## 作業の影響範囲

| 対象 | 影響 |
|------|------|
| prod-verification-alb のHTTPS証明書 | ✅ 差し替え対象 |
| 既存 NLB + nginx 環境 | ❌ 影響なし |
| `backend/certs/ca/ca.crt`（mTLS用CA） | ❌ 変更しない |
| 各組織のクライアント証明書（.p12） | ❌ 再発行不要 |
| ACM Trust Store（mmdpf-ca-trust-store） | ❌ 変更しない |

---

## 前提情報

| 項目 | 値 |
|------|---|
| ALB DNS 名 | `prod-verification-alb-1495997713.ap-northeast-1.elb.amazonaws.com` |
| HTTPS リスナー ARN | `arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:listener/app/prod-verification-alb/b901f038a9a6be79/f47479226ac6683d` |
| 旧証明書 ARN（削除対象） | `arn:aws:acm:ap-northeast-1:137068252939:certificate/d6147869-2c9e-445f-ab11-19643a3bb10c` |
| リージョン | `ap-northeast-1` |

---

## STEP 1: 自己署名証明書の再生成（正しいFQDNで）

作業用EC2またはローカルPC（openssl がインストールされた環境）で実行します。

```bash
# 作業ディレクトリの作成
mkdir -p /tmp/acm-cert-new

# ALB の DNS 名を変数にセット
ALB_DNS="prod-verification-alb-1495997713.ap-northeast-1.elb.amazonaws.com"

# SAN（subjectAltName）に ALB の DNS 名を含めて証明書を生成（有効期限 365 日）
# ⚠️ CN は最大64文字の制限があるため短い名前を指定し、FQDN は SAN にのみ含める
# （ALB DNS 名は65文字のため CN に直接指定するとエラーになる）
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout /tmp/acm-cert-new/cert.key \
  -out    /tmp/acm-cert-new/cert.pem \
  -days   365 \
  -subj   "/CN=prod-verification-alb" \
  -addext "subjectAltName=DNS:${ALB_DNS}"
```

> ✅ `/tmp/acm-cert-new/cert.key`（秘密鍵）と `/tmp/acm-cert-new/cert.pem`（証明書）が生成されること。

### 生成内容の確認

```bash
openssl x509 -in /tmp/acm-cert-new/cert.pem -noout -text \
  | grep -A 3 "Subject Alternative Name\|Subject:"
```

> ✅ 以下の内容が確認できること:
> - `Subject: CN = prod-verification-alb`（短縮名）
> - `DNS:prod-verification-alb-1495997713.ap-northeast-1.elb.amazonaws.com`（SAN）

---

## STEP 2: 新しい証明書を ACM にインポート

```bash
NEW_CERT_ARN=$(aws acm import-certificate \
  --certificate       fileb:///tmp/acm-cert-new/cert.pem \
  --private-key       fileb:///tmp/acm-cert-new/cert.key \
  --certificate-chain fileb:///tmp/acm-cert-new/cert.pem \
  --region ap-northeast-1 \
  --query 'CertificateArn' \
  --output text)

echo "New CertificateArn: ${NEW_CERT_ARN}"
```

> **出力例:**
> ```
> New CertificateArn: arn:aws:acm:ap-northeast-1:137068252939:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
> ```
> → **NEW_CERT_ARN をメモしておく**
arn:aws:acm:ap-northeast-1:137068252939:certificate/87e063ab-fcb5-4e8d-9a58-670a487311b4

### インポート確認

```bash
aws acm describe-certificate \
  --certificate-arn "${NEW_CERT_ARN}" \
  --region ap-northeast-1 \
  --query 'Certificate.{Status:Status,Type:Type,Domain:DomainName}'
```

> ✅ `"Status": "ISSUED"`, `"Type": "IMPORTED"` が返ること。

---

## STEP 3: ALB の HTTPS リスナー証明書を差し替え

```bash
HTTPS_LISTENER_ARN="arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:listener/app/prod-verification-alb/b901f038a9a6be79/f47479226ac6683d"

aws elbv2 modify-listener \
  --listener-arn "${HTTPS_LISTENER_ARN}" \
  --certificates "CertificateArn=${NEW_CERT_ARN}" \
  --region ap-northeast-1
```

> ✅ コマンドが成功すれば即時反映されます。

### 差し替え確認

```bash
aws elbv2 describe-listeners \
  --listener-arns "${HTTPS_LISTENER_ARN}" \
  --region ap-northeast-1 \
  --query 'Listeners[0].Certificates'
```

> ✅ 出力に `NEW_CERT_ARN` が含まれていることを確認する。

---

## STEP 4: OS に証明書をインストール（各PCで実施）

`/tmp/acm-cert-new/cert.pem` を作業PCに転送し、OSの**信頼済みルート証明機関**としてインストールします。

> ⚠️ ブラウザでの証明書警告を解消するには、アクセスする **全てのPC** でこのインストール作業が必要です。

### cert.pem を .crt にリネーム

Windows ではまず `.crt` 拡張子のファイルとして用意します。

```bash
# Linuxの場合: scp等で手元のPCに転送
scp /tmp/acm-cert-new/cert.pem <YOUR_PC>:~/Downloads/prod-verification-alb.crt
```

---

### Windows の場合

1. `prod-verification-alb.crt` をダウンロードしてダブルクリック
2. 「証明書のインストール」をクリック
3. **「ローカルコンピューター」** を選択 → 「次へ」
4. **「証明書をすべて次のストアに配置する」** を選択 → 「参照」
5. **「信頼されたルート証明機関」** を選択 → 「OK」→「次へ」→「完了」
6. セキュリティ警告が出たら「はい」をクリック
7. **ブラウザを完全に閉じて再起動**する

> ✅ インストール確認: `Win + R` → `certmgr.msc` → 「信頼されたルート証明機関」→「証明書」に `prod-verification-alb-1495997713...` が表示されること。

---

### Mac の場合

1. `prod-verification-alb.crt` をダウンロードしてダブルクリック
2. キーチェーンアクセスが起動したら **「システム」** を選択してインストール
3. インストール後、キーチェーンアクセスで当該証明書をダブルクリック
4. 「信頼」セクションを展開 → 「この証明書を使用するとき」を **「常に信頼」** に変更
5. 管理者パスワードを入力して確定
6. **ブラウザを完全に閉じて再起動**する

> ✅ インストール確認: キーチェーンアクセス → 「システム」→ 証明書が「信頼済み」として表示されること。

---

## STEP 5: 動作確認

### ブラウザでの確認

1. ブラウザのキャッシュをクリアしてから以下のURLにアクセス:
   ```
   https://prod-verification-alb-1495997713.ap-northeast-1.elb.amazonaws.com
   ```
2. アドレスバーに 🔒 鍵マークが表示されること
3. 証明書の詳細を確認:
   - 発行先: `prod-verification-alb-1495997713.ap-northeast-1.elb.amazonaws.com`
   - 有効期限: 生成日から 365 日後
   - 「証明書は有効です」と表示されること

### curl での確認（証明書検証あり）

```bash
# cert.pem を CA証明書として指定して接続確認（-k なしで成功すること）
curl -v \
  --cacert /tmp/acm-cert-new/cert.pem \
  "https://prod-verification-alb-1495997713.ap-northeast-1.elb.amazonaws.com/api/health"
```

> ✅ SSL ハンドシェイクが成功し `{"status":"ok"}` が返ること。

---

## STEP 6: 旧証明書の削除（任意）

新しい証明書への差し替えを確認した後、旧証明書を削除します。

```bash
OLD_CERT_ARN="arn:aws:acm:ap-northeast-1:137068252939:certificate/d6147869-2c9e-445f-ab11-19643a3bb10c"

aws acm delete-certificate \
  --certificate-arn "${OLD_CERT_ARN}" \
  --region ap-northeast-1
```

> ✅ 削除後にエラーが出なければ完了。

---

## チェックリスト

```
STEP 1: 証明書の再生成
  - [ ] openssl で ALB DNS名（FQDN）を CN/SAN に含む自己署名証明書を生成した
  - [ ] openssl x509 コマンドで CN と SAN が正しいことを確認した

STEP 2: ACM へのインポート
  - [ ] 新しい証明書を ACM にインポートした
  - [ ] Status が ISSUED、Type が IMPORTED であることを確認した
  - [ ] NEW_CERT_ARN をメモした

STEP 3: ALB リスナーの証明書差し替え
  - [ ] modify-listener で HTTPS/443 リスナーの証明書を差し替えた
  - [ ] describe-listeners で新しい CertificateArn が設定されていることを確認した

STEP 4: OS への証明書インストール
  - [ ] cert.pem をアクセスする各PCに転送した
  - [ ] 「信頼されたルート証明機関」にインストールした（Windows / Mac）
  - [ ] ブラウザを再起動した

STEP 5: 動作確認
  - [ ] ブラウザで 🔒 鍵マークが表示されることを確認した
  - [ ] curl --cacert でSSLハンドシェイクが成功することを確認した

STEP 6: 旧証明書の削除（任意）
  - [ ] 旧証明書（d6147869-...）を ACM から削除した
```

---

## トラブルシューティング

### ブラウザをリスタートしても警告が消えない場合

- ブラウザの証明書キャッシュが残っている可能性があります
- Chrome の場合: `chrome://settings/security` → 「証明書の管理」で確認
- Windows の場合: `certmgr.msc` で「信頼されたルート証明機関」にインストールされているか確認

### `curl --cacert` でも SSL エラーが出る場合

```bash
# 証明書の内容を確認
openssl x509 -in /tmp/acm-cert-new/cert.pem -noout -text | grep -A 5 "Subject\|SAN\|Validity"
```

- CN と SAN が `prod-verification-alb-1495997713.ap-northeast-1.elb.amazonaws.com` になっているか確認

---

*本手順書は prod-verification-alb-build-guide.md STEP 1 で生成した自己署名証明書の CN/SAN 不一致による「保護されていない通信」警告を解消するための追加手順書です。*

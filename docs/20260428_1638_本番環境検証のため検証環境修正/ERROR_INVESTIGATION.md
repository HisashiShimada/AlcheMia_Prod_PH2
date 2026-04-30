# エラー調査レポート: UnsupportedCertificate

- **発生日時**: 2026-04-30
- **発生箇所**: BUILD_GUIDE.md「8-2. HTTPS/443 リスナーの作成」
- **担当者**: Cline

---

## 1. エラー内容

### 実行コマンド

```bash
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:loadbalancer/app/prod-verification-alb/b901f038a9a6be79 \
  --protocol HTTPS \
  --port 443 \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --certificates CertificateArn=arn:aws:acm:ap-northeast-1:137068252939:certificate/07f674f8-de53-4b5f-9744-7846312bdac2 \
  --default-actions '[{"Type":"forward","TargetGroupArn":"arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/prod-frontend-tg/360140328c35e57f"}]' \
  --region ap-northeast-1
```

### エラーメッセージ

```
An error occurred (UnsupportedCertificate) when calling the CreateListener operation:
The certificate 'arn:aws:acm:ap-northeast-1:137068252939:certificate/07f674f8-de53-4b5f-9744-7846312bdac2'
must have a fully-qualified domain name, a supported signature, and a supported key size.
```

---

## 2. 原因

### 直接原因

BUILD_GUIDE.md の STEP 1-1 で自己署名証明書を生成する際の `-subj` オプションに、**FQDN（完全修飾ドメイン名）ではない値**を指定していたため。

```bash
# 問題のコマンド（修正前）
openssl req -x509 -newkey rsa:2048 -nodes \
  -subj "/CN=prod-verification-alb"   # ← ドットを含まないホスト名
```

### 詳細説明

AWS ALB の HTTPS リスナーにアタッチする ACM 証明書には、以下の3つの要件がある。

| 要件 | 説明 | 今回の状態 |
|-----|------|-----------|
| FQDN（完全修飾ドメイン名） | CN にドット(`.`)を含む形式であること（例: `example.com`） | `prod-verification-alb` はドットなし → **❌ 不適合** |
| サポートされた署名アルゴリズム | RSA または ECDSA（SHA-1 は不可） | RSA 2048bit → ✅ |
| サポートされた鍵サイズ | RSA 1024bit 以上 など | RSA 2048bit → ✅ |

`prod-verification-alb` はドットを含まない単純なホスト名であり、FQDN として認識されないため、ALB が証明書を拒否した。

### ACM へのインポート自体は成功する理由

ACM はインポート時に CN の形式を検証しない（Status: ISSUED になる）。  
しかし ALB がリスナーに証明書をアタッチする際に FQDN チェックが行われ、エラーとなる。

---

## 3. 対策

### 即時対応手順

#### ① 旧証明書を ACM から削除

```bash
aws acm delete-certificate \
  --certificate-arn arn:aws:acm:ap-northeast-1:137068252939:certificate/07f674f8-de53-4b5f-9744-7846312bdac2 \
  --region ap-northeast-1
```

#### ② 自己署名証明書を FQDN 付きで再生成

CN に **ドットを含む FQDN 形式**を使用する。正式なドメインが未決定なため、仮のドメイン名（`.internal` サフィックス）を使用する。

```bash
mkdir -p /tmp/acm-cert

openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout /tmp/acm-cert/cert.key \
  -out    /tmp/acm-cert/cert.pem \
  -days   365 \
  -subj   "/CN=prod-verification-alb.internal"
```

#### ③ ACM へ再インポート

```bash
aws acm import-certificate \
  --certificate       fileb:///tmp/acm-cert/cert.pem \
  --private-key       fileb:///tmp/acm-cert/cert.key \
  --certificate-chain fileb:///tmp/acm-cert/cert.pem \
  --region ap-northeast-1
```

> 出力された新しい `CertificateArn` をメモする。

#### ④ HTTPS リスナー作成コマンドを再実行

`CertificateArn` を新しい ARN に差し替えて再実行する。

```bash
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:loadbalancer/app/prod-verification-alb/b901f038a9a6be79 \
  --protocol HTTPS \
  --port 443 \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --certificates CertificateArn=<新しい CertificateArn> \
  --default-actions '[{"Type":"forward","TargetGroupArn":"arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/prod-frontend-tg/360140328c35e57f"}]' \
  --region ap-northeast-1
```

### BUILD_GUIDE.md の恒久修正

STEP 1-1 の `-subj` オプションを以下のように修正した（2ファイル）。

| ファイル | 修正箇所 |
|---------|---------|
| `docs/20260428_1638_本番環境検証のため検証環境修正/BUILD_GUIDE.md` | STEP 1-1 の `-subj` |
| `docs/deploy-guide/aws-infrastructure/staging-production-like/BUILD_GUIDE.md` | STEP 1-1 の `-subj` |

**修正内容:**

```diff
- -subj   "/CN=prod-verification-alb"
+ -subj   "/CN=prod-verification-alb.internal"
```

---

## 4. 補足: AWS ALB 証明書要件

AWS ALB の HTTPS リスナーにアタッチ可能な証明書の要件（AWS 公式ドキュメントより）:

- **CN または SAN**: FQDN 形式（ドットを含む）であること
- **鍵サイズ**: RSA 1024〜4096bit、ECDSA P-256/P-384
- **署名アルゴリズム**: SHA-256 以上（SHA-1 は非サポート）
- **証明書の種類**: ACM 発行証明書（`AMAZON_ISSUED`）または ACM にインポートされた証明書（`IMPORTED`）

自己署名証明書でも上記要件を満たせばアタッチ可能。  
ブラウザでは証明書エラーが表示されるが、検証環境での動作確認には支障なし（`curl -k` で確認可能）。

---

## 5. 関連ファイル

| ファイル | 概要 |
|---------|------|
| `docs/20260428_1638_本番環境検証のため検証環境修正/BUILD_GUIDE.md` | 本番検証環境構築手順書（今回の作業ファイル） |
| `docs/deploy-guide/aws-infrastructure/staging-production-like/BUILD_GUIDE.md` | デプロイガイド正式版（同内容を管理） |

# エラー調査レポート: UnsupportedCertificate

- **発生日時**: 2026-04-30
- **発生箇所**: prod-verification-alb-build-guide.md「8-2. HTTPS/443 リスナーの作成」
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

prod-verification-alb-build-guide.md の STEP 1-1 で自己署名証明書を生成する際の `-subj` オプションに、**FQDN（完全修飾ドメイン名）ではない値**を指定していたため。

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

### prod-verification-alb-build-guide.md の恒久修正

STEP 1-1 の `-subj` オプションを以下のように修正した（2ファイル）。

| ファイル | 修正箇所 |
|---------|---------|
| `docs/20260428_1638_本番環境検証のため検証環境修正/prod-verification-alb-build-guide.md` | STEP 1-1 の `-subj` |
| `docs/deploy-guide/aws-infrastructure/staging-production-like/prod-verification-alb-build-guide.md` | STEP 1-1 の `-subj` |

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
| `docs/20260428_1638_本番環境検証のため検証環境修正/prod-verification-alb-build-guide.md` | 本番検証環境構築手順書（今回の作業ファイル） |

---

---

# エラー調査レポート: backend ECS タスクが pending のまま起動しない

- **発生日時**: 2026-04-30
- **発生箇所**: prod-verification-alb-build-guide.md「10-6-5. 再作成後の起動確認」
- **担当者**: Cline

---

## 1. エラー内容

### 実行コマンド

```bash
aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-backend-service \
  --region ap-northeast-1 \
  --query 'services[0].{running:runningCount,pending:pendingCount,desired:desiredCount,status:status}'
```

### 観測された状態

```json
{
    "running": 0,
    "pending": 1,
    "desired": 1,
    "status": "ACTIVE"
}
```

数分待機しても `running: 1` にならず、`pending: 1` のまま変化しない。

---

## 2. 原因

### 直接原因

**backend ECS タスクが ECR からイメージをプルできない**ため、タスクが PENDING から RUNNING に遷移できない。

### 詳細説明

STEP 4-2 / 4-3 で作成した ECR Interface Endpoint（`ecr.api` / `ecr.dkr`）に `--private-dns-enabled` を指定したため、VPC 内のすべてのホストで ECR の DNS が VPC Endpoint に向く。

backend ECS タスク（SG: `backend-sg` = `sg-0920f1a670e75b444`）が ECR からイメージをプルする際も VPC Endpoint 経由となるが、STEP 3-3 で `prod-vpce-sg` に許可したインバウンドルールは **`prod-frontend-sg` と作業用 EC2 の SG のみ**であった。

**`backend-sg` は `prod-vpce-sg` の許可対象に含まれていない**ため、ECR Endpoint で通信がブロックされ、イメージプルが失敗し続ける。

### 図解

```
backend ECS タスク（SG: backend-sg = sg-0920f1a670e75b444）
  │  ECR イメージプル → https://ecr.dkr.ap-northeast-1.amazonaws.com/
  │  ↓ Private DNS により VPC Endpoint に向く
  ▼
prod-ecr-dkr-endpoint（VPC Endpoint）
  SG: prod-vpce-sg
  許可: TCP/443 ← prod-frontend-sg のみ
  → backend-sg は許可対象外 → イメージプル失敗 ❌
  → タスクが PENDING のまま → running:0 が継続
```

---

## 3. 対策

### 即時対応手順

`prod-vpce-sg` に `backend-sg` からの TCP/443 を追加許可する。

```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-054a6952c1d475d25 \
  --protocol tcp \
  --port 443 \
  --source-group sg-0920f1a670e75b444 \
  --region ap-northeast-1
```

許可追加後、数分以内にタスクが自動リトライして RUNNING に遷移する。

```bash
# 状態確認
aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-backend-service \
  --region ap-northeast-1 \
  --query 'services[0].{running:runningCount,pending:pendingCount,desired:desiredCount,status:status}'
```

> ✅ `running: 1`, `pending: 0`, `desired: 1` になれば復旧完了。

### prod-verification-alb-build-guide.md の恒久修正

- **STEP 3-3**: `prod-vpce-sg` 作成時に、`backend-sg` からの TCP/443 許可コマンドと注記を追加した。

---

## 4. 補足: VPC Endpoint SG と ECR アクセスの関係

| ポイント | 説明 |
|---------|------|
| `--private-dns-enabled` の効果 | VPC 内のすべてのホストが ECR / Logs 等の公開 DNS を VPC Endpoint の ENI に解決するようになる |
| 影響を受けるコンポーネント | ECR にアクセスするすべての ECS タスク（frontend・backend 両方） |
| SG の許可が必要な送信元 | prod-frontend-sg、backend-sg（既存）、作業用 EC2 の SG |
| 許可漏れ時の症状 | ECS タスクが PENDING のまま起動しない（イメージプル失敗） |

---

## 5. 関連ファイル

| ファイル | 概要 |
|---------|------|
| `docs/20260428_1638_本番環境検証のため検証環境修正/prod-verification-alb-build-guide.md` | 本番検証環境構築手順書（今回の作業ファイル） |
| `docs/deploy-guide/aws-infrastructure/staging-production-like/prod-verification-alb-build-guide.md` | デプロイガイド正式版（同内容を管理） |

---

---

# エラー調査レポート: CloudWatch Logs タイムアウト（Connect timeout）

- **発生日時**: 2026-04-30
- **発生箇所**: prod-verification-alb-build-guide.md「10-4. CloudWatch ログの確認」
- **担当者**: Cline

---

## 1. エラー内容

### 実行コマンド

```bash
aws logs tail /ecs/prod-frontend \
  --region ap-northeast-1 \
  --since 10m
```

### エラーメッセージ

```
Connect timeout on endpoint URL: "https://logs.ap-northeast-1.amazonaws.com/"
```

---

## 2. 原因

### ネットワーク経路の問題

STEP 4-4 で `CloudWatch Logs Interface Endpoint`（`prod-logs-endpoint`）を `--private-dns-enabled` 付きで作成したため、**VPC 内のすべてのホストで `logs.ap-northeast-1.amazonaws.com` の名前解決が VPC Endpoint に向く**。

作業用 EC2 から `aws logs tail` を実行すると、通信先は VPC Endpoint（`vpce-0f328c49039467894`）となるが、STEP 3-3 で `prod-vpce-sg` に許可したインバウンドルールは **`prod-frontend-sg` からの TCP/443 のみ**であった。

作業用 EC2 のセキュリティグループは `prod-vpce-sg` の許可対象に含まれていないため、VPC Endpoint で通信がブロックされ、タイムアウトが発生した。

### 図解

```
作業用 EC2（SG: <EC2_SG>）
  │  aws logs tail → https://logs.ap-northeast-1.amazonaws.com/
  │  ↓ Private DNS により VPC Endpoint に向く
  ▼
prod-logs-endpoint（VPC Endpoint）
  SG: prod-vpce-sg
  許可: TCP/443 ← prod-frontend-sg のみ
  → EC2_SG は許可対象外 → タイムアウト ❌
```

---

## 3. 対策

### 即時対応手順

STEP 3-3 で作成した `prod-vpce-sg` に、作業用 EC2 のセキュリティグループ（`<EC2_SG_ID>`）からの TCP/443 を追加許可する。

```bash
# <EC2_SG_ID> を実際の作業用 EC2 の SG ID に置き換える
aws ec2 authorize-security-group-ingress \
  --group-id sg-054a6952c1d475d25 \
  --protocol tcp \
  --port 443 \
  --source-group <EC2_SG_ID> \
  --region ap-northeast-1
```

許可を追加後、再度 `aws logs tail` を実行する。

```bash
aws logs tail /ecs/prod-frontend \
  --region ap-northeast-1 \
  --since 10m
```

### prod-verification-alb-build-guide.md の恒久修正

- **STEP 3-3**: `prod-vpce-sg` 作成時に、作業用 EC2 の SG 許可コマンドを手順として追加した。
- **STEP 10-4**: 実行前提の確認注記を追加した。

---

## 4. 補足: VPC Endpoint の Private DNS と SG の関係

| ポイント | 説明 |
|---------|------|
| `--private-dns-enabled` の効果 | VPC 内のすべてのホストがサービスの公開 DNS 名を VPC Endpoint の ENI に解決するようになる |
| SG の適用対象 | VPC Endpoint に付与した SG は、**Endpoint の ENI へのインバウンド**を制御する |
| インターネットへの経路不要 | Endpoint 経由のためパブリック IP・IGW・NAT Gateway 不要 |
| 注意点 | Endpoint の SG に許可がない送信元からは**インターネット経由も Endpoint 経由も失敗**する（DNS が Endpoint に向くためインターネットへの迂回ができない） |

---

## 5. 関連ファイル

| ファイル | 概要 |
|---------|------|
| `docs/20260428_1638_本番環境検証のため検証環境修正/prod-verification-alb-build-guide.md` | 本番検証環境構築手順書（今回の作業ファイル） |

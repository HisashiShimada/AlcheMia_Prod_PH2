# ALB mTLS 追加設定手順書（組織ID抽出）

- **作成日**: 2026-05-01
- **対象環境**: alchemia-staging（prod-verification-alb）
- **前提**: `prod-verification-alb-build-guide.md` の STEP 1〜11 が完了していること

> **目的**: prod-verification-alb-build-guide.md で作成した `prod-verification-alb` に mTLS（相互TLS認証）を追加し、  
> クライアント証明書の CN（= organization_id）を `X-Amzn-Mtls-Clientcert-Subject` ヘッダーで  
> バックエンドに渡せるようにする。

---

## 全体の流れ

```
STEP A: ca.crt を S3 にアップロード
STEP B: ACM Trust Store を作成
STEP C: ALB リスナーに mTLS 設定を追加
STEP D: バックエンドコードを変更してデプロイ
STEP E: 動作確認
```

---

## STEP A: ca.crt を S3 にアップロード

ACM Trust Store の作成には CA 証明書を S3 経由で渡す必要があります。  
既存の `backend/certs/ca/ca.crt` をそのまま使用します（再生成不要）。

### A-1. アップロード先の S3 バケットを確認・決定

> 既存のプロジェクトで使用しているバケットを利用するか、専用のバケットを作成してください。  
> ここでは `<YOUR_S3_BUCKET>` と表記します。

```bash
# バケット一覧を確認
aws s3 ls --region ap-northeast-1
```

`<YOUR_S3_BUCKET>` : mmdpf-files-production

### A-2. ca.crt をアップロード

```bash
aws s3 cp backend/certs/ca/ca.crt \
  s3://<YOUR_S3_BUCKET>/certs/ca.crt \
  --region ap-northeast-1

# アップロード確認
aws s3 ls s3://<YOUR_S3_BUCKET>/certs/
```

> ✅ `ca.crt` がリストに表示されれば完了。

### チェックリスト
- [✓] アップロード先の S3 バケットを決定した
- [✓] `backend/certs/ca/ca.crt` を S3 にアップロードした
- [✓] アップロードを確認した

---

## STEP B: ACM Trust Store の作成

### B-1. Trust Store を作成

```bash
aws elbv2 create-trust-store \
  --name "mmdpf-ca-trust-store" \
  --ca-certificates-bundle-s3-bucket "<YOUR_S3_BUCKET>" \
  --ca-certificates-bundle-s3-key "certs/ca.crt" \
  --region ap-northeast-1
```

> **出力例:**
> ```json
> {
>   "TrustStoreArn": "arn:aws:acm:ap-northeast-1:137068252939:truststore/mmdpf-ca-trust-store/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
>   "TrustStoreName": "mmdpf-ca-trust-store"
> }
> ```
> → **TrustStoreArn をメモ**（STEP C で使用）

> **メモ** → **TRUST_STORE_ARN**: arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:truststore/mmdpf-ca-trust-store/7dde47bfb6247560

### B-2. Trust Store の状態確認

```bash
aws elbv2 describe-trust-stores \
  --trust-store-arns <TRUST_STORE_ARN> \
  --region ap-northeast-1 \
  --query 'TrustStores[0].{Name:Name,Status:Status,NumberOfCaCertificates:NumberOfCaCertificates}'
```

> ✅ `Status: ACTIVE` かつ `NumberOfCACertificates: 1` であることを確認する。

### チェックリスト
- [✓] ACM Trust Store を作成した
- [✓] TrustStoreArn をメモした
- [✓] Status が `ACTIVE` であることを確認した

---

## STEP C: ALB リスナーに mTLS 設定を追加

prod-verification-alb-build-guide.md STEP 8 で作成した HTTPS/443 リスナーを変更して mTLS を有効化します。

### C-1. 現在のリスナー設定を確認

```bash
# prod-verification-alb-build-guide.md でメモした HTTPS_LISTENER_ARN を使用
aws elbv2 describe-listeners \
  --listener-arns <HTTPS_LISTENER_ARN> \
  --region ap-northeast-1 \
  --query 'Listeners[0].{Protocol:Protocol,Port:Port,MutualAuthentication:MutualAuthentication}'
```

> ✅ `MutualAuthentication` が `null` または存在しない、あるいは `{"Mode": "off"}` であれば mTLS 未設定の状態（想定通り）。  
> ℹ️ **`{"Mode": "off"}` が返ってきた場合も問題なし。** AWS の ALB は API バージョンによって、mTLS 未設定の場合でも `{"Mode": "off"}` を明示的に返すことがあります。`null`・項目なし・`Mode: "off"` はすべて「mTLS 無効」であり機能的に同一の状態です。そのまま C-2 に進んでください。

### C-2. mTLS を有効化（modify-listener）

```bash
aws elbv2 modify-listener \
  --listener-arn <HTTPS_LISTENER_ARN> \
  --mutual-authentication \
    Mode=verify,TrustStoreArn=<TRUST_STORE_ARN>,IgnoreClientCertificateExpiry=false \
  --region ap-northeast-1
```

> **パラメータ説明:**
> | パラメータ | 値 | 説明 |
> |-----------|-----|------|
> | `Mode` | `verify` | クライアント証明書を検証してヘッダーに付与 |
> | `TrustStoreArn` | STEP B でメモした ARN | 信頼する CA 証明書のストア |
> | `IgnoreClientCertificateExpiry` | `false` | 期限切れ証明書を拒否する |

### C-3. 設定確認

```bash
aws elbv2 describe-listeners \
  --listener-arns <HTTPS_LISTENER_ARN> \
  --region ap-northeast-1 \
  --query 'Listeners[0].MutualAuthentication'
```

> ✅ 以下が返れば設定完了:
> ```json
> {
>   "Mode": "verify",
>   "TrustStoreArn": "arn:aws:acm:...",
>   "IgnoreClientCertificateExpiry": false
> }
> ```

### チェックリスト
- [✓] 既存リスナーに mTLS を設定した（Mode=verify）
- [✓] MutualAuthentication の設定が反映されていることを確認した

---

## STEP D: バックエンドコードの変更

### 設計方針：nginx 構成と ALB mTLS 構成の共存

バックエンドは以下の **優先順位付きフォールバック** で organization_id を取得するよう変更します。  
この設計により、**nginx 構成・ALB mTLS 構成・ローカル開発のすべてで同一コードが動作**します。

**優先順位:**

| 優先度 | ヘッダー / パラメータ | 付与元 | 対応する構成 |
|--------|----------------------|--------|------------|
| ① 最優先 | `X-Amzn-Mtls-Clientcert-Subject` | ALB が自動付与 | **新ALB構成**（prod-verification-alb + mTLS） |
| ② 次点 | `X-Organization-Id` | nginx が付与 | **既存nginx構成**（NLB + nginx） |
| ③ フォールバック | `orgId`（クエリパラメータ） | クライアントが送信 | ローカル開発・後方互換 |

**構成別の動作:**

| 構成 | ① ALB mTLS ヘッダー | ② nginx ヘッダー | 結果 |
|------|---------------------|-----------------|------|
| 新ALB構成（mTLS有効） | ✅ あり | なし | ① から抽出 |
| 既存nginx構成（NLB+nginx） | なし | ✅ あり | ② から抽出 |
| ローカル開発 | なし | なし | ③ `orgId` クエリパラメータから取得 |

> ⚠️ **注意**: 両ヘッダーが同時に届く状況は通常発生しません。  
> ALB mTLS 構成では nginx を経由しないため `X-Organization-Id` は付与されず、  
> nginx 構成では ALB mTLS を経由しないため `X-Amzn-Mtls-Clientcert-Subject` は付与されません。

---

ALB が付与する `X-Amzn-Mtls-Clientcert-Subject` ヘッダーから CN（organization_id）を抽出するよう変更します。

### D-0. authRoutes.ts の変更（バリデーション修正）

**変更ファイル**: `backend/src/routes/authRoutes.ts`

> ⚠️ **この変更が不足していると `E1003` バリデーションエラーが発生します。**  
> `validateOrgId()` はコントローラーへ到達する前に実行されるため、  
> mTLS ヘッダーを許容しないと ALB 構成でのログインが必ず 400 になります。

**① CORS `allowedHeaders` の変更:**

`X-Amzn-Mtls-Clientcert-Subject` を許可するヘッダーに追加します。

**変更前:**
```typescript
allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
```

**変更後:**
```typescript
allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id', 'X-Amzn-Mtls-Clientcert-Subject'],
```

**② `validateOrgId()` の変更:**

ALB mTLS ヘッダーを最優先の条件として追加します。

**変更前:**
```typescript
const validateOrgId = () => {
  return oneOf([
    query('orgId')
      .notEmpty()
      .withMessage('Organization ID is required in query parameter'),
    header('x-organization-id')
      .notEmpty()
      .withMessage('Organization ID is required in header'),
  ], { message: 'Organization ID is required in either query parameter (orgId) or header (X-Organization-Id)' });
};
```

**変更後:**
```typescript
// 優先順位:
//   ① x-amzn-mtls-clientcert-subject（ALB mTLS が自動付与 / 新ALB構成）
//   ② x-organization-id（nginx が付与 / 既存nginx構成）
//   ③ orgId クエリパラメータ（ローカル開発・後方互換）
const validateOrgId = () => {
  return oneOf([
    header('x-amzn-mtls-clientcert-subject')
      .notEmpty()
      .withMessage('Organization ID is required in mTLS client cert subject'),
    header('x-organization-id')
      .notEmpty()
      .withMessage('Organization ID is required in header'),
    query('orgId')
      .notEmpty()
      .withMessage('Organization ID is required in query parameter'),
  ], { message: 'Organization ID is required in either query parameter (orgId) or header (X-Organization-Id)' });
};
```

> **適用エンドポイント（`validateOrgId()` を使用している全箇所）:**
> - `POST /login`
> - `POST /verify-pin`
> - `POST /resend-pin`
> - `POST /reset-password-request`

---

### D-1. authController.ts の変更

**変更ファイル**: `backend/src/controllers/authController.ts`

以下の3箇所で `organizationId` を取得しているコードを変更します。

**変更前（3箇所共通）:**
```typescript
const organizationId = (req.headers['x-organization-id'] || req.query.orgId) as string;
```

**変更後（3箇所共通）:**
```typescript
// ALB mTLS が付与する Subject ヘッダーから CN（organization_id UUID）を抽出
const mtlsSubject = req.headers['x-amzn-mtls-clientcert-subject'] as string;
const mtlsMatch = mtlsSubject?.match(/CN=([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
const organizationId = (mtlsMatch?.[1] ?? req.headers['x-organization-id'] ?? req.query.orgId) as string;
```

> **対象行（目安）:**
> - `login` 関数（約27行目）
> - `resetPasswordRequest` 関数（`req.headers['x-organization-id']` を参照している箇所）
> - `verifyPin` 関数（`req.headers['x-organization-id']` を参照している箇所）

> **フォールバックについて**: `?? req.headers['x-organization-id'] ?? req.query.orgId` を残すことで、
> - ローカル開発（mTLS なし）→ 従来通り `X-Organization-Id` ヘッダーまたは `orgId` クエリパラメータで動作
> - 本番ALB（mTLS あり）→ `X-Amzn-Mtls-Clientcert-Subject` から自動抽出

### D-2. rateLimitMiddleware.ts の変更

**変更ファイル**: `backend/src/middleware/rateLimitMiddleware.ts`

**変更対象**: `loginRateLimit` の `keyGenerator`（148行目付近）

**変更前:**
```typescript
keyGenerator: (req) => {
  const orgId = (req.query.orgId || req.headers['x-organization-id']) as string;
  const userId = (req.body?.userId || req.body?.username) as string;
  return orgId && userId ? `${orgId}__${userId}` : '';
},
```

**変更後:**
```typescript
keyGenerator: (req) => {
  // ALB mTLS が付与する Subject ヘッダーから CN（organization_id UUID）を抽出
  const mtlsSubject = req.headers['x-amzn-mtls-clientcert-subject'] as string;
  const mtlsMatch = mtlsSubject?.match(/CN=([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  const orgId = (mtlsMatch?.[1] ?? req.query.orgId ?? req.headers['x-organization-id']) as string;
  const userId = (req.body?.userId || req.body?.username) as string;
  return orgId && userId ? `${orgId}__${userId}` : '';
},
```

### D-3. コードのビルドと ECR プッシュ

```bash
# backend イメージをビルドして ECR にプッシュ
./scripts/deploy.ecr.phase1.sh --backend

# または手動でビルド・プッシュ
docker build -t mmdpf-backend:staging ./backend
docker tag mmdpf-backend:staging 137068252939.dkr.ecr.ap-northeast-1.amazonaws.com/mmdpf-backend:staging
docker push 137068252939.dkr.ecr.ap-northeast-1.amazonaws.com/mmdpf-backend:staging
```

### D-4. ECS サービスを強制更新（新しいイメージを取得）

```bash
aws ecs update-service \
  --cluster alchemia-staging \
  --service alchemia-backend-service \
  --force-new-deployment \
  --region ap-northeast-1

# デプロイ完了を確認
aws ecs describe-services \
  --cluster alchemia-staging \
  --services alchemia-backend-service \
  --region ap-northeast-1 \
  --query 'services[0].{running:runningCount,desired:desiredCount,pending:pendingCount}'
```

> ✅ `running=1, desired=1, pending=0` になるまで待ちます。

### チェックリスト
- [ ] `authRoutes.ts` の `validateOrgId()` に mTLS ヘッダー条件を追加した
- [ ] `authRoutes.ts` の CORS `allowedHeaders` に `X-Amzn-Mtls-Clientcert-Subject` を追加した
- [ ] `authController.ts` の `organizationId` 取得箇所（3箇所）を変更した
- [ ] `rateLimitMiddleware.ts` の `loginRateLimit.keyGenerator` を変更した
- [ ] backend イメージをビルドして ECR にプッシュした
- [ ] ECS サービスを強制更新し、新イメージが起動したことを確認した

---

## STEP E: 動作確認

### E-1. mTLS ヘッダーの確認（クライアント証明書あり）

ブラウザで `.p12` 証明書をインポートした状態で ALB DNS 名にアクセスし、  
バックエンドがリクエストを受け取る際に `X-Amzn-Mtls-Clientcert-Subject` が付与されているか確認します。

**CloudWatch ログで確認:**
```bash
aws logs tail /ecs/alchemia-backend \
  --region ap-northeast-1 \
  --since 5m
```

### E-2. curl でクライアント証明書付きリクエストを確認

```bash
ALB_DNS="prod-verification-alb-1495997713.ap-northeast-1.elb.amazonaws.com"

# .p12 から PEM 形式に変換（事前に実施）
openssl pkcs12 -in <organization_id>.p12 -clcerts -nokeys -out client.crt -passin pass:mmdpf123
openssl pkcs12 -in <organization_id>.p12 -nocerts -nodes -out client.key -passin pass:mmdpf123

# クライアント証明書付きでヘルスチェック
curl -k \
  --cert client.crt \
  --key  client.key \
  "https://${ALB_DNS}/api/health"
# 期待: {"status":"ok"}
```

### E-3. ログイン API の動作確認

```bash
ALB_DNS="prod-verification-alb-1495997713.ap-northeast-1.elb.amazonaws.com"

curl -k \
  --cert client.crt \
  --key  client.key \
  -X POST "https://${ALB_DNS}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"userId": "<YOUR_USER_ID>", "password": "<YOUR_PASSWORD>"}'
```

> ✅ `{"success":true, ...}` が返れば organization_id の抽出が正常に機能しています。  
> ❌ `Organization ID is required` エラーが返る場合は STEP D のコード変更またはデプロイを再確認してください。

### E-4. 証明書なしアクセスの確認（セキュリティ確認）

```bash
# クライアント証明書なしでアクセス → ALB が 400 を返すことを確認
curl -k -v "https://${ALB_DNS}/api/health" 2>&1 | grep "< HTTP"
# 期待: HTTP/2 400（証明書なしは拒否される）
```

### チェックリスト
- [ ] CloudWatch ログで `X-Amzn-Mtls-Clientcert-Subject` ヘッダーが付与されていることを確認した
- [ ] クライアント証明書付きで `/api/health` が `200 OK` を返すことを確認した
- [ ] クライアント証明書付きでログイン API が正常に動作することを確認した
- [ ] 証明書なしのアクセスが `400` で拒否されることを確認した

---

## リソースID メモ欄

| 項目 | 値 |
|-----|---|
| HTTPS_LISTENER_ARN | arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:listener/app/prod-verification-alb/b901f038a9a6be79/f47479226ac6683d |
| S3_BUCKET | |
| TRUST_STORE_ARN | |

---

## 参考資料

| ドキュメント | 内容 |
|-------------|------|
| [prod-verification-alb-build-guide.md](./prod-verification-alb-build-guide.md) | ALB 作成手順（STEP 1〜11） |
| [alb-organization-id-extraction.md](../deploy-guide/aws-infrastructure/research/alb-organization-id-extraction.md) | ALB mTLS 調査レポート |
| [acm-trust-store.md](../deploy-guide/aws-infrastructure/research/acm-trust-store.md) | ACM Trust Store 設定手順 |
| [server-cert-regenerate-guide.md](../deploy-guide/aws-infrastructure/staging/server-cert-regenerate-guide.md) | サーバー証明書再生成手順（CA は変更しない） |

---

*本手順書は prod-verification-alb-build-guide.md の補足手順として作成。mTLS を有効化することで nginx なし構成でも organization_id を抽出できるようになります。*

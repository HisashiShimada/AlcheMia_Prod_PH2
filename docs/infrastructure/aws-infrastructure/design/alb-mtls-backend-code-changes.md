# 調査報告: バックエンドコード変更の具体的内容（ALB mTLS 対応）

- **作成日**: 2026-04-22
- **関連レポート**: REPORT1.md（ALB で organization_id 抽出を代替できるか？）
- **調査内容**: REPORT1.md「5-2. バックエンドのコード変更（必須）」の具体的な変更箇所と、開発環境/本番環境の切り替え方針

---

## 1. 前提：現在の organization_id 取得構造の整理

REPORT1.md では「主に `tenantIsolationMiddleware.ts` が対象」と記載されているが、  
実際のコードを調査した結果、以下の通りであることが判明した。

| ミドルウェア | `x-organization-id` の参照 | 変更要否 |
|------------|---------------------------|---------|
| `tenantIsolation.ts` | **参照していない**（`req.user.organizationId` = JWT から取得） | **不要** |
| `authController.ts` | **直接参照している**（JWT がない認証前エンドポイントで使用） | **必要** |
| `authRoutes.ts` | バリデーションで参照している | **必要** |

### 理由

- 認証後のルート（プロジェクト操作等）では、JWT のペイロードに `organizationId` が含まれており、`tenantIsolation.ts` はそれを使用する。ヘッダーは不要。
- 認証前のルート（`/login`, `/verify-pin`, `/resend-pin`, `/reset-password-request`）は JWT がまだ存在しないため、`authController.ts` がリクエストヘッダーから直接 `organization_id` を取得している。

---

## 2. 変更が必要なファイルと箇所

### 2-1. `backend/src/controllers/authController.ts`（7箇所）

#### organizationId 取得ロジック（3箇所）

```typescript
// 変更前（nginx モード）
const organizationId = (req.headers['x-organization-id'] || req.query.orgId) as string;

// 変更後（ALB mTLS モード）
const subject = req.headers['x-amzn-mtls-clientcert-subject'] as string;
const match = subject?.match(/CN=([^,]+)/);
const organizationId = (match?.[1] || req.query.orgId) as string;
```

| 行 | 関数 | 内容 |
|----|------|------|
| L27 | `login()` | organizationId 取得ロジック |
| L104 | `resetPasswordRequest()` | organizationId 取得ロジック |
| L233 | `resendPin()` | organizationId 取得ロジック |

#### catch ブロックのログ出力（4箇所）

```typescript
// 変更前
organizationId: req.headers['x-organization-id'] as string,

// 変更後（ヘルパー関数に統一）
organizationId: getOrganizationId(req),
```

| 行 | 関数 |
|----|------|
| L70 | `login()` の catch |
| L135 | `resetPasswordRequest()` の catch |
| L272 | `resendPin()` の catch |
| L409 | `verifyPin()` の catch |

---

### 2-2. `backend/src/routes/authRoutes.ts`（3箇所）

#### CORS の `allowedHeaders`（L22）

```typescript
// 変更前
allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],

// 変更後（ALB 付与ヘッダーは CORS 対象外のため X-Organization-Id を削除）
allowedHeaders: ['Content-Type', 'Authorization'],
```

#### `validateOrgId()` 関数（L27〜36）

```typescript
// 変更前
const validateOrgId = () => {
  return oneOf([
    query('orgId').notEmpty()...,
    header('x-organization-id').notEmpty()...,
  ]);
};

// 変更後
const validateOrgId = () => {
  return oneOf([
    query('orgId').notEmpty()...,
    header('x-amzn-mtls-clientcert-subject').notEmpty()...,
  ]);
};
```

この `validateOrgId()` は以下の 4 エンドポイントで使用されている。

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/verify-pin`
- `POST /api/v1/auth/resend-pin`
- `POST /api/v1/auth/reset-password-request`

---

## 3. 開発環境（nginx）／本番環境（ALB）の切り替え方針

### 3-1. 環境変数 `ORG_ID_SOURCE` を追加して切り替え

```bash
# 開発環境 (.env)
ORG_ID_SOURCE=nginx   # nginx が付与した X-Organization-Id を使用

# 本番環境 (.env.prod.aws.example)
ORG_ID_SOURCE=alb     # ALB が付与した X-Amzn-Mtls-Clientcert-Subject を使用
```

### 3-2. ヘルパー関数を1つ追加して集中管理

`authController.ts` に以下のヘルパー関数を追加し、全ての取得ロジックをここに集約する。

```typescript
/**
 * リクエストから organization_id を取得する
 * ORG_ID_SOURCE 環境変数で取得元を切り替え
 *   - "alb"  : ALB mTLS ヘッダー X-Amzn-Mtls-Clientcert-Subject の CN を解析
 *   - "nginx": nginx が付与した X-Organization-Id をそのまま使用（デフォルト）
 */
function getOrganizationId(req: Request): string | undefined {
  const source = process.env.ORG_ID_SOURCE || 'nginx';

  if (source === 'alb') {
    const subject = req.headers['x-amzn-mtls-clientcert-subject'] as string;
    const match = subject?.match(/CN=([^,]+)/);
    return match?.[1] || (req.query.orgId as string);
  } else {
    // nginx モード（デフォルト・開発環境）
    return (req.headers['x-organization-id'] || req.query.orgId) as string;
  }
}
```

### 3-3. 呼び出し元は全て `getOrganizationId(req)` に統一

```typescript
// 変更前（各関数で直接記述）
const organizationId = (req.headers['x-organization-id'] || req.query.orgId) as string;

// 変更後（ヘルパー関数を呼ぶだけ）
const organizationId = getOrganizationId(req);
```

### 3-4. `authRoutes.ts` のバリデーションも同様に切り替え

```typescript
const validateOrgId = () => {
  const source = process.env.ORG_ID_SOURCE || 'nginx';

  if (source === 'alb') {
    return oneOf([
      query('orgId').notEmpty()
        .withMessage('Organization ID is required in query parameter'),
      header('x-amzn-mtls-clientcert-subject').notEmpty()
        .withMessage('Client certificate subject header is required'),
    ], { message: 'Organization ID is required' });
  } else {
    return oneOf([
      query('orgId').notEmpty()
        .withMessage('Organization ID is required in query parameter'),
      header('x-organization-id').notEmpty()
        .withMessage('Organization ID is required in header'),
    ], { message: 'Organization ID is required in either query parameter (orgId) or header (X-Organization-Id)' });
  }
};
```

---

## 4. 変更箇所 最終まとめ

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/controllers/authController.ts` | `getOrganizationId()` ヘルパー関数を1つ追加し、3関数の取得ロジック＋4箇所のログ出力をそこに集約（計7箇所 → 1関数） |
| `backend/src/routes/authRoutes.ts` | `validateOrgId()` 内の header 検証を `ORG_ID_SOURCE` で切り替え、CORS の `allowedHeaders` から `X-Organization-Id` を削除 |
| `.env` | `ORG_ID_SOURCE=nginx` を追加 |
| `.env.prod.aws.example` | `ORG_ID_SOURCE=alb` を追加 |

---

## 5. デプロイ時の追加作業

ECS タスク定義（`aws/ecs-task-definition-alchemia-backend.json`）の環境変数に以下を追加する。

```json
{
  "name": "ORG_ID_SOURCE",
  "value": "alb"
}
```

---

## 6. セキュリティ上の注意

ALB 構成に変更した場合、`X-Amzn-Mtls-Clientcert-Subject` ヘッダーは ECS タスク内から偽装可能なため、  
**ECS タスクのセキュリティグループで ALB からのトラフィックのみを許可**する設定が必要。  
（詳細は REPORT1.md「8. セキュリティ考慮点」を参照）

---

*本レポートは REPORT1.md「5-2. バックエンドのコード変更（必須）」の具体的調査結果として作成。*

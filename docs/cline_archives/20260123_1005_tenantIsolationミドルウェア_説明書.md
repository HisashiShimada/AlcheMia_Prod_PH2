# tenantIsolationミドルウェアの検討結果

**作成日**: 2026-01-23 10:05  
**更新日**: 2026-01-23 10:09  
**対象**: mmdpfプロジェクト  
**結論**: ⚠️ **tenantIsolationミドルウェアは不要**

---

## 📋 現状と結論

### 実装状況
- ❌ **tenantIsolationミドルウェアは未実装**
- ✅ authMiddleware.tsが`req.user.organizationId`を格納
- ⚠️ API仕様書では`tenantIsolation`の使用を前提としていた

### ⚠️ 結論: tenantIsolationミドルウェアは不要

**理由:**
1. **ログイン時点で組織が確定** - ユーザーは1つの組織にのみ所属
2. **authMiddlewareで十分** - `req.user.organizationId`が既に設定される
3. **S3の物理的分離** - `org_{organization_prefix}`でフォルダ分離済み
4. **システム上のアクセス制限** - 別組織のS3プレフィックスを取得できない設計

### ファイル構造
```
backend/src/middleware/
├── authMiddleware.ts           ✅ 実装済み
├── errorHandlerMiddleware.ts  ✅ 実装済み
├── rateLimitMiddleware.ts     ✅ 実装済み
└── tenantIsolation.ts         ❌ 未実装
```

---

## 🎯 マルチテナント分離の実現方法

### このシステムの設計思想

**ログイン時点での組織確定方式**

```typescript
ログインフロー:
1. ユーザーがログイン → 組織選択（またはユーザーに紐づく組織を自動特定）
2. JWTトークンに組織IDを含める
3. 以降のすべてのリクエストで同じ組織IDを使用
4. 組織の切り替えは再ログインが必要

データ分離:
├─ S3: org_{organization_prefix}/ でフォルダ分離（物理的分離）
├─ DB: organization_id カラムでフィルタ（論理的分離）
└─ JWT: organizationId を含む（セッション単位で固定）
```

### 物理的・論理的な分離

| 層 | 分離方法 | 実装 |
|----|---------|------|
| **ストレージ (S3)** | フォルダ分離 | `org_maiml_lab_001/`, `org_maiml_lab_002/` |
| **データベース** | カラムフィルタ | `WHERE organization_id = $1` |
| **アプリケーション** | JWTペイロード | `req.user.organizationId` |

### なぜtenantIsolationミドルウェアが不要なのか

#### 理由1: ログイン時点で組織が確定している

```typescript
// ログイン処理（簡略化）
async function login(organizationId, userId) {
  // JWTトークンに組織IDを含める
  const token = jwt.sign({
    userId,
    organizationId,  // ← ここで組織が確定
    role: 'experiment_admin'
  }, SECRET);
  
  // 以降のリクエストでは、この組織IDがずっと使われる
  return token;
}

// 組織の切り替えは再ログインが必要
// = セッション中に組織が変わることはない
```

#### 理由2: authMiddlewareで既に必要な情報が揃う

```typescript
// authMiddleware.ts で既に実装済み
export async function authMiddleware(req, res, next) {
  // JWTトークンを検証して req.user に格納
  req.user = {
    userId: "...",
    organizationId: "a0718dc5-...",  // ← ここに組織ID
    role: "experiment_admin"
  };
  next();
}

// コントローラーで直接使用できる
export async function getProjects(req, res) {
  const organizationId = req.user.organizationId; // ✅ これで十分
  
  const projects = await db
    .selectFrom('projects')
    .where('organization_id', '=', organizationId)
    .selectAll()
    .execute();
}
```

#### 理由3: S3の物理的分離により、別組織のデータにアクセス不可

```typescript
// S3の構造
s3://bucket/
├── org_maiml_lab_001/  ← 組織Aのフォルダ
│   ├── projects/
│   └── formats/
└── org_maiml_lab_002/  ← 組織Bのフォルダ
    ├── projects/
    └── formats/

// 組織Aのユーザーがログインすると
req.user.organizationId = "org_maiml_lab_001"

// S3パスの構築
const s3Key = `${req.user.organizationId}/projects/...`;
// → "org_maiml_lab_001/projects/..."

// 組織Bのフォルダ（org_maiml_lab_002/）には
// システム上アクセスする方法がない
```

#### 理由4: DBクエリでのフィルタで十分

```typescript
// 各コントローラーでorganization_idフィルタを必ず適用
export async function getProjects(req, res) {
  const organizationId = req.user.organizationId;
  
  // ✅ WHERE句で組織IDをフィルタ
  const projects = await db
    .selectFrom('projects')
    .where('organization_id', '=', organizationId)
    .selectAll()
    .execute();
}

// この方式で十分にマルチテナント分離が保証される
```

---

## ✅ 推奨される実装方法

### シンプルなミドルウェアチェーン

```typescript
// tenantIsolationミドルウェアは不要
router.get('/projects',
  authMiddleware,                       // 1. 認証: JWT検証、req.userに格納
  permissionCheck(['experiment_admin']), // 2. 権限チェック
  projectController.list                // 3. ビジネスロジック
);
```

### コントローラーでの実装

```typescript
// プロジェクト一覧取得
export async function listProjects(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // req.user.organizationIdを直接使用
    const organizationId = req.user.organizationId;
    
    // DBクエリで必ずorganization_idフィルタを適用
    const projects = await db
      .selectFrom('projects')
      .where('organization_id', '=', organizationId)  // ← 必須
      .selectAll()
      .execute();
    
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    // エラーハンドリング
  }
}
```

### S3操作での実装

```typescript
// S3からファイルダウンロード
export async function downloadFile(
  req: Request,
  res: Response
): Promise<void> {
  const organizationId = req.user.organizationId;
  const { filePath } = req.body;
  
  // organization_prefixを取得（DBから）
  const org = await getOrganization(organizationId);
  const organizationPrefix = org.organization_prefix;
  
  // S3キーを構築（必ずorg_prefixを先頭に付与）
  const s3Key = `${organizationPrefix}/${filePath}`;
  // 例: "org_maiml_lab_001/projects/sample.maiml"
  
  // storageServiceでファイル取得
  const signedUrl = await storageService.getSignedUrl(
    organizationPrefix,
    filePath,
    3600
  );
  
  res.json({ downloadUrl: signedUrl });
}
```

---

## 🔐 セキュリティ上の重要性

### 1. データ漏洩防止

**リスク**: tenantIsolationがないと、以下のようなセキュリティ問題が発生する可能性：

```typescript
// ❌ 悪い例: organization_idチェックなし
export async function getProjects(req: Request, res: Response) {
  // 全組織のプロジェクトが取得できてしまう！
  const projects = await db
    .selectFrom('projects')
    .selectAll()
    .execute();
}

// ✅ 良い例: tenantIsolationでreq.organizationIdが保証される
export async function getProjects(req: Request, res: Response) {
  const organizationId = req.organizationId; // 必ずセット済み
  
  const projects = await db
    .selectFrom('projects')
    .where('organization_id', '=', organizationId) // 必須フィルタ
    .selectAll()
    .execute();
}
```

### 2. クロステナントアクセスの防止

**保証**: ユーザーは自分の組織のデータのみにアクセス可能

```
組織A (org_maiml_lab_001)
├─ ユーザーA1 → organizationId: org_001
└─ ユーザーA2 → organizationId: org_001

組織B (org_maiml_lab_002)
├─ ユーザーB1 → organizationId: org_002  ← 組織Aのデータにアクセス不可
└─ ユーザーB2 → organizationId: org_002  ← 組織Aのデータにアクセス不可
```

### 3. 監査証跡の確保

- すべてのAPIリクエストで組織IDをログに記録
- 不正アクセスの検知が可能
- コンプライアンス要件への対応

---

## 📊 ミドルウェアチェーンの全体像

### 標準的なフロー

```typescript
// ログイン後のAPI（例: プロジェクト一覧取得）
router.get('/api/v1/projects',
  authMiddleware,                       // Step 1
  tenantIsolation,                      // Step 2
  permissionCheck(['experiment_admin']), // Step 3
  projectController.list                // Step 4
);
```

### 各ステップの詳細

#### Step 1: authMiddleware
```typescript
// Input: Authorization: Bearer maiml_session-abc123_1234567890
// Process:
//   1. JWTトークンを検証
//   2. セッション情報を取得
//   3. req.userに格納
// Output: req.user = {
//   userId: "...",
//   organizationId: "a0718dc5-...",  ← ここに含まれる
//   role: "experiment_admin",
//   sessionId: "..."
// }
```

#### Step 2: tenantIsolation（本ミドルウェア）
```typescript
// Input: req.user.organizationId
// Process:
//   1. organizationIdの存在確認
//   2. req.organizationIdに格納
//   3. ログ記録
// Output: req.organizationId = "a0718dc5-..."  ← 明示的に格納
```

#### Step 3: permissionCheck
```typescript
// Input: req.user.role, 必要なロール
// Process:
//   1. ロールの検証
//   2. 権限チェック
// Output: 権限があればnext()、なければ403エラー
```

#### Step 4: コントローラー
```typescript
// Input: req.organizationId, req.user
// Process:
//   1. ビジネスロジック実行
//   2. DBクエリで必ずorganization_idフィルタを使用
// Output: レスポンス返却
```

---

## 💡 なぜ独立したミドルウェアが必要か？

### 理由1: 関心の分離（Separation of Concerns）

| ミドルウェア | 責務 |
|------------|------|
| authMiddleware | **認証**: トークン検証、ユーザー情報取得 |
| tenantIsolation | **テナント分離**: 組織ID管理、マルチテナント保証 |
| permissionCheck | **認可**: ロールベース権限チェック |

→ 各ミドルウェアが1つの責務に集中できる

### 理由2: 再利用性

```typescript
// 様々なAPIで同じミドルウェアチェーンを再利用
router.get('/projects', authMiddleware, tenantIsolation, permissionCheck([...]), controller);
router.get('/formats', authMiddleware, tenantIsolation, permissionCheck([...]), controller);
router.get('/experiments', authMiddleware, tenantIsolation, permissionCheck([...]), controller);
```

### 理由3: テストのしやすさ

```typescript
// tenantIsolationミドルウェアを単独でテスト可能
describe('tenantIsolation', () => {
  it('should set req.organizationId from req.user', () => {
    const req = { user: { organizationId: 'test-org-id' } };
    tenantIsolation(req, res, next);
    expect(req.organizationId).toBe('test-org-id');
  });
  
  it('should return 403 if organizationId is missing', () => {
    const req = { user: { userId: 'test' } }; // organizationIdなし
    tenantIsolation(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
```

### 理由4: 拡張性

将来的な拡張が容易：

```typescript
export function tenantIsolation(req, res, next) {
  // 基本機能
  req.organizationId = req.user.organizationId;
  
  // 将来の拡張例:
  // - organization_prefixの取得とreq.organizationPrefixへの格納
  // - 組織の有効性チェック（is_active）
  // - 組織のプラン制限チェック（無料プラン、有料プラン）
  // - レート制限（組織ごとの上限）
  // - 監査ログの詳細記録
  
  next();
}
```

---

## 📝 実装推奨事項

### 1. 型定義の追加

```typescript
// backend/src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      organizationId?: string;  // tenantIsolationで設定
      organizationPrefix?: string; // 将来の拡張用
    }
  }
}
```

### 2. ミドルウェアの実装

```typescript
// backend/src/middleware/tenantIsolation.ts
import { Request, Response, NextFunction } from 'express';

export function tenantIsolation(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_USER_NOT_FOUND',
          message: '認証情報が見つかりません'
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const organizationId = req.user.organizationId;
    if (!organizationId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_ORGANIZATION_ID_MISSING',
          message: '組織IDが見つかりません'
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    req.organizationId = organizationId;
    
    // オプション: organization_prefixの取得（将来の拡張）
    // req.organizationPrefix = await getOrganizationPrefix(organizationId);

    next();
  } catch (error) {
    console.error('[TenantIsolation] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'システムエラーが発生しました'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  }
}
```

### 3. ルートへの適用

```typescript
// backend/src/routes/projectRoutes.ts
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { permissionCheck } from '../middleware/permissionCheck';

router.get('/projects',
  authMiddleware,
  tenantIsolation,  // ← 追加
  permissionCheck(['experiment_admin', 'system_admin']),
  projectController.list
);
```

---

## 🔄 API仕様書との整合性

### 現在のAPI仕様書の記載

```typescript
**ミドルウェアチェーン**:
router.METHOD('/path', 
  authMiddleware,           // 1. JWT認証（セッション検証、req.userに格納）
  tenantIsolation,          // 2. テナント分離（req.user.organizationIdをreq.organizationIdに格納）
  permissionCheck([...]),   // 3. 権限チェック
  controller.handler        // 4. コントローラー処理
);
```

→ この記載は**正しい設計意図**を表しているが、**実装が追いついていない**状態

---

## ✅ まとめ

### 結論: tenantIsolationミドルウェアは不要

**理由:**
1. ✅ **ログイン時点で組織確定** - セッション中に組織は変わらない
2. ✅ **authMiddlewareで十分** - `req.user.organizationId`が既に設定される
3. ✅ **S3の物理的分離** - 別組織のフォルダにはアクセス不可
4. ✅ **DBフィルタで保証** - 各コントローラーで`organization_id`フィルタを適用

### マルチテナント分離を保証する方法

| 層 | 実装方法 | 責任 |
|----|---------|------|
| **認証** | authMiddleware | JWTから`req.user.organizationId`を設定 |
| **データベース** | コントローラー | 全クエリに`WHERE organization_id = ?`を適用 |
| **S3** | storageService | `org_{prefix}/`を強制的に先頭に付与 |

### 必須事項（重要）

#### ✅ DO（必須）
1. **authMiddlewareで`req.user.organizationId`を必ず設定**
2. **全DBクエリに`organization_id`フィルタを適用**
3. **全S3パスに`org_{organization_prefix}`を付与**
4. **各コントローラーで`req.user?.organizationId`の存在確認**

#### ❌ DON'T（禁止）
1. **organization_idフィルタなしでクエリを実行しない**
2. **S3パスをユーザー入力から直接構築しない**
3. **別組織のデータにアクセスするロジックを実装しない**

### API仕様書の修正が必要

現在のAPI仕様書では`tenantIsolation`ミドルウェアの使用を前提としているため、以下のように修正すべき：

#### Before（現在の記載）
```typescript
router.METHOD('/path', 
  authMiddleware,           // 1. JWT認証
  tenantIsolation,          // 2. テナント分離 ← 削除
  permissionCheck([...]),   // 3. 権限チェック
  controller.handler
);
```

#### After（推奨）
```typescript
router.METHOD('/path', 
  authMiddleware,           // 1. JWT認証（req.user.organizationIdを設定）
  permissionCheck([...]),   // 2. 権限チェック
  controller.handler        // 3. コントローラー（req.user.organizationIdを使用）
);
```

---

**作成者**: Cline  
**作成日**: 2026-01-23 10:05  
**関連ドキュメント**:
- [セキュリティ規約](.clinerules/development/security.md)
- [バックエンド規約](.clinerules/development/backend.md)
- [API仕様書](docs/design/api/)
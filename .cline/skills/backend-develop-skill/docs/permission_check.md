# 権限チェックミドルウェア使用ガイド

## 概要

`permissionCheckMiddleware.ts`は、JWTトークンに含まれる権限情報（function_cd、permission）を使用して、APIルートレベルで権限チェックを行うミドルウェアを提供します。

### 基本原理

- **認証（Authentication）**: ユーザーが誰であるかを確認（authMiddlewareで実施）
- **認可（Authorization）**: ユーザーが何をできるかを確認（**このミドルウェアで実施**）
- **テナント分離**: ユーザーが所属する組織のデータのみアクセス可能（tenantIsolationMiddlewareで実施）

### 権限モデル

**機能CD（function_cd）**:
- 6桁のコード（例: `'050000'`, `'040000'`）
- 各機能メニューに対応
- 主な機能CD:
  - `'010000'`: プロバイダメニュー
  - `'020000'`: システム管理者メニュー
  - `'030000'`: データ管理者メニュー
  - `'040000'`: 実験管理者メニュー
  - `'050000'`: 実験作業者メニュー
  - `'060000'`: MI技術者メニュー

**権限レベル（permission）**:
- `0`: 読み取り専用（Read）
- `1`: 書き込み可能（Write、読み取りを含む）

## 提供される3つの関数

### 1. checkPermission() - 基本的な権限チェック

**用途**: 特定の機能CDに対して、指定された権限レベルをチェック

**シグネチャ**:
```typescript
checkPermission(requiredFunctionId: string, requiredPermission: number = 1)
```

**使用例**:

```typescript
// 実験作業者メニュー、書き込み権限が必要
router.put(
  '/tasks/:taskId',
  authMiddleware,
  tenantIsolation,
  checkPermission('050000', 1),  // 実験作業者メニュー、書き込み権限
  taskController.update
);

// 実験管理者メニュー、読み取り専用でOK
router.get(
  '/tasks',
  authMiddleware,
  tenantIsolation,
  checkPermission('040000', 0),  // 実験管理者メニュー、読み取り専用
  taskController.list
);
```

**エラーレスポンス例**:
```json
// 機能CDがない場合（403 Forbidden）
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "機能へのアクセス権限がありません（機能CD: 050000）"
  },
  "meta": {
    "timestamp": "2026-02-18T11:19:46.000Z"
  }
}

// 権限レベルが不足している場合（403 Forbidden）
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSION",
    "message": "必要な権限レベルが不足しています（必要: 1, 所有: 0）"
  },
  "meta": {
    "timestamp": "2026-02-18T11:19:46.000Z"
  }
}
```

### 2. checkPermissionPairs() - 柔軟な権限チェック（OR条件）

**用途**: 複数の（機能CD、権限レベル）ペアのいずれかにマッチすればOK

**シグネチャ**:
```typescript
checkPermissionPairs(permissionPairs: PermissionPair[])

// PermissionPair型定義
interface PermissionPair {
  functionId: string;
  permission: number;
}
```

**使用例**:

```typescript
// 実験作業者（書き込み権限）または実験管理者（読み取り専用）のいずれかがあればOK
router.put(
  '/tasks/:taskId/comment',
  authMiddleware,
  tenantIsolation,
  checkPermissionPairs([
    { functionId: '050000', permission: 1 },  // 実験作業者、書き込み権限
    { functionId: '040000', permission: 0 }   // 実験管理者、読み取り専用でもOK
  ]),
  taskController.addComment
);

// データ管理者（書き込み）またはシステム管理者（書き込み）のいずれかが必要
router.delete(
  '/projects/:projectId',
  authMiddleware,
  tenantIsolation,
  checkPermissionPairs([
    { functionId: '030000', permission: 1 },  // データ管理者、書き込み権限
    { functionId: '020000', permission: 1 }   // システム管理者、書き込み権限
  ]),
  projectController.delete
);
```

**特徴**:
- 各ペアに対して異なる権限レベルを指定可能
- いずれか1つのペアにマッチすればアクセス許可
- 柔軟な権限設定が可能

**エラーレスポンス例**:
```json
// 全てのペアにマッチしない場合（403 Forbidden）
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "必要な権限がありません（必要な権限: (機能CD: 050000, 権限レベル: 1) OR (機能CD: 040000, 権限レベル: 0)）"
  },
  "meta": {
    "timestamp": "2026-02-18T11:19:46.000Z"
  }
}
```

### 3. checkAnyPermission() - 複数機能CD（OR条件）

**用途**: 複数の機能CDのいずれかに対して、同じ権限レベルをチェック

**シグネチャ**:
```typescript
checkAnyPermission(functionIds: string[], requiredPermission: number = 1)
```

**使用例**:

```typescript
// 実験管理者または実験作業者のいずれかに書き込み権限があればOK
router.post(
  '/experiments',
  authMiddleware,
  tenantIsolation,
  checkAnyPermission(['040000', '050000'], 1),  // どちらかに書き込み権限が必要
  experimentController.create
);

// データ管理者、実験管理者、実験作業者のいずれかに読み取り権限があればOK
router.get(
  '/reports/:reportId',
  authMiddleware,
  tenantIsolation,
  checkAnyPermission(['030000', '040000', '050000'], 0),  // どれかに読み取り権限
  reportController.show
);
```

**特徴**:
- 複数の機能CDに対して同じ権限レベルをチェック
- 権限レベルを統一したい場合に便利
- `checkPermissionPairs()`の簡易版

**エラーレスポンス例**:
```json
// 全ての機能CDに対して権限がない場合（403 Forbidden）
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "必要な権限がありません（機能CD: 040000, 050000）"
  },
  "meta": {
    "timestamp": "2026-02-18T11:19:46.000Z"
  }
}
```

## 3つの関数の使い分けフローチャート

```
権限チェックが必要
    ↓
特定の機能CDのみチェック？
    ├─ Yes → checkPermission() を使用
    └─ No → 複数の権限パターンが必要
        ↓
    各パターンで異なる権限レベルが必要？
        ├─ Yes → checkPermissionPairs() を使用
        │        （柔軟な権限設定）
        └─ No → checkAnyPermission() を使用
                 （同じ権限レベル）
```

## ミドルウェアチェーンの順序（重要）

権限チェックミドルウェアは、必ず以下の順序で配置してください：

```typescript
router.METHOD(
  '/path',
  authMiddleware,           // 1. 認証（req.userを設定）
  tenantIsolation,          // 2. テナント分離（req.organizationIdを設定）
  checkPermission(...),     // 3. 権限チェック（req.user.permissionsを参照）
  controller.action         // 4. コントローラー
);
```

### なぜこの順序が重要か？

1. **authMiddleware**: 
   - JWTトークンを検証
   - `req.user`に認証情報を設定
   - **権限チェックミドルウェアは`req.user.permissions`を参照するため、authMiddlewareより後に配置必須**

2. **tenantIsolation**:
   - `req.organizationId`を設定
   - マルチテナント分離を保証
   - コントローラーでorganization_idを使用するため必須

3. **checkPermission/checkPermissionPairs/checkAnyPermission**:
   - `req.user.permissions`を参照して権限チェック
   - アクセス拒否時は403エラーを返却

4. **controller**:
   - ビジネスロジックを実行
   - この時点で認証・認可・テナント分離は完了済み

### ❌ 間違った順序の例

```typescript
// ❌ 悪い例: authMiddlewareより前に権限チェック
router.put(
  '/path',
  checkPermission('050000', 1),  // ❌ req.userが存在しないためエラー
  authMiddleware,
  controller.action
);

// ❌ 悪い例: authMiddlewareを省略
router.put(
  '/path',
  tenantIsolation,
  checkPermission('050000', 1),  // ❌ req.userが存在しないためエラー
  controller.action
);
```

## 実装パターン集

### パターン1: 読み取り専用API

```typescript
// データ管理者メニュー、読み取り専用
router.get(
  '/projects',
  authMiddleware,
  tenantIsolation,
  checkPermission('030000', 0),  // 読み取り専用
  projectController.list
);
```

### パターン2: 書き込みAPI

```typescript
// 実験管理者メニュー、書き込み権限
router.post(
  '/experiments',
  authMiddleware,
  tenantIsolation,
  checkPermission('040000', 1),  // 書き込み権限
  experimentController.create
);
```

### パターン3: 複数ロール対応（同じ権限レベル）

```typescript
// 実験管理者または実験作業者のいずれかに読み取り権限があればOK
router.get(
  '/tasks/:taskId',
  authMiddleware,
  tenantIsolation,
  checkAnyPermission(['040000', '050000'], 0),  // どちらかに読み取り権限
  taskController.show
);
```

### パターン4: 複数ロール対応（異なる権限レベル）

```typescript
// 実験作業者（書き込み）または実験管理者（読み取り）のいずれかがあればOK
router.get(
  '/experiments/:experimentId/status',
  authMiddleware,
  tenantIsolation,
  checkPermissionPairs([
    { functionId: '050000', permission: 1 },  // 実験作業者は書き込み権限が必要
    { functionId: '040000', permission: 0 }   // 実験管理者は読み取り専用でOK
  ]),
  experimentController.getStatus
);
```

### パターン5: 管理者専用API

```typescript
// システム管理者のみアクセス可能
router.delete(
  '/users/:userId',
  authMiddleware,
  tenantIsolation,
  checkPermission('020000', 1),  // システム管理者、書き込み権限
  userController.delete
);
```

### パターン6: 複数の管理者ロール対応

```typescript
// システム管理者またはデータ管理者のいずれかに書き込み権限が必要
router.put(
  '/organizations/:organizationId',
  authMiddleware,
  tenantIsolation,
  checkAnyPermission(['020000', '030000'], 1),  // どちらかに書き込み権限
  organizationController.update
);
```

## ベストプラクティス

### DO（推奨）

✅ **必ずauthMiddlewareより後に配置する**
```typescript
router.put('/path', authMiddleware, checkPermission('050000', 1), controller);
```

✅ **適切な権限レベルを指定する**
- 読み取り専用API: `permission: 0`
- 書き込みAPI: `permission: 1`

✅ **複数ロール対応時は適切な関数を選択**
- 同じ権限レベル → `checkAnyPermission()`
- 異なる権限レベル → `checkPermissionPairs()`

✅ **機能CDを正しく指定する**
```typescript
checkPermission('050000', 1)  // ✅ 6桁の文字列
```

✅ **エラーハンドリングはミドルウェアに任せる**
- 権限不足時は403エラーが自動的に返却される
- カスタムエラーハンドリングは不要

### DON'T（非推奨）

❌ **authMiddlewareより前に配置しない**
```typescript
// ❌ 悪い例
router.put('/path', checkPermission('050000', 1), authMiddleware, controller);
```

❌ **authMiddlewareを省略しない**
```typescript
// ❌ 悪い例: req.userが存在しないためエラー
router.put('/path', checkPermission('050000', 1), controller);
```

❌ **権限レベルを間違えない**
```typescript
// ❌ 悪い例: 書き込みAPIなのに読み取り専用
router.put('/path', authMiddleware, checkPermission('050000', 0), controller);
```

❌ **機能CDを数値で指定しない**
```typescript
// ❌ 悪い例: 文字列で指定すること
checkPermission(50000, 1)  // 数値はNG
```

❌ **コントローラー内で権限チェックを重複実装しない**
```typescript
// ❌ 悪い例: ミドルウェアで権限チェック済み
export async function updateTask(req: Request, res: Response) {
  // ❌ この権限チェックは不要（ミドルウェアで実施済み）
  if (!req.user.permissions.find(p => p.functionId === '050000')) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  // ...
}
```

## トラブルシューティング

### 問題1: 401 Unauthorized エラー

**症状**:
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Authentication required"
  }
}
```

**原因**: `req.user`が存在しない（authMiddlewareが実行されていない）

**解決策**:
```typescript
// ✅ authMiddlewareを追加
router.put(
  '/path',
  authMiddleware,  // これが必要
  checkPermission('050000', 1),
  controller
);
```

### 問題2: 403 PERMISSION_DENIED エラー

**症状**:
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "機能へのアクセス権限がありません（機能CD: 050000）"
  }
}
```

**原因**: ユーザーが指定された機能CDの権限を持っていない

**解決策**:
1. ユーザーの権限を確認（JWTトークンの`permissions`配列）
2. 必要に応じて権限を付与（DBの`function_permissions`テーブルを更新）
3. または、複数の機能CDを許可する（`checkAnyPermission()`や`checkPermissionPairs()`を使用）

### 問題3: 403 INSUFFICIENT_PERMISSION エラー

**症状**:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSION",
    "message": "必要な権限レベルが不足しています（必要: 1, 所有: 0）"
  }
}
```

**原因**: ユーザーの権限レベルが不足している（読み取り専用しかないのに書き込みが必要）

**解決策**:
1. ユーザーの権限レベルを確認
2. 書き込み権限を付与（DBの`function_permissions.permission`を1に更新）
3. または、APIの権限要件を見直す（読み取り専用で十分か？）

### 問題4: checkPermissionPairs()で常に403エラー

**症状**: 権限があるはずなのにアクセス拒否される

**原因**: ペアの指定が間違っている可能性

**解決策**:
```typescript
// ✅ 正しい例: PermissionPair[]の配列
checkPermissionPairs([
  { functionId: '050000', permission: 1 },
  { functionId: '040000', permission: 0 }
])

// ❌ 間違った例: オブジェクトの構造が違う
checkPermissionPairs([
  { function_cd: '050000', level: 1 }  // プロパティ名が違う
])
```

## セキュリティ考慮事項

### 1. 最小権限の原則
- 必要最小限の権限のみを要求する
- 読み取り専用で十分なAPIには`permission: 0`を指定

### 2. 防御的プログラミング
- 権限チェックは必須（省略しない）
- 重要なAPIには必ず権限チェックを実装

### 3. 監査ログ
- 権限チェック失敗時のログ記録（ミドルウェアで自動実施）
- 不正アクセス試行の検知

### 4. テナント分離の徹底
- 権限チェックだけでなく、tenantIsolationも必須
- organization_idフィルタでデータを分離

## まとめ

### 基本ワークフロー

```typescript
// 1. 基本的な権限チェック
router.METHOD('/path', authMiddleware, tenantIsolation, checkPermission('050000', 1), controller);

// 2. 複数ロール対応（同じ権限レベル）
router.METHOD('/path', authMiddleware, tenantIsolation, checkAnyPermission(['040000', '050000'], 0), controller);

// 3. 複数ロール対応（異なる権限レベル）
router.METHOD('/path', authMiddleware, tenantIsolation, checkPermissionPairs([
  { functionId: '050000', permission: 1 },
  { functionId: '040000', permission: 0 }
]), controller);
```

### 重要なポイント

1. **必ずauthMiddlewareより後に配置**
2. **適切な関数を選択**（checkPermission vs checkAnyPermission vs checkPermissionPairs）
3. **正しい機能CDと権限レベルを指定**
4. **エラーハンドリングはミドルウェアに任せる**
5. **セキュリティと最小権限の原則を守る**

---

**関連ドキュメント**:
- [backend.md](backend.md) - バックエンド実装全般
- [api.md](api.md) - API設計とレスポンス形式
- `.clinerules/development/security.md` - セキュリティ規約

# タスク計画書: マスタ管理のCreator、Vendor、Instrumentステータス切替修正

## メタデータ
- **作成日時**: 2026-01-27 11:01
- **タスクID**: master_status_toggle_fix
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

マスタ管理画面のCreator、Vendor、Instrumentのアクティブ/非アクティブ切替機能を、部署管理画面と同様に修正します。

## 2. 目的と期待される成果

### 目的
- Creator、Vendor、Instrumentのステータス切替ボタンが正常に動作するようにする
- 一括アクティブ/非アクティブ化機能も正常に動作するようにする
- 部署管理と同じ認証方式を統一的に適用する

### 期待される成果
- [ ] 問題の原因特定
- [ ] バックエンドルーティング修正（Creator）
- [ ] バックエンドルーティング修正（Vendor）
- [ ] バックエンドルーティング修正（Instrument）
- [ ] 動作確認（個別切替）
- [ ] 動作確認（一括切替）

## 3. 問題の原因

### 根本原因
**`backend/src/routes/masterRoutes.ts`**の以下のエンドポイントで`authMiddleware`がコメントアウトされている：

#### Instrumentマスタ
```typescript
// POST /api/v1/master/instrument
router.post(
  '/instrument',
  // authMiddleware, // TODO: 一時的に無効化（テスト用）  ← これが問題
  [validateOrganizationHeader, ...],
  masterController.createInstrument
);

// PUT /api/v1/master/instrument/:instrumentId
router.put(
  '/instrument/:instrumentId',
  // authMiddleware, // TODO: 一時的に無効化（テスト用）  ← これが問題
  [...],
  masterController.updateInstrument
);

// PATCH /api/v1/master/instrument/:instrumentId/status
router.patch(
  '/instrument/:instrumentId/status',
  // authMiddleware, // TODO: 一時的に無効化（テスト用）  ← これが問題
  [...],
  masterController.updateInstrumentStatus
);
```

#### Vendorマスタ
```typescript
// POST /api/v1/master/vendor
router.post(
  '/vendor',
  // authMiddleware, // TODO: 一時的に無効化（テスト用）  ← これが問題
  [validateOrganizationHeader, ...],
  masterController.createVendor
);

// PUT /api/v1/master/vendor/:vendorId
router.put(
  '/vendor/:vendorId',
  // authMiddleware, // TODO: 一時的に無効化（テスト用）  ← これが問題
  [...],
  masterController.updateVendor
);

// PATCH /api/v1/master/vendor/:vendorId/status
router.patch(
  '/vendor/:vendorId/status',
  // authMiddleware, // TODO: 一時的に無効化（テスト用）  ← これが問題
  [...],
  masterController.updateVendorStatus
);
```

#### Creatorマスタ
```typescript
// POST /api/v1/master/creator
router.post(
  '/creator',
  // authMiddleware, // TODO: 一時的に無効化（テスト用）  ← これが問題
  [validateOrganizationHeader, ...],
  masterController.createCreator
);

// PUT /api/v1/master/creator/:creatorId
router.put(
  '/creator/:creatorId',
  // authMiddleware, // TODO: 一時的に無効化（テスト用）  ← これが問題
  [...],
  masterController.updateCreator
);

// PATCH /api/v1/master/creator/:creatorId/status
router.patch(
  '/creator/:creatorId/status',
  // authMiddleware, // TODO: 一時的に無効化（テスト用）  ← これが問題
  [...],
  masterController.updateCreatorStatus
);
```

### 影響範囲
1. **個別のステータス切替**
   - `authMiddleware`がないため`req.user`が未定義
   - コントローラーで`req.user?.organizationId`が取得できない
   - `MISSING_ORGANIZATION_ID`エラーが発生

2. **一括ステータス更新**
   - 内部的に個別ステータス更新APIを呼び出すため、同様にエラー

3. **新規作成・更新機能**
   - 同様の理由で動作しない可能性

## 4. 実装ステップ

### Phase 1: Instrumentマスタの修正
- [ ] POST /api/v1/master/instrumentのauthMiddleware有効化
- [ ] PUT /api/v1/master/instrument/:instrumentIdのauthMiddleware有効化
- [ ] PATCH /api/v1/master/instrument/:instrumentId/statusのauthMiddleware有効化
- [ ] validateOrganizationHeaderを削除

### Phase 2: Vendorマスタの修正
- [ ] POST /api/v1/master/vendorのauthMiddleware有効化
- [ ] PUT /api/v1/master/vendor/:vendorIdのauthMiddleware有効化
- [ ] PATCH /api/v1/master/vendor/:vendorId/statusのauthMiddleware有効化
- [ ] validateOrganizationHeaderを削除

### Phase 3: Creatorマスタの修正
- [ ] POST /api/v1/master/creatorのauthMiddleware有効化
- [ ] PUT /api/v1/master/creator/:creatorIdのauthMiddleware有効化
- [ ] PATCH /api/v1/master/creator/:creatorId/statusのauthMiddleware有効化
- [ ] validateOrganizationHeaderを削除

## 5. 修正内容

### backend/src/routes/masterRoutes.ts

#### 修正方針
部署管理と同様に、以下の変更を適用：
1. `authMiddleware`のコメントアウトを解除
2. `validateOrganizationHeader`を削除（`authMiddleware`が`req.user.organizationId`を設定するため不要）

#### 修正箇所1: Instrument新規作成
```typescript
// 修正前
router.post(
  '/instrument',
  // authMiddleware, // TODO: 一時的に無効化（テスト用）
  [
    validateOrganizationHeader,
  ],
  masterController.createInstrument
);

// 修正後
router.post(
  '/instrument',
  authMiddleware, // 認証ミドルウェア有効化
  masterController.createInstrument
);
```

#### 修正箇所2: Instrument更新
```typescript
// 修正前
router.put(
  '/instrument/:instrumentId',
  // authMiddleware, // TODO: 一時的に無効化（テスト用）
  [
    validateOrganizationHeader,
    param('instrumentId')
      .notEmpty()
      .withMessage('instrumentId is required')
      .isString()
      .withMessage('instrumentId must be a string'),
  ],
  masterController.updateInstrument
);

// 修正後
router.put(
  '/instrument/:instrumentId',
  authMiddleware, // 認証ミドルウェア有効化
  [
    param('instrumentId')
      .notEmpty()
      .withMessage('instrumentId is required')
      .isString()
      .withMessage('instrumentId must be a string'),
  ],
  masterController.updateInstrument
);
```

#### 修正箇所3: Instrumentステータス更新
```typescript
// 修正前
router.patch(
  '/instrument/:instrumentId/status',
  // authMiddleware, // TODO: 一時的に無効化（テスト用）
  [
    validateOrganizationHeader,
    param('instrumentId')
      .notEmpty()
      .withMessage('instrumentId is required')
      .isString()
      .withMessage('instrumentId must be a string'),
  ],
  masterController.updateInstrumentStatus
);

// 修正後
router.patch(
  '/instrument/:instrumentId/status',
  authMiddleware, // 認証ミドルウェア有効化
  [
    param('instrumentId')
      .notEmpty()
      .withMessage('instrumentId is required')
      .isString()
      .withMessage('instrumentId must be a string'),
  ],
  masterController.updateInstrumentStatus
);
```

#### 修正箇所4-6: Vendor（同様の修正）
POST /api/v1/master/vendor
PUT /api/v1/master/vendor/:vendorId
PATCH /api/v1/master/vendor/:vendorId/status

#### 修正箇所7-9: Creator（同様の修正）
POST /api/v1/master/creator
PUT /api/v1/master/creator/:creatorId
PATCH /api/v1/master/creator/:creatorId/status

## 6. テスト計画

### 単体テスト
- [ ] Instrumentのステータス更新API呼び出し（個別）
- [ ] Vendorのステータス更新API呼び出し（個別）
- [ ] Creatorのステータス更新API呼び出し（個別）
- [ ] 各マスタの一括ステータス更新API呼び出し
- [ ] 認証エラーのハンドリング

### 統合テスト
- [ ] マスタ管理画面でInstrumentを選択してステータス切替
- [ ] マスタ管理画面でVendorを選択してステータス切替
- [ ] マスタ管理画面でCreatorを選択してステータス切替
- [ ] 複数選択して一括アクティブ化/非アクティブ化
- [ ] リロード後もステータスが保持されているか確認

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 認証トークンがない場合にエラー | 中 | 低 | authMiddlewareがエラーハンドリング |
| Corporationマスタでも同様の問題 | 中 | 中 | 必要に応じて別途修正 |

## 8. ロールバック計画

問題が発生した場合：
1. `authMiddleware`を再度コメントアウト
2. ただし、これでは根本解決にならないため、すぐに再修正

## 9. 関連ドキュメント

- [部署管理の修正計画書](20260127_1001_部署管理_アクティブ切替修正_PLAN.md)
- [backend/src/routes/masterRoutes.ts](../backend/src/routes/masterRoutes.ts)
- [backend/src/controllers/masterController.ts](../backend/src/controllers/masterController.ts)
- [backend/src/middleware/authMiddleware.ts](../backend/src/middleware/authMiddleware.ts)

## 10. 承認記録

- **計画書提示日時**: 2026-01-27 11:01
- **承認日時**: 2026-01-27 11:04
- **承認者コメント**: 承認します。実装を開始してください

## 11. 実施記録

### 実施日時
開始: 2026-01-27 11:04
完了: 2026-01-27 11:05

### 計画からの変更点
- なし（計画通りに実施完了）

### 発生した問題と解決方法
- 問題なくスムーズに修正完了

### 最終的な成果物
- [x] 修正されたmasterRoutes.ts（Instrument、Vendor、Creator）
- [ ] 動作確認完了（ユーザーによる確認待ち）

### 修正内容の詳細

#### Phase 1: Instrumentマスタの修正（3箇所）
1. ✅ POST /api/v1/master/instrument - authMiddleware有効化、validateOrganizationHeader削除
2. ✅ PUT /api/v1/master/instrument/:instrumentId - authMiddleware有効化、validateOrganizationHeader削除
3. ✅ PATCH /api/v1/master/instrument/:instrumentId/status - authMiddleware有効化、validateOrganizationHeader削除

#### Phase 2: Vendorマスタの修正（3箇所）
4. ✅ POST /api/v1/master/vendor - authMiddleware有効化、validateOrganizationHeader削除
5. ✅ PUT /api/v1/master/vendor/:vendorId - authMiddleware有効化、validateOrganizationHeader削除
6. ✅ PATCH /api/v1/master/vendor/:vendorId/status - authMiddleware有効化、validateOrganizationHeader削除

#### Phase 3: Creatorマスタの修正（3箇所）
7. ✅ POST /api/v1/master/creator - authMiddleware有効化、validateOrganizationHeader削除
8. ✅ PUT /api/v1/master/creator/:creatorId - authMiddleware有効化、validateOrganizationHeader削除
9. ✅ PATCH /api/v1/master/creator/:creatorId/status - authMiddleware有効化、validateOrganizationHeader削除

### 修正内容のサマリー
- **修正ファイル**: backend/src/routes/masterRoutes.ts
- **修正箇所**: 9箇所のエンドポイント
- **修正内容**: 
  - `authMiddleware`のコメントアウトを解除（認証機能有効化）
  - `validateOrganizationHeader`を削除（authMiddlewareがorganizationIdを自動設定するため不要）

## 12. 追加タスク: フロントエンド側のボタン制御修正

### 現状の問題
バックエンドの`authMiddleware`有効化により、フロントエンド側で以下の修正が必要：

1. **`handleModalOk`の`fetch`呼び出しに`credentials: 'include'`を追加**
   - 現在：`fetch`に`credentials`オプションなし
   - 必要：Cookie（セッショントークン）を送信するため`credentials: 'include'`を追加

2. **一括アクティブ/非アクティブボタンの配色制御**
   - 現在：選択されたら色が変わるが、部署管理と同じパターンに統一すべき

### 修正内容

#### 修正1: handleModalOkのfetch呼び出しに`credentials: 'include'`を追加

**対象マスタ**: Instrument、Vendor、Creator

```typescript
// 修正前（例：Instrumentマスタの編集）
const response = await fetch(
  `${apiUrl}/api/v1/master/instrument/${editingMaster.instrumentId}`,
  {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Organization-Id': organizationId,
    },
    body: JSON.stringify({...}),
  }
);

// 修正後
const response = await fetch(
  `${apiUrl}/api/v1/master/instrument/${editingMaster.instrumentId}`,
  {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Organization-Id': organizationId,
    },
    credentials: 'include', // ← 追加
    body: JSON.stringify({...}),
  }
);
```

同様の修正を以下の箇所に適用：
- Instrument: POST（新規作成）、PUT（編集）
- Vendor: POST（新規作成）、PUT（編集）
- Creator: POST（新規作成）、PUT（編集）

**合計6箇所の修正が必要**

## 13. 振り返り

### うまくいった点
- 部署管理で発見した問題を他のマスタにも水平展開できた
- 9箇所すべてのバックエンド修正を一度に完了できた
- 問題なくスムーズに修正完了

### 改善が必要な点
- テスト用にコメントアウトしたコードは、必ず有効化すること
- 認証が必要なエンドポイントでは必ず`authMiddleware`を適用すること
- フロントエンド側で`fetch`を使用する場合は必ず`credentials: 'include'`を設定

### 学んだこと
- 認証ミドルウェアの一貫した適用の重要性を再認識
- `authMiddleware`が`req.user.organizationId`を自動設定するため、`validateOrganizationHeader`は不要
- 部署管理での修正パターンを他のマスタに適用することで、統一的な認証方式を実現
- `authMiddleware`有効化後は、フロントエンド側でも`credentials: 'include'`が必須

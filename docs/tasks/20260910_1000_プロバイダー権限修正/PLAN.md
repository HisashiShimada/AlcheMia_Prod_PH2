# タスク計画書: プロバイダー権限修正

## メタデータ

- **作成日時**: 2026-09-10 10:00
- **タスクID**: 20260910_1000_プロバイダー権限修正
- **優先度**: 高
- **推定工数**: 2〜3時間

---

## 1. タスク概要

ユーザー管理・ロール管理画面において、システム管理者がプロバイダー権限（`function_cd: 010000`）をロールに設定できてしまう問題を修正する。

プロバイダーはシステム全体を構築・管理する特別な位置づけであり、一般組織のシステム管理者がプロバイダー権限を付与できる構造は設計上誤りである。

また、ユーザー管理・ロール管理の各APIに権限チェックミドルウェアが未設定であるため、本来システム管理者（`020000`）のみが操作すべきエンドポイントが無防備な状態になっている。

---

## 2. 問題の詳細

### 2-1. フロントエンド：FunctionPermissionDialog に `010000` が選択肢として存在

**ファイル**: `frontend/src/components/SystemManagement/FunctionPermissionDialog.tsx`

`baseFunctions` 配列にプロバイダーメニュー（`010000`）が含まれており、システム管理者がロールの機能権限として `010000` を付与できてしまう。

```typescript
// 現状（問題あり）
const baseFunctions: FunctionItem[] = [
  { key: '010000', label: t('...'), dbValue: 'プロバイダーメニュー', ... }, // ← 削除対象
  { key: '020000', ... },
  { key: '030000', ... },
  { key: '040000', ... },
  { key: '050000', ... },
];
```

### 2-2. バックエンド：userRoutes / roleRoutes に権限チェックが未設定

**ファイル**:
- `backend/src/routes/userRoutes.ts`
- `backend/src/routes/roleRoutes.ts`

現状 `authMiddleware` のみが適用されており、`tenantIsolation` および `checkPermission('020000', ...)` が一切設定されていない。
これにより、JWT認証さえ通れば任意のロールのユーザーがユーザー管理・ロール管理APIを呼び出せてしまう。

```typescript
// 現状（問題あり）：authMiddlewareのみ
router.post('/user', authMiddleware, [...validation], userController.createUser);

// 修正後
router.post(
  '/user',
  authMiddleware,
  tenantIsolation,
  checkPermission('020000', 1),
  [...validation],
  userController.createUser
);
```

### 2-3. バックエンド：roleService に `010000` 設定禁止ガードが未実装

**ファイル**: `backend/src/services/roleService.ts`

フロントエンド側の制御だけでは不十分であり、バックエンド側でも `function_cd: 010000` の設定を拒否するガードが必要。
`updateRolePermissions` および `uploadRolesCsv` の両関数に対してバリデーションを追加する。

---

## 3. 目的と期待される成果

- [ ] システム管理者がロールにプロバイダーメニュー（`010000`）を付与できなくなる（フロントエンド）
- [ ] バックエンドAPIとして `010000` を含む権限設定リクエストが拒否される（バックエンド）
- [ ] ユーザー管理・ロール管理の全APIがシステム管理者権限（`020000`）なしでは呼び出せなくなる（バックエンド）

---

## 4. 実装ステップ

### Step 1: フロントエンド修正

- [ ] **1-1**: `FunctionPermissionDialog.tsx` の `baseFunctions` 配列から `010000` のエントリを削除

### Step 2: バックエンド — roleRoutes に権限チェック追加

対象エンドポイントと適用する権限レベル：

| エンドポイント | メソッド | 権限 |
|--------------|---------|------|
| `/role` | GET | `checkPermission('020000', 0)` 読取専用 |
| `/role/download-csv` | GET | `checkPermission('020000', 0)` 読取専用 |
| `/role/:roleId` | GET | `checkPermission('020000', 0)` 読取専用 |
| `/role` | POST | `checkPermission('020000', 1)` 書込可 |
| `/role/upload-csv` | POST | `checkPermission('020000', 1)` 書込可 |
| `/role/:roleId` | PUT | `checkPermission('020000', 1)` 書込可 |
| `/role/:roleId/permissions` | PUT | `checkPermission('020000', 1)` 書込可 |
| `/role/:roleId/status` | PATCH | `checkPermission('020000', 1)` 書込可 |

- [ ] **2-1**: `roleRoutes.ts` に `tenantIsolation` と `checkPermission` のインポートを追加
- [ ] **2-2**: 全エンドポイントに上表のミドルウェアを追加

### Step 3: バックエンド — userRoutes に権限チェック追加

対象エンドポイントと適用する権限レベル：

| エンドポイント | メソッド | 権限 |
|--------------|---------|------|
| `/user` | GET | `checkPermission('020000', 0)` 読取専用 |
| `/user/download-csv` | GET | `checkPermission('020000', 0)` 読取専用 |
| `/user/:userId` | GET | `checkPermission('020000', 0)` 読取専用 |
| `/user/upload-csv` | POST | `checkPermission('020000', 1)` 書込可 |
| `/user` | POST | `checkPermission('020000', 1)` 書込可 |
| `/user/:userId` | PUT | `checkPermission('020000', 1)` 書込可 |
| `/user/:userId/status` | PATCH | `checkPermission('020000', 1)` 書込可 |
| `/user/batch-status` | PATCH | `checkPermission('020000', 1)` 書込可 |

- [ ] **3-1**: `userRoutes.ts` に `tenantIsolation` と `checkPermission` のインポートを追加
- [ ] **3-2**: 全エンドポイントに上表のミドルウェアを追加

### Step 4: バックエンド — roleService に `010000` 設定禁止ガード追加

- [ ] **4-1**: `roleService.ts` の `updateRolePermissions` 関数に `010000` を含む場合のバリデーションを追加
- [ ] **4-2**: `roleService.ts` の `uploadRolesCsv` 関数に `010000` を含む場合のバリデーションを追加

---

## 5. 変更ファイル一覧

| # | ファイル | 変更種別 | 内容 |
|---|---------|---------|------|
| 1 | `frontend/src/components/SystemManagement/FunctionPermissionDialog.tsx` | 修正 | `baseFunctions` から `010000` エントリを削除 |
| 2 | `backend/src/routes/roleRoutes.ts` | 修正 | `tenantIsolation` + `checkPermission('020000', ...)` を全エンドポイントに追加 |
| 3 | `backend/src/routes/userRoutes.ts` | 修正 | `tenantIsolation` + `checkPermission('020000', ...)` を全エンドポイントに追加 |
| 4 | `backend/src/services/roleService.ts` | 修正 | `updateRolePermissions` / `uploadRolesCsv` で `function_cd: 010000` 指定時にエラー返却 |

---

## 6. 影響範囲の分析

### バックエンド

- **ユーザー管理API**: `checkPermission('020000')` 追加により、システム管理者権限（`020000`）を持つロールのみアクセス可能になる
- **ロール管理API**: 同上
- **roleService**: `010000` を含む権限設定リクエストが `400 Bad Request` で拒否されるようになる

### フロントエンド

- **FunctionPermissionDialog**: プロバイダーメニューの選択肢が表示されなくなる
- 既存のロールデータには影響なし（既に `010000` が設定されているロールの表示は変わらない。削除・更新時のみ設定不可）

### テストへの影響

- ユーザー管理・ロール管理APIを呼び出す結合テスト・E2Eテストは、システム管理者権限（`020000` 付き）のJWTトークンを使用する必要がある

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `userRoutes.ts` / `roleRoutes.ts` の特定エンドポイントへの `checkPermission` 追加漏れ | 高 | 低 | 実装後に全エンドポイントのミドルウェアチェーンを目視確認 |
| テスト環境で既存テストが `403` エラーで失敗するようになる | 中 | 中 | テストで使用するJWTトークンのロールを確認・修正 |
| 既存ロールに `010000` が設定されていても表示崩れは起きないが、更新時に除去できなくなる可能性 | 低 | 低 | バックエンドガードは「新規設定の拒否」のみ。既存データの変更は別タスク（データ修正作業）で対応 |

---

## 8. テスト計画

### 手動テスト

- [ ] システム管理者でログインし、ロール管理画面を開く → FunctionPermissionDialog に `プロバイダーメニュー` が表示されないことを確認
- [ ] システム管理者でロール一覧取得API（`GET /api/v1/master/role`）を呼び出す → 正常に取得できることを確認
- [ ] システム管理者権限なしのユーザーでロール一覧取得API（`GET /api/v1/master/role`）を呼び出す → `403` エラーが返ることを確認
- [ ] システム管理者権限なしのユーザーでユーザー作成API（`POST /api/v1/systemManagement/user`）を呼び出す → `403` エラーが返ることを確認
- [ ] `function_cd: 010000` を含む権限更新リクエストを直接APIに送信する → `400 Bad Request` が返ることを確認

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-10 10:00
- **承認日時**: 2026-09-10（承認済み）
- **承認者コメント**: 承認します。まずはルールに従ってソース修正を実行してください

---

## 10. 実施記録

### 実施日時

開始: 2026-09-10  
完了: 2026-09-10

### 計画からの変更点

- `batch-status` エンドポイントは `userRoutes.ts` に存在しなかったため対象外

### 発生した問題と解決方法

なし

### 最終的な成果物

- [x] `FunctionPermissionDialog.tsx` 修正完了 — `baseFunctions` から `010000` エントリを削除
- [x] `roleRoutes.ts` 権限チェック追加完了 — 全8エンドポイントに `tenantIsolation` + `checkPermission('020000', ...)` を追加
- [x] `userRoutes.ts` 権限チェック追加完了 — 全7エンドポイントに `tenantIsolation` + `checkPermission('020000', ...)` を追加
- [x] `roleService.ts` `010000` ガード追加完了 — `updateRolePermissions` / `uploadRolesCsv` の両関数に禁止ガードを追加
- [x] `roleController.ts` `getLang` 対応追加 — `updateRolePermissions` に `lang` を渡すよう修正
- [x] `messages.ts` 多言語メッセージ追加 — `role.providerFunctionNotAllowed`（ja/en/型定義）を追加
- [x] TypeScript コンパイル確認 — バックエンド・フロントエンドともに EXIT:0（エラーなし）

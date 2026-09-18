# タスク計画書: CDバリデーション追加とプレースホルダー更新

## メタデータ
- **作成日時**: 2026-09-18 10:00
- **タスクID**: 20260918_1000
- **優先度**: 中
- **推定工数**: 1時間

---

## タスク概要

組織CD・組織グループCD・ロールCDの新規作成処理において、入力フォーマットのバリデーションが不足しているため追加する。
また、各CD入力フィールドのプレースホルダーに入力形式の説明を追記する。

### 対象CDとルール

| CD | 許可文字 | 最大文字数 |
|----|---------|-----------|
| 組織CD | 半角英数・記号（`-` `_`） | 50文字 |
| 組織グループCD | 半角英数・記号（`-` `_`） | 50文字 |
| ロールCD | 半角英数・記号（`-` `_`） | 30文字 |

---

## 目的と期待される成果

- [ ] バックエンドの新規作成API（POST）の各CDフィールドに文字種・文字数バリデーションを追加
- [ ] フロントエンドの各CD入力フィールドのプレースホルダーに入力形式の説明を追記

---

## 実装ステップ

### Phase 1: バックエンド — バリデーション追加

#### 1-1. organizationRoutes.ts — POST `/organization` の `organizationCd` バリデーション追加
- ファイル: `backend/src/routes/organizationRoutes.ts`
- 対象: `router.post('/organization', ...)` の `body('organizationCd')` チェーン
- 追加内容:
  - `.matches(/^[A-Za-z0-9\-_]+$/)` — 半角英数・ハイフン・アンダースコアのみ
  - `.isLength({ max: 50 })` — 50文字以内

#### 1-2. organizationGroupValidation.ts — `validateCreateOrganizationGroup` の `organization_group_cd` バリデーション追加
- ファイル: `backend/src/middleware/organizationGroupValidation.ts`
- 対象: `validateCreateOrganizationGroup` の `body('organization_group_cd')` チェーン
- 追加内容:
  - `.matches(/^[A-Za-z0-9\-_]+$/)` — 半角英数・ハイフン・アンダースコアのみ
  - `.isLength({ max: 50 })` — 50文字以内

#### 1-3. roleRoutes.ts — POST `/role` の `role`（ロールCD）バリデーション追加
- ファイル: `backend/src/routes/roleRoutes.ts`
- 対象: `router.post('/role', ...)` の `body('role')` チェーン
- 追加内容:
  - `.matches(/^[A-Za-z0-9\-_]+$/)` — 半角英数・ハイフン・アンダースコアのみ
  - `.isLength({ max: 30 })` — 30文字以内

### Phase 2: フロントエンド — プレースホルダー更新

#### 2-1. OrganizationManagement.tsx — 組織CD Input に placeholder 追加
- ファイル: `frontend/src/components/Provider/OrganizationManagement.tsx`
- 対象: 新規追加フォームの `<Input />` (`name="organizationCd"`)
- 変更: `<Input />` → `<Input placeholder={t('organizationManagement.form.organizationCdPlaceholder')} />`

#### 2-2. GroupAddDialog.tsx — グループCD Input の placeholder 更新
- ファイル: `frontend/src/components/group/GroupAddDialog.tsx`
- 対象: `groupCdPlaceholder` を使用している Input
- プレースホルダーキーは既存の `groupAddDialog.groupCdPlaceholder` を使用（値を更新）

#### 2-3. RoleManagement.tsx — ロールCD Input の placeholder 更新
- ファイル: `frontend/src/components/SystemManagement/RoleManagement.tsx`
- 対象: `roleCdPlaceholder` を使用している Input
- プレースホルダーキーは既存の `roleManagement.form.roleCdPlaceholder` を使用（値を更新）

### Phase 3: i18n — 翻訳キー追加・更新

#### 3-1. ja.json — 組織CD プレースホルダーキー追加 & 既存キー値更新
- ファイル: `frontend/src/locales/ja.json`
- 追加: `organizationManagement.form.organizationCdPlaceholder` → `"組織CD(半角英数・記号(-_)、50文字以内)を入力してください"`
- 更新: `groupAddDialog.groupCdPlaceholder` → `"グループCD(半角英数・記号(-_)、50文字以内)を入力してください"`
- 更新: `roleManagement.form.roleCdPlaceholder` → `"ロールCD(半角英数・記号(-_)、30文字以内)を入力してください"`

#### 3-2. en.json — 組織CD プレースホルダーキー追加 & 既存キー値更新
- ファイル: `frontend/src/locales/en.json`
- 追加: `organizationManagement.form.organizationCdPlaceholder` → `"Enter Organization CD (alphanumeric and - _, max 50 chars)"`
- 更新: `groupAddDialog.groupCdPlaceholder` → `"Enter Group CD (alphanumeric and - _, max 50 chars)"`
- 更新: `roleManagement.form.roleCdPlaceholder` → `"Enter Role CD (alphanumeric and - _, max 30 chars)"`

---

## 変更ファイル一覧

| No | ファイル | 変更種別 | 変更内容 |
|----|---------|---------|---------|
| 1 | `backend/src/routes/organizationRoutes.ts` | 修正 | POST `/organization` の `organizationCd` にフォーマット・文字数バリデーション追加 |
| 2 | `backend/src/middleware/organizationGroupValidation.ts` | 修正 | `validateCreateOrganizationGroup` の `organization_group_cd` にフォーマット・文字数バリデーション追加 |
| 3 | `backend/src/routes/roleRoutes.ts` | 修正 | POST `/role` の `role` にフォーマット・文字数バリデーション追加 |
| 4 | `frontend/src/components/Provider/OrganizationManagement.tsx` | 修正 | 組織CD Input に `placeholder` 追加 |
| 5 | `frontend/src/components/group/GroupAddDialog.tsx` | 変更なし（翻訳値更新のみで対応済み） | - |
| 6 | `frontend/src/components/SystemManagement/RoleManagement.tsx` | 変更なし（翻訳値更新のみで対応済み） | - |
| 7 | `frontend/src/locales/ja.json` | 修正 | organizationCdPlaceholder 追加、groupCdPlaceholder・roleCdPlaceholder の値を更新 |
| 8 | `frontend/src/locales/en.json` | 修正 | organizationCdPlaceholder 追加、groupCdPlaceholder・roleCdPlaceholder の値を更新 |

---

## 影響範囲

### バックエンド
- 組織新規作成 API (`POST /api/v1/provider/organization`)：既存テストが存在する場合は正規パターンのCDを使用しているかを確認
- 組織グループ新規作成 API (`POST /api/v1/organization-groups`)：同上
- ロール新規作成 API (`POST /api/v1/systemManagement/role`)：同上

### フロントエンド
- `OrganizationManagement.tsx` の組織追加フォーム
- `GroupAddDialog.tsx` のグループ追加ダイアログ
- `RoleManagement.tsx` のロール追加ダイアログ

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存テストで使用しているCDが正規表現に引っかかる | 低 | 低 | テスト実行して確認 |
| 既存データ（DB）に非準拠CDが存在していた場合、更新操作に影響はない（新規作成のみに適用） | 低 | 低 | バリデーションは新規作成 POST のみ対象のため既存データへの影響なし |

---

## テスト計画

- [ ] バックエンド: `POST /organization` に非準拠CD（例: `abc!@#`）を送ってバリデーションエラーが返ることを確認
- [ ] バックエンド: `POST /organization` に51文字のCDを送ってバリデーションエラーが返ることを確認
- [ ] バックエンド: `POST /organization-groups` に非準拠CD・51文字CDでエラーが返ることを確認
- [ ] バックエンド: `POST /role` に非準拠CD・31文字CDでエラーが返ることを確認
- [ ] フロントエンド: 組織追加フォームのCDフィールドに入力形式が表示されることを確認
- [ ] フロントエンド: グループ追加ダイアログのCDフィールドに入力形式が表示されることを確認
- [ ] フロントエンド: ロール追加ダイアログのCDフィールドに入力形式が表示されることを確認

---

## 承認記録

- **計画書提示日時**: 2026-09-18 10:00
- **承認日時**: 2026-09-18 10:00
- **承認者コメント**: 承認します。

## 実施記録

### 実施日時
開始: 2026-09-18 10:00
完了: 2026-09-18 10:00

### 最終的な成果物
- [x] `backend/src/routes/organizationRoutes.ts` — `organizationCd` に `.matches()` + `.isLength()` 追加
- [x] `backend/src/middleware/organizationGroupValidation.ts` — `organization_group_cd` に `.matches()` + `.isLength()` 追加
- [x] `backend/src/routes/roleRoutes.ts` — `role` に `.matches()` + `.isLength()` 追加
- [x] `frontend/src/components/Provider/OrganizationManagement.tsx` — 組織CD Input に `placeholder` 追加
- [x] `frontend/src/locales/ja.json` — `organizationCdPlaceholder` 追加、`groupCdPlaceholder`・`roleCdPlaceholder` 値更新
- [x] `frontend/src/locales/en.json` — 同上（英語版）
- [x] TypeScript ビルドエラーなし確認済み

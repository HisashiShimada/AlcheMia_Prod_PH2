# タスク計画書: i18n プレースホルダー置換修正

## メタデータ
- **作成日時**: 2026-09-04
- **優先度**: 高
- **推定工数**: 2時間

---

## タスク概要

フロントエンド全体で、翻訳関数 `t()` の後に `.replace()` でプレースホルダーを手動置換しているコードを、
`t(key, params)` の形式（params 引数）に統一する。

特に `{{変数名}}` 形式で `.replace()` している箇所は、JSONのプレースホルダーが `{変数名}` であるため
**置換が一切機能していない**（実際に文字列が壊れている）バグを修正する。

---

## 問題の詳細

### 根本原因

| 項目 | 内容 |
|------|------|
| JSON のプレースホルダー形式 | `{変数名}`（シングル中括弧） |
| `t()` の params 機能 | `{変数名}` を検索して置換する |
| `{{}}` を使った replace | JSON に `{{name}}` は存在しないため **置換されず壊れる** |
| `{}` を使った replace | JSON と一致するため動作はするが冗長・非推奨 |

### 修正方針

```ts
// ❌ Before（{{}} → 置換失敗・バグ）
t('projectManagement.rename.success').replace('{{name}}', value)

// ❌ Before（{} → 動くが非推奨）
t('project.checkinSuccess').replace('{name}', value)

// ✅ After（t() の params 引数を使う）
t('projectManagement.rename.success', { name: value })
```

---

## 修正対象ファイル一覧

### 【優先度：高】`{{}}` を使っており置換が完全に壊れているファイル（30箇所）

| # | ファイル | 行 | 置換対象プレースホルダー |
|---|----------|----|--------------------------|
| 1 | `src/hooks/project/useProjectActions.tsx` | 147 | `{{name}}` |
| 2 | `src/hooks/project/useProjectActions.tsx` | 160 | `{{name}}`, `{{count}}` |
| 3 | `src/utils/templateToXML.ts` | 344, 581 | `{{tag}}` |
| 4 | `src/utils/templateToXML.ts` | 602 | `{{index}}` |
| 5 | `src/utils/templateToXML.ts` | 615 | `{{index}}` |
| 6 | `src/components/editorv2/DraftManager.tsx` | 165 | `{{objects}}` |
| 7 | `src/components/editorv2/DraftManager.tsx` | 230 | `{{name}}` |
| 8 | `src/components/editorv2/DraftManager.tsx` | 360 | `{{key}}` |
| 9 | `src/components/editorv2/DraftManager.tsx` | 396 | `{{count}}` |
| 10 | `src/components/editorv2/DraftManager.tsx` | 409, 446 | `{{count}}` |
| 11 | `src/components/editorv2/DraftManager.tsx` | 412, 447 | `{{count}}` |
| 12 | `src/components/editorv2/DraftManager.tsx` | 432 | `{{count}}` |
| 13 | `src/components/editorv2/DraftManager.tsx` | 448 | `{{count}}` |
| 14 | `src/components/editorv2/DraftManager.tsx` | 471 | `{{name}}` |
| 15 | `src/components/format/FormatManagement.tsx` | 478 | `{{fileName}}` |
| 16 | `src/components/format/FormatManagement.tsx` | 494 | `{{fileName}}` |
| 17 | `src/components/format/FormatManagement.tsx` | 505 | `{{fileName}}` |
| 18 | `src/components/format/FormatManagement.tsx` | 551 | `{{folderName}}` |
| 19 | `src/components/format/FormatManagement.tsx` | 562 | `{{folderName}}` |
| 20 | `src/components/project/MaimlUnpublishDialog.tsx` | 104 | `{{projectName}}` |
| 21 | `src/components/project/MaimlPublishDialog.tsx` | 104 | `{{projectName}}` |
| 22 | `src/components/project/RenameProjectModal.tsx` | 50 | `{{name}}` |
| 23 | `src/components/project/FileListTable.tsx` | 130–131 | `{{oldName}}`, `{{newName}}` |
| 24 | `src/components/project/FileListTable.tsx` | 169 | `{{fileName}}` |
| 25 | `src/components/project/FileListTable.tsx` | 175 | `{{error}}` |
| 26 | `src/components/viewer/PetriNetViewer.tsx` | 651 | `{{count}}` (×2) |

### 【優先度：中】`{}` を使っており動作はするが非推奨のファイル（81箇所）

| ファイル |
|----------|
| `src/hooks/project/useProjectFiles.tsx` |
| `src/hooks/project/useProjectActions.tsx` |
| `src/utils/formatUtils.ts` |
| `src/components/menus/ExperimentWorkerMenu.tsx` |
| `src/components/editorv2/PetriNetEditorInner.tsx` |
| `src/components/Provider/CorporationManagement.tsx` |
| `src/components/Provider/InformationDownload.tsx` |
| `src/components/Provider/OrganizationManagement.tsx` |
| `src/components/SystemManagement/SessionManagement.tsx` |
| `src/components/SystemManagement/UserManagement.tsx` |
| `src/components/SystemManagement/RoleManagement.tsx` |
| その他多数 |

---

## 実装ステップ

- [x] 対象ファイルの全件洗い出し（完了）
- [ ] **Step 1**: `useProjectActions.tsx` 修正（`{{}}` 2箇所 + `{}` 4箇所）
- [ ] **Step 2**: `useProjectFiles.tsx` 修正（`{}` 6箇所）
- [ ] **Step 3**: `FileListTable.tsx` 修正（`{{}}` 4箇所）
- [ ] **Step 4**: `RenameProjectModal.tsx` 修正（`{{}}` 1箇所）
- [ ] **Step 5**: `FormatManagement.tsx` 修正（`{{}}` 5箇所）
- [ ] **Step 6**: `MaimlPublishDialog.tsx` / `MaimlUnpublishDialog.tsx` 修正（`{{}}` 各1箇所）
- [ ] **Step 7**: `DraftManager.tsx` 修正（`{{}}` 13箇所）
- [ ] **Step 8**: `templateToXML.ts` 修正（`{{}}` 4箇所）
- [ ] **Step 9**: `PetriNetViewer.tsx` 修正（`{{}}` 2箇所）
- [ ] **Step 10**: `PetriNetEditorInner.tsx` 修正（`{}` 3箇所）
- [ ] **Step 11**: `ExperimentWorkerMenu.tsx` 修正（`{}` 1箇所）
- [ ] **Step 12**: `CorporationManagement.tsx` 修正（`{}` 多数）
- [ ] **Step 13**: `OrganizationManagement.tsx` 修正（`{}` 多数）
- [ ] **Step 14**: `InformationDownload.tsx` 修正（`{}` 1箇所）
- [ ] **Step 15**: `SessionManagement.tsx` 修正（`{}` 3箇所）
- [ ] **Step 16**: `UserManagement.tsx` 修正（`{}` 多数）
- [ ] **Step 17**: `RoleManagement.tsx` 修正（`{}` 多数）
- [ ] **Step 18**: `formatUtils.ts` 修正（`{}` 3箇所）
- [ ] 修正後にビルドエラーがないことを確認

---

## リスク

| リスク | 対策 |
|--------|------|
| `getTranslation()` は params 引数未サポートの可能性 | `LanguageContext.tsx` を確認済み → `getTranslation(key, params)` はサポートされている |
| JSON に存在しないキーへの params 渡し | 修正前に各キーのプレースホルダー名を確認済み |

## 承認記録
- **計画書提示日時**: 2026-09-04
- **承認日時**: 2026-09-04

## 実施記録

### 修正済みファイル（全件）
- [x] `src/hooks/project/useProjectActions.tsx` - 6箇所
- [x] `src/hooks/project/useProjectFiles.tsx` - 6箇所
- [x] `src/components/project/FileListTable.tsx` - 4箇所
- [x] `src/components/project/RenameProjectModal.tsx` - 1箇所
- [x] `src/components/project/MaimlPublishDialog.tsx` - 1箇所
- [x] `src/components/project/MaimlUnpublishDialog.tsx` - 1箇所
- [x] `src/components/project/ProjectManagementInner.tsx` - 2箇所
- [x] `src/components/project/InstructionEditDialog.tsx` - 1箇所
- [x] `src/components/project/InstructionRegistrationTab.tsx` - 1箇所
- [x] `src/components/project/TaskRegistrationTab.tsx` - 1箇所
- [x] `src/components/project/OverallEvaluationTab.tsx` - 2箇所
- [x] `src/components/project/UncertaintyApprovalTab.tsx` - 1箇所
- [x] `src/components/format/FormatManagement.tsx` - 5箇所
- [x] `src/components/editorv2/DraftManager.tsx` - 13箇所
- [x] `src/components/editorv2/PetriNetEditorInner.tsx` - 3箇所
- [x] `src/components/viewer/PetriNetViewer.tsx` - 2箇所
- [x] `src/components/menus/ExperimentWorkerMenu.tsx` - 1箇所
- [x] `src/components/Provider/CorporationManagement.tsx` - 8箇所
- [x] `src/components/Provider/OrganizationManagement.tsx` - 9箇所
- [x] `src/components/Provider/InformationDownload.tsx` - 1箇所
- [x] `src/components/SystemManagement/SessionManagement.tsx` - 3箇所
- [x] `src/components/SystemManagement/UserManagement.tsx` - 7箇所
- [x] `src/components/SystemManagement/RoleManagement.tsx` - 7箇所
- [x] `src/components/DataManagement/MasterManagement.tsx` - 13箇所
- [x] `src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx` - 1箇所
- [x] `src/utils/templateToXML.ts` - 4箇所
- [x] `src/utils/formatUtils.ts` - 3箇所

### 最終確認
- `{{}}` 形式の `.replace()` 全件解消 ✅
- `{}` 形式の `.replace()` 全件解消（翻訳用） ✅
- ビルド成功（TypeScript エラーなし） ✅


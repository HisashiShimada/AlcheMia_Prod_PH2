# タスク計画書: xsiType統一修正（integerType → intType）

## メタデータ
- **作成日時**: 2026-09-04 13:00
- **タスクID**: 20260904_1300_xsiType統一修正
- **優先度**: 高
- **推定工数**: 30分

## タスク概要

前回の修正（20260904_1200_xsiType不一致修正）に対してレビューアから以下の指摘が来た：

- **バックエンド**: `integerType`を`intType`にラップする修正ではなく、`intType`を使うようにしてください
- **フロントエンド**: このTypeはMaiml準拠のはずで別途`intType`があります。新しく`integerType`を追加するのではなく`intType`で統一してください

## 修正方針

前回追加した「変換ラップ処理」を削除し、**源流のNamespace管理UIの選択肢を`intType`に統一**する。
既にDBに保存されている`integerType`データはマイグレーションSQLで`intType`に修正する。

## 実装ステップ

- [ ] Step 1: `NamespaceMain.tsx` の `integerType` → `intType` に変更
- [ ] Step 2: `TermManagement.tsx` の `integerType` → `intType` に変更（TYPE_OPTIONS・TYPE_COLOR）
- [ ] Step 3: `TemplateEditorDialog.tsx` の前回追加分（NAMESPACE_TYPE_HINT_TO_XSI_TYPE / normalizedXsiType）を削除
- [ ] Step 4: `frontend/src/utils/maimlTypeConverter.ts` の前回追加分（LEGACY_XSI_TYPE_MAP）を削除
- [ ] Step 5: `backend/src/utils/maimlTypeConverter.ts` の前回追加分（LEGACY_XSI_TYPE_MAP）を削除・元に戻す
- [ ] Step 6: `backend/src/services/experimentInstructionService.ts` の前回追加分（integerType行）を削除
- [ ] Step 7: DBマイグレーションSQL新規作成（既存データ integerType → intType）

## 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/components/namespace/NamespaceMain.tsx` | integerType → intType（value・label） |
| 2 | `frontend/src/components/namespace/TermManagement.tsx` | TYPE_OPTIONS・TYPE_COLOR の integerType → intType |
| 3 | `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | 前回追加分を削除（定数・normalizedXsiType） |
| 4 | `frontend/src/utils/maimlTypeConverter.ts` | 前回追加分（LEGACY_XSI_TYPE_MAP）を削除 |
| 5 | `backend/src/utils/maimlTypeConverter.ts` | 前回追加分（LEGACY_XSI_TYPE_MAP）を削除・元の1行に戻す |
| 6 | `backend/src/services/experimentInstructionService.ts` | numericTypes から integerType を削除 |
| 7 | `backend/migrations/20260904_fix_namespace_term_xsi_type.sql` | 新規作成（既存DBデータ修正） |

## 承認記録
- **計画書提示日時**: 2026-09-04 13:00
- **承認日時**: 2026-09-04 13:00（Actモード切り替えにより承認）

## 実施記録

### 実施日時
開始: 2026-09-04 13:00
完了: 2026-09-04 13:15

### 最終的な成果物
- [x] Step 1: `frontend/src/components/namespace/NamespaceMain.tsx`
  - `typeFilterOptions` の `integerType` → `intType` に変更
  - `typeOptions` の `integerType` → `intType` に変更
- [x] Step 2: `frontend/src/components/namespace/TermManagement.tsx`
  - `TYPE_OPTIONS` の `integerType` → `intType` に変更
  - `TYPE_COLOR` の `integerType` → `intType` に変更
- [x] Step 3: `frontend/src/components/editorv2/TemplateEditorDialog.tsx`
  - 前回追加の `NAMESPACE_TYPE_HINT_TO_XSI_TYPE` 定数を削除
  - 前回追加の `normalizedXsiType` 変換ロジックを削除し `matchedTerm.type` を直接使う形に戻す
- [x] Step 4: `frontend/src/utils/maimlTypeConverter.ts`
  - 前回追加の `LEGACY_XSI_TYPE_MAP` / `normalizedRawXsiType` を削除し元の実装に戻す
- [x] Step 5: `backend/src/utils/maimlTypeConverter.ts`
  - 前回追加の `rawXsiType` / `LEGACY_XSI_TYPE_MAP` を削除し元の1行に戻す
- [x] Step 6: `backend/src/services/experimentInstructionService.ts`
  - `numericTypes` から `integerType` とコメント行を削除
- [x] Step 7: `backend/migrations/20260904_fix_namespace_term_xsi_type.sql` 新規作成
  - 既存DBデータ `xsi_type = 'integerType'` を `intType` に更新するSQL

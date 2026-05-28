# リリースノート

**リリース日**: 2026-05-26  
**対象ブランチ**: main  
**前回リリースコミット**: `219d2f97`  
**今回リリースコミット**: `ab8e5760`

---

## 新機能・改善

### 1. コードマスターの多言語化（AISOLMAIML-243）

- **DBデータ変換**: `code_master` テーブルの `code_name` カラムを日本語固定値から i18n キー形式（例: `materialShortage`）に変換
- **i18n キー組み立て**: バックエンドが `codeMaster.{code_division}.{code_name}` 形式のキーを返却するよう `codeMasterService.ts` を修正
- **翻訳ファイル追加**: `ja.json` / `en.json` に `codeMaster` セクションを追加（全 9 区分・35 件）
- **フロントエンド対応**: `useCodeMaster.ts` および `InstructionEditDialog.tsx` で `t()` による翻訳表示に対応
- **対象区分**: `checkout_status` / `experiment_condition` / `instruction_priority` / `instruction_status` / `instruction_target` / `instruction_type` / `issue_type` / `project_status` / `task_status`

### 2. フロントエンドハードコードメッセージの i18n 化

- **英語ハードコード対応**: `ViewRenderer.tsx`・`ViewRendererDialog.tsx` の英語エラーメッセージを `t()` に変換
- **日本語ハードコード対応**: `DataRecordDialog.tsx`（添付ファイルアップロードエラー・ファイルアップロードエラー・更新エラー等 5 箇所）・`CreateFormatFolderModal.tsx` を `t()` に変換
- **翻訳キー追加**: `viewer` セクション・`dataRecordDialog` セクションに不足キーを追加

---

## バグ修正

### 1. MAIMLアップロード時のXMLバリデーション強化（AISOLMAIML-245）

- MAIMLファイルアップロード時に XML スキーマバリデーションが不十分だった問題を修正
- `maimlParser.ts` のバリデーション処理を強化し、不正な XML 構造のファイルを適切に検出・拒否するよう改善

---

## DB マイグレーション

| ファイル | 内容 |
|---------|------|
| `backend/migrations/20260525_convert_code_master_to_i18n.sql` | `code_master` テーブルの `code_name` を日本語からi18nキーに変換、`code_remark` に日本語説明を移行、`code_description` にカテゴリ説明を設定（全組織対象・35件） |

---

## 主な変更ファイル（抜粋）

### バックエンド

| ファイル | 変更概要 |
|---------|---------|
| `backend/migrations/20260525_convert_code_master_to_i18n.sql`（新規） | code_master i18n化マイグレーション |
| `backend/src/services/codeMasterService.ts` | labelをi18nキー形式で返却するよう修正 |
| `backend/src/sql/queries/codeMaster/insertInitialData.sql` | 初期データをi18nキー形式に更新 |
| `backend/src/utils/maimlParser.ts` | XMLバリデーション強化 |
| `backend/src/repositories/eventLogRepository.ts` | code_master参照方式の修正対応 |
| `backend/src/controllers/fileAccessController.ts` | code_master参照方式の修正対応 |
| `backend/src/services/projectService.ts` | code_master参照方式の修正対応 |

### フロントエンド

| ファイル | 変更概要 |
|---------|---------|
| `frontend/src/locales/ja.json` | codeMasterセクション追加（35件）、viewer/dataRecordDialogキー追加 |
| `frontend/src/locales/en.json` | codeMasterセクション追加（35件）、viewer/dataRecordDialogキー追加 |
| `frontend/src/hooks/useCodeMaster.ts` | rawOptions保持 + render時t()適用に変更 |
| `frontend/src/components/project/InstructionEditDialog.tsx` | getMultipleSelectOptions使用箇所にt()適用 |
| `frontend/src/components/viewer/ViewRenderer.tsx` | エラーメッセージをt()化 |
| `frontend/src/components/viewer/ViewRendererDialog.tsx` | エラーメッセージをt()化 |
| `frontend/src/components/format/CreateFormatFolderModal.tsx` | メッセージをt()化 |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | エラーメッセージをt()化（5箇所） |
| `frontend/src/utils/errorUtils.ts` | エラーユーティリティ修正 |

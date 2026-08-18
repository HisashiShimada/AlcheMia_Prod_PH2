# タスク計画書: 多言語化対応（対象ファイル群）

## メタデータ
- **作成日時**: 2026-07-24 15:57
- **タスクID**: 20260724_1557_多言語化対応_対象ファイル群
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要
以下のファイル内の日本語ハードコーディング部分を多言語化（i18n）対応する。

## 対象ファイル
### フロントエンド
- `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx`
- `frontend/src/components/uncertainty/UncertaintyDetailModal.tsx`
- `frontend/src/components/uncertainty/UncertaintyListTable.tsx`
- `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx`
- `frontend/src/components/uncertainty/UncertaintyManagement.tsx` （既にt()使用済み、追加分のみ）
- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
- `frontend/src/components/editorv2/TemplateEditorDialog.tsx`
- `frontend/src/components/project/ExperimentPlanDialog/TemplateInputPanel.tsx`
- `frontend/src/components/project/ApprovalWizardDialog.tsx`
- `frontend/src/components/project/CreateProjectModal.tsx`
- `frontend/src/components/project/EvaluationRegistrationTab.tsx`
- `frontend/src/components/project/ExperimentInstructionTab.tsx`
- `frontend/src/components/project/ProjectCompletionDialog.tsx`
- `frontend/src/components/project/ProjectManagement.tsx`

### バックエンド
- `backend/src/services/experimentEvaluationService.ts` （エラーメッセージ等を確認）

## 実装方針
1. `ja.json` / `en.json` に新しいキーを追加
2. 各フロントエンドファイルで `useLanguage()` の `t()` 関数を使用
3. バックエンドはエラーメッセージのみ確認（多言語化は通常フロントエンドで対応）

## 承認記録
- **承認日時**: 2026-07-24 15:57（作業開始）

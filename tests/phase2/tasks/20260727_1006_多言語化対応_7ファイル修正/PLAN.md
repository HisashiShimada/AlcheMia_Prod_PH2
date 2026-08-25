# タスク計画書: 多言語化対応 7ファイル修正

## メタデータ
- **作成日時**: 2026-07-27 13:20
- **タスクID**: i18n_7files
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要
以下7ファイル内の日本語ハードコーディング箇所を `t()` 関数に置き換え、ja.json / en.json にキーを追加する。

## 対象ファイル
1. `frontend/src/components/editorv2/TemplateEditorDialog.tsx`
2. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
3. `frontend/src/components/project/EvaluationRegistrationTab.tsx`
4. `frontend/src/components/project/ExperimentInstructionTab.tsx`
5. `frontend/src/components/project/ProjectManagement.tsx`
6. `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx`
7. `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorPanel.tsx`

## 実装ステップ
- [x] タスク計画書作成
- [ ] ja.json / en.json にキー追加（uncSelector, evalRegistration, experimentInstruction追加分）
- [ ] TemplateEditorDialog.tsx: 日本語文字列 → t()
- [ ] WorkRecordPanel.tsx: 日本語文字列 → t()
- [ ] EvaluationRegistrationTab.tsx: 日本語文字列 → t()
- [ ] ExperimentInstructionTab.tsx: 日本語文字列 → t()
- [ ] ProjectManagement.tsx: 日本語文字列 → t()
- [ ] UncertaintyCriteriaSelectorModal.tsx: 日本語文字列 → t()
- [ ] UncertaintyCriteriaSelectorPanel.tsx: 日本語文字列 → t()

## 承認記録
- **承認日時**: 2026-07-27 13:20

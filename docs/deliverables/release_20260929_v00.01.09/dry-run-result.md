# ドライラン結果

- **実行日時**: 2026-09-29 22:09:26
- **リリースタグ**: `release_20260929_v00.01.09`
- **FROM_COMMIT**: `4db0efdf`
- **TO_COMMIT**: `68761295`
- **SRC_REPO**: `/home/ssv/projects/mmdpf`

---

## 差分ファイル一覧

### 追加 (22 件)
- `backend/src/sql/queries/namespace_terms/findTermInAncestorScopes.sql`
- `backend/src/sql/queries/project/completeProject.sql`
- `backend/src/sql/queries/project/getCompletionEligibility.sql`
- `docs/tasks/20260928_0000_プロジェクト名変更ダイアログi18n修正/PLAN.md`
- `docs/tasks/20260928_1000_WorkRecordPanel_定量評価追加行property_set未反映修正/PLAN.md`
- `docs/tasks/20260928_1000_WorkRecordPanel次へボタン読み取り専用時表示問題修正/PLAN.md`
- `docs/tasks/20260928_1000_buildTransitionsメソッドID修正/PLAN.md`
- `docs/tasks/20260928_1000_isReadOnly判定修正/PLAN.md`
- `docs/tasks/20260928_1000_不確かさ選択モーダルスコープ名表示修正/PLAN.md`
- `docs/tasks/20260928_1000_用語管理上位スコープ重複登録禁止修正/PLAN.md`
- `docs/tasks/20260928_1010_WorkRecordPanel_uncertaintyOptionsCache_label_fallback修正/PLAN.md`
- `docs/tasks/20260928_1100_確認ダイアログ評価方式重複表示修正/PLAN.md`
- `docs/tasks/20260928_1200_プロジェクト完了処理修正/PLAN.md`
- `docs/tasks/20260928_1200_不確かさ選択モーダル_同スコープPersonalスコープ基準未表示修正/PLAN.md`
- `docs/tasks/20260928_1400_次遷移検索progressRowsベース化とmethodId必須化/PLAN.md`
- `docs/tasks/20260928_1600_強制終了訂正時実験計画データ消失修正/PLAN.md`
- `docs/tasks/20260928_1600_状態遷移ダイアログ時刻取得不具合修正/PLAN.md`
- `docs/tasks/20260929_0001_不確かさ基準選択モーダルリフレッシュ/PLAN.md`
- `docs/tasks/20260929_1000_評価eventLog完了時自動書き出し/PLAN.md`
- `docs/tasks/20260929_1000_課題463_評価登録タブ計画中ステータス時評価ボタン非活性化/PLAN.md`
- `docs/tasks/20260929_1200_バリデーションエラー件数表示修正/PLAN.md`
- `docs/tasks/20260929_プロジェクト完了ボタン活性条件修正/PLAN.md`

### 更新 (44 件)
- `backend/src/controllers/progressController.ts`
- `backend/src/controllers/projectController.ts`
- `backend/src/controllers/projectOverallEvaluationController.ts`
- `backend/src/controllers/uncertaintyCriteriaController.ts`
- `backend/src/repositories/eventLogRepository.ts`
- `backend/src/repositories/namespaceTermRepository.ts`
- `backend/src/repositories/uncertaintyCriteriaRepository.ts`
- `backend/src/routes/progressRoutes.ts`
- `backend/src/routes/projectOverallEvaluationRoutes.ts`
- `backend/src/routes/projectRoutes.ts`
- `backend/src/services/maimlWriterService.ts`
- `backend/src/services/namespaceService.ts`
- `backend/src/services/progressService.ts`
- `backend/src/services/projectInstructionService.ts`
- `backend/src/services/projectService.ts`
- `backend/src/services/uncertaintyCriteriaService.ts`
- `backend/src/sql/queries/event_log/findTransitionStateRecords.sql`
- `backend/src/sql/queries/project_overall_evaluations/findByProject.sql`
- `backend/src/sql/queries/uncertainty_criteria/findForSelector.sql`
- `backend/src/utils/maimlDataWriter.ts`
- `backend/tests/phase2/controllers/uncertaintyCriteriaController.phase2.test.ts`
- `backend/tests/phase2/repositories/uncertaintyCriteriaRepository.phase2.test.ts`
- `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx`
- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
- `frontend/src/components/editorv2/SaveConfirmDialog.tsx`
- `frontend/src/components/menus/ExperimentWorkerMenu.tsx`
- `frontend/src/components/namespace/NamespaceMain.tsx`
- `frontend/src/components/project/EvaluationRegistrationTab.tsx`
- `frontend/src/components/project/ExperimentInstructionTab.tsx`
- `frontend/src/components/project/OverallEvaluationTab.tsx`
- `frontend/src/components/project/ProjectCompletionDialog.tsx`
- `frontend/src/components/project/ProjectManagementInner.tsx`
- `frontend/src/components/project/subcomponents/ProjectModals.tsx`
- `frontend/src/components/project/subcomponents/tabs/EvaluationRegistrationTabContent.tsx`
- `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx`
- `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx`
- `frontend/src/components/uncertainty/UncertaintyDetailModal.tsx`
- `frontend/src/locales/en.json`
- `frontend/src/locales/ja.json`
- `frontend/src/services/projectApiService.ts`
- `frontend/src/services/projectOverallEvaluationApiService.ts`
- `frontend/src/services/uncertaintyCriteriaApiService.ts`
- `frontend/src/types/experimentWorker.ts`
- `frontend/src/types/progress.ts`

### 削除 (2 件)
- `frontend/src/app/mock/overall-evaluation/page.tsx`
- `frontend/src/components/project/OverallEvaluationTabMock.tsx`

### リネーム (0 件)
なし

---

## サマリー

| 種別 | 件数 |
|------|------|
| 追加 | 22 |
| 更新 | 44 |
| 削除 | 2 |
| リネーム | 0 |
| **合計** | **68** |

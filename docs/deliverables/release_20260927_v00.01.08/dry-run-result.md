# ドライラン結果

- **実行日時**: 2026-09-27 22:23:44
- **リリースタグ**: `release_20260927_v00.01.08`
- **FROM_COMMIT**: `11abb2cf`
- **TO_COMMIT**: `4db0efdf`
- **SRC_REPO**: `/home/ssv/projects/mmdpf`

---

## 差分ファイル一覧

### 追加 (19 件)
- `backend/migrations/20260924_1000_drop_use_deemed_progress_and_progress_rate.sql`
- `backend/src/sql/queries/uncertainty_criteria/validatePrefixExists.sql`
- `backend/src/sql/queries/uncertainty_criteria/validateTermExists.sql`
- `docs/tasks/20260911_1200_みなし進捗処理削除/PLAN.md`
- `docs/tasks/20260924_1000_approveTaskDataタグ書き込み追加/PLAN.md`
- `docs/tasks/20260924_1000_use_deemed_progress_progress_rate削除/PLAN.md`
- `docs/tasks/20260924_completedEventLog二重登録調査/REPORT.md`
- `docs/tasks/20260925_1000_PropertyValue要素なしテンプレートフィールド対応/PLAN.md`
- `docs/tasks/20260925_1000_テンプレート編集不確かさvalue欄削除/PLAN.md`
- `docs/tasks/20260925_1000_メソッド別実験計画登録済みチェック追加/PLAN.md`
- `docs/tasks/20260925_1000_不確かさ基準インポート処理修正/PLAN.md`
- `docs/tasks/20260925_1100_実験計画指示必須化とplanned_values空チェック修正/PLAN.md`
- `docs/tasks/20260925_1430_approveTask_data追記失敗調査修正/PLAN.md`
- `docs/tasks/20260925_1500_不確かさ情報property_set未格納修正/PLAN.md`
- `docs/tasks/20260925_1600_テンプレートプロパティテキスト編集不可化/PLAN.md`
- `docs/tasks/20260925_1700_デフォルト定性評価uncertainty_key_null修正/PLAN.md`
- `docs/tasks/20260925_WorkRecordPanel_addedValues切替時欠落修正/PLAN.md`
- `docs/tasks/20260925_WorkRecordPanel_addedValues追加行保持・表示分離/PLAN.md`
- `docs/tasks/20260925_WorkRecordPanel_定量評価入力欄バグ修正/PLAN.md`

### 更新 (84 件)
- `backend/src/controllers/experimentController.ts`
- `backend/src/controllers/organizationController.ts`
- `backend/src/controllers/progressController.ts`
- `backend/src/controllers/projectController.ts`
- `backend/src/controllers/roleController.ts`
- `backend/src/controllers/uncertaintyCriteriaController.ts`
- `backend/src/middleware/namespaceValidation.ts`
- `backend/src/repositories/eventLogRepository.ts`
- `backend/src/repositories/organizationManagementRepository.ts`
- `backend/src/repositories/organizationRepository.ts`
- `backend/src/repositories/projectTaskDetailRepository.ts`
- `backend/src/repositories/transitionDataRepository.ts`
- `backend/src/repositories/uncertaintyCriteriaRepository.ts`
- `backend/src/repositories/workerProjectRepository.ts`
- `backend/src/routes/aggregationRuleRoutes.ts`
- `backend/src/routes/authRoutes.ts`
- `backend/src/routes/corporationRoutes.ts`
- `backend/src/routes/masterRoutes.ts`
- `backend/src/routes/organizationRoutes.ts`
- `backend/src/routes/progressRoutes.ts`
- `backend/src/routes/projectOverallEvaluationRoutes.ts`
- `backend/src/routes/roleRoutes.ts`
- `backend/src/routes/sessionRoutes.ts`
- `backend/src/routes/systemConfigRoutes.ts`
- `backend/src/routes/uncertaintyCriteriaRoutes.ts`
- `backend/src/routes/userRoutes.ts`
- `backend/src/services/emailService.ts`
- `backend/src/services/experimentDataService.ts`
- `backend/src/services/experimentInstructionService.ts`
- `backend/src/services/maimlWriterService.ts`
- `backend/src/services/organizationService.ts`
- `backend/src/services/progressService.ts`
- `backend/src/services/projectService.ts`
- `backend/src/services/storageService.ts`
- `backend/src/services/taskService.ts`
- `backend/src/services/uncertaintyCriteriaService.ts`
- `backend/src/services/workerProjectService.ts`
- `backend/src/sql/queries/organizations/create.sql`
- `backend/src/sql/queries/organizations/findAll.sql`
- `backend/src/sql/queries/organizations/findById.sql`
- `backend/src/sql/queries/organizations/findByIdSimple.sql`
- `backend/src/sql/queries/organizations/update.sql`
- `backend/src/sql/queries/projects/findWorkerAccessible.sql`
- `backend/src/sql/queries/tasks/findDetailByTaskId.sql`
- `backend/src/sql/queries/tasks/findTransitionsByTaskId.sql`
- `backend/src/sql/queries/tasks/listMethodsAndTasksByProject.sql`
- `backend/src/sql/queries/transition_data/findById.sql`
- `backend/src/sql/queries/transition_data/findByTask.sql`
- `backend/src/sql/queries/transition_data/getLatestRecord.sql`
- `backend/src/sql/queries/transition_data/insert.sql`
- `backend/src/sql/queries/transition_data/updateStatus.sql`
- `backend/src/sql/queries/uncertainty_criteria/findByKeysWithDetails.sql`
- `backend/src/types/api.ts`
- `backend/src/types/database.ts`
- `backend/src/types/progress.ts`
- `backend/src/types/task.ts`
- `backend/src/types/transitionData.ts`
- `backend/src/types/workerProject.ts`
- `backend/src/utils/maimlDataWriter.ts`
- `backend/src/utils/maimlQualityWriter.ts`
- `backend/src/utils/messages.ts`
- `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx`
- `frontend/src/components/ExperimentWorker/TransitionFlowNode.tsx`
- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
- `frontend/src/components/Provider/OrganizationManagement.tsx`
- `frontend/src/components/editorv2/NestedPropertyEditor.tsx`
- `frontend/src/components/menus/ExperimentWorkerMenu.tsx`
- `frontend/src/components/project/TaskRegistrationTab.tsx`
- `frontend/src/components/uncertainty/UncertaintyImportModal.tsx`
- `frontend/src/components/uncertainty/UncertaintyManagement.tsx`
- `frontend/src/locales/en.json`
- `frontend/src/locales/ja.json`
- `frontend/src/services/experimentPlanApiService.ts`
- `frontend/src/services/projectApiService.ts`
- `frontend/src/services/uncertaintyCriteriaApiService.ts`
- `frontend/src/types/api.ts`
- `frontend/src/types/experimentWorker.ts`
- `frontend/src/types/organization.ts`
- `frontend/src/types/progress.ts`
- `frontend/src/types/project.ts`
- `frontend/src/utils/experimentPlanHelpers.ts`
- `tests/e2e/steps/1_provider/1_provider.ts`
- `tests/e2e/steps/5_experiment_worker/5-2_experiment_record.ts`
- `tests/e2e/steps/provider/1_provider.ts`

### 削除 (3 件)
- `backend/src/sql/queries/organizations/getUseDeemedProgress.sql`
- `backend/src/sql/queries/project_tasks/updateProgressRate.sql`
- `backend/src/sql/queries/transition_data/sumProgressRateByTask.sql`

### リネーム (0 件)
なし

---

## サマリー

| 種別 | 件数 |
|------|------|
| 追加 | 19 |
| 更新 | 84 |
| 削除 | 3 |
| リネーム | 0 |
| **合計** | **106** |

# ドライラン結果

- **実行日時**: 2026-09-16 08:45:03
- **リリースタグ**: `release_20260916_v00.09.16`
- **FROM_COMMIT**: `0dccdc70`
- **TO_COMMIT**: `44b4b449`
- **SRC_REPO**: `/home/ssv/projects/mmdpf`

---

## 差分ファイル一覧

### 追加 (48 件)
- `backend/src/sql/queries/namespace_terms/findScopeNameByNamespaceId.sql`
- `backend/src/sql/queries/namespace_terms/findTermInScope.sql`
- `backend/src/sql/queries/project_task_detail/updateStatusIfPending.sql`
- `backend/src/sql/queries/projects/updateStatusIfPending.sql`
- `backend/src/sql/queries/uncertainty_criteria/findByUncertaintyKeys.sql`
- `backend/tests/phase2/controllers/uncertaintyCriteriaService.test.ts`
- `backend/tests/phase2/routes/uncertaintyCriteriaExportImport.phase2.test.ts`
- `docs/deliverables/release_20260910_v00.01.02/dry-run-result.md`
- `docs/deliverables/release_20260910_v00.01.02/env_diff_20260910_103513.md`
- `docs/deliverables/release_20260910_v00.01.02/release_info.md`
- `docs/deliverables/schema_dump_dev.sql`
- `docs/deploy-guide/saas-production/README.md`
- `docs/deploy-guide/saas-production/check-migration-status.sh`
- `docs/tasks/20260909_0000_TemplateEditorDialogキー選択表示統一/PLAN.md`
- `docs/tasks/20260909_1000_不確かさ基準インポートエクスポート実装/PLAN.md`
- `docs/tasks/20260909_1200_プロジェクトステータスフィルタ修正/PLAN.md`
- `docs/tasks/20260909_1900_名前空間管理スコープ表示不整合調査実装/PLAN.md`
- `docs/tasks/20260909_1930_不確かさ基準編集ダイアログ有効表示二重記号修正/PLAN.md`
- `docs/tasks/20260909_2200_フロー図記録ボタン活性非活性不整合修正/PLAN.md`
- `docs/tasks/20260909_namespace_declaration_fix/PLAN.md`
- `docs/tasks/20260910_0000_PrefixManagement子孫Prefix混入バグ修正/PLAN.md`
- `docs/tasks/20260910_0000_ビューアメッセージ多言語対応修正/PLAN.md`
- `docs/tasks/20260910_0000_用語管理重複チェックスコープ修正/PLAN.md`
- `docs/tasks/20260910_1000_DocumentEditDialog_Owner改修/PLAN.md`
- `docs/tasks/20260910_1000_プロバイダー権限修正/PLAN.md`
- `docs/tasks/20260910_1000_用語管理多重登録バグ修正/PLAN.md`
- `docs/tasks/20260910_1100_CSVインポートエラーメッセージ修正/PLAN.md`
- `docs/tasks/20260910_1100_namespace_scope_key重複防止修正/PLAN.md`
- `docs/tasks/20260910_1340_集約ルール保存エラー修正/PLAN.md`
- `docs/tasks/20260910_1400_組織追加時namespace登録バグ修正/PLAN.md`
- `docs/tasks/20260910_1500_Prefix管理上位層重複一覧表示バグ修正/PLAN.md`
- `docs/tasks/20260910_namespace_uri_fix/PLAN.md`
- `docs/tasks/20260910_namespace_uri_fix/test_data.sql`
- `docs/tasks/20260911_0000_ProgressOverviewTab記録ボタン活性条件修正/PLAN.md`
- `docs/tasks/20260911_0000_check-i18n-keys拡張/PLAN.md`
- `docs/tasks/20260911_0001_TransitionFlowNodeステータス表示統一/PLAN.md`
- `docs/tasks/20260911_0100_viewerコンポーネント英語ハードコード修正/PLAN.md`
- `docs/tasks/20260911_1000_FE_DB登録後リフレッシュ規約スキル追加/PLAN.md`
- `docs/tasks/20260911_1000_指示確認保存時ステータス更新漏れ修正/PLAN.md`
- `docs/tasks/20260911_1100_FE_他ユーザーDB変更対応自動リフレッシュ規約/PLAN.md`
- `docs/tasks/20260911_1117_WorkRecordPanel次へボタン活性制御と初期値設定/PLAN.md`
- `docs/tasks/20260914_0900_不確かさ選択ダイアログスコープ修正と用語管理エラーメッセージ修正/PLAN.md`
- `docs/tasks/20260914_1100_実験指示一覧見切れとPrefix警告スコープ名修正/PLAN.md`
- `docs/tasks/20260914_1200_MasterManagement_エラーメッセージ改修/PLAN.md`
- `docs/tasks/20260914_1300_extractErrorMessage_details対応/PLAN.md`
- `frontend/src/components/ExperimentWorker/__tests__/TransitionFlowNode.test.tsx`
- `frontend/src/components/namespace/__tests__/PrefixManagement.unit.test.ts`
- `frontend/src/components/project/__tests__/ExperimentInstructionTab.unit.test.ts`

### 更新 (94 件)
- `.cline/skills/frontend-develop-skill/docs/frontend.md`
- `backend/migrations/20260821_add_unique_scope_key_to_namespace.sql`
- `backend/src/controllers/projectController.ts`
- `backend/src/controllers/roleController.ts`
- `backend/src/controllers/uncertaintyCriteriaController.ts`
- `backend/src/repositories/experimentInstructionDetailRepository.ts`
- `backend/src/repositories/namespaceTermRepository.ts`
- `backend/src/repositories/projectRepository.ts`
- `backend/src/repositories/projectTaskDetailRepository.ts`
- `backend/src/repositories/uncertaintyCriteriaRepository.ts`
- `backend/src/routes/roleRoutes.ts`
- `backend/src/routes/uncertaintyCriteriaRoutes.ts`
- `backend/src/routes/userRoutes.ts`
- `backend/src/services/experimentDataService.ts`
- `backend/src/services/maimlPublishService.ts`
- `backend/src/services/maimlWriterService.ts`
- `backend/src/services/namespaceService.ts`
- `backend/src/services/organizationService.ts`
- `backend/src/services/progressService.ts`
- `backend/src/services/roleService.ts`
- `backend/src/services/uncertaintyCriteriaService.ts`
- `backend/src/services/userService.ts`
- `backend/src/sql/queries/namespace_terms/createNamespaceUri.sql`
- `backend/src/sql/queries/namespace_terms/findDeclarationsByProjectScope.sql`
- `backend/src/sql/queries/namespace_terms/findNamespacesByScopeKeyWithAncestors.sql`
- `backend/src/sql/queries/namespace_terms/findPrefixNamespaceId.sql`
- `backend/src/sql/queries/transition_data/findById.sql`
- `backend/src/sql/queries/transition_data/getLatestRecord.sql`
- `backend/src/sql/queries/uncertainty_criteria/findForSelector.sql`
- `backend/src/sql/queries/user_authentication/getPasswordStatus.sql`
- `backend/src/sql/queries/users/createUserAuth.sql`
- `backend/src/utils/maimlDataWriter.ts`
- `backend/src/utils/messages.ts`
- `backend/tests/phase2/controllers/uncertaintyCriteriaController.phase2.test.ts`
- `backend/tests/phase2/repositories/namespaceTermRepository.phase2.test.ts`
- `backend/tests/phase2/repositories/uncertaintyCriteriaRepository.phase2.test.ts`
- `backend/tests/phase2/services/namespaceService.phase2.test.ts`
- `docs/deploy-guide/saas-production/production-deploy-checklist.md`
- `docs/design/db/ddl/user_authentication.sql`
- `docs/design/ui/button_control/05_experiment_worker.md`
- `docs/design/ui/experiment_admin/01_project_management/ui_project_management.md`
- `frontend/src/components/DataManagement/MasterManagement.tsx`
- `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx`
- `frontend/src/components/ExperimentWorker/TransitionFlowNode.tsx`
- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
- `frontend/src/components/SystemManagement/AggregationRuleSettings.tsx`
- `frontend/src/components/SystemManagement/FunctionPermissionDialog.tsx`
- `frontend/src/components/SystemManagement/RoleManagement.tsx`
- `frontend/src/components/SystemManagement/UserManagement.tsx`
- `frontend/src/components/editorv2/DocumentEditDialog.tsx`
- `frontend/src/components/editorv2/MultiObjectEditor.tsx`
- `frontend/src/components/editorv2/NestedPropertyEditor.tsx`
- `frontend/src/components/editorv2/PetriNetEditorInner.tsx`
- `frontend/src/components/editorv2/TemplateEditorDialog.tsx`
- `frontend/src/components/editorv2/XMLViewerWrapper.tsx`
- `frontend/src/components/menus/ExperimentWorkerMenu.tsx`
- `frontend/src/components/namespace/NamespaceMain.tsx`
- `frontend/src/components/namespace/PrefixManagement.tsx`
- `frontend/src/components/progress/ProgressMonitoring.tsx`
- `frontend/src/components/project/ExperimentInstructionTab.tsx`
- `frontend/src/components/project/ProjectFolderTree.tsx`
- `frontend/src/components/project/ProjectManagementInner.tsx`
- `frontend/src/components/project/subcomponents/ProjectToolbar.tsx`
- `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx`
- `frontend/src/components/uncertainty/UncertaintyDetailModal.tsx`
- `frontend/src/components/uncertainty/UncertaintyExportModal.tsx`
- `frontend/src/components/uncertainty/UncertaintyImportModal.tsx`
- `frontend/src/components/uncertainty/UncertaintyManagement.tsx`
- `frontend/src/components/viewer/ErrorBoundary.tsx`
- `frontend/src/components/viewer/ImageViewer.tsx`
- `frontend/src/components/viewer/TiffViewer.tsx`
- `frontend/src/components/viewer/ViewRenderer.tsx`
- `frontend/src/components/viewer/ViewRendererDialog.tsx`
- `frontend/src/hooks/project/useProjectList.ts`
- `frontend/src/hooks/useApi.ts`
- `frontend/src/locales/en.json`
- `frontend/src/locales/ja.json`
- `frontend/src/services/aggregationRuleApiService.ts`
- `frontend/src/services/maimlApiService.ts`
- `frontend/src/services/masterApiService.ts`
- `frontend/src/services/namespaceApiService.ts`
- `frontend/src/services/projectApiService.ts`
- `frontend/src/services/uncertaintyCriteriaApiService.ts`
- `frontend/src/types/experimentWorker.ts`
- `frontend/src/types/progress.ts`
- `frontend/src/utils/__tests__/errorUtils.test.ts`
- `frontend/src/utils/documentInitializer.ts`
- `frontend/src/utils/errorUtils.ts`
- `frontend/src/utils/reactFlowConverter.ts`
- `scripts/check-i18n-keys.js`
- `scripts/result/i18n-check-report.txt`
- `tests/phase2/test-scenarios/4_experiment_admin.md`
- `tests/phase2/test-scenarios/5_experiment_worker.md`
- `tests/phase2/test-scenarios/category-B_uncertainty.md`

### 削除 (0 件)
なし

### リネーム (0 件)
なし

---

## サマリー

| 種別 | 件数 |
|------|------|
| 追加 | 48 |
| 更新 | 94 |
| 削除 | 0 |
| リネーム | 0 |
| **合計** | **142** |

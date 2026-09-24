# ドライラン結果

- **実行日時**: 2026-09-24 14:29:17
- **リリースタグ**: `release_20260924_v00.01.07`
- **FROM_COMMIT**: `02fd56f2`
- **TO_COMMIT**: `11abb2cf`
- **SRC_REPO**: `/home/ssv/projects/mmdpf`

---

## 差分ファイル一覧

### 追加 (23 件)
- `backend/migrations/20260918_add_project_status_review_rejected_to_code_master.sql`
- `backend/src/sql/queries/experiment_instruction_details/updateActualOnly.sql`
- `backend/tests/utils/maimlParser.childXmlns.test.ts`
- `backend/tests/utils/maiml_validation/13_child_xmlns.maiml`
- `docs/tasks/20260917_1800_不確かさ基準インポートスキップバグ修正/PLAN.md`
- `docs/tasks/20260918_0000_データタブ複数Results対応/PLAN.md`
- `docs/tasks/20260918_1000_CDバリデーション追加とプレースホルダー更新/PLAN.md`
- `docs/tasks/20260918_1000_MAIMLバリデーション用語キー照合修正_外部NS除外/PLAN.md`
- `docs/tasks/20260918_1000_viewer多言語対応漏れ修正/PLAN.md`
- `docs/tasks/20260918_1000_実績値格納不具合調査修正/PLAN.md`
- `docs/tasks/20260918_1000_実験指示タブ訂正保存バグ修正/PLAN.md`
- `docs/tasks/20260918_1100_チェックアウト時指示内容MAIML書き込み修正/MaimlTagサンプル.txt`
- `docs/tasks/20260918_1100_チェックアウト時指示内容MAIML書き込み修正/Maimlサンプル.txt`
- `docs/tasks/20260918_1100_チェックアウト時指示内容MAIML書き込み修正/PLAN.md`
- `docs/tasks/20260918_1100_チェックアウト時指示内容MAIML書き込み修正/PLAN_toSupervisorKey修正.md`
- `docs/tasks/20260918_1200_MAIMLバリデーション子タグxmlns宣言スコープ対応/PLAN.md`
- `docs/tasks/20260918_1500_BulkUpload403エラー調査/REPORT.md`
- `docs/tasks/20260918_1600_プロパティキー選択AutoComplete化/PLAN.md`
- `docs/tasks/20260924_0000_集約ルール設定項目注釈追加/PLAN.md`
- `docs/tasks/20260924_1000_バリデーション保存時xmlns宣言注入修正/PLAN.md`
- `docs/tasks/20260924_1000_実験指示タブ差分・定性値未表示修正/PLAN.md`
- `frontend/src/app/mock/data-tab-multi-results/PropertyViewerDataTabMock.tsx`
- `frontend/src/app/mock/data-tab-multi-results/page.tsx`

### 更新 (47 件)
- `backend/src/controllers/workerProjectController.ts`
- `backend/src/middleware/organizationGroupValidation.ts`
- `backend/src/repositories/experimentInstructionDetailRepository.ts`
- `backend/src/repositories/uncertaintyCriteriaRepository.ts`
- `backend/src/repositories/workerProjectRepository.ts`
- `backend/src/routes/organizationRoutes.ts`
- `backend/src/routes/projectRoutes.ts`
- `backend/src/routes/roleRoutes.ts`
- `backend/src/services/experimentDataService.ts`
- `backend/src/services/experimentInstructionService.ts`
- `backend/src/services/maimlWriterService.ts`
- `backend/src/services/projectService.ts`
- `backend/src/sql/queries/codeMaster/insertInitialData.sql`
- `backend/src/sql/queries/uncertainty_criteria/findByKeys.sql`
- `backend/src/types/api.ts`
- `backend/src/types/project.ts`
- `backend/src/types/workerProject.ts`
- `backend/src/utils/maimlDataWriter.ts`
- `backend/src/utils/maimlParser.ts`
- `backend/src/utils/messages.ts`
- `backend/tests/controllers/workerProjectController.test.ts`
- `backend/tests/utils/maimlParser.validation.test.ts`
- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
- `frontend/src/components/Provider/OrganizationManagement.tsx`
- `frontend/src/components/SystemManagement/AggregationRuleSettings.tsx`
- `frontend/src/components/editorv2/NestedPropertyEditor.tsx`
- `frontend/src/components/editorv2/PetriNetEditorInner.tsx`
- `frontend/src/components/editorv2/TemplateEditorDialog.tsx`
- `frontend/src/components/group/GroupAddDialog.tsx`
- `frontend/src/components/menus/ExperimentWorkerMenu.tsx`
- `frontend/src/components/project/ExperimentInstructionTab.tsx`
- `frontend/src/components/project/ProjectManagementInner.tsx`
- `frontend/src/components/uncertainty/UncertaintyImportModal.tsx`
- `frontend/src/components/viewer/PetriNetViewer.tsx`
- `frontend/src/components/viewer/dialogs/PropertyViewer.tsx`
- `frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx`
- `frontend/src/components/viewer/dialogs/StructuredPropertySelector.tsx`
- `frontend/src/components/viewer/dialogs/SubNetViewer.tsx`
- `frontend/src/locales/en.json`
- `frontend/src/locales/ja.json`
- `frontend/src/services/projectApiService.ts`
- `frontend/src/types/editor.ts`
- `frontend/src/types/experimentInstruction.ts`
- `frontend/src/utils/maimlDataExtractor.ts`
- `tests/phase2/test-scenarios/5_experiment_worker.md`
- `tests/phase2/test-scenarios/category-B_experiment_instruction_workerUI.md`
- `tests/phase2/test-scenarios/category-B_namespace.md`

### 削除 (0 件)
なし

### リネーム (0 件)
なし

---

## サマリー

| 種別 | 件数 |
|------|------|
| 追加 | 23 |
| 更新 | 47 |
| 削除 | 0 |
| リネーム | 0 |
| **合計** | **70** |

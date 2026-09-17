# ドライラン結果

- **実行日時**: 2026-09-17 22:50:32
- **リリースタグ**: `release_20260917_v00.01.05`
- **FROM_COMMIT**: `a187acda`
- **TO_COMMIT**: `c3e9d72c`
- **SRC_REPO**: `/home/ssv/projects/mmdpf`

---

## 差分ファイル一覧

### 追加 (11 件)
- `backend/src/sql/queries/experiment_uncertainty_judge/findByTaskNo.sql`
- `backend/src/sql/queries/namespace_terms/removeTermInScope.sql`
- `backend/src/sql/queries/namespace_terms/shareTermsToScope.sql`
- `docs/tasks/20260915_0001_WorkRecordPanel保存後プロジェクト一覧更新/PLAN.md`
- `docs/tasks/20260915_0002_handleTaskStatusChangedとreloadProgressRows統合/PLAN.md`
- `docs/tasks/20260915_1000_WorkRecordPanel_テンプレート切替時入力値保持/PLAN.md`
- `docs/tasks/20260915_1100_WorkRecordPanel_定量評価初期値復元/PLAN.md`
- `docs/tasks/20260917_1500_グループ作成後プロジェクト一覧取得JWT不整合修正/PLAN.md`
- `docs/tasks/20260917_1500_用語共有API新規実装/PLAN.md`
- `docs/tasks/20260917_1700_requestApproval_checkout_status修正/PLAN.md`
- `docs/tasks/20260917_共有機能コミット05f858c8誤修正差し戻し/PLAN.md`

### 更新 (33 件)
- `backend/src/controllers/fileAccessController.ts`
- `backend/src/controllers/namespaceController.ts`
- `backend/src/controllers/organizationGroupController.ts`
- `backend/src/controllers/workerProjectController.ts`
- `backend/src/middleware/namespaceValidation.ts`
- `backend/src/repositories/experimentUncertaintyJudgeRepository.ts`
- `backend/src/repositories/namespaceTermRepository.ts`
- `backend/src/routes/namespaceRoutes.ts`
- `backend/src/services/experimentDataService.ts`
- `backend/src/services/fileAccessService.ts`
- `backend/src/services/namespaceService.ts`
- `backend/src/services/projectService.ts`
- `backend/src/services/workerProjectService.ts`
- `backend/src/sql/queries/projects/updateApprovalStatus.sql`
- `backend/src/types/api.ts`
- `backend/src/types/project.ts`
- `backend/src/types/workerProject.ts`
- `backend/src/utils/logger.ts`
- `backend/tests/controllers/workerProjectController.test.ts`
- `backend/tests/phase2/controllers/organizationGroupController.phase2.test.ts`
- `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx`
- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
- `frontend/src/components/editorv2/PetriNetEditorInner.tsx`
- `frontend/src/components/menus/ExperimentWorkerMenu.tsx`
- `frontend/src/components/namespace/NamespaceMain.tsx`
- `frontend/src/components/namespace/PrefixManagement.tsx`
- `frontend/src/components/namespace/ShareScopeModal.tsx`
- `frontend/src/components/uncertainty/UncertaintyManagement.tsx`
- `frontend/src/locales/en.json`
- `frontend/src/locales/ja.json`
- `frontend/src/services/namespaceApiService.ts`
- `frontend/src/services/organizationGroupApiService.ts`
- `frontend/src/types/namespace.ts`

### 削除 (0 件)
なし

### リネーム (0 件)
なし

---

## サマリー

| 種別 | 件数 |
|------|------|
| 追加 | 11 |
| 更新 | 33 |
| 削除 | 0 |
| リネーム | 0 |
| **合計** | **44** |

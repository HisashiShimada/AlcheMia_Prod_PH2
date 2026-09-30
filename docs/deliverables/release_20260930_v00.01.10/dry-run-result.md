# ドライラン結果

- **実行日時**: 2026-09-30 11:45:44
- **リリースタグ**: `release_20260930_v00.01.10`
- **FROM_COMMIT**: `68761295`
- **TO_COMMIT**: `71d5d6e9`
- **SRC_REPO**: `/home/ssv/projects/mmdpf`

---

## 差分ファイル一覧

### 追加 (17 件)
- `backend/src/sql/queries/namespace_terms/existsPrefixInNamespace.sql`
- `backend/src/sql/queries/template_data/deleteByProjectAndPendingTasks.sql`
- `backend/src/sql/queries/transition_data/deleteByProjectAndPendingTasks.sql`
- `docs/tasks/20260929_0000_用語管理スコープ切替RaceCondition修正/PLAN.md`
- `docs/tasks/20260929_1000_ExperimentPlanDialog_タスクNo重複修正/PLAN.md`
- `docs/tasks/20260929_1000_Prefix重複登録時の誤メッセージ修正/PLAN.md`
- `docs/tasks/20260929_1000_SupervisorDirective不確かさ除外/PLAN.md`
- `docs/tasks/20260929_1000_定量評価judgeMap_templateId_placeId不整合修正/PLAN.md`
- `docs/tasks/20260929_1000_定量評価judgeMap_templateId_placeId不整合修正/fix_uncertainty_judge_template_id.sql`
- `docs/tasks/20260929_1100_タスク再登録時データ保護修正/PLAN.md`
- `docs/tasks/20260929_1400_別Prefix同ローカル名警告ダイアログ未表示修正/PLAN.md`
- `docs/tasks/20260929_1500_CSVインポート登録先スコープ修正/PLAN.md`
- `docs/tasks/20260929_1600_Prefix管理編集ボタン非活性と保存失敗修正/PLAN.md`
- `docs/tasks/20260929_1800_Prefix管理CSVエクスポートボタン制御修正/PLAN.md`
- `docs/tasks/20260930_1000_NG登録後チェックアウト処理追加とisReadOnly懸念調査/PLAN.md`
- `docs/tasks/20260930_1000_prefix_localname_edit_disabled/PLAN.md`
- `docs/tasks/20260930_1500_WorkRecordPanel同名トランジション複合キー修正/PLAN.md`

### 更新 (32 件)
- `backend/src/controllers/namespaceController.ts`
- `backend/src/repositories/namespaceTermRepository.ts`
- `backend/src/repositories/templateDataRepository.ts`
- `backend/src/repositories/transitionDataRepository.ts`
- `backend/src/services/maimlWriterService.ts`
- `backend/src/services/namespaceService.ts`
- `backend/src/services/projectService.ts`
- `backend/src/services/taskRegistrationService.ts`
- `backend/src/sql/queries/namespace_terms/updatePrefix.sql`
- `backend/src/sql/queries/uncertainty_criteria/findForSelector.sql`
- `backend/src/types/api.ts`
- `backend/src/utils/messages.ts`
- `frontend/next-env.d.ts`
- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
- `frontend/src/components/editorv2/XMLViewer.tsx`
- `frontend/src/components/menus/ExperimentWorkerMenu.tsx`
- `frontend/src/components/namespace/NamespaceMain.tsx`
- `frontend/src/components/namespace/PrefixManagement.tsx`
- `frontend/src/components/project/ExperimentInstructionTab.tsx`
- `frontend/src/components/project/ProjectManagementInner.tsx`
- `frontend/src/components/project/TaskRegistrationTab.tsx`
- `frontend/src/components/project/subcomponents/tabs/ExperimentInstructionTabContent.tsx`
- `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx`
- `frontend/src/components/uncertainty/UncertaintyManagement.tsx`
- `frontend/src/locales/en.json`
- `frontend/src/locales/ja.json`
- `frontend/src/types/experimentWorker.ts`
- `frontend/src/types/namespace.ts`
- `tests/phase2/test-scenarios/3_data_management.md`
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
| 追加 | 17 |
| 更新 | 32 |
| 削除 | 0 |
| リネーム | 0 |
| **合計** | **49** |

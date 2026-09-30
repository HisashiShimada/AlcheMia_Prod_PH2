# ドライラン結果

- **実行日時**: 2026-09-30 16:27:42
- **リリースタグ**: `release_20260930_v00.01.12`
- **FROM_COMMIT**: `71d5d6e9`
- **TO_COMMIT**: `7b84e7ca`
- **SRC_REPO**: `/home/ssv/projects/mmdpf`

---

## 差分ファイル一覧

### 追加 (5 件)
- `docs/tasks/20260930_1000_MAIMLチェックアウト時data-eventLog間空白行修正/PLAN.md`
- `docs/tasks/20260930_1000_タブ切替時再フェッチ対応/PLAN.md`
- `docs/tasks/20260930_1100_名前空間管理画面UI統一修正/PLAN.md`
- `docs/tasks/20260930_1430_MaiMLインデント修正/PLAN.md`
- `docs/tasks/20260930_1600_MAIML_appendOwnerToDocumentインデント修正/PLAN.md`

### 更新 (34 件)
- `backend/src/controllers/roleController.ts`
- `backend/src/middleware/namespaceValidation.ts`
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
- `backend/src/services/maimlWriterService.ts`
- `backend/src/sql/queries/namespace_terms/findAllByScopeKey.sql`
- `backend/src/sql/queries/namespace_terms/findAllByScopeKeyWithAncestors.sql`
- `backend/src/utils/maimlDataWriter.ts`
- `frontend/src/components/format/FormatManagement.tsx`
- `frontend/src/components/group/GroupManagementPanel.tsx`
- `frontend/src/components/menus/ExperimentAdminMenu.tsx`
- `frontend/src/components/menus/ExperimentWorkerMenu.tsx`
- `frontend/src/components/namespace/GlobalNamespaceView.tsx`
- `frontend/src/components/namespace/NamespaceMain.tsx`
- `frontend/src/components/namespace/PrefixManagement.tsx`
- `frontend/src/components/progress/ProgressMonitoring.tsx`
- `frontend/src/components/project/ProjectManagement.tsx`
- `frontend/src/components/project/ProjectManagementInner.tsx`
- `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx`
- `frontend/src/components/uncertainty/UncertaintyListTable.tsx`
- `frontend/src/components/uncertainty/UncertaintyManagement.tsx`
- `frontend/src/locales/en.json`
- `frontend/src/locales/ja.json`

### 削除 (0 件)
なし

### リネーム (0 件)
なし

---

## サマリー

| 種別 | 件数 |
|------|------|
| 追加 | 5 |
| 更新 | 34 |
| 削除 | 0 |
| リネーム | 0 |
| **合計** | **39** |

# ドライラン結果

- **実行日時**: 2026-06-09 11:08:52
- **リリースタグ**: `release_20260608_v00.00.12`
- **FROM_COMMIT**: `78ced1fc`
- **TO_COMMIT**: `7ddb59f6`
- **SRC_REPO**: `/home/ssv/projects/mmdpf`

---

## 差分ファイル一覧

### 追加 (10 件)
- `docs/20260603_0903_XMLプレビュー保存バグ修正/PLAN.md`
- `docs/20260603_0903_XMLプレビュー保存バグ修正/TEST_CASES.md`
- `docs/20260604_1508_XMLアップロードMAIMLバリデーションエラー調査/PLAN.md`
- `docs/deliverables/release_20260603_v00.00.10/dry-run-result.md`
- `docs/deliverables/release_20260603_v00.00.10/env_diff_20260604_084358.md`
- `docs/deliverables/release_20260603_v00.00.10/release_info.md`
- `docs/deliverables/release_20260603_v00.00.10/release_notes_20260603.md`
- `docs/design/infrastructure/production-onprem-architecture.drawio`
- `docs/design/infrastructure/staging-architecture-simple.drawio`
- `scripts/README.md`

### 更新 (44 件)
- `backend/src/enums/codeMaster.enum.ts`
- `backend/src/repositories/eventLogRepository.ts`
- `backend/src/repositories/instructionRepository.ts`
- `backend/src/services/fileAccessService.ts`
- `backend/src/services/projectInstructionService.ts`
- `backend/src/services/projectService.ts`
- `backend/src/sql/queries/codeMaster/insertInitialData.sql`
- `backend/src/sql/queries/instructions/batchInsert.sql`
- `backend/src/sql/queries/instructions/findById.sql`
- `backend/src/sql/queries/instructions/findByProject.sql`
- `backend/src/sql/queries/instructions/findWorkerInstructions.sql`
- `backend/src/types/database.ts`
- `backend/src/types/instruction.ts`
- `backend/src/types/taskService.types.ts`
- `docs/deploy-guide/onprem/deploy-guide-dev.md`
- `docs/deploy-guide/saas-staging/staging-deploy-checklist.md`
- `docs/design/infrastructure/staging-architecture.drawio`
- `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`
- `frontend/src/components/ExperimentWorker/InstructionConfirmationModal.tsx`
- `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx`
- `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx`
- `frontend/src/components/ExperimentWorker/MethodTaskSelectionModal.tsx`
- `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx`
- `frontend/src/components/ExperimentWorker/TaskActionButtons.tsx`
- `frontend/src/components/ExperimentWorker/TaskListTable.tsx`
- `frontend/src/components/ExperimentWorker/TaskSelectionDialog.tsx`
- `frontend/src/components/editorv2/TemplateEditorDialog.tsx`
- `frontend/src/components/progress/WorkProgressDetailDialog.tsx`
- `frontend/src/components/project/InstructionEditDialog.tsx`
- `frontend/src/components/project/ProjectManagement.tsx`
- `frontend/src/components/project/TaskResultsTable.tsx`
- `frontend/src/constants/__tests__/codeMaster.test.ts`
- `frontend/src/constants/codeMaster.ts`
- `frontend/src/hooks/useInstructions.ts`
- `frontend/src/locales/en.json`
- `frontend/src/locales/ja.json`
- `frontend/src/services/issueApiService.ts`
- `frontend/src/services/projectApiService.ts`
- `frontend/src/types/experimentWorker.ts`
- `frontend/src/types/progress.ts`
- `frontend/src/types/project.ts`
- `frontend/src/utils/templateToXML.ts`
- `package.json`
- `scripts/check-i18n-keys.js`

### 削除 (3 件)
- `backend/src/utils/maimlAnalyzer.ts`
- `docs/design/infrastructure/production-verification-architecture.drawio`
- `scripts/alchemia-staging/sync-to-staging.ps1`

### リネーム (11 件)
- `docs/design/infrastructure/production-architecture-simple.drawio` → `docs/design/infrastructure/production-aws-architecture-simple.drawio`
- `docs/design/infrastructure/production-architecture.drawio` → `docs/design/infrastructure/production-aws-architecture.drawio`
- `docs/design/infrastructure/production-architecture.md` → `docs/design/infrastructure/production-aws-architecture.md`
- `scripts/alchemia-staging/deploy.ecr.phase1.sh` → `scripts/alchemia-staging/old/deploy.ecr.phase1.sh`
- `scripts/alchemia-staging/deploy.ecr.sh` → `scripts/alchemia-staging/old/deploy.ecr.sh`
- `scripts/build-and-export.sh` → `scripts/deploy-onprem/build-and-export.sh`
- `scripts/install-docker.sh` → `scripts/deploy-onprem/install-docker.sh`
- `scripts/package-for-deploy.js` → `scripts/deploy-onprem/package-for-deploy.js`
- `scripts/package-for-deploy.sh` → `scripts/deploy-onprem/package-for-deploy.sh`
- `scripts/start-onprem.sh` → `scripts/deploy-onprem/start-onprem.sh`
- `scripts/alchemia-staging/dump-dev-schema.sh` → `scripts/dump-dev-schema.sh`

---

## サマリー

| 種別 | 件数 |
|------|------|
| 追加 | 10 |
| 更新 | 44 |
| 削除 | 3 |
| リネーム | 11 |
| **合計** | **68** |

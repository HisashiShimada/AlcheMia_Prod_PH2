# ドライラン結果

- **実行日時**: 2026-06-04 08:34:31
- **リリースタグ**: `release_20260603_v00.00.10`
- **FROM_COMMIT**: `78ced1fc`
- **TO_COMMIT**: `7eb7fb91`
- **SRC_REPO**: `/home/ssv/projects/mmdpf`

---

## 差分ファイル一覧

### 追加 (3 件)
- `docs/design/infrastructure/production-onprem-architecture.drawio`
- `docs/design/infrastructure/staging-architecture-simple.drawio`
- `scripts/README.md`

### 更新 (39 件)
- `backend/package-lock.json`
- `backend/src/enums/codeMaster.enum.ts`
- `backend/src/repositories/eventLogRepository.ts`
- `backend/src/repositories/instructionRepository.ts`
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
- `docs/design/infrastructure/staging-architecture.drawio`
- `frontend/next-env.d.ts`
- `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`
- `frontend/src/components/ExperimentWorker/InstructionConfirmationModal.tsx`
- `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx`
- `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx`
- `frontend/src/components/ExperimentWorker/MethodTaskSelectionModal.tsx`
- `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx`
- `frontend/src/components/ExperimentWorker/TaskActionButtons.tsx`
- `frontend/src/components/ExperimentWorker/TaskListTable.tsx`
- `frontend/src/components/ExperimentWorker/TaskSelectionDialog.tsx`
- `frontend/src/components/progress/WorkProgressDetailDialog.tsx`
- `frontend/src/components/project/InstructionEditDialog.tsx`
- `frontend/src/components/project/ProjectManagement.tsx`
- `frontend/src/components/project/TaskResultsTable.tsx`
- `frontend/src/constants/__tests__/codeMaster.test.ts`
- `frontend/src/constants/codeMaster.ts`
- `frontend/src/hooks/useInstructions.ts`
- `frontend/src/services/issueApiService.ts`
- `frontend/src/services/projectApiService.ts`
- `frontend/src/types/experimentWorker.ts`
- `frontend/src/types/progress.ts`
- `frontend/src/types/project.ts`
- `package.json`

### 削除 (2 件)
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
| 追加 | 3 |
| 更新 | 39 |
| 削除 | 2 |
| リネーム | 11 |
| **合計** | **55** |

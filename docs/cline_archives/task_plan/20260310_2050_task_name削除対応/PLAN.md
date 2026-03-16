# タスク計画書: project_task.task_name削除対応

## メタデータ
- **作成日時**: 2026-03-10 20:50
- **タスクID**: task_name削除対応
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要
project_taskテーブルからtask_nameカラムが削除された。
フロントエンドでメソッド名として表示・使用していたtask_nameを、
method_id（project_task.method_id）に置き換える。

## 実装ステップ

### Phase 1: バックエンド修正
- [ ] `backend/src/types/progress.ts` - task_name フィールド削除
- [ ] `backend/src/types/api.ts` - taskName フィールド削除
- [ ] `backend/src/controllers/projectController.ts` - task_name参照削除
- [ ] `backend/src/repositories/projectTaskDetailRepository.ts` - taskName削除
- [ ] `backend/src/services/progressService.ts` - task_name→method_id使用

### Phase 2: フロントエンド修正
- [ ] `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` - taskName→methodId
- [ ] `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` - taskName→methodId
- [ ] `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` - taskName→methodId
- [ ] `frontend/src/components/ExperimentWorker/MethodTaskSelector.tsx` - taskName→methodId
- [ ] `frontend/src/components/ExperimentWorker/MethodTaskSelectionModal.tsx` - taskName→methodId
- [ ] `frontend/src/components/ExperimentWorker/InstructionGroup.tsx` - taskName→methodId
- [ ] `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` - taskName→methodId
- [ ] `frontend/src/components/ExperimentWorker/IssueReportModal.tsx` - taskName→methodId

## 変更ファイル
1. `backend/src/types/progress.ts` - task_name削除
2. `backend/src/types/api.ts` - taskName削除
3. `backend/src/controllers/projectController.ts` - task_name参照削除
4. `backend/src/repositories/projectTaskDetailRepository.ts` - taskName削除
5. `backend/src/services/progressService.ts` - task_name→method_id使用
6. `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` - taskName→methodId
7. `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` - taskName→methodId
8. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` - taskName→methodId
9. `frontend/src/components/ExperimentWorker/MethodTaskSelector.tsx` - taskName→methodId
10. `frontend/src/components/ExperimentWorker/MethodTaskSelectionModal.tsx` - taskName→methodId
11. `frontend/src/components/ExperimentWorker/InstructionGroup.tsx` - taskName→methodId
12. `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` - taskName→methodId
13. `frontend/src/components/ExperimentWorker/IssueReportModal.tsx` - taskName→methodId

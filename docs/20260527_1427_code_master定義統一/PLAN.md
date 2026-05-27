# タスク計画書: code_master定義統一（eNum/DB一元化）

## メタデータ
- **作成日時**: 2026-05-27 14:27
- **タスクID**: code_master_unify
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要

code_masterのコード値定義が複数箇所に重複・分散しているため、以下の2か所に一元化する。

- **バックエンド**: `backend/src/enums/codeMaster.enum.ts`（正規Enum）
- **フロントエンド**: `frontend/src/constants/codeMaster.ts`（正規定数）
- **DB**: `backend/src/sql/queries/codeMaster/insertInitialData.sql`（正規初期データ）

上記以外の重複定義（文字列ユニオン型等）をすべて削除し、正規定義のみを参照するよう修正する。

## 重複定義の全体マップ

### バックエンド削除対象

| ファイル | 削除する定義 | 移行先 |
|---|---|---|
| `backend/src/types/taskService.types.ts` | `TaskStatus`（文字列ユニオン型） | `TaskStatusEnumType`（codeMaster.enum.ts） |

### フロントエンド削除対象

| ファイル | 削除する定義 | 移行先 |
|---|---|---|
| `frontend/src/types/experimentWorker.ts` | `ProjectStatus`（文字列ユニオン型） | `ProjectStatusType`（constants/codeMaster.ts）数値 |
| `frontend/src/types/experimentWorker.ts` | `TaskStatus`（文字列ユニオン型） | `TaskStatusType`（constants/codeMaster.ts）数値 |
| `frontend/src/types/experimentWorker.ts` | `IssueType = number`（number型エイリアス） | `IssueTypeType`（constants/codeMaster.ts） |
| `frontend/src/types/progress.ts` | `ProjectStatus`（文字列ユニオン型） | `ProjectStatusType`（constants/codeMaster.ts）数値 |
| `frontend/src/types/progress.ts` | `TaskStatus`（文字列ユニオン型） | `TaskStatusType`（constants/codeMaster.ts）数値 |
| `frontend/src/types/progress.ts` | `CheckoutStatus`インターフェース | `CheckoutStatusInfo`にリネーム（名前衝突回避） |
| `frontend/src/types/project.ts` | `TaskStatus`（文字列ユニオン型） | `TaskStatusType`（constants/codeMaster.ts）数値 |

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] PLAN.md作成

### Phase 2: バックエンド型定義整理
- [ ] `backend/src/types/taskService.types.ts` の `TaskStatus` 文字列型を `TaskStatusEnumType` に変更

### Phase 3: フロントエンド型定義整理
- [ ] `frontend/src/types/experimentWorker.ts` から重複型定義を削除・置換
- [ ] `frontend/src/types/progress.ts` から重複型定義を削除・`CheckoutStatus` → `CheckoutStatusInfo` リネーム
- [ ] `frontend/src/types/project.ts` から `TaskStatus` 文字列型を削除

### Phase 4: コンポーネント・サービス参照修正
- [ ] `ExperimentRecordTab.tsx`：`mapNumericStatusToProjectStatus()` 関数削除・数値直接参照
- [ ] `TaskListTable.tsx`：TaskStatus参照変更
- [ ] `MethodTaskSelectionModal.tsx`：TaskStatus参照変更
- [ ] `ProgressMonitoring.tsx`：ProjectStatus参照変更
- [ ] `ProgressCheckTab.tsx`：TaskStatus参照変更
- [ ] 各コンポーネントのimport修正（experimentWorker.ts から constants/codeMaster.ts へ）
- [ ] `progress.ts` の `CheckoutStatus` → `CheckoutStatusInfo` リネームに伴う参照修正

### Phase 5: テスト修正・追加
- [ ] `backend/tests/types/progress.test.ts` 修正
- [ ] 既存のtaskService系テストの型参照確認・修正
- [ ] `backend/tests/types/taskService.types.test.ts` 新規作成

## 変更ファイル一覧

### 修正ファイル
1. `backend/src/types/taskService.types.ts`
2. `frontend/src/types/experimentWorker.ts`
3. `frontend/src/types/progress.ts`
4. `frontend/src/types/project.ts`
5. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`
6. `frontend/src/components/ExperimentWorker/TaskListTable.tsx`
7. `frontend/src/components/ExperimentWorker/MethodTaskSelectionModal.tsx`
8. `frontend/src/components/progress/ProgressMonitoring.tsx`
9. `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx`
10. `frontend/src/components/ExperimentWorker/ProgressCheckTable.tsx`
11. `frontend/src/components/ExperimentWorker/InstructionCard.tsx`
12. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`
13. `frontend/src/components/ExperimentWorker/InstructionConfirmationModal.tsx`
14. `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx`
15. `frontend/src/components/ExperimentWorker/InstructionGroup.tsx`
16. `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx`
17. `frontend/src/components/ExperimentWorker/TransitionList.tsx`

### 新規作成
1. `backend/tests/types/taskService.types.test.ts`

## 承認記録
- **計画書提示日時**: 2026-05-27 14:27
- **承認日時**: 2026-05-27 14:27
- **承認者コメント**: 実装・テストも含めて実施

# リリースノート

**リリース日**: 2026-06-03  
**対象ブランチ**: main  
**前回リリースコミット**: `78ced1fc`  
**今回リリースコミット**: `7eb7fb91`

---

## 新機能・改善

### 1. instruction_target / target_type カラム削除対応（AISOLMAIML-244）

- **DBカラム削除**: `instructions` テーブルから `instruction_target` および `target_type` カラムを削除
- **バックエンド対応**:
  - `projectInstructionService.ts` : `instruction_target` / `target_type` 参照を除去
  - `projectService.ts` : 同カラム参照を除去
  - `eventLogRepository.ts` : 同カラム参照を除去
  - SQL クエリ（`batchInsert.sql` / `findById.sql` / `findByProject.sql` / `findWorkerInstructions.sql`）: 同カラム参照を除去
  - `instructionTargetUtils.ts` : 不要となったため削除
  - `codeMaster.enum.ts` : `InstructionTarget` / `TargetType` の enum 定義を削除
  - `database.ts` / `instruction.ts` : 対応する型定義を削除
- **フロントエンド対応**:
  - `InstructionEditDialog.tsx` : `instruction_target` / `target_type` 関連 UI を削除
  - `InstructionConfirmationModal.tsx` : 同カラム参照を除去し、表示ロジックを修正
  - `InstructionConfirmationTab.tsx` : 同カラム参照を除去
  - `useInstructions.ts` : `instruction_target` / `target_type` 取得・管理処理を除去
  - `projectApiService.ts` : 対応する API 呼び出し処理を整理
  - `codeMaster.ts` : `InstructionTarget` / `TargetType` の定数定義を削除
  - `codeMaster.test.ts` : 対応するテストケースを削除
  - `experimentWorker.ts` / `project.ts` : 対応する型定義を削除

### 2. code_master DB・enum 定義統一対応

- **バックエンド・フロントエンド間の定義統一**: `codeMaster.enum.ts`（バックエンド）と `codeMaster.ts`（フロントエンド）の定義を統一
- **フロントエンド各コンポーネントの追従**:
  - `ExperimentRecordTab.tsx` / `IssueManagementModal.tsx` / `MethodTaskSelectionModal.tsx` / `ProgressCheckTab.tsx` / `TaskActionButtons.tsx` / `TaskListTable.tsx` / `TaskSelectionDialog.tsx`
  - `WorkProgressDetailDialog.tsx` / `ProjectManagement.tsx` / `TaskResultsTable.tsx`
  - `issueApiService.ts` / `experimentWorker.ts` / `progress.ts` / `project.ts`
- **code_master 初期データ修正**: `insertInitialData.sql` から `instruction_target` 区分の不要項目を削除

### 3. タスク指示のトランジションID必須解除

- タスク指示において `transition_id` を必須項目から任意項目に変更
- `eventLogRepository.ts` : `transition_id` を nullable で処理するよう修正
- `useInstructions.ts` : `transition_id` のバリデーションを任意に変更

---

## バグ修正

### 1. backend/package-lock.json の差分修正

- `backend/package-lock.json` に意図しない差分が含まれていたため、前回状態に戻した

---

## ドキュメント・ツール

### 1. システム構成図の追加・修正

- **オンプレ版システム構成図を新規作成**: `docs/design/infrastructure/onprem-architecture.drawio`
- **AWS 検証環境シンプル構成図を新規作成**: `docs/design/infrastructure/staging-architecture-simple.drawio`
- **AWS 検証環境シンプル構成図を修正**: レイアウト・内容を更新

### 2. デプロイスクリプト整理

- **オンプレ版スクリプトをディレクトリ移動**: `scripts/` 直下 → `scripts/deploy-onprem/` へ移動
  - `build-and-export.sh` / `install-docker.sh` / `package-for-deploy.js` / `package-for-deploy.sh` / `start-onprem.sh`
- **不要スクリプトを削除・退避**:
  - `scripts/alchemia-staging/sync-to-staging.ps1` を削除
  - `scripts/alchemia-staging/deploy.ecr.phase1.sh` / `deploy.ecr.sh` を `old/` フォルダへ退避
- **`scripts/README.md` を新規作成**: 各スクリプトの用途・使用方法を記載

---

## DB マイグレーション

| ファイル | 内容 |
|---------|------|
| （マイグレーションファイル） | `instructions` テーブルから `instruction_target` および `target_type` カラムを削除 |

---

## 主な変更ファイル（抜粋）

### バックエンド

| ファイル | 変更概要 |
|---------|---------|
| `backend/src/services/projectInstructionService.ts` | `instruction_target` / `target_type` 参照を除去 |
| `backend/src/services/projectService.ts` | `instruction_target` / `target_type` 参照を除去 |
| `backend/src/repositories/eventLogRepository.ts` | `instruction_target` / `target_type` 参照を除去、`transition_id` 任意化 |
| `backend/src/enums/codeMaster.enum.ts` | `InstructionTarget` / `TargetType` の enum 定義を削除 |
| `backend/src/utils/instructionTargetUtils.ts` | 削除 |
| `backend/src/sql/queries/instructions/batchInsert.sql` | `instruction_target` / `target_type` カラムを除去 |
| `backend/src/sql/queries/codeMaster/insertInitialData.sql` | 不要項目の削除 |
| `backend/src/types/database.ts` | 対応する型定義を削除 |
| `backend/src/types/instruction.ts` | 対応する型定義を削除 |
| `backend/src/types/taskService.types.ts` | code_master 定義統一に伴う型修正 |

### フロントエンド

| ファイル | 変更概要 |
|---------|---------|
| `frontend/src/constants/codeMaster.ts` | `InstructionTarget` / `TargetType` の定数定義を削除 |
| `frontend/src/hooks/useInstructions.ts` | `instruction_target` 取得・管理処理を除去、`transition_id` 任意化 |
| `frontend/src/services/projectApiService.ts` | `instruction_target` 関連 API 処理を整理 |
| `frontend/src/components/project/InstructionEditDialog.tsx` | `instruction_target` / `target_type` 関連 UI を削除 |
| `frontend/src/components/ExperimentWorker/InstructionConfirmationModal.tsx` | `instruction_target` 参照を除去し表示ロジック修正 |
| `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` | `instruction_target` 参照を除去 |
| `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | code_master 定義統一に追従 |
| `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | code_master 定義統一に追従 |
| `frontend/src/components/ExperimentWorker/TaskListTable.tsx` | code_master 定義統一に追従 |
| `frontend/src/components/progress/WorkProgressDetailDialog.tsx` | code_master 定義統一に追従 |
| `frontend/src/types/experimentWorker.ts` | 対応する型定義を削除・統一 |
| `frontend/src/types/project.ts` | 対応する型定義を削除 |
| `frontend/src/types/progress.ts` | code_master 定義統一に伴う型修正 |
| `frontend/src/constants/__tests__/codeMaster.test.ts` | 対応するテストケースを削除 |

### ドキュメント・スクリプト

| ファイル | 変更概要 |
|---------|---------|
| `docs/design/infrastructure/onprem-architecture.drawio`（新規） | オンプレ版システム構成図 |
| `docs/design/infrastructure/staging-architecture-simple.drawio`（新規・修正） | AWS 検証環境シンプル構成図 |
| `scripts/README.md`（新規） | スクリプト用途・使用方法の説明 |
| `scripts/deploy-onprem/`（新規ディレクトリ） | オンプレ版デプロイスクリプト一式 |

# タスク計画書: project_instruction.instruction_targetカラム削除

## メタデータ
- **作成日時**: 2026-05-27 15:24
- **タスクID**: instruction_target_column_removal
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

`project_instruction` テーブルの `instruction_target` カラムを削除する。
このカラムの値（0=ファイル全体, 1=メソッド, 2=トランジション, 3=タスク）は、
同テーブルの `method_id`, `task_no`, `transition_id` カラムの値から動的に導出可能なため冗長。

指示送信ボタンの処理（`saveInstruction()` の既存ロジック）と同様のルールで判定する：
- `task_no` が非NULLかつ非空 → **3: タスク**
- `transition_id` が非NULLかつ非空 → **2: トランジション**
- `method_id` が非NULLかつ非空 → **1: メソッド**
- いずれも空/NULL → **0: ファイル全体**

## 目的と期待される成果

- [ ] `instruction_target` カラムをDBから削除
- [ ] カラム参照箇所をすべて `deriveInstructionTarget()` ヘルパーに置き換え
- [ ] 型定義・SQLクエリ・サービス層・フロントエンドから `instruction_target` 参照を除去

## 実装ステップ

### Phase 1: ヘルパー関数の作成
- [ ] `backend/src/utils/instructionTargetUtils.ts` を新規作成
  - `deriveInstructionTarget(methodId, taskNo, transitionId)` 関数を定義

### Phase 2: バックエンド修正
- [ ] `backend/src/types/database.ts` — `ProjectInstruction.instruction_target` を削除
- [ ] `backend/src/types/instruction.ts` — `Instruction.instruction_target` を削除
- [ ] `backend/src/repositories/instructionRepository.ts` — `InstructionRow.instruction_target` を削除
- [ ] `backend/src/sql/queries/instructions/findById.sql` — `instruction_target` を SELECT から除去
- [ ] `backend/src/sql/queries/instructions/findByProject.sql` — `instruction_target as target_type` を除去
- [ ] `backend/src/sql/queries/instructions/findWorkerInstructions.sql` — `pi.instruction_target` を除去
- [ ] `backend/src/sql/queries/instructions/batchInsert.sql` — `instruction_target` と `$5` を除去、後続パラメータ番号を繰り上げ
- [ ] `backend/src/repositories/instructionRepository.ts` — `batchInsert()` の `client.query()` パラメータ修正
- [ ] `backend/src/services/projectInstructionService.ts` — `instruction_target` のセット削除、`sendInstructions()` の参照を `deriveInstructionTarget()` に置き換え
- [ ] `backend/src/services/projectService.ts` — `instruction_target` 参照を `deriveInstructionTarget()` に置き換え

### Phase 3: フロントエンド修正
- [ ] `frontend/src/types/project.ts` — `WorkerInstruction.instruction_target` を削除
- [ ] `frontend/src/services/projectApiService.ts` — `convertApiToInstruction()` を `method_id`, `task_no`, `transition_id` から `targetType` を導出するよう変更
- [ ] `frontend/src/types/instructionRegistration.ts` — `targetType` フィールド確認・修正

### Phase 4: DBマイグレーション
- [ ] `backend/migrations/` に `DROP COLUMN instruction_target` マイグレーションSQLを追加

## 変更ファイル一覧

### 新規作成
1. `backend/src/utils/instructionTargetUtils.ts` — ヘルパー関数
2. `backend/migrations/YYYYMMDD_drop_instruction_target.sql` — DBマイグレーション

### 修正
1. `backend/src/types/database.ts`
2. `backend/src/types/instruction.ts`
3. `backend/src/repositories/instructionRepository.ts`
4. `backend/src/sql/queries/instructions/findById.sql`
5. `backend/src/sql/queries/instructions/findByProject.sql`
6. `backend/src/sql/queries/instructions/findWorkerInstructions.sql`
7. `backend/src/sql/queries/instructions/batchInsert.sql`
8. `backend/src/services/projectInstructionService.ts`
9. `backend/src/services/projectService.ts`
10. `frontend/src/types/project.ts`
11. `frontend/src/services/projectApiService.ts`
12. `frontend/src/types/instructionRegistration.ts`

## リスク

| リスク | 対策 |
|--------|------|
| `batchInsert.sql` のパラメータ番号ずれ | 修正後に呼び出し元コードと照合確認 |
| `InstructionFullRow.target_type` に依存するコードの見落とし | search_files で全参照を確認 |

## 承認記録
- **計画書提示日時**: 2026-05-27 15:24
- **承認日時**: 

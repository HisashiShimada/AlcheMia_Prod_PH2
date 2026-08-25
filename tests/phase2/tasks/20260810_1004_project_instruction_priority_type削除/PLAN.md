# タスク計画書: project_instruction テーブルの priority・type カラム削除

## メタデータ

- **作成日時**: 2026-08-10 10:04
- **タスクID**: 20260810_1004
- **優先度**: 中
- **推定工数**: 実施済み（後追いドキュメント）

---

## 1. タスク概要

`docs/design/db/ddl/project_instruction.sql` のテーブル定義から `priority`（優先度）・`type`（タイプ）カラムが削除され、DB環境への反映も完了済みであるため、ソースコード内に残存している両カラムへの参照をすべて削除する。

---

## 2. 目的と期待される成果

- [x] DBスキーマとソースコードの整合性を維持する
- [x] TypeScript 型定義から `priority`・`type` フィールドを削除する
- [x] SQL クエリから両カラムへの参照を削除する
- [x] バックエンド・フロントエンドのビルドエラーが発生しない状態を保つ
- [x] 既存テストが通る状態を維持する

---

## 3. 背景・削除対象カラム

| カラム | 型 | 旧用途 |
|--------|----|--------|
| `priority` | `numeric(2,0)` | 優先度（0=低, 1=通常, 2=中, 3=高） |
| `type` | `numeric(2,0)` | タイプ（0=一般, 1=セットアップ, 2=測定, 3=安全, 4=清掃） |

DB 環境には既に反映済み。`docs/design/db/ddl/project_instruction.sql`（現行 DDL）にも両カラムは存在しない。

---

## 4. 影響範囲分析

### 4-1. バックエンド（ソース）

| ファイル | 変更内容 |
|---|---|
| `backend/src/types/database.ts` | `ProjectInstruction` から `priority`・`type` フィールドを削除 |
| `backend/src/types/api.ts` | `SaveInstructionRequest`・`UpdateInstructionRequest`・`InstructionData` から削除 |
| `backend/src/types/taskRegistration.ts` | `InstructionInsertData` から削除 |
| `backend/src/types/instruction.ts` | `Priority` enum・`InstructionType` enum を削除。`InstructionInput`・`Instruction` から削除 |
| `backend/src/sql/queries/instructions/batchInsert.sql` | INSERT 列から削除。プレースホルダーを `$14`→`$12` に再番号 |
| `backend/src/sql/queries/instructions/findWorkerInstructions.sql` | SELECT 列から `pi.priority`・`pi.type` を削除 |
| `backend/src/repositories/instructionRepository.ts` | `InstructionFullRow` から削除。`batchInsert` の引数から削除 |
| `backend/src/repositories/eventLogRepository.ts` | `InstructionSentLogParams` から削除。不要 `findByDivision` import 削除。code_master ラベルマップ取得処理を削除。`buildInstructionSentLogJson` から `priority`・`type` の property エントリを削除 |
| `backend/src/services/projectInstructionService.ts` | マッピング・DB生成・ログ呼び出しから削除 |
| `backend/src/services/projectService.ts` | `getWorkerInstructions` レスポンスマッピングから削除 |

### 4-2. バックエンド（テスト）

| ファイル | 変更内容 |
|---|---|
| `backend/tests/types/instruction.test.ts` | `Priority`・`InstructionType` の import とテストを削除。`priority`・`type` フィールドのテストを削除 |
| `backend/tests/integration/workerInstructions.integration.test.ts` | 3 か所の INSERT 文から `priority`・`type`（および旧列名 `id`・`instruction_target`・`created_by`）を削除し、現行 DDL 準拠の列名（`experiment_instruction_id`・`create_user_id`）へ修正。`expect` のプロパティ検証から削除 |

### 4-3. フロントエンド

| ファイル | 変更内容 |
|---|---|
| `frontend/src/types/api.ts` | `SaveInstructionRequest`・`UpdateInstructionRequest` から削除 |
| `frontend/src/types/taskRegistration.ts` | `InstructionSaveItem` から削除 |
| `frontend/src/types/instructionRegistration.ts` | `InstructionData` から削除 |
| `frontend/src/types/project.ts` | `WorkerInstruction` から削除 |
| `frontend/src/types/experimentWorker.ts` | `Priority` 型・`InstructionType` 型を削除。`Instruction` から `priority`・`instructionType` フィールドを削除 |
| `frontend/src/hooks/useInstructions.ts` | 不要 import 削除。`priorityMap`・`instructionTypeMap` 変換ロジック削除。priority ソート処理を削除 |
| `frontend/src/components/ExperimentWorker/InstructionConfirmationModal.tsx` | 不要 import 削除。同変換ロジック削除 |
| `frontend/src/components/ExperimentWorker/InstructionCard.tsx` | 優先度タグ・タイプタグ JSX 削除。`getPriorityColor`・`getPriorityLabel`・`getTypeLabel` import 削除。`borderLeft`・`backgroundColor` スタイル削除 |
| `frontend/src/components/project/InstructionRegistrationTab.tsx` | API 呼び出しから `priority`・`type` 削除 |
| `frontend/src/components/project/TaskRegistrationTab.tsx` | `instructionSaveItems` マッピングから削除 |
| `frontend/src/components/project/InstructionEditDialog.tsx` | `InstructionTypeCode`・`InstructionPriority` import 削除。`InstructionData` 生成から削除 |
| `frontend/src/services/projectApiService.ts` | 不要 import 削除。JSDoc コメント内の例示から削除 |
| `frontend/src/utils/instructionHelpers.ts` | `getPriorityColor`・`getPriorityLabel`・`getTypeLabel` 関数を削除（`formatRelativeTime` のみ残す） |

---

## 5. 実装ステップ

- [x] バックエンド型定義の修正
- [x] SQL クエリの修正
- [x] Repository 層の修正
- [x] Service 層の修正
- [x] フロントエンド型定義の修正
- [x] フロントエンドロジックの修正
- [x] テストの修正
- [x] ビルド確認（バックエンド `tsc --noEmit` エラーなし）
- [x] テスト実行確認（`tests/types/instruction.test.ts` 全テスト合格）

---

## 6. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `priority`・`type` を参照する未検出箇所が残存する | 中 | TypeScript コンパイルエラーで検出・修正済み |
| 統合テストの INSERT 文が旧 DDL 列名を使っていた | 高 | 現行 DDL 準拠の列名へ修正済み |
| `batchInsert.sql` のプレースホルダー番号ずれ | 高 | `$14`→`$12` へ正しく再番号済み |

---

## 7. 検証結果

### バックエンド TypeScript コンパイル

```
cd backend && npx tsc --noEmit
→ EXIT:0（エラーなし）
```

### バックエンドテスト

```
npx jest tests/types/instruction.test.ts --no-coverage
→ EXIT:0（全テスト合格）
```

### フロントエンド TypeScript コンパイル

```
cd frontend && npx tsc --noEmit
→ 今回の変更に起因するエラーなし
  （残存エラーはすべて今回の変更とは無関係な既存問題）
```

---

## 8. 承認記録

- **計画書作成日時**: 2026-08-10 10:04（後追い作成）
- **実施日時**: 2026-08-10 午前（実施後に後追い記録として作成）

## 9. 関連ドキュメント

- [project_instruction DDL](../../../design/db/ddl/project_instruction.sql)
- [DB構造概要](../../../../.cline/skills/backend-develop-skill/docs/db_structure.md)

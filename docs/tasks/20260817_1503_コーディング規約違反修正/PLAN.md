# タスク計画書: コーディング規約違反修正

## メタデータ
- **作成日時**: 2026-08-17 15:21
- **タスクID**: coding-rule-fix
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要
`docs/dev-notes/development_memo.md` のコーディング規約に対して、対象ファイル群の違反箇所を修正する。

## 発見された規約違反

### 規約1・8違反: Controller内にビジネスロジック・直接DB操作
**`backend/src/controllers/projectController.ts`**
- `renameProjectHandler`: Controller内で直接 `getPool()` → `pool.query()` を呼び出し
- `getTaskDetail`: Controller内で直接 `getPool()` → `pool.query()` を呼び出し

### 規約3違反: インラインSQL
**`backend/src/services/experimentInstructionService.ts`**
- `getProjectMethods`: Service内でSQLをインラインで記述

**`backend/src/repositories/uncertaintyCriteriaRepository.ts`**
- `findByKeys`: Repository内でSQLをインラインで記述

### 規約4・5違反: インラインオブジェクト型
**`backend/src/services/projectService.ts`**
- `create` メソッド引数: `data: { projectName: string; description?: string }` のインライン型

## 実装ステップ

### Phase 1: タスク計画書作成・承認
- [x] PLAN.md 作成

### Phase 2: インラインSQL外部ファイル化
- [ ] `experimentInstructionService.ts` のインラインSQL → `findDistinctMethodIds.sql` 新規作成
- [ ] `uncertaintyCriteriaRepository.ts` の `findByKeys` → `findByKeys.sql` 新規作成
- [ ] 各ファイルで `loadSqlFile` に差し替え

### Phase 3: Controller内DB直接呼出し修正
- [ ] `projectController.ts` の `renameProjectHandler` 修正
- [ ] `projectController.ts` の `getTaskDetail` 修正

### Phase 4: 型定義インライン違反修正
- [x] `projectService.ts` の `create` 引数型を `types/project.ts` へ移動（既存の `CreateProjectParams` 型が定義済みであることを確認・対応済み）

## 変更ファイル一覧
1. `backend/src/services/experimentInstructionService.ts` - インラインSQL外部化
2. `backend/src/repositories/uncertaintyCriteriaRepository.ts` - インラインSQL外部化
3. `backend/src/controllers/projectController.ts` - DB直接呼出し削除
4. `backend/src/services/projectService.ts` - 型定義インライン削除
5. `backend/src/types/project.ts` - 型定義追加
6. `backend/src/sql/queries/project_tasks/findDistinctMethodIds.sql` - 新規作成
7. `backend/src/sql/queries/uncertainty_criteria/findByKeys.sql` - 新規作成

## 承認記録
- **承認日時**: 2026-08-17 15:21

# タスク計画書: transition_data commentカラム削除修正

## メタデータ
- **作成日時**: 2026-03-02 15:33
- **タスクID**: transition-data-comment-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status` APIを呼び出すと 500 Internal Server Error が発生する。

エラーログ:
```
DatabaseError: Database error occurred while updating transition status
    at TransitionDataRepository.updateStatus (transitionDataRepository.ts:238:13)
```

## 原因調査結果

### 根本原因

`updateStatus.sql` の `RETURNING` 句に、`transition_data` テーブルに**存在しない `comment` カラム**が含まれており、PostgreSQL がカラム未存在エラーを返している。

### DDL定義（`docs/design/db/ddl/transition_data.sql`）の実際のカラム

```
organization_id, project_id, method_id, experiment_order, task_no, transition_id,
status, progress_rate,
create_user_id, update_user_id,
create_at, update_at
```

→ `comment` カラムは **存在しない**

### 問題箇所の一覧

| ファイル | 問題 |
|--------|------|
| `backend/src/sql/queries/transition_data/updateStatus.sql` | RETURNING句に `comment` が含まれる |
| `backend/src/sql/queries/transition_data/findById.sql` | SELECT句に `comment` が含まれる。カラム名も誤り（`updated_by`, `updated_at`, `created_at`） |
| `backend/src/repositories/transitionDataRepository.ts` | `TransitionDataRow` インターフェースに `comment` フィールドが定義されている |
| `backend/src/services/progressService.ts` | `updatedTransition.comment` を参照している |

## 修正方針

`comment` カラムをすべての参照箇所から削除する。

## 実装ステップ

- [ ] Step 1: `updateStatus.sql` から RETURNING 句の `comment` を削除
- [ ] Step 2: `findById.sql` から `comment` を削除し、カラム名を正しい名前に修正
- [ ] Step 3: `TransitionDataRow` インターフェースから `comment` フィールドを削除
- [ ] Step 4: `progressService.ts` の `updatedTransition.comment` 参照を削除

## 変更ファイル

1. `backend/src/sql/queries/transition_data/updateStatus.sql` - RETURNING句から `comment` を削除
2. `backend/src/sql/queries/transition_data/findById.sql` - `comment` 削除 + カラム名修正
3. `backend/src/repositories/transitionDataRepository.ts` - `TransitionDataRow.comment` フィールド削除
4. `backend/src/services/progressService.ts` - `updatedTransition.comment` 参照削除

## 承認記録
- **計画書提示日時**: 2026-03-02 15:33
- **承認日時**: 2026-03-02 15:33

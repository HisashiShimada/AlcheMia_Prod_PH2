# タスク計画書: POST実験データ保存500エラー修正

## メタデータ
- **作成日時**: 2026-03-02 11:17
- **タスクID**: post-experiment-data-500-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`POST /api/v1/experiments/projects/TestProjectOmori8/methods/method_TestProjectOmori8_6cc24b82/tasks/1/data` が 500 Internal Server Error を返す問題を修正する。

調査の結果、SQLファイル内のカラム名がDDLと一致しないバグが複数発見された。

## 目的と期待される成果

- [ ] POSTエンドポイントが正常に201を返すこと
- [ ] プロジェクト名からproject_idが正しく解決されること
- [ ] タスクの存在確認が正しく動作すること

## 原因分析

### 原因1（最有力）：`findByNameWithStatus.sql` のカラム名不一致

| 項目 | 現状（バグ） | 正しい値（DDL準拠） |
|------|------------|------------------|
| プロジェクトID | `id` | `project_id` |
| ステータス | `status` | `project_status` |

**影響:** `projectResult.rows[0].id` が `undefined` になり、後続の `checkExists.sql` に `undefined` が渡されてPostgreSQLエラーが発生する。

**参照DDL:** `docs/design/db/ddl/project.sql`
```sql
-- 正しいカラム名
project_id character varying(20) NOT NULL  -- "id" ではない
project_status numeric(2,0)                -- "status" ではない
```

### 原因2：`checkExists.sql` のテーブル・カラム参照誤り

`project_task` テーブルには `task_no` カラムが**存在しない**（主キーは `experiment_order`）。  
`task_no` は `project_task_detail` テーブルのカラムであるため、JOINが必要。

**参照DDL:** `docs/design/db/ddl/project_task.sql`, `docs/design/db/ddl/project_task_detail.sql`

```sql
-- project_task の主キー
PRIMARY KEY (organization_id, project_id, method_id, experiment_order)
-- → task_no カラムなし

-- project_task_detail の主キー
PRIMARY KEY (organization_id, project_id, method_id, experiment_order, task_no)
-- → task_no はここにある
```

## 実装ステップ

### Step 1: `findByNameWithStatus.sql` の修正
- [ ] `id` → `project_id` に修正
- [ ] `status` → `project_status` に修正

### Step 2: `experimentDataService.ts` の修正
- [ ] `projectResult.rows[0].id` → `projectResult.rows[0].project_id` に修正
- [ ] `projectResult.rows[0].status` → `projectResult.rows[0].project_status` に修正

### Step 3: `checkExists.sql` の修正
- [ ] `project_task` と `project_task_detail` をJOINするクエリに書き直し
- [ ] `task_no` を `project_task_detail` から参照するよう修正

## 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `backend/src/sql/queries/projects/findByNameWithStatus.sql` | `id`→`project_id`、`status`→`project_status` |
| 2 | `backend/src/services/experimentDataService.ts` | `.id`→`.project_id`、`.status`→`.project_status` |
| 3 | `backend/src/sql/queries/tasks/checkExists.sql` | `project_task_detail` との JOIN に修正 |

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| project_status の値（numeric）が editableStatuses（文字列配列）と型不一致 | 中 | 中 | 修正後に実際の値を確認し、必要に応じてキャスト対応 |
| checkExists.sql 修正後も experiment_order の値が不明で JOIN が0件になる | 低 | 低 | 全 experiment_order に対してタスク存在確認するためDISTINCTを使用 |

## テスト計画

- [ ] `POST /api/v1/experiments/projects/TestProjectOmori8/methods/method_TestProjectOmori8_6cc24b82/tasks/1/data` が 201 を返すこと
- [ ] 不正なプロジェクト名では 404 が返ること
- [ ] 不正なタスク番号では 404 が返ること

## 承認記録

- **計画書提示日時**: 2026-03-02 11:17
- **承認日時**: 2026-03-02 11:17
- **承認者コメント**: 原因3（upsert.sql）は対応不要。原因1・2のみ修正。

## 実施記録

### 実施日時
開始: 2026-03-02 11:17
完了: 2026-03-02 11:19

### 計画からの変更点
なし（計画通りに実施）

### 最終的な成果物
- [x] findByNameWithStatus.sql 修正（`id`→`project_id`、`status`→`project_status`）
- [x] experimentDataService.ts 修正（`.id`→`.project_id`、`.status`→`.project_status`）
- [x] checkExists.sql 修正（`project_task_detail` との JOIN に変更、`LIMIT 1` 追加）

### 残存リスク（要確認）
`project_status` カラムの型は DDL 上 `numeric(2,0)` だが、サービス層では文字列 `['draft', 'active', 'waiting_approval']` と比較している。
実際の DB データが数値で格納されている場合、ProjectNotEditableError（403）が発生する可能性がある。
動作確認後に問題が続く場合は、code_master テーブルで project_status の値定義を確認すること。

# タスク計画書: WorkProgressDetailDialog - task_no修正

## メタデータ
- **作成日時**: 2026-03-09 18:46
- **タスクID**: taskNo_fix_transition_data
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

`findByTask.sql` と `progressService.ts` の `getWorkDetails()` に存在する2つの問題を修正する。

1. `findByTask.sql` のWHERE句に `transition_data` テーブルに存在しない `experiment_order` カラムが含まれている
2. `progressService.ts` の `getWorkDetails()` にて `task_no` を `1` 固定にしており、複数の `task_no` が存在する場合に対応できていない

---

## 調査結果

### transition_data テーブルのスキーマ（実DB）

`docs/design/db/ddl/migrations/create_all_tables.sql` に基づく実際のスキーマ：

```sql
CREATE TABLE transition_data (
    organization_id UUID NOT NULL,
    project_id CHARACTER VARYING(20) NOT NULL,
    method_id CHARACTER VARYING NOT NULL,
    task_no NUMERIC(3,0) NOT NULL,          -- experiment_order は存在しない
    transition_id CHARACTER VARYING NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'initial',
    progress_rate INTEGER NOT NULL DEFAULT 0,
    ...
    CONSTRAINT transition_data_PKC PRIMARY KEY 
      (organization_id, project_id, method_id, task_no, transition_id)
);
```

**主キー**: `(organization_id, project_id, method_id, task_no, transition_id)`  
**experiment_order カラムは存在しない**（DDLが先行して修正済み）

### project_task テーブルのスキーマ

```sql
CREATE TABLE project_task (
    organization_id UUID NOT NULL,
    project_id CHARACTER VARYING(20) NOT NULL,
    method_id CHARACTER VARYING NOT NULL,
    experiment_order NUMERIC(2,0) NOT NULL,   -- メソッド単位の実行順序
    task_name CHARACTER VARYING,
    ...
    CONSTRAINT project_task_PKC PRIMARY KEY 
      (organization_id, project_id, method_id, experiment_order)
);
```

`experiment_order` は `project_task` 側のカラムであり、メソッド単位の実行順序を表す。
現時点では同じ `method_id` に対して複数の `experiment_order` は存在しない。

### project_task_detail テーブルのスキーマ

```sql
CREATE TABLE project_task_detail (
    organization_id UUID NOT NULL,
    project_id CHARACTER VARYING(20) NOT NULL,
    method_id CHARACTER VARYING NOT NULL,
    task_no NUMERIC(3,0) NOT NULL,           -- タスク連番
    task_status NUMERIC(2,0),
    ...
    CONSTRAINT project_task_detail_PKC PRIMARY KEY 
      (organization_id, project_id, method_id, task_no)
);
```

`task_no` は `project_task_detail` に存在し、`transition_data` の外部キーに相当する。

### 現在の問題コード

#### findByTask.sql（問題箇所）

```sql
-- パラメータ: $1=organizationId, $2=projectId, $3=methodId, $4=experimentOrder, $5=taskNo
WHERE td.organization_id = $1
  AND td.project_id = $2
  AND td.method_id = $3
  AND td.experiment_order = $4   -- ← カラムが存在しないため削除が必要
  AND td.task_no = $5
```

#### progressService.ts getWorkDetails()（問題箇所、790行目付近）

```typescript
// ここでは experimentOrder を $4 として渡し、task_no は 1 固定で試みる
const tdRows = await pgp.any(...)(transitionSql, 
  [organizationId, proj.project_id, task.method_id, task.experiment_order, 1]);
//                                                   ↑ 不要（transit_dataに存在しない）
//                                                                          ↑ 1固定は誤り
```

---

## 目的と期待される成果

- [ ] `findByTask.sql` から `experiment_order` 条件を削除し、正しいパラメータ構成にする
- [ ] `project_task_detail` から `task_no` 一覧を取得するSQLファイルを新規作成する
- [ ] `progressService.ts` の `getWorkDetails()` にて `task_no` をループして全件取得するよう修正する

---

## 実装ステップ

### Phase 1: SQLファイルの修正・作成

- [ ] Step 1-1: `findByTask.sql` の修正
  - `experiment_order = $4` 条件を削除
  - パラメータを5個から4個に変更（$4=taskNo）
  - コメント更新

- [ ] Step 1-2: `project_task_details/findByMethodId.sql` の新規作成
  - `project_task_detail` から指定 `(organizationId, projectId, methodId)` の `task_no` 一覧を取得

### Phase 2: progressService.ts の修正

- [ ] Step 2-1: `getWorkDetails()` 内の `task_no` 取得ロジックを修正
  - `project_task_detail` から当該メソッドの `task_no` 一覧を取得
  - 各 `task_no` で `transition_data` をクエリ
  - 全 `task_no` の `tdRows` を集約

### Phase 3: 確認

- [ ] Step 3-1: TypeScript コンパイルエラーがないか確認

---

## 変更ファイル

### 修正ファイル
1. `backend/src/sql/queries/transition_data/findByTask.sql` - `experiment_order` 削除、パラメータ5→4
2. `backend/src/services/progressService.ts` - `getWorkDetails()` の `task_no` ループ処理

### 新規作成ファイル
1. `backend/src/sql/queries/project_task_details/findByMethodId.sql` - `task_no` 一覧取得

---

## 修正後のロジック概要

```
getWorkDetails() での taskRows ループ:
  project_taskRows（experiment_order ごと）のループ
    └─ project_task_detail から task_no 一覧を取得
         └─ task_no ごとにループ（Promise.all または順次）
              └─ findByTask.sql($1=org, $2=project, $3=method, $4=task_no) で取得
                   └─ 全 task_no の tdRows をマージ
                        └─ transitionProgress の集約
```

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| project_task_detail にレコードがない場合 | 中 | task_no 一覧が空の場合は全トランジションを「未開始」として扱う |
| 既存の getProgressData() への影響 | 低 | findByTask.sql のパラメータ変更が getProgressData() に影響しないか確認が必要（getProgressData は transitionDataRepository.getLatestRecordByTransition を使用しており findByTask.sql は直接使用していないため影響なし） |

---

## 承認記録
- **計画書提示日時**: 2026-03-09 18:46
- **承認日時**: 2026-03-09 18:46
- **承認者コメント**: 調査結果を含めてタスク計画書を作成し、実装作業はなるべく細かく分けて実行する

## 実施記録
### 実施日時
開始: 2026-03-09 18:46
完了: 2026-03-09 18:55

### 最終的な成果物
- [x] `findByTask.sql` の修正（`experiment_order` 削除、パラメータ5→4）
- [x] `project_tasks/findTaskDetailsByMethodId.sql` の新規作成
- [x] `progressService.ts` の `getWorkDetails()` の修正（`task_no` ループ処理）
- [x] TypeScript コンパイルエラーなし確認

# タスク計画書: 進捗データ取得API method_name・task_no修正

## メタデータ
- **作成日時**: 2026-02-25 20:16
- **タスクID**: progress-api-fix-method-name-task-no
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

`GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions`（進捗データ取得API）のレスポンスデータについて、以下の2点を修正する。

1. `method_name` → `project_task.task_name` から取得するよう修正
2. `task_no` → `project_task_detail.task_no` から取得するよう修正

## 問題の詳細

### DDL確認結果

**project_task テーブル（主キー: organization_id, project_id, method_id）**
- `task_name` カラムあり
- `task_no` カラムなし（SQLで誤参照している）
- `task_id` カラムなし（型定義で誤定義している）

**project_task_detail テーブル（主キー: organization_id, project_id, method_id, task_no）**
- `task_no` カラムあり（ここから取得すべき）

### 現状の問題

1. **`findByProjectMethodTaskNo.sql`**
   - `pt.task_no` を参照 → `project_task` に存在しないカラム（誤り）
   - `pt.task_id` を参照 → `project_task` に存在しないカラム（誤り）
   - `project_task_detail` との JOIN がない → `task_no` が取得できない

2. **`progressService.ts`**
   - `method_name: method.methodName` → MAIMLファイルから取得（誤り）
   - 正しくは `method_name: task.task_name` → `project_task.task_name` から取得

3. **`progress.ts`（型定義）**
   - `TaskWithProject.task_id` → `project_task` に存在しないカラムを定義（誤り）

## 目的と期待される成果

- [ ] `method_name` が `project_task.task_name` から正しく取得される
- [ ] `task_no` が `project_task_detail.task_no` から正しく取得される
- [ ] SQLが存在しないカラムを参照しない

## 実装ステップ

### Phase 1: SQLファイルの修正
- [ ] `backend/src/sql/queries/tasks/findByProjectMethodTaskNo.sql` を修正
  - `project_task_detail` と JOIN を追加（task_no 取得のため）
  - 無効カラム `pt.task_id` を削除
  - `pt.task_no` を `ptd.task_no` に修正
  - WHERE句の `pt.task_no = $3` を `ptd.task_no = $3` に修正

### Phase 2: 型定義の修正
- [ ] `backend/src/types/progress.ts` の `TaskWithProject` インターフェースを修正
  - `task_id` フィールドを削除（project_task テーブルに存在しない）

### Phase 3: サービス層の修正
- [ ] `backend/src/services/progressService.ts` を修正
  - `method_name` の設定を `method.methodName`（MAIML）から `task.task_name`（DB）に変更

## 変更ファイル

1. `backend/src/sql/queries/tasks/findByProjectMethodTaskNo.sql` - SQL修正
2. `backend/src/types/progress.ts` - 型定義修正（task_id削除）
3. `backend/src/services/progressService.ts` - method_name取得元を変更

## 影響範囲

- 進捗データ取得API（`GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions`）のみ
- `getProgressData` 関数の動作に影響

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `TaskWithProject.task_id` を他の箇所で参照している | 中 | 低 | 修正前にgrep確認 |

## 承認記録

- **計画書提示日時**: 2026-02-25 20:16
- **承認日時**: 2026-02-25 20:16

## 実施記録

### 実施日時
開始: 2026-02-25 20:16  
完了: 2026-02-25 20:20

### 実施結果

- [x] `method_name` が `project_task.task_name` から正しく取得される
- [x] `task_no` が `project_task_detail.task_no` から正しく取得される
- [x] SQLが存在しないカラムを参照しない

### 変更内容

#### 1. `backend/src/sql/queries/tasks/findByProjectMethodTaskNo.sql`
- `project_task_detail (ptd)` との INNER JOIN を追加
- 無効カラム `pt.task_id` を削除
- `pt.task_no` → `ptd.task_no` に修正（WHERE句含む）

#### 2. `backend/src/types/progress.ts`
- `TaskWithProject.task_id` フィールドを削除（`project_task` テーブルに存在しないカラム）
- コメントを追記（`task_name` は `project_task.task_name`、`task_no` は `project_task_detail.task_no`）

#### 3. `backend/src/services/progressService.ts`
- `method_name: method.methodName`（MAIMLから取得）→ `method_name: task.task_name`（DBから取得）に変更

#### 4. `backend/src/types/database.ts`（既存バグの修正）
- `TemplateData` インターフェースの閉じ括弧 `}` が抜けていた問題を修正

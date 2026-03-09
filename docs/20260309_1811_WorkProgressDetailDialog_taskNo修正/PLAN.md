# タスク計画書: WorkProgressDetailDialog タスクNo追加対応

## メタデータ
- **作成日時**: 2026-03-09 18:11
- **タスクID**: WorkProgressDetailDialog_taskNo修正
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

UI設計書 (`ui_work_progress_detail_dialog.md`) の変更に従い、WorkProgressDetailDialog の「タスク名」「タスクID」表示を削除し、「タスクNo（タスク連番）」表示を追加する。フロントエンド・バックエンド双方の修正を行う。

---

## 2. 調査結果

### 2.1 UI設計書の変更内容

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| タスク詳細カード「タスク名」列 | 表示あり | **削除** |
| タスク詳細カード「タスクID」列 | 表示あり | **削除** |
| タスク詳細カード「タスクNo」列 | なし | **追加** |
| タブラベル | `taskName \|\| 作業N` | `Task{taskNo}` |
| `WorkDetail.taskName` | あり | **削除** |
| `WorkDetail.taskNo` | なし | **追加**（`number`型） |

### 2.2 データベース構造

**`project_task`テーブル（DDL: docs/design/db/ddl/project_task.sql）**
- 主キー: `(organization_id, project_id, method_id, experiment_order)`
- `task_name`カラムは **存在しない**（現行コードの参照は誤り）
- `experiment_order`（実験順序）をタスクNoとして使用する

**`transition_data`テーブル（DDL: docs/design/db/ddl/transition_data.sql）**
- 主キー: `(organization_id, project_id, method_id, experiment_order, task_no, transition_id)`
- `task_no`はproject_task_detailの連番

### 2.3 現状のコードの問題点

#### バックエンド
1. `findByProjectId.sql` が存在しない `pt.task_name` カラムを SELECT している（SQLエラーの原因）
2. `progressService.ts` の `getWorkDetails()` で `task.task_name` を参照している（存在しないカラム）
3. `WorkDetailItem` 型に `taskName` があるが `taskNo` がない

#### フロントエンド
1. `WorkDetail` 型に `taskName` があるが `taskNo` がない
2. タブラベルで `work.taskName` を参照している
3. タスク詳細カードに「タスク名」「タスクID」を表示している

### 2.4 使用するAPI

**GET /api/v1/progress/projects/:projectName/work-details**
- Controller: `progressController.ts` `getWorkDetails()`
- Service: `progressService.ts` `getWorkDetails()`
- SQL: `project_tasks/findByProjectId.sql`
- レスポンス型: `WorkProgressDetailResponse`（`WorkDetailItem[]`含む）

---

## 3. 目的と期待される成果

- [x] `findByProjectId.sql` から存在しない `task_name` カラムを削除
- [x] `backend/src/types/api.ts` の `WorkDetailItem` から `taskName` を削除し `taskNo` を追加
- [x] `progressService.ts` の `getWorkDetails()` で `taskNo` を正しく設定
- [x] `frontend/src/types/progress.ts` の `WorkDetail` から `taskName` を削除し `taskNo` を追加
- [x] `WorkProgressDetailDialog.tsx` のタブラベルを `Task{taskNo}` 形式に変更
- [x] `WorkProgressDetailDialog.tsx` のタスク詳細カードからタスク名・タスクIDを削除し、タスクNoを追加

---

## 4. 実装ステップ

### Step 1: SQLファイルの修正
- [x] `backend/src/sql/queries/project_tasks/findByProjectId.sql` から `pt.task_name` を削除

### Step 2: バックエンド型定義の修正
- [x] `backend/src/types/api.ts` の `WorkDetailItem` を修正（`taskName` 削除、`taskNo` 追加）

### Step 3: バックエンドサービスの修正
- [x] `backend/src/services/progressService.ts` の `getWorkDetails()` を修正
  - `taskRows` の型定義から `task_name` を削除
  - `workDetailItem` の組み立てで `taskName` を削除、`taskNo: Number(task.experiment_order)` を追加

### Step 4: フロントエンド型定義の修正
- [x] `frontend/src/types/progress.ts` の `WorkDetail` を修正（`taskName` 削除、`taskNo` 追加）

### Step 5: フロントエンドコンポーネントの修正
- [x] `frontend/src/components/progress/WorkProgressDetailDialog.tsx` を修正
  - タブラベル生成ロジック変更（`taskName` → `Task${work.taskNo}`）
  - タスク詳細カードから「タスク名」列・「タスクID」列を削除
  - タスク詳細カードに「タスクNo」列を追加

---

## 5. 変更ファイル一覧

| # | ファイルパス | 変更種別 | 変更内容 |
|---|------------|---------|---------|
| 1 | `backend/src/sql/queries/project_tasks/findByProjectId.sql` | 修正 | `pt.task_name` 列を削除 |
| 2 | `backend/src/types/api.ts` | 修正 | `WorkDetailItem.taskName` 削除、`taskNo: number` 追加 |
| 3 | `backend/src/services/progressService.ts` | 修正 | `task.task_name` 参照削除、`taskNo` 設定追加 |
| 4 | `frontend/src/types/progress.ts` | 修正 | `WorkDetail.taskName` 削除、`taskNo: number` 追加 |
| 5 | `frontend/src/components/progress/WorkProgressDetailDialog.tsx` | 修正 | UI表示の変更（タブラベル・タスク詳細カード） |

---

## 6. 技術的詳細

### タスクNoの値

`project_task.experiment_order`（実験順序、`numeric(2,0)`）をタスクNoとして使用する。
- DB上の値をそのまま `Number()` で数値変換
- タブラベル表示: `Task1`, `Task2`, ...

### SQLの修正

`findByProjectId.sql` のコメント更新（`task_name` → `experiment_order`が主要カラム）

---

## 7. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `taskName` を参照している他のコンポーネントの影響 | 低 | 低 | `WorkDetail`型の変更はコンパイルエラーで検知可能 |
| `experiment_order` が 0 始まりの場合の表示崩れ | 低 | 低 | DB定義上は `numeric(2,0)`、実際の値を確認済み |

---

## 8. 承認記録
- **計画書提示日時**: 2026-03-09 18:11
- **承認日時**: 2026-03-09 18:11
- **承認者コメント**: 承認済み

## 9. 実施記録

### 実施日時
開始: 2026-03-09 18:11

### 実施内容
（実施後に記録）

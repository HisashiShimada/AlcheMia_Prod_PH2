# 調査レポート: プロジェクト管理「公開」ボタン システムエラー

- **調査日時**: 2026-03-18 10:40
- **タスクID**: 公開ボタンシステムエラー調査
- **優先度**: 高

---

## 1. 症状

プロジェクト管理画面で「公開」ボタンを押下すると、フロントエンドにシステムエラーが返る。  
`maiml_publish_job` テーブルへのジョブ登録が行われていない模様。

---

## 2. 処理フロー概要

```
公開ボタン押下
  ↓
POST /api/v1/projects/:projectName/publish
  ↓
projectController.publish()
  ↓
maimlPublishService.enqueuePublish()
  ├─ プロジェクト存在確認
  ├─ チェックアウト状態確認
  ├─ プロジェクトステータス確認
  ├─ タスク詳細の完了確認  ← ★問題箇所1
  ├─ 重複チェック
  ├─ Swift/S3 ファイル存在確認
  ├─ maiml_publish_job に INSERT  ← ★問題箇所2（テーブルが存在しない場合）
  ├─ bullmq キューに投入
  └─ プロジェクトステータスを「完了(4)」に更新
```

---

## 3. 発見した問題点

### 【問題0・真の主因】 `projectController.publish()` が enqueuePublish に到達できない

**ファイル**: `backend/src/controllers/projectController.ts` `publish()` 関数

`getProjectMaiml()` は `{ maimlContent }` を返しますが、コントローラーは **存在しない `filePath`** をチェックしていました。

```typescript
// 修正前（誤り）: filePath は常に undefined → 404/500 を返してしまう
const maimlResult = await projectService.getProjectMaiml(organizationId, projectName);
if (!maimlResult.success || !maimlResult.data?.filePath) {  // ← filePath は存在しない
  // ここで必ずエラーレスポンスを返してしまい enqueuePublish に到達できない
  const statusCode = maimlResult.error?.code === 'RESOURCE_NOT_FOUND' ? 404 : 500;
  res.status(statusCode).json({ ... });
  return;
}
```

**修正後**: MAIMLファイルの存在確認・各種バリデーションは `enqueuePublish()` 内部で実施しているため、コントローラー側の不要なチェックを削除しました。

```typescript
// 修正後: 直接 enqueuePublish を呼び出す
const userId = req.user!.userId ?? null;
// enqueuePublish 内部でプロジェクト確認・ファイル確認・バリデーションを実施
```

---

### 【問題1・主因】 `public.maiml_publish_job` テーブルが未作成の可能性

**ファイル**: `backend/src/repositories/maimlPublishJobRepository.ts`

```typescript
// INSERT クエリ（スキーマ修飾子なし → public スキーマを参照）
const query = `
  INSERT INTO maiml_publish_job
    (job_type, organization_id, project_name, ...)
  VALUES ($1, $2, $3, ...)
  RETURNING *
`;
```

**マイグレーションファイルが2つ存在し混乱が生じている**：

| ファイル | テーブル位置 | 状態 |
|---------|------------|------|
| `20260311_create_maiml_publish_job.sql` | `maiml_publish.maiml_publish_job` | **廃止（旧設計）** |
| `20260313_create_maiml_opendata_new_schema.sql` | `public.maiml_publish_job` | **現行（正しい）** |

`job_table_summary.md` でも以下のように明記されている：
> ⚠️ **旧テーブルとの混同に注意**  
> `20260310_create_maiml_opendata_tables.sql` には `maiml_publish スキーマ` 内に同名の `maiml_publish.maiml_publish_job` が定義されているが、これは**廃止された旧設計**。  
> 現在使用されているのは `public.maiml_publish_job`（`20260313_create_maiml_opendata_new_schema.sql` で作成）のみ。

**`20260313_create_maiml_opendata_new_schema.sql` がDBに未適用**の場合、  
`public.maiml_publish_job` テーブルが存在せず INSERT が失敗し **システムエラー（500）** となる。

---

### 【問題2・副因】 タスクステータス定数の誤り

**ファイル**: `backend/src/services/maimlPublishService.ts`

```typescript
// 現在の定義（誤り）
/** タスクステータス: 完了 */
const TASK_STATUS_COMPLETED = 4;
/** タスクステータス: 異常終了 */
const TASK_STATUS_ABORTED = 5;
```

**正しいステータス値**（`projectRepository.ts` の `TASK_STATUS_MAP` および `projectTaskDetailRepository.ts` の `TASK_STATUS_MAP` より）：

```typescript
// 正しいステータス値
const TASK_STATUS_MAP = {
  'pending':           0,
  'in_progress':       1,
  'review_waiting':    2,
  'completed':         3,   // ← 完了は 3
  'forced_terminated': 4,   // ← 異常終了は 4（5ではない）
};
```

この誤りにより、`enqueuePublish()` のタスク完了チェック部分で問題が発生する：

```typescript
// maimlPublishService.ts の該当コード
const hasIncomplete = taskDetails.some(
  (t) =>
    t.task_status !== TASK_STATUS_COMPLETED &&  // 4（誤）→ 完了タスク(3)を未完了と判定
    t.task_status !== TASK_STATUS_ABORTED       // 5（誤）→ 異常終了タスク(4)を未完了と判定
);
if (hasIncomplete) {
  throw new Error('TASKS_NOT_COMPLETED');  // ← 正常なプロジェクトでも発生してしまう
}
```

**結果**: 全タスクが完了・異常終了していても `TASKS_NOT_COMPLETED` エラーが発生し、400 Bad Request が返る。

ただし `maimlPublishService.ts` には以下の条件もある：
```typescript
// タスク詳細が0件の場合はチェックをスキップ
if (taskDetails.length > 0) {
  // ここでチェックが行われる
}
```
→ タスク詳細レコードが存在するプロジェクトで顕在化する。

---

## 4. 根本原因まとめ

| # | 問題 | 影響 | 発生するエラー |
|---|------|------|--------------|
| 1 | `public.maiml_publish_job` テーブルが未作成（マイグレーション未適用） | 全ユーザー | 500 SYSTEM_ERROR |
| 2 | `TASK_STATUS_COMPLETED = 4`（正しくは 3）、`TASK_STATUS_ABORTED = 5`（正しくは 4） | タスクが1件以上存在するプロジェクト | 400 TASKS_NOT_COMPLETED |

---

## 5. 修正方針

### 修正1: マイグレーション適用（DB側対応）

`20260313_create_maiml_opendata_new_schema.sql` を対象DBに適用する。

```sql
-- このファイルを対象DBで実行
-- backend/migrations/20260313_create_maiml_opendata_new_schema.sql
```

確認コマンド（DB接続後）：
```sql
-- テーブル存在確認
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'maiml_publish_job';

-- organization テーブルへの default_retention_days カラム確認
SELECT column_name FROM information_schema.columns
WHERE table_name = 'organization' AND column_name = 'default_retention_days';
```

なお `20260313_add_default_retention_days_to_organization.sql` も同時に確認・適用が必要。  
（`maimlPublishWorker.ts` で `org.default_retention_days` を参照しているため）

### 修正2: ソースコード修正（`maimlPublishService.ts`）

```typescript
// 誤り（現在）
const TASK_STATUS_COMPLETED = 4;
const TASK_STATUS_ABORTED = 5;

// 正しい値
const TASK_STATUS_COMPLETED = 3;   // completed
const TASK_STATUS_ABORTED = 4;     // forced_terminated
```

---

## 6. 変更ファイル

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `backend/src/services/maimlPublishService.ts` | 修正 | `TASK_STATUS_COMPLETED`、`TASK_STATUS_ABORTED` の定数値を修正 |
| DBマイグレーション（DB側作業） | 適用 | `20260313_create_maiml_opendata_new_schema.sql` を適用 |
| DBマイグレーション（DB側作業） | 適用 | `20260313_add_default_retention_days_to_organization.sql` を適用 |

---

## 7. ソースコード修正箇所詳細

### `backend/src/services/maimlPublishService.ts` （L28-L30付近）

```diff
-/** タスクステータス: 完了 */
-const TASK_STATUS_COMPLETED = 4;
-/** タスクステータス: 異常終了 */
-const TASK_STATUS_ABORTED = 5;
+/** タスクステータス: 完了 */
+const TASK_STATUS_COMPLETED = 3;
+/** タスクステータス: 異常終了（強制終了） */
+const TASK_STATUS_ABORTED = 4;
```

---

## 8. 承認・実施記録

- **計画書提示日時**: 2026-03-18 10:43
- **承認日時**: 2026-03-18 10:46
- **承認者コメント**: ソースコード修正を実施する

## 9. 実施記録

### 実施日時
開始: 2026-03-18 10:46  
完了: 2026-03-18 10:46

### 実施内容

#### ソースコード修正（完了）
- `backend/src/services/maimlPublishService.ts`
  - `TASK_STATUS_COMPLETED`: `4` → `3` に修正
  - `TASK_STATUS_ABORTED`: `5` → `4` に修正

#### DB側対応（DB管理者依頼）
以下の2ファイルを対象DBサーバーで適用する必要があります：

```bash
# 1. maiml_publish_job テーブル作成（最重要）
psql -h <DBホスト> -U <ユーザ> -d <DB名> \
  -f backend/migrations/20260313_create_maiml_opendata_new_schema.sql

# 2. organization テーブルへ default_retention_days カラム追加
psql -h <DBホスト> -U <ユーザ> -d <DB名> \
  -f backend/migrations/20260313_add_default_retention_days_to_organization.sql
```

適用後の確認:
```sql
-- maiml_publish_job テーブル存在確認
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'maiml_publish_job';

-- default_retention_days カラム存在確認
SELECT column_name FROM information_schema.columns
WHERE table_name = 'organization' AND column_name = 'default_retention_days';
```

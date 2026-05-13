# worker-accessible API 調査結果

## 実施日時
2026-02-18 20:10

## 調査対象
GET /api/v1/projects/worker-accessible（実験作業者用プロジェクト一覧取得API）

## 実装構造

### 1. ルーティング層
**ファイル**: `backend/src/routes/projectRoutes.ts`

```typescript
router.get(
  '/worker-accessible',
  authMiddleware,
  checkPermission('050000', 0),
  [/* バリデーション */],
  handleValidationErrors,
  workerProjectController.listWorkerAccessible
);
```

### 2. コントローラー層
**ファイル**: `backend/src/controllers/workerProjectController.ts`

- クラス: `WorkerProjectController`
- メソッド: `listWorkerAccessible()`
- 処理内容:
  - リクエストパラメータの取得（page, limit, status, sortBy, order）
  - サービス層の呼び出し（`workerProjectService.listWorkerAccessible()`）
  - レスポンス返却

### 3. サービス層（SQLクエリ実行箇所）
**ファイル**: `backend/src/services/workerProjectService.ts`

- クラス: `WorkerProjectService`
- メソッド: `listWorkerAccessible()`
- **重要**: リポジトリ層を使用せず、直接SQLクエリを実行

## 洗い出したSQLクエリ

### クエリ1: プロジェクト一覧取得（メインクエリ）

```sql
SELECT DISTINCT
  project.project_id,
  project.project_name,
  project.description,
  project.project_status,
  project.create_at,
  project.update_at
FROM project
INNER JOIN project_task_detail 
  ON project.project_id = project_task_detail.project_id
WHERE 
  project.organization_id = $1
  AND project_task_detail.experiment_user_id = $2
  AND project_task_detail.organization_id = $3
  AND project.project_status IN ($4, $5, $6)  -- または単一のステータス
ORDER BY {sortColumn} {sortOrder}
LIMIT $7 OFFSET $8
```

**パラメータ**:
1. `organizationId` (string) - マルチテナント分離
2. `userId` (string) - ユーザーIDフィルタ
3. `organizationId` (string) - project_task_detail側のマルチテナント分離
4-6. `statusValues` (number[]) - プロジェクトステータス（1, 2, 3）
7. `limit` (number) - ページあたりの件数
8. `offset` (number) - オフセット

**動的要素**:
- `sortColumn`: `project.create_at` | `project.project_name` | `project.update_at`
- `sortOrder`: `ASC` | `DESC`
- ステータスフィルタ: 単一ステータス指定時は `= $4`、未指定時は `IN ($4, $5, $6)`

### クエリ2: 総件数取得

```sql
SELECT COUNT(DISTINCT project.project_id) as count 
FROM project
INNER JOIN project_task_detail 
  ON project.project_id = project_task_detail.project_id
WHERE 
  project.organization_id = $1
  AND project_task_detail.experiment_user_id = $2
  AND project_task_detail.organization_id = $3
  AND project.project_status IN ($4, $5, $6)  -- または単一のステータス
```

**パラメータ**: メインクエリと同じWHERE条件

## 発見事項

### 重要: リポジトリ層が存在しない

このエンドポイントは**リポジトリ層を経由せず**、サービス層で直接SQLを実行しています。

```typescript
// 現在の実装
export class WorkerProjectService {
  async listWorkerAccessible(...) {
    const pool = getPool();  // 直接Pool使用
    
    // SQLクエリを文字列で構築
    let selectQuery = `SELECT DISTINCT ...`;
    
    // クエリ実行
    const projectsResult = await pool.query(selectQuery, queryParams);
  }
}
```

## 実装方針の検討

### オプション1: リポジトリ層を新規作成（推奨）

**メリット**:
- アーキテクチャの一貫性（他のAPIと同様）
- 責任の分離（サービス層はビジネスロジック、リポジトリ層はデータアクセス）
- テストの容易性

**デメリット**:
- 追加の実装が必要

**実装イメージ**:
```typescript
// backend/src/repositories/workerProjectRepository.ts
export async function findWorkerAccessible(
  organizationId: string,
  userId: string,
  filters: WorkerProjectFilters
): Promise<WorkerAccessibleProject[]> {
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile('projects/findWorkerAccessible.sql');
  // ...
}

export async function countWorkerAccessible(
  organizationId: string,
  userId: string,
  filters: WorkerProjectFilters
): Promise<number> {
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile('projects/countWorkerAccessible.sql');
  // ...
}
```

### オプション2: サービス層で直接pg-promiseを使用

**メリット**:
- 既存の構造を維持
- 最小限の変更

**デメリット**:
- アーキテクチャの不一貫性
- サービス層がデータアクセスロジックを持つ（責任の混在）

## 推奨アプローチ

**オプション1（リポジトリ層新規作成）を推奨**

理由:
1. departmentRepositoryと同じパターンを適用できる
2. 将来的な拡張性が高い
3. テストが容易
4. コードベース全体の一貫性が向上

## 次のステップ

### Phase 2に向けて

1. **SQLファイルを2つ作成**:
   - `backend/src/sql/queries/projects/findWorkerAccessible.sql`
   - `backend/src/sql/queries/projects/countWorkerAccessible.sql`

2. **リポジトリ層を作成**:
   - `backend/src/repositories/workerProjectRepository.ts`
   - 2つのメソッド: `findWorkerAccessible()`, `countWorkerAccessible()`

3. **サービス層を修正**:
   - `backend/src/services/workerProjectService.ts`
   - リポジトリメソッドを呼び出すように変更
   - SQLクエリ構築ロジックを削除

## 動的フィルター処理の課題

### 課題: ステータスフィルタの分岐

現在のコードでは、ステータスが指定されているかどうかで異なるSQLを生成：

```typescript
if (params.status) {
  // 単一ステータス: project.project_status = $4
  whereConditions.push(`project.project_status = $${paramIndex++}`);
  queryParams.push(parseInt(params.status, 10));
} else {
  // 複数ステータス: project.project_status IN ($4, $5, $6)
  whereConditions.push(`project.project_status IN ($${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
  queryParams.push(1, 2, 3);
}
```

### 解決策: 統一的なIN句の使用

SQLファイルでは常にIN句を使用し、TypeScriptで配列を渡す：

```sql
-- findWorkerAccessible.sql
WHERE 
  ...
  AND project.project_status = ANY($4::int[])
```

```typescript
// TypeScript側
const statusArray = params.status 
  ? [parseInt(params.status, 10)] 
  : [1, 2, 3];
queryParams.push(statusArray);
```

または、departmentRepositoryのように文字列置換を使用。

## セキュリティ考慮事項

✅ **確認済み**:
- Parameterized Queriesを使用（SQLインジェクション対策済み）
- organization_idフィルタが適切に適用
- ユーザーIDによるアクセス制御が実装済み
- マルチテナント分離が両テーブルで実施

## 影響範囲の更新

### 新規作成するファイル
1. `backend/src/sql/queries/projects/findWorkerAccessible.sql`
2. `backend/src/sql/queries/projects/countWorkerAccessible.sql`
3. `backend/src/repositories/workerProjectRepository.ts`

### 修正するファイル
1. `backend/src/services/workerProjectService.ts`

### 削除するコード
- `workerProjectService.ts`内のSQL文字列構築ロジック（約100行）

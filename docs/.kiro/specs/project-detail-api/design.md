# Design Document

## 1. アーキテクチャ概要

### 1.1 レイヤー構成

```
Client Request
    ↓
[Routes Layer] projectRoutes.ts
    ↓ (Middleware Chain)
    ├── authMiddleware (JWT認証)
    ├── tenantIsolation (組織分離)
    └── permissionCheck (権限確認)
    ↓
[Controller Layer] projectController.ts
    ↓
[Service Layer] projectService.ts
    ↓ (Parallel Fetch)
    ├── [Database Layer] PostgreSQL (project, project_task_detail, etc.)
    └── [Storage Layer] S3/Swift (via storageService)
    ↓
Response
```

### 1.2 設計方針

- 既存のproject-list-apiとの一貫性を保つ
- レイヤードアーキテクチャによる関心の分離
- マルチテナント分離の徹底
- 並列データ取得によるパフォーマンス最適化
- セキュリティベストプラクティスの遵守

## 2. 実装ファイル

### 2.1 既存ファイルへの追加

**backend/src/routes/projectRoutes.ts**
- GET /:projectId エンドポイント追加
- express-validator によるUUID検証
- ミドルウェアチェーン適用

**backend/src/controllers/projectController.ts**
- getById メソッド追加
- リクエスト処理、バリデーション
- レスポンス生成、エラーハンドリング

**backend/src/services/projectService.ts**
- getById メソッド追加
- 並列データ取得（Promise.all）
- データベースクエリ実行
- S3ファイル一覧取得
- サマリー情報計算

## 3. API仕様

### 3.1 エンドポイント

```
GET /api/v1/projects/:projectId
```

### 3.2 リクエスト仕様

**Headers:**
```
Authorization: Bearer <jwt_token>
X-Organization-Id: <organization_id>
```

**Path Parameters:**
```typescript
{
  projectId: string;  // UUID形式必須
}
```

### 3.3 レスポンス仕様

**成功時 (200 OK):**
```typescript
{
  success: true,
  data: {
    project: {
      organizationId: string;
      projectId: string;
      projectName: string;
      description: string | null;
      departmentId: string | null;
      ownerUserId: string;
      ownerUserName: string;
      projectStatus: number;
      projectStatusName: string;
      checkoutStatus: number;
      checkoutStatusName: string;
      createAt: string;  // ISO 8601
    },
    files: [
      {
        fileName: string;
        filePath: string;
        fileSize: number;
        lastModified: string;  // ISO 8601
        signedUrl: string;
        version: number | null;
      }
    ],
    tasks: [
      {
        methodId: number;
        taskNo: number;
        taskStatus: number;
        taskStatusName: string;
        workerUserId: string | null;
        workerUserName: string | null;
        reviewerUserId: string | null;
        reviewerUserName: string | null;
      }
    ],
    summary: {
      totalFiles: number;
      totalTasks: number;
      completedTasks: number;
      runningTasks: number;
      waitingTasks: number;
    }
  },
  meta: {
    timestamp: string;
    requestId: string;
  }
}
```

**エラー時:**
```typescript
{
  success: false,
  error: {
    code: string;
    message: string;
    details?: any[];
  },
  meta: {
    timestamp: string;
    requestId: string;
  }
}
```

## 4. データベース設計

### 4.1 使用テーブル

**project テーブル**（プロジェクト基本情報）
- organization_id (UUID, 主キー)
- project_id (UUID, 主キー)
- project_name (VARCHAR)
- description (TEXT)
- department_id (UUID)
- owner_user_id (UUID)
- project_status (NUMERIC)
- project_maiml_flg (BOOLEAN)
- checkout_status (NUMERIC)
- create_at (TIMESTAMP)

**project_task_detail テーブル**（タスク詳細）
- organization_id (UUID, 主キー)
- project_id (UUID, 主キー)
- method_id (VARCHAR, 主キー)
- task_no (NUMERIC, 主キー)
- task_status (NUMERIC)
- worker_user_id (UUID)
- reviewer_user_id (UUID)

**organization_user テーブル**（ユーザー情報）
- user_id (UUID, 主キー)
- user_name (VARCHAR)

**code_master テーブル**（コード値マスタ）
- code_class (VARCHAR, 主キー)
- code_value (NUMERIC, 主キー)
- code_name (VARCHAR)

### 4.2 プロジェクト基本情報取得クエリ

```sql
SELECT 
  p.organization_id,
  p.project_id,
  p.project_name,
  p.description,
  p.department_id,
  p.owner_user_id,
  u.user_name as owner_user_name,
  p.project_status,
  ps.code_name as project_status_name,
  p.checkout_status,
  cs.code_name as checkout_status_name,
  p.create_at
FROM project p
INNER JOIN organization_user u 
  ON u.user_id = p.owner_user_id
LEFT JOIN code_master ps 
  ON ps.code_value = p.project_status 
  AND ps.code_class = 'project_status'
LEFT JOIN code_master cs 
  ON cs.code_value = p.checkout_status 
  AND cs.code_class = 'checkout_status'
WHERE p.organization_id = $1 
  AND p.project_id = $2
```

### 4.3 タスク存在チェッククエリ

```sql
SELECT EXISTS(
  SELECT 1 FROM project_task_detail
  WHERE organization_id = $1 
    AND project_id = $2
) as has_tasks
```

### 4.4 タスク詳細取得クエリ

```sql
SELECT 
  ptd.method_id,
  ptd.task_no,
  ptd.task_status,
  ts.code_name as task_status_name,
  ptd.worker_user_id,
  wu.user_name as worker_user_name,
  ptd.reviewer_user_id,
  ru.user_name as reviewer_user_name
FROM project_task_detail ptd
LEFT JOIN code_master ts 
  ON ts.code_value = ptd.task_status 
  AND ts.code_class = 'task_status'
LEFT JOIN organization_user wu 
  ON wu.user_id = ptd.worker_user_id
LEFT JOIN organization_user ru 
  ON ru.user_id = ptd.reviewer_user_id
WHERE ptd.organization_id = $1 
  AND ptd.project_id = $2
ORDER BY ptd.task_no ASC
```

### 4.5 Worker権限チェッククエリ（必要時）

```sql
SELECT EXISTS(
  SELECT 1 FROM project_task_detail
  WHERE organization_id = $1 
    AND project_id = $2 
    AND worker_user_id = $3
) as is_assigned
```

## 5. S3ファイル操作

### 5.1 ファイル一覧取得

```typescript
// プロジェクトフォルダのファイル一覧
const files = await storageService.listFiles(
  organizationPrefix,  // org_{organization_prefix}
  `projects/${projectName}/`
);

// アーカイブフォルダのファイル一覧
const archiveFiles = await storageService.listFiles(
  organizationPrefix,
  `projects/${projectName}/archive/`
);
```

### 5.2 署名付きURL生成

```typescript
const signedUrl = await storageService.getSignedUrl(
  organizationPrefix,
  filePath,
  3600  // 有効期限: 1時間
);
```

### 5.3 バージョン番号抽出

```typescript
// アーカイブファイル名からバージョン番号を抽出
// 例: "sample_project_v1.maiml" → version: 1
const versionMatch = fileName.match(/_v(\d+)\.maiml$/);
const version = versionMatch ? parseInt(versionMatch[1]) : null;
```

## 6. 並列データ取得フロー

### 6.1 Phase 1: 並列取得

```typescript
// Promise.allで並列実行（50-70%の時間短縮）
const [projectResult, filesResult, tasksExistResult] = await Promise.all([
  this.getProjectInfo(organizationId, projectId),
  this.listProjectFiles(organizationPrefix, projectName),
  this.checkTasksExist(organizationId, projectId)
]);
```

### 6.2 Phase 2: 条件付きタスク取得

```typescript
// タスクが存在する場合のみ詳細を取得
let tasks = [];
if (tasksExistResult) {
  tasks = await this.getTaskDetails(organizationId, projectId);
}
```

### 6.3 Phase 3: サマリー生成

```typescript
// メモリ内で計算（追加のDBクエリなし）
const summary = {
  totalFiles: files.length,
  totalTasks: tasks.length,
  completedTasks: tasks.filter(t => t.taskStatus === 3).length,
  runningTasks: tasks.filter(t => t.taskStatus === 1).length,
  waitingTasks: tasks.filter(t => t.taskStatus === 0).length
};
```

## 7. セキュリティ設計

### 7.1 認証・認可

- **JWT認証**: authMiddlewareで検証
- **組織ID検証**: tenantIsolationで自動チェック
- **権限確認**: permissionCheckで実行
- **Worker権限**: タスク割り当てチェック（条件付き）

### 7.2 SQLインジェクション対策

- Parameterized Queries必須
- ユーザー入力は全てプレースホルダー経由
- 文字列連結でクエリ構築禁止

### 7.3 マルチテナント分離

- すべてのクエリに`WHERE organization_id = $1`
- S3操作にorganization_prefix強制適用
- JOIN時も両テーブルでorganization_id指定

### 7.4 S3署名付きURL

- 有効期限: 1時間（3600秒）
- organization_prefix必須
- 直接URLは返却しない

## 8. パフォーマンス最適化

### 8.1 並列実行

- プロジェクト情報、S3ファイル、タスク存在チェックを並列実行
- 50-70%のレスポンスタイム短縮を実現

### 8.2 条件付きクエリ

- タスクが存在する場合のみ詳細取得
- 不要なJOINクエリを回避

### 8.3 インデックス活用

既存インデックス:
- `project(organization_id, project_id)`
- `project_task_detail(organization_id, project_id)`
- `code_master(code_class, code_value)`

### 8.4 キャッシング（オプション）

- プロジェクト基本情報: TTL 3分
- code_master: TTL 10分

## 9. エラーハンドリング

### 9.1 エラーケース

| エラー | ステータス | コード |
|--------|-----------|--------|
| UUID無効 | 400 | VALIDATION_INVALID_UUID |
| JWT無効 | 401 | AUTH_TOKEN_INVALID |
| JWT期限切れ | 401 | AUTH_TOKEN_EXPIRED |
| 権限不足 | 403 | PERMISSION_INSUFFICIENT |
| プロジェクト不存在 | 404 | RESOURCE_NOT_FOUND |
| DBエラー | 500 | SYSTEM_DATABASE_ERROR |

### 9.2 S3エラーのグレースフル処理

- S3エラー時は警告ログを記録
- 空のファイル配列を返却（500エラーにしない）
- プロジェクト基本情報は正常に返却

## 10. 実装順序

### Phase 1: Service層実装
- projectService.tsにgetByIdメソッド追加
- 並列データ取得ロジック実装
- データベースクエリ実装
- S3ファイル操作実装

### Phase 2: Controller層実装
- projectController.tsにgetByIdメソッド追加
- リクエスト処理実装
- バリデーション実装
- レスポンス整形実装

### Phase 3: Routes層実装
- projectRoutes.tsにGET /:projectIdルート追加
- express-validator設定
- ミドルウェアチェーン適用

### Phase 4: テスト実装
- ユニットテスト
- 統合テスト
- パフォーマンステスト

### Phase 5: 動作確認
- 手動テスト
- レビュー

## 11. 参考実装

既存のAPI実装を参考にする:
- `backend/src/routes/projectRoutes.ts`（一覧取得API）
- `backend/src/controllers/projectController.ts`（一覧取得API）
- `backend/src/services/projectService.ts`（一覧取得API）
- `backend/src/services/storageService.ts`（S3操作）

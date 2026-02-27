# プロジェクト管理API仕様書

**作成日**: 2026-01-21 16:30  
**最終更新**: 2026-02-27 15:20  
**バージョン**: 2.7.0  
**対象画面**: 実験管理者 - プロジェクト管理画面  
**総API数**: 16個  
**実装状況**: 13個実装済み、3個未実装

---

## 📊 実装状況サマリー

| カテゴリ | 実装済み | 未実装 | 合計 |
|---------|---------|--------|------|
| 基本CRUD | 2 | 0 | 2 |
| チェックイン/チェックアウト | 3 | 0 | 3 |
| データ取得 | 2 | 0 | 2 |
| 指示管理 | 2 | 2 | 4 |
| プロジェクト検索 | 0 | 1 | 1 |
| 実験作業者用 | 4 | 0 | 4 |
| **合計** | **13** | **3** | **16** |

**完了率**: 81% (13/16)

---

## 🎯 API一覧

| # | API名 | メソッド | エンドポイント | 状態 | 優先度 |
|---|------|---------|---------------|------|--------|
| 1 | プロジェクト一覧取得 | GET | `/api/v1/projects` | ✅ 実装済み | - |
| 2 | プロジェクト作成 | POST | `/api/v1/projects` | ✅ 実装済み | - |
| 3 | チェックアウト | POST | `/api/v1/projects/:projectId/checkout` | ✅ 実装済み | - |
| 4 | チェックイン | POST | `/api/v1/projects/:projectId/checkin` | ✅ 実装済み | - |
| 5 | ファイル一覧取得 | GET | `/api/v1/projects/:projectName/files` | ✅ 実装済み | - |
| 6 | タスク一覧取得 | GET | `/api/v1/projects/:projectName/tasks` | ✅ 実装済み | - |
| 7 | プロジェクト詳細取得 | GET | `/api/v1/projects/:projectId` | ✅ 実装済み | - |
| 8 | チェックアウト状態取得 | GET | `/api/v1/projects/:projectId/checkout-status` | ✅ 実装済み | - |
| 9 | 指示一覧取得（実験作業者用） | GET | `/api/v1/projects/:projectName/worker-instructions` | ✅ 実装済み | - |
| 10 | 指示確認完了 | PUT | `/api/v1/projects/:projectName/instructions/:instructionId/confirm` | ✅ 実装済み | - |
| 11 | 承認依頼 | PATCH | `/api/v1/projects/:projectName/approval-request` | ✅ 実装済み | - |
| 12 | 実験作業者用プロジェクト一覧 | GET | `/api/v1/projects/worker-accessible` | ✅ 実装済み | - |
| 13 | MAIMLファイル取得（プロジェクト） | GET | `/api/v1/projects/:projectId/maiml` | ✅ 実装済み | - |
| 14 | 指示送信（タスク作成） | POST | `/api/v1/projects/:projectName/instructions` | 🔴 未実装 | ⭐⭐⭐ 高 |
| 15 | 指示一覧取得（実験管理者用） | GET | `/api/v1/projects/:projectName/instructions` | 🔴 未実装 | ⭐⭐ 中 |
| 16 | プロジェクト詳細検索 | POST | `/api/v1/projects/search` | 🔴 未実装 | ⭐ 低 |
| 17 | タスク登録情報取得 | GET | `/api/v1/projects/:projectName/task-registration` | ✅ 実装済み | ⭐⭐⭐ 高 |
| 18 | タスク登録保存 | POST | `/api/v1/projects/:projectName/task-registration` | ✅ 実装済み | ⭐⭐⭐ 高 |

---


## 🔐 共通仕様

### 認証・認可

**認証方式**: JWT + Session Hybrid

**必須ヘッダー**:
```http
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
```

**organization_id の取得**:
- ログイン時に `X-Organization-Id` ヘッダーから組織IDを取得し、セッションに保存します
- ログイン後のAPIでは、`Authorization` ヘッダーのセッショントークンから自動的に取得されます
- リクエストヘッダーで `X-Organization-Id` を指定する必要はありません
- `authMiddleware` がセッション情報を検証し、ユーザー情報（organization_idを含む）を `req.user` に格納します

**権限要件**:
- すべてのAPI: `experiment_admin` または `system_admin` ロール必須
- `experiment_worker` ロールは403 Forbiddenを返却

**ミドルウェアチェーン**:
```typescript
router.METHOD('/path', 
  authMiddleware,           // 1. JWT認証（セッション検証、req.userに格納）
  permissionCheck([...]),   // 2. 権限チェック
  controller.handler        // 3. コントローラー処理
);
```

**ミドルウェアの動作**:
1. `authMiddleware`: JWTトークン（`maiml_session-{sessionId}_{timestamp}`）を検証し、セッション情報を取得して `req.user` に格納（organizationIdを含む）
2. `permissionCheck`: ユーザーのロール（`req.user.role`）を検証
3. コントローラー: `req.user.organizationId` を使用してテナント分離されたデータにアクセス

### マルチテナント分離

- すべてのDBクエリに `organization_id` フィルタ必須
- すべてのS3パスに `org_{organization_prefix}` プレフィックス必須
- クロステナントアクセスは厳禁（System Admin除く）

### 統一レスポンス形式

**成功レスポンス**:
```json
{
  "success": true,
  "data": { ... },
  "pagination": {  // オプショナル
    "page": 1,
    "limit": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": [
      {
        "field": "fieldName",
        "message": "詳細メッセージ",
        "code": "FIELD_ERROR_CODE"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### 共通エラーコード

| コード | HTTPステータス | 説明 |
|-------|---------------|------|
| `AUTH_TOKEN_INVALID` | 401 | 認証トークンが無効 |
| `PERMISSION_INSUFFICIENT` | 403 | 権限不足 |
| `RESOURCE_NOT_FOUND` | 404 | リソースが見つからない |
| `VALIDATION_ERROR` | 400 | バリデーションエラー |
| `VALIDATION_REQUIRED_FIELD` | 400 | 必須フィールドが未入力 |
| `VALIDATION_INVALID_FORMAT` | 400 | フォーマットが不正 |
| `SYSTEM_ERROR` | 500 | システムエラー |
| `SYSTEM_DATABASE_ERROR` | 500 | データベースエラー |

---

## 📋 API詳細仕様

### 1. プロジェクト一覧取得 ✅

**エンドポイント**: `GET /api/v1/projects`

**説明**: 組織内のプロジェクト一覧を取得

**認証**: 必須

**権限**: `experiment_admin`, `system_admin`

#### リクエストパラメータ

**クエリパラメータ**:
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|----------|---|------|-----------|------|
| `page` | integer | × | 1 | ページ番号（1以上） |
| `limit` | integer | × | 20 | 1ページあたりの件数（1-100） |
| `include_completed` | boolean | × | false | 完了プロジェクトを含める |
| `sort_by` | string | × | `create_at` | ソート項目（`create_at`, `project_name`） |
| `order` | string | × | `desc` | ソート順（`asc`, `desc`） |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "project_id": "550e8400-e29b-41d4-a716-446655440000",
      "project_name": "Sample Project",
      "description": "プロジェクトの説明",
      "project_status": "created",
      "is_checked_out": false,
      "checked_out_by": null,
      "checked_out_at": null,
      "checked_out_user_name": null,
      "create_at": "2026-01-21T10:00:00Z",
      "update_at": "2026-01-21T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラー時**:
- 401: 認証エラー
- 403: 権限不足
- 400: バリデーションエラー
- 500: システムエラー

#### 実装ファイル
- **ルート**: `backend/src/routes/projectRoutes.ts`
- **コントローラー**: `backend/src/controllers/projectController.ts` (`list`)
- **サービス**: `backend/src/services/projectService.ts` (`list`)

---

### 2. プロジェクト作成 ✅

**エンドポイント**: `POST /api/v1/projects`

**説明**: 新規プロジェクトを作成

**認証**: 必須

**権限**: `experiment_admin`, `system_admin`

#### リクエスト

**ボディ（JSON）**:
```json
{
  "projectName": "New Project",
  "description": "プロジェクトの説明（オプション）"
}
```

**バリデーション**:
| フィールド | 型 | 必須 | 制約 |
|----------|---|------|------|
| `projectName` | string | ○ | 1-255文字、制御文字不可 |
| `description` | string | × | 0-1000文字 |

#### レスポンス

**成功時 (201 Created)**:
```json
{
  "success": true,
  "data": {
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_name": "New Project",
    "description": "プロジェクトの説明",
    "project_status": "created",
    "organization_id": "org-uuid",
    "department_id": "dept-uuid",
    "create_user_id": "user-uuid",
    "create_at": "2026-01-21T16:00:00Z",
    "update_at": "2026-01-21T16:00:00Z"
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラー時**:
- 400: バリデーションエラー
- 409: プロジェクト名重複（`BUSINESS_DUPLICATE_PROJECT_NAME`）
- 401: 認証エラー
- 403: 権限不足
- 500: システムエラー

#### 実装ファイル
- **ルート**: `backend/src/routes/projectRoutes.ts`
- **コントローラー**: `backend/src/controllers/projectController.ts` (`create`)
- **サービス**: `backend/src/services/projectService.ts` (`create`)

---

### 3. チェックアウト ✅

**エンドポイント**: `POST /api/v1/projects/:projectName/checkout`

**説明**: プロジェクトをチェックアウトし、排他編集を開始

**認証**: 必須

**権限**: `experiment_admin`, `system_admin`

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ○ | プロジェクト名 |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_name": "Sample Project",
    "is_checked_out": true,
    "checked_out_by": "user-uuid",
    "checked_out_at": "2026-01-21T16:00:00Z",
    "project_status": "in_progress"
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラー時**:
- 400: バリデーションエラー、プロジェクトステータス不正
- 401: 認証エラー
- 403: 権限不足
- 404: プロジェクトが存在しない
- 409: 既にチェックアウト済み（`PROJECT_ALREADY_CHECKED_OUT`）
- 500: システムエラー

#### ビジネスルール
- プロジェクトステータスが `created` または `checked_in` の場合のみチェックアウト可能
- チェックアウト中は他のユーザーは編集不可
- チェックアウト時に指示が存在しない場合はエラー

#### 実装ファイル
- **ルート**: `backend/src/routes/projectRoutes.ts`
- **コントローラー**: `backend/src/controllers/projectController.ts` (`checkout`)
- **サービス**: `backend/src/services/projectService.ts` (`checkout`)

---

### 4. チェックイン ✅

**エンドポイント**: `POST /api/v1/projects/:projectName/checkin`

**説明**: プロジェクトをチェックインし、排他編集を終了

**認証**: 必須

**権限**: `experiment_admin`, `system_admin`

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ○ | プロジェクト名 |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_name": "Sample Project",
    "is_checked_out": false,
    "checked_out_by": null,
    "checked_out_at": null,
    "project_status": "checked_in"
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラー時**:
- 400: 実行中のタスクあり（`TASK_IN_PROGRESS`）
- 401: 認証エラー
- 403: 権限不足（他ユーザーがチェックアウト中）
- 404: プロジェクトが存在しない
- 500: システムエラー

#### ビジネスルール
- チェックアウトしたユーザーのみチェックイン可能
- 実行中のタスクがある場合はチェックイン不可
- チェックイン時にプロジェクトステータスを `checked_in` に更新

#### 実装ファイル
- **ルート**: `backend/src/routes/projectRoutes.ts`
- **コントローラー**: `backend/src/controllers/projectController.ts` (`checkin`)
- **サービス**: `backend/src/services/projectService.ts` (`checkin`)

---

### 5. ファイル一覧取得 ✅

**エンドポイント**: `GET /api/v1/projects/:projectName/files`

**説明**: プロジェクト内のファイル一覧を取得

**認証**: 必須

**権限**: `experiment_admin`, `system_admin`

**優先度**: ⭐⭐⭐ 高

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ○ | プロジェクト名 |

**クエリパラメータ**:
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|----------|---|------|-----------|------|
| `include_archive` | boolean | × | false | アーカイブファイルを含める |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_name": "Sample Project",
    "files": [
      {
        "file_id": "file-uuid",
        "file_name": "sample_project.maiml",
        "file_path": "org_maiml_lab_001/projects/Sample_Project/sample_project.maiml",
        "file_size": 12345,
        "file_type": "maiml",
        "is_archive": false,
        "version": null,
        "created_at": "2026-01-21T10:00:00Z",
        "updated_at": "2026-01-21T16:00:00Z"
      }
    ],
    "archive_files": [
      {
        "file_id": "archive-file-uuid",
        "file_name": "sample_project_v1.maiml",
        "file_path": "org_maiml_lab_001/projects/Sample_Project/archive/sample_project_v1.maiml",
        "file_size": 11234,
        "file_type": "maiml",
        "is_archive": true,
        "version": 1,
        "created_at": "2026-01-20T10:00:00Z",
        "updated_at": "2026-01-20T10:00:00Z"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラー時**:
- 400: バリデーションエラー
- 401: 認証エラー
- 403: 権限不足
- 404: プロジェクトが存在しない
- 500: システムエラー

#### 実装ファイル
- **ルート**: `backend/src/routes/projectRoutes.ts`
- **コントローラー**: `backend/src/controllers/projectController.ts` (`getProjectFiles`)
- **サービス**: `backend/src/services/projectService.ts` (`getProjectFiles`)

#### 実装要件
- S3から `org_{organization_prefix}/projects/{project_name}/` 配下のファイル一覧を取得
- archiveファイルは常に取得される（`include_archive`パラメータは削除済み）
- バージョン番号は `_v{number}` から抽出
- 署名付きURL付きで返却

---

### 6. タスク一覧取得 ✅

**エンドポイント**: `GET /api/v1/projects/:projectName/tasks`

**説明**: プロジェクト内のタスク一覧を取得

**認証**: 必須

**権限**: `experiment_admin`, `system_admin`

**優先度**: ⭐⭐⭐ 高

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ○ | プロジェクト名 |

**クエリパラメータ**:
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|----------|---|------|-----------|------|
| `status` | string | × | all | タスクステータスフィルタ（`all`, `pending`, `in_progress`, `completed`, `failed`） |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_name": "Sample Project",
    "tasks": [
      {
        "task_id": "task-uuid",
        "task_name": "実験タスク1",
        "task_status": "in_progress",
        "assigned_to": "worker-uuid",
        "assigned_user_name": "Worker Name",
        "method_name": "Method 1",
        "transition_name": "Transition A",
        "created_at": "2026-01-21T10:00:00Z",
        "updated_at": "2026-01-21T16:00:00Z",
        "completed_at": null
      }
    ],
    "statistics": {
      "total": 10,
      "pending": 2,
      "in_progress": 5,
      "completed": 3,
      "failed": 0
    }
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラー時**:
- 400: バリデーションエラー
- 401: 認証エラー
- 403: 権限不足
- 404: プロジェクトが存在しない
- 500: システムエラー

#### 実装ファイル
- **ルート**: `backend/src/routes/projectRoutes.ts`
- **コントローラー**: `backend/src/controllers/projectController.ts` (`getProjectTasks`)
- **サービス**: `backend/src/services/projectService.ts` (`getProjectTasks`)

#### 実装要件
- `project_task` テーブルから取得
- ステータスフィルタリング対応
- ワーカー名、メソッド名、トランジション名をJOINで取得
- タスク統計を集計

---

### 7. 指示送信（タスク作成） 🔴

**エンドポイント**: `POST /api/v1/projects/:projectName/instructions`

**説明**: プロジェクトに対して実験指示を送信し、タスクを作成

**認証**: 必須

**権限**: `experiment_admin`, `system_admin`

**優先度**: ⭐⭐⭐ 高

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ○ | プロジェクト名 |

**ボディ（JSON）**:
```json
{
  "instructionTitle": "実験指示タイトル",
  "instructionContent": "実験指示の詳細内容",
  "dueDate": "2026-01-31T23:59:59Z",
  "tasks": [
    {
      "methodId": "method-uuid",
      "transitionId": "transition-uuid",
      "assignedTo": "worker-uuid",
      "priority": "high"
    }
  ]
}
```

**バリデーション**:
| フィールド | 型 | 必須 | 制約 |
|----------|---|------|------|
| `instructionTitle` | string | ○ | 1-255文字 |
| `instructionContent` | string | ○ | 1-5000文字 |
| `dueDate` | ISO8601 | × | 未来の日時 |
| `tasks` | array | ○ | 1個以上 |
| `tasks[].methodId` | UUID | ○ | 有効なメソッドID |
| `tasks[].transitionId` | UUID | ○ | 有効なトランジションID |
| `tasks[].assignedTo` | UUID | ○ | 有効なワーカーID |
| `tasks[].priority` | string | × | `low`, `medium`, `high` |

#### レスポンス

**成功時 (201 Created)**:
```json
{
  "success": true,
  "data": {
    "instruction_id": "instruction-uuid",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "instruction_title": "実験指示タイトル",
    "instruction_content": "実験指示の詳細内容",
    "due_date": "2026-01-31T23:59:59Z",
    "created_tasks": [
      {
        "task_id": "task-uuid",
        "method_id": "method-uuid",
        "transition_id": "transition-uuid",
        "assigned_to": "worker-uuid",
        "task_status": "pending"
      }
    ],
    "created_at": "2026-01-21T16:00:00Z"
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラー時**:
- 400: バリデーションエラー、期限が過去
- 401: 認証エラー
- 403: 権限不足
- 404: プロジェクト、メソッド、トランジション、ワーカーが存在しない
- 500: システムエラー

#### 実装要件
- `project_instruction` テーブルに指示を登録
- 各タスクを `project_task` テーブルに登録
- トランザクション処理必須

---

### 8. 指示一覧取得 🔴

**エンドポイント**: `GET /api/v1/projects/:projectName/instructions`

**説明**: プロジェクトの指示一覧を取得

**認証**: 必須

**権限**: `experiment_admin`, `system_admin`

**優先度**: ⭐⭐ 中

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ○ | プロジェクト名 |

**クエリパラメータ**:
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|----------|---|------|-----------|------|
| `page` | integer | × | 1 | ページ番号 |
| `limit` | integer | × | 20 | 1ページあたりの件数（1-100） |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "instruction_id": "instruction-uuid",
      "instruction_title": "実験指示タイトル",
      "instruction_content": "実験指示の詳細内容",
      "due_date": "2026-01-31T23:59:59Z",
      "task_count": 5,
      "completed_tasks": 2,
      "created_at": "2026-01-21T10:00:00Z",
      "created_by": "user-uuid",
      "created_by_name": "Manager Name"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 50,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラー時**:
- 400: バリデーションエラー
- 401: 認証エラー
- 403: 権限不足
- 404: プロジェクトが存在しない
- 500: システムエラー

---

### 9. プロジェクト詳細検索 ✅

**エンドポイント**: `POST /api/v1/projects/search`

**注意**: 実装ファイルではルートが定義されていますが、コントローラー/サービス層の実装状況を要確認

**説明**: 複雑な条件でプロジェクトを検索

**認証**: 必須

**権限**: `experiment_admin`, `system_admin`

**優先度**: ⭐⭐ 中

#### リクエスト

**ボディ（JSON）**:
```json
{
  "projectName": "検索キーワード",
  "status": ["created", "in_progress"],
  "dateRange": {
    "start": "2026-01-01",
    "end": "2026-01-31"
  },
  "createdBy": "user-uuid",
  "hasActiveTasks": true,
  "page": 1,
  "limit": 20
}
```

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "project_id": "550e8400-e29b-41d4-a716-446655440000",
      "project_name": "Sample Project",
      "description": "プロジェクトの説明",
      "project_status": "in_progress",
      "is_checked_out": true,
      "checked_out_by": "user-uuid",
      "active_tasks_count": 5,
      "create_at": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 10,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

### 10. プロジェクト公開 ✅

**エンドポイント**: `POST /api/v1/projects/:projectName/publish`

**注意**: 実装ファイルではルートが定義されていますが、コントローラー/サービス層の実装状況を要確認

**説明**: プロジェクトを公開状態に変更

**認証**: 必須

**権限**: `experiment_admin`, `system_admin`

**優先度**: ⭐⭐ 中

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ○ | プロジェクト名 |

**ボディ（JSON）**:
```json
{
  "publishNote": "公開コメント（オプション）"
}
```

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_name": "Sample Project",
    "project_status": "published",
    "published_at": "2026-01-21T16:00:00Z",
    "published_by": "user-uuid"
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラー時**:
- 400: プロジェクトステータスが不正
- 401: 認証エラー
- 403: 権限不足
- 404: プロジェクトが存在しない
- 500: システムエラー

#### ビジネスルール
- 完了済みのプロジェクトのみ公開可能
- 公開後は編集不可

---

### 11. 指示一覧取得（実験作業者用） 🔴

**エンドポイント**: `GET /api/v1/projects/:projectName/worker-instructions`

**説明**: 実験作業者が自分に割り当てられた指示一覧を取得

**認証**: 必須

**権限**: `experiment_worker`（読取専用）

**優先度**: ⭐⭐⭐ 高

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ○ | プロジェクト名 |

**クエリパラメータ**:
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|----------|---|------|-----------|------|
| `projectId` | UUID | × | - | プロジェクトIDでフィルタリング |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "instruction_id": "instruction-uuid",
      "project_id": "project-uuid",
      "project_name": "Sample Project",
      "method_id": "method1",
      "method_name": "合成実験",
      "task_no": 1,
      "transition_id": "transition-uuid-1",
      "transition_name": "材料準備トランジション",
      "instruction_target": "task",
      "instruction_content": "指示内容の詳細",
      "priority": "high",
      "type": "normal",
      "is_acknowledged": false,
      "acknowledged_at": null,
      "acknowledged_user_id": null,
      "created_at": "2026-01-21T10:00:00Z",
      "created_by": "manager-uuid",
      "created_by_name": "Manager Name"
    },
    {
      "instruction_id": "instruction-uuid-2",
      "project_id": "project-uuid",
      "project_name": "Sample Project",
      "method_id": "method1",
      "method_name": "合成実験",
      "task_no": 2,
      "transition_id": "transition-uuid-2",
      "transition_name": "反応実験トランジション",
      "instruction_target": "transition",
      "instruction_content": "トランジション指示の詳細",
      "priority": "medium",
      "type": "urgent",
      "is_acknowledged": true,
      "acknowledged_at": "2026-01-21T14:00:00Z",
      "acknowledged_user_id": "worker-uuid",
      "created_at": "2026-01-21T10:00:00Z",
      "created_by": "manager-uuid",
      "created_by_name": "Manager Name"
    }
  ],
  "meta": {
    "timestamp": "2026-01-27T19:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラー時**:
- 400: バリデーションエラー
- 401: 認証エラー
- 403: 権限不足
- 500: システムエラー

#### 実装要件

**DBクエリ**:
```typescript
// project_instructionテーブルから指示を取得
let query = db
  .selectFrom('project_instruction')
  .innerJoin('project', 'project_instruction.project_id', 'project.project_id')
  .leftJoin('organization_user as creator', 'project_instruction.create_user_id', 'creator.user_id')
  .leftJoin('user_authentication', 'creator.user_id', 'user_authentication.user_id')
  .where('project_instruction.organization_id', '=', organizationId);

// 実験作業者の場合は自分が担当するタスクに紐づく指示のみ
if (req.user.role === 'experiment_worker') {
  query = query
    .innerJoin('project_task', 'project_instruction.instruction_id', 'project_task.instruction_id')
    .where('project_task.assign_user_id', '=', req.user.userId);
}

// フィルタリング
if (projectId) {
  query = query.where('project_instruction.project_id', '=', projectId);
}

const instructions = await query
  .select([
    'project_instruction.*',
    'project.project_name',
    'user_authentication.user_name as created_by_name'
  ])
  .orderBy('project_instruction.create_at', 'desc')
  .execute();
```

**メソッド名・タスク名の取得**:
```typescript
// MAIMLファイルからメソッド情報を取得
for (const instruction of instructions) {
  const project = await db
    .selectFrom('project')
    .where('project_id', '=', instruction.project_id)
    .select('project_name')
    .executeTakeFirst();

  if (project) {
    const maimlContent = await storageService.downloadFile(
      organizationPrefix,
      `projects/${project.project_name}/${project.project_name}.maiml`
    );

    const methods = await parseMultipleMethodsStructure(maimlContent);
    const method = methods.find(m => m.methodId === instruction.method_id);
    
    instruction.method_name = method?.methodName || '';
    
    if (instruction.task_no && method) {
      const task = method.tasks?.find(t => t.task_no === instruction.task_no);
      instruction.task_name = task?.task_name || '';
    }
  }
}
```

---

### 12. 指示確認完了 🔴

**エンドポイント**: `PUT /api/v1/projects/:projectName/instructions/:instructionId/confirm`

**説明**: 指示を確認済みに変更

**認証**: 必須

**権限**: `experiment_worker`（書込可）

**優先度**: ⭐⭐ 中

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ○ | プロジェクト名 |
| `instructionId` | UUID | ○ | 指示ID |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "instruction_id": "instruction-uuid",
    "is_acknowledged": true,
    "acknowledged_at": "2026-01-27T19:00:00Z",
    "acknowledged_user_id": "worker-uuid"
  },
  "meta": {
    "timestamp": "2026-01-27T19:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラー時**:
- 400: バリデーションエラー、既に確認済み
- 401: 認証エラー
- 403: 権限不足（担当者以外が確認しようとした）
- 404: 指示が存在しない
- 500: システムエラー

#### ビジネスロジック

**前提条件チェック**:
```typescript
// 指示が存在するか確認
const instruction = await db
  .selectFrom('project_instruction')
  .where('instruction_id', '=', instructionId)
  .where('organization_id', '=', organizationId)
  .selectAll()
  .executeTakeFirstOrThrow();

// 実験作業者の場合は自分のタスクに紐づく指示のみ
if (req.user.role === 'experiment_worker') {
  const task = await db
    .selectFrom('project_task')
    .where('instruction_id', '=', instructionId)
    .where('assign_user_id', '=', req.user.userId)
    .where('organization_id', '=', organizationId)
    .executeTakeFirst();

  if (!task) {
    throw new ForbiddenError('自分に割り当てられていない指示は確認できません');
  }
}

// 既に確認済みの場合はエラー
if (instruction.is_acknowledged) {
  throw new BadRequestError('この指示は既に確認済みです');
}
```

#### 実装要件

**DBクエリ**:
```typescript
// 指示を確認済みに更新
await db
  .updateTable('project_instruction')
  .set({
    is_acknowledged: true,
    acknowledged_at: new Date().toISOString(),
    acknowledged_user_id: req.user.userId,
    update_at: new Date().toISOString()
  })
  .where('instruction_id', '=', instructionId)
  .where('organization_id', '=', organizationId)
  .execute();

// 更新後のユーザー名を取得
const user = await db
  .selectFrom('organization_user')
  .innerJoin('user_authentication', 'organization_user.user_id', 'user_authentication.user_id')
  .where('organization_user.user_id', '=', req.user.userId)
  .select('user_authentication.user_name')
  .executeTakeFirst();
```

---

### 13. 承認依頼 🔴

**エンドポイント**: `PATCH /api/v1/projects/:projectName/approval-request`

**説明**: 実験作業完了後に実験管理者へ承認依頼を送信

**認証**: 必須

**権限**: `experiment_worker`（書込可）

**優先度**: ⭐⭐⭐ 高

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ○ | プロジェクト名 |

**ボディ（JSON）**:
```json
{
  "comment": "すべての実験が完了しました。ご確認をお願いします。"
}
```

**バリデーション**:
| フィールド | 型 | 必須 | 制約 |
|----------|---|------|------|
| `comment` | string | × | 0-1000文字 |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "project_id": "project-uuid",
    "project_name": "Sample Project",
    "previous_status": "active",
    "new_status": "waiting_approval",
    "requested_by": "worker-uuid",
    "requested_by_name": "Worker Name",
    "requested_at": "2026-01-27T19:00:00Z",
    "comment": "すべての実験が完了しました。ご確認をお願いします。",
    "notification_id": "notification-uuid"
  },
  "meta": {
    "timestamp": "2026-01-27T19:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラー時**:
- 400: バリデーションエラー、タスク未完了
- 401: 認証エラー
- 403: 権限不足（担当者以外が依頼しようとした）
- 404: プロジェクトが存在しない
- 409: プロジェクトステータスが不正、未解決の問題が存在
- 500: システムエラー

#### ビジネスロジック

**前提条件チェック**:
```typescript
// プロジェクト情報を取得
const project = await db
  .selectFrom('project')
  .where('project_id', '=', projectId)
  .where('organization_id', '=', organizationId)
  .selectAll()
  .executeTakeFirstOrThrow();

// プロジェクトステータスが active であることを確認
if (project.project_status !== 'active') {
  throw new ConflictError(
    `プロジェクトステータスが '${project.project_status}' のため、承認依頼できません`
  );
}

// すべてのタスクが完了状態であることを確認
const incompleteTasks = await db
  .selectFrom('project_task')
  .where('project_id', '=', projectId)
  .where('organization_id', '=', organizationId)
  .where('task_status', '!=', 'completed')
  .select(db.fn.count('task_id').as('count'))
  .executeTakeFirstOrThrow();

if (Number(incompleteTasks.count) > 0) {
  throw new BadRequestError(
    `未完了のタスクが ${incompleteTasks.count} 件あります。すべてのタスクを完了してください。`
  );
}

// 未解決の問題が存在しないことを確認
const unresolvedIssues = await db
  .selectFrom('task_issue')
  .where('project_id', '=', projectId)
  .where('organization_id', '=', organizationId)
  .where('status', '=', 'open')
  .select(db.fn.count('issue_id').as('count'))
  .executeTakeFirstOrThrow();

if (Number(unresolvedIssues.count) > 0) {
  throw new ConflictError(
    `未解決の問題が ${unresolvedIssues.count} 件あります。すべての問題を解決してください。`
  );
}
```

#### 実装要件

**DBクエリ（トランザクション）**:
```typescript
await db.transaction().execute(async (trx) => {
  // プロジェクトステータスを waiting_approval に更新
  await trx
    .updateTable('project')
    .set({
      project_status: 'waiting_approval',
      update_at: new Date().toISOString(),
      update_user_id: req.user.userId
    })
    .where('project_id', '=', projectId)
    .where('organization_id', '=', organizationId)
    .execute();

  // system_notificationテーブルに通知登録
  const notificationId = uuidv4();
  await trx
    .insertInto('system_notification')
    .values({
      notification_id: notificationId,
      organization_id: organizationId,
      notification_type: 'approval_request',
      title: `承認依頼: ${project.project_name}`,
      message: comment || '実験作業が完了しました。承認をお願いします。',
      related_entity_type: 'project',
      related_entity_id: projectId,
      created_by: req.user.userId,
      create_at: new Date().toISOString(),
      is_read: false
    })
    .execute();

  // 監査ログ記録
  logger.info('Approval request submitted', {
    projectId,
    projectName: project.project_name,
    requestedBy: req.user.userId,
    organizationId,
    comment
  });

  return notificationId;
});
```

---

### 14. 実験作業者用プロジェクト一覧取得 🔴

**エンドポイント**: `GET /api/v1/projects/worker-accessible`

**説明**: 実験作業者が選択可能なプロジェクト一覧を取得

**認証**: 必須

**権限**: `experiment_worker`（読取専用）

**優先度**: ⭐⭐⭐ 高

#### リクエストパラメータ

**クエリパラメータ**:
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|----------|---|------|-----------|------|
| `page` | integer | × | 1 | ページ番号（1以上） |
| `limit` | integer | × | 20 | 1ページあたりの件数（1-100） |
| `status` | string | × | - | ステータスフィルタ（`draft`, `active`, `waiting_approval`, `approved`） |
| `sort_by` | string | × | `create_at` | ソート項目（`create_at`, `project_name`, `update_at`） |
| `order` | string | × | `desc` | ソート順（`asc`, `desc`） |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "project_id": "project-uuid",
      "project_name": "Sample Project",
      "description": "プロジェクトの説明",
      "project_status": "active",
      "my_task_count": 5,
      "completed_task_count": 2,
      "pending_instruction_count": 3,
      "has_unresolved_issues": false,
      "created_at": "2026-01-21T10:00:00Z",
      "updated_at": "2026-01-27T19:00:00Z"
    },
    {
      "project_id": "project-uuid-2",
      "project_name": "Another Project",
      "description": "別のプロジェクト",
      "project_status": "waiting_approval",
      "my_task_count": 3,
      "completed_task_count": 3,
      "pending_instruction_count": 0,
      "has_unresolved_issues": false,
      "created_at": "2026-01-20T10:00:00Z",
      "updated_at": "2026-01-27T18:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 15,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2026-01-27T19:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラー時**:
- 400: バリデーションエラー
- 401: 認証エラー
- 403: 権限不足
- 500: システムエラー

#### ビジネスロジック

**対象プロジェクト**:
- ステータスが `draft`, `active`, `waiting_approval`, `approved` のプロジェクト
- 実験作業者に少なくとも1つのタスクが割り当てられているプロジェクト
- 自組織内のプロジェクトのみ（マルチテナント分離）

#### 実装要件

**DBクエリ**:
```typescript
let query = db
  .selectFrom('project')
  .innerJoin('project_task', 'project.project_id', 'project_task.project_id')
  .where('project.organization_id', '=', organizationId)
  .where('project.project_status', 'in', ['draft', 'active', 'waiting_approval', 'approved']);

// 実験作業者の場合は自分が担当するタスクがあるプロジェクトのみ
if (req.user.role === 'experiment_worker') {
  query = query.where('project_task.assign_user_id', '=', req.user.userId);
}

// ステータスフィルタ
if (status) {
  query = query.where('project.project_status', '=', status);
}

// プロジェクトごとにグループ化
const projects = await query
  .select([
    'project.project_id',
    'project.project_name',
    'project.description',
    'project.project_status',
    'project.create_at as created_at',
    'project.update_at as updated_at',
    db.fn.count('project_task.task_id').as('my_task_count'),
    db.fn.count(
      db.case()
        .when('project_task.task_status', '=', 'completed')
        .then(1)
        .end()
    ).as('completed_task_count')
  ])
  .groupBy([
    'project.project_id',
    'project.project_name',
    'project.description',
    'project.project_status',
    'project.create_at',
    'project.update_at'
  ])
  .orderBy(`project.${sortBy}`, order)
  .execute();

// 各プロジェクトの未確認指示数と未解決問題を取得
for (const project of projects) {
  // 未確認指示数
  const pendingInstructions = await db
    .selectFrom('project_instruction')
    .innerJoin('project_task', 'project_instruction.instruction_id', 'project_task.instruction_id')
    .where('project_instruction.project_id', '=', project.project_id)
    .where('project_instruction.is_acknowledged', '=', false)
    .where('project_task.assign_user_id', '=', req.user.userId)
    .where('project_instruction.organization_id', '=', organizationId)
    .select(db.fn.count('project_instruction.instruction_id').as('count'))
    .executeTakeFirstOrThrow();

  project.pending_instruction_count = Number(pendingInstructions.count);

  // 未解決問題の有無
  const unresolvedIssues = await db
    .selectFrom('task_issue')
    .where('project_id', '=', project.project_id)
    .where('status', '=', 'open')
    .where('organization_id', '=', organizationId)
    .select(db.fn.count('issue_id').as('count'))
    .executeTakeFirstOrThrow();

  project.has_unresolved_issues = Number(unresolvedIssues.count) > 0;
}
```

**ページネーション**:
```typescript
const offset = (page - 1) * limit;
const paginatedProjects = projects.slice(offset, offset + limit);

const totalItems = projects.length;
const totalPages = Math.ceil(totalItems / limit);

return {
  data: paginatedProjects,
  pagination: {
    page,
    limit,
    totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  }
};
```

---

### 15. MAIMLファイル取得（プロジェクト） 🔴

**エンドポイント**: `GET /api/v1/projects/:projectId/maiml`

**説明**: プロジェクトの最新MAIMLファイルを取得（指示確認タブのフロー図表示で使用）

**認証**: 必須

**権限**: `experiment_worker`（読取専用）

**優先度**: ⭐⭐⭐ 高

**重要**: 実験作業者も閲覧可能（指示確認タブで使用するため）

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectId` | UUID | ○ | プロジェクトID |

**クエリパラメータ**:
なし（最新版のMAIMLファイルを常に返却）

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "file_id": "file-uuid-generated",
    "project_id": "project-uuid",
    "project_name": "Sample Project",
    "file_name": "Sample_Project.maiml",
    "file_path": "org_maiml_lab_001/projects/Sample_Project/Sample_Project.maiml",
    "file_size": 12345,
    "content": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<maiml xmlns=\"http://www.example.org/maiml\">...</maiml>",
    "content_type": "application/xml",
    "loaded_at": "2026-02-16T14:40:00Z"
  },
  "meta": {
    "timestamp": "2026-02-16T14:40:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラー時**:
- 400: バリデーションエラー（projectId不正）
- 401: 認証エラー
- 403: 権限不足（他組織のプロジェクト）
- 404: プロジェクトまたはファイルが存在しない
- 500: システムエラー（S3接続エラー等）

#### 実装要件

**マルチテナント分離（必須）**:
```typescript
// プロジェクトの存在確認 & organization_idチェック
const project = await db
  .selectFrom('project')
  .where('project_id', '=', projectId)
  .where('organization_id', '=', req.user.organizationId)  // ⭐ 必須チェック
  .select(['project_id', 'project_name', 'organization_id'])
  .executeTakeFirstOrThrow();
```

**S3から直接取得**:
```typescript
// organization_prefixを取得
const organizationPrefix = await getOrganizationPrefix(project.organization_id);

// S3パスを構築
const filePath = `projects/${project.project_name}/${project.project_name}.maiml`;

// S3からファイルを取得
const content = await storageService.downloadFile(
  organizationPrefix,  // ⭐ organization_prefix必須
  filePath
);
```

**エラーハンドリング**:
```typescript
try {
  // ファイル取得処理
} catch (error) {
  if (error.name === 'NoResultError') {
    // プロジェクトが存在しない or 他組織
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'プロジェクトが見つかりません'
      }
    });
  }
  
  if (error.code === 'NoSuchKey') {
    // S3にファイルが存在しない
    return res.status(404).json({
      success: false,
      error: {
        code: 'FILE_NOT_FOUND',
        message: 'MAIMLファイルが見つかりません'
      }
    });
  }
  
  // その他のエラー
  logger.error('MAIML file retrieval failed', { error, projectId });
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'システムエラーが発生しました'
    }
  });
}
```

#### 設計方針

**特徴**:
- ✅ **プロジェクトのみ対応**（フォーマットは非対応）
- ✅ **最新版のみ取得**（アーカイブ非対応）
- ✅ **S3から直接取得**（file_metadataテーブル不使用）
- ✅ **実験作業者も閲覧可能**（指示確認タブで使用）

**使用箇所**:
- 実験作業者 - 指示確認タブ - フロー図表示機能
- InstructionConfirmationTab → InstructionFlowDialog → ViewRenderer

**実装ファイル**:
- **ルート**: `backend/src/routes/projectRoutes.ts`（追加予定）
- **コントローラー**: `backend/src/controllers/projectController.ts` (`getProjectMaiml`)
- **サービス**: `backend/src/services/projectService.ts` (`getProjectMaiml`)

---

### 17. タスク登録情報取得 ✅

**エンドポイント**: `GET /api/v1/projects/:projectName/task-registration`

**説明**: プロジェクトのタスク登録情報を取得。DBにデータがない場合はMAIMLファイルから解析。

**認証**: 必須

**権限**: `experiment_admin`, `system_admin`

**優先度**: ⭐⭐⭐ 高

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ○ | プロジェクト名 |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "methodId": "method_001",
        "experimentCondition": 0,
        "trialCount": 1,
        "experimentOrder": 1
      },
      {
        "methodId": "method_002",
        "experimentCondition": 1,
        "trialCount": 3,
        "experimentOrder": 2
      }
    ],
    "isCheckoutLocked": false,
    "isMaimlRegistered": true,
    "experimentConditionOptions": [
      {
        "value": 0,
        "label": "全て同一条件"
      },
      {
        "value": 1,
        "label": "実験ごとに条件変更"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-02-20T09:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**レスポンスフィールド説明**:
| フィールド | 型 | 説明 |
|----------|---|------|
| `tasks` | array | タスク一覧 |
| `tasks[].methodId` | string | メソッドID |
| `tasks[].experimentCondition` | number | 実験条件（code_masterから取得） |
| `tasks[].trialCount` | number | 試行回数（1-999） |
| `tasks[].experimentOrder` | number | 実験順序 |
| `isCheckoutLocked` | boolean | チェックアウト状態（true: 編集不可） |
| `isMaimlRegistered` | boolean | MAIMLファイル登録状態（false: 保存不可） |
| `experimentConditionOptions` | array | 実験条件の選択肢（code_masterから取得） |

**エラー時**:
- 400: バリデーションエラー
- 401: 認証エラー
- 403: 権限不足
- 404: プロジェクトが存在しない
- 500: システムエラー

#### ビジネスロジック

**取得処理のフロー**:
1. プロジェクト存在確認（organization_idでフィルタ）
2. project_taskテーブルからデータ取得
   - データあり → タスク一覧を返却
   - データなし → 3へ
3. MAIMLファイルをS3から取得
4. MAIMLParserTypedでメソッドID一覧を抽出
5. デフォルト値でタスク一覧を生成
   - experimentCondition: 0（全て同一条件）
   - trialCount: 1
   - experimentOrder: 1, 2, 3...
6. code_masterから実験条件オプションを取得
7. チェックアウト状態とMAIML登録状態を取得
8. レスポンスを返却

**初期値**:
- `experimentCondition`: 0（全て同一条件）
- `trialCount`: 1
- `experimentOrder`: メソッド出現順（1, 2, 3...）

#### 実装ファイル
- **ルート**: `backend/src/routes/projectRoutes.ts`
- **コントローラー**: `backend/src/controllers/taskRegistrationController.ts` (`getTaskRegistration`)
- **サービス**: `backend/src/services/taskRegistrationService.ts` (`getTaskRegistration`)
- **リポジトリ**: 
  - `backend/src/repositories/taskRepository.ts` (`findByProject`)
  - `backend/src/repositories/projectRepository.ts` (`findByName`)
  - `backend/src/repositories/codeMasterRepository.ts` (`findByDivision`)
- **ユーティリティ**: `backend/src/utils/maimlParserTyped.ts` (`getMethods`)

---

### 18. タスク登録保存 ✅

**エンドポイント**: `POST /api/v1/projects/:projectName/task-registration`

**説明**: タスク登録情報を保存。project_taskとproject_task_detailテーブルに登録。

**認証**: 必須

**権限**: `experiment_admin`, `system_admin`

**優先度**: ⭐⭐⭐ 高

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ○ | プロジェクト名 |

**ボディ（JSON）**:
```json
{
  "tasks": [
    {
      "methodId": "method_001",
      "experimentCondition": 0,
      "trialCount": 1
    },
    {
      "methodId": "method_002",
      "experimentCondition": 1,
      "trialCount": 3
    }
  ]
}
```

**バリデーション**:
| フィールド | 型 | 必須 | 制約 |
|----------|---|------|------|
| `tasks` | array | ○ | 1個以上 |
| `tasks[].methodId` | string | ○ | 1-255文字 |
| `tasks[].experimentCondition` | number | ○ | code_masterに存在する値 |
| `tasks[].trialCount` | number | ○ | 1-999 |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "タスク登録情報を保存しました"
  },
  "meta": {
    "timestamp": "2026-02-20T09:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラー時**:
- 400: バリデーションエラー、試行回数が範囲外
- 401: 認証エラー
- 403: 権限不足、チェックアウト済み
- 404: プロジェクトが存在しない
- 409: MAIMLファイル未登録
- 500: システムエラー

#### ビジネスロジック

**保存処理のフロー**:
1. プロジェクト存在確認（organization_idでフィルタ）
2. チェックアウト状態確認
   - checkout_status = 1 → エラー（編集不可）
3. MAIML登録状態確認
   - project_maiml_flg = false → エラー（保存不可）
4. トランザクション開始
5. project_taskテーブルにUPSERT
   - organization_id, project_id, method_id が主キー
   - experiment_order（配列のインデックス + 1）
   - experiment_condition
   - attempts_count（trialCount）
   - create_user_id, update_user_id（ログインユーザ）
6. project_task_detailテーブルから既存レコード削除
   - organization_id, project_idで削除
7. project_task_detailテーブルにINSERT
   - 試行回数分のレコードを生成
   - task_no: 1から連番
   - task_status: 0（初期状態）
8. トランザクションコミット
9. レスポンスを返却

#### 実装ファイル
- **ルート**: `backend/src/routes/projectRoutes.ts`
- **コントローラー**: `backend/src/controllers/taskRegistrationController.ts` (`saveTaskRegistration`)
- **サービス**: `backend/src/services/taskRegistrationService.ts` (`saveTaskRegistration`)
- **リポジトリ**: 
  - `backend/src/repositories/taskRepository.ts` (`upsertTask`, `deleteTaskDetails`, `insertTaskDetail`)
  - `backend/src/repositories/projectRepository.ts` (`findByName`)

---

## 🔒 セキュリティ考慮事項

### マルチテナント分離の徹底

**必須チェック:**
- [ ] すべてのDBクエリに `organization_id` フィルタ
- [ ] すべてのS3操作に `org_{organization_prefix}` プレフィックス
- [ ] クロステナントアクセスの防止

**実装例:**
```typescript
// ✅ 良い例
const projects = await db
  .selectFrom('projects')
  .where('organization_id', '=', organizationId)
  .where('project_id', '=', projectId)
  .selectAll()
  .execute();

// ❌ 悪い例
const projects = await db
  .selectFrom('projects')
  .where('project_id', '=', projectId)  // organization_idフィルタなし
  .selectAll()
  .execute();
```

### 権限チェック

**ロール別権限:**
- `system_admin`: 所属組織内のプロジェクト操作可能
- `experiment_admin`: 所属組織内のプロジェクト操作可能
- `experiment_worker`: 所属組織内のプロジェクト操作可能

### S3署名付きURL

**ファイルダウンロード:**
- 直接URLではなく署名付きURLを返却
- 有効期限: 1時間
- organization_prefixの検証必須

---

## 📚 関連ドキュメント

### 規約
- [API設計ポリシー](../../.clinerules/development/api.md)
- [バックエンド規約](../../.clinerules/development/backend.md)
- [セキュリティ規約](../../.clinerules/development/security.md)

### 設計書
- [API一覧（統合版）](../../20260121_API一覧.md)
- [API実装方針](../../20260121_API実装方針.md)
- [データベース構造](../../.clinerules/references/db_structure.md)
- [S3構造](../../.clinerules/references/s3_structure.md)

### UI仕様書
- [プロジェクト管理画面](../ui/experiment_admin/01_project_management/ProjectManagement.md)

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.6.0 | 2026-02-19 18:00 | API一覧の競合を修正し実態に即した内容に更新 | Cline |
| | | - API一覧テーブルの重複エントリを削除（#7-15の重複を解消） | |
| | | - 実装状況サマリーを修正（カテゴリ分類を実態に合わせて更新） | |
| | | - チェックアウト/チェックインのエンドポイントを修正（:projectId形式に統一） | |
| | | - 総API数: 16個、実装済み: 13個、未実装: 3個 | |
| 2.5.0 | 2026-02-19 17:02 | routeファイルの実装状況を反映 | Cline |
| | | - projectRoutes.tsの全エンドポイントを確認 | |
| | | - 実装済み: 13個（81%）、未実装: 3個 | |
| | | - 新規追加: プロジェクト詳細取得、チェックアウト状態取得 | |
| | | - 実装ファイル情報を追加 | |
| 2.4.0 | 2026-02-19 15:00 | フロントエンド実装状況を反映 | Cline |
| | | - ProjectManagement.tsxの実装状況を確認 | |
| | | - API一覧テーブルのコメントを詳細化 | |
| | | - フロントエンド実装: getProjectFiles(), getProjectTasks(), downloadFolderAsZip()使用確認 | |
| 2.3.0 | 2026-01-26 15:42 | プロジェクト管理APIの実装状況を更新 | Cline |
| | | - 実装状況: 4→8個に更新（80%完了） | |
| | | - 新規実装確認: ファイル一覧取得、タスク一覧取得 | |
| | | - 詳細検索・公開API: ルート定義のみ確認（実装詳細は要確認） | |
| | | - 未実装: 指示送信、指示一覧取得（2個） | |
| 2.2.0 | 2026-01-26 | プロジェクトリロードAPI削除（10エンドポイント） | Cline |
| | | - `/api/v1/projects/:projectName/reload` エンドポイント削除 | |
| | | - 理由: 既存のプロジェクト一覧・ファイル一覧・タスク一覧APIで代用可能 | |
| | | - フロントエンドは既存APIを組み合わせたリロード処理に変更済み | |
| | | - 総API数: 11→10、実装済み: 5→4 (40%) | |
| 2.0.0 | 2026-01-21 | API一覧に基づき全面改訂、実装状況反映 | Cline |
| 1.0.0 | 2024-12-XX | 初版作成 | Development Team |

---

**作成者**: Cline  
**作成日**: 2026-01-21 16:30  
**最終更新**: 2026-02-19 17:02

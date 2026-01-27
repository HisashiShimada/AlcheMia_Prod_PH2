# プロジェクト管理API仕様書

**作成日**: 2026-01-21 16:30  
**最終更新**: 2026-01-26 15:42  
**バージョン**: 2.3.0  
**対象画面**: 実験管理者 - プロジェクト管理画面  
**総API数**: 10個  
**実装状況**: 8個実装済み、2個未実装

---

## 📊 実装状況サマリー

| カテゴリ | 実装済み | 未実装 | 合計 |
|---------|---------|--------|------|
| 基本CRUD | 2 | 0 | 2 |
| チェックイン/チェックアウト | 2 | 0 | 2 |
| データ取得 | 2 | 0 | 2 |
| 指示管理 | 0 | 2 | 2 |
| その他 | 2 | 0 | 2 |
| **合計** | **8** | **2** | **10** |

**完了率**: 80% (8/10)

---

## 🎯 API一覧

| # | API名 | メソッド | エンドポイント | 状態 | 優先度 |
|---|------|---------|---------------|------|--------|
| 1 | プロジェクト一覧取得 | GET | `/api/v1/projects` | ✅ 実装済み | - |
| 2 | プロジェクト作成 | POST | `/api/v1/projects` | ✅ 実装済み | - |
| 3 | チェックアウト | POST | `/api/v1/projects/:projectName/checkout` | ✅ 実装済み | - |
| 4 | チェックイン | POST | `/api/v1/projects/:projectName/checkin` | ✅ 実装済み | - |
| 5 | ファイル一覧取得 | GET | `/api/v1/projects/:projectName/files` | ✅ 実装済み | - |
| 6 | タスク一覧取得 | GET | `/api/v1/projects/:projectName/tasks` | ✅ 実装済み | - |
| 7 | 指示送信（タスク作成） | POST | `/api/v1/projects/:projectName/instructions` | 🔴 未実装 | ⭐⭐⭐ 高 |
| 8 | 指示一覧取得 | GET | `/api/v1/projects/:projectName/instructions` | 🔴 未実装 | ⭐⭐ 中 |
| 9 | プロジェクト詳細検索 | POST | `/api/v1/projects/search` | ✅ 実装済み | - |
| 10 | プロジェクト公開 | POST | `/api/v1/projects/:projectName/publish` | ✅ 実装済み | - |

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
- `system_admin`: すべての操作可能
- `experiment_admin`: 所属組織内のプロジェクト操作可能
- `experiment_worker`: プロジェクト一覧取得のみ（編集不可）

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
**最終更新**: 2026-01-26 15:35

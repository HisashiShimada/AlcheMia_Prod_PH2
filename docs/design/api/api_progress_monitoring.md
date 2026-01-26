# 進捗確認API仕様書

**作成日**: 2026-01-21 16:45  
**最終更新**: 2026-01-21 16:45  
**バージョン**: 1.0.0  
**対象画面**: 実験管理者 - 進捗確認画面  
**総API数**: 2個  
**実装状況**: 0個実装済み、2個未実装

---

## 📊 実装状況サマリー

| カテゴリ | 実装済み | 未実装 | 合計 |
|---------|---------|--------|------|
| 進捗確認 | 0 | 2 | 2 |
| **合計** | **0** | **2** | **2** |

**完了率**: 0% (0/2)

---

## 🎯 API一覧

| # | API名 | メソッド | エンドポイント | 状態 | 優先度 |
|---|------|---------|---------------|------|--------|
| 1 | メソッド別タスク一覧取得 | GET | `/api/v1/projects/:projectId/methods/:methodId/tasks` | 🔴 未実装 | ⭐⭐⭐ 高 |
| 2 | タスク詳細取得 | GET | `/api/v1/tasks/:taskId` | 🔴 未実装 | ⭐⭐ 中 |

---

## 📋 概要

進捗確認APIは、プロジェクト内のタスク進捗状況を確認するための機能を提供します。

### 主な特徴

1. **メソッド別進捗確認**: メソッド単位でタスクの進捗を集約
2. **タスク詳細情報**: 各タスクの詳細情報（担当者、ステータス、実験記録）を取得
3. **リアルタイム進捗**: 最新のタスクステータスを反映

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

### 統一レスポンス形式

**成功レスポンス**:
```json
{
  "success": true,
  "data": { ... },
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
    "details": []
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 📋 API詳細仕様

### 1. メソッド別タスク一覧取得 🔴

**エンドポイント**: `GET /api/v1/projects/:projectId/methods/:methodId/tasks`

**説明**: 指定メソッドに紐づくタスク一覧を進捗情報付きで取得

**認証**: 必須

**権限**: `experiment_admin`, `system_admin`

**優先度**: ⭐⭐⭐ 高

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectId` | UUID | ○ | プロジェクトID |
| `methodId` | string | ○ | メソッドID（MAIMLファイル内のmethod id） |

**クエリパラメータ**:
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|----------|---|------|-----------|------|
| `status` | string | × | all | タスクステータスフィルタ（`all`, `pending`, `in_progress`, `completed`, `failed`） |
| `include_details` | boolean | × | false | タスク詳細情報を含める |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_name": "Sample Project",
    "method_id": "method1",
    "method_name": "合成実験",
    "tasks": [
      {
        "task_id": "task-uuid-1",
        "task_name": "材料準備",
        "transition_id": "t1",
        "transition_name": "材料準備",
        "task_status": "completed",
        "assigned_to": "worker-uuid",
        "assigned_user_name": "Worker Name",
        "progress": {
          "total_steps": 5,
          "completed_steps": 5,
          "progress_percentage": 100
        },
        "created_at": "2026-01-21T10:00:00Z",
        "started_at": "2026-01-21T10:30:00Z",
        "completed_at": "2026-01-21T14:00:00Z",
        "has_issues": false
      },
      {
        "task_id": "task-uuid-2",
        "task_name": "反応実験",
        "transition_id": "t2",
        "transition_name": "反応実験",
        "task_status": "in_progress",
        "assigned_to": "worker-uuid-2",
        "assigned_user_name": "Worker Name 2",
        "progress": {
          "total_steps": 8,
          "completed_steps": 3,
          "progress_percentage": 37.5
        },
        "created_at": "2026-01-21T14:00:00Z",
        "started_at": "2026-01-21T14:30:00Z",
        "completed_at": null,
        "has_issues": true,
        "issue_count": 2
      }
    ],
    "statistics": {
      "total": 10,
      "pending": 3,
      "in_progress": 4,
      "completed": 2,
      "failed": 1,
      "overall_progress": 45.5
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
- 404: プロジェクトまたはメソッドが存在しない
- 500: システムエラー

#### 実装要件

**DBクエリ**:
```typescript
// プロジェクトのMAIMLファイルからメソッド情報を取得
const maimlContent = await storageService.downloadFile(
  organizationPrefix,
  `projects/${project_name}/${project_name}.maiml`
);

const methods = await parseMultipleMethodsStructure(maimlContent);
const method = methods.find(m => m.methodId === methodId);

if (!method) {
  throw new NotFoundError('メソッドが見つかりません');
}

// project_taskテーブルからタスク一覧を取得
const tasks = await db
  .selectFrom('project_task')
  .leftJoin('project_task_detail', 'project_task.task_id', 'project_task_detail.task_id')
  .leftJoin('organization_user', 'project_task.assign_user_id', 'organization_user.user_id')
  .leftJoin('user_authentication', 'organization_user.user_id', 'user_authentication.user_id')
  .where('project_task.project_id', '=', projectId)
  .where('project_task.method_id', '=', methodId)
  .where('project_task.organization_id', '=', organizationId)
  .select([
    'project_task.task_id',
    'project_task.task_name',
    'project_task.transition_id',
    'project_task.task_status',
    'project_task.assign_user_id',
    'user_authentication.user_name as assigned_user_name',
    'project_task.create_at',
    'project_task.update_at',
    db.fn.count('project_task_detail.task_detail_id').as('total_steps'),
    db.fn.count(
      db.case()
        .when('project_task_detail.status', '=', 'completed')
        .then(1)
        .end()
    ).as('completed_steps')
  ])
  .groupBy([
    'project_task.task_id',
    'project_task.task_name',
    'project_task.transition_id',
    'project_task.task_status',
    'project_task.assign_user_id',
    'user_authentication.user_name',
    'project_task.create_at',
    'project_task.update_at'
  ])
  .execute();
```

**進捗計算**:
```typescript
const calculateProgress = (task: any) => {
  const totalSteps = task.total_steps || 0;
  const completedSteps = task.completed_steps || 0;
  
  return {
    total_steps: totalSteps,
    completed_steps: completedSteps,
    progress_percentage: totalSteps > 0 
      ? Math.round((completedSteps / totalSteps) * 100 * 10) / 10 
      : 0
  };
};
```

---

### 2. タスク詳細取得 🔴

**エンドポイント**: `GET /api/v1/tasks/:taskId`

**説明**: 指定タスクの詳細情報を取得

**認証**: 必須

**権限**: `experiment_admin`, `system_admin`

**優先度**: ⭐⭐ 中

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `taskId` | UUID | ○ | タスクID |

**クエリパラメータ**:
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|----------|---|------|-----------|------|
| `include_records` | boolean | × | true | 実験記録を含める |
| `include_issues` | boolean | × | true | 問題報告を含める |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "task_id": "task-uuid",
    "project_id": "project-uuid",
    "project_name": "Sample Project",
    "method_id": "method1",
    "method_name": "合成実験",
    "transition_id": "t2",
    "transition_name": "反応実験",
    "task_name": "反応実験タスク",
    "task_status": "in_progress",
    "assigned_to": "worker-uuid",
    "assigned_user_name": "Worker Name",
    "assigned_at": "2026-01-21T10:00:00Z",
    "started_at": "2026-01-21T10:30:00Z",
    "completed_at": null,
    "instruction": {
      "instruction_id": "instruction-uuid",
      "instruction_title": "実験指示タイトル",
      "instruction_content": "実験指示の詳細内容",
      "due_date": "2026-01-31T23:59:59Z"
    },
    "progress": {
      "total_steps": 8,
      "completed_steps": 3,
      "progress_percentage": 37.5,
      "details": [
        {
          "task_detail_id": "detail-uuid-1",
          "step_name": "材料準備",
          "status": "completed",
          "completed_at": "2026-01-21T11:00:00Z"
        },
        {
          "task_detail_id": "detail-uuid-2",
          "step_name": "反応開始",
          "status": "in_progress",
          "completed_at": null
        }
      ]
    },
    "experiment_records": [
      {
        "record_id": "record-uuid",
        "transition_id": "t2",
        "recorded_at": "2026-01-21T12:00:00Z",
        "data": {
          "materials": [...],
          "conditions": [...],
          "results": [...]
        }
      }
    ],
    "issues": [
      {
        "issue_id": "issue-uuid",
        "issue_type": "equipment_failure",
        "issue_title": "装置不具合",
        "issue_description": "温度センサーの異常",
        "status": "open",
        "reported_at": "2026-01-21T13:00:00Z",
        "reported_by": "worker-uuid",
        "reported_by_name": "Worker Name"
      }
    ],
    "created_at": "2026-01-21T10:00:00Z",
    "updated_at": "2026-01-21T15:30:00Z"
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
- 404: タスクが存在しない
- 500: システムエラー

#### 実装要件

**DBクエリ（複数テーブルJOIN）**:
```typescript
// タスク基本情報
const task = await db
  .selectFrom('project_task')
  .leftJoin('project', 'project_task.project_id', 'project.project_id')
  .leftJoin('project_instruction', 'project_task.instruction_id', 'project_instruction.instruction_id')
  .leftJoin('organization_user', 'project_task.assign_user_id', 'organization_user.user_id')
  .leftJoin('user_authentication', 'organization_user.user_id', 'user_authentication.user_id')
  .where('project_task.task_id', '=', taskId)
  .where('project_task.organization_id', '=', organizationId)
  .select([
    'project_task.*',
    'project.project_name',
    'user_authentication.user_name as assigned_user_name',
    'project_instruction.instruction_title',
    'project_instruction.instruction_content',
    'project_instruction.due_date'
  ])
  .executeTakeFirstOrThrow();

// タスク詳細（ステップ）
if (include_records) {
  task.progress.details = await db
    .selectFrom('project_task_detail')
    .where('task_id', '=', taskId)
    .where('organization_id', '=', organizationId)
    .orderBy('display_order', 'asc')
    .selectAll()
    .execute();
}

// 実験記録
if (include_records) {
  task.experiment_records = await db
    .selectFrom('experiment_record')
    .where('task_id', '=', taskId)
    .where('organization_id', '=', organizationId)
    .orderBy('create_at', 'desc')
    .selectAll()
    .execute();
}

// 問題報告
if (include_issues) {
  task.issues = await db
    .selectFrom('task_issue')
    .leftJoin('organization_user', 'task_issue.reported_by', 'organization_user.user_id')
    .leftJoin('user_authentication', 'organization_user.user_id', 'user_authentication.user_id')
    .where('task_issue.task_id', '=', taskId)
    .where('task_issue.organization_id', '=', organizationId)
    .select([
      'task_issue.*',
      'user_authentication.user_name as reported_by_name'
    ])
    .orderBy('task_issue.create_at', 'desc')
    .execute();
}
```

**メソッド情報の取得**:
```typescript
// MAIMLファイルからメソッド情報を取得
const project = await db
  .selectFrom('project')
  .where('project_id', '=', task.project_id)
  .where('organization_id', '=', organizationId)
  .select('project_name')
  .executeTakeFirstOrThrow();

const maimlContent = await storageService.downloadFile(
  organizationPrefix,
  `projects/${project.project_name}/${project.project_name}.maiml`
);

const methods = await parseMultipleMethodsStructure(maimlContent);
const method = methods.find(m => m.methodId === task.method_id);
const transition = method?.petriNet.transitions.find(t => t.id === task.transition_id);

task.method_name = method?.methodName || '';
task.transition_name = transition?.name || '';
```

---

## 🔒 セキュリティ考慮事項

### マルチテナント分離

**必須チェック:**
- [ ] すべてのDBクエリに `organization_id` フィルタ
- [ ] クロステナントアクセスの防止
- [ ] タスク担当者の所属組織確認

**実装例:**
```typescript
// ✅ 良い例
const task = await db
  .selectFrom('project_task')
  .where('task_id', '=', taskId)
  .where('organization_id', '=', organizationId)  // 必須
  .selectAll()
  .executeTakeFirst();

// ❌ 悪い例
const task = await db
  .selectFrom('project_task')
  .where('task_id', '=', taskId)  // organization_idフィルタなし
  .selectAll()
  .executeTakeFirst();
```

### 進捗情報の機密性

**考慮事項:**
- タスク詳細は担当者と管理者のみ閲覧可能
- 実験記録データは機密情報として扱う
- 問題報告は組織内のみ共有

---

## 🔧 実装ガイドライン

### タスクステータスの定義

```typescript
enum TaskStatus {
  PENDING = 'pending',         // 未着手
  IN_PROGRESS = 'in_progress', // 実行中
  COMPLETED = 'completed',     // 完了
  FAILED = 'failed',           // 失敗
  CANCELLED = 'cancelled'      // キャンセル
}
```

### 進捗計算ロジック

```typescript
const calculateTaskProgress = (taskDetails: TaskDetail[]) => {
  const totalSteps = taskDetails.length;
  const completedSteps = taskDetails.filter(
    detail => detail.status === 'completed'
  ).length;
  
  return {
    total_steps: totalSteps,
    completed_steps: completedSteps,
    progress_percentage: totalSteps > 0
      ? Math.round((completedSteps / totalSteps) * 100 * 10) / 10
      : 0
  };
};
```

### キャッシュ戦略

**進捗情報のキャッシュ:**
- メソッド別タスク一覧: 5分間キャッシュ
- タスク詳細: キャッシュなし（常に最新情報を取得）

```typescript
import NodeCache from 'node-cache';

const progressCache = new NodeCache({ stdTTL: 300 }); // 5分

const getCachedMethodTasks = async (projectId: string, methodId: string) => {
  const cacheKey = `method_tasks_${projectId}_${methodId}`;
  
  let tasks = progressCache.get(cacheKey);
  if (!tasks) {
    tasks = await fetchMethodTasks(projectId, methodId);
    progressCache.set(cacheKey, tasks);
  }
  
  return tasks;
};
```

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
- [プロジェクト管理API](./api_project_management.md)
- [Maiml編集API](./api_maiml_edit.md)

### UI仕様書
- [進捗確認画面](../ui/experiment_admin/04_progress_check/ProgressCheck.md)

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 新規作成 | Cline |

---

**作成者**: Cline  
**作成日**: 2026-01-21 16:45  
**最終更新**: 2026-01-21 16:45

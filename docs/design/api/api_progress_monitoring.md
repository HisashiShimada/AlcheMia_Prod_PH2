# 進捗確認API仕様書

**作成日**: 2026-01-21 16:45  
**最終更新**: 2026-02-18 14:00  
**バージョン**: 1.4.0  
**対象画面**: 実験管理者 - 進捗確認画面、実験作業者 - 実験記録画面  
**総API数**: 6個  
**実装状況**: 0個実装済み、6個未実装

---

## 📊 実装状況サマリー

| カテゴリ | 実装済み | 未実装 | 合計 |
|---------|---------|--------|------|
| 進捗確認 | 0 | 6 | 6 |
| **合計** | **0** | **6** | **6** |

**完了率**: 0% (0/6)

---

## 🎯 API一覧

| # | API名 | メソッド | エンドポイント | 状態 | 優先度 |
|---|------|---------|---------------|------|--------|
| 1 | メソッド別タスク一覧取得 | GET | `/api/v1/projects/:projectId/methods/:methodId/tasks` | 🔴 未実装 | ⭐⭐⭐ 高 |
| 2 | タスク詳細取得 | GET | `/api/v1/tasks/:taskId` | 🔴 未実装 | ⭐⭐ 中 |
| 3 | 進捗データ取得 | GET | `/api/v1/progress/:projectId/:methodId/:taskNo` | 🔴 未実装 | ⭐⭐ 中 |
| 4 | タスク一覧取得（実験作業者用） | GET | `/api/v1/progress/projects/:projectName/worker-tasks` | 🔴 未実装 | ⭐⭐⭐ 高 |
| 5 | タスクステータス更新 | PATCH | `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status` | 🔴 未実装 | ⭐⭐⭐ 高 |
| 6 | トランジションステータス更新 | PATCH | `/api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status` | 🔴 未実装 | ⭐⭐⭐ 高 |

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

### 3. 進捗データ取得API 🔴

**エンドポイント**: `GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions`

**説明**: 指定タスクに紐づくトランジションの進捗データを取得

**認証**: 必須

**権限**: `experiment_worker`（読取専用）

**優先度**: ⭐⭐⭐ 高

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ○ | プロジェクト名 |
| `methodId` | string | ○ | メソッドID（MAIMLファイル内のmethod id） |
| `taskNo` | Integer | ○ | タスク連番 |

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
    "task_no": "task-001",
    "task_name": "反応実験タスク",
    "transitions": [
      {
        "transition_id": "t1",
        "transition_name": "材料準備",
        "status": "completed",
        "progress": 100,
        "last_updated": "2026-01-21T14:00:00Z"
      },
      {
        "transition_id": "t2",
        "transition_name": "反応実験",
        "status": "in_progress",
        "progress": 45,
        "last_updated": "2026-01-21T15:30:00Z"
      },
      {
        "transition_id": "t3",
        "transition_name": "結果測定",
        "status": "not_started",
        "progress": 0,
        "last_updated": null
      }
    ],
    "overall_progress": {
      "total_transitions": 10,
      "completed": 3,
      "in_progress": 4,
      "not_started": 3,
      "overall_percentage": 45.0
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
- 404: プロジェクト、メソッド、またはタスクが存在しない
- 500: システムエラー

#### 実装要件

**DBクエリ**:
```typescript
// タスク基本情報を取得
const task = await db
  .selectFrom('project_task')
  .leftJoin('project', 'project_task.project_id', 'project.project_id')
  .where('project_task.task_id', '=', taskId)
  .where('project_task.project_id', '=', projectId)
  .where('project_task.method_id', '=', methodId)
  .where('project_task.organization_id', '=', organizationId)
  .select([
    'project_task.task_id',
    'project_task.task_name',
    'project_task.transition_id',
    'project.project_name'
  ])
  .executeTakeFirstOrThrow();

// MAIMLファイルからメソッド情報とトランジション一覧を取得
const maimlContent = await storageService.downloadFile(
  organizationPrefix,
  `projects/${task.project_name}/${task.project_name}.maiml`
);

const methods = await parseMultipleMethodsStructure(maimlContent);
const method = methods.find(m => m.methodId === methodId);

if (!method) {
  throw new NotFoundError('メソッドが見つかりません');
}

// 各トランジションの実験記録データを取得
const transitions = await Promise.all(
  method.petriNet.transitions.map(async (transition) => {
    const records = await db
      .selectFrom('experiment_record')
      .where('task_id', '=', taskId)
      .where('transition_id', '=', transition.id)
      .where('organization_id', '=', organizationId)
      .select([
        'status',
        'progress',
        'comment',
        'update_at as last_updated'
      ])
      .orderBy('update_at', 'desc')
      .executeTakeFirst();

    const dataCount = await db
      .selectFrom('experiment_record')
      .where('task_id', '=', taskId)
      .where('transition_id', '=', transition.id)
      .where('organization_id', '=', organizationId)
      .select(db.fn.count('record_id').as('count'))
      .executeTakeFirstOrThrow();

    return {
      transition_id: transition.id,
      transition_name: transition.name,
      status: records?.status || 'not_started',
      progress: records?.progress || 0,
      last_updated: records?.last_updated || null,
      comment: records?.comment || null,
      has_data: (dataCount.count as number) > 0,
      data_count: Number(dataCount.count)
    };
  })
);
```

**進捗集計**:
```typescript
const calculateOverallProgress = (transitions: any[]) => {
  const total = transitions.length;
  const completed = transitions.filter(t => t.status === 'completed').length;
  const inProgress = transitions.filter(t => t.status === 'in_progress').length;
  const notStarted = transitions.filter(t => t.status === 'not_started').length;
  
  const totalProgress = transitions.reduce((sum, t) => sum + t.progress, 0);
  const overallPercentage = total > 0 
    ? Math.round((totalProgress / total) * 10) / 10 
    : 0;
  
  return {
    total_transitions: total,
    completed,
    in_progress: inProgress,
    not_started: notStarted,
    overall_percentage: overallPercentage
  };
};
```

---

### 4. タスク一覧取得（実験作業者用）API 🔴

**エンドポイント**: `GET /api/v1/progress/projects/:projectName/worker-tasks`

**説明**: 実験作業者が自分に割り当てられたタスクの一覧を取得

**認証**: 必須

**権限**: `experiment_worker`（読取専用）

**優先度**: ⭐⭐⭐ 高

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ○ | プロジェクト名 |
| `status` | string | × | - | タスクステータスでフィルタリング（`not_started`, `started`, `in_progress`, `completed`, `forced_terminated`） |
| `assignedTo` | UUID | × | - | 担当者でフィルタリング |
| `sortBy` | string | × | `task_no` | ソート基準（`task_no`, `created_at`, `updated_at`, `status`） |
| `order` | string | × | `asc` | ソート順（`asc`, `desc`） |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_name": "Sample Project",
    "methods": [
      {
        "method_id": "method1",
        "method_name": "合成実験",
        "experiment_order": 1,
        "tasks": [
          {
            "task_no": 1,
            "status": "completed",
            "experiment_user_id": "worker-uuid-1",
            "experiment_user_name": "Worker Name 1",
            "created_at": "2026-01-21T10:00:00Z",
            "updated_at": "2026-01-21T14:00:00Z",
            "progress": 100
          },
          {
            "task_no": 2,
            "status": "in_progress",
            "experiment_user_id": "worker-uuid-2",
            "experiment_user_name": "Worker Name 2",
            "created_at": "2026-01-21T14:00:00Z",
            "updated_at": "2026-01-21T15:30:00Z",
            "progress": 45
          }
        ]
      },
      {
        "method_id": "method2",
        "method_name": "分析実験",
        "tasks": [...]
      }
    ]
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

#### 実装要件

**DBクエリ**:
```typescript
// プロジェクト情報を取得
const project = await db
  .selectFrom('project')
  .where('project_name', '=', projectName)
  .where('organization_id', '=', organizationId)
  .select(['project_id', 'project_name'])
  .executeTakeFirstOrThrow();

// タスク一覧を取得
let query = db
  .selectFrom('project_task')
  .leftJoin('organization_user', 'project_task.assign_user_id', 'organization_user.user_id')
  .leftJoin('user_authentication', 'organization_user.user_id', 'user_authentication.user_id')
  .where('project_task.project_id', '=', projectId)
  .where('project_task.organization_id', '=', organizationId);

// フィルタリング
if (status) {
  query = query.where('project_task.task_status', '=', status);
}
if (assignedTo) {
  query = query.where('project_task.assign_user_id', '=', assignedTo);
}

// ソート
const orderDirection = order === 'desc' ? 'desc' : 'asc';
query = query.orderBy(`project_task.${sortBy}`, orderDirection);

const tasks = await query
  .select([
    'project_task.task_no',
    'project_task.method_id',
    'project_task.task_status as status',
    'project_task.assign_user_id as experiment_user_id',
    'user_authentication.user_name as experiment_user_name',
    'project_task.create_at as created_at',
    'project_task.update_at as updated_at'
  ])
  .orderBy('project_task.method_id', 'asc')
  .orderBy('project_task.task_no', 'asc')
  .execute();

// MAIMLファイルからメソッド情報を取得
const maimlContent = await storageService.downloadFile(
  organizationPrefix,
  `projects/${project.project_name}/${project.project_name}.maiml`
);

const methods = await parseMultipleMethodsStructure(maimlContent);

// メソッドごとにグループ化
const groupedTasks = methods.map((method, index) => {
  const methodTasks = tasks.filter(t => t.method_id === method.methodId);
  
  return {
    method_id: method.methodId,
    method_name: method.methodName,
    experiment_order: index + 1,
    tasks: methodTasks.map(task => ({
      task_no: task.task_no,
      status: task.status,
      experiment_user_id: task.experiment_user_id,
      experiment_user_name: task.experiment_user_name,
      created_at: task.created_at,
      updated_at: task.updated_at,
      progress: 0 // 後で計算
    }))
  };
});
```

**統計情報の計算**:
```typescript
const calculateStatistics = (tasks: any[]) => {
  const total = tasks.length;
  const statusCounts = {
    not_started: tasks.filter(t => t.status === 'not_started').length,
    started: tasks.filter(t => t.status === 'started').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    forced_terminated: tasks.filter(t => t.status === 'forced_terminated').length
  };
  
  const totalProgress = tasks.reduce((sum, t) => sum + (t.progress || 0), 0);
  const overallProgress = total > 0 
    ? Math.round((totalProgress / total) * 10) / 10 
    : 0;
  
  return {
    total_tasks: total,
    ...statusCounts,
    overall_progress: overallProgress
  };
};
```

---

### 5. タスクステータス更新API（新エンドポイント） 🔴

**エンドポイント**: `PATCH /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status`

**説明**: プロジェクト名、メソッドID、タスク連番でタスクを特定してステータスを更新

**認証**: 必須

**権限**: `experiment_worker`（書込可）

**優先度**: ⭐⭐⭐ 高

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ○ | プロジェクト名 |
| `methodId` | string | ○ | メソッドID（MAIMLファイル内のmethod id） |
| `taskNo` | Integer | ○ | タスク連番 |

**リクエストボディ**:
```json
{
  "status": "not_started" | "started" | "in_progress" | "completed" | "forced_terminated",
  "comment": "string (最大500文字, optional)",
  "currentUpdatedAt": "2026-02-18T10:00:00Z (ISO 8601形式, 楽観的ロック用, optional)"
}
```

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "task_no": 1,
    "project_name": "Sample Project",
    "method_id": "method1",
    "previous_status": "in_progress",
    "new_status": "completed",
    "updated_by": "user-uuid",
    "updated_by_name": "User Name",
    "updated_at": "2026-02-18T11:00:00Z",
    "comment": "実験完了しました"
  },
  "meta": {
    "timestamp": "2026-02-18T11:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラー時**:
- 400: バリデーションエラー、または無効なステータス遷移
- 401: 認証エラー
- 403: 権限不足（担当者以外が更新しようとした）
- 404: プロジェクト、メソッド、またはタスクが存在しない
- 409: プロジェクトステータスが編集不可、または楽観的ロックエラー（currentUpdatedAtが一致しない）
- 500: システムエラー

#### ビジネスロジック

**ステータス遷移ルール**:
```typescript
const validTransitions: Record<string, string[]> = {
  'not_started': ['started', 'forced_terminated'],
  'started': ['in_progress', 'forced_terminated'],
  'in_progress': ['completed', 'forced_terminated'],
  'completed': ['in_progress'], // 再開可能
  'forced_terminated': ['started'] // 再開可能
};

const canTransition = (from: string, to: string): boolean => {
  return validTransitions[from]?.includes(to) || false;
};
```

**前提条件チェック**:
```typescript
// プロジェクトステータスが編集可能かチェック
const project = await db
  .selectFrom('project')
  .where('project_name', '=', projectName)
  .where('organization_id', '=', organizationId)
  .select(['project_id', 'project_status'])
  .executeTakeFirstOrThrow();

const editableStatuses = ['draft', 'active'];
if (!editableStatuses.includes(project.project_status)) {
  throw new ConflictError(
    'プロジェクトステータスが編集可能な状態ではありません'
  );
}
```

**楽観的ロック制御**:
```typescript
// タスク情報取得
const task = await db
  .selectFrom('project_task')
  .where('project_id', '=', project.project_id)
  .where('method_id', '=', methodId)
  .where('task_no', '=', taskNo)
  .where('organization_id', '=', organizationId)
  .select([
    'task_id',
    'task_status',
    'update_at',
    'assign_user_id'
  ])
  .executeTakeFirstOrThrow();

// 楽観的ロックチェック（currentUpdatedAtが指定されている場合）
if (currentUpdatedAt && task.update_at !== currentUpdatedAt) {
  throw new ConflictError(
    'タスクが他のユーザーによって更新されています。最新の情報を取得してください。'
  );
}
```

#### 実装要件

**DBクエリ（トランザクション）**:
```typescript
await db.transaction().execute(async (trx) => {
  // プロジェクト情報取得
  const project = await trx
    .selectFrom('project')
    .where('project_name', '=', projectName)
    .where('organization_id', '=', organizationId)
    .select(['project_id', 'project_status'])
    .executeTakeFirstOrThrow();

  // 編集可能チェック
  const editableStatuses = ['draft', 'active'];
  if (!editableStatuses.includes(project.project_status)) {
    throw new ConflictError('プロジェクトステータスが編集不可です');
  }

  // タスク情報取得
  const task = await trx
    .selectFrom('project_task')
    .where('project_id', '=', project.project_id)
    .where('method_id', '=', methodId)
    .where('task_no', '=', taskNo)
    .where('organization_id', '=', organizationId)
    .select([
      'task_id',
      'task_status',
      'update_at',
      'assign_user_id'
    ])
    .executeTakeFirstOrThrow();

  // 楽観的ロックチェック
  if (currentUpdatedAt && task.update_at !== currentUpdatedAt) {
    throw new ConflictError('他のユーザーによって更新されています');
  }

  // 権限チェック（実験作業者は自分に割り当てられたタスクのみ更新可能）
  if (task.assign_user_id !== req.user.userId) {
    throw new ForbiddenError(
      '自分に割り当てられたタスクのみ更新できます'
    );
  }

  // ステータス遷移チェック
  if (!canTransition(task.task_status, status)) {
    throw new BadRequestError(
      `ステータスを ${task.task_status} から ${status} に変更できません`
    );
  }

  // ステータス更新
  const now = new Date().toISOString();
  await trx
    .updateTable('project_task')
    .set({
      task_status: status,
      update_at: now,
      update_user_id: req.user.userId
    })
    .where('task_id', '=', task.task_id)
    .where('organization_id', '=', organizationId)
    .execute();

  // コメントがある場合は記録
  if (comment) {
    await trx
      .insertInto('task_comment')
      .values({
        comment_id: uuidv4(),
        task_id: task.task_id,
        user_id: req.user.userId,
        comment: comment,
        organization_id: organizationId,
        create_at: now
      })
      .execute();
  }

  // 監査ログ記録
  logger.info('Task status updated', {
    projectName,
    methodId,
    taskNo,
    previousStatus: task.task_status,
    newStatus: status,
    updatedBy: req.user.userId,
    organizationId
  });
});
```

**バリデーション**:
```typescript
const validateStatusUpdate = (body: any) => {
  const validStatuses = [
    'not_started',
    'started',
    'in_progress',
    'completed',
    'forced_terminated'
  ];

  if (!body.status) {
    throw new BadRequestError('status is required');
  }

  if (!validStatuses.includes(body.status)) {
    throw new BadRequestError(
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    );
  }

  if (body.comment && body.comment.length > 500) {
    throw new BadRequestError('comment must be 500 characters or less');
  }

  if (body.currentUpdatedAt && !isValidISODate(body.currentUpdatedAt)) {
    throw new BadRequestError('currentUpdatedAt must be valid ISO 8601 format');
  }
};
```

**備考**:
- プロジェクト名、メソッドID、タスク連番の組み合わせでタスクを一意に特定
- 楽観的ロック（currentUpdatedAt）による並行更新制御（オプション）
- ステータス遷移バリデーション実装
- **権限**: 実験作業者（experiment_worker）のみが自分に割り当てられたタスクのステータスを更新可能
- 実験管理者（experiment_admin）やシステム管理者（system_admin）はこのAPIを使用不可

---

### 6. トランジションステータス更新API 🔴

**エンドポイント**: `PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status`

**説明**: トランジションのステータスを手動で更新します。進捗確認の一環としてトランジション単位の進捗を記録します。

**認証**: 必須

**権限**: `experiment_worker`（書込可）

**優先度**: ⭐⭐⭐ 高

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ○ | プロジェクト名 |
| `methodId` | string | ○ | メソッドID（MAIMLファイル内のmethod id） |
| `transitionId` | string | ○ | トランジションID |

**リクエストボディ**:
```json
{
  "taskNo": 1,
  "status": "running",
  "progressRate": 50,
  "comment": "実験を開始しました。現在50%完了。"
}
```

**リクエストボディのパラメータ詳細**:

| パラメータ | 型 | 必須 | 説明 | 制約 |
|-----------|----|----|------|------|
| taskNo | integer | ○ | タスク連番 | 1以上の整数 |
| status | string | ○ | トランジションステータス | initial, preparing, ready, running, paused, completed, error |
| progressRate | integer | △ | 進捗率 | 0-100、statusがcompletedの場合は自動的に100 |
| comment | string | × | コメント | 最大2000文字 |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "transitionId": "transition_001",
    "taskNo": 1,
    "methodId": "method_001",
    "projectName": "Sample Project",
    "status": "running",
    "progressRate": 50,
    "comment": "実験を開始しました。現在50%完了。",
    "updatedBy": "880e8400-e29b-41d4-a716-446655440003",
    "updatedAt": "2026-01-27T11:00:00Z"
  },
  "meta": {
    "timestamp": "2026-01-27T11:00:00Z",
    "requestId": "req_def456"
  }
}
```

**エラー時 (400 Bad Request)**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "status",
        "message": "Invalid status value",
        "code": "INVALID_VALUE"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-27T11:00:00Z",
    "requestId": "req_def456"
  }
}
```

**エラー時 (403 Forbidden)**:
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_INSUFFICIENT",
    "message": "Project is not in editable status"
  },
  "meta": {
    "timestamp": "2026-01-27T11:00:00Z",
    "requestId": "req_def456"
  }
}
```

**エラー時 (404 Not Found)**:
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Transition not found or does not belong to your organization"
  },
  "meta": {
    "timestamp": "2026-01-27T11:00:00Z",
    "requestId": "req_def456"
  }
}
```

#### ビジネスロジック

1. **プロジェクトステータス確認**
   - プロジェクトステータスが編集可能（draft/active/waiting_approval）であることを確認

2. **トランジション存在確認**
   - transitionIdが指定されたプロジェクト・メソッド・タスク連番に属することを確認
   - organization_idでマルチテナント分離

3. **ステータス更新**
   - transition_dataテーブルを更新
   - statusが"completed"の場合、progress_rateを自動的に100に設定
   - updated_byに現在のユーザーIDを設定

4. **イベントログ記録**
   - maiml_event_logテーブルに変更履歴を記録
   - 組織ID、プロジェクトIDはリクエストデータから取得
   - シーケンス番号は自動採番（organization_id、project_id単位で連番）
   - APIリクエストデータをJSON形式でlogカラムに格納

5. **タスク進捗の再計算（オプション）**
   - タスク内の全トランジションの進捗率から、タスク全体の進捗率を再計算

#### バリデーション

- [ ] projectName は文字列（パスパラメータ）
- [ ] methodId は文字列（パスパラメータ）
- [ ] transitionId は文字列（パスパラメータ）
- [ ] taskNo は1以上の整数（リクエストボディ）
- [ ] status は許可された値のいずれか
- [ ] progressRate は0-100の整数（指定時）
- [ ] comment は2000文字以内（指定時）

#### データベーステーブル

**使用テーブル**:

1. **transition_data**（主テーブル）
   - organization_id, project_id, method_id, task_no, transition_id
   - status, progress_rate, comment
   - updated_by, updated_at, created_at

2. **maiml_event_log**（イベントログ）
   - organization_id, project_id, sequence_no
   - log (JSONB)
   - created_at

3. **projects**（ステータス確認）
   - id, status, organization_id

4. **project_task**（存在確認）
   - project_id, task_no, organization_id

#### SQL例

```sql
-- トランザクション開始
BEGIN;

-- 1. プロジェクト情報取得
SELECT project_id, project_status FROM project
WHERE project_name = $1 AND organization_id = $2;

-- 2. プロジェクトステータス確認（編集可能）
-- draft, active, waiting_approval のいずれかであること

-- 3. タスク存在確認
SELECT task_no FROM project_task 
WHERE project_id = $3 
  AND task_no = $4 
  AND organization_id = $2;

-- 4. トランジションステータス更新
UPDATE transition_data
SET 
  status = $5,
  progress_rate = CASE 
    WHEN $5 = 'completed' THEN 100 
    ELSE $6 
  END,
  comment = $7,
  updated_by = $8,
  updated_at = NOW()
WHERE organization_id = $2
  AND project_id = $3
  AND method_id = $9
  AND task_no = $4
  AND transition_id = $10
RETURNING *;

-- 5. イベントログ記録
INSERT INTO maiml_event_log (
  organization_id,
  project_id,
  sequence_no,
  log,
  created_at
) VALUES (
  $2,  -- organization_id
  $3,  -- project_id
  (
    SELECT COALESCE(MAX(sequence_no), 0) + 1
    FROM maiml_event_log
    WHERE organization_id = $2 AND project_id = $3
  ),  -- 自動採番されたsequence_no
  jsonb_build_object(
    'event_type', 'transition_status_update',
    'method_id', $9,
    'task_no', $4,
    'transition_id', $10,
    'status', $5,
    'progress_rate', CASE WHEN $5 = 'completed' THEN 100 ELSE $6 END,
    'comment', $7,
    'updated_by', $8,
    'timestamp', NOW()
  ),  -- APIデータをJSON形式で格納
  NOW()
);

-- 6. タスク進捗率の再計算（オプション）
UPDATE project_task
SET 
  progress_rate = (
    SELECT AVG(progress_rate)
    FROM transition_data
    WHERE project_id = $3 
      AND task_no = $4 
      AND organization_id = $2
  ),
  updated_at = NOW()
WHERE project_id = $3 
  AND task_no = $4 
  AND organization_id = $2;

COMMIT;
```

**パラメータ説明**:
```
$1: project_name (string)
$2: organization_id (string)
$3: project_id (UUID) - プロジェクト名から取得
$4: task_no (integer) - リクエストボディ
$5: status (string) - リクエストボディ
$6: progress_rate (integer) - リクエストボディ
$7: comment (string) - リクエストボディ
$8: updated_by (UUID) - 現在のユーザーID
$9: method_id (string) - パスパラメータ
$10: transition_id (string) - パスパラメータ
```

#### セキュリティ

- [ ] organization_id フィルタ必須
- [ ] プロジェクトステータスが編集可能であることを確認
- [ ] SQLインジェクション対策（Parameterized Queries）
- [ ] パスパラメータの階層構造検証

#### パフォーマンス

- インデックス: transition_data (organization_id, project_id, method_id, task_no, transition_id) - 複合主キー
- インデックス: transition_data (organization_id, project_id, updated_at)
- トランザクション: 必須（整合性保証）

#### 備考

- **旧エンドポイント**: この仕様は実験データ記録API（api_experiment_data.md）から移動
- **変更点**: taskNoをパスパラメータからリクエストボディパラメータに変更
- **権限**: experiment_worker（書込可）のみが使用可能
- **用途**: 進捗確認の一環としてトランジション単位の進捗を記録

---

### 参考: タスクステータス更新API（旧エンドポイント） 🔴

**⚠️ 注意**: このエンドポイントは参考用です。新規実装では **API #5** の `PATCH /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status` を使用してください。

**エンドポイント**: `PUT /api/v1/tasks/:taskId/status`

**説明**: タスクIDでタスクを特定してステータスを更新（旧仕様）

**認証**: 必須

**権限**: `experiment_admin`, `experiment_worker`, `system_admin`

**優先度**: ⭐⭐ 中

#### リクエストパラメータ

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `taskId` | UUID | ○ | タスクID |

**リクエストボディ**:
```json
{
  "status": "not_started" | "started" | "in_progress" | "completed" | "forced_terminated",
  "comment": "string (最大500文字, optional)"
}
```

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "task_id": "task-uuid",
    "task_name": "反応実験タスク",
    "previous_status": "in_progress",
    "new_status": "completed",
    "updated_by": "user-uuid",
    "updated_by_name": "User Name",
    "updated_at": "2026-01-21T16:00:00Z",
    "comment": "実験完了しました"
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラー時**:
- 400: バリデーションエラー、または無効なステータス遷移
- 401: 認証エラー
- 403: 権限不足（担当者以外が更新しようとした）
- 404: タスクが存在しない
- 409: プロジェクトステータスが編集不可
- 500: システムエラー

#### ビジネスロジック

**ステータス遷移ルール**:
```typescript
const validTransitions: Record<string, string[]> = {
  'not_started': ['started', 'forced_terminated'],
  'started': ['in_progress', 'forced_terminated'],
  'in_progress': ['completed', 'forced_terminated'],
  'completed': ['in_progress'], // 再開可能
  'forced_terminated': ['started'] // 再開可能
};

const canTransition = (from: string, to: string): boolean => {
  return validTransitions[from]?.includes(to) || false;
};
```

**前提条件チェック**:
```typescript
// プロジェクトステータスが編集可能かチェック
const project = await db
  .selectFrom('project')
  .innerJoin('project_task', 'project.project_id', 'project_task.project_id')
  .where('project_task.task_id', '=', taskId)
  .where('project.organization_id', '=', organizationId)
  .select(['project.project_status'])
  .executeTakeFirstOrThrow();

const editableStatuses = ['draft', 'active'];
if (!editableStatuses.includes(project.project_status)) {
  throw new ConflictError(
    'プロジェクトステータスが編集可能な状態ではありません'
  );
}
```

#### 実装要件

**DBクエリ（トランザクション）**:
```typescript
await db.transaction().execute(async (trx) => {
  // 現在のタスク情報を取得
  const task = await trx
    .selectFrom('project_task')
    .where('task_id', '=', taskId)
    .where('organization_id', '=', organizationId)
    .select(['task_id', 'task_name', 'task_status', 'assign_user_id'])
    .executeTakeFirstOrThrow();

  // 権限チェック（Worker の場合は自分のタスクのみ）
  if (req.user.role === 'experiment_worker') {
    if (task.assign_user_id !== req.user.userId) {
      throw new ForbiddenError(
        '自分に割り当てられていないタスクは更新できません'
      );
    }
  }

  // ステータス遷移チェック
  if (!canTransition(task.task_status, status)) {
    throw new BadRequestError(
      `ステータスを ${task.task_status} から ${status} に変更できません`
    );
  }

  // ステータス更新
  await trx
    .updateTable('project_task')
    .set({
      task_status: status,
      update_at: new Date().toISOString(),
      update_user_id: req.user.userId
    })
    .where('task_id', '=', taskId)
    .where('organization_id', '=', organizationId)
    .execute();

  // コメントがある場合は記録（任意）
  if (comment) {
    await trx
      .insertInto('task_comment')
      .values({
        comment_id: uuidv4(),
        task_id: taskId,
        user_id: req.user.userId,
        comment: comment,
        organization_id: organizationId,
        create_at: new Date().toISOString()
      })
      .execute();
  }

  // 監査ログ記録
  logger.info('Task status updated', {
    taskId,
    previousStatus: task.task_status,
    newStatus: status,
    updatedBy: req.user.userId,
    organizationId
  });
});
```

**バリデーション**:
```typescript
const validateStatusUpdate = (body: any) => {
  const validStatuses = [
    'not_started',
    'started',
    'in_progress',
    'completed',
    'forced_terminated'
  ];

  if (!body.status) {
    throw new BadRequestError('status is required');
  }

  if (!validStatuses.includes(body.status)) {
    throw new BadRequestError(
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    );
  }

  if (body.comment && body.comment.length > 500) {
    throw new BadRequestError('comment must be 500 characters or less');
  }
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
| 1.4.0 | 2026-02-18 | トランジションステータス更新API追加（6エンドポイント） | Cline |
| | | - API #6: PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status | |
| | | - 実験データ記録APIから進捗確認APIに移動 | |
| | | - taskNoをリクエストボディパラメータ化 | |
| | | - 権限: experiment_worker（書込可） | |
| | | - トランジション単位の進捗更新 | |
| | | - イベントログ記録とタスク進捗率再計算 | |
| 1.3.0 | 2026-02-18 | タスク一覧取得（実験作業者用）API仕様変更（5エンドポイント） | Cline |
| | | - API #4: GET /api/v1/progress/projects/:projectName/worker-tasks（エンドポイント変更） | |
| | | - タスク一覧取得（プロジェクト単位）からタスク一覧取得（実験作業者用）に変更 | |
| | | - プロジェクト名のみで特定（methodIdパラメータ削除） | |
| | | - メソッドごとにグループ化したレスポンス | |
| | | - 総API数: 6→5（-1: 重複削除） | |
| 1.2.0 | 2026-02-18 | タスク一覧取得（実験作業者用）API追加（6エンドポイント） | Cline |
| | | - API #6: GET /api/v1/progress/projects/:projectName/methods/:methodId/worker-tasks | |
| | | - 実験作業者が自分に割り当てられたタスクの一覧を取得 | |
| | | - 権限: experiment_worker（読取専用） | |
| 1.1.0 | 2026-02-18 | タスクステータス更新API追加（5エンドポイント） | Cline |
| | | - API #5: PATCH /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status | |
| | | - プロジェクト名+メソッドID+タスク連番でタスク特定 | |
| | | - 楽観的ロック（currentUpdatedAt）実装（オプション） | |
| | | - 旧エンドポイント（PUT /api/v1/tasks/:taskId/status）はAPI #6として参考情報化 | |
| 1.0.0 | 2026-01-21 | 新規作成 | Cline |

---

**作成者**: Cline  
**作成日**: 2026-01-21 16:45  
**最終更新**: 2026-02-18 14:00

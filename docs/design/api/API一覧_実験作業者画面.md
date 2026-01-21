# API一覧 - 実験作業者画面

## 概要

実験作業者用UI設計書から抽出したAPI一覧です。各APIの用途、HTTPメソッド、実装状況を整理しています。

**作成日**: 2026-01-19  
**対象UI設計書**: 18ファイル

---

## API一覧表

| No | API名 | HTTPメソッド | エンドポイント（想定） | 用途 | 使用画面 | 実装状況 | 備考 |
|----|-------|-------------|---------------------|------|---------|---------|------|
| 1 | データ保存API | POST | `/api/experiment-records` | 実験データの保存 | 実験記録タブ | TODO | トランジション単位でデータを保存 |
| 2 | 問題報告API | POST | `/api/v1/issues` | 問題報告の送信 | 実験記録タブ、進捗確認タブ、問題管理モーダル | ✅ 完了 | タスク・トランジション単位で問題を報告 |
| 3 | コメント投稿API | POST | `/api/v1/issues/:issueId/comments` | 問題へのコメント投稿 | 実験記録タブ、進捗確認タブ、問題管理モーダル | ✅ 完了 | 既存問題にコメントを追加 |
| 4 | 進捗データ取得API | GET | `/api/progress/{projectId}/{methodId}/{taskId}` | トランジションの進捗データ取得 | 実験記録タブ | モック | 各トランジションの実行状況を取得 |
| 5 | 指示一覧取得API | GET | `/api/v1/instructions` | 作業指示一覧の取得 | 指示確認タブ | TODO | プロジェクト・メソッド・タスク単位で指示を取得 |
| 6 | 指示確認API | PUT | `/api/v1/instructions/{instructionId}/confirm` | 指示の確認完了 | 指示確認タブ | TODO | 作業指示を確認済みに変更 |
| 7 | MAIMLファイル取得API | GET | `/api/files/maiml/{fileId}` | フロー図表示用のMAIMLファイル取得 | 指示確認タブ、指示フローダイアログ | モック | Petri Netフロー図の表示に使用 |
| 8 | タスク一覧取得API | GET | `/api/tasks?projectId={projectId}` | プロジェクト内の全タスク取得 | 進捗確認タブ | ✅ 完了 | メソッド単位でグループ化して表示 |
| 9 | タスクステータス更新API | PUT | `/api/tasks/{taskId}/status` | タスクステータスの更新 | 進捗確認タブ | ✅ 完了 | 開始、完了、強制終了などのステータス変更 |
| 10 | 問題ステータス変更API | PATCH | `/api/v1/issues/:issueId/status` | 問題ステータスの変更（未解決/解決済） | 問題管理モーダル | ✅ 完了 | 問題のステータスを更新（Manager/Admin権限必要） |
| 11 | 問題一覧取得API | GET | `/api/v1/issues` | 問題一覧取得（複合フィルタ対応） | 実験記録タブ、問題管理モーダル | ✅ 完了 | プロジェクト・タスク・トランジション単位で問題を取得 |
| 12 | 問題詳細取得API | GET | `/api/v1/issues/:issueId` | 問題詳細とコメント一覧取得 | 問題管理モーダル | ✅ 完了 | 問題の詳細情報とすべてのコメントを取得 |

---

## API詳細

### 1. データ保存API

**エンドポイント**: `POST /api/experiment-records`

**用途**: 実験データの保存

**リクエストボディ（想定）**:
```json
{
  "projectId": "string",
  "methodId": "string",
  "taskId": "string",
  "transitionId": "string",
  "status": "completed" | "in_progress" | "failed",
  "progress": 0-100,
  "data": {
    "materials": {},
    "conditions": {},
    "results": {}
  },
  "comment": "string"
}
```

**レスポンス（想定）**:
```json
{
  "success": true,
  "recordId": "string",
  "message": "データを保存しました"
}
```

**使用画面**:
- 実験記録タブ（ExperimentRecordTab）
- TransitionList
- TransitionFlowDiagram

**実装状況**: TODO

---

### 2. 問題報告API

**エンドポイント**: `POST /api/v1/issues`

**用途**: 問題報告の送信

**リクエストボディ**:
```json
{
  "targetType": "project" | "task" | "transition",
  "projectId": "string (UUID, 必須)",
  "taskId": "string (UUID, targetTypeがtask/transitionの場合必須)",
  "transitionId": "string (UUID, targetTypeがtransitionの場合必須)",
  "title": "string (最大200文字)",
  "content": "string (最大5000文字)",
  "issueType": "material_shortage" | "equipment_failure" | "procedure_unclear" | "safety_concern" | "quality_issue" | "time_constraint" | "other"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "issueId": "string (UUID)",
    "targetType": "project" | "task" | "transition",
    "projectId": "string",
    "taskId": "string (optional)",
    "transitionId": "string (optional)",
    "title": "string",
    "content": "string",
    "issueType": "string",
    "status": "unresolved",
    "reportedBy": "string (userId)",
    "reportedAt": "string (ISO 8601)",
    "organizationId": "string"
  },
  "meta": {
    "timestamp": "string (ISO 8601)",
    "requestId": "string (UUID)"
  }
}
```

**使用画面**:
- 実験記録タブ（ExperimentRecordTab）
- 進捗確認タブ（ProgressCheckTab）
- 問題管理モーダル（IssueManagementModal）

**実装状況**: ✅ 完了（テスト103件すべてPASS）

**詳細仕様**: `docs/.kiro/specs/issue-report-api/design.md` 参照

---

### 3. コメント投稿API

**エンドポイント**: `POST /api/v1/issues/:issueId/comments`

**用途**: 問題へのコメント投稿

**リクエストボディ**:
```json
{
  "content": "string (1-2000文字)"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "commentId": "string (UUID)",
    "issueId": "string (UUID)",
    "content": "string",
    "postedBy": "string (userId)",
    "postedByName": "string (username)",
    "postedAt": "string (ISO 8601)"
  },
  "meta": {
    "timestamp": "string (ISO 8601)",
    "requestId": "string (UUID)"
  }
}
```

**使用画面**:
- 実験記録タブ（ExperimentRecordTab）
- 進捗確認タブ（ProgressCheckTab）
- 問題管理モーダル（IssueManagementModal）

**実装状況**: ✅ 完了（テスト103件すべてPASS）

**特記事項**:
- コメント投稿時に自動的に `issues.updated_at` を更新
- トランザクション保証により整合性を確保
- Winston構造化ログによる監査証跡を記録

**詳細仕様**: `docs/.kiro/specs/issue-report-api/design.md` 参照

---

### 4. 進捗データ取得API

**エンドポイント**: `GET /api/progress/{projectId}/{methodId}/{taskId}`

**用途**: トランジションの進捗データ取得

**レスポンス（想定）**:
```json
{
  "success": true,
  "data": [
    {
      "transitionId": "string",
      "status": "not_started" | "in_progress" | "completed" | "failed",
      "progress": 0-100,
      "lastUpdated": "2026-01-19T10:00:00Z"
    }
  ]
}
```

**使用画面**:
- 実験記録タブ（ExperimentRecordTab）
- TransitionList
- TransitionFlowDiagram

**実装状況**: モックデータ使用中

---

### 5. 指示一覧取得API

**エンドポイント**: `GET /api/v1/instructions`

**用途**: 作業指示一覧の取得

**クエリパラメータ**:
```
projectId: string (UUID, required)
methodId: string (UUID, optional - タスク指示のフィルタリング用)
taskNo: number (optional - さらに絞り込み)
instructionTarget: 1 | 2 | 3 (optional - 1:ファイル全体、2:タスク、3:トランジション)
isAcknowledged: boolean (optional - 確認済/未確認でフィルタ)
sortBy: "instruction_date" | "priority" (default: "instruction_date")
order: "asc" | "desc" (default: "desc")
```

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "instructionId": "string (experiment_instruction_id)",
      "targetType": "file" | "task" | "transition",
      "methodId": "string (optional, タスク指示の場合)",
      "taskNo": "number (optional, タスク指示の場合)",
      "transitionId": "string (optional, トランジション指示の場合)",
      "instructions": "string",
      "priority": "number",
      "type": "number",
      "instructionDate": "string (ISO 8601)",
      "instructedBy": "string (instruction_user_id)",
      "instructedByName": "string (ユーザー名)",
      "isAcknowledged": "boolean",
      "acknowledgedAt": "string (ISO 8601, optional)",
      "acknowledgedBy": "string (user_id, optional)",
      "acknowledgedByName": "string (ユーザー名, optional)"
    }
  ],
  "meta": {
    "timestamp": "string (ISO 8601)",
    "requestId": "string (UUID)"
  }
}
```

**使用画面**:
- 指示確認タブ（InstructionConfirmationTab）

**実装状況**: TODO

**特記事項**:
- プロジェクトIDは必須パラメータ
- methodIdを指定すると、タスク指示を該当メソッドでフィルタリング
- taskNoをさらに指定すると、特定タスクの指示のみ取得
- instructionTargetで指示種別を絞り込み可能
- isAcknowledgedで確認済/未確認をフィルタリング可能
- マルチテナント分離により自組織の指示のみ取得

**データベーステーブル**:
- `project_instruction` - 指示データ
- `organization_user` - ユーザー名取得（JOIN）

**SQL例**:
```sql
SELECT 
  pi.experiment_instruction_id as instruction_id,
  pi.instruction_target as target_type,
  pi.method_id,
  pi.task_no,
  pi.transition_id,
  pi.instructions,
  pi.priority,
  pi.type,
  pi.instruction_date,
  pi.instruction_user_id as instructed_by,
  ou1.user_name as instructed_by_name,
  pi.is_acknowledged,
  pi.acknowledged_at,
  pi.acknowledged_user_id as acknowledged_by,
  ou2.user_name as acknowledged_by_name
FROM project_instruction pi
LEFT JOIN organization_user ou1 
  ON ou1.user_id = pi.instruction_user_id 
  AND ou1.organization_id = pi.organization_id
LEFT JOIN organization_user ou2 
  ON ou2.user_id = pi.acknowledged_user_id 
  AND ou2.organization_id = pi.organization_id
WHERE pi.organization_id = $1
  AND pi.project_id = $2
  AND (pi.method_id = $3 OR $3 IS NULL)
  AND (pi.task_no = $4 OR $4 IS NULL)
  AND (pi.instruction_target = $5 OR $5 IS NULL)
  AND (pi.is_acknowledged = $6 OR $6 IS NULL)
ORDER BY pi.instruction_date DESC;
```

---

### 6. 指示確認API

**エンドポイント**: `PUT /api/v1/instructions/{instructionId}/confirm`

**用途**: 指示の確認完了

**リクエストボディ（想定）**:
```json
{
  "instructionId": "string",
  "confirmedAt": "2026-01-19T10:00:00Z"
}
```

**レスポンス（想定）**:
```json
{
  "success": true,
  "message": "指示を確認しました"
}
```

**使用画面**:
- 指示確認タブ（InstructionConfirmationTab）
- InstructionGroup

**実装状況**: TODO

---

### 6. MAIMLファイル取得API

**エンドポイント**: `GET /api/files/maiml/{fileId}`

**用途**: フロー図表示用のMAIMLファイル取得

**レスポンス（想定）**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<MaiML>
  <!-- MAIMLファイルの内容 -->
</MaiML>
```

**使用画面**:
- 指示確認タブ（InstructionConfirmationTab）
- 指示フローダイアログ（InstructionFlowDialog）

**実装状況**: モックデータ使用中（`/data/mock/test_omori11.maiml`）

---

### 7. タスク一覧取得API

**エンドポイント**: `GET /api/tasks?projectId={projectId}`

**用途**: プロジェクト内の全タスク取得

**レスポンス（想定）**:
```json
{
  "success": true,
  "data": [
    {
      "taskId": "string",
      "taskName": "string",
      "methodId": "string",
      "methodName": "string",
      "status": "not_started" | "started" | "in_progress" | "completed" | "forced_terminated",
      "assignedTo": "string",
      "dueDate": "2026-01-20"
    }
  ]
}
```

**使用画面**:
- 進捗確認タブ（ProgressCheckTab）
- ProgressCheckTable

**実装状況**: ✅ 完了

---

### 8. タスクステータス更新API

**エンドポイント**: `PUT /api/tasks/{taskId}/status`

**用途**: タスクステータスの更新

**リクエストボディ（想定）**:
```json
{
  "taskId": "string",
  "status": "not_started" | "started" | "in_progress" | "completed" | "forced_terminated",
  "comment": "string"
}
```

**レスポンス（想定）**:
```json
{
  "success": true,
  "message": "タスクステータスを更新しました"
}
```

**使用画面**:
- 進捗確認タブ（ProgressCheckTab）

**実装状況**: ✅ 完了

---

### 9. 問題ステータス変更API

**エンドポイント**: `PATCH /api/v1/issues/:issueId/status`

**用途**: 問題ステータスの変更（未解決/解決済）

**リクエストボディ**:
```json
{
  "status": "unresolved" | "resolved"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "issueId": "string (UUID)",
    "status": "unresolved" | "resolved",
    "previousStatus": "unresolved" | "resolved",
    "updatedBy": "string (userId)",
    "updatedAt": "string (ISO 8601)",
    "resolvedAt": "string (ISO 8601, resolvedの場合のみ)"
  },
  "meta": {
    "timestamp": "string (ISO 8601)",
    "requestId": "string (UUID)"
  }
}
```

**使用画面**:
- 問題管理モーダル（IssueManagementModal）

**実装状況**: ✅ 完了（テスト103件すべてPASS）

**権限要件**: Manager または Admin ロールが必須（Worker は更新不可）

**特記事項**:
- `resolved` に変更時、自動的に `resolved_at` に現在時刻を設定
- `unresolved` に変更時、`resolved_at` を NULL にクリア
- Winston構造化ログによる変更履歴を記録

**詳細仕様**: `docs/.kiro/specs/issue-report-api/design.md` 参照

---

### 10. 問題一覧取得API

**エンドポイント**: `GET /api/v1/issues`

**用途**: 問題一覧取得（複合フィルタ対応）

**クエリパラメータ**:
```
projectId: string (UUID, optional)
taskId: string (UUID, optional)
transitionId: string (UUID, optional)
status: "unresolved" | "resolved" (optional)
issueType: string (optional)
reportedBy: string (userId, optional)
dateFrom: string (ISO 8601 date, optional)
dateTo: string (ISO 8601 date, optional)
sortBy: "reported_at" | "updated_at" | "status" (default: "reported_at")
order: "asc" | "desc" (default: "desc")
page: number (default: 1)
limit: number (default: 20, max: 100)
```

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "issueId": "string (UUID)",
      "targetType": "project" | "task" | "transition",
      "projectId": "string",
      "taskId": "string (optional)",
      "transitionId": "string (optional)",
      "title": "string",
      "issueType": "string",
      "status": "unresolved" | "resolved",
      "reportedBy": "string (userId)",
      "reportedByName": "string (username)",
      "reportedAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)",
      "resolvedAt": "string (ISO 8601, optional)",
      "commentCount": number
    }
  ],
  "pagination": {
    "page": number,
    "limit": number,
    "totalItems": number,
    "totalPages": number,
    "hasNext": boolean,
    "hasPrev": boolean
  },
  "meta": {
    "timestamp": "string (ISO 8601)",
    "requestId": "string (UUID)"
  }
}
```

**使用画面**:
- 実験記録タブ（ExperimentRecordTab）
- 問題管理モーダル（IssueManagementModal）

**実装状況**: ✅ 完了（テスト103件すべてPASS）

**特記事項**:
- 複合フィルタリング対応（プロジェクト・タスク・トランジション・ステータス・種別等）
- ソート・ページネーション対応
- コメント数を自動集計
- パフォーマンス目標: 1秒以内（100件）

**詳細仕様**: `docs/.kiro/specs/issue-report-api/design.md` 参照

---

### 11. 問題詳細取得API（新規）

**エンドポイント**: `GET /api/v1/issues/:issueId`

**用途**: 問題詳細とコメント一覧取得

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "issue": {
      "issueId": "string (UUID)",
      "targetType": "project" | "task" | "transition",
      "projectId": "string",
      "taskId": "string (optional)",
      "transitionId": "string (optional)",
      "title": "string",
      "content": "string",
      "issueType": "string",
      "status": "unresolved" | "resolved",
      "reportedBy": "string (userId)",
      "reportedByName": "string (username)",
      "reportedAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)",
      "resolvedAt": "string (ISO 8601, optional)",
      "organizationId": "string"
    },
    "comments": [
      {
        "commentId": "string (UUID)",
        "issueId": "string (UUID)",
        "content": "string",
        "postedBy": "string (userId)",
        "postedByName": "string (username)",
        "postedAt": "string (ISO 8601)"
      }
    ]
  },
  "meta": {
    "timestamp": "string (ISO 8601)",
    "requestId": "string (UUID)"
  }
}
```

**使用画面**:
- 問題管理モーダル（IssueManagementModal）

**実装状況**: ✅ 完了（テスト103件すべてPASS）

**特記事項**:
- 問題の詳細情報とすべてのコメントを一括取得
- コメントは投稿日時の昇順でソート
- マルチテナント分離により自組織の問題のみ取得可能

**詳細仕様**: `docs/.kiro/specs/issue-report-api/design.md` 参照

---

## 実装優先度

### 高優先度（コア機能）

1. **データ保存API** - 実験記録の保存は最重要機能
2. **進捗データ取得API** - 進捗状況の可視化に必須
3. ~~**問題報告API**~~ - ✅ 実装完了
4. ~~**コメント投稿API**~~ - ✅ 実装完了

### 中優先度（管理機能）

5. **タスク一覧取得API** - 進捗確認に必要
6. **タスクステータス更新API** - タスク管理に必要
7. ~~**問題ステータス変更API**~~ - ✅ 実装完了
8. ~~**問題一覧取得API**~~ - ✅ 実装完了
9. ~~**問題詳細取得API**~~ - ✅ 実装完了

### 低優先度（補助機能）

9. **指示確認API** - 指示管理機能（後回し可能）
10. **MAIMLファイル取得API** - 現在モックで動作中

---

## セキュリティ要件

### 認証・認可

- すべてのAPIは認証必須（JWT トークン）
- 実験作業者（experiment_worker）ロールが必要
- 自分に割り当てられたタスクのみアクセス可能

### マルチテナント分離

- すべてのAPIで`organization_id`による分離が必須
- クロステナントアクセスは厳禁

### データ検証

- 入力データのバリデーション
- SQLインジェクション対策（Parameterized Queries）
- XSS対策（適切なエスケープ処理）

---

## エラーハンドリング

### 共通エラーレスポンス

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": []
  }
}
```

### HTTPステータスコード

| コード | 説明 | 使用例 |
|--------|------|--------|
| 200 | OK | 成功 |
| 201 | Created | リソース作成成功 |
| 400 | Bad Request | バリデーションエラー |
| 401 | Unauthorized | 認証エラー |
| 403 | Forbidden | 認可エラー（権限不足） |
| 404 | Not Found | リソースが存在しない |
| 500 | Internal Server Error | サーバー内部エラー |

---

## 関連ドキュメント

- [API設計規約](../.clinerules/development/api.md)
- [バックエンド規約](../.clinerules/development/backend.md)
- [セキュリティ規約](../.clinerules/development/security.md)
- [データベース構造](../.clinerules/references/db_structure.md)

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-19 | 初版作成、18ファイルからAPI抽出 | Cline |
| 1.1.0 | 2026-01-20 | 問題報告API・コメント投稿API・問題管理API群の実装完了を反映 | Cline |
| 1.2.0 | 2026-01-20 | タスク一覧取得API・タスクステータス更新APIの実装完了を反映 | Cline |

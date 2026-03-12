# API一覧 - 実験作業者画面

## メタデータ
- **作成日**: 2026-03-12
- **対象画面**: 実験作業者画面（ExperimentWorkerMenu）
- **調査元**: `docs/design/ui/experiment_worker/` 配下のUI設計書（15ファイル）

---

## 1. プロジェクト関連 API

| # | コンポーネント | メソッド | エンドポイント | 用途 | 実装状況 |
|---|---|---|---|---|---|
| 1 | ExperimentWorkerMenu | GET | `/api/v1/projects/worker-accessible` | 実験作業者がアクセス可能なプロジェクト一覧取得 | ✅ 実装済み |
| 2 | ExperimentWorkerMenu | PATCH | `/api/v1/projects/{projectName}/approval-request` | 承認依頼送信 | ✅ 実装済み |
| 3 | InstructionConfirmationTab | GET | `/api/v1/projects/:projectName/maiml` | フロー図表示用MAIMLファイル取得 | ✅ 実装済み |

### 1.1 プロジェクト一覧取得API

**エンドポイント**: `GET /api/v1/projects/worker-accessible`

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| page | number | - | ページ番号（デフォルト: 1） |
| limit | number | - | 1ページあたりの件数（デフォルト: 100） |
| status | "1" \| "2" \| "3" | - | ステータスフィルタ |
| sort_by | string | - | ソート項目（デフォルト: "project_name"） |
| order | "asc" \| "desc" | - | ソート順（デフォルト: "asc"） |

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "projectId": "string (UUID)",
      "projectName": "string",
      "description": "string",
      "projectStatus": "number",
      "useDeemedProgress": "boolean",
      "createdAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)"
    }
  ],
  "pagination": { "page": "number", "limit": "number", "totalItems": "number", "totalPages": "number", "hasNext": "boolean", "hasPrev": "boolean" }
}
```

### 1.2 承認依頼API

**エンドポイント**: `PATCH /api/v1/projects/{projectName}/approval-request`

**パスパラメータ**:
- `projectName`: プロジェクト名（文字列、UUIDではない）

**リクエストボディ**:
```json
{ "comment": "string (optional)" }
```

---

## 2. タスク関連 API

| # | コンポーネント | メソッド | エンドポイント | 用途 | 実装状況 |
|---|---|---|---|---|---|
| 4 | ProgressCheckTab / ExperimentRecordTab / InstructionConfirmationTab | GET | `/api/v1/progress/projects/:projectName/worker-tasks` | メソッド・タスク一覧取得（`getWorkerTasks(projectName)` 経由） | ✅ 実装済み |
| 5 | ProgressCheckTab（TaskListTable経由） | PATCH | `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status` | タスクステータス更新（楽観的ロック対応） | ✅ 実装済み |

### 2.1 ワーカータスク一覧取得API

**エンドポイント**: `GET /api/v1/progress/projects/:projectName/worker-tasks`

**パスパラメータ**:
- `projectName`: プロジェクト名（文字列）

**クエリパラメータ（オプション）**:
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| status | string | タスクステータスフィルタ（not_started / started / in_progress / completed / forced_terminated） |
| assignedTo | string (UUID) | 担当者IDフィルタ |
| sortBy | string | ソート項目（task_no / created_at / updated_at / status） |
| order | "asc" \| "desc" | ソート順 |

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "project_id": "string",
    "methods": [
      {
        "method_id": "string",
        "method_name": "string",
        "experiment_order": "number",
        "tasks": [
          {
            "task_no": "number",
            "task_status": "string",
            "experiment_user_id": "string",
            "experiment_user_name": "string",
            "progress_rate": "string",
            "created_at": "string",
            "updated_at": "string"
          }
        ]
      }
    ]
  }
}
```

### 2.2 タスクステータス更新API

**エンドポイント**: `PATCH /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status`

**パスパラメータ**:
- `projectName`: プロジェクト名
- `methodId`: メソッドID
- `taskNo`: タスク番号（整数）

**リクエストボディ**:
```json
{
  "status": "string",
  "comment": "string (optional)",
  "currentUpdatedAt": "string (ISO 8601, 楽観的ロック用)"
}
```

**エラーレスポンス**:
- `403`: 権限なし
- `404`: タスクが見つからない
- `409`: 楽観的ロック競合（他のユーザーが先に更新）

---

## 3. 実験データ関連 API

| # | コンポーネント | メソッド | エンドポイント | 用途 | 実装状況 |
|---|---|---|---|---|---|
| 6 | DataRecordDialog | GET | `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/template-data` | テンプレート実績データ取得 | ✅ 実装済み |
| 7 | DataRecordDialog | POST | `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/template-data` | 実験データ保存（upsert） | ✅ 実装済み |
| 8 | DataRecordDialog | PATCH | `/api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status` | トランジションステータス更新 | ✅ 実装済み |
| 9 | DataRecordDialog | POST | `/api/v1/files/upload` | 実験データファイルアップロード | ⚠️ TODO（未実装） |

### 3.1 テンプレート実績取得API

**エンドポイント**: `GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/template-data`

**パスパラメータ**:
- `projectName`: プロジェクト名（文字列）
- `methodId`: メソッドID（文字列）
- `taskNo`: タスク連番（整数）

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string (UUID)",
      "projectName": "string",
      "methodId": "string",
      "taskNo": "number",
      "placeId": "string",
      "templateId": "string",
      "templateType": "material | condition | result",
      "data": {},
      "status": "number",
      "comment": "string",
      "createdAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)"
    }
  ]
}
```

### 3.2 実験データ保存API

**エンドポイント**: `POST /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/template-data`

**パスパラメータ**:
- `projectName`: プロジェクト名（文字列）
- `methodId`: メソッドID（文字列）
- `taskNo`: タスク連番（整数）

**リクエストボディ**:
```json
{
  "placeId": "string",
  "templateId": "string",
  "templateType": "material | condition | result",
  "data": {},
  "status": "number",
  "comment": "string"
}
```

**備考**: 1リクエストにつき1テンプレート分。既存データがある場合は上書き（upsert）。

### 3.3 トランジションステータス更新API

**エンドポイント**: `PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status`

**パスパラメータ**:
- `projectName`: プロジェクト名（文字列）
- `methodId`: メソッドID（文字列）
- `transitionId`: トランジションID（文字列）

**リクエストボディ**:
```json
{
  "taskNo": "number",
  "status": "number",
  "progressRate": "number",
  "comment": "string (optional)"
}
```

**備考**: `taskNo`（タスク連番）はパスではなくリクエストボディで送信する。

---

## 4. 進捗データ関連 API

| # | コンポーネント | メソッド | エンドポイント | 用途 | 実装状況 |
|---|---|---|---|---|---|
| 10 | ExperimentRecordTab | GET | `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions` | トランジション進捗データ取得 | ✅ 実装済み |

### 4.1 トランジション進捗データ取得API

**エンドポイント**: `GET /api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions`

**パスパラメータ**:
- `projectName`: プロジェクト名
- `methodId`: メソッドID
- `taskNo`: タスク番号（整数）

**レスポンスフィールド（主要）**:
| フィールド | 説明 |
|-----------|------|
| `transition_id` | トランジションID |
| `transition_name` | トランジション名 |
| `status` | ステータス（数値） |
| `progress` | 進捗率 |
| `material_count` | 材料の定義数（MAIMLから取得） |
| `material_actual_count` | 材料の実績数（DBから取得） |
| `condition_count` | 条件の定義数 |
| `condition_actual_count` | 条件の実績数 |
| `result_count` | 結果の定義数 |
| `result_actual_count` | 結果の実績数 |

---

## 5. 問題報告関連 API

| # | コンポーネント | メソッド | エンドポイント | 用途 | 実装状況 |
|---|---|---|---|---|---|
| 11 | ExperimentRecordTab / TransitionList / IssueManagementModal | GET | `/api/v1/issues` | 問題一覧取得（`getIssues()`） | ✅ 実装済み |
| 12 | ExperimentRecordTab / TransitionList / IssueManagementModal | POST | `/api/v1/issues` | 問題報告登録（`createIssue()`） | ✅ 実装済み |
| 13 | ExperimentRecordTab / TransitionList / IssueManagementModal | POST | `/api/v1/issues/:issueId/comments` | コメント投稿（`addComment()`） | ✅ 実装済み |
| 14 | IssueManagementModal | PATCH | `/api/v1/issues/status` | 問題ステータス変更（未解決/解決済） | ✅ 実装済み |

### 5.1 問題一覧取得API

**エンドポイント**: `GET /api/v1/issues`

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| projectId | string | ✓ | プロジェクトID |
| methodId | string | - | メソッドID（フィルタ用） |
| taskNo | number | - | タスク番号（フィルタ用） |
| transitionId | string | - | トランジションID（フィルタ用） |
| instructionTarget | number | - | 指示対象（1:ファイル全体、2:タスク、3:トランジション） |
| isAcknowledged | boolean | - | 確認済フラグ |

### 5.2 問題報告APIリクエスト

**エンドポイント**: `POST /api/v1/issues`

**リクエストボディ**:
```json
{
  "projectId": "string",
  "methodId": "string (optional)",
  "issueType": "string",
  "targetType": "project | task | transition",
  "taskNo": "number (optional)",
  "transitionId": "string (optional)",
  "title": "string (最大100文字)",
  "description": "string (10〜1000文字)"
}
```

### 5.3 コメント投稿API

**エンドポイント**: `POST /api/v1/issues/:issueId/comments`

**リクエストボディ**:
```json
{ "projectName": "string", "issueId": "string", "comment": "string" }
```

---

## 6. 指示確認関連 API

| # | コンポーネント | メソッド | エンドポイント | 用途 | 実装状況 |
|---|---|---|---|---|---|
| 15 | InstructionConfirmationTab（親から受け取り） | GET | `/api/v1/projects/:projectName/worker-instructions` | 作業指示一覧取得 | 親側で実装 |
| 16 | InstructionConfirmationTab | PUT | `/api/v1/projects/:projectName/instructions/:instructionId/confirm` | 指示の確認完了（`confirmInstruction()`） | ✅ 実装済み |

### 6.1 指示一覧取得API

**エンドポイント**: `GET /api/v1/projects/:projectName/worker-instructions`

**パスパラメータ**:
- `projectName`: プロジェクト名（文字列）

### 6.2 指示確認完了API

**エンドポイント**: `PUT /api/v1/projects/:projectName/instructions/:instructionId/confirm`

**パスパラメータ**:
- `projectName`: プロジェクト名（文字列）
- `instructionId`: 指示ID

**リクエストボディ**: `confirmInstruction(projectName, instructionId)` 経由

---

## 7. API一覧サマリー

| # | メソッド | エンドポイント | 用途 | 実装状況 |
|---|---|---|---|---|
| 1 | GET | `/api/v1/projects/worker-accessible` | プロジェクト一覧取得 | ✅ |
| 2 | PATCH | `/api/v1/projects/{projectName}/approval-request` | 承認依頼送信 | ✅ |
| 3 | GET | `/api/v1/projects/:projectName/maiml` | MAIMLファイル取得 | ✅ |
| 4 | GET | `/api/v1/progress/projects/:projectName/worker-tasks` | メソッド・タスク一覧取得 | ✅ |
| 5 | PATCH | `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status` | タスクステータス更新 | ✅ |
| 6 | GET | `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/template-data` | テンプレート実績取得 | ✅ |
| 7 | POST | `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/template-data` | 実験データ保存 | ✅ |
| 8 | PATCH | `/api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status` | トランジションステータス更新 | ✅ |
| 9 | POST | `/api/v1/files/upload` | ファイルアップロード | ⚠️ TODO |
| 10 | GET | `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions` | トランジション進捗取得 | ✅ |
| 11 | GET | `/api/v1/issues` | 問題一覧取得 | ✅ |
| 12 | POST | `/api/v1/issues` | 問題報告登録 | ✅ |
| 13 | POST | `/api/v1/issues/:issueId/comments` | コメント投稿 | ✅ |
| 14 | PATCH | `/api/v1/issues/status` | 問題ステータス変更 | ✅ |
| 15 | GET | `/api/v1/projects/:projectName/worker-instructions` | 作業指示一覧取得 | 親側で実装 |
| 16 | PUT | `/api/v1/projects/:projectName/instructions/:instructionId/confirm` | 指示確認完了 | ✅ |

**合計: 16 API（うち未実装 1件）**

---

## 8. 特記事項

### パスパラメータの命名規則

- エンドポイントに `projectId`（UUID）ではなく **`projectName`（文字列）** を使用するAPIが多い
- 参照: `DataRecordDialog`、`ExperimentRecordTab`、`ExperimentWorkerMenu` など

### 楽観的ロック

- タスクステータス更新API（#5）では `currentUpdatedAt` パラメータで競合制御
- 409 Conflict 発生時は最新のタスク一覧を再取得してUIに反映

### TODO（未実装）

- ファイルアップロードAPI（#9、`POST /api/v1/files/upload`）：`DataRecordDialog` の `insertion` タイププロパティ用。S3アップロード未実装。
- `TransitionList` の実験データ保存API・ステータス更新APIも別途TODO状態（DataRecordDialogの#7, #8とは別エンドポイント）

---

## 9. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.2.0 | 2026-03-12 | トランジションステータス更新API（#8）のメソッド・エンドポイントを実装に合わせて修正（PUT→PATCH、/experiments/→/progress/、taskNoをパスからボディへ移動） | Cline |
| 1.1.0 | 2026-03-12 | 指示確認関連API（#15, #16）のエンドポイントURLを実装に合わせて修正 | Cline |
| 1.0.0 | 2026-03-12 | `docs/design/ui/experiment_worker/` 配下のUI設計書15ファイルから初版作成 | Cline |

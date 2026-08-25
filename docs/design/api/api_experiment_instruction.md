# 実験指示・実験計画管理API仕様書

## メタデータ
- **作成日**: 2026-08-14
- **バージョン**: 1.0.0
- **最終更新**: 2026-08-14
- **対象ファイル**: `experimentInstructionRoutes.ts` / `experimentInstructionController.ts` / `experimentPlanController.ts`
- **カテゴリ**: 実験指示・タスク承認・実験計画管理

---

## 1. 概要

実験指示・実験計画管理APIは、実験プロジェクトにおけるタスク・トランジションの指示内容確認、タスクの承認/NG記録、および実験計画（予定値）の管理機能を提供します。

### 主要機能

#### 実験指示
- **実験指示一覧取得**: プロジェクトのメソッド・タスク・トランジションをネスト形式で取得
- **メソッド一覧取得**: プロジェクトに紐づくメソッドID一覧を取得
- **タスク承認**: レビュー待ちタスクを承認してステータスを更新
- **タスクNG記録**: レビュー待ちタスクにNG理由を記録してステータスを更新
- **実験計画ダイアログデータ取得**: MAIMLファイルから指定メソッドのトランジション・テンプレート・Ref選択肢を取得

#### 実験計画
- **実験計画一覧取得**: 指定メソッドの全タスク分の実験計画（予定値）を取得
- **実験計画保存（UPSERT）**: 1タスク分の実験計画を保存（存在すれば更新・なければ挿入）
- **実験計画削除**: 指定メソッドの全タスク分の実験計画を削除

### 使用箇所
- **実験指示画面（Experiment Instruction）**: 実験指示一覧・タスク承認/NG操作
- **実験計画ダイアログ（ExperimentPlanDialog）**: MAIMLからの計画データ確認・予定値入力

---

## 2. 共通仕様

### 2.1. ベースURL

```
/api/v1/projects
```

### 2.2. 認証

すべてのエンドポイントに `authMiddleware` が適用されます。

```
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
```

- `organizationId` / `userId` はセッション（`req.user`）から自動取得

### 2.3. 共通レスポンス形式

**成功レスポンス**:
```json
{
  "success": true,
  "data": { ... }
}
```

**エラーレスポンス（409）**:
```json
{
  "success": false,
  "error": {
    "code": "E7005",
    "message": "対象タスクが承認可能な状態（レビュー待ち）ではありません"
  }
}
```

**エラーレスポンス（404）**:
```json
{
  "success": false,
  "error": {
    "code": "E6002",
    "message": "MAIMLファイルが見つかりません"
  }
}
```

**バリデーションエラー（400）**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "ngReason は必須です"
  }
}
```

### 2.4. エラーコード

| コード | ステータス | 説明 |
|--------|----------|------|
| `E6001` | 404 | 指定メソッドIDがMAIMLに存在しない |
| `E6002` | 404 | MAIMLファイルが見つからない |
| `E7005` | 409 | タスクが操作可能な状態（レビュー待ち: task_status=4）ではない |
| `VALIDATION_ERROR` | 400 | バリデーションエラー |

---

## 3. API一覧

### 実験指示

| # | メソッド | エンドポイント | 概要 | 状態 |
|---|---------|--------------|------|------|
| 1 | GET | `/api/v1/projects/:projectId/experiment-instructions` | 実験指示一覧取得（ネスト形式） | ✅ 実装済み |
| 2 | GET | `/api/v1/projects/:projectId/methods` | メソッドID一覧取得 | ✅ 実装済み |
| 3 | PUT | `/api/v1/projects/:projectId/tasks/:methodId/:taskNo/approve` | タスク承認 | ✅ 実装済み |
| 4 | PUT | `/api/v1/projects/:projectId/tasks/:methodId/:taskNo/ng` | タスクNG記録 | ✅ 実装済み |
| 5 | GET | `/api/v1/projects/:projectId/methods/:methodId/plan-dialog-data` | 実験計画ダイアログデータ取得 | ✅ 実装済み |

### 実験計画

| # | メソッド | エンドポイント | 概要 | 状態 |
|---|---------|--------------|------|------|
| 6 | GET | `/api/v1/projects/:projectId/experiment-plans` | 指定メソッドの実験計画一覧取得 | ✅ 実装済み |
| 7 | PUT | `/api/v1/projects/:projectId/experiment-plans/:methodId/:taskNo` | 1タスク分の実験計画UPSERT | ✅ 実装済み |
| 8 | DELETE | `/api/v1/projects/:projectId/experiment-plans/:methodId` | 指定メソッドの全実験計画削除 | ✅ 実装済み |

**完了率**: 100% (8/8)

---

## 4. API詳細仕様

---

### 4.1. GET /projects/:projectId/experiment-instructions — 実験指示一覧取得

**説明**: プロジェクトのメソッド・タスク・トランジションをネスト形式で取得する。実験指示画面の初期データ取得に使用される。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | バリデーション | 説明 |
|----------|---|------|--------------|------|
| `projectId` | string | ✅ | 1〜255文字 | プロジェクトID |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": [
    {
      "methodId": "method_001",
      "methodName": "メソッドA",
      "tasks": [
        {
          "taskNo": 1,
          "taskName": "タスク1",
          "taskStatus": 4,
          "transitions": [
            {
              "transitionId": "transition_001",
              "transitionName": "トランジション1",
              "status": "completed"
            }
          ]
        }
      ]
    }
  ]
}
```

> **注意**: レスポンス構造の詳細は `experimentInstructionService.getExperimentInstructions()` の実装に依存します。

---

### 4.2. GET /projects/:projectId/methods — メソッドID一覧取得

**説明**: プロジェクトに紐づくメソッドID一覧を取得する。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | バリデーション | 説明 |
|----------|---|------|--------------|------|
| `projectId` | string | ✅ | 1〜255文字 | プロジェクトID |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": [
    {
      "methodId": "method_001",
      "methodName": "メソッドA"
    },
    {
      "methodId": "method_002",
      "methodName": "メソッドB"
    }
  ]
}
```

---

### 4.3. PUT /projects/:projectId/tasks/:methodId/:taskNo/approve — タスク承認

**説明**: レビュー待ち（task_status=4）のタスクを承認してステータスを更新する。タスクがレビュー待ち状態でない場合は409を返す。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | バリデーション | 説明 |
|----------|---|------|--------------|------|
| `projectId` | string | ✅ | 1〜255文字 | プロジェクトID |
| `methodId` | string | ✅ | 1〜255文字 | メソッドID |
| `taskNo` | integer | ✅ | 1以上 | タスク番号 |

ボディは不要。

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "taskNo": 1,
    "taskStatus": 5,
    "approvedBy": "user-001",
    "approvedAt": "2026-08-14T11:00:00.000Z"
  }
}
```

**エラー時**:
| ステータス | コード | 説明 |
|-----------|--------|------|
| 400 | `VALIDATION_ERROR` | パラメータ不正 |
| 401 | - | 認証エラー |
| 409 | `E7005` | タスクがレビュー待ち（task_status=4）でない |

---

### 4.4. PUT /projects/:projectId/tasks/:methodId/:taskNo/ng — タスクNG記録

**説明**: レビュー待ち（task_status=4）のタスクにNG理由を記録してステータスを更新する。タスクがレビュー待ち状態でない場合は409を返す。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | バリデーション | 説明 |
|----------|---|------|--------------|------|
| `projectId` | string | ✅ | 1〜255文字 | プロジェクトID |
| `methodId` | string | ✅ | 1〜255文字 | メソッドID |
| `taskNo` | integer | ✅ | 1以上 | タスク番号 |

**Content-Type**: `application/json`

**ボディ**:
```json
{
  "ngReason": "測定値が基準値を超えていた"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `ngReason` | string | ✅ | NG理由（空文字不可） |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "taskNo": 1,
    "taskStatus": 6,
    "ngReason": "測定値が基準値を超えていた",
    "recordedBy": "user-001",
    "recordedAt": "2026-08-14T11:00:00.000Z"
  }
}
```

**エラー時**:
| ステータス | コード | 説明 |
|-----------|--------|------|
| 400 | `VALIDATION_ERROR` | `ngReason` が未指定または空文字 |
| 401 | - | 認証エラー |
| 409 | `E7005` | タスクがレビュー待ち（task_status=4）でない |

---

### 4.5. GET /projects/:projectId/methods/:methodId/plan-dialog-data — 実験計画ダイアログデータ取得

**説明**: MAIMLファイルをパースして、指定メソッドのトランジション一覧・テンプレート定義・Ref選択肢を返す。ExperimentPlanDialog の初期表示時に呼び出される。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | バリデーション | 説明 |
|----------|---|------|--------------|------|
| `projectId` | string | ✅ | 1〜255文字 | プロジェクトID |
| `methodId` | string | ✅ | 1〜255文字 | メソッドID |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "transitions": [
      {
        "transitionId": "transition_001",
        "transitionName": "トランジション1",
        "templateDefinitions": [ ... ],
        "refOptions": [ ... ]
      }
    ]
  }
}
```

> **注意**: レスポンス構造の詳細は `experimentInstructionService.getPlanDialogDataFromMaiml()` の実装に依存します。

**エラー時**:
| ステータス | コード | 説明 |
|-----------|--------|------|
| 400 | `VALIDATION_ERROR` | パラメータ不正 |
| 401 | - | 認証エラー |
| 404 | `E6002` | MAIMLファイルが見つからない |
| 404 | `E6001` | 指定メソッドIDがMAIMLに存在しない |

---

### 4.6. GET /projects/:projectId/experiment-plans?methodId=xxx — 実験計画一覧取得

**説明**: 指定プロジェクト・メソッドの全タスク分の実験計画（予定値）を取得する。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | バリデーション | 説明 |
|----------|---|------|--------------|------|
| `projectId` | string | ✅ | 1〜255文字 | プロジェクトID |

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `methodId` | string | ✅ | メソッドID |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": [
    {
      "projectId": "project-001",
      "methodId": "method_001",
      "taskNo": 1,
      "plannedValues": {
        "temperature": 25.0,
        "pressure": 101.3
      },
      "createdBy": "user-001",
      "updatedAt": "2026-08-14T11:00:00.000Z"
    }
  ]
}
```

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | `methodId` クエリパラメータが未指定 |
| 401 | 認証エラー |

---

### 4.7. PUT /projects/:projectId/experiment-plans/:methodId/:taskNo — 実験計画UPSERT

**説明**: 1タスク分の実験計画（予定値）を保存する（存在すれば更新・なければ挿入）。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | バリデーション | 説明 |
|----------|---|------|--------------|------|
| `projectId` | string | ✅ | 1〜255文字 | プロジェクトID |
| `methodId` | string | ✅ | 1〜255文字 | メソッドID |
| `taskNo` | integer | ✅ | 1以上 | タスク番号 |

**Content-Type**: `application/json`

**ボディ**:
```json
{
  "plannedValues": {
    "temperature": 25.0,
    "pressure": 101.3,
    "duration": 60
  }
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `plannedValues` | object | ✅ | 実験計画の予定値（キー・値は実験テンプレートに依存） |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "projectId": "project-001",
    "methodId": "method_001",
    "taskNo": 1,
    "plannedValues": {
      "temperature": 25.0,
      "pressure": 101.3,
      "duration": 60
    },
    "createdBy": "user-001",
    "updatedAt": "2026-08-14T11:00:00.000Z"
  }
}
```

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | `plannedValues` が未指定またはオブジェクトでない |
| 401 | 認証エラー |

---

### 4.8. DELETE /projects/:projectId/experiment-plans/:methodId — 実験計画削除

**説明**: 指定プロジェクト・メソッドの全タスク分の実験計画を削除する。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | バリデーション | 説明 |
|----------|---|------|--------------|------|
| `projectId` | string | ✅ | 1〜255文字 | プロジェクトID |
| `methodId` | string | ✅ | 1〜255文字 | メソッドID |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "deleted": 3,
    "message": "3 experiment plan(s) deleted"
  }
}
```

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | パラメータ不正 |
| 401 | 認証エラー |

---

## 5. タスクステータス遷移

承認/NG操作に関係するタスクステータスを示します。

| task_status | 状態 | 説明 |
|------------|------|------|
| 4 | レビュー待ち（review_waiting） | 承認/NG操作が可能な状態 |
| 5 | 完了（completed） | 承認後の状態 |
| 6 | NG | NG記録後の状態 |

> `/approve` および `/ng` は **task_status=4 のタスクのみ**を対象とします。それ以外のステータスの場合は **409 E7005** を返します。

---

## 6. 実装ファイル一覧

| レイヤー | ファイルパス |
|---------|------------|
| ルート | `backend/src/routes/experimentInstructionRoutes.ts` |
| コントローラー（実験指示） | `backend/src/controllers/experimentInstructionController.ts` |
| コントローラー（実験計画） | `backend/src/controllers/experimentPlanController.ts` |
| サービス（実験指示） | `backend/src/services/experimentInstructionService.ts` |
| サービス（実験計画） | `backend/src/services/experimentPlanService.ts` |

---

## 7. 関連ドキュメント

- [api_list.md](./api_list.md)
- [api_experiment_evaluation.md](./api_experiment_evaluation.md)（タスク完了後の評価データ管理）

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-08-14 | 初版作成 | Cline |
| | | - 実験指示5件・実験計画3件の計8エンドポイントを記載 | |
| | | - タスクステータス遷移（task_status=4/5/6）を記載 | |
| | | - 承認/NG の409 E7005 条件を明記 | |
| | | - plan-dialog-data の E6001/E6002 条件を記載 | |

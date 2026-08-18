# 実験計画・指示 API仕様書

## メタデータ
- **APIグループ**: 実験計画・指示
- **ベースパス**: `/api/v1`
- **作成日**: 2026-06-22
- **最終更新日**: 2026-06-22
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 概要

本仕様書は、実験計画・指示・作業機能統合に伴い追加・変更されたAPIエンドポイントを定義します。

### 1.1. 認証・認可

すべてのエンドポイントに以下のミドルウェアが適用されます。

| ミドルウェア | 説明 |
|------------|------|
| `auth` | JWT認証（Bearer Token） |
| `tenantIsolation` | マルチテナント分離（organization_id 付与） |
| `permissionCheck` | ロールベースアクセス制御（RBAC） |

### 1.2. 共通レスポンス形式

**成功レスポンス**:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-06-22T07:00:00.000Z",
    "requestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "E1003",
    "message": "バリデーションエラーが発生しました",
    "details": [...]
  },
  "meta": {
    "timestamp": "2026-06-22T07:00:00.000Z",
    "requestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

---

## 2. エンドポイント一覧

| # | メソッド | パス | 概要 | 権限 |
|---|---------|------|------|------|
| 1 | GET | `/projects/:projectId/methods/:methodId/plan-dialog-data` | 実験計画ダイアログ初期データ取得 | Manager |
| 2 | GET | `/projects/:projectId/experiment-plans` | 実験計画一覧取得 | Manager |
| 3 | PUT | `/projects/:projectId/experiment-plans/:methodId/:taskNo` | 実験計画保存（UPSERT） | Manager |
| 4 | GET | `/projects/:projectId/experiment-instructions` | 実験指示一覧取得 | Manager |
| 5 | POST | `/projects/:projectId/experiment-instructions/:methodId/:taskNo/approve` | タスク承認 | Manager |
| 6 | POST | `/projects/:projectId/experiment-instructions/:methodId/:taskNo/ng` | タスクNG記録 | Manager |
| 7 | GET | `/progress/projects/:projectName/worker-tasks` | ワーカータスク一覧取得 | Worker/Manager |
| 8 | GET | `/progress/projects/:projectName/work-details` | 作業詳細データ取得（既存拡張） | Worker/Manager |

---

## 3. エンドポイント詳細

---

### 3.1. GET `/projects/:projectId/methods/:methodId/plan-dialog-data`

実験計画ダイアログを開く際に必要な初期データを一括取得する。

#### リクエスト

| パラメータ種別 | パラメータ名 | 型 | 必須 | 説明 |
|------------|------------|-----|------|------|
| path | `projectId` | string | ✅ | プロジェクトID（project_name） |
| path | `methodId` | string | ✅ | メソッドID |

#### レスポンス（200 OK）

```json
{
  "success": true,
  "data": {
    "methodInfo": {
      "methodId": "method-001",
      "methodName": "合成反応メソッド",
      "taskCount": 3
    },
    "availableCreators": [
      { "uuid": "creator-uuid-1", "name": "田中太郎" }
    ],
    "availableInstruments": [
      { "uuid": "instrument-uuid-1", "name": "反応器 A-01" }
    ],
    "availableOwners": [
      { "uuid": "owner-uuid-1", "name": "鈴木花子" }
    ],
    "availableTransitions": [
      {
        "transitionId": "transition-001",
        "name": "原料調製",
        "taskNo": 1,
        "prerequisiteTransitionIds": []
      },
      {
        "transitionId": "transition-002",
        "name": "合成反応",
        "taskNo": 2,
        "prerequisiteTransitionIds": ["transition-001"]
      }
    ],
    "templates": [
      {
        "templateId": "tmpl-001",
        "templateName": "反応条件",
        "templateType": "condition",
        "fields": [
          { "key": "temperature", "label": "温度", "unit": "°C", "type": "number" },
          { "key": "pressure", "label": "圧力", "unit": "MPa", "type": "number" }
        ]
      }
    ],
    "existingPlans": [
      {
        "taskNo": 1,
        "plannedValues": {
          "tmpl-001": {
            "temperature": "25",
            "pressure": "1.0"
          }
        },
        "updatedAt": "2026-06-22T07:00:00.000Z"
      }
    ]
  }
}
```

#### エラーレスポンス

| コード | HTTPステータス | 説明 |
|--------|--------------|------|
| E6001 | 404 | プロジェクトまたはメソッドが見つからない |
| E5015 | 403 | 権限不足（experiment_admin 以外） |
| E4001 | 500 | サーバー内部エラー |

---

### 3.2. GET `/projects/:projectId/experiment-plans`

指定プロジェクト・メソッドの実験計画一覧を取得する。

#### リクエスト

| パラメータ種別 | パラメータ名 | 型 | 必須 | 説明 |
|------------|------------|-----|------|------|
| path | `projectId` | string | ✅ | プロジェクトID |
| query | `methodId` | string | ✅ | メソッドIDで絞り込み |

#### レスポンス（200 OK）

```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "planId": "plan-uuid-001",
        "methodId": "method-001",
        "taskNo": 1,
        "plannedValues": {
          "tmpl-001": {
            "temperature": "25",
            "pressure": "1.0"
          }
        },
        "notes": [
          { "type": "caution", "content": "保護具を着用すること" }
        ],
        "requiredCreatorUUIDs": ["creator-uuid-1"],
        "requiredInstrumentUUIDs": ["instrument-uuid-1"],
        "requiredOwnerUUIDs": [],
        "createdAt": "2026-06-22T07:00:00.000Z",
        "updatedAt": "2026-06-22T07:00:00.000Z"
      }
    ]
  }
}
```

#### エラーレスポンス

| コード | HTTPステータス | 説明 |
|--------|--------------|------|
| E6001 | 404 | プロジェクトが見つからない |
| E1003 | 400 | methodId が指定されていない |
| E5015 | 403 | 権限不足 |
| E4001 | 500 | サーバー内部エラー |

---

### 3.3. PUT `/projects/:projectId/experiment-plans/:methodId/:taskNo`

指定メソッド・タスクの実験計画を保存（UPSERT）する。

#### リクエスト

| パラメータ種別 | パラメータ名 | 型 | 必須 | 説明 |
|------------|------------|-----|------|------|
| path | `projectId` | string | ✅ | プロジェクトID |
| path | `methodId` | string | ✅ | メソッドID |
| path | `taskNo` | number | ✅ | タスク番号（1〜N） |

**リクエストボディ**:

```json
{
  "plannedValues": {
    "tmpl-001": {
      "temperature": "25",
      "pressure": "1.0"
    }
  },
  "notes": [
    { "type": "caution", "content": "保護具を着用すること" },
    { "type": "prohibitedAction", "content": "加熱中の蓋開け禁止" }
  ],
  "requiredCreatorUUIDs": ["creator-uuid-1"],
  "requiredInstrumentUUIDs": ["instrument-uuid-1"],
  "requiredOwnerUUIDs": []
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `plannedValues` | `Record<string, Record<string, string>>` | ✅ | テンプレートID → フィールドキー → 値 |
| `notes` | `NoteItem[]` | — | 注意事項リスト |
| `requiredCreatorUUIDs` | `string[]` | — | 必要作成者UUIDリスト |
| `requiredInstrumentUUIDs` | `string[]` | — | 必要機器UUIDリスト |
| `requiredOwnerUUIDs` | `string[]` | — | 必要オーナーUUIDリスト |

#### レスポンス（200 OK）

```json
{
  "success": true,
  "data": {
    "planId": "plan-uuid-001",
    "methodId": "method-001",
    "taskNo": 1,
    "updatedAt": "2026-06-22T07:00:00.000Z"
  }
}
```

#### エラーレスポンス

| コード | HTTPステータス | 説明 |
|--------|--------------|------|
| E6001 | 404 | プロジェクトが見つからない |
| E1003 | 400 | バリデーションエラー |
| E5015 | 403 | 権限不足 |
| E4001 | 500 | サーバー内部エラー |

---

### 3.4. GET `/projects/:projectId/experiment-instructions`

指定プロジェクト・メソッドの実験指示一覧（実績値含む）を取得する。
Manager がタスクのレビューを行うための画面用データを返す。

#### リクエスト

| パラメータ種別 | パラメータ名 | 型 | 必須 | 説明 |
|------------|------------|-----|------|------|
| path | `projectId` | string | ✅ | プロジェクトID |
| query | `methodId` | string | ✅ | メソッドIDで絞り込み |

#### レスポンス（200 OK）

```json
{
  "success": true,
  "data": {
    "instructions": [
      {
        "taskNo": 1,
        "taskName": "原料調製",
        "assignee": "田中太郎",
        "taskStatus": "05",
        "reviewResult": null,
        "reviewedAt": null,
        "reviewUserName": null,
        "transitions": [
          {
            "transitionId": "transition-001",
            "transitionName": "原料調製",
            "templates": [
              {
                "templateId": "tmpl-001",
                "templateName": "反応条件",
                "templateType": "condition",
                "fields": [
                  {
                    "key": "temperature",
                    "label": "温度",
                    "unit": "°C",
                    "expectedValue": "25",
                    "actualValue": "26.3",
                    "isDifferent": true
                  },
                  {
                    "key": "pressure",
                    "label": "圧力",
                    "unit": "MPa",
                    "expectedValue": "1.0",
                    "actualValue": "1.0",
                    "isDifferent": false
                  }
                ]
              }
            ],
            "notes": [
              { "type": "caution", "content": "保護具を着用すること" }
            ]
          }
        ]
      }
    ]
  }
}
```

#### エラーレスポンス

| コード | HTTPステータス | 説明 |
|--------|--------------|------|
| E6001 | 404 | プロジェクトが見つからない |
| E1003 | 400 | methodId が指定されていない |
| E5015 | 403 | 権限不足 |
| E4001 | 500 | サーバー内部エラー |

---

### 3.5. POST `/projects/:projectId/experiment-instructions/:methodId/:taskNo/approve`

指定タスクを承認する。`task_detail` テーブルの `review_result` を更新し、ステータスを「承認済み」に変更する。

#### リクエスト

| パラメータ種別 | パラメータ名 | 型 | 必須 | 説明 |
|------------|------------|-----|------|------|
| path | `projectId` | string | ✅ | プロジェクトID |
| path | `methodId` | string | ✅ | メソッドID |
| path | `taskNo` | number | ✅ | タスク番号 |

**リクエストボディ**: なし（空オブジェクト `{}` 可）

#### レスポンス（200 OK）

```json
{
  "success": true,
  "data": {
    "taskNo": 1,
    "taskStatus": "07",
    "reviewedAt": "2026-06-22T07:00:00.000Z",
    "reviewUserName": "管理者 太郎"
  }
}
```

#### エラーレスポンス

| コード | HTTPステータス | 説明 |
|--------|--------------|------|
| E6001 | 404 | プロジェクト・タスクが見つからない |
| E7005 | 400 | タスクステータスが「レビュー待ち（05）」以外 |
| E5015 | 403 | 権限不足（experiment_admin 以外） |
| E4001 | 500 | サーバー内部エラー |

---

### 3.6. POST `/projects/:projectId/experiment-instructions/:methodId/:taskNo/ng`

指定タスクをNG記録する。`task_detail` テーブルの `review_result` を NG 内容で更新し、ステータスを「NG（06）」に変更する。

#### リクエスト

| パラメータ種別 | パラメータ名 | 型 | 必須 | 説明 |
|------------|------------|-----|------|------|
| path | `projectId` | string | ✅ | プロジェクトID |
| path | `methodId` | string | ✅ | メソッドID |
| path | `taskNo` | number | ✅ | タスク番号 |

**リクエストボディ**:

```json
{
  "ngReason": "温度が想定値を大幅に超過しており、安全性の観点から再実施が必要"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `ngReason` | string | ✅ | NG理由（1文字以上） |

#### レスポンス（200 OK）

```json
{
  "success": true,
  "data": {
    "taskNo": 1,
    "taskStatus": "06",
    "reviewResult": "温度が想定値を大幅に超過しており、安全性の観点から再実施が必要",
    "reviewedAt": "2026-06-22T07:00:00.000Z",
    "reviewUserName": "管理者 太郎"
  }
}
```

#### エラーレスポンス

| コード | HTTPステータス | 説明 |
|--------|--------------|------|
| E6001 | 404 | プロジェクト・タスクが見つからない |
| E7005 | 400 | タスクステータスが「レビュー待ち（05）」以外 |
| E1003 | 400 | ngReason が空 |
| E5015 | 403 | 権限不足（experiment_admin 以外） |
| E4001 | 500 | サーバー内部エラー |

---

### 3.7. GET `/progress/projects/:projectName/worker-tasks` （既存API拡張）

ワーカー向けのタスク一覧を取得する。
`prerequisiteTransitionIds`（前提トランジションIDリスト）フィールドを追加。

#### リクエスト

| パラメータ種別 | パラメータ名 | 型 | 必須 | 説明 |
|------------|------------|-----|------|------|
| path | `projectName` | string | ✅ | プロジェクト名 |
| query | `methodId` | string | — | メソッドIDで絞り込み |

#### レスポンス（200 OK）

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "taskNo": 1,
        "taskName": "原料調製",
        "transitionId": "transition-001",
        "taskStatus": "03",
        "assignee": "田中太郎",
        "prerequisiteTransitionIds": []
      },
      {
        "taskNo": 2,
        "taskName": "合成反応",
        "transitionId": "transition-002",
        "taskStatus": "01",
        "assignee": "鈴木花子",
        "prerequisiteTransitionIds": ["transition-001"]
      },
      {
        "taskNo": 3,
        "taskName": "精製処理",
        "transitionId": "transition-003",
        "taskStatus": "01",
        "assignee": "田中太郎",
        "prerequisiteTransitionIds": ["transition-002"]
      }
    ]
  }
}
```

**拡張フィールド**（新規追加）:

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `prerequisiteTransitionIds` | `string[]` | 前提となるトランジションIDのリスト。`transition_data.prerequisite_transition_ids` カラムから取得 |

#### エラーレスポンス

| コード | HTTPステータス | 説明 |
|--------|--------------|------|
| E6001 | 404 | プロジェクトが見つからない |
| E5002 | 401 | 認証エラー |
| E4001 | 500 | サーバー内部エラー |

---

### 3.8. GET `/progress/projects/:projectName/work-details` （既存API拡張）

作業詳細データを取得する。
`expectedValues`（想定値）フィールドを追加。`mgr-instruction:` プレフィックス付きプロパティを解析して返す。

#### リクエスト

| パラメータ種別 | パラメータ名 | 型 | 必須 | 説明 |
|------------|------------|-----|------|------|
| path | `projectName` | string | ✅ | プロジェクト名 |
| query | `methodId` | string | ✅ | メソッドID |
| query | `taskNo` | number | ✅ | タスク番号 |

#### レスポンス（200 OK）

既存レスポンスに以下フィールドを追加:

```json
{
  "success": true,
  "data": {
    "transition": {
      "transitionId": "transition-001",
      "transitionName": "原料調製",
      "taskStatus": "02",
      "properties": [
        { "key": "temperature", "value": "26.3" },
        { "key": "mgr-instruction:temperature", "value": "25" },
        { "key": "mgr-instruction:caution", "value": "保護具を着用すること" }
      ],
      "expectedValues": {
        "temperature": "25",
        "pressure": "1.0"
      },
      "notes": [
        { "type": "caution", "content": "保護具を着用すること" },
        { "type": "prohibitedAction", "content": "加熱中の蓋開け禁止" }
      ]
    },
    "templates": [ ... ]
  }
}
```

**拡張フィールド**（新規追加）:

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `expectedValues` | `Record<string, string>` | フィールドキー → 想定値のマップ。`mgr-instruction:{key}` プロパティから抽出 |
| `notes` | `NoteItem[]` | `mgr-instruction:caution` 等のプロパティから抽出した注意事項リスト |

#### エラーレスポンス

| コード | HTTPステータス | 説明 |
|--------|--------------|------|
| E6001 | 404 | プロジェクト・タスクが見つからない |
| E7008 | 404 | タスクまたはメソッドが見つからない |
| E1003 | 400 | 必須クエリパラメータ不足 |
| E5002 | 401 | 認証エラー |
| E4001 | 500 | サーバー内部エラー |

---

## 4. データ型定義

### 4.1. NoteItem

```typescript
interface NoteItem {
  type: 'caution' | 'operationNote' | 'checkItem' | 'prohibitedAction' | 'otherNotes';
  content: string;
}
```

| 種別キー | 説明 |
|---------|------|
| `caution` | 注意事項 |
| `operationNote` | 操作メモ |
| `checkItem` | 確認項目 |
| `prohibitedAction` | 禁止事項 |
| `otherNotes` | その他 |

### 4.2. `mgr-instruction:` プロパティのキー変換規則

MAIML プロパティキーと NoteItem 種別の対応表:

| MAIML プロパティキー | NoteItem.type |
|--------------------|--------------|
| `mgr-instruction:caution` | `caution` |
| `mgr-instruction:operationNote` | `operationNote` |
| `mgr-instruction:checkItem` | `checkItem` |
| `mgr-instruction:prohibitedAction` | `prohibitedAction` |
| `mgr-instruction:otherNotes` | `otherNotes` |
| `mgr-instruction:{fieldKey}` | — （想定値フィールド、注意事項ではない） |

---

## 5. DBテーブル関連情報

### 5.1. 関連テーブル

| テーブル名 | 用途 |
|----------|------|
| `experiment_plan` | 実験計画データの永続化（`plannedValues`, `notes`, etc.） |
| `project_task` | タスク一覧・ステータス管理 |
| `project_task_detail` | タスクの実績値・`review_result` 保存 |
| `transition_data` | トランジション定義・`prerequisite_transition_ids` カラム |

### 5.2. experiment_plan テーブル（新規）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| `plan_id` | UUID | 主キー |
| `organization_id` | UUID | 組織ID（マルチテナント） |
| `project_name` | VARCHAR | プロジェクト名 |
| `method_id` | VARCHAR | メソッドID |
| `task_no` | INTEGER | タスク番号 |
| `planned_values` | JSONB | テンプレート別想定値 |
| `notes` | JSONB | 注意事項リスト |
| `required_creator_uuids` | UUID[] | 必要作成者UUIDリスト |
| `required_instrument_uuids` | UUID[] | 必要機器UUIDリスト |
| `required_owner_uuids` | UUID[] | 必要オーナーUUIDリスト |
| `created_at` | TIMESTAMP | 作成日時 |
| `updated_at` | TIMESTAMP | 更新日時 |

### 5.3. project_task_detail テーブル（追加カラム）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| `review_result` | TEXT | NG記録内容（NG時のみ設定） |
| `reviewed_at` | TIMESTAMP | レビュー日時 |
| `review_user_id` | UUID | レビュー実施ユーザーID |

### 5.4. transition_data テーブル（追加カラム）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| `prerequisite_transition_ids` | UUID[] | 前提トランジションIDリスト（依存関係） |

---

## 6. ルートファイル定義

| ファイル | ルート登録先 |
|---------|------------|
| `backend/src/routes/experimentPlanRoutes.ts` | `/api/v1/projects/:projectId/experiment-plans` |
| `backend/src/routes/experimentInstructionRoutes.ts` | `/api/v1/projects/:projectId/experiment-instructions` |
| `backend/src/routes/progressRoutes.ts` | `/api/v1/progress/...`（既存ファイルに追記） |

---

## 7. 更新履歴

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2026-06-22 | 1.0.0 | 初版作成（実験計画・指示機能統合に伴い新規追加） |

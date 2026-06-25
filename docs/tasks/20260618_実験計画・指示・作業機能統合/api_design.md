# API設計

> 作成日: 2026-06-18
> 最終更新: 2026-06-18（DB確定内容反映・仕様確定）

---

## 実験計画API（新規）✅ 仕様確定

### エンドポイント一覧

| メソッド | パス | 説明 |
|---------|-----|------|
| GET | `/api/v1/projects/:projectId/methods/:methodId/plan-dialog-data` | ダイアログ初期データ取得 |
| GET | `/api/v1/projects/:projectId/experiment-plans?methodId=xxx` | 指定メソッドの全タスク一括取得 |
| PUT | `/api/v1/projects/:projectId/experiment-plans/:methodId/:taskNo` | 1タスク分保存（UPSERT） |
| DELETE | `/api/v1/projects/:projectId/experiment-plans/:methodId` | メソッドの全タスク削除 |

### URLパラメータ仕様

| パラメータ | 型 | 説明 |
|-----------|---|------|
| `:projectId` | string | プロジェクトID（project_name） |
| `:methodId` | string | MAIMLのMethodID |
| `:taskNo` | number | タスク番号（**1〜N のみ**、0は存在しない） |

---

### GET /plan-dialog-data

ダイアログオープン時に必要なデータを一括取得する。

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "methodInfo": {
      "methodId": "method-uuid-001",
      "methodName": "合成実験 Method A",
      "taskCount": 3
    },
    "availableCreators": [
      { "uuid": "user-uuid-001", "name": "田中 太郎" }
    ],
    "availableInstruments": [
      { "uuid": "inst-uuid-001", "name": "分光光度計 A" }
    ],
    "availableOwners": [
      { "uuid": "user-uuid-002", "name": "鈴木 花子" }
    ],
    "availableTransitions": [
      {
        "transitionId": "transition-uuid-1",
        "name": "原料調製",
        "taskNo": 1,
        "prerequisiteTransitionIds": []
      },
      {
        "transitionId": "transition-uuid-2",
        "name": "合成反応",
        "taskNo": 2,
        "prerequisiteTransitionIds": ["transition-uuid-1"]
      }
    ],
    "templates": [
      {
        "templateId": "condition-template-1",
        "templateName": "反応条件",
        "templateType": "condition",
        "fields": [
          { "key": "temperature", "label": "温度", "unit": "°C", "type": "number" },
          { "key": "pressure",    "label": "圧力", "unit": "MPa", "type": "number" }
        ]
      }
    ],
    "existingPlans": [
      {
        "taskNo": 1,
        "plannedValues": {
          "transition-uuid-1": {
            "mgr-instruction:requiredCreatorUUID":    ["user-uuid-001"],
            "mgr-instruction:requiredInstrumentUUID": [],
            "mgr-instruction:requiredOwnerUUID":      [],
            "mgr-instruction:caution":               "保護具を着用すること",
            "condition-template-1": { "temperature": "25", "pressure": "1.0" }
          }
        },
        "updatedAt": "2026-06-18T09:00:00.000Z"
      }
    ]
  }
}
```

**エラーコード**:
| コード | HTTP | 条件 |
|-------|------|------|
| E6001 | 404 | プロジェクトが見つからない |
| E5015 | 403 | 権限不足 |
| E4001 | 500 | サーバーエラー |

---

### GET /experiment-plans

**クエリパラメータ**:
- `methodId` (required): メソッドID

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "methodId": "method-uuid-001",
    "plans": [
      {
        "taskNo": 1,
        "plannedValues": {
          "transition-uuid-1": {
            "mgr-instruction:requiredCreatorUUID":    ["user-uuid-001"],
            "mgr-instruction:requiredInstrumentUUID": ["inst-uuid-001"],
            "mgr-instruction:requiredOwnerUUID":      [],
            "mgr-instruction:caution":               "保護具を着用すること",
            "mgr-instruction:operationNote":         "反応温度は25℃で保持すること",
            "condition-template-1": { "temperature": "25", "pressure": "1.0" }
          }
        },
        "createdAt": "2026-06-10T09:00:00.000Z",
        "updatedAt": "2026-06-12T10:30:00.000Z"
      },
      {
        "taskNo": 2,
        "plannedValues": {
          "transition-uuid-1": {
            "mgr-instruction:caution": "タスク2専用: 追加の保護具が必要",
            "condition-template-1": { "temperature": "26" }
          }
        },
        "createdAt": "2026-06-10T09:10:00.000Z",
        "updatedAt": "2026-06-12T10:35:00.000Z"
      }
    ]
  }
}
```

**エラーコード**:
| コード | HTTP | 条件 |
|-------|------|------|
| E1003 | 400 | methodId パラメータ不足 |
| E6001 | 404 | プロジェクトが見つからない |
| E5015 | 403 | 権限不足 |
| E4001 | 500 | サーバーエラー |

---

### PUT /experiment-plans/:methodId/:taskNo

1タスク分の実験計画を保存する（UPSERT）。

**バリデーション**:
- `:taskNo` は **1以上** の整数
- `plannedValues` は `{ [transitionId]: { [key]: string | string[] | { [fieldKey]: string } } }` 形式

**リクエストボディ**:
```json
{
  "plannedValues": {
    "transition-uuid-1": {
      "mgr-instruction:requiredCreatorUUID":    ["user-uuid-001"],
      "mgr-instruction:requiredInstrumentUUID": ["inst-uuid-001"],
      "mgr-instruction:requiredOwnerUUID":      ["user-uuid-002"],
      "mgr-instruction:caution":               "保護具を着用すること",
      "mgr-instruction:operationNote":         "反応温度は25℃で保持すること",
      "mgr-instruction:checkItem":             "実験前に装置確認を行うこと",
      "mgr-instruction:prohibitedAction":      "",
      "mgr-instruction:OtherNotes":            "",
      "condition-template-1": { "temperature": "25", "pressure": "1.0" }
    },
    "transition-uuid-2": {
      "mgr-instruction:prohibitedAction": "加熱中の蓋開け禁止",
      "result-template-1": { "expected_yield": "85" }
    }
  }
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "taskNo": 1,
    "savedAt": "2026-06-15T09:00:00.000Z"
  }
}
```

**エラーコード**:
| コード | HTTP | 条件 |
|-------|------|------|
| E1003 | 400 | バリデーションエラー |
| E1004 | 400 | 必須項目不足 |
| E6001 | 404 | プロジェクトが見つからない |
| E5015 | 403 | 権限不足 |
| E7005 | 400 | プロジェクト状態不正（チェックアウト済みへの変更等） |
| E4001 | 500 | サーバーエラー |

---

### DELETE /experiment-plans/:methodId

指定メソッドの全タスク分の実験計画を削除する。

**レスポンス**:
```json
{
  "success": true,
  "data": { "deletedCount": 3 }
}
```

**エラーコード**:
| コード | HTTP | 条件 |
|-------|------|------|
| E6001 | 404 | プロジェクトが見つからない |
| E5015 | 403 | 権限不足 |
| E7005 | 400 | チェックアウト済みのため削除不可 |
| E4001 | 500 | サーバーエラー |

---

## 実験指示API（モック→実実装）

### エンドポイント一覧

| メソッド | パス | 説明 | 状態 |
|---------|-----|------|------|
| GET | `/api/v1/projects/:projectId/experiment-instructions` | 指示一覧取得 | ⚠️ モック |
| GET | `/api/v1/projects/:projectId/methods` | メソッド一覧 | ⚠️ モック |
| PUT | `/api/v1/projects/:projectId/tasks/:methodId/:taskNo/approve` | タスク承認 | ⚠️ モック |
| PUT | `/api/v1/projects/:projectId/tasks/:methodId/:taskNo/ng` | タスクNG記録 | ⚠️ モック |

### GET /experiment-instructions レスポンス

```json
{
  "success": true,
  "data": {
    "methods": [
      {
        "methodId": "method-uuid-001",
        "methodName": "合成実験 Method A",
        "tasks": [
          {
            "taskNo": 1,
            "taskName": "原料調製",
            "taskStatus": "03",
            "taskStatusName": "レビュー待ち",
            "reviewResult": null,
            "templates": [
              {
                "templateId": "condition-template-1",
                "templateName": "反応条件",
                "fields": [
                  {
                    "key": "temperature",
                    "label": "温度",
                    "unit": "°C",
                    "plannedValue": "25",
                    "actualValue": "26.5",
                    "hasDiff": true
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### PUT /tasks/:methodId/:taskNo/approve リクエスト

```json
{}
```

### PUT /tasks/:methodId/:taskNo/ng リクエスト

```json
{ "reviewResult": "温度が設定値より1.5°C高い。再実験を要求する。" }
```

**バリデーション**: `reviewResult` は必須・最大1000文字

---

## 認可ルール

| エンドポイント | 必要ロール |
|-------------|-----------|
| 実験計画API 全般 | experiment_admin 以上 |
| 実験指示API 全般 | experiment_admin 以上 |

---

## エラーコード（本機能専用）

| コード | HTTP | 主な使用箇所 |
|-------|------|------------|
| E1003 | 400 | バリデーションエラー全般 |
| E1004 | 400 | 必須項目不足 |
| E4001 | 500 | 予期しないサーバーエラー |
| E4006 | 500 | MAIML書き込み時のストレージエラー |
| E5015 | 403 | 権限不足（Worker が呼び出した場合等） |
| E6001 | 404 | プロジェクト・タスクが見つからない |
| E7005 | 400 | プロジェクト状態不正（チェックアウト済みへの計画変更等） |

# APIエンドポイント仕様

> 作成日: 2026-06-15
> ステータス: **設計確定**

---

## 1. APIサマリー

| # | メソッド | エンドポイント | 機能 | 実装状況 |
|---|---------|--------------|------|---------|
| 1 | GET | `/api/v1/projects/:projectId/methods/:methodId/plan-dialog-data` | ダイアログ初期データ取得 | 🔴 未実装 |
| 2 | GET | `/api/v1/projects/:projectId/experiment-plans` | 実験計画一括取得 | 🔴 未実装 |
| 3 | PUT | `/api/v1/projects/:projectId/experiment-plans/:methodId/:taskNumber` | 実験計画保存（UPSERT） | 🔴 未実装 |
| 4 | DELETE | `/api/v1/projects/:projectId/experiment-plans/:methodId` | 実験計画削除 | 🔴 未実装 |
| 5 | GET | `/api/v1/projects/:projectId/experiment-instructions` | 実験指示一覧取得 | ⚠️ モック |
| 6 | GET | `/api/v1/projects/:projectId/methods` | メソッド一覧取得 | ⚠️ モック |
| 7 | PUT | `/api/v1/projects/:projectId/tasks/:methodId/:taskNumber/approve` | タスク承認 | ⚠️ モック |
| 8 | PUT | `/api/v1/projects/:projectId/tasks/:methodId/:taskNumber/ng` | タスクNG記録 | ⚠️ モック |

---

## 2. 共通仕様

### 2-1. 認証・認可

- すべてのAPIに `auth` ミドルウェア（JWT認証）を適用
- `tenantIsolation` ミドルウェアで `organization_id` を自動設定
- `permissionCheck` ミドルウェアで権限確認
  - 実験計画API: `experiment_admin` ロール以上
  - 実験指示API: `experiment_admin` ロール以上
  - 承認/NG API: `experiment_admin` ロール以上

### 2-2. 共通レスポンス形式

**成功時:**
```json
{
  "success": true,
  "data": { ... }
}
```

**エラー時:**
```json
{
  "success": false,
  "error": {
    "code": "E1003",
    "message": "バリデーションエラーが発生しました"
  }
}
```

### 2-3. URLパラメータ

| パラメータ | 説明 | 例 |
|-----------|------|---|
| `:projectId` | プロジェクトID（project_name） | `project_alpha` |
| `:methodId` | MAIMLのMethodID | `method-uuid-001` |
| `:taskNumber` | タスク番号（0=全体, 1〜N） | `1` |

---

## 3. 実験計画API

### 3-1. ダイアログ初期データ取得

```
GET /api/v1/projects/:projectId/methods/:methodId/plan-dialog-data
```

**目的:** ExperimentPlanDialog を開く際に必要なデータを一括取得する。

**クエリパラメータ:**
- なし

**レスポンス:**
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
      { "uuid": "user-uuid-001", "name": "田中 太郎", "email": "tanaka@example.com" }
    ],
    "availableInstruments": [
      { "uuid": "inst-uuid-001", "name": "分光光度計 A", "model": "UV-2600" }
    ],
    "availableOwners": [
      { "uuid": "user-uuid-002", "name": "鈴木 花子", "email": "suzuki@example.com" }
    ],
    "availableTransitions": [
      { "transitionId": "transition-uuid-1", "name": "原料調製", "taskNumber": 1 },
      { "transitionId": "transition-uuid-2", "name": "合成反応", "taskNumber": 2 }
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
        "taskNumber": 0,
        "plannedValues": {
          "transition-uuid-1": {
            "mgr-instruction:requiredCreatorUUID":    ["user-uuid-001"],
            "mgr-instruction:requiredInstrumentUUID": [],
            "mgr-instruction:requiredOwnerUUID":      [],
            "mgr-instruction:caution":               "",
            "mgr-instruction:operationNote":         "",
            "mgr-instruction:checkItem":             "",
            "mgr-instruction:prohibitedAction":      "",
            "mgr-instruction:OtherNotes":            "",
            "condition-template-1": { "temperature": "", "pressure": "" }
          }
        }
      }
    ]
  }
}
```

**エラーコード:**
| コード | HTTP | 条件 |
|-------|------|------|
| E6001 | 404 | プロジェクトが見つからない |
| E5015 | 403 | 権限不足 |
| E4001 | 500 | サーバーエラー |

---

### 3-2. 実験計画一括取得

```
GET /api/v1/projects/:projectId/experiment-plans?methodId=xxx
```

**目的:** 指定プロジェクト・メソッドの全タブ分（task_number 0〜N）の実験計画を取得する。

**クエリパラメータ:**
| パラメータ | 必須 | 型 | 説明 |
|-----------|------|---|------|
| `methodId` | ✅ | string | MAIMLのMethodID |

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "methodId": "method-uuid-001",
    "plans": [
      {
        "taskNumber": 0,
        "plannedValues": {
          "transition-uuid-1": {
            "mgr-instruction:requiredCreatorUUID":    ["user-uuid-001"],
            "mgr-instruction:requiredInstrumentUUID": ["inst-uuid-001"],
            "mgr-instruction:requiredOwnerUUID":      ["user-uuid-002"],
            "mgr-instruction:caution":               "保護具を着用すること",
            "mgr-instruction:operationNote":         "反応温度は25℃で保持すること",
            "mgr-instruction:checkItem":             "",
            "mgr-instruction:prohibitedAction":      "",
            "mgr-instruction:OtherNotes":            "",
            "condition-template-1": {
              "temperature": "25",
              "pressure": "1.0"
            }
          },
          "transition-uuid-2": {
            "mgr-instruction:requiredCreatorUUID":    ["user-uuid-001"],
            "mgr-instruction:prohibitedAction":      "加熱中の蓋開け禁止",
            "result-template-1": {
              "expected_yield": "85"
            }
          }
        },
        "createdAt": "2026-06-10T09:00:00.000Z",
        "updatedAt": "2026-06-12T10:30:00.000Z"
      },
      {
        "taskNumber": 1,
        "plannedValues": {
          "transition-uuid-1": {
            "mgr-instruction:caution": "タスク1専用: 追加の保護具が必要",
            "condition-template-1": {
              "temperature": "26"
            }
          }
        },
        "createdAt": "2026-06-10T09:10:00.000Z",
        "updatedAt": "2026-06-12T10:35:00.000Z"
      }
    ]
  }
}
```

**エラーコード:**
| コード | HTTP | 条件 |
|-------|------|------|
| E1003 | 400 | methodId パラメータ不足 |
| E6001 | 404 | プロジェクトが見つからない |
| E5015 | 403 | 権限不足 |
| E4001 | 500 | サーバーエラー |

---

### 3-3. 実験計画保存（UPSERT）

```
PUT /api/v1/projects/:projectId/experiment-plans/:methodId/:taskNumber
```

**目的:** 1タブ分の実験計画を保存する（レコードが存在する場合は更新、ない場合は作成）。

**リクエストボディ:**
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
      "condition-template-1": {
        "temperature": "25",
        "pressure": "1.0"
      }
    },
    "transition-uuid-2": {
      "mgr-instruction:prohibitedAction": "加熱中の蓋開け禁止",
      "result-template-1": {
        "expected_yield": "85"
      }
    }
  }
}
```

> **注意**: タスクNタブ（task_number≥1）の場合は、上書きしたいTransitionのキーと変更値のみを含めればよい。

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "taskNumber": 1,
    "savedAt": "2026-06-15T09:00:00.000Z"
  }
}
```

**バリデーション:**
- `taskNumber` は 0 以上の整数
- `plannedValues` は `{ [transitionId: string]: { [key: string]: string | string[] } }` の形式
- `mgr-instruction:requiredCreatorUUID` / `requiredInstrumentUUID` / `requiredOwnerUUID` は文字列配列
- `mgr-instruction:caution` 等の注意事項系は文字列
- テンプレートIDキー（`mgr-instruction:` で始まらないもの）の値は `{ [fieldKey: string]: string }`

**エラーコード:**
| コード | HTTP | 条件 |
|-------|------|------|
| E1003 | 400 | バリデーションエラー |
| E1004 | 400 | 必須項目不足 |
| E6001 | 404 | プロジェクトが見つからない |
| E5015 | 403 | 権限不足 |
| E7005 | 400 | プロジェクト状態が操作を許可しない（チェックアウト済みの場合） |
| E4001 | 500 | サーバーエラー |

---

### 3-4. 実験計画削除

```
DELETE /api/v1/projects/:projectId/experiment-plans/:methodId
```

**目的:** 指定メソッドの全タスク分の実験計画を削除する（全体タブ含む）。

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "deletedCount": 4
  }
}
```

**エラーコード:**
| コード | HTTP | 条件 |
|-------|------|------|
| E6001 | 404 | プロジェクトが見つからない |
| E5015 | 403 | 権限不足 |
| E7005 | 400 | MAIMLへの書き込み済みの場合は削除不可 |
| E4001 | 500 | サーバーエラー |

---

## 4. 実験指示API

### 4-1. 実験指示一覧取得

```
GET /api/v1/projects/:projectId/experiment-instructions
```

**目的:** プロジェクトの全メソッド・全タスクについて、想定値と実績値を対比した一覧を取得する。

**クエリパラメータ:**
| パラメータ | 必須 | 型 | 説明 |
|-----------|------|---|------|
| `methodId` | | string | 絞り込み用（省略時は全メソッド） |
| `taskStatus` | | string | ステータス絞り込み（複数可: `03,04`） |

**レスポンス:**
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
            "taskNumber": 1,
            "taskName": "原料調製",
            "taskStatus": "03",
            "taskStatusName": "レビュー待ち",
            "reviewResult": null,
            "templates": [
              {
                "templateId": "condition-template-1",
                "templateName": "反応条件",
                "templateType": "condition",
                "fields": [
                  {
                    "key": "temperature",
                    "label": "温度",
                    "unit": "°C",
                    "plannedValue": "25",
                    "actualValue": "26.5",
                    "diff": "1.5",
                    "hasDiff": true
                  },
                  {
                    "key": "pressure",
                    "label": "圧力",
                    "unit": "MPa",
                    "plannedValue": "1.0",
                    "actualValue": "1.0",
                    "diff": "0",
                    "hasDiff": false
                  }
                ]
              }
            ],
            "notes": [
              {
                "id": "note-uuid-001",
                "type": "warning",
                "content": "保護具を着用すること",
                "createdAt": "2026-06-10T09:00:00.000Z"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**データ取得ロジック:**
1. `experiment_plan` テーブルから想定値（`planned_values`）を取得
2. `template_data` テーブルから実績値（`property_set`）を取得
3. `project_task_detail` テーブルからタスクステータスを取得
4. フィールド単位で想定値・実績値をマージして差分計算

**エラーコード:**
| コード | HTTP | 条件 |
|-------|------|------|
| E6001 | 404 | プロジェクトが見つからない |
| E5015 | 403 | 権限不足 |
| E4001 | 500 | サーバーエラー |

---

### 4-2. メソッド一覧取得

```
GET /api/v1/projects/:projectId/methods
```

**目的:** プロジェクトに紐づくMAIMLのMethod一覧を取得する（実験指示タブのフィルタ用）。

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "methods": [
      {
        "methodId": "method-uuid-001",
        "methodName": "合成実験 Method A",
        "taskCount": 3
      },
      {
        "methodId": "method-uuid-002",
        "methodName": "分析実験 Method B",
        "taskCount": 2
      }
    ]
  }
}
```

**エラーコード:**
| コード | HTTP | 条件 |
|-------|------|------|
| E6001 | 404 | プロジェクトが見つからない |
| E5015 | 403 | 権限不足 |
| E4001 | 500 | サーバーエラー |

---

### 4-3. タスク承認

```
PUT /api/v1/projects/:projectId/tasks/:methodId/:taskNumber/approve
```

**目的:** 指定タスクをManagerが承認する（task_status を `05`（完了）に更新）。

**リクエストボディ:**
```json
{}
```
（ボディは空でよい）

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "taskNumber": 1,
    "taskStatus": "05",
    "taskStatusName": "完了",
    "approvedAt": "2026-06-15T10:00:00.000Z"
  }
}
```

**バリデーション:**
- 承認できるのは `task_status = '03'`（レビュー待ち）または `'04'`（レビュー中）のタスクのみ
- NG済み（`'06'`）のタスクも再承認可能（NG → 完了へ遷移）

**エラーコード:**
| コード | HTTP | 条件 |
|-------|------|------|
| E6001 | 404 | タスクが見つからない |
| E5015 | 403 | 権限不足 |
| E7005 | 400 | 承認できないステータスのタスク（未着手 `00`〜`02` 等） |
| E4001 | 500 | サーバーエラー |

---

### 4-4. タスクNG記録

```
PUT /api/v1/projects/:projectId/tasks/:methodId/:taskNumber/ng
```

**目的:** 指定タスクをManagerがNG判定する（task_status を `06`（NG）に更新し、理由を保存）。

**リクエストボディ:**
```json
{
  "reviewResult": "温度が設定値より1.5°C高い。再実験を要求する。"
}
```

**バリデーション:**
- `reviewResult` は必須（空文字不可）、最大1000文字

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "taskNumber": 1,
    "taskStatus": "06",
    "taskStatusName": "NG",
    "reviewResult": "温度が設定値より1.5°C高い。再実験を要求する。",
    "ngAt": "2026-06-15T10:05:00.000Z"
  }
}
```

**エラーコード:**
| コード | HTTP | 条件 |
|-------|------|------|
| E1003 | 400 | バリデーションエラー（reviewResultが空等） |
| E1004 | 400 | reviewResult が未指定 |
| E6001 | 404 | タスクが見つからない |
| E5015 | 403 | 権限不足 |
| E7005 | 400 | NG操作できないステータスのタスク |
| E4001 | 500 | サーバーエラー |

---

## 5. チェックアウト処理の拡張

既存の `POST /api/v1/projects/:projectId/checkout` を拡張する。

**追加処理（チェックアウト時）:**
1. `experiment_plan` テーブルから当該プロジェクトの全実験計画を取得
2. MAIMLのData層（DataRecord → DataSection → property）に `mgr-instruction:` 接頭句でプロパティを追記
3. MAIML書き込み完了後、チェックアウト処理を継続

**MAIML書き込み形式:**
```xml
<property key="mgr-instruction:temperature">
  <content xsi:type="floatType" units="°C">25</content>
</property>
<property key="mgr-instruction:pressure">
  <content xsi:type="floatType" units="MPa">1.0</content>
</property>
```

**書き込みルール:**
- 全体タブの `planned_values` は全タスクのMAIMLに適用
- タスクNタブの `planned_values` はタスクN専用のMAIMLノードに適用
- 既存の `mgr-instruction:` キーがある場合は上書き
- `notes` は `mgr-instruction:notes` として JSON文字列で書き込み

**エラーハンドリング:**
- MAIML書き込みに失敗した場合はチェックアウト自体を中断（ロールバック）
- エラーコード `E4006`（ストレージエラー）を返す

---

## 6. ルーティング設計

### 実験計画ルーター（新規）

```typescript
// backend/src/routes/experimentPlanRoutes.ts

import { Router } from 'express';
import { auth } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolationMiddleware';
import { permissionCheck } from '../middleware/permissionCheckMiddleware';
import * as controller from '../controllers/experimentPlanController';

const router = Router();

// ダイアログ初期データ
router.get(
  '/projects/:projectId/methods/:methodId/plan-dialog-data',
  auth, tenantIsolation, permissionCheck('experiment_admin'),
  controller.getPlanDialogData
);

// 実験計画 CRUD
router.get(
  '/projects/:projectId/experiment-plans',
  auth, tenantIsolation, permissionCheck('experiment_admin'),
  controller.getExperimentPlans
);

router.put(
  '/projects/:projectId/experiment-plans/:methodId/:taskNumber',
  auth, tenantIsolation, permissionCheck('experiment_admin'),
  controller.upsertExperimentPlan
);

router.delete(
  '/projects/:projectId/experiment-plans/:methodId',
  auth, tenantIsolation, permissionCheck('experiment_admin'),
  controller.deleteExperimentPlans
);

export default router;
```

### 実験指示ルーター（新規）

```typescript
// backend/src/routes/experimentInstructionRoutes.ts

import { Router } from 'express';
import { auth } from '../middleware/authMiddleware';
import { tenantIsolation } from '../middleware/tenantIsolationMiddleware';
import { permissionCheck } from '../middleware/permissionCheckMiddleware';
import * as controller from '../controllers/experimentInstructionController';

const router = Router();

// 実験指示一覧
router.get(
  '/projects/:projectId/experiment-instructions',
  auth, tenantIsolation, permissionCheck('experiment_admin'),
  controller.getExperimentInstructions
);

// メソッド一覧
router.get(
  '/projects/:projectId/methods',
  auth, tenantIsolation, permissionCheck('experiment_admin'),
  controller.getMethods
);

// 承認・NG
router.put(
  '/projects/:projectId/tasks/:methodId/:taskNumber/approve',
  auth, tenantIsolation, permissionCheck('experiment_admin'),
  controller.approveTask
);

router.put(
  '/projects/:projectId/tasks/:methodId/:taskNumber/ng',
  auth, tenantIsolation, permissionCheck('experiment_admin'),
  controller.recordTaskNg
);

export default router;
```

---

## 7. エラーコード対応表（本機能専用）

| コード | HTTP | 主な使用箇所 |
|-------|------|------------|
| E1003 | 400 | バリデーションエラー全般 |
| E1004 | 400 | 必須項目不足（reviewResult 未指定等） |
| E4001 | 500 | 予期しないサーバーエラー |
| E4006 | 500 | MAIML書き込み時のストレージエラー |
| E5015 | 403 | 権限不足（Worker が呼び出した場合等） |
| E6001 | 404 | プロジェクト・タスクが見つからない |
| E7005 | 400 | プロジェクト状態不正（チェックアウト済みへの計画変更等） |

# 実験データ記録API設計書

## メタデータ
- **作成日**: 2026-01-27
- **バージョン**: 1.0.0
- **最終更新**: 2026-01-27
- **担当**: Development Team
- **実装状況**: ⏳ 未実装

---

## 概要

このドキュメントは、実験作業者が実験データを記録するためのAPI仕様を定義します。

### 主な機能
- 実験データ一括保存（複数プレースのテンプレートデータ）
- トランジションステータス更新
- DataGrid（2次元配列）対応
- ネストプロパティ対応
- All or Nothing方式のトランザクション保証

### 対象ユーザー
- 実験作業者（Worker）: 実験データ記録、ステータス更新
- 実験管理者（Manager）: 上記 + データ確認、承認
- システム管理者（Admin）: 全権限

---

## 📋 API一覧

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | 権限 |
|----|-------------|---------------|------|---------|------|
| 1 | POST | /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data | 実験データ一括保存 | ⏳ 未実装 | Worker以上 |
| 2 | PUT | /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/transitions/:transitionId/status | トランジションステータス更新 | ⏳ 未実装 | Worker以上 |

---

## 1. 実験データ一括保存API

### 概要
タスク内の複数プレースの実験データを一括で保存します。テンプレート（Material, Condition, Result）ごとにデータを記録でき、All or Nothing方式のトランザクション保証により、すべてのデータが正常に保存されるか、すべて失敗するかのいずれかになります。

### エンドポイント
```
POST /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data
```

### HTTPメソッド
POST

### 認証要件
- JWT認証必須
- ロール: Worker以上
- テナント分離必須

### ミドルウェアチェーン
```typescript
router.post('/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data',
  auth,                        // JWT認証
  tenantIsolation,            // テナント分離
  permissionCheck(['worker', 'manager', 'admin']), // 権限チェック
  experimentDataController.saveBatch
);
```

### リクエスト

#### パスパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| projectId | UUID | ○ | プロジェクトID |
| methodId | string | ○ | メソッドID |
| taskNo | integer | ○ | タスク連番 |

#### リクエストボディ
```json
{
  "records": [
    {
      "placeId": "place_001",
      "templateType": "material",
      "templateId": "mat_001",
      "data": {
        "temperature": {
          "value": 25.5,
          "unit": "°C"
        },
        "pressure": {
          "value": 1013,
          "unit": "hPa"
        }
      },
      "status": "completed",
      "comment": "材料データ記録完了"
    },
    {
      "placeId": "place_002",
      "templateType": "condition",
      "templateId": "cond_001",
      "data": {
        "humidity": {
          "value": 60,
          "unit": "%"
        },
        "dataGrid": [
          ["時刻", "温度", "圧力"],
          ["10:00", "25.5", "1013"],
          ["11:00", "26.0", "1012"],
          ["12:00", "26.5", "1011"]
        ]
      },
      "status": "running",
      "comment": "条件データ記録中"
    }
  ]
}
```

#### リクエストボディのパラメータ詳細

| パラメータ | 型 | 必須 | 説明 | 制約 |
|-----------|----|----|------|------|
| records | array | ○ | 実験データ配列 | 1件以上の配列 |

#### records配列の各要素

| パラメータ | 型 | 必須 | 説明 | 制約 |
|-----------|----|----|------|------|
| placeId | string | ○ | プレースID | |
| templateType | string | ○ | テンプレート種別 | material, condition, result |
| templateId | string | ○ | テンプレートID | |
| data | object | ○ | 実験データ | ネストプロパティ、DataGrid対応 |
| status | string | △ | ステータス | initial, preparing, ready, running, paused, completed, error |
| comment | string | × | コメント | 最大2000文字 |

### レスポンス

#### 成功時（201 Created）
```json
{
  "success": true,
  "data": {
    "saved": 2,
    "records": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "projectId": "550e8400-e29b-41d4-a716-446655440000",
        "methodId": "method_001",
        "taskNo": 1,
        "placeId": "place_001",
        "templateType": "material",
        "templateId": "mat_001",
        "data": {
          "temperature": {
            "value": 25.5,
            "unit": "°C"
          },
          "pressure": {
            "value": 1013,
            "unit": "hPa"
          }
        },
        "status": "completed",
        "comment": "材料データ記録完了",
        "recordedBy": "880e8400-e29b-41d4-a716-446655440003",
        "recordedAt": "2026-01-27T10:30:00Z",
        "organizationId": "org_maiml_lab_001",
        "createdAt": "2026-01-27T10:30:00Z",
        "updatedAt": "2026-01-27T10:30:00Z"
      },
      {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "projectId": "550e8400-e29b-41d4-a716-446655440000",
        "methodId": "method_001",
        "taskNo": 1,
        "placeId": "place_002",
        "templateType": "condition",
        "templateId": "cond_001",
        "data": {
          "humidity": {
            "value": 60,
            "unit": "%"
          }
        },
        "status": "running",
        "comment": "条件データ記録中",
        "recordedBy": "880e8400-e29b-41d4-a716-446655440003",
        "recordedAt": "2026-01-27T10:30:00Z",
        "organizationId": "org_maiml_lab_001",
        "createdAt": "2026-01-27T10:30:00Z",
        "updatedAt": "2026-01-27T10:30:00Z"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-27T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

#### エラー時（400 Bad Request）
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed for record 1",
    "details": [
      {
        "index": 0,
        "field": "placeId",
        "message": "Place not found",
        "code": "RESOURCE_NOT_FOUND"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-27T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

#### エラー時（403 Forbidden）
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_INSUFFICIENT",
    "message": "Project is not in editable status"
  },
  "meta": {
    "timestamp": "2026-01-27T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

#### エラー時（404 Not Found）
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Task not found or does not belong to your organization"
  },
  "meta": {
    "timestamp": "2026-01-27T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### ビジネスロジック

1. **プロジェクトステータス確認**
   - プロジェクトステータスが編集可能（draft/active/waiting_approval）であることを確認
   - archived/completedの場合はエラー

2. **タスク存在確認**
   - taskNoが指定されたproject_id、method_idに属することを確認
   - organization_idでマルチテナント分離

3. **リクエストバリデーション**
   - records配列の各要素をバリデーション
   - 1件でもエラーがあれば全体を拒否（All or Nothing）

4. **実験データ一括保存（ループ処理）**
   - records配列の各要素に対して処理
   - template_dataテーブルにUPSERT（INSERT or UPDATE）
   - 一意キー: (organization_id, project_id, method_id, task_no, place_id)
   - 既存レコードがある場合、template_type、template_id、dataなどを上書き
   - dataフィールドにJSONB形式で保存
   - recorded_byに現在のユーザーIDを設定

5. **トランザクション保証（All or Nothing）**
   - すべてのINSERT/UPDATEを1トランザクションで実行
   - 1件でも失敗したら全体をロールバック
   - すべて成功した場合のみコミット

### バリデーション

#### リクエスト全体のチェック
- [ ] projectId はUUID形式
- [ ] methodId は文字列
- [ ] taskNo は1以上の整数
- [ ] records は配列で1件以上

#### records配列の各要素のチェック
- [ ] placeId は必須
- [ ] templateType は "material", "condition", "result" のいずれか
- [ ] templateId は必須
- [ ] data はオブジェクト形式
- [ ] status は許可された値のいずれか（指定時）
- [ ] comment は2000文字以内（指定時）

#### 関連性チェック
- [ ] projectIdは自組織に属するプロジェクト
- [ ] taskNoは指定されたprojectIdに属するタスク
- [ ] placeIdは指定されたtaskNoに属するプレース（オプション）
- [ ] templateIdは指定されたtemplateTypeに対応するテンプレート（オプション）

#### プロジェクトステータスチェック
- [ ] プロジェクトステータスが編集可能（draft/active/waiting_approval）

### データベーステーブル

#### 使用テーブル
1. **template_data**（主テーブル）
   - id, organization_id, project_id, method_id, task_no, place_id
   - template_type, template_id, data (JSONB)
   - status, comment
   - recorded_by, recorded_at
   - created_at, updated_at
   - **一意キー**: (organization_id, project_id, method_id, task_no, place_id)

2. **projects**（ステータス確認）
   - id, status, organization_id

3. **project_task**（存在確認）
   - project_id, task_no, organization_id

#### SQL例（一括保存）
```sql
-- トランザクション開始
BEGIN;

-- 1. プロジェクトステータス確認（マルチテナント分離）
SELECT status FROM projects 
WHERE id = $1 AND organization_id = $2
AND status IN ('draft', 'active', 'waiting_approval');

-- 2. タスク存在確認
SELECT task_no FROM project_task 
WHERE project_id = $1 
  AND task_no = $3 
  AND organization_id = $2;

-- 3. records配列の各要素に対してUPSERT（ループ処理）
-- (record 1)
INSERT INTO template_data (
  id, organization_id, project_id, method_id, task_no, place_id,
  template_type, template_id, data,
  status, comment,
  recorded_by, recorded_at,
  created_at, updated_at
) VALUES (
  gen_random_uuid(), $2, $1, $4, $3, $5,
  $6, $7, $8::jsonb,
  $9, $10,
  $11, NOW(),
  NOW(), NOW()
)
ON CONFLICT (organization_id, project_id, method_id, task_no, place_id)
DO UPDATE SET
  template_type = EXCLUDED.template_type,
  template_id = EXCLUDED.template_id,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  comment = EXCLUDED.comment,
  recorded_by = EXCLUDED.recorded_by,
  recorded_at = NOW(),
  updated_at = NOW()
RETURNING *;

-- (record 2)
INSERT INTO template_data (
  id, organization_id, project_id, method_id, task_no, place_id,
  template_type, template_id, data,
  status, comment,
  recorded_by, recorded_at,
  created_at, updated_at
) VALUES (
  gen_random_uuid(), $2, $1, $4, $3, $12,
  $13, $14, $15::jsonb,
  $16, $17,
  $11, NOW(),
  NOW(), NOW()
)
ON CONFLICT (organization_id, project_id, method_id, task_no, place_id)
DO UPDATE SET
  template_type = EXCLUDED.template_type,
  template_id = EXCLUDED.template_id,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  comment = EXCLUDED.comment,
  recorded_by = EXCLUDED.recorded_by,
  recorded_at = NOW(),
  updated_at = NOW()
RETURNING *;

-- (以降、records配列の要素数だけ繰り返し)

COMMIT;
```

#### パラメータ説明
```
$1: project_id (UUID)
$2: organization_id (string)
$3: task_no (integer)
$4: method_id (string)
$5: place_id (string) - record 1
$6: template_type (string) - record 1
$7: template_id (string) - record 1
$8: data (JSONB) - record 1
$9: status (string) - record 1
$10: comment (string) - record 1
$11: recorded_by (UUID) - 全レコード共通
$12: place_id (string) - record 2
$13: template_type (string) - record 2
... (以降、record数に応じて続く)
```

#### トランザクションの重要性
- **All or Nothing**: すべてのINSERT/UPDATEが成功するか、すべて失敗するかのいずれか
- **整合性保証**: 1件でも失敗したら全体をロールバック
- **ロック**: プロジェクトステータスチェックからコミットまで一貫性を保証

### セキュリティ

#### マルチテナント分離
- [ ] organization_id フィルタ必須
- [ ] プロジェクトの所属組織を検証
- [ ] タスクの所属組織を検証

#### 認証・認可
- [ ] JWT認証必須
- [ ] Worker以上の権限が必要
- [ ] 編集可能なプロジェクトステータスのみデータ保存可能

#### 入力検証
- [ ] SQLインジェクション対策（Parameterized Queries）
- [ ] JSONB型の適切な検証
- [ ] XSS対策（入力サニタイゼーション）

### パフォーマンス

- インデックス: template_data (organization_id, project_id, method_id, task_no, place_id) - 一意キー（主キー）
- インデックス: template_data (organization_id, recorded_at) - 時系列検索用
- インデックス: template_data (project_id, task_no) - タスク単位の検索用
- JSONB型: GINインデックスを使用（data列）
- トランザクション: 必須（All or Nothing保証）
- バッチ処理: records配列のサイズに応じて複数のINSERTを実行
- キャッシュ: 不要（リアルタイム性重視）

---

## 2. トランジションステータス更新API

### 概要
トランジションのステータスを手動で更新します。みなし進捗更新がOFFの場合に使用します。

### エンドポイント
```
PUT /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/transitions/:transitionId/status
```

### HTTPメソッド
PUT

### 認証要件
- JWT認証必須
- ロール: Worker以上
- テナント分離必須

### ミドルウェアチェーン
```typescript
router.put('/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/transitions/:transitionId/status',
  auth,
  tenantIsolation,
  permissionCheck(['worker', 'manager', 'admin']),
  experimentDataController.updateStatus
);
```

### リクエスト

#### パスパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| projectId | UUID | ○ | プロジェクトID |
| methodId | string | ○ | メソッドID |
| taskNo | integer | ○ | タスク連番 |
| transitionId | string | ○ | トランジションID |

#### リクエストボディ
```json
{
  "status": "running",
  "progressRate": 50,
  "comment": "実験を開始しました。現在50%完了。"
}
```

#### リクエストボディのパラメータ詳細

| パラメータ | 型 | 必須 | 説明 | 制約 |
|-----------|----|----|------|------|
| status | string | ○ | トランジションステータス | initial, preparing, ready, running, paused, completed, error |
| progressRate | integer | △ | 進捗率 | 0-100、statusがcompletedの場合は自動的に100 |
| comment | string | × | コメント | 最大2000文字 |

### レスポンス

#### 成功時（200 OK）
```json
{
  "success": true,
  "data": {
    "transitionId": "transition_001",
    "taskNo": 1,
    "methodId": "method_001",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
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

#### エラー時（400 Bad Request）
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

#### エラー時（403 Forbidden）
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

### ビジネスロジック

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

### バリデーション

- [ ] projectId はUUID形式（パスパラメータ）
- [ ] taskNo は1以上の整数
- [ ] status は許可された値のいずれか
- [ ] progressRate は0-100の整数（指定時）
- [ ] comment は2000文字以内（指定時）

### データベーステーブル

#### 使用テーブル
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

-- プロジェクトステータス確認（マルチテナント分離）
SELECT status FROM projects 
WHERE id = $1 AND organization_id = $2
AND status IN ('draft', 'active', 'waiting_approval');

-- タスク存在確認
SELECT task_no FROM project_task 
WHERE project_id = $1 
  AND task_no = $3 
  AND organization_id = $2;

-- トランジションステータス更新
UPDATE transition_data
SET 
  status = $4,
  progress_rate = CASE 
    WHEN $4 = 'completed' THEN 100 
    ELSE $5 
  END,
  comment = $6,
  updated_by = $7,
  updated_at = NOW()
WHERE organization_id = $2
  AND project_id = $1
  AND method_id = $8
  AND task_no = $3
  AND transition_id = $9
RETURNING *;

-- イベントログ記録
INSERT INTO maiml_event_log (
  organization_id,
  project_id,
  sequence_no,
  log,
  created_at
) VALUES (
  $2,  -- organization_id
  $1,  -- project_id
  (
    SELECT COALESCE(MAX(sequence_no), 0) + 1
    FROM maiml_event_log
    WHERE organization_id = $2 AND project_id = $1
  ),  -- 自動採番されたsequence_no
  jsonb_build_object(
    'event_type', 'transition_status_update',
    'method_id', $8,
    'task_no', $3,
    'transition_id', $9,
    'status', $4,
    'progress_rate', CASE WHEN $4 = 'completed' THEN 100 ELSE $5 END,
    'comment', $6,
    'updated_by', $7,
    'timestamp', NOW()
  ),  -- APIデータをJSON形式で格納
  NOW()
);

-- タスク進捗率の再計算（オプション）
UPDATE project_task
SET 
  progress_rate = (
    SELECT AVG(progress_rate)
    FROM transition_data
    WHERE project_id = $1 
      AND task_no = $3 
      AND organization_id = $2
  ),
  updated_at = NOW()
WHERE project_id = $1 
  AND task_no = $3 
  AND organization_id = $2;

COMMIT;
```

### セキュリティ

- [ ] organization_id フィルタ必須
- [ ] プロジェクトステータスが編集可能であることを確認
- [ ] SQLインジェクション対策（Parameterized Queries）
- [ ] パスパラメータの階層構造検証

### パフォーマンス

- インデックス: transition_data (organization_id, project_id, method_id, task_no, transition_id) - 複合主キー
- インデックス: transition_data (organization_id, project_id, updated_at)
- トランザクション: 必須（整合性保証）

---

## 🔗 関連ドキュメント

### API設計書
- [api_list.md](./api_list.md) - API一覧対応表
- [api_project_management.md](./api_project_management.md) - プロジェクト管理API
- [api_progress_check.md](./api_progress_check.md) - 進捗確認API
- [api_issue_management.md](./api_issue_management.md) - 問題管理API

### 規約・ガイドライン
- [API設計ポリシー](../../.clinerules/development/api.md) - API設計の統一ルール
- [バックエンド規約](../../.clinerules/development/backend.md) - 実装規約
- [セキュリティ規約](../../.clinerules/development/security.md) - セキュリティ要件

### 参照ドキュメント
- [データベース構造](../../.clinerules/references/db_structure.md) - DB設計
- [API構成定義](../../.clinerules/references/api_structure.md) - API構成の参照ルール

---

## 📊 実装ファイルパス

### ルートファイル
```
backend/src/routes/experimentDataRoutes.ts
```

### コントローラーファイル
```
backend/src/controllers/experimentDataController.ts
```

### サービスファイル
```
backend/src/services/experimentDataService.ts
```

### テストファイル
```
backend/tests/routes/experimentDataRoutes.test.ts
backend/tests/services/experimentDataService.test.ts
backend/tests/controllers/experimentDataController.test.ts
```

---

## ✅ セキュリティチェックリスト

実装時に以下を確認してください：

### 認証・認可
- [ ] すべてのエンドポイントでJWT認証が必須
- [ ] tenantIsolationミドルウェアが適用されている
- [ ] permissionCheckで適切な権限が設定されている
- [ ] Worker以上の権限でデータ保存可能

### マルチテナント分離
- [ ] すべてのDBクエリにorganization_idフィルタが含まれる
- [ ] クロステナントアクセスが不可能
- [ ] JOINするすべてのテーブルでorganization_idを検証

### プロジェクトステータス確認
- [ ] 編集可能なプロジェクトステータスのみ保存可能
- [ ] archived/completedプロジェクトは編集不可

### 入力検証
- [ ] すべてのパラメータがバリデーションされている
- [ ] Parameterized Queriesを使用（SQLインジェクション対策）
- [ ] JSONB型の適切な検証
- [ ] XSS対策（入力サニタイゼーション）
- [ ] 文字列長制限が強制されている

### トランザクション
- [ ] 実験データ保存とステータス更新を1トランザクションで実行
- [ ] ロールバック時の整合性を保証

### エラーハンドリング
- [ ] 統一されたエラーレスポンス形式
- [ ] エラーメッセージに機密情報が含まれない
- [ ] 適切なHTTPステータスコードを返す

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.1.0 | 2026-02-17 | エンドポイントパラメータ変更 | Cline |
| | | - API 1: projectId, methodId, taskNoをパスパラメータ化 | |
| | | - API 1: エンドポイント変更 `/experiments/data` → `/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data` | |
| | | - API 2: taskNoをパスパラメータ化 | |
| | | - API 2: エンドポイント変更 `/experiments/projects/:projectId/methods/:methodId/transitions/:transitionId/status` → `/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/transitions/:transitionId/status` | |
| | | - リクエストボディからパスパラメータ化した項目を削除 | |
| 2.0.0 | 2026-02-17 | 大規模仕様変更 | Cline |
| | | - テーブル変更: experiment_records → template_data | |
| | | - パラメータ変更: taskId (UUID) → taskNo (integer) | |
| | | - パラメータ追加: placeId（必須） | |
| | | - 一括保存対応: records配列による複数データ保存 | |
| | | - 一意キー変更: (org_id, proj_id, method_id, task_no, place_id) | |
| | | - autoProgressUpdate機能削除 | |
| | | - transitionId削除（不要） | |
| | | - All or Nothing方式のトランザクション保証 | |
| 1.0.0 | 2026-01-27 | 初版作成 | Cline |
| | | - 実験データ記録API 2エンドポイントの設計書作成 | |
| | | - 実装未着手 | |

---

**注意**: この設計書は未実装APIの仕様を定義したものです。実装時には、この設計書に従ってルート、コントローラー、サービス、テストを作成してください。
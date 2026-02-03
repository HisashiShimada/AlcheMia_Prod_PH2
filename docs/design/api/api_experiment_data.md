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
- 実験データ保存（テンプレート単位）
- トランジションステータス更新
- みなし進捗更新（自動ステータス判定）
- DataGrid（2次元配列）対応
- ネストプロパティ対応

### 対象ユーザー
- 実験作業者（Worker）: 実験データ記録、ステータス更新
- 実験管理者（Manager）: 上記 + データ確認、承認
- システム管理者（Admin）: 全権限

---

## 📋 API一覧

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | 権限 |
|----|-------------|---------------|------|---------|------|
| 1 | POST | /api/v1/experiments/:transitionId/data | 実験データ保存 | ⏳ 未実装 | Worker以上 |
| 2 | PUT | /api/v1/experiments/projects/:projectId/methods/:methodId/transitions/:transitionId/status | トランジションステータス更新 | ⏳ 未実装 | Worker以上 |

---

## 1. 実験データ保存API

### 概要
トランジション単位で実験データを保存します。テンプレート（Material, Condition, Result）ごとにデータを記録できます。

### エンドポイント
```
POST /api/v1/experiments/:transitionId/data
```

### HTTPメソッド
POST

### 認証要件
- JWT認証必須
- ロール: Worker以上
- テナント分離必須

### ミドルウェアチェーン
```typescript
router.post('/experiments/:transitionId/data',
  auth,                        // JWT認証
  tenantIsolation,            // テナント分離
  permissionCheck(['worker', 'manager', 'admin']), // 権限チェック
  experimentDataController.save
);
```

### リクエスト

#### パスパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| transitionId | string | ○ | トランジションID |

#### リクエストボディ
```json
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "methodId": "method_001",
  "taskId": "660e8400-e29b-41d4-a716-446655440001",
  "templateType": "condition",
  "templateId": "condition_template_001",
  "data": {
    "temperature": {
      "value": 25.5,
      "unit": "°C"
    },
    "pressure": {
      "value": 1013,
      "unit": "hPa"
    },
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
  "status": "completed",
  "comment": "実験条件を正常に設定しました。",
  "autoProgressUpdate": true
}
```

#### パラメータ詳細

| パラメータ | 型 | 必須 | 説明 | 制約 |
|-----------|----|----|------|------|
| projectId | UUID | ○ | プロジェクトID | UUID形式 |
| methodId | string | ○ | メソッドID | |
| taskId | UUID | ○ | タスクID | UUID形式 |
| templateType | string | ○ | テンプレート種別 | material, condition, result |
| templateId | string | ○ | テンプレートID | |
| data | object | ○ | 実験データ | ネストプロパティ、DataGrid対応 |
| status | string | △ | トランジションステータス | initial, preparing, ready, running, paused, completed, error |
| comment | string | × | コメント | 最大2000文字 |
| autoProgressUpdate | boolean | × | みなし進捗更新フラグ | デフォルト: true |

### レスポンス

#### 成功時（201 Created）
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "methodId": "method_001",
    "taskId": "660e8400-e29b-41d4-a716-446655440001",
    "transitionId": "transition_001",
    "templateType": "condition",
    "templateId": "condition_template_001",
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
    "progressRate": 100,
    "comment": "実験条件を正常に設定しました。",
    "recordedBy": "880e8400-e29b-41d4-a716-446655440003",
    "recordedAt": "2026-01-27T10:30:00Z",
    "organizationId": "org_maiml_lab_001",
    "createdAt": "2026-01-27T10:30:00Z",
    "updatedAt": "2026-01-27T10:30:00Z"
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
    "message": "Validation failed",
    "details": [
      {
        "field": "templateType",
        "message": "Invalid template type",
        "code": "INVALID_VALUE"
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
    "message": "Transition not found or does not belong to your organization"
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

2. **トランジション存在確認**
   - transitionIdが指定されたプロジェクト・メソッド・タスクに属することを確認
   - organization_idでマルチテナント分離

3. **実験データ保存**
   - experiment_recordsテーブルに新規レコードを挿入（初回）
   - 既存レコードがある場合は更新（上書き）
   - dataフィールドにJSONB形式で保存
   - recorded_byに現在のユーザーIDを設定

4. **みなし進捗更新（autoProgressUpdate=trueの場合）**
   - statusが指定されている場合、そのまま使用
   - statusが未指定の場合、以下のルールで自動判定:
     - dataが空 → initial
     - dataに値があり、一部のテンプレートのみ → in_progress
     - すべてのテンプレートにデータがある → completed
   - progress_rateを自動計算（0-100%）

5. **トランザクション保証**
   - トランジションステータス更新と実験データ保存を1トランザクションで実行
   - 整合性を確保

### バリデーション

#### 必須チェック
- [ ] projectId はUUID形式
- [ ] taskId はUUID形式
- [ ] templateType は "material", "condition", "result" のいずれか
- [ ] data はオブジェクト形式
- [ ] status は許可された値のいずれか（指定時）
- [ ] comment は2000文字以内（指定時）

#### 関連性チェック
- [ ] projectIdは自組織に属するプロジェクト
- [ ] taskIdは指定されたprojectIdに属するタスク
- [ ] transitionIdは指定されたtaskIdに属するトランジション
- [ ] templateIdは指定されたtemplateTypeに対応するテンプレート

#### プロジェクトステータスチェック
- [ ] プロジェクトステータスが編集可能（draft/active/waiting_approval）

### データベーステーブル

#### 使用テーブル
1. **experiment_records**（主テーブル）
   - id, project_id, method_id, task_id, transition_id
   - template_type, template_id, data (JSONB)
   - status, progress_rate, comment
   - recorded_by, recorded_at
   - organization_id, created_at, updated_at

2. **projects**（ステータス確認）
   - id, status, organization_id

3. **project_task**（存在確認）
   - id, project_id, organization_id

4. **transition_status**（ステータス更新）
   - transition_id, task_id, status, progress_rate
   - organization_id, updated_at

#### SQL例
```sql
-- トランザクション開始
BEGIN;

-- プロジェクトステータス確認（マルチテナント分離）
SELECT status FROM projects 
WHERE id = $1 AND organization_id = $2
AND status IN ('draft', 'active', 'waiting_approval');

-- タスク存在確認
SELECT id FROM project_task 
WHERE id = $3 AND project_id = $1 AND organization_id = $2;

-- 既存レコード確認（UPSERT用）
SELECT id FROM experiment_records
WHERE project_id = $1 
  AND method_id = $4
  AND task_id = $3
  AND transition_id = $5
  AND template_type = $6
  AND template_id = $7
  AND organization_id = $2;

-- 実験データ保存（INSERT or UPDATE）
INSERT INTO experiment_records (
  id, project_id, method_id, task_id, transition_id,
  template_type, template_id, data,
  status, progress_rate, comment,
  recorded_by, recorded_at, organization_id,
  created_at, updated_at
) VALUES (
  $1, $2, $3, $4, $5,
  $6, $7, $8::jsonb,
  $9, $10, $11,
  $12, NOW(), $13,
  NOW(), NOW()
)
ON CONFLICT (project_id, method_id, task_id, transition_id, template_type, template_id, organization_id)
DO UPDATE SET
  data = $8::jsonb,
  status = $9,
  progress_rate = $10,
  comment = $11,
  recorded_by = $12,
  recorded_at = NOW(),
  updated_at = NOW()
RETURNING *;

-- トランジションステータス更新（みなし進捗更新）
UPDATE transition_status
SET 
  status = $9,
  progress_rate = $10,
  updated_at = NOW()
WHERE transition_id = $5 
  AND task_id = $4
  AND organization_id = $13;

COMMIT;
```

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

- インデックス: experiment_records (project_id, method_id, task_id, transition_id, organization_id)
- インデックス: experiment_records (organization_id, recorded_at)
- JSONB型: GINインデックスを使用（data列）
- トランザクション: 必須（整合性保証）
- キャッシュ: 不要（リアルタイム性重視）

---

## 2. トランジションステータス更新API

### 概要
トランジションのステータスを手動で更新します。みなし進捗更新がOFFの場合に使用します。

### エンドポイント
```
PUT /api/v1/experiments/projects/:projectId/methods/:methodId/transitions/:transitionId/status
```

### HTTPメソッド
PUT

### 認証要件
- JWT認証必須
- ロール: Worker以上
- テナント分離必須

### ミドルウェアチェーン
```typescript
router.put('/experiments/projects/:projectId/methods/:methodId/transitions/:transitionId/status',
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
| transitionId | string | ○ | トランジションID |

#### リクエストボディ
```json
{
  "taskNo": 1,
  "status": "running",
  "progressRate": 50,
  "comment": "実験を開始しました。現在50%完了。"
}
```

#### パラメータ詳細

| パラメータ | 型 | 必須 | 説明 | 制約 |
|-----------|----|----|------|------|
| taskNo | integer | ○ | タスク連番 | 1以上の整数 |
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

4. **タスク進捗の再計算（オプション）**
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

2. **projects**（ステータス確認）
   - id, status, organization_id

3. **project_task**（存在確認）
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
| 1.0.0 | 2026-01-27 | 初版作成 | Cline |
| | | - 実験データ記録API 2エンドポイントの設計書作成 | |
| | | - 実装未着手 | |

---

**注意**: この設計書は未実装APIの仕様を定義したものです。実装時には、この設計書に従ってルート、コントローラー、サービス、テストを作成してください。
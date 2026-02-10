# 問題管理API設計書

## メタデータ
- **作成日**: 2026-01-27
- **バージョン**: 1.0.0
- **最終更新**: 2026-01-27
- **担当**: Development Team
- **実装状況**: ✅ 実装済み（テスト103件すべてPASS）

---

## 概要

このドキュメントは、実験作業中に発生する問題の報告・管理を行うためのAPI仕様を定義します。

### 主な機能
- 問題報告（タスク・トランジション単位）
- コメント投稿による問題のディスカッション
- 問題一覧の取得（複合フィルタリング対応）
- 問題詳細とコメント履歴の取得
- 問題ステータスの変更（未解決/解決済）

### 対象ユーザー
- 実験作業者（Worker）: 問題報告、コメント投稿、一覧閲覧
- 実験管理者（Manager）: 上記 + ステータス変更
- システム管理者（Admin）: 全権限

---

## 📋 API一覧

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | 権限 |
|----|-------------|---------------|------|---------|------|
| 1 | POST | /api/v1/issues | 問題報告 | ✅ 実装済み | Worker以上 |
| 2 | POST | /api/v1/issues/:issueId/comments | コメント投稿 | ✅ 実装済み | Worker以上 |
| 3 | GET | /api/v1/issues | 問題一覧取得 | ✅ 実装済み | Worker以上 |
| 4 | GET | /api/v1/issues/:issueId | 問題詳細取得 | ✅ 実装済み | Worker以上 |
| 5 | PATCH | /api/v1/issues/:issueId/status | 問題ステータス変更 | ✅ 実装済み | Manager以上 |

---

## 1. 問題報告API

### 概要
プロジェクト、タスクまたはトランジション単位で問題を報告します。

### エンドポイント
```
POST /api/v1/issues
```

### HTTPメソッド
POST

### 認証要件
- JWT認証必須
- ロール: Worker以上
- テナント分離必須

### ミドルウェアチェーン
```typescript
router.post('/issues',
  auth,                        // JWT認証
  tenantIsolation,            // テナント分離
  permissionCheck(['worker', 'manager', 'admin']), // 権限チェック
  issueController.create
);
```

### リクエスト

#### リクエストボディ
```json
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "methodId": "method_001",
  "issueType": "material_shortage",
  "targetType": "transition",
  "taskNo": 1,
  "transitionId": "transition_001",
  "title": "試薬Aの在庫不足",
  "description": "実験に必要な試薬Aの在庫が不足しています。追加発注が必要です。"
}
```

#### パラメータ詳細

| パラメータ | 型 | 必須 | 説明 | 制約 |
|-----------|----|----|------|------|
| projectId | UUID | ○ | プロジェクトID | UUID形式 |
| methodId | string | △ | メソッドID | メソッド識別子（例: method_001）　tagetTypeがtaskの場合 |
| issueType | string | ○ | 問題の種類 | material_shortage, equipment_failure, procedure_unclear, safety_concern, quality_issue, time_constraint, other |
| targetType | string | ○ | 対象種別 | project, task, transition |
| taskNo | integer | △ | タスク番号 | targetTypeがtask/transitionの場合必須、1以上の整数 |
| transitionId | string | △ | トランジションID | targetTypeがtransitionの場合必須 |
| title | string | ○ | 問題タイトル | 1-200文字 |
| description | string | ○ | 問題詳細 | 1-2000文字 |

### レスポンス

#### 成功時（201 Created）
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "methodId": "method_001",
    "issueType": "material_shortage",
    "targetType": "transition",
    "taskNo": 1,
    "transitionId": "transition_001",
    "title": "試薬Aの在庫不足",
    "description": "実験に必要な試薬Aの在庫が不足しています。追加発注が必要です。",
    "status": "unresolved",
    "reportedBy": "880e8400-e29b-41d4-a716-446655440003",
    "reportedAt": "2026-01-27T10:30:00Z",
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
        "field": "issueType",
        "message": "Invalid issue type",
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

#### エラー時（404 Not Found）
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Project not found or does not belong to your organization"
  },
  "meta": {
    "timestamp": "2026-01-27T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### ビジネスロジック

1. **バリデーション**
   - methodIdが指定されたプロジェクトに存在することを確認
   - issueTypeが許可された値であることを確認
   - targetTypeに応じて必須パラメータを確認
   - projectIdが自組織に属することを確認
   - taskNo/transitionIdが指定されたプロジェクトに属することを確認

2. **タスクID取得**
   - taskNoが指定された場合、project_taskテーブルからtask_idを取得
   - projectIdとtaskNoでタスクを特定

3. **問題登録**
   - issuesテーブルに新規レコードを挿入
   - reported_by に現在のユーザーIDを設定
   - status を "unresolved" で初期化
   - severity を "medium" で初期化（デフォルト値）
   - organization_id を設定（マルチテナント分離）

### バリデーション

#### 必須チェック
- [ ] projectId はUUID形式
- [ ] methodId は空文字列ではない
- [ ] issueType は許可された値のいずれか
- [ ] targetType は "project", "task", "transition" のいずれか
- [ ] title は1-200文字
- [ ] description は1-2000文字

#### 関連性チェック
- [ ] methodIdは指定されたprojectIdに存在するメソッド
- [ ] targetTypeが"task"の場合、taskNoが必須
- [ ] targetTypeが"transition"の場合、taskNoとtransitionIdが必須
- [ ] taskNoは正の整数（1以上）
- [ ] taskNoは指定されたprojectIdに存在するタスク番号

### データベーステーブル

#### 使用テーブル
1. **issues**（主テーブル）
   - id, issue_type, target_type, project_id, method_id, task_id, transition_id
   - title, description, severity, status
   - reported_by, reported_at, resolved_at, resolved_by
   - organization_id, created_at, updated_at

2. **projects**（存在確認）
   - id, organization_id

3. **project_task_detail**（メソッド存在確認）
   - project_id, method_id, organization_id

4. **project_task**（存在確認、targetType=task/transitionの場合）
   - id, project_id, organization_id

#### SQL例
```sql
-- プロジェクト存在確認（マルチテナント分離）
SELECT project_id FROM projects 
WHERE project_id = $1 AND organization_id = $2;

-- メソッド存在確認（マルチテナント分離）
SELECT DISTINCT method_id FROM project_task 
WHERE project_id = $1 AND method_id = $2 AND organization_id = $3;

-- 問題登録（severityはデフォルト値'medium'を使用）
INSERT INTO issues (
  organization_id, project_id, issue_id, method_id, issue_target, task_no, transition_id, issue_title, issue_type, issue_contents, status,
  issue_reporter_id, issue_report_at, issue_completer_id, issue_complate_at,
  create_user_id, create_at, update_user_id, update_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'unresolved',
  $11, NOW(), null, null,
  $11, NOW(), $11, NOW()
) RETURNING *;
```

### セキュリティ

#### マルチテナント分離
- [ ] organization_id フィルタ必須
- [ ] プロジェクトの所属組織を検証
- [ ] タスクの所属組織を検証

#### 認証・認可
- [ ] JWT認証必須
- [ ] Worker以上の権限が必要
- [ ] 自組織のプロジェクトのみ報告可能

#### 入力検証
- [ ] SQLインジェクション対策（Parameterized Queries）
- [ ] XSS対策（入力サニタイゼーション）
- [ ] 文字列長制限の強制

### パフォーマンス

- インデックス: issues (organization_id, project_id, status)
- インデックス: issues (organization_id, task_id)
- トランザクション: 不要（単一INSERT）
- キャッシュ: 不要

---

## 2. コメント投稿API

### 概要
既存の問題にコメントを追加します。

### エンドポイント
```
POST /api/v1/issues/:issueId/comments
```

### HTTPメソッド
POST

### 認証要件
- JWT認証必須
- ロール: Worker以上
- テナント分離必須

### ミドルウェアチェーン
```typescript
router.post('/issues/:issueId/comments',
  auth,
  tenantIsolation,
  permissionCheck(['worker', 'manager', 'admin']),
  issueController.addComment
);
```

### リクエスト

#### パスパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| issueId | UUID | ○ | 問題ID |

#### リクエストボディ
```json
{
  "comment": "在庫管理システムを確認したところ、試薬Aは明日入荷予定です。"
}
```

| パラメータ | 型 | 必須 | 説明 | 制約 |
|-----------|----|----|------|------|
| comment | string | ○ | コメント内容 | 1-2000文字 |

### レスポンス

#### 成功時（201 Created）
```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "issueId": "770e8400-e29b-41d4-a716-446655440002",
    "comment": "在庫管理システムを確認したところ、試薬Aは明日入荷予定です。",
    "userId": "880e8400-e29b-41d4-a716-446655440003",
    "userName": "山田太郎",
    "createdAt": "2026-01-27T11:00:00Z"
  },
  "meta": {
    "timestamp": "2026-01-27T11:00:00Z",
    "requestId": "req_def456"
  }
}
```

#### エラー時（404 Not Found）
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Issue not found or does not belong to your organization"
  },
  "meta": {
    "timestamp": "2026-01-27T11:00:00Z",
    "requestId": "req_def456"
  }
}
```

### ビジネスロジック

1. **問題存在確認**
   - issueIdが自組織に属する問題であることを確認

2. **コメント登録**
   - issue_commentsテーブルに新規レコードを挿入
   - user_idに現在のユーザーIDを設定

3. **問題の更新日時更新**
   - issuesテーブルのupdated_atを更新（コメント投稿を問題の活動として記録）

### バリデーション

- [ ] issueId はUUID形式
- [ ] comment は1-2000文字
- [ ] 問題は自組織に属するもの

### データベーステーブル

#### 使用テーブル
1. **issue_comments**（主テーブル）
   - id, issue_id, comment, user_id, created_at

2. **issues**（更新対象）
   - updated_at

3. **organization_user**（ユーザー名取得用JOIN）
   - user_id, organization_id, user_name

#### SQL例
```sql
-- トランザクション開始
BEGIN;

-- 問題存在確認（マルチテナント分離）
SELECT id FROM issues 
WHERE id = $1 AND organization_id = $2 FOR UPDATE;

-- コメント登録
INSERT INTO issue_comments (id, issue_id, comment, user_id, created_at)
VALUES ($1, $2, $3, $4, NOW())
RETURNING *;

-- 問題の更新日時を更新
UPDATE issues 
SET updated_at = NOW() 
WHERE id = $2;

-- ユーザー名取得
SELECT u.user_name 
FROM organization_user ou
JOIN users u ON ou.user_id = u.id
WHERE ou.user_id = $4 AND ou.organization_id = $2;

COMMIT;
```

### セキュリティ

- [ ] organization_id フィルタ必須
- [ ] 自組織の問題のみコメント可能
- [ ] SQLインジェクション対策
- [ ] XSS対策

### パフォーマンス

- インデックス: issue_comments (issue_id, created_at)
- トランザクション: 必須（問題の更新日時更新を含む）

---

## 3. 問題一覧取得API

### 概要
問題一覧を取得します。複合フィルタリング、ソート、ページネーションに対応します。

### エンドポイント
```
GET /api/v1/issues
```

### HTTPメソッド
GET

### 認証要件
- JWT認証必須
- ロール: Worker以上
- テナント分離必須

### ミドルウェアチェーン
```typescript
router.get('/issues',
  auth,
  tenantIsolation,
  permissionCheck(['worker', 'manager', 'admin']),
  issueController.list
);
```

### リクエスト

#### クエリパラメータ
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|----|----|-----------|------|
| project_id | UUID | × | - | プロジェクトIDでフィルタ |
| task_id | UUID | × | - | タスクIDでフィルタ |
| transition_id | string | × | - | トランジションIDでフィルタ |
| status | string | × | - | ステータスでフィルタ（unresolved/resolved） |
| issue_type | string | × | - | 問題種別でフィルタ |
| severity | string | × | - | 重要度でフィルタ |
| sort_by | string | × | created_at | ソート項目（created_at/updated_at/severity） |
| order | string | × | desc | ソート順（asc/desc） |
| page | integer | × | 1 | ページ番号 |
| limit | integer | × | 20 | 1ページあたりの件数（最大100） |

#### リクエスト例
```
GET /api/v1/issues?project_id=550e8400-e29b-41d4-a716-446655440000&status=unresolved&sort_by=severity&order=desc&page=1&limit=20
```

### レスポンス

#### 成功時（200 OK）
```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "issueType": "material_shortage",
      "targetType": "transition",
      "projectId": "550e8400-e29b-41d4-a716-446655440000",
      "projectName": "Sample Project",
      "taskId": "660e8400-e29b-41d4-a716-446655440001",
      "taskNo": 1,
      "transitionId": "transition_001",
      "title": "試薬Aの在庫不足",
      "description": "実験に必要な試薬Aの在庫が不足しています。",
      "severity": "high",
      "status": "unresolved",
      "reportedBy": "880e8400-e29b-41d4-a716-446655440003",
      "reportedByName": "山田太郎",
      "reportedAt": "2026-01-27T10:30:00Z",
      "commentCount": 3,
      "createdAt": "2026-01-27T10:30:00Z",
      "updatedAt": "2026-01-27T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2026-01-27T12:00:00Z",
    "requestId": "req_ghi789"
  }
}
```

### ビジネスロジック

1. **フィルタリング**
   - organization_idで必ずフィルタ（マルチテナント分離）
   - 指定されたクエリパラメータで追加フィルタ
   - 複数条件はAND条件で結合

2. **ソート**
   - デフォルト: created_at DESC
   - severityでソートする場合: critical > high > medium > low

3. **ページネーション**
   - デフォルト: 20件/ページ
   - 最大: 100件/ページ

4. **コメント数集計**
   - LEFT JOIN で issue_comments を集約
   - COUNT でコメント数を取得

5. **ユーザー名取得**
   - JOIN で organization_user から報告者名を取得

### バリデーション

- [ ] project_id はUUID形式（指定時）
- [ ] task_id はUUID形式（指定時）
- [ ] status は "unresolved" または "resolved"（指定時）
- [ ] sort_by は許可された値（created_at/updated_at/severity）
- [ ] order は "asc" または "desc"
- [ ] page は正の整数
- [ ] limit は1-100の整数

### データベーステーブル

#### 使用テーブル
1. **issues**（主テーブル）
2. **projects**（JOIN: プロジェクト名取得）
3. **project_task**（JOIN: タスク番号取得）
4. **organization_user**（JOIN: 報告者名取得）
5. **issue_comments**（LEFT JOIN: コメント数集計）

#### SQL例
```sql
SELECT 
  i.id,
  i.issue_type,
  i.target_type,
  i.project_id,
  p.project_name,
  i.task_id,
  pt.task_no,
  i.transition_id,
  i.title,
  i.description,
  i.severity,
  i.status,
  i.reported_by,
  ou.user_name AS reported_by_name,
  i.reported_at,
  COUNT(ic.id) AS comment_count,
  i.created_at,
  i.updated_at
FROM issues i
JOIN projects p ON i.project_id = p.id
LEFT JOIN project_task pt ON i.task_id = pt.id
JOIN organization_user ou ON i.reported_by = ou.user_id AND ou.organization_id = i.organization_id
LEFT JOIN issue_comments ic ON i.id = ic.issue_id
WHERE i.organization_id = $1
  AND ($2::uuid IS NULL OR i.project_id = $2)
  AND ($3::uuid IS NULL OR i.task_id = $3)
  AND ($4::text IS NULL OR i.transition_id = $4)
  AND ($5::text IS NULL OR i.status = $5)
  AND ($6::text IS NULL OR i.issue_type = $6)
  AND ($7::text IS NULL OR i.severity = $7)
GROUP BY i.id, p.project_name, pt.task_no, ou.user_name
ORDER BY 
  CASE WHEN $8 = 'severity' THEN
    CASE i.severity
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END
  END,
  CASE WHEN $8 = 'created_at' THEN i.created_at END DESC,
  CASE WHEN $8 = 'updated_at' THEN i.updated_at END DESC
LIMIT $9 OFFSET $10;

-- 総件数取得
SELECT COUNT(DISTINCT i.id)
FROM issues i
WHERE i.organization_id = $1
  AND ($2::uuid IS NULL OR i.project_id = $2)
  -- ... (同じフィルタ条件);
```

### セキュリティ

- [ ] organization_id フィルタ必須
- [ ] SQLインジェクション対策（Parameterized Queries）

### パフォーマンス

- インデックス: issues (organization_id, project_id, status)
- インデックス: issues (organization_id, created_at)
- インデックス: issues (organization_id, updated_at)
- キャッシュ: 不要（リアルタイム性重視）

---

## 4. 問題詳細取得API

### 概要
問題の詳細情報とコメント履歴を取得します。

### エンドポイント
```
GET /api/v1/issues/:issueId
```

### HTTPメソッド
GET

### 認証要件
- JWT認証必須
- ロール: Worker以上
- テナント分離必須

### ミドルウェアチェーン
```typescript
router.get('/issues/:issueId',
  auth,
  tenantIsolation,
  permissionCheck(['worker', 'manager', 'admin']),
  issueController.getById
);
```

### リクエスト

#### パスパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| issueId | UUID | ○ | 問題ID |

#### リクエスト例
```
GET /api/v1/issues/770e8400-e29b-41d4-a716-446655440002
```

### レスポンス

#### 成功時（200 OK）
```json
{
  "success": true,
  "data": {
    "issue": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "issueType": "material_shortage",
      "targetType": "transition",
      "projectId": "550e8400-e29b-41d4-a716-446655440000",
      "projectName": "Sample Project",
      "taskId": "660e8400-e29b-41d4-a716-446655440001",
      "taskNo": 1,
      "transitionId": "transition_001",
      "title": "試薬Aの在庫不足",
      "description": "実験に必要な試薬Aの在庫が不足しています。追加発注が必要です。",
      "severity": "high",
      "status": "unresolved",
      "reportedBy": "880e8400-e29b-41d4-a716-446655440003",
      "reportedByName": "山田太郎",
      "reportedAt": "2026-01-27T10:30:00Z",
      "resolvedBy": null,
      "resolvedByName": null,
      "resolvedAt": null,
      "createdAt": "2026-01-27T10:30:00Z",
      "updatedAt": "2026-01-27T11:00:00Z"
    },
    "comments": [
      {
        "id": "990e8400-e29b-41d4-a716-446655440004",
        "comment": "在庫管理システムを確認したところ、試薬Aは明日入荷予定です。",
        "userId": "880e8400-e29b-41d4-a716-446655440005",
        "userName": "佐藤花子",
        "createdAt": "2026-01-27T11:00:00Z"
      },
      {
        "id": "aa0e8400-e29b-41d4-a716-446655440006",
        "comment": "承知しました。入荷次第、実験を再開します。",
        "userId": "880e8400-e29b-41d4-a716-446655440003",
        "userName": "山田太郎",
        "createdAt": "2026-01-27T11:30:00Z"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-27T12:00:00Z",
    "requestId": "req_jkl012"
  }
}
```

#### エラー時（404 Not Found）
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Issue not found or does not belong to your organization"
  },
  "meta": {
    "timestamp": "2026-01-27T12:00:00Z",
    "requestId": "req_jkl012"
  }
}
```

### ビジネスロジック

1. **問題詳細取得**
   - issuesテーブルから該当レコードを取得
   - organization_idで必ずフィルタ（マルチテナント分離）
   - プロジェクト名、タスク番号、ユーザー名をJOINで取得

2. **コメント一覧取得**
   - issue_commentsテーブルから該当レコードを取得
   - 投稿日時の昇順でソート
   - ユーザー名をJOINで取得

### バリデーション

- [ ] issueId はUUID形式
- [ ] 問題は自組織に属するもの

### データベーステーブル

#### 使用テーブル
1. **issues**（主テーブル）
2. **projects**（JOIN: プロジェクト名取得）
3. **project_task**（JOIN: タスク番号取得）
4. **organization_user**（JOIN: ユーザー名取得）
5. **issue_comments**（コメント一覧）

#### SQL例
```sql
-- 問題詳細取得
SELECT 
  i.*,
  p.project_name,
  pt.task_no,
  ou1.user_name AS reported_by_name,
  ou2.user_name AS resolved_by_name
FROM issues i
JOIN projects p ON i.project_id = p.id
LEFT JOIN project_task pt ON i.task_id = pt.id
JOIN organization_user ou1 ON i.reported_by = ou1.user_id AND ou1.organization_id = i.organization_id
LEFT JOIN organization_user ou2 ON i.resolved_by = ou2.user_id AND ou2.organization_id = i.organization_id
WHERE i.id = $1 AND i.organization_id = $2;

-- コメント一覧取得
SELECT 
  ic.id,
  ic.comment,
  ic.user_id,
  ou.user_name,
  ic.created_at
FROM issue_comments ic
JOIN issues i ON ic.issue_id = i.id
JOIN organization_user ou ON ic.user_id = ou.user_id AND ou.organization_id = i.organization_id
WHERE ic.issue_id = $1 AND i.organization_id = $2
ORDER BY ic.created_at ASC;
```

### セキュリティ

- [ ] organization_id フィルタ必須
- [ ] SQLインジェクション対策

### パフォーマンス

- インデックス: issues (id, organization_id)
- インデックス: issue_comments (issue_id, created_at)
- トランザクション: 不要（読み取り専用）

---

## 5. 問題ステータス変更API

### 概要
問題のステータスを「未解決」または「解決済」に変更します。

### エンドポイント
```
PATCH /api/v1/issues/:issueId/status
```

### HTTPメソッド
PATCH

### 認証要件
- JWT認証必須
- ロール: Manager以上（Workerは不可）
- テナント分離必須

### ミドルウェアチェーン
```typescript
router.patch('/issues/:issueId/status',
  auth,
  tenantIsolation,
  permissionCheck(['manager', 'admin']),  // Workerは不可
  issueController.updateStatus
);
```

### リクエスト

#### パスパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| issueId | UUID | ○ | 問題ID |

#### リクエストボディ
```json
{
  "status": "resolved"
}
```

| パラメータ | 型 | 必須 | 説明 | 制約 |
|-----------|----|----|------|------|
| status | string | ○ | ステータス | unresolved, resolved |

### レスポンス

#### 成功時（200 OK）
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "status": "resolved",
    "resolvedBy": "880e8400-e29b-41d4-a716-446655440007",
    "resolvedByName": "鈴木一郎",
    "resolvedAt": "2026-01-27T15:00:00Z",
    "updatedAt": "2026-01-27T15:00:00Z"
  },
  "meta": {
    "timestamp": "2026-01-27T15:00:00Z",
    "requestId": "req_mno345"
  }
}
```

#### エラー時（403 Forbidden）
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_INSUFFICIENT",
    "message": "Only managers and admins can change issue status"
  },
  "meta": {
    "timestamp": "2026-01-27T15:00:00Z",
    "requestId": "req_mno345"
  }
}
```

#### エラー時（404 Not Found）
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Issue not found or does not belong to your organization"
  },
  "meta": {
    "timestamp": "2026-01-27T15:00:00Z",
    "requestId": "req_mno345"
  }
}
```

### ビジネスロジック

1. **問題存在確認**
   - issueIdが自組織に属する問題であることを確認

2. **ステータス更新**
   - statusが"resolved"の場合:
     - resolved_by に現在のユーザーIDを設定
     - resolved_at に現在時刻を設定
   - statusが"unresolved"の場合:
     - resolved_by を NULL にクリア
     - resolved_at を NULL にクリア

3. **更新日時の更新**
   - updated_at を更新

### バリデーション

- [ ] issueId はUUID形式
- [ ] status は "unresolved" または "resolved"
- [ ] 問題は自組織に属するもの
- [ ] 現在のユーザーはManager以上

### データベーステーブル

#### 使用テーブル
1. **issues**（更新対象）
   - status, resolved_by, resolved_at, updated_at

2. **organization_user**（ユーザー名取得用JOIN）
   - user_id, organization_id, user_name

#### SQL例
```sql
-- トランザクション開始
BEGIN;

-- 問題存在確認（マルチテナント分離）
SELECT id FROM issues 
WHERE id = $1 AND organization_id = $2 FOR UPDATE;

-- ステータス更新（resolved の場合）
UPDATE issues 
SET 
  status = $3,
  resolved_by = $4,
  resolved_at = NOW(),
  updated_at = NOW()
WHERE id = $1 AND organization_id = $2
RETURNING *;

-- ステータス更新（unresolved の場合）
UPDATE issues 
SET 
  status = $3,
  resolved_by = NULL,
  resolved_at = NULL,
  updated_at = NOW()
WHERE id = $1 AND organization_id = $2
RETURNING *;

-- ユーザー名取得
SELECT u.user_name 
FROM organization_user ou
JOIN users u ON ou.user_id = u.id
WHERE ou.user_id = $4 AND ou.organization_id = $2;

COMMIT;
```

### セキュリティ

#### マルチテナント分離
- [ ] organization_id フィルタ必須
- [ ] 自組織の問題のみ更新可能

#### 認証・認可
- [ ] JWT認証必須
- [ ] Manager以上の権限が必要（Worker は不可）

#### 入力検証
- [ ] SQLインジェクション対策（Parameterized Queries）

### パフォーマンス

- インデックス: issues (id, organization_id)
- トランザクション: 必須（整合性保証）

---

## 🔗 関連ドキュメント

### API設計書
- [api_list.md](./api_list.md) - API一覧対応表
- [api_project_management.md](./api_project_management.md) - プロジェクト管理API
- [api_progress_check.md](./api_progress_check.md) - 進捗確認API

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
backend/src/routes/issueRoutes.ts
```

### コントローラーファイル
```
backend/src/controllers/issueController.ts
```

### サービスファイル
```
backend/src/services/issueService.ts
```

### テストファイル
```
backend/tests/routes/issueRoutes.test.ts
backend/tests/services/issueService.test.ts
backend/tests/controllers/issueController.test.ts
```

---

## ✅ セキュリティチェックリスト

実装時に以下を確認してください：

### 認証・認可
- [ ] すべてのエンドポイントでJWT認証が必須
- [ ] tenantIsolationミドルウェアが適用されている
- [ ] permissionCheckで適切な権限が設定されている
- [ ] ステータス変更はManager以上のみ

### マルチテナント分離
- [ ] すべてのDBクエリにorganization_idフィルタが含まれる
- [ ] クロステナントアクセスが不可能
- [ ] JOINするすべてのテーブルでorganization_idを検証

### 入力検証
- [ ] すべてのパラメータがバリデーションされている
- [ ] Parameterized Queriesを使用（SQLインジェクション対策）
- [ ] XSS対策（入力サニタイゼーション）
- [ ] 文字列長制限が強制されている

### エラーハンドリング
- [ ] 統一されたエラーレスポンス形式
- [ ] エラーメッセージに機密情報が含まれない
- [ ] 適切なHTTPステータスコードを返す

### ログ記録
- [ ] Winston構造化ログで監査証跡を記録
- [ ] エラー発生時の詳細ログ
- [ ] セキュリティイベントの記録

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-27 | 初版作成 | Cline |
| | | - 問題管理API 5エンドポイントの設計書作成 | |
| | | - 実装済み（テスト103件すべてPASS） | |

---

**注意**: この設計書は実装済みAPIの仕様を文書化したものです。実装の詳細については、実際のソースコード（backend/src/routes/issueRoutes.ts等）を参照してください。

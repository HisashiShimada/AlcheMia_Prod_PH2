# Design Document

## 1. アーキテクチャ概要

### 1.1 レイヤー構成

```
Client Request
    ↓
[Routes Layer] projectRoutes.ts
    ↓ (Middleware Chain)
    ├── authMiddleware (JWT認証)
    ├── tenantIsolation (組織分離)
    └── permissionCheck (権限確認)
    ↓
[Controller Layer] projectController.ts
    ↓
[Service Layer] projectService.ts
    ↓
[Database Layer] PostgreSQL (projects, experiments)
    ↓
Response
```

### 1.2 設計方針

- 既存コードとの一貫性を保つ
- レイヤードアーキテクチャによる関心の分離
- マルチテナント分離の徹底
- セキュリティベストプラクティスの遵守

## 2. 実装ファイル

### 2.1 新規作成ファイル

**backend/src/routes/projectRoutes.ts**
- エンドポイント定義
- ミドルウェアチェーン適用
- ルート登録

**backend/src/controllers/projectController.ts**
- リクエスト処理
- バリデーション
- レスポンス生成
- エラーハンドリング

**backend/src/services/projectService.ts**
- ビジネスロジック
- データベースクエリ実行
- ページネーション計算
- データ整形

## 3. API仕様

### 3.1 エンドポイント

```
GET /api/v1/projects
```

### 3.2 リクエスト仕様

**Headers:**
```
Authorization: Bearer <jwt_token>
X-Organization-Id: <organization_id>
```

**Query Parameters:**
```typescript
{
  page?: number;        // デフォルト: 1
  limit?: number;       // デフォルト: 20, 最大: 100
  status?: string;      // 'active' | 'archived'
  search?: string;      // プロジェクト名・説明で検索
  sort_by?: string;     // 'created_at' | 'updated_at'
  order?: string;       // 'asc' | 'desc' (デフォルト: 'desc')
}
```

### 3.3 レスポンス仕様

**成功時 (200 OK):**
```typescript
{
  success: true,
  data: [
    {
      project_id: string;
      project_name: string;
      description: string;
      status: string;
      experiment_count: number;
      created_at: string;
      updated_at: string;
    }
  ],
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  },
  meta: {
    timestamp: string;
    requestId: string;
  }
}
```

**エラー時:**
```typescript
{
  success: false,
  error: {
    code: string;
    message: string;
    details?: any[];
  },
  meta: {
    timestamp: string;
    requestId: string;
  }
}
```

## 4. データベース設計

### 4.1 使用テーブル

**project テーブル**（プロジェクト基本情報）
- organization_id (UUID, 主キー)
- project_id (UUID, 主キー)
- project_name (VARCHAR)
- description (TEXT)
- department_id (UUID)
- owner_user_id (UUID)
- project_status (NUMERIC)
- project_maiml_flg (BOOLEAN)
- checkout_status (NUMERIC)
- create_at (TIMESTAMP)

**project_task_detail テーブル**（タスク詳細）
- organization_id (UUID, 主キー)
- project_id (UUID, 主キー)
- method_id (VARCHAR, 主キー)
- task_no (NUMERIC, 主キー)
- task_status (NUMERIC)
- experiment_user_id (UUID)
- その他のタスク管理カラム

### 4.2 基本クエリ

```sql
SELECT 
  p.organization_id,
  p.project_id,
  p.project_name,
  p.description,
  p.department_id,
  p.owner_user_id,
  p.project_status,
  p.project_maiml_flg,
  p.checkout_status,
  p.create_at,
  COUNT(DISTINCT ptd.method_id || '_' || ptd.task_no::TEXT) as task_count
FROM project p
LEFT JOIN project_task_detail ptd
  ON ptd.project_id = p.project_id
  AND ptd.organization_id = p.organization_id
WHERE p.organization_id = $1
  AND ($2::boolean IS NULL OR 
       ($2 = true OR p.project_status != 4))
GROUP BY 
  p.organization_id,
  p.project_id,
  p.project_name,
  p.description,
  p.department_id,
  p.owner_user_id,
  p.project_status,
  p.project_maiml_flg,
  p.checkout_status,
  p.create_at
ORDER BY p.create_at DESC
LIMIT $3 OFFSET $4
```

### 4.3 総件数取得クエリ

```sql
SELECT COUNT(*) as total
FROM project
WHERE organization_id = $1
  AND ($2::boolean IS NULL OR 
       ($2 = true OR project_status != 4))
```

### 4.4 パラメータ

1. `$1`: organization_id (必須)
2. `$2`: include_completed (boolean, オプション)
3. `$3`: limit
4. `$4`: offset ((page - 1) * limit)

## 5. セキュリティ設計

### 5.1 認証・認可

- **JWT認証**: authMiddlewareで検証
- **組織ID検証**: tenantIsolationで自動チェック
- **権限確認**: permissionCheckで実行

### 5.2 SQLインジェクション対策

- Parameterized Queries必須
- ユーザー入力は全てプレースホルダー経由

### 5.3 マルチテナント分離

- すべてのクエリに`WHERE organization_id = $1`
- JOIN時も両テーブルでorganization_id指定

## 6. パフォーマンス最適化

### 6.1 インデックス活用

既存インデックス:
- `project(organization_id)`
- `project(project_id)`
- `project(project_status)`
- `project_task_detail(organization_id, project_id)`

### 6.2 クエリ最適化

- LEFT JOINでN+1問題回避
- 必要カラムのみSELECT
- COUNT()で効率的な集計

## 7. エラーハンドリング

### 7.1 エラーケース

| エラー | ステータス | コード |
|--------|-----------|--------|
| JWT無効 | 401 | AUTH_TOKEN_INVALID |
| 組織ID不一致 | 403 | PERMISSION_DENIED |
| バリデーションエラー | 400 | VALIDATION_ERROR |
| DBエラー | 500 | DATABASE_ERROR |

## 8. 実装順序

### Phase 1: Service層実装
- projectService.tsの作成
- データベースクエリ実装
- ページネーション計算ロジック

### Phase 2: Controller層実装
- projectController.tsの作成
- リクエスト処理
- バリデーション実装

### Phase 3: Routes層実装
- projectRoutes.tsの作成
- エンドポイント定義
- ミドルウェア適用

### Phase 4: テスト実装
- ユニットテスト
- 統合テスト

### Phase 5: 動作確認
- 手動テスト
- レビュー

## 9. 参考実装

既存の認証APIを参考にする:
- `backend/src/routes/authRoutes.ts`
- `backend/src/controllers/authController.ts`

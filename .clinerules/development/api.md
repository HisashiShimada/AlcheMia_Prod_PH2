# API設計ポリシー

## 概要

このドキュメントは、mmdpfプロジェクトにおけるRESTful API設計の統一的なガイドラインを定義します。一貫性のあるAPI設計により、保守性、拡張性、開発効率を向上させます。

## 基本設計原則

### RESTful設計

- **リソース指向**: URLはリソースを表し、動詞ではなく名詞を使用
- **HTTPメソッドの適切な使用**: CRUD操作をHTTPメソッドで表現
- **ステートレス**: 各リクエストは独立し、必要な情報をすべて含む
- **統一インターフェース**: 一貫したURL構造とレスポンス形式

### リソース設計

- **名詞の複数形を使用**: `/api/v1/users`（`/api/v1/user` ではない）
- **階層構造の表現**: `/api/v1/projects/{projectId}/experiments`
- **深すぎるネストを避ける**: 最大3階層まで
- **リソースIDは明確に**: `{userId}`, `{projectId}` など

## URL設計規約

### 基本構造

```
/api/v{version}/{resource}
/api/v{version}/{resource}/{id}
/api/v{version}/{resource}/{id}/{subresource}
```

**例:**
```
GET    /api/v1/projects
GET    /api/v1/projects/123
GET    /api/v1/projects/123/experiments
POST   /api/v1/projects/123/experiments
GET    /api/v1/projects/123/experiments/456
PUT    /api/v1/projects/123/experiments/456
DELETE /api/v1/projects/123/experiments/456
```

### 命名規則

#### パス（リソース名）
- **ケバブケース（kebab-case）を使用**
- **複数形を使用**

**良い例:**
```
/api/v1/experiment-records
/api/v1/file-formats
/api/v1/worker-assignments
```

**悪い例:**
```
/api/v1/experimentRecords    ❌ キャメルケース
/api/v1/experiment_records   ❌ スネークケース
/api/v1/experiment-record    ❌ 単数形
```

#### クエリパラメータ
- **スネークケース（snake_case）を使用**

**良い例:**
```
GET /api/v1/projects?organization_id=123&status=active&sort_by=created_at
```

#### レスポンスボディ（JSON）
- **キャメルケース（camelCase）を使用**

**良い例:**
```json
{
  "projectId": "123",
  "projectName": "Sample Project",
  "createdAt": "2024-12-25T10:00:00Z"
}
```

### バージョニング戦略

#### URL パスバージョニング（推奨）

```
/api/v1/projects
/api/v2/projects
```

**理由:**
- 明示的でわかりやすい
- ブラウザでのテストが容易
- API Gatewayでのルーティングが簡単

#### バージョン管理のルール

1. **メジャーバージョン**: 破壊的変更（/api/v1 → /api/v2）
2. **後方互換性**: 既存APIは最低6ヶ月間サポート
3. **非推奨化**: `Deprecation` ヘッダーで通知
4. **移行期間**: 新旧バージョン並行運用

**非推奨化の例:**
```http
HTTP/1.1 200 OK
Deprecation: true
Link: </api/v2/projects>; rel="successor-version"
Sunset: Wed, 01 Jul 2025 23:59:59 GMT
```

### 特殊なエンドポイント

#### アクション（非CRUD操作）

リソースに対する特殊なアクションは、動詞をサブリソースとして表現：

```
POST /api/v1/experiments/{id}/execute       # 実験実行
POST /api/v1/workers/{id}/assign-task       # タスク割り当て
POST /api/v1/projects/{id}/archive          # プロジェクトをアーカイブ
POST /api/v1/files/{id}/download            # ファイルダウンロード（署名付きURL生成）
```

#### 検索エンドポイント

複雑な検索は専用エンドポイントを使用：

```
POST /api/v1/experiments/search
```

**リクエストボディ:**
```json
{
  "filters": {
    "status": "completed",
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    }
  },
  "sort": {
    "field": "createdAt",
    "order": "desc"
  },
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

## HTTPメソッドの使用

### CRUD操作のマッピング

| HTTPメソッド | 操作   | 冪等性 | 安全性 | 用途                                   |
|-------------|--------|-------|-------|---------------------------------------|
| GET         | Read   | ○     | ○     | リソースの取得                         |
| POST        | Create | ×     | ×     | リソースの新規作成、アクション実行      |
| PUT         | Update | ○     | ×     | リソースの完全置換                      |
| PATCH       | Update | ×     | ×     | リソースの部分更新                      |
| DELETE      | Delete | ○     | ×     | リソースの削除                         |

### 使用例

```http
# 一覧取得
GET /api/v1/projects

# 単一リソース取得
GET /api/v1/projects/123

# 新規作成
POST /api/v1/projects
Content-Type: application/json
{
  "name": "New Project",
  "description": "Project description"
}

# 完全更新（全フィールド必須）
PUT /api/v1/projects/123
Content-Type: application/json
{
  "name": "Updated Project",
  "description": "Updated description",
  "status": "active"
}

# 部分更新（変更フィールドのみ）
PATCH /api/v1/projects/123
Content-Type: application/json
{
  "status": "archived"
}

# 削除
DELETE /api/v1/projects/123
```

### HEADとOPTIONS

```http
# リソースの存在確認（ボディなし）
HEAD /api/v1/projects/123

# 許可されているメソッドの確認
OPTIONS /api/v1/projects/123
```

## リクエスト仕様

### リクエストヘッダー

#### 必須ヘッダー

```http
Content-Type: application/json
Authorization: Bearer {jwt_token}
X-Organization-Id: {organization_id}
```

#### オプショナルヘッダー

```http
Accept: application/json
Accept-Language: ja,en
X-Request-Id: {uuid}           # トレーシング用
```

### リクエストボディ

#### JSON形式を使用

```json
{
  "projectName": "Sample Project",
  "description": "This is a sample project",
  "status": "active",
  "metadata": {
    "category": "research",
    "tags": ["experiment", "analysis"]
  }
}
```

#### 日付・時刻の形式

- **ISO 8601 形式を使用**: `YYYY-MM-DDTHH:mm:ss.sssZ`

```json
{
  "createdAt": "2024-12-25T10:30:00.000Z",
  "scheduledDate": "2024-12-26"
}
```

#### ファイルアップロード

- **マルチパートフォームデータを使用**

```http
POST /api/v1/files/upload
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="data.csv"
Content-Type: text/csv

[ファイル内容]
------WebKitFormBoundary--
```

## レスポンス仕様

### 統一されたレスポンス形式

#### 成功レスポンス（単一リソース）

```json
{
  "success": true,
  "data": {
    "projectId": "123",
    "projectName": "Sample Project",
    "status": "active",
    "createdAt": "2024-12-25T10:00:00Z"
  },
  "meta": {
    "timestamp": "2024-12-25T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

#### 成功レスポンス（リスト）

```json
{
  "success": true,
  "data": [
    {
      "projectId": "123",
      "projectName": "Project 1"
    },
    {
      "projectId": "124",
      "projectName": "Project 2"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2024-12-25T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

#### エラーレスポンス

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "projectName",
        "message": "Project name is required",
        "code": "REQUIRED_FIELD"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-12-25T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### HTTPステータスコード

#### 成功レスポンス (2xx)

| コード | 説明                | 使用例                         |
|-------|---------------------|-------------------------------|
| 200   | OK                  | GET, PUT, PATCH の成功         |
| 201   | Created             | POST でリソース作成成功        |
| 204   | No Content          | DELETE の成功（レスポンスなし） |

#### クライアントエラー (4xx)

| コード | 説明                | 使用例                                 |
|-------|---------------------|---------------------------------------|
| 400   | Bad Request         | バリデーションエラー                    |
| 401   | Unauthorized        | 認証エラー（JWT無効）                  |
| 403   | Forbidden           | 認可エラー（権限不足）                  |
| 404   | Not Found           | リソースが存在しない                    |
| 409   | Conflict            | リソースの競合（重複など）              |
| 422   | Unprocessable Entity| セマンティックエラー                    |
| 429   | Too Many Requests   | レート制限超過                         |

#### サーバーエラー (5xx)

| コード | 説明                | 使用例                     |
|-------|---------------------|---------------------------|
| 500   | Internal Server Error | サーバー内部エラー         |
| 502   | Bad Gateway         | 外部サービスエラー          |
| 503   | Service Unavailable | サービス一時停止            |

### エラーコード体系

#### フォーマット: `CATEGORY_SPECIFIC_ERROR`

**カテゴリ:**
- `VALIDATION_*` - バリデーションエラー
- `AUTH_*` - 認証エラー
- `PERMISSION_*` - 認可エラー
- `RESOURCE_*` - リソース関連エラー
- `BUSINESS_*` - ビジネスロジックエラー
- `SYSTEM_*` - システムエラー

**例:**
```json
{
  "code": "VALIDATION_REQUIRED_FIELD",
  "code": "AUTH_TOKEN_EXPIRED",
  "code": "PERMISSION_INSUFFICIENT",
  "code": "RESOURCE_NOT_FOUND",
  "code": "BUSINESS_DUPLICATE_PROJECT_NAME",
  "code": "SYSTEM_DATABASE_ERROR"
}
```

## ページネーション

### カーソルベースページネーション（推奨）

大量データやリアルタイム更新がある場合に使用：

**リクエスト:**
```http
GET /api/v1/experiments?cursor=eyJpZCI6MTIzfQ&limit=20
```

**レスポンス:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "limit": 20,
    "nextCursor": "eyJpZCI6MTQzfQ",
    "prevCursor": "eyJpZCI6MTAzfQ",
    "hasNext": true,
    "hasPrev": true
  }
}
```

### オフセットベースページネーション

小規模データやページ番号表示が必要な場合：

**リクエスト:**
```http
GET /api/v1/projects?page=2&limit=20
```

**レスポンス:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

### デフォルト値

- **デフォルト limit**: 20
- **最大 limit**: 100
- **デフォルト page**: 1

## フィルタリング・ソート

### フィルタリング

#### クエリパラメータ方式

```http
GET /api/v1/experiments?status=active&created_after=2024-01-01&assigned_to=user123
```

#### 複数値のフィルタリング

```http
GET /api/v1/projects?status=active,pending&tags=experiment,analysis
```

### ソート

```http
GET /api/v1/projects?sort_by=created_at&order=desc
GET /api/v1/projects?sort=-created_at,+name  # 複数フィールド（-: desc, +: asc）
```

### 検索

```http
GET /api/v1/projects?search=experiment&search_fields=name,description
```

## セキュリティ

### 認証

#### JWT + Session Hybrid認証

すべてのAPIリクエストにJWTトークンが必要：

```http
GET /api/v1/projects
Authorization: Bearer maiml_session-abc123_1234567890
X-Organization-Id: {a0718dc5-21f3-44e6-87e9-cc2ae83f3385}
```

### 認可

#### ロールベースアクセス制御（RBAC）

- **System Admin**: 全リソースへのアクセス
- **Manager**: 所属組織内のリソース管理
- **Worker**: 割り当てられたタスクのみ

#### ミドルウェアチェーン

```javascript
router.get('/api/v1/projects',
  auth,                        // JWT認証
  tenantIsolation,            // テナント分離
  permissionCheck(['manager', 'admin']), // 権限チェック
  projectController.list
);
```

### マルチテナント分離

#### 必須事項

1. **すべてのAPIリクエストに `X-Organization-Id` ヘッダー必須**
2. **すべてのDBクエリに `organization_id` フィルタ必須**
3. **クロステナントアクセス厳禁（System Admin除く）**

```javascript
// ❌ 悪い例
const projects = await db.query('SELECT * FROM projects');

// ✅ 良い例
const projects = await db.query(
  'SELECT * FROM projects WHERE organization_id = $1',
  [organizationId]
);
```

### レート制限

| エンドポイント          | 制限                |
|-----------------------|---------------------|
| POST /api/v1/auth/*   | 5回 / 15分 / IP     |
| GET /api/v1/*         | 100回 / 分 / ユーザー|
| POST/PUT/DELETE       | 50回 / 分 / ユーザー |

**レート制限超過時のレスポンス:**

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640000000

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 60 seconds."
  }
}
```

### CORS設定

```javascript
// 開発環境
const allowedOrigins = ['http://localhost:3000'];

// 本番環境
const allowedOrigins = ['https://mmdpf.example.com'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id']
}));
```

## キャッシング戦略

### ETagとCache-Control

```http
HTTP/1.1 200 OK
ETag: "686897696a7c876b7e"
Cache-Control: private, max-age=3600
Last-Modified: Wed, 21 Dec 2024 07:28:00 GMT
```

**条件付きリクエスト:**

```http
GET /api/v1/projects/123
If-None-Match: "686897696a7c876b7e"

# 変更なしの場合
HTTP/1.1 304 Not Modified
```

### キャッシュ方針

| リソース種別         | Cache-Control              |
|---------------------|---------------------------|
| 静的マスタデータ     | public, max-age=86400     |
| ユーザー固有データ   | private, max-age=3600     |
| リアルタイムデータ   | no-cache, no-store        |

## ドキュメント化

### OpenAPI (Swagger) 仕様

**ファイル配置:**
```
backend/
└── docs/
    └── openapi/
        ├── openapi.yaml          # メインファイル
        ├── paths/                # エンドポイント定義
        │   ├── projects.yaml
        │   └── experiments.yaml
        └── schemas/              # データモデル定義
            ├── project.yaml
            └── experiment.yaml
```

**基本構造:**

```yaml
openapi: 3.0.0
info:
  title: MMDPF API
  version: 1.0.0
  description: マルチモーダルデータプラットフォーム API
servers:
  - url: https://api.mmdpf.example.com/api/v1
    description: 本番環境
  - url: http://localhost:3001/api/v1
    description: 開発環境

paths:
  /projects:
    get:
      summary: プロジェクト一覧取得
      tags:
        - Projects
      security:
        - bearerAuth: []
      parameters:
        - name: organization_id
          in: header
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectList'
```

### APIドキュメントのメンテナンス

1. **コード変更時に必ずドキュメント更新**
2. **サンプルレスポンスを含める**
3. **エラーケースを明記**
4. **変更履歴を記録**

### JSDoc コメント

```typescript
/**
 * プロジェクト一覧を取得する
 * 
 * @route GET /api/v1/projects
 * @group Projects - プロジェクト管理
 * @param {string} organization_id.header.required - 組織ID
 * @param {number} page.query - ページ番号（デフォルト: 1）
 * @param {number} limit.query - 1ページあたりの件数（デフォルト: 20、最大: 100）
 * @param {string} status.query - ステータスフィルタ（active, archived）
 * @returns {ProjectListResponse.model} 200 - プロジェクト一覧
 * @returns {Error.model} 401 - 認証エラー
 * @returns {Error.model} 403 - 権限エラー
 * @security JWT
 */
router.get('/projects', auth, tenantIsolation, projectController.list);
```

## メンテナンス性の考慮

### 一貫性の維持

#### 命名規則の統一

```typescript
// ✅ 良い例（統一された命名）
GET  /api/v1/projects
POST /api/v1/projects
GET  /api/v1/projects/{id}

GET  /api/v1/experiments
POST /api/v1/experiments
GET  /api/v1/experiments/{id}

// ❌ 悪い例（不統一）
GET  /api/v1/projects
POST /api/v1/create-project      // 動詞を含む
GET  /api/v1/project/{id}         // 単数形
```

#### レスポンス形式の統一

すべてのAPIで同じレスポンス構造を使用：

```typescript
// 共通レスポンス型
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
  pagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

### 後方互換性の維持

#### 非破壊的な変更（OK）

- ✅ 新しいエンドポイントの追加
- ✅ レスポンスに新しいフィールドを追加
- ✅ オプショナルなリクエストパラメータの追加
- ✅ エラーメッセージの改善

#### 破壊的な変更（NG → バージョンアップ必要）

- ❌ エンドポイントの削除
- ❌ 既存フィールドの削除・型変更
- ❌ 必須パラメータの追加
- ❌ レスポンス構造の大幅な変更

### 変更の追跡

```yaml
# CHANGELOG.md

## [1.2.0] - 2024-12-25
### Added
- 実験記録API に `template` パラメータを追加

### Changed
- プロジェクト一覧API のデフォルトソート順を変更

### Deprecated
- `/api/v1/old-endpoint` を非推奨化（v2.0.0 で削除予定）

### Fixed
- ページネーションの totalPages 計算バグを修正
```

## ベストプラクティス

### DO（推奨）

✅ RESTful設計原則に従う
✅ 一貫した命名規則を使用する
✅ 適切なHTTPステータスコードを返す
✅ エラーメッセージはユーザーフレンドリーに
✅ ページネーションを実装する
✅ フィルタリング・ソート機能を提供する
✅ レート制限を実装する
✅ APIドキュメントを常に最新に保つ
✅ バージョニングを適切に管理する
✅ セキュリティベストプラクティスに従う

### DON'T（非推奨）

❌ URLに動詞を含めない
❌ HTTPメソッドをクエリパラメータで指定しない
❌ 独自のステータスコードを作らない
❌ エラーメッセージにスタックトレースを含めない
❌ ページネーションなしで大量データを返さない
❌ 認証なしで機密情報を返さない
❌ organization_idチェックを省略しない
❌ 後方互換性を破壊する変更をバージョンアップなしで行わない

## トラブルシューティング

### 一般的な問題と解決策

#### 問題1: N+1クエリ問題

```typescript
// ❌ 悪い例
const projects = await getProjects();
for (const project of projects) {
  project.experiments = await getExperiments(project.id); // N+1問題
}

// ✅ 良い例
const projects = await getProjectsWithExperiments(); // JOINまたはバッチ取得
```

#### 問題2: タイムアウト

長時間処理は非同期ジョブとして実装：

```typescript
// ✅ 非同期ジョブパターン
POST /api/v1/experiments/bulk-import
→ 202 Accepted
{
  "jobId": "job_abc123",
  "status": "processing"
}

GET /api/v1/jobs/job_abc123
→ 200 OK
{
  "jobId": "job_abc123",
  "status": "completed",
  "result": { ... }
}
```

## 参考資料

- [RESTful API Design Best Practices](https://restfulapi.net/)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Google API Design Guide](https://cloud.google.com/apis/design)

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2024-12-25 | 初版作成 | Development Team |

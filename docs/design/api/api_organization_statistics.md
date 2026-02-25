# 組織統計情報API仕様書

## 概要

**バージョン**: 1.0.0  
**最終更新**: 2026-02-25  
**担当**: Development Team

---

## 目的

システム管理者が自組織のリソース使用状況（ストレージ使用量・プロジェクト数・アクティブユーザー数）をリアルタイムで確認するためのAPIを提供します。

---

## 対象ユーザー

- **System Admin（システム管理者）**: 全機能へのアクセス可能

---

## 認証・認可

### ミドルウェアチェーン

すべてのエンドポイントで以下のミドルウェアチェーンを適用：

```typescript
router.METHOD('/path',
  authMiddleware,           // 1. JWT認証（セッション検証、req.userに格納）
  handleValidationErrors,   // 2. バリデーションエラーハンドリング
  organizationStatisticsController.METHOD  // 3. コントローラー
);
```

### 権限

- **System Admin**: すべての操作が可能

### マルチテナント分離

- authMiddlewareで `req.user.organizationId` を取得
- 取得できない場合は 401 エラーを返す
- 自組織の統計情報のみ取得可能

---

## API一覧

| No | HTTPメソッド | エンドポイント | 説明 | 権限 |
|----|-------------|---------------|------|------|
| 1 | GET | /api/v1/systemManagement/organization_statistics | 組織統計情報取得 | System Admin |

---

## API詳細

### 1. 組織統計情報取得

#### エンドポイント
```
GET /api/v1/systemManagement/organization_statistics
```

#### 説明
自組織のストレージ使用量・プロジェクト数・アクティブユーザー数の統計情報を取得します。  
3つのデータソース（StorageService・PostgreSQL・Redis）から並列でデータを取得します。

#### リクエスト

**クエリパラメータ**: なし

**リクエスト例**:
```http
GET /api/v1/systemManagement/organization_statistics
Authorization: Bearer {jwt_token}
```

#### レスポンス

**成功時（200 OK）**

```json
{
  "success": true,
  "data": {
    "storage": {
      "used": 0.00000042,
      "total": 999.0,
      "unit": "GB",
      "usageRate": 0.000000
    },
    "projects": {
      "count": 12,
      "total": 999
    },
    "activeUsers": {
      "count": 3,
      "total": 25
    }
  }
}
```

**レスポンスフィールド詳細**

| フィールド | 型 | 説明 |
|-----------|---|------|
| storage.used | number | 使用中ストレージ量（GB）小数8桁 |
| storage.total | number | ストレージ上限値（GB）環境変数 `MAX_STORAGE_GB_PER_ORG`（デフォルト: 999.0） |
| storage.unit | string | 単位（固定値: `"GB"`） |
| storage.usageRate | number | ストレージ使用率（0〜1）小数6桁 |
| projects.count | number | 現在のプロジェクト数 |
| projects.total | number | プロジェクト上限値 環境変数 `MAX_PROJECTS_PER_ORG`（デフォルト: 999） |
| activeUsers.count | number | アクティブセッション数（Redis取得） |
| activeUsers.total | number | 組織の全ユーザー数（organization_userテーブル） |

**エラー時**

| ステータスコード | エラーコード | 説明 |
|----------------|-------------|------|
| 401 | UNAUTHORIZED | 認証トークンが無効・組織IDが取得できない |
| 500 | INTERNAL_SERVER_ERROR | サーバー内部エラー（DB接続失敗など） |

#### 実装メモ

**ルートファイル**
```
backend/src/routes/organizationStatisticsRoutes.ts
```

**コントローラー**
```
backend/src/controllers/organizationStatisticsController.ts
```

**サービス**
```
backend/src/services/organizationStatisticsService.ts
```

**リポジトリ**
```
backend/src/repositories/organizationStatisticsRepository.ts
```

---

**データソース一覧**

| データ | ソース | 取得方法 | エラー時の挙動 |
|--------|--------|----------|--------------|
| ストレージ使用量 | StorageService（OpenStack Swift / AWS S3） | 組織IDフォルダ配下の全ファイルサイズ合計（最大10,000件） | 0として扱い処理を続行 |
| プロジェクト数 | PostgreSQL `project` テーブル | `organization_id` でCOUNT | 例外をスローし500エラーを返す |
| アクティブユーザー数（分子） | Redis | 全アクティブトークンを取得し `organizationId` でフィルタ | 0として扱い処理を続行 |
| 全ユーザー数（分母） | PostgreSQL `organization_user` テーブル | `organization_id` でCOUNT | 例外をスローし500エラーを返す |

---

**ストレージ使用量の計算方法**

```typescript
// バイト → GB 変換（小数8桁）
const usedGb = totalBytes / (1024 ** 3);
// 使用率（小数6桁）
const usageRate = usedGb / totalGb;
```

環境変数:
- `MAX_STORAGE_GB_PER_ORG`: ストレージ上限（デフォルト: `999.0`）
- `MAX_PROJECTS_PER_ORG`: プロジェクト上限（デフォルト: `999`）

---

**SQLクエリ例（プロジェクト数）**

```sql
-- プロジェクト数取得
SELECT COUNT(*) AS count
FROM project
WHERE organization_id = $1;
```

**SQLクエリ例（全ユーザー数）**

```sql
-- 組織の全ユーザー数取得
SELECT COUNT(*) AS count
FROM organization_user
WHERE organization_id = $1;
```

---

**並列処理の実装**

3つのデータソースから `Promise.all` で並列取得します。  
各データソースのエラーは個別にハンドリングし、可能な限り処理を続行します。

```typescript
const [storageStats, projectStats, userStats] = await Promise.all([
  getStorageStats(organizationId),    // Swift/S3（失敗時: 0）
  getProjectStats(organizationId),    // PostgreSQL（失敗時: 例外スロー）
  getActiveUserStats(organizationId), // Redis + PostgreSQL（Redis失敗時: count=0）
]);
```

---

## エラーコード一覧

| エラーコード | HTTPステータス | 説明 |
|-------------|---------------|------|
| UNAUTHORIZED | 401 | 認証トークンが無効・組織IDが取得できない |
| INTERNAL_SERVER_ERROR | 500 | サーバー内部エラー（DB接続失敗など） |

---

## セキュリティ考慮事項

### マルチテナント分離

- authMiddlewareで取得した `organizationId` のみを使用
- リクエストパラメータから組織IDを受け取らない（なりすまし防止）

```typescript
// ✅ 正しい例（authMiddlewareから取得）
const organizationId = req.user.organizationId;

// ❌ 間違った例（リクエストから取得）
const organizationId = req.query.organizationId;
```

### Redisエラー時の継続処理

- Redis未接続・エラー時はアクティブユーザー数を 0 として扱い、サービスを継続
- ストレージ取得エラー時も同様に 0 として扱い、サービスを継続
- PostgreSQLエラーは致命的エラーとして 500 を返す

---

## 関連ドキュメント

- [UI設計書 - 組織統計情報画面](../ui/ui_organization_statistics_main.md)
- [組織統計情報サービス](../../../backend/src/services/organizationStatisticsService.ts)
- [組織統計情報コントローラー](../../../backend/src/controllers/organizationStatisticsController.ts)
- [組織統計情報リポジトリ](../../../backend/src/repositories/organizationStatisticsRepository.ts)
- [組織統計情報ルート](../../../backend/src/routes/organizationStatisticsRoutes.ts)

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-02-25 | 初版作成 | Development Team |

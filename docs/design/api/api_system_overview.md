# システム概要API設計書

## メタデータ
- **作成日**: 2026-02-26
- **バージョン**: 1.2.0
- **担当**: Development Team
- **対象画面**: システム概要画面（システム管理メニュー）

---

## 概要

ログインユーザーの組織に紐づくシステム統計情報（ユーザー数・セッション数・実験システム状況・ストレージ・ログイン履歴）を取得するAPIです。

**ルートファイル**: `backend/src/routes/systemOverviewRoutes.ts`  
**コントローラー**: `backend/src/controllers/systemOverviewController.ts`  
**サービス**: `backend/src/services/systemOverviewService.ts`  
**リポジトリ**: `backend/src/repositories/systemOverviewRepository.ts`  
**フロントエンドサービス**: `frontend/src/services/systemOverviewApiService.ts`

---

## API一覧

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 |
|----|-------------|---------------|------|---------|
| 1.1 | GET | /api/v1/systemManagement/system-overview | システム概要統計取得 | ✅ 実装済み |

---

## API詳細

### 1.1 システム概要統計取得

#### 基本情報

| 項目 | 内容 |
|------|------|
| HTTPメソッド | GET |
| エンドポイント | `/api/v1/systemManagement/system-overview` |
| 説明 | ログインユーザーの組織に紐づく統計情報を一括取得する |
| 認証 | 必須（`authMiddleware`） |
| 権限 | system_admin |

#### ミドルウェアチェーン

```
authMiddleware → tenantIsolation → getOverview
```

#### リクエスト

**クエリパラメータ**: なし  
**リクエストボディ**: なし  
**リクエストヘッダー**: Cookie（セッションCookie）

#### レスポンス

**成功時（200 OK）**

```json
{
  "success": true,
  "data": {
    "users": {
      "total": 10,
      "active": 8
    },
    "sessions": {
      "total": 3
    },
    "experimentSystem": {
      "totalProjects": 15,
      "planning": 5,
      "inProgress": 6,
      "completed": 4,
      "contractedProjects": 30
    },
    "storage": {
      "totalFiles": 120,
      "usedCapacityGB": 1.45
    },
    "loginLast7Days": {
      "total": 42,
      "success": 40,
      "failed": 2
    }
  },
  "meta": {
    "timestamp": "2026-02-26T10:30:00.000Z",
    "requestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

**レスポンスフィールド詳細:**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `users.total` | number | 組織の総ユーザー数（`organization_user`テーブル） |
| `users.active` | number | 組織のアクティブユーザー数（`is_active = true`） |
| `sessions.total` | number | 現在のアクティブセッション数（Redis） |
| `experimentSystem.totalProjects` | number | 組織の総プロジェクト数 |
| `experimentSystem.planning` | number | プロジェクト計画中/タスク実行待ち（`project_status` IN `'0'`, `'1'`） |
| `experimentSystem.inProgress` | number | タスク実行中/タスク結果レビュー待ち（`project_status` IN `'2'`, `'3'`） |
| `experimentSystem.completed` | number | プロジェクト完了/タスク異常終了（`project_status` IN `'4'`, `'5'`） |
| `experimentSystem.contractedProjects` | number | 契約プロジェクト数（`organization`テーブルの `contract_projects`） |
| `storage.totalFiles` | number | ストレージの総ファイル数（Swift/S3） |
| `storage.usedCapacityGB` | number | 使用容量（GB、小数点3桁） |
| `loginLast7Days.total` | number | 過去7日間の総ログイン試行数 |
| `loginLast7Days.success` | number | 過去7日間のログイン成功数 |
| `loginLast7Days.failed` | number | 過去7日間のログイン失敗数 |

**project_statusの定義:**

| 値 | 意味 | 分類 |
|----|------|------|
| `'0'` | プロジェクト計画中 | `planning` |
| `'1'` | タスク実行待ち | `planning` |
| `'2'` | タスク実行中 | `inProgress` |
| `'3'` | タスク結果レビュー待ち | `inProgress` |
| `'4'` | プロジェクト完了 | `completed` |
| `'5'` | タスク異常終了 | `completed` |

**エラー時**

| ステータスコード | エラーコード | 説明 |
|----------------|-------------|------|
| 401 Unauthorized | UNAUTHORIZED | 認証エラー |
| 403 Forbidden | FORBIDDEN | 権限不足 |
| 500 Internal Server Error | SYSTEM_ERROR | サーバー内部エラー |

```json
{
  "success": false,
  "error": {
    "code": "SYSTEM_ERROR",
    "message": "システム概要情報の取得に失敗しました"
  },
  "meta": {
    "timestamp": "2026-02-26T10:30:00.000Z",
    "requestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

---

## データ取得元

各統計値の取得元は以下の通りです。

| 統計 | 取得元 | SQLファイル |
|-----|--------|------------|
| ユーザー統計 | PostgreSQL（`organization_user`テーブル） | `backend/src/sql/queries/system_overview/getUserStats.sql` |
| プロジェクト統計 | PostgreSQL（`project`テーブル） | `backend/src/sql/queries/system_overview/getProjectStats.sql` |
| ログイン統計 | PostgreSQL（`login_history`テーブル、過去7日間） | `backend/src/sql/queries/system_overview/getLoginStats.sql` |
| セッション統計 | Redis（アクティブリフレッシュトークン） | `refreshTokenService.getAllActiveTokens()` |
| ストレージ統計 | Swift/S3（`storageService.listFiles()`） | `-`（SQLなし。フォルダ・`.keep`ファイルを除外して集計） |

**取得方式**: 5つのデータソースを `Promise.all` で並列取得  
**エラー耐性**: セッション・ストレージ取得失敗時は `0` を返却し、画面表示を継続

---

## フロントエンド実装

**APIサービス**: `frontend/src/services/systemOverviewApiService.ts`

```typescript
export async function getSystemOverview(): Promise<SystemOverviewData> {
  const client = createApiClient();
  const response = await client.get<{ success: boolean; data: SystemOverviewData }>(
    '/systemManagement/system-overview'
  );
  return response.data.data;
}
```

**型定義**: `frontend/src/types/systemOverview.ts`

```typescript
export interface SystemOverviewData {
  users: { total: number; active: number };
  sessions: { total: number };
  experimentSystem: {
    totalProjects: number;
    planning: number;
    inProgress: number;
    completed: number;
    contractedProjects: number;
  };
  storage: { totalFiles: number; usedCapacityGB: number };
  loginLast7Days: { total: number; success: number; failed: number };
}
```

---

## セキュリティ考慮事項

- `authMiddleware` によるJWT認証必須
- `tenantIsolation` ミドルウェアにより `organizationId` を自動設定
- すべてのDBクエリに `organization_id` フィルタを適用（マルチテナント分離）
- 他組織のデータへのアクセスは不可

---

## 関連ドキュメント

- [API一覧](./api_list.md)
- [ユーザー管理API](./api_user_management.md)
- [組織管理API](./api_organization_management.md)

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.2.0 | 2026-03-05 | 契約プロジェクト数を追加 | Cline |
| | | - experimentSystem に `contractedProjects` フィールド追加 | |
| | | - organizationテーブルの `contract_projects` カラムから取得 | |
| | | - フロントエンド型定義に `contractedProjects: number` 追加 | |
| 1.1.0 | 2026-02-27 | ストレージ統計取得元をSwift/S3直接取得に変更 | Cline |
| | | フォルダオブジェクト・`.keep`プレースホルダーを除外するフィルタ追加 | |
| | | usedCapacityGB の小数点桁数を2桁→3桁に変更 | |
| 1.0.0 | 2026-02-26 | 初版作成 | Cline |
| | | experimentSystem（planning/inProgress/completed）の実装追加 | |

# タスク計画書: 組織統計情報画面 API実装

## メタデータ
- **作成日時**: 2026-02-25 18:00
- **タスクID**: 組織統計情報画面_API実装
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

組織統計情報画面（`OrganizationStatistics.tsx`）を静的モックデータから実際のAPIへ接続する。
バックエンドに統計情報取得APIを新規実装し、フロントエンドをAPI連携に更新する。

## 目的と期待される成果

- [ ] 組織統計情報APIエンドポイントを実装
- [ ] フロントエンドをAPI連携に切り替え
- [ ] モックデータファイル（organization-statistics.json）を削除

## 統計値仕様

| 統計項目 | 分子（count） | 分母（total） | データソース |
|----------|--------------|--------------|-------------|
| アクティブユーザー | Redisセッションで組織IDが一致するトークン数 | organization_userテーブルの組織IDレコード数 | Redis + PostgreSQL |
| プロジェクト数 | projectテーブルの組織IDに紐づくレコード数 | 環境変数 MAX_PROJECTS_PER_ORG | PostgreSQL + 環境変数 |
| ストレージ使用量 | StorageService.listFiles()で組織IDフォルダ配下の全ファイルサイズ合計（GB） | 環境変数 MAX_STORAGE_GB_PER_ORG | StorageService + 環境変数 |

## 実装ステップ

- [ ] タスク計画書作成
- [ ] バックエンド: Repository実装（organizationStatisticsRepository.ts）
- [ ] バックエンド: Service実装（organizationStatisticsService.ts）
- [ ] バックエンド: Controller実装（organizationStatisticsController.ts）
- [ ] バックエンド: Route追加（organizationRoutes.ts）
- [ ] バックエンド: 型定義追加（database.ts）
- [ ] フロントエンド: APIサービス実装（organizationStatisticsApiService.ts）
- [ ] フロントエンド: コンポーネント更新（OrganizationStatistics.tsx）
- [ ] モックデータ削除（organization-statistics.json）

## 変更ファイル

### 新規作成
1. `docs/20260225_1800_組織統計情報画面_API実装/PLAN.md` - タスク計画書
2. `backend/src/repositories/organizationStatisticsRepository.ts` - Repository層
3. `backend/src/services/organizationStatisticsService.ts` - Service層
4. `backend/src/controllers/organizationStatisticsController.ts` - Controller層
5. `frontend/src/services/organizationStatisticsApiService.ts` - フロントエンドAPIサービス

### 変更
1. `backend/src/routes/organizationRoutes.ts` - 新エンドポイント追加
2. `backend/src/types/database.ts` - 統計情報型定義追加
3. `frontend/src/components/SystemManagement/OrganizationStatistics.tsx` - API連携

### 削除
1. `frontend/mock/data/organization-statistics.json` - モックデータ

## 新規API

```
GET /api/v1/systemManagement/organization/statistics
```

レスポンス:
```json
{
  "success": true,
  "data": {
    "storage": { "used": 0.077, "total": 999.0, "unit": "GB", "usageRate": 0.0001 },
    "projects": { "count": 14, "total": 999 },
    "activeUsers": { "count": 4, "total": 25 }
  }
}
```

## 環境変数（追加）

```
MAX_PROJECTS_PER_ORG=999
MAX_STORAGE_GB_PER_ORG=999.0
```

## 承認記録
- **計画書提示日時**: 2026-02-25 18:00
- **承認日時**: 2026-02-25 18:00

# タスク計画書: 情報ダウンロード機能実装

## メタデータ
- **作成日時**: 2026-02-26 16:40
- **タスクID**: information-csv-download
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

組織管理画面（プロバイダーメニュー）に「情報ダウンロード」機能を追加する。
全組織の情報をCSV形式でダウンロードする機能で、ファイル名は `information_yyyyMMddhhmmss.csv`。

## 出力カラム仕様

| カラム名 | データソース |
|---------|------------|
| 組織CD | organization.organization_cd |
| 組織表示名 | organization.organization_display_name |
| 組織e-mail | organization.organization_email |
| 代表システム管理者 | organization.chief_user_id → organization_user.user_name |
| 会社名 | organization.corporation_id → corporation.corporation_name |
| ストレージ使用量 | Swift(S3)ファイルサイズ合計 / MAX_STORAGE_GB_PER_ORG GB |
| プロジェクト数 | COUNT(project) / MAX_PROJECTS_PER_ORG |
| アクティブユーザー数 | is_active=trueのCOUNT / 総ユーザーCOUNT |

## 実装ステップ

- [ ] タスク計画書作成
- [ ] バックエンド: Repository層（findAllWithStats追加）
- [ ] バックエンド: Service層（downloadOrganizationsInformation追加）
- [ ] バックエンド: Controller層（downloadInformationCsv追加）
- [ ] バックエンド: Route（/organization/download-information-csv追加）
- [ ] フロントエンド: OrganizationManagement.tsx（情報DLボタン追加）
- [ ] api_list.md更新

## 変更ファイル

1. `backend/src/repositories/organizationManagementRepository.ts` - findAllWithStats追加
2. `backend/src/services/organizationService.ts` - downloadOrganizationsInformation追加
3. `backend/src/controllers/organizationController.ts` - downloadInformationCsv追加
4. `backend/src/routes/organizationRoutes.ts` - GETルート追加
5. `frontend/src/components/Provider/OrganizationManagement.tsx` - 情報DLボタン追加
6. `docs/design/api/api_list.md` - API一覧更新

## 承認記録
- **承認日時**: 2026-02-26 16:44

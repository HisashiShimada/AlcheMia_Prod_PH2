# タスク計画書: みなし進捗使用フラグ追加

## メタデータ
- **作成日時**: 2026-03-03 11:58
- **タスクID**: use_deemed_progress_column
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要
組織管理画面の一覧・ダイアログ・CSV処理に「みなし進捗使用フラグ」を追加する。
DBは `organization.use_deemed_progress`（BOOLEAN）からデータ取得。
表示: `true` → 'あり' / `false` → 'なし'

## 実装ステップ
- [x] タスク計画書作成
- [ ] SQLファイル修正（findAll.sql, findById.sql, create.sql, update.sql）
- [ ] Repository修正（OrganizationRow型, create/updateメソッド）
- [ ] Service修正（OrganizationResponse型, マッピング, CSV処理）
- [ ] Controller修正（CSVダウンロードマッピング）
- [ ] フロントエンド修正（型定義, テーブル列, ダイアログ）

## 変更ファイル
1. `backend/src/sql/queries/organizations/findAll.sql`
2. `backend/src/sql/queries/organizations/findById.sql`
3. `backend/src/sql/queries/organizations/create.sql`
4. `backend/src/sql/queries/organizations/update.sql`
5. `backend/src/repositories/organizationManagementRepository.ts`
6. `backend/src/services/organizationService.ts`
7. `backend/src/controllers/organizationController.ts`
8. `frontend/src/components/Provider/OrganizationManagement.tsx`

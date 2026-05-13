# タスク計画書: プロジェクト管理画面 詳細検索機能削除

## メタデータ
- **作成日時**: 2026-03-05 15:28
- **タスクID**: project-search-removal
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

プロジェクト管理画面の「詳細検索」ボタンと関連する機能をフロントエンド・バックエンド含めて完全削除する。
file_metadataテーブルのmaiml_*カラムは`maimlService.ts`（MAIMLファイル保存時のメタデータ抽出）でも使用されており、
他用途があるため**DBカラムおよびDBマイグレーションは削除しない**。

## 調査結果

### 削除対象

#### フロントエンド
1. `frontend/src/components/project/ProjectManagement.tsx`
   - 詳細検索ボタン（`<Button ... onClick={() => setSearchModalOpen(true)}>詳細検索</Button>`）
   - `searchModalOpen` state定義
   - `ProjectSearchModal` import文
   - `<ProjectSearchModal ...>` コンポーネント使用部分
2. `frontend/src/components/project/ProjectSearchModal.tsx` - **ファイルごと削除**
3. `frontend/src/services/projectApiService.ts`
   - `searchProjectsByMaiml` 関数
4. `frontend/src/types/project.ts`
   - `MaimlSearchCriterion` インターフェース
   - `MaimlSearchProjectResult` インターフェース
   - `MaimlSearchResponseData` インターフェース

#### バックエンド
1. `backend/src/controllers/projectController.ts`
   - `searchProjects` 関数
2. `backend/src/routes/projectRoutes.ts`
   - `POST /api/v1/projects/search` ルート定義
3. `backend/src/services/projectService.ts`
   - `searchProjects` メソッド
   - `FileMetadataRepository`, `MaimlSearchCriteria`, `MaimlSearchResult` import
4. `backend/src/repositories/fileMetadataRepository.ts`
   - `MaimlSearchCriteria` インターフェース
   - `MaimlSearchResult` インターフェース
   - `ATTRIBUTE_TO_COLUMN` 定数
   - `searchByMaimlMetadata` メソッド
5. `backend/src/sql/queries/projectSearch/searchByMaimlMetadata.sql` - **ファイルごと削除**

#### DBカラム（削除しない）
- `file_metadata`テーブルの`maiml_*`カラム（13個）は`maimlService.ts`でも使用されているため削除しない

## 変更ファイル一覧

### 修正ファイル
1. `frontend/src/components/project/ProjectManagement.tsx` - 詳細検索ボタン・import・state・Modal削除
2. `frontend/src/services/projectApiService.ts` - `searchProjectsByMaiml`関数削除
3. `frontend/src/types/project.ts` - MaimlSearch関連型定義削除
4. `backend/src/controllers/projectController.ts` - `searchProjects`関数削除、import削除
5. `backend/src/routes/projectRoutes.ts` - `/search`ルート削除
6. `backend/src/services/projectService.ts` - `searchProjects`メソッド削除、import削除
7. `backend/src/repositories/fileMetadataRepository.ts` - MAIML検索関連コード削除

### 削除ファイル
1. `frontend/src/components/project/ProjectSearchModal.tsx`
2. `backend/src/sql/queries/projectSearch/searchByMaimlMetadata.sql`

### 変更なし（他で使用中のため保持）
- `backend/migrations/20260220_add_maiml_search_metadata_columns.sql`
- `file_metadata`テーブルの`maiml_*`カラム
- `backend/src/services/maimlService.ts`（maiml_*カラムへの書き込みはそのまま）

## テスト計画
- [ ] フロントエンドビルドエラーなし
- [ ] 詳細検索ボタンがUI上に表示されないこと
- [ ] 他の機能（プロジェクト一覧・ファイル管理等）が正常動作すること

# タスク計画書: プロジェクト管理画面 詳細検索修正

## メタデータ
- **作成日時**: 2026-03-04 11:55
- **タスクID**: 詳細検索修正
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

プロジェクト管理画面の「詳細検索」ボタンが動いていない（モックデータを返すのみ）。  
Referenceの仕様（`/enhanced/search/maiml` エンドポイント）に追従し、実際のAPIで検索できるようにする。  
さらに、検索結果でプロジェクトを選ぶ際に「セマンティック検索の検索結果でプロジェクトを選ぶ時と同じ状態」（左ペインのプロジェクトが選択状態になる）にする。

## 調査結果

### 問題箇所

1. **`frontend/src/components/project/ProjectSearchModal.tsx`**
   - `handleSearch()` 内がモックデータを返すだけで実際のAPIを呼んでいない
   - `TODO: 実際のAPI呼び出しに置き換える` のコメントが残っている

2. **バックエンドに MAIML 詳細検索エンドポイントが存在しない**
   - Reference では `POST /enhanced/search/maiml` を呼んでいるが、現行バックエンドには未実装
   - ただし `file_metadata` テーブルには MAIML 検索用カラムが存在する（2026-02-20 マイグレーション済み）

### セマンティック検索での「プロジェクト選択」の仕組み（正常動作）

`TransitionSetSearchModal.tsx` → `SearchResults.tsx` の `onOpenProject` コールバック  
→ `ProjectManagement.tsx` の `handleProjectSelect(target.id)` が呼ばれる

`ProjectSearchModal.tsx` では `onProjectSelect(project.id)` を呼んでいるが、  
それは `ProjectManagement.tsx` 側で `handleProjectSelect(projectId)` に渡されているので、  
**検索が動けばプロジェクト選択の動作は正しくなる**はず。  
（現在はモックの固定ID `'project_001'` を渡しているため、実際のプロジェクトと一致しない）

### 対応方針

**バックエンドに MAIML 詳細検索エンドポイントを新規実装し、フロントエンドから呼び出す。**

検索ロジック:
- `file_metadata` テーブルの MAIML 検索カラムを使用
- 検索条件（attribute + value）の AND 条件で絞り込み
- 結果からプロジェクト名を特定し、`project` テーブルの情報を JOIN して返す
- レスポンスに `projectId` を含めることで、フロントエンドが選択状態にできる

## 実装ステップ

### Phase 1: バックエンド実装

- [ ] `backend/src/routes/projectRoutes.ts` に検索エンドポイント追加
  - `POST /api/v1/projects/search/maiml`
- [ ] `backend/src/controllers/projectController.ts` に `searchByMaiml` コントローラー追加
- [ ] `backend/src/services/projectSearchService.ts` を新規作成（検索ロジック）
- [ ] `backend/src/repositories/projectSearchRepository.ts` を新規作成（DB検索クエリ）
- [ ] `backend/src/sql/queries/projectSearch/searchByMaiml.sql` を新規作成

### Phase 2: フロントエンド実装

- [ ] `frontend/src/services/projectApiService.ts` に `searchProjectsByMaiml` 関数追加
- [ ] `frontend/src/components/project/ProjectSearchModal.tsx` の `handleSearch` を実際のAPI呼び出しに修正
  - モックデータを削除
  - レスポンスの `projectId` を使ってプロジェクト選択が動作するよう修正

## 変更ファイル

### 新規作成
1. `backend/src/services/projectSearchService.ts` - 検索ビジネスロジック
2. `backend/src/repositories/projectSearchRepository.ts` - DB検索クエリ
3. `backend/src/sql/queries/projectSearch/searchByMaiml.sql` - 検索SQL

### 修正
1. `backend/src/routes/projectRoutes.ts` - エンドポイント追加
2. `backend/src/controllers/projectController.ts` - コントローラー追加
3. `frontend/src/services/projectApiService.ts` - API関数追加
4. `frontend/src/components/project/ProjectSearchModal.tsx` - モック削除・実API接続

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| file_metadata に maiml カラムが未入力 | 中 | 中 | 検索結果0件として正常動作させる（エラーにしない） |
| projectId がプロジェクト一覧に存在しない | 低 | 低 | onProjectSelect でフィルタリング済み |

## 承認記録
- **計画書提示日時**: 2026-03-04 11:55
- **承認日時**: 

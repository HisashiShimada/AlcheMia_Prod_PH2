# タスク計画書: MAIMLファイル取得API - SQLクエリ外部化

## メタデータ
- **作成日時**: 2026-02-19 00:02
- **タスクID**: maiml-api-sql-externalization
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

pg-promiseライブラリを使用して、MAIMLファイル取得API（GET /api/v1/projects/:projectId/maiml）で使用されているSQLクエリを外部ファイル化します。

## 2. 目的と期待される成果

### 目的
- SQLクエリをコード内から分離し、保守性を向上させる
- pg-promiseのベストプラクティスに従った実装にする
- departmentRepositoryと同様のパターンを適用する

### 期待される成果
- [ ] SQLクエリファイルが作成されている
- [ ] projectServiceがpg-promiseとloadSqlFileを使用している
- [ ] 既存の機能が正常に動作している

## 3. 対象API

**エンドポイント**: GET /api/v1/projects/:projectId/maiml

**処理フロー**:
```
projectRoutes.ts (Router)
  ↓
projectController.ts (getProjectMaiml)
  ↓
projectService.ts (getProjectMaiml)
  ↓
PostgreSQL (2つのSQLクエリ)
  ↓
storageService (S3からMAIMLファイル取得)
```

## 4. 使用されているSQLクエリ

### クエリ1: 組織プレフィックス取得
```sql
SELECT organization_prefix 
FROM organization 
WHERE organization_id = $1
```

**用途**: S3パス構築に使用する組織プレフィックスを取得

### クエリ2: プロジェクト存在確認
```sql
SELECT project_id, project_name
FROM project
WHERE organization_id = $1 AND project_id = $2
```

**用途**: 
- プロジェクトの存在確認（マルチテナント分離）
- project_nameを取得してS3パス構築に使用

## 5. 実装ステップ

### Phase 1: SQLファイルの作成
- [ ] `backend/src/sql/queries/projects/` ディレクトリ作成
- [ ] `getOrganizationPrefix.sql` ファイル作成
- [ ] `findByIdForMaiml.sql` ファイル作成

### Phase 2: projectService.tsの修正
- [ ] `getPgp()` と `loadSqlFile()` のインポート追加
- [ ] `getProjectMaiml` メソッドを修正
  - [ ] クエリ1を外部SQLファイルに置き換え
  - [ ] クエリ2を外部SQLファイルに置き換え
  - [ ] pg-promiseのクエリメソッド使用（oneOrNone, any等）

### Phase 3: テスト実施
- [ ] 既存のAPIが正常に動作することを確認
- [ ] エラーケース（プロジェクト不在、組織不在）の動作確認

## 6. 変更ファイル

### 新規作成
1. `backend/src/sql/queries/projects/getOrganizationPrefix.sql` - 組織プレフィックス取得クエリ
2. `backend/src/sql/queries/projects/findByIdForMaiml.sql` - プロジェクト情報取得クエリ

### 修正
1. `backend/src/services/projectService.ts` - getProjectMaimlメソッドのSQL外部化

## 7. 技術的詳細

### pg-promiseのクエリメソッド選択

#### getOrganizationPrefix.sql
- **使用メソッド**: `oneOrNone()`
- **理由**: 0件または1件を期待（organization_idは主キー）
- **エラーハンドリング**: nullの場合はRESORCE_NOT_FOUNDエラー

#### findByIdForMaiml.sql
- **使用メソッド**: `oneOrNone()`
- **理由**: 0件または1件を期待（project_id + organization_idは一意）
- **エラーハンドリング**: nullの場合はRESOURCE_NOT_FOUNDエラー

### パラメータバインディング
- pg-promiseは `$1`, `$2`, ... の形式でパラメータバインディング
- 配列形式でパラメータを渡す: `pgp.oneOrNone(sql, [organizationId])`

### エラーハンドリング
- SQLファイル読み込みエラー: loadSqlFile内でthrow
- クエリ実行エラー: try-catch でキャッチしてSYSTEM_DATABASE_ERRORを返却
- レコード不在: nullチェックでRESOURCE_NOT_FOUNDを返却

## 8. 参考実装

### departmentRepository.tsの実装パターン
```typescript
const pgp = getPgp();
let sqlQuery = await loadSqlFile('departments/findAll.sql');
const result = await pgp.any<DepartmentRow>(sqlQuery, params);
```

### 本タスクで適用するパターン
```typescript
const pgp = getPgp();

// クエリ1: 組織プレフィックス取得
const orgSql = await loadSqlFile('projects/getOrganizationPrefix.sql');
const orgResult = await pgp.oneOrNone(orgSql, [organizationId]);

if (!orgResult) {
  return { success: false, error: { code: 'RESOURCE_NOT_FOUND', ... } };
}

// クエリ2: プロジェクト取得
const projectSql = await loadSqlFile('projects/findByIdForMaiml.sql');
const projectResult = await pgp.oneOrNone(projectSql, [organizationId, projectId]);

if (!projectResult) {
  return { success: false, error: { code: 'RESOURCE_NOT_FOUND', ... } };
}
```

## 9. セキュリティ考慮事項

### マルチテナント分離
- [ ] 組織プレフィックス取得クエリで`organization_id`フィルタが必須
- [ ] プロジェクト取得クエリで`organization_id`フィルタが必須
- [ ] SQLインジェクション対策（Parameterized Query使用）

### アクセス制御
- [ ] ルート定義で`checkPermission('050000', 0)`が適用済み
- [ ] テナント分離ミドルウェアが適用済み

## 10. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| SQLファイル読み込み失敗 | 高 | 低 | loadSqlFile内でエラーメッセージを明確化 |
| pg-promiseメソッド選択ミス | 中 | 低 | oneOrNone()で0/1件を明確に処理 |
| 既存機能の破壊 | 高 | 低 | 修正後に動作確認テスト実施 |
| パフォーマンス劣化 | 低 | 低 | 外部ファイル読み込みはキャッシュされる |

## 11. テスト計画

### ユニットテスト
- [ ] SQLファイルが正しく読み込まれるか
- [ ] pg-promiseのクエリが正常に実行されるか
- [ ] パラメータバインディングが正しく動作するか

### 統合テスト
- [ ] GET /api/v1/projects/:projectId/maiml が正常に動作するか
- [ ] 組織IDが異なる場合に404エラーが返されるか
- [ ] プロジェクトIDが存在しない場合に404エラーが返されるか
- [ ] MAIMLファイルが存在しない場合に404エラーが返されるか

### 手動テスト
- [ ] Postmanで正常系をテスト
- [ ] Postmanで異常系（存在しないプロジェクトID）をテスト
- [ ] フロントエンドの「指示確認タブ」でフロー図が表示されるか

## 12. ロールバック計画

修正前のコードをバックアップし、問題が発生した場合は以下の手順で復旧:

1. `projectService.ts` の `getProjectMaiml` メソッドを元に戻す
2. 作成したSQLファイルを削除
3. npm run buildでビルドし直す
4. サーバー再起動

## 13. 関連ドキュメント

- [.clinerules/development/backend.md](../../.clinerules/development/backend.md) - バックエンド規約
- [.clinerules/development/security.md](../../.clinerules/development/security.md) - セキュリティ規約
- [backend/src/repositories/departmentRepository.ts](../../backend/src/repositories/departmentRepository.ts) - 参考実装
- [backend/src/database/db.ts](../../backend/src/database/db.ts) - pg-promise設定

## 14. 承認記録

- **計画書提示日時**: 2026-02-19 00:02
- **承認日時**: (承認後に記入)
- **承認者コメント**: (ユーザーからのフィードバック)

## 15. 実施記録

### 実施日時
開始: (作業開始時に記入)
完了: (作業完了時に記入)

### 計画からの変更点
(実施中に発生した計画からの変更や追加作業)

### 発生した問題と解決方法
(実施中に発生した問題とその解決方法)

### 最終的な成果物
- [ ] SQLファイル作成完了
- [ ] projectService修正完了
- [ ] テスト完了

## 16. 振り返り

### うまくいった点
(成功要因)

### 改善が必要な点
(今後の改善点)

### 学んだこと
(このタスクから得られた知見)

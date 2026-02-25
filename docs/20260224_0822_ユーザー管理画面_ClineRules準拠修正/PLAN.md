# タスク計画書: ユーザー管理画面 ClineRules準拠修正

## メタデータ
- **作成日時**: 2026-02-24 08:22
- **タスクID**: user_management_clinerules_fix
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

ユーザー管理画面の実装コードを、APIポリシーとClineRulesに準拠するように修正します。

## 2. 目的と期待される成果

### 目的
- ClineRulesに完全準拠したコードベースの実現
- 保守性・安全性・可読性の向上
- プロジェクト全体の実装パターン統一

### 期待される成果
- [x] Repository層のpg-promise統一化（getPool → getPgp）
- [x] 動的フィルタのSQLクエリ構築方法改善
- [x] 型定義のtypes/database.tsへの移動
- [x] コンソールログの削除または整理

## 3. 実装ステップ

### Phase 1: 型定義の整理
- [x] `backend/src/types/database.ts`にUser関連の型定義を追加
- [x] `backend/src/repositories/userRepository.ts`から型定義をインポートに変更

### Phase 2: Repository層のpg-promise統一化
- [x] `findById()`をpg-promiseに変更
- [x] `existsById()`をpg-promiseに変更
- [x] `create()`をpg-promiseに変更
- [x] `update()`をpg-promiseに変更
- [x] `updateStatus()`をpg-promiseに変更
- [x] `deleteById()`をpg-promiseに変更

### Phase 3: 動的フィルタの改善
- [x] 文字列置換方式から動的クエリビルダー方式に変更
- [x] SQLインジェクション対策の維持
- [x] 可読性とメンテナンス性の向上

### Phase 4: デバッグログの整理
- [x] 本番環境で不要なconsole.logを削除
- [x] 必要なログはwinstonなどのロガーに変更（または環境変数で制御）

## 4. 影響範囲

### 変更するファイル
1. `backend/src/types/database.ts` - User関連型定義追加
2. `backend/src/repositories/userRepository.ts` - pg-promise統一、動的フィルタ改善
3. `backend/src/services/userService.ts` - 型インポート変更
4. `backend/src/controllers/userController.ts` - 型インポート変更、ログ整理
5. `frontend/src/services/userApiService.ts` - ログ整理（オプション）
6. `frontend/src/components/SystemManagement/UserManagement.tsx` - ログ整理（オプション）

### 影響を受ける機能
- ユーザー一覧取得
- ユーザー詳細取得
- ユーザー作成
- ユーザー更新
- ユーザーステータス更新
- CSV操作

### 影響範囲の評価
- **DB操作の変更**: あり（pg-promiseへの移行）
- **API仕様の変更**: なし
- **フロントエンド動作への影響**: なし
- **後方互換性**: 維持

## 5. 技術的詳細

### pg-promiseへの統一
```typescript
// Before（getPool使用）
const pool: Pool = getPool();
const result = await pool.query(query, params);

// After（getPgp使用）
const pgp = getPgp();
const result = await pgp.oneOrNone<UserRow>(query, params);
```

### 動的フィルタの改善
```typescript
// Before（文字列置換）
sqlQuery = sqlQuery.replace('ORDER BY', `AND ... ORDER BY`);

// After（動的クエリ構築）
const conditions: string[] = ['ou.organization_id = $1'];
const params: any[] = [organizationId];
if (filters.search) {
  conditions.push(`(ou.user_name ILIKE $${params.length + 1} ...)`);
  params.push(`%${filters.search}%`);
}
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| pg-promiseの動作不一致 | 中 | 低 | 既存テストで動作確認 |
| 動的クエリのバグ | 中 | 低 | 各フィルタ条件をテスト |
| 型定義移動による参照エラー | 低 | 低 | TypeScriptコンパイルエラーで検出 |

## 7. テスト計画

### 手動テスト
- [ ] ユーザー一覧取得（フィルタなし）
- [ ] ユーザー一覧取得（検索フィルタ）
- [ ] ユーザー一覧取得（部署フィルタ）
- [ ] ユーザー一覧取得（ロールフィルタ）
- [ ] ユーザー一覧取得（複数フィルタ組み合わせ）
- [ ] ユーザー詳細取得
- [ ] ユーザー作成
- [ ] ユーザー更新
- [ ] ユーザーステータス更新
- [ ] CSVダウンロード
- [ ] CSVアップロード

## 8. ロールバック計画

- Gitで修正前の状態にrevert可能
- データベースマイグレーションは不要（テーブル構造変更なし）

## 9. 関連ドキュメント

- `.clinerules/development/database.md` - Repository層のSQL管理規約
- `.clinerules/development/typescript.md` - TypeScript型定義規約
- `docs/design/api/api_user_management.md` - API仕様書

## 10. 承認記録

- **計画書提示日時**: 2026-02-24 08:22
- **承認日時**: 2026-02-24 08:22（即時実施）
- **承認者コメント**: Act Modeで即時修正を実施

## 11. 実施記録

### 実施日時
開始: 2026-02-24 08:22

### 計画からの変更点
- なし（計画通り実施）

### 発生した問題と解決方法
- （実施中に記録）

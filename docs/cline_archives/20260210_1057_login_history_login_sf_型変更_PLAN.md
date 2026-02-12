# タスク計画書: login_historyテーブルのlogin_sfカラム型変更

## メタデータ
- **作成日時**: 2026-02-10 10:57
- **タスクID**: login_sf_type_change
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

login_historyテーブルの`login_sf`カラムが現在`CHARACTER VARYING(10)`型になっているが、ログイン成否を表すフラグなので`BOOLEAN`型に変更する。

## 2. 目的と期待される成果

### 目的
- データ型の整合性を確保する
- ログイン成否という真偽値を適切な型で管理する
- データベース容量の最適化（VARCHAR(10)からBOOLEANへ）
- クエリパフォーマンスの向上

### 期待される成果
- [ ] DDLファイルの更新
- [ ] マイグレーションファイルの作成
- [ ] 関連コードの型定義更新
- [ ] テストコードの更新
- [ ] 動作確認完了

## 3. 実装ステップ

### Phase 1: 現状調査
- [x] DDLファイルの確認（CHARACTER VARYING(10)を確認）
- [ ] 関連コードの洗い出し
  - [ ] loginHistoryRepository.ts
  - [ ] authController.ts
  - [ ] rateLimitMiddleware.ts
  - [ ] 型定義ファイル
- [ ] テストコードの洗い出し

### Phase 2: DDLとマイグレーション作成
- [ ] DDLファイル更新（`login_history.sql`）
  - [ ] `login_sf`カラムの型を`BOOLEAN`に変更
  - [ ] デフォルト値の検討
- [ ] マイグレーションファイル作成
  - [ ] 既存データの変換ロジック（'success'/'failure' → true/false）
  - [ ] ALTER TABLE文の作成
  - [ ] ロールバック用のDOWN文

### Phase 3: コード修正
- [ ] TypeScript型定義の更新
  - [ ] `login_sf: string` → `login_sf: boolean`
- [ ] リポジトリ層の修正
  - [ ] INSERT文のデータ変換
  - [ ] SELECT文の結果処理
- [ ] コントローラー層の修正
  - [ ] ログイン成功時: `login_sf: true`
  - [ ] ログイン失敗時: `login_sf: false`
- [ ] ミドルウェア層の修正
  - [ ] レート制限判定でのboolean比較

### Phase 4: テストコード修正
- [ ] loginHistoryRepository.test.ts
  - [ ] モックデータの更新
  - [ ] アサーション修正
- [ ] authController.test.ts
  - [ ] ログイン成功・失敗時のテスト
- [ ] rateLimitMiddleware.test.ts
  - [ ] レート制限判定のテスト

### Phase 5: 動作確認
- [ ] ローカル環境でマイグレーション実行
- [ ] ログイン成功時の動作確認
- [ ] ログイン失敗時の動作確認
- [ ] レート制限の動作確認
- [ ] テスト全実行

## 4. 影響範囲

### 変更するファイル
1. `docs/design/db/ddl/login_history.sql` - カラム型定義変更
2. `backend/migrations/20260210_alter_login_history_login_sf.sql` - マイグレーションファイル（新規作成）
3. `backend/src/repositories/loginHistoryRepository.ts` - データ挿入・取得処理
4. `backend/src/controllers/authController.ts` - ログイン処理
5. `backend/src/middleware/rateLimitMiddleware.ts` - レート制限判定
6. `backend/src/types/*.ts` - 型定義ファイル
7. `backend/tests/repositories/loginHistoryRepository.test.ts` - テストコード
8. `backend/tests/controllers/authController.test.ts` - テストコード
9. `backend/tests/middleware/rateLimitMiddleware.test.ts` - テストコード

### 影響を受ける機能
- ログイン機能全般
- ログイン履歴の記録
- レート制限機能
- 監査ログの参照

## 5. 技術的詳細

### データ型変更の方針

#### 変換ルール
```sql
-- 既存データの変換
'success' → true
'failure' → false
'true' → true
'false' → false
NULL → NULL（そのまま）
```

#### マイグレーションSQL
```sql
-- UP: CHARACTER VARYING → BOOLEAN
ALTER TABLE login_history 
ALTER COLUMN login_sf TYPE BOOLEAN 
USING CASE 
    WHEN login_sf IN ('success', 'true', '1') THEN TRUE
    WHEN login_sf IN ('failure', 'false', '0') THEN FALSE
    ELSE NULL
END;

-- DOWN: BOOLEAN → CHARACTER VARYING (ロールバック用)
ALTER TABLE login_history 
ALTER COLUMN login_sf TYPE CHARACTER VARYING(10) 
USING CASE 
    WHEN login_sf = TRUE THEN 'success'
    WHEN login_sf = FALSE THEN 'failure'
    ELSE NULL
END;
```

### コード変更例

#### Before (現状)
```typescript
// Repository
await pool.query(
  'INSERT INTO login_history (user_name, login_sf) VALUES ($1, $2)',
  [username, 'success']
);

// Controller
const history = {
  login_sf: 'success' as string
};
```

#### After (変更後)
```typescript
// Repository
await pool.query(
  'INSERT INTO login_history (user_name, login_sf) VALUES ($1, $2)',
  [username, true]
);

// Controller
const history = {
  login_sf: true as boolean
};
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存データの変換失敗 | 高 | 低 | マイグレーション前にバックアップ、変換ロジックのテスト |
| 実行中のセッションへの影響 | 中 | 中 | メンテナンス時間帯に実施、ALTER TABLEは短時間で完了 |
| 関連コードの修正漏れ | 中 | 中 | TypeScriptの型チェックで検出、全テスト実行 |
| レート制限機能の誤動作 | 高 | 低 | テストで十分に確認、ログ監視 |

## 7. テスト計画

### ユニットテスト
- [ ] loginHistoryRepository.create() - boolean値でINSERT
- [ ] loginHistoryRepository.findRecentFailures() - boolean値でフィルタ
- [ ] authController.login() - 成功時true、失敗時false
- [ ] rateLimitMiddleware - boolean比較での判定

### 統合テスト
- [ ] ログイン成功 → login_sf=true でDB登録
- [ ] ログイン失敗 → login_sf=false でDB登録
- [ ] レート制限 → 失敗回数カウント（login_sf=falseで集計）

### 手動テスト
- [ ] 正常ログイン → データベース確認
- [ ] パスワード誤りログイン → データベース確認
- [ ] 5回連続失敗 → レート制限発動確認

## 8. ロールバック計画

### マイグレーションのロールバック
```bash
# マイグレーションファイルのDOWN文を実行
psql -d mmdpf -f backend/migrations/20260210_alter_login_history_login_sf_down.sql
```

### コードのロールバック
```bash
git revert <commit-hash>
```

## 9. 関連ドキュメント

- [データベース構造定義](.clinerules/references/db_structure.md)
- [データベーステーブル一覧](docs/design/db/db_table_list.md)
- [セキュリティ規約](.clinerules/development/security.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-10 10:57
- **承認日時**: （承認待ち）
- **承認者コメント**: 

## 11. 実施記録

### 実施日時
開始: （未実施）
完了: （未実施）

### 計画からの変更点
（実施後に記入）

### 発生した問題と解決方法
（実施後に記入）

### 最終的な成果物
- [ ] DDLファイル更新完了
- [ ] マイグレーションファイル作成完了
- [ ] 関連コード修正完了
- [ ] テストコード修正完了
- [ ] 動作確認完了

## 12. 振り返り

### うまくいった点
（実施後に記入）

### 改善が必要な点
（実施後に記入）

### 学んだこと
（実施後に記入）

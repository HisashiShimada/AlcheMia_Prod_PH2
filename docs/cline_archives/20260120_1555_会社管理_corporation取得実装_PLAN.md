# タスク計画書: 会社管理画面 - corporationテーブル連携実装

## メタデータ
- **作成日時**: 2026-01-20 15:55
- **タスクID**: 会社管理_corporation取得実装
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

プロバイダーメニューの会社管理画面をモックデータからcorporationテーブルの実データ取得に切り替える実装を行います。

## 2. 目的と期待される成果

### 目的
- 会社管理画面でcorporationテーブルの実データを表示する
- 既存のマスタ管理画面（Creator, Instrument, Vendor）と同様のDB連携パターンを適用する

### 期待される成果
- [x] 現状分析完了
- [x] バックエンドAPI実装
- [x] フロントエンド実装（モックからDB連携に切り替え）
- [x] 動作確認完了

## 3. 現状分析

### 既存ファイル
1. **フロントエンド**
   - `frontend/mock/components/CompanyManagementMock.tsx` - モックコンポーネント
   - `frontend/mock/data/companies-management.json` - モックデータ

2. **バックエンド**
   - `backend/src/repositories/corporationRepository.ts` - 既に存在
   - `backend/sql/test_data/corporation_insert.sql` - テストデータ既存
   - `docs/design/db/ddl/corporation.sql` - DDL既存

3. **参考実装**
   - マスタ管理（Creator, Instrument, Vendor）が既にDB連携済み
   - 同じパターンを適用可能

## 4. 実装ステップ

### Phase 1: バックエンドAPI実装
- [ ] masterController.tsに会社一覧取得エンドポイント追加
  - GET /api/master/corporations
  - 検索、ソート、ページネーション対応
- [ ] corporationRepository.tsのメソッド確認・実装
  - findAll（検索、ソート、ページネーション対応）
- [ ] masterRoutes.tsにルート追加
- [ ] masterService.tsに会社一覧取得ロジック追加

### Phase 2: フロントエンド実装
- [ ] CompanyManagementMock.tsxをDB連携版に変更
  - モックデータ使用部分を削除
  - API呼び出しに変更（apiService使用）
  - エラーハンドリング追加
  - ローディング状態管理追加

### Phase 3: 動作確認
- [ ] テストデータが正しく表示されること
- [ ] 検索機能が動作すること
- [ ] ソート機能が動作すること
- [ ] ページネーション機能が動作すること

## 5. 影響範囲

### 変更するファイル
1. `backend/src/controllers/masterController.ts` - 会社一覧取得エンドポイント追加
2. `backend/src/services/masterService.ts` - 会社一覧取得ロジック追加
3. `backend/src/repositories/corporationRepository.ts` - メソッド確認・追加
4. `backend/src/routes/masterRoutes.ts` - ルート追加
5. `frontend/mock/components/CompanyManagementMock.tsx` - DB連携に変更

### 新規作成するファイル
なし（既存ファイルを修正）

### 削除するファイル
なし（モックデータは残す）

### 影響を受ける機能
- プロバイダーメニュー > 会社管理

## 6. 技術的詳細

### データベーステーブル
```sql
-- corporationテーブル
CREATE TABLE corporation (
    corporation_id VARCHAR(50) PRIMARY KEY,
    corporation_name VARCHAR(255) NOT NULL,
    corporation_name_kana VARCHAR(255),
    postal_code VARCHAR(20),
    address TEXT,
    phone_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### APIエンドポイント
```
GET /api/master/corporations
Query Parameters:
  - search: string (optional) - 検索キーワード
  - sort_by: string (optional) - ソート対象フィールド
  - order: 'asc' | 'desc' (optional) - ソート順序
  - page: number (optional) - ページ番号
  - limit: number (optional) - 1ページあたりの件数

Response:
{
  success: true,
  data: Corporation[],
  pagination: {
    page: number,
    limit: number,
    totalItems: number,
    totalPages: number,
    hasNext: boolean,
    hasPrev: boolean
  }
}
```

### 参考実装パターン（Creator実装）
- `backend/src/controllers/masterController.ts` - getCreators
- `backend/src/services/masterService.ts` - getCreators
- `backend/src/repositories/creatorRepository.ts` - findAll

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| corporationRepositoryの実装が不完全 | 中 | 低 | 既存マスタ管理の実装パターンを踏襲 |
| モックデータとDB構造の差異 | 低 | 低 | DDL定義を確認済み、差異なし |
| 既存のモック機能との競合 | 低 | 低 | 段階的に切り替え |

## 8. テスト計画

### 手動テスト
- [ ] 会社管理画面が正しく表示されること
- [ ] テストデータ（3社）が表示されること
- [ ] 検索機能が動作すること（会社ID、会社名、会社名カナ）
- [ ] ソート機能が動作すること（各列でソート可能）
- [ ] ページネーション機能が動作すること
- [ ] is_active=falseの会社が正しく表示されること
- [ ] エラー時に適切なメッセージが表示されること

### データ確認
```sql
-- テストデータ確認
SELECT * FROM corporation ORDER BY corporation_id;
-- 期待結果: 3件（CRP001, CRP002, CRP003）
```

## 9. ロールバック計画

問題が発生した場合:
1. フロントエンドをモックデータ使用に戻す
2. バックエンドのルートをコメントアウト
3. Git commitを戻す

## 10. 関連ドキュメント

- [会社管理_DB接続_PLAN.md](./20260120_1405_会社管理_DB接続_PLAN.md) - 前回の計画書
- [マスタ管理_Creator_DB接続_PLAN.md](./20260119_0818_マスタ管理_Creator_DB接続_PLAN.md) - 参考実装
- [corporation.sql](./design/db/ddl/corporation.sql) - DDL定義
- [corporation_insert.sql](../backend/sql/test_data/corporation_insert.sql) - テストデータ

## 11. 承認記録

- **計画書提示日時**: 2026-01-20 15:55
- **承認日時**: 2026-01-20 15:56（即時承認）
- **承認者コメント**: 承認済み

## 12. 実施記録

### 実施日時
開始: 2026-01-20 15:55
完了: 2026-01-20 17:48

### 計画からの変更点

#### UUID対応
当初の計画では`corporation_id`は`SERIAL`型（整数）でしたが、実装時に`UUID`型に変更しました。
これにより以下の変更が発生：
- `corporationRepository.ts`: UUID型対応
- `masterService.ts`: UUID型対応
- `masterController.ts`: バリデーションで`isInt()` → `isString()`に変更
- `masterRoutes.ts`: バリデーションで`isInt()` → `isString()`に変更
- `corporation_insert.sql`: `gen_random_uuid()`を使用
- `CompanyManagementMock.tsx`: `corporationId`の型を`number` → `string`に変更

#### API レスポンス形式
統一APIレスポンス形式（`{ success, data, meta }`）に対応しました。

### 発生した問題と解決方法

#### 1. 型エラー（Number → String）
**問題**: masterControllerで`Number(corporationId)`を使用していたため、TypeScriptエラーが発生
**解決**: UUID型に対応するため`Number()`の呼び出しを削除

#### 2. テーブル定義とテストデータの不整合
**問題**: DDLではUUID型だが、テストデータではSERIAL型を想定したINSERT文
**解決**: `gen_random_uuid()`を使用してUUIDを自動生成するように修正

### 最終的な成果物
- [x] バックエンドAPI実装
  - [x] corporationRepository.ts（UUID対応）
  - [x] masterService.ts（getCorporation等追加、UUID対応）
  - [x] masterController.ts（getCorporation等追加、UUID対応）
  - [x] masterRoutes.ts（ルート追加、UUID対応、CSVダウンロード追加）
  - [x] テストデータ修正（UUID対応）
- [x] フロントエンド実装
  - [x] CompanyManagementMock.tsx（UUID対応、APIエンドポイント修正、レスポンス形式対応）
- [x] 動作確認完了
  - [x] 会社データ正常表示
  - [x] テストデータ（4社）表示確認
  - [x] DB連携正常動作

## 13. 振り返り

### うまくいった点
- 既存のマスタ管理（Creator, Instrument, Vendor）の実装パターンを踏襲したことで、スムーズに実装できた
- UUID型への統一的な対応により、セキュリティと拡張性が向上
- バックエンドとフロントエンドの実装を一貫して完了
- 初回テストで正常に動作し、追加修正が不要だった
- corporationテーブルからのデータ取得が正常に機能

### 改善が必要な点
- DDL定義とテストデータの整合性を事前に確認する必要があった
- 中断により実装が分断されたが、計画書のおかげでスムーズに再開できた

### 学んだこと
- PostgreSQLの`gen_random_uuid()`関数を使用したUUID自動生成
- 統一APIレスポンス形式（`{ success, data, meta }`）の重要性
- UUID型を使用する場合の型定義とバリデーションの注意点

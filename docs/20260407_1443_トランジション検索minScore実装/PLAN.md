# タスク計画書: トランジション検索 minScore（足切りスコア）実装

## メタデータ
- **作成日時**: 2026-04-07 14:43
- **タスクID**: transition-search-min-score
- **優先度**: 中
- **推定工数**: 1〜2時間

## タスク概要

トランジション検索（セマンティック検索）において、意味的に全く関係のない文言を入力しても検索結果が返ってくる問題を修正する。

reference版実装では `minScore = 0.3` による足切りフィルタが存在していたが、現行実装への移植時に脱落しているため、これを取り込む。

## 目的と期待される成果

### 原因
- `search.sql` にスコアの下限閾値フィルタ（`WHERE score >= ?`）が存在しない
- バックエンドコントローラー（`semanticSearchController.ts`）が `min_score` パラメータを受け取っていない
- フロントエンド型定義（`SemanticSearchRequest`）に `min_score` フィールドがない

### 期待される成果
- [ ] 低スコア（デフォルト 0.3 未満）の検索結果が返らなくなる
- [ ] フロントエンドから `min_score` を指定できるようになる（将来の拡張性確保）
- [ ] reference版の設計意図（足切り 0.3）が現行実装に反映される

## 実装ステップ

### Phase 1: バックエンド — SQL修正
- [ ] `backend/src/sql/queries/semanticSearch/search.sql` に `min_score` パラメータ（`$13`）を追加
- [ ] `WHERE` 句に `AND score >= $13::float` を追加

### Phase 2: バックエンド — Repository修正
- [ ] `backend/src/repositories/semanticSearchRepository.ts` の `search()` 関数に `minScore: number` 引数を追加
- [ ] SQL呼び出し箇所に `$13` として `minScore` を渡す

### Phase 3: バックエンド — Controller修正
- [ ] `backend/src/controllers/semanticSearchController.ts` の `search()` ハンドラで `min_score` をリクエストボディから受け取る
- [ ] 環境変数 `SEMANTIC_SEARCH_MIN_SCORE`（デフォルト: `0.3`）を参照するようにする
- [ ] repository の `search()` 呼び出しに `minScore` を渡す

### Phase 4: フロントエンド — 型定義修正
- [ ] `frontend/src/types/semanticSearch.ts` の `SemanticSearchRequest` に `min_score?: number` を追加
- [ ] `SemanticSearchResponse.query_info` に `min_score` を追加（レスポンス確認用）

### Phase 5: フロントエンド — Service修正
- [ ] `frontend/src/services/semanticSearchService.ts` の `searchTransitionSets()` 呼び出し確認（型が通れば変更不要）

### Phase 6: バックエンド — Controller型定義修正
- [ ] `backend/src/types/semanticSearch.ts` の `SearchRequest` インターフェースに `min_score?: number` を追加
- [ ] `SearchResponse.query_info` に `min_score` を追加

## 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `backend/src/sql/queries/semanticSearch/search.sql` | `$13` として `min_score` を追加、WHERE句に足切り条件を追加 |
| 2 | `backend/src/repositories/semanticSearchRepository.ts` | `search()` に `minScore` 引数を追加、SQL呼び出しに `$13` を渡す |
| 3 | `backend/src/controllers/semanticSearchController.ts` | `min_score` パラメータ受け取り・デフォルト0.3設定、repository呼び出し修正 |
| 4 | `backend/src/types/semanticSearch.ts` | `SearchRequest` に `min_score?: number` 追加、`query_info` に追加 |
| 5 | `frontend/src/types/semanticSearch.ts` | `SemanticSearchRequest` に `min_score?: number` 追加 |

## 技術的詳細

### search.sql の変更方針

SQLのスコア計算はSELECT句で行われているため、WHERE句では再計算が必要（またはサブクエリ化）。
PostgreSQLでは `ORDER BY` に使った演算式を `WHERE` でそのまま使えないため、**サブクエリ方式**を採用する。

```sql
-- 変更後のイメージ
SELECT * FROM (
  SELECT
    ...,
    (
      $6::float * (1 - (emb_input <=> $2::vector)) +
      $7::float * (1 - (emb_transition <=> $3::vector)) +
      $8::float * (1 - (emb_output <=> $4::vector)) +
      $9::float * (1 - (emb_structure <=> $5::vector))
    ) AS score
  FROM transition_set
  WHERE organization_id = $1
    AND ($11::text IS NULL OR technique = $11::text)
    AND ($12::text IS NULL OR project_name = $12::text)
) sub
WHERE sub.score >= $13::float
ORDER BY sub.score DESC
LIMIT $10
```

### デフォルト値について

- `min_score` のデフォルト値は reference版と同じ **0.3** を採用
- コントローラー側でデフォルト値を持ち、フロントエンドから変更可能にする

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `min_score = 0.3` が厳しすぎて全件0件になる | 中 | 低 | UIに min_score 調整UIを後から追加可能にしておく |
| SQLのサブクエリ化でパフォーマンスが低下する | 低 | 低 | HNSW インデックスは既存のため影響軽微 |
| 既存テストが壊れる | 低 | 中 | 変更後にテスト確認 |

## テスト計画

- [ ] 無関係な文言（例: 「あいうえお」「test123」）で検索し、結果が0件になることを確認
- [ ] 意味のあるクエリで検索し、適切な結果が返ることを確認
- [ ] `min_score = 0` を指定すると全件返ることを確認（足切りなし動作確認）

## 承認記録
- **計画書提示日時**: 2026-04-07 14:43
- **承認日時**: 2026-04-07 14:53
- **承認者コメント**: フロントエンド修正不要、環境変数で調整可能にする

## 実施記録

### 実施日時
開始: 2026-04-07 14:54
完了: 2026-04-07 14:56

### 変更ファイル（実施）
1. `backend/src/sql/queries/semanticSearch/search.sql` — サブクエリ化して `WHERE sub.score >= $13::float` 足切り条件追加
2. `backend/src/repositories/semanticSearchRepository.ts` — `search()` に `minScore: number` 引数を追加、`$13` として渡す
3. `backend/src/controllers/semanticSearchController.ts` — `MIN_SCORE` 定数を追加（環境変数 `SEMANTIC_SEARCH_MIN_SCORE`、デフォルト: `0.3`）、repository 呼び出しに渡す

### 計画からの変更点
- フロントエンド・型定義の修正は不要と判断し、バックエンド3ファイルのみ変更

### 最終的な成果物
- [x] 低スコア（デフォルト 0.3 未満）の検索結果が返らなくなる
- [x] 環境変数 `SEMANTIC_SEARCH_MIN_SCORE` で閾値を調整可能
- [x] TypeScript コンパイルエラーなし

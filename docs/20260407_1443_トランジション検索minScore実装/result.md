# 修正結果レポート: トランジション検索 minScore（足切りスコア）実装

**対応日時**: 2026-04-07  
**タスクID**: transition-search-min-score

---

## 問題の概要

プロジェクト管理画面のトランジション検索（セマンティック検索）において、意味的に全く関係のない文言を入力しても検索結果が返ってくる問題が報告された。また、`E2E_TRANSITION_5-3` というレコードが全スコア 0% にもかかわらず表示され続ける問題も発生していた。

---

## 原因

### 問題1: 低スコアの結果が返る（実装漏れ）

reference版の実装には `minScore = 0.3` によるスコア足切りフィルタが存在していたが、現行実装への移植時に脱落していた。

- `search.sql` にスコア下限の `WHERE` 条件が存在しなかった
- バックエンドコントローラーが `min_score` パラメータを持っていなかった

### 問題2: ゼロベクトルレコードが0%表示で残り続ける（NaN仕様）

`e2e-test/dummy.maiml` はE2Eテスト用ダミーデータで、全4軸のembeddingがゼロベクトル `[0,0,...,0]` だった。  
pgvector でゼロベクトルとのコサイン距離計算は **NaN** を返す。PostgreSQL では **`NaN >= 0.3` が `true`** と評価されるため、足切りを素通りしていた。

---

## 修正内容

### 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `backend/src/sql/queries/semanticSearch/search.sql` | サブクエリ化してスコア足切り条件（`>= $13`）とNaN除外条件を追加 |
| 2 | `backend/src/repositories/semanticSearchRepository.ts` | `search()` に `minScore: number` 引数を追加、`$13` として渡す |
| 3 | `backend/src/controllers/semanticSearchController.ts` | `MIN_SCORE` 定数を追加（環境変数対応）、repository呼び出しに渡す |

---

### 1. search.sql の修正

スコア計算はSELECT句内で行われるためそのままWHEREに使えない。**サブクエリ方式**を採用してスコアを一旦算出し、外側でフィルタリングする。

```sql
SELECT ... FROM (
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
WHERE sub.score >= $13::float          -- スコア足切り（デフォルト: 0.3）
  AND sub.score != 'NaN'::float        -- NaN除外（ゼロベクトル対策）
ORDER BY sub.score DESC
LIMIT $10
```

**NaN除外の仕組み:**  
PostgreSQL では `NaN != NaN` が `false` と評価されるため、NaN スコアのレコードは `WHERE` 句で確実に除外される。

---

### 2. semanticSearchRepository.ts の修正

```typescript
// 変更前
export async function search(
  ...
  projectName: string | null
): Promise<SearchHit[]>

// 変更後
export async function search(
  ...
  projectName: string | null,
  minScore: number        // 追加
): Promise<SearchHit[]>
```

SQL呼び出しに `$13` として `minScore` を渡す。

---

### 3. semanticSearchController.ts の修正

```typescript
/**
 * スコア足切り閾値
 * 環境変数 SEMANTIC_SEARCH_MIN_SCORE で上書き可能（デフォルト: 0.3）
 */
const MIN_SCORE = parseFloat(process.env.SEMANTIC_SEARCH_MIN_SCORE ?? '0.3');
```

デフォルト値 `0.3` を使用しつつ、環境変数 `SEMANTIC_SEARCH_MIN_SCORE` で調整可能にした。

---

## 動作結果

| ケース | 修正前 | 修正後 |
|--------|--------|--------|
| 無関係なキーワード（「あいうえお」等） | 結果が返る | 0件 ✅ |
| ゼロベクトルのダミーデータ（E2E_TRANSITION_5-3） | 0%で表示される | 非表示 ✅ |
| 有効なクエリ | 正常 | 正常 ✅ |

---

## 備考

- `loadSqlFile` はキャッシュなしでディスクから毎回読み込むため、**バックエンド再起動なし**で即時反映される
- 環境変数 `SEMANTIC_SEARCH_MIN_SCORE` で閾値を変更可能（例: `SEMANTIC_SEARCH_MIN_SCORE=0.5`）
- `e2e-test/dummy.maiml` のレコード（ゼロベクトル）はE2Eテスト用途のため、本番/開発DBからは削除するか、E2Eテスト専用の `organization_id` に分離することを推奨

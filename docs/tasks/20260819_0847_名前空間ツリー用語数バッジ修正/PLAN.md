# タスク計画書: 名前空間ツリー用語数バッジが全て0になる問題の修正

## メタデータ
- **作成日時**: 2026-08-14 08:10
- **タスクID**: namespace-tree-badge-fix
- **優先度**: 高
- **推定工数**: 1.5時間

## タスク概要

名前空間管理画面のツリー表示において、各階層ノードの用語数バッジが全て 0 と表示される。
正しい用語数が表示されるよう修正する。

不確かさ管理画面（UncertaintyManagement.tsx）においても同系統のバグが存在するため
合わせて修正する。

## 原因調査結果

### 調査した各ファイルの状態

| 確認箇所 | 状態 |
|---------|------|
| `findAllByOrganization.sql` | `n.scope_key AS "scopeKey"` を SELECT ✅ |
| `findAll.sql` | `namespace` テーブルを JOIN せず、`scopeKey` を **SELECT していない** ❌ |
| `fetchAllTerms`（NamespaceMain.tsx 826行） | `getTerms()` を**引数なし**で呼ぶ |
| `NamespaceTermRow` 型（namespaceApiService.ts 130行） | `scopeKey?: string | null` が定義されている ✅ |
| `Term` 型（namespace.ts 119行） | `scopeKey?: string | null` が定義されている ✅ |
| ヘルパー関数（NamespaceMain.tsx） | `countTermsUnderNode` / `collectAllPrefixesUnder` / `countTermsByPrefix` が**未定義** ❌ |
| `termCountByScopeKey` | フィルタ済み `terms` を参照しているため他ノードの件数が消える ❌ |
| `UncertaintyManagement.tsx` `getTermCount` | `scopeKey === nodeKey` のフラット比較のみで子孫集計なし ❌ |

### 根本原因

**原因①: `findAll.sql` が `scopeKey` を返さない**

`fetchAllTerms` が `getTerms()` を引数なしで呼ぶと `findAll.sql` が実行されるが、
このクエリは `namespace` テーブルを JOIN しておらず `scopeKey` を SELECT していない。
返るデータは全て `scopeKey = undefined` となり、
`allTerms.filter((t) => t.scopeKey === n.key).length` が常に 0 になる。

**原因②: ヘルパー関数が未定義（NamespaceMain.tsx）**

`toAntTree`（行 1265-1267）が以下3関数を呼び出しているが、ファイル内に定義がない：
- `countTermsUnderNode(n, countMap)`
- `collectAllPrefixesUnder(n)`
- `countTermsByPrefix(prefixes, terms)`

実行時に ReferenceError が発生してバッジが全て 0 になる。

**原因③: `termCountByScopeKey` がフィルタ済み `terms` を参照している**

ノード選択時に `fetchTerms({ scopeKey: 'dept_001' })` → `terms` が 1 ノード分のみに絞られる。
他ノードの scopeKey を持つ term が消えてバッジが 0 になる。

**原因④: `UncertaintyManagement.tsx` `getTermCount` のフラット比較**

`allTerms.filter(t => t.scopeKey === nodeKey).length` のみで判定しているため、
`node.key = "company"` 等に一致する用語が存在せず、子孫ノードの件数も合算されない。

## 目的と期待される成果

- [x] ツリー各ノードの用語数バッジに正しい件数が表示される
- [x] Global ノード: グローバル名前空間に属する用語数
- [x] 組織・チームノード: 各 organization_group_cd に一致する用語数
- [x] Personal ノード: ユーザーIDに一致する用語数
- [x] ノード選択を切り替えても、他ノードのバッジが 0 にならない
- [x] 不確かさ管理画面でも同様に子孫含む用語数が集計される

## 実装ステップ

### Phase 1: `findAll.sql` 修正

- [x] `namespace` テーブルを LEFT JOIN し `n.scope_key AS "scopeKey"` を SELECT に追加

```sql
-- 修正後
SELECT
  t.prefix || ':' || t.localname  AS qname
  , t.prefix                       AS prefix
  , t.localname                    AS "localName"
  , COALESCE(t.display_name, '')   AS "displayName"
  , COALESCE(t.description, '')    AS description
  , COALESCE(t.xsi_type, 'stringType') AS type
  , COALESCE(t.units, '')          AS "unitHint"
  , t.is_active                    AS "isActive"
  , n.scope_key                    AS "scopeKey"   -- ← 追加
FROM namespace_term t
LEFT JOIN namespace n ON n.namespace_id = t.namespace_id   -- ← 追加
ORDER BY t.prefix ASC, t.localname ASC
```

### Phase 2: `NamespaceMain.tsx` ヘルパー関数追加・`allTerms` 対応

- [x] `collectAllPrefixesUnder(node)` をコンポーネント外部に定義
- [x] `countTermsByPrefix(prefixes, terms)` をコンポーネント外部に定義
- [x] `countTermsUnderNode(node, countMap)` をコンポーネント外部に定義
- [x] 旧インライン定義（重複）を削除
- [x] `const [allTerms, setAllTerms] = useState<Term[]>([])` を追加（バッジ集計専用）
- [x] 初回マウント時のみ `getTerms()` で全件取得して `allTerms` に保存する useEffect を追加
- [x] `termCountByScopeKey` を `allTerms` ベースに修正（`terms` → `allTerms`、依存配列も変更）
- [x] `toAntTree` の `countTermsByPrefix(prefixes, terms)` → `countTermsByPrefix(prefixes, allTerms)` に変更
- [x] `treeData` useMemo の依存配列を `allTerms` に変更

### Phase 3: `UncertaintyManagement.tsx` 再帰集計対応

- [x] `collectDescendantKeys` ヘルパー関数を追加
- [x] `getTermCount`（332〜335行目）を再帰集計ロジックに変更

### Phase 4: 動作確認

- [x] ツリーの各ノードに正しい用語数が表示されることを確認
- [x] チームノード、Personalノード、Globalノードそれぞれ確認
- [x] ノード選択切り替え後も他ノードのバッジが維持されることを確認

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/sql/queries/namespace_terms/findAll.sql` | `namespace` テーブルを LEFT JOIN し `n.scope_key AS "scopeKey"` を追加 |
| `frontend/src/components/namespace/NamespaceMain.tsx` | ヘルパー関数3つ追加、`allTerms` state追加、termCount集計を全件ベースに修正 |
| `frontend/src/components/uncertainty/UncertaintyManagement.tsx` | `getTermCount` を再帰集計ロジックに変更、`collectDescendantKeys` 追加 |

## リスク

| リスク | 対策 |
|--------|------|
| `findAll.sql` は全組織対象の開発用クエリのため、JOIN 追加でパフォーマンスへの影響 | 開発用クエリなので許容範囲内 |

## 承認記録
- **計画書提示日時**: 2026-08-14 08:10
- **承認日時**: 2026-08-19 13:48

## 実施記録

### 実施日時
開始: 2026-08-14 08:17
完了: 2026-08-19 13:53

### 最終的な成果物
- [x] `findAll.sql` に `namespace` LEFT JOIN と `scopeKey` SELECT 追加
- [x] ヘルパー関数3つをコンポーネント外部に追加（collectAllPrefixesUnder / countTermsByPrefix / countTermsUnderNode）
- [x] 旧インライン定義（重複）を削除
- [x] `allTerms` state 追加 + 初回マウント時フェッチ useEffect 追加
- [x] `termCountByScopeKey` を `allTerms` ベースに修正（ノード選択に依存しない全件集計）
- [x] `UncertaintyManagement.tsx` の `getTermCount` を子孫含む再帰集計に修正

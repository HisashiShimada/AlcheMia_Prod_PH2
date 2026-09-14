# タスク計画書: 用語管理 重複チェックスコープ修正

## メタデータ
- **作成日時**: 2026-09-10 00:00
- **タスクID**: 20260910_0000_用語管理重複チェックスコープ修正
- **優先度**: 高
- **推定工数**: 1時間

---

## 1. タスク概要

名前空間管理画面（用語管理タブ）で、上位層に存在する `prefix:用語` を下位層に追加しようとした際に表示される重複エラーメッセージの内容が誤っている。

### 事象

- 「結合テスト グループ002」を選択した状態で `Uncertainty:projectA` を追加しようとする
- 「結合テスト グループ001」（上位層）に既に同名用語が存在する
- エラーメッセージ:「`「Uncertainty:projectA」は結合テスト　ユーザ004で既に登録されています`」
  - ❌ **誤**: 「ユーザ004」と表示される
  - ✅ **正**: 「結合テスト グループ001」と表示されるべき

---

## 2. 根本原因

### バグ1：重複チェックのスコープ範囲が広すぎる

`namespaceTermRepository.ts` の `create()` / `createInTx()` 内の重複チェックで使用している `findTermByKey.sql`:

```sql
WHERE t.organization_id = $1
  AND t.prefix = $2
  AND t.localname = $3
-- ⚠️ namespace_id（スコープ）を条件に含めていない
```

→ 組織内の全スコープにまたがって同じ `prefix:localName` が存在するかチェックしてしまっている。  
→ DB の PK は `(organization_id, namespace_id, prefix, localname)` であり、`namespace_id`（スコープ）が異なれば同じ `prefix:localName` でも別レコードとして登録可能。  
→ 上位層（グループ001）に `Uncertainty:projectA` があると、別スコープ（グループ002）への登録が誤ってブロックされる。

### バグ2：エラーメッセージのスコープ名が誤っている

`findScopeNameByPrefix.sql`:

```sql
WHERE p.organization_id = $1
  AND p.prefix = $2
LIMIT 1
-- ⚠️ prefix のみで検索 → 最初にヒットしたスコープ名を返す
```

→ `prefix` が複数のスコープに存在する場合、最初にヒットしたスコープ名（例: 「ユーザ004」）が返る。  
→ 実際に重複している既存用語の `namespace_id` に紐づくスコープ名を正確に引けていない。

---

## 3. 実装方針

1. **新規SQL: `findTermInScope.sql`** — 重複チェック専用。`(organization_id, namespace_id, prefix, localname)` で1件取得。
2. **新規SQL: `findScopeNameByNamespaceId.sql`** — `namespace_id` + `organization_id` でスコープ名を取得。
3. **`namespaceTermRepository.ts` 修正** — `create()` / `createInTx()` の重複チェックを新規SQLに変更。

---

## 4. 変更ファイル一覧

| # | ファイル | 変更種別 | 理由 |
|---|---------|---------|------|
| 1 | `backend/src/sql/queries/namespace_terms/findTermInScope.sql` | **新規** | スコープ内重複チェック専用SQL |
| 2 | `backend/src/sql/queries/namespace_terms/findScopeNameByNamespaceId.sql` | **新規** | namespace_idでスコープ名取得SQL |
| 3 | `backend/src/repositories/namespaceTermRepository.ts` | **修正** | `create()` / `createInTx()` の重複チェックSQL変更 |
| 4 | `backend/tests/phase2/repositories/namespaceTermRepository.phase2.test.ts` | **修正・追加** | 修正に対応したテスト更新＋新規ケース追加 |

---

## 5. 実装ステップ

- [x] PLAN.md 作成
- [x] `findTermInScope.sql` 作成
- [x] `findScopeNameByNamespaceId.sql` 作成
- [x] `namespaceTermRepository.ts` 修正
- [x] テスト修正・追加（20件 PASS）
- [x] バックエンドビルド確認（エラーなし）
- [x] テスト実行確認（全20件 PASS）

---

## 6. 追加修正（2026-09-10）

### バグ3：INSERT後のSELECTで 500 エラー

create() / createInTx() の登録後 SELECT にも indTermByKey.sql（スコープ無視）を使用していたため、**別スコープに同名用語が存在するケース**で pgp.one() が複数行を受け取り例外 → errorHandlerMiddleware が 500 処理 → 「システムエラーが発生しました」と表示されていた。

### 追加修正内容

- create() の登録後 SELECT: indTermByKey.sql → indTermInScope.sql（
amespaceId 追加）
- createInTx() の登録後 SELECT: 同上

- [x] 
amespaceTermRepository.ts の登録後 SELECT を indTermInScope.sql に変更（create / createInTx 各1箇所）
- [x] バックエンドビルド確認（エラーなし）
- [x] テスト実行確認（全20件 PASS）

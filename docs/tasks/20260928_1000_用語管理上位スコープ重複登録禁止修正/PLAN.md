# タスク計画書: 用語管理 上位スコープ重複登録禁止修正

## メタデータ
- **作成日時**: 2026-09-28 10:00
- **タスクID**: 20260928_1000
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

名前空間管理 > 用語管理タブにおいて、上位階層（祖先グループ）に存在する `prefix:localName`（同名用語）と同じ組み合わせを、下位層のスコープに型違いで登録できてしまうバグを修正する。

また、その副作用として発生していた表示・動作不正（同一qnameが重複してテーブルに表示される）も合わせて解消する。

## 原因分析

### バグの核心

`namespaceTermRepository.create()` / `createInTx()` 内の重複チェックは、`findTermInScope.sql` を使い**登録先スコープ（namespace_id 1つ）のみ**を対象としている。

現在スコープにそのprefixが直接登録されている場合：
- `findNamespaceIdByScopeKeyAndPrefix.sql` → 現在スコープの namespace_id を取得
- `findTermInScope.sql` → **現在スコープ内のみ** チェック
- → 上位グループに同名用語（同一 prefix:localName ペア）があっても無視 → **登録成功（バグ）**

### 「同名用語」の定義
`prefix` + `localName` の1ペア（= qname: `prefix:localName`）が一致すれば「同名」とみなす。型・単位は問わない。

### 表示バグの原因
問題1の結果として上位・下位スコープに同一 qname が存在すると `findAllByScopeKeyWithAncestors.sql` が両方の行を返す。React の rowKey（= `prefix:localName`）が重複するため テーブル表示が不正になる。

## 修正方針

### バックエンド
`createTerm()` 実行時に、登録先スコープのチェック（既存）に加えて **祖先グループのスコープにも同一 prefix:localName が存在しないか** チェックする。

- 対象: `scopeKey` が組織グループCD（Personal userId ではない）の場合
- 祖先に同名用語が存在すれば **409 / E6005** エラーを返す

### フロントエンド
`updateNewTerm()` の `_isDuplicate` 判定を、現在スコープのみから **全スコープ（上位グループ含む）** に変更する。

## 修正ファイル一覧

| # | ファイル | 変更種別 | 概要 |
|---|---------|---------|------|
| 1 | `backend/src/sql/queries/namespace_terms/findTermInAncestorScopes.sql` | **新規作成** | 祖先グループに同一 prefix:localName が存在するか検索するSQL |
| 2 | `backend/src/repositories/namespaceTermRepository.ts` | **修正** | `findTermInAncestorScopes()` メソッド追加 |
| 3 | `backend/src/services/namespaceService.ts` | **修正** | `createTerm()` に祖先スコープ重複チェックを追加 |
| 4 | `frontend/src/components/namespace/NamespaceMain.tsx` | **修正** | `updateNewTerm()` の `_isDuplicate` 判定を全スコープ対象に変更 |

## 機能フロー

### 修正前（バグあり）
```
登録: グループ002 + prefix=test_01 + localName=test_term_01 (stringType)

Repository.create()
  Step1: findNamespaceIdByScopeKeyAndPrefix.sql
         → グループ002に test_01 prefix あり → namespaceId = グループ002のID
  Step2: findTermInScope.sql
         WHERE namespace_id = グループ002のID  ← グループ002のみチェック
         → test_term_01 はグループ002にない → 重複なし判定
  → INSERT 実行 ← ★バグ：グループ001に同名があっても登録できてしまう
```

### 修正後
```
登録: グループ002 + prefix=test_01 + localName=test_term_01 (stringType)

Service.createTerm()
  ← 追加: findTermInAncestorScopes.sql
     WITH RECURSIVE ancestors（グループ002の祖先グループ取得）
     → グループ001の namespace に test_01:test_term_01 が存在
     → 409 E6005 エラー返却（登録不可）

Repository.create()（上記チェック通過時のみ呼ばれる）
  Step1: findNamespaceIdByScopeKeyAndPrefix.sql（既存）
  Step2: findTermInScope.sql（既存・登録先スコープのみ）
  → INSERT 実行（祖先に同名がないことが保証済み）
```

## 実装ステップ

- [x] Step 1: `findTermInAncestorScopes.sql` 新規作成
- [x] Step 2: `namespaceTermRepository.ts` に `findTermInAncestorScopes()` 追加
- [x] Step 3: `namespaceService.ts` の `createTerm()` 修正
- [x] Step 4: `NamespaceMain.tsx` の `updateNewTerm()` 修正
- [x] Step 5: バックエンドビルド確認（`tsc --noEmit`）
- [x] Step 6: フロントエンドビルド確認（`tsc --noEmit`）

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 祖先チェック SQL のパフォーマンス | 低 | `LIMIT 1` で最小取得 |
| Personal スコープへの影響 | 低 | userId は `organization_group` に存在しないため再帰クエリが空返却 → チェックスキップ相当 |
| 既存の重複データ | 中 | 今回修正は新規登録時のみ。既存データは別途対応 |

## 承認記録
- **承認日時**: 2026-09-28 10:00
- **承認者コメント**: Act モードへの切り替えにて承認

# タスク計画書: 用語編集時に計画指示データが消失するバグの修正

## メタデータ
- **作成日時**: 2026-09-03 13:30
- **タスクID**: 用語編集時計画指示データ消失バグ修正
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

用語管理タブで既存用語の編集ボタンを押下し、表示名・説明・型・単位を編集して保存すると、「計画指示」データ（`has_directive_term = true`）が消えるバグを修正する。

## 2. 目的と期待される成果

### 目的
用語編集後も `has_directive_term` の値が保持されるようにする。

### 期待される成果
- [ ] 用語の表示名・説明・型・単位を編集・保存しても、その用語に紐づく計画指示データ（`has_directive_term` フラグ）が消えずに保持される
- [ ] 計画指示用語（`SupervisorDirective{localName}`）が編集後も引き続き参照・利用できる

## 3. 原因分析

### バグの根本原因

`updateTerm.sql` の UPDATE 文に `has_directive_term = $8` が含まれており、リポジトリの `update()` 関数では `data.hasDirectiveTerm ?? false`（デフォルト `false`）として渡される。

しかし、フロントエンドの `saveEdit()` から始まるコールチェーン全体で `hasDirectiveTerm` が渡されないため、**用語を編集するたびに `has_directive_term` が `false` で上書きされる**。

```
フロントエンド saveEdit()
  → updateTerm(prefix, localName, { displayName, description, typeHint, unitHint })
      ↑ hasDirectiveTerm は未指定
  → PUT /api/v1/namespaces/terms/:prefix/:localName
  → namespaceController.updateTerm（hasDirectiveTerm なし）
  → namespaceService.updateTerm（hasDirectiveTerm なし）
  → namespaceTermRepository.update({ ..., hasDirectiveTerm: undefined })
  → updateTerm.sql: has_directive_term = false（$8 = undefined ?? false）← ★ここで消える
```

`has_directive_term` は用語作成時（`createDirectiveTerm = true` 指定時）にのみ `true` に設定される不変フラグであり、編集操作で変更すべき値ではない。

## 4. 実装ステップ

- [ ] `backend/src/sql/queries/namespace_terms/updateTerm.sql` の `has_directive_term = $8` 行を削除
- [ ] `backend/src/repositories/namespaceTermRepository.ts` の `update()` 関数から `hasDirectiveTerm` パラメータおよびSQL呼び出し時の `$8` 引数を削除

## 5. 変更ファイル

1. `backend/src/sql/queries/namespace_terms/updateTerm.sql` — `has_directive_term = $8` 行を削除
2. `backend/src/repositories/namespaceTermRepository.ts` — `update()` 関数の `data` 型から `hasDirectiveTerm?: boolean` を削除、`pgp.result()` の引数配列から `data.hasDirectiveTerm ?? false` を削除

## 6. 影響範囲

### 変更される動作
- 用語編集（`PUT /api/v1/namespaces/terms/:prefix/:localName`）実行後、`has_directive_term` が変更前の値のまま維持される

### 影響を受けない機能
- 用語新規登録時の `has_directive_term` 設定（`createTerm.sql` は変更なし）
- `has_directive_term` を参照する他の機能（計画指示用語の表示など）

## 7. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `hasDirectiveTerm` を意図的に変更したいユースケースが将来発生する | 低 | 低 | 必要になった時点で改めて API を追加する |

## 8. テスト計画

### 手動テスト
- [ ] `has_directive_term = true` の用語に対して編集ボタンを押下し、表示名・説明・型・単位を変更して保存する
- [ ] 保存後、DB で `has_directive_term` が `true` のまま維持されていることを確認する
- [ ] 計画指示用語（`SupervisorDirective{localName}`）が引き続き存在することを確認する

## 9. 承認記録

- **計画書提示日時**: 2026-09-03 13:30
- **承認日時**: 
- **承認者コメント**: 

# タスク計画書: 名前空間ツリー用語数バッジ修正

## メタデータ
- **作成日時**: 2026-08-18 09:04
- **タスクID**: 名前空間ツリー用語数バッジ修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

名前空間管理タブの階層ツリーに表示される用語数バッジが全て0と表示されている問題を修正する。
登録されている用語数を正しく表示できるようにする。

## 根本原因

用語数バッジは `toAntTree` 関数内で以下の順で計算される：
1. `collectAllPrefixesUnder(n)` で静的ツリーノードの prefix を収集
2. `prefixToScopeKeyMap` フォールバックで動的ノードの prefix を収集
3. `countTermsByPrefix(prefixes, allTerms)` で用語数を集計

**問題**: `buildOrgTree` で構築される動的組織ノード（`組織`, `材料合成部-1` 等）に `prefix` フィールドが存在しないため、`collectAllPrefixesUnder` が常に空セットを返す。

フォールバックの `prefixToScopeKeyMap`（`prefix → organization_group_cd` のマップ）は正しく設計されているが、`allTerms` の各 `Term` が `scopeKey` を持たないため、バッジ計算用の直接的な集計ができなかった。

**解決策**: `findAllByOrganization.sql` に `namespace` テーブルを JOIN して `scope_key` を追加し、フロントエンドのバッジ計算を `term.scopeKey === n.key` の直接比較に変更する。

## 変更ファイル

1. `backend/src/sql/queries/namespace_terms/findAllByOrganization.sql` - namespace JOINして scope_key を返す
2. `frontend/src/types/namespace.ts` - Term 型に `scopeKey?: string` を追加
3. `frontend/src/components/namespace/NamespaceMain.tsx` - toAntTree のバッジ計算を修正

## 実装ステップ
- [x] タスク計画書作成
- [ ] findAllByOrganization.sql に scope_key を追加（バックエンド）
- [ ] Term 型に scopeKey フィールドを追加（フロントエンド型定義）
- [ ] NamespaceMain.tsx の toAntTree バッジ計算を修正（フロントエンド）

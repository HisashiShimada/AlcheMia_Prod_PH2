# タスク計画書: 用語管理スコープ表示バグ修正（組織グループ選択時）

## メタデータ
- **作成日時**: 2026-09-02 18:56
- **タスクID**: 用語管理スコープ表示バグ修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

組織グループノードを選択した際に、用語管理タブの一覧にデータが表示されない（スコープ列も「—」になる）バグを修正する。

## バグ原因

`findNamespacesByScopeKeyWithAncestors.sql` に3つの問題がある：

1. **`AND n.global_flg = FALSE`** → `namespace` テーブルに `global_flg` カラムが存在しないため PostgreSQL エラー `42703` が発生し、クエリが失敗する
2. **`COALESCE` なし** → `scopeName` が NULL になり `prefixScopeNameMap` にセットされずスコープ列が「—」になる
3. **`organization_user` の LEFT JOIN なし** → ユーザースコープ対応ができていない

## 修正内容

### 変更ファイル
1. `backend/src/sql/queries/namespace_terms/findNamespacesByScopeKeyWithAncestors.sql`

### 修正内容
- `AND n.global_flg = FALSE` を削除（42703 エラー解消）
- `COALESCE(og.organization_group_name, ou.user_name, '') AS "scopeName"` に変更
- `organization_user ou` の LEFT JOIN を追加
- 不要な `n.namespace_id AS "namespaceId"` を削除（他SQLと統一）

## 実装ステップ
- [x] バグ原因の特定
- [x] タスク計画書作成
- [ ] findNamespacesByScopeKeyWithAncestors.sql の修正
- [ ] 動作確認

## 承認記録
- **承認日時**: 2026-09-02 18:56

# タスク計画書: 個人スコープのPrefixが誤表示されるバグ修正

## メタデータ
- **作成日時**: 2026-08-21 11:45
- **タスクID**: 個人スコープPrefix非表示バグ修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

Prefix管理タブで、組織ノード選択時に個人スコープ（`実験管理 三郎`）のPrefixが表示されてしまうバグを修正する。

## 原因

`findNamespacesByOrganization.sql`（スコープ指定なし・全件取得クエリ）が、
`namespace.scope_key` が `organization_user.user_id` と一致する個人スコープのデータも
含めて返していたことが原因。

## 実装ステップ
- [x] 原因調査・特定
- [ ] findNamespacesByOrganization.sql 修正（個人スコープ除外）

## 変更ファイル
1. `backend/src/sql/queries/namespace_terms/findNamespacesByOrganization.sql` - 個人スコープを除外する条件を追加

## 承認記録
- **承認日時**: 2026-08-21 11:45

# タスク計画書: 名前空間スコープキーユニーク制約追加

## メタデータ
- **作成日時**: 2026-08-21 16:19
- **タスクID**: add_unique_scope_key_to_namespace
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`namespace` テーブルの `scope_key` カラムに、同一組織内での重複を防ぐユニーク制約 `(organization_id, scope_key)` を追加する。

## 目的と期待される成果

- [ ] 同一組織内で同じ `scope_key` を持つ namespace レコードが登録されないことを DB レベルで保証する
- [ ] 既存の重複テストデータを事前にクリーンアップ（古い方を残す）
- [ ] DDLファイルに制約定義を反映する

## 実装ステップ

- [ ] マイグレーションファイル作成
- [ ] DDLファイル更新

## 変更ファイル

1. `backend/migrations/20260821_add_unique_scope_key_to_namespace.sql` - 新規作成
2. `docs/design/db/ddl/namespace.sql` - ユニーク制約を追記

## 技術的詳細

- PostgreSQL の UNIQUE 制約は NULL 同士を競合扱いしない
  - → `scope_key` が NULL のレコードは複数存在してもエラーにならない
- 重複レコードの削除方針: `namespace_id` が大きい方（新しい方）を削除し、小さい方（古い方）を残す

## 承認記録
- **承認日時**: 2026-08-21 16:26

# タスク計画書: organizationテーブルにみなし進捗フラグ追加

## メタデータ
- **作成日時**: 2026-03-02 17:48
- **タスクID**: add_use_deemed_progress_to_organization
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`organization`テーブルに、組織ごとに「みなし進捗」機能を使用するかどうかを切り替えるためのフラグカラム `use_deemed_progress` を追加する。

## 目的と期待される成果

### 目的
現在、実験データ記録ダイアログ（DataRecordDialog）の「みなし進捗更新」フラグはユーザーのローカル状態（`useState(true)`）で管理されており、組織単位での設定ができない。組織ごとにデフォルトの動作を制御できるようにする。

### 期待される成果
- [x] organizationテーブルに `use_deemed_progress` カラムを追加するマイグレーションファイルを作成
- [x] DDLファイルを更新

## 実装ステップ

- [ ] タスク計画書作成・承認
- [ ] `docs/design/db/ddl/organization.sql` のDDL定義にカラムを追加
- [ ] `backend/migrations/20260302_add_use_deemed_progress_to_organization.sql` を新規作成

## 変更ファイル

1. `docs/design/db/ddl/organization.sql` - `use_deemed_progress` カラムを追加
2. `backend/migrations/20260302_add_use_deemed_progress_to_organization.sql` - 新規作成（マイグレーション）

## カラム定義

| 項目 | 内容 |
|------|------|
| カラム名 | `use_deemed_progress` |
| 型 | `BOOLEAN` |
| NOT NULL | あり |
| デフォルト値 | `TRUE` |
| コメント | `みなし進捗使用フラグ` |

## 承認記録
- **計画書提示日時**: 2026-03-02 17:48
- **承認日時**: 2026-03-02 17:48

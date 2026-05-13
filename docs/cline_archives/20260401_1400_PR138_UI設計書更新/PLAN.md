# タスク計画書: PR #138 UI設計書更新

## メタデータ
- **作成日時**: 2026-04-01 14:00
- **タスクID**: PR138_UI設計書更新
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

PR #138（改善仕様対応No.1）でマージされた実装内容をUI設計書に反映する。
対象ブランチ: `feature/shimogama`、マージコミット: `bfda8c17`

## 目的と期待される成果
- [x] PR #138の変更内容を特定する
- [ ] ui_file_list_table.md を最新実装に同期する
- [ ] ui_project_management.md を最新実装に同期する
- [ ] ui_bulk_upload_dialog.md を最新実装に同期する

## PR #138 変更内容サマリー

### 主要な機能追加
1. **ファイル削除機能**（FileListTable + ProjectManagement）
   - ファイル行にDropdownメニュー（MoreOutlinedボタン）を追加
   - メニュー項目: 「名前の変更」（未実装）、「削除」
   - MAIMLファイルはproject_statusチェック付き削除
   - 一般ファイルは無条件削除

2. **プロジェクト削除機能**（ProjectManagement）
   - ファイル操作ツールバーに「削除」ボタン（DeleteOutlined, danger）を追加
   - Modal.confirmで確認ダイアログ表示
   - MAIMLファイル存在時は削除不可

3. **アップロード完了コールバック型拡張**（BulkUploadDialog）
   - `hasMaimlFile?: boolean` フィールド追加

## 変更するファイル
1. `docs/design/ui/experiment_admin/01_project_management/ui_file_list_table.md`
2. `docs/design/ui/experiment_admin/01_project_management/ui_project_management.md`
3. `docs/design/ui/experiment_admin/01_project_management/ui_bulk_upload_dialog.md`

## 承認記録
- **承認日時**: 2026-04-01 14:00（自動承認・ドキュメント更新タスク）

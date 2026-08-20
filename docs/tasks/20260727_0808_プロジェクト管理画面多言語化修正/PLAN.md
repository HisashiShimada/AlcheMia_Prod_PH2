# タスク計画書: プロジェクト管理画面多言語化修正

## メタデータ
- **作成日時**: 2026-07-27 08:08
- **タスクID**: 多言語化_projectManagement重複キー修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

プロジェクト管理画面で日本語に切り替えているにも関わらず、キー文字列（`projectManagement.filter_labels.owner` 等）がそのまま表示される問題を修正する。

## 根本原因

`frontend/src/locales/ja.json` および `frontend/src/locales/en.json` に `"projectManagement"` トップレベルキーが**複数回定義**されており、JSONパース時に最後のブロック（8キーのみ）だけが有効になる。前の大きいブロック（100キー以上）が全て無効化されている。

## 実装ステップ

- [x] 現状調査・根本原因特定
- [ ] タスク計画書作成
- [ ] ja.json の重複 projectManagement ブロックを1つに統合
- [ ] en.json の重複 projectManagement ブロックを1つに統合
- [ ] キー整合性確認

## 変更ファイル
1. `frontend/src/locales/ja.json` - 重複projectManagementブロックを統合
2. `frontend/src/locales/en.json` - 重複projectManagementブロックを統合

## 承認記録
- **承認日時**: 2026-07-27 08:08

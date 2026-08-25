# タスク計画書: チーム追加ダイアログ追加先プルダウン化

## メタデータ
- **作成日時**: 2026-07-07 11:36
- **タスクID**: team-add-dialog-destination-select
- **優先度**: 低
- **推定工数**: 0.5時間

## タスク概要
実験管理者メニューの「チームを追加」ダイアログにある「追加先」項目を、固定Tagから Selectプルダウンに変更する。

## 目的と期待される成果
- [ ] 「追加先」が Select プルダウンで選択できる
- [ ] 選択肢: 研究開発部 / 材料解析チーム / データ処理班

## 実装ステップ
- [ ] `frontend/src/components/namespace/TeamAddDialog.tsx` を修正

## 変更ファイル
1. `frontend/src/components/namespace/TeamAddDialog.tsx` - 追加先を固定TagからSelectに変更

## 承認記録
- **承認日時**: 2026-07-07 11:36

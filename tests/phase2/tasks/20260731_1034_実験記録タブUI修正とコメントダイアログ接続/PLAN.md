# タスク計画書: 実験記録タブUI修正とコメントダイアログ接続

## メタデータ
- **作成日時**: 2026-07-31 10:37
- **タスクID**: 実験記録タブUI修正とコメントダイアログ接続
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要
実験記録タブ（DataRecordDialog の inlineMode）のUIを画像に合わせて修正し、
「コメント」ボタン押下時に ExperimentCommentDialog を表示する。

## 目的と期待される成果
- [ ] コメントボタンクリックで ExperimentCommentDialog が開く
- [ ] ダイアログ内にタスクNo・トランジションIDが表示される
- [ ] コメント入力（500文字以内）→保存/キャンセルが機能する

## 実装ステップ
- [ ] DataRecordDialog.tsx に ExperimentCommentDialog のインポートを追加
- [ ] commentDialogOpen state を追加
- [ ] inlineFooter のコメントボタンに onClick を追加
- [ ] inlineMode レンダリング内に ExperimentCommentDialog を追加

## 変更ファイル
1. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` - インポート・state・ボタンonClick・ダイアログ追加

## 承認記録
- **承認日時**: 2026-07-31 10:37

# タスク計画書: 状態記録ダイアログ表示実装

## メタデータ
- **作成日時**: 2026-08-25 00:03
- **タスクID**: 状態記録ダイアログ表示実装
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要
実験作業者メニューの実験記録タブにある「状態記録」ボタン押下時に状態記録ダイアログを表示する。
過去タスク（20260806_1453・20260810_0921）の仕様に基づき実装する。

## 目的と期待される成果
- [ ] 「状態記録」ボタン押下で状態記録ダイアログが表示される
- [ ] ダイアログに「動作状態」固定行（日時＋状態選択）が表示される
- [ ] 「+ 休止状態記録追加」ボタン押下で休止状態＋動作状態ペアが動的追加される
- [ ] 追加ペアはボーダーで囲まれ、「- 休止状態記録削除」ボタンで削除できる

## 実装ステップ
- [ ] WorkRecordPanel.tsx に PauseEntry 型と pauseEntries state を追加
- [ ] 状態記録ダイアログ（Modal）を WorkRecordPanel.tsx 内に実装
- [ ] stateRecordDialogOpen state を追加して開閉制御
- [ ] PlanProps・PlanB へ onStateRecord コールバックを伝搬
- [ ] planProps に onStateRecord を追加して WorkRecordPanel から接続
- [ ] ja.json / en.json に多言語キーを追加

## 変更ファイル
1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` - ダイアログ実装・接続
2. `frontend/src/locales/ja.json` - 日本語キー追加
3. `frontend/src/locales/en.json` - 英語キー追加

## 承認記録
- **承認日時**: 2026-08-25 00:03

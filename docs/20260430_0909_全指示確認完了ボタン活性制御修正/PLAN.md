# タスク計画書: 全ての指示の確認完了ボタン活性制御修正

## メタデータ
- **作成日時**: 2026-04-30 09:09
- **タスクID**: 全指示確認完了ボタン活性制御修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

指示確認タブにて、各指示グループの「確認完了」ボタンは `!isTaskExecuting`（プロジェクトステータスが `executing_task = 2` 以外のとき非活性）の条件が正しく適用されており非活性となっているが、下部の「全ての指示の確認完了」ボタンにはこの条件が抜けているため、ステータスに関わらず活性状態になっていた。

## 目的と期待される成果
- [ ] 下部「全ての指示の確認完了」ボタンが、プロジェクトステータスが `executing_task(=2)` 以外の場合に非活性になること

## 実装ステップ
- [ ] `InstructionConfirmationTab.tsx` の `disabled` 条件に `!isTaskExecuting` を追加
- [ ] 同ボタンのスタイル計算（`backgroundColor` / `borderColor`）にも `!isTaskExecuting` を追加

## 変更ファイル
1. `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` - disabled条件・スタイル条件の修正

## 承認記録
- **計画書提示日時**: 2026-04-30 09:09
- **承認日時**: 2026-04-30 09:09

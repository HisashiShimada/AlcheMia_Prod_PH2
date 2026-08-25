# タスク計画書: 実験記録タブ ボタン群をContent上部へ移動（WorkRecordPanel）

## メタデータ
- **作成日時**: 2026-08-20 09:33
- **タスクID**: 実験記録ボタン群Content上部移動_WorkRecordPanel
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

実験作業者メニューの実験記録タブ（WorkRecordPanel.tsx の PlanB）において、
現在 PropertyList 最下部にある「コメント・保存・スキップ・次へ」ボタン群を、
Content エリア上部（WorkHeader の下、プロパティカードグリッドの上）に移動する。
DataRecordDialog.tsx は使用しない。

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
   - `PropertyList` の下部ボタン群（保存・コメント・スキップ・次へ）を削除
   - `PlanB` の Content エリア上部に同ボタン群を追加

## 実装ステップ

- [x] 現状コードの確認
- [ ] PropertyList の下部ボタン行を削除
- [ ] PlanB の Content エリア上部にボタン行を追加

## 承認記録
- **承認日時**: 2026-08-20 09:33

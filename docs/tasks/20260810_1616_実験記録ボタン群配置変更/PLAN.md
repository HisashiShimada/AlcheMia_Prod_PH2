# タスク計画書: 実験記録ボタン群配置変更

## メタデータ
- **作成日時**: 2026-08-10 16:16
- **タスクID**: 実験記録ボタン群配置変更
- **優先度**: 低
- **推定工数**: 0.5時間

## タスク概要
実験作業者メニューの実験記録タブ（inlineMode）において、現在 workStatusBar の下に独立行で表示されている「状態記録・コメント・保存・スキップ・次へ」ボタン群を、workStatusBar と同じ行の右端に配置する。

## 変更ファイル
1. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` - inlineMode の return 部を修正

## 実装ステップ
- [ ] DataRecordDialog.tsx の inlineMode return 部を変更
  - workStatusBar と inlineFooter を `display: flex` のラッパーで横並びにする
  - workStatusBar は `flex: 1` で左側を占有
  - inlineFooter は右端（`flexShrink: 0`）
  - workStatusBar の `marginBottom: 8` はラッパーDivに移動

## 承認記録
- **承認日時**: 2026-08-10 16:21

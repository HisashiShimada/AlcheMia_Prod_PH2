# タスク計画書: 実験指示タブ承認処理ボタン修正

## メタデータ
- **作成日時**: 2026-07-21 09:51
- **タスクID**: 実験指示タブ承認処理ボタン修正
- **優先度**: 高
- **推定工数**: 0.25時間

## タスク概要

前回のマージ（aac3f1c7）で `ExperimentInstructionTab.tsx` の `Space` コンポーネントの `direction="vertical"` が `orientation="vertical"` に誤って変換された。`orientation` は Ant Design の `Space` に存在しないプロパティのため、承認処理モーダル・NG記録モーダル・承認処理ダイアログのレイアウトが壊れている。

## 変更ファイル
1. `frontend/src/components/project/ExperimentInstructionTab.tsx` - 3箇所修正

## 実装ステップ
- [x] 原因特定
- [ ] `orientation="vertical"` → `direction="vertical"` の3箇所修正

## 承認記録
- **承認日時**: 2026-07-21 09:51

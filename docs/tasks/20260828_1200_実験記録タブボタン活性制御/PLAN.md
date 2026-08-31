# タスク計画書: 実験記録タブボタン活性制御

## メタデータ
- **作成日時**: 2026-08-28 12:00
- **タスクID**: 20260828_1200_実験記録タブボタン活性制御
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験作業者メニューの実験記録タブ内の「指示確認」「開始」「終了」「異常終了」ボタンを、
トランジションステータスに基づき活性/非活性制御する。

## 制御条件

| ステータス | 指示確認 | 開始 | 終了 | 異常終了 |
|-----------|---------|------|------|---------|
| 2: 準備状態（preparing） | 活性 | 活性 | 非活性 | 非活性 |
| 3: 準備完了状態（ready） | 非活性 | 活性 | 非活性 | 非活性 |
| 4: 動作状態（in_progress） | 非活性 | 非活性 | 活性 | 活性 |
| 6: 終状態（completed） | 非活性 | 非活性 | 非活性 | 非活性 |
| 7: 異常終了状態（issue） | 非活性 | 非活性 | 非活性 | 非活性 |

## 変更ファイル
1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
   - `InstructionCollapseProps` に `confirmInstructionDisabled?: boolean` 追加
   - `InstructionCollapse` コンポーネントの指示確認ボタンに disabled 適用
   - `WorkHeaderProps` に `startDisabled?`, `endDisabled?`, `forceEndDisabled?` 追加
   - `WorkHeader` コンポーネントの各ボタンに disabled 適用
   - `PlanB` コンポーネントにボタン制御ロジック実装（progressRows から currentStatus 算出）

## 制約
- MaiMLファイルへの保存は実験記録タブ内では行わない
- バックエンドAPIの変更なし（フロントエンドのみ）
- ディレクトリ構造の変更なし

## 承認記録
- **承認日時**: 2026-08-28 12:00

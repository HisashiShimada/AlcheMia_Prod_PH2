# タスク計画書: 実験記録テンプレート値UIモック合わせ

## メタデータ
- **作成日時**: 2026-08-06 11:23
- **タスクID**: 20260806_1123_実験記録テンプレート値UIモック合わせ
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要
実験記録タブ内のテンプレート内の値表示をモックに合わせてUIを修正する。

## 変更ファイル
- `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`

## 修正内容
1. **指定値・許容誤差**: 枠線付きボックス表示に変更（border + background）
2. **不確かさ説明**: 枠線付きボックス表示に変更
3. **定性評価ボタンの色修正**:
   - 「確か(certain)」→ 選択時: primary（青）、非選択: default
   - 「疑い(ambiguous)」→ 選択時: primary（警告色）、非選択: default
   - 「不確か(uncertain)」→ 選択時: primary danger（赤）、非選択: default danger
4. **定量評価追加ボタン**: ラベルを「評価追加」→「追加」に変更

# タスク計画書: 定性評価選択取り消し機能追加

## メタデータ
- **作成日時**: 2026-07-15 11:29
- **タスクID**: 定性評価選択取り消し機能追加
- **優先度**: 高
- **推定工数**: 0.25時間

## タスク概要

実験記録タブ内の不確かさ基準選択UIにおいて、定性評価（確か/曖昧/不確か等）のボタンを選択した後、同じボタンを再押下しても取り消しができない問題を修正する。

## 修正内容

### 問題
- 定性評価ボタンの `onClick` が `setQualValue(opt.selectorValue)` だけのため、選択済みボタンを再押下しても何も変わらない
- `selectedCriteria` 変更時に `is_default=true` の選択肢が自動でセットされるため、「初期は何も表示しない」状態にならない

### 修正

1. **ボタン onClick をトグル動作に変更**
   - 未選択 → 選択（現状通り）
   - 選択済み → 取り消し（`null` にリセット）

2. **useEffect のデフォルト値設定を削除**
   - `selectedCriteria` 切り替え時は `qualValue` を `null`（未選択）にする

## 変更ファイル
1. `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorPanel.tsx`
2. `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx`

## 承認記録
- **承認日時**: 2026-07-15 11:29

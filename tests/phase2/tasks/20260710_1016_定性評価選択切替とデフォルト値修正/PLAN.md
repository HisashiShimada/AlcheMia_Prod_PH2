# タスク計画書: 不確かさ選択ダイアログ定性評価バグ修正

## メタデータ
- **作成日時**: 2026-07-10 10:16
- **タスクID**: 定性評価選択切替とデフォルト値修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

不確かさ選択ダイアログ（Modal・Panel共通）にて、定性評価を選択した際に：
1. 各不確かさ基準を切り替えても選択肢（確か/曖昧/不確か）が前の状態のまま残る
2. 初期表示時にデフォルト値が設定されない（未選択状態になる）

## 原因

`selectedCriteria` が変わっても `qualValue` をリセット・再設定する `useEffect` が存在しない。

## 修正内容

両ファイルに `selectedCriteria?.id` を依存配列とする `useEffect` を追加：
- 定量評価基準に切り替え時 → `qualValue` を `null` にリセット
- 定性評価基準に切り替え時 → `qualValue` を `'ambiguous'`（曖昧）にデフォルト設定
- 両ケースとも `ucValue`, `kFactor`, `ucValueError` もリセット

## 変更ファイル
1. `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx`
2. `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorPanel.tsx`

## 承認記録
- **承認日時**: 2026-07-10 10:16

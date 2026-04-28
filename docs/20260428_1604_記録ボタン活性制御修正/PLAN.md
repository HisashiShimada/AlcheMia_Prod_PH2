# タスク計画書: 実験記録タブ「記録」ボタン活性制御をプロジェクトステータスごとに修正

## メタデータ
- **作成日時**: 2026-04-28 16:04
- **タスクID**: 記録ボタン活性制御修正
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

実験作業者画面の実験記録タブ内「記録」ボタンの活性・非活性をプロジェクトステータスごとに正しく制御する。

現状は計画中（数値0）が `null` にマッピングされてしまうバグにより、計画中でも「記録」ボタンが活性化してしまっている。また `waiting_task`（タスク実行待ち）も非活性にする必要があるが現在は活性化している。

## 目的と期待される成果

| ステータス | 数値 | 記録ボタン | ダイアログ内編集 |
|---|---|---|---|
| 計画中 (planning) | 0 | ❌ 非活性 | - |
| タスク実行待ち (waiting_task) | 1 | ❌ 非活性 | - |
| タスク実行中 (executing_task) | 2 | ✅ 活性 | ✅ 編集可 |
| 承認待ち (waiting_approval) | 3 | ✅ 活性 | 🔒 読み取り専用 |
| 完了 (completed) | 4 | ✅ 活性 | 🔒 読み取り専用 |

## 実装ステップ

- [x] 現状コード調査
- [x] 変更要件確認
- [ ] タスク計画書作成
- [ ] `frontend/src/types/experimentWorker.ts` 修正
- [ ] `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` 修正

## 変更ファイル

1. `frontend/src/types/experimentWorker.ts`
   - `isRecordViewableStatus` 関数: `waiting_task` を削除、`completed` を追加
2. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`
   - `mapNumericStatusToProjectStatus` 関数: `case 0: return 'planning'` を追加

## 影響範囲

- `TransitionList.tsx` の「記録」ボタン → `isRecordViewableStatus` 経由で自動対応
- `TransitionFlowNode.tsx` のフロー図「記録」ボタン → `isProjectRecordable` 経由で自動対応
- `DataRecordDialog.tsx` のダイアログ内編集 → `isEditableStatus` は変更なし（`waiting_approval`・`completed` は既に読み取り専用）

## 承認記録
- **計画書提示日時**: 2026-04-28 16:04
- **承認日時**: 2026-04-28 16:04
- **承認者コメント**: 実装をお願いします

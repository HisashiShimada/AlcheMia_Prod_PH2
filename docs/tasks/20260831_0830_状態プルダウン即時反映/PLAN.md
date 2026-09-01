# タスク計画書: 実験記録タブ 状態プルダウン即時反映

## メタデータ
- **作成日時**: 2026-08-31 08:30
- **タスクID**: 20260831_0830_状態プルダウン即時反映
- **優先度**: 高
- **推定工数**: 30分

## タスク概要

実験記録タブの状態プルダウンが、ボタン押下後にすぐ更新されない問題を修正する。

## 原因

`WorkHeader` に渡す `taskTransition.status`（= `tasks` state 由来）は
`buildTransitions` の非同期処理（全テンプレートAPI取得）完了後にしか更新されない。
一方、ボタン活性制御は `progressRows` props（`reloadProgressRows` 完了直後に即反映）を
参照しており、データソースが乖離している。

## 修正方針

`PlanA`・`PlanB` それぞれで、`displayKey` に対応する `progressRows` のステータスを
取得し、`displayTT.status` をオーバーライドした `displayTTWithCurrentStatus` を作成。
`WorkHeader` と `PropertyList` の `taskTransition` prop に渡す。

## `ProgressRow.status` → `TransitionStatus` 変換マッピング

| `ProgressRow.status` | `TransitionStatus`（WorkHeader用） |
|---|---|
| `'in_progress'` | `'running'` |
| `'on_hold'` | `'paused'` |
| `'issue'` | `'error'` |
| それ以外 | そのまま |

## 変更ファイル
1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
   - `PlanA`（行1282付近）: `displayTTWithCurrentStatus` 追加、WorkHeader/PropertyList へ渡す ✅
   - `PlanB`（行1437付近）: `displayTTWithCurrentStatus` 追加、WorkHeader/PropertyList へ渡す ✅

## 制約
- UIの見た目は変更しない
- バックエンドAPIの変更なし
- 既存の `tasks` state・`buildTransitions` ロジックは変更しない

## 承認記録
- **承認日時**: 2026-08-31 （ユーザー承認済み）

## 実施記録
- **完了日時**: 2026-08-31
- TypeScript: `WorkRecordPanel.tsx` のコンパイルエラーなし ✅


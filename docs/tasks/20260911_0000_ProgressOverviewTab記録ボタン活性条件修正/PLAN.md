# タスク計画書: ProgressOverviewTab 記録ボタン活性条件修正

## メタデータ
- **作成日時**: 2026-09-11 00:00
- **タスクID**: 20260911_0000_ProgressOverviewTab記録ボタン活性条件修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`ProgressOverviewTab` の「記録」ボタンが、トランジションのステータスが `preparing`（準備状態）や `ready`（準備完了状態）であるにも関わらず disabled になってしまう問題を修正する。

### 背景・根本原因

記録ボタンの disabled 判定に `!isProjectRecordable`（プロジェクトステータス由来）が含まれており、プロジェクトステータスが `TASK_PENDING(1)` のとき `isProjectRecordable = false` になるため、トランジションステータスに関わらず全ボタンが disabled になる。

チェックアウト直後はプロジェクトステータスが `TASK_PENDING(1)` のままトランジションが `preparing` に遷移するため、この状態でボタンが押せないのは誤り。

### 正しい要件

記録ボタンの活性/非活性は**トランジションのステータスのみ**で判定すべき。

| トランジションステータス | `ProgressRow.status` | 記録ボタン |
|---|---|---|
| INITIAL (1) | `not_started` | **disabled** |
| PREPARING (2) 以降 | `preparing` / `ready` / `in_progress` / `on_hold` / `completed` / `issue` | **活性** |

`isProjectRecordable` によるプロジェクトステータス制御は除去する。

## 目的と期待される成果

- [ ] `preparing` / `ready` ステータスのトランジションで記録ボタンが活性化されること
- [ ] `not_started` のみ disabled であること
- [ ] リスト表示・フロー図表示の両方で同一ロジックが適用されること
- [ ] TypeScript ビルドエラーが発生しないこと
- [ ] 単体テストがグリーンになること

## 実装ステップ

- [ ] Step 1: PLAN.md 作成（本ファイル）
- [ ] Step 2: `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` — `renderAction` の `disabled` から `!isProjectRecordable ||` を削除。props 受け取りから `isProjectRecordable` を削除
- [ ] Step 3: `frontend/src/components/ExperimentWorker/TransitionFlowNode.tsx` — `disabled` から `!isProjectRecordable ||` を削除。`data` 型定義から `isProjectRecordable` を削除
- [ ] Step 4: `frontend/src/components/ExperimentWorker/TransitionFlowDiagram.tsx` — `isProjectRecordable` をノードの data に渡している箇所を削除。useMemo の依存配列からも削除
- [ ] Step 5: `frontend/src/types/progress.ts` — `ProgressOverviewTabProps` から `isProjectRecordable?: boolean` を削除
- [ ] Step 6: `frontend/src/components/menus/ExperimentWorkerMenu.tsx` — `isProjectRecordable` 算出コードと `<ProgressOverviewTab isProjectRecordable=...>` prop 渡しを削除。`isRecordViewableStatus` import も不要になれば削除
- [ ] Step 7: `frontend/src/components/ExperimentWorker/__tests__/TransitionFlowNode.test.tsx` — `isProjectRecordable=false` 系テストケース削除。ヘルパー関数・呼び出し箇所から `isProjectRecordable` 引数を削除
- [ ] Step 8: TypeScript ビルドエラー確認（`npx tsc --noEmit`）
- [ ] Step 9: 単体テスト実行確認

## 変更ファイル

| # | ファイル | 変更種別 | 変更内容 |
|---|---|---|---|
| 1 | `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` | 修正 | `disabled` から `!isProjectRecordable \|\|` を削除・props から `isProjectRecordable` 除去 |
| 2 | `frontend/src/components/ExperimentWorker/TransitionFlowNode.tsx` | 修正 | `disabled` から `!isProjectRecordable \|\|` を削除・`data` 型から `isProjectRecordable` 除去 |
| 3 | `frontend/src/components/ExperimentWorker/TransitionFlowDiagram.tsx` | 修正 | ノード data への `isProjectRecordable` 渡し・useMemo 依存配列から削除 |
| 4 | `frontend/src/types/progress.ts` | 修正 | `ProgressOverviewTabProps` から `isProjectRecordable?: boolean` を削除 |
| 5 | `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | 修正 | `isProjectRecordable` 算出コードと prop 渡しを削除。`isRecordViewableStatus` import 削除 |
| 6 | `frontend/src/components/ExperimentWorker/__tests__/TransitionFlowNode.test.tsx` | 修正 | `isProjectRecordable=false` 系テスト削除・ヘルパーから引数削除 |

## リスク

| リスク | 対策 |
|---|---|
| `isProjectRecordable` / `isRecordViewableStatus` が他箇所で使われている | 削除前に grep で使用箇所を確認済み（`ExperimentWorkerMenu.tsx` のみ） |
| テスト変更によるカバレッジ低下 | `isProjectRecordable=false` ケース削除の代わりに、not_started 以外の全ステータスで活性であることをシンプルに検証 |

## テスト計画

- [ ] `not_started` → disabled
- [ ] `preparing` / `ready` / `in_progress` / `on_hold` / `completed` / `issue` → 活性
- [ ] TypeScript ビルドエラーなし（`npx tsc --noEmit`）
- [ ] 単体テスト全件グリーン

## 承認記録
- **計画書提示日時**: 2026-09-11 00:00

# タスク計画書: 実験記録タブ実装

## メタデータ
- **作成日時**: 2026-08-25 12:00
- **タスクID**: 20260825_1200_実験記録タブ実装
- **優先度**: 高
- **推定工数**: 4時間

## タスク概要

実験作業者メニューの「実験記録」タブにおける以下の機能を実装する：
1. データ取得・保存・修正処理（`is_recorded` フラグ管理含む）
2. トランジション表示制御（優先順位: 動作状態 > 準備完了 > 準備）
3. スキップボタン活性条件（動作状態では非活性）
4. 承認依頼ボタン活性条件（全終状態 + 全記録済み）
5. 定性評価表示ロジック（初期表示・保存後・description 表示）

## 目的と期待される成果
- [ ] `is_recorded` フラグの DB 対応（マイグレーション + Repository + Service）
- [ ] 保存時に `is_recorded = TRUE` を更新する
- [ ] トランジション優先順位: in_progress > ready > preparing（同一ステータスは order 順）
- [ ] スキップボタン: in_progress 時は非活性、それ以外は活性
- [ ] 承認依頼ボタン: 全トランジションが completed かつ全 is_recorded=true の場合のみ活性
- [ ] 定性評価: uncertainty.key → intuition_selector 取得 → 選択肢表示
- [ ] 定性評価: value が存在する場合は初期選択状態
- [ ] 定性評価: description が存在する場合はヘッダー右隣に表示

## 実装ステップ

### バックエンド

- [ ] BE-01: `backend/migrations/20260825_add_is_recorded_to_transition_data.sql` 作成
- [ ] BE-02: `TransitionDataRow` に `is_recorded: boolean` 追加
- [ ] BE-03: `backend/src/sql/queries/transition_data/updateIsRecorded.sql` 作成
- [ ] BE-04: `TransitionDataRepository.updateIsRecorded()` メソッド追加
- [ ] BE-05: `backend/src/sql/queries/transition_data/findByTask.sql` に `is_recorded` 追加
- [ ] BE-06: `experimentDataService.saveBatchData` で保存後に `is_recorded = TRUE` 更新
- [ ] BE-07: `experimentController.saveBatchData` でリクエストから `transitionId` 受取
- [ ] BE-08: 進捗 API のレスポンスに `is_recorded` を追加（progressService / findByTask.sql）

### フロントエンド

- [ ] FE-01: `ProgressRow` 型に `isRecorded?: boolean` 追加（`types/progress.ts`）
- [ ] FE-02: `saveBatchExperimentData` に `transitionId` パラメータ追加（`experimentDataApiService.ts`）
- [ ] FE-03: `SaveBatchExperimentDataRequest` に `transitionId` フィールド追加（`types/api.ts`）
- [ ] FE-04: トランジション表示優先順位ロジック修正（WorkRecordPanel.tsx）
         in_progress > ready > preparing、同一ステータス内は order 昇順
- [ ] FE-05: スキップボタン活性条件修正（WorkRecordPanel.tsx）
         in_progress 時は disabled
- [ ] FE-06: 承認依頼ボタン活性条件更新（ExperimentWorkerMenu.tsx）
         全 completed + 全 isRecorded=true のみ active
- [ ] FE-07: 定性評価 description 表示対応（WorkRecordPanel.tsx・ExperimentRecordDialog.tsx）

## 変更ファイル
1. `backend/migrations/20260825_add_is_recorded_to_transition_data.sql` - 新規作成
2. `backend/src/sql/queries/transition_data/updateIsRecorded.sql` - 新規作成
3. `backend/src/sql/queries/transition_data/findByTask.sql` - is_recorded 追加
4. `backend/src/repositories/transitionDataRepository.ts` - 型・メソッド追加
5. `backend/src/services/experimentDataService.ts` - is_recorded 更新ロジック追加
6. `backend/src/controllers/experimentController.ts` - transitionId 受取
7. `backend/src/services/progressService.ts` - is_recorded 返却
8. `frontend/src/types/progress.ts` - ProgressRow.isRecorded 追加
9. `frontend/src/types/api.ts` - SaveBatchExperimentDataRequest.transitionId 追加
10. `frontend/src/services/experimentDataApiService.ts` - transitionId 引数追加
11. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - 承認依頼ボタン条件修正
12. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` - 優先順位・スキップ・定性評価
13. `frontend/src/components/ExperimentWorker/ExperimentRecordDialog.tsx` - 定性評価 description

## リスク
| リスク | 対策 |
|--------|------|
| progressService の is_recorded 返却で他APIへの影響 | findByTask.sql のみ修正し、型は optional にする |
| ExperimentWorkerMenu に progressRows が渡っていない | 既存の progressRows state を確認し必要なら props 追加 |
| 定性評価の description フィールドが型にない | 型定義確認後に追加 |

## テスト計画
- [ ] is_recorded マイグレーション: ALTER TABLE が既存DBに正常適用されること
- [ ] 実験データ保存後: transition_data.is_recorded が TRUE になること
- [ ] 承認依頼ボタン: 全完了+全記録済みの場合のみ活性になること
- [ ] トランジション優先順位: in_progress > ready > preparing で表示されること
- [ ] スキップボタン: in_progress 時のみ非活性になること
- [ ] 定性評価: description がある場合にヘッダーに表示されること

## 承認記録
- **計画書提示日時**: 2026-08-25 12:00
- **承認日時**: 2026-08-25 18:00（act モードへの切り替えにより承認済み）
- **実施完了**: 2026-08-25 19:30

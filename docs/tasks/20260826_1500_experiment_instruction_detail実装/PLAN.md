# タスク計画書: experiment_instruction_detail レコード登録・更新処理の実装

## メタデータ
- **作成日時**: 2026-08-26 14:21
- **タスクID**: 20260826_1500_experiment_instruction_detail実装
- **優先度**: 高
- **推定工数**: 8時間

---

## タスク概要

`experiment_instruction_detail` テーブルへのレコード登録・更新処理を実装する。

| タイミング | 処理内容 |
|---|---|
| ExperimentPlanDialog 保存時 | `planned_values` を展開して `experiment_instruction_detail` に UPSERT（想定値登録） |
| WorkRecordPanel 保存時 | `actual_value`（実績値）・`uncertainty_assigned_value`（定性評価値）を UPDATE |
| WorkRecordPanel 保存時（不確かさ） | `uncertainty_key` / `name_space_id` / `uncertainty_assigned_by` / `uncertainty_assigned_at` を UPDATE |

また、実験指示タブの一覧表示で不確かさ基準名・許容値・入力値が表示できるよう `UncertaintyJudgeSummary` を拡張し、定性評価値の保存フローを新規実装する。

---

## 未解決事項（全解消済み）

| # | 内容 | 解決方針 |
|---|---|---|
| 1 | `planned_values` → `template_name`/`prop_key` 解決 | フロントから `templates`（TemplateDef[]）を PUT リクエストに追加（案C） |
| 2 | `actual_value` 更新時の `transition_id` 特定 | 引数の `transitionId` をそのまま利用 |
| 3 | マイグレーション状態 | `CREATE TABLE IF NOT EXISTS` で新規マイグレーション作成（schema.sql に未含有確認済み） |
| 4 | 不確かさ列の更新タイミング | WorkRecordPanel 保存時に `uncertainty_assigned_value` を更新 |
| 5 | テーブル拡張の必要性 | 不要（既存カラムと JOIN で対応可能） |
| 6 | 定性評価値の保存フロー未実装 | `saveBatchData` リクエストに `qualitativeValues` を追加し `uncertainty_assigned_value` に保存 |
| 7 | 一覧表示の基準名・許容値・入力値 | `UncertaintyJudgeSummary` に `criteriaName` を追加、フロント列・詳細ダイアログに追加 |

---

## 実装ステップ（7 Phase）

### Phase 1: DBマイグレーション
- [ ] P1-1: `docs/design/db/ddl/migrations/20260826_experiment_instruction_detail.sql` 新規作成（CREATE TABLE IF NOT EXISTS）

### Phase 2: 型定義追加・更新
- [ ] P2-1: `backend/src/types/database.ts` に `ExperimentInstructionDetail` 型を追加
- [ ] P2-2: `backend/src/types/api.ts` の `UpsertExperimentPlanInput` に `templates?: TemplateDef[]` 追加
- [ ] P2-3: `backend/src/types/api.ts` の `UncertaintyJudgeSummary` に `criteriaName?: string` 追加
- [ ] P2-4: `backend/src/types/api.ts` に saveBatchData 用 `qualitativeValues` フィールド追加
- [ ] P2-5: `frontend/src/types/api.ts` の `SaveBatchExperimentDataRequest` に `qualitativeValues` 追加

### Phase 3: SQL ファイル作成
- [ ] P3-1: `backend/src/sql/queries/experiment_instruction_details/upsertFromPlan.sql` 新規作成
- [ ] P3-2: `backend/src/sql/queries/experiment_instruction_details/updateActualAndUncertainty.sql` 新規作成

### Phase 4: Repository 実装
- [ ] P4-1: `backend/src/repositories/experimentInstructionDetailRepository.ts` 新規作成
  - `insert(data)` / `update(data)` （規約準拠）
  - `upsertFromPlan(client, rows[])` （ExperimentPlan 保存時の一括 upsert）
  - `updateActualAndUncertainty(params)` （WorkRecordPanel 保存時の更新）

### Phase 5: Service 修正（ExperimentPlanDialog 保存時）
- [ ] P5-1: `backend/src/services/experimentPlanService.ts` の `upsertExperimentPlan()` に instruction_detail upsert 追加
  - `input.templates` を受け取り `planned_values` × `templates` を照合して upsertFromPlan() 呼び出し

### Phase 6: Service 修正（WorkRecordPanel 保存時）
- [ ] P6-1: `backend/src/services/experimentDataService.ts` の `saveBatchData()` に以下を追加
  - `qualitativeValues` 引数追加、`savedRecords` から `actual_value` 抽出、`updateActualAndUncertainty()` 呼び出し
- [ ] P6-2: `backend/src/services/experimentInstructionService.ts` の `getExperimentInstructions()` を修正
  - `UncertaintyJudgeSummary` に `criteriaName` を追加（`uncertainty_criteria.description` を参照）

### Phase 7: フロントエンド修正
- [ ] P7-1: `frontend/src/services/experimentPlanApiService.ts` の `upsertExperimentPlanToApi()` に `templates` 引数追加
- [ ] P7-2: `frontend/src/components/project/ExperimentPlanDialog.tsx` の `handleSave()` で `dialogData.templates` を渡す
- [ ] P7-3: `frontend/src/services/experimentDataApiService.ts` の `saveBatchExperimentData()` に `qualitativeValues` 追加
- [ ] P7-4: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` の保存時に `confidence` を `qualitativeValues` として送信
- [ ] P7-5: `frontend/src/components/project/ExperimentInstructionTab.tsx` の不確かさ表示を拡張（criteriaName・許容値・入力値）

---

## 変更ファイル一覧（15ファイル）

| # | ファイル | 変更種別 |
|---|---|---|
| 1 | `docs/design/db/ddl/migrations/20260826_experiment_instruction_detail.sql` | 新規 |
| 2 | `backend/src/types/database.ts` | 追加 |
| 3 | `backend/src/types/api.ts` | 修正 |
| 4 | `frontend/src/types/api.ts` | 修正 |
| 5 | `backend/src/sql/queries/experiment_instruction_details/upsertFromPlan.sql` | 新規 |
| 6 | `backend/src/sql/queries/experiment_instruction_details/updateActualAndUncertainty.sql` | 新規 |
| 7 | `backend/src/repositories/experimentInstructionDetailRepository.ts` | 新規 |
| 8 | `backend/src/services/experimentPlanService.ts` | 修正 |
| 9 | `backend/src/services/experimentDataService.ts` | 修正 |
| 10 | `backend/src/services/experimentInstructionService.ts` | 修正 |
| 11 | `frontend/src/services/experimentPlanApiService.ts` | 修正 |
| 12 | `frontend/src/components/project/ExperimentPlanDialog.tsx` | 修正 |
| 13 | `frontend/src/services/experimentDataApiService.ts` | 修正 |
| 14 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 修正 |
| 15 | `frontend/src/components/project/ExperimentInstructionTab.tsx` | 修正 |

---

## リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| `planned_values` キー形式混在（`{templateId}_{fieldKey}` vs 単純 `fieldKey`） | 中 | 両形式でフォールバック検索（既存 `updatePropertySetByPlan` を参考） |
| `transitionId` が null のケース | 低 | null の場合は更新をスキップ・ログのみ |
| `qualitativeValues` の `uncertainty_key` が不明なケース | 低 | `uncertainty_key=null` で `uncertainty_assigned_value` のみ更新 |
| `experiment_instruction_detail` が未作成のDB環境 | 高 | Phase 1 のマイグレーションを最初に適用（IF NOT EXISTS で冪等性確保） |

---

## テスト計画
- [ ] ExperimentPlanDialog で想定値を入力・保存 → `experiment_instruction_detail` にレコードが挿入されること
- [ ] WorkRecordPanel で実績値を入力・保存 → `actual_value` が更新されること
- [ ] WorkRecordPanel で `confidence` を選択・保存 → `uncertainty_assigned_value` が更新されること
- [ ] 実験指示タブで不確かさ列に基準名が表示されること
- [ ] 不確かさ詳細ダイアログで許容値・入力値が確認できること

---

## 承認記録
- **計画書提示日時**: 2026-08-26 14:21
- **承認日時**: 2026-08-26 14:21（act モードへの切り替えにより承認済み）
- **実施完了**: 2026-08-26 16:30


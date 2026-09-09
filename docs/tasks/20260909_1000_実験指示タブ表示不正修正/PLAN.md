# タスク計画書: 実験指示タブ表示不正修正

## メタデータ
- **作成日時**: 2026-09-09 10:00
- **タスクID**: 20260909_1000
- **優先度**: 高
- **推定工数**: 3〜4時間

---

## タスク概要

実験指示タブ（ExperimentInstructionTab）において以下4件の表示不正が確認されている。  
それぞれ原因が異なるため、バックエンドService・型定義・フロントエンドコンポーネントを修正する。

---

## 問題詳細と根本原因

### 問題① タスクステータスに「00」が表示される

**根本原因:**
- `TASK_STATUS_CONFIG`（フロントエンド）のキーが `'01'`〜`'06'` になっている
- `toTaskStatusStr(status)` でDB値（数値 `0`〜`5`）を「2桁ゼロ埋め文字列」に変換しているが、DB値 `0`（実行待ち）→ `'00'` となり `TASK_STATUS_CONFIG` に `'00'` キーが存在しないため素の `'00'` が表示される
- `null`（`project_task_detail` 未存在）も `'00'` になる同じ問題
- **設計上の問題**: 数値→文字列ゼロ埋め変換自体が不要な中間処理

**DB値とステータス対応（`TaskStatusEnum`）:**

| DB値 | 意味 |
|---|---|
| `0` | 実行待ち（PENDING） |
| `1` | 実行中（IN_PROGRESS） |
| `2` | レビュー待ち（REVIEW_WAITING） |
| `3` | 完了（COMPLETED） |
| `4` | 異常終了（FORCED_TERMINATED） |
| `5` | NG（REVIEW_NG） |
| `null` | 未登録（project_task_detail レコードなし） |

---

### 問題② トランジション名が表示されない（フォールバックIDも表示されない）

**根本原因:**
- `flattenInstructions` 内で `transitionId: ''`、`transitionName: ''` をハードコードしている
- バックエンドAPIレスポンス型 `InstructionTemplate` に `transitionId`/`transitionName` が存在しない
- `experiment_instruction_detail` は主キーに `transition_id` を持っているが `transition_name` カラムがないため、MAIMLを毎回パースしないとトランジション名を解決できない

**修正アプローチ（採用: DBにカラム追加）:**
- `experiment_instruction_detail` テーブルに `transition_name` カラムを追加する
- `upsertFromPlan` 実行時（ExperimentPlanDialog保存時）に `transition_name` も書き込む
- `getExperimentInstructions` で `instructionDetailMap` に `transition_id`/`transition_name` を追加し、APIレスポンスに反映する
- `InstructionTemplate` に `transitionId`/`transitionName` を追加する

**あわせて修正: `template_name` から `template_id` への主キー変更**
- 現在 `experiment_instruction_detail.template_name`（主キー6番目）には `tmpl.label`（テンプレート表示ラベル）が格納されている
- `tmpl.id`（MAIMLの `template.id`）は格納されていない
- **`template_id` カラムを追加して主キーを `template_name` → `template_id` に変更する**
- `template_name` カラムは残す（表示ラベルとして引き続き保持）
- 主キー変更に伴い、`upsertFromPlan` / `updateActualAndUncertainty` の ON CONFLICT 句も更新する
- `experimentPlanService` では `tmpl.id` を `templateId` として渡すよう修正する
- `experimentDataService._updateInstructionDetails` では `ps.templateId` を `templateId` として渡すよう修正する

**`template_id` の値の取得元:**
- `upsertFromPlan` 時: `TemplateDef.id`（`tmpl.id`）→ ExperimentPlanDialogから渡される
- `updateActualAndUncertainty` 時: `property_set.templateId`（`ps.templateId`）→ template_data に格納済み

---

### 問題③ xsi:type が表示されない（experiment_instruction_detail に登録あり）

**根本原因:**
- `instructionDetailMap` に `xsi_type` が含まれていない
- `buildFields` の `xsiType: extractXsiType(prop)` は `property_set` から取得するが `null` になるケースがある
- `experiment_instruction_detail.xsi_type` には ExperimentPlanDialog 保存時に値が書き込まれているが参照していない

**修正:** `instructionDetailMap` に `xsiType: string | null` を追加し、`field.xsiType` が `null` の場合に `detail.xsi_type` で補完する

---

### 問題④ 想定値が表示されない（experiment_instruction_detail に登録あり）

**根本原因:**
- `buildFields` 内で `plannedValue: null` とハードコード
- `instructionDetailMap` に `expected_value` が含まれておらず反映されない

**修正:** `instructionDetailMap` に `expectedValue: string | null` を追加し、`field.plannedValue` を `detail.expected_value` で設定する

---

## 実装ステップ

### STEP 1: マイグレーション作成
**ファイル:** `backend/migrations/20260909_add_transition_name_and_template_id_to_instruction_detail.sql`

- [ ] `experiment_instruction_detail` に `transition_name` カラムを追加（`CHARACTER VARYING`, NULL許容）
- [ ] `experiment_instruction_detail` に `template_id` カラムを追加（`CHARACTER VARYING`, NULL許容）
- [ ] 既存の主キー制約 `experiment_instruction_detail_PKC` を DROP する
- [ ] 新しい主キー制約を `(organization_id, project_id, method_id, task_no, transition_id, template_id, prop_key)` で再作成
- [ ] カラムコメント追加

### STEP 2: DDL更新
**ファイル:** `docs/design/db/ddl/experiment_instruction_detail.sql`

- [ ] `transition_name` / `template_id` カラムを追加
- [ ] 主キー制約を `template_name` → `template_id` に変更
- [ ] `template_name` カラムは残す（NULL許容に変更）

### STEP 3: バックエンド型定義の修正（DB型）
**ファイル:** `backend/src/types/database.ts`

- [ ] `ExperimentInstructionDetail` インターフェースに以下を追加
  - `transition_name?: string | null`
  - `template_id?: string | null` （主キー変更後は必須フィールドだが既存レコード互換のため optional のまま）
- [ ] 主キーコメントを `template_name` → `template_id` に更新

### STEP 4: Repository の修正
**ファイル:** `backend/src/repositories/experimentInstructionDetailRepository.ts`

- [ ] `PRIMARY_KEYS` 配列の `'template_name'` を `'template_id'` に変更
- [ ] `upsertFromPlan` の引数型を変更
  - `templateId: string` を追加（主キー）
  - `templateName: string | null` に変更（非主キー・表示ラベル）
  - `transitionName: string | null` を追加
- [ ] `upsertFromPlan` SQLパラメータ渡しを更新
- [ ] `updateActualAndUncertainty` の引数型に `templateId: string` を追加、`templateName` を `string | null` に変更
- [ ] `updateActualAndUncertainty` SQLパラメータ渡しを更新

### STEP 5: SQL ファイルの修正
**ファイル:** `backend/src/sql/queries/experiment_instruction_details/upsertFromPlan.sql`

- [ ] `template_id`（主キー）/ `transition_name` / `template_name`（表示名）を INSERT 対象カラムに追加
- [ ] `ON CONFLICT` 句を `template_name` → `template_id` に変更
- [ ] `DO UPDATE SET` に `transition_name` / `template_name` を追加

**ファイル:** `backend/src/sql/queries/experiment_instruction_details/updateActualAndUncertainty.sql`

- [ ] `template_id` を INSERT 対象カラムに追加
- [ ] `ON CONFLICT` 句を `template_name` → `template_id` に変更

### STEP 6: experimentPlanService の修正
**ファイル:** `backend/src/services/experimentPlanService.ts`

- [ ] `buildInstructionDetailRows` の戻り値型に `templateId: string` / `transitionName: string | null` を追加
- [ ] `fieldKeyMap` の値に `templateId: tmpl.id` を追加（既存の `templateName: tmpl.label` は残す）
- [ ] `transitionId` キーから `PlanDialogData.transitions` を検索して `transitionName` を解決（引数に `transitions` を追加）
- [ ] `upsertFromPlan` 呼び出しに `templateId` / `transitionName` / `templateName` を渡す

### STEP 7: experimentDataService の修正
**ファイル:** `backend/src/services/experimentDataService.ts`

- [ ] `_updateInstructionDetails` 内で `ps.templateId` を主キーとして渡すよう修正
  - 現在: `templateName = ps.templateName ?? ps.templateId ?? ''` でtemplateName検索
  - 変更後: `templateId = ps.templateId ?? ''` で templateId を主キーとして渡す
- [ ] `updateActualAndUncertainty` 呼び出しに `templateId` を追加

### STEP 8: バックエンド型定義の修正（API型）
**ファイル:** `backend/src/types/api.ts`

- [ ] `InstructionTemplate` インターフェースに以下を追加
  - `transitionId: string | null`
  - `transitionName: string | null`

### STEP 9: バックエンド Service の修正
**ファイル:** `backend/src/services/experimentInstructionService.ts`

- [ ] `instructionDetailMap` のキーを `templateId` ベースに変更
  - キー: `${methodId}__${taskNo}__${templateId}__${propKey}`
- [ ] `instructionDetailMap` の値型を拡張（既存2フィールドに4つ追加）
  - `transitionId: string | null`
  - `transitionName: string | null`
  - `xsiType: string | null`
  - `expectedValue: string | null`
- [ ] `instructionDetails` ループで `template_id` が null のレコードはスキップ（後方互換）
- [ ] 上記4フィールドも格納する
- [ ] ネスト変換ループで `template_data.place_id` と `detail.template_id` の照合ロジックを追加
- [ ] `InstructionTemplate` 構築時に `transitionId`/`transitionName` を設定
- [ ] `fields` マッピング時に `detail` の値を反映
  - `xsiType`: `field.xsiType ?? detail?.xsiType ?? null`
  - `plannedValue`: `detail?.expectedValue ?? null`
- [ ] 関数コメント更新（`"Phase 5で..."` のコメントを削除）

### STEP 10: フロントエンド型定義の修正
**ファイル:** `frontend/src/types/experimentInstruction.ts`

- [ ] `InstructionTemplateResponse` に以下を追加
  - `transitionId: string | null`
  - `transitionName: string | null`

### STEP 11: フロントエンド コンポーネントの修正
**ファイル:** `frontend/src/components/project/ExperimentInstructionTab.tsx`

- [ ] `toTaskStatusStr` 関数を廃止
- [ ] `FlatRow.taskStatus` の型を `string` → `number | null` に変更
- [ ] `TASK_STATUS_CONFIG` のキーを数値ベースに変更（`0`〜`5` + `null` フォールバック）
- [ ] `taskStatus` 列の `render` を `v: number | null` で受け取るよう修正
- [ ] `flattenInstructions` 内のハードコードを修正
  - `transitionId: tmpl.transitionId ?? ''`
  - `transitionName: tmpl.transitionName ?? ''`
- [ ] `reviewWaitingTasks` フィルタ条件を数値比較に変更（`!== '04'` → `!== 2`）

---

## 変更ファイル一覧

### フェーズ1: 当初計画

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `backend/migrations/20260909_add_transition_name_and_template_id_to_instruction_detail.sql` | 新規: カラム追加 + 主キー変更マイグレーション |
| 2 | `docs/design/db/ddl/experiment_instruction_detail.sql` | 修正: DDL更新（主キー変更・カラム追加） |
| 3 | `backend/src/types/database.ts` | 修正: `ExperimentInstructionDetail` 型更新 |
| 4 | `backend/src/repositories/experimentInstructionDetailRepository.ts` | 修正: `PRIMARY_KEYS`・`upsertFromPlan`・`updateActualAndUncertainty` 更新 |
| 5 | `backend/src/sql/queries/experiment_instruction_details/upsertFromPlan.sql` | 修正: 主キー変更・カラム追加 |
| 6 | `backend/src/sql/queries/experiment_instruction_details/updateActualAndUncertainty.sql` | 修正: 主キー変更・カラム追加 |
| 7 | `backend/src/services/experimentPlanService.ts` | 修正: `templateId`/`transitionName` 追加 |
| 8 | `backend/src/services/experimentDataService.ts` | 修正: `templateId` 主キー化 |
| 9 | `backend/src/types/api.ts` | 修正: `InstructionTemplate`・`UpsertExperimentPlanInput` 拡張 |
| 10 | `backend/src/services/experimentInstructionService.ts` | 修正: `experiment_instruction_detail` 主軸の完全再設計 + 定量評価取得復活 |
| 11 | `frontend/src/types/experimentInstruction.ts` | 修正: `InstructionTemplateResponse` に `transitionId`/`transitionName` 追加 |
| 12 | `frontend/src/components/project/ExperimentInstructionTab.tsx` | 修正: ステータス表示修正・transitionId/Name反映 |
| 13 | `frontend/src/services/experimentPlanApiService.ts` | 修正: `upsertExperimentPlanToApi` に `transitions` 引数追加 |
| 14 | `frontend/src/components/project/ExperimentPlanDialog.tsx` | 修正: `transitions` を渡すよう変更 |
| 15 | `backend/src/controllers/experimentPlanController.ts` | 修正: `transitions` をリクエストボディから受け取り渡す |

### フェーズ2: 追加修正（prop_key不正・getExperimentInstructions再設計）

| # | ファイル | 変更内容 |
|---|---------|---------|
| 16 | `backend/src/services/experimentPlanService.ts` | 修正: `propKey` 切り出しロジック修正（`templateId` プレフィックスを正確に除去） |
| 17 | `backend/src/services/experimentInstructionService.ts` | 修正: `template_data` 主軸 → `experiment_instruction_detail` 完全主軸に再設計 |

### フェーズ3: `experiment_uncertainty_judge.place_id` → `template_id` 統一

**背景:** `property_set.templateId` の修正（`place_id`→正しい `template.id`）に伴い、`experiment_uncertainty_judge.place_id` カラムも `template_id` に統一。

| # | ファイル | 変更内容 |
|---|---------|---------|
| 18 | `backend/migrations/20260909_rename_place_id_to_template_id_in_uncertainty_judge.sql` | 新規: `place_id` → `template_id` リネーム + インデックス再作成 |
| 19 | `docs/design/db/ddl/experiment_uncertainty_judge.sql` | 修正: DDL更新 |
| 20 | `backend/src/sql/queries/experiment_uncertainty_judge/insert.sql` | 修正: `place_id` → `template_id` |
| 21 | `backend/src/sql/queries/experiment_uncertainty_judge/findAllByProject.sql` | 修正: `place_id` → `template_id`、DISTINCT ON更新 |
| 22 | `backend/src/sql/queries/experiment_uncertainty_judge/findLatestByProjectAndProp.sql` | 修正: `place_id` → `template_id` |
| 23 | `backend/src/sql/queries/experiment_uncertainty_judge/findSummaryByProject.sql` | 修正: `place_id` → `template_id`、DISTINCT ON更新 |
| 24 | `backend/src/repositories/experimentUncertaintyJudgeRepository.ts` | 修正: 型定義・引数 `placeId` → `templateId` |
| 25 | `backend/src/services/uncertaintyJudgeService.ts` | 修正: `UncertaintyValueInput`・`UncertaintyJudgeResult` の `placeId` → `templateId` |
| 26 | `backend/src/services/maimlWriterService.ts` | 修正: `jr.placeId` → `jr.templateId`、集約キーを `templateId` ベースに変更 |
| 27 | `backend/src/services/experimentDataService.ts` | 修正: `qualitativeValues` / `saveBatchData` の `placeId` → `templateId` |
| 28 | `backend/src/controllers/experimentController.ts` | 修正: `rawUncertaintyValues`・`rawQualitativeValues` の `placeId` → `templateId` |
| 29 | `frontend/src/types/api.ts` | 修正: `SaveBatchExperimentDataRequest` の `placeId` → `templateId` |
| 30 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 修正: `confidenceValuesRef`・`uncertaintyValues` 構築箇所の `placeId` → `templateId` |

---

## 影響範囲

### `experiment_instruction_detail` テーブル（フェーズ1）
- 主キーを `template_name` → `template_id`（MAIMLの `template.id`）に変更
- `transition_name` / `template_name`（表示ラベル）カラムを追加
- 既存レコードへの仮値設定（`transition_id__template_name` 形式）後に主キー再作成
- ExperimentPlanDialog 保存時に正式値で上書き

### `getExperimentInstructions` 再設計（フェーズ2）
- `template_data` 主軸 → `experiment_instruction_detail` 主軸に完全変更
- 実験作業未実施でも表示可能（`experiment_instruction_detail` があれば表示）
- 定量評価は `experiment_uncertainty_judge` から `templateId` ベースで結合

### `experiment_uncertainty_judge` テーブル（フェーズ3）
- `place_id` カラムを `template_id` にリネーム
- WorkRecordPanel・experimentController の送信データを `placeId` → `templateId` に統一
- 既存データの `place_id` 値（旧実装では `template_data.place_id` = `property_set.templateId` だったため値は一致していた）はリネームのみで内容変更なし

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `experiment_instruction_detail` 主キー変更時に既存データが NULL → 仮値で一意でない | 高 | 低 | `transition_id__template_name` は旧主キー構成要素の組み合わせで一意性を保証 |
| 既存の `experiment_instruction_detail` レコード（仮値）が `template_id` と不一致で③④未表示 | 中 | 高 | 次回 ExperimentPlanDialog 保存で正式値に更新される。許容設計 |
| `updateActualAndUncertainty` の `template_id` が NULL の場合に INSERT 失敗 | 高 | 低 | `ps.templateId` が空の場合はスキップするガード処理を追加 |
| `experiment_uncertainty_judge` リネームで既存の判定結果が参照できなくなる | 低 | 低 | リネームのみで値の変更なし（旧 `place_id` = 旧 `property_set.templateId` で整合性あり） |
| `TASK_STATUS_CONFIG` キー変更でステータス表示が崩れる | 中 | 低 | 手動確認 |

---

## テスト計画

- [ ] タスクステータス `0`（実行待ち）で「実行待ち」と表示されること
- [ ] `project_task_detail` 未存在（`null`）の場合に適切なフォールバック表示になること
- [ ] ExperimentPlanDialog で保存後、実験指示タブにトランジション名・xsi:type・想定値が表示されること
- [ ] `experiment_instruction_detail` に `expected_value` 登録済みフィールドで想定値が表示されること
- [ ] `experiment_instruction_detail` に `xsi_type` 登録済みフィールドで xsi:type Tag が表示されること
- [ ] WorkRecordPanel での不確かさ判定が `experiment_uncertainty_judge` に `template_id` で保存されること
- [ ] 実験指示タブの定量評価列に判定結果が表示されること
- [ ] WorkRecordPanel での定性評価が正しく保存・表示されること

---

## 承認記録
- **計画書提示日時**: 2026-09-09 10:00
- **承認日時**: 2026-09-09 10:30
- **承認者コメント**: 承認します。

## 実施記録
- **開始**: 2026-09-09 10:30
- **完了**: 2026-09-09

### フェーズ1 実施済みファイル
- [x] `backend/migrations/20260909_add_transition_name_and_template_id_to_instruction_detail.sql`
- [x] `docs/design/db/ddl/experiment_instruction_detail.sql`
- [x] `backend/src/types/database.ts`
- [x] `backend/src/repositories/experimentInstructionDetailRepository.ts`
- [x] `backend/src/sql/queries/experiment_instruction_details/upsertFromPlan.sql`
- [x] `backend/src/sql/queries/experiment_instruction_details/updateActualAndUncertainty.sql`
- [x] `backend/src/services/experimentPlanService.ts`
- [x] `backend/src/services/experimentDataService.ts`
- [x] `backend/src/types/api.ts`
- [x] `backend/src/services/experimentInstructionService.ts`
- [x] `frontend/src/types/experimentInstruction.ts`
- [x] `frontend/src/components/project/ExperimentInstructionTab.tsx`
- [x] `frontend/src/services/experimentPlanApiService.ts`
- [x] `frontend/src/components/project/ExperimentPlanDialog.tsx`
- [x] `backend/src/controllers/experimentPlanController.ts`

### フェーズ2 実施済みファイル
- [x] `backend/src/services/experimentPlanService.ts`（propKey切り出しロジック修正）
- [x] `backend/src/services/experimentInstructionService.ts`（`experiment_instruction_detail` 主軸に完全再設計）

### フェーズ3 実施済みファイル
- [x] `backend/migrations/20260909_rename_place_id_to_template_id_in_uncertainty_judge.sql`
- [x] `docs/design/db/ddl/experiment_uncertainty_judge.sql`
- [x] `backend/src/sql/queries/experiment_uncertainty_judge/insert.sql`
- [x] `backend/src/sql/queries/experiment_uncertainty_judge/findAllByProject.sql`
- [x] `backend/src/sql/queries/experiment_uncertainty_judge/findLatestByProjectAndProp.sql`
- [x] `backend/src/sql/queries/experiment_uncertainty_judge/findSummaryByProject.sql`
- [x] `backend/src/repositories/experimentUncertaintyJudgeRepository.ts`
- [x] `backend/src/services/uncertaintyJudgeService.ts`
- [x] `backend/src/services/maimlWriterService.ts`
- [x] `backend/src/services/experimentInstructionService.ts`（定量評価取得復活）
- [x] `backend/src/services/experimentDataService.ts`
- [x] `backend/src/controllers/experimentController.ts`
- [x] `frontend/src/types/api.ts`
- [x] `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

### 型チェック結果（最終）
- backend: `tsc --noEmit` → エラー 0
- frontend: `tsc --noEmit` → エラー 0


# タスク計画書: テンプレート値・不確かさ初期反映修正とdata層表示実装

## メタデータ
- **作成日時**: 2026-08-04 10:22
- **タスクID**: template-default-and-data-layer
- **優先度**: 高
- **推定工数**: 3〜4時間

## タスク概要

①「実験計画詳細指示モーダル」初回表示時に、Templateで設定されたvalue（値）とUncertainty（不確かさ値）が入力欄に反映されない問題を修正する。

②アップロードしたMaiMLファイルにdata層（`data.results[].material/condition/result`）の記載がある場合、その値をモーダルの入力フィールドに表示する。

## 目的と期待される成果

- [x] ①テンプレートのdefaultValueがモーダル初回表示時に入力欄に反映される
- [x] ①テンプレートのdefaultUncertaintiesがモーダル初回表示時に不確かさバーに反映される
- [ ] ②MAIMLのdata層にインスタンスの値がある場合、対応するテンプレートフィールドの初期値として表示される
- [ ] ②data層がない場合は従来通りの動作（エラーにしない）

## 実装ステップ

### Phase 1: ①の原因調査と修正
- [ ] `ExperimentPlanDialog.tsx`の初期化useEffectを確認し、`buildDefaultTemplateValues()`と`buildDefaultAssignedUncertainty()`の呼び出しタイミングを修正
- [ ] `convertTemplate()`でdefaultValueが正しく設定されているか確認・修正

### Phase 2: ②バックエンド — data層パースとPlanDialogData型追加
- [ ] `backend/src/types/api.ts` の `PlanDialogData` に `dataInstances` フィールドを追加
- [ ] `backend/src/services/experimentInstructionService.ts` の `getPlanDialogDataFromMaiml()` でdata層をパースして `dataInstances` に格納

### Phase 3: ②フロントエンド — data層値の表示
- [ ] `frontend/src/services/experimentPlanApiService.ts` の `PlanDialogData` 型に `dataInstances` を追加
- [ ] `frontend/src/types/experimentPlanDialog.ts` の `TemplateInputPanelProps` に `dataInstances` prop を追加
- [ ] `frontend/src/components/project/ExperimentPlanDialog.tsx` で `TemplateInputPanel` に `dialogData.dataInstances` を渡す
- [ ] `frontend/src/components/project/ExperimentPlanDialog/TemplateInputPanel.tsx` でdata層値をフィールド初期値として表示

## 変更ファイル

1. `backend/src/types/api.ts` - `PlanDialogData.dataInstances` 追加
2. `backend/src/services/experimentInstructionService.ts` - data層パース・`convertTemplate()`確認
3. `frontend/src/services/experimentPlanApiService.ts` - `PlanDialogData.dataInstances` 追加
4. `frontend/src/types/experimentPlanDialog.ts` - `TemplateInputPanelProps.dataInstances` 追加
5. `frontend/src/components/project/ExperimentPlanDialog.tsx` - `TemplateInputPanel`へのprop追加、初期化修正
6. `frontend/src/components/project/ExperimentPlanDialog/TemplateInputPanel.tsx` - data層値の初期値セット表示

## 承認記録
- **承認日時**: 2026-08-04 10:22

# タスク計画書: テンプレートvalue・不確かさを実験計画詳細指示ダイアログに反映

## メタデータ
- **作成日時**: 2026-07-23 10:40
- **タスクID**: template-default-uncertainty-in-plan-dialog
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

MAIMLのテンプレート（material/condition/result）に設定されたpropertyのvalue（defaultValue）と
Uncertainty（不確かさ）が、実験計画詳細指示ダイアログのテンプレートフィールドに反映されていない問題を修正する。

## 目的と期待される成果

- [ ] テンプレートに設定されたpropertyのvalue（defaultValue）がダイアログ初期表示時に入力欄の初期値として反映される
- [ ] テンプレートのpropertyに付与されたUncertaintyがダイアログ初期表示時に不確かさの初期値として反映される
- [ ] 既にDBに保存済みのデータがある場合は保存データを優先する（上書きしない）

## 実装ステップ

### Phase 1: バックエンド修正
- [ ] `backend/src/services/experimentInstructionService.ts` の `convertTemplate()` にuncertainty→defaultUncertainties変換を追加

### Phase 2: フロントエンド型定義修正
- [ ] `frontend/src/types/experimentPlan.ts` の `TemplateField` に `defaultUncertainties?: UncertaintyAssignment[]` を追加

### Phase 3: フロントエンドヘルパー追加
- [ ] `frontend/src/utils/experimentPlanHelpers.ts` に `buildDefaultAssignedUncertainty()` 関数を追加

### Phase 4: ExperimentPlanDialog修正
- [ ] `frontend/src/components/project/ExperimentPlanDialog.tsx` でトランジション選択時の初期化に `buildDefaultAssignedUncertainty()` を適用

## 変更ファイル

1. `backend/src/services/experimentInstructionService.ts` - convertTemplate()にuncertainty変換追加
2. `frontend/src/types/experimentPlan.ts` - TemplateFieldにdefaultUncertaintiesフィールド追加
3. `frontend/src/utils/experimentPlanHelpers.ts` - buildDefaultAssignedUncertainty()関数追加
4. `frontend/src/components/project/ExperimentPlanDialog.tsx` - デフォルト不確かさ初期化対応

## 承認記録
- **承認日時**: 2026-07-23 10:40

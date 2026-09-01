# タスク計画書: 定性評価表示修正（WorkRecordPanel）

## メタデータ
- **作成日時**: 2026-08-24 11:50
- **タスクID**: 定性評価表示修正2_WorkRecordPanel
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験作業者メニューの実験記録タブのプロパティカードで、定性評価が常にデフォルト（確か/曖昧/不確か）になっている問題を修正する。

## 根本原因

`WorkRecordPanel.tsx` の `buildTransitions` 関数は `getExperimentPlans()` 
（`experiment_plan.planned_values.__uncertainty__`）からプロパティ情報を構築しているが、
`__uncertainty__` マップには以下が含まれていない：
- `qualitativeOptions`（定性評価選択肢 ← `intuition_selector` テーブル由来）
- `qualitativeEval`（保存済み初期選択値 ← `template_data.property_set.uncertainties[].value`）
- `qualitativeNote`（定性評価説明 ← `template_data.property_set.uncertainties[].description`）

一方 `convertRawPropertyToMockProperty` は `p.qualitativeOptions` が未設定の場合、
デフォルトの `['確か', '曖昧', '不確か']` を使用するため、常にデフォルト表示になる。

## 修正方針

`buildTransitions` 内で以下を追加：
1. 全トランジションの `__uncertainty__` から uncertainty key を収集
2. `fetchUncertaintyCriteriaForSelector()` を呼び出して
   `uncertaintyKey → { isQualitative, qualitativeOptions }` マップを構築
3. 各プロパティの `__uncertainty__` 処理時に、qualitative な場合は
   `qualitativeOptions` / `qualitativeEval` / `qualitativeNote` を `p` に追加

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
   - `fetchUncertaintyCriteriaForSelector` を import 追加
   - `QualitativeOptionApiRow` 型を import 追加
   - `buildTransitions` に uncertainty criteria 取得処理を追加

## テスト計画
- [ ] 定性評価keyを持つプロパティカードで正しい選択肢（DB由来）が表示される
- [ ] `value` が設定済みの場合、その値が初期選択状態になる
- [ ] `description` が設定済みの場合、定性評価ヘッダーの右隣に表示される
- [ ] 定量評価のみのプロパティは影響を受けない

## 承認記録
- **計画書提示日時**: 2026-08-24 11:50

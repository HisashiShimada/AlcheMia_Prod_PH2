# タスク計画書: buildTransitions templateData 単一ソース化

## メタデータ
- **作成日時**: 2026-08-24 14:51
- **タスクID**: buildTransitions_templateData単一ソース化
- **優先度**: 低
- **推定工数**: 0.1時間

## タスク概要

WorkRecordPanel.tsx の `buildTransitions` useEffect が `getExperimentPlans()` ではなく `getTemplateData()` の単一ソースからプロパティカードを構築するように変更する。

## 現状分析結果

コード調査の結果、**buildTransitions useEffect のロジックはすでに templateData 単一ソースに変更済み**であった。
行 1869〜1871 のコメントにも「getExperimentPlans / fetchUncertaintyCriteriaForSelector は不要」と記載されている。

残存する作業：`getExperimentPlans` が import 文に残っているが、コード内で一切使用されていない（未使用 import）。

## 実装ステップ

- [x] 現状コードの調査・確認
- [ ] 未使用 import `getExperimentPlans` の削除

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` — import から `getExperimentPlans` を削除

## 承認記録
- **承認日時**: 2026-08-24 14:51

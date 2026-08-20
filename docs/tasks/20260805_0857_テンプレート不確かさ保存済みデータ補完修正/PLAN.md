# タスク計画書: テンプレート不確かさ保存済みデータ補完修正

## メタデータ
- **作成日時**: 2026-08-05 08:57
- **タスクID**: template-uncertainty-merge-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

MAIMLのprogramタグ配下のtemplate内に `uncertainty`（不確かさ）が定義されている場合、
タスク登録後に「実験計画詳細指示ダイアログ」を開くと不確かさが反映されない問題を修正する。

## 原因

タスク登録時の初期INSERT（`experiment_plan`テーブル）により保存済みデータが存在するため、
ダイアログ開時に「保存済みデータあり → 優先使用」と判定され、
MAIMLテンプレートの `defaultUncertainties` から生成する `buildDefaultAssignedUncertainty()` が
スキップされてしまう。

保存済みデータの `__uncertainty__` は初期INSERT時に空のため、不確かさだけが未反映になる。

## 対応方針

フロントエンド側でフォールバック補完を行う（案A）：
- 保存済みデータを復元した後、各トランジションの `assignedUncertainty` が空の場合のみ
  テンプレートのデフォルト不確かさで補完する
- ユーザーが意図的に不確かさを削除した場合（`assignedUncertainty` が非空）は再表示しない

## 変更ファイル

1. `frontend/src/utils/experimentPlanHelpers.ts` - `mergeDefaultUncertainty()` 関数を追加
2. `frontend/src/components/project/ExperimentPlanDialog.tsx` - 補完処理を適用

## 承認記録
- **承認日時**: 2026-08-05 08:57

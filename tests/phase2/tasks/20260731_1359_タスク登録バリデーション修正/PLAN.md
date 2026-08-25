# タスク計画書: タスク登録バリデーション修正

## メタデータ
- **作成日時**: 2026-07-31 13:59
- **タスクID**: fix-task-registration-validation
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

「タスク情報を保存」ボタン押下時に、実験計画詳細指示モーダルでタスク登録済みにもかかわらず「タスクを登録してください」という警告が出るバグを修正する。

## 原因

`handleSave` の冒頭バリデーションが `instructions` state（`project_instruction` テーブル由来）の件数のみを判定しているが、タスク行の「指示追加」ボタンから開く `ExperimentPlanDialog` での保存は `experiment_plan` テーブルに保存するため、`instructions` state は更新されない。

結果として、実験計画のみ登録して指示（`InstructionEditDialog` 経由）を1件も追加していない場合、`instructions.length === 0` が true になり警告でブロックされる。

## 修正方針

バリデーションを以下の OR 条件に変更する：
- `instructions.length > 0`（従来: project_instruction に指示あり）
- **追加**: チェック済みメソッドの `experiment_plan` が全メソッドに存在する

`experiment_plan` の確認は保存ボタン押下時に `getExperimentPlans` API を呼び出して行う（すでに `currentData = await getTaskRegistration(projectId)` の直後に MAIML 登録チェックのための API 呼び出しがあるため、同じタイミングで確認可能）。

## 変更ファイル

1. `frontend/src/components/project/TaskRegistrationTab.tsx`
   - `getExperimentPlans` を import に追加
   - `handleSave` のバリデーション修正

## 承認記録
- **計画書提示日時**: 2026-07-31 13:59
- **承認日時**: 2026-07-31 13:59（ユーザー承認済み）

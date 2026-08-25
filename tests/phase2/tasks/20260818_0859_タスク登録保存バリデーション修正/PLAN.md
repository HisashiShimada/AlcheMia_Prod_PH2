# タスク計画書: タスク登録保存バリデーション修正

## メタデータ
- **作成日時**: 2026-08-18 08:59
- **タスクID**: fix-task-registration-save-validation
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

「作業単位の指示追加」ボタンから実験計画ダイアログで指示を保存後、「タスク情報を保存」ボタンを押下すると「タスクを最低１つは登録してください」（requireInstruction）の警告が出て保存できないバグを修正する。

## 原因

`handleSave` 冒頭のバリデーションが `instructions` state（`project_instruction` テーブル由来）のみを判定している。

「作業単位の指示追加」ボタン → `ExperimentPlanDialog`（実験計画ダイアログ） → 保存
という経路では **`experiment_plan` テーブル** に書き込まれるため、`instructions` state は更新されない。

結果として `unsentInstructions.length === 0` が true になり、警告が出てブロックされる。

## 修正方針

バリデーションを以下の OR 条件に変更する：

- `instructions` に instruction_status=0（未送信）の指示が1件以上ある ← 従来
- **追加**：チェック済みメソッドのいずれかに `experiment_plan` が存在する

## 変更ファイル

1. `frontend/src/components/project/TaskRegistrationTab.tsx`
   - `getExperimentPlans` を import に追加
   - `handleSave` のバリデーション部分を OR 条件に修正

## 承認記録
- **承認日時**: 2026-08-18 08:59（ユーザー承認済み）

# タスク計画書: タスク登録時 experiment_plan 初期INSERT追加

## メタデータ
- **作成日時**: 2026-08-03 08:40
- **タスクID**: task-reg-experiment-plan-init
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

「タスク情報を保存」ボタン押下時に `experiment_plan` テーブルへ初期レコード（`planned_values = {}`）を INSERT する処理を追加する。  
既存データは上書きしない（`ON CONFLICT DO NOTHING`）。

## 目的と期待される成果

- [ ] タスク登録保存時に `experiment_plan` テーブルへ初期レコードが作成されること
- [ ] 再保存時は既存の `planned_values` を上書きしないこと

## 実装ステップ

- [ ] `backend/src/sql/queries/experiment_plans/initInsert.sql` 新規作成
- [ ] `backend/src/repositories/experimentPlanRepository.ts` に `initInsertForTransaction()` を追加
- [ ] `backend/src/services/taskRegistrationService.ts` にステップ 6-5 として呼び出しを追加

## 変更ファイル
1. `backend/src/sql/queries/experiment_plans/initInsert.sql` - 新規作成
2. `backend/src/repositories/experimentPlanRepository.ts` - メソッド追加
3. `backend/src/services/taskRegistrationService.ts` - 呼び出し追加

## 承認記録
- **承認日時**: 2026-08-03 08:40

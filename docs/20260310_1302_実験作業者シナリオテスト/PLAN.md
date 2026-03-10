# タスク計画書: 実験作業者 シナリオテスト作成

## メタデータ
- **作成日時**: 2026-03-10 13:02
- **タスクID**: experiment-worker-scenario-test
- **優先度**: 高
- **推定工数**: 4時間

## タスク概要

実験作業者（experiment_worker）ロールを対象としたE2Eシナリオテストを作成する。
要求仕様書から抽出した業務一覧（`docs/20260310_0940_ロール別業務内容一覧.md`）をベースに、
UI設計書・API設計書と照合して正確なテスト対象を確定し、Playwright + playwright-bdd 形式で実装する。

## 目的と期待される成果
- [ ] 要件書の業務内容とUI/API設計書の差異を明確化したテスト対象一覧を作成する
- [ ] 実験作業者の主要業務フローをカバーするシナリオ（.feature）ファイルを作成する
- [ ] 対応するステップ定義（.ts）ファイルを作成する

## 実装ステップ
- [ ] テスト対象業務・機能一覧（5_experiment_worker_test_targets.md）を作成する
- [ ] 共通ステップファイル（e2e/steps/experiment_worker/common.ts）を作成する
- [ ] 5-1: プロジェクト選択の featureファイルとステップファイルを作成する
- [ ] 5-2: 実験記録（トランジション記録）の featureファイルとステップファイルを作成する
- [ ] 5-3: 問題報告の featureファイルとステップファイルを作成する
- [ ] 5-4: 指示確認の featureファイルとステップファイルを作成する
- [ ] 5-5: 進捗確認の featureファイルとステップファイルを作成する

## 変更ファイル
1. `docs/20260310_1302_実験作業者シナリオテスト/PLAN.md` - 本ファイル
2. `tests\e2e\test-scenarios\5_experiment_worker.md` - テスト対象一覧
3. `tests/e2e/features/experiment_worker/5-1_project_selection.feature`
4. `tests/e2e/features/experiment_worker/5-2_experiment_record.feature`
5. `tests/e2e/features/experiment_worker/5-3_issue_report.feature`
6. `tests/e2e/features/experiment_worker/5-4_instruction_confirmation.feature`
7. `tests/e2e/features/experiment_worker/5-5_progress_check.feature`
8. `tests/e2e/steps/experiment_worker/common.ts`
9. `tests/e2e/steps/experiment_worker/5-1_project_selection.ts`
10. `tests/e2e/steps/experiment_worker/5-2_experiment_record.ts`
11. `tests/e2e/steps/experiment_worker/5-3_issue_report.ts`
12. `tests/e2e/steps/experiment_worker/5-4_instruction_confirmation.ts`
13. `tests/e2e/steps/experiment_worker/5-5_progress_check.ts`

## 承認記録
- **計画書提示日時**: 2026-03-10 13:02
- **承認日時**: -

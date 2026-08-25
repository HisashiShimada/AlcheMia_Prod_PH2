# タスク計画書: 実験計画・指示・作業機能統合 UI仕様書作成

## メタデータ
- **作成日時**: 2026-06-22 16:06
- **タスクID**: experiment-ui-spec
- **優先度**: 高
- **推定工数**: 3〜4時間
- **参照元**: `docs/20260618_実験計画・指示・作業機能統合/PLAN.md`

## タスク概要

`docs/20260618_実験計画・指示・作業機能統合/PLAN.md` に定義された実験計画・指示・作業機能統合の実装において、
新規作成・修正されたコンポーネントのUI仕様書とAPI仕様書を作成・修正する。

## 目的と期待される成果

- [ ] ExperimentPlanDialog の UI仕様書 新規作成
- [ ] ExperimentInstructionTab の UI仕様書 新規作成
- [ ] ExperimentInstructionTable の UI仕様書 新規作成
- [ ] WorkRecordPanel の UI仕様書 新規作成（想定値表示・DataRecordDialog統合仕様を含む）
- [ ] ProgressOverviewTab の UI仕様書 新規作成（依存関係・スキップ機能仕様を含む）
- [ ] 実験計画・指示API仕様書 新規作成
- [ ] `docs/design/ui/ui_screen_list.md` に新規コンポーネントを追記

## 作成ファイル一覧

### UI仕様書（新規作成）

| # | ファイルパス | 内容 |
|---|------------|------|
| 1 | `docs/design/ui/experiment_admin/01_project_management/ui_experiment_plan_dialog.md` | 実験計画指示記入ダイアログ（Manager向け） |
| 2 | `docs/design/ui/experiment_admin/01_project_management/ui_experiment_instruction_tab.md` | 実験指示レビュータブ（Manager向け） |
| 3 | `docs/design/ui/experiment_admin/01_project_management/ui_experiment_instruction_table.md` | 実験指示テーブル（Manager向け・承認/NG操作） |
| 4 | `docs/design/ui/experiment_worker/ui_work_record_panel.md` | 作業記録パネル（Worker向け・想定値表示含む） |
| 5 | `docs/design/ui/experiment_worker/ui_progress_overview_tab.md` | 全体進捗タブ（Worker向け・依存関係・スキップ機能） |

### API仕様書（新規作成）

| # | ファイルパス | 内容 |
|---|------------|------|
| 6 | `docs/design/api/api_experiment_plan.md` | 実験計画API + 実験指示API（計8エンドポイント） |

### 既存ファイル修正

| # | ファイルパス | 内容 |
|---|------------|------|
| 7 | `docs/design/ui/ui_screen_list.md` | 新規コンポーネント5つを追加 |

## 実装ステップ

- [ ] Step 1: `ui_experiment_plan_dialog.md` 作成
- [ ] Step 2: `ui_experiment_instruction_tab.md` 作成
- [ ] Step 3: `ui_experiment_instruction_table.md` 作成
- [ ] Step 4: `ui_work_record_panel.md` 作成
- [ ] Step 5: `ui_progress_overview_tab.md` 作成
- [ ] Step 6: `api_experiment_plan.md` 作成
- [ ] Step 7: `ui_screen_list.md` 修正

## 参照ドキュメント

- `docs/20260618_実験計画・指示・作業機能統合/frontend_design.md`
- `docs/20260618_実験計画・指示・作業機能統合/api_design.md`
- `docs/design/ui/experiment_worker/ui_experiment_worker_main.md`（UI仕様書フォーマット参考）
- `docs/design/ui/experiment_worker/ui_data_record_dialog.md`（UI仕様書フォーマット参考）

## 承認記録

- **計画書提示日時**: 2026-06-22 16:08
- **承認日時**: —
- **承認者コメント**: —

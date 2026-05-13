# タスク計画書: 5-2 実験記録（トランジション記録）E2Eテスト実装

## メタデータ
- **作成日時**: 2026-03-12 17:37
- **タスクID**: e2e-5-2-experiment-record
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要

`tests/e2e/test-scenarios/5_experiment_worker.md` の 5-2-1〜5-2-23（23件）のE2Eテストを実装する。
対象は Playwright 自動テストのため、featureファイルとstepsファイルの両方を作成する。

## 実装ステップ

- [x] タスク計画書（本ファイル）を作成
- [ ] TransitionList.tsx に `data-testid="transition-record-button"` を追加
- [ ] DataRecordDialog.tsx に各種 data-testid を追加
- [ ] 5-2_experiment_record.feature を作成（5-2-1〜5-2-23）
- [ ] 5-2_experiment_record.ts を作成（Before/After/When/Then/Helpers）

## 変更ファイル

### 新規作成
1. `tests/e2e/features/5_experiment_worker/5-2_experiment_record.feature`
2. `tests/e2e/steps/5_experiment_worker/5-2_experiment_record.ts`

### 修正
1. `frontend/src/components/ExperimentWorker/TransitionList.tsx` - `data-testid="transition-record-button"` 追加
2. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` - 各種 data-testid 追加

## 追加する data-testid 一覧

### TransitionList.tsx
- `transition-record-button` : 記録ボタン

### DataRecordDialog.tsx
- `data-record-dialog` : Modalコンポーネント全体
- `status-update-section` : ステータス更新セクション div
- `transition-status-select` : ステータス選択 Select
- `progress-slider` : 進捗スライダー Slider
- `status-comment-textarea` : コメント TextArea
- `status-update-save-button` : ステータス更新保存ボタン
- `template-search-input` : テンプレート検索 Input
- `template-category-select` : テンプレート種別 Select
- `template-list-table` : テンプレート一覧 Table
- `template-select-prompt` : テンプレート未選択時 Alert

## 承認記録
- **承認日時**: 2026-03-12 17:37

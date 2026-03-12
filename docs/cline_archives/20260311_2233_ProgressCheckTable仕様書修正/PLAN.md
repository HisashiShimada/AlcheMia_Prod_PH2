# タスク計画書: ProgressCheckTable仕様書修正

## メタデータ
- **作成日時**: 2026-03-11 22:33
- **タスクID**: ProgressCheckTable仕様書修正
- **優先度**: 低
- **推定工数**: 0.5時間

## タスク概要

`docs/design/ui/experiment_worker/ui_progress_check_table.md` の仕様書を、ソースコード `frontend/src/components/ExperimentWorker/ProgressCheckTable.tsx` の実装と一致するように修正する。

## 目的と期待される成果

- [ ] 仕様書のProps定義に `readOnly` を追加
- [ ] 仕様書のデータフローに `readOnly` の伝播を追記

## 実装ステップ

### Phase 1: Props定義の修正

- [ ] Section 3（Props）に `readOnly?: boolean` を追加（説明付き）

### Phase 2: データフローの修正

- [ ] Section 6.1（データフロー）に `readOnly` のTaskListTableへの伝播を追記

### Phase 3: 変更履歴の更新

- [ ] Section 12（変更履歴）にバージョン 1.1.0 を追加

## 変更ファイル

1. `docs/design/ui/experiment_worker/ui_progress_check_table.md` - 仕様書の修正

## 承認記録

- **計画書提示日時**: 2026-03-11 22:33
- **承認日時**: 
- **承認者コメント**: 

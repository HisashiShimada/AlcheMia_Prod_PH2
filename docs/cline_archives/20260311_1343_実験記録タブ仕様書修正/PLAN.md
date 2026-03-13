# タスク計画書: 実験記録タブ仕様書修正

## メタデータ
- **作成日時**: 2026-03-11 14:43
- **タスクID**: 実験記録タブ仕様書修正
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`docs/design/ui/experiment_worker/ui_experiment_record_tab.md` の仕様書をソースコード（`ExperimentRecordTab.tsx`）の実装内容に合わせて修正する。

## 目的と期待される成果

- [ ] 仕様書がソースコードの現状を正確に反映すること
- [ ] 実装済みのAPIや機能がTODOから完了済みに更新されること
- [ ] Props・State・ロジックの記載が最新の実装と一致すること

## 実装ステップ

### Phase 1: Props定義の修正（§5.1）
- [ ] `selectedProjectName: string` を追加
- [ ] `selectedProjectStatus: number | null` を追加（コメント付き）
- [ ] `useDeemedProgress?: boolean` を追加（コメント付き）

### Phase 2: State定義の修正（§5.2）
- [ ] `issueLoading: boolean` を追加
- [ ] `loading: boolean` を追加
- [ ] `methods: Method[]` を追加
- [ ] `tasks: Task[]` を追加
- [ ] `projectId: string | null` を追加
- [ ] `progressData: Record<string, unknown>[]` を追加

### Phase 3: 算出データの修正（§5.3）
- [ ] `projectsData`（モック参照）の記述を削除
- [ ] `selectedProjectStatus` → `mapNumericStatusToProjectStatus()` → `projectStatus` のマッピングロジックを追加
- [ ] `tasks` の取得元をAPIベースの記述に変更
- [ ] `filteredTasks`（`selectedMethodId` でフィルタ）の説明を追加
- [ ] `transitionsWithProgress` の生成ロジックを `progressData` を起点とした記述に更新

### Phase 4: `isProjectRecordable`判定ロジックの修正（§6.2）
- [ ] ステータス名を最新体系（`waiting_task`・`executing_task`・`waiting_approval`）に更新
- [ ] `isRecordViewableStatus()` 関数の使用と `null` 時の挙動を記載
- [ ] 旧ステータス名（`active`・`in_progress`）を削除

### Phase 5: API一覧の修正（§5.4）
- [ ] `getWorkerTasks` APIを追加（メソッド・タスク一覧取得）
- [ ] 進捗データ取得APIのエンドポイントを修正（`/experiments/...` → `/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions`）
- [ ] 実験データ保存APIの実装状況を「DataRecordDialog内で実装済み」に更新
- [ ] ステータス更新APIの実装状況を「子コンポーネント（TransitionList等）で実装済み」に更新

### Phase 6: データソースの修正（§5.5）
- [ ] `projectsData`（モック）の記載を削除
- [ ] `getIssuesByTransitionId`（モック）の記載を削除
- [ ] 実APIサービス（`getWorkerTasks`・`getIssues` 等）の記述に更新

### Phase 7: イベント定義の修正（§4.2）
- [ ] `handleDataSave` の説明を「モーダルを閉じ、`fetchProgress()` で進捗データを再取得」に更新
- [ ] `handleSubmitIssue` の説明を「`createIssue()` APIを呼び出し」に更新
- [ ] `handleSubmitComment` の説明を「`addComment()` APIを呼び出し」に更新

### Phase 8: メタデータ・変更履歴の更新
- [ ] 最終更新日を更新
- [ ] 変更履歴にバージョン追記

## 変更ファイル

1. `docs/design/ui/experiment_worker/ui_experiment_record_tab.md` - 仕様書修正

## リスク

| リスク | 対策 |
|--------|------|
| 修正漏れ | Phaseごとに細かく分けて1箇所ずつ確認しながら修正する |

## 承認記録
- **計画書提示日時**: 2026-03-11 14:43
- **承認日時**: 

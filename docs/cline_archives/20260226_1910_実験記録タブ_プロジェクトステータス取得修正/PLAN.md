# タスク計画書: 実験記録タブ プロジェクトステータス取得修正

## メタデータ
- **作成日時**: 2026-02-26 19:10
- **タスクID**: experimentrecordtab-project-status-fix
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験記録タブ（`ExperimentRecordTab.tsx`）が遷移時に存在しない `GET /api/v1/projects/:projectId` APIを呼び出している問題を修正する。

親コンポーネント `ExperimentWorkerMenu.tsx` は既に `GET /api/v1/projects/worker-accessible` でプロジェクト一覧（`WorkerProject[]`）を保持しており、`WorkerProject.projectStatus`（数値）を prop 経由で渡すことで、不要なAPIコールを排除する。

## 目的と期待される成果

- [ ] 存在しないAPIへのリクエストを排除
- [ ] プロジェクトステータスを正しく取得・反映する
- [ ] 不要なAPIコール削減によるパフォーマンス改善

## 実装ステップ

### Phase 1: タスク計画書の作成
- [x] タスク計画書を作成

### Phase 2: ExperimentWorkerMenu.tsx の修正
- [ ] 選択中プロジェクトの `projectStatus`（数値）を算出するロジックを追加
- [ ] `ExperimentRecordTab` に `selectedProjectStatus` prop を追加して渡す

### Phase 3: ExperimentRecordTab.tsx の修正
- [ ] `ExperimentRecordTabProps` に `selectedProjectStatus: number | null` を追加
- [ ] 数値ステータス → `ProjectStatus` のマッピング関数を修正（文字列→数値対応）
- [ ] `getProjectDetail` 呼び出しの useEffect を削除
- [ ] `mapBackendStatusToProjectStatus` の使用箇所を新しいマッピング関数に置き換え
- [ ] 不要な import（`getProjectDetail`）を削除

### Phase 4: 動作確認
- [ ] TypeScript のコンパイルエラーがないことを確認

## 変更ファイル

1. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - selectedProjectStatus propを追加
2. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` - getProjectDetail呼び出しを削除し、propから受け取るように変更

## 技術的詳細

### ステータス数値マッピング（WorkerProject.projectStatus）
```
0 = 計画中
1 = タスク実行待ち（waiting_task）
2 = タスク実行中（executing_task）→ 記録可能
3 = 承認待ち（waiting_approval）
4 = 完了（completed）
5 = 異常終了
```

### 記録可否の判定
- `executing_task`（タスク実行中、数値: 2）のみ記録可能
- `null`（未選択/エラー）の場合は安全側に倒して記録可能とする

## リスク

| リスク | 対策 |
|--------|------|
| projectStatus の数値定義が実際のDBと異なる | projectApiService.tsのコメントと照合済み |

## 承認記録
- **計画書提示日時**: 2026-02-26 19:10
- **承認日時**: 2026-02-26 19:10

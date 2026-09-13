# タスク計画書: 指示確認・保存ボタン押下時のプロジェクト/タスクステータス更新漏れ修正

## メタデータ
- **作成日時**: 2026-09-11 10:00
- **タスクID**: 20260911_1000
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

WorkRecordPanel にて「指示確認」ボタンまたは「保存」ボタンを押下したとき、
トランジションステータスは更新されるがプロジェクト・タスクのステータスが
「実行待ち（pending）」のまま「実行中（in_progress）」に変わらない不具合を修正する。

## 目的と期待される成果

- [ ] 指示確認ボタン押下 → トランジション PREPARING→READY 遷移時に、
      タスクステータスが PENDING(0) → IN_PROGRESS(1) に更新されること
- [ ] 指示確認ボタン押下時に、プロジェクトステータスが TASK_PENDING(1) なら
      TASK_IN_PROGRESS(2) に更新されること
- [ ] 保存ボタン押下 → saveBatchData 実行時に、
      タスクステータスが PENDING(0) → IN_PROGRESS(1) に更新されること
- [ ] 保存ボタン押下時に、プロジェクトステータスが TASK_PENDING(1) なら
      TASK_IN_PROGRESS(2) に更新されること
- [ ] 既に IN_PROGRESS / TASK_IN_PROGRESS 以上のステータスには影響しないこと

## 原因

### `handleConfirmInstruction`（指示確認ボタン @ ExperimentWorkerMenu.tsx）
`updateTransitionStatus` API を呼んでトランジションを READY に変更するが、
タスク・プロジェクトステータスの更新 API を呼んでいない。

### `handleSave`（保存ボタン @ WorkRecordPanel.tsx → saveBatchExperimentData API）
`saveBatchExperimentData` バックエンドの `ExperimentDataService.saveBatchData` が
タスク・プロジェクトステータスを更新しない。

## 実装ステップ

### Step 1: progressService.ts の修正（指示確認）
- [ ] `updateTransitionStatus` の `PREPARING → READY` 遷移時に以下を追加
  - `project_task_detail` から当該タスクの `task_status` を取得
  - `task_status === PENDING(0)` の場合のみ `IN_PROGRESS(1)` に UPDATE
  - `project` テーブルから `project_status` を取得
  - `project_status === TASK_PENDING(1)` の場合のみ `TASK_IN_PROGRESS(2)` に UPDATE
  - すべて既存 `client` を使いトランザクション内で実行（COMMIT 前）

### Step 2: experimentDataService.ts の修正（保存）
- [ ] `saveBatchData` の COMMIT 前（ステップ5の後、ステップ6の前）に以下を追加
  - `project_task_detail` から当該タスクの `task_status` を取得
  - `task_status === PENDING(0)` の場合のみ `IN_PROGRESS(1)` に UPDATE
  - `project` テーブルから `project_status` を取得
  - `project_status === TASK_PENDING(1)` の場合のみ `TASK_IN_PROGRESS(2)` に UPDATE
  - すべて既存 `client` を使いトランザクション内で実行

### Step 3: フロントエンド（ExperimentWorkerMenu.tsx）の修正
- [ ] `handleConfirmInstruction` 完了後に `handleTaskStatusChanged()` を呼び出し、
      `selectedProjectStatus` を即座に再取得して UI に反映する

### Step 4: 動作確認
- [ ] TypeScript 型チェック（`npx tsc --noEmit`）がエラーなし

## 変更ファイル
1. `backend/src/services/progressService.ts` - PREPARING→READY 遷移時のステータス更新追加
2. `backend/src/services/experimentDataService.ts` - saveBatchData でのステータス更新追加
3. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - handleTaskStatusChanged 呼び出し追加

## リスク
| リスク | 対策 |
|--------|------|
| 既に IN_PROGRESS 以上のステータスに対して誤更新 | 更新前に現在のステータスを確認し、PENDING(0)/TASK_PENDING(1) の場合のみ更新 |
| トランザクション内での追加クエリが失敗した場合 | エラーは throw してトランザクション全体をロールバック（整合性優先） |
| 複数タスクが同時に指示確認した場合の競合 | 同一 project のプロジェクトステータス更新は条件分岐で一度しか変更しないため問題なし |

## テスト計画
- [ ] プロジェクトステータス=TASK_PENDING(1)、タスクステータス=PENDING(0) の状態で
      指示確認ボタンを押下 → プロジェクト・タスクが共に実行中になること
- [ ] プロジェクトステータス=TASK_PENDING(1)、タスクステータス=PENDING(0) の状態で
      保存ボタンを押下 → プロジェクト・タスクが共に実行中になること
- [ ] プロジェクトステータスが既に TASK_IN_PROGRESS(2) の場合は変化しないこと
- [ ] TypeScript 型チェックがパスすること

## 承認記録
- **承認日時**: 2026-09-11 10:00
- **承認者コメント**: バックエンド対応が好ましい

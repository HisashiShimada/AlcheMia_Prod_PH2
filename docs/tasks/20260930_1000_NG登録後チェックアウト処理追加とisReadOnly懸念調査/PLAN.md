# タスク計画書: NG登録後チェックアウト処理追加と isReadOnly 懸念調査

## メタデータ

- **作成日時**: 2026-09-30 10:00
- **タスクID**: 20260930_1000
- **優先度**: 中
- **推定工数**: 3〜5 時間

---

## 1. タスク概要

### 1-1. メイン要件

`ExperimentInstructionTab.tsx` の `handleBulkExecute` 関数において、選択アクションが **「NG」** だった場合に `recordNg` API 呼び出し後、`useProjectActions.handleToggleCheckout` と同等の **チェックアウト処理**（`sendInstructions` → `checkoutProject`）を実行する。

### 1-2. 懸念事項の調査

`WorkRecordPanel` の `isReadOnly` 判定が `task_status = REVIEW_WAITING（2）` のタスクを除外しており、**レビュー依頼中のタスクが誤って編集可能になる可能性**があるかどうかを確認する。

---

## 2. 調査結果



### 2-1. `handleBulkExecute` の現状

```typescript
// ExperimentInstructionTab.tsx L665〜695
if (bulkSelectedAction === 'ng') {
  await recordNg(projectId, methodId, taskNumber, { ngReason: bulkSelectedNgReason });
  message.warning(...);
} else {
  await approveTask(...);
}
setBulkApproveOpen(false);
await fetchData();  // ← NG後はチェックアウト処理なし
```

### 2-2. `handleToggleCheckout` のチェックアウト処理

```typescript
// useProjectActions.tsx L77〜82
await sendInstructions(selectedProject.id, {});  // ① 指示送信
await checkoutProject(selectedProject.id);        // ② チェックアウト
await refetchProjects();
message.success(t('project.checkoutSuccess', ...));
```

**NG後チェックアウトに必要な処理**: `sendInstructions` → `checkoutProject` → 親 UI の更新

### 2-3. `ExperimentInstructionTab` の Props

```typescript
export interface ExperimentInstructionTabProps {
  projectId: string;
  projectName?: string;
  isEditable?: boolean;
  isProjectCompleted?: boolean;
  isCheckoutLocked?: boolean;
  maimlHasErrors?: boolean;
  organizationGroupCd?: string;
}
```

`refetchProjects` などのコールバックは現在存在しない。チェックアウト後に親 UI を更新するため `onAfterCheckout?: () => Promise<void>` の追加が必要。

### 2-4. `WorkRecordPanel` の `isReadOnly` 判定（L3599〜3602）

```typescript
const isReadOnly =
  isNotStartedStatus ||           // status === 'not_started'
  isErrorStatus ||                // status === 'issue'（強制終了）
  (isCompletedStatus && displayKeyRow?.isRecorded === true && !isCorrectionMode);
```

**判定対象は `ProgressRow.status`（トランジションのステータス）であり `taskStatus` は未使用**。

| `ProgressRow.status` | `isReadOnly` |
|---|---|
| `not_started` | true |
| `preparing` / `ready` / `in_progress` / `on_hold` | false（編集可） |
| `completed` + `isRecorded=true` | true |
| `issue` | true |

**懸念**: `task_status = REVIEW_WAITING(2)` のタスクで `completed + isRecorded=false` のトランジションが存在すると `isReadOnly = false`（編集可）になる。

### 2-5. `WorkHeader` での `taskStatus` 使用箇所（訂正ボタン制御）

```typescript
// L1332〜1341 訂正可能条件
const isProjectCorrectable =
  projectStatus === ProjectStatusConst.TASK_PENDING ||
  projectStatus === ProjectStatusConst.TASK_IN_PROGRESS ||
  projectStatus === ProjectStatusConst.REVIEW_REJECTED;

const isTaskCorrectable =
  taskStatus === TaskStatusConst.PENDING ||
  taskStatus === TaskStatusConst.IN_PROGRESS ||
  taskStatus === TaskStatusConst.REVIEW_NG;
// REVIEW_WAITING(2) は意図的に除外（コメント: レビュー依頼中のため）
```

### 2-6. `toTaskStatusNumber` の変換漏れ（ExperimentWorkerMenu.tsx L374〜381）

```typescript
const toTaskStatusNumber = (taskStatus: string): number => {
  if (taskStatus === 'not_started') return TaskStatus.PENDING;
  if (taskStatus === 'started' || taskStatus === 'in_progress') return TaskStatus.IN_PROGRESS;
  if (taskStatus === 'completed') return TaskStatus.COMPLETED;
  if (taskStatus === 'forced_terminated') return TaskStatus.FORCED_TERMINATED;
  // review_waiting / review_ng → PENDING(0) に落ちる ← バグ
  return TaskStatus.PENDING;
};
```

これにより `REVIEW_WAITING` タスクの `taskStatus` が `0（PENDING）` になり、`WorkHeader` で訂正ボタンが誤表示される。

---

## 3. 懸念事項の分析

### 3-1. `isReadOnly` に `taskStatus` が含まれないことの影響

| シナリオ | 状態 | 深刻度 |
|---|---|---|
| `completed + isRecorded=true` のトランジション | isReadOnly=true | なし |
| `completed + isRecorded=false` + `task_status=REVIEW_WAITING` | isReadOnly=false（編集可） | **中** |
| `toTaskStatusNumber` で `review_waiting` → `PENDING` 変換 | 訂正ボタン誤表示 | **中** |

### 3-2. 結論

- `isReadOnly` に `taskStatus = REVIEW_WAITING` の条件追加が**必要**
- `toTaskStatusNumber` の変換漏れ修正も**必要**（これがないと `isTaskCorrectable` 判定が正しく動かない）
- 両修正は密接に関連しており、同時対応が望ましい

---

## 4. 実装方針

### 方針A: `handleBulkExecute` へのチェックアウト処理追加

- `sendInstructions` / `checkoutProject` を `@/services/projectApiService` からインポート
- `ExperimentInstructionTabProps` に `onAfterCheckout?: () => Promise<void>` を追加
- NG 分岐内で `recordNg` 完了後に `sendInstructions` → `checkoutProject` を実行
- エラーハンドリングは `handleToggleCheckout` と同等のエラーコード別メッセージ対応
- `onAfterCheckout?.()` で親コンポーネントへ通知

### 方針B: `isReadOnly` 判定に `REVIEW_WAITING` 追加

```typescript
// WorkRecordPanel.tsx
const isReviewWaitingTask = displayKeyRow?.taskStatus === TaskStatusConst.REVIEW_WAITING;

const isReadOnly =
  isNotStartedStatus ||
  isErrorStatus ||
  isReviewWaitingTask ||   // ← 追加
  (isCompletedStatus && displayKeyRow?.isRecorded === true && !isCorrectionMode);
```

### 方針C: `toTaskStatusNumber` 変換漏れ修正

```typescript
// ExperimentWorkerMenu.tsx
const toTaskStatusNumber = (taskStatus: string): number => {
  if (taskStatus === 'not_started') return TaskStatus.PENDING;
  if (taskStatus === 'started' || taskStatus === 'in_progress') return TaskStatus.IN_PROGRESS;
  if (taskStatus === 'review_waiting') return TaskStatus.REVIEW_WAITING;  // ← 追加
  if (taskStatus === 'review_ng') return TaskStatus.REVIEW_NG;            // ← 追加
  if (taskStatus === 'completed') return TaskStatus.COMPLETED;
  if (taskStatus === 'forced_terminated') return TaskStatus.FORCED_TERMINATED;
  return TaskStatus.PENDING;
};
```

---

## 5. 変更ファイル一覧

| No. | ファイルパス | 変更種別 | 変更内容 |
|-----|------------|---------|---------|
| 1 | `frontend/src/components/project/ExperimentInstructionTab.tsx` | 修正 | NG後チェックアウト処理追加・`onAfterCheckout` Props追加 |
| 2 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 修正 | `isReadOnly` に `REVIEW_WAITING` タスク条件追加 |
| 3 | `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | 修正 | `toTaskStatusNumber` に `review_waiting` / `review_ng` 変換追加 |
| 4 | 呼び出し元コンポーネント（調査後特定） | 修正 | `onAfterCheckout` に `refetchProjects` を接続 |

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| NG後チェックアウト失敗で中途半端な状態 | 中 | 低 | NG成功 + チェックアウト失敗時はエラーメッセージを表示・再試行可能 |
| `isReadOnly` に `REVIEW_WAITING` 追加で既存フロー破綻 | 低 | 低 | `REVIEW_WAITING` 中に通常操作するシナリオは設計上存在しない |
| `toTaskStatusNumber` 修正後に訂正ボタン表示が変わる | 低 | 中 | `REVIEW_WAITING` → 非表示（意図通り）/ `REVIEW_NG` → 表示（意図通り）で問題なし |

---

## 7. 実装ステップ（チェックリスト）

- [x] 1. `ExperimentInstructionTab` の呼び出し元を特定（`ExperimentInstructionTabContent` → `ProjectManagementInner` の構造を確認）
- [x] 2. `toTaskStatusNumber` 変換漏れ修正（ExperimentWorkerMenu.tsx）
- [x] 3. `isReadOnly` 判定修正（WorkRecordPanel.tsx）
- [x] 4. `ExperimentInstructionTabProps` に `onAfterCheckout` 追加・`handleBulkExecute` 修正
- [x] 5. `ExperimentInstructionTabContent` に `onAfterCheckout` Props 追加
- [x] 6. `ProjectManagementInner` で `onAfterCheckout={refetchProjects}` を接続
- [x] 7. 多言語キー追加（`experimentInstruction.ngCheckoutSuccess` を ja.json / en.json に追加）
- [ ] 8. 手動テスト実施

---

## 8. テスト計画

### 手動テスト

- [ ] NG登録 → `sendInstructions` + `checkoutProject` が正常実行されることを確認
- [ ] チェックアウト失敗時のエラーメッセージ表示確認
- [ ] `REVIEW_WAITING` タスクの `WorkRecordPanel` が読み取り専用になることを確認
- [ ] `REVIEW_NG` タスクで訂正ボタンが表示されることを確認（変換修正後）

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-30 10:00
- **承認日時**: （承認後記入）
- **承認者コメント**: （ユーザーからのフィードバック）


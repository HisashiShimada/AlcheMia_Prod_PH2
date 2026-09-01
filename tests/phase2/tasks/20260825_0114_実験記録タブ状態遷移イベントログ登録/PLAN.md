# タスク計画書: 実験記録タブ状態遷移イベントログ登録

## メタデータ
- **作成日時**: 2026-08-25 02:20
- **タスクID**: 実験記録タブ状態遷移イベントログ登録
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

実験作業者メニューの実験記録タブにおける以下5パターンの状態遷移時に、`maiml_event_log` テーブルへトランジションとして状態が変わった際の日時を登録する。

| 操作 | 遷移先状態 | 対応する TransitionStatus |
|------|-----------|--------------------------|
| 進捗確認から「開始」 | 準備状態 | PREPARING (1) |
| 実験記録タブ内「指示確認」ボタン | 準備完了状態 | READY (2) |
| 実験記録タブ内「開始」ボタン | 動作状態 | IN_PROGRESS (3) |
| 実験記録タブ内「終了」ボタン | 終状態 | COMPLETED (5) |
| 実験記録タブ内「異常終了」ボタン | 異常終了状態 | ERROR (6) |

## 2. 調査結果（現状分析）

### 既存の実装フロー（既に実装済み）

```
ボタン押下
  → updateTransitionStatus() [projectApiService.ts → progressController.ts]
  → progressService.updateTransitionStatus()
  → eventLogRepository.insertTransitionProgressLog()  ← maiml_event_logへINSERT
```

`progressService.updateTransitionStatus()` の中（行1046-1059）ですでに `insertTransitionProgressLog` が呼ばれている。

### 各ボタンの現在の実装状況（ExperimentWorkerMenu.tsx）

| 操作 | ハンドラ | 呼び出し | ステータス |
|------|----------|----------|-----------|
| 進捗確認「開始」 | `handleStartWork` | `updateTransitionStatus(..., PREPARING)` | ✅ ログ記録済み |
| 「指示確認」ボタン | `handleConfirmInstruction` | `updateTransitionStatus(..., READY)` | ✅ ログ記録済み（要確認） |
| 「開始」ボタン | `onStart` | `updateTransitionStatus(..., IN_PROGRESS)` | ✅ ログ記録済み |
| 「終了」ボタン | `onEnd` | `updateTransitionStatus(..., COMPLETED)` | ✅ ログ記録済み |
| 「異常終了」ボタン | `onForceEnd` | `updateTransitionStatus(..., ERROR)` | ✅ ログ記録済み |

### 結論

**全パターンで `updateTransitionStatus` が呼ばれており、その内部で `insertTransitionProgressLog` が実行されているため、`maiml_event_log` への登録は既に実装済みである可能性が高い。**

ただし `handleConfirmInstruction` の完全な実装を確認し、READY への遷移が確実に `updateTransitionStatus` を経由しているか確認が必要。

## 3. 調査結果（詳細確認済み）

### handleConfirmInstruction（ExperimentWorkerMenu.tsx 行209-254）

```typescript
// 行239: READY（準備完了状態）への遷移 → updateTransitionStatus 呼び出し確認済み
await updateTransitionStatus(selectedProject, preparingRow.methodId, preparingRow.transitionId, {
  taskNo: preparingRow.taskNo,
  status: TransitionStatusCode.READY, // 準備完了状態
  progressRate: 0,
});
```

→ `updateTransitionStatus` を経由しているため `insertTransitionProgressLog` が呼ばれ `maiml_event_log` に記録される。

### progressService.updateTransitionStatus（行1046-1059）

```typescript
await this.eventLogRepository.insertTransitionProgressLog(
  organizationId, projectId, transitionId, update.updated_by,
  statusLabel, finalProgressRate, comment ?? null, client,
  methodId, eventLogProgramId, eventLogInstructionId, eventLogResultsRefs
);
```

→ 全ステータス（PREPARING/READY/IN_PROGRESS/COMPLETED/ERROR）共通でログ記録。

### 各パターンの確認結果

| 操作 | ハンドラー | ステータス |
|------|-----------|-----------|
| 進捗確認「開始」 | `handleStartWork` → `updateTransitionStatus(PREPARING)` | ✅ ログ記録済み |
| 「指示確認」ボタン | `handleConfirmInstruction` → `updateTransitionStatus(READY)` | ✅ ログ記録済み |
| 「開始」ボタン | `onStart` → `updateTransitionStatus(IN_PROGRESS)` | ✅ ログ記録済み |
| 「終了」ボタン | `onEnd` → `updateTransitionStatus(COMPLETED)` | ✅ ログ記録済み |
| 「異常終了」ボタン | `onForceEnd` → `updateTransitionStatus(ERROR)` | ✅ ログ記録済み |

## 4. 結論：追加実装不要

全パターンで既に `maiml_event_log` への登録が実装済みであることを確認。変更対象ファイルなし。

## 5. 承認記録
- **計画書提示日時**: 2026-08-25 02:20
- **調査完了日時**: 2026-08-25 02:23
- **結果**: 全パターン実装済みのため追加実装不要

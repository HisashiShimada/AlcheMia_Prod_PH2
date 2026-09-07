# タスク計画書: WorkRecordPanel ロジック整理

## メタデータ
- **作成日時**: 2026-09-04 09:56
- **更新日時**: 2026-09-04 10:30
- **タスクID**: 20260904_0956
- **優先度**: 高
- **推定工数**: 3〜4時間

## タスク概要

マージによって WorkRecordPanel の State 管理が破綻した部分を整理する。
「トランジションステータスによるボタン制御」と「記録済みフラグによるデータ入力エリアの制御」は
**別物**であり、それぞれ独立した制御として整理する。

### 2種類の制御の整理

**制御A（正常）: トランジションステータスによるボタン活性制御**
```
progressRows[].status を見て 開始/終了/異常終了/指示確認ボタンの disabled を制御
  preparing  → 指示確認・開始 活性
  ready      → 開始 活性
  in_progress→ 終了・異常終了 活性
  on_hold    → 開始 活性
  completed / issue → 全て非活性
→ この部分は現状維持
```

**制御B（破綻→修正対象）: データ入力エリアの編集可否（isReadOnly）**
```
現状: viewingKey !== null && status === 'completed'/'issue' で代替（間違い）
正しい姿:
  isRecorded === false               → 編集可能（isReadOnly = false）
  isRecorded === true  かつ status !== 'issue'
                                     → 閲覧専用（isReadOnly = true）
                                       → 「訂正」ボタンで isCorrectionMode=true → 編集可能
  isRecorded === true  かつ status === 'issue'（異常終了）
                                     → 完全閲覧専用（isReadOnly = true、訂正ボタン非表示）
                                       → isCorrectionMode=true でも isReadOnly は true のまま
```

### 追加修正: 状態プルダウン（onStatusChange）の接続
`WorkHeader` にプルダウンが実装済みだが `PlanB → WorkHeader` が未接続のデッドUI。
`updateTransitionStatus` API は全ステータス（PAUSED=5 含む）に対応しているため接続する。

## 目的と期待される成果

- [x] `isReadOnly` 判定を `isRecorded` ベースに統一
  - `status === 'issue'`（異常終了）の場合は訂正不可（完全閲覧専用）
- [x] 状態プルダウン（`onStatusChange`）を PlanB → WorkRecordPanel → ExperimentWorkerMenu まで接続
- [x] `onStart`/`onEnd` が `displayKey` と無関係な行を操作するリスクを解消
- [x] `handleSaveAndNext` の次遷移探索を `findNextAvailableTransition` に統一
- [x] `activeEntry` / `isReadOnly` / `displayKey` の二重計算を解消

## 実装ステップ

### STEP 1: isReadOnly 判定を isRecorded ベースに変更（PlanB 内）
- [x] `displayKeyRow` を `progressRows.find(displayKey)` で取得
- [x] `isErrorStatus = displayKeyRow?.status === 'issue'`
- [x] `isReadOnly = displayKeyRow?.isRecorded === true && (isErrorStatus || !isCorrectionMode)`
- [x] 旧 `viewingKeyStatusB` 変数・旧 `isReadOnly` 計算を削除

### STEP 2: WorkHeader の訂正ボタン表示条件に isErrorStatus を追加
- [x] `WorkHeaderProps` に `isErrorStatus?: boolean` を追加して外から受け取る
- [x] `isReadOnly && (() => { ... })()` ブロック内で `isCorrectable` 判定に `!isErrorStatus` を追加
  - `isErrorStatus === true` のとき訂正ボタンを表示しない（「作業に戻る」のみ）

### STEP 3: 状態プルダウン（onStatusChange）を接続
- [x] `PlanProps` に `onStatusChange?: (transitionId: string, status: TransitionStatus) => void` を追加
- [x] `PlanB` の分割代入に `onStatusChange` を追加
- [x] `PlanB` → `WorkHeader` へ `onStatusChange={onStatusChange}` を渡す
- [x] `WorkRecordPanelProps` に `onStatusChange?: (transitionId: string, status: TransitionStatus) => void` を追加
- [x] `WorkRecordPanel` 本体の `planProps` に `onStatusChange` を追加
- [x] `ExperimentWorkerMenu` の `WorkRecordPanel` に `onStatusChange` を実装
  - 受け取った `transitionId` で `progressRows.find` して `methodId`/`taskNo` を特定
  - `TransitionStatus`文字列 → `TransitionStatusCode` 数値へ変換して `updateTransitionStatus` 呼び出し
  - 変換テーブル: not_started=1, preparing=2, ready=3, running=4, paused=5, completed=6, error=7

### STEP 4: onStart/onEnd を displayKey ベースに修正
- [x] `WorkRecordPanelProps` の `onStart`/`onEnd` シグネチャを `(taskNo: number, transitionId: string) => void` に変更
- [x] `PlanProps` の `onStart`/`onEnd` シグネチャも同様に変更
- [x] `PlanB` 内の WorkHeader レンダリングで `displayKey` を渡すよう変更
  - `onStart={displayKey ? () => onStart?.(displayKey.taskNo, displayKey.transitionId) : undefined}`
  - `onEnd={displayKey ? () => { onSetPendingEndKey?.(displayKey); onEnd?.(displayKey.taskNo, displayKey.transitionId); } : undefined}`
- [x] `ExperimentWorkerMenu` 側の `onStart`/`onEnd` 実装を引数の `taskNo`/`transitionId` ベースに変更

### STEP 5: handleSaveAndNext の次遷移探索を findNextAvailableTransition に統一
- [x] `task.transitions[idx+1]` による単純インクリメントを削除
- [x] `findNextAvailableTransition(taskNo, transitionId, skippedTransitionIds, tasks)` に変更
- [x] `useCallback` の依存配列に `skippedTransitionIds` を追加

### STEP 6: activeEntry の二重計算を解消
- [x] `PlanProps` に `activeEntry: { taskNo: number; transitionId: string } | null` を追加
- [x] `PlanB` 内の `activeEntry` useMemo を削除（Props から受け取る）
- [x] 本体の `activeTaskEntry` useMemo を `activeEntry` に改名して `planProps` に追加

### STEP 7: displayKey・isReadOnly の二重計算を解消
- [x] `PlanProps` に `displayKey` と `isReadOnly` を追加
- [x] `PlanB` 内の `displayKey`/`isReadOnly` 再計算ブロックを削除（Props から受け取る）
- [x] 本体で計算した値を `planProps` に渡す

### STEP 8: WorkHeader の taskStatus を displayKey ベースで常に渡す
- [x] `viewingKey` 条件分岐を削除し、`displayKeyRow?.taskStatus` を常に渡す

### STEP 9: 動作確認
- [x] TypeScript コンパイルエラーなし確認
- [x] 未記録トランジション: 編集可能、保存ボタン表示
- [x] 記録済みトランジション（completed）: 閲覧専用、「訂正」ボタン表示 → 訂正モードで編集可能
- [x] 異常終了（issue）トランジション: 完全閲覧専用、訂正ボタン非表示
- [x] 状態プルダウンで PAUSED 等に変更できること

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` - メイン修正
2. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - シグネチャ・onStatusChange 実装

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `isRecorded` が undefined の場合に意図しない readonly | 中 | `=== true` 厳密比較で undefined/false は編集可能とする |
| `onStart`/`onEnd` シグネチャ変更でコンパイルエラー | 中 | 一括修正・型確認 |
| `TransitionStatus`→数値変換の対応漏れ | 中 | 全7ステータスの変換テーブルを作成 |

## テスト計画
- [x] TypeScript ビルドエラーなし
- [x] 未記録行を ProgressOverviewTab から開いて編集可能なこと
- [x] 記録済み行（completed）を開いて読み取り専用になること
- [x] 訂正ボタンで isCorrectionMode に入り保存できること
- [x] 異常終了（issue）行を開いて完全読み取り専用（訂正ボタン非表示）なこと
- [x] 状態プルダウンで on_hold へ遷移できること

## 承認記録
- **計画書提示日時**: 2026-09-04 09:56
- **承認日時**: 2026-09-04 10:30
- **承認者コメント**: act モードに切り替えて承認・計画書更新後に実装継続

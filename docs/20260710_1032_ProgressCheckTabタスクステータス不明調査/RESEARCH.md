# 調査レポート: ProgressCheckTab タスクステータス「不明」表示・開始ボタン押下不可

## メタデータ

- **調査日時**: 2026-07-10 10:32
- **報告者**: Cline
- **対象環境**: 検証環境
- **ステータス**: 調査完了（修正未実施）

---

## 1. 現象概要

検証環境にて、実験作業画面の「進捗確認」タブ（`ProgressCheckTab.tsx`）において以下の不具合が発生している。

- タスクのステータス列が「**不明**」と表示される
- 「**開始**」ボタンが押せない状態（無効化）になっている

---

## 2. 調査結論

**原因はソースコードの型不整合バグ**である。データベースや検証環境固有のデータ不整合ではない。

- バックエンドAPIは `task_status` を **文字列**（`'not_started'` 等）で返す
- フロントエンドのUIロジックは `task_status` が **数値**（`0`, `1`, `2`, `3`, `4`）であることを前提に実装されている
- 両者の間で値の**変換処理が行われていない**ため、常にミスマッチが発生している

---

## 3. 詳細な原因分析

### 3-1. バックエンド側（正常・意図した仕様）

`backend/src/services/taskService.ts` の `convertToTaskSummary()` メソッド（L593〜L663）内で、DBに数値（0〜4）で格納されているタスクステータスを、意図的に**文字列**に変換してAPIレスポンスとして返している。

```typescript
// backend/src/services/taskService.ts (L595-L601)
const statusMap: Record<number, TaskStatus> = {
  0: 'not_started',
  1: 'in_progress',
  2: 'review_waiting',
  3: 'completed',
  4: 'forced_terminated'
};
// ... taskStatus（文字列）がAPIレスポンスの task_status として返却される
```

### 3-2. フロントエンド型定義（正常・バックエンドと一致）

`frontend/src/types/project.ts` の `WorkerTask` インターフェース（L243〜L252）でも `task_status` は正しく文字列型として定義されており、バックエンドの仕様と一致している。

```typescript
// frontend/src/types/project.ts (L243-L252)
export interface WorkerTask {
  task_no: number;
  task_status: 'not_started' | 'started' | 'in_progress' | 'completed' | 'forced_terminated';
  // ...
}
```

### 3-3. 問題箇所（バグの根本原因）

`frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` の複数箇所で、APIから受け取った**文字列**の `task_status` を、コンポーネント内部で使う `Task['status']`（**数値**型: `TaskStatusType = 0 | 1 | 2 | 3 | 4`）へ変換する際に、実際の変換処理を行わず TypeScript の型チェックを強制迂回するキャストのみを行っている。

```typescript
// ProgressCheckTab.tsx（問題のある記述、4箇所に重複）
status: task.task_status as unknown as Task['status'],
```

`as unknown as` によってコンパイル時の型エラーは出ないが、実行時には文字列 `'not_started'` 等がそのまま `status` フィールドに格納される。

**同じパターンが以下の4箇所に存在する（いずれも変換なし）:**

| 箇所 | 説明 |
|------|------|
| L128 | 初回 API 取得時のタスク変換（`fetchWorkerTasks`） |
| L335 | 開始成功後の再取得時のタスク変換 |
| L404 | 開始時 409 競合エラー後の再取得時 |
| L609 | 強制終了時 409 競合エラー後の再取得時 |

（強制終了成功後の再取得 L540 付近も同様）

### 3-4. 表示・活性判定ロジック側（数値前提で実装されている）

`frontend/src/components/ExperimentWorker/TaskListTable.tsx` のステータス表示と開始ボタン活性判定は、`status` が数値であることを前提に実装されている。

```typescript
// TaskListTable.tsx (L17-L25): ステータス表示
const configs: Record<TaskStatusType, { color: string; label: string }> = {
  [TaskStatus.PENDING]:           { color: 'default', label: '実行待ち' }, // 数値キー 0
  [TaskStatus.IN_PROGRESS]:       { color: 'orange',  label: '実行中' },   // 数値キー 1
  [TaskStatus.REVIEW_WAITING]:    { color: 'blue',    label: 'レビュー待ち' }, // 数値キー 2
  [TaskStatus.COMPLETED]:         { color: 'green',   label: '完了' },      // 数値キー 3
  [TaskStatus.FORCED_TERMINATED]: { color: 'red',     label: '強制終了' },  // 数値キー 4
};
return configs[status] ?? { color: 'default', label: '不明' };
// ↑ status が文字列 'not_started' の場合、数値キーにマッチしないため常に「不明」になる
```

```typescript
// TaskListTable.tsx (L170): 開始ボタンの活性判定
const isDisabled = record.status !== TaskStatus.PENDING || !isProjectEditable;
// ↑ TaskStatus.PENDING は数値 0。
//   record.status が文字列 'not_started' の場合、0 !== 'not_started' は常に true のため
//   isDisabled が常に true（ボタン無効化）になる
```

### 3-5. 問題が発生するデータフロー（図解）

```
DB（数値: 0）
   ↓
backend/taskService.convertToTaskSummary()
   ↓ 数値→文字列変換
API レスポンス（文字列: 'not_started'）
   ↓
ProgressCheckTab.tsx で受信
   ↓ as unknown as Task['status'] （変換なし！型キャストのみ）
Task.status に文字列 'not_started' が格納される
   ↓
TaskListTable.tsx に渡される
   ↓
configs['not_started'] → undefined → 「不明」表示  ← 不具合①
'not_started' !== 0 (TaskStatus.PENDING) → true → 開始ボタン無効  ← 不具合②
```

---

## 4. 同様の型不整合パターンが存在する他ファイル（参考）

同じ `task.task_status as unknown as Task['status']` パターンが以下にも存在する。
これらも同様の不具合が潜在的に発生しうる。

| ファイル | 行番号付近 | 備考 |
|---------|-----------|------|
| `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` | `status: task.task_status as unknown as Task['status']` | 指示確認タブのタスク変換 |
| `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | `status: task.task_status as unknown as Task['status']` | 実験記録タブのタスク変換 |

---

## 5. 修正方針（提案・未実施）

### 方針A（推奨）: 変換関数を共通化して各ファイルに適用

文字列→数値のステータス変換マッピングを共通関数またはユーティリティ定数として定義し、`ProgressCheckTab.tsx`、`InstructionConfirmationTab.tsx`、`ExperimentRecordTab.tsx` の全変換箇所で使用する。

```typescript
// 追加する変換マッピング（例）
import { TaskStatus } from '@/constants/codeMaster';
import type { TaskStatusType } from '@/constants/codeMaster';

const TASK_STATUS_STRING_TO_NUMBER: Record<string, TaskStatusType> = {
  'not_started':      TaskStatus.PENDING,           // 0
  'started':          TaskStatus.PENDING,            // 0 (WorkerTask型に存在する値)
  'in_progress':      TaskStatus.IN_PROGRESS,        // 1
  'review_waiting':   TaskStatus.REVIEW_WAITING,     // 2
  'completed':        TaskStatus.COMPLETED,          // 3
  'forced_terminated': TaskStatus.FORCED_TERMINATED, // 4
};

// 変換箇所の修正（as unknown as Task['status'] を置き換え）
status: TASK_STATUS_STRING_TO_NUMBER[task.task_status] ?? TaskStatus.PENDING,
```

### 修正が必要な箇所

**`ProgressCheckTab.tsx`（4〜5箇所）**:
- L128: 初回 API 取得時
- L335: 開始成功後の再取得時  
- L404: 開始時 409 エラー後の再取得時
- L540付近: 強制終了成功後の再取得時
- L609: 強制終了時 409 エラー後の再取得時

**`InstructionConfirmationTab.tsx`（1〜2箇所）**

**`ExperimentRecordTab.tsx`（1〜2箇所）**

---

## 6. 関連ファイル一覧

| ファイル | 役割 | 状態 |
|---------|------|------|
| `backend/src/services/taskService.ts` | タスクサービス（convertToTaskSummary） | 正常（意図した仕様） |
| `frontend/src/types/project.ts` | WorkerTask 型定義 | 正常（文字列型で正しく定義） |
| `frontend/src/types/experimentWorker.ts` | Task 型定義 | 正常（数値型 TaskStatusType） |
| `frontend/src/constants/codeMaster.ts` | TaskStatus 定数（数値0〜4） | 正常 |
| `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | **バグ箇所**（変換処理欠落） | 要修正 |
| `frontend/src/components/ExperimentWorker/TaskListTable.tsx` | ステータス表示・ボタン活性判定（数値前提） | 仕様通り（修正不要） |
| `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` | **同様のバグが潜在** | 要確認・修正 |
| `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | **同様のバグが潜在** | 要確認・修正 |

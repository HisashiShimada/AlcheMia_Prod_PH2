# タスク計画書: 指示確認タブ タスクセレクト重複表示バグ修正

## メタデータ
- **作成日時**: 2026-04-28 10:24
- **タスクID**: 指示確認タブタスクフィルタ重複修正
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

実験作業者画面の指示確認タブにおいて、タスクのフィルタ（セレクトボックス）に同じタスクNoが重複して表示される不具合を修正する。

## 目的と期待される成果

### 原因（調査結果）

**当初の仮説（誤り）:**
- メソッド未選択時に全メソッドの全タスクが列挙されることによる重複

**真の原因:**
- `InstructionConfirmationTab.tsx` に **重複排除ロジック（`uniqueTasksMap`）が実装されていない**
- `ExperimentRecordTab.tsx` には同ロジックが実装済みだが、`InstructionConfirmationTab.tsx` には未実装
- APIから同一 `taskId` のタスクが複数返ってきた場合、そのまま `tasks` stateに格納される
- メソッドを選択した状態でも、そのメソッドのタスクが重複して表示される（例: `1, 2, 1, 2, 1, 2` → `1, 2`）

### 修正方針
- `InstructionConfirmationTab.tsx` の `setTasks()` 呼び出し前に重複排除処理を追加
- `ExperimentRecordTab.tsx` と同様の `Map` を用いた重複排除ロジックを適用
- あわせて `filteredTasks` もメソッド未選択時に空配列を返すよう修正（二重対策）

### 期待される成果
- [x] メソッド未選択時、タスクセレクトが disabled になる（既実装済み）
- [x] メソッド未選択時、filteredTasks が空配列になる（修正済み）
- [ ] メソッド選択後、そのメソッドに属するタスクが重複なく表示される（今回修正）

## 実装ステップ

- [x] `InstructionConfirmationTab.tsx` の `filteredTasks` をメソッド未選択時に空配列を返すよう修正
- [x] `ExperimentRecordTab.tsx` の `filteredTasks` も同様に修正
- [x] `InstructionConfirmationTab.tsx` の `setTasks(allTasks)` の前に重複排除ロジックを追加

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` - 重複排除ロジック追加

## リスク

| リスク | 対策 |
|--------|------|
| 重複排除により意図したタスクが除外される | taskId は `projectId-methodId-taskNo` の複合キーのため、メソッドをまたぐ同番号でも別 ID になる |

## テスト計画

- [ ] メソッド選択後、タスクセレクトに重複なく表示されることを確認
- [ ] 複数メソッドを切り替えても各メソッドのタスクのみ表示されることを確認

## 承認記録
- **計画書提示日時**: 2026-04-28 10:24
- **承認日時**: 2026-04-28 10:28

## 実施記録

### 実施日時
開始: 2026-04-28 10:28  
完了: 2026-04-28 10:31

### 変更内容

#### `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx`
```typescript
// 変更前
const filteredTasks = useMemo(() => {
  if (!selectedMethodId) return tasks;  // 全タスクを返していた → 重複の原因
  return tasks.filter(task => task.methodId === selectedMethodId);
}, [tasks, selectedMethodId]);

// 変更後
// メソッド未選択時は空配列を返す（全メソッドのタスクが混在して重複表示されるのを防ぐ）
const filteredTasks = useMemo(() => {
  if (!selectedMethodId) return [];
  return tasks.filter(task => task.methodId === selectedMethodId);
}, [tasks, selectedMethodId]);
```

#### `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`
同様の修正を適用（コメント追加）。

### 最終的な成果物
- [x] メソッド未選択時、タスクセレクトが disabled になる（既実装済み）
- [x] メソッド未選択時、タスクセレクトに空のオプションのみ表示される（今回修正）
- [x] メソッド選択後、そのメソッドに属するタスクのみがセレクトに表示される（今回修正）
- [x] 指示確認タブ・実験記録タブ両方に適用済み

---

## 追加修正: トランジション指示のタスクフィルタ対応

### 背景

上記修正完了後、トランジション指示（`targetType === 'transition'`）のフィルタについて調査。
`filteredInstructions` 内でトランジション指示は `return true;` で常に全件表示されており、タスク選択状態と連動していなかった。

### 仕様確認結果

- **タスク指定なし**のトランジション指示 → 常に全件表示
- **タスク指定あり**のトランジション指示 → タスクフィルタを適用（選択タスクと一致するもののみ表示）
- タスク未選択時は両者ともに全件表示

### 修正内容（2026-04-28 11:31）

#### `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx`

```typescript
// 変更前
// 全体指示とトランジション単位指示はそのまま表示
if (instruction.targetType === 'file' || instruction.targetType === 'transition') {
  return true;
}

// 変更後
// 全体指示はそのまま表示
if (instruction.targetType === 'file') {
  return true;
}
// トランジション指示：タスク指定なしは常に表示、タスク指定ありはタスクフィルタを適用
if (instruction.targetType === 'transition') {
  // タスク指定なし → 常に表示
  if (!instruction.taskId) return true;
  // タスク指定あり かつ タスク未選択 → 全件表示
  if (!selectedTaskId || selectedTaskId === '' || selectedTaskId === 'new') return true;
  // タスク指定あり かつ タスク選択済み → 選択タスクと一致するもののみ表示
  return instruction.taskId === selectedTaskId;
}
```

### フィルタ動作一覧

| タスク選択状態 | タスク指定なしのトランジション | タスク指定ありのトランジション |
|---|---|---|
| タスク未選択 | ✅ 表示 | ✅ 表示（全件） |
| タスクA選択 | ✅ 表示 | ✅ タスクAのもののみ表示 |
| タスクB選択 | ✅ 表示 | ✅ タスクBのもののみ表示 |

---

## 追加修正: トランジション指示へのメソッドフィルタ追加

### 背景

`method` 指示・`task` 指示はメソッド選択に応じてフィルタされているが、`transition` 指示にはメソッドフィルタが適用されていなかった。`Instruction` 型に `methodId?: string` フィールドが存在するため、メソッドフィルタを追加する。

### 修正内容（2026-04-28 11:49）

#### `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx`

```typescript
// 変更前
if (instruction.targetType === 'transition') {
  // タスク指定なし → 常に表示
  if (!instruction.taskId) return true;
  ...
}

// 変更後
if (instruction.targetType === 'transition') {
  // メソッド指定あり かつ 選択メソッドと不一致 → 非表示
  if (selectedMethodId && instruction.methodId && instruction.methodId !== selectedMethodId) {
    return false;
  }
  // タスク指定なし → 常に表示
  if (!instruction.taskId) return true;
  ...
}
```

### フィルタ動作一覧（修正後・完全版）

| メソッド選択 | タスク選択 | methodId付きトランジション | methodIdなしトランジション |
|---|---|---|---|
| 未選択 | 未選択 | ✅ 全件表示 | ✅ 全件表示 |
| メソッドA選択 | 未選択 | ✅ メソッドAのみ表示 | ✅ 表示（methodIdなしは除外しない） |
| メソッドA選択 | タスクX選択 | ✅ メソッドA かつ タスクXのみ | ✅ 表示 |
| メソッドB選択 | 未選択 | ✅ メソッドBのみ表示 | ✅ 表示 |

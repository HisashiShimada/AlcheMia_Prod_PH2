# タスク選択ダイアログ UI設計書

## メタデータ
- **画面名**: タスク選択ダイアログ
- **物理名**: TaskSelectionDialog.tsx
- **ファイルパス**: `frontend/src/components/ExperimentWorker/TaskSelectionDialog.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-08-15
- **最終更新日**: 2026-08-15
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

選択済みのプロジェクト・メソッドに紐づくタスク一覧を表示し、1件を選択するダイアログです。
プロジェクトまたはメソッドが未選択の場合は案内メッセージを表示します。

### 1.2. 主要機能

1. 選択中プロジェクト名・メソッド名をタイトルに表示
2. タスク一覧をリスト形式で表示（ステータスタグ付き）
3. タスク選択（選択中・現在選択中のハイライト）
4. 「決定」ボタンで確定、「キャンセル」で取り消し

---

## 2. 画面レイアウト

```
┌─────────────────────────────────────────────────────────────────┐
│ Modal（幅700px）                                                │
│ Title: 🎯 タスクを選択                                          │
│         プロジェクト: 材料実験A / メソッド: 測定メソッドA       │
├─────────────────────────────────────────────────────────────────┤
│ Body:（maxHeight: 500px, overflow: auto）                       │
│                                                                 │
│  🎯 タスク001    [未開始]  [現在選択中]                         │
│     taskId: task-001 / 試料番号: S-001                         │
│                                                                 │
│  🎯 タスク002    [実行中]                                       │
│     taskId: task-002                                            │
│                                                                 │
│  🎯 タスク003    [完了]                                         │
│     taskId: task-003                                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Footer: [キャンセル]   [決定✓]（タスク未選択時disabled）       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. コンポーネント Props 定義

```typescript
interface TaskSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  selectedProject: string;
  selectedMethodId: string | null;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  methods?: Method[];
  projectName?: string;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `open` | `boolean` | ✅ | ダイアログ表示/非表示 |
| `onClose` | `() => void` | ✅ | 閉じるコールバック |
| `selectedProject` | `string` | ✅ | 選択中プロジェクトID |
| `selectedMethodId` | `string \| null` | ✅ | 選択中メソッドID |
| `selectedTaskId` | `string \| null` | ✅ | 現在選択中のタスクID |
| `onSelectTask` | `(taskId: string) => void` | ✅ | タスク選択確定コールバック |
| `methods` | `Method[]` | ❌ | メソッド一覧（タスク一覧取得に使用）|
| `projectName` | `string` | ❌ | タイトルに表示するプロジェクト名 |

---

## 4. タスクステータスタグ

| `TaskStatus` | タグ表示 | カラー |
|------------|--------|--------|
| `PENDING` | 未開始 | default |
| `IN_PROGRESS` | 実行中 | orange |
| `REVIEW_WAITING` | 開始 | blue |
| `COMPLETED` | 完了 | green |
| `FORCED_TERMINATED` | 強制終了 | red |

---

## 5. 各アイテムの選択状態

| 状態 | 背景 | 枠 | タグ |
|------|------|-----|-----|
| 現在選択中 | `colorPrimaryBg` | `1px solid colorPrimary` | 「現在選択中」青タグ |
| 一時選択（未確定）| `colorPrimaryBg` | 透明 | 「選択」赤タグ |
| 未選択 | 透明（ホバー時: `colorBgTextHover`）| 透明 | ステータスタグのみ |

---

## 6. 空状態表示

| 条件 | 表示 | data-testid |
|------|------|-------------|
| `selectedProject` が空 | 「プロジェクトを選択してください」| `task-selection-no-project` |
| `selectedMethodId` が null | 「メソッドを選択してください」| `task-selection-no-method` |
| タスクが0件 | 「このメソッドにタスクがありません」| `task-selection-no-tasks` |

---

## 7. data-testid

| 要素 | testid |
|------|--------|
| ダイアログ全体 | `task-selection-dialog` |
| Bodyコンテンツ | `task-selection-dialog-content` |
| タスクリスト | `task-selection-list` |

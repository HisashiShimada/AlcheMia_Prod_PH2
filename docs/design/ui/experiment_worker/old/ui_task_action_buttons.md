# タスクアクションボタン UI設計書

## メタデータ
- **画面名**: タスクアクションボタン
- **物理名**: TaskActionButtons.tsx
- **ファイルパス**: `frontend/src/components/ExperimentWorker/TaskActionButtons.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-08-15
- **最終更新日**: 2026-08-15
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

タスク一覧テーブル（`TaskListTable`）の各行に表示する**個別アクションボタンコンポーネント**です。
`buttonType` プロパティで表示するボタン種別を切り替え、タスクのステータスに応じた活性/非活性制御を行います。

### 1.2. 主要機能

1. `buttonType` に応じたボタン1つを返す（`null` または単一 `<Button>`）
2. タスクステータスに応じた活性/非活性制御
3. クリック時に `onAction(action)` コールバックを呼び出し

---

## 2. ボタン種別仕様

| `buttonType` | 表示テキスト | アイコン | 活性条件 | 備考 |
|-------------|------------|---------|---------|------|
| `start` | 「開始」| `PlayCircleOutlined` | `pending` または `completed` | `completed` 時は「タスクを再開」ラベル |
| `record` | 「記録」| `FormOutlined` | `in_progress` のみ | |
| `progress` | 「報告」| `LineChartOutlined` | `in_progress` のみ | |
| `issue` | 「報告」| `AlertOutlined` | `in_progress` のみ | 赤色スタイル |
| `complete` | 「終了」| `CheckCircleOutlined` | `in_progress` のみ | 青色スタイル |

---

## 3. コンポーネント Props 定義

```typescript
interface TaskActionButtonsProps {
  task: Task;
  onAction: (action: string) => void;
  buttonType: 'start' | 'record' | 'progress' | 'complete' | 'issue';
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `task` | `Task` | ✅ | タスクデータ（`task.status` で活性制御）|
| `onAction` | `(action: string) => void` | ✅ | アクション実行コールバック |
| `buttonType` | `'start' \| 'record' \| 'progress' \| 'complete' \| 'issue'` | ✅ | 表示ボタン種別 |

---

## 4. ステータスと活性状態の対応

| ステータス | start | record | progress | issue | complete |
|-----------|-------|--------|----------|-------|---------|
| `pending` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `in_progress` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `completed` | ✅ | ❌ | ❌ | ❌ | ❌ |
| その他 | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 5. スタイル仕様

| ボタン種別 | 活性時 `borderColor` | 活性時 `color` |
|----------|-------------------|--------------|
| `start` | `#0093CF` | `#0093CF` |
| `issue` | `#FF6B6B` | `#FF6B6B` |
| `complete` | `#0093CF` | `#0093CF` |
| `record` / `progress` | デフォルト | デフォルト |

---

## 6. data-testid

| ボタン種別 | testid パターン |
|----------|----------------|
| `start` | `task-action-btn-start-{taskId}` |
| `record` | `task-action-btn-record-{taskId}` |
| `progress` | `task-action-btn-progress-{taskId}` |
| `issue` | `task-action-btn-issue-{taskId}` |
| `complete` | `task-action-btn-complete-{taskId}` |

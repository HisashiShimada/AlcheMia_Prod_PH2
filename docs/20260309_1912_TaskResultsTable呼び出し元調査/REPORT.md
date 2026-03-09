# TaskResultsTable 呼び出し元調査レポート

## 調査概要

- **調査日時**: 2026-03-09 19:12
- **調査対象**: `TaskResultsTable` コンポーネントの呼び出し元
- **仕様書**: `docs/design/ui/experiment_admin/03_progress_monitoring/ui_task_results_table.md`

---

## 仕様書の記載（ui_task_results_table.md 1.2節）

仕様書には以下の3つの使用場面が記載されています：

1. ProgressMonitoring画面でタスク結果を確認する場合
2. ProjectDetailModal内でタスク一覧を表示する場合
3. タスクのステータスを一覧で確認する場合

---

## 実際のソースコード調査結果

### 調査コマンド

```
search_files: regex=TaskResultsTable, path=frontend/src, file_pattern=*.tsx
```

### 調査結果

`TaskResultsTable` コンポーネントは **1箇所のみ** で呼び出されています。

#### 📍 呼び出し元: `frontend/src/components/project/ProjectManagement.tsx`

**呼び出し箇所:** タブ定義内の「タスク結果」タブ（`key: 'task_results'`）

```tsx
{
  key: 'task_results',
  label: t('projectManagement.tabs.task_results'),
  children: (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ボタンエリア（作業確認、タスク確認完了） */}
      {/* 統計カード（総タスク数、実行待ち、実行中、異常終了、レビュー待ち、完了） */}

      {/* タスク結果テーブル */}
      <TaskResultsTable
        results={taskResults}
        onViewResult={handleViewTaskResult}
      />
    </div>
  ),
},
```

**画面構成上の位置づけ:**
- プロジェクト管理画面（ProjectManagement）
- 右ペインのタブ切り替えエリア
- 「タスク結果」タブを選択したときに表示

**`onViewResult` の処理:**
```typescript
const handleViewTaskResult = useCallback((result: Task) => {
  console.log('View task result:', result);
  // TODO: タスク結果詳細モーダルを表示（未実装）
}, []);
```

---

## 仕様書との乖離

| 項目 | 仕様書の記載 | 実際の実装 |
|------|------------|-----------|
| 呼び出し元① | ProgressMonitoring画面 | **未使用**（ProgressMonitoring.tsx からは呼ばれていない） |
| 呼び出し元② | ProjectDetailModal | **未実装**（そのような名前のコンポーネントは存在しない） |
| 実際の呼び出し元 | （記載なし） | **ProjectManagement.tsx のタスク結果タブ** |

---

## コンポーネント配置の整合性について

| コンポーネントパス | 仕様書の記載 | 実際 |
|----------------|------------|------|
| `frontend/src/components/project/TaskResultsTable.tsx` | `project/TaskResultsTable.tsx` ✅ | 一致 |

コンポーネントのファイルパスは仕様書と一致しています。

---

## まとめ

`TaskResultsTable` コンポーネントは、現時点では以下の **1箇所のみ** から呼び出されています：

> **`frontend/src/components/project/ProjectManagement.tsx`**  
> → プロジェクト管理画面の **「タスク結果」タブ** 内

仕様書に記載されている「ProgressMonitoring画面」や「ProjectDetailModal」からの呼び出しは、**現時点では未実装**です。  
仕様書の「使用場面」の記述は、将来の想定ユースケースとして書かれた可能性があります。

また、詳細ボタンクリック時のコールバック（`onViewResult`）は `ProjectManagement.tsx` 内で受け取っていますが、
詳細モーダルの表示処理は `TODO` コメントのみで **未実装** の状態です。

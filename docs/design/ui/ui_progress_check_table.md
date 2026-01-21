# ProgressCheckTable UI設計書

## メタデータ
- **コンポーネントID**: ProgressCheckTable
- **コンポーネント名**: 進捗確認テーブル
- **ファイルパス**: `frontend/src/components/ExperimentWorker/ProgressCheckTable.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-01-19
- **最終更新日**: 2026-01-19

---

## 1. 概要

### 1.1 コンポーネントの目的
進捗確認タブ内でタスク一覧を表示し、フロー図ダイアログの管理を行うラッパーコンポーネントです。TaskListTableをラップし、ViewRendererDialogとSubNetViewerの表示制御を担当します。

### 1.2 主要機能
- タスク一覧の表示（TaskListTable使用）
- フロー図ダイアログの複数同時表示管理
- SubNetViewerの表示管理
- ダイアログのz-index管理（最前面表示制御）

### 1.3 使用場所
- ProgressCheckTab（進捗確認タブ）内のメソッド別タブコンテンツ

---

## 2. コンポーネント構成

### 2.1 レイアウト構造

```
┌─────────────────────────────────────────────┐
│ TaskListTable                                │
│ - タスク一覧テーブル                         │
│ - 進捗率クリックでフロー図表示               │
└─────────────────────────────────────────────┘

フローティングダイアログ（複数同時表示可能）:
┌─────────────────────────────────────────────┐
│ ViewRendererDialog (z-index動的)             │
│ - フロー図表示                               │
│ - ドラッグ移動可能                           │
│ - リサイズ可能                               │
└─────────────────────────────────────────────┘

モーダル:
┌─────────────────────────────────────────────┐
│ SubNetViewer（サブネット表示）               │
│ - ViewRendererDialogから開く                 │
└─────────────────────────────────────────────┘
```

### 2.2 使用コンポーネント

#### カスタムコンポーネント
- `TaskListTable` - タスク一覧テーブル（実際の表示担当）
- `ViewRendererDialog` - フロー図表示ダイアログ（複数同時表示）
- `SubNetViewer` - サブネット表示ビューア

---

## 3. Props

```typescript
interface ProgressCheckTableProps {
  tasks: Task[];                                   // タスク一覧
  projectStatus: ProjectStatus | null;            // プロジェクトステータス
  onTaskAction: (taskId: string, action: string) => void; // タスクアクションハンドラ
}
```

---

## 4. State（内部状態）

### 4.1 ViewRendererDialog管理

```typescript
// ダイアログ一覧（複数同時表示可能）
const [viewerDialogs, setViewerDialogs] = useState<Array<{
  id: string;        // ダイアログの一意ID
  file: FileData;    // 表示するファイルデータ
  zIndex: number;    // 重なり順（大きいほど前面）
}>>([]);

// 次のz-index値
const [nextZIndex, setNextZIndex] = useState(999999);
```

### 4.2 SubNetViewer管理

```typescript
// サブネット表示データ
const [subnetData, setSubnetData] = useState<SubnetData | null>(null);
```

---

## 5. イベント

### 5.1 進捗率クリックイベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| handleProgressRateClick | TaskListTable内の進捗率クリック | フロー図ダイアログを新規作成し、ダイアログ一覧に追加 |

**処理内容:**
```typescript
const handleProgressRateClick = (task: Task) => {
  // モックファイルデータを作成
  const fileData: FileData = {
    id: 'test_omori11',
    name: 'test_omori11.maiml',
    path: '/data/mock/test_omori11.maiml',
    size: 0,
    lastModified: new Date().toISOString(),
    type: 'maiml',
  };

  // 新しいダイアログを作成
  const newDialog = {
    id: `flow-diagram-${Date.now()}`,
    file: fileData,
    zIndex: nextZIndex,
  };

  // ダイアログ一覧に追加
  setViewerDialogs([...viewerDialogs, newDialog]);
  setNextZIndex(nextZIndex + 1);
};
```

### 5.2 ダイアログ管理イベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| handleCloseDialog | ダイアログ閉じるボタンクリック | 指定されたIDのダイアログを一覧から削除 |
| handleFocusDialog | ダイアログクリック | 指定されたIDのダイアログのz-indexを更新し、最前面に表示 |

**z-index管理ロジック:**
```typescript
const handleFocusDialog = (id: string) => {
  const dialog = viewerDialogs.find((d) => d.id === id);
  if (dialog && dialog.zIndex !== nextZIndex - 1) {
    // 選択されたダイアログのz-indexを最大値に更新
    setViewerDialogs(
      viewerDialogs.map((d) =>
        d.id === id ? { ...d, zIndex: nextZIndex } : d
      )
    );
    setNextZIndex(nextZIndex + 1);
  }
};
```

### 5.3 SubNetViewerイベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| handleOpenSubNetViewer | ViewRendererDialog内でサブネット表示ボタンクリック | サブネットデータを設定し、SubNetViewerを開く |
| handleCloseSubNetViewer | SubNetViewer閉じるボタンクリック | サブネットデータをnullに設定し、SubNetViewerを閉じる |

---

## 6. データフロー

### 6.1 Props → 子コンポーネント

```
ProgressCheckTable (props: tasks, projectStatus, onTaskAction)
  ↓
TaskListTable (props: tasks, projectStatus, onTaskAction, onProgressRateClick)
  ↓
各行のアクションボタンクリック → onTaskAction実行
各行の進捗率クリック → onProgressRateClick実行
```

### 6.2 ダイアログ表示フロー

```
1. TaskListTable内で進捗率クリック
   ↓
2. handleProgressRateClick実行
   ↓
3. ファイルデータを作成（モック）
   ↓
4. 新しいダイアログをviewerDialogsに追加
   ↓
5. ViewRendererDialogが描画される
   ↓
6. ダイアログ内でサブネット表示ボタンクリック（オプション）
   ↓
7. handleOpenSubNetViewer実行
   ↓
8. SubNetViewerが表示される
```

---

## 7. ViewRendererDialogの設定

### 7.1 初期設定

```typescript
<ViewRendererDialog
  key={dialog.id}
  id={dialog.id}
  contentType="file"
  file={dialog.file}
  zIndex={dialog.zIndex}
  initialPosition={{ x: 100, y: 100 }}
  initialSize={{ width: 1200, height: 800 }}
  onClose={handleCloseDialog}
  onFocus={handleFocusDialog}
  onOpenSubNetViewer={handleOpenSubNetViewer}
/>
```

### 7.2 ダイアログの特徴

- **複数同時表示**: 配列で管理し、複数のダイアログを同時に表示可能
- **z-index管理**: クリックで最前面に表示（フォーカス管理）
- **初期位置**: (100, 100)固定（複数表示時は重なる）
- **初期サイズ**: 1200x800px
- **ドラッグ移動**: 可能
- **リサイズ**: 可能

---

## 8. データ構造

### 8.1 FileData

```typescript
interface FileData {
  id: string;           // ファイルID
  name: string;         // ファイル名
  path: string;         // ファイルパス
  size: number;         // ファイルサイズ
  lastModified: string; // 最終更新日時（ISO形式）
  type: string;         // ファイルタイプ（'maiml'など）
}
```

### 8.2 SubnetData

```typescript
interface SubnetData {
  transitionName: string;    // トランジション名
  maimlData: any;            // MAIMLデータ
  templateMap: any;          // テンプレートマップ
  petriNetData: any;         // Petri Netデータ
}
```

---

## 9. エラーチェック

### 9.1 現在の実装

現在、エラーチェックは実装されていません。TaskListTableとViewRendererDialogが適切にエラーハンドリングを行うことを期待しています。

### 9.2 将来の実装

1. タスクが空の場合の処理
2. ファイルデータ取得失敗時の処理
3. ダイアログ数の上限チェック（パフォーマンス対策）

---

## 10. パフォーマンス考慮事項

### 10.1 ダイアログ数の制限

- **推奨最大数**: 5個程度
- **制限なし**: 現在は無制限に追加可能
- **将来の対応**: 上限を設けて古いダイアログを自動クローズ

### 10.2 z-index管理

- **初期値**: 999999
- **増加**: クリックごとに+1
- **上限**: JavaScriptの数値上限（問題なし）

---

## 11. 備考

### 11.1 特記事項

1. **ラッパーコンポーネント**
   - 実際のテーブル表示はTaskListTableが担当
   - このコンポーネントはダイアログ管理に特化

2. **モックデータの使用**
   - 現在、進捗率クリック時のファイルデータはハードコーディング
   - 将来的にはタスクIDからAPIでファイルデータを取得

3. **複数ダイアログ表示**
   - 各ダイアログは独立して操作可能
   - z-index管理でフォーカス制御

4. **selectedMethodId**
   - TaskListTableにnullを渡している
   - メソッドはタブで選択済みのため不要

### 11.2 将来の拡張

1. タスクからファイルデータを取得するAPIの実装
2. ダイアログ数の上限設定と管理
3. ダイアログ位置の自動ずらし（カスケード配置）
4. ダイアログの最小化・最大化機能
5. ダイアログの保存状態管理（位置・サイズ）

### 11.3 関連ドキュメント

- [ProgressCheckTab UI設計書](./ui_progress_check_tab.md)
- [TaskListTable UI設計書](./ui_task_list_table.md)
- [ViewRendererDialog UI設計書](./ui_view_renderer_dialog.md)
- [SubNetViewer UI設計書](./ui_subnet_viewer.md)

---

## 12. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-19 | 初版作成 | Cline |

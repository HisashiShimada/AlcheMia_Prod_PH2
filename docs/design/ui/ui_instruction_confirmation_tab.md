# 指示確認タブ UI設計書

## メタデータ
- **画面ID**: InstructionConfirmationTab
- **画面名**: 指示確認タブ
- **ファイルパス**: `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-01-19
- **最終更新日**: 2026-01-19

---

## 1. 概要

### 1.1 画面の目的
実験管理者から送信された作業指示を確認するためのタブ画面です。プロジェクト全体指示、タスク単位指示、トランジション単位指示をグループ化して表示し、確認状態を管理します。

### 1.2 主要機能
- メソッド・タスクの選択
- 作業指示の一覧表示（3種類のグループ）
- 作業指示の確認完了
- フロー図表示機能

### 1.3 アクセス権限
- **対象ロール**: 実験作業者（experiment_worker）
- **必要条件**: ログイン済み、有効なセッション

---

## 2. 画面構成

### 2.1 画面イメージ
![指示確認タブイメージ](images\ui_instruction_confirmation_tab.jpg)

### 2.2 レイアウト構造

```
┌─────────────────────────────────────────────┐
│ プロジェクト未選択時                         │
│ ┌─────────────────────────────────────────┐ │
│ │ Card                                     │ │
│ │  [FileTextOutlined アイコン (48px)]      │ │
│ │  指示確認                                │ │
│ │  プロジェクトを選択してください           │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘

プロジェクト選択後:
┌─────────────────────────────────────────────┐
│ MethodTaskSelector（共通コンポーネント）      │
│ - プロジェクト選択（読み取り専用）            │
│ - メソッド選択                               │
│ - タスク選択                                 │
│ - [選択] ボタン（モーダル表示）              │
├─────────────────────────────────────────────┤
│ InstructionStats（指示統計）                 │
│ - 全体件数、未読件数、種別ごとの件数         │
├─────────────────────────────────────────────┤
│ Card（指示詳細）                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ▼ プロジェクト指示 (X件) [確認完了]     │ │
│ │   - InstructionGroup                     │ │
│ ├─────────────────────────────────────────┤ │
│ │ ▼ タスク指示 (Y件)                      │ │
│ │   - InstructionGroup                     │ │
│ ├─────────────────────────────────────────┤ │
│ │ ▼ トランジション指示 (Z件)              │ │
│ │   - InstructionGroup                     │ │
│ ├─────────────────────────────────────────┤ │
│ │ [全ての指示の確認完了] ボタン            │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘

モーダル/ダイアログ:
- MethodTaskSelectionModal（メソッド・タスク選択）
- InstructionFlowDialog（フロー図表示）
- SubNetViewer（サブネット表示）
```

### 2.3 使用コンポーネント

#### Ant Design コンポーネント
- `Card` - メインコンテナ
- `Typography.Title` - 見出し
- `Typography.Text` - テキスト表示
- `Button` - フロー図ボタン、確認完了ボタン
- `Divider` - 区切り線
- `Space` - 要素の間隔制御
- `theme` - デザイントークン取得

#### カスタムコンポーネント
- `MethodTaskSelector` - メソッド・タスク選択UI
- `InstructionStats` - 指示統計情報表示
- `InstructionGroup` - 指示グループ表示
- `MethodTaskSelectionModal` - メソッド・タスク選択モーダル
- `InstructionFlowDialog` - フロー図表示ダイアログ
- `SubNetViewer` - サブネット表示ビューア

#### アイコン
- `FileTextOutlined` - ファイルアイコン（空状態・タイトル）
- `DownOutlined` - 下向き矢印（展開状態）
- `RightOutlined` - 右向き矢印（折りたたみ状態）
- `FileOutlined` - プロジェクト指示アイコン
- `CheckSquareOutlined` - タスク指示アイコン
- `AimOutlined` - トランジション指示アイコン
- `CheckCircleOutlined` - 確認完了アイコン
- `NodeIndexOutlined` - フロー図アイコン

---

## 3. コントロール一覧

### 3.1 入力項目

| 項目名 | タイプ | 必須 | 初期値 | 説明 |
|--------|--------|------|--------|------|
| selectedProject | 表示のみ | ○ | props経由 | 選択中のプロジェクトID（親から受け取り） |
| selectedMethodId | Select | ○ | null | 選択中のメソッドID |
| selectedTaskId | Select | - | '' | 選択中のタスクID（空文字列の場合は全タスクの指示を表示） |
| expandedGroups | Object | - | props経由 | グループの展開状態（'file', 'task', 'transition'） |

### 3.2 ボタン

| ボタン名 | タイプ | 表示条件 | アクション |
|---------|--------|---------|-----------|
| 選択 | default | プロジェクト選択時 | メソッド・タスク選択モーダルを開く |
| フロー図 | default + NodeIndexOutlined | プロジェクト選択時 | InstructionFlowDialogを開く |
| 確認完了（グループ単位） | primary + success色 | プロジェクト指示グループ展開時 & 指示が存在 | プロジェクト指示の一括確認完了（モック） |
| 全ての指示の確認完了 | primary + success色 + large | 常時表示 | 全ての指示を確認完了にする（モック） |

### 3.3 表示項目

#### 空状態メッセージ
| 状態 | アイコン | タイトル | メッセージ |
|------|---------|---------|-----------|
| プロジェクト未選択 | FileTextOutlined (48px) | 指示確認 | プロジェクトを選択してください |

#### 指示グループ
各グループはクリックで展開/折りたたみが可能：

| グループ名 | アイコン | 説明 |
|-----------|---------|------|
| プロジェクト指示 | FileOutlined | プロジェクト全体への指示 |
| タスク指示 | CheckSquareOutlined | タスク単位の指示 |
| トランジション指示 | AimOutlined | トランジション単位の指示 |

---

## 4. イベント

### 4.1 グループ展開イベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| toggleGroup | グループタイトルクリック | グループの展開状態を切り替え（親コンポーネントのコールバック呼び出し） |

### 4.2 ボタンクリックイベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| handleOpenFlowDiagram | フロー図ボタンクリック | InstructionFlowDialogを開く（複数同時表示可能） |
| handleCloseDialog | ダイアログ閉じる | ダイアログ一覧から削除 |
| handleFocusDialog | ダイアログクリック | 該当ダイアログを最前面に表示（z-index更新） |
| handleOpenSubNetViewer | サブネット表示ボタンクリック | SubNetViewerを開く |
| handleCloseSubNetViewer | SubNetViewer閉じる | SubNetViewerを非表示 |
| handleConfirmAllInstructions | 全ての指示の確認完了ボタンクリック | 全指示を確認済みに更新（確認ダイアログ表示 → API呼び出し） |

### 4.3 選択イベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| onSelectMethod | メソッド選択変更 | 親コンポーネントのコールバック呼び出し |
| onSelectTask | タスク選択変更 | 親コンポーネントのコールバック呼び出し |

---

## 5. データフロー

### 5.1 Props（親から受け取るデータ）

```typescript
interface InstructionConfirmationTabProps {
  selectedProject: string;                    // 選択中のプロジェクトID
  onProjectChange: (value: string) => void;   // プロジェクト変更ハンドラ
  selectedMethodId: string | null;            // 選択中のメソッドID
  onSelectMethod: (methodId: string | null) => void; // メソッド選択ハンドラ
  selectedTaskId: string;                     // 選択中のタスクID
  onSelectTask: (taskId: string) => void;     // タスク選択ハンドラ
  sortedInstructions: Instruction[];          // ソート済み指示一覧
  stats: Stats;                               // 指示統計情報
  isClient: boolean;                          // クライアント側レンダリングフラグ
  expandedGroups: Record<string, boolean>;    // グループ展開状態
  toggleGroup: (groupKey: string) => void;    // グループ展開切り替えハンドラ
}
```

### 5.2 State（内部状態）

```typescript
// ViewRendererDialogの管理
const [viewerDialogs, setViewerDialogs] = useState<Array<{
  id: string;
  file: FileData;
  zIndex: number;
}>>([]);
const [nextZIndex, setNextZIndex] = useState(999999);

// SubNetViewerの管理
const [subnetData, setSubnetData] = useState<SubnetData | null>(null);

// メソッド・タスク選択モーダルの表示状態
const [isModalVisible, setIsModalVisible] = useState(false);
```

### 5.3 算出データ

```typescript
// プロジェクト情報（useMemo）
const projectInfo = useMemo(() => {
  if (!selectedProject) return null;
  return projectsData[selectedProject];
}, [selectedProject]);

// メソッド情報（useMemo）
const methodInfo = useMemo(() => {
  if (!selectedMethodId || !projectInfo) return null;
  return projectInfo.methods?.find((m) => m.methodId === selectedMethodId);
}, [selectedMethodId, projectInfo]);

// タスク一覧
const tasks = selectedProject && methodInfo
  ? methodInfo.tasks || []
  : [];

// フィルタ済み指示一覧（useMemo）
const filteredInstructions = useMemo(() => {
  return sortedInstructions.filter((instruction) => {
    // 全体指示とトランジション単位指示はそのまま表示
    if (instruction.targetType === 'file' || instruction.targetType === 'transition') {
      return true;
    }
    // タスク単位指示の場合
    if (instruction.targetType === 'task') {
      // メソッド選択済みの場合、選択されたメソッドに属するタスクのみに限定
      if (selectedMethodId && instruction.methodId !== selectedMethodId) {
        return false;
      }
      // タスク未選択の場合は選択されたメソッドの全てのタスクの作業指示を表示
      if (!selectedTaskId || selectedTaskId === '' || selectedTaskId === 'new') {
        return true;
      }
      // タスク選択済みの場合は選択されたタスクに紐づくもののみ表示
      return instruction.taskId === selectedTaskId;
    }
    return false;
  });
}, [sortedInstructions, selectedMethodId, selectedTaskId]);

// フィルタ済み統計情報（useMemo）
const filteredStats = useMemo(() => {
  const fileInstructions = filteredInstructions.filter((i) => i.targetType === 'file');
  const taskInstructions = filteredInstructions.filter((i) => i.targetType === 'task');
  const transitionInstructions = filteredInstructions.filter((i) => i.targetType === 'transition');
  const unreadInstructions = filteredInstructions.filter((i) => !i.isRead);

  return {
    total: filteredInstructions.length,
    file: fileInstructions.length,
    method: taskInstructions.length,
    transition: transitionInstructions.length,
    unread: unreadInstructions.length,
  };
}, [filteredInstructions]);

// プロジェクトステータス
const projectStatus: ProjectStatus | null = selectedProject 
  ? getProjectStatus(selectedProject)
  : null;
```

### 5.4 使用するAPI

| API | メソッド | エンドポイント | 用途 | 実装状況 |
|-----|---------|--------------|------|---------|
| 指示一覧取得API | GET | `/api/v1/instructions` | 作業指示一覧の取得 | TODO |
| 指示確認API | PUT | `/api/v1/instructions/{instructionId}/confirm` | 指示の確認完了 | TODO |
| MAIMLファイル取得API | GET | `/api/files/maiml/{fileId}` | フロー図表示用のMAIMLファイル取得 | モックデータ使用中 |

**指示一覧取得API詳細:**
- **クエリパラメータ**: 
  - `projectId` (required): プロジェクトID
  - `methodId` (optional): メソッドID（タスク指示のフィルタリング用）
  - `taskNo` (optional): タスク番号（さらに絞り込み）
  - `instructionTarget` (optional): 指示対象（1:ファイル全体、2:タスク、3:トランジション）
  - `isAcknowledged` (optional): 確認済フラグ
- **レスポンス**: 指示一覧（配列）
- **詳細仕様**: `docs/design/api/API一覧_実験作業者画面.md` 参照

### 5.5 データソース

- `projectsData` - プロジェクトマスターデータ（モック）

---

## 6. エラーチェック

### 6.1 バリデーション

| 項目 | ルール | エラーメッセージ |
|------|--------|----------------|
| プロジェクト選択 | 必須 | 「プロジェクトを選択してください」（空状態表示） |

### 6.2 確認完了時のチェック

```typescript
const handleConfirmAllInstructions = () => {
  const unreadCount = filteredStats.unread;
  
  if (unreadCount === 0) {
    alert('全ての指示は既に確認済みです');
    return;
  }
  
  const confirmed = window.confirm(
    `全ての指示（${filteredStats.total}件中${unreadCount}件未読）を確認完了にしますか？`
  );
  
  if (confirmed) {
    // TODO: API呼び出し
  }
};
```

---

## 7. 画面遷移

### 7.1 遷移元
- ExperimentWorkerMenu（実験作業メニュー）から「指示確認」タブを選択
- ProgressCheckTab（進捗確認タブ）から「指示確認」ボタンクリック

### 7.2 遷移先
なし（タブ内で完結）

### 7.3 モーダル/ダイアログ遷移

```
InstructionConfirmationTab
  ├→ MethodTaskSelectionModal（メソッド・タスク選択）
  │   └→ 選択後、メソッドIDとタスクIDを更新
  │
  ├→ InstructionFlowDialog（フロー図表示 - 複数同時表示可）
  │   ├→ フォーカス時にz-index更新
  │   └→ 閉じる
  │
  └→ SubNetViewer（サブネット表示）
      └→ 閉じる
```

---

## 8. レスポンシブ対応

### 8.1 ブレークポイント

| サイズ | 幅 | 対応 |
|--------|-----|-----|
| Mobile | < 768px | 縦スクロール、グループは折りたたみ推奨 |
| Tablet | 768px - 1024px | 標準レイアウト |
| Desktop | > 1024px | 標準レイアウト |

### 8.2 モバイル対応

- グループタイトルはタップで展開/折りたたみ
- ボタンは縦配置（Space direction="vertical"）
- フロー図ダイアログは全画面表示を推奨

---

## 9. パフォーマンス考慮事項

### 9.1 最適化

- `projectInfo`, `methodInfo`, `filteredInstructions`, `filteredStats`は`useMemo`でメモ化
- 不要な再レンダリングを防ぐため、コールバック関数は適切にメモ化

### 9.2 データ量

- 指示件数: 最大100件程度を想定
- フロー図ダイアログ: 同時表示は5個程度まで

---

## 10. 備考

### 10.1 特記事項

1. **指示のフィルタリングロジック**
   - プロジェクト指示: 常に表示
   - タスク指示: 選択されたメソッドに属するタスクの指示のみ表示
     - タスク未選択時: 選択メソッドの全タスクの指示を表示
     - タスク選択時: 選択タスクの指示のみ表示
   - トランジション指示: 常に表示

2. **グループの展開状態管理**
   - 親コンポーネントで`expandedGroups`を管理
   - `toggleGroup`コールバックで状態を変更

3. **フロー図ダイアログの複数表示**
   - 複数のダイアログを同時に表示可能
   - z-indexで重なり順を管理
   - クリックで最前面に表示

4. **確認完了機能**
   - グループ単位: プロジェクト指示のみ
   - 全体: 全ての指示を一括確認完了

### 10.2 将来の拡張

1. バックエンドAPI統合（指示確認完了）
2. 指示の既読/未読状態のリアルタイム更新（WebSocket）
3. 指示の検索・フィルタリング機能
4. 指示へのコメント機能
5. 指示の重要度・優先度表示

### 10.3 関連ドキュメント

- [InstructionStats UI設計書](./ui_instruction_stats.md)
- [InstructionGroup UI設計書](./ui_instruction_group.md)
- [InstructionCard UI設計書](./ui_instruction_card.md)
- [InstructionFlowDialog UI設計書](./ui_instruction_flow_dialog.md)
- [MethodTaskSelector UI設計書](./ui_method_task_selector.md)

---

## 11. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-19 | 初版作成 | Cline |

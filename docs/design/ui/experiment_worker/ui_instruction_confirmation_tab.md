# 指示確認タブ UI設計書

## メタデータ
- **画面ID**: InstructionConfirmationTab
- **画面名**: 指示確認タブ
- **ファイルパス**: `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-01-19
- **最終更新日**: 2026-03-11

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
![指示確認タブイメージ](..\images\ui_instruction_confirmation_tab.jpg)

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

| ボタン名 | タイプ | 表示条件 | 無効化条件 | アクション |
|---------|--------|---------|-----------|-----------|
| 選択 | default | プロジェクト選択後 | プロジェクト未選択 or ローディング中 | メソッド・タスク選択モーダルを開く |
| フロー図 | default + NodeIndexOutlined | プロジェクト選択後 | フロー図ローディング中 or プロジェクト未選択 | `handleOpenFlowDiagram` → APIでMAIMLを取得しInstructionFlowDialogを開く |
| 確認完了（プロジェクト指示グループ） | primary + success色 + CheckCircleOutlined | プロジェクト指示グループ展開時 & 指示が1件以上存在 | `readOnly` = true or 全件確認済み or 処理中 | `handleConfirmProjectInstructions` → Modal.confirmで確認後、APIで一括確認完了 |
| 確認完了（タスク指示グループ） | primary + success色（InstructionGroup内） | タスク指示グループ展開時（InstructionGroup側で制御） | `readOnly` = true or 処理中 | `handleConfirmTaskInstructions` → Modal.confirmで確認後、APIで一括確認完了 |
| 確認完了（トランジション指示グループ） | primary + success色（InstructionGroup内） | トランジション指示グループ展開時（InstructionGroup側で制御） | `readOnly` = true or 処理中 | `handleConfirmTransitionInstructions` → Modal.confirmで確認後、APIで一括確認完了 |
| 全ての指示の確認完了 | primary + success色 + large + CheckCircleOutlined | 常時表示 | `readOnly` = true or 指示0件 or 全件確認済み or 処理中 | `handleConfirmAllInstructions` → Modal.confirmで確認後、全未確認指示をAPIで一括確認完了 |

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
| handleOpenFlowDiagram | フロー図ボタンクリック | `getProjectMaiml()` でMAIMLコンテンツを取得し、InstructionFlowDialogを開く（複数同時表示可能） |
| handleCloseDialog | ダイアログ閉じる | ダイアログ一覧から削除 |
| handleFocusDialog | ダイアログクリック | 該当ダイアログを最前面に表示（z-index更新） |
| handleOpenSubNetViewer | サブネット表示ボタンクリック | SubNetViewerを開く |
| handleCloseSubNetViewer | SubNetViewer閉じる | SubNetViewerを非表示 |
| confirmInstructions | 指示確認共通処理 | 指定した指示一覧を順番に `confirmInstruction()` APIで確認完了にする共通関数。成功・失敗件数を表示し、完了後に `onInstructionsUpdated()` で一覧を再取得 |
| handleConfirmProjectInstructions | プロジェクト指示グループの確認完了ボタンクリック | `Modal.confirm` で確認後、未確認のプロジェクト指示を一括確認完了（`confirmInstructions` 呼び出し） |
| handleConfirmTaskInstructions | タスク指示グループの確認完了ボタンクリック（InstructionGroup経由） | `Modal.confirm` で確認後、未確認のタスク指示を一括確認完了（`confirmInstructions` 呼び出し） |
| handleConfirmTransitionInstructions | トランジション指示グループの確認完了ボタンクリック（InstructionGroup経由） | `Modal.confirm` で確認後、未確認のトランジション指示を一括確認完了（`confirmInstructions` 呼び出し） |
| handleConfirmAllInstructions | 全ての指示の確認完了ボタンクリック | `Modal.confirm` で確認後、全未確認指示を一括確認完了（`confirmInstructions` 呼び出し） |

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
  selectedProjectName: string;                // 選択中のプロジェクト名（APIリクエストに使用）
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
  onInstructionsUpdated: () => Promise<void>; // 指示確認完了後の再取得ハンドラ
  readOnly?: boolean;                         // trueのとき確認完了ボタンを無効化（オーバーレイ閲覧モード用）
}
```

### 5.2 State（内部状態）

```typescript
// API連携の状態管理
const [loading, setLoading] = useState<boolean>(false);           // タスク一覧取得中フラグ
const [confirmLoading, setConfirmLoading] = useState<boolean>(false); // 指示確認完了処理中フラグ
const [methods, setMethods] = useState<Method[]>([]);             // APIから取得したメソッド一覧
const [tasks, setTasks] = useState<Task[]>([]);                   // APIから取得した全タスク一覧
const [projectId, setProjectId] = useState<string | null>(null);  // APIから取得したプロジェクトID

// ViewRendererDialogの管理
const [viewerDialogs, setViewerDialogs] = useState<Array<{
  id: string;
  file: FileData;
  zIndex: number;
}>>([]);
const [nextZIndex, setNextZIndex] = useState(999999);
const [flowDiagramLoading, setFlowDiagramLoading] = useState(false); // フロー図読み込み中フラグ

// SubNetViewerの管理
const [subnetData, setSubnetData] = useState<SubnetData | null>(null);

// メソッド・タスク選択モーダルの表示状態
const [isModalVisible, setIsModalVisible] = useState(false);
```

### 5.3 算出データ

```typescript
// 選択されたメソッドに紐づくタスクをフィルタリング（useMemo）
// ※ tasks は State から取得（APIで取得した全タスク一覧）
const filteredTasks = useMemo(() => {
  if (!selectedMethodId) return tasks;
  return tasks.filter(task => task.methodId === selectedMethodId);
}, [tasks, selectedMethodId]);

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
      // タスク未選択の場合（空文字列または'new'）は選択されたメソッドの全てのタスクの作業指示を表示
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
    method: taskInstructions.length, // 後方互換性のためmethodキーを残すがtaskInstructionsを使用
    transition: transitionInstructions.length,
    unread: unreadInstructions.length,
  };
}, [filteredInstructions]);

// プロジェクトステータス（暫定: APIから取得できるまでnull固定）
const projectStatus: ProjectStatus | null = null;
```

### 5.4 使用するAPI

| API | サービス関数 | メソッド | エンドポイント | 用途 | 実装状況 |
|-----|------------|---------|--------------|------|---------|
| タスク一覧取得API | `getWorkerTasks(projectName)` | GET | `/api/v1/progress/projects/:projectName/worker-tasks` | メソッド・タスク一覧をAPIから取得（`useEffect`でプロジェクト選択時に呼び出し） | 実装済み |
| 指示一覧取得API | （親コンポーネントから`sortedInstructions`として受け取り） | GET | `/api/v1/instructions` | 作業指示一覧の取得（本コンポーネントでは直接呼び出さない） | 親側で実装 |
| 指示確認API | `confirmInstruction(projectName, instructionId)` | PUT | `/api/v1/instructions/{instructionId}/confirm` | 指示の確認完了（`confirmInstructions`共通処理から呼び出し） | 実装済み |
| MAIMLファイル取得API | `getProjectMaiml(projectName)` | GET | `/api/v1/projects/:projectName/maiml` | フロー図表示用のMAIMLファイル取得（`handleOpenFlowDiagram`から呼び出し） | 実装済み |

**指示一覧取得API詳細:**
- **クエリパラメータ**: 
  - `projectId` (required): プロジェクトID
  - `methodId` (optional): メソッドID（タスク指示のフィルタリング用）
  - `taskNo` (optional): タスク番号（さらに絞り込み）
  - `instructionTarget` (optional): 指示対象（1:ファイル全体、2:タスク、3:トランジション）
  - `isAcknowledged` (optional): 確認済フラグ
- **レスポンス**: 指示一覧（配列）
- **詳細仕様**: `docs/design/api/API一覧_実験作業者画面.md` 参照

**MAIMLファイル取得API詳細:**
- **パスパラメータ**: 
  - `projectId` (required): プロジェクトID（UUID）
- **レスポンス**: MAIMLファイルの内容（XMLコンテンツ）
- **詳細仕様**: `docs/design/api/api_project_management.md` API #15を参照

### 5.5 データソース

- メソッド・タスク一覧: `getWorkerTasks()` API から取得（**モックデータ廃止済み**）
- 指示一覧: 親コンポーネントから `sortedInstructions` props として受け取る

---

## 6. エラーチェック

### 6.1 バリデーション

| 項目 | ルール | エラーメッセージ |
|------|--------|----------------|
| プロジェクト選択 | 必須 | 「プロジェクトを選択してください」（空状態表示） |

### 6.2 確認完了時のチェック

確認完了ボタン押下時は `Modal.confirm`（Ant Design）でダイアログを表示し、確認後に API を呼び出します。`window.alert` / `window.confirm` は使用しません。

```typescript
// 共通確認処理（各ハンドラから呼び出し）
const confirmInstructions = async (instructions: Instruction[], groupName: string) => {
  if (!selectedProjectName) {
    message.error('プロジェクトが選択されていません');
    return;
  }
  if (instructions.length === 0) {
    message.warning('確認する指示がありません');
    return;
  }

  setConfirmLoading(true);
  let successCount = 0;
  let failCount = 0;

  try {
    for (const instruction of instructions) {
      const result = await confirmInstruction(selectedProjectName, instruction.instructionId);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    // 結果に応じてフィードバック表示
    if (failCount === 0) {
      message.success(`${groupName}を確認完了しました（${successCount}件）`);
    } else if (successCount === 0) {
      message.error(`${groupName}の確認に失敗しました（${failCount}件）`);
    } else {
      message.warning(`${groupName}の確認が一部失敗しました（成功: ${successCount}件、失敗: ${failCount}件）`);
    }

    // 成功件数が1件以上あれば指示一覧を再取得
    if (successCount > 0) {
      await onInstructionsUpdated();
    }
  } finally {
    setConfirmLoading(false);
  }
};

// 全指示確認完了ハンドラ
const handleConfirmAllInstructions = () => {
  const unreadInstructions = filteredInstructions.filter((i) => !i.isAcknowledged);

  if (unreadInstructions.length === 0) {
    message.info('確認が必要な指示はありません');
    return;
  }

  Modal.confirm({
    title: '全ての指示の確認完了',
    content: `全ての指示（${filteredStats.total}件中${unreadInstructions.length}件未確認）を確認完了にしますか？`,
    okText: '確認完了',
    cancelText: 'キャンセル',
    onOk: async () => {
      await confirmInstructions(unreadInstructions, '全ての指示');
    },
  });
};
```

**確認完了の判定フィールド:**
- 未確認判定: `instruction.isAcknowledged === false`（`isRead` ではなく `isAcknowledged` を使用）

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

- `filteredTasks`, `filteredInstructions`, `filteredStats`は`useMemo`でメモ化
- 不要な再レンダリングを防ぐため、コールバック関数は適切にメモ化
- プロジェクト選択時の`useEffect`で非同期API呼び出しを実施（`selectedProject`, `selectedProjectName`の変化を監視）

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
   - プロジェクト指示グループ: グループヘッダーの「確認完了」ボタンで一括確認
   - タスク指示グループ: `InstructionGroup`コンポーネント経由で確認完了
   - トランジション指示グループ: `InstructionGroup`コンポーネント経由で確認完了
   - 全体: 「全ての指示の確認完了」ボタンで全グループを一括確認完了

5. **空状態の判定**
   - `!selectedProjectName`（`selectedProject`ではなく`selectedProjectName`を使用）で判定
   - `selectedProjectName`が空文字列またはfalsy値の場合に空状態を表示

6. **`readOnly`モード**
   - `readOnly={true}` が渡された場合、全ての確認完了ボタンが無効化される
   - オーバーレイ閲覧モード（他ユーザーの進捗確認）で使用

### 10.2 将来の拡張

1. 指示の既読/未読状態のリアルタイム更新（WebSocket）
2. 指示の検索・フィルタリング機能
3. 指示へのコメント機能
4. 指示の重要度・優先度表示

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
| 2.0.0 | 2026-03-11 | ソースコードとの差分を解消：Props追加（selectedProjectName/onInstructionsUpdated/readOnly）、State追加（loading/confirmLoading/methods/tasks/projectId/flowDiagramLoading）、算出データ修正（filteredTasks化・projectInfo/methodInfo削除）、イベントハンドラ追加（confirmInstructions/handleConfirmProjectInstructions/handleConfirmTaskInstructions/handleConfirmTransitionInstructions）、ボタン一覧追加（タスク・トランジション指示の確認完了）、確認完了処理をwindow.confirm→Modal.confirm+API実装済みに更新、データソースをモック→API化に更新、空状態判定をselectedProjectName使用に修正 | Cline |

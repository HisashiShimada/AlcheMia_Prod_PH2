# 実験記録タブ UI設計書

## メタデータ
- **画面ID**: ExperimentRecordTab
- **画面名**: 実験記録タブ
- **ファイルパス**: `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-01-19
- **最終更新日**: 2026-01-19

---

## 1. 概要

### 1.1 画面の目的
実験作業者が実験データを記録するためのメインタブ画面です。プロジェクト、メソッド、タスクを選択し、トランジション単位で実験データを記録します。

### 1.2 主要機能
- プロジェクト・メソッド・タスクの選択
- トランジション一覧の表示（リスト形式/フロー図形式）
- 実験データの記録
- 問題報告

### 1.3 アクセス権限
- **対象ロール**: 実験作業者（experiment_worker）
- **必要条件**: ログイン済み、有効なセッション

---

## 2. 画面構成

### 2.1 画面イメージ
![実験記録タブイメージ](images\ui_experiment_record_tab.jpg)

### 2.2 レイアウト構造

```
┌─────────────────────────────────────────────┐
│ MethodTaskSelector（共通コンポーネント）      │
│ - プロジェクト選択（読み取り専用）            │
│ - メソッド選択                               │
│ - タスク選択                                 │
│ - [選択] ボタン（モーダル表示）              │
├─────────────────────────────────────────────┤
│ [表示切り替えボタン]                         │
│ - リスト表示 ⇄ フロー図表示                  │
├─────────────────────────────────────────────┤
│ トランジション表示エリア（Card）              │
│ ┌─────────────────────────────────────────┐ │
│ │ [リスト表示]                              │ │
│ │ - TransitionList コンポーネント           │ │
│ │                                           │ │
│ │ または                                    │ │
│ │                                           │ │
│ │ [フロー図表示]                            │ │
│ │ - TransitionFlowDiagram コンポーネント    │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘

モーダル:
- MethodTaskSelectionModal（メソッド・タスク選択）
- DataRecordDialog（データ記録）
- IssueManagementModal（問題管理）
```

### 2.3 使用コンポーネント

#### Ant Design コンポーネント
- `Card` - トランジション表示エリアのコンテナ
- `Space` - 要素の間隔制御
- `Button` - 表示切り替えボタン
- `Typography.Title` - 見出し
- `Typography.Text` - テキスト表示
- `Empty` - 空状態表示
- `theme` - デザイントークン取得

#### カスタムコンポーネント
- `MethodTaskSelector` - メソッド・タスク選択UI
- `TransitionList` - トランジション一覧表示
- `TransitionFlowDiagram` - トランジションフロー図表示
- `DataRecordDialog` - データ記録モーダル
- `IssueManagementModal` - 問題管理モーダル
- `MethodTaskSelectionModal` - メソッド・タスク選択モーダル

#### アイコン
- `ExperimentOutlined` - 実験アイコン（空状態）
- `CheckSquareOutlined` - チェックボックスアイコン（空状態）
- `PartitionOutlined` - フロー図アイコン
- `UnorderedListOutlined` - リストアイコン
- `BarChartOutlined` - グラフアイコン

---

## 3. コントロール一覧

### 3.1 入力項目

| 項目名 | タイプ | 必須 | 初期値 | 説明 |
|--------|--------|------|--------|------|
| selectedProject | 表示のみ | ○ | props経由 | 選択中のプロジェクトID（親から受け取り） |
| selectedMethodId | Select | ○ | null | 選択中のメソッドID |
| selectedTaskId | Select | ○ | '' | 選択中のタスクID |
| viewMode | Radio | - | 'list' | 表示モード（'list' or 'flow'） |

### 3.2 ボタン

| ボタン名 | タイプ | 表示条件 | アクション |
|---------|--------|---------|-----------|
| 選択 | default | プロジェクト選択時 | メソッド・タスク選択モーダルを開く |
| フロー図に切り替え | default + PartitionOutlined | リスト表示時 & メソッド・タスク選択済み | フロー図表示に切り替え |
| 一覧表示に切り替え | default + UnorderedListOutlined | フロー図表示時 & メソッド・タスク選択済み | リスト表示に切り替え |

### 3.3 表示項目

#### 空状態メッセージ
| 状態 | アイコン | タイトル | メッセージ |
|------|---------|---------|-----------|
| プロジェクト未選択 | ExperimentOutlined (48px) | 🧪 実験記録 | プロジェクトを選択してください |
| メソッド未選択 | ExperimentOutlined (48px) | 📋 トランジション一覧 | メソッドを選択してください |
| タスク未選択 | CheckSquareOutlined (48px) | 📋 トランジション一覧 | タスクを選択してください |

#### トランジション表示
- **リスト表示**: `TransitionList` コンポーネントで一覧表示
- **フロー図表示**: `TransitionFlowDiagram` コンポーネントでフロー図表示

---

## 4. イベント

### 4.1 ボタンクリックイベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| handleRecordClick | トランジションの記録ボタンクリック | 選択したトランジションを設定し、DataRecordDialogを開く |
| handleIssueClick | トランジションの問題報告ボタンクリック | 選択したトランジションを設定し、問題一覧を取得してIssueManagementModalを開く |
| handleSwitchToFlow | フロー図切り替えボタンクリック | viewModeを'flow'に変更 |
| handleSwitchToList | 一覧表示切り替えボタンクリック | viewModeを'list'に変更 |

### 4.2 モーダルイベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| handleDataRecordModalClose | データ記録モーダルを閉じる | モーダルを非表示、選択トランジションをクリア |
| handleIssueModalClose | 問題管理モーダルを閉じる | モーダルを非表示、選択トランジションをクリア |
| handleDataSave | データ保存 | データをログ出力（TODO: バックエンドAPI実装） |
| handleSubmitIssue | 問題報告送信 | 問題をログ出力（TODO: バックエンドAPI実装） |
| handleSubmitComment | コメント送信 | コメントをログ出力（TODO: バックエンドAPI実装） |

### 4.3 選択イベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| onSelectMethod | メソッド選択変更 | 親コンポーネントのコールバック呼び出し |
| onSelectTask | タスク選択変更 | 親コンポーネントのコールバック呼び出し |

---

## 5. データフロー

### 5.1 Props（親から受け取るデータ）

```typescript
interface ExperimentRecordTabProps {
  selectedProject: string;                    // 選択中のプロジェクトID
  onProjectChange: (value: string) => void;   // プロジェクト変更ハンドラ
  selectedMethodId: string | null;            // 選択中のメソッドID
  onSelectMethod: (methodId: string | null) => void; // メソッド選択ハンドラ
  selectedTaskId: string;                     // 選択中のタスクID
  onSelectTask: (taskId: string) => void;     // タスク選択ハンドラ
  onTaskCreated: (newTaskId: string) => void; // タスク作成ハンドラ
  selectedMethod: Method | null;              // 選択中のメソッドオブジェクト
}
```

### 5.2 State（内部状態）

```typescript
// モーダル表示状態
const [modalOpen, setModalOpen] = useState(false);

// 表示モード
const [viewMode, setViewMode] = useState<ViewMode>('list');

// データ記録モーダル状態
const [dataRecordModalOpen, setDataRecordModalOpen] = useState(false);
const [selectedTransition, setSelectedTransition] = useState<Transition | null>(null);

// 問題管理モーダル状態
const [issueModalOpen, setIssueModalOpen] = useState(false);
const [issues, setIssues] = useState<Issue[]>([]);
```

### 5.3 算出データ

```typescript
// プロジェクトデータ
const selectedProjectData = projectsData[selectedProject];

// プロジェクトステータス
const projectStatus: ProjectStatus | null = selectedProjectData?.status ?? null;

// 記録可能状態判定
const isProjectRecordable = projectStatus 
  ? ['active', 'in_progress', 'executing_task'].includes(projectStatus) 
  : true;

// タスク一覧
const tasks = selectedProject && selectedMethod
  ? selectedMethod.tasks || []
  : [];

// 進捗データを含むトランジション一覧（useMemo）
const transitionsWithProgress = useMemo(() => {
  // 進捗データとトランジションをマージ
  // ...
}, [selectedMethod, selectedTaskId, selectedProjectData, tasks]);
```

### 5.4 使用するAPI

| API | メソッド | エンドポイント | 用途 | 実装状況 |
|-----|---------|--------------|------|---------|
| 実験データ保存API | POST | `/api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data` | 実験データの一括保存 | TODO |
| ステータス更新API | PUT | `/api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/transitions/:transitionId/status` | トランジションステータスの更新 | TODO |
| 問題報告API | POST | `/api/v1/issues` | 問題報告の送信 | ✅ 完了 |
| コメント投稿API | POST | `/api/v1/issues/:issueId/comments` | 問題へのコメント投稿 | ✅ 完了 |
| 問題一覧取得API | GET | `/api/v1/issues` | 問題一覧取得 | ✅ 完了 |
| 問題詳細取得API | GET | `/api/v1/issues/:issueId` | 問題詳細とコメント一覧取得 | ✅ 完了 |
| 進捗データ取得API | GET | `/api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/progress` | トランジションの進捗データ取得 | モックデータ使用中 |

### 5.5 データソース

- `projectsData` - プロジェクトマスターデータ（モック）
- `getIssuesByTransitionId` - トランジションIDに紐づく問題一覧取得（モック）

---

## 6. エラーチェック

### 6.1 バリデーション

| 項目 | ルール | エラーメッセージ |
|------|--------|----------------|
| プロジェクト選択 | 必須 | 「プロジェクトを選択してください」（空状態表示） |
| メソッド選択 | 必須 | 「メソッドを選択してください」（空状態表示） |
| タスク選択 | 必須 | 「タスクを選択してください」（空状態表示） |

### 6.2 プロジェクトステータスによる制限

| プロジェクトステータス | 記録可否 | 説明 |
|---------------------|---------|------|
| active | ○ | 記録可能 |
| in_progress | ○ | 記録可能 |
| executing_task | ○ | 記録可能 |
| waiting_approval | × | 承認待ち - 記録不可 |
| waiting_task | × | タスク待ち - 記録不可 |

---

## 7. 画面遷移

### 7.1 遷移元
- ExperimentWorkerMenu（実験作業メニュー）から「実験記録」タブを選択

### 7.2 遷移先
なし（タブ内で完結）

### 7.3 モーダル遷移

```
ExperimentRecordTab
  ├→ MethodTaskSelectionModal（メソッド・タスク選択）
  │   └→ 選択後、メソッドIDとタスクIDを更新
  │
  ├→ DataRecordDialog（データ記録）
  │   └→ 保存後、モーダルを閉じる
  │
  └→ IssueManagementModal（問題管理）
      └→ 送信後、モーダルを閉じる
```

---

## 8. レスポンシブ対応

### 8.1 ブレークポイント

| サイズ | 幅 | 対応 |
|--------|-----|-----|
| Mobile | < 768px | 縦スクロール、フロー図は横スクロール |
| Tablet | 768px - 1024px | 標準レイアウト |
| Desktop | > 1024px | 標準レイアウト |

### 8.2 モバイル対応

- フロー図表示時は横スクロール可能
- ボタンは縦配置（Space direction="vertical"）
- カードの余白調整

---

## 9. パフォーマンス考慮事項

### 9.1 最適化

- `transitionsWithProgress`は`useMemo`でメモ化
- 不要な再レンダリングを防ぐため、コールバック関数は適切にメモ化

### 9.2 データ量

- トランジション数: 最大100件程度を想定
- 進捗データ: 各トランジションごとに1件

---

## 10. 備考

### 10.1 特記事項

1. **表示モード切り替え**
   - リスト表示とフロー図表示を切り替え可能
   - 状態は`viewMode`で管理（'list' or 'flow'）

2. **進捗データのマージ**
   - 選択されたタスクに紐づく進捗データをトランジションにマージ
   - 進捗データがない場合はデフォルト値（未着手、進捗率0%）を設定

3. **プロジェクトステータスによる制御**
   - 承認待ち・タスク待ちステータスでは記録不可
   - `isProjectRecordable`フラグで制御

### 10.2 将来の拡張

1. バックエンドAPI統合（データ保存、問題報告）
2. リアルタイム進捗更新（WebSocket）
3. 一括データ記録機能
4. オフライン対応（データのローカル保存）
5. フロー図のカスタマイズ（ズーム、レイアウト調整）

### 10.3 関連ドキュメント

- [TransitionList UI設計書](./ui_transition_list.md)
- [TransitionFlowDiagram UI設計書](./ui_transition_flow_diagram.md)
- [DataRecordDialog UI設計書](./ui_data_record_dialog.md)
- [IssueManagementModal UI設計書](./ui_issue_management_modal.md)
- [MethodTaskSelector UI設計書](./ui_method_task_selector.md)

---

## 11. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.1.0 | 2026-02-17 | API仕様v2.1.0に準拠した修正 | Cline |
| | | - API一覧にエンドポイント列を追加 | |
| | | - 実験データ保存APIのエンドポイント更新 | |
| | | - ステータス更新APIのエンドポイント更新 | |
| 1.0.0 | 2026-01-19 | 初版作成 | Cline |

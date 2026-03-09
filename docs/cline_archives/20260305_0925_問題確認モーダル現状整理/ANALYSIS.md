# 問題確認モーダル 現状整理

- **作成日時**: 2026-03-05 09:25
- **対象**: プロジェクト管理画面・作業者画面が呼び出す問題確認モーダル

---

## 1. コンポーネント構成（2種類）

```
frontend/src/components/ExperimentWorker/
├── IssueManagementModal.tsx  ← メインの問題管理モーダル（大型・2カラム）
└── IssueReportModal.tsx      ← シンプルなコメント入力モーダル（小型）
```

---

## 2. 各コンポーネントの概要

### 2-1. `IssueManagementModal.tsx`

- **サイズ**: width=1200、2カラムレイアウト
- **左カラム**: 問題一覧テーブル（テキスト検索・ステータスフィルタ付き）
- **右カラム**: 問題詳細 または 新規問題報告フォーム

#### Props定義

```ts
interface IssueManagementModalProps {
  visible: boolean;
  transitionId: string;         // ※実際にはプロジェクトID・タスクIDも渡される（命名が不正確）
  transitionName: string;       // ※実際にはプロジェクト名・タスク名も渡される（命名が不正確）
  issues: Issue[];              // 親から渡される問題データ
  onClose: () => void;
  onSubmitIssue?: (issue: IssueReportFormData) => void;   // 新規問題報告
  onSubmitComment?: (issueId: string, comment: string) => void;  // コメント送信
  onUpdateStatus?: (issueId: string, status: IssueStatus) => void;  // ステータス変更
  viewMode?: boolean;           // true=参照専用（入力UI非表示）デフォルト: false
  filterTaskId?: string;        // タスクIDで問題一覧をフィルタ
  projectStatus?: ProjectStatus | null;  // waiting_approval の場合は編集不可
}
```

#### 表示モードの分岐ロジック

```
isEditDisabled = viewMode || (projectStatus === 'waiting_approval')

viewMode=true の場合:
  - 「新規問題報告」ボタン → 非表示
  - コメント入力エリア    → 非表示
  - コメント送信/未解決/解決 ボタン → 非表示

isApprovalPending=true の場合:
  - 「新規問題報告」ボタン → disabled
  - コメント入力テキストエリア → disabled
  - コメント送信/未解決/解決 ボタン → disabled
```

#### タイトル表示

```tsx
// モードに関わらず常に「問題報告 - {transitionName}」と表示される
title={<Space><ExclamationCircleOutlined />問題報告 - {transitionName}</Space>}
```

---

### 2-2. `IssueReportModal.tsx`

- **サイズ**: width=600、単一フォーム構成
- **内容**: タスク情報表示 ＋ ステータス表示 ＋ コメントテキストエリア ＋ 3ボタン

#### Props定義

```ts
interface IssueReportModalProps {
  visible: boolean;
  task: Task | null;
  initialStatus?: IssueStatus;  // デフォルト: 'unresolved'
  onClose: () => void;
  onCommentSubmit?: (taskId: string, comment: string) => void;
  onStatusChange?: (taskId: string, newStatus: IssueStatus) => void;
}
```

#### ボタンの活性条件

| ボタン | 活性条件 |
|--------|----------|
| コメント送信 | コメントが入力済み |
| 未解決 | コメント入力済み かつ 現在のステータスが `resolved` |
| 解決 | コメント入力済み かつ 現在のステータスが `unresolved` |

---

## 3. 呼び出し元と使われ方の一覧

| 呼び出し元 | 使用コンポーネント | viewMode | issuesデータ | API接続 | 用途 |
|---|---|---|---|---|---|
| `ProjectManagement.tsx` | `IssueManagementModal` | `true` | 空配列（モック） | ❌ 未接続 | 「問題確認」ボタン → プロジェクト全体の問題参照 |
| `ProgressCheckTab.tsx` | `IssueReportModal` | - | - | ❌ 未接続 | 「issue」アクション → コメント・ステータス変更 |
| `ProgressCheckTab.tsx` | `IssueManagementModal` | `true` | 固定モック1件 | ❌ 未接続 | 「issueCheck」アクション → タスク問題の参照 |
| `ExperimentRecordTab.tsx` | `IssueManagementModal` | `false`（省略） | `getIssues()` API | ✅ 接続済み | フロー図「問題」ボタン → 報告・コメント |
| `TransitionList.tsx` | `IssueManagementModal` | `false`（省略） | `getIssues()` API | ✅ 接続済み | 一覧「報告」ボタン → 報告・コメント・ステータス変更 |

---

## 4. 各呼び出し元の詳細

### 4-1. `ProjectManagement.tsx`（プロジェクト管理画面）

**場所**: `frontend/src/components/project/ProjectManagement.tsx`

**トリガー**: 右側ツールバーの「問題確認」ボタン（`ExclamationCircleOutlined` アイコン付き）

```tsx
// 状態管理
const [issueManagementModalOpen, setIssueManagementModalOpen] = useState(false);

// モックデータ（常に空）
const mockIssues = useMemo(() => {
  if (!selectedProject) return [];
  return []; // TODO: 実際のAPIから取得する
}, [selectedProject]);

// 呼び出し
<IssueManagementModal
  visible={issueManagementModalOpen}
  transitionId={selectedProject.id}       // プロジェクトID
  transitionName={selectedProject.name}   // プロジェクト名
  issues={mockIssues}                     // 常に空配列
  onClose={handleCloseIssueManagement}
  viewMode={true}
  // onSubmitIssue / onSubmitComment / onUpdateStatus は未渡し
/>
```

**⚠️ 課題**: `issues` が常に空。API取得なし。

---

### 4-2. `ProgressCheckTab.tsx`（作業者画面 > 進捗確認タブ）

**場所**: `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx`

**トリガー**: `ProgressCheckTable` のタスク行の操作ボタン（`action: 'issue'` / `action: 'issueCheck'`）

```tsx
// 問題報告（IssueReportModal）
const handleOpenIssueReport = (task: Task) => { ... }
<IssueReportModal
  visible={issueReportModalVisible}
  task={selectedTaskForIssue}
  initialStatus="unresolved"
  onClose={handleCloseIssueReport}
  onCommentSubmit={handleCommentSubmit}   // console.log のみ
  onStatusChange={handleStatusChange}     // console.log のみ
/>

// 問題確認（IssueManagementModal）
const handleOpenIssueCheck = (task: Task) => { ... }
<IssueManagementModal
  visible={issueCheckModalVisible}
  transitionId={selectedTaskForIssueCheck.taskId}
  transitionName={selectedTaskForIssueCheck.taskName}
  issues={mockIssues}                     // 固定モック1件
  onClose={handleCloseIssueCheck}
  viewMode={true}
  filterTaskId={selectedTaskForIssueCheck.taskId}
/>
```

**⚠️ 課題**: 両方ともAPIと未接続。`mockIssues` は `useMemo` で組み立てた固定データ1件。

---

### 4-3. `ExperimentRecordTab.tsx`（作業者画面 > 実験記録タブ）

**場所**: `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`

**トリガー**: フロー図（`TransitionFlowDiagram`）のトランジションノードにある「問題」ボタン

```tsx
// 問題クリック時にAPIで問題一覧を取得してからモーダルを開く
const handleIssueClick = async (transition: Transition) => {
  setSelectedTransition(transition);
  setIssues([]);
  setIssueModalOpen(true);
  // getIssues({ projectId, methodId, taskNo, transitionId }) でデータ取得
};

<IssueManagementModal
  visible={issueModalOpen}
  transitionId={selectedTransition.transitionId}
  transitionName={selectedTransition.transitionName}
  issues={issues}                         // getIssues() APIで取得
  onClose={handleIssueModalClose}
  onSubmitIssue={handleSubmitIssue}       // createIssue() API
  onSubmitComment={handleSubmitComment}   // addComment() API
  projectStatus={projectStatus}
  // onUpdateStatus は未渡し（ステータス変更ボタンは disabled のまま）
/>
```

**⚠️ 課題**: `onUpdateStatus` が未渡しのため、「未解決」「解決」ボタンは押せるが処理されない。

---

### 4-4. `TransitionList.tsx`（実験記録タブ内 > トランジション一覧）

**場所**: `frontend/src/components/ExperimentWorker/TransitionList.tsx`

**トリガー**: 一覧テーブルの「報告」ボタン（各トランジション行）

```tsx
<IssueManagementModal
  visible={issueModalOpen}
  transitionId={selectedTransition.transitionId}
  transitionName={selectedTransition.transitionName}
  issues={issues}                         // getIssues() APIで取得
  onClose={handleIssueModalClose}
  onSubmitIssue={handleSubmitIssue}       // createIssue() API
  onSubmitComment={handleSubmitComment}   // addComment() API
  onUpdateStatus={handleUpdateStatus}     // updateIssueStatus() API ✅
  projectStatus={projectStatus}
/>
```

**✅ 最も実装が完成している箇所**（`onUpdateStatus` まで接続済み）。

---

## 5. 使用しているAPIサービス

```
frontend/src/services/issueApiService.ts

- getIssues({ projectId, methodId, taskNo, transitionId })
  → 問題一覧取得

- createIssue({ projectId, methodId, issueType, targetType, taskNo, transitionId, title, description })
  → 新規問題報告

- addComment({ projectName, issueId, comment })
  → コメント投稿

- updateIssueStatus({ projectName, issueId, status })
  → ステータス変更（unresolved / resolved）
```

---

## 6. 型定義（`frontend/src/types/experimentWorker.ts`）

```ts
export type IssueStatus = 'unresolved' | 'resolved';
export type IssueTargetType = 'project' | 'task' | 'transition';
export type IssueType = number; // code_master.code_division='issue_type' の code_value

export interface IssueComment {
  commentId: string;
  issueId: string;
  content: string;
  createdBy: User;
  createdAt: string;
}

export interface Issue {
  issueId: string;
  projectId: string;
  projectName?: string;
  taskId?: string;
  taskName?: string;
  transitionId?: string;
  transitionName?: string;
  targetType: IssueTargetType;
  issueType?: IssueType;
  title: string;
  content: string;
  status: IssueStatus;
  reportedBy: User;
  reportedAt: string;
  comments: IssueComment[];
}

export interface IssueReportFormData {
  title: string;
  targetType: IssueTargetType;
  issueType: IssueType;
  content: string;
}
```

---

## 7. コールバック呼び出しの構造

`IssueManagementModal` は **コールバックを `await` せずに呼び出し、直後に `message.success` を表示** する設計になっている。

```
// モーダル内（IssueManagementModal.tsx）
const handleCommentSubmit = () => {
  if (onSubmitComment) {
    onSubmitComment(issueId, comment);  // ← await なし
  }
  message.success('コメントを送信しました');  // ← API結果に関係なく即表示
  setNewComment('');
};

// 親側（TransitionList.tsx）
const handleSubmitComment = async (issueId, comment) => {
  await addComment({ ... });   // ← 実際のAPI呼び出し
  // 問題一覧の再取得
};
```

**役割分担のまとめ**

| 処理 | `IssueManagementModal` が担う部分 | 親コンポーネントが担う部分 |
|---|---|---|
| 新規問題報告 | バリデーション → `onSubmitIssue(values)` 呼び出し → 成功メッセージ表示 → フォームリセット | `createIssue()` API呼び出し・問題一覧の再取得 |
| コメント送信 | `onSubmitComment(issueId, comment)` 呼び出し → 成功メッセージ表示 → 入力クリア | `addComment()` API呼び出し・問題一覧の再取得 |
| ステータス変更 | `onSubmitComment` → `onUpdateStatus` 呼び出し → 成功メッセージ表示 → 入力クリア | `addComment()` + `updateIssueStatus()` API呼び出し・問題一覧の再取得 |

---

## 8. 現状の課題まとめ

| # | 課題 | 対象箇所 | 影響度 |
|---|---|---|---|
| 1 | `ProjectManagement` の「問題確認」が API 未接続（常に空） | `ProjectManagement.tsx` | 高 |
| 2 | `ProgressCheckTab` の問題報告・問題確認が API 未接続（モック・console.log） | `ProgressCheckTab.tsx` | 高 |
| 3 | `ExperimentRecordTab` の `onUpdateStatus` が未渡し（解決/未解決ボタンが機能しない） | `ExperimentRecordTab.tsx` | 中 |
| 4 | コールバックを `await` せず即座に成功メッセージを表示するため、API失敗時も「成功」と表示される | `IssueManagementModal.tsx` | 中 |
| 5 | `IssueManagementModal` のタイトルが `viewMode` に関係なく常に「問題報告」と表示される | `IssueManagementModal.tsx` | 低 |
| 6 | Props名 `transitionId`/`transitionName` がプロジェクト・タスク・トランジション全てで使い回されており意味が不明確 | `IssueManagementModal.tsx` Props | 低 |
| 7 | `IssueReportModal` と `IssueManagementModal` でコメント送信・ステータス変更の機能が重複している | 2コンポーネント間 | 低 |

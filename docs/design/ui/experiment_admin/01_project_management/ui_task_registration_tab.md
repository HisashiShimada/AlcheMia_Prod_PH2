# タスク登録タブ UI仕様書

## メタデータ
- **画面名**: タスク登録タブ
- **物理名**: TaskRegistrationTab.tsx
- **ファイルパス**: `frontend/src/components/project/TaskRegistrationTab.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **最終更新日**: 2026-08-20
- **バージョン**: 3.0.0

---

## 1. 概要

### 目的
プロジェクトに登録されたMAIMLファイルの各メソッドに対して、試行回数・作業順序を設定し、タスクとして登録するタブコンポーネント。タスクごとに実験計画指示を追加し、一括保存してワーカーに作業を割り当てる準備を行う。

### 使用場面
- プロジェクト管理画面の「タスク登録」タブ
- MAIML登録後、実験タスクの詳細設定を行う際に使用
- 実験管理者が試行回数・作業順序を設定し、ワーカーに対する指示を登録する

### アクセス権限
- **Experiment Admin（実験管理者）**: タスク登録・編集・保存
- **その他のロール**: アクセス不可

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌─────────────────────────────────────────────────────────────┐
│ [⚠ MAIMLバリデーションエラー警告バナー（条件付き）]           │
├─────────────────────────────────────────────────────────────┤
│ [ドラッグ&ドロップでタスクの順序を変更できます]              │
│                          [プロジェクト指示] [💾 保存]        │
├─────────────────────────────────────────────────────────────┤
│ ┌───┬─────┬──────┬──────────┬─────┬──────┐              │
│ │☑ │ ⋮⋮ │ 作業順序 │ メソッド │試行回数│ (ボタン) │         │
│ ├───┼─────┼──────┼──────────┼─────┼──────┤              │
│ │☑ │ ⋮⋮ │  [1▼] │ Method1  │ [3] │[+指示]│             │
│ │☑ │ ⋮⋮ │  [2▼] │ Method2  │ [1] │[+指示]│             │
│ └───┴─────┴──────┴──────────┴─────┴──────┘              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 MAIMLバリデーションエラー警告バナー

`maimlHasErrors === true` のとき、テーブルの上部に表示。

```tsx
<Alert
  type="warning"
  showIcon
  icon={<ExclamationCircleOutlined />}
  message={t('taskRegistration.maimlErrorWarning')}
/>
```

### 2.3 ツールバー

| 要素 | 説明 |
|------|------|
| ヒントテキスト | `t('taskRegistration.dragHint')`（左揃え、secondary） |
| 「プロジェクト指示」ボタン | プロジェクト全体に対する指示を登録（`InstructionEditDialog` を開く）|
| 「保存」ボタン | `SaveOutlined` + `t('taskRegistration.saveButton')` / 保存中: `t('taskRegistration.saving')` |

**ツールバーボタン無効化条件:**
```
loadingMethods || isCheckoutLocked || maimlHasErrors || isProjectCompleted || !isEditable
```

### 2.4 タスク一覧テーブル

| カラムキー | タイトル | 幅 | 説明 |
|-----------|---------|-----|------|
| `checkbox` | （なし）| 50px | タスク選択チェックボックス（保存対象）|
| `sort` | （なし）| 50px | ドラッグハンドル（`HolderOutlined`）|
| `order` | `t('taskRegistration.columns.order')` | 120px | 作業順序 Select |
| `method` | `t('taskRegistration.columns.method')` | - | メソッドID・名称（読み取り専用）|
| `trialCount` | `t('taskRegistration.columns.trialCount')` | 120px | 試行回数 Input（数値）|
| `addInstruction` | （なし）| 120px | `+指示` ボタン（`ExperimentPlanDialog` を開く）|

> **注意**: 「実験条件」カラムは現在コメントアウト済み（未実装 TODO）

---

## 3. Props 定義

```typescript
interface TaskRegistrationTabProps {
  projectId: string;
  projectName: string;
  isActive: boolean;
  isCheckoutLocked?: boolean;
  /** MAIMLバリデーションエラーがある場合 true */
  maimlHasErrors?: boolean;
  /** プロジェクト完了状態（status === 4）の場合 true */
  isProjectCompleted?: boolean;
  /** 編集権限フラグ。false の場合は変更系ボタンを非活性にする */
  isEditable?: boolean;
  onTasksChange?: (tasks: TaskDetail[]) => void;
}
```

| Prop名 | 型 | 必須 | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| `projectId` | `string` | ✅ | - | プロジェクトID（UUID）。API呼び出しに使用 |
| `projectName` | `string` | ✅ | - | プロジェクト名（useEffect依存配列）|
| `isActive` | `boolean` | ✅ | - | タブがアクティブか |
| `isCheckoutLocked` | `boolean` | ❌ | `false` | チェックアウト状態 |
| `maimlHasErrors` | `boolean` | ❌ | - | MAIMLバリデーションエラー有無 |
| `isProjectCompleted` | `boolean` | ❌ | - | プロジェクト完了状態 |
| `isEditable` | `boolean` | ❌ | `true` | 編集権限フラグ |
| `onTasksChange` | `(tasks: TaskDetail[]) => void` | ❌ | - | タスク変更時のコールバック |

---

## 4. State 管理

```typescript
const [availableMethods, setAvailableMethods] = useState<MethodInfo[]>([]);
const [loadingMethods, setLoadingMethods] = useState<boolean>(false);
const [taskDetails, setTaskDetails] = useState<TaskDetail[]>([]);
const [isSaving, setIsSaving] = useState<boolean>(false);
const [isMaimlRegistered, setIsMaimlRegistered] = useState<boolean>(false);
const [checkedTaskIds, setCheckedTaskIds] = useState<Set<number>>(new Set());
const [instructions, setInstructions] = useState<InstructionData[]>([]);
const [isInstructionDialogOpen, setIsInstructionDialogOpen] = useState<boolean>(false);
const [selectedMethodIdForInstruction, setSelectedMethodIdForInstruction] = useState<string>('');
const [availableTransitions, setAvailableTransitions] = useState<TransitionInfo[]>([]);
const [isProjectInstructionDialogOpen, setIsProjectInstructionDialogOpen] = useState<boolean>(false);
// 実験計画ダイアログ用
const [isExperimentPlanDialogOpen, setIsExperimentPlanDialogOpen] = useState<boolean>(false);
const [selectedMethodIdForPlan, setSelectedMethodIdForPlan] = useState<string>('');
```

---

## 5. Context・サービス連携

```typescript
const { t } = useLanguage();
const { maimlRoot } = useProjectMaiml();
// useCodeMaster は現在コメントアウト済み（TODO）
```

### useMemo

| 変数名 | 内容 |
|--------|------|
| `creatorRefOptions` | `maimlRoot.document.creators[]` から name/id を抽出 |
| `instrumentRefOptions` | `maimlRoot.document.instruments[]` から name/id を抽出 |
| `ownerRefOptions` | `maimlRoot.document.owners[]` から name/id を抽出 |
| `methodTemplatesForPlan` | 選択メソッドの material/condition/result テンプレートを `TemplateDef[]` に変換 |
| `orderSelectOptions` | `createRangeOptions(1, taskDetails.length)` |

---

## 6. 非活性判定関数

| 関数名 | 無効化条件 | 対象要素 |
|--------|-----------|---------|
| `isCheckboxDisabled(record)` | `isSaving \|\| loadingMethods \|\| record.workerLinkedFlg` | チェックボックス |
| `isOrderChangeDisabled(record)` | `isSaving \|\| loadingMethods \|\| isCheckoutLocked \|\| record.workerLinkedFlg \|\| !isEditable` | 作業順序 Select |
| `isFieldDisabled(record)` | `isSaving \|\| loadingMethods \|\| isCheckoutLocked \|\| record.workerLinkedFlg \|\| maimlHasErrors \|\| isProjectCompleted \|\| !isEditable` | 試行回数・指示追加ボタン |

---

## 7. 主要機能

### 7.1 タスクデータの取得（タブアクティブ時）

**実行タイミング**: `useEffect([projectName, isActive, refreshInstructions])`

**API**: `getTaskRegistration(projectId)`（`projectId` 使用。`projectName` は依存配列用）

**処理フロー**:
```
1. setLoadingMethods(true)
2. getTaskRegistration(projectId) でタスクデータ取得
3. setIsMaimlRegistered(taskData.isMaimlRegistered)
4. refreshInstructions() で指示データ再取得
5a. taskData.tasks.length > 0 の場合（DBにデータあり）:
    - uiTasks に変換（experimentCondition を Number() で数値型に変換）
    - setTaskDetails / setAvailableMethods / onTasksChange
    - checkedTaskIds = workerLinkedFlg=false のタスクIDのみ
5b. taskData.tasks.length === 0 && maimlRoot?.protocol?.methods の場合（初回）:
    - MAIMLコンテキストから initialTasks 生成
    - setTaskDetails / setAvailableMethods / onTasksChange
    - checkedTaskIds = 全タスクID
5c. それ以外:
    - setTaskDetails([]) / setAvailableMethods([])
```

### 7.2 指示データのリフレッシュ（`refreshInstructions`）

```typescript
const refreshInstructions = useCallback(async () => {
  setInstructions([]);
  const data = await getInstructions(projectId).catch(...);
  setInstructions(data || []);
}, [projectName]); // ※依存配列は projectName
```

**実行タイミング**: タブアクティブ時・保存成功後

**API**: `GET /api/v1/experiment-admin/project/:projectName/instructions`

### 7.3 「指示追加」ボタンの挙動

```typescript
const handleAddInstructionClick = useCallback((methodId: string) => {
  setSelectedMethodIdForPlan(methodId);
  setIsExperimentPlanDialogOpen(true); // ExperimentPlanDialog を開く
}, []);
```

> **注意**: 設計書 v2.0 では `InstructionEditDialog` を開くとしていたが、実際は **`ExperimentPlanDialog`** を開く。

### 7.4 指示保存ハンドラ（`handleInstructionSave`）

```typescript
const handleInstructionSave = useCallback((instruction: InstructionData, keepDialogOpen?: boolean) => {
  const newInstruction: InstructionData = {
    ...instruction,
    instruction_status: InstructionStatus.UNSENT,
    isNewlyAdded: true,
  };
  setInstructions(prev => [...prev, newInstruction]);
  message.success(t('instructionRegistration.messages.added'));
  if (!keepDialogOpen) {
    setIsInstructionDialogOpen(false);
    setIsProjectInstructionDialogOpen(false);
    setSelectedMethodIdForInstruction('');
  }
}, []);
```

### 7.5 保存処理（`handleSave`）

**バリデーション順序（ソースに従う）**:

```
1. unsentInstructions（instruction_status === InstructionStatus.UNSENT）が0件
   → message.warning(t('taskRegistration.messages.requireInstruction'))
2. checkedTaskIds.size === 0
   → message.warning(t('taskRegistration.messages.selectMethods'))
3. getTaskRegistration(projectId) で最新データ再取得
4. currentData.isMaimlRegistered === false
   → message.warning(t('taskRegistration.messages.maimlNotRegistered'))
5. isFirstSave かつ 全タスクがチェックされていない
   → message.warning(t('taskRegistration.messages.selectAllMethodsFirst'))
6. checkedTasks に methodId が空のものがある
   → message.warning(t('taskRegistration.messages.selectAllMethods'))
7. trialCount が 1〜999 範囲外
   → message.warning(t('taskRegistration.messages.invalidTrialCount'))
8. isCheckoutLocked === true
   → message.warning(t('taskRegistration.messages.checkedOut'))
```

**送信データの作成**:
```
- 新規追加指示（isNewlyAdded === true）のみを送信対象
- プロジェクト指示（methodId === ""）またはチェックメソッドの指示
- experimentOrder = workerLinkedFlg=trueの最大order + 連番
```

**API**: `saveTaskRegistration(projectId, requestData)`

**成功時**: `message.success(t('taskRegistration.messages.saved'))`（APIのレスポンスメッセージは使用しない）

### 7.6 ドラッグ&ドロップ（`handleDragEnd`）

**ライブラリ**: `@dnd-kit/core`, `@dnd-kit/sortable`

- ドラッグ対象または移動先が `workerLinkedFlg === true` の場合は無効
- 警告: `t('taskRegistration.messages.cannotChangeOrder')`

**Sensor設定**:
```typescript
PointerSensor({ activationConstraint: { distance: 8 } })
KeyboardSensor
```

### 7.7 作業順序 Select の挙動

- `workerLinkedFlg === true` のタスク: 現在位置のみ選択可能
- `workerLinkedFlg === false` のタスク: ワーカー連携済みタスクの位置以外に移動可能
- 範囲外の値を入力した場合: `t('taskRegistration.messages.invalidOrder').replace('{max}', ...)`

---

## 8. 子コンポーネント

### 8.1 ExperimentPlanDialog（指示追加ボタンから開く）

```typescript
<ExperimentPlanDialog
  open={isExperimentPlanDialogOpen}
  projectId={projectId}
  methodId={selectedMethodIdForPlan}
  taskNumbers={...}         // 対象メソッドの試行回数から生成
  creatorRefOptions={creatorRefOptions}
  instrumentRefOptions={instrumentRefOptions}
  ownerRefOptions={ownerRefOptions}
  methodTemplates={methodTemplatesForPlan}
  onClose={() => {
    setIsExperimentPlanDialogOpen(false);
    setSelectedMethodIdForPlan('');
  }}
  onSave={() => message.success(t('taskRegistration.saveMockSuccess'))}
  disabled={isCheckoutLocked || maimlHasErrors || isProjectCompleted}
/>
```

### 8.2 InstructionEditDialog（タスク指示用）

```typescript
<InstructionEditDialog
  open={isInstructionDialogOpen}
  mode="create"
  tasks={taskDetails}
  availableTransitions={availableTransitions}
  onClose={handleInstructionDialogClose}
  onSave={handleInstructionSave}
  fixedMethodId={selectedMethodIdForInstruction}
  saveMode="local"
/>
```

### 8.3 InstructionEditDialog（プロジェクト指示用）

```typescript
<InstructionEditDialog
  open={isProjectInstructionDialogOpen}
  mode="create"
  tasks={taskDetails}
  availableTransitions={availableTransitions}
  onClose={handleProjectInstructionDialogClose}
  onSave={handleInstructionSave}
  fixedMethodId=""     // プロジェクト全体指示
  saveMode="local"
/>
```

### 8.4 DraggableRow（テーブル行）

`useSortable` を使用したドラッグ可能な行コンポーネント。

| 条件 | スタイル |
|------|---------|
| `workerLinkedFlg === true` | `backgroundColor: '#f5f5f5'`, `opacity: 0.7` |
| ドラッグ中 | `position: 'relative'`, `zIndex: 9999` |
| ドラッグ無効（チェックアウト中 or ワーカー連携済み）| ハンドルカーソル `not-allowed`、opacity 0.5 |

---

## 9. データ型定義

### TaskDetail（`@/types/taskRegistration`）

```typescript
interface TaskDetail {
  id: number;
  methodId: string;
  experimentCondition: 0 | 1;
  trialCount: number;
  experimentOrder: number;
  taskNumberOptions: number[];
  workerLinkedFlg: boolean;
}
```

### MethodInfo（`@/types/taskRegistration`）

```typescript
interface MethodInfo {
  id: string;
  name: string;
  displayName: string;
  description?: string;
}
```

### InstructionData（`@/types/instructionRegistration`）

```typescript
interface InstructionData {
  methodId: string;
  content: string;
  priority: string;
  type: string;
  targetType: string;
  transitionId?: string | null;
  taskNumber?: number | null;
  instruction_status: number;   // InstructionStatus.UNSENT(0) / SENT(1)
  isNewlyAdded?: boolean;
}
```

### InstructionSaveItem（`@/types/taskRegistration`）

```typescript
interface InstructionSaveItem {
  methodId: string;
  content: string;
  priority: string;
  type: string;
  targetType: string;
  transitionId: string | null;
  taskNumber: number | null;
}
```

---

## 10. エラーハンドリング

### エラーメッセージ一覧

| エラー条件 | i18nキー |
|-----------|---------|
| 未送信指示が0件 | `taskRegistration.messages.requireInstruction` |
| チェックされたタスクが0件 | `taskRegistration.messages.selectMethods` |
| MAIML未登録 | `taskRegistration.messages.maimlNotRegistered` |
| 初回保存時に全タスク未チェック | `taskRegistration.messages.selectAllMethodsFirst` |
| メソッドID未設定 | `taskRegistration.messages.selectAllMethods` |
| 試行回数が範囲外（1〜999）| `taskRegistration.messages.invalidTrialCount` |
| チェックアウト中 | `taskRegistration.messages.checkedOut` |
| ワーカー連携済みタスクの順序変更 | `taskRegistration.messages.cannotChangeOrder` |
| 作業順序が範囲外 | `taskRegistration.messages.invalidOrder`（`{max}` プレースホルダー）|
| 保存失敗 | `taskRegistration.messages.saveFailed` |
| データ取得失敗 | `taskRegistration.messages.fetchFailed` |
| 指示追加成功 | `instructionRegistration.messages.added` |
| MAIMLエラー警告バナー | `taskRegistration.maimlErrorWarning` |

### ローディング状態

**メソッド読み込み中**（`loadingMethods === true`）:
```tsx
<Spin size="large" tip={t('taskRegistration.loading')}>
  <div style={{ minHeight: 100 }} />
</Spin>
```

**メソッドが0件**（`availableMethods.length === 0`）:
```tsx
<Text type="secondary">{t('taskRegistration.noMethods')}</Text>
```

**保存中**: 保存ボタンに `loading={isSaving}` を設定

---

## 11. API連携

### GET タスク登録データ取得

**エンドポイント**: `GET /api/v1/experiment-admin/project/:projectName/task-registration`  
**フロントエンド呼び出し**: `getTaskRegistration(projectId)`

**レスポンス**:
```typescript
{
  isMaimlRegistered: boolean;
  tasks: Array<{
    methodId: string;
    experimentCondition: string;  // "0" or "1"（文字列）→ UI内で Number() 変換
    trialCount: number;
    experimentOrder: number;
    workerLinkedFlg: boolean;
  }>;
}
```

### POST タスク登録保存

**エンドポイント**: `POST /api/v1/experiment-admin/project/:projectName/task-registration`  
**フロントエンド呼び出し**: `saveTaskRegistration(projectId, requestData)`

**リクエスト**:
```typescript
{
  tasks: Array<{
    methodId: string;
    experimentCondition: number;  // 0 or 1
    trialCount: number;
    experimentOrder: number;      // workerLinkedFlg=trueの最大order + 連番
  }>;
  instructions?: InstructionSaveItem[];
}
```

**レスポンス**: `{ message: string }` ※メッセージはUIには使用しない

### GET 指示データ取得

**エンドポイント**: `GET /api/v1/experiment-admin/project/:projectName/instructions`  
**フロントエンド呼び出し**: `getInstructions(projectId)`

---

## 12. 依存パッケージ・モジュール

### パッケージ
- `antd`: Table, Button, Select, Input, Space, Typography, theme, Spin, Empty, App, Alert
- `@ant-design/icons`: SaveOutlined, HolderOutlined, PlusOutlined, ExclamationCircleOutlined
- `@dnd-kit/core`: DndContext, sensors（PointerSensor, KeyboardSensor）, DragEndEvent
- `@dnd-kit/sortable`: SortableContext, useSortable, arrayMove, verticalListSortingStrategy
- `@dnd-kit/utilities`: CSS

### 型定義ファイル
- `@/types/taskRegistration`: TaskDetail, MethodInfo, TaskRegistrationData, InstructionSaveItem
- `@/types/instructionRegistration`: InstructionData, TransitionInfo
- `@/types/experimentPlan`: TemplateDef, TemplateField

### Context
- `LanguageContext` (`useLanguage`): 多言語対応
- `ProjectMaimlContext` (`useProjectMaiml`): MAIMLデータ取得

### サービス・ユーティリティ
- `@/services/projectApiService`: getTaskRegistration, saveTaskRegistration, saveInstruction, getInstructions
- `@/utils/selectUtils`: createRangeOptions
- `@/constants/codeMaster`: InstructionStatus

---

## 13. 特記事項

### ワーカー連携済みタスクの扱い

| 要素 | 挙動 |
|------|------|
| チェックボックス | `disabled`（グレーアウト）|
| ドラッグハンドル | カーソル `not-allowed`、opacity 0.5 |
| 試行回数・指示追加ボタン | `disabled` |
| 作業順序 | 現在位置のみ選択可能 |
| 行スタイル | `backgroundColor: '#f5f5f5'`, `opacity: 0.7` |
| 保存時 | APIに送信しない |

### 初回保存時の制約

- DBにデータがない場合、全メソッドのチェックが必須
- 一部のみチェックして保存することは不可

### 実験条件カラムについて

現在は **コメントアウト済み（未実装）**。`useCodeMaster('experiment_condition')` も同様にコメントアウト。

### 保存順序の計算

```typescript
const maxExistingOrder = taskDetails
  .filter(t => t.workerLinkedFlg)
  .reduce((max, t) => Math.max(max, t.experimentOrder || 0), 0);
// 新規タスクの order = maxExistingOrder + index + 1
```

---

## 14. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 3.0.0 | 2026-08-20 | ソースに沿って全面改訂。Props追加（isProjectCompleted/isEditable）、「指示追加」ボタン → ExperimentPlanDialogに変更、実験条件カラム現在未実装を明記、非活性判定3関数化、API呼び出し引数をprojectIdに修正、保存バリデーション順序修正、子コンポーネント更新 |
| 2.0 | 2026-04-24 | maimlHasErrors prop 追加、MAIMLエラー時の操作ブロック機能追加 |
| 1.0 | 2026-03-11 | 実装ベースで仕様書を新規作成 |

---

## 15. 関連ドキュメント

- [プロジェクト管理画面](ui_project_management.md)
- [指示登録タブ](ui_instruction_registration_tab.md)
- [指示編集ダイアログ](ui_instruction_edit_dialog.md)
- [実験計画ダイアログ](ui_experiment_plan_dialog.md)

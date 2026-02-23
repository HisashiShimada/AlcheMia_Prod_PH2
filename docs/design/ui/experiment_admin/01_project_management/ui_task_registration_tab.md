# TaskRegistrationTab - タスク登録タブ

## 1. 概要

### 1.1 コンポーネントの目的
プロジェクト管理画面内のタスク登録タブ。メソッドの実行順序、実験条件、試行回数を設定する機能を提供します。ドラッグ&ドロップによる順序変更に対応しています。

### 1.2 使用場面
- プロジェクト管理画面の「タスク登録」タブで使用
- メソッドの実行順序と試行回数を設定

### 1.3 アクセス権限
- **必須ロール**: experiment_admin
- **認証**: JWT + Session Hybrid認証

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌──────────────────────────────────────────────────────┐
│ ドラッグ&ドロップで順序を変更できます [💾 保存]    │
├──────────────────────────────────────────────────────┤
│ ┌────┬─────┬────────────┬──────────┬────────┐   │
│ │☰  │順序 │メソッド    │実験条件  │試行回数│   │
│ ├────┼─────┼────────────┼──────────┼────────┤   │
│ │☰  │ [1]▼│サンプル準備│[同一]▼   │ [1]    │   │
│ │    │     │実験サンプル│          │        │   │
│ ├────┼─────┼────────────┼──────────┼────────┤   │
│ │☰  │ [2]▼│測定実行    │[異なる]▼ │ [3]    │   │
│ │    │     │測定機器に  │          │        │   │
│ ├────┼─────┼────────────┼──────────┼────────┤   │
│ │☰  │ [3]▼│データ分析  │[同一]▼   │ [1]    │   │
│ │    │     │データの分析│          │        │   │
│ └────┴─────┴────────────┴──────────┴────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## 3. 機能仕様

### 3.1 Props定義

```typescript
interface TaskRegistrationTabProps {
  projectId: string;                              // プロジェクトID
  projectName: string;                            // プロジェクト名
  onTasksChange?: (tasks: TaskDetail[]) => void;  // タスク変更時コールバック
}
```

### 3.2 State管理

```typescript
const [availableMethods, setAvailableMethods] = useState<MethodInfo[]>([]);
const [loadingMethods, setLoadingMethods] = useState<boolean>(false);
const [taskDetails, setTaskDetails] = useState<TaskDetail[]>([]);
const [isSaving, setIsSaving] = useState<boolean>(false);
```

### 3.3 主要機能

#### 3.3.1 タスク一覧表示（テーブル形式）

**テーブルカラム:**
| カラム | 説明 | 幅 | 編集可能 |
|--------|------|-----|---------|
| ドラッグハンドル | ☰アイコン（ドラッグ&ドロップ用） | 50px | - |
| 作業順序 | 順序選択（Select） | 120px | ✅ |
| メソッド | メソッド名と説明 | 可変 | ❌ |
| 実験条件 | 同一/異なる（Select） | 200px | ✅ |
| 試行回数 | 1-999の数値入力 | 120px | ✅ |

#### 3.3.2 ドラッグ&ドロップ機能

**実装ライブラリ:**
- @dnd-kit/core
- @dnd-kit/sortable
- @dnd-kit/utilities

**センサー設定:**
```typescript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,  // 8px移動で開始
    },
  }),
  useSensor(KeyboardSensor)
);
```

**ドラッグ終了時の処理:**
```typescript
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;

  if (over && active.id !== over.id) {
    setTaskDetails((items) => {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }
};
```

**ドラッグ中のスタイル:**
- z-index: 9999
- position: relative
- カーソル: grab

#### 3.3.3 作業順序の手動変更

**Select コンポーネント:**
```typescript
<Select
  value={index + 1}
  onChange={(value) => handleOrderChange(record.id, value)}
  size="small"
  options={Array.from({ length: taskDetails.length }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}`,
  }))}
/>
```

**処理:**
```typescript
const handleOrderChange = (taskId: number, newOrder: number) => {
  setTaskDetails((prev) => {
    const currentIndex = prev.findIndex(task => task.id === taskId);
    const newIndex = newOrder - 1;  // 0-indexed
    
    // 範囲外チェック
    if (newIndex < 0 || newIndex >= prev.length) {
      message.warning(`順序は1から${prev.length}の範囲で指定してください`);
      return prev;
    }
    
    return arrayMove(prev, currentIndex, newIndex);
  });
};
```

#### 3.3.4 実験条件の設定

**選択肢:**
| 値 | ラベル | 説明 |
|----|--------|------|
| 0 | 同一 | 全試行で同じ実験条件を使用 |
| 1 | 異なる | 各試行で異なる実験条件を使用 |

```typescript
<Select
  value={record.experimentCondition}
  onChange={(value) =>
    handleUpdateTaskDetail(record.id, 'experimentCondition', value.toString())
  }
  size="small"
>
  <Select.Option value={0}>同一</Select.Option>
  <Select.Option value={1}>異なる</Select.Option>
</Select>
```

#### 3.3.5 試行回数の設定

**Input (number型):**
```typescript
<Input
  type="number"
  value={record.trialCount}
  onChange={(e) => {
    const value = e.target.value;
    if (value === '') {
      handleUpdateTaskDetail(record.id, 'trialCount', '');
    } else {
      const num = parseInt(value, 10);
      if (!isNaN(num) && num >= 1 && num <= 999) {
        handleUpdateTaskDetail(record.id, 'trialCount', num.toString());
      }
    }
  }}
  size="small"
  min={1}
  max={999}
/>
```

**バリデーション:**
- 最小値: 1
- 最大値: 999
- 範囲外の値は拒否

**試行回数変更時の処理:**
```typescript
if (field === 'trialCount') {
  const newTrialCount = parseInt(value.toString(), 10);
  if (!isNaN(newTrialCount) && newTrialCount > 0) {
    const newOptions = Array.from({ length: newTrialCount }, (_, i) => i + 1);
    return { ...task, trialCount: newTrialCount, taskNumberOptions: newOptions };
  }
}
```

#### 3.3.6 保存機能

```typescript
const handleSave = async () => {
  // バリデーション
  const emptyMethod = taskDetails.find(task => !task.methodId);
  if (emptyMethod) {
    message.warning('すべてのメソッドを選択してください');
    return;
  }

  const invalidTrialCount = taskDetails.find(
    task => task.trialCount < 1 || task.trialCount > 999
  );
  if (invalidTrialCount) {
    message.warning('試行回数は1から999の範囲で指定してください');
    return;
  }

  setIsSaving(true);
  try {
    // LocalStorageに保存
    const dataToSave: TaskRegistrationData = {
      projectId,
      projectName,
      tasks: taskDetails,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    
    // 親コンポーネントに通知
    onTasksChange?.(taskDetails);
    
    message.success('タスク設定を保存しました');
  } catch (error) {
    message.error('タスク保存エラー');
  } finally {
    setIsSaving(false);
  }
};
```

**保存ボタン:**
- ラベル: 「保存」
- アイコン: SaveOutlined
- ローディング表示: 保存中
- 無効化条件: データ読み込み中

### 3.4 LocalStorage保存・復元

**保存キー:**
```typescript
const storageKey = `task-registration-${projectId}`;
```

**保存データ形式:**
```typescript
interface TaskRegistrationData {
  projectId: string;
  projectName: string;
  tasks: TaskDetail[];
  savedAt: string;  // ISO 8601形式
}
```

**復元タイミング:**
- コンポーネントマウント時（useEffect）
- 保存データがある場合は復元、ない場合は初期化

**初期化処理:**
```typescript
// 保存データがない場合、初期化
const initialTasks: TaskDetail[] = mockMethods.map((method, index) => ({
  id: index + 1,
  methodId: method.id,
  experimentCondition: 0,   // デフォルト: 同一
  trialCount: 1,            // デフォルト: 1回
  taskNumberOptions: [1],
}));

setTaskDetails(initialTasks);
```

### 3.5 メソッド情報取得

```typescript
useEffect(() => {
  const fetchMethods = async () => {
    setLoadingMethods(true);
    
    try {
      // TODO: 実際のAPI実装時に置き換え
      const mockMethods: MethodInfo[] = [...];
      
      setAvailableMethods(mockMethods);
      
      // LocalStorageから復元
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsed: TaskRegistrationData = JSON.parse(savedData);
        if (parsed.projectId === projectId) {
          setTaskDetails(parsed.tasks);
          message.success('保存されたタスク設定を復元しました');
          onTasksChange?.(parsed.tasks);
          return;
        }
      }
      
      // 初期化処理
      const initialTasks: TaskDetail[] = mockMethods.map(...);
      setTaskDetails(initialTasks);
      onTasksChange?.(initialTasks);
    } catch (error) {
      message.error('メソッド取得エラー');
    } finally {
      setLoadingMethods(false);
    }
  };

  fetchMethods();
}, [projectId, storageKey, onTasksChange]);
```

---

## 4. データ型定義

### 4.1 TaskDetail型

```typescript
interface TaskDetail {
  id: number;
  methodId: string;                  // メソッドID
  experimentCondition: 0 | 1;        // 実験条件（0: 同一, 1: 異なる）
  trialCount: number;                // 試行回数（1-999）
  taskNumberOptions: number[];       // タスク番号の選択肢（試行回数に応じて生成）
}
```

### 4.2 MethodInfo型

```typescript
interface MethodInfo {
  id: string;
  name: string;
  displayName: string;
  description: string;
}
```

### 4.3 TaskRegistrationData型

```typescript
interface TaskRegistrationData {
  projectId: string;
  projectName: string;
  tasks: TaskDetail[];
  savedAt: string;
}
```

---

## 5. API連携

### 5.1 メソッド情報取得

**エンドポイント:** TODO（未実装）
**メソッド:** GET
**レスポンス:**
```typescript
{
  methods: MethodInfo[];
}
```

---

## 6. UI/UXポリシー準拠

### 6.1 Ant Designコンポーネント使用

| 用途 | コンポーネント | Props |
|------|---------------|-------|
| テーブル | Table | components, dataSource, size="small" |
| セレクト | Select | value, onChange, size="small" |
| 入力 | Input | type="number", min, max |
| ボタン | Button | type, icon, loading |
| スピナー | Spin | size, tip |
| 空状態 | Empty | description, image |

### 6.2 ドラッグ&ドロップ

| ライブラリ | 用途 |
|-----------|------|
| @dnd-kit/core | DndContext, sensors |
| @dnd-kit/sortable | SortableContext, useSortable |
| @dnd-kit/utilities | CSS.Transform |

---

## 7. エラーハンドリング

### 7.1 エラーケース

| エラーケース | 原因 | 対処方法 |
|-------------|------|----------|
| メソッド取得失敗 | APIエラー | エラーメッセージ表示 |
| メソッド未選択 | 空のメソッド | 警告メッセージ表示 |
| 試行回数が範囲外 | 1未満または999超 | 警告メッセージ表示 |
| 順序が範囲外 | 不正な順序指定 | 警告メッセージ表示 |
| LocalStorage復元失敗 | JSON解析エラー | コンソールログ出力、初期化 |

---

## 8. 実装ファイル

### 8.1 ファイルパス
```
frontend/src/components/project/TaskRegistrationTab.tsx
```

### 8.2 依存コンポーネント
- なし（単独で動作）

### 8.3 依存ライブラリ
- antd: Table, Button, Select, Input, Space, Typography, Spin, Empty, message
- @ant-design/icons: SaveOutlined, HolderOutlined
- @dnd-kit/core: DndContext, useSensor, useSensors, DragEndEvent
- @dnd-kit/sortable: SortableContext, useSortable, arrayMove
- @dnd-kit/utilities: CSS
- @/contexts/LanguageContext: useLanguage

---

## 9. API連携（2026-02-20追加）

### 9.1 タスク登録情報取得

**関数**: `projectApiService.getTaskRegistration(projectName)`

**エンドポイント**: `GET /api/v1/projects/:projectName/task-registration`

**レスポンス:**
```typescript
interface GetTaskRegistrationResponse {
  tasks: Array<{
    methodId: string;
    experimentCondition: number;
    trialCount: number;
    experimentOrder: number;
  }>;
  isCheckoutLocked: boolean;
  isMaimlRegistered: boolean;
  experimentConditionOptions: Array<{
    value: number;
    label: string;
  }>;
}
```

**使用例:**
```typescript
const data = await getTaskRegistration(projectName);
setIsCheckoutLocked(data.isCheckoutLocked);
setIsMaimlRegistered(data.isMaimlRegistered);
setExperimentConditionOptions(data.experimentConditionOptions);
setTaskDetails(data.tasks.map((task, index) => ({
  id: index + 1,
  methodId: task.methodId,
  experimentCondition: task.experimentCondition,
  trialCount: task.trialCount,
  experimentOrder: task.experimentOrder,
  taskNumberOptions: Array.from({ length: task.trialCount }, (_, i) => i + 1),
})));
```

### 9.2 タスク登録保存

**関数**: `projectApiService.saveTaskRegistration(projectName, requestData)`

**エンドポイント**: `POST /api/v1/projects/:projectName/task-registration`

**リクエスト:**
```typescript
interface SaveTaskRegistrationRequest {
  tasks: Array<{
    methodId: string;
    experimentCondition: number;
    trialCount: number;
  }>;
}
```

**レスポンス:**
```typescript
interface SaveTaskRegistrationResponse {
  success: boolean;
  message: string;
}
```

**使用例:**
```typescript
const requestData = {
  tasks: taskDetails.map((task) => ({
    methodId: task.methodId,
    experimentCondition: task.experimentCondition,
    trialCount: task.trialCount,
  })),
};

const response = await saveTaskRegistration(projectName, requestData);
message.success(response.message || 'タスク設定を保存しました');
```

---

## 10. 実装完了状況（2026-02-20更新）

### 10.1 実装済み機能
- [x] 初期表示（API連携）
- [x] タスク一覧表示（テーブル形式）
- [x] ドラッグ&ドロップによる順序変更
- [x] 作業順序の手動変更
- [x] 実験条件の設定（code_masterから動的取得）
- [x] 試行回数の設定
- [x] 保存機能（API連携）
- [x] チェックアウト状態での編集制御
- [x] MAIML未登録時の編集制御
- [x] バリデーション
- [x] エラーハンドリング

### 10.2 実装の変更点
- **メソッド表示**: メソッド名 → メソッドIDに変更（MAIMLファイルにメソッド名を設定する処理がないため）
- **データ保存**: LocalStorage → DB保存（project_task、project_task_detailテーブル）
- **実験条件**: 固定値 → code_masterテーブルから動的取得
- **編集制御**: チェックアウト状態・MAIML登録状態による保存制御を追加

### 10.3 将来の改善案
- [ ] タスクの追加・削除機能
- [ ] タスクのコピー機能
- [ ] タスクのエクスポート・インポート機能
- [ ] 一括編集機能
- [ ] プリセット機能
- [ ] メソッド名の表示（MAIML仕様変更後）

---

## 11. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|---------|--------|
| 2026-02-20 | 2.0.0 | API連携実装、仕様書大幅更新 | Cline |
| | | - メソッド名表示 → メソッドID表示に変更 | |
| | | - API連携実装（取得・保存） | |
| | | - code_masterから実験条件を動的取得 | |
| | | - チェックアウト状態・MAIML登録状態の制御追加 | |
| | | - LocalStorage保存を廃止してDB保存に変更 | |
| 2026-02-19 | 1.0.0 | 初版作成 | Cline |

---

## 12. 関連ドキュメント

- [タスク登録API仕様書](../../../api/api_project_management.md#17-タスク登録情報取得-) - API仕様
- [ProjectManagement仕様](./ui_project_management.md) - 親コンポーネント
- [プロジェクト管理API仕様書](../../../api/api_project_management.md) - API全体仕様

# タスク計画書: メソッド・タスク選択モーダルのデータ表示修正

## メタデータ
- **作成日時**: 2026-02-24 17:59
- **タスクID**: method-task-modal-data-fix
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

指示確認タブでメソッド・タスク選択モーダルを表示した際、メソッドとタスクが表示されない問題を修正します。

## 2. 目的と期待される成果

### 目的
APIから取得したメソッド・タスクデータをモーダルに正しく表示する

### 期待される成果
- [x] 問題の要因を特定（完了：データソースの不整合）
- [ ] MethodTaskSelectionModalがprops経由でmethodsデータを受け取る
- [ ] InstructionConfirmationTabからAPIデータをモーダルに渡す
- [ ] モーダルにメソッド・タスクが正しく表示される

## 3. 問題の詳細分析

### 現状の問題

**データフローの断絶:**
```
API → InstructionConfirmationTab (methods state)
              ↓ ❌ データが渡されていない
      MethodTaskSelectionModal (projectsData参照)
```

**原因:**
1. `MethodTaskSelectionModal`がモックデータ（`projectsData`）を参照している
2. `projectsData`のキーは`"project_001"`, `"project_002"`など
3. `selectedProject`に渡されるのはUUID（`"363c774a-ed92-463e-b80d-df2f5fa77d3c"`）
4. キーが一致せず`projectData`は`null`、メソッドは空配列になる

### APIレスポンス構造

```json
{
  "success": true,
  "data": {
    "project_id": "363c774a-ed92-463e-b80d-df2f5fa77d3c",
    "project_name": "TestProjectOmori3",
    "methods": [
      {
        "method_id": "TestMethodOmori3001",
        "method_name": "大森テスト用メソッド31",
        "experiment_order": "1",
        "tasks": [
          {
            "task_id": "1",
            "task_no": "1",
            "task_status": "in_progress",
            "progress_rate": "50.0000000000000000"
          }
        ]
      }
    ]
  }
}
```

## 4. 実装ステップ

### Phase 1: MethodTaskSelectionModal型定義修正
- [ ] `MethodTaskSelectionModalProps`に`methods: Method[]`を追加
- [ ] 型定義の整合性を確認

### Phase 2: MethodTaskSelectionModalデータ取得ロジック修正
- [ ] `projectsData`への依存を削除
- [ ] `props.methods`からデータを取得するよう変更
- [ ] `allTasks`の取得ロジックを修正（methodsがpropsから来る前提）

### Phase 3: InstructionConfirmationTabのモーダル呼び出し修正
- [ ] モーダル呼び出し部分に`methods={methods}`を追加
- [ ] propsが正しく渡されることを確認

### Phase 4: 動作確認
- [ ] 開発サーバー起動
- [ ] 指示確認タブに遷移
- [ ] 選択ボタンを押下してモーダルを表示
- [ ] メソッドタブが表示されることを確認
- [ ] 各メソッドのタスクが表示されることを確認

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/components/ExperimentWorker/MethodTaskSelectionModal.tsx`
   - Props型定義の追加
   - データ取得ロジックの変更
   
2. `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx`
   - モーダル呼び出し部分の修正

### 影響を受ける機能
- 指示確認タブのメソッド・タスク選択モーダル
- （他のタブでこのモーダルを使用している場合も影響を受ける）

## 6. 技術的詳細

### 修正前のコード

```typescript
// MethodTaskSelectionModal.tsx（現状）
interface MethodTaskSelectionModalProps {
  open: boolean;
  onClose: () => void;
  selectedProject: string;
  selectedMethodId: string | null;
  selectedTaskId: string | null;
  onSelect: (methodId: string, taskId: string) => void;
  // methods が無い ❌
}

// projectsDataを参照（モックデータ）
const projectData = selectedProject ? projectsData[selectedProject] : null;
const methods = useMemo<Method[]>(() => {
  return projectData?.methods || [];
}, [projectData]);
```

### 修正後のコード

```typescript
// MethodTaskSelectionModal.tsx（修正後）
interface MethodTaskSelectionModalProps {
  open: boolean;
  onClose: () => void;
  selectedProject: string;
  selectedMethodId: string | null;
  selectedTaskId: string | null;
  onSelect: (methodId: string, taskId: string) => void;
  methods: Method[];  // ← 追加 ✅
}

// propsからmethodsを取得
const methods = useMemo<Method[]>(() => {
  return props.methods || [];
}, [props.methods]);

// projectData削除、allTasksの取得もmethodsから直接行う
const allTasks = useMemo(() => {
  if (!activeMethodId || !methods) return [];
  
  const method = methods.find((m: Method) => m.methodId === activeMethodId);
  if (!method || !method.tasks) return [];
  
  return method.tasks.map((task: Task) => ({
    ...task,
    projectId: selectedProject,
    methodId: method.methodId,
    methodName: method.methodName,
  }));
}, [methods, selectedProject, activeMethodId]);
```

```typescript
// InstructionConfirmationTab.tsx（修正後）
<MethodTaskSelectionModal
  open={isModalVisible}
  onClose={() => setIsModalVisible(false)}
  selectedProject={selectedProject}
  selectedMethodId={selectedMethodId}
  selectedTaskId={selectedTaskId}
  onSelect={(methodId: string, taskId: string) => {
    onSelectMethod(methodId);
    onSelectTask(taskId);
  }}
  methods={methods}  // ← 追加 ✅
/>
```

## 7. データ構造の確認

### InstructionConfirmationTabで管理しているmethods

```typescript
const methodsData: Method[] = apiData.methods.map((method: WorkerMethod) => ({
  methodId: method.method_id,
  methodName: method.method_name,
  experimentOrder: method.experiment_order,
  description: '',
  category: 'experiment',
  transitions: [],
}));
```

### MethodTaskSelectionModalが期待するMethod型

```typescript
interface Method {
  methodId: string;
  methodName: string;
  tasks: Task[];
}
```

**注意点:**
- `InstructionConfirmationTab`の`methods`には`tasks`が含まれていない
- `tasks`は別のstate（`tasks`）で管理されている
- モーダルで使用するために、methodsにtasksを含める必要がある

**追加修正が必要:**
- `InstructionConfirmationTab`で`methods`を生成する際に、各メソッドに対応する`tasks`を含める

## 8. 修正内容の追加（重要）

### Phase 1.5: InstructionConfirmationTabのmethods生成ロジック修正

```typescript
// 修正前
const methodsData: Method[] = apiData.methods.map((method: WorkerMethod) => ({
  methodId: method.method_id,
  methodName: method.method_name,
  experimentOrder: method.experiment_order,
  description: '',
  category: 'experiment',
  transitions: [],
}));

// 修正後
const methodsData: Method[] = apiData.methods.map((method: WorkerMethod) => ({
  methodId: method.method_id,
  methodName: method.method_name,
  experimentOrder: method.experiment_order,
  description: '',
  category: 'experiment',
  transitions: [],
  tasks: method.tasks.map((task: WorkerTask) => ({
    taskId: `${apiData.project_id}-${method.method_id}-${task.task_no}`,
    taskNo: task.task_no.toString(),
    taskName: task.task_no.toString(),
    methodId: method.method_id,
    methodName: method.method_name,
    status: task.task_status as Task['status'],
    assignedUserId: task.experiment_user_id,
    assignedUserName: task.experiment_user_name,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    progress: task.progress,
    projectId: apiData.project_id,
    sampleNumber: '',
    notes: '',
    progressRate: task.progress,
    transitionStatuses: [],
    progressReport: '',
    recordNumber: '',
  }))
}));
```

## 9. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| APIデータ構造の変更 | 高 | 低 | 型定義で変更を検出、エラーハンドリング実装 |
| 他のタブでモーダルを使用している場合の影響 | 中 | 中 | 全使用箇所を検索して修正 |
| tasksがundefinedの場合のエラー | 中 | 低 | オプショナルチェーンとデフォルト値で対応 |

## 10. テスト計画

### 手動テスト
- [ ] プロジェクト選択
- [ ] 指示確認タブに遷移
- [ ] 選択ボタンを押下
- [ ] モーダルが表示される
- [ ] メソッドタブが3つ表示される
- [ ] 各メソッドのタスク一覧が表示される
- [ ] タスクのステータス・進捗率が正しく表示される
- [ ] タスクを選択して決定ボタンを押下
- [ ] 選択したメソッド・タスクが反映される

### 確認ポイント
- [ ] メソッドタブに「大森テスト用メソッド31」「大森テスト用メソッド32」「大森テスト用メソッド33」が表示
- [ ] 各メソッドのタスク数が正しい（1個、2個、3個）
- [ ] タスクのステータスが正しく表示される（作業中、完了）
- [ ] 進捗率が正しく表示される（50%、0%、100%など）

## 11. ロールバック計画

問題が発生した場合は、変更前のコードに戻す。
- MethodTaskSelectionModal.tsx: propsからmethodsを削除、projectsData参照に戻す
- InstructionConfirmationTab.tsx: methods propsを削除

## 12. 関連ドキュメント

- [ui_method_task_selection_modal.md](../design/ui/ui_method_task_selection_modal.md) - UI設計書
- `.clinerules/development/typescript.md` - TypeScript型定義規約
- `.clinerules/core/workflow.md` - タスク実行ワークフロー

## 13. 承認記録

- **計画書提示日時**: 2026-02-24 17:59
- **承認日時**: 2026-02-24 17:59
- **承認者コメント**: 承認。Act Modeで実装開始。

## 14. 実施記録

### 実施日時
開始: 2026-02-24 18:00
完了: 2026-02-24 18:04

### 計画からの変更点
1. **APIレスポンスのフィールド名の差異に対応**
   - `assign_user_id` → `experiment_user_id`
   - `assign_user_name` → `experiment_user_name`
   - これらのフィールドがAPIレスポンスに含まれていたため、変換ロジックを調整

2. **型の互換性対応**
   - `null`を`undefined`に変換（TypeScript型定義に合わせる）
   - `assignedUserId`と`assignedUserName`をオプショナルとして扱う

### 発生した問題と解決方法

**問題1: TypeScriptエラー - assignedUserIdの型不一致**
- **症状**: `null`型を`string | undefined`型に割り当てられない
- **原因**: APIから`null`が返ってくるが、型定義は`undefined`を期待
- **解決**: `task.experiment_user_id || undefined`に変更

**問題2: APIレスポンスのフィールド名の差異**
- **症状**: `assign_user_id`がWorkerTask型に存在しない
- **原因**: 実際のAPIレスポンスは`experiment_user_id`を使用
- **解決**: 正しいフィールド名に修正

### 最終的な成果物
- [x] MethodTaskSelectionModal.tsx修正
  - Props型定義に`methods: Method[]`を追加
  - `projectsData`への依存を削除
  - propsからmethodsを取得するよう変更
  - 不要なimport（projectsData）を削除
  
- [x] InstructionConfirmationTab.tsx修正
  - methods生成ロジックでtasksを含めるよう変更
  - APIレスポンスの正しいフィールド名を使用
  - モーダル呼び出し時に`methods={methods}`を追加
  
- [ ] 動作確認完了（次のステップ）

## 15. 振り返り

### うまくいった点
（作業完了後に記入）

### 改善が必要な点
（作業完了後に記入）

### 学んだこと
（作業完了後に記入）

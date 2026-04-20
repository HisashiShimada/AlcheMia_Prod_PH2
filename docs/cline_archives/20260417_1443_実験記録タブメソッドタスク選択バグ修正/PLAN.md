# タスク計画書: 実験記録タブ メソッド・タスク選択モーダルにタスクが表示されないバグ修正

## メタデータ
- **作成日時**: 2026-04-17 14:43
- **タスクID**: fix-experiment-record-tab-method-task-modal
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

実験作業者メニューの「実験記録タブ」において、メソッド・タスク欄の「選択」ボタンを押下すると表示されるメソッド・タスク選択モーダルで、タスク一覧が表示されないバグを修正する。

## 2. 目的と期待される成果

### 目的
`ExperimentRecordTab.tsx` のAPIレスポンス変換処理に `tasks` が含まれていないため、モーダルに渡される `methods` 配列の各メソッドに `tasks` が存在せず、モーダル内で常に空のタスク一覧が表示される問題を解消する。

### 期待される成果
- [ ] メソッド・タスク選択モーダルを開いた際に、各メソッドのタスク一覧が正常に表示される
- [ ] タスク選択後に「決定」ボタンを押すと、選択メソッド・タスクが反映される

## 3. 根本原因

### 問題箇所
`frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` の L167〜174

```typescript
// ❌ 現状: tasks が含まれていない
const methodsData: Method[] = apiData.methods.map((method: WorkerMethod) => ({
  methodId: method.method_id,
  methodName: method.method_name,
  experimentOrder: method.experiment_order,
  description: '',
  category: 'experiment',
  transitions: [],
  // tasks が存在しない
}));
```

### 問題の連鎖
1. `getWorkerTasks()` APIは `methods[].tasks[]` を正常にレスポンスする
2. `ExperimentRecordTab.tsx` でのマッピング時に `tasks` を含め忘れている
3. `methods` props として `MethodTaskSelectionModal` に渡される
4. モーダル内で `method.tasks` が `undefined` → `allTasks` が空配列になる
5. テーブルにタスクが表示されない

### 正常動作している実装との比較
`InstructionConfirmationTab.tsx` は同じAPIを呼び出し、`tasks` を正しくマッピングしており正常動作している。

## 4. 実装ステップ

### Phase 1: バグ修正
- [ ] `ExperimentRecordTab.tsx` の `methodsData` マッピング処理に `tasks` を追加する（`InstructionConfirmationTab.tsx` と同様の実装）

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` - `methodsData` 変換処理に `tasks` マッピングを追加（L167〜174付近）

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- 実験記録タブのメソッド・タスク選択モーダル（修正対象）
- 指示確認タブのメソッド・タスク選択モーダル（影響なし・既に正常動作）

## 6. 技術的詳細

### 修正内容

```typescript
// ✅ 修正後: tasks を含める
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
    assignedUserId: task.experiment_user_id || undefined,
    assignedUserName: task.experiment_user_name || undefined,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    projectId: apiData.project_id,
    sampleNumber: '',
    notes: '',
    progressRate: parseFloat(task.progress_rate),
    transitionStatuses: [],
    progressReport: '',
    recordNumber: '',
  })),
}));
```

### 参考実装
`InstructionConfirmationTab.tsx` L138〜165 の `methodsData` 変換処理を参考にする。

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 修正後も別の不具合が出る | 低 | 低 | 動作確認でモーダルの開閉・選択・決定を手動検証する |

## 8. テスト計画

### 手動テスト
- [ ] 実験作業者でログイン
- [ ] 実験記録タブを開く
- [ ] プロジェクトを選択する
- [ ] メソッド・タスク欄の「選択」ボタンを押下
- [ ] メソッド・タスク選択モーダルにタスクが表示されることを確認
- [ ] タスクを選択して「決定」ボタンを押すと選択状態に反映されることを確認

## 9. 承認記録

- **計画書提示日時**: 2026-04-17 14:43
- **承認日時**: 2026-04-17 15:00
- **承認者コメント**: ACT MODEへの切り替えにて承認

## 10. 実施記録

### 実施日時
開始: 2026-04-17 15:01
完了: 2026-04-17 15:01

### 計画からの変更点
（なし）

### 発生した問題と解決方法
（なし）

### 最終的な成果物
- [x] `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` の修正完了

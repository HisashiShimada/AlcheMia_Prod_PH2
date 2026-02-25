# タスク計画書: 指示送信時のタスク作成処理削除

## メタデータ
- **作成日時**: 2026-02-24 17:12
- **タスクID**: 指示送信タスク作成処理削除
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

プロジェクト管理画面の指示送信タブにて指示送信ボタン押下時の処理でタスクを作成しているが、タスク自体は別のタイミング（タスク登録タブ）で作成するため、`sendInstructions`内部でタスクを作成する必要はない。

フロントエンド側で送っているパラメータ（tasks配列）も含めて、backendのタスク作成処理を削除する。

## 2. 目的と期待される成果

### 目的
- 指示送信処理とタスク作成処理の責務を分離する
- タスクは「タスク登録タブ」で別途管理されるため、指示送信時の重複作成を防ぐ

### 期待される成果
- [x] 指示送信API（sendInstructions）からタスク作成・タスク詳細作成のロジックが削除される
- [x] フロントエンド側からtasks配列パラメータが送信されなくなる
- [x] SendInstructionsRequest型定義からtasksフィールドが削除される
- [x] 指示ステータス更新とプロジェクトステータス更新のみが実行される

## 3. 実装ステップ

### Phase 1: Backend - API型定義の修正
- [x] `backend/src/types/api.ts`のSendInstructionsRequest型からtasksフィールドを削除
- [x] TaskInput型の使用箇所を確認（他で使われていなければ削除検討）

### Phase 2: Backend - Service層の修正
- [x] `backend/src/services/projectInstructionService.ts`のsendInstructions関数を修正
  - [x] タスク（project_task）のUPSERT処理を削除
  - [x] タスク詳細（project_task_detail）の作成処理を削除
  - [x] registeredTasksパラメータの使用箇所を削除
  - [x] 不要なimport文を削除
  - [x] トランザクション処理は維持（指示ステータス更新 + プロジェクトステータス更新）

### Phase 3: Backend - Controller層の修正
- [x] `backend/src/controllers/projectInstructionController.ts`のsendInstructions関数を確認
- [x] requestBodyの型がSendInstructionsRequestであることを確認

### Phase 4: Frontend - 指示送信処理の修正
- [x] `frontend/src/components/project/InstructionRegistrationTab.tsx`のhandleSubmitInstructions関数を修正
  - [x] taskInputs配列の生成処理を削除
  - [x] sendInstructions API呼び出し時のtasksパラメータを削除
  - [x] registeredTasksのチェックロジックを削除（タスク登録有無の確認は不要）
  - [x] 成功メッセージの修正（タスク作成件数の表示を削除）

### Phase 5: 動作確認
- [x] TypeScriptコンパイルエラーがないことを確認
- [x] API型定義の整合性を確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/types/api.ts` - SendInstructionsRequest型定義の修正
2. `backend/src/services/projectInstructionService.ts` - タスク作成処理の削除
3. `frontend/src/components/project/InstructionRegistrationTab.tsx` - tasks パラメータ削除

### 影響を受ける機能
- **指示送信機能**: タスク作成処理が削除されるが、指示ステータス更新とプロジェクトステータス更新は継続
- **タスク登録機能**: 影響なし（別途タスク登録タブで管理）

## 5. 技術的詳細

### 削除する処理（backend）
```typescript
// 2. タスク（project_task）をUPSERT
for (const task of request.tasks) {
  // ... UPSERT処理
}

// 3. タスク詳細（project_task_detail）を作成
const taskDetails: ProjectTaskDetail[] = [];
// ... タスク詳細作成処理
await projectTaskDetailRepository.bulkInsert(taskDetails);
```

### 残す処理（backend）
```typescript
// 1. 未送信指示を送信済に更新
const sentCount = await projectInstructionRepository.bulkUpdateStatus(
  organizationId,
  projectId,
  userId
);

// 4. プロジェクトステータスを0→1に更新
const updatedProjectData: Project = {
  ...existingProject,
  project_status: 1,
  update_user_id: userId,
  update_at: new Date()
};
await projectRepository.update(updatedProjectData);
```

### 削除するフロントエンド処理
```typescript
// タスク登録情報をTaskInput形式に変換
const taskInputs: TaskInput[] = registeredTasks.map((task) => ({
  methodId: task.methodId,
  experimentOrder: task.experimentOrder,
  experimentCondition: task.experimentCondition,
  attemptsCount: task.trialCount,
}));

// API呼び出し時
await sendInstructions(projectName, {
  tasks: taskInputs, // この行を削除
});
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| タスクが事前に登録されていない場合の動作 | 中 | 低 | タスク登録タブで事前にタスクを登録する運用を徹底 |
| プロジェクトステータスが1に更新されるタイミング | 低 | 低 | 指示送信時にステータスを1（タスク実行待ち）に更新する仕様を維持 |

## 7. テスト計画

### ユニットテスト
- [ ] sendInstructions関数のテストを更新（タスク作成処理の検証を削除）

### 統合テスト
- [ ] 指示送信APIの動作確認（ステータス更新のみ）

### 手動テスト
- [ ] プロジェクト管理画面で指示送信ボタンを押下
- [ ] 指示ステータスが送信済に更新されることを確認
- [ ] プロジェクトステータスが1に更新されることを確認
- [ ] タスクが重複作成されないことを確認

## 8. ロールバック計画

変更が少ないため、Gitで元のコミットに戻すことで対応可能。

## 9. 関連ドキュメント

- `backend/src/services/projectInstructionService.ts` - 指示送信サービス
- `backend/src/types/api.ts` - API型定義
- `frontend/src/components/project/InstructionRegistrationTab.tsx` - 指示登録タブ

## 10. 承認記録

- **計画書提示日時**: 2026-02-24 17:12
- **承認日時**: （承認待ち）
- **承認者コメント**: （未記入）

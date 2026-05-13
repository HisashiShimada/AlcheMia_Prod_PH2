# Phase 5: フロントエンド接続 - 引継ぎ資料

## 現在の状況（2026-02-24 09:33）

### 完了済み作業（Phase 0-4）

- ✅ **Phase 0**: DBマイグレーション完了
- ✅ **Phase 1**: 既存コード削除完了（該当ファイルは存在せず）
- ✅ **Phase 2**: Repository層実装完了（DB操作規約準拠）
- ✅ **Phase 3**: Service/Controller層実装完了
- ✅ **Phase 4**: ルート定義完了（5つのAPIエンドポイント追加）

### バックエンドAPI（実装済み）

以下の5つのAPIエンドポイントが実装され、利用可能な状態です：

1. **タスク登録状況取得**
   - `GET /api/v1/projects/:projectName/instructions/status`
   - ボタン活性制御用

2. **指示保存（未送信）**
   - `POST /api/v1/projects/:projectName/instructions`

3. **指示更新（未送信のみ）**
   - `PUT /api/v1/projects/:projectName/instructions/:instructionId`

4. **指示削除（未送信のみ）**
   - `DELETE /api/v1/projects/:projectName/instructions/:instructionId`

5. **未送信指示を一括送信**
   - `POST /api/v1/projects/:projectName/instructions/send`

## Phase 5: フロントエンド接続（未完了）

### 作業内容

#### 5-1. projectApiService.tsにAPI関数追加

**ファイル**: `frontend/src/services/projectApiService.ts`

以下の5つのAPI関数を追加してください：

```typescript
/**
 * タスク登録状況を取得（ボタン活性制御用）
 */
export async function getTaskRegistrationStatus(
  projectName: string
): Promise<TaskRegistrationStatusResponse> {
  const response = await apiClient.get<ApiResponse<TaskRegistrationStatusResponse>>(
    `/projects/${projectName}/instructions/status`
  );
  return response.data.data;
}

/**
 * 指示を保存（未送信）
 */
export async function saveInstruction(
  projectName: string,
  request: SaveInstructionRequest
): Promise<SaveInstructionResponse> {
  const response = await apiClient.post<ApiResponse<SaveInstructionResponse>>(
    `/projects/${projectName}/instructions`,
    request
  );
  return response.data.data;
}

/**
 * 指示を更新（未送信のみ）
 */
export async function updateInstruction(
  projectName: string,
  instructionId: string,
  request: UpdateInstructionRequest
): Promise<UpdateInstructionResponse> {
  const response = await apiClient.put<ApiResponse<UpdateInstructionResponse>>(
    `/projects/${projectName}/instructions/${instructionId}`,
    request
  );
  return response.data.data;
}

/**
 * 指示を削除（未送信のみ）
 */
export async function deleteInstruction(
  projectName: string,
  instructionId: string
): Promise<DeleteInstructionResponse> {
  const response = await apiClient.delete<ApiResponse<DeleteInstructionResponse>>(
    `/projects/${projectName}/instructions/${instructionId}`
  );
  return response.data.data;
}

/**
 * 未送信指示を一括送信
 */
export async function sendInstructions(
  projectName: string,
  request: SendInstructionsRequest
): Promise<SendInstructionsResponse> {
  const response = await apiClient.post<ApiResponse<SendInstructionsResponse>>(
    `/projects/${projectName}/instructions/send`,
    request
  );
  return response.data.data;
}
```

**必要な型定義のインポート:**
```typescript
import {
  TaskRegistrationStatusResponse,
  SaveInstructionRequest,
  SaveInstructionResponse,
  UpdateInstructionRequest,
  UpdateInstructionResponse,
  DeleteInstructionResponse,
  SendInstructionsRequest,
  SendInstructionsResponse
} from '../types/api';
```

**注意事項:**
- バックエンドの型定義（`backend/src/types/api.ts`）と同じ型をフロントエンドにも定義する必要があります
- `frontend/src/types/api.ts`に型定義を追加してください

#### 5-2. InstructionRegistrationTab.tsxのAPI接続

**ファイル**: `frontend/src/components/project/InstructionRegistrationTab.tsx`

**実装箇所:**

1. **初期表示時にタスク登録状況を取得**
```typescript
useEffect(() => {
  const fetchStatus = async () => {
    try {
      const status = await getTaskRegistrationStatus(projectName);
      
      // ボタンの活性/非活性を制御
      setHasRegisteredTasks(status.hasRegisteredTasks);
      setCanSendInstructions(status.canSendInstructions);
      
      if (!status.hasRegisteredTasks) {
        message.warning('タスクが登録されていません。タスク登録タブでタスクを登録してください。');
      }
    } catch (error) {
      console.error('タスク登録状況の取得に失敗しました:', error);
      message.error('タスク登録状況の取得に失敗しました');
    }
  };
  
  fetchStatus();
}, [projectName]);
```

2. **指示送信ボタン押下時**
```typescript
const handleSendInstructions = async () => {
  try {
    // タスク登録情報を取得（既存の処理）
    const tasks = [...]; // タスク登録タブから取得したタスク情報
    
    // 指示を一括送信
    const result = await sendInstructions(projectName, { tasks });
    
    message.success(`${result.sentInstructionsCount}件の指示を送信しました`);
    
    // 送信後の処理（画面更新など）
    // ...
  } catch (error) {
    console.error('指示の送信に失敗しました:', error);
    message.error('指示の送信に失敗しました');
  }
};
```

#### 5-3. InstructionEditDialog.tsxのAPI接続

**ファイル**: `frontend/src/components/project/InstructionEditDialog.tsx`

**実装箇所:**

1. **保存ボタン押下時（新規作成）**
```typescript
const handleSave = async () => {
  try {
    const request: SaveInstructionRequest = {
      methodId: formData.methodId,
      transitionId: formData.transitionId || null,
      taskNumber: formData.taskNumber || null,
      priority: formData.priority,
      type: formData.type,
      content: formData.content
    };
    
    const result = await saveInstruction(projectName, request);
    
    message.success('指示を保存しました');
    onClose(true); // ダイアログを閉じて親コンポーネントをリフレッシュ
  } catch (error) {
    console.error('指示の保存に失敗しました:', error);
    message.error('指示の保存に失敗しました');
  }
};
```

2. **保存ボタン押下時（更新）**
```typescript
const handleUpdate = async () => {
  try {
    const request: UpdateInstructionRequest = {
      methodId: formData.methodId,
      transitionId: formData.transitionId || null,
      taskNumber: formData.taskNumber || null,
      priority: formData.priority,
      type: formData.type,
      content: formData.content
    };
    
    await updateInstruction(projectName, instructionId, request);
    
    message.success('指示を更新しました');
    onClose(true);
  } catch (error) {
    console.error('指示の更新に失敗しました:', error);
    message.error('指示の更新に失敗しました');
  }
};
```

3. **削除ボタン押下時**
```typescript
const handleDelete = async () => {
  Modal.confirm({
    title: '指示を削除しますか？',
    content: 'この操作は取り消せません。',
    okText: '削除',
    okType: 'danger',
    cancelText: 'キャンセル',
    onOk: async () => {
      try {
        await deleteInstruction(projectName, instructionId);
        message.success('指示を削除しました');
        onClose(true);
      } catch (error) {
        console.error('指示の削除に失敗しました:', error);
        message.error('指示の削除に失敗しました');
      }
    }
  });
};
```

## 実装時の注意事項

### 1. 型定義の追加

バックエンドの型定義（`backend/src/types/api.ts`）を参考に、フロントエンドにも同じ型定義を追加してください。

**追加すべき型定義:**
- `TaskRegistrationStatusResponse`
- `SaveInstructionRequest`
- `SaveInstructionResponse`
- `UpdateInstructionRequest`
- `UpdateInstructionResponse`
- `DeleteInstructionResponse`
- `SendInstructionsRequest`
- `SendInstructionsResponse`

### 2. エラーハンドリング

- ネットワークエラー、認証エラー、バリデーションエラーを適切にハンドリング
- ユーザーにわかりやすいエラーメッセージを表示

### 3. ローディング状態の管理

- API呼び出し中はローディングスピナーを表示
- ボタンの二重クリックを防止

### 4. 状態管理

- 指示送信後は画面をリフレッシュ
- タスク登録状況の変化に応じてUIを更新

## テスト計画

### 正常系テスト

1. **タスク登録状況取得**
   - タスクが登録されている場合、ボタンが活性化されることを確認
   - タスクが未登録の場合、警告メッセージが表示されることを確認

2. **指示保存**
   - 指示編集ダイアログで入力した内容が正しく保存されることを確認
   - 保存後、指示一覧が更新されることを確認

3. **指示更新**
   - 既存の指示を編集・更新できることを確認
   - 送信済の指示は更新できないことを確認

4. **指示削除**
   - 未送信の指示を削除できることを確認
   - 確認ダイアログが表示されることを確認

5. **指示一括送信**
   - 未送信の指示をすべて送信できることを確認
   - 送信後、プロジェクトステータスが更新されることを確認

### 異常系テスト

1. **ネットワークエラー**
   - API呼び出しに失敗した場合、エラーメッセージが表示されることを確認

2. **認証エラー**
   - 権限がない場合、適切なエラーメッセージが表示されることを確認

3. **バリデーションエラー**
   - 必須項目が未入力の場合、エラーメッセージが表示されることを確認

## 関連ファイル

### バックエンド（参照用）
- `backend/src/controllers/projectInstructionController.ts` - コントローラー実装
- `backend/src/services/projectInstructionService.ts` - サービス実装
- `backend/src/routes/projectRoutes.ts` - ルート定義
- `backend/src/types/api.ts` - API型定義

### フロントエンド（実装対象）
- `frontend/src/services/projectApiService.ts` - API関数追加
- `frontend/src/types/api.ts` - 型定義追加
- `frontend/src/components/project/InstructionRegistrationTab.tsx` - メイン画面
- `frontend/src/components/project/InstructionEditDialog.tsx` - 編集ダイアログ

### ドキュメント
- `docs/20260224_0820_指示送信タブバックエンド実装/PLAN.md` - タスク計画書
- `.clinerules/core/workflow.md` - ワークフロー規約（更新済み）
- `.clinerules/development/typescript.md` - TypeScript型定義規約

## 次のセッションでの実行手順

1. **規約確認**（必須）
   - `.clinerules/development/typescript.md` を確認
   - 型定義は専用ファイルに集約すること

2. **型定義追加**
   - `frontend/src/types/api.ts` に必要な型定義を追加

3. **API関数追加**
   - `frontend/src/services/projectApiService.ts` に5つの関数を追加

4. **フロントエンド接続**
   - InstructionRegistrationTab.tsxのAPI呼び出し実装
   - InstructionEditDialog.tsxのAPI呼び出し実装

5. **テスト**
   - 正常系・異常系テストを実施
   - ブラウザで動作確認

6. **完了報告**
   - PLAN.mdのPhase 5にチェックを付ける
   - attempt_completionで完了報告

## 質問・確認事項

Phase 5実装時に不明点があれば、以下を確認してください：

1. バックエンドAPIの仕様: `backend/src/controllers/projectInstructionController.ts`
2. リクエスト/レスポンス型定義: `backend/src/types/api.ts`
3. 既存のAPI関数実装例: `frontend/src/services/projectApiService.ts`

## バックエンド実装の振り返り

Phase 0-4の実装で学んだ教訓：

- **DB操作規約の重要性**: insert/updateメソッドの分離、動的SQL構築は必須
- **実装前の規約確認**: workflow.mdのチェックリストを必ず実施
- **規約違反の防止**: 実装前・実装中・実装後の3回規約確認が重要

Phase 5でも同様に、TypeScript型定義規約を遵守してください。

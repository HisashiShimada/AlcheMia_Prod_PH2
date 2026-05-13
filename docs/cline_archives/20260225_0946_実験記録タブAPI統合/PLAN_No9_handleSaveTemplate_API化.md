# タスク計画書: No.9 DataRecordDialog handleSaveTemplate → 実験データ保存API呼び出し

## メタデータ
- **作成日時**: 2026-02-25 16:03
- **タスクID**: experiment-record-no9-handleSaveTemplate-api
- **優先度**: 中
- **推定工数**: 3時間
- **親タスク**: `docs/20260225_0946_実験記録タブAPI統合/PLAN.md`（Phase 4）

---

## 1. タスク概要

`frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` の `handleSaveTemplate` 関数が、
現在はコンソールログ出力のみでAPIを呼び出していない。
バックエンドの実験データ一括保存API（`POST /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data`）は実装済みのため、
フロントエンド側のAPI呼び出しを実装する。

### 対象箇所（現状コード）

```typescript
// frontend/src/components/ExperimentWorker/DataRecordDialog.tsx
// handleSaveTemplate 内
console.log('保存データ:', {
  transitionId: transition?.transitionId,
  templateId: template.templateId,
  status: selectedStatus,
  comment: comment,
  experimentData: templateData,
});

onSave([templateData]);
message.success(`「${template.name}」を保存しました（ステータス: ...）`);
// ← APIへの実際の保存処理なし
```

---

## 2. 目的と期待される成果

### 目的
- `handleSaveTemplate` でのコンソールログのみの仮実装を、実際のAPI呼び出しに置き換える
- 実験データをバックエンドの `template_data` テーブルに正しく永続化する

### 期待される成果
- [ ] フロントエンドAPIサービス（`experimentDataApiService.ts`）の新規作成
- [ ] `DataRecordDialog` の props に `projectName` と `taskNo` を追加
- [ ] `handleSaveTemplate` でAPIを呼び出し、実験データが保存される
- [ ] エラー時に適切なエラーメッセージが表示される
- [ ] 保存成功時のメッセージが表示される

---

## 3. 事前調査結果

### バックエンドAPI（実装済み）

| 項目 | 内容 |
|------|------|
| エンドポイント | `POST /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` |
| コントローラー | `backend/src/controllers/experimentController.ts` - `saveBatchData` |
| ルート | `backend/src/routes/experimentRoutes.ts` |
| 権限 | `experiment_worker` のみ書込可（`checkPermission('050000', 1)`） |

### リクエストボディ形式

```json
{
  "records": [
    {
      "placeId": "place_001",
      "templateType": "material",
      "templateId": "mat_001",
      "data": { ... },
      "status": "completed",
      "comment": "コメント"
    }
  ]
}
```

### DataRecordDialog の現状 props

```typescript
interface DataRecordDialogProps {
  open: boolean;
  transition: Transition | null;
  projectStatus: ProjectStatus | null;
  onClose: () => void;
  onSave: (data: ExperimentDataValue[]) => void;
  projectId?: string;   // ← APIには不要（projectNameが必要）
  methodId?: string;    // ← そのまま使用可
}
```

### 不足情報の分析

APIエンドポイントに必要なパスパラメータのうち、現状の props から取得できないものがある：

| APIパラメータ | 現状 | 対応方針 |
|-------------|------|---------|
| `projectName` | props にない | props に追加 |
| `methodId` | props に `methodId?` あり | そのまま使用 |
| `taskNo` | props にない | props に追加 |

リクエストボディの `placeId` は、フロントエンドの `Template` 型（`ExperimentWorker.ts`）に存在しないため、`templateId` を `placeId` の代替として使用する（設計の一致確認が必要）。

### TemplateCategoryのマッピング

APIの `templateType` フィールドはスネークケース小文字、フロントエンドの `TemplateCategory` は PascalCase のため変換が必要：

| TemplateCategory（フロント） | templateType（API） |
|---------------------------|-------------------|
| `'Materials'` | `'material'` |
| `'Conditions'` | `'condition'` |
| `'Results'` | `'result'` |

### フロントエンドサービスの状況

`frontend/src/services/` に実験データ保存用のサービスファイルが存在しないため、新規作成が必要。

---

## 4. 実装ステップ

### Phase 1: フロントエンドAPIサービスの新規作成

- [ ] `frontend/src/services/experimentDataApiService.ts` を新規作成
  - [ ] `saveBatchExperimentData` 関数を実装
  - [ ] リクエスト型・レスポンス型を `frontend/src/types/api.ts` に追加

### Phase 2: DataRecordDialog の props 拡張

- [ ] `DataRecordDialogProps` に `projectName?: string` を追加
- [ ] `DataRecordDialogProps` に `taskNo?: number` を追加
- [ ] 関数引数の分割代入に `projectName`, `taskNo` を追加

### Phase 3: handleSaveTemplate のAPI呼び出し実装

- [ ] `console.log` を削除し、APIサービス呼び出しに置き換え
- [ ] `TemplateCategory` → `templateType` のマッピング関数を実装
- [ ] `ExperimentDataValue` → API の `data` オブジェクトへのマッピングを実装
- [ ] 必須パラメータ（`projectName`, `taskNo`）が未設定時のガード処理を追加
- [ ] API成功時・失敗時のエラーハンドリングを実装

### Phase 4: DataRecordDialog の呼び出し元を修正

- [ ] `DataRecordDialog` を使用している親コンポーネントに props 追加を伝播
  - [ ] `ExperimentRecordTab.tsx` の `<DataRecordDialog>` に `projectName` / `taskNo` を渡す
  - [ ] `TransitionList.tsx` の `<DataRecordDialog>` に `projectName` / `taskNo` を渡す

### Phase 5: 動作確認

- [ ] TypeScript コンパイルエラーがないことを確認
- [ ] API呼び出しが正しいエンドポイントに送信されることを確認（ブラウザ DevTools）
- [ ] 保存成功時に `message.success` が表示されることを確認
- [ ] 必須パラメータ不足時にエラーが適切に処理されることを確認

---

## 5. 影響範囲

### 変更するファイル

| No | ファイルパス | 変更内容 |
|----|------------|---------|
| 1 | `frontend/src/types/api.ts` | 実験データ保存リクエスト／レスポンス型を追加 |
| 2 | `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | props 拡張、handleSaveTemplate のAPI呼び出し実装 |
| 3 | `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | DataRecordDialog に projectName / taskNo を渡す |
| 4 | `frontend/src/components/ExperimentWorker/TransitionList.tsx` | DataRecordDialog に projectName / taskNo を渡す |

### 新規作成するファイル

| No | ファイルパス | 内容 |
|----|------------|------|
| 1 | `frontend/src/services/experimentDataApiService.ts` | 実験データ保存APIサービス |

### 影響を受ける機能
- データ記録ダイアログの「保存」ボタン押下時の処理
- 実験記録タブからの `DataRecordDialog` 呼び出し
- トランジション一覧からの `DataRecordDialog` 呼び出し

---

## 6. 実装詳細

### 6.1 型定義追加（frontend/src/types/api.ts）

```typescript
// ===== 実験データ保存API =====

/** 実験データ保存リクエスト - records配列の1要素 */
export interface ExperimentDataRecord {
  placeId: string;
  templateType: 'material' | 'condition' | 'result';
  templateId: string;
  data: Record<string, unknown>;
  status?: 'initial' | 'preparing' | 'ready' | 'running' | 'paused' | 'completed' | 'error';
  comment?: string;
}

/** 実験データ一括保存リクエストボディ */
export interface SaveBatchExperimentDataRequest {
  records: ExperimentDataRecord[];
}

/** 実験データ保存レスポンス - 保存された1レコード */
export interface SavedExperimentRecord {
  id: string;
  projectId: string;
  methodId: string;
  taskNo: number;
  placeId: string;
  templateType: string;
  templateId: string;
  data: Record<string, unknown>;
  status: string;
  comment: string | null;
  recordedBy: string;
  recordedAt: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

/** 実験データ一括保存レスポンス */
export interface SaveBatchExperimentDataResponse {
  success: boolean;
  data: {
    saved: number;
    records: SavedExperimentRecord[];
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}
```

### 6.2 APIサービス新規作成（frontend/src/services/experimentDataApiService.ts）

```typescript
import axios from 'axios';
import {
  SaveBatchExperimentDataRequest,
  SaveBatchExperimentDataResponse,
} from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * 実験データを一括保存する
 *
 * @param projectName プロジェクト名
 * @param methodId メソッドID
 * @param taskNo タスク連番
 * @param request 保存リクエストボディ
 * @returns 保存結果
 */
export async function saveBatchExperimentData(
  projectName: string,
  methodId: string,
  taskNo: number,
  request: SaveBatchExperimentDataRequest
): Promise<SaveBatchExperimentDataResponse> {
  const response = await axios.post<SaveBatchExperimentDataResponse>(
    `${API_BASE_URL}/api/v1/experiments/projects/${encodeURIComponent(projectName)}/methods/${encodeURIComponent(methodId)}/tasks/${taskNo}/data`,
    request,
    { withCredentials: true }
  );
  return response.data;
}
```

### 6.3 DataRecordDialog.tsx の変更ポイント

#### Props 型の拡張

```typescript
interface DataRecordDialogProps {
  open: boolean;
  transition: Transition | null;
  projectStatus: ProjectStatus | null;
  onClose: () => void;
  onSave: (data: ExperimentDataValue[]) => void;
  projectId?: string;
  projectName?: string;   // 追加
  methodId?: string;
  taskNo?: number;        // 追加
}
```

#### TemplateCategoryマッピング関数

```typescript
const mapTemplateCategoryToApiType = (
  category: TemplateCategory
): 'material' | 'condition' | 'result' => {
  switch (category) {
    case 'Materials':  return 'material';
    case 'Conditions': return 'condition';
    case 'Results':    return 'result';
  }
};
```

#### handleSaveTemplate の修正方針

1. `projectName` と `taskNo` と `methodId` が未設定の場合はエラーメッセージを表示して処理を中断
2. `templateData` を API の `ExperimentDataRecord` 形式にマッピング
3. `saveBatchExperimentData` を呼び出す
4. 成功時：`message.success` を表示し `onSave` を呼び出す
5. 失敗時：`message.error` を表示し、ローディングを解除

#### placeId の扱い

現在フロントエンドの `Template` 型に `placeId` が含まれていないため、
`templateId` を `placeId` として代替利用する（`placeId: template.templateId`）。
将来的に `Transition.templates` に `placeId` が追加された際は修正対象となる。

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `projectName` / `taskNo` が親から渡されない | 高 | 中 | 必須パラメータ未設定時のガード処理 + エラーメッセージ表示 |
| `placeId` が templateId と一致しない | 中 | 中 | バックエンドの `template_data` テーブルの一意キー確認。問題があれば `Transition` 型に `placeId` を追加する方針に変更 |
| `ExperimentDataValue` の値が API の `data` 形式と不一致 | 中 | 低 | API設計書のdata形式と照合、必要に応じてマッピング処理を追加 |
| 親コンポーネントへの props 追加が影響範囲拡大 | 低 | 中 | 変更は `projectName?` / `taskNo?` の任意 props のため既存動作に影響しない |

---

## 8. テスト計画

### 手動テスト

- [ ] データ記録ダイアログを開き、テンプレートを選択して「保存」ボタンを押す
  - 成功時：`「{テンプレート名}」を保存しました` のメッセージが表示される
  - DevTools の Network タブで `POST /api/v1/experiments/.../data` が送信されていることを確認
- [ ] `projectName` / `taskNo` が未設定の場合に適切なエラーメッセージが表示されることを確認
- [ ] バックエンドエラー（403: 編集不可プロジェクト等）時にエラーメッセージが表示されることを確認

### コンパイル確認

- [ ] `npm run build` または `npx tsc --noEmit` でコンパイルエラーがないことを確認

---

## 9. 関連ドキュメント

- [実験データ記録API設計書](../../docs/design/api/api_experiment_data.md)
- [モックデータ調査結果](./mock_investigation.md)
- [親タスク計画書](./PLAN.md)
- [TypeScript型定義規約](../../.clinerules/development/typescript.md)

---

## 10. 承認記録

- **計画書提示日時**: 2026-02-25 16:03
- **承認日時**: （承認後記入）
- **承認者コメント**: （承認後記入）

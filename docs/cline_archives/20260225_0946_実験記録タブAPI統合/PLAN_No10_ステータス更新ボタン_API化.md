# タスク計画書: No.10 DataRecordDialog ステータス更新ボタン → API化

## メタデータ
- **作成日時**: 2026-02-25 16:15
- **タスクID**: No10_status_update_api
- **優先度**: 中
- **推定工数**: 1時間
- **関連調査ファイル**: `docs/20260225_0946_実験記録タブAPI統合/mock_investigation.md`

---

## 1. タスク概要

`DataRecordDialog.tsx` の「ステータス更新」セクション内の「保存」ボタンが、
現在はコンソールログ出力のみで実際のAPI呼び出しを行っていない。
これを `PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status`
（トランジションステータス更新 API 6.6）への実際のAPI呼び出しに置き換える。

### 対象箇所（修正前）

```typescript
// frontend/src/components/ExperimentWorker/DataRecordDialog.tsx
// ステータス更新セクションの「保存」ボタン onClick
onClick={() => {
  console.log('ステータス更新保存:', {
    transitionId: transition?.transitionId,
    status: selectedStatus,
    progress: progress,
    comment: comment,
  });
  message.success(
    `ステータスを更新しました（${statusOptions.find(opt => opt.value === selectedStatus)?.label}、進捗: ${progress}%）`
  );
}}
```

---

## 2. 目的と期待される成果

### 目的
- ステータス更新ボタン押下時に実際にバックエンドAPIを呼び出し、`transition_data` テーブルを更新する

### 期待される成果
- [ ] ステータス更新ボタン押下でAPIが呼び出され、DBに保存される
- [ ] API呼び出し中はローディング表示になる
- [ ] 保存成功時にサクセスメッセージが表示される
- [ ] 保存失敗時にエラーメッセージが表示される
- [ ] コンソールログのみのモック実装が削除される

---

## 3. 実装ステップ

### Phase 1: API型定義の追加
- [ ] `frontend/src/types/api.ts` にトランジションステータス更新のリクエスト・レスポンス型を追加

### Phase 2: APIサービス関数の追加
- [ ] `frontend/src/services/projectApiService.ts` に `updateTransitionStatus` 関数を追加

### Phase 3: DataRecordDialog の修正
- [ ] `DataRecordDialog.tsx` でサービス関数をインポート
- [ ] ステータス更新ボタンの `onClick` をAPI呼び出しに変更（async対応、ローディング制御）

---

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/types/api.ts` — トランジションステータス更新の型定義追加
2. `frontend/src/services/projectApiService.ts` — `updateTransitionStatus` 関数の追加
3. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` — ボタン `onClick` の API化

### 新規作成するファイル
なし

### 影響を受ける機能
- 実験記録タブのステータス更新機能（`DataRecordDialog` の「ステータス更新」セクション）
- `useDeemedProgress` が `false` のときのみ表示されるセクションのため、影響範囲は限定的

---

## 5. 技術的詳細

### 呼び出しAPI

**エンドポイント**: `PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status`

**パスパラメータ**:
| パラメータ | 取得元 | 備考 |
|-----------|--------|------|
| `projectName` | `DataRecordDialogProps.projectName` | props経由 |
| `methodId` | `DataRecordDialogProps.methodId` | props経由 |
| `transitionId` | `transition.transitionId` | state経由 |

**リクエストボディ**:
| パラメータ | 型 | 取得元 | 備考 |
|-----------|------|--------|------|
| `taskNo` | integer | `DataRecordDialogProps.taskNo` | props経由 |
| `status` | string | `selectedStatus` state | `TransitionStatus` 型 |
| `progressRate` | integer | `progress` state | 0〜100 |
| `comment` | string | `comment` state | 任意 |

**レスポンス**（成功時 200 OK）:
```json
{
  "success": true,
  "data": {
    "transitionId": "transition_001",
    "taskNo": 1,
    "methodId": "method_001",
    "projectName": "Sample Project",
    "status": "running",
    "progressRate": 50,
    "comment": "...",
    "updatedBy": "...",
    "updatedAt": "2026-01-27T11:00:00Z"
  }
}
```

### 型定義（`frontend/src/types/api.ts` に追加）

```typescript
/**
 * トランジションステータス更新リクエストボディ
 * API: PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status
 */
export interface UpdateTransitionStatusRequest {
  /** タスク連番（1以上の整数） */
  taskNo: number;
  /** トランジションステータス */
  status: 'initial' | 'preparing' | 'ready' | 'running' | 'paused' | 'completed' | 'error';
  /** 進捗率（0〜100、statusがcompletedの場合は自動的に100） */
  progressRate?: number;
  /** コメント（最大2000文字） */
  comment?: string;
}

/**
 * トランジションステータス更新レスポンスデータ
 */
export interface UpdateTransitionStatusResponse {
  transitionId: string;
  taskNo: number;
  methodId: string;
  projectName: string;
  status: string;
  progressRate: number;
  comment: string | null;
  updatedBy: string;
  updatedAt: string;
}
```

### サービス関数（`frontend/src/services/projectApiService.ts` に追加）

```typescript
/**
 * トランジションステータスを更新
 * PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status
 *
 * @param projectName プロジェクト名
 * @param methodId メソッドID
 * @param transitionId トランジションID
 * @param request リクエストボディ
 * @returns 更新されたトランジション情報
 * @throws Error APIエラー時
 */
export const updateTransitionStatus = async (
  projectName: string,
  methodId: string,
  transitionId: string,
  request: UpdateTransitionStatusRequest
): Promise<ApiResponse<UpdateTransitionStatusResponse>> => { ... };
```

### DataRecordDialog の変更内容

**修正前**:
```typescript
onClick={() => {
  console.log('ステータス更新保存:', { ... });
  message.success(`ステータスを更新しました（...）`);
}}
```

**修正後**:
```typescript
onClick={async () => {
  if (!projectName || !methodId || !transition?.transitionId || taskNo === undefined) {
    message.error('更新に必要なプロジェクト情報が不足しています');
    return;
  }
  try {
    setLoading(true);
    await updateTransitionStatus(projectName, methodId, transition.transitionId, {
      taskNo,
      status: selectedStatus,
      progressRate: progress,
      comment: comment || undefined,
    });
    message.success(
      `ステータスを更新しました（${statusOptions.find(opt => opt.value === selectedStatus)?.label}、進捗: ${progress}%）`
    );
  } catch (error) {
    // エラーハンドリング（axiosエラーのメッセージを優先表示）
    const serverMessage = (error as AxiosError<...>)?.response?.data?.error?.message;
    message.error(serverMessage ? `更新に失敗しました: ${serverMessage}` : '更新に失敗しました');
  } finally {
    setLoading(false);
  }
}}
```

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `projectName`/`methodId`/`taskNo` が props から渡されていない | 中 | 低 | 既に `handleSaveTemplate` で同様のガードチェックが実装済みのため、同パターンを踏襲する |
| ステータス更新ボタンの `loading` 中に保存ボタンも押せてしまう | 低 | 低 | 既存の `loading` state を共用するため影響なし |
| API設計書の `status` の値と `TransitionStatus` 型の不一致 | 中 | 低 | 調査済み。`TransitionStatus` 型（`experimentWorker.ts`）の値と API 仕様の許容値は一致している |

---

## 7. テスト計画

### 手動テスト
- [ ] `useDeemedProgress` チェックをOFFにしてステータス更新セクションを表示
- [ ] ステータスを選択し、進捗スライダーを動かし、コメントを入力した後「保存」ボタンを押下
  - → ローディングスピナーが表示される
  - → API呼び出し成功でサクセスメッセージが表示される
- [ ] `projectName` が未設定の状態でボタン押下
  - → エラーメッセージが表示される（ガードチェック）
- [ ] バックエンドがエラーを返した場合
  - → エラーメッセージが表示される

---

## 8. 関連ドキュメント

- [調査結果](./mock_investigation.md) — No.10 の修正内容詳細
- [進捗確認API仕様書](../../docs/design/api/api_progress_monitoring.md) — API 6.6 トランジションステータス更新
- [既実装の参考](./PLAN_No9_handleSaveTemplate_API化.md) — 同じ `DataRecordDialog.tsx` のAPI化済み箇所

---

## 9. 承認記録

- **計画書提示日時**: 2026-02-25 16:15
- **承認日時**:（承認後に記入）
- **承認者コメント**:（承認後に記入）

---

## 10. 実施記録

### 実施日時
開始:（作業開始時に記入）
完了:（作業完了時に記入）

### 計画からの変更点
（実施中に発生した変更があれば記入）

### 最終的な成果物
- [ ] `frontend/src/types/api.ts` — 型定義追加
- [ ] `frontend/src/services/projectApiService.ts` — `updateTransitionStatus` 関数追加
- [ ] `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` — ボタン API化

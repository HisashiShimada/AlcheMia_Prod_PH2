# タスク計画書: アップロード中断処理修正

## メタデータ
- **作成日時**: 2026-04-14 10:56
- **タスクID**: upload-cancel-fix
- **優先度**: 高
- **推定工数**: 1〜2時間

---

## タスク概要

`BulkUploadDialog.tsx` と `FormatUploadDialog.tsx` のアップロード中断処理を修正する。
ユーザー指示に従い、ボタンの役割を明確に分離する。

---

## 修正方針（ユーザー指示）

| ボタン | 現状 | 修正後 |
|---|---|---|
| フッターの「キャンセル」ボタン | `handleClose()` → アップロード中なら確認モーダル表示 | **「閉じる」ボタンに変更**。ダイアログを閉じる機能のみ |
| 進捗バー付近の赤い「キャンセル」ボタン | `abortController.abort()` のみ | **確認ダイアログを表示し、確認後にアップロード関連処理を全て止める** |

---

## ✅ 確認事項（解決済み）

### Q1: フッター「閉じる」ボタン —— アップロード中に押した場合の動作

**回答**: **案C** — アップロード中はボタンを `disabled` にして押せないようにする（現状維持）。押せるようになるのはキャンセルまたは完了後。

---

## 実装内容

### Phase 1: バックエンド — バッチ先行作成API新設

**背景**: 現状の `POST /api/v1/files/upload` はアップロード完了後にバッチIDをレスポンスに含めるため、アップロード途中でキャンセルした場合に `batchId` が取得できない。アップロード開始前にバッチを `in_progress` 状態で先行作成し、フロントエンドに即座に `batchId` を返す新しいエンドポイントを追加する。

#### 1-1: 新しいルート追加（`backend/src/routes/fileAccessRoutes.ts`）

```
POST /api/v1/files/batches/init
```

リクエスト:
```json
{
  "batchName": "string（任意）",
  "uploadType": "single | bulk | folder"
}
```

レスポンス:
```json
{
  "success": true,
  "data": { "batchId": "batch_20260414_..." }
}
```

#### 1-2: コントローラー追加（`backend/src/controllers/fileAccessController.ts`）

`initBatch` 関数を追加。`uploadBatchRepository.create()` を呼んで `batchId` を返す。

#### 1-3: サービス修正（`backend/src/services/fileAccessService.ts`）

`uploadFiles()` の引数に `batchId?: string` を追加。
- `batchId` が渡された場合：既存バッチを使用（`create` を呼ばない）
- `batchId` が渡されない場合：現状通り `create` を呼ぶ（後方互換性維持）

---

### Phase 2: フロントエンド — サービス層にバッチ先行作成関数追加

**対象**: `frontend/src/services/fileAccessService.ts`

```typescript
/**
 * バッチを先行作成して batchId を取得する
 */
export const initBatch = async (params: {
  batchName?: string;
  uploadType: 'single' | 'bulk' | 'folder';
}): Promise<string> => {
  const client = createApiClient();
  const response = await client.post('/files/batches/init', params);
  return response.data.data.batchId;
};
```

---

### Phase 3: フロントエンド — ダイアログのアップロード開始処理修正（両ダイアログ共通）

`handleUpload()` の最初（`setUploadState` の直後）でバッチを先行作成し、`batchIdRef` に保存する。

```typescript
// AbortController を作成
const controller = new AbortController();
setAbortController(controller);

// ① バッチを先行作成（in_progress）→ batchId を即座に取得
const newBatchId = await initBatch({
  uploadType: uploadMode,
  batchName: batchName || undefined,
});
setBatchId(newBatchId);
batchIdRef.current = newBatchId;  // ← ref にも保存

setUploadState({ isUploading: true, ... });
```

また、`batchId` を `useRef` でも保持する（state 更新の非同期性を回避）：
```typescript
const batchIdRef = useRef<string | null>(null);
```

`uploadFiles()` 呼び出しに `batchId` を渡す（バックエンドが既存バッチを使用）：
```typescript
const response = await uploadFiles({
  ...,
  metadata: {
    projectId,
    batchName: batchName || undefined,
    batchId: newBatchId,  // ← 追加
  },
});
```

---

### Phase 4: 進捗バーのキャンセルボタン — 確認ダイアログ追加＋全中断（両ダイアログ共通）

`handleCancelUpload()` に確認ダイアログを追加し、「中断する」確認後にアップロード関連処理を全て停止する。

```typescript
const handleCancelUpload = useCallback(() => {
  if (!abortController) return;

  Modal.confirm({
    title: 'アップロードのキャンセル',
    content: 'アップロードを中断しますか？',
    okText: '中断する',
    okButtonProps: { danger: true },
    cancelText: '続行',
    onOk: async () => {
      // ① チャンクアップロードセッションをすべて中断（サーバー一時ファイル削除）
      const ids = activeUploadIdsRef.current;
      if (ids.length > 0) {
        try {
          await Promise.all(ids.map((id) => abortChunkUpload(id)));
        } catch (e) {
          console.error('チャンクアップロード中断エラー:', e);
        }
        activeUploadIdsRef.current = [];
      }
      // ② バッチをキャンセル状態に更新
      if (batchIdRef.current) {
        try {
          await cancelBatch(batchIdRef.current);
        } catch (e) {
          console.error('バッチキャンセルエラー:', e);
        }
      }
      // ③ HTTP通信を中断（→ catch で CanceledError を処理）
      abortController.abort();
    },
  });
}, [abortController]);
```

---

### Phase 5: FormatUploadDialog の catch ブロック修正 — REPORT 問題1対応

`catch` ブロックの処理順序を `BulkUploadDialog` と同じ構造に統一する。

**修正後**:
```typescript
} catch (error) {
  if ((error as { name?: string }).name === 'CanceledError') {
    message.info('アップロードがキャンセルされました');
    setUploadState(prev => ({ ...prev, isUploading: false, error: 'キャンセルされました' }));
    // ※ cancelBatch は Phase4 の確認ダイアログ側で呼ばれるため、ここでは不要
  } else {
    const axiosError = error as any;
    const errorCode = axiosError?.response?.data?.error?.code;
    if (errorCode === 'MAIML_VALIDATION_ERROR') {
      setUploadState(prev => ({ ...prev, isUploading: false, error: null }));
      Modal.error({ ... });  // 既存のモーダル内容はそのまま
    } else {
      const errorMessage = extractErrorMessage(error);
      setUploadState(prev => ({ ...prev, isUploading: false, error: errorMessage }));
      message.error(errorMessage);
    }
  }
}
```

---

### Phase 6: フッターボタンの変更（両ダイアログ共通）

- ボタンラベルを「キャンセル」→「**閉じる**」に変更
- `onClick` は `onClose()` 直呼び（確認モーダルなし）に変更
- `disabled={uploadState.isUploading}` は**現状維持**（アップロード中は押せない）

```tsx
<Button key="close" onClick={onClose} disabled={uploadState.isUploading}>
  閉じる
</Button>
```

---

### Phase 7: ドキュメント更新

#### UI仕様書（2ファイル）

- `docs/design/ui/experiment_admin/01_project_management/ui_bulk_upload_dialog.md`
  - キャンセルボタンの仕様変更（確認ダイアログ追加）
  - フッターボタン「閉じる」への変更
- `docs/design/ui/experiment_admin/02_format_management/ui_format_upload_dialog.md`
  - 同上

#### API仕様書

- `docs/design/api/api_file_access.md`
  - `POST /api/v1/files/batches/init` エンドポイントを新規追加

---

### Phase 8: 対応結果まとめ（result.md 作成）

`docs/20260414_1042_アップロード中断処理調査/result.md` を作成し、以下を記載する：

- 発見した問題点のまとめ
- 実施した修正の概要
- 変更ファイル一覧
- 動作確認方法

---

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `backend/src/routes/fileAccessRoutes.ts` | Phase1: `POST /batches/init` ルート追加 |
| `backend/src/controllers/fileAccessController.ts` | Phase1: `initBatch` コントローラー追加 |
| `backend/src/services/fileAccessService.ts` | Phase1: `uploadFiles` に `batchId?` 引数追加 |
| `frontend/src/services/fileAccessService.ts` | Phase2: `initBatch` 関数追加 |
| `frontend/src/components/project/BulkUploadDialog.tsx` | Phase3,4,6 |
| `frontend/src/components/project/FormatUploadDialog.tsx` | Phase3,4,5,6 |
| `docs/design/ui/experiment_admin/01_project_management/ui_bulk_upload_dialog.md` | Phase7: UI仕様書更新 |
| `docs/design/ui/experiment_admin/02_format_management/ui_format_upload_dialog.md` | Phase7: UI仕様書更新 |
| `docs/design/api/api_file_access.md` | Phase7: API仕様書更新 |
| `docs/20260414_1042_アップロード中断処理調査/result.md` | Phase8: 対応結果まとめ |

---

## 承認記録
- **計画書提示日時**: 2026-04-14 10:56
- **承認日時**: 

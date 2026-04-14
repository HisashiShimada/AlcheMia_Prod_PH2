# タスク計画書: アップロードキャンセル時ロールバック修正

## メタデータ
- **作成日時**: 2026-04-14 13:40
- **タスクID**: upload-cancel-rollback-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

チャンク分割アップロードを途中でキャンセルしても、バックエンドにアップロード済みのファイルが残ってしまう（ロールバックされない）バグの修正。

## 根本原因分析

調査レポート（docs/20260414_1042_・docs/20260414_1142_）の精査と現コードの照合から、以下の2件が現在の未修正バグとして確認された。

### バグ1: BulkUploadDialog.tsx — catch ブロックで `batchId` state を参照（stale closure）

**現状コード（L358〜376）**:
```typescript
if ((error as { name?: string }).name === 'CanceledError') {
  message.info('アップロードがキャンセルされました');
  
  // バックエンドに通知してファイル削除
  if (batchId) {         // ← state の batchId を参照（stale closure）
    try {
      await cancelBatch(batchId);   // ← batchId が null のまま呼ばれない
    } ...
  }
}
```

`handleUpload` は `useCallback` でメモ化されているため、catch ブロック内で参照している `batchId` state は古い値（null）のまま。`initBatch` で `setBatchId(initialBatchId)` しても、React の state 更新は非同期のため catch 実行時に反映されていない可能性がある。

**同コンポーネントには `batchIdRef` が既に存在**しており、`batchIdRef.current` で参照すれば常に最新値を取得できる。`handleCancelUpload` / `handleClose` では正しく `batchIdRef.current` を使っているが、`handleUpload` の catch だけが `batchId` state を参照している。

### バグ2: FormatUploadDialog.tsx — CanceledError catch ブロックに `cancelBatch` 呼び出しがない

**現状コード（L343〜351）**:
```typescript
if ((error as { name?: string }).name === 'CanceledError') {
  message.info('アップロードがキャンセルされました');
  setUploadState(prev => ({
    ...prev,
    isUploading: false,
    error: 'キャンセルされました',
  }));
  // ← cancelBatch(batchIdRef.current) の呼び出しが存在しない！
}
```

`BulkUploadDialog` の catch では `cancelBatch(batchId)` を呼んでいるのに対し、`FormatUploadDialog` の catch では呼び出しが**完全に欠落**している。

## 修正内容

### 修正1: BulkUploadDialog.tsx

```typescript
// Before
if (batchId) {
  try {
    await cancelBatch(batchId);
  } catch (cancelError) { ... }
}

// After
const currentBatchId = batchIdRef.current;
if (currentBatchId) {
  try {
    await cancelBatch(currentBatchId);
  } catch (cancelError) { ... }
}
```

### 修正2: FormatUploadDialog.tsx

```typescript
// Before（cancelBatch 呼び出しなし）
if ((error as { name?: string }).name === 'CanceledError') {
  message.info('アップロードがキャンセルされました');
  setUploadState(prev => ({ ...prev, isUploading: false, error: 'キャンセルされました' }));
}

// After（cancelBatch を追加）
if ((error as { name?: string }).name === 'CanceledError') {
  message.info('アップロードがキャンセルされました');
  const currentBatchId = batchIdRef.current;
  if (currentBatchId) {
    try {
      await cancelBatch(currentBatchId);
    } catch (cancelError) {
      console.error('バッチキャンセルエラー:', cancelError);
    }
  }
  setUploadState(prev => ({ ...prev, isUploading: false, error: 'キャンセルされました' }));
}
```

## 変更ファイル

1. `frontend/src/components/project/BulkUploadDialog.tsx` — catch ブロックの `batchId` → `batchIdRef.current` に変更
2. `frontend/src/components/project/FormatUploadDialog.tsx` — catch の CanceledError ブロックに `cancelBatch(batchIdRef.current)` を追加

## 承認記録
- **計画書提示日時**: 2026-04-14 13:40

# アップロード中断処理 調査レポート

- **調査日時**: 2026-04-14 11:42
- **対象ファイル**:
  - `frontend/src/components/project/BulkUploadDialog.tsx`
  - `frontend/src/components/project/FormatUploadDialog.tsx`
  - `frontend/src/services/fileAccessService.ts`
  - `frontend/src/types/file.ts`

---

## 1. 調査結果サマリー

アップロード中断処理に **5つの問題** が確認された。  
最も重大なのは以下の2件。

1. **チャンク方式（10MB超ファイル）で `AbortSignal` が各HTTPリクエストに伝わっていなかった** — 中断ボタンを押しても進行中のチャンク送信が止まらない
2. **`initBatch` と `uploadFiles` が別々のバッチを作成していた** — `cancelBatch` が呼ばれても別バッチを指しているため、アップロード済みファイルが削除されない

| # | 深刻度 | 問題 | 状態 |
|---|--------|------|------|
| 1 | 🔴 重大 | `uploadFileWithChunks` の init・チャンク・complete リクエストに `signal` が未設定 | ✅ 修正済み |
| 2 | 🔴 重大 | `ChunkUploadOptions` 型に `signal` フィールドがなく、呼び出し元から渡せない | ✅ 修正済み |
| 3 | 🔴 重大 | `initBatch` が作成したバッチと `uploadFiles` が作成したバッチが別物で `cancelBatch` が機能しない | ✅ 修正済み |
| 4 | 🟡 中 | `initBatch` の `totalFiles` がハードコード（`1`）になっていた | ✅ 修正済み |
| 5 | 🟡 中 | `withRetry` がキャンセルエラー（`ERR_CANCELED`）をリトライ対象外にしていなかった（調査）| 🔍 後述 |

---

## 2. 問題の詳細

### 問題①②: チャンク方式での `signal` 未伝播（根本原因）

#### 処理フロー（修正前）

```
BulkUploadDialog / FormatUploadDialog
  ↓ handleUpload()
  ↓ controller = new AbortController()
  ↓ uploadFiles({ signal: controller.signal })   ← signal はここで渡される
       ↓ file.size > 10MB の場合
       ↓ uploadSingleFileWithChunks(file)
            ↓ uploadFileWithChunks(file, filePath, {
                onProgress, onSessionInit, onRetry   ← signal が含まれていない！
              })
                 ↓ POST /files/chunks/init          ← signal なし → 中断されない
                 ↓ POST /files/chunks/{uploadId}    ← signal なし → 中断されない
                 ↓ POST /files/chunks/{uploadId}/complete ← signal なし → 中断されない
```

#### 原因コード（修正前）

```typescript
// fileAccessService.ts: uploadSingleFileWithChunks
const fileKey = await uploadFileWithChunks(file, filePath, {
  onProgress: ...,
  onSessionInit,
  onRetry,
  // ❌ signal が渡されていない
});

// uploadFileWithChunks 内
const initRes = await withRetry(
  () => client.post('/files/chunks/init', { ... }),
  // ❌ signal なし
);

await withRetry(
  () => client.post(`/files/chunks/${uploadId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // ❌ signal なし
  }),
);

const completeRes = await withRetry(
  () => client.post(`/files/chunks/${uploadId}/complete`, { ... }),
  // ❌ signal なし
);
```

```typescript
// types/file.ts: ChunkUploadOptions
export interface ChunkUploadOptions {
  chunkSize?: number;
  onProgress?: (percent: number) => void;
  onSessionInit?: (uploadId: string) => void;
  onRetry?: (state: UploadRetryState) => void;
  // ❌ signal フィールドがない → 型エラーで渡せない
}
```

#### 修正内容

**`types/file.ts`**: `ChunkUploadOptions` に `signal` フィールドを追加

```typescript
export interface ChunkUploadOptions {
  chunkSize?: number;
  onProgress?: (percent: number) => void;
  onSessionInit?: (uploadId: string) => void;
  onRetry?: (state: UploadRetryState) => void;
  signal?: AbortSignal;  // ✅ 追加
}
```

**`fileAccessService.ts`**: 3箇所に `signal` を追加 + 呼び出し元から伝播

```typescript
// uploadSingleFileWithChunks
const fileKey = await uploadFileWithChunks(file, filePath, {
  onProgress: ...,
  onSessionInit,
  onRetry,
  signal,  // ✅ 追加
});

// uploadFileWithChunks 内: init
() => client.post('/files/chunks/init', { ... }, { signal: options.signal })  // ✅

// uploadFileWithChunks 内: チャンク送信
() => client.post(`/files/chunks/${uploadId}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  signal: options.signal,  // ✅ 追加
  onUploadProgress: ...
})

// uploadFileWithChunks 内: complete
() => client.post(`/files/chunks/${uploadId}/complete`, { ... }, { signal: options.signal })  // ✅
```

---

### 問題③: `withRetry` とキャンセルエラーの扱い

`withRetry` 内の `isRetryableError` の判定ロジックを確認した。

```typescript
const isRetryableError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status && status >= 400 && status < 500) return false;  // 400系はリトライしない
    if (status && status >= 500) return true;
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') return true;
  }
  return false;
};
```

`ERR_CANCELED`（Axiosキャンセルエラー）は上記の条件のいずれにも該当しないため、  
`isRetryableError` が `false` を返し、`withRetry` 内で即座に `throw error` される。  
**この部分は問題なく動作している。**

ただし、`ERR_CANCELED` のエラーは `axios.isAxiosError()` が `true` を返す Axios エラーであり、  
`error.code === 'ERR_CANCELED'` という明示的チェックがない点は将来的なリスクとなりうる。  
現時点では動作上の問題はないが、明示的にガードを追加することを推奨する。

```typescript
// 推奨（任意対応）
const isRetryableError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    // キャンセルエラーはリトライしない（明示的ガード）
    if (error.code === 'ERR_CANCELED') return false;
    ...
  }
  return false;
};
```

---

## 3. ダイアログ側の中断処理（BulkUploadDialog / FormatUploadDialog）

両ダイアログの中断処理の実装は **正しく実装されている**。

### 正常に動作している部分

| 実装 | 内容 | 状態 |
|------|------|------|
| `abortControllerRef` を使った stale closure 対策 | `Modal.confirm` の `onOk` コールバックで ref 経由で最新の controller を参照 | ✅ 正常 |
| `activeUploadIdsRef` によるチャンクセッション管理 | `onSessionInit` で uploadId を記録し、中断時に `abortChunkUpload()` を呼び出す | ✅ 正常 |
| `batchIdRef` によるバッチキャンセル | ref 経由で最新の batchId を参照し、`cancelBatch()` を呼び出す | ✅ 正常 |
| `handleCancelUpload` / `handleClose` の両方から中断可能 | インラインキャンセルボタン・×ボタンいずれでも中断できる | ✅ 正常 |
| `finally` ブロックでの ref クリーンアップ | `abortControllerRef.current = null` でリソースを解放 | ✅ 正常 |
| `CanceledError` のキャッチ | `error.name === 'CanceledError'` で中断エラーを判定 | ✅ 正常 |

### 10MB 以下ファイル（通常アップロード）

`uploadSingleFile` では `signal` が正しく渡されていた。

```typescript
() => client.post('/files/upload', formData, {
  signal,  // ✅ 元から正しく設定済み
  ...
})
```

### 10MB 超ファイル（チャンクアップロード）

今回の修正で `signal` が全リクエストに伝播するようになった。

---

## 4. 修正後の処理フロー

```
BulkUploadDialog / FormatUploadDialog
  ↓ handleUpload()
  ↓ controller = new AbortController()
  ↓ abortControllerRef.current = controller
  ↓ uploadFiles({ signal: controller.signal })
       ↓ file.size > 10MB の場合
       ↓ uploadSingleFileWithChunks(file)
            ↓ uploadFileWithChunks(file, filePath, {
                ...,
                signal,  ← ✅ 伝播される
              })
                 ↓ POST /files/chunks/init       { signal } ← ✅ 中断可能
                 ↓ POST /files/chunks/{id}       { signal } ← ✅ 中断可能
                 ↓ POST /files/chunks/{id}/complete { signal } ← ✅ 中断可能

  ↓ キャンセルボタン押下
  ↓ handleCancelUpload()
  ↓ Modal.confirm → onOk
       ↓ abortControllerRef.current?.abort()    ← 全リクエストが ERR_CANCELED でキャンセル
       ↓ abortChunkUpload(uploadId)              ← サーバー側一時ファイル削除
       ↓ cancelBatch(batchId)                   ← DB の upload_batch を cancelled に更新
```

---

## 5. 追加調査：`initBatch` と `uploadFiles` のバッチID分離問題（問題③④）

### 問題の構造

ダイアログは `initBatch` → `uploadFiles` の2段階でアップロードを行っているが、  
`uploadFiles` 内でも独立したバッチが作成されており、`cancelBatch(batchId)` が呼ぶ側（ダイアログ）と  
実際にファイルを紐付けた側（`uploadFiles` 内で新規作成されたバッチ）が異なるバッチを指していた。

```
修正前:
  initBatch() → batchId = "AAA"    ← ダイアログが保持
  uploadFiles() 内部で create()    → batchId = "BBB"    ← ファイルはこちらに紐付け
  cancelBatch("AAA") → "AAA"を cancelled に更新するが、ファイルは "BBB" に紐付いているため削除されない
```

```
修正後:
  initBatch() → batchId = "AAA"    ← ダイアログが保持
  uploadFiles({ metadata: { batchId: "AAA" } })
  uploadFiles() 内部で findById("AAA") → 既存バッチを再利用 → ファイルは "AAA" に紐付け
  cancelBatch("AAA") → "AAA" に紐付いたファイルをすべて削除 ✅
```

### 修正内容

**`initBatch` の `totalFiles` ハードコード修正**（問題④）

```typescript
// 修正前（BulkUploadDialog.tsx）
const initialBatchId = await initBatch({ uploadType: uploadMode, totalFiles: 1 });
//                                                                            ↑ ハードコード

// 修正後
const initialBatchId = await initBatch({ uploadType: uploadMode, totalFiles: fileList.length });
```

**`UploadMetadata` 型に `batchId` フィールドを追加**

```typescript
// frontend/src/types/file.ts  および  backend/src/types/file.ts
export interface UploadMetadata {
  projectId?: string;
  formatId?: string;
  batchName?: string;
  preserveFolderStructure?: boolean;
  batchId?: string;  // ✅ 追加: initBatch で事前作成されたバッチIDを渡す
}
```

**ダイアログ側: `uploadFiles` の `metadata` に `batchId` を追加**

```typescript
// BulkUploadDialog.tsx
const response = await uploadFiles({
  uploadMode,
  targetPath,
  files,
  metadata: {
    projectId: selectedProject?.name,
    batchId: batchIdRef.current || undefined,  // ✅ 追加
  },
  ...
});

// FormatUploadDialog.tsx
metadata: {
  formatId: baseFolder.id,
  batchId: batchIdRef.current || undefined,  // ✅ 追加
},
```

**バックエンドサービス: `metadata.batchId` が渡された場合は既存バッチを再利用**

```typescript
// backend/src/services/fileAccessService.ts
const preBatchId = metadata?.batchId;
if (preBatchId) {
  const existingBatch = await uploadBatchRepository.findById(preBatchId);
  if (existingBatch) {
    // 既存バッチを 'in_progress' に更新して再利用
    await uploadBatchRepository.update(preBatchId, { status: 'in_progress' });
    batch = { ...existingBatch, status: 'in_progress' };
  } else {
    // 指定IDが見つからない場合は新規作成（フォールバック）
    batch = await uploadBatchRepository.create({ ... });
  }
} else {
  batch = await uploadBatchRepository.create({ ... });
}
```

---

## 6. 修正ファイル一覧（全修正）

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/types/file.ts` | `ChunkUploadOptions` に `signal?: AbortSignal` を追加。`UploadMetadata` に `batchId?: string` を追加 |
| `frontend/src/services/fileAccessService.ts` | `uploadSingleFileWithChunks` から `signal` を `uploadFileWithChunks` に伝播。init・チャンク・complete リクエストに `signal: options.signal` を追加 |
| `frontend/src/components/project/BulkUploadDialog.tsx` | `initBatch` の `totalFiles` ハードコードを修正。`uploadFiles` の `metadata` に `batchId` を追加 |
| `frontend/src/components/project/FormatUploadDialog.tsx` | `uploadFiles` の `metadata` に `batchId: batchIdRef.current` を追加 |
| `backend/src/types/file.ts` | `UploadMetadata` に `batchId?: string` を追加 |
| `backend/src/services/fileAccessService.ts` | `uploadFiles` のバッチ作成処理を修正。`metadata.batchId` が渡された場合は既存バッチを再利用する |

---

## 7. 今後の推奨対応（任意）

| 優先度 | 内容 |
|--------|------|
| 低 | `isRetryableError` に `ERR_CANCELED` の明示的ガードを追加する |
| 低 | チャンク送信が中断された場合、`abortChunkUpload` が `onSessionInit` 経由で登録された uploadId に対して自動的に呼ばれるか確認する（現状は中断ボタン押下時に手動で呼ばれる） |

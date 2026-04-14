# 対応結果：チャンク分割アップロードのキャンセル時ロールバック修正

- **対応日時**: 2026-04-14 14:00〜14:08
- **対象ファイル**: 4ファイル

---

## 問題の概要

`FormatUploadDialog.tsx` / `BulkUploadDialog.tsx` でチャンク分割アップロードをキャンセルしても、アップロード済みのファイルがストレージに残ってしまう問題。

### 原因1: race condition（上がりきっていないファイルが残る）

キャンセルボタン押下と `complete` リクエスト到達がほぼ同時に発生する競合状態。

- フロント: `AbortController.abort()` → axios が ERR_CANCELED をスロー → `catch` で `cancelBatch()` を呼ぶ
- バックエンド: すでに受信済みの `complete` リクエストが処理を継続 → ストレージにファイルが残る

### 原因2: batchId の紐付け不備（上がりきったファイルが削除できない）

`cancelBatch` が「削除対象0件」になっていた理由：

1. `completeChunkUpload` で `file_metadata` への `upload_batch_id` が毎回 `uuidv4()` で新規生成されており、フロントが持つ `batchId` と紐付いていなかった
2. **MAIMLファイルのみ** `file_metadata` に保存していたため、CSV等の非MAIMLファイルは `findByBatchId` で検索できなかった

---

## 修正内容

### 1. `frontend/src/types/file.ts`

`ChunkUploadOptions` インターフェースに `batchId?: string` フィールドを追加。

```ts
export interface ChunkUploadOptions {
  // ...（既存フィールド）
  /**
   * 事前作成済みのバッチID。
   * complete リクエストに含めることで、バックエンドがキャンセル済みバッチを
   * 検出した場合にアップロード済みファイルを即削除できる。
   */
  batchId?: string;
}
```

### 2. `frontend/src/services/fileAccessService.ts`

#### (a) `uploadSingleFileWithChunks` → `uploadFileWithChunks` に `batchId` を伝播

```ts
const fileKey = await uploadFileWithChunks(file, filePath, {
  // ...
  signal,
  batchId: metadata?.batchId, // ← 追加
});
```

#### (b) `uploadFileWithChunks` の `complete` リクエストボディに `batchId` を追加

```ts
client.post(`/files/chunks/${uploadId}/complete`, {
  totalChunks,
  contentType: file.type || 'application/octet-stream',
  ...(options.batchId && { batchId: options.batchId }), // ← 追加
})
```

### 3. `backend/src/controllers/fileAccessController.ts`

#### (a) race condition チェック（ストレージ保存後にキャンセル済みを検出して削除）

```ts
if (batchId) {
  const batch = await UploadBatchRepository.findById(batchId);
  if (batch?.status === 'cancelled') {
    // ストレージからファイルを削除（best-effort）
    await storageService.deleteFile(organizationId, result.fileKey);
    res.status(409).json({ ... });
    return;
  }
}
```

#### (b) `upload_batch_id` をフロントの `batchId` で統一

```ts
// 修正前: 毎回新規UUIDを生成
const chunkBatchId = uuidv4();

// 修正後: フロントの batchId を使用（なければ後方互換でUUID生成）
const effectiveBatchId = batchId ?? uuidv4();
```

#### (c) 全ファイルタイプで `file_metadata` に保存

```ts
// 修正前: MAIMLファイルのみ保存
if (result.contentType === 'application/xml' || fileName.endsWith('.maiml')) {
  await repository.insertFileMetadata({ ..., upload_batch_id: chunkBatchId });
}

// 修正後: 全ファイルタイプを保存（is_maiml_file フラグで区別）
await repository.insertFileMetadata({
  ...,
  is_maiml_file: isMaimlFile,
  upload_batch_id: effectiveBatchId,
});
```

---

## 修正後の動作フロー

```
[フロント]
1. initBatch() → batchId 取得
2. チャンクアップロード開始（batchId を complete リクエストに添付）
3. キャンセルボタン押下
   ├─ AbortController.abort() → axios ERR_CANCELED
   └─ cancelBatch(batchId) → DB の batch.status = 'cancelled'

[バックエンド]
4. complete リクエスト到着
   ├─ chunkService.completeUpload() → ストレージ保存
   └─ UploadBatchRepository.findById(batchId)
       ├─ status === 'cancelled' → storageService.deleteFile() → 409 返却  ← race condition 対応
       └─ status === 'in_progress' → file_metadata INSERT（upload_batch_id = batchId）

5. cancelBatch() → findByBatchId(batchId) → 全ファイルをストレージ・DB から削除  ← batchId 紐付け修正
```

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/types/file.ts` | `ChunkUploadOptions` に `batchId` フィールド追加 |
| `frontend/src/services/fileAccessService.ts` | `batchId` を `uploadFileWithChunks` に伝播 + `complete` リクエストに含める |
| `backend/src/controllers/fileAccessController.ts` | race condition チェック追加 + `effectiveBatchId` 使用 + 全ファイルタイプを `file_metadata` 登録 |

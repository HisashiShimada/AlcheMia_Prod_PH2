# 実施結果: file_metadata 共通化実装

- **実施日時**: 2026-04-03 14:00〜14:22
- **ステータス**: ✅ 完了（TypeScript ビルド Exit code: 0）

---

## 変更ファイル一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `backend/src/repositories/fileMetadataRepository.ts` | 追加 | `insertIfNotExists()` 追加 |
| `backend/src/services/storageService.ts` | 修正 | `UploadOptions` 拡張・DB登録ロジック追加 |
| `backend/src/services/formatService.ts` | 修正 | `userId` 引数追加・`uploadedBy` 渡し |
| `backend/src/controllers/formatController.ts` | 修正 | `req.user.id` を `userId` として渡し |
| `backend/src/services/maimlWriterService.ts` | 修正 | `uploadedBy: 'system'` 追加・個別DB登録削除 |
| `backend/src/services/maimlService.ts` | 修正 | `uploadedBy: userId` 追加・個別DB登録削除 |
| `backend/src/services/fileAccessService.ts` | 修正 | `uploadedBy` 追加・`saveFileMetadata()` 削除・`isMaimlFile` 条件撤廃 |

---

## Phase 1: FileMetadataRepository に `insertIfNotExists()` を追加

**ファイル**: `backend/src/repositories/fileMetadataRepository.ts`

### 変更内容

既存の `insertFileMetadata()` の動的カラム構築ロジックを流用し、`ON CONFLICT (file_key) DO NOTHING` を付加した冪等なINSERTメソッドを追加。

```typescript
async insertIfNotExists(data: Partial<FileMetadata>): Promise<void> {
  // ... 動的カラム構築 ...
  const query = `
    INSERT INTO file_metadata (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    ON CONFLICT (file_key) DO NOTHING
  `;
  await pool.query(query, values);
}
```

- `file_key` の重複時は何もしない（DO NOTHING）
- 戻り値なし（`void`）で呼び出し元の処理を簡潔に

---

## Phase 2: StorageService.uploadFile() に file_metadata 自動登録を追加

**ファイル**: `backend/src/services/storageService.ts`

### 変更内容

#### UploadOptions インターフェース拡張

```typescript
export interface UploadOptions {
  contentType?: string;
  // --- 追加フィールド ---
  uploadedBy?: string;       // アップロードユーザーID（省略時はDB登録スキップ）
  uploadBatchId?: string;    // バッチID
  uploadSource?: string;     // アップロード元（例: 'web_upload'）
  uploadMethod?: string;     // アップロード方法（例: 'single'）
}
```

#### uploadFile() 末尾にDB登録ロジック追加

```typescript
// uploadedBy 指定時かつフォルダマーカー以外の場合のみ登録
if (options?.uploadedBy && !filePath.endsWith('/')) {
  const fileSize =
    content instanceof Buffer ? content.length
    : typeof content === 'string' ? Buffer.byteLength(content)
    : 0; // Readable の場合は 0

  try {
    await fileMetadataRepository.insertIfNotExists({
      organization_id: organizationId,
      file_key: key,                          // buildKey() の戻り値（組織IDプレフィックス付き）
      s3_bucket: this.bucketName,
      original_filename: path.basename(filePath),
      file_size: fileSize,
      is_maiml_file: filePath.endsWith('.maiml'),
      parent_folder_path: path.dirname(key),
      uploaded_by: options.uploadedBy,
      upload_batch_id: options.uploadBatchId,
      upload_source: options.uploadSource,
      upload_method: options.uploadMethod,
    });
  } catch (err) {
    // DB登録失敗は非致命的（警告のみ・処理続行）
    console.warn('[StorageService] file_metadata 登録失敗（続行）:', err);
  }
}
```

**自動計算フィールド**:
| フィールド | 算出方法 |
|-----------|---------|
| `file_key` | `buildKey()` 戻り値（組織IDプレフィックス付き絶対パス） |
| `s3_bucket` | `this.bucketName` |
| `original_filename` | `path.basename(filePath)` |
| `is_maiml_file` | `.maiml` 拡張子判定 |
| `parent_folder_path` | `path.dirname(key)` |
| `file_size` | Buffer→`.length`、string→`Buffer.byteLength()`、Readable→`0` |

---

## Phase 3: formatService.ts / formatController.ts の修正

### formatService.ts

**ファイル**: `backend/src/services/formatService.ts`

`createFormatFile()` / `updateFormatFile()` に `userId: string` 引数を追加し、`uploadFile()` に `uploadedBy: userId` を渡すよう修正。

```typescript
// 変更前
async createFormatFile(organizationId: string, folderName: string, fileName: string, content: string): Promise<...>

// 変更後
async createFormatFile(organizationId: string, folderName: string, fileName: string, content: string, userId: string): Promise<...>
// ...
await storageService.uploadFile(organizationId, filePath, content, {
  contentType: 'application/xml',
  uploadedBy: userId,    // 追加
});
```

### formatController.ts

**ファイル**: `backend/src/controllers/formatController.ts`

`req.user.id` を取得して `userId` として `formatService` に渡すよう修正。

```typescript
const userId = req.user?.id || 'unknown';
await formatService.createFormatFile(organizationId, folderName, fileName, content, userId);
```

---

## Phase 4: 既存の個別登録処理を移管

### maimlWriterService.ts

**ファイル**: `backend/src/services/maimlWriterService.ts`

- `uploadFile()` に `uploadedBy: 'system'` を追加
- アップロード後の `insertFileMetadata()` / `updateFileMetadata()` 呼び出しを削除

```typescript
// 変更前
await storageService.uploadFile(organizationId, filePath, content);
await fileMetadataRepository.insertFileMetadata({ ... });
// または
await fileMetadataRepository.updateFileMetadata({ ... });

// 変更後
await storageService.uploadFile(organizationId, filePath, content, {
  uploadedBy: 'system',
});
// DB登録は storageService 内で自動実施
```

### maimlService.ts

**ファイル**: `backend/src/services/maimlService.ts`

- `uploadFile()` に `uploadedBy: userId` を追加
- アップロード後の `insertFileMetadata()` 呼び出しを削除

```typescript
// 変更前
await storageService.uploadFile(organizationId, filePath, content);
await fileMetadataRepository.insertFileMetadata({ ... });

// 変更後
await storageService.uploadFile(organizationId, filePath, content, {
  uploadedBy: userId,
});
```

### fileAccessService.ts

**ファイル**: `backend/src/services/fileAccessService.ts`

#### ① uploadFiles() のアップロード部分

`isMaimlFile()` 条件分岐を撤廃し、全ファイルを登録対象に統一。`saveFileMetadata()` 呼び出しを削除。

```typescript
// 変更前
const s3Key = await this.storageService.uploadFile(organizationId, filePath, file.buffer, { contentType: file.mimetype });
// MAIMLファイルのみ登録
if (isMaimlFile(sanitizedFileName, file.mimetype)) {
  fileId = await this.saveFileMetadata({ ... });
}

// 変更後
const s3Key = await this.storageService.uploadFile(organizationId, filePath, file.buffer, {
  contentType: file.mimetype,
  uploadedBy: userId,
  uploadBatchId: batch.batchId,
  uploadSource: 'web_upload',
  uploadMethod: 'single',
});
// 全ファイル登録は storageService 内で自動実施
```

#### ② `saveFileMetadata()` プライベートメソッドを丸ごと削除

約45行のプライベートメソッドを削除。

#### ③ `createEmptyFolderPlaceholders()` の修正

`uploadFile()` に `uploadedBy: 'system'` を追加、`saveFileMetadata()` 呼び出し（try/catch ブロックごと）を削除。

```typescript
// 変更前
await this.storageService.uploadFile(organizationId, placeholderKey, placeholderContent, { contentType: 'text/plain' });
try {
  await this.saveFileMetadata({ ..., userId: 'system', ... });
} catch (dbError) {
  console.warn(...);
}

// 変更後
await this.storageService.uploadFile(organizationId, placeholderKey, placeholderContent, {
  contentType: 'text/plain',
  uploadedBy: 'system',
});
```

---

## 動作の変化

### 変更前

```
uploadFile() → ストレージ保存のみ
各サービス → 個別に insertFileMetadata() / saveFileMetadata() を呼び出し
           → MAIMLファイルのみ登録（fileAccessService）
           → 重複チェックなし
```

### 変更後

```
uploadFile(options.uploadedBy あり) → ストレージ保存 + insertIfNotExists() で自動登録
                                   → 全ファイル種別が登録対象
                                   → ON CONFLICT DO NOTHING で冪等
uploadFile(options.uploadedBy なし) → ストレージ保存のみ（既存の projectService 等は変更不要）
```

---

## テスト確認

```
TypeScript ビルド: Exit code: 0（エラーなし）
```

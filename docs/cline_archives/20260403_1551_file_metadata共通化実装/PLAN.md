# タスク計画書: file_metadata共通化実装（storageService統合）

## メタデータ
- **作成日時**: 2026-04-03 15:51
- **更新日時**: 2026-04-03 15:58
- **タスクID**: file_metadata共通化実装
- **優先度**: 高
- **推定工数**: 4〜5時間

---

## 1. タスク概要

フォーマット管理画面での新規ファイル作成時に `file_metadata` テーブルが未登録になる問題を修正する。

根本対策として `storageService.uploadFile()` の `UploadOptions` に `uploadedBy` 等を追加し、指定された場合に自動で `file_metadata` の INSERT（存在しない場合のみ）を行う共通化対応を実施する。

また、既存の `maimlWriterService` / `maimlService` / `fileAccessService` が個別に行っていた `insertFileMetadata()` 呼び出しも本共通処理に移管し、file_metadata 登録を1箇所に集約する。

---

## 2. 目的と期待される成果

- [ ] フォーマット管理画面でファイル作成 → `file_metadata` にレコードが存在する
- [ ] フォーマット管理画面でファイル更新 → 既存レコードは変化なし（ON CONFLICT DO NOTHING）
- [ ] フォルダマーカー・証明書など登録不要なケースは引き続き登録されない（`uploadedBy` 未指定でスキップ）
- [ ] 既存の `maimlService` / `maimlWriterService` / `fileAccessService` の個別登録処理を削除してもエラーにならない

---

## 3. 実装方針の確定

### UploadOptions に追加するフィールド

```typescript
interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: string;
  // ↓ 追加
  uploadedBy?: string;     // 指定された場合のみ file_metadata を登録
  uploadBatchId?: string;  // 任意（一括アップロード時のみ）
  uploadSource?: string;   // 任意（デフォルト: 'system'）
  uploadMethod?: string;   // 任意（デフォルト: 'single'）
}
```

### storageService 内で自動計算するフィールド

| フィールド | 計算方法 |
|---|---|
| `file_key` | `this.buildKey(organizationId, filePath)` の戻り値 |
| `s3_bucket` | `this.bucketName` |
| `organization_id` | `uploadFile()` の第1引数 |
| `original_filename` | `path.basename(filePath)` |
| `file_size` | `Buffer` → `.length`、`string` → `Buffer.byteLength()`、`Readable` → `0` |
| `file_type` | `options.contentType ?? 'application/octet-stream'` |
| `is_maiml_file` | `filePath.endsWith('.maiml')` |
| `parent_folder_path` | `key.substring(0, key.lastIndexOf('/'))` |

### 登録スキップ条件

- `options.uploadedBy` が未指定（undefined/空文字）→ 登録しない
- `filePath.endsWith('/')` → フォルダマーカーのため登録しない

### エラーハンドリング方針

- DB登録失敗は **非致命的エラー**（`console.warn` して処理続行）
- 理由: S3 保存は成功しているため、`fix-file-metadata-sync.ts` スクリプトで後から補完可能

---

## 4. 実装ステップ

### Phase 1: FileMetadataRepository に `insertIfNotExists()` を追加

- [ ] `backend/src/repositories/fileMetadataRepository.ts` に `insertIfNotExists()` メソッドを追加
  - 既存 `insertFileMetadata()` の動的カラム構築ロジックを流用
  - INSERT文に `ON CONFLICT (file_key) DO NOTHING` を付加
  - 戻り値は `void`

```typescript
async insertIfNotExists(data: Partial<FileMetadata>): Promise<void> {
  const pool = getPool();
  const JSONB_COLUMNS = new Set(['custom_metadata', 'tags', 'search_keywords']);
  const columns: string[] = [];
  const placeholders: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      columns.push(key);
      if (JSONB_COLUMNS.has(key)) {
        placeholders.push(`$${paramIndex}::jsonb`);
        values.push(typeof value === 'string' ? value : JSON.stringify(value));
      } else {
        placeholders.push(`$${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }
  }

  const query = `
    INSERT INTO file_metadata (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    ON CONFLICT (file_key) DO NOTHING
  `;
  await pool.query(query, values);
}
```

### Phase 2: StorageService.uploadFile() に file_metadata 自動登録を追加

- [ ] `UploadOptions` interface に `uploadedBy?` / `uploadBatchId?` / `uploadSource?` / `uploadMethod?` を追加
- [ ] `uploadFile()` の冒頭で `import path from 'path'` を確認（未importなら追加）
- [ ] `uploadFile()` の末尾に file_metadata 登録ロジックを追加

```typescript
// uploadFile() 末尾に追加
if (options?.uploadedBy && !filePath.endsWith('/')) {
  try {
    const fileSize = fileContent instanceof Buffer
      ? fileContent.length
      : typeof fileContent === 'string'
        ? Buffer.byteLength(fileContent, 'utf-8')
        : 0; // Readable Stream の場合は 0

    const repo = new FileMetadataRepository();
    await repo.insertIfNotExists({
      file_key: key,
      s3_bucket: this.bucketName,
      organization_id: organizationId,
      original_filename: path.basename(filePath),
      file_size: fileSize,
      file_type: options.contentType ?? 'application/octet-stream',
      uploaded_by: options.uploadedBy,
      is_maiml_file: filePath.endsWith('.maiml'),
      upload_batch_id: options.uploadBatchId,
      upload_source: options.uploadSource ?? 'system',
      upload_method: options.uploadMethod ?? 'single',
      parent_folder_path: key.substring(0, key.lastIndexOf('/')),
    });
  } catch (dbErr) {
    console.warn('[StorageService] file_metadata 登録失敗（処理続行）', dbErr);
  }
}
```

### Phase 3: formatService.ts を修正（Jira課題の直接修正）

- [ ] `createFormatFile()` の引数に `userId: string` を追加
- [ ] `storageService.uploadFile()` の options に `uploadedBy: userId` を追加
- [ ] `updateFormatFile()` の引数に `userId: string` を追加
- [ ] `storageService.uploadFile()` の options に `uploadedBy: userId` を追加
- [ ] `formatController.ts` で `req.user.id`（または `req.userId`）を取得して `userId` に渡す修正

### Phase 4: 既存の個別登録処理を storageService 共通処理に移管

> **注意**: 移管後は既存の `insertFileMetadata()` 呼び出しを削除する。ON CONFLICT DO NOTHING があるため二重登録にはならないが、不要な処理を残さない。

#### 4-1. maimlWriterService.ts の移管

- [ ] バックアップファイル保存時の `storageService.uploadFile()` に `uploadedBy: 'system'` を追加
- [ ] メインファイル保存時の `storageService.uploadFile()` に `uploadedBy: 'system'` を追加
- [ ] 既存の `fileMetadataRepository.insertFileMetadata({ file_key: backupKey, ... })` 呼び出しを削除
- [ ] 既存の `fileMetadataRepository.insertFileMetadata({ file_key: mainKey, ... })` 呼び出しを削除
- [ ] `updateFileMetadata()` の呼び出しは引き続き維持（更新処理は各サービスが担当）

#### 4-2. maimlService.ts の移管

- [ ] `saveMaiML()` 内の `storageService.uploadFile()` 呼び出しに `uploadedBy: userId` を追加
  （`userId` は `saveMaiML()` の引数として既に存在するか確認）
- [ ] 既存の `fileMetadataRepository.insertFileMetadata(newMetadata)` 呼び出しを削除
- [ ] アーカイブファイルの `storageService.uploadFile()` に `uploadedBy: 'system'` を追加
- [ ] 既存のアーカイブ用 `insertFileMetadata()` 呼び出しを削除

#### 4-3. fileAccessService.ts の移管

- [ ] `uploadFiles()` 内の `storageService.uploadFile()` 呼び出しに以下を追加:
  - `uploadedBy: userId`
  - `uploadBatchId: batchName`
  - `uploadSource: 'web_upload'`
  - `uploadMethod: 'single'`
- [ ] 既存の `this.saveFileMetadata({ ... })` 呼び出しを削除
- [ ] `saveFileMetadata()` プライベートメソッド自体も削除（不要になるため）
- [ ] `isMaimlFile()` の条件分岐（MAIMLのみ登録）を撤廃し、全ファイルを登録対象に

### Phase 5: 動作確認・テスト

- [ ] フォーマット管理画面でXMLファイルを新規作成 → `file_metadata` にレコード確認
- [ ] 同ファイルを更新 → file_metadata レコードが変化しないことを確認
- [ ] MAIMLエディタで保存 → エラーなし、file_metadata に登録確認
- [ ] フォルダ作成（`/`終わり）→ file_metadata に登録されていないことを確認
- [ ] 証明書保存 → file_metadata に登録されていないことを確認

---

## 5. 影響範囲

### 変更するファイル
1. `backend/src/repositories/fileMetadataRepository.ts` — `insertIfNotExists()` メソッド追加
2. `backend/src/services/storageService.ts` — `UploadOptions` 拡張、`uploadFile()` に file_metadata 登録ロジック追加
3. `backend/src/services/formatService.ts` — `createFormatFile()` / `updateFormatFile()` に `userId` 追加
4. `backend/src/controllers/formatController.ts` — `userId` を `req.user.id` から取得して渡す修正
5. `backend/src/services/maimlWriterService.ts` — `uploadFile()` に `uploadedBy` 追加、個別 INSERT 削除
6. `backend/src/services/maimlService.ts` — `uploadFile()` に `uploadedBy` 追加、個別 INSERT 削除
7. `backend/src/services/fileAccessService.ts` — `uploadFile()` に `uploadedBy` 等追加、`saveFileMetadata()` 削除

### 新規作成するファイル
なし

### 影響を受けない処理

| サービス | 処理 | 理由 |
|---|---|---|
| `projectService.ts` | フォルダ作成 | `uploadedBy` 未指定のためスキップ継続 |
| `certificateService.ts` | 証明書保存 | `uploadedBy` 未指定のためスキップ継続 |

---

## 6. 技術的詳細

### file_key の形式
```
{organizationId}/{filePath}
例: 550e8400-e29b-41d4-a716-446655440000/formats/dept_001/material/template1.xml
```

### ON CONFLICT の動作保証
- `file_key` は `VARCHAR(500) PRIMARY KEY` → UNIQUE制約あり
- `ON CONFLICT (file_key) DO NOTHING` が正しく動作する

### file_size の扱い
- `Buffer` → `fileContent.length`
- `string` → `Buffer.byteLength(fileContent, 'utf-8')`
- `Readable` (Stream) → `0`（後から sync スクリプトで補完可能）

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|---|---|---|---|
| storageService がDB依存になり層の分離が崩れる | 低 | 確実 | `uploadedBy` 未指定時はDB操作なし。分離は実質維持される |
| maimlService / maimlWriterService の移管時に userId が取得できない | 高 | 低 | 既存コードで userId が引数にあるか事前確認。なければ `'system'` で代替 |
| fileAccessService の isMaimlFile 条件撤廃でXMLも登録対象になる | 中 | 確実 | 意図した変更。XML等も管理対象とする仕様確認済み |
| Readable Stream のファイルサイズが 0 になる | 低 | 低 | 現状のアップロードは主に Buffer/string。0 で許容 |

---

## 8. テスト計画

### 確認SQL
```sql
-- フォーマットファイルのメタデータ確認
SELECT file_key, original_filename, file_size, uploaded_by, upload_source, created_at
FROM file_metadata
WHERE file_key LIKE '%/formats/%'
ORDER BY created_at DESC;

-- 全ファイル確認
SELECT file_key, original_filename, uploaded_by, is_maiml_file, upload_source
FROM file_metadata
ORDER BY created_at DESC
LIMIT 20;
```

---

## 9. 承認記録
- **計画書提示日時**: 2026-04-03 15:58
- **承認日時**: 
- **承認者コメント**: 

# 調査レポート: file_metadata に組織IDなし file_key レコードが増殖する問題

**調査日時**: 2026-05-18  
**調査者**: Cline  

---

## 1. 問題の概要

ProjectManagementでMAIMLファイルをアップロードすると、  
`projects/ito1/Raman.maiml` のように**組織IDプレフィックスが付いていない file_key** で  
`file_metadata` レコードが新規INSERT される。

バリデーション結果（`maiml_analysis_status` 等）は組織IDなしレコードに書き込まれるが、  
正規の組織ID付きレコード（`{org_id}/projects/ito1/Raman.maiml`）も別途存在するため、  
**1回のアップロードで2レコードが増殖**している可能性がある。

---

## 2. file_key の生成ルール

`storageService.uploadFile()` の `buildKey()` メソッドが S3/Swift への実際のキーを生成する。

```typescript
// storageService.ts L155-171
private buildKey(organizationId: string, filePath: string): string {
  const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  // 既にorganizationIdで始まっている場合はそのまま返す（二重設定を防ぐ）
  if (normalizedPath.startsWith(`${organizationId}/`)) {
    return normalizedPath;
  }
  return `${organizationId}/${normalizedPath}`;
}
```

→ `uploadFile()` が返す `fileKey` は常に `{organizationId}/projects/...` 形式になる。

---

## 3. アップロードフロー別の file_metadata 登録経路

MAIMLファイルのアップロードには2経路がある。

### 経路A: 通常アップロード（`POST /api/v1/files/upload`）

1. `fileAccessService.uploadFiles()` が `storageService.uploadFile()` を呼ぶ
2. `storageService.uploadFile()` 内で `repo.insertIfNotExists({ file_key: key, ... })` を実行  
   → **`key` は `buildKey()` が生成した `{org_id}/projects/...` 形式**（正規）
3. さらに MAIMLバリデーション（`analyzeMaiMLFile()`）が呼ばれ、`saveAnalysisResults()` 内で  
   `fileMetadataRepository.updateFileMetadata(analysisResult.fileKey, ...)` が呼ばれる  
   → **`analysisResult.fileKey` = `filePath`（相対パス）**（← **ここが問題**）

### 経路B: チャンクアップロード（`POST /api/v1/files/chunks/:uploadId/complete`）

1. `chunkUploadService.completeUpload()` が `storageService.uploadFile()` を呼ぶ  
   → ただし `options.uploadedBy` を渡していないため、`storageService` 内の file_metadata 自動登録は**スキップ**
2. `completeChunkUpload()` が `repository.insertFileMetadata({ file_key: result.fileKey, ... })` を実行  
   → **`result.fileKey` は `storageService.uploadFile()` の戻り値 = `{org_id}/projects/...` 形式**（正規）
3. MAIMLバリデーションは `analyzeMaiMLFile()` が別途（fileAccessController内の`ingestSingleFileAsync`経由）呼ばれ、  
   `saveAnalysisResults()` 内で `updateFileMetadata(analysisResult.fileKey, ...)` が呼ばれる  
   → **`analysisResult.fileKey` = `filePath`（相対パス）**（← **ここが問題**）

---

## 4. 根本原因

### `maimlParser.ts` の `saveAnalysisResults()` における file_key の不一致

`analyzeMaiMLFile()` は呼び出し元から `fileKey` を受け取る。  
呼び出し箇所（`fileAccessService.ts` L513）を見ると：

```typescript
// fileAccessService.ts L498-514
const filePath = `${normalizedPath}/${sanitizedRelativePath}`;

const analysisResult = await analyzeMaiMLFile(
  organizationId,
  content,
  filePath,   // ← "projects/ito1/Raman.maiml" 形式（組織IDなし）
  false,
  'lenient'
);
```

`filePath` は `normalizedPath`（`projects/ito1`）+ `sanitizedRelativePath`（`Raman.maiml`）の結合であり、  
**`organizationId` プレフィックスは含まれていない**。

`saveAnalysisResults()` 内では:

```typescript
// maimlParser.ts L221
const existingMetadata = await fileMetadataRepository.getFileMetadataByFileKey(analysisResult.fileKey);
// → "projects/ito1/Raman.maiml" で検索 → 存在しない（正規は "{org_id}/projects/ito1/Raman.maiml"）

if (!existingMetadata) {
  // ↓ ファイルが "存在しない" と判定 → 新規INSERTしてしまう
  await fileMetadataRepository.insertFileMetadata({
    file_key: analysisResult.fileKey,  // "projects/ito1/Raman.maiml"（組織IDなし）
    organization_id: organizationId,
    ...
  });
}
```

**`getFileMetadataByFileKey()` が `organization_id` フィルタなしで `file_key` のみで検索している**ため、  
正規の `{org_id}/projects/ito1/Raman.maiml` というレコードは「別のキー」として扱われ、  
組織IDなしの `projects/ito1/Raman.maiml` で新規INSERTが走る。

その後のバリデーション結果の UPDATE も組織IDなしの `file_key` に対して実行されるため、  
**バリデーション結果は組織IDなしレコードにのみ記録され、正規レコードには反映されない**。

---

## 5. 問題箇所の整理

| # | ファイル | 行 | 問題内容 |
|---|---|----|---------|
| 1 | `backend/src/utils/maimlParser.ts` | L38, L512-513 | `analyzeMaiMLFile()` に渡す `fileKey` が相対パス（組織IDなし） |
| 2 | `backend/src/utils/maimlParser.ts` | L221-249 | `saveAnalysisResults()` が組織IDなし `file_key` で検索→新規INSERT |
| 3 | `backend/src/utils/maimlParser.ts` | L264-267 | `updateFileMetadata()` も組織IDなし `file_key` で UPDATE |
| 4 | `backend/src/services/fileAccessService.ts` | L510-515 | `analyzeMaiMLFile()` 呼び出し時の `filePath` が相対パス |

---

## 6. 呼び出しフロー（通常アップロード）

```
POST /api/v1/files/upload
  └─ fileAccessController.uploadFiles()
       └─ fileAccessService.uploadFiles()
            ├─ storageService.uploadFile(organizationId, filePath, ...)
            │    └─ buildKey() → key = "{org_id}/projects/ito1/Raman.maiml"
            │    └─ repo.insertIfNotExists({ file_key: key })  ← 正規レコード作成
            │
            ├─ analyzeMaiMLFile(organizationId, content, filePath)
            │    └─ filePath = "projects/ito1/Raman.maiml"  ← 組織IDなし
            │    └─ saveAnalysisResults(organizationId, { fileKey: "projects/ito1/Raman.maiml" })
            │         ├─ getFileMetadataByFileKey("projects/ito1/Raman.maiml") → null（存在しない）
            │         └─ insertFileMetadata({ file_key: "projects/ito1/Raman.maiml" })  ← 不正レコード作成
            │
            └─ storageService.uploadFile() 内 updateFileMetadata(key, { project_uuid })  ← 正規レコード更新
```

---

## 7. 修正方針

### 方針1（推奨）: `analyzeMaiMLFile()` に渡す `fileKey` を組織ID付きに統一

`fileAccessService.ts` で `analyzeMaiMLFile()` を呼ぶ際に、
`filePath` ではなく `storageService.buildKey()` 相当の完全キーを渡す。

```typescript
// 現状（問題あり）
const analysisResult = await analyzeMaiMLFile(organizationId, content, filePath, false, 'lenient');

// 修正案
const fullFileKey = `${organizationId}/${filePath}`;
const analysisResult = await analyzeMaiMLFile(organizationId, content, fullFileKey, false, 'lenient');
```

### 方針2: `saveAnalysisResults()` 内で file_key に組織IDプレフィックスを付与

`maimlParser.ts` の `saveAnalysisResults()` 内で、  
`file_key` が組織IDプレフィックスで始まっていない場合に付与する。

```typescript
// 組織IDプレフィックスを付与（冪等）
const normalizedFileKey = analysisResult.fileKey.startsWith(`${organizationId}/`)
  ? analysisResult.fileKey
  : `${organizationId}/${analysisResult.fileKey}`;

const existingMetadata = await fileMetadataRepository.getFileMetadataByFileKey(normalizedFileKey);
```

### 推奨: 方針1 + 既存不正レコードのクリーンアップ

- 方針1で根本修正（呼び出し元で統一）
- 既存の組織IDなしレコードをDBから削除または正規レコードへマージするスクリプトを実行

---

## 8. 既存不正レコードの確認SQL

```sql
-- 組織IDなしの file_key を持つ file_metadata レコードを確認
SELECT file_key, organization_id, created_at, maiml_analysis_status
FROM file_metadata
WHERE file_key NOT LIKE '%-%-%-%-%/%'  -- UUID形式（org_id）で始まらないもの
  AND file_key LIKE 'projects/%'
ORDER BY created_at DESC;

-- 正規レコード（組織ID付き）との対比
SELECT 
  a.file_key AS invalid_key,
  b.file_key AS valid_key,
  a.maiml_analysis_status AS invalid_status,
  b.maiml_analysis_status AS valid_status
FROM file_metadata a
JOIN file_metadata b 
  ON b.file_key = a.organization_id || '/' || a.file_key
WHERE a.file_key LIKE 'projects/%';
```

---

---

# 調査レポート②: チャンクアップロードの file_type / file_extension 問題

---

## 1. 問題の概要

チャンクアップロード（`POST /api/v1/files/chunks/:uploadId/complete`）で登録される  
`file_metadata` レコードにおいて:

- `file_type` が常に `application/octet-stream` に固定される
- `file_extension` カラムが未設定（NULL）のまま

---

## 2. file_type が application/octet-stream に固定される原因

### フロントエンド側（根本原因）

`frontend/src/services/fileAccessService.ts` でチャンクアップロード開始・完了時に
`file.type || 'application/octet-stream'` を contentType として送信している:

```typescript
// frontend/src/services/fileAccessService.ts（initSession 呼び出し部分）
contentType: file.type || 'application/octet-stream',

// frontend/src/services/fileAccessService.ts（completeUpload 呼び出し部分）
contentType: file.type || 'application/octet-stream',
```

**`.maiml` ファイルはブラウザが MIME タイプを認識しない拡張子**であるため、
`File.type` が空文字列 `''` になる。  
→ `|| 'application/octet-stream'` のフォールバックが常に発動し、
バックエンドには `application/octet-stream` が送られる。

### バックエンド側の処理

`fileAccessController.ts` L1004 で受け取った contentType をそのまま使用:

```typescript
const contentType: string = req.body.contentType || 'application/octet-stream';
```

L1075 で `file_type: result.contentType` として DB に保存:

```typescript
await repository.insertFileMetadata({
  ...
  file_type: result.contentType,  // ← "application/octet-stream" が入る
  ...
});
```

`isMaimlFile` の判定は拡張子ベースで正しく動いているが、`file_type` には反映されない:

```typescript
// L1064
const isMaimlFile = result.contentType === 'application/xml' || fileName.endsWith('.maiml');
// → isMaimlFile = true（ファイル名判定で正しく true になる）
// → しかし file_type は 'application/octet-stream' のまま
```

---

## 3. file_extension カラムが未設定の原因

`fileAccessController.ts` の `completeChunkUpload()` L1070-1088 で  
`insertFileMetadata()` を呼んでいるが `file_extension` を設定していない:

```typescript
await repository.insertFileMetadata({
  organization_id: organizationId,
  file_key: ...,
  original_filename: fileName,
  file_size: result.fileSize,
  file_type: result.contentType,   // ← 問題①: octet-stream固定
  uploaded_by: userId,
  is_maiml_file: isMaimlFile,
  ...
  // file_extension が未設定 ← 問題②
});
```

対照的に、`maimlParser.ts` の `saveAnalysisResults()` では `file_extension: 'maiml'` を設定している。  
→ チャンクアップロードでは `maimlParser` の `saveAnalysisResults()` を経由しないため、  
　`file_extension` が設定されない。

---

## 4. 修正方針

### file_type の修正

**方針A（推奨）: フロントエンドで拡張子からMIMEタイプを補完する**

```typescript
// frontend/src/services/fileAccessService.ts
function getMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    maiml: 'application/xml',
    xml: 'application/xml',
    csv: 'text/csv',
    json: 'application/json',
    txt: 'text/plain',
  };
  return mimeMap[ext ?? ''] || 'application/octet-stream';
}

// 使用箇所（init/completeともに）
contentType: getMimeType(file),
```

**方針B: バックエンドで拡張子からMIMEタイプを補完する**

`fileAccessController.ts` の `completeChunkUpload()` 内で補完:

```typescript
// ファイル名の拡張子から補完
function resolveMimeType(fileName: string, contentType: string): string {
  if (contentType !== 'application/octet-stream') return contentType;
  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    maiml: 'application/xml',
    xml: 'application/xml',
    csv: 'text/csv',
    json: 'application/json',
    txt: 'text/plain',
  };
  return mimeMap[ext ?? ''] || contentType;
}
const resolvedContentType = resolveMimeType(fileName, result.contentType);
```

### file_extension の修正

`completeChunkUpload()` の `insertFileMetadata()` 呼び出しに `file_extension` を追加:

```typescript
const fileExt = fileName.includes('.')
  ? fileName.split('.').pop()?.toLowerCase() || null
  : null;

await repository.insertFileMetadata({
  ...
  file_extension: fileExt,   // 追加
  ...
});
```

---

## 5. 影響範囲

| カラム | 通常アップロード | チャンクアップロード |
|--------|----------------|---------------------|
| `file_type` | `application/xml`（正常） | `application/octet-stream`（誤り） |
| `file_extension` | `maiml`（maimlParser経由で設定） | NULL（未設定） |
| `is_maiml_file` | `true`（正常） | `true`（正常） |

---

---

# 調査レポート③: file_metadata テーブルの不要カラム調査

---

## 1. カラム使用状況一覧

> **調査方法**: `backend/src/utils/maimlParser.ts` の `saveAnalysisResults()` 実装を直接確認。  
> `maimlMetadataExtractor.ts` が file_metadata に書き込む箇所は **0件**（別テーブルに保存している）。

### maimlParser.ts の saveAnalysisResults() が file_metadata に実際に設定するカラム

**INSERT時（レコードなしの場合）:**
`file_type`, `file_extension`, `is_maiml_file`, `maiml_analysis_status`,  
`maiml_error_count`, `maiml_warning_count`, `maiml_transitions_count`,  
`maiml_places_count`, `maiml_version`, `maiml_last_analyzed`,  
`uploaded_by`, `upload_source`, `s3_bucket`

**UPDATE時（既存レコードの場合）:**
`maiml_analysis_status`, `maiml_error_count`, `maiml_warning_count`,  
`maiml_transitions_count`, `maiml_places_count`, `maiml_version`, `maiml_last_analyzed`

### カラム判定一覧

| カラム | 実際の使用状況 | 判定 |
|--------|--------------|------|
| `file_key` | 全処理で使用（PRIMARY KEY） | **必須** |
| `s3_bucket` | insertFileMetadataで設定 | **必須** |
| `organization_id` | 全処理で使用 | **必須** |
| `original_filename` | 全処理で使用 | **必須** |
| `file_size` | 全処理で使用 | **必須** |
| `file_type` | insertFileMetadataで設定（問題②参照） | **使用中** |
| `file_extension` | maimlParser.ts INSERT時のみ設定、チャンクは未設定 | **使用中（要修正）** |
| `is_maiml_file` | 全アップロード処理で設定 | **必須** |
| `maiml_analysis_status` | maimlParser.ts で設定 | **使用中** |
| `maiml_error_count` | maimlParser.ts で設定 | **使用中** |
| `maiml_warning_count` | maimlParser.ts で設定 | **使用中** |
| `maiml_version` | maimlParser.ts で設定 | **使用中** |
| `maiml_transitions_count` | maimlParser.ts で設定 | **使用中** |
| `maiml_places_count` | maimlParser.ts で設定 | **使用中** |
| `maiml_validation_result` | **❌ maimlParser.ts で設定していない**。解析結果は `maiml_analysis_results` テーブルに保存 | **🗑️ 削除候補** |
| `maiml_last_analyzed` | maimlParser.ts で設定 | **使用中** |
| `last_edit_timestamp` | 型定義にあるが設定コードなし | **🗑️ 削除候補** |
| `uploaded_by` | 全処理で設定（必須） | **必須** |
| `create_user_id` | insertFileMetadataで設定 | **使用中** |
| `update_user_id` | insertFileMetadataで設定 | **使用中** |
| `created_at` | 自動設定 | **必須** |
| `updated_at` | 自動設定 | **必須** |
| `custom_metadata` | **❌ maimlParser.tsで設定していない**。型定義にあるが実際の設定コードなし | **🗑️ 削除候補** |
| `tags` | **❌ maimlParser.tsで設定していない**。型定義にあるが実際の設定コードなし | **🗑️ 削除候補** |
| `search_keywords` | **❌ maimlParser.tsで設定していない**。型定義にあるが実際の設定コードなし | **🗑️ 削除候補** |
| `description` | 型定義にあるが設定コードなし | **🗑️ 削除候補** |
| `file_hash` | チャンクアップロードで設定 | **使用中** |
| `parent_folder_path` | チャンクアップロードで設定 | **使用中** |
| `maiml_document_uuid` | `maimlMetadataExtractor.ts` が file_metadata に書き込む箇所なし（confirmed 0件） | **🗑️ 削除候補** |
| `maiml_document_name` | 同上 | **🗑️ 削除候補** |
| `maiml_document_description` | 同上 | **🗑️ 削除候補** |
| `maiml_measurement_values` | 同上 | **🗑️ 削除候補** |
| `maiml_units` | 同上 | **🗑️ 削除候補** |
| `maiml_section_types` | 同上 | **🗑️ 削除候補** |
| `maiml_ids` | 同上 | **🗑️ 削除候補** |
| `maiml_refs` | 同上 | **🗑️ 削除候補** |
| `maiml_keys` | 同上 | **🗑️ 削除候補** |
| `maiml_elements` | 同上 | **🗑️ 削除候補** |
| `maiml_values` | 同上 | **🗑️ 削除候補** |
| `maiml_metadata_extracted_at` | 同上 | **🗑️ 削除候補** |
| `maiml_metadata_extraction_status` | 同上 | **🗑️ 削除候補** |
| `upload_batch_id` | チャンクアップロードで使用 | **使用中** |
| `upload_source` | insertFileMetadataで設定 | **使用中** |
| `upload_method` | insertFileMetadataで設定 | **使用中** |
| `s3_storage_class` | DEFAULT値 `'STANDARD'` のみ。更新コードなし | **🗑️ 削除候補** |
| `s3_etag` | 型定義にあるが設定コードなし | **🗑️ 削除候補** |
| `project_uuid` | maimlParser.ts と storageService.ts で使用 | **使用中** |

---

## 2. 削除候補カラム（確定）

| # | カラム | 理由 |
|---|--------|------|
| 1 | `maiml_validation_result` | 解析結果は別テーブル `maiml_analysis_results` に保存。file_metadataには書き込みなし |
| 2 | `last_edit_timestamp` | コード上で設定・更新している箇所が一切ない |
| 3 | `s3_etag` | コード上で設定している箇所が一切ない |
| 4 | `s3_storage_class` | DEFAULT値のみ。使い分け・更新コードなし |
| 5 | `description` | コード上で設定している箇所が一切ない |
| 6 | `custom_metadata` | 型定義・JSONB_COLUMNS定義はあるが実際に値を設定しているコードなし |
| 7 | `tags` | 同上 |
| 8 | `search_keywords` | 同上 |
| 9〜20 | Phase 2.5の12カラム（`maiml_document_uuid`〜`maiml_metadata_extraction_status`） | `maimlMetadataExtractor.ts` は file_metadata に書き込みなし（0件確認）。別テーブルに保存している |

**合計: 最大20カラムが削除候補**

---

## 3. 備考

- `custom_metadata`, `tags`, `search_keywords` は `insertFileMetadata` / `updateFileMetadata` の  
  JSONB_COLUMNS リストには含まれているが、実際にそれらの値を渡して呼び出しているコードが存在しない  
- Phase 2.5 の12カラムは `maimlMetadataExtractor.ts` で型定義・抽出ロジックが存在するが、  
  file_metadata テーブルへの保存コードは実装されていない（将来実装予定のまま放置）

---

## 9. まとめ

| 項目 | 内容 |
|------|------|
| **根本原因** | `analyzeMaiMLFile()` に渡す `fileKey` が相対パス（組織IDなし）であり、`saveAnalysisResults()` が正規レコードを見つけられず新規INSERTする |
| **影響** | アップロードのたびに組織IDなし file_key のレコードが増殖。バリデーション結果は不正レコードにのみ記録 |
| **修正箇所** | `fileAccessService.ts` で `analyzeMaiMLFile()` に渡す `fileKey` を `organizationId + "/" + filePath` 形式に変更 |
| **既存データ** | 組織IDなしレコードの削除 or 正規レコードへのマージが必要 |

# ファイルアップロード機能仕様（Part 2）

## 5. フロントエンド実装詳細

### 5.1 useBulkUploadフック
```javascript
const {
  uploadSingleFile,
  uploadBulkFiles,
  uploadFolderWithStructure,
  isUploading,
  uploadProgress
} = useBulkUpload();
```

### 5.2 単一ファイルアップロード
```javascript
const result = await uploadSingleFile(file, targetFolder);
```

### 5.3 一括ファイルアップロード
```javascript
const result = await uploadBulkFiles(files, {
  targetFolder,
  batchName,
  preserveFolderStructure
});
```

### 5.4 フォルダアップロード
```javascript
const result = await uploadFolderWithStructure(files, {
  folderName,
  basePath,
  preserveStructure
});
```

## 6. ファイル選択方法

### 6.1 クリック選択（単一/一括）
```html
<input
  type="file"
  multiple={uploadMode !== 'single'}
  accept=".maiml,.xml,.json,.txt,.csv,.png,.jpg,.jpeg,.gif,.pdf"
/>
```

### 6.2 フォルダ選択
```html
<input
  type="file"
  webkitdirectory=""
  directory=""
  multiple
/>
```

### 6.3 ドラッグ&ドロップ
```javascript
<div
  onDragEnter={handleDragEnter}
  onDragOver={handleDragOver}
  onDrop={handleDrop}
>
  {/* ドロップゾーン */}
</div>
```

## 7. S3パス構造
```
org_{organization_prefix}/projects/{project_name}/
└── {targetFolder}/
    ├── file1.csv
    ├── file2.json
    └── subfolder/  (preserveFolderStructure時)
        └── file3.txt
```

## 8. file_metadataテーブル連携

アップロード成功時、自動的にfile_metadataテーブルに記録：

```sql
INSERT INTO file_metadata (
  organization_id,
  file_id,
  bucket_name,
  object_key,
  file_name,
  file_type,
  file_size,
  content_type,
  metadata_json
) VALUES (...);
```

## 9. エラーハンドリング

### 9.1 ファイルサイズ超過
```json
{
  "success": false,
  "error": {
    "code": "FILE_SIZE_EXCEEDED",
    "message": "ファイルサイズが100MBを超えています"
  }
}
```

### 9.2 ファイル数超過
```json
{
  "success": false,
  "error": {
    "code": "FILE_COUNT_EXCEEDED",
    "message": "ファイル数が100を超えています"
  }
}
```

### 9.3 不正なファイル種別
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "許可されていないファイル形式です"
  }
}

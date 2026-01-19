# ファイルアップロード機能仕様（Part 1）

**参考元**: `reference/frontend/src/components/ExperimentManager/components/BulkUploadManager.js`

## 1. アップロードモード

### 1.1 単一ファイル（single）
- 1ファイルのみアップロード
- バッチ名自動生成: `Single Upload: {filename}`

### 1.2 一括ファイル（bulk）
- 複数ファイル同時アップロード
- フォルダ構造保持オプション有
- バッチ名自動生成: `Bulk Upload {count} files`

### 1.3 フォルダ（folder）
- フォルダ階層を保持
- webkitRelativePathを使用
- バッチ名自動生成: `Folder Upload: {foldername}`

## 2. API仕様

### エンドポイント
```
POST /api/v1/projects/:projectId/files/upload
```

### リクエスト（multipart/form-data）
- uploadMode: string（必須）
- targetFolder: string（オプション）
- batchName: string（オプション）
- preserveFolderStructure: boolean（オプション）
- files: File[]（必須）

### レスポンス（単一ファイル）
```json
{
  "success": true,
  "data": {
    "uploadMode": "single",
    "file": {
      "fileId": "uuid",
      "fileName": "string",
      "filePath": "string",
      "fileSize": 15360,
      "contentType": "text/csv"
    }
  }
}
```

### レスポンス（一括/フォルダ）
```json
{
  "success": true,
  "data": {
    "uploadMode": "bulk",
    "summary": {
      "totalFiles": 5,
      "successfulFiles": 5,
      "failedFiles": 0
    },
    "files": []
  }
}
```

## 3. 制約
- 最大ファイルサイズ: 100MB/ファイル
- 最大ファイル数: 100ファイル
- 許可拡張子: .maiml, .xml, .json, .txt, .csv, .png, .jpg, .pdf等

## 4. セキュリティ
- organization_prefix強制適用
- JWT + Session Hybrid認証
- Manager以上の権限必要

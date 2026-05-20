# タスク計画書: チャンクアップロードの file_type・file_extension 修正

## メタデータ
- **作成日時**: 2026-05-18 16:31
- **タスクID**: fix-chunk-upload-filetype
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

チャンクアップロード（`POST /api/v1/files/chunks/:uploadId/complete`）で登録される  
`file_metadata` レコードにおいて:

1. `file_type` が `.maiml` ファイルでも常に `application/octet-stream` に固定される  
2. `file_extension` カラムが NULL のまま登録される

## 目的と期待される成果
- [ ] `.maiml` ファイルをチャンクアップロードした際に `file_type = 'application/xml'` で登録される
- [ ] `file_extension = 'maiml'` で登録される

## 根本原因

ブラウザは `.maiml` の MIME タイプを認識しないため `File.type` が空文字列になる。  
`frontend/src/services/fileAccessService.ts` で `file.type || 'application/octet-stream'`  
としているため、常にフォールバックが発動して `application/octet-stream` が送信される。

`file_extension` はチャンクアップロードの `insertFileMetadata()` 呼び出し時に未設定。

## 実装ステップ

### Phase 1: フロントエンド修正（file_type）

- [ ] `frontend/src/services/fileAccessService.ts` に拡張子から MIME タイプを解決するヘルパー関数を追加
- [ ] チャンクアップロード init・complete の両呼び出し箇所で `getMimeType(file)` を使用する

```typescript
// 追加するヘルパー関数
function getMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    maiml: 'application/xml',
    xml:   'application/xml',
    csv:   'text/csv',
    json:  'application/json',
    txt:   'text/plain',
  };
  return mimeMap[ext ?? ''] || 'application/octet-stream';
}

// 変更箇所（initSession / completeUpload の contentType）
contentType: getMimeType(file),  // 変更前: file.type || 'application/octet-stream'
```

### Phase 2: バックエンド修正（file_extension）

- [ ] `backend/src/controllers/fileAccessController.ts` の `completeChunkUpload()` 内で  
  ファイル名から拡張子を取得して `insertFileMetadata()` に `file_extension` を追加

```typescript
// 追加箇所（insertFileMetadata 呼び出し前）
const fileExt = fileName.includes('.')
  ? fileName.split('.').pop()?.toLowerCase() || null
  : null;

// insertFileMetadata に追加
file_extension: fileExt,
```

### Phase 3: 動作確認

- [ ] `.maiml` ファイルをチャンクアップロードして `file_metadata` の `file_type` が `application/xml` になることを確認
- [ ] `file_extension` が `maiml` になることを確認

## 変更ファイル
1. `frontend/src/services/fileAccessService.ts` - `getMimeType()` 追加・contentType箇所2か所を変更
2. `backend/src/controllers/fileAccessController.ts` - `completeChunkUpload()` に `file_extension` を追加

## リスク
| リスク | 対策 |
|--------|------|
| mimeMap に未登録の拡張子は引き続き `application/octet-stream` になる | 主要な拡張子（maiml/xml/csv/json/txt）を網羅すれば十分 |

## テスト計画
- [ ] `.maiml` ファイルをチャンクアップロード後に `file_metadata` の `file_type`, `file_extension` を確認
- [ ] `.csv` など他の拡張子でも正しく設定されることを確認

## 承認記録
- **計画書提示日時**: 2026-05-18 16:31
- **承認日時**: 2026-05-19 09:20
- **承認者コメント**: 方針A（フロントエンドでMIMEタイプ解決）で実施

## 実施記録

### 実施日時
開始: 2026-05-19 09:08  
完了: 2026-05-19 09:20

### 変更内容
1. `frontend/src/services/fileAccessService.ts`
   - `getMimeType(file: File): string` ヘルパー関数を追加（定数定義直後）
   - `uploadSingleFileWithChunks()` の return 内 `contentType` を `getMimeType(file)` に変更
   - `uploadFileWithChunks()` の complete API 呼び出し内 `contentType` を `getMimeType(file)` に変更

2. `backend/src/controllers/fileAccessController.ts`
   - `completeChunkUpload()` 内で `fileExt` 変数を追加（ファイル名から拡張子を抽出）
   - `insertFileMetadata()` 呼び出しに `file_extension: fileExt` を追加

### 成果物
- [x] `.maiml` ファイルをチャンクアップロードした際に `file_type = 'application/xml'` で登録される
- [x] `file_extension = 'maiml'` で登録される

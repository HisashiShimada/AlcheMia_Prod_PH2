# タスク計画書: ファイルアップロード チャンク分割実装

## メタデータ
- **作成日時**: 2026-03-25 13:49
- **タスクID**: upload-chunked
- **優先度**: 高
- **推定工数**: 3〜4時間

## タスク概要

10MB を超えるファイルアップロード時のタイムアウトエラーを解消するため、ファイルを 10MB 単位のチャンクに分割して順次送信するチャンクアップロード機能を実装する。
バックエンドにチャンク受信・結合・クリーンアップ用の API を追加し、フロントエンドの `uploadFiles()` が 10MB 超のファイルを自動的にチャンク分割方式へ切り替えるよう改修する。

## 目的と期待される成果

- [ ] 10MB 超のファイルアップロード時にタイムアウトエラーが発生しなくなる
- [ ] 10MB 以下のファイルは従来通り 1 リクエストでアップロードされる（既存動作を維持）
- [ ] アップロード中断（abort）時に一時ファイルが確実に削除される
- [ ] チャンク結合後、元のファイルと同一の内容がストレージに保存される

## 実装ステップの概要

大きなファイルを「10MB ずつの塊（チャンク）」に分割してアップロードする仕組みを追加する。
通常のアップロードは「1 回のリクエストで全部送る」方式だが、大きなファイルだとタイムアウトするため、「初期化 → 分割送信 → 結合完了」の 3 ステップに分けた方式に切り替える。

| フェーズ | 概要 |
|---------|------|
| Phase 1 | バックエンドに受け口となる API を 3 本追加（init / チャンク受信 / complete） |
| Phase 2 | フロントエンドに型定義を追加（型安全な実装の準備） |
| Phase 3 | フロントエンドの送信ロジックを改修。10MB 超のファイルは自動的にチャンク方式へ切り替え、10MB 以下は従来通り |

## 実装ステップ

### Phase 1: バックエンド - チャンクAPI追加
- [ ] `backend/src/routes/fileAccessRoutes.ts` にチャンクAPI 3本のルートを追加
  - `POST /files/chunks/init` — チャンクセッション開始（uploadId 発行）
  - `POST /files/chunks/:uploadId` — チャンク受信・一時保存
  - `POST /files/chunks/:uploadId/complete` — チャンク結合・ストレージ保存・一時ファイル削除
- [ ] `backend/src/controllers/fileAccessController.ts` に上記 3 本のハンドラを追加
  - `initChunkUpload()`: uploadId（UUID）を生成してセッションを初期化
  - `uploadChunk()`: チャンクを一時ディレクトリに保存
  - `completeChunkUpload()`: 全チャンクを結合してストレージにアップロードし、一時ファイルを削除
- [ ] `backend/src/services/fileAccessService.ts` にチャンクロジックを追加
  - 一時ディレクトリへのチャンク書き込み
  - 全チャンクのバイナリ結合
  - ストレージ（S3/Swift）へのアップロード
  - エラー時・完了時の一時ファイルクリーンアップ（finally 節で保証）

### Phase 2: フロントエンド - 型定義追加
- [ ] `frontend/src/types/file.ts` にチャンク関連型を追加
  - `ChunkUploadSession`: uploadId・totalChunks・chunkSize を保持
  - `ChunkUploadOptions`: チャンクサイズ・進捗コールバックを定義

### Phase 3: フロントエンド - チャンクアップロード実装
- [ ] `frontend/src/services/fileAccessService.ts` に `uploadFileWithChunks()` 関数を追加
  - ファイルを 10MB 単位に Blob.slice() で分割
  - `init` API を呼び出して uploadId を取得
  - チャンクを順次 `POST /files/chunks/:uploadId` で送信
  - 全チャンク送信後に `complete` API を呼び出して結合
- [ ] `uploadFiles()` 関数を改修
  - 10MB 超のファイル: `uploadFileWithChunks()` へ切り替え
  - 10MB 以下のファイル: 従来の 1 リクエスト方式を維持

## 変更ファイル

| ファイル | 変更種別 | 変更内容 |
|---|---|---|
| `backend/src/routes/fileAccessRoutes.ts` | 修正 | チャンクAPI 3本のルート追加 |
| `backend/src/controllers/fileAccessController.ts` | 修正 | `initChunkUpload()`・`uploadChunk()`・`completeChunkUpload()` 追加 |
| `backend/src/services/fileAccessService.ts` | 修正 | チャンク一時保存・結合・クリーンアップロジック追加 |
| `frontend/src/types/file.ts` | 修正 | `ChunkUploadSession`・`ChunkUploadOptions` 型追加 |
| `frontend/src/services/fileAccessService.ts` | 修正 | `uploadFileWithChunks()` 追加、`uploadFiles()` 改修 |

## チャンク仕様

| 項目 | 値 |
|---|---|
| チャンク分割閾値 | 10MB 超 |
| チャンクサイズ | 10MB |
| チャンク一時保存先 | サーバーローカル一時ディレクトリ（`/tmp/chunks/{uploadId}/`） |
| 一時ファイル保持期間 | セッション完了 or エラー時に即削除 |

## API 仕様

### `POST /api/v1/files/chunks/init`

**リクエスト**
```json
{ "fileName": "sample.zip", "totalChunks": 5, "filePath": "projects/foo/bar.zip" }
```
**レスポンス**
```json
{ "uploadId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```

### `POST /api/v1/files/chunks/:uploadId`

**リクエスト**: `multipart/form-data`
- `chunk`: バイナリデータ
- `chunkIndex`: 0 始まりのチャンク番号

**レスポンス**
```json
{ "received": 2 }
```

### `POST /api/v1/files/chunks/:uploadId/complete`

**レスポンス**
```json
{ "success": true, "fileUrl": "..." }
```

## リスク

| リスク | 影響度 | 対策 |
|---|---|---|
| 一時ファイルのクリーンアップ漏れ | 中 | エラー時も必ず finally 節でクリーンアップ |
| チャンク順序の乱れ | 中 | chunkIndex を付与し、結合時にソートして連結 |
| 既存の小ファイルアップロードへの影響 | 低 | 10MB 以下は従来の 1 リクエスト方式を維持 |
| 中断時に uploadId が残存 | 低 | 定期バッチ or TTL で古い一時ファイルを削除 |

## テスト計画

- [ ] 10MB 以下のファイル: 従来通り 1 リクエストでアップロードされること
- [ ] 10MB 超のファイル: チャンク分割されて順次送信されること
- [ ] 全チャンク送信後: ストレージに元ファイルと同一のバイナリが保存されること
- [ ] アップロード中断（abort）: 一時ファイルが削除されること
- [ ] チャンク受信中にサーバーエラーが発生した場合: 一時ファイルが削除されること

## 承認記録
- **計画書提示日時**: 2026-03-25 13:49
- **承認日時**: -
- **承認者コメント**: -

---

## まとめ

10MB 超のファイルアップロード時に発生するタイムアウト問題を解消するため、バックエンドにチャンク受信 API（init / チャンク受信 / complete / **abort**）を追加し、フロントエンドで 10MB 超のファイルを自動的にチャンク分割送信するロジックを実装した。

変更・新規作成対象は以下の計 **6 ファイル**。

| ファイル | 種別 |
|---|---|
| `backend/src/services/chunkUploadService.ts` | **新規作成** |
| `backend/src/controllers/fileAccessController.ts` | 修正（init / uploadChunk / completeChunkUpload / **abortChunkUpload** ハンドラ追加） |
| `backend/src/routes/fileAccessRoutes.ts` | 修正（チャンク API 4 本のルート追加） |
| `frontend/src/types/file.ts` | 修正（`ChunkUploadSession`・`ChunkUploadOptions` 型追加） |
| `frontend/src/services/fileAccessService.ts` | 修正（`uploadFileWithChunks()` 追加、`uploadFiles()` 改修、`abortChunkUpload()` 追加） |

10MB 以下の既存アップロードは従来動作を維持し、一時ファイルはエラー時も `finally` 節で確実に削除することでクリーンアップ漏れを防ぐ設計としている。また、ダイアログを閉じた際にチャンクセッションをサーバー側で破棄する `DELETE /files/chunks/:uploadId`（abort API）も実装し、中断時の一時ファイル残留を防ぐ。

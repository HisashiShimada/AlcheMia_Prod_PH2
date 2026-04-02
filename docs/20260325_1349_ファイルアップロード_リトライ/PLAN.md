# タスク計画書: ファイルアップロード リトライ機能実装

## メタデータ
- **作成日時**: 2026-03-25 13:49
- **タスクID**: upload-retry
- **優先度**: 高
- **推定工数**: 2〜3時間

## タスク概要

ファイルアップロード時にサーバーエラー・ネットワークエラー・タイムアウトが発生した場合、自動的に最大3回リトライする機能を実装する。
リトライ間隔は指数バックオフ（1秒→2秒→4秒）とし、HTTP 400/401/403/404 など入力起因のエラーはリトライせず即時エラー表示する。

## 目的と期待される成果

- [ ] ネットワーク一時切断・サーバー一時エラーで自動復旧できる（通常アップロード）
- [ ] リトライ対象外エラー（認証エラー等）は即時エラー表示する
- [ ] ダイアログ上にリトライ中の状態（何回目のリトライか）が表示される
- [ ] 最大リトライ回数を超えた場合はエラーメッセージを表示する
- [ ] チャンクアップロード（>10MB）でも自動リトライが働く
- [ ] バックエンドのストレージ書き込みでも自動リトライが働く（ファイルごと3回）

## 実装ステップ

- [ ] `frontend/src/types/file.ts` に `UploadRetryOptions`・`UploadRetryState` 型を追加
- [ ] `frontend/src/services/fileAccessService.ts` に `isRetryableError()`・`withRetry()` 関数を追加
  - HTTP 500/502/503/504（サーバー一時エラー）→ リトライする
  - ERR_NETWORK（ネットワーク切断）/ ECONNABORTED（タイムアウト）→ リトライする
  - HTTP 400/401/403/404（入力ミス・認証エラー）→ リトライしない（即エラー）
- [ ] `uploadSingleFile()` 内の `/files/upload` POST リクエストを `withRetry()` でラップ
- [ ] `frontend/src/components/project/BulkUploadDialog.tsx` にリトライ状態表示を追加
- [ ] `frontend/src/components/project/FormatUploadDialog.tsx` にリトライ状態表示を追加
- [ ] `uploadFileWithChunks()` 内の各リクエストを `withRetry()` でラップ
  - `/files/chunks/init` POST（セッション開始）
  - `/files/chunks/{uploadId}` POST（各チャンク送信）
  - `/files/csrc/utils/storageRetry.ts` に `withStorageRetry` ヘルパー関数を作成し、`fileAccessService.ts` と `chunkUploadService.ts` の両方から import して使用
  - `storageService.uploadFile()` を `withStorageRetry` でラップ
  - ファイルごとに独立してリトライ（他ファイルへの影響なし）
  - 3回失敗したファイルのみエラーとして記録し、他ファイルの処理は続行
- [ ] `backend/src/services/fileAccessService.ts` の `uploadFiles()` に `file_metadata` INSERT失敗時のS3ロールバック処理を追加
  - S3/Swiftへのアップロード成功後、`saveFileMetadata()` が失敗した場合に `storageService.deleteFile()` を呼び出してストレージ上のファイルを削除する
  - ロールバック（削除）失敗時は警告ログのみ出力し、元のDBエラーを上位へ伝播させる

## 変更ファイル

| ファイル | 変更種別 | 変更内容 | 状態 |
|---|---|---|---|
| `frontend/src/types/file.ts` | 修正 | `UploadRetryOptions`・`UploadRetryState` 型追加 | ✅ 完了 |
| `frontend/src/services/fileAccessService.ts` | 修正 | `withRetry()` 追加、`uploadSingleFile()` 改修、`uploadFileWithChunks()` 改修 | ✅ 完了 |
| `frontend/src/components/project/BulkUploadDialog.tsx` | 修正 | リトライ状態UI追加 | ✅ 完了 |
| `frontend/src/components/project/FormatUploadDialog.tsx` | 修正 | リトライ状態UI追加 | ✅ 完了 |
| `backend/src/utils/storageRetry.ts` | 新規作成 | `isRetryableStorageError()`・`withStorageRetry()` を共通ユーティリティとして切り出し | ✅ 完了 (2026-03-31) |
| `backend/src/services/fileAccessService.ts` | 修正 | `storageService.uploadFile()` を `withStorageRetry` でラップ（実装は `storageRetry.ts` に集約）＋`saveFileMetadata()` 失敗時のS3ロールバック処理を追加 | ✅ ストレージリトライは完了 / ⬜ S3ロールバックは未着手 |
| `backend/src/services/chunkUploadService.ts` | 修正 | `completeUpload()` 内の `storageService.uploadFile()` を `withStorageRetry` でラップ（実装は `storageRetry.ts` に集約） | ✅ 完了 (2026-03-30) |

## リトライ仕様

| 項目 | 値 |
|---|---|
| 最大リトライ回数 | 3回 |
| バックオフ方式 | 指数バックオフ |
| 待機時間 | 1秒 → 2秒 → 4秒 |

## リトライ対象エラー

| エラー | 対応 |
|---|---|
| HTTP 500 / 502 / 503 / 504 | リトライ |
| ネットワークエラー（ERR_NETWORK） | リトライ |
| タイムアウト（ECONNABORTED） | リトライ |
| HTTP 400 / 401 / 403 / 404 | 即時エラー表示（リトライなし） |

## リスク

| リスク | 影響度 | 対策 |
|---|---|---|
| リトライ中に同じファイルが二重登録される | 中 | サーバー側の冪等性を確認、またはアップロード前に重複チェック |
| S3保存成功後にDB保存（`file_metadata` INSERT）が失敗するとS3とDBの不整合が発生する | 高 | `saveFileMetadata()` 失敗時に `storageService.deleteFile()` でS3ファイルをロールバックする |

## 失敗時のエラーメッセージ仕様

エラーメッセージは以下の **2か所** に表示される：
- **画面上部のトースト通知**（Ant Design `message.error()`）
- **ダイアログ内の赤色 Alert**（タイトル: 「アップロードエラー」、説明に下記メッセージ、閉じるボタン付き）

| エラーの種類 | エラーコード | 表示メッセージ |
|---|---|---|
| ネットワーク切断（3回リトライ後） | E3001 | サーバーに接続できません。ネットワークを確認してください |
| タイムアウト（3回リトライ後） | E3002 | リクエストがタイムアウトしました。再度お試しください |
| HTTP 500/502/503/504（3回リトライ後） | E4001 | サーバー内部エラーが発生しました。管理者にお問い合わせください |
| HTTP 403（即時エラー・リトライなし） | E5012 | アクセスが拒否されました |
| HTTP 401（即時エラー・リトライなし） | E5013 | 認証が必要です。再度ログインしてください |
| HTTP 400（即時エラー・リトライなし） | E1003 | 入力内容に誤りがあります |
| HTTP 404（即時エラー・リトライなし） | E6001 | 指定されたリソースが見つかりません |
| ストレージエラー | E4006 | ストレージエラーが発生しました。管理者にお問い合わせください |
| 全ファイル失敗（すべてのファイルが失敗） | E9999 | エラーが発生しました。しばらくしてから再度お試しください |

> **参照**: `frontend/src/utils/errorMapper.ts`、`frontend/src/utils/errorUtils.ts`

## テスト計画

- [ ] ネットワークエラー発生時: 最大3回リトライ後に「サーバーに接続できません。ネットワークを確認してください」が表示されること
- [ ] HTTP 503 発生時: 最大3回リトライ後に「サーバー内部エラーが発生しました。管理者にお問い合わせください」が表示されること
- [ ] HTTP 403 発生時: リトライせずに即座に「アクセスが拒否されました」が表示されること
- [ ] リトライ中: ダイアログに「接続エラーが発生しました。自動リトライ中... (X/3)」が表示されること
- [ ] リトライして成功した場合: 最終的なアップロード結果が「成功」になり、エラーメッセージが表示されないこと
- [ ] `file_metadata` INSERT失敗時（通常アップロード）: S3/Swiftからファイルが削除（ロールバック）されること
- [ ] `file_metadata` INSERT失敗時（通常アップロード）: ロールバック後、エラーがフロントエンドへ返却されること
- [ ] `file_metadata` INSERT失敗時（チャンクアップロード）: S3/Swiftからファイルが削除（ロールバック）されること


## 承認記録
- **計画書提示日時**: 2026-03-25 13:49
- **承認日時**: -
- **承認者コメント**: -

---

## まとめ

サーバーエラー・ネットワークエラー・タイムアウトが発生した際に最大 3 回まで自動リトライするユーティリティ（`withRetry()`）を追加するタスク。指数バックオフ（1秒→2秒→4秒）で再試行し、HTTP 400/401/403/404 などの入力起因エラーはリトライ対象外として即時エラー表示する。

**実装済み:**
- フロントエンド 4 ファイル（型定義・サービス・BulkUploadDialog・FormatUploadDialog）
- 通常アップロード（10MB 以下）の HTTP リクエストにリトライを適用済み
- チャンクアップロード（`uploadFileWithChunks()` 内の init・チャンク送信・complete 各リクエスト）にもリトライ適用済み
- バックエンド共通ユーティリティ `backend/src/utils/storageRetry.ts` に `withStorageRetry` を集約（2026-03-31 共通化）
- バックエンド `backend/src/services/fileAccessService.ts` の `storageService.uploadFile()` を `withStorageRetry` でラップ済み
- バックエンド `backend/src/services/chunkUploadService.ts` の `completeUpload()` 内 `storageService.uploadFile()` を `withStorageRetry` でラップ済み（2026-03-30 追加）
- ダイアログ上には「接続エラーが発生しました。自動リトライ中... (X/3)」を表示し、リトライ中はキャンセルボタンを無効化する

**未着手（追加対応が必要）:**
- `backend/src/services/fileAccessService.ts` の `uploadFiles()` に `file_metadata` INSERT失敗時のS3ロールバック処理を追加（通常アップロード）
  - `saveFileMetadata()` 失敗時に `storageService.deleteFile()` を呼び出してストレージ上のファイルを削除する
  - ロールバック（削除）失敗時は警告ログのみ出力し、元のDBエラーを上位へ伝播させる

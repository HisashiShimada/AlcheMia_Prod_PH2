# エラーコード一覧資料

> **対象ファイル**: `backend/src/enums/errorCodes.ts`  
> **作成日**: 2026-03-25  
> **バージョン**: 1.0

---

## 1. 概要

本システムのエラーコードは `E{カテゴリ番号}{連番}` 形式で統一管理されています。

| カテゴリ | 範囲 | 概要 |
|---------|------|------|
| E1xxx | E1001〜E1009 | CLIENT — クライアント操作・入力エラー |
| E2xxx | E2001〜E2004 | DATA — データ形式・パースエラー |
| E3xxx | E3001〜E3003 | NETWORK — ネットワーク・通信エラー |
| E4xxx | E4001〜E4006 | SERVER — サーバー・システム内部エラー |
| E5xxx | E5001〜E5015 | AUTH — 認証・認可エラー |
| E6xxx | E6001〜E6006 | RESOURCE — リソース不存在・競合 |
| E7xxx | E7001〜E7008 | BUSINESS — 業務ロジックエラー |
| E9xxx | E9999 | UNKNOWN — 不明なエラー |

---

## 2. エラーコード一覧

### E1xxx: CLIENT（クライアント操作・入力エラー）

| コード | 説明 | HTTPステータス | 主な使用箇所 |
|--------|------|---------------|-------------|
| E1001 | ファイルサイズ超過 | 400 | ファイルアップロード系API |
| E1002 | ファイル形式エラー | 400 | ファイルアップロード系API |
| E1003 | バリデーションエラー | 400 | ファイル操作・タスク登録・進捗更新・ユーザー作成など多数 |
| E1004 | 必須項目不足 | 400 | タスクステータス更新、入力バリデーション全般 |
| E1005 | 入力形式エラー | 400 | issueId UUID形式チェック、入力フォーマット検証 |
| E1006 | フォルダ名エラー | 400 | `POST /formats/folders` — フォルダ名が英数字・アンダースコア以外、または1〜255文字外 |
| E1007 | サブフォルダ名エラー | 400 | `POST /formats/subfolders` — サブフォルダ名が英数字・アンダースコア・ハイフン以外、または1〜255文字外 |
| E1008 | コンテンツ形式エラー | 400 | `PUT /formats/files` — ファイル内容が不正 |
| E1009 | フォーマット名未指定 | 400 | `POST /formats/subfolders` — フォーマット名が指定されていない |

---

### E2xxx: DATA（データ形式・パースエラー）

| コード | 説明 | HTTPステータス | 主な使用箇所 |
|--------|------|---------------|-------------|
| E2001 | XMLパース失敗 | 500 | MAIMLファイルのパース処理 |
| E2002 | データ形式エラー | 500 | データ変換処理 |
| E2003 | データ読み込みエラー | 500 | ファイル・DBデータ読み込み |
| E2004 | データ保存エラー | 500 | ファイル・DBデータ保存 |

---

### E3xxx: NETWORK（ネットワーク・通信エラー）

| コード | 説明 | HTTPステータス | 主な使用箇所 |
|--------|------|---------------|-------------|
| E3001 | サーバー接続失敗 | 500 | 外部サービス・ストレージ接続 |
| E3002 | タイムアウトエラー | 500 | 外部API通信タイムアウト |
| E3003 | ネットワークエラー | 500 | ネットワーク通信全般 |

---

### E4xxx: SERVER（サーバー・システム内部エラー）

| コード | 説明 | HTTPステータス | 主な使用箇所 |
|--------|------|---------------|-------------|
| E4001 | サーバー内部エラー | 500 | 全APIの予期しないエラー時デフォルト値 |
| E4002 | データベースエラー | 500 | DB接続・クエリ失敗 |
| E4003 | メール送信失敗 | 500 | `POST /auth/resend-pin` — PIN再送信メール送信失敗 |
| E4004 | JWTトークン生成失敗 | 500 | `POST /auth/refresh` — JWTトークン生成失敗 |
| E4005 | Redisエラー | 500 | `POST /auth/refresh` — Redisアクセス失敗 |
| E4006 | ストレージエラー | 500 | ファイルダウンロード・アップロード・削除時のストレージアクセス失敗 |

---

### E5xxx: AUTH（認証・認可エラー）

| コード | 説明 | HTTPステータス | 主な使用箇所 |
|--------|------|---------------|-------------|
| E5001 | ログイン認証失敗 | 401 | `POST /auth/login` — ユーザーID/パスワード不一致 |
| E5002 | トークン無効・期限切れ | 401 | `POST /auth/resend-pin`, `POST /auth/refresh` — トークン検証失敗 |
| E5003 | PINコード不正 | 401 | `POST /auth/verify-pin` — PINコード不一致 |
| E5004 | PINコード期限切れ | 401 | `POST /auth/verify-pin` — PINコード期限切れ |
| E5005 | PINコード試行回数超過 | 429 | `POST /auth/verify-pin` — PIN検証3回/5分超過 |
| E5006 | アカウント無効 | 403 | `POST /auth/login`, `POST /auth/refresh` — アカウントが無効化されている |
| E5007 | ログイン試行回数超過 | 429 | `POST /auth/login` — ログイン5回/15分超過（レート制限） |
| E5008 | PIN再送信回数超過 | 429 | `POST /auth/resend-pin` — PIN再送信3回/15分超過（レート制限） |
| E5009 | リセットトークン不正 | 400 | `POST /auth/reset-password` — リセットトークン不正 |
| E5010 | リセットトークン期限切れ | 400 | `POST /auth/reset-password` — リセットトークン期限切れ |
| E5011 | リセットトークン使用済み | 400 | `POST /auth/reset-password` — リセットトークン使用済み |
| E5012 | アクセス拒否 | 403 | アクセス拒否 |
| E5013 | 認証必須 | 401 | `POST /projects/:name/tasks/complete-review` — 認証なし |
| E5014 | セッション期限切れ | 401 | セッション期限切れ |
| E5015 | 権限不足 | 403 | プロジェクト作成（Worker不可）、チェックアウト、チェックイン、指示確認、進捗更新など |

---

### E6xxx: RESOURCE（リソース不存在・競合）

| コード | 説明 | HTTPステータス | 主な使用箇所 |
|--------|------|---------------|-------------|
| E6001 | リソース不存在 | 404 | プロジェクト・タスク・指示・Issue等が見つからない場合（全般） |
| E6002 | ファイル不存在 | 404 | `GET /projects/:name/maiml` — MAIMLファイルが存在しない、`PUT /formats/files` — ファイル不存在 |
| E6003 | フォルダ不存在 | 404 | `POST /formats/:folderName/files` — 指定フォルダが存在しない |
| E6004 | 親フォルダ不存在 | 404 | `POST /formats/subfolders` — 親フォルダが存在しない |
| E6005 | ファイル重複 | 409 | `POST /formats/:folderName/files` — ファイルが既に存在する |
| E6006 | フォルダ重複 | 409 | `POST /formats/folders`, `POST /formats/subfolders` — フォルダが既に存在する |

---

### E7xxx: BUSINESS（業務ロジックエラー）

| コード | 説明 | HTTPステータス | 主な使用箇所 |
|--------|------|---------------|-------------|
| E7001 | プロジェクト名重複 | 409 | `POST /projects` — 同名プロジェクトが既に存在する |
| E7002 | プロジェクトチェックアウト中 | 409 | `POST /projects/:name/checkout` — 既に他ユーザーがチェックアウト中、`POST /projects/:name/task-registration` — チェックアウト済み |
| E7003 | MAIMLファイル未登録 | 400 | `POST /projects/:name/task-registration` — MAIMLファイルが未登録 |
| E7004 | 既に確認済み | 400 | `POST /instructions/:id/confirm` — 指示が既に確認済み |
| E7005 | プロジェクト状態不正 | 400 | `POST /projects/:name/checkout` — プロジェクト状態が操作を許可しない、`POST /projects/:name/publish` — タスク結果レビュー待ち状態でない |
| E7006 | プロジェクト指示不存在 | 400 | `POST /projects/:name/checkout` — 指示が存在しない |
| E7007 | タスク作業中 | 400 | `POST /projects/:name/checkin` — タスクが作業中のため操作不可 |
| E7008 | タスク・メソッド不存在 | 404 | `GET /progress/...` — タスクまたはメソッドが見つからない |

---

### E9xxx: UNKNOWN（不明なエラー）

| コード | 説明 | HTTPステータス | 主な使用箇所 |
|--------|------|---------------|-------------|
| E9999 | 予期しないエラー | 500 | 想定外の例外 |

---

## 3. エンドポイント別 エラーコード対応表

### 認証系 (`/api/v1/auth/`)

| エンドポイント | メソッド | 発生しうるエラーコード |
|--------------|---------|----------------------|
| `/auth/login` | POST | E4001, E5001, E5006, E5007（レート制限） |
| `/auth/logout` | POST | E4001 |
| `/auth/verify-pin` | POST | E4001, E5003, E5004, E5005（レート制限） |
| `/auth/resend-pin` | POST | E4001, E4003, E5002, E5008（レート制限） |
| `/auth/refresh` | POST | E4001, E4004, E4005, E5002, E5006 |
| `/auth/reset-password-request` | POST | E4001 |
| `/auth/reset-password` | POST | E4001, E5009, E5010, E5011 |
| `/auth/change-password` | POST | E4001, E6001 |

### プロジェクト系 (`/api/v1/projects/`)

| エンドポイント | メソッド | 発生しうるエラーコード |
|--------------|---------|----------------------|
| `/projects` | GET | E4001, E4002 |
| `/projects` | POST | E4001, E1xxx, E5015, E7001 |
| `/projects/:name/maiml` | GET | E4001, E1xxx, E6001, E6002 |
| `/projects/:name/files` | GET | E4001, E1xxx, E6001 |
| `/projects/:name/tasks` | GET | E4001, E1xxx, E6001 |
| `/projects/:name/checkout` | POST | E4001, E1xxx, E5015, E6001, E7002, E7005, E7006 |
| `/projects/:name/checkin` | POST | E4001, E1xxx, E5015, E6001, E7007 |
| `/projects/:name/approval-request` | PATCH | E4001, E1xxx, E6001, BUSINESS_* |
| `/projects/:name/worker-instructions` | GET | E4001, E1xxx, E4002, E5015, E6001 |
| `/projects/:name/instructions/confirm` | POST | E4001, E1xxx, E4002, E5015, E6001, E7004 |
| `/projects/:name/tasks/complete-review` | POST | E4001, E5013, E6001 |
| `/projects/:name/publish` | POST | E4001, PROJECT_NOT_FOUND, E7005, TASKS_NOT_COMPLETED, ALREADY_IN_PROGRESS, MAIML_NOT_FOUND |
| `/projects/:name/unpublish` | POST | E4001, NOT_PUBLISHED, ALREADY_IN_PROGRESS |

### 進捗系 (`/api/v1/progress/`)

| エンドポイント | メソッド | 発生しうるエラーコード |
|--------------|---------|----------------------|
| `/progress/projects/:name/methods/:methodId/tasks/:taskNo/transitions` | GET | E4001, E1003, E5002, E6001, E7008 |
| `/progress/projects/:name/methods/:methodId/transitions/:id/status` | PATCH | E4001（エラーハンドラ委譲） |
| `/progress/projects/:name/worker-tasks` | GET | E4001, E6001 |
| `/progress/projects/:name/work-details` | GET | E4001, E6001, E7008 |
| `/progress/projects/:name/methods/:methodId/tasks/:taskNo/status` | PATCH | E4001, E1003, E1004, E1005, E4002, E5002, E5015, E6001 |

### フォーマット系 (`/api/v1/formats/`)

| エンドポイント | メソッド | 発生しうるエラーコード |
|--------------|---------|----------------------|
| `/formats` | GET | E4001 |
| `/formats/folders` | POST | E4001, E1006, E6006 |
| `/formats/subfolders` | POST | E4001, E1007, E1009, E6004, E6006 |
| `/formats/:folderName/files` | POST | E4001, E6003, E6005 |
| `/formats/files` | PUT | E4001, E1008, E6002 |

### ファイル操作系 (`/api/v1/files/`)

| エンドポイント | メソッド | 発生しうるエラーコード |
|--------------|---------|----------------------|
| `/files/upload` | POST | E4001, E1003, E4006 |
| `/files/download-url` | POST | E4001, E1003, E4006, E6001 |
| `/files/download-folder-as-zip` | POST | E4001, E1003, E4006, E6001 |
| `/files/content-as-text` | POST | E4001, E1003, E6001 |
| `/files/view-url` | POST | E4001, E6001 |
| `/files/delete` | DELETE | E4001, E1003, E4006, E6001 |

### Issue系 (`/api/v1/issues/`)

| エンドポイント | メソッド | 発生しうるエラーコード |
|--------------|---------|----------------------|
| `/issues` | POST | E4001, E1xxx, E6001, BUSINESS_* |
| `/issues` | GET | E4001, E1xxx, E6001 |
| `/issues/:issueId` | GET | E4001, E1003, E1005, E5002, E6001 |
| `/issues/status` | PATCH | E4001, E1xxx, E5015, E6001 |
| `/issues/comments` | POST | E4001, E1xxx, E6001 |

### タスク登録系 (`/api/experiment_admin/`)

| エンドポイント | メソッド | 発生しうるエラーコード |
|--------------|---------|----------------------|
| `/projects/:name/task-registration` | GET | E4001, E6001 |
| `/projects/:name/task-registration` | POST | E4001, E1003, E6001, E7002, E7003 |

---

## 4. 旧コード → 新コード 変換表（LEGACY_CODE_MAP）

旧コードは移行期間中に存在するコードです。バックエンドは新コードに統一されています。

| 旧コード | 新コード | 説明 |
|---------|---------|------|
| `VALIDATION_ERROR` | E1003 | バリデーションエラー |
| `VALIDATION_REQUIRED_FIELD` | E1004 | 必須フィールド不足 |
| `REQUIRED_FIELD` | E1004 | 必須フィールド不足 |
| `VALIDATION_INVALID_FORMAT` | E1005 | 入力形式エラー |
| `INVALID_FOLDER_NAME` | E1006 | フォルダ名エラー |
| `INVALID_FOLDER_NAME_LENGTH` | E1006 | フォルダ名長エラー |
| `INVALID_SUBFOLDER_NAME` | E1007 | サブフォルダ名エラー |
| `INVALID_SUBFOLDER_NAME_LENGTH` | E1007 | サブフォルダ名長エラー |
| `INVALID_CONTENT` | E1008 | コンテンツ形式エラー |
| `FORMAT_NAME_REQUIRED` | E1009 | フォーマット名未指定 |
| `SYSTEM_ERROR` | E4001 | サーバー内部エラー |
| `SYSTEM_INTERNAL_ERROR` | E4001 | サーバー内部エラー |
| `SYSTEM_DATABASE_ERROR` | E4002 | データベースエラー |
| `SYSTEM_EMAIL_SEND_FAILED` | E4003 | メール送信失敗 |
| `SYSTEM_JWT_GENERATION_FAILED` | E4004 | JWTトークン生成失敗 |
| `SYSTEM_REDIS_ERROR` | E4005 | Redisエラー |
| `STORAGE_ERROR` | E4006 | ストレージエラー |
| `AUTH_INVALID_CREDENTIALS` | E5001 | ログイン認証失敗 |
| `AUTH_TOKEN_EXPIRED` | E5002 | トークン期限切れ |
| `AUTH_TOKEN_INVALID` | E5002 | トークン無効 |
| `AUTH_PIN_INVALID` | E5003 | PINコード不正 |
| `AUTH_PIN_EXPIRED` | E5004 | PINコード期限切れ |
| `AUTH_PIN_MAX_ATTEMPTS` | E5005 | PIN試行回数超過 |
| `AUTH_ACCOUNT_DISABLED` | E5006 | アカウント無効 |
| `AUTH_RATE_LIMIT_EXCEEDED` | E5007 | ログイン試行回数超過 |
| `AUTH_RESEND_LIMIT_EXCEEDED` | E5008 | PIN再送信回数超過 |
| `AUTH_RESET_TOKEN_INVALID` | E5009 | リセットトークン不正 |
| `AUTH_RESET_TOKEN_EXPIRED` | E5010 | リセットトークン期限切れ |
| `AUTH_RESET_TOKEN_USED` | E5011 | リセットトークン使用済み |
| `AUTH_FORBIDDEN` | E5012 | アクセス拒否 |
| `ACCESS_DENIED` | E5012 | アクセス拒否 |
| `AUTH_UNAUTHORIZED` | E5013 | 認証必須 |
| `AUTH_REQUIRED` | E5013 | 認証必須 |
| `AUTH_SESSION_EXPIRED` | E5014 | セッション期限切れ |
| `PERMISSION_INSUFFICIENT` | E5015 | 権限不足 |
| `RESOURCE_NOT_FOUND` | E6001 | リソース不存在 |
| `FILE_NOT_FOUND` | E6002 | ファイル不存在 |
| `FOLDER_NOT_FOUND` | E6003 | フォルダ不存在 |
| `PARENT_FOLDER_NOT_FOUND` | E6004 | 親フォルダ不存在 |
| `FILE_ALREADY_EXISTS` | E6005 | ファイル重複 |
| `FOLDER_ALREADY_EXISTS` | E6006 | フォルダ重複 |
| `BUSINESS_DUPLICATE_PROJECT_NAME` | E7001 | プロジェクト名重複 |
| `BUSINESS_PROJECT_CHECKED_OUT` | E7002 | チェックアウト中 |
| `PROJECT_ALREADY_CHECKED_OUT` | E7002 | チェックアウト中 |
| `BUSINESS_MAIML_NOT_REGISTERED` | E7003 | MAIMLファイル未登録 |
| `BUSINESS_ALREADY_ACKNOWLEDGED` | E7004 | 既に確認済み |
| `PROJECT_STATUS_INVALID` | E7005 | プロジェクト状態不正 |
| `PROJECT_INSTRUCTION_NOT_FOUND` | E7006 | プロジェクト指示不存在 |
| `TASK_IN_PROGRESS` | E7007 | タスク作業中 |
| `TASK_NOT_FOUND` | E7008 | タスク・メソッド不存在 |
| `METHOD_NOT_FOUND` | E7008 | メソッド不存在 |

---

## 5. アドホックなエラーコード（E系以外）

一部のコントローラーでE系以外のコードが使用されています。将来的なE系への統一が推奨されます。

| コード | 説明 | HTTPステータス | 使用箇所 |
|--------|------|---------------|---------|
| `USER_NOT_FOUND` | ユーザーが見つからない | 404 | `GET /systemManagement/user/:userId`, `PUT /user/:userId`, `PATCH /user/:userId/status` |
| `USER_ALREADY_EXISTS` | ユーザーが既に存在する | 409 | `POST /systemManagement/user` |
| `ORGANIZATION_NOT_FOUND` | 組織が見つからない | 404 | `GET /systemManagement/organization/:id`, `PUT /organization/:id`, `PATCH /organization/:id/status` |
| `CERTIFICATE_NOT_FOUND` | 証明書が見つからない | 404 | `GET /provider/organization/:id/certificate` |
| `FILE_REQUIRED` | CSVファイルが必要 | 400 | `POST /systemManagement/user/upload-csv`, `POST /provider/organization/upload-csv` |
| `INVALID_FILE_PATH` | ファイルパスが不正 | 400 | `PUT /formats/files` |
| `PROJECT_NOT_FOUND` | プロジェクトが見つからない | 404 | `POST /projects/:name/publish` |
| `PROJECT_NOT_CHECKED_OUT` | プロジェクトがチェックアウトされていない | 400 | `POST /projects/:name/publish` |
| `TASKS_NOT_COMPLETED` | 未完了タスクが残っている | 400 | `POST /projects/:name/publish` |
| `ALREADY_IN_PROGRESS` | 既に処理中のジョブがある | 409 | `POST /projects/:name/publish`, `POST /projects/:name/unpublish` |
| `MAIML_NOT_FOUND` | MAIMLファイルが存在しない | 400 | `POST /projects/:name/publish` |
| `NOT_PUBLISHED` | 公開済みアセットが存在しない | 404 | `POST /projects/:name/unpublish` |
| `BUSINESS_*` | ビジネスロジックエラー（汎用） | 409 | Issue作成・承認依頼など |
| `BATCH_NOT_FOUND` | バッチが見つからない | 404 | `GET /files/batches/:batchId/progress` |
| `BATCH_FETCH_ERROR` | バッチ履歴取得失敗 | 500 | `GET /files/batches` |
| `BATCH_PROGRESS_ERROR` | バッチ進捗取得失敗 | 500 | `GET /files/batches/:batchId/progress` |
| `AUTH_TOKEN_MISSING` | リフレッシュトークンが未存在 | 401 | `POST /auth/refresh` |
| `CONCURRENT_UPDATE_DETECTED` | 同時更新の競合 | 409 | タスクステータス更新 |
| `INVALID_STATUS_TRANSITION` | 無効なステータス遷移 | 400 | タスクステータス更新 |

---

## 6. レート制限エラーの詳細

レート制限はデータベース（`login_history` / `pin_codes` テーブル）を使用して管理されます。  
**注意**: 開発環境（`NODE_ENV !== 'production'`）ではレート制限はスキップされます。

| コード | エンドポイント | 上限 | 時間窓 | レスポンス |
|--------|--------------|------|--------|-----------|
| E5007 | `POST /auth/login` | 5回 | 15分 | HTTP 429 + `Retry-After` ヘッダー |
| E5005 | `POST /auth/verify-pin` | 3回 | 5分 | HTTP 429 + `Retry-After` ヘッダー |
| E5008 | `POST /auth/resend-pin` | 3回 | 15分 | HTTP 429 + `Retry-After` ヘッダー |
| E5007 | `POST /auth/reset-password-request` | 3回 | 15分 | HTTP 429 + `Retry-After` ヘッダー |

---

## 7. エラーレスポンスの形式

すべてのAPIエラーは以下の統一形式で返却されます。

```json
{
  "success": false,
  "error": {
    "code": "E1003",
    "message": "バリデーションエラーが発生しました",
    "details": [
      {
        "field": "projectName",
        "message": "プロジェクト名は必須です",
        "code": "REQUIRED"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-03-25T01:14:00.000Z",
    "requestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

> **注意**: `details` フィールドはエラーの詳細情報がある場合のみ含まれます。  
> 500エラーの場合、内部エラー詳細は隠蔽され「システムエラーが発生しました」の汎用メッセージが返されます。

---

## 8. 参照ファイル

| ファイル | 内容 |
|---------|------|
| `backend/src/enums/errorCodes.ts` | エラーコード定数・型定義・LEGACY_CODE_MAP |
| `backend/src/middleware/errorHandlerMiddleware.ts` | 統一エラーハンドリングミドルウェア |
| `backend/src/middleware/rateLimitMiddleware.ts` | レート制限ミドルウェア |
| `backend/src/controllers/authController.ts` | 認証系エラーコード使用箇所 |
| `backend/src/controllers/projectController.ts` | プロジェクト系エラーコード使用箇所 |
| `backend/src/controllers/progressController.ts` | 進捗系エラーコード使用箇所 |
| `backend/src/controllers/formatController.ts` | フォーマット系エラーコード使用箇所 |
| `backend/src/controllers/fileAccessController.ts` | ファイル操作系エラーコード使用箇所 |
| `backend/src/controllers/issueController.ts` | Issue系エラーコード使用箇所 |
| `backend/src/controllers/taskRegistrationController.ts` | タスク登録系エラーコード使用箇所 |

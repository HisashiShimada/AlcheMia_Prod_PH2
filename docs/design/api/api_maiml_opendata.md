# API仕様書: MaiML OpenData 公開・非公開

**作成日**: 2026-03-13  
**最終更新**: 2026-03-18  
**バージョン**: 1.1.0  
**実装状況**: 実装済み

---

## 1. 概要

プロジェクトの MaiML ファイルを OpenData として公開・非公開にするための非同期 API 群。  
処理は BullMQ キュー経由でバックグラウンド Worker が実行するため、  
公開・非公開 API は **202 Accepted** を即時返却する。  
フロントエンドはポーリング API でジョブ完了を確認する。

### 1.1 ベース URL

```
/api/v1/projects/:projectName
```

### 1.2 認証

すべてのエンドポイントで JWT + Session Hybrid 認証が必要。

```
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
```

ミドルウェアチェーン: `authMiddleware` → `tenantIsolation` → `permissionCheck`

### 1.3 対象ロール

| ロール | publish | unpublish | publish-status |
|-------|---------|-----------|---------------|
| experiment_admin | ✅ | ✅ | ✅ |
| その他 | ❌ 403 | ❌ 403 | ❌ 403 |

---

## 2. エンドポイント一覧

| # | メソッド | エンドポイント | 説明 |
|---|---------|-------------|------|
| 1 | POST | `/api/v1/projects/:projectName/publish` | MaiML 公開ジョブ投入 |
| 2 | POST | `/api/v1/projects/:projectName/unpublish` | MaiML 非公開ジョブ投入 |
| 3 | GET | `/api/v1/projects/:projectName/publish-status` | 公開ジョブステータス取得 |

---

## 3. POST /api/v1/projects/:projectName/publish

### 3.1 概要

指定プロジェクトの MaiML ファイルを OpenData として公開する。  
バックエンドでプリコンディションチェックを実施し、すべて OK であれば  
BullMQ キュー（`maiml-publish`）へジョブを投入して 202 を返す。

### 3.2 パスパラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `projectName` | `string` | ✅ | 公開するプロジェクト名 |

### 3.3 リクエスト

リクエストボディなし。

### 3.4 プリコンディションチェック（サービス層）

以下をすべて満たす必要がある。満たさない場合は対応するエラーコードを返す。

| # | チェック内容 | エラーコード | HTTPステータス |
|---|------------|------------|-------------|
| 1 | プロジェクトが存在する | `PROJECT_NOT_FOUND` | 404 |
| 2 | `checkout_status = 1`（チェックアウト中） | `PROJECT_NOT_CHECKED_OUT` | 400 |
| 3 | `project_status = 3`（タスク結果レビュー待ち） | `PROJECT_STATUS_INVALID` | 400 |
| 4 | 全タスク詳細が完了（3）または異常終了（4） | `TASKS_NOT_COMPLETED` | 400 |
| 5 | 進行中ジョブが存在しない（`status != pending/running`） | `ALREADY_IN_PROGRESS` | 409 |
| 6 | Swift/S3 に `projects/{name}/{name}.maiml` が存在する | `MAIML_NOT_FOUND` | 400 |

### 3.5 成功レスポンス (202 Accepted)

```json
{
  "success": true,
  "data": {
    "job_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "status": "pending",
    "message": "公開ジョブを受け付けました"
  }
}
```

| フィールド | 型 | 説明 |
|-----------|---|------|
| `job_id` | `string` | DB に作成された `maiml_publish_job` の UUID |
| `status` | `"pending"` | ジョブ初期ステータス |
| `message` | `string` | 確認メッセージ |

### 3.6 副作用

- `maiml_publish_job` テーブルに `status = pending` レコードを INSERT
- BullMQ キュー `maiml-publish` にジョブを追加
- `project.project_status` を `3`（レビュー待ち）→ `4`（プロジェクト完了）に更新

### 3.7 エラーレスポンス

```json
{
  "success": false,
  "error": {
    "code": "エラーコード",
    "message": "エラーメッセージ"
  }
}
```

| HTTPステータス | エラーコード | 説明 |
|-------------|------------|------|
| 400 | `PROJECT_NOT_CHECKED_OUT` | プロジェクトがチェックアウト中でない |
| 400 | `PROJECT_STATUS_INVALID` | プロジェクトステータスが不正 |
| 400 | `TASKS_NOT_COMPLETED` | 未完了タスクが存在する |
| 400 | `MAIML_NOT_FOUND` | MaiMLファイルが存在しない |
| 404 | `PROJECT_NOT_FOUND` | プロジェクトが存在しない |
| 409 | `ALREADY_IN_PROGRESS` | 処理中ジョブが既に存在する |
| 500 | `SYSTEM_ERROR` | サーバー内部エラー |

---

## 4. POST /api/v1/projects/:projectName/unpublish

### 4.1 概要

公開済みプロジェクトの MaiML アセットを非公開にする。  
BullMQ キュー（`maiml-unpublish`）へ非公開ジョブを投入して 202 を返す。

### 4.2 パスパラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `projectName` | `string` | ✅ | 非公開にするプロジェクト名 |

### 4.3 リクエスト

リクエストボディなし。

### 4.4 プリコンディションチェック（サービス層）

| # | チェック内容 | エラーコード | HTTPステータス |
|---|------------|------------|-------------|
| 1 | 公開済みアセット（`asset_id`）が存在する | `NOT_PUBLISHED` | 404 |
| 2 | 進行中ジョブが存在しない（`status != pending/running`） | `ALREADY_IN_PROGRESS` | 409 |

### 4.5 成功レスポンス (202 Accepted)

```json
{
  "success": true,
  "data": {
    "job_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "status": "pending",
    "message": "非公開ジョブを受け付けました"
  }
}
```

| フィールド | 型 | 説明 |
|-----------|---|------|
| `job_id` | `string` | DB に作成された `maiml_publish_job` の UUID |
| `status` | `"pending"` | ジョブ初期ステータス |
| `message` | `string` | 確認メッセージ |

### 4.6 副作用

- `maiml_publish_job` テーブルに `job_type = unpublish`, `status = pending` レコードを INSERT
- BullMQ キュー `maiml-unpublish` にジョブを追加

### 4.7 エラーレスポンス

| HTTPステータス | エラーコード | 説明 |
|-------------|------------|------|
| 404 | `NOT_PUBLISHED` | 公開済みアセットが存在しない |
| 409 | `ALREADY_IN_PROGRESS` | 処理中ジョブが既に存在する |
| 500 | `SYSTEM_ERROR` | サーバー内部エラー |

---

## 5. GET /api/v1/projects/:projectName/publish-status

### 5.1 概要

指定プロジェクトの最新の公開/非公開ジョブステータスを返す。  
フロントエンドはこの API を 3秒ごとにポーリングしてジョブ完了を検知する。

### 5.2 パスパラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `projectName` | `string` | ✅ | 照会するプロジェクト名 |

### 5.3 リクエスト

クエリパラメータ・ボディなし。

### 5.4 成功レスポンス (200 OK)

```json
{
  "success": true,
  "data": {
    "job_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "job_type": "publish",
    "status": "done",
    "asset_id": 42,
    "project_name": "my-project",
    "started_at": "2026-03-13T07:00:00.000Z",
    "finished_at": "2026-03-13T07:00:05.000Z",
    "error_message": null
  }
}
```

#### ジョブ履歴なし（未公開）の場合

```json
{
  "success": true,
  "data": {
    "job_id": null,
    "job_type": null,
    "status": null,
    "asset_id": null,
    "project_name": "my-project",
    "started_at": null,
    "finished_at": null,
    "error_message": null
  }
}
```

### 5.5 レスポンスフィールド詳細

| フィールド | 型 | 説明 |
|-----------|---|------|
| `job_id` | `string \| null` | 最新ジョブの UUID。ジョブ履歴なしの場合は `null` |
| `job_type` | `"publish" \| "unpublish" \| null` | ジョブ種別 |
| `status` | `"pending" \| "running" \| "done" \| "error" \| null` | ジョブステータス |
| `asset_id` | `number \| null` | 公開済みアセット ID（`job_type=publish` かつ `status=done` のとき設定） |
| `project_name` | `string` | プロジェクト名（エコーバック） |
| `started_at` | `string \| null` | Worker がジョブ処理を開始した日時（ISO 8601） |
| `finished_at` | `string \| null` | Worker がジョブ処理を完了した日時（ISO 8601） |
| `error_message` | `string \| null` | エラー時のメッセージ（`status=error` のとき設定） |

### 5.6 ステータス遷移

```
[API 呼び出し]
      │
      ▼
  pending   ─→  running  ─→  done
                    │
                    └──────────→  error
```

| status | 説明 |
|--------|------|
| `pending` | ジョブをキューに投入済み、Worker 未処理 |
| `running` | Worker が処理中 |
| `done` | 処理正常完了 |
| `error` | 処理失敗（`error_message` 参照） |

### 5.7 フロントエンドのポーリング判定

| `status` の値 | フロントエンドの処理 |
|-------------|-----------------|
| `pending` | ポーリング継続 |
| `running` | ポーリング継続 |
| `done` | ポーリング停止、`onComplete` 呼び出し |
| `error` | ポーリング停止、`onComplete` 呼び出し |
| `null`（ジョブ履歴なし） | ポーリング停止、未公開として扱う |

### 5.8 エラーレスポンス

| HTTPステータス | エラーコード | 説明 |
|-------------|------------|------|
| 500 | `SYSTEM_ERROR` | サーバー内部エラー |

---

## 6. シーケンス図

### 6.1 公開フロー

```
Frontend           Backend API        maiml-publish Queue    Worker
   │                    │                      │                │
   │ POST /publish       │                      │                │
   │────────────────────►│                      │                │
   │                    │ チェック OK            │                │
   │                    │ DB: INSERT pending    │                │
   │                    │──────────────────────►│ enqueue        │
   │  202 Accepted      │                      │                │
   │◄────────────────────│                      │                │
   │                    │                      │ dequeue        │
   │                    │                      │────────────────►│
   │                    │                      │                │ DB: running
   │                    │                      │                │ Swift DL
   │                    │                      │                │ Parse
   │                    │                      │                │ DB INSERT
   │ GET /publish-status │                      │                │
   │────────────────────►│                      │                │
   │  {status:"running"} │                      │                │
   │◄────────────────────│                      │                │
   │                    │                      │                │ DB: done
   │ GET /publish-status │                      │                │
   │────────────────────►│                      │                │
   │  {status:"done"}    │                      │                │
   │◄────────────────────│                      │                │
```

### 6.2 非公開フロー

```
Frontend           Backend API       maiml-unpublish Queue   Worker
   │                    │                      │                │
   │ POST /unpublish     │                      │                │
   │────────────────────►│                      │                │
   │                    │ チェック OK            │                │
   │                    │ DB: INSERT pending    │                │
   │                    │──────────────────────►│ enqueue        │
   │  202 Accepted      │                      │                │
   │◄────────────────────│                      │                │
   │                    │                      │ dequeue        │
   │                    │                      │────────────────►│
   │                    │                      │                │ DB: running
   │                    │                      │                │ asset CASCADE DELETE
   │                    │                      │                │ DB: done
   │ GET /publish-status │                      │                │
   │────────────────────►│                      │                │
   │  {status:"done"}    │                      │                │
   │◄────────────────────│                      │                │
```

---

## 7. DB テーブル: public.maiml_publish_job

公開・非公開ジョブの状態管理テーブル。

| カラム | 型 | 説明 |
|-------|---|------|
| `job_id` | `UUID` PK | ジョブの一意識別子（bullmq jobId と同一） |
| `job_type` | `VARCHAR` | `publish` / `unpublish` |
| `organization_id` | `UUID` | 組織 ID（マルチテナント分離用） |
| `project_name` | `VARCHAR` | プロジェクト名 |
| `asset_id` | `BIGINT NULL` | 公開済みアセット ID（publish 完了時に設定） |
| `status` | `VARCHAR` | `pending` / `running` / `done` / `error` |
| `triggered_by` | `UUID NULL` | 操作ユーザー ID（スケジュール実行時は NULL） |
| `trigger_type` | `VARCHAR` | `manual` / `schedule` |
| `error_message` | `TEXT NULL` | エラー時のメッセージ |
| `started_at` | `TIMESTAMPTZ NULL` | Worker 処理開始日時 |
| `finished_at` | `TIMESTAMPTZ NULL` | Worker 処理完了日時 |
| `created_at` | `TIMESTAMPTZ` | レコード作成日時 |

---

## 8. 関連ファイル

| 種別 | ファイルパス |
|------|------------|
| ルーター | `backend/src/routes/projectRoutes.ts` |
| コントローラー | `backend/src/controllers/projectController.ts`（`publish`, `unpublish`, `getPublishStatus`） |
| サービス | `backend/src/services/maimlPublishService.ts` |
| キュー（公開） | `backend/src/queues/maimlPublishQueue.ts` |
| キュー（非公開） | `backend/src/queues/maimlUnpublishQueue.ts` |
| Worker（公開） | `backend/src/workers/maimlPublishWorker.ts` |
| Worker（非公開） | `backend/src/workers/maimlUnpublishWorker.ts` |
| リポジトリ | `backend/src/repositories/maimlPublishJobRepository.ts` |
| 型定義 | `backend/src/types/maimlOpenData.ts` |

---

## 9. 関連ドキュメント

- [UI仕様: 公開確認ダイアログ](../ui/experiment_admin/01_project_management/ui_maiml_publish_dialog.md)
- [UI仕様: 非公開確認ダイアログ](../ui/experiment_admin/01_project_management/ui_maiml_unpublish_dialog.md)
- [Worker仕様: 公開Worker](../worker/worker_maiml_publish.md)
- [Worker仕様: 非公開Worker](../worker/worker_maiml_unpublish.md)
- [OpenData パイプライン設計書](../../MaiML_OpenData_Pipeline/spec.md)

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.1.0 | 2026-03-18 | §3.4 タスク完了ステータス値を修正（完了=4→3、異常終了=5→4） | Cline |
| 1.0.0 | 2026-03-13 | 初版作成（実装済みソースコードから仕様を起こす） | Cline |

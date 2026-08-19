# その他管理API仕様書

## メタデータ
- **作成日**: 2026-08-14
- **バージョン**: 1.0.0
- **最終更新**: 2026-08-14
- **対象ファイル**: `sessionRoutes.ts` / `systemConfigRoutes.ts` / `tasksRoutes.ts` / `codeMasterRoutes.ts`
- **カテゴリ**: セッション管理・システム設定・タスク詳細・コードマスター

---

## 概要

本ドキュメントは、独立した小規模APIカテゴリ（Session / SystemConfig / Tasks / CodeMaster）をまとめた仕様書です。これらはphase1実装済みの機能ですが、設計書が未整備だったため本ドキュメントで補完します。

### カテゴリ一覧

| カテゴリ | ベースURL | エンドポイント数 | 権限 |
|---------|---------|--------------|------|
| [Session（セッション管理）](#1-session-api) | `/api/v1/sessions` | 2 | System Admin必須 |
| [System Config（システム設定）](#2-system-config-api) | `/api/v1/provider/system-config` | 1 | 認証済みユーザー |
| [Tasks（タスク詳細）](#3-tasks-api) | `/api/v1/tasks` | 1 | experiment_admin（読取専用） |
| [Code Master（コードマスター）](#4-code-master-api) | `/api/v1/code-master` | 2 | 認証済みユーザー全員 |

---

## 1. Session API

### 概要

アクティブセッションの管理機能を提供します。System Admin権限が必要で、自組織のセッションのみ操作可能です（マルチテナント分離）。

**認証・権限要件**:
- `authMiddleware` + `tenantIsolation` 必須
- **System Admin権限が必要**
- 自組織のセッションのみ操作可能

**実装ファイル**:
- `backend/src/routes/sessionRoutes.ts`
- `backend/src/controllers/sessionController.ts`（`SessionController` クラス）
- `backend/src/services/sessionService.ts`

### エンドポイント一覧

| # | メソッド | エンドポイント | 概要 | 実装状態 |
|---|---------|--------------|------|---------|
| 1 | GET | `/api/v1/sessions` | アクティブセッション一覧取得 | ✅ 実装済み |
| 2 | DELETE | `/api/v1/sessions/:tokenId` | セッション強制終了 | ✅ 実装済み |

---

### 1.1. GET /api/v1/sessions — セッション一覧取得

**説明**: 自組織のアクティブセッション一覧を取得する。現在の自セッションには `isCurrent: true` が付与される。

#### リクエスト

パラメータなし（`organizationId` / `userId` はセッションから自動取得）

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "tokenId": "550e8400-e29b-41d4-a716-446655440000",
        "userId": "user-001",
        "loginAt": "2026-08-14T09:00:00.000Z",
        "lastAccessAt": "2026-08-14T11:00:00.000Z",
        "isCurrent": true
      }
    ],
    "count": 1
  },
  "meta": {
    "timestamp": "2026-08-14T11:00:00.000Z",
    "requestId": "uuid-v4"
  }
}
```

**エラー時**:
| ステータス | コード | 説明 |
|-----------|--------|------|
| 401 | - | 認証エラー |
| 503 | `SYSTEM_REDIS_ERROR` | Redisエラー（セッションストア接続不可） |
| 500 | `E4001` | サーバーエラー |

---

### 1.2. DELETE /api/v1/sessions/:tokenId — セッション強制終了

**説明**: 指定セッション（`tokenId`）を強制終了する。自分自身の現在のセッションは終了不可。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | バリデーション | 説明 |
|----------|---|------|--------------|------|
| `tokenId` | string | ✅ | UUID形式 | 終了するセッションのトークンID |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "message": "セッションを終了しました",
    "tokenId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "meta": {
    "timestamp": "2026-08-14T11:00:00.000Z",
    "requestId": "uuid-v4"
  }
}
```

**エラー時**:
| ステータス | コード | 説明 |
|-----------|--------|------|
| 400 | `E1003` | `tokenId` が未指定またはUUID形式でない |
| 401 | - | 認証エラー |
| 403 | `E5015` | 自分自身の現在のセッションは終了不可 |
| 404 | `E6001` | 指定セッションが見つからない（または他組織のセッション） |
| 503 | `SYSTEM_REDIS_ERROR` | Redisエラー |
| 500 | `E4001` | サーバーエラー |

---

## 2. System Config API

### 概要

フロントエンドに公開する環境設定値をホワイトリスト方式で返します。機密情報（DB接続文字列・秘密鍵等）は一切返しません。

**認証要件**: `authMiddleware` 必須（権限ロール制限なし）

**CORS設定**: `FRONTEND_URL`（デフォルト: `http://localhost:3000`）からのGETリクエストを許可

**ホワイトリスト**:
| キー | 型 | 説明 | 環境変数 | デフォルト |
|-----|-----|------|---------|----------|
| `defaultRetentionDays` | integer | MAiML公開機能のデフォルト保持日数（日） | `RETENTION_DAYS_DEFAULT` | `30` |

> 将来追加する設定は `systemConfigController.ts` の `SYSTEM_CONFIG_WHITELIST` に追記するだけで対応できます。

**実装ファイル**:
- `backend/src/routes/systemConfigRoutes.ts`
- `backend/src/controllers/systemConfigController.ts`（`SYSTEM_CONFIG_WHITELIST` で管理）

### エンドポイント一覧

| # | メソッド | エンドポイント | 概要 | 実装状態 |
|---|---------|--------------|------|---------|
| 1 | GET | `/api/v1/provider/system-config` | システム設定値取得 | ✅ 実装済み |

---

### 2.1. GET /api/v1/provider/system-config — システム設定値取得

**説明**: ホワイトリストに登録されたシステム設定値を返す。`keys` クエリパラメータで取得する設定キーを絞り込める。ホワイトリストに存在しないキーを指定すると 400 を返す。

#### リクエスト

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `keys` | string | × | カンマ区切りの設定キー。省略時はホワイトリスト全件を返却。例: `?keys=defaultRetentionDays` |

#### レスポンス

**成功時（200 OK）— keys省略（全件）**:
```json
{
  "success": true,
  "data": {
    "defaultRetentionDays": 30
  },
  "meta": {
    "timestamp": "2026-08-14T11:00:00.000Z",
    "requestId": "uuid-v4"
  }
}
```

**エラー時（400）— ホワイトリスト外のキーを指定**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CONFIG_KEY",
    "message": "不明な設定キーが含まれています: unknownKey"
  },
  "meta": {
    "timestamp": "2026-08-14T11:00:00.000Z",
    "requestId": "uuid-v4"
  }
}
```

**エラー時**:
| ステータス | コード | 説明 |
|-----------|--------|------|
| 400 | `INVALID_CONFIG_KEY` | ホワイトリストに存在しないキーを指定 |
| 400 | `VALIDATION_ERROR` | `keys` パラメータが文字列でない |
| 401 | - | 認証エラー |

---

## 3. Tasks API

### 概要

タスク詳細情報（基本情報 + トランジション進捗一覧 + 統計情報）を取得します。

**認証・権限要件**:
- `authMiddleware` 必須
- `checkPermission('040000', 0)`: 機能CD040000（実験管理者メニュー）の読取権限 → **experiment_admin 以上**

**taskId フォーマット**:
```
{projectId}__{methodId}__{taskNo}
（ダブルアンダースコア区切り）

例: "550e8400-e29b-41d4-a716-446655440000__method1__3"
```

**実装ファイル**:
- `backend/src/routes/tasksRoutes.ts`
- `backend/src/controllers/projectController.ts`（`getTaskDetail`）

### エンドポイント一覧

| # | メソッド | エンドポイント | 概要 | 実装状態 |
|---|---------|--------------|------|---------|
| 1 | GET | `/api/v1/tasks/:taskId` | タスク詳細取得 | ✅ 実装済み |

---

### 3.1. GET /api/v1/tasks/:taskId — タスク詳細取得

**説明**: 指定タスクの基本情報・トランジション進捗一覧・統計情報を返す。experiment_admin 以上の権限が必要。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | バリデーション | 説明 |
|----------|---|------|--------------|------|
| `taskId` | string | ✅ | `^.+__.+__\d+$` 形式（ダブルアンダースコア区切り） | タスクID |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "taskId": "550e8400-e29b-41d4-a716-446655440000__method1__3",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "methodId": "method1",
    "taskNo": 3,
    "taskName": "タスク3",
    "taskStatus": 4,
    "transitions": [ ... ],
    "stats": { ... }
  }
}
```

> **注意**: レスポンス構造の詳細は `projectController.getTaskDetail()` の実装に依存します。

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | `taskId` が未指定、または `{projectId}__{methodId}__{taskNo}` 形式でない |
| 401 | 認証エラー |
| 403 | experiment_admin 未満の権限 |

---

## 4. Code Master API

### 概要

UIのSelectコンポーネント用オプション値（コードマスター）の取得機能を提供します。全認証済みユーザーが利用可能です。

**認証要件**: `authMiddleware` 必須（権限ロール制限なし）

**`codeDivision` のフォーマット**: 小文字英数字とアンダースコアのみ（`^[a-z0-9_]+$`）、1〜50文字

**実装ファイル**:
- `backend/src/routes/codeMasterRoutes.ts` (v1.0.0, 2026-02-20)
- `backend/src/controllers/codeMasterController.ts`

### エンドポイント一覧

| # | メソッド | エンドポイント | 概要 | 実装状態 |
|---|---------|--------------|------|---------|
| 1 | GET | `/api/v1/code-master/:codeDivision/options` | Selectオプション単体取得 | ✅ 実装済み |
| 2 | POST | `/api/v1/code-master/options/bulk` | Selectオプション一括取得 | ✅ 実装済み |

---

### 4.1. GET /api/v1/code-master/:codeDivision/options — Selectオプション単体取得

**説明**: 指定した `codeDivision` のSelectオプション一覧を取得する。

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | バリデーション | 説明 |
|----------|---|------|--------------|------|
| `codeDivision` | string | ✅ | 1〜50文字、`^[a-z0-9_]+$` | コード区分（例: `task_status`, `ng_reason`） |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": [
    { "value": "1", "label": "未着手" },
    { "value": "2", "label": "進行中" },
    { "value": "3", "label": "完了" }
  ]
}
```

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | `codeDivision` が不正（形式・長さ・使用不可文字） |
| 401 | 認証エラー |

---

### 4.2. POST /api/v1/code-master/options/bulk — Selectオプション一括取得

**説明**: 複数の `codeDivision` のSelectオプションを一度に取得する。画面初期化時の複数Select同時取得に使用される。

#### リクエスト

**Content-Type**: `application/json`

**ボディ**:
```json
{
  "codeDivisions": ["task_status", "ng_reason", "evaluation_grade"]
}
```

| フィールド | 型 | 必須 | バリデーション | 説明 |
|-----------|-----|------|--------------|------|
| `codeDivisions` | string[] | ✅ | 1要素以上。各要素は1〜50文字、`^[a-z0-9_]+$` | コード区分の配列 |

#### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "task_status": [
      { "value": "1", "label": "未着手" },
      { "value": "2", "label": "進行中" }
    ],
    "ng_reason": [
      { "value": "1", "label": "測定値異常" },
      { "value": "2", "label": "装置故障" }
    ],
    "evaluation_grade": [
      { "value": "A", "label": "優良" },
      { "value": "B", "label": "良好" }
    ]
  }
}
```

**エラー時**:
| ステータス | 説明 |
|-----------|------|
| 400 | `codeDivisions` が空配列、または要素が不正 |
| 401 | 認証エラー |

---

## 関連ドキュメント

- [api_list.md](./api_list.md)
- [api_auth.md](./api_auth.md)（Session APIと連携する認証・JWTトークン管理）
- [api_department_management.md](./api_department_management.md)（部署ユニット管理API）

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-08-14 | 初版作成（phase1実装済み・設計書未整備分の補完） | Cline |
| | | - Session（2件）: E5015（自己セッション終了不可）/ SYSTEM_REDIS_ERROR（503）を明記 | |
| | | - System Config（1件）: ホワイトリスト方式・INVALID_CONFIG_KEY エラーを記載 | |
| | | - Tasks（1件）: taskId の `{projectId}__{methodId}__{taskNo}` フォーマットを明記 | |
| | | - Code Master（2件）: codeDivision の形式制約（`^[a-z0-9_]+$`）を記載 | |

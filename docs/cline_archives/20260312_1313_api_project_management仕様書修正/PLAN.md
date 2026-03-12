# タスク計画書: api_project_management.md 仕様書修正

## メタデータ
- **作成日時**: 2026-03-12 13:13
- **タスクID**: api_project_management仕様書修正
- **優先度**: 中
- **推定工数**: 1時間

---

## 1. タスク概要

`docs/design/api/API一覧_実験作業者画面.md` の「1. プロジェクト関連 API」に記載されている3つのAPIについて、
実際のバックエンドソースコード実装に基づき `docs/design/api/api_project_management.md` の仕様書を修正する。

対象API:
1. `GET /api/v1/projects/worker-accessible` - 実験作業者用プロジェクト一覧取得
2. `PATCH /api/v1/projects/{projectName}/approval-request` - 承認依頼
3. `GET /api/v1/projects/:projectName/maiml` - MAIMLファイル取得

---

## 2. 調査結果

### 調査対象ファイル

| ファイル | 役割 |
|---------|------|
| `backend/src/routes/projectRoutes.ts` | ルート定義・バリデーション・ミドルウェア |
| `backend/src/controllers/projectController.ts` | コントローラー層 |
| `backend/src/controllers/workerProjectController.ts` | 実験作業者用コントローラー |
| `backend/src/services/projectService.ts` | プロジェクトサービス層 |
| `backend/src/services/workerProjectService.ts` | 実験作業者用サービス層 |

---

### 調査結果: API #1 実験作業者用プロジェクト一覧取得

**エンドポイント**: `GET /api/v1/projects/worker-accessible`  
**実装ファイル**: `workerProjectController.ts` → `workerProjectService.ts` → `workerProjectRepository.ts`

#### 仕様書と実装の差異

| 項目 | 現在の仕様書（修正前） | 実際の実装 |
|------|---------------------|-----------|
| 実装状況 | 🔴 未実装 | ✅ 実装済み |
| ルート定義 | `projectController.ts` | `workerProjectController.ts#listWorkerAccessible` |
| デフォルト limit | 20 | 20（同じ） |
| `status` フィルタの値 | `draft`, `active`, `waiting_approval`, `approved`（文字列） | `'1'`, `'2'`, `'3'`（数値文字列） |
| レスポンスフィールド | `project_id`, `my_task_count`, `pending_instruction_count`, `has_unresolved_issues` 等（snake_case） | `projectId`, `projectName`, `description`, `projectStatus`, `useDeemedProgress`, `createdAt`, `updatedAt`（camelCase） |
| ビジネスロジック記述 | DBクエリ詳細（仮実装） | 実際のリポジトリ経由の処理 |

#### 実際のレスポンス形式

```json
{
  "success": true,
  "data": [
    {
      "projectId": "string",
      "projectName": "string",
      "description": "string",
      "projectStatus": 1,
      "useDeemedProgress": true,
      "createdAt": "2026-01-21T10:00:00Z",
      "updatedAt": "2026-01-27T19:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 15,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "...",
    "requestId": "..."
  }
}
```

#### 実際のクエリパラメータ（routesより）

| パラメータ | 型 | 必須 | 有効値 |
|----------|---|------|-------|
| `page` | integer | × | 1以上 |
| `limit` | integer | × | 1〜100 |
| `status` | string | × | `'1'`, `'2'`, `'3'` |
| `sort_by` | string | × | `'create_at'`, `'project_name'`, `'update_at'` |
| `order` | string | × | `'asc'`, `'desc'` |

---

### 調査結果: API #2 承認依頼

**エンドポイント**: `PATCH /api/v1/projects/:projectName/approval-request`  
**実装ファイル**: `projectController.ts#requestApproval` → `projectService.ts#requestApproval`

#### 仕様書と実装の差異

| 項目 | 現在の仕様書（修正前） | 実際の実装 |
|------|---------------------|-----------|
| 許可するプロジェクトステータス | `active` | `2`（タスク実行中：project_status = 2） |
| タスク未完了チェック | あり（実装要件に記載） | **なし** |
| 未解決問題チェック | あり（実装要件に記載） | **なし** |
| system_notification 登録 | あり（実装要件に記載） | **なし** |
| レスポンス `notification_id` | あり | **なし** |
| エラーコード | `BUSINESS_STATUS_INVALID`, タスク未完了, 未解決問題 | **`BUSINESS_STATUS_INVALID`** のみ（既に承認待ちの場合も同コード） |
| `previous_status` 値 | `"active"` | **`"active"`（ハードコード）** |
| `new_status` 値 | `"waiting_approval"` | **`"waiting_approval"`（ハードコード）** |

#### エラーレスポンス（実装）

| コード | HTTPステータス | 条件 |
|-------|---------------|------|
| `RESOURCE_NOT_FOUND` | 404 | プロジェクトが存在しない |
| `BUSINESS_STATUS_INVALID` | 409 | project_status != 2（タスク実行中でない）/ 既に承認依頼済み |
| `SYSTEM_DATABASE_ERROR` | 500 | DBエラー |

#### ミドルウェア（routesより）

```
authMiddleware → tenantIsolation → checkPermission('050000', 1) → バリデーション
```

権限: `experiment_worker`（書込可、機能CD: `050000`）

---

### 調査結果: API #3 MAIMLファイル取得

**エンドポイント**: `GET /api/v1/projects/:projectName/maiml`  
**実装ファイル**: `projectController.ts#getProjectMaiml` → `projectService.ts#getProjectMaiml`

#### 仕様書と実装の差異

| 項目 | 現在の仕様書（修正前） | 実際の実装 |
|------|---------------------|-----------|
| 実装状況 | 🔴 未実装 | ✅ 実装済み |
| パスパラメータ | `:projectId`（UUID） | **`:projectName`（文字列）** |
| 権限 | `experiment_worker`（読取専用） | **全ロール**（`authMiddleware`のみ、`checkPermission`なし） |
| レスポンス構造 | `file_id`, `project_id`, `project_name`, `file_name`, `file_path`, `file_size`, `content`, `content_type`, `loaded_at` | **`{ maimlContent: string }`** のみ |
| ファイル未存在時の挙動 | 404エラー | **`success: true, data: { maimlContent: '' }` を返す（空content）** |
| エラーコード | `NOT_FOUND`, `FILE_NOT_FOUND`, `INTERNAL_ERROR` | `RESOURCE_NOT_FOUND`, `FILE_NOT_FOUND`, `SYSTEM_DATABASE_ERROR`, `SYSTEM_S3_ERROR` |

#### 実際のレスポンス形式

```json
{
  "success": true,
  "data": {
    "maimlContent": "<?xml version=\"1.0\"?>..."
  },
  "meta": {
    "timestamp": "...",
    "requestId": "..."
  }
}
```

#### ファイル未存在時のレスポンス

```json
{
  "success": true,
  "data": {
    "maimlContent": ""
  },
  "meta": {
    "timestamp": "...",
    "requestId": "..."
  }
}
```

---

## 3. 目的と期待される成果

### 目的
API仕様書（`api_project_management.md`）を実際のソースコード実装に合わせて修正し、
開発者が正確な仕様を参照できるようにする。

### 期待される成果
- [x] 調査完了
- [ ] 実装状況サマリーの更新（実装済み件数の修正）
- [ ] API一覧テーブルの更新（実装状況✅の修正）
- [ ] API #12「実験作業者用プロジェクト一覧取得」詳細仕様の修正
- [ ] API #13「承認依頼」詳細仕様の修正
- [ ] API #15「MAIMLファイル取得」詳細仕様の修正
- [ ] 変更履歴の追記

---

## 4. 実装ステップ

### Phase 1: サマリー・API一覧テーブルの更新
- [ ] 実装状況サマリーを更新（実装済み16個 → 実装状況を実態に合わせる）
- [ ] 🎯 API一覧テーブルの #12, #13 を未実装 → 実装済みに変更

### Phase 2: API #14 実験作業者用プロジェクト一覧取得（仕様書内の番号で）
- [ ] 実装状況を更新（🔴未実装 → ✅実装済み）
- [ ] クエリパラメータの `status` 値を修正（文字列 → 数値文字列）
- [ ] レスポンス形式をcamelCaseに修正
- [ ] ビジネスロジック記述を実装に合わせて修正
- [ ] 実装ファイル情報を追加

### Phase 3: API #13 承認依頼
- [ ] ビジネスロジック（前提条件チェック）の記述を実装に合わせて修正
- [ ] 実装要件のDBクエリを実装に合わせて修正
- [ ] レスポンスから `notification_id` を削除
- [ ] エラーレスポンスを実装に合わせて修正

### Phase 4: API #15 MAIMLファイル取得
- [ ] 実装状況を更新（🔴未実装 → ✅実装済み）
- [ ] パスパラメータを `:projectId` → `:projectName` に修正
- [ ] 権限説明を修正（全ロール）
- [ ] レスポンス形式を `{ maimlContent: string }` に修正
- [ ] ファイル未存在時の挙動を修正（空content返却）
- [ ] エラーコードを修正
- [ ] 実装ファイル情報を追加

### Phase 5: 変更履歴の追記
- [ ] バージョン2.9.0 として変更履歴を追記

---

## 5. 変更ファイル
1. `docs/design/api/api_project_management.md` - 上記の修正

---

## 6. 承認記録
- **計画書提示日時**: 2026-03-12 13:13
- **承認日時**: 2026-03-12 13:13（ユーザー承認済み）

---

## 7. 実施記録

### 実施日時
開始: 2026-03-12 13:13  
完了: -

### 最終的な成果物
- [ ] api_project_management.md 修正完了

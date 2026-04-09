# プロジェクト名変更・ファイルリネームAPI仕様書

**作成日**: 2026-04-09  
**最終更新**: 2026-04-09  
**バージョン**: 1.0.0  
**対象画面**: プロジェクト管理画面  
**総API数**: 2個  
**実装状況**: ルート・コントローラー定義済み（renameServiceのrenameProject未実装）

---

## 📊 実装状況サマリー

| カテゴリ | 実装済み | 未実装 | 合計 |
|---------|---------|--------|------|
| プロジェクト名変更 | 0 | 1 | 1 |
| ファイルリネーム | 1 | 0 | 1 |
| **合計** | **1** | **1** | **2** |

**完了率**: 50% (1/2)

---

## 🎯 API一覧

| # | API名 | メソッド | エンドポイント | 状態 |
|---|------|---------|---------------|------|
| 1 | プロジェクト名変更 | PATCH | `/api/v1/projects/:projectName/rename` | 🔴 未実装（renameService.renameProject未実装） |
| 2 | ファイルリネーム | PATCH | `/api/v1/files/rename` | ✅ 実装済み |

---

## 📋 概要

プロジェクト名の変更、およびプロジェクト内ファイルのリネームを行うAPIです。

### プロジェクト名変更の特殊性

プロジェクト名はS3フォルダパス・DB・file_metadataなど複数箇所で使用されているため、  
変更時は以下のリソースをすべて一括更新します。

| 更新対象 | 更新内容 |
|---------|---------|
| S3パス | `projects/{旧project_name}/` 配下を新パスへコピー→削除 |
| `project.project_name` | DBのprojectテーブルを更新 |
| `file_metadata.file_key` | S3パス変更に合わせて一括UPDATE |
| `maiml_publish_job.project_name` | 既存ジョブのproject_nameを更新 |
| `maiml_asset.file_uri` | アセットのfile_uriを新パスに更新 |
| `transition_set.project_name` | セマンティック検索用テーブルのproject_nameを更新 |

### ファイルリネームの制約

- MAIMLファイル（`.maiml`）のリネームは禁止
- ファイル名のみ変更可（ディレクトリ移動は不可）
- リネームはS3コピー→削除方式で実行（直接リネーム不可）

---

## 🔐 共通仕様

### 認証・認可

**認証方式**: JWT + Session Hybrid

**必須ヘッダー**:
```http
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
```

**organization_id の取得**:
- `authMiddleware` がセッション情報を検証し、`req.user` にユーザー情報（organization_idを含む）を格納します

### ミドルウェアチェーン

```typescript
// プロジェクト名変更
router.patch('/:projectName/rename',
  authMiddleware,
  checkPermission('040000', 1),   // 実験管理者（書込可）
  projectController.renameProjectHandler
);

// ファイルリネーム
router.patch('/rename',
  authMiddleware,
  fileAccessController.renameFileHandler
);
```

### 統一レスポンス形式

**成功レスポンス**:
```json
{
  "success": true,
  "data": { ... }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "Exxxx",
    "message": "エラーメッセージ"
  }
}
```

---

## 📋 API詳細仕様

---

### 1. プロジェクト名変更 🔴 未実装

**エンドポイント**: `PATCH /api/v1/projects/:projectName/rename`

**説明**: プロジェクト名を変更する。S3パス・DB・file_metadata等を一括更新する。

**認証**: 必須

**権限**: 実験管理者（`checkPermission('040000', 1)`）以上

#### リクエスト

**パスパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| `projectName` | string | ○ | 変更対象のプロジェクト名（現在の名前） |

**ボディ（JSON）**:
```json
{
  "newProjectName": "new_project_name"
}
```

**バリデーション**:
| フィールド | 型 | 必須 | 制約 |
|----------|---|------|------|
| `newProjectName` | string | ○ | 1〜255文字、制御文字（`/`, `\`, `<`, `>`, `:`, `"`, `|`, `?`, `*`）禁止 |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "oldProjectName": "old_project_name",
    "newProjectName": "new_project_name"
  }
}
```

**エラー時**:

| HTTPステータス | エラーコード | 説明 |
|-------------|------------|------|
| 400 | E1003 | バリデーションエラー（newProjectName未指定・不正文字含む等） |
| 400 | E1004 | 必須項目不足（newProjectNameが空文字） |
| 404 | E6001 | プロジェクトが見つからない |
| 409 | E7001 | 同名のプロジェクトが既に存在する |
| 500 | E4006 | ストレージエラー（S3コピー/削除失敗） |
| 500 | E4002 | データベースエラー |

#### 処理フロー

1. `projectName`（パスパラメータ）でプロジェクトの存在確認
2. `newProjectName` バリデーション（空文字・不正文字禁止）
3. 変更前後のプロジェクト名が同一の場合は早期リターン（`{ success: true }`）
4. `newProjectName` の重複チェック（同名プロジェクトが存在する場合は `E7001`）
5. S3ファイル一括移動:
   - `projects/{旧projectName}/` 配下の全ファイルを `projects/{newProjectName}/` へコピー
   - アーカイブファイル（`archive/` 配下）のフォルダパスも新名称に変更
   - コピー完了後、旧ファイルを削除
6. DB一括更新（トランザクション内）:
   - `project.project_name` を更新
   - `file_metadata.file_key` を新パスに一括UPDATE
   - `maiml_publish_job.project_name` を更新
   - `maiml_asset.file_uri` を新パスに更新
   - `transition_set.project_name` を更新

> **注意**: アーカイブファイルのファイル名自体（`{旧projectName}_v{n}.maiml`）は変更しない（フォルダパスのみ変更）

#### 実装ファイル
- **ルート**: `backend/src/routes/projectRoutes.ts`
- **コントローラー**: `backend/src/controllers/projectController.ts` (`renameProjectHandler`)
- **サービス**: `backend/src/services/renameService.ts` (`renameProject`) ← **未実装**

---

### 2. ファイルリネーム ✅ 実装済み

**エンドポイント**: `PATCH /api/v1/files/rename`

**説明**: S3/Swift上の指定ファイルをリネームする。MAIMLファイル（`.maiml`）のリネームは禁止。

**認証**: 必須

**権限**: すべてのロール（マルチテナント分離で保護）

#### リクエスト

**ボディ（JSON）**:
```json
{
  "fileKey": "projects/sample_project/data/result.csv",
  "newFileName": "result_v2.csv"
}
```

**バリデーション**:
| フィールド | 型 | 必須 | 制約 |
|----------|---|------|------|
| `fileKey` | string | ○ | 1〜1024文字（organization_idなしの相対パス） |
| `newFileName` | string | ○ | 1〜255文字、パス区切り文字（`/`, `\`, `<`, `>`, `:`, `"`, `|`, `?`, `*`、制御文字）禁止 |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "data": {
    "newFileKey": "projects/sample_project/data/result_v2.csv"
  }
}
```

**エラー時**:

| HTTPステータス | エラーコード | 説明 |
|-------------|------------|------|
| 400 | E1003 | バリデーションエラー（MAIMLリネーム禁止・不正文字・空文字） |
| 404 | E6002 | ファイルが見つからない（S3上に存在しない） |
| 409 | E6005 | 同名のファイルが既に存在する |
| 500 | E4006 | ストレージエラー（S3コピー/削除失敗） |

#### 処理フロー

1. `newFileName` バリデーション（空文字・不正文字禁止）
2. MAIMLファイルリネーム禁止チェック（`fileKey` の拡張子が `.maiml` の場合は `E1003`）
3. `fileKey` から親パスを取得し `newFileKey` を組み立てる
4. 変更前後のファイルキーが同一の場合は早期リターン（`{ success: true, newFileKey }`）
5. S3: 元ファイルの存在確認（存在しない場合は `E6002`）
6. S3: 同名ファイルの重複チェック（存在する場合は `E6005`）
7. S3: `storageService.copyFile(organizationId, fileKey, newFileKey)`
8. S3: `storageService.deleteFile(organizationId, fileKey)`
   - 削除失敗時はコピー先を削除してベストエフォートロールバック
9. DB: `file_metadata` テーブルを更新
   - 更新カラム: `file_key`, `original_filename`, `update_user_id`, `updated_at`
   - DB更新失敗はログのみ（S3リネーム完了後のためロールバックなし、処理続行）
10. `{ success: true, newFileKey }` を返す

> **注意**: ファイル名のみ変更可能（ディレクトリ移動は不可）

#### 実装ファイル
- **ルート**: `backend/src/routes/fileAccessRoutes.ts`
- **コントローラー**: `backend/src/controllers/fileAccessController.ts` (`renameFileHandler`)
- **サービス**: `backend/src/services/renameService.ts` (`renameFile`)

#### フロントエンド使用箇所

| コンポーネント | 用途 |
|-------------|------|
| `frontend/src/components/project/FileListTable.tsx` | ファイル一覧の「名前の変更」メニュー |
| `frontend/src/services/fileAccessService.ts` | `renameFile()` 関数（PATCH /api/v1/files/rename） |

**フロントエンドサービス呼び出し例**:
```typescript
// frontend/src/services/fileAccessService.ts
export async function renameFile(params: {
  fileKey: string;
  newFileName: string;
}): Promise<{ newFileKey: string }> {
  const response = await apiClient.patch('/files/rename', params);
  return response.data.data;
}
```

---

## 🔒 セキュリティ考慮事項

### マルチテナント分離

- `authMiddleware` が `req.user.organizationId` を設定
- S3操作は必ず `organizationId` プレフィックス付きパスで実行
- 他組織のファイルへのアクセスは不可

### MAIMLファイルの保護

- `.maiml` ファイルのリネームはサービス層で禁止（`E1003`）
- プロジェクト名変更時のMAIMLファイルは、フォルダパスの変更のみ行われる

### S3操作の安全性

- コピー→削除方式のため、コピー失敗時は元ファイルが保持される
- 削除失敗時はコピー先を削除してベストエフォートロールバック

---

## 📚 関連ドキュメント

- [タスク計画書](../../docs/20260402_1527_プロジェクト名変更機能/PLAN.md)
- [S3構造](../../.clinerules/references/s3_structure.md)
- [ファイルアクセスAPI](./api_file_access.md)
- [プロジェクト管理API](./api_project_management.md)

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-04-09 | 初版作成 | Cline |
| | | - プロジェクト名変更API（PATCH /api/v1/projects/:projectName/rename） | |
| | | - ファイルリネームAPI（PATCH /api/v1/files/rename） | |

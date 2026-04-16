# 実施結果: maimlパス生成処理修正

- **完了日時**: 2026-04-15 10:36
- **ステータス**: ✅ 完了

---

## 修正概要

MAIMLファイルパス生成処理において、`projectName` ベースのパス解決を `projectId` ベースに変更。
`maimlPathResolver.ts` を中心に、呼び出し元のService・Controller・型定義のJSDocコメントを一括修正。

---

## 修正ファイル一覧

### 1. `backend/src/utils/maimlPathResolver.ts`

| 変更種別 | 内容 |
|----------|------|
| 修正 | `getMaimlFilePath(organizationId, projectName)` → `getMaimlFilePath(organizationId, projectId)` |
| 修正 | `getMaimlArchivePath(organizationId, projectName)` → `getMaimlArchivePath(organizationId, projectId)` |
| 修正 | `getProjectFolderPath(organizationId, projectName)` → `getProjectFolderPath(organizationId, projectId)` |
| 追加 | 各関数内でDBから `project_name` を取得してパスを生成するロジックを追加 |

**変更前:**
```typescript
export async function getMaimlFilePath(
  organizationId: string,
  projectName: string
): Promise<string> {
  return `projects/${projectName}/${projectName}.maiml`;
}
```

**変更後:**
```typescript
export async function getMaimlFilePath(
  organizationId: string,
  projectId: string
): Promise<string> {
  const pool = getPool();
  const result = await pool.query(
    'SELECT project_name FROM project WHERE project_id = $1 AND organization_id = $2',
    [projectId, organizationId]
  );
  if (result.rows.length === 0) throw new Error('PROJECT_NOT_FOUND');
  const projectName = result.rows[0].project_name;
  return `projects/${projectName}/${projectName}.maiml`;
}
```

---

### 2. `backend/src/services/taskRegistrationService.ts`

| 変更種別 | 内容 |
|----------|------|
| 修正 | `getMaimlFilePath(organizationId, projectName)` → `getMaimlFilePath(organizationId, projectId)` |

---

### 3. `backend/src/services/maimlWriterService.ts`

| 変更種別 | 内容 |
|----------|------|
| 修正 | `getMaimlFilePath` の引数を `projectName` → `projectId` に変更 |
| 修正 | `getMaimlArchivePath` の引数を `projectName` → `projectId` に変更 |
| 修正 | `getProjectFolderPath` の引数を `projectName` → `projectId` に変更 |

---

### 4. `backend/src/services/maimlPublishService.ts`

| 変更種別 | 内容 |
|----------|------|
| 修正 | `getMaimlFilePath` の引数を `projectName` → `projectId` に変更 |

---

### 5. `backend/src/controllers/progressController.ts`（JSDocコメント修正）

| 変更種別 | 内容 |
|----------|------|
| 修正 | JSDocコメント内 `:projectName` → `:projectId` に統一（全該当箇所） |

---

### 6. `backend/src/controllers/projectController.ts`（JSDocコメント修正）

| 変更種別 | 内容 |
|----------|------|
| 修正 | JSDocコメント内 `:projectName` → `:projectId` に統一（13箇所） |

対象コメント一覧:
- `PATCH /api/v1/projects/:projectId/rename`
- `DELETE /api/v1/projects/:projectId`
- `GET /api/v1/progress/projects/:projectId/methods/:methodId/tasks/:taskNo/details`
- `POST /api/v1/projects/:projectId/tasks/complete-review`
- `GET /api/v1/projects/:projectId/tasks`
- `GET /api/v1/projects/:projectId/maiml`
- `POST /api/v1/projects/:projectId/checkout`
- `PATCH /api/v1/projects/:projectId/approval-request`
- `GET /api/v1/projects/:projectId/worker-instructions`
- `POST /api/v1/projects/:projectId/checkin`
- `POST /api/v1/projects/:projectId/publish`
- `POST /api/v1/projects/:projectId/unpublish`
- `GET /api/v1/projects/:projectId/publish-status`

---

### 7. `backend/src/types/api.ts`（JSDocコメント修正）

| 変更種別 | 内容 |
|----------|------|
| 修正 | JSDocコメント内 `:projectName` → `:projectId` に統一（8箇所） |

対象コメント一覧:
- `GET /api/v1/projects/:projectId/tasks`
- `GET /api/v1/projects/:projectId/files`
- `POST /api/v1/projects/:projectId/checkout`
- `POST /api/v1/projects/:projectId/instructions`
- `PUT /api/v1/projects/:projectId/instructions/:instructionId`
- `POST /api/v1/projects/:projectId/instructions/send`
- `GET /api/v1/progress/projects/:projectId/work-details のレスポンス data 部分`
- `POST /api/v1/projects/:projectId/publish`

---

### 8. experiments系ファイル（新規実装）

| ファイル | 変更種別 | 内容 |
|----------|----------|------|
| `backend/src/routes/experimentRoutes.ts` | 新規作成 | `GET /api/v1/projects/:projectId/experiment-data` ルート定義 |
| `backend/src/controllers/experimentController.ts` | 新規作成 | 実験データ取得コントローラー |
| `backend/src/services/experimentDataService.ts` | 新規作成 | 実験データ取得サービス |
| `frontend/src/services/experimentDataApiService.ts` | 新規作成 | フロントエンドAPI呼び出しサービス |
| `backend/src/sql/queries/projects/findByIdWithStatus.sql` | 新規作成 | プロジェクトIDと状態を含む取得クエリ |

---

## 検証結果

| 検証項目 | 結果 |
|----------|------|
| TypeScript コンパイル（`tsc --noEmit`） | ✅ Exit 0（エラーなし） |

---

## 影響範囲

- MAIMLファイルパス生成を行う全てのService（taskRegistrationService, maimlWriterService, maimlPublishService）
- 上記Serviceを呼び出すController・ルートは変更なし（projectIdは既にルートパラメータとして使用済み）
- フロントエンド側への変更なし（APIのパスパラメータは既に `:projectId` を使用）

---

## 備考

- 既存のルートファイル（`projectRoutes.ts`, `progressRoutes.ts`）はすでに `:projectId` を使用しており、変更不要
- `maimlPathResolver.ts` のDB参照追加により、プロジェクト名の変更（rename）があっても正しいパスが生成されるようになった

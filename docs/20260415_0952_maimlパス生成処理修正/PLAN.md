# タスク計画書: MAIMLファイルパス生成処理の修正（projectName直組み立て → resolveMaimlFilePath方式への統一）

## メタデータ
- **作成日時**: 2026-04-15 09:52
- **タスクID**: maiml-path-fix
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

`projects/${projectName}/${projectName}.maiml` のようにプロジェクト名から直接MAIMLファイルパスを組み立てている処理が複数のファイルに残っている。

現在の正しい方式は **`resolveMaimlFilePath`（`taskRegistrationService.ts` に実装済み）** であり、
`project_uuid → file_metadata テーブルの file_key` を優先して解決し、未設定の場合のみ projectName ベースにフォールバックする。

旧方式のみで実装されているファイルを調査した結果、以下の4ファイルに修正が必要であることを確認した。

---

## 調査結果

### `resolveMaimlFilePath` の正しい実装（参考: `taskRegistrationService.ts` 284〜321行）

```typescript
async function resolveMaimlFilePath(
  organizationId: string,
  projectId: string,
  projectName: string
): Promise<string> {
  const nameRow = await projectRepository.findNameAndUuidById(organizationId, projectId);
  const projectUuid = nameRow?.project_uuid ?? null;

  if (projectUuid) {
    const fileMetadataRepo = new FileMetadataRepository();
    const meta = await fileMetadataRepo.findMaimlByProjectUuid(projectUuid);
    if (meta) {
      const filePath = meta.file_key.startsWith(`${organizationId}/`)
        ? meta.file_key.slice(`${organizationId}/`.length)
        : meta.file_key;
      logger.info('[XXXService] file_metadata からMAIMLパスを解決', { projectId, projectUuid, filePath });
      return filePath;
    }
    logger.warn('[XXXService] file_metadata にMAIMLが未登録、project_name でフォールバック', { projectId, projectUuid });
  } else {
    logger.warn('[XXXService] project_uuid 未設定、project_name でフォールバック', { projectId });
  }

  return `projects/${projectName}/${projectName}.maiml`;
}
```

---

### 修正が必要なファイルと箇所

#### 1. `backend/src/services/experimentDataService.ts`（2箇所）

| 箇所 | 行 | 問題の説明 |
|------|----|-----------|
| `getTemplateData` 関数 | 231行 | `maimlPath = \`projects/${projectName}/${projectName}.maiml\`` で直組み立て。`projectId` は引数にないが `projectResult.rows[0].project_id` で取得済み |
| `updateDeemedProgress` 関数 | 531行 | `maimlPath = \`projects/${projectName}/${projectName}.maiml\`` で直組み立て。`projectId` は引数として渡されている |

**現状の引数:**
- `getTemplateData(organizationId, projectName, methodId, taskNo, transitionId)` ← `projectId` がない（DBから取得済み）
- `updateDeemedProgress(organizationId, projectId, projectName, ...)` ← `projectId` あり

#### 2. `backend/src/services/maimlPublishService.ts`（1箇所）

| 箇所 | 行 | 問題の説明 |
|------|----|-----------|
| `enqueuePublish` 関数 | 110行 | `fileUri = \`projects/${projectName}/${projectName}.maiml\`` で直組み立て。ファイル存在確認のみに使用 |

**現状:** `projectId` は引数にあり、`project.project_name` を使用して旧方式でパスを組み立てている。

#### 3. `backend/src/services/maimlWriterService.ts`（1箇所）

| 箇所 | 行 | 問題の説明 |
|------|----|-----------|
| メインの書き込みメソッド | 該当行 | `filePath = \`projects/${projectName}/${projectName}.maiml\`` で直組み立て。その後このパスをアーカイブ処理等にも使い回している |

**現状:** `projectId` は引数にあり、`projectName` も引数にある。

#### 4. `backend/src/services/projectInstructionService.ts`（2箇所）

| 箇所 | 行 | 問題の説明 |
|------|----|-----------|
| MAIMLダウンロード処理 | 該当行 | `filePath = \`projects/${projectName}/${projectName}.maiml\`` (file_metadata 未登録フォールバック) |
| MAIMLダウンロード処理 | 該当行 | `filePath = \`projects/${projectName}/${projectName}.maiml\`` (project_uuid 未設定フォールバック) |

**注:** `projectInstructionService.ts` は既に `project_uuid → file_metadata` の解決ロジックを**独自に**実装しているが、`taskRegistrationService.ts` の `resolveMaimlFilePath` と同じ処理が重複している。フォールバック部分も含めて現状は動作しているが、共通関数化すると保守性が上がる。

---

## 目的と期待される成果

### 目的
- MAIMLファイルのパス解決を `project_uuid → file_metadata.file_key` 方式に統一する
- プロジェクトリネーム後でも正しいMAIMLファイルを参照できるようにする
- `projectName` 直組み立てはあくまでフォールバックとして保持する

### 期待される成果
- [ ] `experimentDataService.ts` の2箇所を `resolveMaimlFilePath` 方式に修正
- [ ] `maimlPublishService.ts` の1箇所を `resolveMaimlFilePath` 方式に修正
- [ ] `maimlWriterService.ts` の1箇所を `resolveMaimlFilePath` 方式に修正
- [ ] （オプション）`projectInstructionService.ts` の重複ロジックを共通関数に置き換え

---

## 実装ステップ

### Phase 1: `resolveMaimlFilePath` を共通ユーティリティに切り出す

現在 `taskRegistrationService.ts` 内のプライベート関数として定義されている `resolveMaimlFilePath` を、複数のサービスから参照できる場所に移動する。

**移動先の候補:**
- `backend/src/utils/maimlPathResolver.ts`（新規ファイル）
- または `backend/src/services/maimlService.ts`（既存ファイルに追記）

**推奨:** `backend/src/utils/maimlPathResolver.ts` として新規作成し、`export` する。

- [ ] `backend/src/utils/maimlPathResolver.ts` を新規作成
  - `resolveMaimlFilePath(organizationId, projectId, projectName)` をエクスポート
  - ログメッセージのプレフィックスを `[maimlPathResolver]` に変更
  - 必要な import（`projectRepository`, `FileMetadataRepository`, `logger`）を追加
- [ ] `taskRegistrationService.ts` の `resolveMaimlFilePath` をプライベート定義から `maimlPathResolver.ts` の import に差し替え

### Phase 2: `experimentDataService.ts` の修正（2箇所）

- [ ] `getTemplateData` 関数（231行付近）の修正
  - `projectId`（DBから取得済みの `projectResult.rows[0].project_id`）を活用
  - `resolveMaimlFilePath(organizationId, projectId, projectName)` に置き換え
  - `import { resolveMaimlFilePath } from '../utils/maimlPathResolver'` を追加
- [ ] `updateDeemedProgress` 関数（531行付近）の修正
  - `projectId` は既に引数として渡されているのでそのまま使用
  - `resolveMaimlFilePath(organizationId, projectId, projectName)` に置き換え

### Phase 3: `maimlPublishService.ts` の修正（1箇所）

- [ ] `enqueuePublish` 関数（110行付近）の修正
  - ファイル存在確認用パスを `resolveMaimlFilePath(organizationId, projectId, projectName)` で解決
  - `import { resolveMaimlFilePath } from '../utils/maimlPathResolver'` を追加

### Phase 4: `maimlWriterService.ts` の修正（1箇所）

- [ ] メインの書き込みメソッドの修正
  - `filePath` の初期化を `resolveMaimlFilePath(organizationId, projectId, projectName)` に置き換え
  - **注意:** `filePath` はその後のアーカイブパス計算（`pathParts` 分解）にも使用されるため、パスの形式が変わらないことを確認する（`projects/${name}/${name}.maiml` 形式は維持）
  - `import { resolveMaimlFilePath } from '../utils/maimlPathResolver'` を追加

### Phase 5: （オプション）`projectInstructionService.ts` の重複ロジック整理

- [ ] 独自実装している `project_uuid → file_metadata` 解決ロジックを `resolveMaimlFilePath` に置き換え
  - 既存の動作と等価であることを確認してから実施

### Phase 6: APIエンドポイントの `:projectName` → `:projectId` 変更

現在 `experimentRoutes.ts` の2エンドポイントがパスパラメータに `:projectName` を使用しているため、`:projectId` に変更する。

**変更対象エンドポイント:**
- `GET  /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data`
  → `GET  /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data`
- `POST /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data`
  → `POST /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data`

**バックエンド:**
- [ ] `backend/src/routes/experimentRoutes.ts`
  - ルートパスの `:projectName` → `:projectId` に変更
  - `param('projectName')` のバリデーションを `param('projectId')` に変更
- [ ] `backend/src/controllers/experimentController.ts`
  - `getTemplateData`: `req.params.projectName` → `req.params.projectId` に変更
    - `experimentDataService.getTemplateData` の引数も `projectId` に変更（サービス関数のシグネチャ変更に合わせる）
  - `saveBatchData`: `req.params.projectName` → `req.params.projectId` に変更
    - `experimentDataService.saveBatchData` の呼び出しも `projectId` で渡すように変更

**フロントエンド:**
- [ ] `frontend/src/services/experimentDataApiService.ts`
  - `saveBatchExperimentData(projectName, ...)` → `saveBatchExperimentData(projectId, ...)` にシグネチャ変更
  - `getTemplateData(projectName, ...)` → `getTemplateData(projectId, ...)` にシグネチャ変更
  - URL構築部分を `projectId` 使用に変更
- [ ] フロントエンドの呼び出し元（`experimentDataApiService` を使用しているコンポーネント・フック）を調査し、`projectName` → `projectId` への変更に追随
  - **事前に呼び出し元を grep で確認すること**
- [ ] `frontend/src/types/api.ts` の関連するコメント・型定義を更新

---

## 変更するファイル

### MAIMLパス解決の修正（Phase 1〜5）

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/utils/maimlPathResolver.ts` | **新規作成**: `resolveMaimlFilePath` をエクスポート |
| `backend/src/services/taskRegistrationService.ts` | プライベート `resolveMaimlFilePath` 関数を削除し、`maimlPathResolver` をインポートに変更 |
| `backend/src/services/experimentDataService.ts` | 2箇所の直組み立てを `resolveMaimlFilePath` 呼び出しに変更・`getTemplateData` 関数の引数を `projectName → projectId` に変更 |
| `backend/src/services/maimlPublishService.ts` | 1箇所の直組み立てを `resolveMaimlFilePath` 呼び出しに変更 |
| `backend/src/services/maimlWriterService.ts` | 1箇所の直組み立てを `resolveMaimlFilePath` 呼び出しに変更 |
| `backend/src/services/projectInstructionService.ts` | （オプション）重複ロジックを `resolveMaimlFilePath` に置き換え |

### APIエンドポイントの修正（Phase 6）

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/routes/experimentRoutes.ts` | `:projectName` → `:projectId` に変更（GETとPOSTの2エンドポイント） |
| `backend/src/controllers/experimentController.ts` | `req.params.projectName` → `req.params.projectId` に変更・`getTemplateData` / `saveBatchData` のコントローラー引数を変更 |
| `frontend/src/services/experimentDataApiService.ts` | 関数引数 `projectName` → `projectId` に変更・URL構築を `projectId` 使用に変更 |
| `frontend/src/types/api.ts` | 関連する型定義のコメント・説明を更新 |

---

## 影響範囲

### 影響を受ける機能
- 実験データ取得（`getTemplateData`）
- みなし進捗更新（`updateDeemedProgress`）
- MAIMLファイル公開（`enqueuePublish`）
- MAIMLファイル書き込み（`maimlWriterService`）
- タスク登録（`taskRegistrationService` - 関数移動のみ、動作変化なし）

### 動作への影響
- `project_uuid` が設定済みのプロジェクト（通常ケース）: **改善** - file_metadata から正確なパスを取得
- `project_uuid` 未設定のプロジェクト（旧データ）: **変化なし** - フォールバックで従来通り動作

---

## 技術的詳細

### `resolveMaimlFilePath` の依存関係

```
resolveMaimlFilePath
  ├── projectRepository.findNameAndUuidById(organizationId, projectId)
  └── FileMetadataRepository.findMaimlByProjectUuid(projectUuid)
```

### `maimlWriterService.ts` のアーカイブ処理への影響

`filePath` は `pathParts` に分解されてアーカイブ処理にも使われる：

```typescript
const pathParts = filePath.split('/');
const fileName   = pathParts[pathParts.length - 1]; // 実際のファイル名.maiml
const dirPath    = pathParts.slice(0, -1).join('/'); // projects/{dirName}
const baseName   = fileName.replace(/\.maiml$/i, ''); // ファイル名（拡張子除く）
const archivePath = `${dirPath}/archive`;
// backupPath = 'projects/xxx/archive/{baseName}_v{n}.maiml'
```

**注意: `projectName` とMAIMLファイル名は必ずしも一致しない。**

- 旧方式: `filePath = projects/${projectName}/${projectName}.maiml` と決め打ち
  - MAIMLファイル名がプロジェクト名と異なる場合、**ファイルが見つからない**リスクがある
- 新方式（`resolveMaimlFilePath`）: `file_metadata.file_key` から実際のファイルパスを取得
  - `pathParts` 分解も**実際のファイル名**ベースで動作するため正しく機能する
  - アーカイブ命名は `{実際のbaseName}_v{n}.maiml` となり、実態に即した正しい動作になる

**→ アーカイブ処理は修正後のほうが正確に動作する。安全に修正できる。**

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `resolveMaimlFilePath` を共通化した際に import が循環参照になる | 中 | 低 | `utils/` に配置することで循環参照を防ぐ |
| `maimlWriterService.ts` でアーカイブパスの形式が変わる | 高 | 低 | file_metadata の file_key はプロジェクト作成時と同じ形式であることを確認 |
| `projectInstructionService.ts` で動作が変わる | 中 | 低 | Phase 5 は動作確認後に実施（オプション扱い） |

---

## テスト計画

### 手動テスト
- [ ] `project_uuid` 設定済みプロジェクトで実験データ取得が正常動作すること
- [ ] `project_uuid` 未設定プロジェクト（旧データ）でフォールバックが機能すること
- [ ] MAIMLファイル公開（`enqueuePublish`）が正常動作すること
- [ ] MAIMLファイル書き込み後にアーカイブが正常に作成されること

---

## 承認記録

- **計画書提示日時**: 2026-04-15 09:52
- **承認日時**: 2026-04-15 10:06
- **承認者コメント**: 承認。新しいセッションで実装を実施する。

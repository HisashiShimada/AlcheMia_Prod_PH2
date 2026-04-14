# 修正結果: file_metadata経由のMAIMLファイルアクセス取り込み

## 概要

PLAN.md で計画された「file_metadata から file_key を取得してプロジェクトの最新MAIMLファイルにアクセスする」対応が、以下の2ファイルに取り込み漏れていたため修正した。

- `backend/src/services/projectInstructionService.ts`
- `backend/src/services/taskRegistrationService.ts`

---

## 修正内容

### 1. `backend/src/services/projectInstructionService.ts`

#### 変更点

| # | 変更箇所 | 変更内容 |
|---|---------|---------|
| 1 | import | `FileMetadataRepository` を追加 |
| 2 | `buildProgramIdMap` 関数シグネチャ | `(organizationId, projectName)` → `(organizationId, projectId, projectName)` |
| 3 | `buildProgramIdMap` 関数内部 | MAIMLパス構築を `project_uuid → file_metadata → file_key` 方式に変更。未設定・未登録時は `projects/{projectName}/{projectName}.maiml` にフォールバック |
| 4 | `sendInstructions` 内の呼び出し | `buildProgramIdMap(organizationId, projectName)` → `buildProgramIdMap(organizationId, projectId, projectName)` |

#### 変更前後のMAIMLパス解決ロジック

```
【変更前】
filePath = `projects/${projectName}/${projectName}.maiml`

【変更後】
1. projectRepository.findNameAndUuidById() で project_uuid を取得
2. project_uuid が存在する場合:
   - FileMetadataRepository.findMaimlByProjectUuid() で file_key を取得
   - file_key が取得できた場合: organizationId プレフィックスを除いた相対パスを使用
   - file_key が取得できない場合: project_name フォールバック（警告ログ）
3. project_uuid が未設定の場合: project_name フォールバック（警告ログ）
```

---

### 2. `backend/src/services/taskRegistrationService.ts`

#### 変更点

| # | 変更箇所 | 変更内容 |
|---|---------|---------|
| 1 | import | `FileMetadataRepository` と `logger` を追加 |
| 2 | `resolveMaimlFilePath` 関数 | 新規追加（`projectInstructionService` の `buildProgramIdMap` 内ロジックと同等） |
| 3 | `getTaskRegistration` step 5 | インラインパス構築 → `resolveMaimlFilePath(organizationId, projectId, projectName)` 呼び出しに変更 |
| 4 | `saveTaskRegistration` step 5 | インラインパス構築 → `resolveMaimlFilePath(organizationId, projectId, projectName)` 呼び出しに変更 |
| 5 | `getTaskRegistration` / `saveTaskRegistration` 内 `projectName` | `project.project_name` → `project.project_name ?? ''` で型エラー解消 |

#### 追加した `resolveMaimlFilePath` 関数

```typescript
async function resolveMaimlFilePath(
  organizationId: string,
  projectId: string,
  projectName: string
): Promise<string>
```

- `projectRepository.findNameAndUuidById()` で `project_uuid` を取得
- `project_uuid` が存在する場合、`FileMetadataRepository.findMaimlByProjectUuid()` で `file_key` を取得
- `file_key` の先頭の `{organizationId}/` プレフィックスを除去して相対パスとして返す
- `project_uuid` 未設定・`file_key` 未登録の場合は `projects/{projectName}/{projectName}.maiml` にフォールバック

---

## 修正の目的

プロジェクト名変更機能の実装後、ストレージ上のMAIMLファイルパスは `project_name` ベースではなく `file_metadata.file_key` で管理されるようになった。

旧実装では以下のロジックでMAIMLにアクセスしていたため、プロジェクト名変更後に正しいファイルにアクセスできなくなる問題があった。

```typescript
// 旧: project_name ベースのパス（プロジェクト名変更後は不正なパスになる）
const filePath = `projects/${projectName}/${projectName}.maiml`;
```

今回の修正により、`project_uuid` → `file_metadata` → `file_key` の順でパスを解決することで、プロジェクト名変更後も常に正しいMAIMLファイルにアクセスできるようになった。

---

## 影響範囲

| 機能 | 影響 |
|------|------|
| 指示送信（`sendInstructions`） | MAIMLから `method_id → program_id` マップを構築する際に正しいファイルを参照 |
| タスク登録情報取得（`getTaskRegistration`） | MAIMLのメソッド差分検出時に正しいファイルを参照 |
| タスク登録保存（`saveTaskRegistration`） | MAIMLをパースして `transition_data` / `template_data` を初期登録する際に正しいファイルを参照 |

---

## 修正日時

2026-04-13

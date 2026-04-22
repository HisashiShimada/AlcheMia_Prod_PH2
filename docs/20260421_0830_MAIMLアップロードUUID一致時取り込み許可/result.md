# 実施結果: MAIMLアップロードUUID一致時取り込み許可

- **実施日時**: 2026-04-21
- **ステータス**: ✅ 完了（issues.md の全課題を解消）

---

## 実装完了内容

### Phase 1: バックエンド — 通常アップロード時のUUID一致チェック

**対象ファイル**: `backend/src/services/fileAccessService.ts`

- 通常アップロード（10MB以下）でMAIMLファイルが既に存在する場合、`MaimlParserTyped` でアップロードファイルのUUIDを抽出
- 既存プロジェクトの `project_uuid` と一致する場合は上書きを許可
- UUID不一致・抽出失敗の場合は従来通り `ValidationError` で拒否
- UUID一致時は `createMaimlBackup` を呼び出して既存MAIMLをarchiveフォルダにバックアップ
- archive フォルダ存在チェック（旧 Phase ③）は UUID一致上書きの場合はスキップ

### Phase 1.5: バックエンド — `createMaimlBackup` 共通ユーティリティ化

**新規ファイル**: `backend/src/utils/maimlArchiveHelper.ts`

- `maimlService.ts` の `createBackup` 処理（611〜681行）を `createMaimlBackup` として抽出・共通化
- `maimlService.ts` は `createMaimlBackup` を呼び出す形に変更（既存動作を維持）
- `fileAccessService.ts` からも `createMaimlBackup` を利用

### Phase 2: フロントエンド — チャンクアップロード前のUUID抽出

**対象ファイル**: `frontend/src/services/fileAccessService.ts`

- チャンクアップロード（10MB超）のセッション初期化（`POST /files/chunks/init`）前に MAIMLファイルのUUIDを抽出
- `MaimlParserTyped` を動的インポートして `getDocument().uuid` を取得
- 抽出成功時は `documentUuid` を init リクエストボディに含めて送信
- 抽出失敗時は `documentUuid` なしで送信（UUID不一致として拒否される）
- `uploadFiles()` の戻り値に `hasMaimlFile`（成功ファイルに `.maiml` が含まれるか）を追加

### Phase 3: バックエンド — チャンクアップロード init のUUID一致チェック

**対象ファイル**: `backend/src/controllers/fileAccessController.ts`

- `initChunkUpload` 関数の `project_maiml_flg` チェック部分にUUID比較ロジックを追加
- `req.body.documentUuid` と `existingProject.project_uuid` が一致する場合は許可（セッション発行）
- UUID不一致・未送信の場合は従来通り HTTP 400 / E7005 で拒否

### Phase 4: フロントエンド — UUID一致更新時の警告メッセージ

**対象ファイル**: `frontend/src/components/project/ProjectManagement.tsx`

- `handleUploadComplete` に警告メッセージ表示ロジックを実装
- アップロードに `.maiml` が含まれ、かつ `currentProject.project_uuid` が設定済みの場合（= UUID一致更新）に antd `message.warning` を表示
- 警告文: 「MAIMLファイルを更新しました。手作業で編集した場合は、「Parent」タグが正しく設定されていることを確認してください。」（8秒表示）

### その他の変更

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/types/project.ts` | `ProjectRow` 型に `project_uuid` フィールドを追加 |
| `backend/src/services/projectService.ts` | プロジェクト一覧マッピングに `project_uuid: row.project_uuid \|\| null` を追加 |
| `frontend/src/types/project.ts` | `Project` 型に `project_uuid` フィールドを追加 |
| `frontend/src/types/file.ts` | `UploadResponseData` 型に `hasMaimlFile?: boolean` を追加 |
| `frontend/src/components/project/BulkUploadDialog.tsx` | `onUploadComplete` コールバックに `hasMaimlFile` を渡す処理を追加 |

---

## TypeScriptビルド結果

| 対象 | 結果 |
|------|------|
| フロントエンド (`npx tsc --noEmit`) | ✅ Exit code 0（エラーなし） |
| バックエンド (`npx tsc --noEmit`) | ✅ Exit code 0（エラーなし） |

---

## issues.md 課題解消（2026-04-21 追記）

### 課題①解消: UUID一致アップロード後に「Parentタグ確認」警告が表示されない

**根本原因**:  
`backend/src/services/projectService.ts` の `list()` メソッドのSELECT文に `p.project_uuid` が欠落していた。  
GROUP BY には `p.project_uuid` が含まれていたが、SELECT リストには記載がなかったため、フロントエンドで `row.project_uuid` が常に `undefined`（→ `null`）になっていた。  
その結果、`currentProject.project_uuid` が常に `null` と評価され、UUID一致更新であっても警告が表示されなかった。

**修正ファイル**: `backend/src/services/projectService.ts`

**修正内容**: SELECT文の `file_count` サブクエリの直後に `p.project_uuid,` を追加。

```sql
-- 修正前（p.project_uuid がSELECTリストになかった）
          ) as maiml_file_key
        FROM project p

-- 修正後
          p.project_uuid,
          ) as maiml_file_key
        FROM project p
```

---

### 課題②解消: UUID不一致ファイルアップロード時のエラーメッセージが不明確

**根本原因**:  
`BulkUploadDialog.tsx` の catch ブロックで `extractErrorMessage(error)` を呼んでいたが、この関数は Axios エラーコード（`E5xxx` 等）を日本語汎用メッセージに変換する仕組みのため、`fileAccessService.ts` が `throw new Error("...アップロード先プロジェクトに異なるMAIMLが登録済みの可能性があります")` として投げた具体的なメッセージが失われていた。

**修正ファイル**: `frontend/src/components/project/BulkUploadDialog.tsx`

**修正内容**: `error.response`（Axios レスポンスエラー）がある場合はエラーコード変換を使用し、ない場合（`fileAccessService` が直接 throw した `Error`）は `error.message` をそのまま表示するよう分岐。

```typescript
// 修正前
const errorMessage = extractErrorMessage(error);

// 修正後
const axiosResponseError = (error as any)?.response;
const errorMessage = axiosResponseError
  ? extractErrorMessage(error)
  : (error instanceof Error ? error.message : extractErrorMessage(error));
```

これにより UUID不一致時に「MAIMLファイルのアップロードがサーバーで拒否されました（アップロード先プロジェクトに異なるMAIMLが登録済みの可能性があります）」という具体的なメッセージが表示されるようになった。

---

## 未解決課題（動作確認で問題が残ったもの）

~~課題①: UUID一致アップロード後に「Parentタグ確認」警告が表示されない~~ → 解消済み  
~~課題②: UUID不一致ファイルアップロード時に「完了」メッセージが表示される~~ → 解消済み

---

## 変更ファイル一覧（git diff --stat）

```
backend/src/controllers/fileAccessController.ts    | 29 +++++---
backend/src/services/fileAccessService.ts          | 71 ++++++++++++++-----
backend/src/services/maimlService.ts               | 81 +---------------------
backend/src/services/projectService.ts             |  2 +
backend/src/types/project.ts                       |  1 +
frontend/src/components/project/BulkUploadDialog.tsx | 34 ++++++++-
frontend/src/components/project/ProjectManagement.tsx | 29 ++++++--
frontend/src/services/fileAccessService.ts         | 63 ++++++++++++++---
frontend/src/types/file.ts                         |  7 ++
frontend/src/types/project.ts                      |  1 +
11 files changed, 203 insertions(+), 122 deletions(-)
```

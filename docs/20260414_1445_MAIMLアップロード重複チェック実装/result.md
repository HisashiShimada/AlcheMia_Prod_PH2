# 実施結果レポート: MAIMLアップロード project_uuid 登録処理追加

## メタデータ
- **作成日時**: 2026-04-14 15:09
- **タスクID**: 20260414_1445_MAIMLアップロード重複チェック実装
- **ステータス**: 完了

---

## 1. タスク概要

`backend/src/controllers/fileAccessController.ts` の `completeChunkUpload` にて、MAIMLファイルをアップロードした際に `file_metadata.project_uuid` および `project.project_uuid` をMAIMLファイルを解析して登録する処理が抜けていたため修正した。

---

## 2. 実施内容

### 2.1 バックエンド: `completeChunkUpload` の修正

**ファイル**: `backend/src/controllers/fileAccessController.ts`

#### 追加した処理の流れ

```
MAIMLファイル かつ projects/ パス かつ archive/ 以外
  ↓
storageService.downloadFile() でアップロード済みファILEを取得
  ↓
MaimlParserTyped でパース → doc.uuid を取得
  ↓
① project テーブル更新
   - project_uuid = documentUuid（変更がある場合のみ）
   - project_maiml_flg = true（false の場合のみ）
  ↓
② file_metadata テーブル更新
   - project_uuid = documentUuid
```

#### 実装のポイント

- **冪等性**: `project_uuid` が既に同じ値の場合は UPDATE をスキップ（不要な DB 更新を回避）
- **アーカイブ除外**: `/archive/` パスへのアップロードは `project_uuid` 更新対象外
- **パース失敗は処理続行**: MAIMLパースに失敗してもアップロード自体は成功扱い（警告ログのみ）
- **UUID が空の場合はスキップ**: MAIML内に `uuid` 属性がない場合も処理続行

#### 主要コード（抜粋）

```typescript
// MAIMLファイルをパースして project_uuid（Document UUID）を抽出
let documentUuid: string | null = null;
if (!isArchiveFile) {
  try {
    const maimlBuffer = await storageService.downloadFile(organizationId, relativeFileKey);
    const maimlContent = maimlBuffer.toString('utf-8');
    const maimlParser = new MaimlParserTyped(maimlContent);
    const doc = maimlParser.getDocument();
    const uuid = doc?.uuid?.trim();
    if (uuid && uuid.length > 0) {
      documentUuid = uuid;
    }
  } catch (parseErr) {
    console.warn('⚠️ [ChunkComplete] MAIMLパース失敗（処理続行）:', parseErr);
  }
}

// project.project_uuid と project_maiml_flg を更新
const needsFlagUpdate = !existingProject.project_maiml_flg;
const needsUuidUpdate = documentUuid !== null && existingProject.project_uuid !== documentUuid;
if (needsFlagUpdate || needsUuidUpdate) {
  const updatedProject: Project = {
    ...existingProject,
    ...(needsFlagUpdate ? { project_maiml_flg: true } : {}),
    ...(needsUuidUpdate ? { project_uuid: documentUuid! } : {}),
  };
  await projectRepository.update(updatedProject);
}

// file_metadata.project_uuid を更新
if (!isArchiveFile && documentUuid !== null) {
  await repository.updateFileMetadata(fullFileKey, { project_uuid: documentUuid });
}
```

---

### 2.2 バックエンド: `initChunkUpload` のエラーメッセージ修正

**ファイル**: `backend/src/controllers/fileAccessController.ts`

ユーザー指摘に基づき、複数MAIMLファイルチェックのエラーメッセージを修正。

| 修正前 | 修正後 |
|--------|--------|
| `1回のアップロードにMAIMLファイルは1件のみ指定できます` | `プロジェクトに登録できるMAIMLファイルは1件のみです。同一バッチに複数のMAIMLファイルを含めることはできません` |

**理由**: 「1回のアップロードに1件」という表現では制約の意図（プロジェクト単位の制約）が伝わらないため、プロジェクトに登録できるのが1件のみであることを明示するよう変更。

---

### 2.3 フロントエンド: `BulkUploadDialog.tsx` のメッセージ修正

**ファイル**: `frontend/src/components/project/BulkUploadDialog.tsx`

`handleFileChange` および `handleFolderSelect` の複数MAIMLチェック警告メッセージを同様に修正。

| 修正前 | 修正後 |
|--------|--------|
| `MAIMLファイルは1回のアップロードに1件のみ選択できます` | `プロジェクトに登録できるMAIMLファイルは1件のみです。最後に選択したMAIMLファイルのみ有効になります` |

---

## 3. 変更ファイル一覧

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `backend/src/controllers/fileAccessController.ts` | 修正 | `completeChunkUpload`: MAIMLパース → project_uuid 登録処理追加 |
| `backend/src/controllers/fileAccessController.ts` | 修正 | `initChunkUpload`: エラーメッセージ修正 |
| `frontend/src/components/project/BulkUploadDialog.tsx` | 修正 | `handleFileChange` / `handleFolderSelect`: 警告メッセージ修正 |

---

## 4. 動作確認ポイント

以下を手動テストで確認すること：

- [ ] MAIMLファイルをチャンクアップロードした後、`project.project_uuid` に MAIML 内の Document UUID が登録されること
- [ ] MAIMLファイルをチャンクアップロードした後、`file_metadata.project_uuid` に同じ UUID が登録されること
- [ ] archive/ パスへのアップロードでは `project_uuid` が更新されないこと
- [ ] MAIMLに `uuid` 属性がない場合もアップロードが成功すること（`project_uuid` は null のまま）
- [ ] 複数MAIMLファイルを選択した際に適切な警告メッセージが表示されること

---

## 5. 関連情報

- **マイグレーション**: `backend/migrations/20260413_add_project_uuid_to_project_and_file_metadata.sql`（`project_uuid` カラム追加済み）
- **既存の通常アップロード（`uploadFiles`）**: `fileAccessService.ts` 内で同様の処理が実装済みであり、今回はチャンクアップロードに同等の処理を追加した

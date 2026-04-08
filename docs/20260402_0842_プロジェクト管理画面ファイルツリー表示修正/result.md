# 実施結果: プロジェクト管理画面ファイルツリー表示修正

## 作業日時
2026-04-02

## 実施状況
**完了**（コード修正・動作確認済み）

---

## 修正ファイル一覧

| ファイル | 変更概要 |
|---------|---------|
| `backend/src/types/file.ts` | 型定義追加（`ProjectFileResponse`, `GetProjectFilesData`, `StorageFileEntry`） |
| `backend/src/services/projectService.ts` | `getProjectFiles` ロジック全面修正 |
| `backend/src/controllers/projectController.ts` | サービス層の戻り値型変更（`subFolderFiles` 対応）に追従 |
| `frontend/src/services/projectApiService.ts` | `FileListResponse` 型修正（`archiveFiles` → `subFolderFiles`） |
| `frontend/src/components/project/ProjectManagement.tsx` | フォルダナビゲーション修正（`subFolderFiles` 対応・多階層化） |
| `frontend/src/components/project/FileListTable.tsx` | フォルダ名表示の末尾セグメント抽出ロジック修正 |
| `frontend/src/utils/apiClient.ts` | API呼び出し関連の微修正 |
| `docs/design/api/api_project_management.md` | API仕様書更新（レスポンス構造・クエリパラメータ修正） |
| `docs/design/ui/experiment_admin/01_project_management/ui_file_list_table.md` | UI仕様書更新（サブフォルダ対応を「使用場面」に明記） |

---

## 修正内容詳細

### 1. `backend/src/types/file.ts`

**追加した型定義:**

- `ProjectFileResponse` インターフェース  
  バックエンドのサービス層が返すファイル1件分の型。`isFolder`, `isArchive`, `version`, `fileCount` 等のフィールドを含む。

- `GetProjectFilesData` インターフェース  
  `getProjectFiles` サービスメソッドの戻り値型。  
  `files: ProjectFileResponse[]`（ルート直下）と `subFolderFiles: Record<string, ProjectFileResponse[]>`（サブフォルダ別）を持つ。

- `StorageFileEntry` インターフェース  
  `storageService.listFiles()` が返す1ファイル分の型（`key`, `size`, `lastModified`）。

---

### 2. `backend/src/services/projectService.ts`

**`getProjectFiles` メソッドを全面書き換え。**

**変更前の問題:**
- S3の全ファイルをフラットに取得し、`archive/` 配下だけ除外してそのまま `files[]` に詰めていた
- `rawdata/` 等のサブフォルダ配下のファイルがルート直下にフラット表示されていた

**変更後の動作:**

```
S3全ファイル取得
  → .keep ファイルを除外
  → projectPrefix ("orgId/projects/projectName/") を除去して相対パスを取得
  → セグメント数で分類:
      length === 1 → rootOnlyFiles（ルート直下ファイル）
      length >= 2  → subFolderMap[topFolder]（サブフォルダ別に振り分け）
  → rootOnlyFiles に署名付きURL生成 → files[] に追加
  → subFolderMap の各フォルダ内ファイルに署名付きURL生成 → subFolderFiles[folderName][] に追加
  → subFolderMap のキー（フォルダ名）ごとに isFolder:true のエントリを files[] 末尾に追加
```

- `archive` フォルダも通常サブフォルダと同じフロー（`isArchive:true`, `version` は維持）
- 後方互換の `archiveFiles` フィールドは削除（`subFolderFiles["archive"]` に統合）

---

### 3. `frontend/src/services/projectApiService.ts`

**`FileListResponse` 型を修正:**

```typescript
// 変更前
archiveFiles: ProjectFile[];

// 変更後
subFolderFiles: Record<string, ProjectFile[]>;
```

---

### 4. `frontend/src/components/project/ProjectManagement.tsx`

**(1) `ProjectFilesData` 型の修正**

```typescript
// 変更前
interface ProjectFilesData {
  root: ProjectFile[];
  archive: ProjectFile[];
}

// 変更後
interface ProjectFilesData {
  root: ProjectFile[];
  subFolderFiles: Record<string, ProjectFile[]>;
}
```

**(2) APIレスポンスの保存箇所修正**

```typescript
// 変更前
archive: fileResponse.archiveFiles || [],

// 変更後
subFolderFiles: fileResponse.subFolderFiles || {},
```

**(3) `handleFolderClick` の修正**

```typescript
// 変更前: root か archive の2値のみ対応
setCurrentFolder('root');
setCurrentFolder(folderId); // 'archive' 固定相当

// 変更後: 多階層対応
if (folderId === 'back') {
  // 1階層上へ（currentFolder="rawdata/sub" → "rawdata" → "root"）
  const parts = currentFolder.split('/');
  if (parts.length <= 1) setCurrentFolder('root');
  else { parts.pop(); setCurrentFolder(parts.join('/')); }
} else {
  // サブフォルダへ
  if (currentFolder === 'root') setCurrentFolder(folderId);
  else setCurrentFolder(`${currentFolder}/${folderId}`);
}
```

**(4) `projectFiles` useMemo の修正**

- `currentFolder === 'root'` の場合:  
  バックエンドが返す `files[]`（ルート直下ファイル + フォルダエントリ）をそのまま返す。  
  `archive` フォルダは `subFolderFiles["archive"]` が空の場合は非表示。

- `currentFolder !== 'root'` の場合（旧: `archive` 固定）:  
  `currentFolder` を `/` で分割し、先頭セグメントを `topFolder` として `subFolderFiles[topFolder]` を参照。  
  `currentFolder` 直下のファイルのみ表示し、さらに深い階層はフォルダエントリとして生成。

---

## 原因調査の経緯

当初、バックエンドのファイル一覧取得ロジックやフロントエンドのフォルダナビゲーションに問題があると想定して上記の修正を実施した。  
しかし、調査の結果、**根本原因はファイルサーバ（Swift/S3）側に格納されているフォルダ名の問題**であることが判明した。  
フォルダ名の修正後、上記コード変更も合わせて適用することで画面上のファイルツリー表示が正常に動作することを確認した。

## 備考

変更ファイルには上記4ファイルのほか、以下も含まれる（対応内容は上記修正に付随するもの）：
- `frontend/src/components/project/FileListTable.tsx` — フォルダ名表示の末尾セグメント抽出ロジック修正
- `frontend/src/utils/apiClient.ts` — API呼び出し関連の微修正
- `backend/src/controllers/projectController.ts` — サービス層の戻り値型変更に対応


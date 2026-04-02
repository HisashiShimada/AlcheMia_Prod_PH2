# タスク計画書: プロジェクト管理画面ファイル一覧のサブパス対応

## メタデータ
- **作成日時**: 2026-04-02 08:44
- **タスクID**: project-file-tree-fix
- **優先度**: 中
- **推定工数**: 4時間

## 1. タスク概要

プロジェクト管理画面のファイル一覧タブで、`archive/` 以外のサブフォルダ配下のファイルが
フラットに直下表示されてしまう問題を修正する。

実際のS3パス構造（サブフォルダ階層）に合わせたツリー表示を実現する。

---

## 2. 現状の問題

### 問題の再現パス例

```
S3上の実際の構造:
projects/SampleProject/
  ├── SampleProject.maiml         ← 直下ファイル（正常）
  ├── rawdata/
  │   ├── measurement_01.csv     ← サブフォルダ配下
  │   └── measurement_02.csv     ← サブフォルダ配下
  └── results/
      └── analysis.xlsx           ← サブフォルダ配下
```

```
現状の表示（バグ）:
root フォルダ表示:
  - SampleProject.maiml
  - measurement_01.csv            ← rawdata/ を無視してフラット表示
  - measurement_02.csv
  - analysis.xlsx                 ← results/ を無視してフラット表示
  - archive/（フォルダ）

期待する表示:
root フォルダ表示:
  - SampleProject.maiml
  - rawdata/（フォルダ）           ← フォルダとして表示
  - results/（フォルダ）
  - archive/（フォルダ）

rawdata/ フォルダクリック後:
  - ← (戻る)
  - measurement_01.csv
  - measurement_02.csv
```

### 根本原因

**バックエンド (`backend/src/services/projectService.ts` の `getProjectFiles`)**

```typescript
// storageService.listFiles() はS3の全ファイルをフラットに返す（再帰的）
const currentFiles = await storageService
  .listFiles(organizationId, `projects/${projectName}/`)
  .catch(() => []);

// archive/ を除外するだけで、サブフォルダ内のファイルもそのまま files[] に追加している
const rootFiles = currentFiles.filter((file: any) => {
  if (file.key.includes('/archive/')) return false;  // archiveのみ除外
  const fileName = file.key.split('/').pop() || '';
  if (fileName === '' || fileName === '.keep') return false;
  return true; // ← サブフォルダ配下のファイルもそのまま通過してしまう
});
```

**フロントエンド (`frontend/src/components/project/ProjectManagement.tsx`)**

```typescript
// currentFolder は 'root' か 'archive' の2値しか対応していない
const [currentFolder, setCurrentFolder] = useState<string>('root');

if (currentFolder === 'root') {
  // rootFiles (=全フラットファイル) + archiveフォルダを表示するだけ
} else if (currentFolder === 'archive') {
  // archiveフォルダの中身を表示
}
// サブフォルダ内のナビゲーションは未実装
```

---

## 3. 修正方針

### 方針: バックエンドでフォルダ構造を構築してレスポンスに含める

`listFiles` が返す全ファイルパスを解析し、**プロジェクトルート直下の項目（ファイル or フォルダ）** だけを返す。フォルダの場合は `isFolder: true` フラグを付けて返す。

フロントエンド側では、フォルダクリック時に新たなAPIコールを行うか、または初回取得時に全階層分のデータを取得しておく。

**採用方式: 全階層を初回に取得してフロントエンドでナビゲーション管理**（既存の `archiveFiles` 分離構造を踏襲）

- バックエンド: `files` レスポンスの構造を変更し、直下項目のみをフォルダ込みで返す  
  サブフォルダ配下のファイルは **サブフォルダパスをキーとしたマップ** で別途返す
- フロントエンド: `currentFolder` を `'root'` / `'archive'` / `'subfolder:<relativePath>'` の3種に拡張

ただし、仕様上サブフォルダの深さが深くなる可能性もあるため、**再帰的なフォルダツリーをJSONで返す**方式も検討したが、既存の `files[]` / `archiveFiles[]` の型・APIレスポンス構造を最小限の変更で維持するために以下を採用する。

---

## 4. 実装方針（確定・更新）

### 統一方針: archive を通常サブフォルダとして統一、ただしファイルの区別は維持

- `archiveFiles` という別フィールドを廃止し、`subFolderFiles["archive"]` に統合
- `archive` 配下のファイルには引き続き `isArchive: true`・`version` を付与して区別可能にする
- これにより将来的に archive フォルダ/ファイルへの制限をかける際も `isArchive` フラグで対応できる

### 4-1. バックエンド修正

**ファイル**: `backend/src/services/projectService.ts`

`getProjectFiles` メソッド内のファイル構築ロジックを全面修正する。

#### 変更後のレスポンス構造

```typescript
{
  projectId: string;
  projectName: string;
  files: ProjectFile[];    // ルート直下のファイル + サブフォルダエントリ（archiveを含む）
  archiveFiles: ProjectFile[];   // 後方互換のため空配列を返す（廃止予定）
  subFolderFiles: {
    "archive": ProjectFile[];    // isArchive:true, version付き
    "rawdata": ProjectFile[];    // isArchive:false
    // ...
  };
}
```

#### 構築ロジック概要

```typescript
// file.key 例: "{orgId}/projects/{projectName}/rawdata/measurement.csv"
// projectPrefix = "{orgId}/projects/{projectName}/"

// 1. projectPrefix を除去してプロジェクト相対パスを取得
//    → "rawdata/measurement.csv"

// 2. 相対パスのセグメントを分割
//    → ["rawdata", "measurement.csv"]

// 3. セグメント数で分岐
//    length === 1: ルート直下ファイル → files[] に追加
//    length >= 2:  サブフォルダ配下  → subFolderFiles[topFolder] に追加
//                  topFolder === "archive" の場合は isArchive:true, version を付与

// 4. ルート直下フォルダエントリを files[] に追加
//    サブフォルダ名を収集して isFolder:true のエントリを files[] 末尾に追加
```

### 4-2. フロントエンド修正

**ファイル**: `frontend/src/components/project/ProjectManagement.tsx`

1. `ProjectFilesData` 型を修正: `archive` フィールドを削除し `subFolderFiles` を追加
2. APIレスポンスの `subFolderFiles` を状態に保存（`archiveFiles` の代わり）
3. `currentFolder` ステートの値を拡張: `'root'` | `'subfolder:<path>'`
   - `'archive'` は `'subfolder:archive'` に統合
4. `projectFiles` の `useMemo` を修正:
   - `currentFolder === 'root'`: ルート直下ファイル + サブフォルダエントリ（`files[]`）を表示
   - `currentFolder === 'subfolder:<path>'`: 戻るボタン + `subFolderFiles[path]` を表示
5. `handleFolderClick` を修正: 全サブフォルダを `setCurrentFolder('subfolder:<name>')` で統一

### 4-3. APIレスポンス型の修正

**ファイル**: `frontend/src/services/projectApiService.ts`

`FileListResponse` に `subFolderFiles` を追加し、`archiveFiles` は後方互換のため残す（オプション化）。

---

## 5. 詳細実装ステップ

### Phase 1: バックエンド修正

- [ ] `backend/src/services/projectService.ts`
  - `getProjectFiles` の全ファイル処理ロジックを書き換え
  - S3全ファイルをプロジェクト相対パスで分類
  - ルート直下ファイル → `files[]` に追加（署名付きURL生成）
  - サブフォルダ（archive含む）→ `subFolderFiles[folderName][]` に追加
    - `archive` 配下のファイルには `isArchive: true`・`version` を付与
  - `files[]` 末尾にサブフォルダエントリ（`isFolder: true`）を追加
  - `archiveFiles` は後方互換のため空配列 `[]` を返す

### Phase 2: フロントエンド修正

- [ ] `frontend/src/services/projectApiService.ts`
  - `FileListResponse` 型に `subFolderFiles: Record<string, ProjectFile[]>` を追加
  - `archiveFiles` はオプション（`archiveFiles?: ProjectFile[]`）に変更

- [ ] `frontend/src/components/project/ProjectManagement.tsx`
  - `ProjectFilesData` 型を修正: `archive` → `subFolderFiles: Record<string, ProjectFile[]>`
  - APIレスポンスの `subFolderFiles` を状態に保存
  - `currentFolder` の `'archive'` を `'subfolder:archive'` に統一
  - `projectFiles` の `useMemo` を修正
    - `'root'`: `files[]` をそのまま返す（フォルダエントリ含む）
    - `'subfolder:<path>'`: 戻るボタン + `subFolderFiles[path]` を返す
  - `handleFolderClick` を修正
    - 全フォルダ → `setCurrentFolder('subfolder:<folderName>')`
    - 戻るボタン → `setCurrentFolder('root')`

### Phase 3: 動作確認

- [ ] S3上にサブフォルダ付きのプロジェクトが存在する場合、フォルダが表示されること
- [ ] サブフォルダクリックでナビゲーションできること
- [ ] 戻るボタンでルートに戻れること
- [ ] サブフォルダがない場合は既存と同じ表示になること
- [ ] `archive/` フォルダの動作が変わらないこと

---

## 6. 変更ファイル

### 修正
1. `backend/src/services/projectService.ts` - `getProjectFiles` ロジック修正（archive統一）
2. `frontend/src/services/projectApiService.ts` - `FileListResponse` 型に `subFolderFiles` 追加
3. `frontend/src/components/project/ProjectManagement.tsx` - archive統一 + サブフォルダナビゲーション実装

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| S3のlistFilesが深いネストに対応できるか | 中 | 低 | `storageService.listFiles` は再帰的に全ファイルを返すことを確認済み |
| 既存のarchive表示が壊れる | 高 | 低 | archive処理は手を加えず独立して維持 |
| 署名付きURL生成の並列処理でパフォーマンス劣化 | 中 | 低 | 既存のchunkSize=20の仕組みをサブフォルダにも適用 |
| ネストが深い場合（2階層以上のサブフォルダ） | 中 | 中 | 今回は1階層分のみ対応（`rawdata/sub/file.csv` は `rawdata/` フォルダとして表示し、その中で再度フォルダ表示） → 再帰的な `subFolderFiles` で対応 |

### 深いネストの対応について

`subFolderFiles` は「トップレベルフォルダ名 → その配下の全ファイル」のフラットマップとする。
- `"rawdata"` → `[measurement_01.csv, measurement_02.csv]`
- `"archive"` → `[SampleProject_v1.maiml (isArchive:true), ...]`

**初期実装では1階層のみ対応**とし、必要に応じて拡張する。

### archive ファイルの区別方法

`isArchive: true` フラグと `version` 番号を維持することで、将来的な制限付与に対応:
```typescript
// archive配下のファイル例
{
  id: "...",
  name: "SampleProject_v1.maiml",
  isArchive: true,    // ← archive配下であることを識別
  version: 1,         // ← バージョン番号
  isFolder: false,
}
```

---

## 8. 承認記録

- **計画書提示日時**: 2026-04-02 08:44
- **承認日時**: （承認待ち）
- **承認者コメント**: 

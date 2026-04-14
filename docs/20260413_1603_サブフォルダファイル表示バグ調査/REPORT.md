# バグ調査レポート: サブフォルダ内ファイルが表示されない

## 調査日時
2026-04-13 16:03

## 対象ファイル
- `frontend/src/components/project/ProjectManagement.tsx`
- `frontend/src/components/project/FileListTable.tsx`
- `backend/src/services/projectService.ts`

---

## 事象

プロジェクト管理画面のファイルツリーでサブフォルダをクリックして階層を降りると、そのサブフォルダ内に実際にファイルが存在するにもかかわらず、**ファイルが1件も表示されない**。

---

## 根本原因

`フォルダのid`（`folder_${folderName}` 形式）をそのまま `currentFolder` として使用しているため、`subFolderFiles` への参照キーが不一致になる。

### データフロー

#### 1. バックエンド: フォルダエントリの生成

`backend/src/services/projectService.ts` L1154〜1168

```typescript
for (const folderName of Object.keys(subFolderMap)) {
  const folderEntry = {
    id: `folder_${folderName}`,   // ← "folder_rawdata" 等
    name: folderName,             // ← "rawdata"
    path: `projects/${projectName}/${folderName}`,
    ...
  };
  files.push(folderEntry);
}
```

フォルダエントリの **`id` は `folder_rawdata`**（`folder_` プレフィックス付き）だが、  
`subFolderFiles` のキーは **`rawdata`**（プレフィックスなし）。

```typescript
// subFolderFiles のキー構造
{
  "rawdata": [ ...ファイル一覧... ],
  "archive": [ ...ファイル一覧... ],
}
```

#### 2. FileListTable: フォルダクリック時に `record.id` を渡す

`frontend/src/components/project/FileListTable.tsx` L350〜354

```tsx
onRow={(record) => ({
  onClick: () => {
    if (record.isFolder) {
      onFolderClick?.(record.id);  // ← "folder_rawdata" が渡る
    }
  },
})}
```

#### 3. ProjectManagement: `currentFolder` に `folder_rawdata` をセット

`frontend/src/components/project/ProjectManagement.tsx` L382〜400

```typescript
const handleFolderClick = useCallback((folderId: string) => {
  if (folderId === 'back') {
    // 戻る処理
  } else {
    if (currentFolder === 'root') {
      setCurrentFolder(folderId);  // ← currentFolder = "folder_rawdata"
    } else {
      setCurrentFolder(`${currentFolder}/${folderId}`);
    }
  }
}, [currentFolder]);
```

#### 4. projectFiles useMemo: `subFolderFiles["folder_rawdata"]` を参照 → 空配列

`frontend/src/components/project/ProjectManagement.tsx` L521〜528

```typescript
} else {
  // currentFolder = "folder_rawdata"
  const segments = currentFolder.split('/');
  const topFolder = segments[0];  // ← "folder_rawdata"

  // subFolderFiles のキーは "rawdata" なので undefined → [] が返る
  const allFilesInFolder = (projectData.subFolderFiles || {})[topFolder] || [];
  //                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                        subFolderFiles["folder_rawdata"] = undefined → []
}
```

`subFolderFiles` のキーは `"rawdata"` だが、参照キーが `"folder_rawdata"` になるため、  
`allFilesInFolder` は常に空配列 `[]` となり、ファイルが表示されない。

---

## 問題箇所の整理

| 場所 | 問題 |
|------|------|
| `FileListTable.tsx` L352 | `onFolderClick?.(record.id)` — `id` は `"folder_rawdata"` 形式 |
| `handleFolderClick` L394 | `setCurrentFolder(folderId)` — `folder_` プレフィックス付きのまま currentFolder に入る |
| `projectFiles` L527 | `subFolderFiles[topFolder]` — キーが `"rawdata"` なのに `"folder_rawdata"` で参照 |

---

## 修正方針

### 方針A（推奨）: `handleFolderClick` で `folder_` プレフィックスを除去

変更箇所: `ProjectManagement.tsx` の `handleFolderClick`

```typescript
const handleFolderClick = useCallback((folderId: string) => {
  if (folderId === 'back') {
    // 戻る処理（変更なし）
    const parts = currentFolder.split('/');
    if (parts.length <= 1) {
      setCurrentFolder('root');
    } else {
      parts.pop();
      setCurrentFolder(parts.join('/'));
    }
  } else {
    // "folder_" プレフィックスを除去してフォルダ名を取得
    const folderName = folderId.startsWith('folder_')
      ? folderId.substring('folder_'.length)
      : folderId;

    if (currentFolder === 'root') {
      setCurrentFolder(folderName);
    } else {
      setCurrentFolder(`${currentFolder}/${folderName}`);
    }
  }
}, [currentFolder]);
```

**メリット**: 変更箇所が最小限（1関数のみ）。  
**デメリット**: なし。

---

### 方針B: `FileListTable.tsx` でフォルダクリック時に `record.name` を渡す

変更箇所: `FileListTable.tsx` L352

```tsx
onFolderClick?.(record.name);  // "rawdata" が渡る
```

ただし、戻るボタンは `id: 'back'`、`name: '↑ 戻る'` であるため、  
`handleFolderClick` の `folderId === 'back'` チェックが壊れる。  
戻るボタンも `name` ベースに変更するか、別の判定方法が必要になるため修正範囲が広くなる。

---

### 方針C: バックエンドでフォルダエントリの `id` を `folderName` と一致させる

変更箇所: `backend/src/services/projectService.ts` L1155

```typescript
id: folderName,  // "folder_" プレフィックスを除去
```

ただし、フロントエンドの `handleFolderClick` が `folderId === 'back'` と `id` ベースで判定しているため、  
バックエンドとフロントエンドの両方を変更する必要がある。

---

## デグレード調査結果

### バグ混入コミット

コミット `a015d1e9`（**「Jira対応 プロジェクト一覧のサブフォルダ対応」**）で本バグが混入した。

`a015d1e9` でサブフォルダ対応が実装された際、バックエンドのフォルダエントリ `id` を `folder_${folderName}` 形式にしたが、  
フロントエンドの `handleFolderClick` がその `id` をそのまま `currentFolder` にセットしていた。  
その後の後続コミット（`22a0bcfe`、`87ab160f`、`78be5413` など）では本箇所は変更されておらず、デグレードではなく**最初から動作していなかった**。

`a015d1e9` の `handleFolderClick` 実装：
```typescript
} else {
  // サブフォルダへ潜る
  if (currentFolder === 'root') {
    setCurrentFolder(folderId);  // ← folderId = "folder_rawdata"（プレフィックス除去なし）
  } else {
    setCurrentFolder(`${currentFolder}/${folderId}`);
  }
}
```

同コミットの useMemo 実装：
```typescript
const topFolder = segments[0];  // ← "folder_rawdata" がそのままキーになる
const allFilesInFolder = (projectData.subFolderFiles || {})[topFolder] || [];
// subFolderFiles["folder_rawdata"] = undefined → 常に []
```

バックエンドのフォルダエントリ `id` と `subFolderFiles` のキーが同一コミットで矛盾した状態で実装されたことが原因。

---

## 推奨修正

**方針A** が最もシンプルで影響範囲が小さい。

`ProjectManagement.tsx` の `handleFolderClick` 内で `folder_` プレフィックスを除去するだけで修正できる。

### 修正後の動作

1. `rawdata` フォルダをクリック → `FileListTable` が `"folder_rawdata"` を `onFolderClick` に渡す
2. `handleFolderClick` が `"folder_rawdata"` → `"rawdata"` に変換して `currentFolder = "rawdata"` にセット
3. `projectFiles` useMemo で `segments[0] = "rawdata"` → `subFolderFiles["rawdata"]` が正しく参照される
4. ファイルが正常に表示される

---

## 関連コード

```
frontend/src/components/project/ProjectManagement.tsx
  - L382-400: handleFolderClick（修正対象）
  - L521-589: projectFiles useMemo（topFolder を subFolderFiles のキーとして使用）

frontend/src/components/project/FileListTable.tsx
  - L350-356: onRow の onClick（record.id を onFolderClick に渡す）

backend/src/services/projectService.ts
  - L1153-1169: フォルダエントリ生成（id = "folder_${folderName}"）
  - L1102-1148: subFolderFiles 構築（キー = folderName）
```

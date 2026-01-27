# FileListTable - archiveフォルダ表示とファイルフィルタリング分析

## メタデータ
- **作成日時**: 2026-01-26 13:02
- **対象ファイル**: `frontend/src/components/project/FileListTable.tsx`
- **分析内容**: archiveフォルダの表示ロジックと特定ファイルのフィルタリング可否

---

## 1. 現状の実装概要

### コンポーネントの役割
`FileListTable`は、プロジェクトのファイル一覧を表示するテーブルコンポーネントです。

**主な機能:**
- ファイル/フォルダ一覧の表示
- ファイルタイプ別アイコン表示
- ファイルダウンロード機能
- ファイルビューア起動機能
- フォルダクリック時の遷移

---

## 2. archiveフォルダの表示ロジック

### 2.1 重要な発見

**このコンポーネント自体にフィルタリングロジックは実装されていません。**

```typescript
interface FileListTableProps {
  files: ProjectFile[];  // ← 親から渡された配列をそのまま表示
  projectId: string;
  onFileClick?: (file: ProjectFile) => void;
  onFolderClick?: (folderId: string) => void;
  onViewFile?: (file: ProjectFile) => void;
}
```

### 2.2 表示の仕組み

#### ステップ1: データの受け取り
- 親コンポーネントから`files`プロパティで配列を受け取る
- **受け取った配列をそのままテーブルの`dataSource`に設定**

```typescript
<Table
  dataSource={files}  // ← そのまま表示
  columns={columns}
  // ...
/>
```

#### ステップ2: フォルダの判定と表示

**フォルダ判定:**
```typescript
if (file.isFolder) {
  return <FolderOpenOutlined style={{ ... }} />;
}
```

**archiveタイプの判定:**
```typescript
switch (file.type) {
  case 'archive':
    return <FolderOpenOutlined style={{ fontSize: token.fontSizeLG, color: token.colorWarning }} />;
  // ...
}
```

**表示の違い:**
| 条件 | アイコン | 色 | 備考 |
|------|---------|-----|------|
| `isFolder = true` | FolderOpenOutlined | colorWarning (黄色) | フォルダ全般 |
| `type = 'archive'` | FolderOpenOutlined | colorWarning (黄色) | archiveタイプ |
| 通常ファイル | 各種ファイルアイコン | タイプ別の色 | maiml, pdf, excel等 |

#### ステップ3: フォルダクリック時の動作

```typescript
onRow={(record) => ({
  onClick: () => {
    if (record.isFolder) {
      onFolderClick?.(record.id);  // ← 親のコールバック呼び出し
    } else {
      onFileClick?.(record);
    }
  },
  // ...
})}
```

**動作:**
1. フォルダ行をクリック
2. `record.isFolder`がtrueならば
3. 親コンポーネントの`onFolderClick`コールバックを呼び出す
4. 親コンポーネント側でフォルダ内のファイル一覧を取得し、`files`を更新
5. 更新された`files`が再度このコンポーネントに渡される

---

## 3. 特定ファイルのフィルタリング可否

### 3.1 現状の実装

**フィルタリング機能は実装されていません。**

```typescript
// ❌ フィルタリングなし - そのまま表示
<Table
  dataSource={files}
  columns={columns}
  // ...
/>
```

### 3.2 フィルタリング実装の2つの方法

#### 方法1: このコンポーネント内でフィルタリング（推奨）

**メリット:**
- 再利用性が高い
- 親コンポーネントの変更不要

**実装例:**
```typescript
const FileListTable: React.FC<FileListTableProps> = ({ 
  files, 
  projectId, 
  onFileClick, 
  onFolderClick, 
  onViewFile 
}) => {
  // .keepファイルを除外
  const filteredFiles = files.filter(file => {
    // .keepファイルを非表示
    if (file.name === '.keep') {
      return false;
    }
    
    // archiveフォルダを非表示（必要に応じて）
    if (file.name === 'archive' && file.isFolder) {
      return false;
    }
    
    return true;
  });

  return (
    <Table
      dataSource={filteredFiles}  // ← フィルタリング後の配列を使用
      columns={columns}
      // ...
    />
  );
};
```

#### 方法2: 親コンポーネントでフィルタリング

**メリット:**
- FileListTableはシンプルなまま
- 親側で柔軟に制御可能

**実装例（親コンポーネント側）:**
```typescript
// 親コンポーネント
const filteredFiles = files.filter(file => {
  if (file.name === '.keep') return false;
  if (file.name === 'archive' && file.isFolder) return false;
  return true;
});

<FileListTable 
  files={filteredFiles}  // ← フィルタリング済みを渡す
  projectId={projectId}
  // ...
/>
```

---

## 4. フィルタリング実装の推奨パターン

### 4.1 .keepファイルの除外

```typescript
// .keepファイルを除外
const filteredFiles = files.filter(file => file.name !== '.keep');
```

### 4.2 archiveフォルダの除外

```typescript
// archiveフォルダを除外
const filteredFiles = files.filter(file => {
  return !(file.name === 'archive' && file.isFolder);
});
```

### 4.3 複合条件

```typescript
// 複数の条件でフィルタリング
const filteredFiles = files.filter(file => {
  // .keepファイルを除外
  if (file.name === '.keep') return false;
  
  // archiveフォルダを除外
  if (file.name === 'archive' && file.isFolder) return false;
  
  // 隠しファイルを除外（.で始まるファイル）
  if (file.name.startsWith('.')) return false;
  
  return true;
});
```

### 4.4 条件を外部化（設定可能にする）

```typescript
interface FileListTableProps {
  files: ProjectFile[];
  projectId: string;
  hidePatterns?: string[];  // ← 除外パターンを設定可能に
  onFileClick?: (file: ProjectFile) => void;
  onFolderClick?: (folderId: string) => void;
  onViewFile?: (file: ProjectFile) => void;
}

const FileListTable: React.FC<FileListTableProps> = ({ 
  files, 
  projectId, 
  hidePatterns = ['.keep'],  // デフォルトで.keepを除外
  onFileClick, 
  onFolderClick, 
  onViewFile 
}) => {
  const filteredFiles = files.filter(file => {
    return !hidePatterns.includes(file.name);
  });

  // ...
};
```

---

## 5. archiveフォルダの表示制御オプション

### オプション1: 完全に非表示

```typescript
// archiveフォルダを一覧に表示しない
const filteredFiles = files.filter(file => {
  return !(file.name === 'archive' && file.isFolder);
});
```

**用途:** archiveフォルダを完全に隠したい場合

### オプション2: 表示するが無効化

```typescript
// archiveフォルダは表示するが、クリック不可
onRow={(record) => ({
  onClick: () => {
    if (record.name === 'archive' && record.isFolder) {
      message.warning('アーカイブフォルダは参照できません');
      return;
    }
    
    if (record.isFolder) {
      onFolderClick?.(record.id);
    } else {
      onFileClick?.(record);
    }
  },
  // ...
})}
```

**用途:** archiveフォルダの存在は見せるが、アクセスを禁止したい場合

### オプション3: アイコンや色で区別

```typescript
// archiveフォルダは灰色で表示
render: (text: string, record: ProjectFile) => (
  <span
    style={{
      fontWeight: record.isFolder ? token.fontWeightStrong : 'normal',
      color: record.name === 'archive' 
        ? token.colorTextDisabled  // ← 灰色で表示
        : record.isFolder 
          ? token.colorWarning 
          : 'inherit',
      cursor: record.name === 'archive' ? 'not-allowed' : 'pointer',
    }}
  >
    {text}
  </span>
)
```

**用途:** archiveフォルダを視覚的に区別したい場合

---

## 6. 実装の推奨事項

### 推奨実装パターン

```typescript
const FileListTable: React.FC<FileListTableProps> = ({ 
  files, 
  projectId, 
  onFileClick, 
  onFolderClick, 
  onViewFile 
}) => {
  const { token } = theme.useToken();
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // ★ フィルタリング処理を追加
  const filteredFiles = React.useMemo(() => {
    return files.filter(file => {
      // .keepファイルを除外
      if (file.name === '.keep') {
        return false;
      }
      
      // archiveフォルダを除外（必要に応じて）
      if (file.name === 'archive' && file.isFolder) {
        return false;
      }
      
      return true;
    });
  }, [files]);

  // ...

  return (
    <Table
      dataSource={filteredFiles}  // ← フィルタリング後を使用
      columns={columns}
      // ...
    />
  );
};
```

**ポイント:**
- `useMemo`でパフォーマンス最適化
- フィルタリング条件を明確に記述
- コメントで除外理由を明記

---

## 7. まとめ

### 現状の実装

| 項目 | 状況 |
|------|------|
| **archiveフォルダ表示** | フィルタリングなし。親から渡された配列をそのまま表示 |
| **フォルダクリック** | `onFolderClick`コールバックで親に通知 |
| **フィルタリング** | 未実装 |

### archiveフォルダの表示制御

**表示ロジックの所在:**
1. **親コンポーネント**: ファイル一覧APIを呼び出してfilesを生成
2. **FileListTable**: 渡されたfilesをそのまま表示
3. **フィルタリングはどちらでも実装可能**

### 特定ファイルのフィルタリング

**実装可能:**
- ✅ `.filter()`メソッドで簡単に実装可能
- ✅ このコンポーネント内でも、親コンポーネントでも実装可能
- ✅ 複数の条件を組み合わせたフィルタリングも可能

**推奨実装箇所:**
- **FileListTable内**: 再利用性が高い、一貫性が保たれる
- **親コンポーネント**: より柔軟な制御が必要な場合

---

## 8. 次のアクション

### すぐに実装可能な対応

1. **FileListTable内にフィルタリング追加**
   ```typescript
   const filteredFiles = files.filter(file => file.name !== '.keep');
   ```

2. **archiveフォルダの非表示化**
   ```typescript
   const filteredFiles = files.filter(file => {
     if (file.name === '.keep') return false;
     if (file.name === 'archive' && file.isFolder) return false;
     return true;
   });
   ```

3. **設定可能なフィルタパターン**
   ```typescript
   interface FileListTableProps {
     // ...
     hidePatterns?: string[];
   }
   ```

### 必要に応じて確認すべき点

- **親コンポーネントの確認**: FileListTableを使用している親コンポーネントの実装
- **API仕様の確認**: ファイル一覧APIがarchiveフォルダを含めて返すかどうか
- **要件の確認**: archiveフォルダを完全に隠すか、表示して無効化するか

---

## 関連ファイル

- `frontend/src/components/project/FileListTable.tsx` - このコンポーネント
- `frontend/src/types/file.ts` - ProjectFile型定義
- `frontend/src/api/fileDownloadService.ts` - ファイルダウンロードAPI
- 親コンポーネント（確認必要）
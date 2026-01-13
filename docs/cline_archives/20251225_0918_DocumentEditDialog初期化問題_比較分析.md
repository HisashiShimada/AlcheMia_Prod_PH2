# DocumentEditDialog初期化問題 - reference版と現行版の比較分析

## 作成日時
2025-12-25 09:18

## 問題の概要

DocumentEditDialogを開いた際に、各ID項目欄に生成されたID値ではなく`~ID`と表示される問題が発生。
新規作成時に生成されたID値が正しく反映されていない。

## reference版の実装

### 1. PetriNetEditorInnerでのdocumentData初期化

**新規作成時（maimlData=null）:**

```javascript
// 📍 場所: useEffect(() => { fetchPetriNetData(); }, [maimlData]);
// 新規作成時: editingFileNameからdocumentDataを初期化
if (editingFileName && !documentData) {
  const baseFileName = editingFileName.replace('.maiml', '');
  const uuidFull = crypto.randomUUID();
  const uuidPrefix = uuidFull.substring(0, 8);
  
  const initialDocumentData = {
    id: `document_${baseFileName}_${uuidPrefix}`,
    protocolId: `protocol_${baseFileName}_${crypto.randomUUID().substring(0, 8)}`,
    methodId: `method_${baseFileName}_${crypto.randomUUID().substring(0, 8)}`,
    pnmlId: `pnml_${baseFileName}_${crypto.randomUUID().substring(0, 8)}`,
    programId: `program_${baseFileName}_${crypto.randomUUID().substring(0, 8)}`,
    name: baseFileName,
    description: '',
    date: new Date().toISOString(),
    uuid: uuidFull,
    creator: { id: 'Creator', name: '' },
    vendor: { id: 'Vendor', name: '' },
    owner: { id: 'Owner', name: '' },
    instrument: { id: 'Instrument', name: '' },
  };
  setDocumentData(initialDocumentData);  // ✅ ここでStateに保存
  console.log('📄 [PetriNetEditorInner] 新規作成: documentData初期化（ID自動生成）:', {
    documentId: initialDocumentData.id,
    protocolId: initialDocumentData.protocolId,
    methodId: initialDocumentData.methodId,
    pnmlId: initialDocumentData.pnmlId,
    programId: initialDocumentData.programId
  });
}
```

### 2. DocumentEditDialogの呼び出し（reference版）

```jsx
<DocumentEditDialog
  open={documentDialogOpen}
  documentData={documentData}          // ✅ State値をそのまま渡す
  onClose={handleCloseDocumentEditor}
  onSave={handleSaveDocument}
/>
```

**渡されるprops:**
- `open`: boolean
- `documentData`: DocumentData | null
- `onClose`: () => void
- `onSave`: (data) => void

**プロパティ数: 4個**

### 3. DocumentEditDialogの初期化（reference版）

```javascript
// 📍 DocumentEditDialog側
const [editingDocument, setEditingDocument] = useState(getInitialDocumentData());

useEffect(() => {
  if (open) {
    if (documentData && Object.keys(documentData).length > 4) {
      // ✅ documentDataが存在し、4つ以上のキーがある場合
      const normalizedData = normalizeDocumentData(documentData);
      setEditingDocument(normalizedData);
    } else {
      // ❌ documentDataがnullまたはキーが少ない場合
      const newData = documentData ? normalizeDocumentData(documentData) : getInitialDocumentData();
      if (projectName && !documentData?.name) {
        newData.name = projectName;
      }
      setEditingDocument(newData);
    }
    setHasChanges(false);
    setValidationErrors([]);
    setExpandedSections(['basic']);
  }
}, [documentData, open, normalizeDocumentData, projectName]);
```

**判定ロジック:**
- `Object.keys(documentData).length > 4` で既存データか新規データかを判定
- 新規作成時でもdocumentDataが渡されるため、**キー数で判定**

---

## 現行版の実装

### 1. PetriNetEditor.tsxでのdocumentData初期化

**新規作成時（effectiveMaimlData=null）:**

```typescript
// 📍 場所: useEffect(() => { fetchPetriNetData(); }, [effectiveMaimlData]);
if (!effectiveMaimlData) {
  console.log('🆕 [PetriNetEditor] 新規作成モード: 空の状態で起動');
  
  if (editingFileName && !documentData) {
    const baseFileName = editingFileName.replace('.maiml', '');
    const uuidFull = crypto.randomUUID();
    const uuidPrefix = uuidFull.substring(0, 8);
    
    const initialDocumentData: DocumentData = {
      id: `document_${baseFileName}_${uuidPrefix}`,
      protocolId: `protocol_${baseFileName}_${crypto.randomUUID().substring(0, 8)}`,
      methodId: `method_${baseFileName}_${crypto.randomUUID().substring(0, 8)}`,
      pnmlId: `pnml_${baseFileName}_${crypto.randomUUID().substring(0, 8)}`,
      programId: `program_${baseFileName}_${crypto.randomUUID().substring(0, 8)}`,
      name: baseFileName,
      description: '',
      date: new Date().toISOString(),
      uuid: uuidFull,
      creators: [{ id: 'Creator', name: '', uuid: '', description: '', annotation: '' }],
      vendors: [{ id: 'Vendor', name: '', uuid: '', description: '', annotation: '' }],
      owners: [{ id: 'Owner', name: '', uuid: '', description: '', annotation: '' }],
      instruments: [{ id: 'Instrument', name: '', uuid: '', description: '', annotation: '' }],
    };
    setDocumentData(initialDocumentData);  // ✅ ここでStateに保存
    console.log('📄 [PetriNetEditor] Document初期化（ID自動生成）');
  }
  
  // ... 以下省略
}
```

### 2. DocumentEditDialogの呼び出し（現行版）

```typescript
<DocumentEditDialog
  open={documentDialogOpen}
  documentData={documentData}
  onClose={handleCloseDocumentEditor}
  onSave={handleSaveDocument as any}
  projectName={projectName}                              // ❌ 追加プロパティ
  isNewDocument={!documentData || !effectiveMaimlData}   // ❌ 追加プロパティ（判定が誤り）
/>
```

**渡されるprops:**
- `open`: boolean
- `documentData`: DocumentData | undefined
- `onClose`: () => void
- `onSave`: (data) => void
- `projectName`: string | undefined
- `isNewDocument`: boolean

**プロパティ数: 6個**

### 3. DocumentEditDialogの初期化（現行版）

```typescript
// 📍 DocumentEditDialog側
useEffect(() => {
  if (open) {
    if (documentData) {
      // ✅ documentDataが渡されている場合は、それを使用
      const normalizedData = normalizeDocumentData(documentData);
      
      // 新規作成時かつprojectNameがある場合はnameを上書き
      if (isNewDocument && projectName && !normalizedData.name) {
        normalizedData.name = projectName;
      }
      
      console.log('📄 [DocumentEditDialog] documentData受領:', {
        id: normalizedData.id,
        protocolId: normalizedData.protocolId,
        // ...
      });
      
      setEditingDocument(normalizedData);
    } else {
      // ❌ documentDataがない場合はデフォルト値を使用
      const newData = getInitialDocumentData();
      if (projectName) {
        newData.name = projectName;
      }
      console.log('📄 [DocumentEditDialog] デフォルトdocumentData使用');
      setEditingDocument(newData);
    }
    // ...
  }
}, [documentData, open, normalizeDocumentData, projectName, isNewDocument]);
```

---

## 問題の原因

### 1. isNewDocumentの判定ロジックが誤っている

**現行版の判定:**
```typescript
isNewDocument={!documentData || !effectiveMaimlData}
```

**問題点:**
- PetriNetEditor.tsxの初期化処理で、新規作成時でも`documentData`が生成される
- そのため、DocumentEditDialogを開く時点で`documentData`は**存在する**
- `!documentData`は`false`になり、`isNewDocument=false`と判定される

**結果:**
```typescript
if (isNewDocument && projectName && !normalizedData.name) {
  normalizedData.name = projectName;  // ❌ この処理が実行されない
}
```

### 2. normalizeDocumentDataの問題

**現行版のnormalizeDocumentData:**
```typescript
const normalizeDocumentData = useCallback((data?: DocumentData): DocumentData => {
  if (!data) return getInitialDocumentData();
  
  return {
    ...data,
    // MaiML ID属性を保持（PetriNetEditorから渡された値を維持）
    protocolId: data.protocolId,  // ✅ 一見正しそう
    methodId: data.methodId,
    pnmlId: data.pnmlId,
    programId: data.programId,
    // ...
  };
}, []);
```

**問題点:**
- `data.protocolId`が`undefined`の場合、そのまま`undefined`が設定される
- デフォルト値へのフォールバックがない

---

## 解決策

### 方法1: isNewDocumentの判定を修正（推奨）

```typescript
// PetriNetEditor.tsx
<DocumentEditDialog
  open={documentDialogOpen}
  documentData={documentData}
  onClose={handleCloseDocumentEditor}
  onSave={handleSaveDocument as any}
  projectName={projectName}
  isNewDocument={!effectiveMaimlData}  // ✅ MAIMLデータの有無で判定
/>
```

**理由:**
- 新規作成時は`effectiveMaimlData=null`
- 既存ファイル編集時は`effectiveMaimlData`が存在
- documentDataの有無ではなく、**元のMAIMLデータの有無**で判定すべき

### 方法2: normalizeDocumentDataにデフォルト値を追加

```typescript
const normalizeDocumentData = useCallback((data?: DocumentData): DocumentData => {
  if (!data) return getInitialDocumentData();
  
  return {
    ...data,
    // MaiML ID属性を保持（undefinedの場合はデフォルト値を使用）
    protocolId: data.protocolId || 'protocolID',
    methodId: data.methodId || 'methodID',
    pnmlId: data.pnmlId || 'pnmlID',
    programId: data.programId || 'programID',
    // ...
  };
}, []);
```

### 方法3: reference版と同じくキー数で判定（後方互換性）

```typescript
// DocumentEditDialog.tsx
useEffect(() => {
  if (open) {
    if (documentData && Object.keys(documentData).length > 4) {
      // 既存データ（キーが多い）
      const normalizedData = normalizeDocumentData(documentData);
      setEditingDocument(normalizedData);
    } else {
      // 新規データまたはdocumentDataがnull
      const newData = documentData ? normalizeDocumentData(documentData) : getInitialDocumentData();
      if (projectName && !newData.name) {
        newData.name = projectName;
      }
      setEditingDocument(newData);
    }
    // ...
  }
}, [documentData, open, normalizeDocumentData, projectName]);
```

---

## 推奨する修正方針

**Step 1:** `isNewDocument`の判定を修正（方法1）
```typescript
isNewDocument={!effectiveMaimlData}
```

**Step 2:** `normalizeDocumentData`にデフォルト値を追加（方法2）
```typescript
protocolId: data.protocolId || 'protocolID',
```

**Step 3:** デバッグログで確認
- PetriNetEditor.tsxでdocumentData生成時のログ
- DocumentEditDialog.tsxで受領時のログ
- normalizeDocumentData実行時のログ

---

## まとめ

| 項目 | reference版 | 現行版 | 問題点 |
|------|------------|--------|--------|
| **props数** | 4個 | 6個 | 現行版は追加プロパティあり |
| **isNewDocument** | なし（キー数で判定） | あり（判定誤り） | `!documentData`では常にfalse |
| **判定方法** | `Object.keys().length > 4` | `isNewDocument` prop | documentDataは常に存在するため判定不可 |
| **デフォルト値** | なし | なし | undefinedが残る可能性 |

**根本原因:**
- 新規作成時でもdocumentDataが生成されるため、`!documentData`では判定不可
- **MAIMLデータの有無**（`!effectiveMaimlData`）で判定すべき

# PetriNetEditorInner Phase9.4 - 残存暗黙的anyパラメータ修正計画書

**作成日時**: 2026-01-30 14:45  
**担当**: Cline  
**フェーズ**: Phase9.4 - 残存暗黙的anyパラメータの型修正

## 現状分析

### Phase9.3完了時点の成果
- MethodData型の追加
- method: any パラメータ修正（L1262）
- handleSaveTemplate の 6パラメータ修正（L1860）
- **合計7箇所の暗黙的anyパラメータを修正**

### 残存する暗黙的anyパラメータ（約10箇所）

#### High Priority（よく使用される関数）
1. **L2079**: `newDocumentData` (handleSaveDocument)
2. **L2268**: `draft` (handleLoadDraft)
3. **L2464**: `file` (handleWorkflowFileSelect)

#### Medium Priority（その他の関数パラメータ）
4. **L2251**: `templateId` (handleTemplateDelete)
5. **L2712**: `selectedErrors` (handleAutoCorrect)
6. **L2766**: `action`, `saveDestination`, `folder` (handleSaveConfirmAction)
7. **L2976**: `metadata` (handleSave)

#### Low Priority（スコープ限定のローカル変数）
8. **L1972-1976**: `originalTemplate` (handleSaveTemplate内)
9. **L2283**: `edge` (edges.map内)

## 修正方針

### Step 1: High Priority パラメータの型修正
**対象**: newDocumentData, draft, file

**必要な型定義**:
- DocumentData型は既存（editorTypes.ts）
- Draft型を新規定義する必要がある可能性
- FileInfo型を新規定義する必要がある可能性

**作業手順**:
1. 既存の型定義を確認
2. 不足している型を追加定義
3. 各関数のパラメータに型を付与

### Step 2: Medium Priority パラメータの型修正
**対象**: templateId, selectedErrors, action, saveDestination, folder, metadata

**作業手順**:
1. 各パラメータの使用箇所を確認
2. 適切な型を決定（string, ValidationError[], など）
3. 型を付与

### Step 3: Low Priority ローカル変数の型修正
**対象**: originalTemplate, edge

**作業手順**:
1. 変数宣言時に明示的な型を付与
2. またはas構文で型アサーション

## 実装計画

### Phase9.4.1: High Priority（1/3）
```typescript
// L2079: handleSaveDocument
const handleSaveDocument = useCallback((newDocumentData: DocumentData) => {
  setDocumentData(newDocumentData);
  console.log('💾 [PetriNetEditorInner] Document保存:', newDocumentData);
}, []);
```

### Phase9.4.2: High Priority（2/3）
```typescript
// L2268: handleLoadDraft
interface DraftData {
  nodes: Node<NodeData>[];
  arcs?: Edge<EdgeData>[];
  edges?: Edge<EdgeData>[];
  documentData?: DocumentData;
}

const handleLoadDraft = useCallback((draft: DraftData) => {
  // ...
}, [setNodes, setEdges, reset, fitView]);
```

### Phase9.4.3: High Priority（3/3）
```typescript
// L2464: handleWorkflowFileSelect
interface FileInfo {
  key: string;
  name: string;
  lastModified?: string;
  size?: number;
}

const handleWorkflowFileSelect = useCallback(async (file: FileInfo) => {
  // ...
}, [addWorkflow, pendingClickPosition]);
```

### Phase9.4.4: Medium Priority（templateId, selectedErrors）
```typescript
// L2251: handleTemplateDelete
const handleTemplateDelete = useCallback((templateId: string) => {
  // ...
}, []);

// L2712: handleAutoCorrect
const handleAutoCorrect = useCallback(async (selectedErrors: ValidationError[]) => {
  // ...
}, [nodes, edges, documentData]);
```

### Phase9.4.5: Medium Priority（action, saveDestination, folder, metadata）
```typescript
// L2766: handleSaveConfirmAction
const handleSaveConfirmAction = useCallback(async (
  action: string,
  saveDestination: string,
  folder?: string
) => {
  // ...
}, [nodes, edges, documentData, handleCloseSaveConfirmDialog]);

// L2976: handleSave
interface SaveMetadata {
  name: string;
  description: string;
}

const handleSave = useCallback(async (metadata: SaveMetadata) => {
  // ...
}, [nodes, edges]);
```

### Phase9.4.6: Low Priority（ローカル変数）
```typescript
// L1972-1976: originalTemplate
let originalTemplate: Template | null = null;

// L2283: edge
const styledEdges = loadedArcs.map((edge: Edge<EdgeData>) => ({
  // ...
}));
```

## 期待される効果

### 直接的な効果
- 暗黙的anyパラメータの完全解消（残り10箇所）
- TypeScriptコンパイラの型チェック強化
- IDEの型補完精度向上

### 間接的な効果
- バグ発見の容易化
- リファクタリングの安全性向上
- コードの保守性向上

## リスクと対策

### リスク1: 型定義の不足
**対策**: editorTypes.tsに必要な型を追加定義

### リスク2: 型の不一致
**対策**: 既存のコードとの整合性を確認しながら段階的に修正

### リスク3: コンテキストウィンドウの制限
**対策**: 優先度順に分割して対応

## 完了条件

- [ ] High Priority 3箇所の修正完了
- [ ] Medium Priority 5箇所の修正完了
- [ ] Low Priority 2箇所の修正完了
- [ ] TypeScriptエラーチェック
- [ ] 完了報告書の作成

## タイムライン

1. **Phase9.4.1-9.4.3**: High Priority修正（推定30分）
2. **Phase9.4.4-9.4.5**: Medium Priority修正（推定30分）
3. **Phase9.4.6**: Low Priority修正（推定15分）
4. **検証と報告**: エラーチェックと報告書作成（推定15分）

**合計推定時間**: 約90分

---

**作成日時**: 2026-01-30 14:45  
**ステータス**: 計画策定完了、Phase9.4.1へ
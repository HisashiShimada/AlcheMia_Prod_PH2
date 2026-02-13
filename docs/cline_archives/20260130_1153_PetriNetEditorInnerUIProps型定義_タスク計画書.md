# PetriNetEditorInnerUIProps型定義 タスク計画書

## メタデータ
- **作成日時**: 2026-01-30 11:53
- **タスクID**: PetriNetEditorInnerUIProps型定義
- **優先度**: 高
- **推定工数**: 20分

## 1. タスク概要

PetriNetEditorInnerUIコンポーネントのProps型を完全に定義し、約100件の暗黙的any型エラーを解消します。

## 2. 目的と期待される成果

### 目的
PetriNetEditorInnerUIコンポーネントの型安全性を確保する

### 期待される成果
- [x] interface PetriNetEditorInnerUIPropsを作成
- [ ] 全Props項目（約60項目）に正しい型を設定
- [ ] React.FCで型を適用
- [ ] 約100件の型エラーを解消

## 3. 実装ステップ

### Phase 1: Props型定義の作成

#### Step 1: 現在のProps項目を抽出
```typescript
// 現状のProps（型なし）
const PetriNetEditorInnerUI = ({
  nodes,           // Node<NodeData>[]
  edges,           // Edge<EdgeData>[]
  setNodes,        // (nodes: Node<NodeData>[]) => void
  setEdges,        // (edges: Edge<EdgeData>[]) => void
  onNodesChange,   // OnNodesChange
  onEdgesChange,   // OnEdgesChange
  handleNodeClick, // (event: MouseEvent, node: Node<NodeData>) => void
  handleEdgeClick, // (event: MouseEvent, edge: Edge<EdgeData>) => void
  // ... 約60項目
}) => { ... }
```

#### Step 2: interface定義
```typescript
interface PetriNetEditorInnerUIProps {
  // React Flow関連
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  setNodes: (nodes: Node<NodeData>[]) => void;
  setEdges: (edges: Edge<EdgeData>[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  
  // イベントハンドラ
  handleNodeClick: (event: React.MouseEvent, node: Node<NodeData>) => void;
  handleEdgeClick: (event: React.MouseEvent, edge: Edge<EdgeData>) => void;
  handleNodesDelete: (nodes: Node<NodeData>[]) => void;
  handleEdgesDelete: (edges: Edge<EdgeData>[]) => void;
  handleConnect: (connection: Connection) => void;
  handleNodeDragStop: (event: React.MouseEvent, node: Node<NodeData>) => void;
  handleSelectionChange: (params: { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] }) => void;
  handlePaneClick: (event: React.MouseEvent) => void;
  
  // Node Types
  nodeTypes: NodeTypes;
  
  // キーボード
  pressedKeys: Set<string>;
  
  // Method管理
  methods: Method[];
  multiMethodMode: boolean;
  activeMethodIndex: number;
  handleMethodChange: (index: number) => void;
  handleAddMethod: () => void;
  handleEditMethodId: (index: number, newMethodId: string) => void;
  handleDeleteMethod: (index: number) => void;
  
  // バリデーション
  nonCriticalErrors: ValidationError[];
  handleOpenValidationPanel: () => void;
  
  // ツールバー
  handleAddNode: (nodeType: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  handleOpenSaveConfirmDialog: () => void;
  handleOpenDocumentEditor: () => void;
  isValidating: boolean;
  handleWorkflowModeToggle: () => void;
  selectedTool: 'select' | 'workflow';
  handleOpenDraftManager: () => void;
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  lastAutoSaveTime: number | null;
  
  // ビューモード
  viewMode: 'petriNet' | 'templates';
  handleViewModeChange: (mode: 'petriNet' | 'templates') => void;
  handleTemplateSelect: (template: TemplateRef) => void;
  handleTemplateAdd: (category: string) => void;
  handleTemplateDelete: (templateId: string) => void;
  showCommonTemplates: boolean;
  setShowCommonTemplates: (show: boolean) => void;
  
  // PropertyPanel
  selectedNode: Node<NodeData> | null;
  selectedEdge: Edge<EdgeData> | null;
  handleUpdateNodeProperty: (nodeId: string, newData: NodeData) => void;
  handleUpdateNodeId: (oldId: string, newId: string) => void;
  handleUpdateEdgeProperty: (edgeId: string, newId: string) => void;
  handleClosePropertyPanel: () => void;
  handleOpenTemplateEditor: (node: Node<NodeData>) => void;
  handleDeleteNode: (nodeId: string) => void;
  handleDeleteEdge: (edgeId: string) => void;
  
  // ダイアログ
  saveDialogOpen: boolean;
  handleCloseSaveDialog: () => void;
  handleSave: (metadata: any) => void;
  saveError: string | null;
  
  saveConfirmDialogOpen: boolean;
  validationResult: ValidationResult | null;
  handleCloseSaveConfirmDialog: () => void;
  handleSaveConfirmAction: (action: string, saveDestination: string, folder?: string) => void;
  isSaving: boolean;
  
  templateEditorOpen: boolean;
  handleCloseTemplateEditor: () => void;
  templateEditNode: Node<NodeData> | null;
  handleSaveTemplate: (
    nodeId: string,
    templateRef: TemplateRef,
    isNewTemplate: boolean,
    templateCategory: string,
    isCommonTemplate: boolean,
    methodId: string | null
  ) => void;
  
  documentDialogOpen: boolean;
  documentData: DocumentData | null;
  handleCloseDocumentEditor: () => void;
  handleSaveDocument: (newDocumentData: DocumentData) => void;
  
  validationPanelOpen: boolean;
  handleCloseValidationPanel: () => void;
  handleAutoCorrect: (selectedErrors: any[]) => void;
  handleRevalidate: () => void;
  isCorrecting: boolean;
  
  workflowDialogOpen: boolean;
  handleCloseWorkflowDialog: () => void;
  handleWorkflowFileSelect: (file: any) => void;
  availableFiles: Array<{ key: string; name: string; lastModified?: string; size?: number }>;
  
  draftManagerOpen: boolean;
  handleCloseDraftManager: () => void;
  handleLoadDraft: (draft: any) => void;
  lastSavedDraft: any;
  currentEditState: any;
  currentUserId: string;
  sourceS3Key?: string;
}
```

### Phase 2: React.FCで型適用

```typescript
const PetriNetEditorInnerUI: React.FC<PetriNetEditorInnerUIProps> = ({
  nodes,
  edges,
  // ... 全Props
}) => {
  // 実装
};
```

### Phase 3: 追加の型インポート

```typescript
import type { 
  OnNodesChange,
  OnEdgesChange,
  Connection,
  NodeTypes,
} from 'reactflow';
```

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/PetriNetEditorInner.tsx`
   - interface PetriNetEditorInnerUIProps追加（約150行）
   - React.FC適用（1行変更）
   - 型インポート追加（4行）

## 5. 技術的詳細

### 使用する型
- `Node<NodeData>` - React Flowノード型
- `Edge<EdgeData>` - React Flowエッジ型
- `OnNodesChange` - React Flowノード変更ハンドラ型
- `OnEdgesChange` - React Flowエッジ変更ハンドラ型
- `Connection` - React Flow接続型
- `NodeTypes` - React Flowノードタイプマップ型
- `Method` - 独自定義済みMethod型
- `ValidationError` - 独自定義済みValidationError型
- `ValidationResult` - 独自定義済みValidationResult型
- `TemplateRef` - 独自定義済みTemplateRef型
- `DocumentData` - 独自定義済みDocumentData型

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Props項目の漏れ | 中 | 低 | 現在のコードを慎重に確認 |
| 型の不一致 | 中 | 中 | 既存の型定義を参照 |
| 新たな型エラー | 低 | 低 | 段階的に確認 |

## 7. テスト計画

### 型チェック
- [ ] TypeScriptコンパイラでエラーがないことを確認
- [ ] ESLintでエラーがないことを確認

## 8. ロールバック計画

問題が発生した場合は、React.FCの適用を一時的に解除します。

## 9. 関連ドキュメント

- [State型修正完了報告](./20260130_1152_PetriNetEditorInner_State型修正_完了報告.md)
- [TypeScript公式ドキュメント](https://www.typescriptlang.org/docs/)
- [React Flow型定義](https://reactflow.dev/api-reference/types)

## 10. 承認記録

- **計画書提示日時**: 2026-01-30 11:53
- **承認日時**: （ユーザー承認待ち）
- **承認者コメント**: 

## 11. 実施記録

### 実施日時
開始: （作業開始時の日時を記入）
完了: （作業完了時の日時を記入）

### 実施結果
（作業完了後に記入）

## 12. 期待される成果

### エラー数削減目標
- **現在**: 約150件の型エラー
- **目標**: 約50件に削減（約100件削減）

### 型安全性向上
- PetriNetEditorInnerUIコンポーネントのProps型が完全に定義される
- 子コンポーネントへのProps渡しで型チェックが機能する
- リファクタリング時の型エラー検出が早期化する
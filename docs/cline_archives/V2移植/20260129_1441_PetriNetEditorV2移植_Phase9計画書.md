# PetriNetEditorV2移植 Phase 9計画書: データフロー実装

## メタデータ
- **作成日時**: 2026-01-29 14:41
- **Phase**: Phase 9 - データフロー実装
- **担当**: Cline
- **優先度**: 高
- **推定工数**: 4-5時間

---

## 概要

Phase 8でメインコンポーネントの基本骨格が完成しました。
Phase 9では、実際のデータフロー（MaiML読み込み → ReactFlow表示 → 編集 → 保存）を実装します。

---

## 前提条件

### Phase 8完了項目（✅）
- PetriNetEditorV2.tsx メインコンポーネント実装
- 7つのサブコンポーネント統合
- TypeScriptエラー解決完了
- エクスポート定義完了

### Phase 1-6完了項目（✅）
- MaiML ↔ ReactFlow コンバーター実装
- カスタムフックスケルトン実装（useWorkflow, useHistory等）

---

## Phase 9の目標

### 主要目標
1. **カスタムフックの実装**
   - useWorkflow: ReactFlow状態管理
   - useHistory: Undo/Redo機能
   - useDraftManager: Draft保存・読み込み
   - useNamespaceOperations: 名前空間操作

2. **実データ読み込み**
   - MaiML XMLファイルの読み込み
   - ReactFlowノード・エッジへの変換
   - テンプレート情報の読み込み

3. **ノード・エッジの実操作**
   - ノード追加・削除・更新
   - エッジ接続・削除
   - ドラッグ&ドロップ
   - プロパティ編集

---

## 実装ステップ

### Step 9-1: useWorkflowフック実装 ⭐最重要

**目的**: ReactFlow状態管理の中核実装

#### 実装内容
```typescript
interface UseWorkflowParams {
  projectId: string;
}

interface UseWorkflowReturn {
  // 状態
  methods: MethodData[];
  activeMethodIndex: number;
  nodes: Node[];
  edges: Edge[];
  templates: Templates;
  
  // 操作
  setActiveMethodIndex: (index: number) => void;
  addNode: (nodeType: NodeType, position: XYPosition) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (connection: Connection) => void;
  deleteEdge: (edgeId: string) => void;
  
  // ワークフロー追加
  addWorkflow: (clickPosition: XYPosition, maimlContent: string) => void;
  
  // データ読み込み
  loadMaimlData: (maimlContent: string) => void;
  
  // 保存用
  exportToMaiml: () => string;
}
```

#### 実装ファイル
- `frontend/src/components/editorv2/hooks/useWorkflow.ts`

#### 依存関係
- maimlToReactFlow (Phase 1実装済み)
- reactFlowToMaiml (Phase 1実装済み)
- multiMethodConverter (Phase 2実装済み)

---

### Step 9-2: useHistoryフック実装

**目的**: Undo/Redo機能実装

#### 実装内容
```typescript
interface UseHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  addToHistory: (action: string, data: unknown) => void;
  clearHistory: () => void;
}
```

#### 履歴管理の設計
```typescript
interface HistoryEntry {
  timestamp: number;
  action: string;
  data: {
    nodes: Node[];
    edges: Edge[];
    templates: Templates;
  };
}

// 履歴スタック
- past: HistoryEntry[] (最大50件)
- present: HistoryEntry
- future: HistoryEntry[]
```

#### 実装ファイル
- `frontend/src/components/editorv2/hooks/useHistory.ts`

---

### Step 9-3: useDraftManagerフック実装

**目的**: Draft保存・読み込み機能

#### 実装内容
```typescript
interface UseDraftManagerReturn {
  drafts: DraftInfo[];
  currentDraft: DraftInfo | null;
  
  saveDraft: (name: string, data: unknown) => Promise<void>;
  loadDraft: (draftId: string) => Promise<unknown>;
  deleteDraft: (draftId: string) => Promise<void>;
  autoSave: () => Promise<void>;
  
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  lastAutoSaveTime: Date | null;
}

interface DraftInfo {
  id: string;
  name: string;
  timestamp: Date;
  autoSaved: boolean;
}
```

#### 保存先
- localStorage (開発環境)
- 将来的にはAPI経由でサーバー保存

#### 実装ファイル
- `frontend/src/components/editorv2/hooks/useDraftManager.ts`

---

### Step 9-4: useNamespaceOperationsフック実装

**目的**: 名前空間操作機能

#### 実装内容
```typescript
interface UseNamespaceOperationsReturn {
  importNamespace: (namespaceUrl: string) => Promise<void>;
  exportNamespace: () => string;
  validateNamespace: () => ValidationResult;
}
```

#### 実装ファイル
- `frontend/src/components/editorv2/hooks/useNamespaceOperations.ts`

---

### Step 9-5: PetriNetEditorV2へのフック統合

**目的**: 実装したフックをメインコンポーネントに統合

#### 修正内容

##### Before (Phase 8 - モック版)
```typescript
const mockMethods = useMemo(() => [
  { methodId: 'method1', nodes: [], edges: [] }
], []);
```

##### After (Phase 9 - 実装版)
```typescript
const workflow = useWorkflow({ projectId });
const history = useHistory();
const draftManager = useDraftManager({ projectId });
const namespaceOps = useNamespaceOperations();

// workflow.methodsを使用
// workflow.nodesを使用
// workflow.edgesを使用
```

#### 修正ファイル
- `frontend/src/components/editorv2/PetriNetEditorV2.tsx`

---

### Step 9-6: ReactFlowCanvas統合

**目的**: ReactFlowキャンバスの追加・操作実装

#### 実装内容
```typescript
<ReactFlow
  nodes={workflow.nodes}
  edges={workflow.edges}
  onNodesChange={handleNodesChange}
  onEdgesChange={handleEdgesChange}
  onConnect={handleConnect}
  onNodeClick={handleNodeClick}
  onEdgeClick={handleEdgeClick}
  nodeTypes={customNodeTypes}
  edgeTypes={customEdgeTypes}
  fitView
>
  <Background />
  <Controls />
  <MiniMap />
</ReactFlow>
```

#### カスタムノードタイプ
- MaterialPlaceNode
- ConditionPlaceNode
- ResultPlaceNode
- TransitionNode
- MaterialTemplateNode
- ConditionTemplateNode
- ResultTemplateNode

#### 実装場所
- PetriNetEditorV2.tsx内（MethodTabPanel配下に追加）

---

## 依存関係マップ

```
PetriNetEditorV2
├── useWorkflow (Step 9-1) ⭐
│   ├── maimlToReactFlow
│   ├── reactFlowToMaiml
│   └── multiMethodConverter
├── useHistory (Step 9-2)
├── useDraftManager (Step 9-3)
└── useNamespaceOperations (Step 9-4)

ReactFlowCanvas (Step 9-6)
├── useWorkflow (nodes, edges)
├── CustomNodeTypes
└── CustomEdgeTypes
```

---

## 実装優先順位

### 優先度: 高（必須）
1. **Step 9-1: useWorkflow** - 最重要（全機能の基盤）
2. **Step 9-5: フック統合** - useWorkflowをPetriNetEditorV2に統合
3. **Step 9-6: ReactFlowCanvas** - ビジュアル表示

### 優先度: 中（重要）
4. **Step 9-2: useHistory** - Undo/Redo機能
5. **Step 9-3: useDraftManager** - Draft保存

### 優先度: 低（後回し可）
6. **Step 9-4: useNamespaceOperations** - Phase 10以降でも可

---

## テスト計画

### 単体テスト
```typescript
// useWorkflow.test.ts
describe('useWorkflow', () => {
  test('ノード追加', () => { ... });
  test('ノード削除', () => { ... });
  test('エッジ接続', () => { ... });
  test('MaiML読み込み', () => { ... });
  test('MaiMLエクスポート', () => { ... });
});

// useHistory.test.ts
describe('useHistory', () => {
  test('Undo実行', () => { ... });
  test('Redo実行', () => { ... });
  test('履歴上限', () => { ... });
});
```

### 統合テスト
```typescript
// PetriNetEditorV2.integration.test.tsx
describe('PetriNetEditorV2統合テスト', () => {
  test('MaiML読み込み → 表示', () => { ... });
  test('ノード追加 → 保存', () => { ... });
  test('編集 → Undo → Redo', () => { ... });
});
```

---

## リスクと対策

### リスク1: ReactFlow状態管理の複雑さ
**影響度**: 高
**発生確率**: 中

**対策**:
- 既存のV1実装を参考にする
- ReactFlowの公式ドキュメント参照
- 状態管理をシンプルに保つ

### リスク2: パフォーマンス問題
**影響度**: 中
**発生確率**: 中

**対策**:
- useMemo/useCallbackで最適化
- 大量ノード時の仮想化検討
- デバウンス処理の導入

### リスク3: 履歴管理のメモリ使用量
**影響度**: 低
**発生確率**: 低

**対策**:
- 履歴上限を50件に制限
- 定期的なガベージコレクション

---

## 成果物

### 実装ファイル
```
frontend/src/components/editorv2/
├── hooks/
│   ├── useWorkflow.ts         ← 修正（実装追加）
│   ├── useHistory.ts          ← 修正（実装追加）
│   ├── useDraftManager.ts     ← 修正（実装追加）
│   └── useNamespaceOperations.ts ← 修正（実装追加）
├── PetriNetEditorV2.tsx       ← 修正（フック統合）
└── nodes/                     ← 新規ディレクトリ
    ├── MaterialPlaceNode.tsx
    ├── ConditionPlaceNode.tsx
    ├── ResultPlaceNode.tsx
    ├── TransitionNode.tsx
    └── index.ts
```

### テストファイル
```
frontend/src/components/editorv2/__tests__/
├── useWorkflow.test.ts
├── useHistory.test.ts
├── useDraftManager.test.ts
└── PetriNetEditorV2.integration.test.tsx
```

### ドキュメント
```
docs/
└── 20260129_XXXX_PetriNetEditorV2移植_Phase9完了報告.md
```

---

## 完了基準

### 機能要件
- ✅ MaiML XMLを読み込んでReactFlowで表示できる
- ✅ ノードを追加・削除・移動できる
- ✅ エッジを接続・削除できる
- ✅ プロパティパネルで編集できる
- ✅ Undo/Redo機能が動作する
- ✅ Draft保存・読み込みができる

### 品質要件
- ✅ TypeScriptエラー: 0件
- ✅ 単体テストカバレッジ: 70%以上
- ✅ 統合テスト: 主要シナリオ網羅
- ✅ パフォーマンス: 100ノードで60fps維持

---

## スケジュール（推定）

### Phase 9-1: useWorkflow実装（2-3時間）
- MaiML読み込み機能
- ノード・エッジ操作
- エクスポート機能

### Phase 9-2: useHistory実装（1時間）
- Undo/Redo機能
- 履歴管理

### Phase 9-3: useDraftManager実装（1時間）
- Draft保存・読み込み
- 自動保存

### Phase 9-4: ReactFlowCanvas統合（1-2時間）
- カスタムノード実装
- キャンバス統合
- イベントハンドラ接続

### Phase 9-5: テスト・バグ修正（1-2時間）
- 単体テスト作成
- 統合テスト作成
- バグ修正

**合計推定時間**: 6-9時間

---

## 次のPhase（Phase 10）への引き継ぎ

### Phase 10で実装予定
- 保存機能（ReactFlow → MaiML → API）
- バリデーション機能
- テンプレート編集の実機能化
- Document編集の実機能化

### Phase 10への前提条件
- Phase 9のuseWorkflowが完全動作
- ReactFlowキャンバスで編集可能
- Undo/Redo動作確認済み

---

## 参考資料

### 既存実装（V1）
- `frontend/src/components/reference/PetriNetEditor.js`
- useWorkflow実装パターン
- カスタムノード実装例

### ReactFlow公式ドキュメント
- https://reactflow.dev/docs/
- カスタムノード作成
- 状態管理のベストプラクティス

### 関連Phase
- [Phase 1-2計画書](./20260129_0947_PetriNetEditorV2移植_PLAN.md) - コンバーター実装
- [Phase 8完了報告](./20260129_1439_PetriNetEditorV2移植_Phase8完了報告.md) - メイン統合

---

## まとめ

Phase 9では、PetriNetEditorV2に実際のデータフローを実装します。
最重要はuseWorkflowフックの実装であり、これが全機能の基盤となります。

**Phase 9完了により、PetriNetEditorV2で実際の編集作業が可能になります。**
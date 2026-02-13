# PetriNetEditorInner Phase 8: メインファイルリファクタ - 計画書

## メタデータ
- **作成日時**: 2026-01-30 13:36
- **タスクID**: PetriNetEditorInner_Phase8_Refactor
- **優先度**: 高
- **推定工数**: 2-3時間（段階的実施）

---

## 1. タスク概要

Phase 1-7で分離した9個のモジュールをメインファイル（PetriNetEditorInner.tsx）に統合し、コードの重複を削除してリファクタリングを完了する。

---

## 2. 目的と期待される成果

### 目的
- 分離したモジュールをメインファイルに統合
- コードの重複を削除
- メインファイルを500行以下に削減
- any型エラーを80%削減

### 期待される成果
- [x] 分離したモジュールのインポート完了
- [ ] ハンドラーの統合完了
- [ ] フックの統合完了
- [ ] 重複コードの削除完了
- [ ] ビルドエラーがゼロ
- [ ] 基本機能が正常動作

---

## 3. 実装ステップ（段階的アプローチ）

### Step 1: インポート追加（推定: 10分）

**目的**: 分離したモジュールをインポート

**作業内容:**
```typescript
// Hooks
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useEditorActions } from './hooks/useEditorActions';

// Handlers
import { createNodeHandlers } from './handlers/nodeHandlers';
import { createEdgeHandlers } from './handlers/edgeHandlers';
import { createCanvasHandlers } from './handlers/canvasHandlers';

// Utils
import { createNode, updateNodePosition } from './utils/nodeUtils';
import { createEdge, getEdgeId } from './utils/edgeUtils';
import { validateWorkflow } from './utils/validationUtils';

// Loaders
import { loadMaimlFromXml } from './loaders/maimlLoader';
```

**確認事項:**
- [ ] すべてのインポートがエラーなく解決される
- [ ] 既存のインポートと競合しない

---

### Step 2: キーボードショートカット統合（推定: 15分）

**目的**: useKeyboardShortcutsフックを統合

**現在のコード（削除対象）:**
```typescript
// キーボードイベント処理（約50行）
const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => { ... };
  const handleKeyUp = (e: KeyboardEvent) => { ... };
  // ...
}, []);
```

**新しいコード:**
```typescript
// キーボードショートカット
const { pressedKeys } = useKeyboardShortcuts({
  onCopy: () => handleCopy(),
  onPaste: () => handlePaste(),
  onDelete: () => handleDelete(),
  onUndo: () => undo(),
  onRedo: () => redo(),
  onSave: () => handleSave(),
  onSelectAll: () => handleSelectAll(),
});
```

**確認事項:**
- [ ] pressedKeysが正しく取得できる
- [ ] ショートカットが動作する（Ctrl+C, Ctrl+V など）
- [ ] ビルドエラーがない

---

### Step 3: エディタアクション統合（推定: 20分）

**目的**: useEditorActionsフックを統合

**現在のコード（削除対象）:**
```typescript
// Copy/Paste処理（約80行）
const handleCopy = useCallback(() => { ... }, []);
const handlePaste = useCallback(() => { ... }, []);
const handleDelete = useCallback(() => { ... }, []);
```

**新しいコード:**
```typescript
// エディタアクション
const {
  handleCopy,
  handlePaste,
  handleDelete,
  handleSelectAll,
} = useEditorActions({
  nodes,
  edges,
  selectedNode,
  selectedEdge,
  setNodes,
  setEdges,
  setSelectedNode,
  setSelectedEdge,
  clipboard,
  setClipboard,
  pushState,
  onEdgeDelete,
  availableTemplates,
});
```

**確認事項:**
- [ ] コピー・ペーストが動作する
- [ ] 削除が動作する
- [ ] 全選択が動作する
- [ ] ビルドエラーがない

---

### Step 4: ノードハンドラー統合（推定: 25分）

**目的**: createNodeHandlersを統合

**現在のコード（削除対象）:**
```typescript
// ノード操作ハンドラー（約150行）
const handleNodeClick = useCallback((_event: any, node: Node<any>) => { ... }, []);
const handleNodeDragStop = useCallback((_event: any, node: Node<any>) => { ... }, []);
const handleNodeDoubleClick = useCallback((_event: any, node: Node<any>) => { ... }, []);
const handleAddNode = useCallback((type: string) => { ... }, []);
const handleDeleteNode = useCallback(() => { ... }, []);
```

**新しいコード:**
```typescript
// ノードハンドラー
const nodeHandlers = useMemo(() => createNodeHandlers({
  nodes,
  edges,
  setNodes,
  setEdges,
  selectedNode,
  setSelectedNode,
  setSelectedEdge,
  pushState,
  setTemplateEditorOpen,
  setEditingDocument,
  reactFlowInstance,
}), [nodes, edges, selectedNode, reactFlowInstance]);

// 展開して使用
const {
  handleNodeClick,
  handleNodeDragStop,
  handleNodeDoubleClick,
  handleAddNode,
  handleDeleteNode,
} = nodeHandlers;
```

**確認事項:**
- [ ] ノードクリックが動作する
- [ ] ノードドラッグが動作する
- [ ] ノードダブルクリックが動作する
- [ ] ノード追加が動作する
- [ ] ノード削除が動作する
- [ ] ビルドエラーがない

---

### Step 5: エッジハンドラー統合（推定: 20分）

**目的**: createEdgeHandlersを統合

**現在のコード（削除対象）:**
```typescript
// エッジ操作ハンドラー（約100行）
const handleEdgeClick = useCallback((_event: any, edge: Edge<any>) => { ... }, []);
const handleConnect = useCallback((params: Connection) => { ... }, []);
const handleEdgeDoubleClick = useCallback((_event: any, edge: Edge<any>) => { ... }, []);
const handleDeleteEdge = useCallback(() => { ... }, []);
```

**新しいコード:**
```typescript
// エッジハンドラー
const edgeHandlers = useMemo(() => createEdgeHandlers({
  nodes,
  edges,
  setEdges,
  setSelectedNode,
  selectedEdge,
  setSelectedEdge,
  pushState,
  onEdgeDelete,
}), [nodes, edges, selectedEdge]);

// 展開して使用
const {
  handleEdgeClick,
  handleConnect,
  handleEdgeDoubleClick,
  handleDeleteEdge,
} = edgeHandlers;
```

**確認事項:**
- [ ] エッジクリックが動作する
- [ ] エッジ接続が動作する
- [ ] エッジダブルクリックが動作する
- [ ] エッジ削除が動作する
- [ ] ビルドエラーがない

---

### Step 6: キャンバスハンドラー統合（推定: 15分）

**目的**: createCanvasHandlersを統合

**現在のコード（削除対象）:**
```typescript
// キャンバス操作ハンドラー（約50行）
const handlePaneClick = useCallback(() => { ... }, []);
const handleInit = useCallback((instance: ReactFlowInstance<any, any>) => { ... }, []);
const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => { ... }, []);
const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => { ... }, []);
```

**新しいコード:**
```typescript
// キャンバスハンドラー
const canvasHandlers = useMemo(() => createCanvasHandlers({
  setSelectedNode,
  setSelectedEdge,
  setReactFlowInstance,
  nodes,
  setNodes,
  pushState,
  availableTemplates,
}), [nodes, availableTemplates]);

// 展開して使用
const {
  handlePaneClick,
  handleInit,
  handleDrop,
  handleDragOver,
} = canvasHandlers;
```

**確認事項:**
- [ ] キャンバスクリックで選択解除が動作する
- [ ] ReactFlowの初期化が動作する
- [ ] ドラッグ&ドロップが動作する
- [ ] ビルドエラーがない

---

### Step 7: ユーティリティ関数統合（推定: 10分）

**目的**: 分離したユーティリティ関数を使用

**現在のコード（確認・削除）:**
```typescript
// ノード作成ヘルパー（重複確認）
const createNode = (type: string, position: XYPosition, ...) => { ... };

// エッジ作成ヘルパー（重複確認）
const createEdge = (source: string, target: string, ...) => { ... };
```

**対応:**
- インポート済みの`createNode`, `createEdge`を使用
- 重複するヘルパー関数を削除

**確認事項:**
- [ ] 重複関数が削除されている
- [ ] インポートしたユーティリティが使用されている
- [ ] ビルドエラーがない

---

### Step 8: MAIMLローダー統合（推定: 10分）

**目的**: loadMaimlFromXmlを使用

**現在のコード（確認）:**
```typescript
const handleLoadMaiml = useCallback((xmlString: string) => {
  // MAIML解析ロジック（約100行）
}, []);
```

**対応:**
- `loadMaimlFromXml`関数を使用するように修正
- 既存のロジックと比較して統合

**確認事項:**
- [ ] MAIMLファイルが正しく読み込まれる
- [ ] ノードとエッジが正しく生成される
- [ ] ビルドエラーがない

---

### Step 9: 最終調整（推定: 30分）

**目的**: コードクリーンアップと最終検証

**作業内容:**
1. 未使用のインポートを削除
2. 未使用の変数を削除
3. コメントを整理
4. any型を可能な範囲で具体的な型に置き換え
5. ESLintエラーを確認

**確認事項:**
- [ ] ビルドエラーがゼロ
- [ ] ESLintエラーが大幅に削減（80%削減目標）
- [ ] メインファイルが700行以下（理想は500行）
- [ ] すべての基本機能が動作

---

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/PetriNetEditorInner.tsx`
   - インポート追加
   - ハンドラー統合
   - フック統合
   - 重複コード削除
   - 約500-700行削減予定

### 影響を受ける機能
- すべてのPetri Net編集機能
- キーボードショートカット
- ノード・エッジ操作
- MAIMLファイル読み込み

---

## 5. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 統合時の依存関係エラー | 高 | 中 | 段階的統合、各ステップでテスト |
| 既存機能の動作不良 | 高 | 中 | バックアップコメント、ロールバック可能に |
| コンテキスト不足 | 中 | 低 | 新セッションで開始済み |
| any型エラー増加 | 低 | 低 | 最小限の修正に留める |

---

## 6. テスト計画

### 各ステップでの確認
- [ ] ビルドが成功する
- [ ] ブラウザコンソールにエラーがない
- [ ] 該当機能が動作する

### 最終統合テスト
- [ ] ノード追加・削除
- [ ] エッジ接続・削除
- [ ] キーボードショートカット（Ctrl+C/V/Z/Y/S）
- [ ] ドラッグ&ドロップ
- [ ] MAIMLファイル読み込み
- [ ] 保存機能

---

## 7. ロールバック計画

### バックアップ戦略
```typescript
// 元のコードをコメントアウトで残す
// ===== 旧実装（バックアップ） =====
// const handleNodeClick = useCallback((_event: any, node: Node<any>) => {
//   setSelectedNode(node);
//   setSelectedEdge(null);
// }, [setSelectedNode, setSelectedEdge]);

// ===== 新実装（統合後） =====
const { handleNodeClick } = nodeHandlers;
```

### ロールバック手順
1. コメントアウトした旧コードを復元
2. 新しいインポートをコメントアウト
3. ビルド確認

---

## 8. 成功基準

### 必須条件（Must Have）
- ✅ ビルドエラーがゼロ
- ✅ 基本機能が動作（ノード追加、エッジ接続、保存）
- ✅ キーボードショートカットが動作
- ✅ MAIMLファイル読み込みが動作

### 推奨条件（Should Have）
- 🟡 ESLintエラーが80%削減
- 🟡 メインファイルが700行以下
- 🟡 any型エラーが50%削減

### 理想条件（Nice to Have）
- 🔵 メインファイルが500行以下
- 🔵 any型エラーが80%削減
- 🔵 すべてのESLintエラー解消

---

## 9. 実装順序の重要性

### なぜ段階的アプローチが必要か

**一度に統合した場合の問題:**
```typescript
// ❌ 一度に統合すると...
- 100+のコンパイルエラー
- 原因特定に数時間
- どこで失敗したか不明
- ロールバックが困難
```

**段階的アプローチの利点:**
```typescript
// ✅ 段階的に統合すると...
- 各ステップで5-10のエラーのみ
- 原因特定が容易
- 問題発生時は前のステップに戻る
- 進捗が可視化される
```

---

## 10. コンテキスト管理

### 現在の状況
- **使用量**: 新セッション（約5%）
- **バッファ**: 95%

### Phase 8での予測
- **Step 1-3**: 約30%使用
- **Step 4-6**: 約30%使用
- **Step 7-9**: 約30%使用
- **バッファ**: 約10%

**結論**: 1セッションで完了可能

---

## 11. 承認記録

- **計画書提示日時**: 2026-01-30 13:36
- **承認日時**: （承認待ち）
- **承認者コメント**: （記入欄）

---

## 12. 実施記録

### 実施日時
開始: （未開始）
完了: （未完了）

### 各ステップの進捗
- [ ] Step 1: インポート追加
- [ ] Step 2: キーボードショートカット統合
- [ ] Step 3: エディタアクション統合
- [ ] Step 4: ノードハンドラー統合
- [ ] Step 5: エッジハンドラー統合
- [ ] Step 6: キャンバスハンドラー統合
- [ ] Step 7: ユーティリティ関数統合
- [ ] Step 8: MAIMLローダー統合
- [ ] Step 9: 最終調整

---

## 13. 関連ドキュメント

- [Phase 1-7計画書](./20260130_1320_PetriNetEditorInner_ファイル分割_計画書.md)
- [Phase 7完了報告](./20260130_1335_PetriNetEditorInner_ファイル分割_Phase7完了報告.md)

---

**次のアクション**: ユーザーの承認後、Step 1から段階的に実施
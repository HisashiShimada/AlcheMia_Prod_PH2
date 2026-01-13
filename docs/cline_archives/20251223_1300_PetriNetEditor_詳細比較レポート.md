# PetriNetEditor Reference版との詳細比較レポート

## 実施日時
- 開始: 2025-12-23 13:00
- 完了: 2025-12-23 13:01

## 1. console.log出力量の比較

### 結果
| 項目 | 現行版（Next.js） | Reference版 | 判定 |
|------|------------------|-------------|------|
| console.log数 | 69個 | 261個 | ✅ 問題なし |

**結論**: console.logは原因ではない。reference版の方が遥かに多い。

## 2. handleNodeDragStop実装の比較

### Reference版（PetriNetEditorInner.jsx）
```javascript
const handleNodeDragStop = useCallback((event, node) => {
  console.log('📍 [PetriNetEditorInner] ノード移動:', {
    id: node.id,
    position: node.position
  });
  
  // Phase 3C: 移動後の状態を履歴に追加
  setTimeout(() => {
    pushState({ nodes, edges });
  }, 0);
}, [nodes, edges, pushState]);
```

**特徴:**
- `setTimeout(..., 0)` - 次のイベントループで実行
- **デバウンスなし**
- ノード移動のたびに即座に履歴保存

### 現行版（PetriNetEditor.tsx）
```typescript
const dragStopTimerRef = useRef<NodeJS.Timeout | null>(null);

const handleNodeDragStop = useCallback(() => {
  // 既存のタイマーをクリア
  if (dragStopTimerRef.current) {
    clearTimeout(dragStopTimerRef.current);
  }
  
  // 500ms後に履歴保存（連続ドラッグ時は最後の1回だけ実行）
  dragStopTimerRef.current = setTimeout(() => {
    pushState({ nodes, edges });
    console.log('📍 [PetriNetEditor] ドラッグ終了: 履歴保存');
  }, 500);
}, [nodes, edges, pushState]);
```

**特徴:**
- `setTimeout(..., 500)` - 500msのデバウンス
- **デバウンスあり**
- 連続ドラッグ時は最後の1回だけ履歴保存

**❌ 問題点:**
- **500msのデバウンスが逆効果の可能性**
- reference版は即座に履歴保存している
- デバウンス中もドラッグイベントが発火し続ける

## 3. useEffectの依存配列比較

### Reference版
```javascript
useEffect(() => {
  if (history.present.nodes && history.present.edges) {
    setNodes(history.present.nodes);
    setEdges(history.present.edges);
    console.log('↻ [PetriNetEditorInner] 履歴から状態復元:', {
      nodesCount: history.present.nodes.length,
      edgesCount: history.present.edges.length,
    });
  }
}, [history.present, setNodes, setEdges]);
```

### 現行版
```typescript
useEffect(() => {
  if (history.present.nodes && history.present.edges) {
    setNodes(history.present.nodes);
    setEdges(history.present.edges);
    console.log('↻ [PetriNetEditor] 履歴から状態復元:', {
      nodesCount: history.present.nodes.length,
      edgesCount: history.present.edges.length,
    });
  }
}, [history.present, setNodes, setEdges]);
```

**判定**: ✅ **完全に同一**

## 4. React Flow設定の比較

### Reference版
```javascript
<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onNodeClick={handleNodeClick}
  onEdgeClick={handleEdgeClick}
  onNodesDelete={handleNodesDelete}
  onEdgesDelete={handleEdgesDelete}
  onConnect={handleConnect}
  onNodeDragStop={handleNodeDragStop}
  onSelectionChange={handleSelectionChange}
  onPaneClick={handlePaneClick}
  nodeTypes={nodeTypes}
  fitView
  nodesDraggable={true}
  nodesConnectable={true}
  nodesFocusable={true}
  edgesFocusable={true}
  elementsSelectable={true}
  nodesDeletable={true}
  edgesDeletable={true}
  deleteKeyCode="Delete"
  multiSelectionKeyCode="Control"
  selectionOnDrag={false}
  panOnDrag={[1, 2]}
  selectionMode="partial"
  zoomOnScroll={true}
  zoomOnPinch={true}
  panOnScroll={false}
  minZoom={0.1}
  maxZoom={4}
  defaultViewport={{ x: 0, y: 0, zoom: 1 }}
  proOptions={{ hideAttribution: true }}
  style={pressedKeys.size > 0 ? { cursor: 'crosshair' } : {}}
>
```

### 現行版
```typescript
<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onNodesDelete={handleNodesDelete}
  onEdgesDelete={handleEdgesDelete}
  onNodeClick={handleNodeClick}
  onEdgeClick={handleEdgeClick}
  onNodeDragStop={handleNodeDragStop}
  onConnect={handleConnect}
  onSelectionChange={handleSelectionChange}
  onPaneClick={handlePaneClick}
  nodeTypes={nodeTypes}
  fitView
  nodesDraggable={true}
  nodesConnectable={true}
  nodesFocusable={true}
  edgesFocusable={true}
  elementsSelectable={true}
  nodesDeletable={true}
  edgesDeletable={true}
  deleteKeyCode="Delete"
  multiSelectionKeyCode="Control"
  selectionOnDrag={false}
  panOnDrag={[1, 2]}
  selectionMode="partial"
  zoomOnScroll={true}
  zoomOnPinch={true}
  panOnScroll={false}
  minZoom={0.1}
  maxZoom={4}
  defaultViewport={{ x: 0, y: 0, zoom: 1 }}
>
```

**差異:**
- ❌ 現行版に `proOptions={{ hideAttribution: true }}` なし
- ❌ 現行版に `style={pressedKeys.size > 0 ? { cursor: 'crosshair' } : {}}` なし

**判定**: ⚠️ **微細な差異あり（パフォーマンスには影響なし）**

## 5. package.jsonの比較

### ReactFlow バージョン
- Reference版: 確認が必要
- 現行版: `reactflow@11.11.4`

### React バージョン
- Reference版: React 17/18
- 現行版: React 18（Next.js 15）

## 6. 根本原因の特定

### 🎯 最も疑わしい原因: デバウンス処理

**Reference版の設計哲学:**
```javascript
setTimeout(() => {
  pushState({ nodes, edges });
}, 0);
```
- 即座に履歴保存（次のイベントループで）
- ノード移動のたびに保存
- シンプルで確実

**現行版の設計（誤り）:**
```typescript
dragStopTimerRef.current = setTimeout(() => {
  pushState({ nodes, edges });
}, 500);
```
- 500msの遅延
- **この遅延中もドラッグイベントが発火**
- **カクつきの原因**

### 🔧 推奨対応

#### Option 1: reference版と完全に同じ実装に戻す（推奨）
```typescript
const handleNodeDragStop = useCallback(() => {
  setTimeout(() => {
    pushState({ nodes, edges });
  }, 0);
}, [nodes, edges, pushState]);
```

#### Option 2: デバウンス時間を短縮
```typescript
dragStopTimerRef.current = setTimeout(() => {
  pushState({ nodes, edges });
}, 50); // 500ms → 50ms
```

#### Option 3: デバウンスを完全削除
```typescript
const handleNodeDragStop = useCallback(() => {
  pushState({ nodes, edges });
}, [nodes, edges, pushState]);
```

## 7. Next.js特有の問題の可能性

### 検証項目
- [ ] Next.js 15のStrictモードによる二重レンダリング
- [ ] App Routerによるクライアントコンポーネントの挙動
- [ ] HMR（Hot Module Replacement）の影響
- [ ] ビルド最適化の影響

### 確認方法
1. `next.config.ts`で`reactStrictMode: false`を試す
2. 本番ビルド（`npm run build && npm start`）で確認
3. Profilerで実際のre-render回数を計測

## 8. 最終結論

### カクつきの主原因（推定）
1. **500msのデバウンス処理** - reference版にはない独自実装
2. デバウンス中もドラッグイベントが発火し続ける
3. これが「一定間隔で引っかかる」原因

### 即座に試すべき対策
1. ✅ **handleNodeDragStopをreference版と同じ実装に戻す**
   - `setTimeout(..., 0)` を使用
   - デバウンスを削除
   
2. ⚠️ Next.js特有の問題を確認
   - `reactStrictMode: false`で確認
   - 本番ビルドで確認

### パフォーマンス最適化は別途検討
- reference版も同じ頻度で履歴保存している
- reference版がスムーズならば、同じ実装で問題ない
- 最適化が必要なら、別の方法を検討（例: requestAnimationFrame）

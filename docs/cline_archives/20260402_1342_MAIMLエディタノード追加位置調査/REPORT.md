# 調査レポート: MAIMLエディタ ノード追加位置・ミニマップ色分け

## メタデータ
- **作成日時**: 2026-04-02 13:42
- **調査対象**: MAIMLエディタ（editorv2）のノード追加時の表示範囲外配置問題、Reference版との比較、ミニマップ色分け

---

## 1. ノードが表示範囲外に追加される原因

### 該当コード

**`frontend/src/components/editorv2/PetriNetEditorInner.tsx`**（1021〜1051行目）の `handleAddNode` 関数

```typescript
const handleAddNode = useCallback((nodeType: string) => {
  const newNode: Node<NodeData> = {
    id: `${nodeType}-${Date.now()}`,
    type: ...,
    position: {
      x: Math.random() * 400 + 100,  // ← フロー座標 100〜500 のランダム固定範囲
      y: Math.random() * 400 + 100,  // ← フロー座標 100〜500 のランダム固定範囲
    },
    ...
  };
```

### 原因

ツールバーのボタン（Material / Condition / Result / Transition）でノードを追加するとき、ノードの配置座標が **ReactFlowのフロー座標系（絶対座標）で x:100〜500, y:100〜500 のランダム範囲** に固定されている。

ユーザーがキャンバスをパン（移動）・ズームアウトしていると、**フロー座標の100〜500範囲が現在のビューポートの画面外**になってしまうため、ノードが見えない場所に追加される。

### 具体的なシナリオ

1. キャンバスを右・下方向に大きくパンした状態（例: ビューポート原点がx:2000, y:1500付近）
2. その状態でツールバーの「Material」ボタンを押す
3. ノードはフロー座標 (150, 230) あたりに追加 → 画面左上の見えない場所になる

---

## 2. Reference版との比較

### Reference版の `handleAddNode`（`PetriNetEditorInner.jsx` 1181〜1246行目）

```javascript
const newNode = {
  id: nodeId,
  type: ...,
  position: {
    x: Math.random() * 400 + 100,  // ← 現行版と全く同じ
    y: Math.random() * 400 + 100,  // ← 現行版と全く同じ
  },
  ...
};
```

**ツールバーボタンでのノード追加は Reference版も同じ問題を抱えている。**

### Reference版の優れた点: キャンバスクリックでのノード追加（`handlePaneClick`）

Reference版には、**キー + キャンバスクリックでノードを追加する方式**が実装されており、こちらでは `screenToFlowPosition` を使って**クリック位置に正確に配置**する：

```javascript
// Reference版 handlePaneClick（1509〜1513行目）
// Bug Fix: screenToFlowPositionを使用（パンのみ防止、位置ずれは既知の問題として保留）
const position = screenToFlowPosition({
  x: event.clientX,
  y: event.clientY,
});
```

現行版（editorv2）も同様の `handlePaneClick` は実装されているため、**M/C/R/T キー + キャンバスクリックでのノード追加は正しく動作する**。

### まとめ: Reference版との差異

| 操作方法 | editorv2（現行版） | Reference版 |
|----------|-------------------|-------------|
| ツールバーボタンでの追加 | ❌ ランダム固定座標（100〜500）| ❌ 同じ（ランダム固定座標） |
| キー+クリックでの追加 | ✅ `screenToFlowPosition` で正確配置 | ✅ `screenToFlowPosition` で正確配置 |

**両版ともツールバーボタンでの追加時に同じ問題がある。**

---

## 3. ミニマップ（右下の縮図）でのノード色分け

現行版（editorv2）と Reference版の両方で、**全く同じ実装**が存在する。

### 実装箇所

- **現行版**: `frontend/src/components/editorv2/PetriNetEditorInner.tsx`（3227〜3252行目）
- **Reference版**: `frontend/src/reference/components/PetriNetEditorV2/PetriNetEditorInner.jsx`（3536〜3561行目）

### 色分け仕様

| ノードタイプ | 判定条件 | 色コード | 色イメージ |
|---|---|---|---|
| Material Place | `node.data.placeType === 'material'` | `#F8C471` | 黄色系（アンバー） |
| Condition Place | `node.data.placeType === 'condition'` | `#85C1E9` | 水色系（スカイブルー） |
| Result Place | `node.data.placeType === 'result'` | `#D7BDE2` | 紫色系（ラベンダー） |
| Transition / その他 | `node.type === 'transition'` または default | `#CCCCCC` | グレー |

### 実装コード（現行版）

```typescript
<MiniMap
  nodeColor={(node) => {
    // PlaceTypeに応じて色を変更
    if (node.data && node.data.placeType) {
      switch (node.data.placeType) {
        case 'material':   return '#F8C471';  // 黄色系
        case 'condition':  return '#85C1E9';  // 水色系
        case 'result':     return '#D7BDE2';  // 紫色系
        default:           return '#CCCCCC';
      }
    }
    // Transitionの場合
    if (node.type === 'transition') return '#CCCCCC';
    return '#E0E0E0';
  }}
  maskColor="rgba(0, 0, 0, 0.1)"
  style={{ backgroundColor: '#f5f5f5' }}
/>
```

ミニマップの色分けは **現行版・Reference版ともに同一実装で正常に機能している**。

---

## 4. 修正方針（参考）

ツールバーボタンでのノード追加時に**現在のビューポート中心付近**に配置するには、`screenToFlowPosition` を使用してビューポート中央のフロー座標を算出する方法が有効：

```typescript
// handleAddNode 内で現在ビューポートの中心を取得
const canvasCenter = screenToFlowPosition({
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
});

position: {
  x: canvasCenter.x + (Math.random() - 0.5) * 200,
  y: canvasCenter.y + (Math.random() - 0.5) * 200,
}
```

`screenToFlowPosition` は `useReactFlow()` から取得可能で、`PetriNetEditorInner.tsx` 内では既に `const { fitView, screenToFlowPosition, getViewport, setViewport } = useReactFlow();` として取得済みのため、そのまま利用できる。

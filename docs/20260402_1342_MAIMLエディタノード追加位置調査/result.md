# 修正結果: MAIMLエディタ ノード追加位置問題

## 実施日時
2026-04-02 14:00〜14:20

---

## 1. 調査結果

### 問題1: ノードが見えている範囲外に追加される

**原因：**  
`handleAddNode`（ツールバーのボタンでノード追加）で、ノード位置を以下のように固定値で計算していた。

```typescript
// 修正前（問題のあるコード）
position: {
  x: Math.random() * 400 + 100,  // 常に x: 100〜500 の絶対フロー座標
  y: Math.random() * 400 + 100,  // 常に y: 100〜500 の絶対フロー座標
}
```

この計算は**ビューポートの状態（ズーム・パン）を考慮しない**ため、キャンバスをスクロール・ズームアウトした状態でノードを追加すると、現在見えている範囲の外にノードが作成されていた。

**参考：** `handlePaneClick`（キャンバスクリックでのノード追加）は `screenToFlowPosition` を使って正しくクリック位置をフロー座標に変換していたため問題なかった。

---

### 問題2: Reference版との比較

**Reference版のノード追加動作：**  
Reference版でも同様に `screenToFlowPosition` でビューポート中央をフロー座標に変換してノードを配置していた。

---

### 問題3: ミニマップのノード色分け

**調査結果：**  
ミニマップのノード色分けはすでに実装済みであることを確認。

| ノード種別 | 色 |
|-----------|-----|
| material（材料） | 黄色 `#F8C471` |
| condition（条件） | 青色 `#85C1E9` |
| result（結果） | 紫色 `#D7BDE2` |
| transition（遷移） | グレー `#CCCCCC` |

---

## 2. 修正内容

### 修正1: ノード追加位置の修正

**ファイル：** `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

```typescript
// 修正後
const handleAddNode = useCallback((nodeType: string) => {
  // 現在の画面中央をフロー座標に変換（ビューポート中心配置）
  const canvasCenter = screenToFlowPosition({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  const newNode: Node<NodeData> = {
    // ...
    position: {
      x: canvasCenter.x + (Math.random() - 0.5) * 200,  // 中央±100px
      y: canvasCenter.y + (Math.random() - 0.5) * 200,  // 中央±100px
    },
    // ...
  };
  // ...
}, [..., screenToFlowPosition]);
```

**効果：** どのズーム・パン状態でも、ノードが常に現在見えている画面中央付近に配置される。

---

### 修正2: ミニマップの新規追加ノード強調表示

**ファイル：** `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

```typescript
// lastAddedNodeId state を追加
const [lastAddedNodeId, setLastAddedNodeId] = useState<string | null>(null);

// ノード追加時に ID をセットして 2 秒後にクリア
setLastAddedNodeId(newNode.id);
setTimeout(() => setLastAddedNodeId(null), 2000);

// MiniMap に強調スタイルを追加
<MiniMap
  nodeColor={(node) => { /* 既存の色分け */ }}
  nodeStrokeColor={(node) =>
    node.id === lastAddedNodeId ? '#FF4444' : 'transparent'
  }
  nodeStrokeWidth={3}
/>
```

**効果：** ノード追加直後の2秒間、ミニマップ内の該当ノードに赤いボーダーが表示され、追加位置を視覚的に確認できる。

---

### 修正3: CSSインポートエラーの修正

**ファイル（新規作成）：** `frontend/src/types/css.d.ts`

```typescript
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
```

**原因：** TypeScript の `moduleResolution: "bundler"` では `import 'reactflow/dist/style.css'` のような CSS副作用インポートに型宣言が必要だが、プロジェクトに存在していなかった。

**効果：** 以下のファイルすべての `ts(2882)` エラーが解消される：
- `PetriNetEditorInner.tsx`
- `SubNetViewer.tsx`
- `PetriNetVisualization.tsx`
- `PetriNetViewer.tsx`
- `TransitionFlowDiagram.tsx`

---

## 3. 変更ファイル一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | 修正 | ノード追加位置修正・ミニマップ強調 |
| `frontend/src/types/css.d.ts` | 新規作成 | CSSインポート型宣言 |

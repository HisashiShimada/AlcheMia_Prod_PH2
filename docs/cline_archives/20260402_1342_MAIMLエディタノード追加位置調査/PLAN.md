# タスク計画書: MAIMLエディタ ツールバーノード追加位置修正

## メタデータ
- **作成日時**: 2026-04-02 13:45
- **タスクID**: maiml-editor-add-node-viewport-fix
- **優先度**: 中
- **推定工数**: 1〜2時間

## タスク概要

MAIMLエディタ（editorv2）のツールバーボタン（Material / Condition / Result / Transition）でノードを追加するとき、以下の2点を改善する。

1. ノードが**現在の表示範囲（ビューポート）の中心付近**に配置されるよう修正する
2. ミニマップ（右下の縮図）上で**最後に追加したノードを強調表示**し、ユーザーが追加位置を把握しやすくする

---

## 目的と期待される成果

### 目的

現状はノード追加座標がフロー座標の絶対値 x:100〜500, y:100〜500 のランダム固定範囲になっているため、キャンバスをパン・ズームアウトした状態でノードを追加すると画面外に配置されてしまう。これを改善し、ユーザーが常に追加したノードを確認できるようにする。

### 期待される成果
- [ ] ツールバーボタンでノードを追加したとき、**現在の画面中央付近**にノードが配置される
- [ ] キャンバスをどの位置・ズーム率にパン・ズームしていても、追加直後にノードが見える
- [ ] 既存の「M/C/R/T キー + クリック」でのノード追加動作は変更しない
- [ ] ミニマップ上で最後に追加したノードが**赤枠で強調表示**される
- [ ] 強調表示は一定時間（2秒）後に自動で解除される

---

## 実装ステップ

### Phase 1: `PetriNetEditorInner.tsx` の `handleAddNode` を修正（ビューポート中心配置）

**対象ファイル**: `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

**変更内容**:

`handleAddNode` 関数内のノード座標計算を、現在のビューポート中心を基準にする方式に変更する。

**変更前（現状）**:
```typescript
position: {
  x: Math.random() * 400 + 100,
  y: Math.random() * 400 + 100,
},
```

**変更後**:
```typescript
// 現在の画面中央をフロー座標に変換
const canvasCenter = screenToFlowPosition({
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
});
// 中心から ±100px のランダムオフセットで配置（重なり防止）
position: {
  x: canvasCenter.x + (Math.random() - 0.5) * 200,
  y: canvasCenter.y + (Math.random() - 0.5) * 200,
},
```

**ポイント**:
- `screenToFlowPosition` は `useReactFlow()` から既に取得済みのため追加実装不要
- `handleAddNode` のコールバック依存配列に `screenToFlowPosition` を追加する必要がある

**修正箇所の依存配列**:
```typescript
// 変更前
}, [setNodes, edges, pushState, onContentChange]);

// 変更後
}, [setNodes, edges, pushState, onContentChange, screenToFlowPosition]);
```

---

### Phase 2: 最新ノードIDのstate管理を追加

**対象ファイル**: `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

**変更内容**:

1. state を追加：
```typescript
const [lastAddedNodeId, setLastAddedNodeId] = useState<string | null>(null);
```

2. `handleAddNode` 内でノード追加後に更新（2秒後に自動解除）：
```typescript
setLastAddedNodeId(newNode.id);
setTimeout(() => setLastAddedNodeId(null), 2000);
```

3. `handlePaneClick`（M/C/R/T キー + クリック）でも同様に更新：
```typescript
setLastAddedNodeId(newNode.id);
setTimeout(() => setLastAddedNodeId(null), 2000);
```

---

### Phase 3: MiniMap に `nodeStrokeColor` / `nodeStrokeWidth` を追加

**対象ファイル**: `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

**変更前**:
```typescript
<MiniMap
  nodeColor={(node) => { ... }}
  maskColor="rgba(0, 0, 0, 0.1)"
  style={{ backgroundColor: '#f5f5f5' }}
/>
```

**変更後**:
```typescript
<MiniMap
  nodeColor={(node) => { ... }}  // 既存ロジックは変更なし
  nodeStrokeColor={(node) =>
    node.id === lastAddedNodeId ? '#FF4444' : 'transparent'
  }
  nodeStrokeWidth={3}
  maskColor="rgba(0, 0, 0, 0.1)"
  style={{ backgroundColor: '#f5f5f5' }}
/>
```

強調色は赤（`#FF4444`）を使用。既存の色分け（黄/水色/紫/グレー）は変更なし。

---

## 変更ファイル

### 修正
1. `frontend/src/components/editorv2/PetriNetEditorInner.tsx`
   - `lastAddedNodeId` state を追加（1行）
   - `handleAddNode` 関数の `position` 計算を `screenToFlowPosition` ベースに変更（約3行）
   - `handleAddNode` 内で `setLastAddedNodeId` + `setTimeout` 呼び出しを追加（2行）
   - `handlePaneClick` 内でも `setLastAddedNodeId` + `setTimeout` 呼び出しを追加（2行）
   - `useCallback` の依存配列に `screenToFlowPosition` を追加（1行）
   - `MiniMap` に `nodeStrokeColor` と `nodeStrokeWidth` を追加（2行）

---

## 技術的詳細

### `screenToFlowPosition` の動作

`screenToFlowPosition({ x, y })` は画面座標（ブラウザウィンドウ上のピクセル座標）をReactFlowのフロー座標（ズーム・パンを考慮した絶対座標）に変換するReactFlow提供のAPI。

- `window.innerWidth / 2, window.innerHeight / 2` はブラウザウィンドウの中央
- パン・ズームの状態に関わらず、常に**現在表示中の中央**のフロー座標を返す

### 注意事項

- `screenToFlowPosition` はReactFlowコンテキスト内（`ReactFlowProvider` 配下）でのみ使用可能
- `PetriNetEditorContent` コンポーネントは `ReactFlowProvider` 内部でレンダリングされているため問題なし（既に同じコンポーネント内で `fitView`, `getViewport` 等と同様に使用済み）

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `screenToFlowPosition` が初期化前に呼ばれる | 低 | 低 | `handleAddNode` はUI表示後にのみ呼ばれるため問題なし |
| 他のノードと重なる | 低 | 中 | ±100px のランダムオフセットで軽減（許容範囲） |
| `setTimeout` によるメモリリーク | 低 | 低 | コンポーネントアンマウント時のクリーンアップが必要な場合は `useEffect` でタイマーIDを管理する |

---

## テスト計画

### 手動テスト
- [ ] キャンバスを初期位置でツールバーボタンを押す → 画面中央付近にノードが追加される
- [ ] キャンバスを右下方向に大きくパンした後、ツールバーボタンを押す → 現在の画面中央付近にノードが追加される
- [ ] ズームアウト（0.3倍等）後にツールバーボタンを押す → 現在の画面中央付近にノードが追加される
- [ ] M/C/R/T キー + キャンバスクリックでのノード追加 → 従来通りクリック位置に追加される（変更なし）
- [ ] ノード追加直後、ミニマップ上の追加ノードが赤枠で強調される
- [ ] 約2秒後に強調が自動解除される
- [ ] 複数回ノードを追加した場合、常に最後に追加したノードのみが強調される

---

## 承認記録

- **計画書提示日時**: 2026-04-02 13:45
- **承認日時**: （承認後記入）

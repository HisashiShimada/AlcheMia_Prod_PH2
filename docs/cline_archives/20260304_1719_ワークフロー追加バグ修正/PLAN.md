# タスク計画書: ワークフロー追加バグ修正

## メタデータ
- **作成日時**: 2026-03-04 17:19
- **タスクID**: workflow-add-bug-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

PetriNetEditorの「ワークフロー追加」ボタン押下後の処理において、既存のペトリネットが削除され、選択されたMaiMLファイルのペトリネットに置き換わるバグを修正する。

正しい動作は「選択されたMaiMLファイルのペトリネットを既存のペトリネットに追加する」である。

---

## 調査結果

### バグの再現手順

1. PetriNetEditorを開く（既存のペトリネットが表示された状態）
2. ツールバーの「ワークフロー追加」ボタンをクリック
3. キャンバス上をクリックして位置を指定
4. ファイル選択ダイアログからMaiMLファイルを選択して「ワークフロー追加」をクリック
5. **結果（バグ）**: 既存ペトリネットが消え、選択ファイルのペトリネットのみが表示される
6. **期待する結果**: 既存ペトリネットに選択ファイルのペトリネットが追加される

### 根本原因の特定

**ファイル**: `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

#### 原因1: `history.present` と ReactFlow state の同期処理が上書きを引き起こす

`PetriNetEditorInner.tsx` には、`history.present` の変更を ReactFlow の `nodes/edges` に同期する `useEffect` が存在する：

```typescript
// Phase 3C: history.presentとの同期
useEffect(() => {
  if (history.present.nodes && history.present.edges) {
    setNodes(history.present.nodes);  // ← history.presentの内容で全ノードを上書き！
    setEdges(history.present.edges);
  }
}, [history.present, setNodes, setEdges]);
```

`useWorkflow.addWorkflow()` が成功すると `addToHistory` コールバックを呼び出す：

```typescript
// useWorkflow.ts（addWorkflow内）
addToHistory('addWorkflow', {
  nodes: mappedNodes,   // ← 追加分のノードのみ
  edges: mappedEdges,   // ← 追加分のエッジのみ
  ...
});
```

`PetriNetEditorInner.tsx` の `addToHistory` コールバックは以下の通り：

```typescript
const { addWorkflow } = useWorkflow({
  addToHistory: (action: string, data: unknown) => {
    if (action === 'addWorkflow' && ...) {
      pushState({
        nodes: workflowData.nodes,  // ← 追加分のみでpushState（既存分が含まれない）
        edges: workflowData.edges
      });
    }
  },
});
```

この `pushState` により `history.present` が「追加分のみ」に更新され、上記の `useEffect` が発火して `setNodes(追加分のみ)` が実行される。これにより既存ノードが失われる。

#### 原因2: `useWorkflow` 内部 state と ReactFlow state は別管理

`useWorkflow` フックは内部で独自の `methods` 配列を管理しており、`addWorkflow` 内の `setNodes/setEdges` は `useWorkflow` 内部 state を更新するが、`PetriNetEditorInner` が ReactFlow に渡している `useNodesState/useEdgesState` とは**別物**。

したがって、`useWorkflow.addWorkflow()` の処理自体は正しく追加しているが、`PetriNetEditorInner` の ReactFlow state には反映されない仕組みになっている。

### 修正すべき箇所

**`frontend/src/components/editorv2/PetriNetEditorInner.tsx` の2箇所のみ修正**

1. `addToHistory` コールバック（`useWorkflow` の初期化部分）
2. `handleWorkflowFileSelect` ハンドラー

---

## 対策

### 対策1: `addToHistory` コールバックを修正

追加分のみではなく、**既存ノード/エッジ + 追加分**を合わせた状態で `pushState` を呼ぶように修正する。

**修正前:**
```typescript
const { addWorkflow } = useWorkflow({
  addToHistory: (action: string, data: unknown) => {
    if (action === 'addWorkflow' && typeof data === 'object' && data !== null) {
      const workflowData = data as { nodes?: Node<NodeData>[]; edges?: Edge<EdgeData>[] };
      if (workflowData.nodes && workflowData.edges) {
        pushState({ nodes: workflowData.nodes, edges: workflowData.edges });
      }
    }
  },
});
```

**修正後:**
```typescript
const { addWorkflow } = useWorkflow({
  addToHistory: (action: string, data: unknown) => {
    if (action === 'addWorkflow' && typeof data === 'object' && data !== null) {
      const workflowData = data as { nodes?: Node<NodeData>[]; edges?: Edge<EdgeData>[] };
      if (workflowData.nodes && workflowData.edges) {
        // ✅ 修正: 既存ノード/エッジ + 追加分を合わせてpushState
        pushState({
          nodes: [...nodes, ...workflowData.nodes],
          edges: [...edges, ...workflowData.edges]
        });
      }
    }
  },
});
```

### 対策2: `handleWorkflowFileSelect` で ReactFlow state を直接更新

`addWorkflow` の返り値（追加分のノード/エッジ）を使って、`PetriNetEditorInner` の ReactFlow state に**追加（マージ）**する処理を追加する。

**修正前:**
```typescript
const result2 = await addWorkflow(targetPosition, maimlContent, file.name);

if (result2.success) {
  console.log('✅ [PetriNetEditorInner] ワークフロー追加完了:', result2.message);
  alert(result2.message);
  
  // ワークフローモード解除
  setSelectedTool('select');
  setPendingClickPosition(null);
}
```

**修正後:**
```typescript
const result2 = await addWorkflow(targetPosition, maimlContent, file.name);

if (result2.success) {
  // ✅ 修正: ReactFlowのstateに追加分をマージ（置き換えではなく追加）
  if (result2.nodes && result2.edges) {
    setNodes(prev => [...prev, ...result2.nodes!]);
    setEdges(prev => [...prev, ...result2.edges!]);
  }
  
  console.log('✅ [PetriNetEditorInner] ワークフロー追加完了:', result2.message);
  alert(result2.message);
  
  // ワークフローモード解除
  setSelectedTool('select');
  setPendingClickPosition(null);
}
```

---

## 目的と期待される成果

- [ ] ワークフロー追加時に既存ペトリネットが保持される
- [ ] 選択したMaiMLファイルのペトリネットが既存ペトリネットに追加される
- [ ] Undo/Redo履歴が正しく記録される（追加前の状態に戻れる）

---

## 実装ステップ

- [ ] Step 1: タスク計画書作成（本ファイル）
- [ ] Step 2: `addToHistory` コールバックの修正
- [ ] Step 3: `handleWorkflowFileSelect` の修正

---

## 変更ファイル

1. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - 2箇所修正

---

## リスク

| リスク | 対策 |
|--------|------|
| `nodes` の参照が `addToHistory` コールバック内でクロージャとして古い値を参照する可能性 | `useWorkflow` 呼び出しは `PetriNetEditorContent` 内にあり、`nodes` は `useNodesState` から取得するためリアルタイム値が参照される |
| `addWorkflow` の内部 state が増加し続ける（`useWorkflow` 内部 state との二重管理） | `useWorkflow` の内部 state は `handleWorkflowFileSelect` では使用していないため影響なし。将来的なリファクタリング対象として記録 |

---

## テスト計画

- [ ] 既存ペトリネットを表示した状態でワークフロー追加を実行し、既存ノードが保持されることを確認
- [ ] 追加されたノードが指定位置付近に配置されることを確認
- [ ] Undoで追加前の状態に戻れることを確認

---

## 承認記録

- **計画書提示日時**: 2026-03-04 17:19
- **承認日時**: 2026-03-04 17:19（ユーザー承認済み・Act Mode移行）

---

## 実施記録

### 実施日時
開始: 2026-03-04 17:19
完了: -

### 計画からの変更点
-

### 発生した問題と解決方法
-

# タスク計画書: 共通テンプレートチェックボックス不具合修正

## メタデータ
- **作成日時**: 2026-04-20 11:37
- **タスクID**: common-template-checkbox-fix
- **優先度**: 高
- **推定工数**: 1〜2時間

---

## 1. タスク概要

テンプレート管理ビューで「共通テンプレート」チェックをONにして共通テンプレートを作成し、その後テンプレート編集ダイアログからPlaceRefでノードを2件紐づけて保存した際に、**片方のノードのPropertyPanelで「共通テンプレート」チェックボックスがONにならない**不具合を修正する。

---

## 2. 不具合の再現手順

1. ペトリネットエディタをテンプレート管理ビューに切り替え（`showCommonTemplates=true`）
2. 「共通テンプレート」チェックをONにした状態でテンプレートを新規作成 → 保存
3. 作成した共通テンプレートを選択してダイアログを開く
4. 「Place Reference追加」で2件のPlaceノードを追加（place_1、place_2）
5. 「保存」をクリック
6. ペトリネットビューに戻り、place_1 / place_2 のPropertyPanelを確認
7. **片方のノードで「共通テンプレート参照」ドロップダウンが空 / isCommonTemplateチェックボックスがOFF**

---

## 3. 根本原因の分析

### 原因① setNodes内でのpushState呼び出しによるuseEffect上書き

**`PetriNetEditorInner.tsx` L1849〜1895（既存テンプレート更新パス）**

```typescript
setNodes((nds) => {
  const placeRefsToUpdate = convertedTemplateRef.placeRefs || [];
  const newNodes = nds.map((node) => {
    if (placeRefsToUpdate.some((pr) => pr.ref === node.id)) {
      return {
        ...node,
        data: {
          ...node.data,
          isCommonTemplate: isCommonTemplate,
          commonTemplateRef: isCommonTemplate ? templateId : node.data.commonTemplateRef,
        },
      };
    }
    return node;
  });

  // ❌ 問題: setNodes コールバック内で pushState を呼んでいる
  pushState({ nodes: newNodes, edges });

  // ❌ 問題: nodeId はテンプレートIDであり canvas ノードのIDではない
  //    → newNodes.find(...) が undefined を返す → setSelectedNode が呼ばれない
  const updatedNode = newNodes.find(n => n.id === nodeId);
  if (updatedNode) {
    setSelectedNode(updatedNode);
  }

  return newNodes;
});
```

**問題点 1-A: `pushState` をコールバック内から呼んでいる**

- `setNodes(updater)` のコールバック内で `pushState(...)` を実行することで、`history.present` が更新される
- L443 の `useEffect` が `history.present` の変化を検知し `setNodes(history.present.nodes)` を再実行する
- この再実行タイミング次第で、**2件のノード更新が中途半端な状態のまま履歴に積まれ、一方の更新が巻き戻される**

```typescript
// L443
useEffect(() => {
  setNodes(history.present.nodes);  // ← pushStateが呼ばれると発火する
}, [history.present, setNodes, setEdges]);
```

**問題点 1-B: `setSelectedNode` のnodeIdがcanvasノードIDでない**

- テンプレート管理ビューからの編集時、`tempNode.id = template.id`（例: `materialTemplate_123`）
- `nodeId` には `template.id` が渡されるが、これは **canvas上のノードID（place_1, place_2）ではない**
- `newNodes.find(n => n.id === nodeId)` → `undefined` → `setSelectedNode` が呼ばれない
- PropertyPanelが即時更新されず、片方が古い状態で表示されることがある

### 原因② TemplateContextの更新とnodesの更新の分離

`handleSaveTemplate` 内では以下の順で2つの非同期状態更新が実行される：

1. `window.clineUpdateTemplate(...)` → TemplateContext（React Context）を更新
2. `setNodes(...)` → ReactFlow nodes を更新

これらは別々のRenderサイクルで処理されるため、PropertyPanel の `selectedNode.data` が最新の状態に反映されるまでにラグが発生する。

---

## 4. 修正方針

### 修正 A: `setNodes` コールバック外に `pushState` を移動

`pushState` を `setNodes` のコールバック **外** に出し、`setNodes` が完了した状態を `useRef` 等で捉えてから `pushState` を呼ぶ、または `useEffect` で `nodes` の変化後に `pushState` を呼ぶように変更する。

```typescript
// 修正前
setNodes((nds) => {
  const newNodes = nds.map(...);
  pushState({ nodes: newNodes, edges }); // ❌ コールバック内
  setSelectedNode(...);
  return newNodes;
});

// 修正後
// setNodes の戻り値を直接扱えないため、変数で持つ
const updatedNodesRef = useRef<Node<NodeData>[]>([]);

setNodes((nds) => {
  const newNodes = nds.map(...);
  updatedNodesRef.current = newNodes; // refに保存
  return newNodes;
});

// setNodes後、同期的に pushState と setSelectedNode を呼ぶ
// ※ React 18のバッチング配下ではフラッシュが必要な場合もあるが、
//   callbackの外に出すだけで多くのケースが解決する
setTimeout(() => {
  pushState({ nodes: updatedNodesRef.current, edges });
  // 選択ノードの更新（placeRefsに含まれる最初のノード or 全ノード）
  const firstUpdatedNode = updatedNodesRef.current.find(
    n => placeRefsToUpdate.some(pr => pr.ref === n.id)
  );
  if (firstUpdatedNode) setSelectedNode(firstUpdatedNode);
}, 0);
```

### 修正 B: `setSelectedNode` でpageRefsの全ノードを確認

テンプレート管理ビュー経由の場合、`nodeId` はcanvasノードIDではないため、`placeRefsToUpdate` に含まれるノードのうちcanvas上のものを選択ノードとして更新する。

```typescript
// 修正後
// nodeId がcanvasノードに存在しない場合（テンプレート管理ビュー経由）は
// placeRefsToUpdate の中から最初にマッチしたノードをselectedNodeにする
const candidateId = newNodes.some(n => n.id === nodeId)
  ? nodeId
  : placeRefsToUpdate[0]?.ref;
const updatedNode = newNodes.find(n => n.id === candidateId);
if (updatedNode) {
  setSelectedNode(updatedNode);
}
```

---

## 5. 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | `handleSaveTemplate` 内の `setNodes` コールバックから `pushState` を移動、`setSelectedNode` のnodeId解決ロジックを修正 |

---

## 6. 修正箇所の詳細

### 変更対象: L1848〜1895

```
PetriNetEditorInner.tsx
handleSaveTemplate コールバック内の「既存テンプレート更新」ブロック
```

**修正ポイント:**

1. `setNodes` コールバック内の `pushState` 呼び出しを **コールバック外** に移動する
2. `setNodes` コールバック内の `setSelectedNode` の `nodeId` 解決を **placeRefsベース** に変更する
3. 新規テンプレート作成パス（L1740〜1774）も同様に `pushState` をコールバック外に移動する（同根の問題のため）

---

## 7. テスト計画

| # | テストケース | 期待結果 |
|---|------------|---------|
| 1 | テンプレート管理ビューで共通テンプレート作成 → PlaceRef 1件追加 → 保存 → ノードのPropertyPanel確認 | チェックボックスON、ドロップダウンにテンプレートID表示 |
| 2 | テンプレート管理ビューで共通テンプレート作成 → PlaceRef 2件追加 → 保存 → 両ノードのPropertyPanel確認 | **両方とも**チェックボックスON |
| 3 | ノードのPropertyPanelからドロップダウンで共通テンプレートを選択 → チェックボックス確認 | チェックボックスON |
| 4 | 共通テンプレートのチェックをOFFにしてテンプレート作成 → PlaceRef追加 → 保存 → PropertyPanel確認 | チェックボックスOFF（既存動作維持）|
| 5 | Undo/Redoを実行してもノードのcommonTemplateRef状態が正しく復元される | 正常にUndo/Redo動作 |

---

## 8. リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `pushState` を外に出すことでUndoの粒度が変わる | 低 | テスト5で確認 |
| `setTimeout(0)` の副作用 | 低 | `useLayoutEffect` や `flushSync` との比較検討 |

---

## 9. 承認記録

- **計画書提示日時**: 2026-04-20 11:37
- **承認日時**: 2026-04-20 11:43
- **承認者コメント**: 実施済み

## 10. 実施記録

### 実施日時
開始: 2026-04-20 11:41
完了: 2026-04-20 11:43

### 変更ファイル
- `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

### 変更内容

1. **`updatedNodesRef` 追加（L440付近）**
   - `useRef<Node<NodeData>[]>([])` を追加
   - `setNodes` コールバック外で `pushState`/`setSelectedNode` を呼ぶためのref

2. **新規テンプレート作成パス（`isNewTemplate` ブロック）を修正**
   - `placeRefs` をコールバック外の変数 `newPlaceRefsToUpdate` に移動
   - `setNodes` コールバック内で `updatedNodesRef.current = newNodes` に変更（pushState削除）
   - `setTimeout(0)` 内で `pushState` と `setSelectedNode` を呼ぶよう変更
   - `nodeId` がcanvasノードIDでない場合は `newPlaceRefsToUpdate[0]?.ref` にフォールバック

3. **既存テンプレート更新パス（`isNewTemplate` 以外のブロック）を修正**
   - `placeRefs` をコールバック外の変数 `existingPlaceRefsToUpdate` に移動
   - `setNodes` コールバック内で `updatedNodesRef.current = newNodes` に変更（pushState/setSelectedNode削除）
   - `setTimeout(0)` 内で `pushState` と `setSelectedNode` を呼ぶよう変更
   - `nodeId` がcanvasノードIDでない場合は `existingPlaceRefsToUpdate[0]?.ref` にフォールバック

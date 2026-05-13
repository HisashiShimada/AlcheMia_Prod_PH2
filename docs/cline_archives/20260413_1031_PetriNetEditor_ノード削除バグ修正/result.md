# 修正結果: PetriNetEditor ノード削除時のテンプレート・エッジ紐づき解除

- **対象ファイル**: `frontend/src/components/editorv2/PetriNetEditorInner.tsx`
- **作業日時**: 2026-04-13
- **担当**: Cline

---

## 背景・課題

ノードを削除しても、そのノードに紐づいていたテンプレートの `placeRefs` が残ったままになっていた。また `handleDeleteNode`（PropertyPanel 経由の削除）では接続エッジが削除されないバグがあった。

---

## 修正内容

### 1. `unlinkTemplateFromNode` ヘルパー関数を追加

**場所**: `handleAddNode` の直後（`handleNodesDelete` の前）

**概要**:  
削除されたノードに紐づく `placeRef` を全テンプレートから除去するヘルパー。

**ポイント**:
- `material` / `condition` / `result` の **全カテゴリ** を網羅して検索
- 各カテゴリ内の**すべてのテンプレート**をチェック（1件ヒットしても残りも継続）
- `placeRefs[i].ref === node.id` に一致するエントリを除去
- テンプレート自体は削除しない（placeRef 紐づきのみ解除）
- `window.clineUpdateTemplate` で TemplateContext を即時更新

```ts
const unlinkTemplateFromNode = useCallback((targetNodes: Node<NodeData>[]) => {
  const allTemplates = window.clineAllTemplates;
  if (!allTemplates || !window.clineUpdateTemplate) return;

  const categories = ['material', 'condition', 'result'] as const;

  targetNodes.forEach(node => {
    if (node.data.nodeType === 'transition') return; // transition はテンプレートなし

    categories.forEach(cat => {
      const templatesInCat = (allTemplates[cat] as Template[] | undefined) ?? [];
      templatesInCat.forEach((template: Template) => {
        if (!template.id) return;
        if (!template.placeRefs?.some((pr: XsdPlaceRef) => pr.ref === node.id)) return;

        const updatedPlaceRefs = template.placeRefs.filter(
          (pr: XsdPlaceRef) => pr.ref !== node.id
        );
        const updatedTemplate: Template = { ...template, placeRefs: updatedPlaceRefs };
        window.clineUpdateTemplate!(template.id, updatedTemplate);
      });
    });
  });
}, []);
```

---

### 2. `handleNodesDelete`（Delete キー削除）に呼び出し追加

`setNodes` / `setEdges` 更新後、`onContentChange` の直前に追加。

```ts
// テンプレートの placeRef 紐づきを解除（テンプレート自体は削除しない）
unlinkTemplateFromNode(deletedNodes);
```

---

### 3. `handleDeleteNode`（PropertyPanel 削除ボタン）を修正

**修正前の問題**:
- 接続エッジが削除されず残っていた
- テンプレートの placeRef 紐づきが残っていた
- 履歴（pushState）にエッジ変更が反映されていなかった

**修正後**:

```ts
const handleDeleteNode = useCallback((nodeId: string) => {
  // 接続エッジを特定
  const affectedEdges = edges.filter((e) => e.source === nodeId || e.target === nodeId);

  // エッジを削除
  setEdges((eds) => eds.filter((e) => !affectedEdges.find((ae) => ae.id === e.id)));

  // ノードを削除 + 履歴追加（エッジ変更も含む）
  setNodes((nds) => {
    const newNodes = nds.filter(n => n.id !== nodeId);
    const newEdges = edges.filter((e) => !affectedEdges.find((ae) => ae.id === e.id));
    pushState({ nodes: newNodes, edges: newEdges });
    return newNodes;
  });

  // テンプレートの placeRef 紐づきを解除
  const targetNode = nodes.find(n => n.id === nodeId);
  if (targetNode) {
    unlinkTemplateFromNode([targetNode]);
  }

  onContentChange?.();
  setSelectedNode(null);
}, [nodes, edges, setEdges, setNodes, pushState, onContentChange, unlinkTemplateFromNode]);
```

---

## 注意事項

- **Undo 時の placeRef 復元は未対応**。TemplateContext 側の履歴管理が必要なため TODO として残している。
- TypeScript コンパイルエラー（`PetriNetEditorInner.tsx` 起因）：**なし**。

---

## 動作確認手順（手動テスト）

1. PetriNet エディタでノード（place）を作成し、テンプレートを紐づける
2. ノードを Delete キーで削除 → テンプレートの placeRefs からそのノードの ref が消えることを確認
3. ノードを PropertyPanel の削除ボタンで削除 → 接続エッジも同時に削除されること、placeRefs が解除されることを確認
4. 複数テンプレートに同じノードが紐づいている場合、すべて解除されることを確認

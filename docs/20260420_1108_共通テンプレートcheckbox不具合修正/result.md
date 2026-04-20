# 修正結果: 共通テンプレート checkbox 不具合修正

## 修正日時
2026-04-20 11:58

## 対象ファイル
- `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

---

## 不具合の概要

共通テンプレートの PlaceRef に複数のメソッドのノードを紐づけた場合、テンプレートエディタで「共通テンプレート」チェックボックスを ON にして保存しても、**非アクティブメソッドのノードには `isCommonTemplate` フラグが反映されない**問題があった。

その結果、メソッドを切り替えると PropertyPanel のチェックボックスが OFF のままになっていた。

---

## 根本原因

`handleSaveTemplate` 内で `setNodes` を呼び出してノードを更新していたが、`setNodes` は **アクティブメソッドの React Flow state のみ** を更新する。

非アクティブメソッドのノードは `methods` state（`MethodData[]`）に格納されているため、`setNodes` だけでは更新されず古い状態のまま残っていた。

---

## 修正内容

`handleSaveTemplate` 内の **新規テンプレートパス** と **既存テンプレート更新パス** の両方に、`setMethods` による非アクティブメソッドのノード更新処理を追加した。

### 新規テンプレートパス（`isNewTemplate === true` ブロック）

```typescript
// ✅ Fix: 非アクティブメソッドのノードも更新する
setMethods(prev => {
  return prev.map((method, idx) => {
    if (idx === activeMethodIndex) return method; // アクティブメソッドはsetNodesで更新済み
    const updatedNodes = method.nodes.map((node: Node<NodeData>) => {
      if (newPlaceRefsToUpdate.some((pr) => pr.ref === node.id)) {
        return {
          ...node,
          data: {
            ...node.data,
            template: newTemplateForContext,
            templateRef: newTemplateForContext,
            isCommonTemplate: isCommonTemplate,
            commonTemplateRef: isCommonTemplate ? templateId : node.data.commonTemplateRef,
          },
        };
      }
      return node;
    });
    return { ...method, nodes: updatedNodes };
  });
});
```

### 既存テンプレート更新パス

```typescript
// ✅ Fix: 非アクティブメソッドのノードも更新する
setMethods(prev => {
  return prev.map((method, idx) => {
    if (idx === activeMethodIndex) return method;
    const updatedNodes = method.nodes.map((node: Node<NodeData>) => {
      if (existingPlaceRefsToUpdate.some((pr) => pr.ref === node.id)) {
        return {
          ...node,
          data: {
            ...node.data,
            template: convertedTemplateRef,
            templateRef: convertedTemplateRef,
            isCommonTemplate: isCommonTemplate,
            commonTemplateRef: isCommonTemplate ? templateId : node.data.commonTemplateRef,
          },
        };
      }
      return node;
    });
    return { ...method, nodes: updatedNodes };
  });
});
```

### `handleSaveTemplate` 依存配列の更新

`useCallback` の依存配列に不足していた `setMethods`・`activeMethodIndex`・`methods`・`documentData` を追加した。

```typescript
// 変更前
}, [setNodes, edges, pushState, convertNestedPropertiesToArray, onContentChange]);

// 変更後
}, [setNodes, setMethods, activeMethodIndex, edges, pushState, convertNestedPropertiesToArray, onContentChange, methods, documentData]);
```

---

## 修正後の動作

1. テンプレートエディタで「共通テンプレート」チェックボックスを ON にして保存
2. PlaceRef に複数メソッドのノードが含まれる場合、**全メソッドのノード**に `isCommonTemplate: true` / `commonTemplateRef` が反映される
3. メソッドタブを切り替えても PropertyPanel のチェックボックスが正しく ON のまま表示される

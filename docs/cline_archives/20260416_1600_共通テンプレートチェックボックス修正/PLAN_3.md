# タスク計画書: 共通テンプレートチェックボックス不具合修正

## メタデータ
- **作成日時**: 2026-04-16 16:00
- **タスクID**: 共通テンプレートチェックボックス修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

テンプレート管理ビューで共通テンプレートを作成後、ノードに共通テンプレートをrefで紐づけた際に PropertyPanel の「共通テンプレート」チェックボックスがONにならない不具合を修正。

---

## 修正した問題

### 問題1: テンプレート編集→保存後にPropertyPanelの共通テンプレート参照ドロップダウンが「なし」になる

**再現手順:**
1. ノードを新規作成
2. PropertyPanelで共通テンプレートのチェックを入れる
3. テンプレート参照を選ばずにテンプレート編集ダイアログに遷移
4. ダイアログを保存
5. PropertyPanelに戻ると「共通テンプレート参照」ドロップダウンが「なし」になっている

**原因:**
`handleSaveTemplate`（新規作成パス）でノードに `isCommonTemplate: true` と `template` は設定されるが、**`commonTemplateRef`（自分自身のテンプレートIDへの参照）が設定されていなかった**。

PropertyPanelの「共通テンプレート参照」ドロップダウンは `selectedNode.data.commonTemplateRef` の値で選択状態を表示するため、この値がないとドロップダウンが「なし」になる。

**修正箇所:** `PetriNetEditorInner.tsx`

```typescript
// 修正前
return {
  ...node,
  data: {
    ...node.data,
    template: newTemplateForContext,
    templateRef: newTemplateForContext,
    isCommonTemplate: isCommonTemplate,
  },
};

// 修正後
return {
  ...node,
  data: {
    ...node.data,
    template: newTemplateForContext,
    templateRef: newTemplateForContext,
    isCommonTemplate: isCommonTemplate,
    // ✅ 共通テンプレートの場合、自分自身のテンプレートIDをcommonTemplateRefに設定
    commonTemplateRef: isCommonTemplate ? templateId : node.data.commonTemplateRef,
  },
};
```

---

### 問題2: PropertyPanelのドロップダウンでテンプレートを選択してもTemplateContext側にRefが設定されない

**再現手順:**
1. 既存の共通テンプレートが存在する状態で別ノードを作成
2. PropertyPanelの「共通テンプレート参照」ドロップダウンでテンプレートを選択
3. ノードの `commonTemplateRef` は更新されるが、選択したテンプレートの `placeRefs` にこのノードIDが追加されない
4. MAIML保存時に参照関係が失われる

**原因:**
PropertyPanelの onChange でノードデータ（`commonTemplateRef`）のみ更新しており、TemplateContext側の対象テンプレートの `placeRefs` にノードIDを追加していなかった。

**修正箇所:** `PropertyPanel.tsx`

```typescript
// 修正後: TemplateContextのplaceRefsも更新する
if (value) {
  // 1. ノードデータを更新
  onUpdate(selectedNode.id, { ...selectedNode.data, commonTemplateRef: value, isCommonTemplate: true });
  // 2. TemplateContextの対象テンプレートのplaceRefsにこのノードIDを追加
  if (window.clineAllTemplates && window.clineUpdateTemplate) {
    const targetTemplate = allTemplates[category]?.find((t) => t.id === value);
    if (targetTemplate && !targetTemplate.placeRefs?.some((pr) => pr.ref === selectedNode.id)) {
      window.clineUpdateTemplate(value, {
        ...targetTemplate,
        placeRefs: [...(targetTemplate.placeRefs || []), { id: '', ref: selectedNode.id }],
      });
    }
  }
} else {
  // 解除時: placeRefsからこのノードIDを削除
  const prevRef = selectedNode.data.commonTemplateRef;
  if (prevRef && window.clineAllTemplates && window.clineUpdateTemplate) {
    const targetTemplate = allTemplates[category]?.find((t) => t.id === prevRef);
    if (targetTemplate) {
      window.clineUpdateTemplate(prevRef, {
        ...targetTemplate,
        placeRefs: (targetTemplate.placeRefs || []).filter((pr) => pr.ref !== selectedNode.id),
      });
    }
  }
  onUpdate(selectedNode.id, { ...selectedNode.data, commonTemplateRef: undefined, isCommonTemplate: false });
}
```

---

## 変更ファイル

1. `frontend/src/components/editorv2/PetriNetEditorInner.tsx`
   - `handleSaveTemplate`（新規作成パス）で `isCommonTemplate=true` の場合に `commonTemplateRef: templateId` を設定

2. `frontend/src/components/editorv2/components/PropertyPanel.tsx`
   - `commonTemplateRef` ドロップダウンの onChange で `window.clineUpdateTemplate` を呼び出してTemplateContextの `placeRefs` を更新

## 承認記録
- **承認日時**: 2026-04-16 16:00
- **完了日時**: 2026-04-16 16:00

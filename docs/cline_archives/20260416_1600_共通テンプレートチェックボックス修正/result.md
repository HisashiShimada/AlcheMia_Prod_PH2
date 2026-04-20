# 対応結果: 共通テンプレートチェックボックス不具合修正

## 概要

- **対応日**: 2026-04-16
- **対象タスク**: 共通テンプレートチェックボックス不具合修正（PLAN_1〜PLAN_3）

テンプレート管理ビューで共通テンプレートを作成後、ノードに共通テンプレートをrefで紐づけた際に PropertyPanel の「共通テンプレート（全methodで共有）」チェックボックスがONにならない不具合を修正した。  
修正は3回のイテレーションを経て完了した。

---

## 対応内容

### PLAN_1: PropertyPanel チェックボックス連動修正

**問題:**  
PropertyPanel の「共通テンプレート参照」ドロップダウンで共通テンプレートを選択した際、ノードデータの `commonTemplateRef` のみが更新され、`isCommonTemplate` が更新されなかったため、チェックボックスがOFFのままになっていた。

**修正箇所:** `frontend/src/components/editorv2/components/PropertyPanel.tsx`

**修正内容:**  
共通テンプレート参照ドロップダウンの onChange ハンドラーを修正し、`commonTemplateRef` の更新と同時に `isCommonTemplate` も連動して更新するようにした。

```typescript
// 修正前
onChange={(value) => handleChange('commonTemplateRef', value || null)}

// 修正後
onChange={(value) => {
  if (selectedNode) {
    onUpdate(selectedNode.id, {
      ...selectedNode.data,
      commonTemplateRef: value || null,
      isCommonTemplate: !!value,  // ← 追加: refが設定されたらtrue、解除されたらfalse
    });
  }
}}
```

---

### PLAN_2: 共通テンプレート参照ドロップダウンの設計修正

**問題:**  
共通テンプレート参照ドロップダウンの選択肢が `TemplateContext.commonTemplates` ではなく各 Method のノードから収集されており、「材料A (from Method1)」のように Method 名付きで表示されていた。これは「共通テンプレートは全 Method 共通」という設計思想と矛盾していた。

**修正箇所:** `frontend/src/components/editorv2/components/PropertyPanel.tsx`（3箇所）

**修正内容:**

1. `useTemplates()` から `commonTemplates` を追加取得
2. `availableCommonTemplates` の実装を `methods` ループから `commonTemplates[placeType]` に変更
3. ドロップダウン表示ラベルを `"テンプレート名 (from Method名)"` → `"テンプレート名"` に変更

```typescript
// 修正後: TemplateContextのcommonTemplatesから取得
const availableCommonTemplates = useMemo(() => {
  if (!selectedNode || !isPlace || !commonTemplates) return [];
  const categoryTemplates = commonTemplates[placeType] || [];
  return categoryTemplates
    .filter(template => template.id !== selectedNode.id)
    .map(template => ({
      id: template.id,
      name: template.name || template.id,
    }));
}, [commonTemplates, isPlace, placeType, selectedNode]);
```

---

### PLAN_3: 残存する2つの問題を修正

#### 問題1: テンプレート保存後に共通テンプレート参照ドロップダウンが「なし」になる

**原因:**  
`handleSaveTemplate`（新規作成パス）でノードに `isCommonTemplate: true` と `template` は設定されるが、`commonTemplateRef`（自分自身のテンプレートIDへの参照）が設定されていなかった。

**修正箇所:** `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

```typescript
// 修正後: 共通テンプレートの場合、自分自身のIDをcommonTemplateRefに設定
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
```

#### 問題2: ドロップダウンでテンプレートを選択しても TemplateContext 側に Ref が設定されない

**原因:**  
PropertyPanel の onChange でノードデータ（`commonTemplateRef`）のみ更新しており、TemplateContext 側の対象テンプレートの `placeRefs` にノードIDが追加されなかった。そのため MAIML 保存時に参照関係が失われていた。

**修正箇所:** `frontend/src/components/editorv2/components/PropertyPanel.tsx`

```typescript
// 修正後: ノードデータ更新と同時にTemplateContextのplaceRefsも更新
if (value) {
  onUpdate(selectedNode.id, { ...selectedNode.data, commonTemplateRef: value, isCommonTemplate: true });
  // 対象テンプレートのplaceRefsにこのノードIDを追加
  const targetTemplate = allTemplates[category]?.find((t) => t.id === value);
  if (targetTemplate && !targetTemplate.placeRefs?.some((pr) => pr.ref === selectedNode.id)) {
    updateTemplate(value, {
      ...targetTemplate,
      placeRefs: [...(targetTemplate.placeRefs || []), { id: '', ref: selectedNode.id }],
    });
  }
} else {
  // 解除時: placeRefsからこのノードIDを削除
  const prevRef = selectedNode.data.commonTemplateRef;
  if (prevRef) {
    const targetTemplate = allTemplates[category]?.find((t) => t.id === prevRef);
    if (targetTemplate) {
      updateTemplate(prevRef, {
        ...targetTemplate,
        placeRefs: (targetTemplate.placeRefs || []).filter((pr) => pr.ref !== selectedNode.id),
      });
    }
  }
  onUpdate(selectedNode.id, { ...selectedNode.data, commonTemplateRef: undefined, isCommonTemplate: false });
}
```

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/editorv2/components/PropertyPanel.tsx` | ①チェックボックス連動修正、②共通テンプレート選択肢をTemplateContextから取得に変更、③ドロップダウン選択時にTemplateContextのplaceRefsを更新 |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | ④handleSaveTemplate新規作成パスでcommonTemplateRefを設定 |

---

## 修正後の動作フロー

```
【テンプレート管理ビューから作成するルート】
1. テンプレート管理ビューで「共通テンプレート」チェックをON → テンプレート保存
2. handleSaveTemplate でノードに isCommonTemplate=true, commonTemplateRef=templateId が設定される ✅
3. PropertyPanel に戻ると チェックボックスON・ドロップダウンに自分自身が表示される ✅

【PropertyPanelのドロップダウンから選択するルート】
1. 別のノードを選択し「共通テンプレート参照」ドロップダウンを開く
2. TemplateContext.commonTemplates から Method 非依存でテンプレート名が表示される ✅
3. テンプレートを選択 → ノードの commonTemplateRef 更新 + isCommonTemplate=true + TemplateContextのplaceRefs更新 ✅
4. チェックボックスがONになる ✅
5. 「なし」を選択して解除 → commonTemplateRef=undefined + isCommonTemplate=false + placeRefsから削除 ✅
6. チェックボックスがOFFになる ✅
```

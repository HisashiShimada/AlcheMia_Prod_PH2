# 調査レポート（reference版）: PlaceノードとTransitionノードのテンプレート情報設定箇所

- **作成日時**: 2026-03-27 08:36
- **対象**: `frontend/src/reference/` 配下のソースコード
- **目的**: reference版でのplaceノード・transitionノードへのテンプレート情報設定ロジックを調査し、現行版との差異を明らかにする

---

## 1. reference版のテンプレート情報の全体的な流れ

```
MAIMLデータ（XML文字列）
  ↓ MaiMLParser.getTemplatesForPetriNetViewer()  ← テンプレート取得
  ↓ buildTemplateMap()（petriNetExtractor.js）   ← placeId → Template詳細マップ構築
  ↓ extractPetriNetStructure()                   ← Place/Transitionノード構築
  ↓ convertToReactFlowFormat()                   ← ReactFlow形式に変換
  ↓ convertPlaceNodeForEditor() / convertTransitionNodeForEditor()（maimlToReactFlow.js）
ReactFlowノードの data.template / data.templateRef / data.properties にセット
```

---

## 2. 各ファイルの役割と設定箇所

### ① `reference/components/PetriNetViewer/utils/petriNetExtractor.js` — `buildTemplateMap()`

**役割**: placeIdをキーとする詳細テンプレートマップを構築

参照関数: `MaiMLParser.getTemplatesForPetriNetViewer()`

#### Placeノードのテンプレート情報構築

```javascript
// materials / conditions / results それぞれについて同じ処理を実施
templates.materials.forEach(t => {
  // ① DOM要素を直接取得
  const element = xmlDoc.querySelector(`materialTemplate[id="${t.id}"]`);
  
  // ② uuid要素を取得
  const uuidElement = element.querySelector('uuid');
  const uuid = uuidElement?.textContent.trim();
  
  // ③ placeRef要素を全取得（配列）
  const placeRefElements = element.querySelectorAll('placeRef');
  placeRefElements.forEach(placeRefEl => {
    const refAttr = placeRefEl.getAttribute('ref') 
                 || placeRefEl.getAttribute('idref')
                 || placeRefEl.getAttributeNS(null, 'ref');
    const idAttr  = placeRefEl.getAttribute('id');
    const placeRefUuidEl = placeRefEl.querySelector('uuid');
    
    placeRefs.push({ id: idAttr, ref: refAttr, uuid: placeRefUuidEl?.textContent });
    if (placeRefs.length === 1 && refAttr) placeId = refAttr; // 最初のrefをplaceIdとして使用
  });
  
  // ④ templateRef要素を全取得
  const templateRefElements = element.querySelectorAll('templateRef');
  templateRefElements.forEach(el => templateRefs.push({ id: el.getAttribute('id'), href: el.getAttribute('href') }));
  
  // ⑤ insertion要素をproperties配列から分離（extractInsertionFromProperties）
  const { insertion, properties } = extractInsertionFromProperties(t.properties, t.id);
  
  // ⑥ NestedPropertyEditor形式にも変換
  const nestedProperties = convertPropertiesArrayToNestedFormat(properties);
  
  // ⑦ テンプレートマップに登録（キー: placeId）
  templateMap[placeId] = {
    id: t.id,                      // テンプレートID（placeIdと異なる場合あり）
    name: t.name,
    description: t.description,
    annotation: t.annotation,
    properties: properties,         // 配列形式（reactFlowToMaiml.js用）
    propertiesNested: nestedProperties, // NestedPropertyEditor形式
    insertion: insertion,           // 分離されたinsertion要素
    templateId: t.id,               // 元のTemplate IDも保存
    type: 'material',               // 'material' | 'condition' | 'result'
    stereotype: 'MaterialTemplate',
    element: element,               // DOM Element（XML生成用）
    uuid: uuid,
    placeRefs: placeRefsSimple,     // 文字列配列（PropertyPanel.jsx互換）
    placeRefsDetailed: placeRefs,   // 詳細オブジェクト配列
    templateRefs: templateRefs,
  };
});
```

**重要ポイント**:
- `templateMap` のキーは **placeId**（`placeRef.ref` 属性値）
- `placeRef.ref` が空の場合は `templateId` をフォールバックとして使用
- 複数の `placeRef` を持つテンプレートの場合、**最初のplaceRefのrefのみ**がキーになる
- `placeRefs`（文字列配列）と `placeRefsDetailed`（オブジェクト配列）の2種類を保持

#### Transitionノードの構築（`extractPetriNetStructure`内）

```javascript
// Transitionノードのdata（テンプレート情報は一切含まれない）
const transitionNodes = transitions.map(t => ({
  id: t.id,
  type: 'transition',
  data: {
    label: t.name || t.id,
    transition: t,            // Transitionオブジェクト全体
    description: t.description || '',
    hasInstruction: t.hasInstruction || false
  }
}));
```

**Transitionノードにはテンプレート情報は含まれない**（reference版も同様）。

---

### ② `reference/components/PetriNetEditorV2/utils/converters/maimlToReactFlow.js`

**役割**: EditorV2用ノード変換（PlaceとTransitionを別々に処理）

#### `convertPlaceNodeForEditor()` — Placeノードへのテンプレート情報セット

```javascript
const convertPlaceNodeForEditor = (node, templateMap) => {
  const editorNodeType = mapNodeTypeToEditorType(node.type);
  const placeType = determinePlaceType(node, templateMap);
  
  // テンプレート取得: node.data.template を優先、なければ templateMap[node.id]
  const template = node.data.template || templateMap[node.id] || null;
  
  return {
    ...node,
    type: editorNodeType,
    data: {
      ...node.data,
      placeType: placeType,               // 'material' | 'condition' | 'result'
      name: node.data.label || '',
      description: node.data.description || '',
      template: template,                 // Template型全体
      templateRef: template,              // ← templateと同一オブジェクト（コピーではなく参照）
      properties: template?.properties || node.data.properties || []
    }
  };
};
```

#### `convertTransitionNodeForEditor()` — Transitionノードへの変換

```javascript
const convertTransitionNodeForEditor = (node) => {
  return {
    ...node,
    type: 'transition',
    data: {
      ...node.data,
      name: node.data.label || '',
      description: node.data.description || '',
      hasInstruction: node.data.hasInstruction || false
      // ※ テンプレート情報（inputTemplates / outputTemplates）は含まれない
    }
  };
};
```

---

### ③ `reference/components/PetriNetEditorV2/components/PropertyPanel.jsx`

**役割**: Placeノード選択時のテンプレート編集UI

#### テンプレートの逆引き検索ロジック（テンプレート編集ボタン押下時）

```javascript
// TemplateContextから最新テンプレートを逆引き（placeRefs経由）
if (allTemplates && allTemplates[placeType]) {
  // このノードIDをplaceRefsに含むテンプレートを検索
  latestTemplate = allTemplates[placeType].find(t =>
    t.placeRefs && t.placeRefs.includes(nodeId)
  );
}

if (latestTemplate) {
  // 既存テンプレートの場合: template と templateRef の両方を最新データで更新
  updatedNode.data.template = {
    ...latestTemplate,
    id: latestTemplate.id,
    type: 'MaterialTemplate' | 'ConditionTemplate' | 'ResultTemplate',
  };
  updatedNode.data.templateRef = { ...latestTemplate, type: ... };
  
} else {
  // 新規テンプレートの場合: templateIdはノードIDとは異なるIDを生成
  const templateId = `${placeType}Template_${Date.now()}`;
  updatedNode.data.template = {
    id: templateId,          // ノードIDとは異なるID
    type: 'MaterialTemplate',
    uuid: generateUUID(),
    name: selectedNode.data.name || '',
    description: selectedNode.data.description || '',
    placeRefs: [nodeId],     // ← 自ノードIDをplaceRefsに設定
    templateRefs: [],
    properties: selectedNode.data.template?.properties || [],
  };
  updatedNode.data.templateRef = { ...updatedNode.data.template };
  
  // methodId: 共通テンプレートでない場合のみ現在のmethodのIDを設定
  if (!isCommon && methods && methods[activeMethodIndex]) {
    updatedNode.data.methodId = methods[activeMethodIndex].methodId;
  } else {
    updatedNode.data.methodId = null; // 共通テンプレート
  }
}
```

#### テンプレート情報の表示（PropertyPanel内）

```javascript
// プロパティ数の表示（templateRef を参照）
プロパティ数: {selectedNode.data.templateRef?.properties?.length || 0}件
```

**⚠️ 注意**: `templateRef?.properties` を参照しているが、現行版と同様に `template.properties` が別オブジェクトの場合は0件表示になる可能性がある。ただしreference版の `convertPlaceNodeForEditor` では `template` と `templateRef` を**同一オブジェクト**（参照コピー）としているため、実質的には同じ内容が参照される。

---

### ④ `reference/contexts/TemplateContext.js`

**役割**: グローバルテンプレート状態管理

reference版のTemplateContextは現行版とほぼ同一のロジック。

| 項目 | reference版 | 現行版（TypeScript） |
|------|------------|------------------|
| テンプレート抽出 | `extractTemplatesFromMaiML()` (templateService.js) | `MaimlParserTyped.getTemplates()` |
| フィルタリング | `methodId === currentMethodId` | 同一 |
| 共通テンプレート | `methodId === null / undefined` | `!t.methodId` |
| 提供する値 | `templates`, `allTemplates`, `commonTemplates` | 同一 |

---

### ⑤ `reference/components/PetriNetEditorV2/utils/templateExtractor.js` — `extractTemplatesFromMaiML()`

**役割**: MAIMLデータからテンプレート情報を抽出（reference版のTemplateContext用）

```javascript
// placeRef要素から ref 属性を取得（配列）
const placeRefs = Array.from(templateEl.querySelectorAll('placeRef')).map(refEl => {
  return refEl.getAttribute('ref') 
      || refEl.getAttribute('idref') 
      || refEl.getAttribute('href')?.replace('#', '') 
      || '';
}).filter(ref => ref);

// 抽出結果のテンプレートオブジェクト
return {
  id,
  name,
  description,
  type,          // 'material' | 'condition' | 'result'
  properties,    // 再帰的に抽出（extractPropertyRecursive）
  placeRefs,     // 文字列配列
};
```

**注意**: `templateExtractor.js` は `buildTemplateMap` とは別に呼ばれ、`TemplateContext` 用のシンプルなテンプレート情報を提供する。`buildTemplateMap` 側の詳細情報（`uuid`, `element`, `propertiesNested`, `placeRefsDetailed` など）は含まない。

---

## 3. Transitionへの入力テンプレート表示について

### reference版 `WorkerDashboard/PetriNetVisualization.js` での扱い

`generateSubnetData()` 関数（`petriNetExtractor.js`）がTransitionと接続されたPlaceのテンプレートを表示する用途で利用されている。

```javascript
// Transitionに接続されたアークをフィルタリング
const transitionArcs = allArcs.filter(arc =>
  arc.source === transitionId || arc.target === transitionId
);

// DOT形式でサブネット表示
filteredArcs.forEach(arc => {
  if (source !== transitionId) {
    // incoming arc（入力Place）
    const template = templateMap[source]; // source=placeId でtemplate取得
    dotContent += `  "${source}" [label="${template.name || source}"];\n`;
    dotContent += `  "${source}" -> "${transitionId}";\n`;
  }
  if (target !== transitionId) {
    // outgoing arc（出力Place）
    const template = templateMap[target]; // target=placeId でtemplate取得
    dotContent += `  "${target}" [label="${template.name || target}"];\n`;
    dotContent += `  "${transitionId}" -> "${target}";\n`;
  }
});
```

**ポイント**: reference版では、TransitionノードにPlaceのテンプレート情報を直接持たせるのではなく、**アーク（edge）を辿って入出力Placeを特定し、そのPlaceのtemplateMapから情報を取得する**方式を採用している。

---

## 4. reference版と現行版の差異まとめ

| 比較項目 | reference版 | 現行版（TypeScript移植） | 差異・影響 |
|---------|------------|----------------------|-----------|
| テンプレート抽出関数 | `extractTemplatesFromMaiML()` (DOM直接操作) | `MaimlParserTyped.getTemplates()` | 抽出ロジックが異なる |
| `buildTemplateMap` のキー | `placeRef.ref`（最初の1件）のみ | `placeRef.ref` または `placeRef.id`（フォールバック） | フォールバック処理は現行版も同様 |
| `templateMap` に格納されるデータ | `uuid`, `element`, `propertiesNested`, `placeRefsDetailed`, `templateRefs` など豊富 | `id`, `name`, `category`, `properties`, `placeRefs` のみ | 現行版はシンプルな構造 |
| `convertPlaceNodeForEditor` での `templateRef` | `template` と**同一オブジェクト参照** | `template` と**別のスプレッドコピー**（`{ ...template }`） | 現行版でtemplate更新時にtemplateRefが古いまま残る可能性 |
| `convertTransitionNodeForEditor` | テンプレート情報なし | テンプレート情報なし（同じ） | 変わらず |
| PropertyPanel の `allTemplates[placeType].find()` | `t.placeRefs.includes(nodeId)` | 同一 | 変わらず |
| 入力/出力テンプレート表示 | `generateSubnetData()` でアークを辿る | `PetriNetViewer.tsx` の `onOpenSubNetViewer` コールバック | 方式は異なるが考え方は同じ |
| Transitionノードへの入力テンプレート直接付与 | **なし**（アーク経由で取得） | **なし**（同じ） | **変わらず** |

---

## 5. 結論

### reference版も同じ構造的問題を持つ

reference版・現行版ともに、**Transitionノードのdata自体にはPlaceのテンプレート情報（入力テンプレート・出力テンプレート）が含まれていない**。Transitionに対する入力テンプレートを表示するには、必ずエッジ（arcs）を辿ってPlaceを特定し、そのPlaceのtemplate情報を参照する必要がある。

### 現行版で新たに発生している問題

| 問題 | reference版 | 現行版 |
|------|------------|-------|
| `templateRef` の参照 | `template` と同一オブジェクト（安全） | スプレッドコピー（別オブジェクト）のため、更新が同期されない可能性あり |
| PropertyPanelのプロパティ数表示 | `templateRef?.properties?.length`（reference版も同じ参照） | `templateRef?.properties?.length`（コピーのため0になるリスク） |
| テンプレート抽出の差異 | `extractTemplatesFromMaiML()` はDOM直接操作 | `MaimlParserTyped.getTemplates()` はパーサー経由 → 抽出結果が一致しない可能性 |

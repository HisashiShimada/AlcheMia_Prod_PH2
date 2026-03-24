# ノード表示切替ドロップダウン 調査レポート

**調査日時**: 2026-03-19  
**調査対象**: referenceのMAIMLエディタ画面ツールバーにあるノード表示属性切替ドロップダウン

---

## 1. 概要

MAIMLエディタ（`frontend/src/reference/components/PetriNetEditorV2`）のツールバーには、ペトリネット上の各ノードに表示する属性を切り替えるドロップダウンが実装されている。  
このドロップダウンはペトリネットモード（`viewMode === 'petriNet'`）のときのみ表示される。

---

## 2. 関連ファイル一覧

| ファイル | 役割 |
|---------|------|
| `frontend/src/reference/components/PetriNetEditorV2/components/EditorToolbar.jsx` | ドロップダウンUIの実装（ツールバー） |
| `frontend/src/reference/contexts/AttributeDisplayContext.jsx` | 選択状態の管理（Context / localStorage永続化） |
| `frontend/src/reference/components/PetriNetViewer/nodes/MaterialTemplateNode.js` | Material Placeノードの表示 |
| `frontend/src/reference/components/PetriNetViewer/nodes/ConditionTemplateNode.js` | Condition Placeノードの表示（五角形） |
| `frontend/src/reference/components/PetriNetViewer/nodes/ResultTemplateNode.js` | Result Placeノードの表示（矩形） |
| `frontend/src/reference/components/PetriNetViewer/nodes/TransitionNode.js` | Transitionノードの表示 |
| `frontend/src/reference/components/PetriNetViewer/utils/reactFlowConverter.js` | ノードの `data` オブジェクトへのデータマッピング |
| `frontend/src/reference/components/PetriNetViewer/utils/petriNetExtractor.js` | MAIMLのXMLパース・templateMap構築 |

---

## 3. ドロップダウンの選択肢と定数定義

`AttributeDisplayContext.jsx` で定義されている `ATTRIBUTE_OPTIONS` が全選択肢の定数。

```js
// frontend/src/reference/contexts/AttributeDisplayContext.jsx
export const ATTRIBUTE_OPTIONS = {
  NODE_ID:                'nodeId',
  TEMPLATE_ID:            'templateId',
  NODE_DESCRIPTION:       'nodeDescription',
  NODE_NAME:              'nodeName',
  TEMPLATE_DESCRIPTION:   'templateDescription',
  TEMPLATE_NAME:          'templateName',
  // Transitionノード専用
  INSTRUCTION_ID:         'instructionId',
  INSTRUCTION_DESCRIPTION:'instructionDescription',
  INSTRUCTION_NAME:       'instructionName',
};
```

**デフォルト値**: `NODE_NAME`（ノード名）  
**永続化**: `localStorage` のキー `maiml_attribute_display_settings` に保存される。

---

## 4. ドロップダウンのUI実装

`EditorToolbar.jsx` のペトリネットモード時のみ表示されるセクション：

```jsx
{viewMode === 'petriNet' && (
  <>
    <Typography variant="caption">表示属性:</Typography>
    <FormControl size="small" sx={{ minWidth: 150 }}>
      <Select
        value={selectedAttribute}
        onChange={(event) => setSelectedAttribute(event.target.value)}
      >
        <MenuItem value={ATTRIBUTE_OPTIONS.NODE_ID}>ノードID</MenuItem>
        <MenuItem value={ATTRIBUTE_OPTIONS.TEMPLATE_ID}>テンプレートID</MenuItem>
        <MenuItem value={ATTRIBUTE_OPTIONS.NODE_DESCRIPTION}>ノードDesc</MenuItem>
        <MenuItem value={ATTRIBUTE_OPTIONS.NODE_NAME}>ノード名</MenuItem>
        <MenuItem value={ATTRIBUTE_OPTIONS.TEMPLATE_DESCRIPTION}>テンプレートDesc</MenuItem>
        <MenuItem value={ATTRIBUTE_OPTIONS.TEMPLATE_NAME}>テンプレート名</MenuItem>
      </Select>
    </FormControl>
  </>
)}
```

> **注意**: `INSTRUCTION_*` 系の3つ（インストラクションID・Desc・名前）はコンテキスト定数として定義されているが、ドロップダウンのMenuItemには含まれていない（選択不可）。

---

## 5. 各選択肢で何が表示されるか

### 5.1 Placeノード（Material / Condition / Result 共通）

Placeノードは `data` オブジェクトの以下のフィールドを参照する。

| ドロップダウン選択肢 | 参照フィールド | 説明 |
|-------------------|--------------|----|
| **ノードID**（nodeId） | `data.id` | MAIMLの `place` 要素の `@id` 属性値 |
| **テンプレートID**（templateId） | `data.templateId` | MAIMLの `materialTemplate` / `conditionTemplate` / `resultTemplate` 要素の `@id` 属性値 |
| **ノードDesc**（nodeDescription） | `data.description` | `place` 要素内の `<description>` の値 |
| **ノード名**（nodeName） | `data.name` | `place` 要素内の `<name>` の値 |
| **テンプレートDesc**（templateDescription） | `data.templateDescription` | テンプレート要素内の `<description>` の値 |
| **テンプレート名**（templateName） | `data.templateName` | テンプレート要素内の `<name>` の値 |

**テンプレート関連属性（templateId / templateDesc / templateName）を選択した場合**、ノードラベルの前に以下のバッジが付く：

| 条件 | バッジ | 意味 |
|------|--------|------|
| `data.isCommonTemplate === true` | 🌐 | 共通テンプレート（複数methodから共有） |
| `data.templateId` が存在する | 📄 | メソッド内テンプレート |
| どちらでもない | （なし） | テンプレートなし |

### 5.2 Transitionノード

Transitionノードは選択肢によって「テンプレート系→インストラクション系」にマッピングされる特殊処理がある。

| ドロップダウン選択肢 | 参照フィールド | 備考 |
|-------------------|--------------|----|
| **ノードID** | `data.id` | Transition要素の `@id` 属性値 |
| **テンプレートID** | `data.instructionId` | テンプレートID選択時はインストラクションIDにマッピング |
| **ノードDesc** | `data.description` | Transition要素の `<description>` の値 |
| **ノード名** | `data.name` | Transition要素の `<name>` の値 |
| **テンプレートDesc** | `data.instructionDescription` | テンプレートDesc選択時はインストラクションDescにマッピング |
| **テンプレート名** | `data.instructionName` | テンプレート名選択時はインストラクション名にマッピング |

---

## 6. データの生成元（MAIMLからのマッピング）

### 6.1 Placeノードのdataフィールド（`reactFlowConverter.js`）

`reactFlowConverter.js` の `convertToReactFlowFormat` 関数でノードの `data` が組み立てられる。

```js
const nodeData = {
  id:              place.id,              // place @id
  name:            place.data.name || template?.name || '',
  description:     place.data.description || template?.description || '',
  templateId:      template?.templateId || template?.id || null,
  templateName:    ※未設定（後述）
  templateDescription: ※未設定（後述）
  isCommonTemplate: ※PetriNetEditorInnerで別途設定
  ...
};
```

### 6.2 templateName / templateDescription の問題

**`reactFlowConverter.js` では `templateName` と `templateDescription` が `data` に設定されていない。**

Placeノードコンポーネントは `data.templateName` / `data.templateDescription` を参照しているが、`reactFlowConverter.js` の `nodeData` 組み立てでこれらのフィールドは明示的にセットされていない。

`templateMap` から取得した `template` オブジェクトの `name` / `description` は `data.name` / `data.description` に格納されているが、`data.templateName` や `data.templateDescription` には格納されていないため、この選択肢を選ぶと **空文字が表示される**。

### 6.3 templateId の設定状況

`reactFlowConverter.js` では下記の優先順でセット：
```js
templateId: template?.templateId || template?.id || null
```

`petriNetExtractor.js` の `buildTemplateMap` で各テンプレートに対して `templateId: t.id` が設定されており、これが `reactFlowConverter` 経由で `data.templateId` になる。

### 6.4 Transitionノードのinstructionフィールド

`reactFlowConverter.js` のTransition nodeData組み立てを確認すると：

```js
data: {
  id:          transition.id,
  name:        transition.data.name || transition.data.description || transition.id,
  description: transition.data.description || '',
  hasInstruction: transition.data.hasInstruction || false,
  ...transition.data  // 元の data をスプレッド
}
```

`instructionId` / `instructionName` / `instructionDescription` は `...transition.data` のスプレッドに依存しており、これらが `petriNetExtractor.js` でどう設定されるかに依存する。  
`petriNetExtractor.js` では `instructionId` / `instructionName` / `instructionDescription` の明示的な設定は確認できず、これらも **空文字が表示される可能性が高い**。

---

## 7. 現在の実装版（editorv2）との差異

`frontend/src/components/editorv2/components/EditorToolbar.tsx`（現行実装）では、**ドロップダウン自体が存在しない**。  
`AttributeDisplayContext` も editorv2 ではインポートされていない。

つまり、ドロップダウンは **reference（旧実装）のみ** に存在し、現行の editorv2 には未移植の状態である。

---

## 8. まとめ（課題として見えた点）

| # | 項目 | 状況 |
|---|------|------|
| 1 | ドロップダウンの存在 | referenceのみ実装済み、editorv2には未移植 |
| 2 | ノードID表示 | ✅ 正常に表示される（`data.id`） |
| 3 | テンプレートID表示 | ✅ 表示される（`data.templateId`）。ただしバッジ付き |
| 4 | ノードDesc表示 | ✅ 表示される（`data.description`）。空の場合は空文字 |
| 5 | ノード名表示 | ✅ 表示される（`data.name`）。デフォルト選択肢 |
| 6 | テンプレートDesc表示 | ⚠️ `data.templateDescription` は `reactFlowConverter` で未設定のため **常に空** |
| 7 | テンプレート名表示 | ⚠️ `data.templateName` は `reactFlowConverter` で未設定のため **常に空** |
| 8 | Transitionのインストラクション系表示 | ⚠️ `instructionId` 等は `petriNetExtractor` での設定が確認できず **空の可能性大** |
| 9 | INSTRUCTION_* 系の選択肢 | ℹ️ 定数定義はあるがドロップダウンのMenuItemに含まれていない |

---

## 9. 各選択肢の表示まとめ表

| ドロップダウン選択肢 | Placeノード表示内容 | Transitionノード表示内容 |
|-------------------|--------------------|------------------------|
| ノードID | placeのid属性 | transitionのid属性 |
| テンプレートID | テンプレートのid属性（+バッジ🌐/📄） | instructionId（取得できれば） |
| ノードDesc | placeの`<description>`要素テキスト | transitionの`<description>`要素テキスト |
| ノード名（デフォルト） | placeの`<name>`要素テキスト | transitionの`<name>`要素テキスト |
| テンプレートDesc | ⚠️ 常に空（`data.templateDescription`未設定） | instructionDescriptionフィールド（取得できれば） |
| テンプレート名 | ⚠️ 常に空（`data.templateName`未設定） | instructionNameフィールド（取得できれば） |

---

## 10. 現行 editorv2 への移植可能性調査

### 10.1 現行 editorv2 のノードコンポーネント構造

現行 editorv2（`frontend/src/components/editorv2/components/nodes/`）のノードコンポーネントは、
表示内容として **`data.label`** のみを使用している（Ant Design 版）。

| ファイル | 表示フィールド | 補助表示 |
|---------|--------------|---------|
| `MaterialPlaceNode.tsx` | `data.label`（fallback: `'Material'`） | `data.templateRef`（テキスト表示） |
| `ConditionPlaceNode.tsx` | `data.label`（fallback: `'Condition'`） | `data.templateRef`（テキスト表示） |
| `ResultPlaceNode.tsx` | `data.label`（fallback: `'Result'`） | `data.templateRef`（テキスト表示） |
| `TransitionNode.tsx` | `data.label`（fallback: `'Transition'`） | `data.stereotype`（«stereotype» 表示） |

現在は `data.label` が固定のメインラベルであり、ドロップダウンによる切り替え機構は実装されていない。

### 10.2 現行 editorv2 の data フィールドで利用可能な情報

`maimlToReactFlow.ts` の `convertPlaceNodeForEditor` / `convertTransitionNodeForEditor` で設定されるフィールド：

**Placeノード：**
```ts
data: {
  ...node.data,           // reactFlowConverter由来（name, description, templateId, id 等）
  placeType: 'material' | 'condition' | 'result',
  name: node.data.name || '',
  description: node.data.description || '',
  template: maimlTemplate,        // templateMapから取得したTemplate型オブジェクト全体
  properties: maimlTemplate?.properties || []
}
```

**Transitionノード：**
```ts
data: {
  ...node.data,           // reactFlowConverter由来（name, description, id 等）
  name: node.data.name || '',
  description: node.data.description || '',
  instructionId: node.data.instructionId || ''
}
```

### 10.3 現行 editorv2 のノードでドロップダウン各選択肢に対応可能なフィールド

reference で定義された各選択肢に対して、現行 editorv2 の `data` オブジェクトで対応できるフィールドは以下のとおり。

| 選択肢 | referenceの参照フィールド | editorv2 での対応フィールド | 取得可否 |
|-------|------------------------|--------------------------|---------|
| ノードID | `data.id` | `data.id`（nodeData経由） | ✅ 取得可能 |
| ノード名 | `data.name` | `data.name` | ✅ 取得可能 |
| ノードDesc | `data.description` | `data.description` | ✅ 取得可能 |
| テンプレートID | `data.templateId` | `data.templateId`（reactFlowConverter由来のスプレッドに含まれる） | ✅ 取得可能 |
| テンプレート名 | `data.templateName` | `data.template?.name` | ✅ **取得可能**（`template`オブジェクト全体を保持しているため） |
| テンプレートDesc | `data.templateDescription` | `data.template?.description` | ✅ **取得可能**（同上） |
| Transition: instructionId | `data.instructionId` | `data.instructionId` | ⚠️ petriNetExtractorで設定される場合のみ |

### 10.4 移植時の実装方針

現行 editorv2 に移植する場合、reference と比べて以下の優位点と注意点がある。

**優位点：**
- `data.template`（Template型オブジェクト全体）が保持されているため、reference で未設定だった `templateName` / `templateDescription` も **`data.template.name` / `data.template.description` から取得可能**

**実装に必要な変更点：**
1. `AttributeDisplayContext`（または同等のContext/State）の追加
2. 各ノードコンポーネントで `data.label`（固定）を選択属性に応じた動的ラベルに変更：
   ```tsx
   // 変更前
   const label = data.label || 'Material';
   
   // 変更後（例）
   const label = (() => {
     switch (selectedAttribute) {
       case 'nodeId':          return data.id || '';
       case 'nodeName':        return data.name || '';
       case 'nodeDescription': return data.description || '';
       case 'templateId':      return data.templateId || '';
       case 'templateName':    return data.template?.name || '';
       case 'templateDescription': return data.template?.description || '';
       default:                return data.name || data.id || '';
     }
   })();
   ```
3. `EditorToolbar.tsx` にドロップダウンUIを追加（ペトリネットモード時のみ表示）

**注意点：**
- editorv2 の ノードコンポーネントは現在 Ant Design スタイル（ラベルをノード内部に表示）で、reference のスタイル（ラベルをノード外下部に表示）と異なる
- Transitionの `instructionId` / `instructionName` / `instructionDescription` は `petriNetExtractor.js` での設定状況に依存するため、別途確認が必要

# 調査レポート：MAIML編集画面 ノード座標情報の保持処理

## メタデータ
- **作成日時**: 2026-03-18 16:00
- **調査対象**: `frontend/src/reference` のノード座標保持処理
- **目的**: リファレンスソースから現行のMAIML編集画面への座標情報保持処理の取り込み可否を調査

---

## 1. 調査概要

`frontend/src/reference/components/PetriNetEditorV2/`（参照用旧実装）と  
現行の `frontend/src/components/editorv2/` における  
Petri Netノードの座標情報の保持・書き出し処理の差分を調査した。

---

## 2. ファイル対応関係

| リファレンス | 現行 |
|---|---|
| `reference/components/PetriNetEditorV2/PetriNetEditorInner.jsx` | `components/editorv2/PetriNetEditorInner.tsx` |
| `reference/components/PetriNetEditorV2/utils/converters/reactFlowToMaiml.js` | `components/editorv2/utils/converters/reactFlowToMaiml.ts` |
| `reference/components/PetriNetEditorV2/utils/converters/maimlToReactFlow.js` | `utils/reactFlowConverter.ts`（共通） |

---

## 3. 重要な発見：リファレンスには position 書き出し関数が存在するが未使用

リファレンス版 `reactFlowToMaiml.js` には `buildPlaceXML` / `buildTransitionXML` という関数が定義されており、**`<position x="..." y="..." />` を MAIML に書き出すコードが含まれている**。

```javascript
// リファレンス: buildPlaceXML（抜粋）
function buildPlaceXML(node) {
  const { id, data, position } = node;
  let placeXml = `    <place id="${escapeXml(id)}" placeType="${escapeXml(placeType)}">
      <name>${escapeXml(data.name || 'Unnamed Place')}</name>
      <description>${escapeXml(data.description || '')}</description>
      <position x="${Math.round(position.x)}" y="${Math.round(position.y)}" />`;
  ...
}

// リファレンス: buildTransitionXML（抜粋）
function buildTransitionXML(node) {
  const { id, data, position } = node;
  return `    <transition id="${escapeXml(id)}">
      <position x="${Math.round(position.x)}" y="${Math.round(position.y)}" />
    </transition>`;
}
```

### ⚠️ しかしこの関数は `convertReactFlowToMaiML` 本体で使われていない（デッドコード）

リファレンス版の `convertReactFlowToMaiML` 本体では、  
place/transition の XML 生成は `buildPlaceXML`/`buildTransitionXML` を呼ばず、  
インラインで独自の文字列を生成しており、`<position>` 要素は出力されていない。

```javascript
// リファレンス: convertReactFlowToMaiML 本体（実際に使われているコード）
// Place要素群
places.forEach(place => {
  maiml += `        <place id="${escapeXml(place.id)}">\n`;
  if (hasValidName) {
    maiml += `          <name>...</name>\n`;
  }
  // ← ここに <position> の出力はない
  maiml += `        </place>\n`;
});
```

---

## 4. 現行版 `reactFlowToMaiml.ts` との差分

| 観点 | リファレンス (.js) | 現行 (.ts) | 差分 |
|------|-------------------|-----------|------|
| `buildPlaceXML` 関数の定義 | あり（positionを含む） | **なし** | リファレンスにのみ存在 |
| `buildTransitionXML` 関数の定義 | あり（positionを含む） | **なし** | リファレンスにのみ存在 |
| `convertReactFlowToMaiML` での `<position>` 出力 | **未使用（デッドコード）** | **なし** | 両版とも未実装 |
| place/transition 出力形式 | インラインで生成（positionなし） | インラインで生成（positionなし） | 実質同等 |
| TypeScript型安全 | なし | あり | 現行版の方が型安全 |

---

## 5. 座標情報の現行の保持フロー

```
編集中（React Flow メモリ上）
  → nodes[].position に保持

ノードドラッグ完了時 (handleNodeDragStop)
  → pushState({ nodes, edges }) でundo/redoスタックに保存

Methodタブ切替時 (handleMethodChange)
  → methods[activeMethodIndex].viewport = getViewport() に保存
  → 切替先の methods[newIndex].viewport があれば setViewport() で復元

Draft保存時
  → nodes（position含む）をまるごとdraftデータに保存

MAIML保存時（reactFlowToMaiml.ts）
  → position は XML に書き出されない

再読み込み時（reactFlowConverter.ts）
  → MAIMLに座標情報がないため nodePositions.get(id) || { x: 0, y: 0 } にフォールバック
  → 自動レイアウト処理（ELK等）で再配置
```

---

## 6. 結論

### リファレンスから取り込む必要がある処理

**リファレンスにある `buildPlaceXML`/`buildTransitionXML` 関数の position 書き出し処理は、リファレンス本体でも実際には使われていない（デッドコード）。**

したがって、現状では「座標をMAIMLファイルに永続化する機能」は  
**リファレンス版・現行版のどちらにも実装されていない**。

リファレンスから新たに取り込む必要のある処理は **ありません**。

---

## 7. 「MAIMLに座標を永続化する」場合の追加実装が必要な箇所

もし将来的にMAIMLファイル内にノード座標を保持したい場合は、以下の対応が必要。  
リファレンスの `buildPlaceXML`/`buildTransitionXML` が実装例として参考になる。

### 7.1 `reactFlowToMaiml.ts`（座標の書き出し）

```typescript
// Place要素内に <position> を追加
maiml += `        <place id="${escapeXml(place.id)}">\n`;
maiml += `          <position x="${Math.round(place.position.x)}" y="${Math.round(place.position.y)}" />\n`;
// ... name, description等
maiml += `        </place>\n`;

// Transition要素内に <position> を追加
maiml += `        <transition id="${escapeXml(transition.id)}">\n`;
maiml += `          <position x="${Math.round(transition.position.x)}" y="${Math.round(transition.position.y)}" />\n`;
maiml += `        </transition>\n`;
```

### 7.2 `maimlParserTyped.ts`（座標の読み込み）

```typescript
// <position> 要素を読み込んでパース結果に含める
const positionEl = placeEl.querySelector('position');
const position = positionEl
  ? { x: Number(positionEl.getAttribute('x')), y: Number(positionEl.getAttribute('y')) }
  : undefined;
```

### 7.3 `reactFlowConverter.ts`（パーサーから取得した座標を利用）

```typescript
// パーサーから取得した座標を優先利用
const position = place.position
  ? { x: place.position.x, y: place.position.y }
  : nodePositions.get(place.id) || { x: 0, y: 0 };
```

---

## 8. 参考：リファレンスのデッドコード（buildPlaceXML / buildTransitionXML）

**ファイル**: `frontend/src/reference/components/PetriNetEditorV2/utils/converters/reactFlowToMaiml.js`

これらの関数は定義されているが `convertReactFlowToMaiML` から呼び出されていない。  
座標永続化を実装する際は、これらを参考に `reactFlowToMaiml.ts` に取り込む形で実装できる。

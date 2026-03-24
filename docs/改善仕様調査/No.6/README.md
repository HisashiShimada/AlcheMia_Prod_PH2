# 調査レポート：MAIML編集画面 ノード座標情報の保持処理

## メタデータ
- **作成日時**: 2026-03-18 16:00
- **最終更新**: 2026-03-23 08:45
- **調査対象**: `frontend/src/reference` のノード座標保持処理
- **目的**: リファレンスソースから現行のMAIML編集画面への座標情報保持処理の取り込み可否を調査

---

## 1. 事実確認：test.maiml の position タグ形式

ユーザーが「Webにデプロイされているreferenceのソースで保存した」ファイル `test_data/test.maiml` を確認：

```xml
<place id="material-1774222191859">
  <position x="408" y="158" />
</place>
```

**形式**: `<place>` 直下に `<position x y />` を直接配置（`<graphics>` ラッパーなし）

---

## 2. ファイル構成と対応関係

| ファイル | 役割 | position 書き出し |
|---|---|---|
| `reference/.../reactFlowToMaiml.js` | リファレンス版コンバーター本体 | **なし**（本体の place 出力に position 記述なし） |
| `reference/.../reactFlowToMaiml.js` `buildPlaceXML` 関数 | placeのXML生成ヘルパー | **あり**（`<position x y />` を place 直下に出力）**ただし本体から呼ばれていない** |
| `reference/.../multiMethodConverter.js` `buildMethodXML` | 複数Method用のplace出力 | **なし** |
| `components/editorv2/.../reactFlowToMaiml.ts` | 現行 editorv2（単一Method） | **なし** |
| `components/editorv2/.../multiMethodConverter.ts` | 現行 editorv2（複数Method） | **なし** |
| `utils/maimlGenerator.ts` | PNML準拠コンバーター（未使用） | **あり**（`<graphics><position x y/></graphics>` 形式） |

---

## 3. リファレンスの `buildPlaceXML` / `buildTransitionXML` の実装

`reference/.../reactFlowToMaiml.js` に定義されているが、**本体では呼ばれていないデッドコード**：

```javascript
// buildPlaceXML（position 書き出しあり）
function buildPlaceXML(node) {
  const { id, data, position } = node;
  const placeType = data.placeType || 'material';
  let placeXml = `    <place id="${escapeXml(id)}" placeType="${escapeXml(placeType)}">
      <name>${escapeXml(data.name || 'Unnamed Place')}</name>
      <description>${escapeXml(data.description || '')}</description>
      <position x="${Math.round(position.x)}" y="${Math.round(position.y)}" />`;
  ...
}

// buildTransitionXML（position 書き出しあり）
function buildTransitionXML(node) {
  const { id, data, position } = node;
  return `    <transition id="${escapeXml(id)}">
      <name>${escapeXml(data.name || 'Unnamed Transition')}</name>
      <description>${escapeXml(data.description || '')}</description>
      <position x="${Math.round(position.x)}" y="${Math.round(position.y)}" />
    </transition>`;
}
```

**本体（`convertReactFlowToMaiML`）の place 出力部分**（`buildPlaceXML` は使われていない）：

```javascript
// 本体では position なし
places.forEach(place => {
  maiml += `        <place id="${escapeXml(place.id)}">\n`;
  if (hasValidName) {
    maiml += `          <name>...</name>\n`;
  }
  if (hasDescription) {
    maiml += `          <description>...</description>\n`;
  }
  maiml += `        </place>\n`;
});
```

---

## 4. test.maiml の position タグはどこから来たか

### 調査範囲

以下のファイルをすべて確認済み：

| 調査ファイル | position 書き出し |
|---|---|
| `reference/.../reactFlowToMaiml.js` 本体 | **なし** |
| `reference/.../reactFlowToMaiml.js` `buildPlaceXML` 関数 | あり（`<position x y />`）**ただし呼び出しなし** |
| `reference/.../multiMethodConverter.js` `buildMethodXML` | **なし** |
| `reference/components/PetriNetViewer/utils/reactFlowConverter.js` | **なし**（`calculateSimpleLayout()` のみ） |
| `reference/components/PetriNetViewer/utils/petriNetExtractor.js` | **なし** |
| `reference/components/PetriNetViewer/utils/MaiMLParser.js` | **なし** |
| `reference/hooks/useFileOperations.js` | **なし** |
| `reference/hooks/useAppState.js` | **なし** |
| `reference/services/apiService.js` | **なし** |
| `reference/components/PetriNetEditorV2/**` 全体 | **なし** |

### 結論

**`reference/` フォルダ内のどのファイルにも `buildPlaceXML`/`buildTransitionXML` の呼び出しは存在しない。**

`test_data/test.maiml` に `<position x="408" y="158" />` が含まれている理由は以下のいずれかと考えられる：

1. **`reference/` フォルダのコードはデプロイ済みWebアプリの最新版を反映していない**  
   デプロイ版の `convertReactFlowToMaiML` 本体に position 書き出しが実装されているが、`reference/` フォルダには反映されていない

2. **`buildPlaceXML` を呼び出すコードがデプロイ版のみに存在する**  
   `reference/reactFlowToMaiml.js` の `convertReactFlowToMaiML` 本体で `buildPlaceXML` を使うよう修正されたが、`reference/` フォルダにはその修正が含まれていない

**いずれの場合も、`buildPlaceXML`/`buildTransitionXML` の実装（`<position x y />` を place/transition 直下に出力）が正しい実装形式であることは確実**。この形式を現行 editorv2 に取り込む必要がある。

---

## 5. 現行 editorv2 での座標情報フロー

```
編集中（React Flow メモリ上）
  → nodes[].position に保持（x, y 座標）

ノードドラッグ完了時
  → undo/redoスタックに position ごと保存

MAIML保存・ダウンロード時（handleSaveConfirmAction）
  ├─ 単一Method: convertReactFlowToMaiML()
  │     → <place id="..."> のみ（position XML出力なし）
  └─ 複数Method: convertMultipleMethodsToMaiML()
        → <place id="..."/> のみ（position XML出力なし）

再読み込み時（reactFlowConverter.ts）
  → MAIMLに座標情報がないため calculateSimpleLayout() で自動レイアウト
  → 毎回レイアウトがリセットされる
```

---

## 6. 取り込みが必要な処理

`buildPlaceXML`/`buildTransitionXML` の position 書き出し処理を現行 editorv2 のコンバーターに取り込む。

### 方法：MaiML独自形式（test.maiml と同じ形式）

`<position x="..." y="..."/>` を place/transition 直下に直接配置する。

### 6.1 書き出し側（2ファイルの修正が必要）

#### `components/editorv2/utils/converters/reactFlowToMaiml.ts`（単一Method）

現在の place 出力部分：
```typescript
// 現在（位置情報なし）
maiml += `        <place id="${escapeXml(place.id)}">\n`;
if (hasValidName) {
  maiml += `          <name>...</name>\n`;
}
maiml += `        </place>\n`;
```

修正後（`buildPlaceXML` から取り込む）：
```typescript
// 修正後（position を追加）
maiml += `        <place id="${escapeXml(place.id)}">\n`;
// 座標情報を出力
if (place.position) {
  maiml += `          <position x="${Math.round(place.position.x)}" y="${Math.round(place.position.y)}" />\n`;
}
if (hasValidName) {
  maiml += `          <name>...</name>\n`;
}
maiml += `        </place>\n`;
```

transition も同様：
```typescript
// 修正後
maiml += `        <transition id="${escapeXml(transition.id)}">\n`;
if (transition.position) {
  maiml += `          <position x="${Math.round(transition.position.x)}" y="${Math.round(transition.position.y)}" />\n`;
}
// ...name, description等
maiml += `        </transition>\n`;
```

#### `components/editorv2/utils/converters/multiMethodConverter.ts`（複数Method）

`buildMethodXML` 内の place/transition 出力箇所に同様の修正が必要。

### 6.2 読み込み側（2ファイルの修正が必要）

#### `utils/maimlParserTyped.ts`（パーサー）

`<position>` 要素を読み込んで place/transition の構造体に追加：
```typescript
// place パース時に position を読み込む
const positionEl = placeEl.querySelector('position');
const position = positionEl ? {
  x: Number(positionEl.getAttribute('x')),
  y: Number(positionEl.getAttribute('y'))
} : undefined;

// place オブジェクトに position を含める
return {
  id: placeEl.getAttribute('id') || '',
  position,  // 追加
  // ...その他のフィールド
};
```

#### `utils/reactFlowConverter.ts`（レイアウト計算）

パーサーから取得した座標を優先し、なければ `calculateSimpleLayout()` にフォールバック：
```typescript
// 現在（常に自動レイアウト）
const position = nodePositions.get(place.id) || { x: 0, y: 0 };

// 修正後（MAIMLに座標があればそれを使用）
const savedPosition = place.position;  // maimlParserTyped から取得
const position = savedPosition
  ? { x: savedPosition.x, y: savedPosition.y }
  : nodePositions.get(place.id) || { x: 0, y: 0 };
```

---

## 7. 修正対象ファイル一覧

| ファイル | 修正内容 | 優先度 |
|---|---|---|
| `components/editorv2/utils/converters/reactFlowToMaiml.ts` | place/transition に `<position x y />` を追加 | 高 |
| `components/editorv2/utils/converters/multiMethodConverter.ts` | place/transition に `<position x y />` を追加 | 高 |
| `utils/maimlParserTyped.ts` | `<position>` 要素を読み込む | 高 |
| `utils/reactFlowConverter.ts` | パーサーの座標を優先使用 | 高 |

---

## 8. 参考：ファイル間の呼び出し関係

```
PetriNetEditorInner.tsx（editorv2）
  ├─ handleSaveConfirmAction（保存・ダウンロード）
  │    ├─ convertReactFlowToMaiML()  ← editorv2/utils/converters/reactFlowToMaiml.ts
  │    │    → ここに <position> 書き出しを追加する
  │    └─ convertMultipleMethodsToMaiML()  ← editorv2/utils/converters/multiMethodConverter.ts
  │         → ここにも <position> 書き出しを追加する
  │
  └─ MAIMLファイル読み込み時
       ├─ maimlParserTyped.ts → <position> を読み込む（修正が必要）
       └─ reactFlowConverter.ts → 座標を優先使用（修正が必要）

デプロイ済みWebアプリ（reference の buildPlaceXML 形式で出力）
  → <place id="...">
       <position x="408" y="158" />
     </place>
  ← この形式に合わせて実装する
```

---

## 9. 更新履歴

| 日付 | 変更内容 |
|---|---|
| 2026-03-23 08:45 | test.maiml 実ファイル確認により最終更新。デプロイ版は buildPlaceXML 形式で出力していることを特定 |
| 2026-03-23 08:40 | 再調査により maimlGenerator.ts に position 実装を発見、レポート全面更新 |
| 2026-03-18 | 初版作成 |

# Positionタグ書き込み対応 - 実装結果

## 対応概要

MAIMLファイル保存時に各ノード（Place / Transition）の座標を `<position>` タグとして書き出し、再読み込み時にその座標を復元することで、**エディタ上のノード配置を永続化**する。

---

## 修正ファイル一覧

| # | ファイルパス | 修正内容 |
|---|------------|---------|
| 1 | `frontend/src/types/maiml-unified.ts` | `PnmlPlace` / `PnmlTransition` 型に `position` フィールドを追加 |
| 2 | `frontend/src/utils/maimlTypeConverter.ts` | パース時に `<position>` タグを読み取って型に格納 |
| 3 | `frontend/src/utils/reactFlowConverter.ts` | `position` が存在すれば自動レイアウトより優先して使用 |
| 4 | `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts` | 単一Methodの書き出し時に `<position>` タグを出力 |
| 5 | `frontend/src/components/editorv2/utils/converters/multiMethodConverter.ts` | 複数Methodの書き出し時に `<position>` タグを出力 |

---

## 各ファイルの修正詳細

### 1. `maiml-unified.ts` — 型定義追加

```typescript
// PnmlPlace / PnmlTransition に追加
position?: {
  x: number;
  y: number;
};
```

### 2. `maimlTypeConverter.ts` — 読み込み処理追加

`<place>` / `<transition>` 要素内の `<position>` タグを解析し、`x` / `y` 属性を数値として取得。

```typescript
// place の position パース
const posEl = placeEl.querySelector('position');
if (posEl) {
  const x = parseFloat(posEl.getAttribute('x') || '0');
  const y = parseFloat(posEl.getAttribute('y') || '0');
  place.position = { x, y };
}
```

### 3. `reactFlowConverter.ts` — 座標の優先使用

MAIMLの `position` フィールドが存在する場合、自動レイアウト計算をスキップしてその値をそのまま React Flow ノードの `position` に設定。

```typescript
// position タグが存在すれば優先使用、なければ自動レイアウト
position: place.position
  ? { x: place.position.x, y: place.position.y }
  : { x: autoX, y: autoY },
```

### 4. `reactFlowToMaiml.ts` — 単一Method の書き出し

**Place要素:**
```xml
<place id="p1">
  <name>材料A</name>
  <position x="100" y="200"/>
</place>
```

**Transition要素:**
```xml
<transition id="t1">
  <name>工程1</name>
  <position x="300" y="200"/>
</transition>
```

実装箇所:
- Place: `<description>` の後に `<position>` を出力
- Transition: `<description>` の後に `<position>` を出力。position が存在する場合は空要素形式（`<transition id="..."/>`）ではなく開閉タグ形式を使用

### 5. `multiMethodConverter.ts` — 複数Method の書き出し

`buildMethodXML` 関数内で単一Methodと同様の処理を追加。

**Place要素（変更前）:**
```typescript
if (hasDescription) {
  methodXml += `        <place id="${place.id}">\n`;
  methodXml += `          <description>...</description>\n`;
  methodXml += `        </place>\n`;
} else {
  methodXml += `        <place id="${place.id}"/>\n`;
}
```

**Place要素（変更後）:**
```typescript
if (hasDescription || hasPosition) {
  methodXml += `        <place id="${place.id}">\n`;
  if (hasDescription) { ... }
  if (hasPosition) {
    methodXml += `          <position x="${place.position.x}" y="${place.position.y}"/>\n`;
  }
  methodXml += `        </place>\n`;
} else {
  methodXml += `        <place id="${place.id}"/>\n`;
}
```

---

## データフロー

```
【読み込み】
MAIMLファイル
  └─ maimlTypeConverter.ts  ← <position> タグを PnmlPlace/PnmlTransition.position に格納
       └─ reactFlowConverter.ts  ← position が存在すれば優先使用して React Flow ノードに設定

【書き出し】
React Flow ノード
  └─ reactFlowToMaiml.ts (単一Method)  ← node.position を <position x y/> として出力
  └─ multiMethodConverter.ts (複数Method)  ← 同上
       └─ MAIMLファイル
```

---

## 出力XMLサンプル

```xml
<pnml id="pnmlID">
  <uuid>...</uuid>
  <name>samplePNML</name>

  <place id="p_material_001">
    <name>原料A</name>
    <position x="100" y="50"/>
  </place>

  <place id="p_result_001">
    <name>生成物B</name>
    <position x="500" y="50"/>
  </place>

  <transition id="t_process_001">
    <name>合成工程</name>
    <position x="300" y="50"/>
  </transition>

  <arc id="arc_001" source="p_material_001" target="t_process_001">
  </arc>
  <arc id="arc_002" source="t_process_001" target="p_result_001">
  </arc>
</pnml>
```

---

## ビルド確認結果

今回修正した5ファイルに TypeScript エラーなし。  
検出された既存エラー（`auth` 関連テストファイル）は今回の修正とは無関係。

---

## 実装日時

2026-03-25

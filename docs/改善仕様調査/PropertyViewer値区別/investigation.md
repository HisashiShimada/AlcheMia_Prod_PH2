# Propertyビューア「値なし区別」仕様調査

**作成日**: 2026-03-25  
**対象**: Propertyビューアで「意図的に値を入力していないもの（空値）」と「値がないもの（プロパティ未存在）」の区別

---

## 1. 調査対象ファイル

### 現行実装（TypeScript / Ant Design v6）

| ファイル | 役割 |
|---|---|
| `frontend/src/components/viewer/dialogs/PropertyViewer.tsx` | メインのPropertyビューア |
| `frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx` | チェックボックス選択付きPropertyビューア |
| `frontend/src/components/viewer/dialogs/StructuredPropertySelector.tsx` | 構造別プロパティ選択コンポーネント |
| `frontend/src/components/viewer/dialogs/SubNetViewer.tsx` | SubNetビューア（PropertyViewer利用側） |
| `frontend/src/components/viewer/PetriNetViewer.tsx` | PetriNetビューア（PropertyViewerWithSelection利用側） |
| `frontend/src/types/maiml-unified.ts` | MAIML統合型定義（Property型含む） |

### Reference実装（JavaScript / Material-UI）

| ファイル | 役割 |
|---|---|
| `frontend/src/reference/components/PropertyViewer.js` | Referenceのメインビューア |
| `frontend/src/reference/components/PropertyViewer.css` | Referenceのスタイル |
| `frontend/src/reference/components/StructuredPropertySelector.js` | Referenceの構造別プロパティ選択 |

---

## 2. データモデル概要

### 2.1 現行実装での `PropertyObject` 型

現行実装では `PropertyObject` という型が複数ファイルでローカルに定義されている（**型定義ファイルへの集約が未完了**）。

```typescript
// PropertyViewer.tsx / PropertyViewerWithSelection.tsx / SubNetViewer.tsx 各所で重複定義
interface PropertyObject {
  key?: string;
  value?: unknown;      // ← 値そのもの
  type?: string;
  description?: string;
  defaultValue?: string; // ← デフォルト値（フォールバック用）
}
```

### 2.2 `StructuredProperties` 型

```typescript
interface StructuredProperties {
  basic: Record<string, PropertyObject>;    // 基本情報タブ
  template: Record<string, PropertyObject>; // テンプレートタブ
  data: Record<string, PropertyObject>;     // データタブ
}
```

### 2.3 MAIML統合型定義の `Property` 型（`maiml-unified.ts`）

```typescript
export interface Property {
  key: string;      // 必須
  xsiType: string;  // 必須（例: "stringType", "doubleType"）
  description?: string;
  value?: string | number | boolean;  // ← undefined = 値なし
  properties: Property[];             // ネスト（propertyListType用）
  contents: Content[];
  units?: string;
  formatString?: string;
  scaleFactor?: number;
  attributes?: Record<string, string>;
  customElements?: Record<string, PropertyCustomElement>;
}
```

---

## 3. 現行実装の「値なし」の扱い

### 3.1 `PropertyViewer.tsx` での値取得ロジック

```typescript
// structuredPropertiesから値を取得するヘルパー関数
const getPropertyValue = (propObj: PropertyObject): unknown => {
  if (propObj.value !== undefined) {
    return propObj.value;       // 1. valueがあればそれを使用
  }
  if (propObj.defaultValue !== undefined) {
    return propObj.defaultValue; // 2. defaultValueがあればそれを使用
  }
  return '未設定';               // 3. 両方なければ '未設定' (固定文字列)
};
```

### 3.2 テーブルの値レンダリング（`PropertyViewer.tsx` / `PropertyViewerWithSelection.tsx`）

```typescript
render: (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return <Text type="secondary" italic>未設定</Text>;  // グレーイタリック
  }
  if (typeof value === 'boolean') {
    return value ? <Tag color="success">はい</Tag> : <Tag color="error">いいえ</Tag>;
  }
  if (typeof value === 'object') {
    return <Text code>{JSON.stringify(value)}</Text>;
  }
  return <Text>{String(value)}</Text>;
},
```

### 3.3 `StructuredPropertySelector.tsx` での値フォーマット

```typescript
const formatPropertyValue = (propertyObj: PropertyObject | unknown): string => {
  let value;
  if (propertyObj && typeof propertyObj === 'object') {
    const obj = propertyObj as PropertyObject;
    if (obj.value !== undefined) {
      value = obj.value;
    } else if (obj.elements && obj.elements.value !== undefined) {
      value = obj.elements.value;
    } else if (obj.children && Array.isArray(obj.children) && obj.children.length > 0) {
      return `${obj.children.length}個の子要素`;
    }
  } else {
    value = propertyObj;
  }

  if (value === null || value === undefined || value === '') {
    return '未設定';  // ← 空文字・null・undefinedをすべて同一視
  }
  return String(value);
};
```

### 3.4 利用側でのプロパティ構築（`PetriNetViewer.tsx`）

```typescript
// テンプレートプロパティの構築例
const templateProperties: Record<string, PropertyObject> = {};
if (node.data.properties && typeof node.data.properties === 'object') {
  Object.entries(node.data.properties).forEach(([key, value]) => {
    templateProperties[key] = {
      key,
      value: value || '値なし',  // ← valueがfalsyなら '値なし' を入れている
      type: 'string',
      description: '説明なし'
    };
  });
}
```

---

## 4. 現行実装の問題点

### 4.1 「値なし」の状態が1種類しか存在しない

現行実装では以下の3つの状態が**すべて同じ「未設定」表示**になっている：

| 状態 | 実際の意味 | 現行表示 |
|---|---|---|
| `value: ''`（空文字列） | ユーザーが意図的に空欄として入力した | `未設定` |
| `value: undefined` / `value: null` | データが存在しない（プロパティ未設定） | `未設定` |
| `value: '値なし'`（文字列） | 利用側が強制的に入れた代替文字列 | `値なし` |
| プロパティキー自体が存在しない | テンプレートにそもそも定義がない | 表示されない |

### 4.2 `getPropertyValue` の '未設定' フォールバック問題

```typescript
// PropertyViewer.tsx
const getPropertyValue = (propObj: PropertyObject): unknown => {
  if (propObj.value !== undefined) return propObj.value;
  if (propObj.defaultValue !== undefined) return propObj.defaultValue;
  return '未設定';  // ← 文字列'未設定'を返すため、後段で "未設定" という値として扱われる
};
```

このため、テーブルのレンダリング段階では「未設定」が文字列値として届き、`null/undefined/''` のチェックをすり抜けて通常テキストとして表示される。

### 4.3 `value: value || '値なし'` による上書き

`PetriNetViewer.tsx` の templateProperties 構築で：
```typescript
value: value || '値なし',
```
`value` が `0`, `false`, `''` の場合も `'値なし'` に置き換えられてしまう。

---

## 5. Reference実装の「値なし」の扱い

### 5.1 Reference `PropertyViewer.js` での `formatPropertyValue`

```javascript
const formatPropertyValue = (value) => {
  // 値がnullまたはundefinedの場合 - チップコンポーネントで表示
  if (value === null || value === undefined || value === '') {
    return (
      <span className="property-chip property-chip-empty" title="このプロパティは設定されていません">
        未設定
      </span>
    );
  }
  // ...通常表示...
};
```

### 5.2 Reference `PropertyViewer.css` のスタイル定義

```css
/* チップコンポーネントスタイル（No.8: 値なし表示改善） */
.property-chip {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  cursor: help;
  transition: all 0.2s ease;
}

.property-chip-empty {
  background-color: #f5f5f5;
  color: #9e9e9e;
  border: 1px solid #e0e0e0;
}

.property-chip-empty:hover {
  background-color: #eeeeee;
  border-color: #bdbdbd;
}
```

### 5.3 Reference実装での区別の現状

Reference実装（`PropertyViewer.js`）においても、`null`, `undefined`, `''` の3パターンを**同一視**して「未設定」チップで表示している。

Reference では「プロパティが存在するが値が空（intentionally empty）」と「プロパティが存在しない」の区別は実装されていない。

### 5.4 Reference実装のデータ取得ロジック

Reference の `fetchDataInfo`（XMLパース版）では：

```javascript
// valueフィールドの処理
if (prop.value !== undefined && prop.value !== null) {
  propObj.value = prop.value;
}
// ↑ valueが undefined/null の場合は propObj.value フィールド自体がセットされない
```

つまりReferenceでは：
- `<value>Sample A</value>` → `propObj.value = "Sample A"` 
- `<value></value>` または value要素なし → `propObj.value` は `undefined`（フィールドなし）

この2つの区別は、XMLレベルでは区別可能だが、データモデル上では区別されていない。

---

## 6. MAIMLデータレベルでの「意図的な空値」の定義

### 6.1 MAIMLのProperty構造

```xml
<!-- パターン1: 値あり -->
<property key="sampleName" xsi:type="stringType">
  <value>Sample A</value>
</property>

<!-- パターン2: value要素が空文字 -->
<property key="sampleName" xsi:type="stringType">
  <value></value>
</property>

<!-- パターン3: value要素なし -->
<property key="sampleName" xsi:type="stringType">
  <description>サンプル名</description>
  <!-- value要素なし -->
</property>

<!-- パターン4: property要素ごとない（テンプレートには定義あり、データには記録なし） -->
<!-- → データセクションに該当のプロパティが存在しない -->
```

### 6.2 `maiml-unified.ts` における `value` フィールドの定義

```typescript
export interface Property {
  // ...
  value?: string | number | boolean;  
  // ← undefined は「値が設定されていない」を意味するが、
  //   「意図的な空入力」と「そもそも未入力」の区別がない
}
```

---

## 7. 区別実現のための要件整理

### 7.1 区別すべき状態（提案）

| 状態 | 意味 | 想定される表示 |
|---|---|---|
| **A: 値あり** | `value` に非空の値が設定されている | 値をそのまま表示 |
| **B: 意図的な空値** | ユーザーが明示的に空として記録した（例: `<value></value>`） | 専用チップ表示（例: 「空値」） |
| **C: 未記録** | データセクションにプロパティが存在するが `value` 要素がない | 別のチップ表示（例: 「未記録」） |
| **D: テンプレート未定義** | そもそもテンプレートにプロパティが存在しない | 行自体が表示されない |

### 7.2 現行の `PropertyObject` 型での対応可能性

現行の型：
```typescript
interface PropertyObject {
  key?: string;
  value?: unknown;
  type?: string;
  description?: string;
  defaultValue?: string;
}
```

**問題**: `value: undefined` だけでは「意図的な空値（空文字列）」と「未記録」が区別できない場合がある。

XMLパース時に `<value></value>` → `value: ''`（空文字列）として保存すれば区別可能だが、現行パーサーが空文字をどう扱っているか確認が必要。

### 7.3 型レベルでの解決案

```typescript
// 案1: 専用フィールド追加
interface PropertyObject {
  key?: string;
  value?: unknown;
  type?: string;
  description?: string;
  defaultValue?: string;
  // 追加
  valueState?: 'set' | 'intentionally_empty' | 'not_recorded';
}

// 案2: sentinel値の使用
// null → 意図的な空値（XMLに <value/> または <value></value> がある）
// undefined → 未記録（XMLにvalue要素なし）
interface PropertyObject {
  key?: string;
  value?: string | number | boolean | null;  // null = intentionally empty
  // ...
}
```

---

## 8. 現行実装と Reference の差異サマリ

| 観点 | 現行実装 | Reference実装 |
|---|---|---|
| UIフレームワーク | Ant Design v6 (Tag, Text等) | Material-UI (Chip等) |
| 「値なし」の表示 | `<Text type="secondary" italic>未設定</Text>` | `<span class="property-chip-empty">未設定</span>` |
| 空値の区別 | **なし**（null/undefined/''を同一視） | **なし**（同様） |
| フォールバック文字列 | `'未設定'` または `'値なし'` | `'未設定'` |
| データ取得方式 | `structuredProperties` propsとして受け取る（ビューア側はパース不要） | MAIMLデータを自身でXMLパース |
| ホバー時のトoltip | なし | `title="このプロパティは設定されていません"` |
| チップのボーダー | なし（Ant Design Tag） | あり（CSSで明示的にスタイリング） |

---

## 9. 改善実装に向けた調査事項（未調査・要確認）

- [ ] MAIMLパーサー（`maimlParserTyped.ts`）が `<value></value>`（空文字）を `''` として取得しているか、`undefined` として扱っているか
- [ ] `petriNetExtractor.ts` での Template プロパティ変換時の空値処理
- [ ] `reactFlowConverter.ts` での PropertyObject 構築時の空値処理
- [ ] 実験記録側（ExperimentWorker）でのデータ記録時の空値の扱い（`value: null` で保存されるか否か）
- [ ] バックエンドの `dataInstances` APIレスポンスでの空値表現（`null` vs 省略）

---

## 10. 関連ファイル

```
frontend/src/
├── components/viewer/
│   ├── PetriNetViewer.tsx               ← PropertyViewerWithSelection利用
│   └── dialogs/
│       ├── PropertyViewer.tsx           ← 現行メインビューア
│       ├── PropertyViewerWithSelection.tsx ← 選択機能付き
│       ├── StructuredPropertySelector.tsx  ← 構造別選択UI
│       └── SubNetViewer.tsx             ← PropertyViewer利用
├── reference/components/
│   ├── PropertyViewer.js                ← Reference実装
│   ├── PropertyViewer.css               ← Referenceスタイル
│   └── StructuredPropertySelector.js   ← Reference選択UI
└── types/
    └── maiml-unified.ts                 ← Property型定義
```

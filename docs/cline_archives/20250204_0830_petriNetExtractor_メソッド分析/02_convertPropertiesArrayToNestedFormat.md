# メソッド2: convertPropertiesArrayToNestedFormat

## 📋 基本情報

- **メソッド名**: `convertPropertiesArrayToNestedFormat`
- **公開区分**: 非公開（内部ヘルパー関数）
- **優先度**: 🔴 高（any型排除が必要）
- **呼び出し元**: `buildTemplateMap`

---

## 🔍 現状の型定義

```typescript
const convertPropertiesArrayToNestedFormat = (
  propertiesArray: any[]         // ❌ any型
): Record<string, any>           // ❌ any型
```

---

## 💡 実装内容の分析

### アクセスしているプロパティ構造

```typescript
// コード内で実際にアクセスされているプロパティ
prop.type || prop.xsiType
prop.key || prop.name
prop.tagName
prop.units
prop.formatString
prop.scaleFactor
prop.defaultValue
prop.description
prop.properties  // 子要素（再帰用）
```

### データフロー

```
入力元: buildTemplateMap
  ↓
  extractInsertionFromProperties の出力（filteredProperties）
  ↓
convertPropertiesArrayToNestedFormat
  ↓
  - MaiMLParser配列形式を変換
  - NestedPropertyEditor形式に整形
  - 再帰的にネスト構造を構築
  ↓
出力: Record<string, NestedPropertyNode>
  ↓
buildTemplateMap の propertiesNested プロパティ
```

### 処理ロジック

1. **変換**: 配列形式 → オブジェクト形式（key: value）
2. **整形**: NestedPropertyNode構造に変換
   - `key`: プロパティキー
   - `tagName`: XMLタグ名
   - `attributes`: 属性（xsi:type, units等）
   - `elements`: 子要素
   - `children`: 子ノード配列
3. **再帰**: `properties`配列を`children`に変換

---

## 🔬 editorv2/types の型定義

### NestedPropertyNode型（既存）

```typescript
// frontend/src/components/editorv2/types/index.ts
export interface NestedPropertyNode {
  key: string;
  tagName: string;
  attributes: Record<string, string>;
  elements: Record<string, any>;
  children: NestedPropertyNode[];
}
```

### ✅ 完全一致を確認

実装が生成する構造は、`NestedPropertyNode`型と**完全に一致**しています！

```typescript
// 実装で生成される構造
{
  key: prop.key || prop.name,
  tagName: prop.tagName || 'property',
  attributes: {
    'xsi:type': prop.type || prop.xsiType,
    units: prop.units,
    formatString: prop.formatString,
    scaleFactor: prop.scaleFactor?.toString()
  },
  elements: {
    value: { defaultValue: prop.defaultValue },
    description: { defaultValue: prop.description }
  },
  children: convertPropertiesArrayToChildren(prop.properties || [])
}
```

---

## ✅ 型定義提案

### 修正後の型定義

```typescript
import type { NestedPropertyNode } from '@/components/editorv2/types';
import type { ParsedProperty } from './types';  // 新規定義

const convertPropertiesArrayToNestedFormat = (
  propertiesArray: ParsedProperty[]              // ✅ 明確化
): Record<string, NestedPropertyNode>            // ✅ 既存型活用
```

---

## 📊 型定義の比較

| 項目 | 現状 | 修正後 | 改善点 |
|------|------|--------|--------|
| パラメータ | `any[]` | `ParsedProperty[]` | ✅ 型安全性向上 |
| 戻り値 | `Record<string, any>` | `Record<string, NestedPropertyNode>` | ✅ 構造明確化 |
| 既存型活用 | ❌ なし | ✅ editorv2/types | ✅ 再利用性向上 |
| IDEサポート | ❌ なし | ✅ 自動補完可能 | ✅ 開発効率向上 |

---

## 🎯 選択理由

### ✅ メリット

1. **既存型の活用**
   - `NestedPropertyNode`は既にeditorv2で定義済み
   - 重複定義を避けられる
   - 一貫性が保たれる

2. **実装との完全一致**
   - 生成される構造と型定義が完全一致
   - 型安全性が保証される

3. **保守性の向上**
   - 型定義が一箇所に集約
   - 変更時の影響範囲が明確

---

## 📝 実装例

### 使用例

```typescript
// buildTemplateMap内での使用
const propertiesNested = convertPropertiesArrayToNestedFormat(filteredProperties);

// 型安全にアクセス可能
Object.entries(propertiesNested).forEach(([key, node]) => {
  console.log(node.key);         // ✅ string
  console.log(node.tagName);     // ✅ string
  console.log(node.attributes);  // ✅ Record<string, string>
  console.log(node.elements);    // ✅ Record<string, any>
  console.log(node.children);    // ✅ NestedPropertyNode[]
});
```

### NestedPropertyEditorでの使用

```typescript
// NestedPropertyEditor コンポーネントで使用
<NestedPropertyEditor
  properties={propertiesNested}  // ✅ 型チェックが機能
  onChange={handleChange}
/>
```

---

## 🔄 メソッド3との関係

このメソッドは内部で`convertPropertiesArrayToChildren`（メソッド3）を呼び出します。

```typescript
children: convertPropertiesArrayToChildren(prop.properties || [])
```

メソッド3も同様に`NestedPropertyNode[]`を返すため、型定義の一貫性が保たれます。

---

## ✅ 承認項目

- [ ] NestedPropertyNode型の活用（editorv2/types から）
- [ ] convertPropertiesArrayToNestedFormat の型定義変更
- [ ] 入力型として ParsedProperty[] を使用
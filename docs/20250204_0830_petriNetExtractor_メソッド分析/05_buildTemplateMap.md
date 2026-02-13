# メソッド5: buildTemplateMap

## 📋 基本情報

- **メソッド名**: `buildTemplateMap`
- **公開区分**: 公開（export）
- **優先度**: 🟡 中（型定義検証）
- **呼び出し元**: PetriNetEditor等

---

## 🔍 現状の型定義

```typescript
export const buildTemplateMap = (
  parserOrData: MaimlParserTyped | string
): Record<string, TemplateMapEntry>
```

---

## 💡 分析結果

### 既存の型定義

```typescript
// editorv2/types/index.ts
export interface TemplateMapEntry {
  id: string;
  uuid?: string;
  name?: string;
  description?: string;
  annotation?: string;
  properties: Property[];
  propertiesNested: Record<string, NestedPropertyNode>;
  insertion?: InsertionData;
  templateId: string;
  type: 'material' | 'condition' | 'result';
  stereotype: 'MaterialTemplate' | 'ConditionTemplate' | 'ResultTemplate';
  element?: Element | null;
  placeRefs: PlaceRef[];
  templateRefs: Array<{ id: string; href: string }>;
}
```

---

## ✅ 評価結果

### 型定義の状態

✅ **問題なし** - 既存の型定義で十分に型安全性が確保されている

| 項目 | 評価 | 理由 |
|------|------|------|
| パラメータ型 | ✅ 適切 | Union型で柔軟に対応 |
| 戻り値型 | ✅ 適切 | `TemplateMapEntry`で構造化 |
| 型安全性 | ✅ 確保 | 各プロパティの型が定義済み |
| IDEサポート | ✅ 良好 | 自動補完が機能 |

---

## 📊 使用例

```typescript
// MaimlParserTypedインスタンスから
const parser = new MaimlParserTyped(maimlXml);
const templateMap = buildTemplateMap(parser);

// または文字列から直接
const templateMap2 = buildTemplateMap(maimlXml);

// 型安全にアクセス可能
Object.entries(templateMap).forEach(([id, entry]) => {
  console.log(entry.id);                  // ✅ string
  console.log(entry.name);                // ✅ string | undefined
  console.log(entry.type);                // ✅ 'material' | 'condition' | 'result'
  console.log(entry.properties);          // ✅ Property[]
  console.log(entry.propertiesNested);    // ✅ Record<string, NestedPropertyNode>
  console.log(entry.insertion);           // ✅ InsertionData | undefined
});
```

---

## 🔄 内部でメソッド1-3を使用

このメソッドは内部で以下のヘルパー関数を使用します：

1. **extractInsertionFromProperties**（メソッド1）
   - insertion要素の抽出
   
2. **convertPropertiesArrayToNestedFormat**（メソッド2）
   - propertiesNestedの生成

メソッド1-3の型定義が修正されると、このメソッドも恩恵を受けます。

---

## 🔄 対応方針

### 推奨事項: 変更不要

現状の型定義で十分に型安全性が確保されているため、変更は不要です。

ただし、メソッド1-3の型定義修正により、以下の改善が期待されます：

1. **内部処理の型安全性向上**
   - extractInsertionFromProperties が型安全に
   - convertPropertiesArrayToNestedFormat が型安全に

2. **コードの可読性向上**
   - 型推論が改善
   - IDEの補完がより正確に

---

## ✅ 承認項目

- [ ] 現状の型定義を維持（変更なし）
- [ ] メソッド1-3の型定義修正による間接的な改善を確認
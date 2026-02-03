# メソッド1: extractInsertionFromProperties

## 📋 基本情報

- **メソッド名**: `extractInsertionFromProperties`
- **公開区分**: 非公開（内部ヘルパー関数）
- **優先度**: 🔴 高（any型排除が必要）
- **呼び出し元**: `buildTemplateMap`

---

## 🔍 現状の型定義

```typescript
const extractInsertionFromProperties = (
  properties: any[],      // ❌ any型
  templateId: string
): { 
  insertion: any | null;  // ❌ any型
  properties: any[]       // ❌ any型
}
```

---

## 💡 実装内容の分析

### アクセスしているプロパティ構造

```typescript
// コード内で実際にアクセスされているプロパティ
prop.type === 'insertion'
prop.elements?.uri?.defaultValue
prop.elements?.hash?.defaultValue
prop.elements?.format?.defaultValue
```

### データフロー

```
入力元: buildTemplateMap
  ↓
  t.property (MaterialTemplate | ConditionTemplate | ResultTemplate)
  ↓
extractInsertionFromProperties
  ↓
  - insertion要素を検索（type='insertion'）
  - elements.uri.defaultValue を抽出
  - elements.hash.defaultValue を抽出
  - elements.format.defaultValue を抽出
  ↓
出力: { insertion: {...}, properties: [...] }
  ↓
buildTemplateMap の戻り値に含まれる
```

### 処理ロジック

1. **検索**: `properties`配列から`type='insertion'`の要素を検索
2. **抽出**: insertion要素の`elements`から`uri`, `hash`, `format`を抽出
3. **フィルタ**: insertion以外のpropertiesを返却

---

## 🔬 XSD型との対応関係

### maiml-unified.ts の Property型

```typescript
interface Property {
  key: string;
  'xsi:type': PropertyType;
  description?: string;
  value?: string | number | boolean;
  values?: (string | number | boolean)[];
  properties?: Property[];  // ネスト構造
  units?: string;
  formatString?: string;
  scaleFactor?: number;
}
```

### ⚠️ 重要な発見

**XSD型は`elements`プロパティを持たない**

実装が参照している以下の構造は、XSD準拠の`Property`型とは**異なる独自構造**：
```typescript
prop.elements?.uri?.defaultValue  // XSD型には存在しない
prop.elements?.hash?.defaultValue // XSD型には存在しない
```

**結論**: これは`MaimlParserTyped`がXMLをパースした後の**中間形式**

---

## ✅ 型定義提案

### ParsedProperty型（新規定義）

```typescript
/**
 * パース後のProperty型（MaimlParserTypedの出力形式）
 * XSD準拠のProperty型とは異なる中間表現
 */
type ParsedProperty = {
  /** プロパティ型（'insertion', 'stringType' など） */
  type?: string;
  /** XSI型（type の別名） */
  xsiType?: string;
  /** プロパティキー */
  key?: string;
  /** プロパティ名（key の別名） */
  name?: string;
  /** タグ名（XMLタグ名） */
  tagName?: string;
  /** ネストされた要素群（独自構造） */
  elements?: {
    uri?: { defaultValue?: string };
    hash?: { defaultValue?: string };
    format?: { defaultValue?: string };
    value?: { defaultValue?: any };
    description?: { defaultValue?: string };
    [key: string]: any;
  };
  /** デフォルト値 */
  defaultValue?: any;
  /** 説明 */
  description?: string;
  /** 単位 */
  units?: string;
  /** フォーマット文字列 */
  formatString?: string;
  /** スケールファクター */
  scaleFactor?: number;
  /** 子プロパティ（再帰構造） */
  properties?: ParsedProperty[];
  /** 拡張プロパティ */
  [key: string]: any;
};
```

### 修正後の型定義

```typescript
const extractInsertionFromProperties = (
  properties: ParsedProperty[],  // ✅ 明確化
  templateId: string
): {
  insertion: {                    // ✅ 明確化
    uri: string;
    hash: string;
    format: string;
  } | null;
  properties: ParsedProperty[];   // ✅ 明確化
}
```

---

## 📊 型定義の比較

| 項目 | 現状 | 修正後 | 改善点 |
|------|------|--------|--------|
| パラメータ | `any[]` | `ParsedProperty[]` | ✅ 型安全性向上 |
| 戻り値 insertion | `any \| null` | `{ uri: string; hash: string; format: string } \| null` | ✅ 構造明確化 |
| 戻り値 properties | `any[]` | `ParsedProperty[]` | ✅ 型安全性向上 |
| IDEサポート | ❌ なし | ✅ 自動補完可能 | ✅ 開発効率向上 |

---

## 🎯 選択理由

### ✅ メリット

1. **実装の実態に合致**
   - `prop.elements?.uri`アクセスに対応
   - 実際のデータ構造を正確に表現

2. **柔軟性が高い**
   - 将来の拡張に対応可能
   - インデックスシグネチャで未知のプロパティに対応

3. **XSD型と明確に区別**
   - 中間形式であることが明確
   - 混同を避けられる

### ⚠️ デメリット

1. **XSD型からの乖離**
   - XSD仕様とは異なる独自型
   - ただし、実装の実態に合わせる方が実用的

---

## 📝 実装例

### 使用例

```typescript
// buildTemplateMap内での使用
const { insertion, properties: filteredProperties } = 
  extractInsertionFromProperties(t.property, t.id);

// insertion は型安全にアクセス可能
if (insertion) {
  console.log(insertion.uri);    // ✅ string
  console.log(insertion.hash);   // ✅ string
  console.log(insertion.format); // ✅ string
}

// filteredProperties は ParsedProperty[] 型
filteredProperties.forEach(prop => {
  console.log(prop.key);  // ✅ string | undefined
  console.log(prop.type); // ✅ string | undefined
});
```

---

## ✅ 承認項目

- [ ] ParsedProperty型の新規定義
- [ ] extractInsertionFromProperties の型定義変更
- [ ] XSD型からの乖離を許容
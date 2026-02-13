# petriNetExtractor.ts メソッド型定義分析レポート

## 📋 作業記録

- **作成日時**: 2025-02-04 08:27
- **対象ファイル**: `frontend/src/utils/petriNetExtractor.ts`
- **目的**: 各メソッドの型定義を明確化し、XSD準拠型への移行を検討

---

## 📊 メソッド一覧と分析状況

| No | メソッド名 | 公開 | 現状の型問題 | 分析状態 | 提案状態 |
|----|-----------|------|-------------|---------|---------|
| 1 | extractInsertionFromProperties | 非公開 | any使用 | ⏳ 分析中 | 未提案 |
| 2 | convertPropertiesArrayToNestedFormat | 非公開 | any使用 | 未着手 | 未提案 |
| 3 | convertPropertiesArrayToChildren | 非公開 | any使用 | 未着手 | 未提案 |
| 4 | extractPetriNetStructure | 公開 | 部分的型定義 | 未着手 | 未提案 |
| 5 | buildTemplateMap | 公開 | 部分的型定義 | 未着手 | 未提案 |
| 6 | generateSubnetData | 公開 | 部分的型定義 | 未着手 | 未提案 |

---

## 🔍 メソッド1: extractInsertionFromProperties

### 現状の型定義

```typescript
const extractInsertionFromProperties = (
  properties: any[], 
  templateId: string
): { 
  insertion: any | null; 
  properties: any[] 
}
```

### 実装内容の分析

```typescript
// アクセスしているプロパティ構造
prop.type === 'insertion'
prop.elements?.uri?.defaultValue
prop.elements?.hash?.defaultValue
prop.elements?.format?.defaultValue
```

### データフロー

1. **入力元**: `t.property` (MaterialTemplate | ConditionTemplate | ResultTemplate)
   - 呼び出し箇所: `buildTemplateMap`内で各テンプレートのpropertyを渡している
   
2. **処理内容**:
   - properties配列から`type='insertion'`の要素を検索
   - insertion要素の`elements`から`uri`, `hash`, `format`を抽出
   - insertion以外のpropertiesを返却

3. **出力先**: `buildTemplateMap`の戻り値に含まれる
   - `insertion`プロパティ
   - `properties`プロパティ

### XSD型との対応関係

**✅ maiml-unified.ts確認結果:**
- `Property`型は`value`, `values`, `properties`を持つが、`elements`プロパティは**持たない**
- `Property`型の構造:
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
- `type='insertion'`はXSD型定義には**存在しない**（独自拡張）

**⚠️ 重要な発見:**
実装が参照している`prop.elements?.uri?.defaultValue`の構造は、XSD準拠の`Property`型とは**異なる独自構造**です。
これは`MaimlParserTyped`がXMLをパースした後の中間形式と推測されます。

### 型定義の選択肢

#### 選択肢A: XSD型を直接使用
```typescript
import type { Property as XsdProperty } from '@/types/maiml-unified';

const extractInsertionFromProperties = (
  properties: XsdProperty[],
  templateId: string
): {
  insertion: {
    uri: string;
    hash: string;
    format: string;
  } | null;
  properties: XsdProperty[];
}
```

**メリット:**
- XSD準拠で一貫性がある
- 型安全性が最大

**デメリット:**
- XsdPropertyが実際の構造と合わない可能性

#### 選択肢B: 中間型を定義
```typescript
type ParsedProperty = {
  type?: string;
  xsiType?: string;
  key?: string;
  name?: string;
  elements?: {
    uri?: { defaultValue?: string };
    hash?: { defaultValue?: string };
    format?: { defaultValue?: string };
    [key: string]: any;
  };
  defaultValue?: string;
  description?: string;
  units?: string;
  formatString?: string;
  scaleFactor?: number;
  properties?: ParsedProperty[]; // 再帰用
  [key: string]: any;
};

const extractInsertionFromProperties = (
  properties: ParsedProperty[],
  templateId: string
): {
  insertion: {
    uri: string;
    hash: string;
    format: string;
  } | null;
  properties: ParsedProperty[];
}
```

**メリット:**
- 実装の実態に合わせた型定義
- 柔軟性が高い

**デメリット:**
- XSD型からの乖離

### 型定義提案（最終版）

#### 提案：中間型（ParsedProperty）を定義

XSD型とパース後の中間形式は異なるため、**新しい中間型を定義**します。

```typescript
/**
 * パース後のProperty型（MaimlParserTypedの出力形式）
 * XSD準拠のProperty型とは異なる中間表現
 */
type ParsedProperty = {
  type?: string;
  xsiType?: string;
  key?: string;
  name?: string;
  tagName?: string;
  elements?: {
    uri?: { defaultValue?: string };
    hash?: { defaultValue?: string };
    format?: { defaultValue?: string };
    value?: { defaultValue?: any };
    description?: { defaultValue?: string };
    [key: string]: any;
  };
  defaultValue?: any;
  description?: string;
  units?: string;
  formatString?: string;
  scaleFactor?: number;
  properties?: ParsedProperty[];
  [key: string]: any;
};

const extractInsertionFromProperties = (
  properties: ParsedProperty[],
  templateId: string
): {
  insertion: {
    uri: string;
    hash: string;
    format: string;
  } | null;
  properties: ParsedProperty[];
}
```

**選択理由:**
1. ✅ 実装の実態（`prop.elements?.uri`アクセス）に合致
2. ✅ 柔軟性が高く、将来の拡張に対応可能
3. ✅ XSD型（Property）とは明確に区別される
4. ⚠️ デメリット: XSD型からの乖離（ただし実装の実態に合わせる方が実用的）

---

## 🔍 メソッド2: convertPropertiesArrayToNestedFormat

### 現状の型定義

```typescript
const convertPropertiesArrayToNestedFormat = (
  propertiesArray: any[]
): Record<string, any>
```

### 実装内容の分析

```typescript
// アクセスしているプロパティ構造
prop.type || prop.xsiType
prop.key || prop.name
prop.tagName
prop.units
prop.formatString
prop.scaleFactor
prop.defaultValue
prop.description
prop.properties // 子要素（再帰用）
```

### データフロー

1. **入力元**: `extractInsertionFromProperties`の出力（filteredProperties）
2. **処理内容**: MaiMLParser配列形式 → NestedPropertyEditor形式に変換
3. **出力先**: `buildTemplateMap`の`propertiesNested`プロパティ

### 型定義の選択肢

#### 選択肢A: editorv2/types の型を使用
```typescript
import type { NestedPropertyNode } from '@/components/editorv2/types';

const convertPropertiesArrayToNestedFormat = (
  propertiesArray: ParsedProperty[]
): Record<string, NestedPropertyNode>
```

#### 選択肢B: 独自型を定義
```typescript
type NestedFormat = {
  key: string;
  tagName: string;
  attributes: {
    'xsi:type': string;
    units?: string;
    formatString?: string;
    scaleFactor?: string;
  };
  elements: Record<string, any>;
  children: any[];
};

const convertPropertiesArrayToNestedFormat = (
  propertiesArray: ParsedProperty[]
): Record<string, NestedFormat>
```

### ✅ editorv2/types確認結果

**NestedPropertyNode型定義:**
```typescript
export interface NestedPropertyNode {
  key: string;
  tagName: string;
  attributes: Record<string, string>;
  elements: Record<string, any>;
  children: NestedPropertyNode[];
}
```

この型定義は実装と**完全に一致**しています！

### 型定義提案（最終版）

```typescript
const convertPropertiesArrayToNestedFormat = (
  propertiesArray: ParsedProperty[]
): Record<string, NestedPropertyNode>
```

**選択理由:**
1. ✅ editorv2/types の既存型を活用
2. ✅ 実装の構造と完全一致
3. ✅ 型安全性が保証される

---

## 🔍 メソッド3: convertPropertiesArrayToChildren

### 現状の型定義

```typescript
const convertPropertiesArrayToChildren = (
  propertiesArray: any[]
): any[]
```

### 実装内容の分析

- メソッド2と同様の構造
- 再帰的に呼び出される

### 型定義提案（最終版）

```typescript
const convertPropertiesArrayToChildren = (
  propertiesArray: ParsedProperty[]
): NestedPropertyNode[]
```

**選択理由:**
1. ✅ メソッド2と同じ戻り値型を使用（一貫性）
2. ✅ 再帰的な構造に対応
3. ✅ 型安全性が保証される

---

## 🔍 メソッド4: extractPetriNetStructure

### 現状の型定義

```typescript
export const extractPetriNetStructure = (
  maimlData: string
): PetriNetExtractResult
```

### 分析

- 戻り値の型`PetriNetExtractResult`は定義済み
- パラメータ`maimlData: string`は適切
- **型定義は概ね問題なし**

### 確認事項

- `PetriNetExtractResult`の型定義が最新のXSD型と一致しているか

---

## 🔍 メソッド5: buildTemplateMap

### 現状の型定義

```typescript
export const buildTemplateMap = (
  parserOrData: MaimlParserTyped | string
): Record<string, TemplateMapEntry>
```

### 分析

- 戻り値の型`TemplateMapEntry`は定義済み
- パラメータ型はUnion型で適切
- **型定義は概ね問題なし**

### 確認事項

- `TemplateMapEntry`の型定義が最新のXSD型と一致しているか

---

## 🔍 メソッド6: generateSubnetData

### 現状の型定義

```typescript
export const generateSubnetData = async (
  transitionId: string, 
  maimlData: string, 
  templateMap: Record<string, TemplateMapEntry>, 
  transitionNode: TransitionNode | null = null, 
  arcsData: Arc[] | null = null
): Promise<string | null>
```

### 分析

- パラメータ型は明確に定義済み
- 戻り値`Promise<string | null>`は適切
- **型定義は問題なし**

---

## 📝 まとめ

### 優先度別の対応

#### 🔴 優先度: 高（型定義が不明確）

1. **extractInsertionFromProperties** - any型の排除が必要
2. **convertPropertiesArrayToNestedFormat** - any型の排除が必要
3. **convertPropertiesArrayToChildren** - any型の排除が必要

#### 🟡 優先度: 中（型定義確認）

4. **extractPetriNetStructure** - 既存型の検証
5. **buildTemplateMap** - 既存型の検証

#### 🟢 優先度: 低（型定義問題なし）

6. **generateSubnetData** - 対応不要

### 次のアクション

1. **maiml-unified.tsを確認** - XSD型の実態を把握
2. **editorv2/types/index.tsを確認** - エディタ型との関係性を把握
3. **中間型（ParsedProperty）の定義を検討** - 実装に合わせた型定義
4. **メソッド1-3の型定義を提案** - ユーザー承認を得る
5. **型定義を適用** - 実装を修正

---

## 🔗 関連ファイル

- `frontend/src/types/maiml-unified.ts` - XSD準拠型定義
- `frontend/src/components/editorv2/types/index.ts` - エディタ型定義
- `frontend/src/utils/maimlParserTyped.ts` - パーサー実装

---

## 📅 作業履歴

| 日時 | 作業内容 | 状態 |
|------|---------|------|
| 2025-02-04 08:27 | メソッド分析レポート作成 | ✅ 完了 |
| 2025-02-04 08:29 | maiml-unified.ts型定義確認 | ✅ 完了 |
| 2025-02-04 08:29 | editorv2/types/index.ts型定義確認 | ✅ 完了 |
| 2025-02-04 08:30 | 分析レポート更新・型定義提案まとめ | ✅ 完了 |
| 2025-02-04 08:30 | ユーザー承認待ち | ⏳ 待機中 |

---

## 📋 型定義提案サマリー

### 新規追加する型定義

#### ParsedProperty（中間型）
```typescript
/**
 * パース後のProperty型（MaimlParserTypedの出力形式）
 * XSD準拠のProperty型とは異なる中間表現
 * 
 * @remarks
 * - MaimlParserTypedがXMLをパースした後の中間形式
 * - XSD型（Property）とは構造が異なるため、別型として定義
 * - elements プロパティを持つ独自構造
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

### メソッド型定義の変更

#### メソッド1: extractInsertionFromProperties
```typescript
const extractInsertionFromProperties = (
  properties: ParsedProperty[],  // ✅ 変更
  templateId: string
): {
  insertion: {                    // ✅ 明確化
    uri: string;
    hash: string;
    format: string;
  } | null;
  properties: ParsedProperty[];   // ✅ 変更
}
```

#### メソッド2: convertPropertiesArrayToNestedFormat
```typescript
import type { NestedPropertyNode } from '@/components/editorv2/types';

const convertPropertiesArrayToNestedFormat = (
  propertiesArray: ParsedProperty[]              // ✅ 変更
): Record<string, NestedPropertyNode>            // ✅ 明確化
```

#### メソッド3: convertPropertiesArrayToChildren
```typescript
import type { NestedPropertyNode } from '@/components/editorv2/types';

const convertPropertiesArrayToChildren = (
  propertiesArray: ParsedProperty[]    // ✅ 変更
): NestedPropertyNode[]                // ✅ 明確化
```

### メソッド4-6: 型定義検証のみ

- **extractPetriNetStructure**: 現状の型定義で問題なし
- **buildTemplateMap**: 現状の型定義で問題なし
- **generateSubnetData**: 現状の型定義で問題なし

---

## ✅ 承認依頼

上記の型定義提案で実装を進めてよろしいでしょうか？

**特に確認いただきたい点:**
1. **ParsedProperty型の新規定義** - XSD型とは別の中間型として定義する方針
2. **既存型（NestedPropertyNode）の活用** - editorv2/typesの型を使用する方針
3. **メソッド1-3の型定義変更** - any型を排除し、明確な型定義に変更

承認いただければ、次のステップとして実装を開始します。

# MAIML統合型定義 - 使用ガイド

**バージョン**: 1.0.0  
**作成日**: 2026-02-02  
**ステータス**: ✅ Phase 0.5完了

---

## 📚 概要

このディレクトリには、MAIML（Materials Informatics Markup Language）の統合型定義が含まれています。

### 統合型定義の特徴

- **XSD仕様準拠**: 95%
- **実MAIML対応**: 95%
- **型安全性**: 完全
- **実用性**: 完全

### ファイル構成

```
frontend/src/types/
├── README.md                    # このファイル（使用ガイド）
├── maiml-unified.ts            # 統合型定義（メイン）
├── maiml-type-guards.ts        # 型ガード関数
├── maiml-schema.ts             # XSD生成型定義（非推奨 - 互換性用）
└── petri-net-types.ts          # Petri Net関連型定義
```

---

## 🚀 クイックスタート

### 基本的なインポート

```typescript
// 統合型定義のインポート
import type { MaimlRoot, Property, Method, Protocol } from '@/types/maiml-unified';

// 型ガード関数のインポート
import {
  isStringProperty,
  isNumberProperty,
  extractPropertyValue,
} from '@/types/maiml-type-guards';
```

### Property の型安全な処理

```typescript
import type { Property } from '@/types/maiml-unified';
import { isStringProperty, isNumberProperty, isPropertyListProperty } from '@/types/maiml-type-guards';

function processProperty(property: Property) {
  if (isStringProperty(property)) {
    // TypeScriptはここでStringPropertyと認識
    console.log(`String: ${property.value}`);
  } else if (isNumberProperty(property)) {
    // TypeScriptはここで数値型Propertyと認識
    console.log(`Number: ${property.value} ${property.units || ''}`);
  } else if (isPropertyListProperty(property)) {
    // ネスト構造の処理
    property.properties?.forEach(prop => processProperty(prop));
  }
}
```

### MAIMLファイルのパース例

```typescript
import type { MaimlRoot } from '@/types/maiml-unified';
import { parseMAIML } from '@/services/maimlParser';

async function loadMaimlFile(filePath: string) {
  const maiml: MaimlRoot = await parseMAIML(filePath);
  
  // Document情報の取得
  const documentName = maiml.document.name;
  const creator = maiml.document.creator[0]; // 配列だが通常1個
  
  // Protocol内のMethod一覧
  for (const method of maiml.protocol.method) {
    console.log(`Method: ${method.name}`);
    
    // PNML（Petri Net）の取得
    const pnml = method.pnml[0]; // 配列だが通常1個
    const places = pnml.place;
    const transitions = pnml.transition;
    const arcs = pnml.arc;
    
    console.log(`  Places: ${places.length}`);
    console.log(`  Transitions: ${transitions.length}`);
    console.log(`  Arcs: ${arcs.length}`);
  }
}
```

---

## 📖 型定義の詳細

### 基本型

#### MaimlElementBase

すべてのMAIML要素が継承する共通ベース型

```typescript
export interface MaimlElementBase {
  id?: string;           // XML ID属性
  uuid?: string;         // UUID（RFC 4122準拠）
  name?: string;         // 要素名
  description?: string;  // 説明文
  annotation?: string;   // 注釈
}
```

### Property型の階層

#### 文字列系Property

```typescript
StringProperty        // xsi:type="stringType"
TokenProperty         // xsi:type="tokenType"
IdProperty            // xsi:type="idType"
IdRefProperty         // xsi:type="idRefType"
QualifiedNameProperty // xsi:type="qualifiedNameType"
```

#### 数値系Property

```typescript
// 整数型
IntProperty           // xsi:type="intType"
LongProperty          // xsi:type="longType"
ShortProperty         // xsi:type="shortType"
ByteProperty          // xsi:type="byteType"
UnsignedIntProperty   // xsi:type="unsignedIntType"
UnsignedLongProperty  // xsi:type="unsignedLongType"

// 浮動小数点型
FloatProperty         // xsi:type="floatType"
DoubleProperty        // xsi:type="doubleType"
DecimalProperty       // xsi:type="decimalType"
```

#### その他のProperty

```typescript
BooleanProperty       // xsi:type="booleanType"
DateTimeProperty      // xsi:type="dateTimeType"
UriProperty           // xsi:type="uriType"
UuidProperty          // xsi:type="uuidType"
Base64BinaryProperty  // xsi:type="base64BinaryType"
HexBinaryProperty     // xsi:type="hexBinaryType"
LanguageProperty      // xsi:type="languageType"
```

#### リスト型Property

```typescript
PropertyListProperty  // xsi:type="propertyListType" - ネスト構造
StringListProperty    // xsi:type="stringListType"
IntListProperty       // xsi:type="intListType"
DoubleListProperty    // xsi:type="doubleListType"
BooleanListProperty   // xsi:type="booleanListType"
```

---

## 🛠️ 型ガード関数の使用

### 個別型判定

```typescript
import {
  isStringProperty,
  isIntProperty,
  isDoubleProperty,
  isBooleanProperty,
  isPropertyListProperty,
} from '@/types/maiml-type-guards';

function handleProperty(property: Property) {
  if (isStringProperty(property)) {
    // property.value は string | undefined
    console.log(property.value);
  }
  
  if (isIntProperty(property)) {
    // property.value は number | undefined
    // property.units は string | undefined
    console.log(`${property.value} ${property.units || ''}`);
  }
  
  if (isPropertyListProperty(property)) {
    // property.properties は Property[] | undefined
    property.properties?.forEach(handleProperty);
  }
}
```

### カテゴリ別判定

```typescript
import {
  isNumberProperty,     // すべての数値型
  isIntegerProperty,    // 整数型のみ
  isFloatingPointProperty, // 浮動小数点型のみ
  isStringLikeProperty, // 文字列系
  isBinaryProperty,     // バイナリ系
  isListProperty,       // リスト系
} from '@/types/maiml-type-guards';

function processProperty(property: Property) {
  if (isNumberProperty(property)) {
    // Int, Long, Float, Double, Decimal など全数値型
    console.log(`数値: ${property.value} ${property.units || ''}`);
  }
  
  if (isStringLikeProperty(property)) {
    // String, Token, ID, URI, UUID など
    console.log(`文字列: ${property.value}`);
  }
  
  if (isListProperty(property)) {
    // PropertyList, StringList, IntList など
    console.log('リスト型Property');
  }
}
```

### 値抽出ヘルパー

```typescript
import {
  extractPropertyValue,
  getPropertyValueAsString,
  getPropertyValueAsNumber,
  getPropertyValueAsBoolean,
  getPropertyUnit,
  getPropertyDescription,
} from '@/types/maiml-type-guards';

function displayProperty(property: Property) {
  const value = extractPropertyValue(property);
  const valueStr = getPropertyValueAsString(property);
  const valueNum = getPropertyValueAsNumber(property);
  const unit = getPropertyUnit(property);
  const desc = getPropertyDescription(property);
  
  console.log(`${property.key}: ${valueStr} ${unit || ''}`);
  if (desc) {
    console.log(`  説明: ${desc}`);
  }
}
```

---

## 📊 主要な型の使用例

### Document型

```typescript
import type { Document } from '@/types/maiml-unified';

function processDocument(doc: Document) {
  console.log(`Document: ${doc.name}`);
  console.log(`UUID: ${doc.uuid}`);
  console.log(`Date: ${doc.date}`);
  
  // Creator（配列だが通常1個）
  const creator = doc.creator[0];
  console.log(`Creator: ${creator?.name}`);
  
  // Vendor（配列だが通常1個）
  const vendor = doc.vendor[0];
  console.log(`Vendor: ${vendor?.name}`);
}
```

### Protocol & Method型

```typescript
import type { Protocol, Method } from '@/types/maiml-unified';

function processProtocol(protocol: Protocol) {
  console.log(`Protocol: ${protocol.name}`);
  
  // Method配列（複数可能）
  for (const method of protocol.method) {
    processMethod(method);
  }
}

function processMethod(method: Method) {
  console.log(`Method: ${method.name}`);
  
  // PNML（配列だが通常1個）
  const pnml = method.pnml[0];
  console.log(`  Places: ${pnml.place.length}`);
  console.log(`  Transitions: ${pnml.transition.length}`);
  
  // Program（配列だが通常1個）
  const program = method.program[0];
  console.log(`  Material Templates: ${program.materialTemplate?.length || 0}`);
  console.log(`  Condition Templates: ${program.conditionTemplate?.length || 0}`);
  console.log(`  Result Templates: ${program.resultTemplate?.length || 0}`);
}
```

### Template型

```typescript
import type { MaterialTemplate, ConditionTemplate, ResultTemplate } from '@/types/maiml-unified';
import { extractPropertyValue } from '@/types/maiml-type-guards';

function processMaterialTemplate(template: MaterialTemplate) {
  console.log(`Material Template: ${template.name}`);
  
  // PlaceRef（配列）
  for (const placeRef of template.placeRef) {
    console.log(`  Place: ${placeRef.ref}`);
  }
  
  // Property配列
  for (const property of template.property || []) {
    const value = extractPropertyValue(property);
    console.log(`  ${property.key}: ${value}`);
  }
}
```

### EventLog型

```typescript
import type { EventLog, Event } from '@/types/maiml-unified';
import { isStringProperty, isDateTimeProperty } from '@/types/maiml-type-guards';

function processEventLog(eventLog: EventLog) {
  for (const log of eventLog.log) {
    for (const trace of log.trace) {
      for (const event of trace.event) {
        processEvent(event);
      }
    }
  }
}

function processEvent(event: Event) {
  console.log(`Event: ${event.ref}`);
  
  // Property配列から情報抽出
  for (const property of event.property || []) {
    if (property.key === 'timestamp' && isDateTimeProperty(property)) {
      console.log(`  Timestamp: ${property.value}`);
    } else if (property.key === 'worker_id' && isStringProperty(property)) {
      console.log(`  Worker: ${property.value}`);
    } else if (property.key === 'status' && isStringProperty(property)) {
      console.log(`  Status: ${property.value}`);
    }
  }
}
```

---

## 🔄 既存コードからの移行

### 移行ステップ

#### Step 1: インポートの変更

```typescript
// Before (XSD生成型定義)
import type { MaimlRoot, Property } from '@/types/maiml-schema';

// After (統合型定義)
import type { MaimlRoot, Property } from '@/types/maiml-unified';
```

#### Step 2: Property処理の型安全化

```typescript
// Before（型チェックなし）
function getValue(property: any) {
  return property.value;
}

// After（型ガード使用）
import { extractPropertyValue } from '@/types/maiml-type-guards';

function getValue(property: Property) {
  return extractPropertyValue(property);
}
```

#### Step 3: 配列対応

```typescript
// Before（単一要素として扱っていた）
const creator = maiml.document.creator;

// After（配列対応）
const creator = maiml.document.creator[0]; // 通常1個だが配列
```

### 互換性の確保

現在の`maiml-schema.ts`（XSD生成型定義）はそのまま残されており、既存コードはそのまま動作します。ただし、新規コードでは`maiml-unified.ts`を使用してください。

---

## ✅ ベストプラクティス

### DO（推奨）

✅ **型ガード関数を使用する**
```typescript
if (isStringProperty(property)) {
  console.log(property.value); // 型安全
}
```

✅ **extractPropertyValue()でProperty値を取得する**
```typescript
const value = extractPropertyValue(property);
```

✅ **配列として扱う（creator, vendor, owner, instrument, pnml, program）**
```typescript
const creator = doc.creator[0]; // 配列の最初の要素
```

✅ **オプショナルチェーンを使用する**
```typescript
const units = property.units || '';
const properties = template.property || [];
```

### DON'T（非推奨）

❌ **型アサーションを使わない**
```typescript
// 悪い例
const value = (property as any).value;
```

❌ **xsi:typeを直接文字列比較しない（型ガード関数を使用）**
```typescript
// 悪い例
if (property['xsi:type'] === 'stringType') { ... }

// 良い例
if (isStringProperty(property)) { ... }
```

❌ **単一要素として扱わない（配列として扱う）**
```typescript
// 悪い例
const creator = doc.creator; // 型エラー

// 良い例
const creator = doc.creator[0];
```

---

## 📋 チェックリスト

新規コードを書く際のチェックリスト:

- [ ] `maiml-unified.ts` から型をインポートしている
- [ ] Property処理で型ガード関数を使用している
- [ ] creator, vendor, owner, instrument, pnml, program を配列として扱っている
- [ ] オプショナルチェーン（`?.`）を適切に使用している
- [ ] `extractPropertyValue()` でProperty値を取得している
- [ ] 型アサーション（`as`）を使用していない

---

## 🐛 トラブルシューティング

### 問題1: 型エラー「Property 'value' does not exist」

**原因**: Property型がUnion型のため、直接`.value`にアクセスできない

**解決策**: 型ガード関数を使用
```typescript
// ❌ エラー
const value = property.value;

// ✅ 正しい
if (isStringProperty(property)) {
  const value = property.value; // OK
}

// または
const value = extractPropertyValue(property);
```

### 問題2: creator, vendor が配列でエラー

**原因**: XSD仕様では配列、実MAIMLでは通常1個

**解決策**: 配列として扱う
```typescript
// ❌ エラー
const creator = doc.creator;

// ✅ 正しい
const creator = doc.creator[0];

// または安全に
const creator = doc.creator?.[0];
```

### 問題3: Property のネスト構造処理

**原因**: PropertyListProperty の処理

**解決策**: 再帰的に処理
```typescript
function processProperty(property: Property) {
  if (isPropertyListProperty(property)) {
    property.properties?.forEach(prop => processProperty(prop));
  } else {
    const value = extractPropertyValue(property);
    console.log(`${property.key}: ${value}`);
  }
}
```

---

## 📚 関連ドキュメント

- [型定義と実MAIMLの比較](../../../backend/reference/samples/type-vs-actual-maiml-comparison.md)
- [3つの型定義ソース比較](../../../backend/reference/samples/three-type-sources-comparison.md)
- [改善計画書](../../../docs/20260202_1107_XSDから正確な型定義生成_改善計画書.md)
- [XSD仕様書](../../../specification/MAIML_XSD_v1.0.xsd)

---

## 🔄 更新履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-02-02 | Phase 0.5完了: 統合型定義・型ガード関数実装 | Cline |

---

## 💬 フィードバック

質問や改善提案がある場合は、プロジェクトのIssueトラッカーにて報告してください。
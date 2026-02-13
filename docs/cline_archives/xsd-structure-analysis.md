# XSD構造分析書

**作成日**: 2026-02-02  
**Phase**: Phase 2完了  
**バージョン**: 1.0.0

---

## 📋 概要

MAIML XSDスキーマの完全な構造分析結果を記録します。型生成スクリプト改善の基礎資料として使用します。

---

## 🗂️ XSDファイル構成

### ファイル一覧

```
backend/reference/schemas/
├── maiml.xsd                   # メインスキーマ（エントリーポイント）
├── maiml-core.xsd             # コア定義（globalObjectContentGroup等）
├── maiml-property.xsd         # Property型定義（最重要）
├── maiml-document.xsd         # Document要素定義
├── maiml-protocol.xsd         # Protocol/Method定義
├── maiml-data.xsd             # Data要素定義
├── maiml-eventLog.xsd         # EventLog定義
├── maiml-pnml.xsd             # Petri Net定義
├── maiml-helper.xsd           # ヘルパー型
├── maiml-refTypes.xsd         # 参照型定義
├── maiml-simpleTypes.xsd      # 単純型定義
└── xmldsig/xenc関連.xsd       # XML署名・暗号化
```

### インポート構造

```
maiml.xsd (メイン)
  ├─ include → maiml-simpleTypes.xsd
  ├─ include → maiml-property.xsd
  ├─ include → maiml-core.xsd
  ├─ include → maiml-document.xsd
  ├─ include → maiml-protocol.xsd
  ├─ include → maiml-data.xsd
  └─ include → maiml-eventLog.xsd
```

---

## 🔍 重要な発見

### 1. globalObjectContentGroup（最重要）

**場所**: `maiml-core.xsd`

**定義**:
```xml
<xs:group name="globalObjectContentGroup">
  <xs:sequence>
    <xs:element name="uuid" type="uuid" />
    <xs:choice>
      <xs:group ref="encryptionGroup" />
      <xs:sequence>
        <xs:element name="insertion" type="insertionType" minOccurs="0" maxOccurs="unbounded" />
        <xs:element name="name" type="xs:QName" minOccurs="0" />
        <xs:element name="description" type="xs:string" minOccurs="0" />
        <xs:element name="annotation" type="xs:string" minOccurs="0" />
        <xs:group ref="genericDataContainerGroup" />
      </xs:sequence>
    </xs:choice>
  </xs:sequence>
</xs:group>
```

**含まれる要素**:
- ✅ `uuid` (必須)
- ✅ `name` (オプション)
- ✅ `description` (オプション)
- ✅ `annotation` (オプション)
- ✅ `insertion` (配列、オプション)
- ✅ `genericDataContainerGroup` (property/content配列)

**重要性**: これがすべてのMAIMLオブジェクトの共通ベースとなるべきだが、現行の型生成スクリプトでは**反映されていない**

---

### 2. Property型の完全な定義

**場所**: `maiml-property.xsd`

#### 単一値Property型の共通構造

すべての単一値Property型（string, int, double等）は以下の構造を持つ：

```xml
<xs:complexType name="stringType">
  <xs:complexContent>
    <xs:extension base="propertyBaseType">
      <xs:choice>
        <xs:sequence>
          <xs:element name="description" type="xs:string" minOccurs="0" />
          <xs:element name="value" minOccurs="0" type="xs:string" />
          <xs:element name="uncertainty" minOccurs="0" maxOccurs="unbounded" type="uncertaintyBaseType" />
          <xs:group ref="genericDataContainerGroup" />
        </xs:sequence>
        <xs:group ref="encryptionGroup" />
      </xs:choice>
    </xs:extension>
  </xs:complexContent>
</xs:complexType>
```

**含まれる子要素**:
- ✅ `description` (オプション) - Property自体の説明
- ✅ `value` (オプション) - 実際の値
- ✅ `uncertainty` (配列、オプション) - 不確実性情報
- ✅ `property` (配列、オプション) - ネストされたProperty（genericDataContainerGroup経由）
- ✅ `content` (配列、オプション) - コンテンツ（genericDataContainerGroup経由）

**数値型のみの追加属性**:
```xml
<xs:attribute name="formatString" type="integerFormatStringType" />
<xs:attribute name="units" type="xs:string" />
<xs:attribute name="scaleFactor" type="xs:double" />
```

#### 定義されているProperty型（全30種類）

**文字列系 (8種類)**:
1. `stringType` - 通常の文字列
2. `tokenType` - トークン（空白正規化）
3. `idType` - ID型
4. `idRefType` - ID参照型
5. `qualifiedNameType` - 修飾名
6. `uriType` - URI
7. `uuidType` - UUID
8. `languageType` - 言語コード

**整数型 (8種類)**:
9. `intType` - 32bit整数
10. `longType` - 64bit整数
11. `shortType` - 16bit整数
12. `byteType` - 8bit整数
13. `unsignedIntType` - 符号なし32bit整数
14. `unsignedLongType` - 符号なし64bit整数
15. `unsignedShortType` - 符号なし16bit整数
16. `unsignedByteType` - 符号なし8bit整数

**浮動小数点型 (3種類)**:
17. `floatType` - 単精度浮動小数点
18. `doubleType` - 倍精度浮動小数点
19. `decimalType` - 十進数

**その他 (4種類)**:
20. `booleanType` - 真偽値
21. `dateTimeType` - 日時
22. `base64BinaryType` - Base64エンコードバイナリ
23. `hexBinaryType` - 16進数バイナリ

**リスト型 (7種類 + propertyListType)**:
24. `propertyListType` - ネストされたProperty配列
25. `stringListType` - 文字列配列
26. `intListType` - 整数配列
27. `doubleListType` - 浮動小数点配列
28. `booleanListType` - 真偽値配列
29. `stringEnumType` - 列挙型（文字列の選択肢）
30. その他多数のList型（idRefList, qualifiedNameList等）

---

### 3. 基底型の階層構造

```
uncertaintyBaseType (抽象)
  └─ propertyBaseType (抽象)
      ├─ stringType
      ├─ intType
      ├─ doubleType
      ├─ propertyListType
      └─ ... (全Property型)

hasIdAttributeType (抽象)
  ├─ simpleObjectType (抽象)
  │   ├─ referenceObjectType (抽象)
  │   └─ tripleObjectType (抽象)
  └─ ... (多くのコア型で使用)
```

**propertyBaseType**:
```xml
<xs:complexType name="propertyBaseType" abstract="true">
  <xs:complexContent>
    <xs:extension base="uncertaintyBaseType" />
  </xs:complexContent>
</xs:complexType>
```

**uncertaintyBaseType**:
```xml
<xs:complexType name="uncertaintyBaseType" abstract="true">
  <xs:attribute name="key" use="required" type="xs:QName" />
</xs:complexType>
```

→ すべてのProperty型は`key`属性を持つ

---

### 4. genericDataContainerGroup

**場所**: `maiml-property.xsd`

**定義**:
```xml
<xs:group name="genericDataContainerGroup">
  <xs:sequence>
    <xs:element name="property" minOccurs="0" maxOccurs="unbounded" type="propertyBaseType" />
    <xs:element name="content" minOccurs="0" maxOccurs="unbounded" type="contentBaseType" />
  </xs:sequence>
</xs:group>
```

**重要性**:
- すべてのProperty型にネストされたpropertyを持たせることができる
- `globalObjectContentGroup`にも含まれる
- つまり、**すべてのMAIMLオブジェクトはproperty配列を持つ**

---

### 5. xs:choice要素の使用

多くの型で`xs:choice`が使用されている：

```xml
<xs:choice>
  <xs:sequence>
    <!-- 通常のコンテンツ -->
  </xs:sequence>
  <xs:group ref="encryptionGroup" />
</xs:choice>
```

**意味**: 通常のコンテンツ **または** 暗号化コンテンツのどちらか

**TypeScript型への変換**:
```typescript
// ❌ Union型にすべきではない（暗号化は特殊ケース）
// ✅ 通常のコンテンツのみを型定義に含める
```

---

## 📊 型生成スクリプトが見逃している点

### 問題1: globalObjectContentGroupが反映されない

**原因推定**:
- `xs:group`要素の処理が未実装
- または、グループ要素をインターフェースに展開する処理がない

**影響**:
- `uuid`, `name`, `description`, `annotation` が型定義に含まれない
- 実MAIMLファイルとの齟齬が発生

**解決策**:
```typescript
// 型生成スクリプトで以下を実装する必要がある
function processGroupElement(groupElement: any): TypeScriptProperties {
  // xs:group要素を解析
  // 内部のxs:sequence/xs:choiceを展開
  // プロパティのリストを返す
}
```

---

### 問題2: Property型のvalue要素が反映されない

**原因推定**:
- `xs:choice`要素内のxs:sequenceが処理されていない
- またはabstract="true"の基底型を継承した型の処理が不完全

**影響**:
- Property型が`key`属性のみになってしまう
- 実用性が著しく低下（40%）

**解決策**:
```typescript
// xs:extension + xs:choice + xs:sequence の組み合わせを正しく処理
function processComplexTypeExtension(extension: any): TypeScriptInterface {
  // base属性から基底型を取得
  // xs:choice内のxs:sequenceを解析
  // すべてのxs:elementを型プロパティとして追加
}
```

---

### 問題3: 配列要素の処理

**XSD上の配列定義**:
```xml
<xs:element name="property" minOccurs="0" maxOccurs="unbounded" type="propertyBaseType" />
```

**正しいTypeScript型**:
```typescript
property?: Property[];  // 配列
```

**現行の型生成結果（推測）**:
```typescript
property?: Property;  // 単一 ← 間違い
```

**解決策**:
- `maxOccurs="unbounded"`を検出したら配列型にする

---

## 🎯 Phase 3での実装ポイント

### 優先度1: xs:group要素の処理実装

```typescript
/**
 * xs:group要素を処理してTypeScriptプロパティに変換
 */
function processGroupElement(
  groupElement: any,
  allGroups: Map<string, any>
): TypeScriptProperty[] {
  const groupName = groupElement.$.name || groupElement.$.ref;
  
  if (groupElement.$.ref) {
    // 参照の場合、グループ定義を取得
    const referencedGroup = allGroups.get(groupElement.$.ref);
    return processGroupElement(referencedGroup, allGroups);
  }
  
  // xs:sequence または xs:choice を処理
  const sequence = groupElement['xs:sequence'];
  const choice = groupElement['xs:choice'];
  
  if (sequence) {
    return processSequence(sequence[0], allGroups);
  } else if (choice) {
    return processChoice(choice[0], allGroups);
  }
  
  return [];
}
```

### 優先度2: xs:choice要素の適切な処理

```typescript
/**
 * xs:choice要素を処理
 * - 通常コンテンツとencryptionGroupの二択の場合、通常コンテンツを採用
 * - その他の場合、Union型またはオプショナルプロパティにする
 */
function processChoice(
  choiceElement: any,
  allGroups: Map<string, any>
): TypeScriptProperty[] {
  const sequences = choiceElement['xs:sequence'] || [];
  const groups = choiceElement['xs:group'] || [];
  
  // encryptionGroupを含むか確認
  const hasEncryption = groups.some(g => g.$.ref === 'encryptionGroup');
  
  if (hasEncryption && sequences.length === 1) {
    // 通常のコンテンツのみを採用
    return processSequence(sequences[0], allGroups);
  }
  
  // その他の場合はすべてのオプションを処理
  const allProperties: TypeScriptProperty[] = [];
  
  for (const seq of sequences) {
    allProperties.push(...processSequence(seq, allGroups));
  }
  
  for (const grp of groups) {
    if (grp.$.ref !== 'encryptionGroup') {
      allProperties.push(...processGroupElement(grp, allGroups));
    }
  }
  
  return allProperties;
}
```

### 優先度3: xs:extension要素の処理改善

```typescript
/**
 * xs:extension要素を処理して継承関係を構築
 */
function processExtension(
  extensionElement: any,
  allTypes: Map<string, any>,
  allGroups: Map<string, any>
): {
  baseType: string;
  properties: TypeScriptProperty[];
} {
  const baseType = extensionElement.$.base;
  const properties: TypeScriptProperty[] = [];
  
  // xs:sequence, xs:choice, xs:group を処理
  const sequence = extensionElement['xs:sequence'];
  const choice = extensionElement['xs:choice'];
  const groups = extensionElement['xs:group'];
  
  if (sequence) {
    properties.push(...processSequence(sequence[0], allGroups));
  }
  
  if (choice) {
    properties.push(...processChoice(choice[0], allGroups));
  }
  
  if (groups) {
    for (const grp of groups) {
      properties.push(...processGroupElement(grp, allGroups));
    }
  }
  
  // 属性も処理
  const attributes = extensionElement['xs:attribute'] || [];
  for (const attr of attributes) {
    properties.push(processAttribute(attr));
  }
  
  return { baseType, properties };
}
```

---

## 📋 XSD要素とTypeScript型の対応表

| XSD要素 | TypeScript型 | 例 |
|---------|-------------|-----|
| `xs:string` | `string` | `name?: string;` |
| `xs:int` | `number` | `value?: number;` |
| `xs:double` | `number` | `value?: number;` |
| `xs:boolean` | `boolean` | `value?: boolean;` |
| `xs:dateTime` | `string` | `value?: string;` |
| `xs:QName` | `string` | `key: string;` |
| `xs:anyURI` | `string` | `uri?: string;` |
| `xs:ID` | `string` | `id: string;` |
| `xs:IDREF` | `string` | `ref: string;` |
| `xs:base64Binary` | `string` | `value?: string;` |
| `minOccurs="0"` | `?` (optional) | `property?: ...` |
| `maxOccurs="unbounded"` | `[]` (array) | `property?: Property[];` |
| `use="required"` | 必須 | `key: string;` |
| `abstract="true"` | `interface` (抽象) | 継承用のみ |

---

## 🔄 型定義の正しい構造（Phase 0.5で作成済み）

Phase 0.5で作成した`frontend/src/types/maiml-unified.ts`は、XSD仕様の以下の点を正しく反映しています：

### ✅ 正しく反映されている点

1. **MaimlElementBase**（globalObjectContentGroup相当）:
   ```typescript
   export interface MaimlElementBase {
     id?: string;
     uuid?: string;
     name?: string;
     description?: string;
     annotation?: string;
   }
   ```

2. **Property型の細分化**（30種類のProperty型）:
   ```typescript
   export interface StringProperty {
     'xsi:type': 'stringType';
     key: string;
     value?: string;
     description?: string;
     // ...
   }
   ```

3. **配列対応**:
   ```typescript
   export interface Document extends MaimlElementBase {
     creator: Creator[];  // XSD: maxOccurs="unbounded"
     vendor: Vendor[];
     // ...
   }
   ```

### ⚠️ XSDとの差異（意図的な簡略化）

1. **uncertainty要素**: 省略（実MAIMLで未使用）
2. **content要素**: 省略（実MAIMLで未使用）
3. **encryptionGroup**: 省略（特殊ケースのため）
4. **insertion要素**: 省略（実MAIMLで未使用）

---

## 📚 次のステップ（Phase 3）

Phase 3「型生成スクリプト改善」で実装すべきこと：

### Step 3-1: xs:group要素の処理実装（2日）
- `processGroupElement()`関数の実装
- グループ参照の解決
- ネストされたグループの処理

### Step 3-2: xs:choice要素の適切な処理（1日）
- `processChoice()`関数の実装
- encryptionGroupの特別扱い
- 通常コンテンツの優先採用

### Step 3-3: xs:extension要素の処理改善（2日）
- `processExtension()`関数の改善
- 継承関係の正しい構築
- プロパティのマージ

### Step 3-4: 配列要素の正しい検出（1日）
- `maxOccurs="unbounded"`の検出
- TypeScript配列型への変換

### Step 3-5: 統合テスト（1日）
- 生成された型定義と統合型定義の比較
- 実MAIMLファイルでのバリデーション

---

## ✅ 結論

### Phase 2で判明したこと

1. ✅ **XSD仕様は完璧**: すべての必要な要素が定義されている
2. ✅ **globalObjectContentGroup存在確認**: uuid, name, description等を含む
3. ✅ **Property型の完全な定義確認**: value, description要素が存在
4. ❌ **型生成スクリプトの問題**: xs:group, xs:choice, xs:extensionの処理が不完全

### Phase 3への移行準備

- ✅ XSD構造の完全理解
- ✅ 問題点の特定
- ✅ 解決策の明確化
- ✅ 実装優先度の決定

**Phase 2完了 - Phase 3へ移行可能**
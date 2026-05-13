# XML変換処理調査レポート

## 調査概要

- **調査日時**: 2026-02-26 18:00
- **調査目的**: ソース全体で画面入力内容をXML形式に書き起こす処理を特定
- **調査範囲**: フロントエンド（frontend/src）、バックエンド（backend/src）

## 調査結果サマリー

**発見したXML変換処理: 4ファイル**

すべてフロントエンドに存在し、バックエンドにはXML生成処理は見つかりませんでした。

---

## 詳細調査結果

### 1. frontend/src/utils/maimlGenerator.ts

#### 概要
React FlowのノードとエッジからMAIML XML形式を生成する基本的な変換ユーティリティ。

#### 主要関数

##### 1.1 `generateMaimlXml()`
- **目的**: Petri NetエディタのノードとエッジをMAIML XMLに変換
- **入力**: 
  - `nodes: Node[]` - React Flowノード配列
  - `edges: Edge[]` - React Flowエッジ配列
  - `documentInfo: DocumentInfo` - ドキュメント情報
- **出力**: MAIML XML文字列

##### 1.2 XML生成内容
```xml
<?xml version="1.0" encoding="UTF-8"?>
<maiml xmlns="http://www.example.com/maiml" version="1.0">
  <document id="...">
    <name>...</name>
    <description>...</description>
    <date>...</date>
    <creator id="...">...</creator>
  </document>
  <method id="...">
    <name>Method 1</name>
    <pnml>
      <net id="..." type="...">
        <page id="...">
          <place id="...">
            <name>...</name>
            <graphics>
              <position x="..." y="..."/>
            </graphics>
          </place>
          <transition id="...">
            <name>...</name>
            <graphics>
              <position x="..." y="..."/>
            </graphics>
          </transition>
          <arc id="..." source="..." target="...">
            <name>...</name>
          </arc>
        </page>
      </net>
    </pnml>
    <materialTemplate id="...">
      <name>...</name>
      <description>...</description>
      <placeRef ref="..."/>
    </materialTemplate>
    <conditionTemplate id="...">
      <name>...</name>
      <description>...</description>
      <placeRef ref="..."/>
    </conditionTemplate>
    <resultTemplate id="...">
      <name>...</name>
      <description>...</description>
      <placeRef ref="..."/>
    </resultTemplate>
  </method>
</maiml>
```

##### 1.3 特徴
- **シンプルな構造**: 基本的なPNML構造とテンプレートのみ生成
- **自己閉じタグ**: `<position x="..." y="..."/>` など一部使用
- **エスケープ処理**: `escapeXml()` 関数でXML特殊文字をエスケープ

---

### 2. frontend/src/utils/xmlConverter.ts

#### 概要
Template型オブジェクトをXML文字列に変換する専門的なコンバーター。テンプレート編集画面での使用を想定。

#### 主要関数

##### 2.1 `convertTemplateToXml()`
- **目的**: Template型オブジェクトをXML文字列に変換
- **入力**:
  - `template: Template` - Templateオブジェクト
  - `templateType: 'material' | 'condition' | 'result'` - テンプレートタイプ
- **出力**: XML文字列

##### 2.2 XML生成内容
```xml
<?xml version="1.0" encoding="UTF-8"?>
<materialTemplate id="..." uuid="...">
  <name>...</name>
  <description>...</description>
  <property key="..." xsi:type="..." units="..." formatString="..." scaleFactor="...">
    <value>...</value>
    <description>...</description>
    <property key="..." xsi:type="...">
      ...（再帰的にネスト）
    </property>
    <content key="..." xsi:type="..." axis="..." size="...">
      ...（再帰的にネスト）
    </content>
  </property>
  <content key="..." xsi:type="..." axis="..." size="...">
    <value>...</value>
    <description>...</description>
    <property key="..." xsi:type="...">
      ...（再帰的にネスト）
    </property>
    <content key="..." xsi:type="...">
      ...（再帰的にネスト）
    </content>
    <uncertainty>
      <content key="..." xsi:type="...">
        ...
      </content>
    </uncertainty>
  </content>
  <insertion uri="..." format="...">
    <hash method="...">...</hash>
  </insertion>
  <placeRef id="..." role="..." />
</materialTemplate>
```

##### 2.3 特徴
- **自己閉じタグの判定**:
  ```typescript
  const hasValue = prop.value !== undefined && prop.value !== null && prop.value !== '';
  const hasDescription = prop.description !== undefined && prop.description !== null && prop.description !== '';
  const hasCustomElements = prop.customElements && Object.keys(prop.customElements).length > 0;
  const hasChildren = (prop.properties && prop.properties.length > 0) || 
                      (prop.contents && prop.contents.length > 0);
  
  if (!hasValue && !hasDescription && !hasCustomElements && !hasChildren) {
    xml += ' />\n';  // 自己閉じタグ
  } else {
    xml += '>\n';    // 通常の開始タグ
    // ...子要素
    xml += '</property>\n';  // 閉じタグ
  }
  ```
- **再帰的構造**: propertyとcontentが入れ子になる複雑な構造に対応
- **XSD型定義準拠**: xsi:type属性で型情報を保持
- **エスケープ処理**: すべての値にXMLエスケープを適用

##### 2.4 サブ関数

**`convertPropertyToXml()`**
- property要素を再帰的にXML化
- 子property、子contentを再帰的に処理
- customElementsもサポート

**`convertContentToXml()`**
- content要素を再帰的にXML化
- 子property、子content、uncertaintyを再帰的に処理
- axis、size、units、formatString等の属性をサポート

##### 2.5 逆変換関数

**`convertXmlToTemplate()`**
- XML文字列をTemplate型オブジェクトに変換
- DOMParserでXMLをパース
- 名前空間宣言が不足している場合は自動追加
- property/content要素を再帰的に解析

---

### 3. frontend/src/utils/converters/reactFlowToMaiml.ts

#### 概要
React FlowのノードとエッジからMaiML XML形式に変換する包括的なコンバーター。商用レベルの完全なMAIML構造を生成。

#### 主要関数

##### 3.1 `convertReactFlowToMaiML()`
- **目的**: 完全なMAIML XMLドキュメントを生成
- **入力**:
  - `nodes: Node[]` - React Flowノード配列
  - `edges: Edge[]` - React Flowエッジ配列
  - `metadata: { name?, description? }` - メタデータ
  - `documentData: DocumentData | null` - Document情報
  - `originalStructure: MaiMLStructure | null` - 元MAIML構造情報
- **出力**: 完全なMAIML XML文字列

##### 3.2 XML生成内容
```xml
<?xml version="1.0" encoding="utf-8" standalone="no"?>
<maiml version="1.0" xmlns="http://www.maiml.org/schemas" 
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
       xsi:schemaLocation="http://www.maiml.org/schemas maiml.xsd">
  <document id="...">
    <name>...</name>
    <uuid>...</uuid>
    <description>...</description>
    <date>...</date>
    <creator id="...">
      <name>...</name>
      <uuid>...</uuid>
      <description>...</description>
      <annotation>...</annotation>
      <vendorRef id="..." ref="..." />
      <instrumentRef id="..." ref="..." />
    </creator>
    <vendor id="...">
      <name>...</name>
      <uuid>...</uuid>
      <description>...</description>
      <annotation>...</annotation>
    </vendor>
    <owner id="...">
      <name>...</name>
      <uuid>...</uuid>
      <description>...</description>
      <annotation>...</annotation>
    </owner>
    <instrument id="...">
      <name>...</name>
      <uuid>...</uuid>
      <description>...</description>
      <annotation>...</annotation>
    </instrument>
  </document>
  <protocol id="...">
    <uuid>...</uuid>
    <!-- 共通テンプレート（複数placeRef対応） -->
    <materialTemplate id="...">
      <uuid>...</uuid>
      <templateRef id="..." ref="..." />
      <insertion>
        <uri>...</uri>
        <hash>...</hash>
        <format>...</format>
      </insertion>
      <name>...</name>
      <description>...</description>
      <property key="..." xsi:type="..." units="..." formatString="..." scaleFactor="...">
        ...（再帰的にネスト）
      </property>
      <placeRef id="..." ref="..." />
      <placeRef id="..." ref="..." />
      ...（複数のplaceRef）
    </materialTemplate>
    <conditionTemplate id="...">
      ...（同上）
    </conditionTemplate>
    <resultTemplate id="...">
      ...（同上）
    </resultTemplate>
    <method id="...">
      <uuid>...</uuid>
      <pnml id="...">
        <uuid>...</uuid>
        <name>...</name>
        <description>...</description>
        <place id="...">
          <name>...</name>
          <description>...</description>
        </place>
        <place id="..." />
        <transition id="...">
          <name>...</name>
          <description>...</description>
        </transition>
        <transition id="..." />
        <arc id="..." source="..." target="...">
        </arc>
      </pnml>
      <program id="...">
        <uuid>...</uuid>
        <description>...</description>
        <instruction id="...">
          <uuid>...</uuid>
          <description>...</description>
          <transitionRef id="..." ref="..."/>
        </instruction>
        <!-- 通常テンプレート -->
        <materialTemplate id="...">
          ...
        </materialTemplate>
        <conditionTemplate id="...">
          ...
        </conditionTemplate>
        <resultTemplate id="...">
          ...
        </resultTemplate>
      </program>
    </method>
  </protocol>
  <data id="...">
  </data>
  <eventLog id="...">
  </eventLog>
</maiml>
```

##### 3.3 特徴
- **完全なMAIML構造**: document、protocol、method、pnml、program、data、eventLog要素を含む
- **共通テンプレート対応**: 
  - `isCommonTemplate`フラグで共通テンプレートを識別
  - protocol直下に共通テンプレートを配置
  - 複数のplaceRefを出力（複数ノードから参照される場合）
- **テンプレート継承**: `templateRef`要素で継承関係を表現
- **UUID生成**: 各要素にUUIDを自動生成
- **自己閉じタグの条件**:
  ```typescript
  const hasName = place.data.name && place.data.name.trim() !== '';
  const hasDescription = place.data.description && 
    place.data.description !== 'インポート済み' && 
    place.data.description !== '既存プレース' && 
    place.data.description !== 'imported' &&
    place.data.description.trim() !== '';
  
  if (hasName || hasDescription) {
    xml += `<place id="${escapeXml(place.id)}">\n`;
    // ...子要素
    xml += `</place>\n`;
  } else {
    xml += `<place id="${escapeXml(place.id)}"/>\n`;  // 自己閉じタグ
  }
  ```

##### 3.4 サブ関数

**`buildDocumentXML()`**
- Document要素のXMLを生成
- creator、vendor、owner、instrument要素を配列対応で生成

**`buildPropertyXML()`**
- property要素を再帰的に出力
- propertyListType、content、contentDoubleListType等に対応
- インデントレベルを管理

**`buildContentXML()`**
- content要素を出力
- axis、formatString、id、key、scaleFactor、size、units等の属性をサポート

**`buildCommonTemplateXML()`**
- 共通テンプレートのXMLを生成（protocol直下用）
- 複数のplaceRefを出力
- テンプレート継承（templateRef）をサポート

**`validatePetriNet()`**
- ペトリネット構造のバリデーション
- ノード存在チェック、エッジ接続先チェック、Place-Transition制約チェック

**`getGraphStatistics()`**
- ノード・エッジの統計情報を取得

---

### 4. frontend/src/utils/converters/multiMethodConverter.ts

#### 概要
複数method要素を持つMaiMLファイルの生成を専門とするコンバーター。マルチメソッドMAIMLファイルの作成に特化。

#### 主要関数

##### 4.1 `convertMultipleMethodsToMaiML()`
- **目的**: 複数methodを含むMAIML XMLドキュメントを生成
- **入力**:
  - `methods: MethodInfo[]` - methods配列（各methodにnodes, edges, methodIdを含む）
  - `metadata: { name?, description? }` - メタデータ
  - `documentData: DocumentData | null` - Document情報
- **出力**: 複数methodを含むMAIML XML文字列

##### 4.2 XML生成内容
```xml
<?xml version="1.0" encoding="utf-8" standalone="no"?>
<maiml version="1.0" xmlns="http://www.maiml.org/schemas" 
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
       xsi:schemaLocation="http://www.maiml.org/schemas maiml.xsd">
  <document id="...">
    ...
  </document>
  <protocol id="...">
    <uuid>...</uuid>
    <!-- 全methodsから収集した共通テンプレート（重複除外） -->
    <materialTemplate id="...">
      <uuid>...</uuid>
      <templateRef id="..." ref="..." />
      <insertion>
        <uri>...</uri>
        <hash>...</hash>
        <format>...</format>
      </insertion>
      <name>...</name>
      <description>...</description>
      <property key="..." xsi:type="...">
        ...
      </property>
      <placeRef id="..." ref="..." />
      <placeRef id="..." ref="..." />
      ...（複数のplaceRef）
    </materialTemplate>
    <conditionTemplate id="...">
      ...（同上）
    </conditionTemplate>
    <resultTemplate id="...">
      ...（同上）
    </resultTemplate>
    <!-- Method 1 -->
    <method id="method_1">
      <uuid>...</uuid>
      <pnml id="pnml_method_1">
        <uuid>...</uuid>
        <name>document_method_1</name>
        <place id="..." />
        <place id="...">
          <description>...</description>
        </place>
        <transition id="..."/>
        <arc id="..." source="..." target="...">
        </arc>
      </pnml>
      <program id="program_method_1">
        <uuid>...</uuid>
        <instruction id="...">
          <uuid>...</uuid>
          <description>...</description>
          <transitionRef id="TR_..." ref="..."/>
        </instruction>
        <!-- Method 1の通常テンプレート -->
        <materialTemplate id="...">
          ...
        </materialTemplate>
        <conditionTemplate id="...">
          ...
        </conditionTemplate>
        <resultTemplate id="...">
          ...
        </resultTemplate>
      </program>
    </method>
    <!-- Method 2 -->
    <method id="method_2">
      ...（同上）
    </method>
    ...（複数のmethod要素）
  </protocol>
  <data id="dataID">
  </data>
  <eventLog id="eventLogID">
  </eventLog>
</maiml>
```

##### 4.3 特徴
- **複数method対応**: 1つのprotocol要素内に複数のmethod要素を生成
- **共通テンプレートの重複除外**:
  ```typescript
  const seenTemplateIds = new Set<string>();
  methods.forEach(method => {
    commonTemplatesInMethod.forEach(node => {
      const templateId = template.templateId || template.id || `Common${prefix}${node.id}`;
      if (!seenTemplateIds.has(templateId)) {
        seenTemplateIds.add(templateId);
        allCommonTemplates.push(node);
      }
    });
  });
  ```
- **methodごとのID生成**:
  - `pnml_${methodId}`
  - `program_${methodId}`
  - 各methodで独立したpnmlとprogramを持つ
- **共通テンプレート配置**: protocol直下に共通テンプレートを集約配置

##### 4.4 サブ関数

**`buildMethodXML()`**
- 単一method要素のXMLを生成
- pnml、program、instruction、通常テンプレートを生成
- 共通テンプレート（`isCommonTemplate === true`）は除外

**`buildCommonTemplateXML()`**
- 共通テンプレートのXMLを生成（protocol直下用）
- 複数のplaceRefを出力
- 全methodsから収集したノードを参照

**`buildTemplateXML()`**
- 通常テンプレート要素のXMLを生成（program内用）
- 単一のplaceRefを出力

---

## 自己閉じタグの使用状況

### 使用されている箇所

#### 1. maimlGenerator.ts
```typescript
xml += `<position x="${node.position.x}" y="${node.position.y}"/>\n`;
```
- **要素**: `<position />`
- **条件**: 常に自己閉じタグ

#### 2. xmlConverter.ts
```typescript
// property要素
if (!hasValue && !hasDescription && !hasCustomElements && !hasChildren) {
  xml += ' />\n';  // 自己閉じタグ
}

// content要素
if (!hasValue && !hasDescription && !hasChildren) {
  xml += ' />\n';  // 自己閉じタグ
}

// placeRef要素
xml += `<placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(placeRefRef)}" />\n`;
```
- **要素**: `<property />`, `<content />`, `<placeRef />`
- **条件**: 子要素がない場合

#### 3. reactFlowToMaiml.ts
```typescript
// place要素
if (hasName || hasDescription) {
  xml += `<place id="${escapeXml(place.id)}">\n`;
  // ...
  xml += `</place>\n`;
} else {
  xml += `<place id="${escapeXml(place.id)}"/>\n`;  // 自己閉じタグ
}

// transition要素
if (hasName || hasDescription) {
  xml += `<transition id="${escapeXml(transition.id)}">\n`;
  // ...
  xml += `</transition>\n`;
} else {
  xml += `<transition id="${escapeXml(transition.id)}"/>\n`;  // 自己閉じタグ
}

// vendorRef, instrumentRef, transitionRef
xml += `<vendorRef id="${escapeXml(creator.vendorRef.id)}" ref="${escapeXml(creator.vendorRef.ref)}" />`;
xml += `<instrumentRef id="${escapeXml(creator.instrumentRef.id)}" ref="${escapeXml(creator.instrumentRef.ref)}" />`;
xml += `<transitionRef id="${escapeXml(originalInstruction.transitionRefId)}" ref="${escapeXml(originalInstruction.transitionRefRef)}"/>`;
```
- **要素**: `<place />`, `<transition />`, `<vendorRef />`, `<instrumentRef />`, `<transitionRef />`
- **条件**: 子要素がない場合（name、descriptionが空）

#### 4. multiMethodConverter.ts
```typescript
// place要素
if (hasDescription) {
  xml += `<place id="${escapeXml(place.id)}">\n`;
  // ...
  xml += `</place>\n`;
} else {
  xml += `<place id="${escapeXml(place.id)}"/>\n`;  // 自己閉じタグ
}

// transition要素
xml += `<transition id="${escapeXml(transition.id)}"/>\n`;  // 常に自己閉じタグ
```
- **要素**: `<place />`, `<transition />`
- **条件**: 
  - place: descriptionがない場合
  - transition: 常に自己閉じタグ

### 自己閉じタグの判定ロジック

すべてのファイルで共通して、以下の条件で自己閉じタグを使用：

**条件: 子要素が存在しない場合**

```typescript
const hasChildren = /* 子要素の存在チェック */;

if (!hasChildren) {
  xml += ` />\n`;  // 自己閉じタグ
} else {
  xml += `>\n`;
  // ...子要素
  xml += `</${tagName}>\n`;
}
```

---

## 影響範囲分析

### 自己閉じタグ修正の影響を受ける箇所

#### 高影響度

1. **xmlConverter.ts**
   - `convertTemplateToXml()` - property要素、content要素
   - `convertPropertyToXml()` - 再帰的なproperty要素生成
   - `convertContentToXml()` - 再帰的なcontent要素生成
   - 影響: テンプレート編集画面でのXML保存時に影響

2. **reactFlowToMaiml.ts**
   - `convertReactFlowToMaiML()` - place要素、transition要素
   - 影響: Petri Netエディタでの保存時に影響

#### 中影響度

3. **multiMethodConverter.ts**
   - `convertMultipleMethodsToMaiML()` - place要素、transition要素
   - 影響: マルチメソッドMAIMLファイル生成時に影響

#### 低影響度

4. **maimlGenerator.ts**
   - `generateMaimlXml()` - position要素のみ
   - 影響: 基本的なPetri Net→MAIML変換時に影響（使用頻度低い可能性）

### 修正パターン

**修正前:**
```typescript
if (!hasChildren) {
  xml += ` />\n`;  // 自己閉じタグ
}
```

**修正後:**
```typescript
if (!hasChildren) {
  xml += `></${tagName}>\n`;  // 空要素タグ
}
```

---

## 推奨される修正順序

1. **xmlConverter.ts** - 最優先（テンプレート編集で頻繁に使用）
2. **reactFlowToMaiml.ts** - 高優先（Petri Netエディタで使用）
3. **multiMethodConverter.ts** - 中優先（マルチメソッド対応）
4. **maimlGenerator.ts** - 低優先（使用頻度確認後）

---

## 注意事項

### 1. バックエンドでのXML生成なし

バックエンド（backend/src）にはXML生成処理が見つかりませんでした。すべてフロントエンドで実施されています。

### 2. 使用箇所の特定困難

各XML変換関数の実際の使用箇所（コンポーネント等からの呼び出し）は、今回の調査では特定できませんでした。以下の理由が考えられます：

- 動的インポート
- バンドル後のファイルでの使用
- 条件付きインポート
- テストコード内での使用

### 3. テスト影響

各ファイルに対応するテストファイル（__tests__ディレクトリ）が存在する可能性があります。修正後はテストの更新も必要です。

---

## 追加調査: MAIML構造からXML文字列への変換

### 質問の確認

**「MAIML構造からXMLファイル形式に変換する処理」について追加調査**

パース済みのMAIML構造（MaimlRoot型、Protocol型等のオブジェクト）からXML文字列を生成する処理の有無を確認しました。

### 調査結果

#### ❌ 完全なMAIML構造 → XML文字列の変換処理は存在しない

調査した4ファイルは、いずれも**中間形式**からXML文字列を生成する処理であり、パース済みのMAIML構造（MaimlRoot型）からXML文字列を生成する処理ではありません。

**各ファイルの変換方向:**

1. **maimlGenerator.ts**
   ```
   React Flowノード・エッジ（画面データ） → MAIML XML文字列
   ```

2. **xmlConverter.ts**
   ```
   Template型オブジェクト（部分データ） → XML文字列
   ```

3. **reactFlowToMaiml.ts**
   ```
   React Flowノード・エッジ（画面データ） → MAIML XML文字列
   ```

4. **multiMethodConverter.ts**
   ```
   MethodInfo配列（画面データ） → MAIML XML文字列
   ```

#### ✅ MAIML XML文字列 → MAIML構造の変換処理は存在する

**maimlParserTyped.ts**
```typescript
XML文字列 → MaimlRoot型オブジェクト
```

このファイルは、XML文字列をパースしてMAIML構造（MaimlRoot型等）に変換する処理のみを提供しています。逆変換（MAIML構造 → XML文字列）の機能はありません。

### 結論（追加）

**「MAIML構造からXML文字列を生成する処理」は実装されていません。**

既存の実装は、以下のいずれかのパターンです：

1. **画面入力データ（React Flow等） → XML文字列** ✅ 実装済み（4ファイル）
2. **XML文字列 → MAIML構造** ✅ 実装済み（maimlParserTyped.ts）
3. **MAIML構造 → XML文字列** ❌ 未実装

---

## 結論

**画面入力内容をXML形式に書き起こす処理は、以下の4ファイルに実装されています：**

1. `frontend/src/utils/maimlGenerator.ts` - 基本的なPetri Net→MAIML変換
2. `frontend/src/utils/xmlConverter.ts` - Template→XML変換（最重要）
3. `frontend/src/utils/converters/reactFlowToMaiml.ts` - 完全なReact Flow→MAIML変換
4. `frontend/src/utils/converters/multiMethodConverter.ts` - マルチメソッド対応変換

**すべてのファイルで自己閉じタグが使用されており、修正が必要です。**

**注意**: これらはいずれも「画面データ→XML」の変換であり、「パース済みMAIML構造→XML」の変換処理は存在しません。

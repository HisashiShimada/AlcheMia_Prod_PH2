
# maimlDataWriter.ts 仕様分析レポート
## カスタム属性・value以外の要素の書き出し状況

**作成日時**: 2026-03-16 10:30  
**調査対象**: `backend/src/utils/maimlDataWriter.ts`

---

## 1. 調査結果サマリー

| 分類 | 問題の種類 | 影響度 |
|------|----------|--------|
| data層 / property | `xsi:type`属性の出力位置が誤り | 🔴 高 |
| data層 / property | `description`子要素の未出力 | 🟡 中 |
| data層 / property | カスタム属性（`attributes`）の未出力 | 🟡 中（TODO済み）|
| data層 / material等 | `uuid`等の`globalObjectContentGroup`の欠如 | 🔴 高（XSD違反）|
| data層 / property | `uncertainty`・ネスト`property/content`の未出力 | 🟡 中 |
| eventLog層 / log等 | `uuid`等の`globalObjectContentGroup`の欠如 | 🔴 高（XSD違反）|
| eventLog層 / trace | `taskno`属性はXSD外属性 | 🟡 中 |
| eventLog層 / property | `property`内部構造がXSD準拠でない | 🟡 中 |

---

## 2. data層 の詳細分析

### 2-1. XSD定義（maiml-data.xsd）で期待される構造

```xml
<data id="dataID">
  <!-- globalObjectContentGroup: uuid必須！ -->
  <uuid>...</uuid>
  <name>...</name>        <!-- optional -->
  <description>...</description>  <!-- optional -->
  <!-- genericDataContainerGroup: property/content -->
  <property .../>

  <results id="results_001">
    <!-- globalObjectContentGroup -->
    <uuid>...</uuid>

    <!-- material/condition/result 各要素も同様 -->
    <material id="mat_001" ref="templateRef">
      <!-- globalObjectContentGroup -->
      <uuid>...</uuid>
      <name>...</name>      <!-- optional -->
      <description>...</description>  <!-- optional -->

      <!-- genericDataContainerGroup -->
      <property key="温度" xsi:type="doubleType" units="°C" formatString="%.1f">
        <description>試料の温度</description>  <!-- optional -->
        <value>25.5</value>                  <!-- optional -->
        <uncertainty .../>                   <!-- optional -->
        <!-- ネストされた property/content も可能 -->
      </property>
      <content .../>

      <instanceRef .../>   <!-- optional, 0以上 -->
    </material>
    <condition .../>
    <result .../>
  </results>
</data>
```

**型定義の継承構造（maiml-data.xsd + maiml-core.xsd）:**
- `dataType` ← `hasIdAttributeType`（id属性必須）+ `globalObjectContentGroup` + `results`(1以上)
- `resultsType` ← `hasIdAttributeType` + `globalObjectContentGroup` + `material`* + `condition`* + `result`*
- `materialType/conditionType/resultType` ← `hasIdAttributeType` + `globalObjectContentGroup` + `instanceRef`* + `ref`属性(必須)

---

### 2-2. 現在の `buildDataXML()` が出力する構造

```xml
<data id="dataID">
  <results id="results_dataID">
    <material id="place_id" ref="templateId">
      <property key="温度" xsi:type="doubleType" units="°C">
        <value>25.5</value>
      </property>
      <operatorId>user_001</operatorId>
    </material>
  </results>
</data>
```

---

### 2-3. 問題点一覧（data層）

#### ❌ 問題1: `xsi:type` 属性の出力位置が誤り（高）

**現在の出力:**
```xml
<property key="温度" xsi:type="doubleType" units="°C">
```

**XSD・reference実装との比較:**

`reactFlowToMaiml.ts`（現行TypeScript版）の `buildPropertyXML()`:
```typescript
// xsi:type は必ず最後に出力
propertyXml += ` xsi:type="${escapeXml(propType)}">\n`;
```

`backend/src/utils/maimlDataWriter.ts` の現在の実装:
```typescript
dataXml += `        <property key="${escapeXml(prop.key)}"`;
if (prop.xsiType) {
  dataXml += ` xsi:type="${escapeXml(prop.xsiType)}"`;  // ← key直後に出力
}
if (prop.units) { dataXml += ` units="..."`; }
// ...
```

**問題**: `xsi:type`が`key`の直後に出力される。reference JS版では `units`, `formatString`, `scaleFactor` の後に `xsi:type` を付加している。属性の順序はXML的には意味を持たないが、reference実装と不一致。

**より深刻な問題**: `xsi:type`が`null/undefined`の場合、属性が出力されない。XSDの`propertyBaseType`は`abstract="true"`のため、必ず具体型（`doubleType`等）を`xsi:type`で指定する必要があり、**`xsi:type`なしのpropertyはXSD違反**。

`PropertySetProperty`型の定義では`xsiType`は必須フィールドだが、実際のDBデータに`xsiType`が欠けている場合は属性が出力されない。

---

#### ❌ 問題2: `globalObjectContentGroup` の欠如 — uuid等（高・XSD違反）

**XSD定義:** `dataType`, `resultsType`, `materialType`, `conditionType`, `resultType` のいずれも `globalObjectContentGroup` を含む。

`globalObjectContentGroup` の内容（maiml-core.xsd）:
```xml
<xs:group name="globalObjectContentGroup">
  <xs:sequence>
    <xs:element name="uuid" type="uuid" />          <!-- 必須！minOccurs=1 -->
    <xs:choice>
      <xs:sequence>
        <xs:element name="insertion" minOccurs="0" maxOccurs="unbounded" />
        <xs:element name="name" minOccurs="0" />
        <xs:element name="description" minOccurs="0" />
        <xs:element name="annotation" minOccurs="0" />
        <xs:group ref="genericDataContainerGroup" />  <!-- property/content -->
      </xs:sequence>
    </xs:choice>
  </xs:sequence>
</xs:group>
```

**`uuid`は必須要素**（minOccurs未指定 = デフォルト1）。

現在の実装では `data`, `results`, `material`, `condition`, `result` 要素に一切 `uuid` が出力されない。

**DBの`PropertySet`型にuuid情報がない:**
```typescript
export interface PropertySet {
  templateId: string;
  templateType: 'material' | 'condition' | 'result';
  properties: PropertySetProperty[];
  // uuid フィールドが存在しない
}
```

→ **uuidをどこから取得するかが未定義**。タスク登録時にuuidを生成してDBに保存するか、書き出し時に新規生成するかの方針が必要。

---

#### ❌ 問題3: `property` 内の `description` 子要素の未出力（中）

**XSD定義（例: doubleType）:**
```xml
<xs:element name="description" type="xs:string" minOccurs="0" />
<xs:element name="value" minOccurs="0" type="xs:double" />
```

`description`はオプションだが、テンプレート定義時に設定されていた場合に引き継げない。

**`PropertySetProperty`型の定義:**
```typescript
export interface PropertySetProperty {
  key: string;
  xsiType: string;
  value: unknown;
  units: string | null;
  formatString?: string | null;
  scaleFactor?: string | null;
  // description フィールドが存在しない！
}
```

→ `description`がDBに保存されていないため出力不可。タスク登録時の初期データ作成（`deleteAndInsertTemplateData`）でテンプレート定義の`description`を`property_set`に含めていない可能性が高い。

---

#### ❌ 問題4: カスタム属性（`attributes`）の未出力（中・TODO済み）

**現在のコード:**
```typescript
// TODO: カスタム属性（prop.attributes）の動的出力
// property_set テーブルへのカスタム属性保存方法を整理後、
// prop.attributes から任意の属性を動的に出力する処理を追加予定。
```

`PropertySetProperty`型に`attributes`フィールドが未定義であり、DBにも保存されていない。

`reactFlowToMaiml.ts`（現行TypeScript版）の`buildPropertyXML()`では:
```typescript
if (prop.attributes) {
  Object.entries(prop.attributes).forEach(([attrName, attrValue]) => {
    if (attrName !== 'xsi:type' && attrValue) {
      propertyXml += ` ${attrName}="${escapeXml(attrValue)}"`;
    }
  });
}
```
というカスタム属性出力ロジックがあるが、backend実装には未移植・未保存。

---

#### ❌ 問題5: `uncertainty` / ネストされた `property/content` の未出力（低）

XSDでは各propertyTypeに`uncertainty`要素と`genericDataContainerGroup`（property/content のネスト）が定義されているが、`PropertySetProperty`に対応フィールドがないため出力不可。

現在のユースケース（実験数値記録）では通常不要だが、高度な統計情報（不確かさ情報）を扱う場合には必要になる。

---

#### ⚠️ 問題6: `operatorId` 要素はXSD定義外（低）

現在の実装:
```typescript
if (row.update_user_id) {
  dataXml += `        <operatorId>${escapeXml(row.update_user_id)}</operatorId>\n`;
}
```

`operatorId`はXSD（`materialType`/`conditionType`/`resultType`）に定義されていない。reference JS版（`reactFlowToMaiml.js`）の`buildDataXML()`にも`operatorId`出力は存在する（record.operatorId）が、これはXSD外の独自拡張か、古い仕様の名残の可能性がある。

XSD準拠を優先するなら、operatorIdは`property`要素（key="operator_id"）として出力するか、または`globalObjectContentGroup`の`annotation`要素に含めるべき。

---

## 3. eventLog層 の詳細分析

### 3-1. XSD定義（maiml-eventLog.xsd）で期待される構造

```xml
<eventLog id="eventLogID">
  <!-- globalObjectContentGroup -->
  <uuid>...</uuid>
  <name>...</name>        <!-- optional -->
  <description>...</description>  <!-- optional -->

  <log id="log_001" ref="transitionId">
    <!-- globalObjectContentGroup -->
    <uuid>...</uuid>
    <extension name="..." prefix="..." uri="..."/>  <!-- optional -->
    <global scope="...">                             <!-- optional -->
      <property .../>
    </global>
    <classifier name="..." scope="..." keys="..."/>  <!-- optional -->

    <trace id="trace_001" ref="transitionId">
      <!-- globalObjectContentGroup -->
      <uuid>...</uuid>

      <event id="event_001" ref="transitionId">
        <!-- globalObjectContentGroup -->
        <uuid>...</uuid>
        <!-- property/content はglobalObjectContentGroupのgenericDataContainerGroupとして含む -->
        <property key="timestamp" xsi:type="xs:dateTime">...</property>
        <property key="worker_id" xsi:type="xs:string">...</property>

        <resultsRef .../>   <!-- optional -->
        <creatorRef .../>   <!-- optional -->
        <ownerRef .../>     <!-- optional -->
      </event>

      <creatorRef .../>   <!-- optional -->
      <ownerRef .../>     <!-- optional -->
    </trace>

    <creatorRef .../>   <!-- optional -->
    <ownerRef .../>     <!-- optional -->
  </log>
</eventLog>
```

---

### 3-2. 現在の `buildEventLogXML()` が出力する構造

```xml
<eventLog id="eventLogID">
  <log id="work_..." ref="transitionId">
    <trace id="trace_..." ref="transitionId" taskno="...">
      <event id="event_..." ref="transitionId">
        <property key="timestamp" xsi:type="xs:dateTime">2026-03-16T...</property>
        <property key="worker_id" xsi:type="xs:string">worker001</property>
        <property key="status" xsi:type="xs:string">completed</property>
      </event>
    </trace>
  </log>
</eventLog>
```

---

### 3-3. 問題点一覧（eventLog層）

#### ❌ 問題1: `globalObjectContentGroup` の欠如 — uuid等（高・XSD違反）

`eventLog`, `log`, `trace`, `event` のすべてに`globalObjectContentGroup`が必要だが、現在の実装では一切出力されない。特に`uuid`は必須要素。

**DBのJSONデータにuuidが含まれていない:**
```json
{
  "eventLog": {
    "@id": "eventLogID",
    "log": {
      "@id": "work_...",
      "@ref": "transitionId",
      "trace": { "@id": "...", "@ref": "...", "event": {...} }
    }
  }
}
```
→ uuidが記録されていないため、XSD準拠の出力が不可能な状態。

---

#### ❌ 問題2: `trace`の`taskno`属性はXSD外（中）

**現在の実装:**
```typescript
if (taskno) attrs += ` taskno="${escapeXml(taskno)}"`;
```

`traceType`のXSD定義（`ref`属性のみ）:
```xml
<xs:attribute name="ref" use="required" type="xs:IDREF" />
```

`taskno`属性はXSD定義外。XSD検証ツールで検証した場合にエラーになる可能性がある。

---

#### ❌ 問題3: `event`要素内の`property`の位置・構造（中）

XSDでは`eventType`の内部構造:
```
globalObjectContentGroup → uuid + (name, description, annotation, property, content) → resultsRef, creatorRef, ownerRef
```

つまり`property`は`globalObjectContentGroup`の`genericDataContainerGroup`として含まれる。`uuid`の後に出力されなければならない。

現在の実装はuuidを出力しないため、property要素が先頭に来てしまう（XSD的には`uuid`の後に来るべき）。

また、現在のeventLog propertyは `{ "@key": "...", "@xsi:type": "...", "#text": "値" }` 形式をインラインテキストとして出力しているが、XSDのpropertyBaseTypeはabstractなので、`xsi:type`でdoubleType等を指定し、`<value>`子要素で値を出力するのが本来の形式。

**現在の出力:**
```xml
<property key="status" xsi:type="xs:string">completed</property>
```
（インラインテキスト）

**XSD準拠の出力:**
```xml
<property key="status" xsi:type="stringType">
  <value>completed</value>
</property>
```

**注意**: DBのJSONに保存されているeventLog propertyの`@xsi:type`値は`xs:dateTime`/`xs:string`/`xs:int`等のXSスキーマ型名が使用されているが、MAIMLのpropertyBaseTypeのxsi:typeには`dateTimeType`/`stringType`/`intType`等のMAIML独自型名を使用するべきか、`xs:xxx`型名で通常使用されているのかは確認が必要。

---

#### ❌ 問題4: `evnet`要素はXSD定義外（中・意図的）

`evnet`はMAIMLスキーマ本体のスペルミスをそのまま使用している（実装コメントに明示済み）。XSDには`evnet`型が定義されていないため、スキーマ検証はできないが、実際のMAIMLファイルとの整合性を保つために意図的に維持している。

---

## 4. PropertySetProperty型 と XSD対応表

| XSDの属性/要素 | PropertySetProperty フィールド | buildDataXML出力 | 状態 |
|--------------|------------------------------|-----------------|------|
| `key`属性（必須） | `key` | ✅ 出力 | OK |
| `xsi:type`属性（必須） | `xsiType` | ✅ 出力（ただし欠如時は省略） | 要注意 |
| `units`属性 | `units` | ✅ 出力 | OK |
| `formatString`属性 | `formatString` | ✅ 出力 | OK |
| `scaleFactor`属性 | `scaleFactor` | ✅ 出力 | OK |
| カスタム属性 | なし（`attributes`未定義） | ❌ 未出力 | TODO |
| `<description>`子要素 | なし（フィールド未定義） | ❌ 未出力 | 未対応 |
| `<value>`子要素 | `value` | ✅ 出力 | OK |
| `<uncertainty>`子要素 | なし | ❌ 未出力 | 未対応（通常不要） |
| ネスト`<property>`/`<content>` | なし | ❌ 未出力 | 未対応（通常不要） |

---

## 5. globalObjectContentGroup 対応表

| 要素 | `uuid`（必須） | `name` | `description` | `annotation` | 対応状況 |
|-----|--------------|--------|---------------|-------------|---------|
| `<data>` | ❌ 未出力 | ❌ | ❌ | ❌ | XSD違反 |
| `<results>` | ❌ 未出力 | ❌ | ❌ | ❌ | XSD違反 |
| `<material>` | ❌ 未出力 | ❌ | ❌ | ❌ | XSD違反 |
| `<condition>` | ❌ 未出力 | ❌ | ❌ | ❌ | XSD違反 |
| `<result>` | ❌ 未出力 | ❌ | ❌ | ❌ | XSD違反 |
| `<eventLog>` | ❌ 未出力 | ❌ | ❌ | ❌ | XSD違反 |
| `<log>` | ❌ 未出力 | ❌ | ❌ | ❌ | XSD違反 |
| `<trace>` | ❌ 未出力 | ❌ | ❌ | ❌ | XSD違反 |
| `<event>` | ❌ 未出力 | ❌ | ❌ | ❌ | XSD違反 |

---

## 6. 正しく動作している部分

以下の部分は現在の実装で正しく動作している（または意図通り）:

| 機能 | 状態 | 備考 |
|-----|------|------|
| `<data>`構造（results > material/condition/result） | ✅ | XSD準拠 |
| `<material>` の `id` / `ref` 属性 | ✅ | XSD準拠（ref必須も対応） |
| `<property>` の `key` / `units` / `formatString` / `scaleFactor` / `xsi:type` 属性 | ✅ | XSD準拠 |
| `<property>` の `<value>` 子要素 | ✅ | XSD準拠 |
| `<log>` / `<trace>` / `<event>` の `id` / `ref` 属性 | ✅ | XSD準拠 |
| eventLog `property` の `key` / `xsi:type` 属性 | ✅ | DB JSON → 属性変換OK |
| eventLog `property` のインラインテキスト出力 | △ | 機能するが `<value>` 子要素形式の方が厳密なXSD準拠 |
| `<evnet>` 要素（パターンB） | ✅ 意図的 | MAIMLスキーマのtypoをそのまま踏襲 |
| 正規表現による `<data>` / `<eventLog>` タグ置換 | ✅ | 動作OK |
| 空データ時の空要素出力 | ✅ | 動作OK |

---

## 7. 対応方針の提案

### 優先度：高

#### H1. `uuid` の取り扱い方針を決定する
XSD違反を解消するには各要素に`uuid`が必要。方針の選択肢:
- **案A**: タスク登録時にuuidを生成してDBの`property_set`に保存する
- **案B**: `buildDataXML()`/`buildEventLogXML()`の書き出し時に`crypto.randomUUID()`で動的生成する
- **案C**: MAIMLスキーマ厳密検証を行わない運用とし、uuidを省略したままにする

→ 実際のMAIMLファイルをXSDで検証するかどうかによって優先度が変わる。

#### H2. `xsi:type` の欠如時フォールバックを追加する
```typescript
const propType = prop.xsiType || 'stringType';  // デフォルトをstringTypeに
dataXml += ` xsi:type="${escapeXml(propType)}"`;
```

### 優先度：中

#### M1. `property.description` フィールドをDBスキーマに追加する
`PropertySetProperty`型と`property_set`JSONB構造に`description`フィールドを追加し、タスク登録時にテンプレート定義から引き継ぐ。

#### M2. カスタム属性（`attributes`）の保存・出力を実装する
`PropertySetProperty`型に`attributes?: Record<string, string>`を追加し、書き出し時に動的出力する（TODO解消）。

#### M3. `operatorId` 要素をXSD準拠の形に変更を検討する
`operatorId`をpropertyとして出力するか、`creatorRef`等の適切なXSD要素として出力するか検討。

### 優先度：低（将来対応）

#### L1. `uncertainty` / ネストpropertyのサポート
高度な統計情報が必要になった場合に対応。

#### L2. eventLog propertyを`<value>`子要素形式に変更
DBのJSONデータ構造の変更が必要なため、影響範囲が大きい。現状のインラインテキスト形式でもXMLとして読み取り可能。

---

## 8. 影響を受けるファイル一覧

| ファイル | 変更の種類 |
|---------|----------|
| `backend/src/utils/maimlDataWriter.ts` | property xsi:typeデフォルト追加、uuid対応 |
| `backend/src/repositories/templateDataRepository.ts` | PropertySetProperty型にdescription/attributes追加 |
| `backend/src/services/taskRegistrationService.ts` | テンプレート初期データにdescription/uuidを含める |
| `backend/src/services/eventLogRepository.ts` | eventLog JSONにuuidを含める |

---

## 9. フロントエンドの `buildPropertyXML` 実装比較

### 9-1. フロントエンド3実装の比較表

| 機能 | reference JS版<br>`reactFlowToMaiml.js` | editorv2 TS版<br>`editorv2/.../reactFlowToMaiml.ts` | バックエンド<br>`maimlDataWriter.ts` |
|-----|----------------------------------------|------------------------------------------------------|--------------------------------------|
| `key`属性 | ✅ | ✅ | ✅ |
| `xsi:type`属性 | ✅ (最後に出力) | ✅ (最後に出力) | ✅ (key直後に出力 ※順序違い) |
| `units`属性 | ✅ (`units`/`unit`両対応) | ✅ | ✅ |
| `formatString`属性 | ✅ | ✅ | ✅ |
| `scaleFactor`属性 | ✅ | ✅ | ✅ |
| `prop.attributes`（カスタム属性） | ✅ 動的出力 | ✅ 動的出力 | ❌ 未対応 |
| `<description>`子要素 | ✅ (`prop.description`) | ✅ (`prop.description`) | ❌ 未対応 |
| `<value>`子要素 | ✅ (`prop.value`/`defaultValue`) | ✅ (`prop.value`) | ✅ |
| `prop.elements` (NestedPropertyEditor形式) | ✅ 動的出力 | ❌ 廃止 | ❌ 未対応 |
| `prop.customElements` (editorv2形式) | ❌ 未対応 | ✅ 動的出力 | ❌ 未対応 |
| `propertyListType` 再帰子property | ✅ (`children`/`properties`) | ✅ (`properties`) | ❌ 未対応 |
| content要素 | ✅ | ✅ | ❌ 未対応 |
| `buildDataXML`（data層出力） | ✅ 実装済み | ❌ rawXML引き継ぎのみ | ✅ 実装済み（ただし差異あり） |

---

### 9-2. `prop.elements` / `prop.customElements` の詳細

#### reference JS版の `prop.elements`（NestedPropertyEditor形式）

```javascript
// 書き方: elements は { タグ名: 値 } のRecord<string, string>
if (prop.elements && Object.keys(prop.elements).length > 0) {
  Object.entries(prop.elements).forEach(([elemName, elemValue]) => {
    if (elemValue !== undefined && elemValue !== '') {
      propertyXml += `${indent}  <${elemName}>${escapeXml(elemValue)}</${elemName}>\n`;
    }
  });
}
// prop.elements があれば value/description は出力しない（else if (!prop.elements)）
```

**用途**: XSD標準要素（`description`, `value`）以外のカスタム子要素を動的に出力できる。  
**例**: `{ elements: { "wavelength": "532", "power": "100" } }` → `<wavelength>532</wavelength><power>100</power>`

#### editorv2 TS版の `prop.customElements`（maiml-unified.ts 型定義）

```typescript
// PropertyCustomElement型
export interface PropertyCustomElement {
  value: string;
  attributes?: Record<string, string>;  // 属性付きサブ要素も対応
  children?: Record<string, PropertyCustomElement>;  // ネスト対応
}

// Property型
export interface Property {
  xsiType: string;
  description?: string;
  customElements?: Record<string, PropertyCustomElement>;
  attributes?: Record<string, string>;
  // ...
}
```

```typescript
// editorv2版の出力ロジック
if (prop.customElements) {
  Object.entries(prop.customElements).forEach(([elementName, customElement]) => {
    if (customElement && customElement.value !== undefined && customElement.value !== '') {
      let elementXml = `${indent}  <${elementName}`;
      if (customElement.attributes) {
        Object.entries(customElement.attributes).forEach(([attrName, attrValue]) => {
          if (attrValue) {
            elementXml += ` ${attrName}="${escapeXml(attrValue)}"`;
          }
        });
      }
      elementXml += `>${escapeXml(String(customElement.value))}</${elementName}>\n`;
      propertyXml += elementXml;
    }
  });
}
```

**editorv2版は `elements`（単純string値）から `customElements`（属性付き・ネスト対応）へ拡張**された。

---

### 9-3. reference JS版 `buildDataXML` との差異

reference JS版 `buildDataXML` が出力するpropertyの構造:
```javascript
// property要素（xsi:type, units を出力、value/description を子要素に出力）
dataXml += `      <property key="${prop.key}"`;
if (prop.type || prop.xsiType) dataXml += ` xsi:type="${escapeXml(prop.type || prop.xsiType)}"`;
if (prop.units || prop.unit)   dataXml += ` units="${escapeXml(prop.units || prop.unit)}"`;
dataXml += `>\n`;
const value = prop.value || prop.defaultValue || '';
if (value !== '') {
  dataXml += `        <value>${escapeXml(String(value))}</value>\n`;
}
if (prop.description) {
  dataXml += `        <description>${escapeXml(prop.description)}</description>\n`;
}
dataXml += `      </property>\n`;
```

**reference JS版との差異まとめ:**

| 項目 | reference JS版 | バックエンド実装 |
|------|----------------|----------------|
| `formatString`属性 | ❌ 未出力 | ✅ 出力 |
| `scaleFactor`属性 | ❌ 未出力 | ✅ 出力 |
| `<description>`子要素 | ✅ 出力 | ❌ 未出力 |
| `xsi:type`の出力順 | `key`→`xsi:type`→`units` | `key`→`xsi:type`→`units`→`formatString`→`scaleFactor` |
| `results`ラッパー要素 | ❌ なし（`<data>`直下に`<material>`等） | ✅ あり（`<data>` > `<results>` > `<material>`等） |

⚠️ **重要な構造差異**: reference JS版の `buildDataXML` は `<data>` 直下に `<material>/<condition>/<result>` を出力するが、バックエンド実装は XSD準拠で `<data>` > `<results>` > `<material>` の2階層構造。これはXSD的にはバックエンド版が正しい。

---

### 9-4. `prop.attributes` の attribute 種別（editorv2版 `buildPropertyXML`）

editorv2版では `prop.attributes` からカスタム属性を動的出力する際、`xsi:type`を除外している:

```typescript
if (prop.attributes) {
  Object.entries(prop.attributes).forEach(([attrName, attrValue]) => {
    if (attrName !== 'xsi:type' && attrValue) {  // xsi:typeは除外（後から専用処理）
      propertyXml += ` ${attrName}="${escapeXml(attrValue)}"`;
    }
  });
}
// xsi:type は必ず prop.xsiType から出力（最後に）
propertyXml += ` xsi:type="${escapeXml(propType)}">\n`;
```

バックエンドの `PropertySetProperty` 型にはこの `attributes` フィールドが存在しない。

---

### 9-5. バックエンド `PropertySetProperty` 型 vs フロントエンド `Property` 型の対応

| フロントエンド `Property` フィールド | バックエンド `PropertySetProperty` フィールド | 書き出し状態 |
|--------------------------------------|----------------------------------------------|------------|
| `xsiType`（必須） | `xsiType`（必須） | ✅ 対応 |
| `units` | `units`（nullable） | ✅ 対応 |
| `formatString` | `formatString`（optional） | ✅ 対応 |
| `scaleFactor` | `scaleFactor`（optional） | ✅ 対応 |
| `description` | ❌ なし | ❌ 未保存・未出力 |
| `attributes` | ❌ なし | ❌ 未保存・未出力 |
| `customElements` | ❌ なし | ❌ 未保存・未出力 |
| `value` | `value`（unknown型） | ✅ 対応 |
| `properties`（子プロパティ） | ❌ なし | ❌ 未保存・未出力 |
| `contents`（content要素） | ❌ なし | ❌ 未保存・未出力 |

---

## 10. 参照ファイル

| ファイル | 役割 |
|---------|-----|
| `backend/src/utils/maimlDataWriter.ts` | 調査対象メイン実装 |
| `backend/src/repositories/templateDataRepository.ts` | DBスキーマ・型定義 |
| `docs/design/maiml/maiml-data.xsd` | data層のXSD定義 |
| `docs/design/maiml/maiml-property.xsd` | property型のXSD定義 |
| `docs/design/maiml/maiml-eventLog.xsd` | eventLog層のXSD定義 |
| `docs/design/maiml/maiml-core.xsd` | globalObjectContentGroup定義 |
| `frontend/src/utils/converters/reactFlowToMaiml.ts` | 現行フロントエンドのproperty出力実装 |

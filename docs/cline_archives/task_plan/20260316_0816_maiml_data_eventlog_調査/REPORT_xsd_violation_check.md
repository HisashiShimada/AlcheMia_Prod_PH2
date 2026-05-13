# XSD違反チェックレポート: maimlDataWriter.ts

**作成日時**: 2026-03-16 13:04  
**対象ファイル**: `backend/src/utils/maimlDataWriter.ts`  
**照合XSD**: `docs/design/maiml/maiml-data.xsd` / `maiml-eventLog.xsd` / `maiml-core.xsd` / `maiml-property.xsd`

---

## チェック結果サマリー

| 層 | 違反件数 | 状態 |
|----|---------|------|
| data層 (`buildDataXML`) | 1件 | 🟡 ほぼ解決済み、空データ時のみ残存 |
| eventLog層 (`buildEventLogXML` 系) | 9件 | 🔴 全て未修正 |

---

## data層の違反

### ✅ 解決済み（前回調査指摘 → 修正済み）

| # | 内容 |
|---|------|
| - | `<data>` に `<uuid>` を `randomUUID()` で出力 ✅ |
| - | `<results>` に `<uuid>` を出力 ✅ |
| - | `<material>/<condition>/<result>` に `<uuid>` を出力 ✅ |
| - | `xsi:type` フォールバック（`prop.xsiType \|\| 'stringType'`）✅ |
| - | `xsi:type` を最後に出力（units → formatString → scaleFactor → xsi:type）✅ |
| - | `operatorId` 要素を削除（XSD外要素）✅ |
| - | `description` 子要素の出力（`<value>` の前）✅ |
| - | カスタム属性 (`prop.attributes`) の動的出力 ✅ |
| - | `customElements` の動的出力 ✅ |

---

### 🔴 残存する違反（data層）

#### 違反D-1: 空データ時に `<results>` が存在しない

**根拠XSD** (`maiml-data.xsd`):
```xml
<xs:complexType name="dataType">
  <xs:complexContent>
    <xs:extension base="hasIdAttributeType">
      <xs:sequence>
        <xs:group ref="globalObjectContentGroup" />
        <xs:element name="results" maxOccurs="unbounded" type="resultsType" />
        <!-- minOccurs 未指定 = デフォルト 1 → 必須！ -->
      </xs:sequence>
    </xs:extension>
  </xs:complexContent>
</xs:complexType>
```

**問題箇所** (maimlDataWriter.ts 約67行目):
```typescript
if (validRows.length === 0) {
  return `  <data id="${escapeXml(dataId)}">\n  </data>\n`;
  // ↑ <uuid> も <results> もない → 2重のXSD違反
}
```

**修正案**:
```typescript
if (validRows.length === 0) {
  const emptyResultsId = `results_${dataId}`;
  return [
    `  <data id="${escapeXml(dataId)}">`,
    `    <uuid>${randomUUID()}</uuid>`,
    `    <results id="${escapeXml(emptyResultsId)}">`,
    `      <uuid>${randomUUID()}</uuid>`,
    `    </results>`,
    `  </data>`,
    '',
  ].join('\n');
}
```

---

## eventLog層の違反

### 🔴 違反E-1: `<eventLog>` に `<uuid>` がない（globalObjectContentGroup 必須要素）

**根拠XSD** (`maiml-eventLog.xsd` + `maiml-core.xsd`):
```xml
<xs:complexType name="eventLogType">
  <xs:complexContent>
    <xs:extension base="hasIdAttributeType">
      <xs:sequence>
        <xs:group ref="globalObjectContentGroup" />  <!-- uuid 必須！ -->
        <xs:element name="log" maxOccurs="unbounded" type="logType" />
      </xs:sequence>
    </xs:extension>
  </xs:complexContent>
</xs:complexType>
```

**問題箇所** (`buildEventLogXML`):
```typescript
let xml = `  <eventLog id="${escapeXml(eventLogId)}">\n`;
// ↑ <uuid> が出力されていない → XSD違反
```

**修正案**:
```typescript
let xml = `  <eventLog id="${escapeXml(eventLogId)}">\n`;
xml += `    <uuid>${randomUUID()}</uuid>\n`;
```

---

### 🔴 違反E-2: 空データ時に `<uuid>` も `<log>` もない空 `<eventLog>` を返す

**根拠XSD**: `eventLogType` の `log` は minOccurs 未指定（=1）で必須。`globalObjectContentGroup` の `uuid` も必須。

**問題箇所** (`buildEventLogXML` 冒頭):
```typescript
if (!logJsonArray || logJsonArray.length === 0) {
  return `  <eventLog id="${escapeXml(eventLogId)}">\n  </eventLog>\n`;
  // ↑ <uuid> も <log> もない → 2重のXSD違反
}
```

**修正案**:
```typescript
if (!logJsonArray || logJsonArray.length === 0) {
  const emptyLogId = `log_${eventLogId}_empty`;
  return [
    `  <eventLog id="${escapeXml(eventLogId)}">`,
    `    <uuid>${randomUUID()}</uuid>`,
    `    <log id="${escapeXml(emptyLogId)}" ref="${escapeXml(emptyLogId)}">`,
    `      <uuid>${randomUUID()}</uuid>`,
    `      <trace id="${escapeXml(emptyLogId)}_trace" ref="${escapeXml(emptyLogId)}_trace">`,
    `        <uuid>${randomUUID()}</uuid>`,
    `        <event id="${escapeXml(emptyLogId)}_event" ref="${escapeXml(emptyLogId)}_event">`,
    `          <uuid>${randomUUID()}</uuid>`,
    `        </event>`,
    `      </trace>`,
    `    </log>`,
    `  </eventLog>`,
    '',
  ].join('\n');
}
```

> **注**: 空eventLogの扱い方（空要素を許容する運用とするか）はプロジェクト方針に依存。XSD厳密準拠が不要なら空要素のまま許容することもできる。

---

### 🔴 違反E-3: `<log>` に `<uuid>` がない（globalObjectContentGroup 必須要素）

**根拠XSD** (`maiml-eventLog.xsd`):
```xml
<xs:complexType name="logType">
  <xs:complexContent>
    <xs:extension base="hasIdAttributeType">
      <xs:sequence>
        <xs:group ref="globalObjectContentGroup" />  <!-- uuid 必須！ -->
        ...
        <xs:element name="trace" maxOccurs="unbounded" type="traceType"/>
      </xs:sequence>
      <xs:attribute name="ref" use="required" type="xs:IDREF" />
    </xs:extension>
  </xs:complexContent>
</xs:complexType>
```

**問題箇所** (`buildLogEntryXML`):
```typescript
let xml = `    <log${attrs}>\n`;
// ↑ <uuid> が出力されていない → XSD違反
```

**修正案**:
```typescript
let xml = `    <log${attrs}>\n`;
xml += `      <uuid>${randomUUID()}</uuid>\n`;
```

---

### 🔴 違反E-4: `<log>` の `ref` 属性が必須なのに条件付き出力

**根拠XSD**: `logType` の `ref` は `use="required"`。

**問題箇所** (`buildLogEntryXML`):
```typescript
const ref = logEntry['@ref'] as string | undefined;
if (ref) attrs += ` ref="${escapeXml(ref)}"`;
// ↑ ref が DB JSON に含まれていない場合は省略 → XSD違反
```

**修正案**:
```typescript
// ref は必須。なければ id を代用するか、フォールバック値を設定
const ref = (logEntry['@ref'] as string | undefined) ?? (logEntry['@id'] as string | undefined) ?? '';
attrs += ` ref="${escapeXml(ref)}"`;
```

---

### 🔴 違反E-5: `<trace>` に `<uuid>` がない（globalObjectContentGroup 必須要素）

**根拠XSD**:
```xml
<xs:complexType name="traceType">
  <xs:complexContent>
    <xs:extension base="hasIdAttributeType">
      <xs:sequence>
        <xs:group ref="globalObjectContentGroup" />  <!-- uuid 必須！ -->
        <xs:element name="event" maxOccurs="unbounded" type="eventType" />
      </xs:sequence>
      <xs:attribute name="ref" use="required" type="xs:IDREF" />
    </xs:extension>
  </xs:complexContent>
</xs:complexType>
```

**問題箇所** (`buildTraceXML`):
```typescript
let xml = `      <trace${attrs}>\n`;
// ↑ <uuid> が出力されていない → XSD違反
```

**修正案**:
```typescript
let xml = `      <trace${attrs}>\n`;
xml += `        <uuid>${randomUUID()}</uuid>\n`;
```

---

### 🔴 違反E-6: `<trace>` の `ref` 属性が必須なのに条件付き出力

**問題箇所** (`buildTraceXML`):
```typescript
const ref = trace['@ref'] as string | undefined;
if (ref) attrs += ` ref="${escapeXml(ref)}"`;
// ↑ ref が undefined の場合は省略 → XSD違反
```

**修正案**:
```typescript
const ref = (trace['@ref'] as string | undefined) ?? (trace['@id'] as string | undefined) ?? '';
attrs += ` ref="${escapeXml(ref)}"`;
```

---

### 🔴 違反E-7: `<event>` に `<uuid>` がない（globalObjectContentGroup 必須要素）

**根拠XSD**:
```xml
<xs:complexType name="eventType">
  <xs:complexContent>
    <xs:extension base="hasIdAttributeType">
      <xs:sequence>
        <xs:group ref="globalObjectContentGroup" />  <!-- uuid 必須！ -->
        ...
      </xs:sequence>
      <xs:attribute name="ref" use="required" type="xs:IDREF" />
    </xs:extension>
  </xs:complexContent>
</xs:complexType>
```

**問題箇所** (`buildEventXML`):
```typescript
let xml = `        <event${attrs}>\n`;
// ↑ <uuid> が出力されていない → XSD違反
```

**修正案**:
```typescript
let xml = `        <event${attrs}>\n`;
xml += `          <uuid>${randomUUID()}</uuid>\n`;
```

---

### 🔴 違反E-8: `<event>` の `ref` 属性が必須なのに条件付き出力

**問題箇所** (`buildEventXML`):
```typescript
const ref = eventObj['@ref'] as string | undefined;
if (ref) attrs += ` ref="${escapeXml(ref)}"`;
// ↑ ref が undefined の場合は省略 → XSD違反
```

**修正案**:
```typescript
const ref = (eventObj['@ref'] as string | undefined) ?? (eventObj['@id'] as string | undefined) ?? '';
attrs += ` ref="${escapeXml(ref)}"`;
```

---

### 🔴 違反E-9: `traceType` は `<event>` が必須（minOccurs=1）なのにパターンBで `<event>` がない

**根拠XSD**: `traceType` の `event` は minOccurs 未指定（=1）で必須。

**問題箇所** (`buildTraceXML`):
```typescript
// パターンB: evnet 要素（MAIMLスキーマのスペルミスをそのまま使用）
const evnetObj = trace['evnet'] as Record<string, unknown> | undefined;
if (evnetObj) {
  xml += buildEvnetXML(evnetObj, 4);
  // ↑ event なし・evnet だけ → <trace> に <event> がない → XSD違反
}
```

**補足**: `evnet` はMAIMLスキーマ本体のtypoを踏襲した意図的な設計。ただし XSD 上では `<event>` が必須のため、`evnet` しかない `<trace>` はスキーマ検証に失敗する。この問題はデータ構造（DBのeventLog JSON）の設計に起因するため、修正方針はプロジェクトレベルで決定が必要。

---

### 🟡 注意事項: eventLog層 `property` の `xsi:type` フォールバックなし

**該当箇所** (`buildPropertiesXML`):
```typescript
const xsiType = prop['@xsi:type'] as string | undefined;
if (xsiType) attrs += ` xsi:type="${escapeXml(xsiType)}"`;
// ↑ xsiType が undefined なら xsi:type 属性なし
// propertyBaseType は abstract なので xsi:type は実質必須
```

`buildDataXML()` では `prop.xsiType || 'stringType'` でフォールバック済みだが、`buildPropertiesXML()`（eventLog用）には未設定。

**修正案**:
```typescript
const xsiType = (prop['@xsi:type'] as string | undefined) ?? 'stringType';
attrs += ` xsi:type="${escapeXml(xsiType)}"`;
```

---

## 意図的なXSD外要素（違反扱いしない）

| 要素/属性 | 内容 |
|---------|------|
| `<trace taskno="...">` | XSD未定義属性。既知・意図的な拡張。 |
| `<evnet>` 要素 | MAIMLスキーマ本体のtypoを踏襲。実装コメントに明示済み。 |
| eventLog `property` のインラインテキスト形式 | XSD的には `<value>` 子要素が本来の形式だが、既知の課題として保留中（RESEARCH_writer_spec_analysis.md 参照）。 |

---

## 違反一覧（修正優先度順）

| 違反ID | 場所 | 内容 | 優先度 |
|--------|------|------|--------|
| D-1 | `buildDataXML()` 空データ時 | `<data>` に `<uuid>` と `<results>` がない | 🔴 高 |
| E-1 | `buildEventLogXML()` | `<eventLog>` に `<uuid>` がない | 🔴 高 |
| E-2 | `buildEventLogXML()` 空データ時 | `<uuid>` も `<log>` もない空 `<eventLog>` を返す | 🔴 高 |
| E-3 | `buildLogEntryXML()` | `<log>` に `<uuid>` がない | 🔴 高 |
| E-4 | `buildLogEntryXML()` | `<log>` の `ref` が条件付き出力（必須属性） | 🔴 高 |
| E-5 | `buildTraceXML()` | `<trace>` に `<uuid>` がない | 🔴 高 |
| E-6 | `buildTraceXML()` | `<trace>` の `ref` が条件付き出力（必須属性） | 🔴 高 |
| E-7 | `buildEventXML()` | `<event>` に `<uuid>` がない | 🔴 高 |
| E-8 | `buildEventXML()` | `<event>` の `ref` が条件付き出力（必須属性） | 🔴 高 |
| E-9 | `buildTraceXML()` パターンB | `<trace>` に `<event>` がない（`evnet` のみ） | 🔴 高（設計起因） |
| E-10 | `buildPropertiesXML()` | `<property>` の `xsi:type` フォールバックなし | 🟡 中 |

---

## 参照ファイル

| ファイル | 役割 |
|---------|------|
| `backend/src/utils/maimlDataWriter.ts` | チェック対象実装 |
| `docs/design/maiml/maiml-data.xsd` | data層スキーマ |
| `docs/design/maiml/maiml-eventLog.xsd` | eventLog層スキーマ |
| `docs/design/maiml/maiml-core.xsd` | globalObjectContentGroup 定義 |
| `docs/design/maiml/maiml-property.xsd` | propertyBaseType 定義 |
| `docs/task_plan/20260316_0816_maiml_data_eventlog_調査/RESEARCH_writer_spec_analysis.md` | 前回調査レポート |

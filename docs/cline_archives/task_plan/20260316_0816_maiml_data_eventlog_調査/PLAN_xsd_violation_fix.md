# タスク計画書: XSD違反修正 — maimlDataWriter.ts

**作成日時**: 2026-03-16 13:09  
**タスクID**: xsd_violation_fix  
**優先度**: 高  
**推定工数**: 1〜2時間  
**前提資料**: `REPORT_xsd_violation_check.md`

---

## 1. タスク概要

`backend/src/utils/maimlDataWriter.ts` に存在するXSD違反（計11件）を修正する。  
`buildDataXML()` の空データ処理（D-1）と、`buildEventLogXML()` 系全体（E-1〜E-10）が対象。

---

## 2. 目的と期待される成果

### 目的
- 生成されるMAIMLファイルが `maiml-data.xsd` / `maiml-eventLog.xsd` のスキーマ定義に準拠する
- XSDバリデーターで検証した際にエラーが発生しないXMLを出力できる状態にする

### 期待される成果
- [ ] 空データ時の `<data>` に `<uuid>` と `<results>` が含まれる
- [ ] `<eventLog>` に `<uuid>` が含まれる
- [ ] `<log>` / `<trace>` / `<event>` に `<uuid>` が含まれる
- [ ] `<log>` / `<trace>` / `<event>` の `ref` 属性が必須出力になる
- [ ] eventLog `<property>` に `xsi:type` フォールバックが追加される

---

## 3. 修正対象一覧

| 違反ID | 関数名 | 修正内容 | 種別 |
|--------|--------|---------|------|
| D-1 | `buildDataXML()` | 空データ時に `<uuid>` + `<results id>` + `<uuid>` を出力 | 要素追加 |
| E-1 | `buildEventLogXML()` | `<eventLog>` 直下に `<uuid>` 追加 | 要素追加 |
| E-2 | `buildEventLogXML()` | 空データ時の早期リターンに `<uuid>` + 最小限 `<log>/<trace>/<event>` を追加 | 要素追加 |
| E-3 | `buildLogEntryXML()` | `<log>` 直下に `<uuid>` 追加 | 要素追加 |
| E-4 | `buildLogEntryXML()` | `ref` を条件付きから無条件出力に変更 | 属性修正 |
| E-5 | `buildTraceXML()` | `<trace>` 直下に `<uuid>` 追加 | 要素追加 |
| E-6 | `buildTraceXML()` | `ref` を条件付きから無条件出力に変更 | 属性修正 |
| E-7 | `buildEventXML()` | `<event>` 直下に `<uuid>` 追加 | 要素追加 |
| E-8 | `buildEventXML()` | `ref` を条件付きから無条件出力に変更 | 属性修正 |
| E-9 | `buildTraceXML()` | パターンBのスコープ確認（設計起因・対応方針を決定） | 設計判断 |
| E-10 | `buildPropertiesXML()` | `xsi:type` フォールバック（`'stringType'`）追加 | 属性修正 |

---

## 4. 実装ステップ

### Phase 1: `buildDataXML()` の空データ修正（違反 D-1）

**対象箇所** (maimlDataWriter.ts 約67行目):
```typescript
// 修正前
if (validRows.length === 0) {
  return `  <data id="${escapeXml(dataId)}">\n  </data>\n`;
}

// 修正後
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

### Phase 2: `buildEventLogXML()` の修正（違反 E-1 / E-2）

**E-1: `<eventLog>` に `<uuid>` を追加**

```typescript
// 修正前
let xml = `  <eventLog id="${escapeXml(eventLogId)}">\n`;

// 修正後
let xml = `  <eventLog id="${escapeXml(eventLogId)}">\n`;
xml += `    <uuid>${randomUUID()}</uuid>\n`;
```

**E-2: 空データ時の早期リターンを修正**

```typescript
// 修正前
if (!logJsonArray || logJsonArray.length === 0) {
  return `  <eventLog id="${escapeXml(eventLogId)}">\n  </eventLog>\n`;
}

// 修正後
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

> **備考**: eventLog が空の場合はそもそもMAIMLへの書き出しをスキップする運用とする場合は、空要素修正は不要。呼び出し元 (`maimlWriterService.ts`) でデータ有無チェックを行うことで回避可能。どちらの方針をとるかを確認してから実装する。

---

### Phase 3: `buildLogEntryXML()` の修正（違反 E-3 / E-4）

**E-3: `<log>` に `<uuid>` を追加**

```typescript
// 修正前
let xml = `    <log${attrs}>\n`;

// 修正後
let xml = `    <log${attrs}>\n`;
xml += `      <uuid>${randomUUID()}</uuid>\n`;
```

**E-4: `ref` 属性を無条件出力に変更**

```typescript
// 修正前
const ref = logEntry['@ref'] as string | undefined;
if (ref) attrs += ` ref="${escapeXml(ref)}"`;

// 修正後（ref がない場合は id を代用）
const ref = (logEntry['@ref'] as string | undefined)
  ?? (logEntry['@id'] as string | undefined)
  ?? '';
attrs += ` ref="${escapeXml(ref)}"`;
```

---

### Phase 4: `buildTraceXML()` の修正（違反 E-5 / E-6 / E-9）

**E-5: `<trace>` に `<uuid>` を追加**

```typescript
// 修正前
let xml = `      <trace${attrs}>\n`;

// 修正後
let xml = `      <trace${attrs}>\n`;
xml += `        <uuid>${randomUUID()}</uuid>\n`;
```

**E-6: `ref` 属性を無条件出力に変更**

```typescript
// 修正前
const ref = trace['@ref'] as string | undefined;
if (ref) attrs += ` ref="${escapeXml(ref)}"`;

// 修正後
const ref = (trace['@ref'] as string | undefined)
  ?? (trace['@id'] as string | undefined)
  ?? '';
attrs += ` ref="${escapeXml(ref)}"`;
```

**E-9: パターンB（`evnet` のみ）の対応方針**

`traceType` は `<event>` が必須（minOccurs=1）だが、パターンBでは `evnet` しか存在しない。  
以下の2案から方針を選択する：

- **案A（XSD準拠優先）**: パターンBの場合も空の `<event>` を必ず1件出力する
  ```typescript
  // evnet があって event がない場合、空の event を補完
  if (evnetObj && !eventObj) {
    xml += `        <event id="${escapeXml(id ?? 'event_placeholder')}" ref="${escapeXml(ref ?? '')}">`;
    xml += `\n          <uuid>${randomUUID()}</uuid>\n        </event>\n`;
  }
  ```
- **案B（現状維持）**: `evnet` はスキーマ外のtypo要素であり、XSDバリデーションを行わない運用とする。現状のままとし、コメントに明示する。

→ **本計画書では案Bを採用し、コメントを追加するのみとする**（MAIMLスキーマ本体のtypoを踏襲した意図的設計のため）。

---

### Phase 5: `buildEventXML()` の修正（違反 E-7 / E-8）

**E-7: `<event>` に `<uuid>` を追加**

```typescript
// 修正前
let xml = `        <event${attrs}>\n`;

// 修正後
let xml = `        <event${attrs}>\n`;
xml += `          <uuid>${randomUUID()}</uuid>\n`;
```

**E-8: `ref` 属性を無条件出力に変更**

```typescript
// 修正前
const ref = eventObj['@ref'] as string | undefined;
if (ref) attrs += ` ref="${escapeXml(ref)}"`;

// 修正後
const ref = (eventObj['@ref'] as string | undefined)
  ?? (eventObj['@id'] as string | undefined)
  ?? '';
attrs += ` ref="${escapeXml(ref)}"`;
```

---

### Phase 6: `buildPropertiesXML()` の修正（違反 E-10）

**E-10: `xsi:type` フォールバック追加**

```typescript
// 修正前
const xsiType = prop['@xsi:type'] as string | undefined;
if (xsiType) attrs += ` xsi:type="${escapeXml(xsiType)}"`;

// 修正後（フォールバック: stringType）
const xsiType = (prop['@xsi:type'] as string | undefined) ?? 'stringType';
attrs += ` xsi:type="${escapeXml(xsiType)}"`;
```

---

## 5. 変更ファイル一覧

### 修正対象

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/utils/maimlDataWriter.ts` | 上記 Phase 1〜6 の修正 |

### 新規作成

| ファイル | 内容 |
|---------|------|
| （なし） | 既存ファイルの修正のみ |

---

## 6. 技術的注意点

### uuid の生成方針
- 書き出し時に `crypto.randomUUID()` で動的生成する（案B）を採用済み
- DBに uuid が保存されていない要素（log/trace/event）も書き出し時に新規生成する

### 必須 `ref` 属性のフォールバック
- `log` / `trace` / `event` の `ref` は `xs:IDREF` 型（同一XML文書内の他要素の `id` を参照）
- DB JSONに `@ref` がない場合は `@id` を代用する。それもない場合は空文字（`""`）
- ただし `xs:IDREF` に空文字は XSD 上無効なため、呼び出し元でデータ品質を保証することが望ましい

### E-2（空eventLog時）の対応方針確認事項
- 空の `<eventLog>` を XSD 準拠の形で返すか
- または `maimlWriterService.ts` 側で eventLog レコードが0件の場合は書き出しをスキップするか
- **承認時に方針を確認する**

---

## 7. テスト計画

- [ ] `buildDataXML([])` → `<data>` に `<uuid>` と `<results id=...>` + `<uuid>` が含まれること
- [ ] `buildEventLogXML([])` → 空時の出力形式が正しいこと（方針決定後）
- [ ] `buildEventLogXML(logJsonArray)` → `<eventLog>` 直下に `<uuid>` が含まれること
- [ ] `buildLogEntryXML()` → `<log>` に `<uuid>` と `ref` 属性が含まれること
- [ ] `buildTraceXML()` → `<trace>` に `<uuid>` と `ref` 属性が含まれること（パターンA/B 両方）
- [ ] `buildEventXML()` → `<event>` に `<uuid>` と `ref` 属性が含まれること
- [ ] `buildPropertiesXML()` → `@xsi:type` がない場合に `xsi:type="stringType"` が出力されること
- [ ] 既存テスト (`backend/tests/utils/maimlDataWriter.test.ts`) が引き続きパスすること

---

## 8. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `ref` フォールバックが空文字になり xs:IDREF 違反が残る | 中 | 呼び出し元 (`maimlWriterService.ts`) でデータ品質チェックを追加 |
| 空 eventLog の XSD 準拠対応が複雑になる | 低 | maimlWriterService 側でスキップ処理を追加する案Bで対応 |
| uuid の動的生成により同一XML内で重複しない保証が必要 | 低 | `randomUUID()` は衝突確率が極めて低いため実用上問題なし |

---

## 9. 承認記録

- **計画書提示日時**: 2026-03-16 13:09
- **承認日時**: （承認時に記入）
- **承認者コメント**: （フィードバック記入欄）

### 承認前確認事項

承認前に以下の方針を確認してください：

1. **E-2（空eventLog時の出力）**: 空でも XSD 準拠の最小構造を返すか、`maimlWriterService` でスキップするか？
2. **E-9（パターンBのevnet）**: 現状維持（案B: XSDバリデーション不実施）で問題ないか？

---

## 10. 参照ドキュメント

| ドキュメント | 参照目的 |
|------------|---------|
| `REPORT_xsd_violation_check.md` | 本計画書の前提（違反詳細・根拠XSD） |
| `PLAN_maiml_data_eventlog_実装.md` | 元実装計画書 |
| `backend/src/utils/maimlDataWriter.ts` | 修正対象ファイル |
| `docs/design/maiml/maiml-eventLog.xsd` | eventLog スキーマ定義 |
| `docs/design/maiml/maiml-core.xsd` | globalObjectContentGroup 定義 |

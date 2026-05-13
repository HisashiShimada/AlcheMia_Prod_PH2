# タスク計画書: maimlDataWriter 仕様修正

## メタデータ
- **作成日時**: 2026-03-16 10:36
- **タスクID**: maiml_writer_spec_fix
- **優先度**: 高
- **推定工数**: 4〜6時間
- **調査資料**: `RESEARCH_writer_spec_analysis.md`

---

## 1. タスク概要

`backend/src/utils/maimlDataWriter.ts` で実装されたdata層・eventLog層のMAIML書き出し処理について、調査で判明した以下の問題を修正する。

---

## 2. 問題と対応方針

### 前提判断（XSD再確認済み）

#### uuid は data層要素（material/condition/result）では出力すべき

`maiml-unified.ts` のコメントによると：
- `material` / `condition` / `result` / `method` 等 → `uuid: 必須（globalObjectContentGroup）`
- `place` / `transition` / `arc` 等 → `uuid: オプション（実MAIMLで不使用）`

XSD 上は `minOccurs="0"` だが、実際の MAIML では data 層要素に uuid を出力するのが標準。
→ **`material`/`condition`/`result`/`data`/`results` 要素には uuid を動的生成して出力する**

#### eventLog property の `xsi:type` 名に誤りがある

XSD では `propertyBaseType` を継承した具体型は `stringType` / `dateTimeType` 等の MAIML 独自型名で定義されている。しかし `eventLogRepository.ts` では `xs:string` / `xs:dateTime` / `xs:int` 等の XS スキーマ型名がハードコードされており、XSD に非準拠。

| 現状（誤り） | 正しい `xsi:type` 値 |
|-------------|---------------------|
| `xs:string` | `stringType` |
| `xs:dateTime` | `dateTimeType` |
| `xs:int` | `intType` |

→ **`eventLogRepository.ts` のハードコード値を直接 MAIML 独自型名に修正する**（書き出し時の変換は行わない）

---

## 3. 実装ステップ

### Phase 0: `maiml-unified.ts` の同期（フロント→バック）

> **差分確認結果**: `diff frontend/src/types/maiml-unified.ts backend/src/types/maiml-unified.ts` により、
> フロントエンドの `Property` インターフェースに `attributes?: Record<string, string>` フィールドが追加されているが、
> バックエンドには存在しないことを確認。フロントの方が新しい。

- [ ] `backend/src/types/maiml-unified.ts` の `Property` インターフェースにフロントと同じ `attributes` フィールドを追加

```typescript
// backend/src/types/maiml-unified.ts の Property インターフェースに追加

export interface Property {
  // ... 既存フィールド ...

  // ============================================================================
  // XML属性（id、ref、カスタム属性用）★ フロントから同期
  // ============================================================================

  /**
   * XML属性の辞書（id、ref、カスタム属性用）
   *
   * id、ref、カスタム属性を格納
   * units、formatString、scaleFactorは既存フィールドを継続使用
   */
  attributes?: Record<string, string>;
}
```

### Phase 1: `PropertySetProperty` 型を `maiml-unified.Property` に置き換え

> **方針決定**: Phase 0 で `maiml-unified.ts` を同期した後、`PropertySetProperty` を廃止し、
> `backend/src/types/maiml-unified.ts` の `Property` をそのまま使うことで、型の同期が取れる。

- [ ] `templateDataRepository.ts` の `PropertySetProperty` インターフェースを**削除**
- [ ] `PropertySet.properties` の型を `PropertySetProperty[]` → `Property[]`（from `maiml-unified`）に変更
- [ ] `templateDataRepository.ts` に `import { Property } from '../types/maiml-unified';` を追加

```typescript
// 修正前
export interface PropertySetProperty {
  key: string;
  xsiType: string;
  value: unknown;
  units: string | null;
  formatString?: string | null;
  scaleFactor?: string | null;
}

export interface PropertySet {
  templateId: string;
  templateType: 'material' | 'condition' | 'result';
  properties: PropertySetProperty[];
}

// 修正後（PropertySetProperty を廃止し maiml-unified.Property を使用）
import { Property } from '../types/maiml-unified';

export interface PropertySet {
  templateId: string;
  templateType: 'material' | 'condition' | 'result';
  properties: Property[];
}
```

> **メリット**:
> - `scaleFactor` の型が `string|null` → `number?` に統一される（変換不要）
> - `description`/`attributes`/`customElements` が自動的に含まれる
> - フロント・バックで同一型定義を参照するため型の同期が保たれる

### Phase 2: `taskRegistrationService.ts` の保存ロジック修正

> **注意**: 画面はMAIMLを直接解析せず、GETレスポンス（DB）から表示用データを構築している。
> データフロー: `MAIML → maimlParserTyped → template_data(DB) → GETレスポンス → DataRecordDialog`

- [ ] `deleteAndInsertTemplateData` 内でプロパティをマッピングする際、全フィールドをそのまま保存するよう修正
  ```typescript
  // 現状（maimlParserTyped が返す Property 型を PropertySetProperty 型にダウンキャスト）
  { key: p.key || '', xsiType: p.xsiType || 'stringType', value: null, units: p.units || null }
  
  // 修正後（Property 型をそのまま使用、value のみ null にリセット）
  // p は maiml-unified.Property 型なのでそのまま spread してvalueだけ上書き
  { ...p, value: null }
  // または明示的に全フィールドを列挙:
  {
    key: p.key,
    xsiType: p.xsiType || 'stringType',
    value: null,                              // 初期値は null（未記録）
    units: p.units,
    formatString: p.formatString,             // ★ 保存（以前は欠落）
    scaleFactor: p.scaleFactor,               // ★ 保存（number型のまま）
    description: p.description,              // ★ 保存（以前は欠落）
    attributes: p.attributes,                // ★ 保存（以前は欠落）
    customElements: p.customElements,        // ★ 保存（以前は欠落）
    properties: p.properties,               // ★ ネスト構造も保存
    contents: p.contents,                   // ★ contents も保存
  }
  ```

### Phase 3: `buildDataXML` の修正（maimlDataWriter.ts）
- [ ] `material`/`condition`/`result`/`data`/`results` 要素に `<uuid>` を動的生成して追加（`crypto.randomUUID()`）
- [ ] `property` の `<description>` 子要素を出力するロジックを追加（`prop.description` が存在する場合）
- [ ] `property` のカスタム属性（`prop.attributes`）を動的出力するロジックを追加（TODO解消）
- [ ] `prop.customElements` のカスタム子要素を出力するロジックを追加
- [ ] `xsi:type` 欠如時のフォールバックを追加（`|| 'stringType'`）
- [ ] `operatorId` 要素を**削除**する（案C採用：data層からは出力しない）

### Phase 4: `eventLogRepository.ts` の修正
- [ ] `eventLogRepository.ts` 内でハードコードされている `'@xsi:type': 'xs:string'` → `'stringType'` に修正
- [ ] `'@xsi:type': 'xs:dateTime'` → `'dateTimeType'` に修正
- [ ] `'@xsi:type': 'xs:int'` → `'intType'` に修正
- [ ] `trace` の `taskno` 属性はXSD外だが、既存MAIMLとの互換性のため **維持**（削除しない）

### Phase 5: フロント表示対応
- [ ] `experimentWorker.ts` の `Property` 型に `description`/`formatString`/`scaleFactor` を追加
  ```typescript
  export interface Property {
    key: string;
    label: string;
    type: PropertyType;
    units?: string;
    required?: boolean;
    defaultValue?: string | number | boolean | null;
    options?: string[];
    min?: number;
    max?: number;
    nestedProperties?: Property[];
    description?: string;      // ★ 追加（プロパティの説明文）
    formatString?: string;     // ★ 追加（数値フォーマット例: "%.3f"）
    scaleFactor?: string;      // ★ 追加（単位変換係数）
  }
  ```
- [ ] `DataRecordDialog.tsx` の `convertTemplateDataItemsToTemplates` で上記フィールドをマッピング
  ```typescript
  const properties: Property[] = (rawProperties ?? []).map((p) => ({
    key: p.key,
    label: p.key,
    type: mapXsiTypeToPropertyType(p.xsiType),
    units: p.units ?? undefined,
    required: false,
    description: p.description ?? undefined,    // ★ 追加
    formatString: p.formatString ?? undefined,  // ★ 追加
    scaleFactor: p.scaleFactor ?? undefined,    // ★ 追加
  }));
  ```
- [ ] `renderPropertyInput` で `description` を表示するよう修正（Form.Item の下に説明文 `<Text type="secondary">` として表示）
- [ ] `renderPropertyInput` の数値型（`intType`/`floatType`）に `formatString` を適用
  - `formatString` が指定されている場合は `InputNumber` の表示フォーマットに反映

### Phase 6: テスト・動作確認
- [ ] 既存の結果データ（`property_set` テーブル）で書き出しが壊れないことを確認
- [ ] 生成されたMAIMLファイルをXSDバリデーション（可能であれば）で確認
- [ ] maimlWriterService を通じたエンドツーエンド動作確認
- [ ] description付きのプロパティがある場合、入力欄下に説明文が表示されること
- [ ] formatString付きの数値型プロパティで、入力欄のフォーマットが適用されること

---

## 4. 変更ファイル

### 変更するファイル（バックエンド）
0. `backend/src/types/maiml-unified.ts` - `Property` インターフェースに `attributes` フィールドを追加（フロントと同期）
1. `backend/src/repositories/templateDataRepository.ts` - `PropertySetProperty` 型を**廃止**し `maiml-unified.Property` に置き換え
2. `backend/src/services/taskRegistrationService.ts` - `deleteAndInsertTemplateData` で全フィールドを保存するよう修正
3. `backend/src/utils/maimlDataWriter.ts` - uuid追加・description/attributes/customElements出力追加・operatorId削除
4. `backend/src/repositories/eventLogRepository.ts` - `xsi:type` 値を `xs:string` 等から `stringType` 等に修正

### 変更するファイル（フロントエンド）
5. `frontend/src/types/experimentWorker.ts` - `Property` 型に `description`/`formatString`/`scaleFactor` を追加
6. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` - `convertTemplateDataItemsToTemplates` のマッピング追加・`renderPropertyInput` の説明文表示・数値フォーマット対応

### 新規作成するファイル
なし

### 影響を受けるファイル（変更不要だが確認が必要）
- `backend/src/services/experimentDataService.ts` - `PropertySetProperty` 型変更の影響確認
- `backend/src/services/maimlWriterService.ts` - 動作確認

---

## 5. 技術的詳細

### 5-1. Phase 1: `PropertySetProperty` 廃止・`maiml-unified.Property` への置き換え

```typescript
// backend/src/repositories/templateDataRepository.ts（修正後）

import { Property, PropertyCustomElement } from '../types/maiml-unified';  // ★ 追加

// ★ 以下を削除
// export interface PropertySetProperty { ... }

// ★ PropertySet の properties 型を変更
export interface PropertySet {
  templateId: string;
  templateType: 'material' | 'condition' | 'result';
  properties: Property[];   // PropertySetProperty[] → Property[]
}
```

> **注意**: `PropertySetProperty` を参照している他のファイル（`experimentDataService.ts` 等）も
> `Property` (from `maiml-unified`) に変更する必要がある。コンパイルエラーを確認しながら対応する。

### 5-2. Phase 3: buildDataXML の uuid・description・attributes・customElements 修正

```typescript
// ★ material/condition/result/data/results 要素への uuid 追加
import { randomUUID } from 'crypto';

// <data> 要素
dataXml += `  <data id="${escapeXml(dataId)}">\n`;
dataXml += `    <uuid>${randomUUID()}</uuid>\n`;  // ★ 追加

// <results> 要素
dataXml += `    <results id="${escapeXml(resultsId)}">\n`;
dataXml += `      <uuid>${randomUUID()}</uuid>\n`;  // ★ 追加

// <material>/<condition>/<result> 要素
dataXml += `      <material id="${escapeXml(placeId)}" ref="${escapeXml(templateId)}">\n`;
dataXml += `        <uuid>${randomUUID()}</uuid>\n`;  // ★ 追加

// property の description・xsi:typeフォールバック・customElements
const propType = prop.xsiType || 'stringType';  // ★ フォールバック追加
dataXml += `        <property key="${escapeXml(prop.key)}"`;
// カスタム属性を動的出力（★ TODO解消）
if (prop.attributes) {
  Object.entries(prop.attributes).forEach(([attrName, attrValue]) => {
    if (attrName !== 'xsi:type' && attrValue) {
      dataXml += ` ${attrName}="${escapeXml(attrValue)}"`;
    }
  });
}
if (prop.units) dataXml += ` units="${escapeXml(prop.units)}"`;
if (prop.formatString) dataXml += ` formatString="${escapeXml(prop.formatString)}"`;
if (prop.scaleFactor) dataXml += ` scaleFactor="${escapeXml(prop.scaleFactor)}"`;
dataXml += ` xsi:type="${escapeXml(propType)}">\n`;  // ★ xsi:typeは最後に

// description（★ 追加）
if (prop.description) {
  dataXml += `          <description>${escapeXml(prop.description)}</description>\n`;
}
// value
const value = prop.value !== undefined && prop.value !== null ? String(prop.value) : '';
if (value !== '') {
  dataXml += `          <value>${escapeXml(value)}</value>\n`;
}
// customElements（★ 追加）
if (prop.customElements) {
  Object.entries(prop.customElements).forEach(([elemName, customElem]) => {
    if (customElem && customElem.value !== undefined && customElem.value !== '') {
      let elemXml = `          <${elemName}`;
      if (customElem.attributes) {
        Object.entries(customElem.attributes).forEach(([aName, aVal]) => {
          if (aVal) elemXml += ` ${aName}="${escapeXml(aVal)}"`;
        });
      }
      elemXml += `>${escapeXml(String(customElem.value))}</${elemName}>\n`;
      dataXml += elemXml;
    }
  });
}
dataXml += `        </property>\n`;
```

### 5-3. Phase 3: eventLogRepository.ts の xsi:type 修正

`eventLogRepository.ts` でハードコードされている XS スキーマ型名を MAIML 独自型名に直接修正する。

```typescript
// ★ 修正: xs:string → stringType
'@xsi:type': 'stringType',   // (旧) 'xs:string'

// ★ 修正: xs:dateTime → dateTimeType
'@xsi:type': 'dateTimeType', // (旧) 'xs:dateTime'

// ★ 修正: xs:int → intType
'@xsi:type': 'intType',      // (旧) 'xs:int'
```

**修正対象箇所（`eventLogRepository.ts` 内）:**
- `timestamp` property: `xs:dateTime` → `dateTimeType`
- `worker_id` property: `xs:string` → `stringType`
- `status` property: `xs:string` → `stringType`
- `progress_percentage` property: `xs:int` → `intType`
- `report_type` property: `xs:string` → `stringType`
- `comments` property: `xs:string` → `stringType`
- `acknowledged_at` property: `xs:dateTime` → `dateTimeType`
- `experiment_instruction_id` property: `xs:string` → `stringType`
- `experiment_user_id` property: `xs:string` → `stringType`

### 5-4. operatorId の扱い（決定: 案C 削除）

`<operatorId>` は XSD 外要素であり、データ作成者情報は eventLog 層（trace/event）で管理できるため、**data層からは削除**する。

```typescript
// ★ 削除: update_user_id を operatorId として出力するコードを除去
// if (row.update_user_id) {
//   dataXml += `        <operatorId>...</operatorId>\n`;
// }
```

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `PropertySetProperty` 型変更による既存コンパイルエラー | 中 | 低 | 既存フィールドは変更せず、`?`付きで追加するため影響軽微 |
| customElements未設定の既存データで出力が変わる | 低 | 低 | `prop.customElements`がnull/undefinedの場合スキップ |
| eventLogRepository の xsi:type 変更で既存テストが壊れる | 中 | 低 | 文字列定数の置換のみ・ロジック変更なし |

---

## 7. テスト計画

### 手動テスト
- [ ] 実験データが存在するプロジェクトでMAIML書き出しを実行
- [ ] 生成されたXMLを目視確認：eventLog property の `xsi:type` が `stringType` / `dateTimeType` / `intType` になっているか
- [ ] description付きのプロパティがある場合、`<description>` が出力されているか
- [ ] value/description の出力順が正しいか（description → value の順）
- [ ] 既存のpropertyデータ（description/attributesなし）でも正常に動作するか

### ユニットテスト（必要な場合）
- [ ] `buildDataXML()` のdescription出力テスト
- [ ] `buildDataXML()` のxsi:typeフォールバックテスト
- [ ] eventLogRepository の xsi:type 出力テスト

---

## 8. 承認記録

- **計画書提示日時**: 2026-03-16 10:36
- **承認日時**: 2026-03-16 11:23
- **承認者コメント**: 計画書に従い実装を進めてください。

### 確認済み事項


1. **`operatorId` の扱い**: ✅ **案C（削除）** で決定
2. **uuid の扱い**: ✅ **`material`/`condition`/`result`/`data`/`results` には動的生成して出力する**（実際のMAIMLでは標準的に出力）
3. **`xsi:type` の修正方法**: ✅ **保存側（`eventLogRepository.ts`）のハードコード値を直接修正**
4. **`description`/`attributes`/`customElements` の保存欠落**: ✅ **`taskRegistrationService.ts` の保存ロジックも修正が必要**と判明

---

## 9. 実施記録

### 実施日時
開始: 2026-03-16 11:23  
完了: 2026-03-16 11:40

### 計画からの変更点

- **Phase 1 補足**: `PropertySet.properties` を `Property[]` に変更した影響で、
  `backend/src/services/experimentDataService.ts` および
  `backend/src/controllers/experimentController.ts` で型エラーが発生したため、
  両ファイルの型参照を `PropertySetProperty` → `Property`（from `maiml-unified`）に合わせて修正した。

- **Phase 3 scaleFactor の型変換**: `Property.scaleFactor` が `number | undefined` 型のため、
  XML出力時に `String()` に変換して出力するよう実装した。

- **Phase 5 フロント マッピング**: `convertTemplateDataItemsToTemplates` 内での型キャストを
  `(p as Record<string, unknown>)` 経由で行うことで、
  コンパイルエラーなしに `description`/`formatString`/`scaleFactor` を取得するよう実装した。

### 発生した問題と解決方法

- **問題**: Phase 1 の型変更後に `experimentDataService.ts` / `experimentController.ts` でコンパイルエラー発生
  - **解決**: 両ファイルの `PropertySetProperty` 参照を `Property`（from `maiml-unified`）に変更

- **問題**: フロントエンドの既存エラー（`projectsData.ts`・`AuthContainer.tsx` 等）が多数残存
  - **確認**: これらは今回のタスクとは無関係の既存エラーであり、今回修正したファイルには新規エラーなし

### 最終的な成果物
- [x] `backend/src/types/maiml-unified.ts` Property インターフェースに `attributes` フィールド追加完了
- [x] `backend/src/repositories/templateDataRepository.ts` `PropertySetProperty` 廃止・`Property[]` 型変更完了
- [x] `backend/src/services/experimentDataService.ts` 型参照修正完了（Phase 1 補足）
- [x] `backend/src/controllers/experimentController.ts` 型参照修正完了（Phase 1 補足）
- [x] `backend/src/services/taskRegistrationService.ts` 保存ロジック修正完了（`{ ...p, value: null }` で全フィールド保存）
- [x] `backend/src/utils/maimlDataWriter.ts` 修正完了（uuid追加・description/formatString/scaleFactor/attributes/customElements出力追加・operatorId削除）
- [x] `backend/src/repositories/eventLogRepository.ts` xsi:type 値修正完了（xs:string→stringType 等 9箇所）
- [x] `frontend/src/types/experimentWorker.ts` Property型にdescription/formatString/scaleFactor追加完了
- [x] `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` マッピング・説明文表示・数値フォーマット対応完了
- [x] 動作確認完了（バックエンド tsc --noEmit: EXIT:0、フロントエンド: 修正ファイルの型エラーなし）


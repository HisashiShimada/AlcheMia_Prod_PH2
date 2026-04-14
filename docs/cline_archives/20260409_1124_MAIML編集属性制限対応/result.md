# 実施結果: MAIML編集画面 属性制限対応

- **完了日時**: 2026-04-09 14:27
- **タスクID**: 20260409_1124_MAIML編集属性制限対応

---

## 対応した問題

### 問題① 編集画面で型不適合な属性を追加できてしまう
**NestedPropertyEditor** の属性追加モーダルで `xsi:type` に関わらず `units` / `formatString` / `scaleFactor` が常に選択可能だった。

### 問題② 解析処理が型不適合属性を復元しない
**maimlTypeConverter.ts** の `convertXmlJsProperty` が `xsi:type` 別に復元するフィールドを固定しているため、型と不一致な属性は保存→再読み込みで消失していた。

### 問題③ xsiType未指定時に stringType として強制変換
`xsi:type` がないプロパティ・content でも `stringType` / `contentDoubleListType` に上書きされ、保存時に `xsi:type="stringType"` が付加されていた。

---

## 実装内容

### Phase 1: 型別許可属性マッピング定義（前タスクにて実装済み）

**新規作成: `frontend/src/utils/xsiTypeAttributes.ts`**

- `ALLOWED_ATTRIBUTES_BY_XSI_TYPE` 定数: xsi:type ごとに許可される属性名セットを定義
  - 数値型（intType / doubleType / floatType 等）: `['units', 'formatString', 'scaleFactor']`
  - dateTimeType / dateTimeListType: `['formatString']`
  - stringType / booleanType / propertyListType 等: `[]`（属性なし）
- `getAllowedAttributeNames(xsiType)` 関数:
  - `null` 返却 → xsi:type 未設定（制限なし）
  - `[]` 返却 → 追加可能な型依存属性なし
  - 配列返却 → 許可される属性名リスト

---

### Phase 2: NestedPropertyEditor 属性追加モーダル修正（前タスクにて実装済み）

**修正: `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx`**

- `getAllowedAttributeNames` をインポート
- 現在の `xsi:type` から `allowedAttrs` を算出
- `showUnits` / `showFormatString` / `showScaleFactor` フラグで固定属性の表示制御
  - 数値型: 全3属性を表示
  - dateTimeType: formatString のみ表示
  - stringType / booleanType 等: 全3属性を非表示
  - xsi:type 未設定: 全3属性を表示（制限なし）
- **マスタ属性グループはフィルタリングしない**（ユーザーが登録したカスタム属性は常に全件表示）

---

### Phase 3: maimlTypeConverter.ts xsiType未指定修正（今回実装）

**修正: `frontend/src/utils/maimlTypeConverter.ts`**

#### convertXmlJsProperty の変更

```ts
// 修正前: xsi:type 未指定時も stringType に強制変換
const xsiType = (xmlProp._attributes?.['xsi:type'] || 'stringType') as PropertyType;
// ... デフォルトブランチ
const result: Property = { key, xsiType: 'stringType', ... };

// 修正後: 空文字で保持（stringType 強制変換を廃止）
const xsiType = (xmlProp._attributes?.['xsi:type'] || '') as PropertyType;
// ... デフォルトブランチ
const result: Property = { key, xsiType: '' as PropertyType, ... };
```

#### convertContent の変更

```ts
// 修正前
const xsiType = (xmlContent._attributes?.['xsi:type'] || 'contentStringListType') as PropertyType;

// 修正後
const xsiType = (xmlContent._attributes?.['xsi:type'] || '') as PropertyType;
```

---

### Phase 3 補完: シリアライザー側の修正（今回実装）

解析側で空文字になった `xsiType` が出力時に `xsi:type="stringType"` として書き出されないよう、**XML出力側も一貫して修正**。

#### templateConverter.ts（4箇所）

**修正: `frontend/src/components/editorv2/utils/templateConverter.ts`**

```ts
// 修正前（|| 'stringType' / || 'contentStringListType' でデフォルト補完）
const xsiType = prop.xsiType || 'stringType';
const xsiType = content.xsiType || 'contentStringListType';

// 修正後（空文字のまま保持）
const xsiType = prop.xsiType || '';
const xsiType = content.xsiType || '';
```

空文字の場合は `xsi:type` 属性自体を出力しないガードを追加：

```ts
if (xsiType) {
  result['_attributes']['xsi:type'] = xsiType;
}
```

#### editorv2/utils/converters/reactFlowToMaiml.ts

**修正: `buildPropertyXML` / `buildContentXML`**

```ts
// 修正前
const propType = prop.xsiType || 'stringType';
propertyXml += ` xsi:type="${escapeXml(propType)}">\n`;

// 修正後
const propType = prop.xsiType || '';
if (propType) {
  propertyXml += ` xsi:type="${escapeXml(propType)}"`;
}
propertyXml += `>\n`;
```

```ts
// 修正前
const xsiType = content.xsiType || 'contentDoubleListType';
contentXml += ` xsi:type="${escapeXml(xsiType)}"`;

// 修正後
const xsiType = content.xsiType || '';
if (xsiType) {
  contentXml += ` xsi:type="${escapeXml(xsiType)}"`;
}
```

#### utils/converters/reactFlowToMaiml.ts

**修正: `buildPropertyXML` / `buildContentXML`**（同上）

```ts
// 修正前
const propType = prop.attributes?.['xsi:type'] || prop.type || prop.xsiType || 'stringType';
propertyXml += ` xsi:type="${escapeXml(propType)}">\n`;

// 修正後
const propType = prop.attributes?.['xsi:type'] || prop.type || prop.xsiType || '';
if (propType) {
  propertyXml += ` xsi:type="${escapeXml(propType)}"`;
}
propertyXml += `>\n`;
```

```ts
// 修正前
const xsiType = content.contentType || content.xsiType || content.type || 'contentDoubleListType';
contentXml += ` xsi:type="${escapeXml(xsiType)}"`;

// 修正後
const xsiType = content.contentType || content.xsiType || content.type || '';
if (xsiType) {
  contentXml += ` xsi:type="${escapeXml(xsiType)}"`;
}
```

---

## 修正ファイル一覧

| ファイル | Phase | 変更概要 |
|---------|-------|---------|
| `frontend/src/utils/xsiTypeAttributes.ts` | Phase 1 | **新規作成** 型別許可属性マッピング定義 |
| `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx` | Phase 2 | 属性追加モーダルに型制限 UI を追加 |
| `frontend/src/utils/maimlTypeConverter.ts` | Phase 3 | `\|\| 'stringType'` / `\|\| 'contentStringListType'` を `\|\| ''` に変更（3箇所） |
| `frontend/src/components/editorv2/utils/templateConverter.ts` | Phase 3補完 | `\|\| 'stringType'` / `\|\| 'contentStringListType'` を `\|\| ''` に変更し、空文字時に属性出力しない（4箇所） |
| `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts` | Phase 3補完 | `buildPropertyXML` / `buildContentXML` で空文字時に `xsi:type` 属性を出力しない |
| `frontend/src/utils/converters/reactFlowToMaiml.ts` | Phase 3補完 | 同上 |

---

## 動作の変化

### xsi:type が未指定のプロパティ

| タイミング | 修正前 | 修正後 |
|-----------|--------|--------|
| XML 解析時 | `xsiType: 'stringType'` に強制変換 | `xsiType: ''` で保持 |
| XML 出力時 | `xsi:type="stringType"` を付加 | `xsi:type` 属性を出力しない |

### 型不適合な属性の追加

| 操作 | 修正前 | 修正後 |
|------|--------|--------|
| stringType に units を追加 | 選択可能（保存→消失） | 選択肢に表示されない |
| booleanType に scaleFactor を追加 | 選択可能（保存→消失） | 選択肢に表示されない |
| 数値型に units を追加 | 選択可能（保存後も保持） | 選択可能（保存後も保持）|
| dateTimeType に formatString を追加 | 選択可能（保存後も保持） | 選択可能（保存後も保持）|

---

## ビルド確認

- TypeScript コンパイル: **今回修正ファイルにエラーなし**
- 既存エラー（`BulkUploadDialog.tsx` の `Paragraph` 未定義）は本タスクと無関係

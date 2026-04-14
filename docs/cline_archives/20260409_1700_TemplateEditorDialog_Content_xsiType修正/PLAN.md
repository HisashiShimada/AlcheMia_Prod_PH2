# タスク計画書: TemplateEditorDialog の Content xsi:type 選択肢を DataRecordDialog に合わせる

## メタデータ
- **作成日時**: 2026-04-09 17:00
- **タスクID**: TemplateEditorDialog_Content_xsiType修正
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`TemplateEditorDialog.tsx` 内で使用される `NestedPropertyEditor.tsx` の `xsi:type` 選択肢が、`content` タグの場合に `DataRecordDialog.tsx` の ContentType 選択肢と一致していない。
DataRecordDialog 側が正しい仕様であるため、NestedPropertyEditor を修正する。

---

## 現状の問題

### NestedPropertyEditor.tsx（現状）

`tagName === 'content'` のプロパティに `xsi:type` 属性を追加する際も、  
property 向けの `MAIML_PROPERTY_TYPES`（`stringType`, `doubleType` 等）が選択肢として表示される。

現在の選択肢（抜粋）:
```
Simple Types:
  stringType, tokenType, idType, idRefType, qualifiedNameType, dateTimeType,
  decimalType, doubleType, floatType, intType, longType, shortType, byteType,
  unsignedIntType, unsignedLongType, unsignedShortType, unsignedByteType,
  booleanType, base64BinaryType, hexBinaryType, uriType, uuidType, languageType

List Types:
  propertyListType, stringListType, idRefListType, qualifiedNameListType,
  dateTimeListType, decimalListType, doubleListType, floatListType, intListType,
  longListType, shortListType, byteListType, unsignedIntListType,
  unsignedLongListType, unsignedShortListType, unsignedByteListType,
  booleanListType, base64BinaryListType, hexBinaryListType, uriListType,
  uuidListType, languageListType, stringEnumType
```

### DataRecordDialog.tsx（正しい仕様）

Content 用 xsi:type の選択肢 `KNOWN_CONTENT_TYPES`:
```
contentStringListType
contentIntListType
contentLongListType
contentShortListType
contentByteListType
contentUnsignedIntListType
contentFloatListType
contentDoubleListType
contentDecimalListType
contentBooleanListType
contentDateTimeListType
```

---

## 目的と期待される成果

- [ ] NestedPropertyEditor で `tagName === 'content'` のノードに `xsi:type` を追加する際、`content*ListType` 系の選択肢のみが表示される
- [ ] デフォルト値 `contentDoubleListType`（既存コードにすでに存在）が正しく機能する
- [ ] DataRecordDialog の KNOWN_CONTENT_TYPES と同じ 11 種類が選択肢として表示される

---

## 実装ステップ

### Phase 1: NestedPropertyEditor.tsx の修正

- [ ] `MAIML_PROPERTY_TYPES` の定義の近くに `MAIML_CONTENT_TYPES` 定数を新規追加
  - DataRecordDialog の `KNOWN_CONTENT_TYPES` と同じ 11 種類を定義
  - 各エントリに `value`, `label` を持たせる

- [ ] xsi:type の Select コンポーネント（`newAttributeName === 'xsi:type'` ブロック）を修正
  - `isContent` フラグが `true` の場合 → `MAIML_CONTENT_TYPES` を使って選択肢を描画
  - `isContent` フラグが `false` の場合 → 現状と同じ `MAIML_PROPERTY_TYPES` を使用

---

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx` | `MAIML_CONTENT_TYPES` 追加 + xsi:type Select の条件分岐修正 |

---

## 詳細: 修正後の MAIML_CONTENT_TYPES 定義

```typescript
/** content タグ向け xsi:type 選択肢（DataRecordDialog の KNOWN_CONTENT_TYPES と一致させる） */
const MAIML_CONTENT_TYPES: Array<{ value: string; label: string }> = [
  { value: 'contentStringListType',     label: 'contentStringListType - 文字列リスト' },
  { value: 'contentIntListType',        label: 'contentIntListType - 整数リスト' },
  { value: 'contentLongListType',       label: 'contentLongListType - 長整数リスト' },
  { value: 'contentShortListType',      label: 'contentShortListType - 短整数リスト' },
  { value: 'contentByteListType',       label: 'contentByteListType - バイトリスト' },
  { value: 'contentUnsignedIntListType',label: 'contentUnsignedIntListType - 符号なし整数リスト' },
  { value: 'contentFloatListType',      label: 'contentFloatListType - 単精度実数リスト' },
  { value: 'contentDoubleListType',     label: 'contentDoubleListType - 倍精度実数リスト' },
  { value: 'contentDecimalListType',    label: 'contentDecimalListType - 10進数リスト' },
  { value: 'contentBooleanListType',    label: 'contentBooleanListType - 真偽値リスト' },
  { value: 'contentDateTimeListType',   label: 'contentDateTimeListType - 日時リスト' },
];
```

## 詳細: xsi:type Select の修正イメージ

**修正前（isContent に関係なく MAIML_PROPERTY_TYPES を使用）:**
```tsx
newAttributeName === 'xsi:type' ? (
  <Select ...>
    <Option disabled>--- Simple Types ---</Option>
    {MAIML_PROPERTY_TYPES.filter(t => t.category === 'Simple').map(type => (
      <Option key={type.value} value={type.value}>{type.label}</Option>
    ))}
    <Option disabled>--- List Types ---</Option>
    {MAIML_PROPERTY_TYPES.filter(t => t.category === 'List').map(type => (
      <Option key={type.value} value={type.value}>{type.label}</Option>
    ))}
  </Select>
) : ...
```

**修正後（isContent のとき MAIML_CONTENT_TYPES に切り替え）:**
```tsx
newAttributeName === 'xsi:type' ? (
  isContent ? (
    /* content タグ → contentXxxListType 系のみ */
    <Select ...>
      {MAIML_CONTENT_TYPES.map(type => (
        <Option key={type.value} value={type.value}>{type.label}</Option>
      ))}
    </Select>
  ) : (
    /* property タグ → 従来どおり */
    <Select ...>
      <Option disabled>--- Simple Types ---</Option>
      {MAIML_PROPERTY_TYPES.filter(t => t.category === 'Simple').map(type => (
        <Option key={type.value} value={type.value}>{type.label}</Option>
      ))}
      <Option disabled>--- List Types ---</Option>
      {MAIML_PROPERTY_TYPES.filter(t => t.category === 'List').map(type => (
        <Option key={type.value} value={type.value}>{type.label}</Option>
      ))}
    </Select>
  )
) : ...
```

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 既存の content に property 系 xsi:type が設定済みの場合、表示が変わる | 低 | xsi:type の表示（Tag）は変わらず。あくまで「追加時の選択肢」が変わるだけ |
| NestedPropertyEditor が property/content 以外のタグ名に使われる場合 | 低 | `isContent` は `tagName === 'content'` で判定しており限定的 |

---

## テスト計画

- [ ] TemplateEditorDialog の Content タブで content を追加し、xsi:type 属性を追加しようとしたとき `contentXxxListType` 系のみが表示されること
- [ ] TemplateEditorDialog の Properties タブで property に xsi:type を追加しようとしたとき、従来どおり `MAIML_PROPERTY_TYPES`（Simple/List）が表示されること
- [ ] content の xsi:type 追加後、デフォルト値が `contentDoubleListType` になっていること

---

## 承認記録
- **計画書提示日時**: 2026-04-09 17:00
- **承認日時**: （承認後に記入）

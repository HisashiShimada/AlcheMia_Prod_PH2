# 修正結果: TemplateEditorDialog Content xsi:type 選択肢修正

## メタデータ
- **作成日時**: 2026-04-09 16:55
- **対象タスク**: NestedPropertyEditor の `content` タグ `xsi:type` 選択肢を DataRecordDialog に合わせる
- **ステータス**: ✅ 完了

---

## 問題の概要

`TemplateEditorDialog` 内で使用している `NestedPropertyEditor` において、`content` タグの属性追加モーダルで `xsi:type` を選択する際、`DataRecordDialog` の選択肢（`contentXxxListType` 系）と異なる選択肢（property 向けの `MAIML_PROPERTY_TYPES`）が表示されていた。

| ダイアログ | 表示されていた選択肢 |
|-----------|------------------|
| `DataRecordDialog`（正しい） | `contentStringListType`, `contentIntListType`, … など content 専用 11 種 |
| `NestedPropertyEditor`（修正前） | `stringType`, `intType`, … などの property 向け 46 種 |

---

## 修正内容

### 変更ファイル

| ファイル | 変更種別 |
|---------|---------|
| `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx` | 修正 |

---

### 変更詳細

#### 1. `MAIML_CONTENT_TYPES` 定数を新規追加

`MAIML_PROPERTY_TYPES` 定数の直後に、`content` タグ専用の xsi:type 選択肢定数を追加。
`DataRecordDialog` の `KNOWN_CONTENT_TYPES` と完全に一致させた。

```typescript
/** content タグ向け xsi:type 選択肢（DataRecordDialog の KNOWN_CONTENT_TYPES と一致させる） */
const MAIML_CONTENT_TYPES: Array<{ value: string; label: string }> = [
  { value: 'contentStringListType',      label: 'contentStringListType - 文字列リスト' },
  { value: 'contentIntListType',         label: 'contentIntListType - 整数リスト' },
  { value: 'contentLongListType',        label: 'contentLongListType - 長整数リスト' },
  { value: 'contentShortListType',       label: 'contentShortListType - 短整数リスト' },
  { value: 'contentByteListType',        label: 'contentByteListType - バイトリスト' },
  { value: 'contentUnsignedIntListType', label: 'contentUnsignedIntListType - 符号なし整数リスト' },
  { value: 'contentFloatListType',       label: 'contentFloatListType - 単精度実数リスト' },
  { value: 'contentDoubleListType',      label: 'contentDoubleListType - 倍精度実数リスト' },
  { value: 'contentDecimalListType',     label: 'contentDecimalListType - 10進数リスト' },
  { value: 'contentBooleanListType',     label: 'contentBooleanListType - 真偽値リスト' },
  { value: 'contentDateTimeListType',    label: 'contentDateTimeListType - 日時リスト' },
];
```

#### 2. xsi:type 属性値 Select を `tagName` で条件分岐

属性追加モーダルの「属性値入力欄」において、`xsi:type` 選択時の Select コンポーネントを `propertyData.tagName === 'content'` で分岐。

```tsx
{newAttributeName === 'xsi:type' ? (
  propertyData.tagName === 'content' ? (
    // content タグ → contentXxxListType 系 11 種
    <Select placeholder="Content Type" ...>
      {MAIML_CONTENT_TYPES.map(type => (
        <Option key={type.value} value={type.value}>{type.label}</Option>
      ))}
    </Select>
  ) : (
    // property / parameter タグ → Simple/List カテゴリ別 46 種
    <Select placeholder="MaiML Property Type" ...>
      <Option disabled>--- Simple Types ---</Option>
      {MAIML_PROPERTY_TYPES.filter(t => t.category === 'Simple').map(...)}
      <Option disabled>--- List Types ---</Option>
      {MAIML_PROPERTY_TYPES.filter(t => t.category === 'List').map(...)}
    </Select>
  )
) : ...}
```

---

## 修正後の挙動

| タグ名 | xsi:type 選択肢 |
|-------|---------------|
| `content` | `MAIML_CONTENT_TYPES`（`contentXxxListType` 系 11 種） |
| `property` / `parameter` | `MAIML_PROPERTY_TYPES`（Simple 23 種 + List 23 種） |

---

## ビルドチェック結果

```
NestedPropertyEditor.tsx 由来のエラー: 0 件
（表示されたエラーはすべて既存の無関係なエラー）
```

---

## 関連ファイル

| ファイル | 役割 |
|---------|------|
| `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx` | 今回修正対象 |
| `frontend/src/components/DataRecordDialog.tsx` | 正解の選択肢定義（`KNOWN_CONTENT_TYPES`）を持つ参照元 |

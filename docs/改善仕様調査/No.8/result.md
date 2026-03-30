# 対応結果まとめ: PropertyViewer 未設定値区別・ツールチップ対応

**作成日時**: 2026-03-30 14:17  
**最終更新**: 2026-03-30 14:54  
**担当**: Cline

---

## 対応ファイル一覧

| ファイル | 対応内容 | 対応日時 |
|----------|----------|----------|
| `frontend/src/components/viewer/dialogs/PropertyViewer.tsx` | renderValue改善・テンプレート列ツールチップ | 2026-03-30 13:37 |
| `frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx` | 同上 | 2026-03-30 13:37 |
| `frontend/src/components/viewer/dialogs/StructuredPropertySelector.tsx` | formatPropertyValue改善・ツールチップ | 2026-03-30 13:37 |

---

## 対応1: null / undefined / 空文字 / boolean の区別表示

### 対象ファイル
- `PropertyViewer.tsx`
- `PropertyViewerWithSelection.tsx`

### 変更内容

#### `getPropertyValue()` 修正

```typescript
// 変更前
const getPropertyValue = (propObj: PropertyObject): unknown => {
  if (propObj.value !== undefined) return propObj.value;
  if (propObj.defaultValue !== undefined) return propObj.defaultValue;
  return '未設定';  // ← 文字列を返していた
};

// 変更後
const getPropertyValue = (propObj: PropertyObject): unknown => {
  if (propObj.value !== undefined) return propObj.value;
  if (propObj.defaultValue !== undefined) return propObj.defaultValue;
  return undefined;  // ← undefined を返すよう変更（renderValue が処理）
};
```

#### `renderValue()` 修正

```typescript
// 変更前
const renderValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return <Text type="secondary" italic>未設定</Text>;  // null/undefined/"" を同一視
  }
  if (typeof value === 'boolean') {
    return value ? <Tag color="success">はい</Tag> : <Tag color="error">いいえ</Tag>;
  }
  // ...
};

// 変更後
const renderValue = (value: unknown) => {
  // undefined: プロパティ自体が未設定
  if (value === undefined) {
    return (
      <Tooltip title="値が設定されていません">
        <Text type="secondary" italic style={{ color: '#bfbfbf' }}>未設定</Text>
      </Tooltip>
    );
  }
  // null: 明示的に null が設定されている
  if (value === null) {
    return (
      <Tooltip title="null が設定されています">
        <Text type="secondary" italic style={{ color: '#bfbfbf' }}>null</Text>
      </Tooltip>
    );
  }
  // 空文字: 値は存在するが中身が空
  if (value === '') {
    return (
      <Tooltip title="空の文字列が設定されています">
        <Text type="secondary" italic style={{ color: '#bfbfbf' }}>
          {`""`} <Text type="secondary" style={{ fontSize: 10 }}>(空文字)</Text>
        </Text>
      </Tooltip>
    );
  }
  // boolean: true/false をそのまま表示（「はい/いいえ」から変更）
  if (typeof value === 'boolean') {
    return value
      ? <Tag color="success">true</Tag>
      : <Tag color="error">false</Tag>;
  }
  // ...
};
```

#### 区別表示まとめ

| 値の状態 | 変更前 | 変更後 |
|----------|--------|--------|
| `undefined` | 「未設定」斜体 | 「未設定」斜体 + ツールチップ「値が設定されていません」 |
| `null` | 「未設定」斜体 | 「null」斜体 + ツールチップ「null が設定されています」 |
| `""` (空文字) | 「未設定」斜体 | `""(空文字)` + ツールチップ「空の文字列が設定されています」 |
| `0` | 文字列 "0" として表示 | 同上（変更なし） |
| `true` | `<Tag>はい</Tag>` | `<Tag color="success">true</Tag>` |
| `false` | `<Tag>いいえ</Tag>` | `<Tag color="error">false</Tag>` |

---

## 対応2: テンプレートタブの列ツールチップ対応

### 対象ファイル
- `PropertyViewer.tsx`
- `PropertyViewerWithSelection.tsx`

### 変更内容

#### `xsi:type` 列レンダラー

```typescript
// 変更前
render: (text: string) => text
  ? <Text type="secondary" style={{ fontSize: 11 }}>{text}</Text>
  : null,  // 未設定の場合は何も表示しない

// 変更後
render: (text: string) => text
  ? <Text type="secondary" style={{ fontSize: 11 }}>{text}</Text>
  : (
    <Tooltip title="xsi:type が設定されていません">
      <Text type="secondary" style={{ fontSize: 11, color: '#bfbfbf' }}>-</Text>
    </Tooltip>
  ),
```

#### `説明/単位` 列レンダラー

```typescript
// 変更前
render: (text: string) => text
  ? <Text type="secondary" style={{ fontSize: 11 }}>{text}</Text>
  : null,  // 未設定の場合は何も表示しない

// 変更後
render: (text: string) => text
  ? <Text type="secondary" style={{ fontSize: 11 }}>{text}</Text>
  : (
    <Tooltip title="説明・単位が設定されていません">
      <Text type="secondary" style={{ fontSize: 11, color: '#bfbfbf' }}>-</Text>
    </Tooltip>
  ),
```

#### テンプレート/データタブが空の場合

```typescript
// 変更前
<Text type="secondary">表示するプロパティがありません</Text>

// 変更後
<Tooltip title="このノードにはテンプレートが設定されていません">
  <Text type="secondary" style={{ cursor: 'default' }}>表示するプロパティがありません</Text>
</Tooltip>
```

---

## 対応3: StructuredPropertySelector.tsx の修正

### 対象ファイル
- `frontend/src/components/viewer/dialogs/StructuredPropertySelector.tsx`

### 変更内容

`formatPropertyValue()` 関数を文字列返却から `{ text, kind }` オブジェクト返却に変更し、
テーブル値レンダラーでツールチップを付与するよう改善。

```typescript
// 変更前
const formatPropertyValue = (propertyObj: PropertyObject | unknown): string => {
  if (value === null || value === undefined || value === '') {
    return '未設定';  // 同一視
  }
  return String(value);
};

// 変更後
// null / undefined / "" を区別してツールチップ付きで表示
```

---

## ビルド状況

- 全対応後ビルド確認済み: ✅ `Compiled successfully`
- TypeScript エラーなし

---

## 補足: 調査過程で誤って対応した内容（実施後リバート済み）

セッション中に `PetriNetViewer.tsx` の `findTemplateElementById` 関数内の  
`getElementsByTagName` → `getElementsByTagNameNS('*', tagName)` への変更を試みたが、  
**Place とテンプレートの紐づけ・データの紐づけ部は別の問題**であったため、  
当該変更はユーザーによってリバートされた。ツールチップ表示自体は正しく動作していた。

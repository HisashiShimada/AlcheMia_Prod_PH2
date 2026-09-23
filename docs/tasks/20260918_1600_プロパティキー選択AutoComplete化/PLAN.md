# タスク計画書: プロパティキー選択 AutoComplete 化

## メタデータ
- **作成日時**: 2026-09-18 16:00
- **タスクID**: 20260918_1600_プロパティキー選択AutoComplete化
- **優先度**: 中
- **推定工数**: 1〜2時間

---

## タスク概要

以下2箇所でプロパティ `key` を選択する際に `<Select>` プルダウンを使用しており、DB 未登録の任意キーを設定できない問題がある。

| 箇所 | ファイル | 対象 UI |
|------|----------|---------|
| ① 新規プロパティ追加ダイアログ | `TemplateEditorDialog.tsx` | `handleAddProperty` モーダル内の用語選択 `<Select>` |
| ② 属性ボタン → Key 変更 | `NestedPropertyEditor.tsx` | 属性追加モーダル内の `key` 属性値入力 `<Select>` |

**対応**: 両箇所を **`<AutoComplete>`** に変更し、DB 登録済み用語を候補表示しながら任意文字列も入力可能にする。

---

## 目的と期待される成果

- [ ] ネームスペース未登録の任意文字列をプロパティキーとして設定できる
- [ ] DB 登録済み用語は引き続き候補として表示・選択できる（型・単位タグも表示）
- [ ] NestedPropertyEditor の `key` 属性変更でも任意文字列が設定できる

---

## 現状分析

### ① TemplateEditorDialog.tsx — プロパティ追加モーダル（L2252〜L2305）

`<Select showSearch>` で termMap の選択肢にない値は onChange が呼ばれず newPropertyKey に反映されない。

### ② NestedPropertyEditor.tsx — 属性追加モーダル key 値入力（L763〜L820）

```
termKeyOptions && termKeyOptions.length > 0 ? <Select showSearch> : <Input フォールバック>
```

termKeyOptions にない値は選択不可。

---

## 実装方針

`AutoComplete` コンポーネントを使用する。

- `options` prop に `{ value: qname, label: <JSX>, 'data-display': displayName }[]` を渡す
- `filterOption` は `option.value`（qname）と `option['data-display']`（displayName）両方でマッチ
- `value` に state を直接バインド（`undefined` ではなく空文字）
- `onChange` で直接 state に反映（自由入力も OK）

### autoCompleteOptions 生成パターン

```tsx
const autoCompleteOptions = useMemo(() =>
  Array.from(termMap.entries()).map(([qname, term]) => ({
    value: qname,
    'data-display': term.displayName ?? '',
    label: (
      <div style={{ lineHeight: 1.4 }}>
        {term.displayName?.trim() && (
          <div style={{ fontWeight: 600 }}>{term.displayName}</div>
        )}
        <div style={{ fontSize: 11, color: '#888' }}>
          {qname}
          {term.type?.trim() && <Tag color="blue" style={{ marginLeft: 6, fontSize: 10, padding: '0 4px' }}>{term.type}</Tag>}
          {term.unitHint?.trim() && <Tag color="green" style={{ marginLeft: 2, fontSize: 10, padding: '0 4px' }}>{term.unitHint}</Tag>}
        </div>
      </div>
    ),
  })),
[termMap]);
```

---

## 実装ステップ

### Step 1: `TemplateEditorDialog.tsx`
- [ ] `AutoComplete` を antd import に追加
- [ ] `autoCompleteOptions` useMemo を追加（termMap ベース）
- [ ] プロパティ追加モーダルの `<Select>` を `<AutoComplete>` に置き換え
  - `value={newPropertyKey}` / `onChange={setNewPropertyKey}` / `onClear={() => setNewPropertyKey('')}` / `allowClear`
  - `options={autoCompleteOptions}` + filterOption
  - `notFoundContent` / `optionLabelProp` / `suffixIcon` 削除

### Step 2: `NestedPropertyEditor.tsx`
- [ ] `key` 属性値入力のブロック（L762〜L820）を `<AutoComplete>` に統合・置換
  - `termKeyOptions` 空の場合のフォールバック `<Input>` も統合（AutoComplete に統一）
  - `options` は `termKeyOptions.map(opt => ({ value: opt.value, 'data-display': opt.label, label: <JSX> }))`
  - `value={newAttributeValue}` / `onChange={setNewAttributeValue}`

### Step 3: 翻訳キーの修正
- [ ] `ja.json` : `nestedPropertyEditor.placeholderKeySelect` → `"キーを入力または選択（用語から検索）"`
- [ ] `en.json` : 同 → `"Enter or select key (search from terms)"`

---

## 変更ファイル

| # | ファイルパス | 変更内容 |
|---|------------|---------|
| 1 | `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | AutoComplete import 追加・autoCompleteOptions useMemo 追加・モーダル内 Select → AutoComplete |
| 2 | `frontend/src/components/editorv2/NestedPropertyEditor.tsx` | key 属性値入力 Select + フォールバック Input → AutoComplete に統合 |
| 3 | `frontend/src/locales/ja.json` | `placeholderKeySelect` 文言修正 |
| 4 | `frontend/src/locales/en.json` | `placeholderKeySelect` 文言修正 |

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| AutoComplete filterOption で JSX label が文字列比較できない | 中 | 中 | `data-display` カスタム属性で displayName を渡し filterOption で参照 |
| 選択時の表示が qname のみになる | 低 | 中 | AutoComplete は value フィールドが input に入るため qname が表示される（期待動作） |

---

## テスト計画

### 手動テスト
- [ ] プロパティ追加モーダルで登録済み qname を候補から選択できる
- [ ] プロパティ追加モーダルで未登録の任意文字列を入力して追加できる
- [ ] 部分文字列入力で qname / displayName にマッチする候補が絞り込まれる
- [ ] NestedPropertyEditor の key 属性で登録済み qname を候補から選択できる
- [ ] NestedPropertyEditor の key 属性で未登録の任意文字列を入力して確定できる
- [ ] termMap が空の状態でも AutoComplete 入力欄が表示され任意入力できる

---

## 承認記録
- **計画書提示日時**: 2026-09-18 16:00
- **承認日時**: 2026-09-18 16:30
- **承認者コメント**: 承認

## 実施記録

### 実施日時
開始: 2026-09-18 16:30
完了: 2026-09-18 16:45

### 最終的な成果物
- [x] `TemplateEditorDialog.tsx` — `AutoComplete` import 追加・`SearchOutlined` import 削除・`addPropAutoCompleteOptions` useMemo 追加・プロパティ追加モーダルの `<Select>` → `<AutoComplete>` 置換
- [x] `NestedPropertyEditor.tsx` — key 属性値入力の `<Select>` + フォールバック `<Input>` → `<AutoComplete>` に統合
- [x] `ja.json` — `nestedPropertyEditor.placeholderKeySelect` 文言修正（「キーを入力または選択（用語から検索）」）
- [x] `en.json` — 同 → `"Enter or select key (search from terms)"`
- [x] TypeScript コンパイルエラーなし確認済み

# タスク計画書: PropertyViewer 未設定値区別・ツールチップ対応

## メタデータ
- **作成日時**: 2026-03-30 13:23
- **タスクID**: PropertyViewer未設定値区別対応
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

ペトリネットビューアのPropertyViewer機能（`PropertyViewer.tsx` / `PropertyViewerWithSelection.tsx`）において、以下の2点を改善する。

1. **値の区別**: `null`・`undefined`・空文字 (`""`)・`0`・`false` など「値はあるが空/ゼロ」なケースと、「本当に未設定（プロパティが存在しない）」なケースを視覚的に明確に区別する
2. **ツールチップ**: テンプレートプロパティ（テンプレートタブ）やその他プロパティ（基本情報・データタブ）において、未設定状態をツールチップでわかりやすく説明する

---

## 目的と期待される成果

### 目的

現状は `null`, `undefined`, `""`, `0`, `false` などをすべて同じ「未設定」という文字列として表示しており、どのような状態であるかをユーザーが区別できない。また、テンプレートの `xsi:type` や `description` が空の場合も見た目上は区別がつかない。これを改善してデータの意味をより正確に伝えられるようにする。

### 期待される成果

- [ ] `null` / `undefined` → 明示的に「未設定」とツールチップ付きで表示
- [ ] `""` (空文字) → 「空の文字列が設定されています」とわかるよう区別表示
- [ ] `0` / `false` → 値として「0」「いいえ」を正しく表示（「未設定」と誤表示しない）
- [ ] テンプレートタブの `xsi:type` 未設定列 → ツールチップで未設定の旨を表示
- [ ] テンプレートタブの `description/単位` 未設定列 → ツールチップで未設定の旨を表示
- [ ] `StructuredPropertySelector.tsx` の値表示も同様に区別対応

---

## 現状の問題点（コード調査結果）

### `PropertyViewer.tsx` と `PropertyViewerWithSelection.tsx`

#### `getPropertyValue()` 関数の問題

```typescript
// 現状（問題あり）
const getPropertyValue = (propObj: PropertyObject): unknown => {
  if (propObj.value !== undefined) {
    return propObj.value;  // value が null / "" / 0 / false でも返してしまう
  }
  if (propObj.defaultValue !== undefined) {
    return propObj.defaultValue;
  }
  return '未設定';  // value が undefined の場合のみ '未設定' になる
};
```

この関数では `propObj.value` が `null` や `""` の場合も値として返す。しかし後続の `renderValue()` でそれをまた「未設定」扱いしてしまう。

#### `renderValue()` 関数の問題

```typescript
// 現状（問題あり）
const renderValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return <Text type="secondary" italic>未設定</Text>;
    // ↑ null / undefined / "" を同一視して「未設定」と表示
  }
  if (typeof value === 'boolean') {
    return value ? <Tag color="success">はい</Tag> : <Tag color="error">いいえ</Tag>;
  }
  // ...
};
```

- `null` と `undefined` は意味が異なるのに同じ表示
- `""` (空文字) は「値が設定されているが中身が空」なのに「未設定」と表示
- `0` は数値として正しく表示されるが、テーブルデータ変換時に `String(0) = "0"` になってから渡されるケースがある

#### テンプレートタブの列レンダリング問題

```typescript
// 現状（問題あり）
{
  title: 'xsi:type',
  dataIndex: 'xsiType',
  key: 'xsiType',
  width: '20%',
  render: (text: string) => text
    ? <Text type="secondary" style={{ fontSize: 11 }}>{text}</Text>
    : null,  // ← 未設定の場合は何も表示しない（区別できない）
},
{
  title: '説明/単位',
  dataIndex: 'description',
  key: 'description',
  width: '25%',
  render: (text: string) => text
    ? <Text type="secondary" style={{ fontSize: 11 }}>{text}</Text>
    : null,  // ← 未設定の場合は何も表示しない
},
```

空のセルは「未設定」なのか「スペース節約のため省略」なのかわからない。

### `StructuredPropertySelector.tsx` の問題

```typescript
const formatPropertyValue = (propertyObj: PropertyObject | unknown): string => {
  // ...
  if (value === null || value === undefined || value === '') {
    return '未設定';  // ← 同一視
  }
  return String(value);
};
```

---

## 実装方針

### 方針1: `renderValue()` の区別ロジック改善

| 値の状態 | 現状 | 改善後 |
|---|---|---|
| `undefined` | 「未設定」（斜体） | 「未設定」（斜体 + ツールチップ: "値が設定されていません"） |
| `null` | 「未設定」（斜体） | 「null」（薄いテキスト + ツールチップ: "null が設定されています"） |
| `""` (空文字) | 「未設定」（斜体） | `""` アイコン表示（ツールチップ: "空の文字列が設定されています"） |
| `0` | `"0"` として表示 ✅ | `"0"` として表示 ✅（変更なし） |
| `true` | `<Tag color="success">はい</Tag>` | `<Tag color="success">true</Tag>` に変更 |
| `false` | `<Tag color="error">いいえ</Tag>` | `<Tag color="error">false</Tag>` に変更 |

### 方針2: テンプレートタブの列ツールチップ対応

- `xsi:type` 列: 未設定時に `<Tooltip title="xsi:type が設定されていません">-</Tooltip>` を表示
- `description/単位` 列: 未設定時に `<Tooltip title="説明・単位が設定されていません">-</Tooltip>` を表示

### 方針3: `getPropertyValue()` の修正

`null` と `undefined` を区別して返すようにする。実際のプロパティ値として `null` が設定されている場合は `null` を返し、`undefined`（プロパティ自体が未定義）の場合のみ `undefined` または sentinel 値を返す。

### 方針4: `StructuredPropertySelector.tsx` の対応

`formatPropertyValue()` でも同様の区別ロジックを適用する。

---

## 実装ステップ

### Phase 1: `PropertyViewer.tsx` の修正

- [ ] `renderValue()` 関数を改善（`null` / `undefined` / `""` の区別 + Tooltip追加）
- [ ] テンプレートタブの `xsi:type` 列レンダラーにツールチップ追加
- [ ] テンプレートタブの `description/単位` 列レンダラーにツールチップ追加

### Phase 2: `PropertyViewerWithSelection.tsx` の修正

- [ ] `renderValue()` 関数を同様に改善
- [ ] テンプレートタブの `xsi:type` 列レンダラーにツールチップ追加
- [ ] テンプレートタブの `description/単位` 列レンダラーにツールチップ追加

### Phase 3: `StructuredPropertySelector.tsx` の修正

- [ ] `formatPropertyValue()` 関数の `null`/`""` 区別対応
- [ ] `renderPropertyList()` の値表示部分にツールチップ追加

### Phase 4: 動作確認

- [ ] 開発環境でビルドエラーがないことを確認
- [ ] ペトリネットビューアでノードクリックし、各値の表示が正しく区別されることを確認

---

## 変更ファイル

### 修正
1. `frontend/src/components/viewer/dialogs/PropertyViewer.tsx` - `renderValue()` / テンプレート列レンダラー修正
2. `frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx` - `renderValue()` / テンプレート列レンダラー修正
3. `frontend/src/components/viewer/dialogs/StructuredPropertySelector.tsx` - `formatPropertyValue()` 修正・ツールチップ追加

---

## 具体的な実装内容

### `renderValue()` 改善案

```typescript
// 改善後の renderValue
const renderValue = (value: unknown) => {
  // propObj.value が undefined（プロパティとして未設定）
  if (value === undefined) {
    return (
      <Tooltip title="値が設定されていません（undefined）">
        <Text type="secondary" italic style={{ color: '#bfbfbf' }}>未設定</Text>
      </Tooltip>
    );
  }
  // propObj.value が null（明示的にnullが設定されている）
  if (value === null) {
    return (
      <Tooltip title="null が設定されています">
        <Text type="secondary" italic style={{ color: '#bfbfbf' }}>null</Text>
      </Tooltip>
    );
  }
  // 空文字（値は存在するが空）
  if (value === '') {
    return (
      <Tooltip title="空の文字列が設定されています">
        <Text type="secondary" style={{ color: '#bfbfbf', fontStyle: 'italic' }}>
          &quot;&quot; <Text type="secondary" style={{ fontSize: 10 }}>(空文字)</Text>
        </Text>
      </Tooltip>
    );
  }
  // boolean（true/false をそのまま表示）
  if (typeof value === 'boolean') {
    return value
      ? <Tag color="success">true</Tag>
      : <Tag color="error">false</Tag>;
  }
  // object
  if (typeof value === 'object') {
    return (
      <div style={{ fontSize: 12 }}>
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 4 }}>
            <Text type="secondary" style={{ fontSize: 11, minWidth: 60 }}>{k}:</Text>
            <Text style={{ fontSize: 11 }}>{String(v ?? '')}</Text>
          </div>
        ))}
      </div>
    );
  }
  return <Text>{String(value)}</Text>;
};
```

### テンプレートタブ列レンダラー改善案

```typescript
// xsi:type 列
render: (text: string) =>
  text ? (
    <Text type="secondary" style={{ fontSize: 11 }}>{text}</Text>
  ) : (
    <Tooltip title="xsi:type が設定されていません">
      <Text type="secondary" style={{ fontSize: 11, color: '#bfbfbf' }}>-</Text>
    </Tooltip>
  ),

// 説明/単位 列
render: (text: string) =>
  text ? (
    <Text type="secondary" style={{ fontSize: 11 }}>{text}</Text>
  ) : (
    <Tooltip title="説明・単位が設定されていません">
      <Text type="secondary" style={{ fontSize: 11, color: '#bfbfbf' }}>-</Text>
    </Tooltip>
  ),
```

### `getPropertyValue()` 修正案

`getPropertyValue()` 関数は基本情報・データタブの変換用として使われており、テーブルの`value`フィールドに格納される値を返す。現在は `propObj.value` が `undefined` のときに `'未設定'` という文字列を返しているが、これを `undefined` のまま返すよう変更する。こうすることで `renderValue()` が `undefined` を受け取って適切に処理できる。

```typescript
// 改善後
const getPropertyValue = (propObj: PropertyObject): unknown => {
  if (propObj.value !== undefined) {
    return propObj.value;  // null / "" / 0 / false もそのまま返す
  }
  if (propObj.defaultValue !== undefined) {
    return propObj.defaultValue;
  }
  return undefined;  // '未設定' 文字列ではなく undefined を返す → renderValue が処理
};
```

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `getPropertyValue()` を `undefined` 返却に変更したことで、`renderValue()` を経由しない箇所に影響が出る | 中 | 低 | 変更後のコード全体を精査してレンダー経路を確認 |
| `Tooltip` コンポーネントが未インポートの場合ビルドエラー | 低 | 中 | 各ファイルで `Tooltip` を antd からインポートする |
| `StructuredPropertySelector.tsx` の `formatPropertyValue()` が文字列を返す仕様のため、null/undefinedの区別がテキストのみになる | 低 | 高 | 表示テキストで `null` / `(空文字)` / `未設定` を区別するにとどめる |

## テスト計画

### 手動テスト
- [ ] ペトリネットビューアでノードをクリックして PropertyViewer（Drawer）が開くことを確認
- [ ] 基本情報タブで `null` 値・空文字値・通常値が区別表示されることを確認
- [ ] テンプレートタブで `xsi:type` 未設定時にツールチップ `-` が表示されることを確認
- [ ] テンプレートタブで `description/単位` 未設定時にツールチップ `-` が表示されることを確認
- [ ] `StructuredPropertySelector` の値表示も区別されることを確認
- [ ] `0` や `false` が「未設定」と表示されないことを確認

---

## 承認記録
- **計画書提示日時**: 2026-03-30 13:23
- **承認日時**: 2026-03-30 13:32
- **承認者コメント**: 承認。false を「いいえ」ではなく「false」表示に変更。

---

## 実施記録

### 実施日時
開始: 2026-03-30 13:32  
完了: 2026-03-30 13:37

### 変更点
- `PropertyViewer.tsx`: Tooltip インポート追加、`getPropertyValue()` を undefined 返却に変更、`renderValue()` を undefined/null/"" 区別対応、boolean を true/false 表示に変更、テンプレート列レンダラーにツールチップ追加
- `PropertyViewerWithSelection.tsx`: 同上
- `StructuredPropertySelector.tsx`: Tooltip インポート追加、`formatPropertyValue()` を kind 付きオブジェクト返却に変更、テーブル値レンダラーにツールチップ追加

### 最終的な成果物
- [x] undefined → 「未設定」斜体 ＋ ツールチップ「値が設定されていません」
- [x] null → 「null」斜体 ＋ ツールチップ「null が設定されています」
- [x] "" → `""(空文字)` ＋ ツールチップ「空の文字列が設定されています」
- [x] true/false → `<Tag>true</Tag>` / `<Tag>false</Tag>` 表示
- [x] テンプレートタブ xsi:type 未設定 → ツールチップ付き `-`
- [x] テンプレートタブ 説明/単位 未設定 → ツールチップ付き `-`
- [x] StructuredPropertySelector も同様に区別対応
- [x] ビルド成功（TypeScriptエラーなし）

# タスク計画書: MAIML編集画面 属性制限対応

## メタデータ
- **作成日時**: 2026-04-09 11:24
- **タスクID**: 20260409_1124_MAIML編集属性制限対応
- **優先度**: 高
- **推定工数**: 3時間

## 1. タスク概要

MAIML編集画面（NestedPropertyEditor）において、PropertyやContentの属性追加時に `xsi:type` に応じた属性制限が存在しないため、型と無関係な属性（例：`stringType` に `scaleFactor`）が追加できてしまう。  
一方、MAIML解析処理（`convertXmlJsProperty`）は `xsi:type` に応じた属性のみを復元する仕様になっており、**編集で追加した型不適合な属性は保存後に再読み込みすると消失する**。

また、`xsi:type` が未指定の場合に `convertXmlJsProperty` が強制的に `stringType` として処理していたことで、型未指定プロパティに付与された属性も消失していた（前回タスクで `prop.attributes` の保持は修正済み）。

---

## 2. 問題の詳細分析

### 問題①: 編集画面で型不適合な属性を追加できてしまう

**現状のコード（`NestedPropertyEditor.tsx`）:**

属性追加モーダルで表示される選択肢は「固定属性グループ」と「マスタ属性グループ」の2種類のみ。`xsi:type` の値に関わらず、すべての属性名が常に選択可能な状態。

```tsx
// 固定属性グループ（xsi:typeに関係なく常に表示）
<Select.OptGroup label="固定属性">
  <Option value="xsi:type">xsi:type（MaiML型定義）</Option>
  <Option value="key">key（キー・必須）</Option>
  {isContent && <Option value="axis">axis（軸名）</Option>}
  ...
</Select.OptGroup>
// マスタ属性グループ（全マスタが無条件に表示）
{masterAttributeNames.length > 0 && (
  <Select.OptGroup label="マスタ属性">
    {masterAttributeNames.map(...)}
  </Select.OptGroup>
)}
```

**何が起きるか:**
- `stringType` のプロパティに `units`, `formatString`, `scaleFactor` が追加できる
- `booleanType` のプロパティに数値型属性が追加できる
- `propertyListType` に数値型属性が追加できる

---

### 問題②: 解析処理が型不適合属性を復元しない

**現状のコード（`maimlTypeConverter.ts` `convertXmlJsProperty`）:**

各型ごとに明示的に設定するフィールドが決まっている。

```ts
// 数値型の場合 → units, formatString, scaleFactor を復元
if (xsiType === 'intType' || ...) {
  return { key, xsiType, description, value, units, formatString, scaleFactor, ... };
}

// boolean型の場合 → units等は復元しない
if (xsiType === 'booleanType') {
  return { key, xsiType: 'booleanType', description, value, ... };
}

// デフォルト（string型を含む） → units等は復元しない
const result: Property = {
  key,
  xsiType: 'stringType',   // ← xsiType未指定でも強制的にstringTypeに上書き
  description,
  value: xmlProp.value?._text || '',
  ...
};
```

**何が起きるか:**
- 数値型以外のプロパティに追加した `units` / `formatString` / `scaleFactor` は保存しても再読み込みで消える
- `xsi:type` が未指定のプロパティは `stringType` に上書きされる（前回対応でカスタム属性は `result.attributes` に保存されるようになった）

---

### 問題③: xsiType未指定時のstringType強制変換

`convertXmlJsProperty` のデフォルトブランチ（全分岐にマッチしない場合）:

```ts
// デフォルトはString型として扱う ← ここが問題
const result: Property = {
  key,
  xsiType: 'stringType',   // xsiType未指定時も強制上書き
  ...
};
```

元のXMLに `xsi:type` がなかった場合、`stringType` として解釈されてしまう。  
保存時に `xsi:type="stringType"` として出力されることになる。

---

## 3. 解決方針

### Phase 1: 型別許可属性マッピングを定義

`xsi:type` の値に応じて「追加可能な属性一覧」を定義する定数/ユーティリティを作成する。

**定義場所**: `frontend/src/utils/xsiTypeAttributes.ts`（新規作成）

```ts
/** xsi:typeごとに許可される属性名セット */
export const ALLOWED_ATTRIBUTES_BY_XSI_TYPE: Record<string, readonly string[]> = {
  // 数値型: units/formatString/scaleFactor が使用可能
  intType:             ['units', 'formatString', 'scaleFactor'],
  doubleType:          ['units', 'formatString', 'scaleFactor'],
  floatType:           ['units', 'formatString', 'scaleFactor'],
  longType:            ['units', 'formatString', 'scaleFactor'],
  shortType:           ['units', 'formatString', 'scaleFactor'],
  byteType:            ['units', 'formatString', 'scaleFactor'],
  unsignedIntType:     ['units', 'formatString', 'scaleFactor'],
  unsignedLongType:    ['units', 'formatString', 'scaleFactor'],
  unsignedShortType:   ['units', 'formatString', 'scaleFactor'],
  unsignedByteType:    ['units', 'formatString', 'scaleFactor'],
  decimalType:         ['units', 'formatString', 'scaleFactor'],

  // 数値リスト型: 同上
  intListType:             ['units', 'formatString', 'scaleFactor'],
  doubleListType:          ['units', 'formatString', 'scaleFactor'],
  floatListType:           ['units', 'formatString', 'scaleFactor'],
  longListType:            ['units', 'formatString', 'scaleFactor'],
  shortListType:           ['units', 'formatString', 'scaleFactor'],
  byteListType:            ['units', 'formatString', 'scaleFactor'],
  unsignedIntListType:     ['units', 'formatString', 'scaleFactor'],
  unsignedLongListType:    ['units', 'formatString', 'scaleFactor'],
  unsignedShortListType:   ['units', 'formatString', 'scaleFactor'],
  unsignedByteListType:    ['units', 'formatString', 'scaleFactor'],
  decimalListType:         ['units', 'formatString', 'scaleFactor'],

  // dateTimeType: formatStringのみ
  dateTimeType:        ['formatString'],
  dateTimeListType:    ['formatString'],

  // 文字列型・その他: 許可属性なし（固定属性のみ）
  stringType:          [],
  tokenType:           [],
  idType:              [],
  idRefType:           [],
  qualifiedNameType:   [],
  uriType:             [],
  uuidType:            [],
  languageType:        [],
  booleanType:         [],
  base64BinaryType:    [],
  hexBinaryType:       [],
  stringEnumType:      [],

  // 文字列リスト型
  stringListType:      [],
  idRefListType:       [],
  qualifiedNameListType: [],
  uriListType:         [],
  uuidListType:        [],
  languageListType:    [],
  booleanListType:     [],
  base64BinaryListType: [],
  hexBinaryListType:   [],

  // propertyListType: 許可属性なし
  propertyListType:    [],
};

/** xsi:typeに応じた許可属性一覧を返す（未定義typeはマスタ属性全許可） */
export function getAllowedAttributeNames(xsiType: string | undefined): string[] | null {
  if (!xsiType) return null; // null = 制限なし（型未指定）
  return ALLOWED_ATTRIBUTES_BY_XSI_TYPE[xsiType] ?? null; // 未知typeも制限なし
}
```

---

### Phase 2: NestedPropertyEditorの属性追加モーダルに制限を追加

**対象ファイル**: `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx`

**⚠️ 重要: マスタ属性グループはフィルタリングしない**

マスタ属性はユーザーが意図的に登録したカスタム属性であり、型と無関係に常に選択可能にする。  
制限対象は**固定属性グループの型依存属性（`units` / `formatString` / `scaleFactor`）のみ**とする。

```tsx
// 現在のxsi:type
const currentXsiType = propertyData.attributes?.['xsi:type'];
const allowedAttrs = getAllowedAttributeNames(currentXsiType);
// allowedAttrs === null → 型未指定。制限なし
// allowedAttrs === [] → units/formatString/scaleFactor を非表示
// allowedAttrs === ['units', 'formatString', 'scaleFactor'] → 全て表示
// allowedAttrs === ['formatString'] → formatStringのみ表示

// 型依存固定属性の表示フラグ
const showUnits = allowedAttrs === null || allowedAttrs.includes('units');
const showFormatString = allowedAttrs === null || allowedAttrs.includes('formatString');
const showScaleFactor = allowedAttrs === null || allowedAttrs.includes('scaleFactor');

// マスタ属性グループはフィルタリングしない（常に全件表示）
```

**UIの変更点:**
- 固定属性グループの `units` / `formatString` / `scaleFactor` を `xsi:type` に応じて非表示化
  - 数値型（int/double/float/long/short/byte/unsigned各型・decimal・各List型）: 全3属性を表示
  - `dateTimeType` / `dateTimeListType`: `formatString` のみ表示
  - `stringType` / `booleanType` / `propertyListType` 等: 全3属性を非表示
  - `xsi:type` 未設定: 全3属性を表示（制限なし）
- マスタ属性グループは常に全件表示（フィルタリングしない）

---

### Phase 3: convertXmlJsPropertyのxsiType未指定時の動作修正

**対象ファイル**: `frontend/src/utils/maimlTypeConverter.ts`

`xsi:type` が XML に存在しない場合、`stringType` に強制変換しないよう修正する。

```ts
// 修正前
const xsiType = (xmlProp._attributes?.['xsi:type'] || 'stringType') as PropertyType;

// 修正後（xsi:typeが未指定の場合はundefinedのまま保持）
const rawXsiType = xmlProp._attributes?.['xsi:type'];
const xsiType = (rawXsiType || 'stringType') as PropertyType; // ← 変換ロジックは維持
```

**デフォルトブランチの修正:**

```ts
// 修正前
const result: Property = {
  key,
  xsiType: 'stringType',  // 強制上書き
  ...
};

// 修正後（元のxsiTypeを保持。型未指定の場合はundefinedに）
const result: Property = {
  key,
  xsiType: rawXsiType ? (rawXsiType as PropertyType) : undefined, // 未指定はundefined
  ...
};
```

**注意**: この変更により、`xsiType` が `undefined` になり得るケースが増える。  
下流の処理（`convertPropertiesArrayToNestedFormat` 等）で `xsiType` を参照している箇所が `undefined` に対応できているか確認が必要。

---

## 4. 影響範囲

### 変更するファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/utils/maimlTypeConverter.ts` | Phase 3: xsiType未指定時の `stringType` 強制変換を削除 |
| `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx` | Phase 2: 属性追加モーダルに型制限ロジックを追加 |

### 新規作成するファイル

| ファイル | 内容 |
|---------|------|
| `frontend/src/utils/xsiTypeAttributes.ts` | Phase 1: 型別許可属性マッピング定数・ユーティリティ関数 |

### 影響を受ける機能

- **NestedPropertyEditorの属性追加モーダル**: 表示される選択肢が型に応じてフィルタリングされる
- **MAIML解析処理**: xsiType未指定プロパティが `stringType` に強制変換されなくなる
- **TemplateEditorDialog / FormatEditorDialog**: NestedPropertyEditorを使用しているため間接的に影響

---

## 5. 実装ステップ

### Phase 1: xsiTypeAttributes.ts 新規作成
- [ ] `frontend/src/utils/xsiTypeAttributes.ts` を新規作成
- [ ] 各型の許可属性マッピング（`ALLOWED_ATTRIBUTES_BY_XSI_TYPE`）を定義
- [ ] `getAllowedAttributeNames(xsiType)` ユーティリティ関数を実装

### Phase 2: NestedPropertyEditorの属性追加モーダル修正
- [ ] `xsiTypeAttributes.ts` の `getAllowedAttributeNames` をインポート
- [ ] 現在の `xsi:type` に応じた `allowedAttrs` を計算する `useMemo` を追加
- [ ] 固定属性の `units` / `formatString` / `scaleFactor` を `showNumericAttrs` フラグで表示制御
- [ ] マスタ属性グループのオプションを `filteredMasterAttributeNames` でフィルタリング
- [ ] 型が未設定（`xsi:type` なし）の場合は現状維持（制限なし）

### Phase 3: maimlTypeConverter.tsのxsiType未指定修正
- [ ] `convertXmlJsProperty` の冒頭で `rawXsiType` を保存
- [ ] デフォルトブランチの `xsiType: 'stringType'` 強制変換を `xsiType: rawXsiType ? ... : undefined` に変更
- [ ] 下流の `convertPropertiesArrayToNestedFormat` 等で `xsiType` が `undefined` の場合の動作を確認・修正

### Phase 4: TypeScript型チェックと動作確認
- [ ] `npx tsc --noEmit` でTypeScriptエラーがないことを確認
- [ ] 実際のMAIMLデータで保存→再読み込みを手動確認

---

## 6. 技術詳細

### xsiTypeとattributes制限の対応表（参考）

| xsiType | 許可される追加属性 |
|---------|-----------------|
| intType / doubleType / floatType 等 数値型 | units, formatString, scaleFactor |
| intListType / doubleListType 等 数値リスト型 | units, formatString, scaleFactor |
| dateTimeType / dateTimeListType | formatString |
| stringType / tokenType / boolean等 その他 | なし（固定属性のみ） |
| propertyListType | なし（固定属性のみ） |
| 型未指定（xsi:type なし） | 制限なし（現状維持） |

### 固定属性（常に表示）

以下の属性は型に関係なく常に固定グループとして表示する：
- `xsi:type` （MaiML型定義・必須）
- `key`（キー・必須）
- `axis`（content専用）
- `size`（content専用）
- `id`（content専用）
- `ref`（content専用）

---

## 7. リスク

| リスク | 対策 |
|--------|------|
| xsiType未指定プロパティの `undefined` 化で下流処理がエラー | Phase 3実装前に templateConverter.ts の xsiType 参照箇所を確認、必要に応じてフォールバック追加 |
| マスタ属性が型と無関係な属性名を含む場合、全部非表示になる | マスタデータ側の整備が前提。非表示になる旨をUIで説明するか検討 |
| 既存の保存済みデータで型不適合な属性がある場合 | 再読み込みで属性が消えること自体は現状から変わらない（変更前からの動作） |

---

## 8. 承認記録

- **計画書提示日時**: 2026-04-09 11:24
- **承認日時**: 2026-04-09 11:24（ユーザー承認）

---

## 9. 実施記録

### 実施日時
- 開始: 2026-04-09 11:24
- 完了: 2026-04-09 14:27

### 実装内容

#### Phase 1: xsiTypeAttributes.ts 新規作成（実装済み）
- `frontend/src/utils/xsiTypeAttributes.ts` を新規作成
- `ALLOWED_ATTRIBUTES_BY_XSI_TYPE` 定数（全数値型・dateTimeType・文字列型などのマッピング）を定義
- `getAllowedAttributeNames(xsiType)` ユーティリティ関数を実装
  - `null` 返却 = 型未指定（制限なし）
  - `[]` 返却 = 属性なし（stringType等）
  - `['units', 'formatString', 'scaleFactor']` 返却 = 数値型

#### Phase 2: NestedPropertyEditor.tsx 属性追加モーダル修正（実装済み）
- `getAllowedAttributeNames` をインポート
- 現在の `xsi:type` に応じた `allowedAttrs` を計算
- `showUnits` / `showFormatString` / `showScaleFactor` フラグで表示制御
- マスタ属性グループはフィルタリングしない（全件表示維持）

#### Phase 3: maimlTypeConverter.ts xsiType未指定修正（実装済み）
- `convertXmlJsProperty`: `|| 'stringType'` を `|| ''` に変更
  - xsi:type が未指定の場合に空文字で保持し、stringType強制変換を廃止
  - 末尾の未指定ブランチで `xsiType: ''` として返却
- `convertContent`: `|| 'contentStringListType'` を `|| ''` に変更

#### Phase 3 補完: シリアライザー修正（実装済み）
解析側の修正と対をなす変換側（XML出力時）の修正:

| ファイル | 修正箇所 | 修正内容 |
|---------|---------|---------|
| `frontend/src/components/editorv2/utils/templateConverter.ts` | `convertPropertiesToXmlFormat` 等4箇所 | `xsiType` の `|| 'stringType'` / `|| 'contentStringListType'` を `|| ''` に変更 |
| `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts` | `buildPropertyXML` / `buildContentXML` | `propType` / `xsiType` のデフォルトを `|| ''` に変更し、空文字の場合 `xsi:type` 属性を出力しない |
| `frontend/src/utils/converters/reactFlowToMaiml.ts` | `buildPropertyXML` / `buildContentXML` | 同上 |

### ビルド確認
- TypeScript コンパイル: 今回修正ファイルにエラーなし
- 既存エラー（`BulkUploadDialog.tsx` の `Paragraph` 未定義）は本タスクと無関係

### 最終的な成果物
- [x] Phase 1: `frontend/src/utils/xsiTypeAttributes.ts` 新規作成
- [x] Phase 2: `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx` 属性制限UI
- [x] Phase 3: `frontend/src/utils/maimlTypeConverter.ts` xsiType未指定修正
- [x] Phase 3補完: `templateConverter.ts` / シリアライザー2ファイル（xsiType==='' 時に xsi:type 属性を出力しない）

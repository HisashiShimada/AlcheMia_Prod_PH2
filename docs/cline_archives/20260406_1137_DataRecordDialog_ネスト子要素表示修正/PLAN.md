# タスク計画書: DataRecordDialog ネスト子要素表示修正

## メタデータ
- **作成日時**: 2026-04-06 11:37
- **更新日時**: 2026-04-06 11:46（調査結果を反映して更新）
- **タスクID**: DataRecordDialog_ネスト子要素表示修正
- **優先度**: 高
- **推定工数**: 3〜4時間

---

## 1. タスク概要

`frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` において、以下3点を修正する。

1. **`propertyListType` の子要素が表示されない**  
   MAIMLテンプレートの Property に `propertyListType`（子Property・Contentをネストする構造型）がある場合、子要素の入力欄が表示されない。

2. **テンプレートトップレベルの `Content` が完全に無視される**  
   MAIMLテンプレートは `properties[]` と `contents[]` を別々に持つが、`contents[]` がバックエンドで完全に無視されてフロントへ渡らない。また渡ったとしても Property と同列に混ぜるのではなく、**専用セクション（"データ"セクション等）として分けて表示する必要がある**。

3. **`contentDoubleListType` 以外のリスト型（`contentStringListType`、`stringListType` 等）が単行テキスト入力になる**  
   スペース区切りの TextArea として表示されるべきだが、型認識されていない。

---

## 2. 調査結果

### 2-1. APIのレスポンス構造（判明事実）

フロントエンドへのAPIレスポンス `TemplateDataItem.data` は以下の2パターン存在する。

#### パターンA: DBに実績がある場合
```json
{
  "placeId": "place_001",
  "templateType": "material",
  "templateId": "template_001",
  "data": {
    "temperature": 25.5,
    "sampleName": "Sample A"
  },
  "recordedBy": "user-uuid",
  "recordedAt": "2026-04-01T10:00:00.000Z"
}
```
→ `data` は**フラットなkey-value形式**（PropertySet全体ではなく、保存時のフォームの値）

#### パターンB: DBに実績がない場合（フォールバック）
```json
{
  "placeId": "place_001",
  "templateType": "material",
  "templateId": "template_001",
  "data": {
    "templateId": "template_001",
    "templateType": "material",
    "properties": [
      {
        "key": "params",
        "xsiType": "propertyListType",
        "value": null,
        "units": null,
        "properties": [],
        "contents": []
      }
    ]
  },
  "recordedBy": null,
  "recordedAt": null
}
```
→ `data.properties` に Property の配列が入る
→ **子 Property (`properties`) と子 Content (`contents`) は空配列に上書きされている**

---

### 2-2. 根本原因（確定）

#### 根本原因①: バックエンドの `buildFallbackTemplates` が子要素情報を捨てている

`backend/src/services/experimentDataService.ts` L396-403:

```typescript
// ❌ 問題箇所: 子要素（properties, contents）を空配列に上書き
const properties = (template.properties || []).map(p => ({
  key: p.key || '',
  xsiType: p.xsiType || 'stringType',
  value: p.value ?? undefined,
  units: p.units || undefined,
  properties: [] as Property[],  // ← p.properties を無視して空配列に！
  contents: [] as Content[],     // ← p.contents  を無視して空配列に！
}));
```

**MAIMLパーサーが取得した `p.properties`（子Property）と `p.contents`（子Content）は
バックエンドで空配列に上書きされてフロントに渡らない。**

これが最大の問題。この1箇所を直すだけで、フォールバック時の
`propertyListType` の子 Property・Content が正しくフロントへ渡るようになる。

#### 根本原因②: フロントの `convertTemplateDataItemsToTemplates` が `nestedProperties` を設定しない

`frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` L154-166:

```typescript
// ❌ 問題箇所: nestedProperties (子Property) が全く設定されない
const properties: Property[] = (rawProperties ?? [])
  .filter((p) => !(p as Record<string, unknown>).isCustomProperty)
  .map((p) => ({
    key: p.key,
    label: p.key,
    type: mapXsiTypeToPropertyType(p.xsiType),
    units: ...,
    required: false,
    description: ...,
    // ❌ nestedProperties が完全に欠落！
    // → propertyListType でも子 Property が無視される
  }));
```

#### 根本原因③: `mapXsiTypeToPropertyType` が Content 系リスト型・その他数値型を `stringType` に落とす

`frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` L109-118:

```typescript
function mapXsiTypeToPropertyType(xsiType: string): PropertyType {
  const known = [
    'stringType', 'intType', 'floatType', 'booleanType',
    'dateType', 'dateTimeType', 'contentDoubleListType', 'propertyListType', 'insertion',
  ] as const;
  if ((known as readonly string[]).includes(xsiType)) {
    return xsiType as PropertyType;
  }
  return 'stringType'; // ← doubleType, contentStringListType 等が全てここに落ちる
}
```

MAIMLの実際の xsiType（`doubleType`, `contentStringListType`, `contentIntListType` 等）が
フロントの `PropertyType` に存在しないため、`stringType` にフォールバックしてしまう。

---

### 2-3. 現状サマリー

#### `renderPropertyInput` の switch 文（現状の case 一覧）

```
case 'stringType'           → 単行テキスト Input
case 'intType'              → 数値 InputNumber
case 'floatType'            → 数値 InputNumber
case 'booleanType'          → Switch
case 'dateType'             → DatePicker
case 'dateTimeType'         → DatePicker（時刻付き）
case 'contentDoubleListType'→ renderDataGrid()（2次元数値グリッド） ← 対応済み
case 'propertyListType'     → renderNestedProperties()（子要素再帰表示）
case 'insertion'            → renderFileUpload()（ファイルアップロード）
default                     → TextArea（フォールバック）
```

#### 各型の現状・問題点

| 状況 | 現象 | 原因 |
|------|------|------|
| `propertyListType` の子 Property | タイトルだけ表示、入力欄なし | 原因①②（バックエンドで空配列化 + フロントで nestedProperties 未設定） |
| `propertyListType` 内の `Content` 子要素 | 完全に無視される | 原因①②（空配列化 + nestedProperties に Content を含めていない） |
| `doubleType` の Property | 単行 TextArea として表示 | 原因③（`doubleType` が `stringType` にフォールバック → `default` の TextArea） |
| **トップレベルの `contentStringListType`** | **単行 TextArea として表示（型認識なし）** | **原因③（`contentStringListType` が `stringType` にフォールバック → `default` の TextArea）** |
| **トップレベルの `contentIntListType` 等** | **単行 TextArea として表示（型認識なし）** | **原因③（同上）** |
| `contentDoubleListType` のトップレベル Content | ✅ 正しくデータグリッド表示 | 既存対応済み（case に追加済み） |
| `stringListType`, `intListType` 等 Property リスト型 | 単行 TextArea として表示（型認識なし） | 原因③（`stringListType` 等が `stringType` にフォールバック） |

**→ 修正③⑤によって `contentStringListType` および `stringListType` の case を追加することで、トップレベル・子要素ともにスペース区切り TextArea で正しく表示されるようになる。**

---

## 3. 修正方針

### 修正①（最重要）: バックエンド `buildFallbackTemplates` の再帰変換

`backend/src/services/experimentDataService.ts` を修正し、
`propertyListType` の `p.properties`（子Property）と `p.contents`（子Content）を
再帰的に変換して渡す。

**修正前:**
```typescript
const properties = (template.properties || []).map(p => ({
  key: p.key || '',
  xsiType: p.xsiType || 'stringType',
  value: p.value ?? undefined,
  units: p.units || undefined,
  properties: [] as Property[],   // ❌ 空配列に上書き
  contents: [] as Content[],      // ❌ 空配列に上書き
}));
```

**修正後:**
```typescript
// 再帰的に Property を変換するヘルパー関数（深さ制限付き）
function convertPropertyForFallback(
  p: Property,
  depth: number = 0
): Record<string, unknown> {
  const MAX_DEPTH = 5;
  return {
    key: p.key || '',
    xsiType: p.xsiType || 'stringType',
    value: p.value ?? undefined,
    units: p.units || undefined,
    // ネスト構造を再帰的に変換（深さ制限で無限ループ防止）
    properties: depth < MAX_DEPTH
      ? (p.properties || []).map(child => convertPropertyForFallback(child, depth + 1))
      : [],
    // Content子要素も再帰的に変換
    contents: depth < MAX_DEPTH
      ? (p.contents || []).map(c => ({
          key: c.key || '',
          xsiType: c.xsiType || 'contentStringListType',
          value: c.value ?? undefined,
          units: c.units || undefined,
          properties: [],
          contents: [],
        }))
      : [],
  };
}

// 利用箇所
const properties = (template.properties || []).map(p =>
  convertPropertyForFallback(p)
);
```

---

### 修正②: フロント `Property` 型に `contents` を追加し、再帰変換関数を追加

#### 型設計方針

`maiml-unified.ts` の `Property` インターフェースを正式な設計基準とする。

| フィールド | `maiml-unified.ts`（正式） | `experimentWorker.ts`（現状） | 今回の対応 |
|-----------|--------------------------|------------------------------|-----------|
| 子 Property | `properties: Property[]` | `nestedProperties?: Property[]` | 今回は変更しない（将来統一） |
| 子 Content  | `contents: Content[]`    | **なし**                       | `contents?: ContentField[]` を追加 |

> **将来タスク**: `nestedProperties` → `properties`、`type` + `xsiType` の統一等、
> `experimentWorker.ts` の `Property` 型全体を `maiml-unified.ts` に合わせる型統一リファクタリングを別タスクで実施する。

#### `frontend/src/types/experimentWorker.ts` の修正

```typescript
// Content フィールドの型（Property と区別するための専用型）
// maiml-unified.ts の Content インターフェースの UI 用サブセット
export interface ContentField {
  key: string;
  label: string;
  type: PropertyType;       // 'contentDoubleListType' | 'contentStringListType' 等
  units?: string;
  description?: string;
  axis?: string;            // maiml-unified.ts の Content.axis に対応
  size?: number;            // maiml-unified.ts の Content.size に対応
}

// プロパティ定義（既存フィールドに contents を追加）
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
  nestedProperties?: Property[];   // 既存: 子 Property（maiml-unified の properties[] に対応）
  contents?: ContentField[];       // 新規追加: 子 Content（maiml-unified の contents[] に対応、フィールド名も統一）
  description?: string;
  formatString?: string;
  scaleFactor?: string;
}
```

#### `DataRecordDialog.tsx` の再帰変換関数

```typescript
// 再帰的に rawProperty → Property を変換する関数
function convertRawPropertyToProperty(
  p: Record<string, unknown>,
  depth: number = 0
): Property {
  const MAX_DEPTH = 5;
  const xsiType = String(p.xsiType ?? 'stringType');
  const base: Property = {
    key: String(p.key ?? ''),
    label: String(p.key ?? ''),
    type: mapXsiTypeToPropertyType(xsiType),
    units: (p.units as string | undefined) ?? undefined,
    required: false,
    description: (p.description as string | undefined) ?? undefined,
    formatString: (p.formatString as string | undefined) ?? undefined,
    scaleFactor: (p.scaleFactor as string | undefined) ?? undefined,
  };

  if (xsiType === 'propertyListType' && depth < MAX_DEPTH) {
    const childProps = p.properties as Array<Record<string, unknown>> | undefined;
    const childContents = p.contents as Array<Record<string, unknown>> | undefined;

    // 子 Property → nestedProperties（再帰変換）
    const nestedProps = Array.isArray(childProps)
      ? childProps.map(child => convertRawPropertyToProperty(child, depth + 1))
      : [];
    if (nestedProps.length > 0) {
      base.nestedProperties = nestedProps;
    }

    // 子 Content → contents（Property とは別枠で保持、maiml-unified のフィールド名に統一）
    const nestedContents: ContentField[] = Array.isArray(childContents)
      ? childContents.map(c => ({
          key: String(c.key ?? ''),
          label: String(c.key ?? ''),
          type: mapXsiTypeToPropertyType(String(c.xsiType ?? 'contentStringListType')),
          units: (c.units as string | undefined) ?? undefined,
          description: (c.description as string | undefined) ?? undefined,
          axis: (c.axis as string | undefined) ?? undefined,
          size: (c.size as number | undefined) ?? undefined,
        }))
      : [];
    if (nestedContents.length > 0) {
      base.contents = nestedContents;
    }
  }

  return base;
}

// convertTemplateDataItemsToTemplates 内の map を差し替え
const properties: Property[] = (rawProperties ?? [])
  .filter((p) => !(p as Record<string, unknown>).isCustomProperty)
  .map((p) => convertRawPropertyToProperty(p as Record<string, unknown>));
```

---

### 修正③: `mapXsiTypeToPropertyType` の拡張

フロント `PropertyType` への変換ロジックを拡張する。

#### MAIMLの型体系の整理

MAIMLのXSD仕様では型が以下のように分かれている：

| タグ | xsiType の例 | 説明 |
|------|-------------|------|
| `<property>` | `stringType`, `intType`, `doubleType`, `booleanType`, `propertyListType` | 単一値・構造型（PropertyType） |
| `<property>` | `stringListType`, `intListType`, `doubleListType`, `floatListType` | リスト値型（PropertyType のリスト型） |
| `<content>` | `contentDoubleListType`, `contentStringListType`, `contentIntListType` | コンテンツリスト型（ContentType） |

フロントの `PropertyType`（`experimentWorker.ts`）は現在 `contentDoubleListType` のみ対応しており、
**Property 側のリスト型（`stringListType`, `intListType`, `doubleListType` 等）と
Content 側のリスト型（`contentStringListType`, `contentIntListType` 等）が未対応**。

> **経緯**: 以前の修正でカスタムプロパティの Content 型を誤って `stringListType` に変更した。
> 本修正では `content~ListType` の命名体系を維持する方針に統一する。

#### マッピング方針

- **Property リスト型** (`stringListType`, `intListType` 等) → フロント `stringListType`
- **Content リスト型** (`contentStringListType`, `contentIntListType` 等) → フロント `contentStringListType`
- **Content 数値グリッド** (`contentDoubleListType`) → フロント `contentDoubleListType`（既存維持）

**修正後:**
```typescript
function mapXsiTypeToPropertyType(xsiType: string): import('@/types/experimentWorker').PropertyType {
  // 完全一致マッピング
  const directMap: Record<string, import('@/types/experimentWorker').PropertyType> = {
    // --- Property 単一値型 ---
    'stringType':              'stringType',
    'tokenType':               'stringType',
    'intType':                 'intType',
    'longType':                'intType',
    'shortType':               'intType',
    'byteType':                'intType',
    'unsignedIntType':         'intType',
    'unsignedLongType':        'intType',
    'unsignedShortType':       'intType',
    'unsignedByteType':        'intType',
    'floatType':               'floatType',
    'doubleType':              'floatType',   // MAIMLのdoubleType → フロントのfloatType
    'decimalType':             'floatType',
    'booleanType':             'booleanType',
    'dateTimeType':            'dateTimeType',
    // --- Property リスト型（XSD: PropertyType のリスト型）---
    'stringListType':          'stringListType',
    'intListType':             'stringListType',
    'longListType':            'stringListType',
    'shortListType':           'stringListType',
    'byteListType':            'stringListType',
    'unsignedIntListType':     'stringListType',
    'floatListType':           'stringListType',
    'doubleListType':          'stringListType',
    'decimalListType':         'stringListType',
    'booleanListType':         'stringListType',
    'dateTimeListType':        'stringListType',
    'stringEnumType':          'stringType',
    // --- 構造型 ---
    'propertyListType':        'propertyListType',
    'insertion':               'insertion',
    // --- Content 型（<content> タグ用）---
    'contentDoubleListType':   'contentDoubleListType',    // 既存: 2次元数値データグリッド
    'contentStringListType':   'contentStringListType',    // Content 文字列リスト（スペース区切り）
    'contentIntListType':      'contentStringListType',    // Content 整数リスト → contentStringListType に統一
    'contentFloatListType':    'contentStringListType',
    'contentLongListType':     'contentStringListType',
    'contentShortListType':    'contentStringListType',
    'contentBooleanListType':  'contentStringListType',
    'contentDecimalListType':  'contentStringListType',
  };

  if (directMap[xsiType]) {
    return directMap[xsiType];
  }

  // Content 系リスト型の汎用フォールバック
  if (xsiType.startsWith('content') && xsiType.endsWith('ListType')) {
    return 'contentStringListType';
  }

  // Property リスト型の汎用フォールバック
  if (xsiType.endsWith('ListType')) {
    return 'stringListType';
  }

  return 'stringType';
}
```

---

### 修正④: `PropertyType` 型定義に `stringListType` と `contentStringListType` を追加

`frontend/src/types/experimentWorker.ts`:

> **方針**:
> - `stringListType` … `<property xsi:type="stringListType">` など Property 側のリスト型
> - `contentStringListType` … `<content xsi:type="contentStringListType">` など Content 側のリスト型（`contentDoubleListType` 以外）

```typescript
export type PropertyType = 
  | 'stringType' 
  | 'intType' 
  | 'floatType' 
  | 'booleanType' 
  | 'dateType' 
  | 'dateTimeType'
  | 'contentDoubleListType'    // 既存: 数値データグリッド（2次元配列）
  | 'contentStringListType'    // 新規: Content スペース区切りリスト（contentDoubleListType 以外の content~ListType 全般）
  | 'stringListType'           // 新規: Property スペース区切りリスト（stringListType/intListType 等の Property リスト型）
  | 'propertyListType'         // 既存: ネスト構造（子Propertyを持つ）
  | 'insertion';               // 既存: ファイルアップロード
```

---

### 修正⑤: `renderPropertyInput` に `contentStringListType` と `stringListType` のレンダラーを追加

`DataRecordDialog.tsx` の `renderPropertyInput` 関数に case を追加:

```typescript
case 'contentStringListType':
case 'stringListType':
  // Content/Property のスペース区切りリスト型を共通 TextArea で表示
  return (
    <Form.Item
      key={key}
      name={key}
      label={label}
      extra={descriptionExtra}
      rules={rules}
    >
      <TextArea
        rows={2}
        placeholder="値をスペース区切りで入力（例: 1 2 3 4 5）"
        disabled={!isProjectEditable}
      />
    </Form.Item>
  );
```

---

## 4. 実装ステップ

### Phase 1: バックエンド修正（根本原因①を解消）

- [ ] `backend/src/services/experimentDataService.ts` の `buildFallbackTemplates` を修正
  - `convertPropertyForFallback` 再帰関数を追加
  - `template.properties` の map を差し替え（`properties: []`, `contents: []` をやめて再帰変換）

### Phase 2: フロント型定義の拡張（根本原因③の前提）

- [ ] `frontend/src/types/experimentWorker.ts` の `PropertyType` に `stringListType`（Property リスト型）と `contentStringListType`（Content リスト型）を追加

### Phase 3: フロント変換ロジックの修正（根本原因②③を解消）

- [ ] `DataRecordDialog.tsx` の `mapXsiTypeToPropertyType` 関数を directMap 方式に拡張
  - `doubleType` → `floatType`
  - `stringListType`/`intListType` 等（Property リスト型）→ `stringListType`
  - `contentStringListType`/`contentIntListType` 等（Content リスト型）→ `contentStringListType`
  - `contentDoubleListType` → `contentDoubleListType`（既存維持）
- [ ] `DataRecordDialog.tsx` に `convertRawPropertyToProperty` 再帰変換関数を追加
- [ ] `convertTemplateDataItemsToTemplates` 内の `.map` を `convertRawPropertyToProperty` に差し替え

### Phase 4: フロント描画ロジックの修正

- [ ] `renderPropertyInput` に `case 'contentStringListType':` と `case 'stringListType':` のスペース区切り TextArea レンダラーを追加（fall-through で共通UIを使用）

### Phase 4-B: トップレベル Content の専用セクション表示

#### 現状の問題

MAIMLテンプレート（`MaterialTemplate` 等）はトップレベルに `properties[]` と `contents[]` を
別々に持つが、フロントの `Template` 型も `contents` を無視しており、Property と混在表示もされていない。

- `properties[]` → プロパティ入力欄として表示
- `contents[]` → **完全に無視（バックエンドでもフロントでも捨てられている）**

#### 修正方針

Content はデータ（数値列・文字列列等）を表す要素であり、Property（メタデータ・条件値等）とは
意味が異なる。そのため **Property 群の下に「データ」ラベル付き専用セクションを追加** して表示する。

#### 修正箇所

**① バックエンド `buildFallbackTemplates` に `contents` も含める**

```typescript
// template.contents を独立したフィールドとしてフロントに渡す
const templateItem = {
  templateId: template.templateId,
  templateType: ...,
  properties: (template.properties || []).map(p => convertPropertyForFallback(p)),
  contents: (template.contents || []).map(c => ({  // ← 新規追加
    key: c.key || '',
    xsiType: c.xsiType || 'contentStringListType',
    value: c.value ?? undefined,
    units: c.units || undefined,
    properties: [],
    contents: [],
  })),
};
```

**② フロントの `Template` 型（`experimentWorker.ts`）に `contents` フィールドを追加**

```typescript
export interface Template {
  templateId: string;
  templateType: string;
  properties: Property[];
  contents?: ContentField[];  // ← 新規追加
}

// Content フィールドの型（Property と区別するための専用型）
export interface ContentField {
  key: string;
  label: string;
  type: PropertyType;  // 'contentDoubleListType' | 'contentStringListType' 等
  units?: string;
}
```

**③ フロントの `convertTemplateDataItemsToTemplates` で `contents` を変換**

```typescript
const contents: ContentField[] = ((rawData as Record<string, unknown>).contents as Array<Record<string, unknown>> ?? [])
  .map(c => ({
    key: String(c.key ?? ''),
    label: String(c.key ?? ''),
    type: mapXsiTypeToPropertyType(String(c.xsiType ?? 'contentStringListType')),
    units: (c.units as string | undefined) ?? undefined,
  }));
// template オブジェクトに contents を含める
```

**④ フロントの描画部分（テンプレート詳細表示エリア）に Content セクションを追加**

`DataRecordDialog.tsx` のテンプレートフォーム描画部分に以下を追加：

```tsx
{/* Properties セクション（既存） */}
{selectedTemplate.properties.map((prop) => (
  <Col ... key={prop.key}>
    {renderPropertyInput(prop, selectedTemplate.templateId)}
  </Col>
))}

{/* Contents セクション（新規追加） */}
{selectedTemplate.contents && selectedTemplate.contents.length > 0 && (
  <>
    <Col span={24}>
      <Divider orientation="left" style={{ marginTop: 8, marginBottom: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>データ</Text>
      </Divider>
    </Col>
    {selectedTemplate.contents.map((content) => (
      <Col
        span={24}  // Content は全幅で表示（数値グリッド等を想定）
        key={content.key}
      >
        {renderPropertyInput(
          { ...content, nestedProperties: undefined },
          selectedTemplate.templateId
        )}
      </Col>
    ))}
  </>
)}
```

> **UI方針**:
> - `Divider` で "データ" ラベルを付けて Property セクションと視覚的に分離する
> - `contentDoubleListType` は既存のデータグリッドで表示
> - `contentStringListType` 等はスペース区切り TextArea で表示（修正⑤と共通）

### Phase 5: 動作確認

- [ ] `propertyListType` を持つテンプレートで子 Property の入力欄が表示されることを確認
- [ ] `contentStringListType` でスペース区切りの TextArea が表示されることを確認
- [ ] `doubleType` が数値入力欄として表示されることを確認
- [ ] 保存 → 再オープン時に値が復元されることを確認（DB実績パスでも壊れていないか）

---

## 5. 変更ファイル

| ファイル | 変更内容 | 変更規模 |
|---------|---------|---------|
| `backend/src/services/experimentDataService.ts` | `buildFallbackTemplates` の Property 変換を再帰化（子要素を捨てない） | 小〜中 |
| `frontend/src/types/experimentWorker.ts` | `PropertyType` に `contentStringListType` を追加 | 極小 |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | `mapXsiTypeToPropertyType` 拡張 + 再帰変換関数追加 + `renderPropertyInput` に case 追加 | 中 |

---

## 6. 技術的詳細

### バックエンドの MAIMLパーサー（`template.properties` の実態）

`MaimlParserTyped` が MAIMLファイルをパースすると、
`method.materialTemplates[].properties` は `backend/src/types/maiml-unified.ts` の
`Property[]` 型で返される。この型は：

```typescript
export interface Property {
  key: string;
  xsiType: string;
  value?: string | number | boolean;
  properties: Property[];   // ← propertyListType の子Property
  contents: Content[];      // ← ネスト内の Content
  units?: string;
  // ...
}
```

つまり **パーサーはネスト構造を正しく `properties`/`contents` フィールドに格納している**。
問題は `buildFallbackTemplates` がそれを空配列に上書きして捨てている点のみ。

### フロントの `Property` 型（今回修正後）

```typescript
export interface Property {
  key: string;
  label: string;
  type: PropertyType;
  units?: string;
  nestedProperties?: Property[];   // 子 Property（maiml-unified の properties[] に対応）
  contents?: ContentField[];       // 子 Content（maiml-unified の contents[] に対応）← 今回追加
  // ...
}
```

- バックエンドの `p.properties`（子Property配列）→ フロントの `nestedProperties` に変換
- バックエンドの `p.contents`（子Content配列）→ フロントの `contents` に変換（**Property と混在させない**）

> **将来タスク**: `nestedProperties` → `properties` へのリネーム、`type`（UI型）+ `xsiType`（MAIML生型）の統合等、
> `experimentWorker.ts` の `Property` 型全体を `maiml-unified.ts` に合わせる型統一リファクタリングを別タスクで実施する。

### `renderNestedProperties` の修正

現状の `renderNestedProperties` は `nestedProperties` のみ描画しており、`contents` を無視している。
今回の修正で `contents` も描画するよう拡張する。

**現状:**
```typescript
const renderNestedProperties = (property: Property, templateId: string) => {
  return (
    <div style={{ paddingLeft: 16, borderLeft: '3px solid #e0e0e0' }}>
      <Title level={5}>{property.label}</Title>
      {property.nestedProperties?.map((nestedProp) =>
        renderPropertyInput(nestedProp, templateId)
      )}
      {/* ❌ contents が無視されている */}
    </div>
  );
};
```

**修正後:**
```typescript
const renderNestedProperties = (property: Property, templateId: string) => {
  return (
    // borderLeft + paddingLeft でどのタグの子要素かが視覚的にわかる階層構造を表現
    <div style={{ paddingLeft: 16, borderLeft: '3px solid #e0e0e0', marginTop: 4 }}>
      <Title level={5} style={{ marginBottom: 4 }}>{property.label}</Title>
      {/* 子 Property を描画（再帰） */}
      {property.nestedProperties?.map((nestedProp) =>
        renderPropertyInput(nestedProp, templateId)
      )}
      {/* 子 Content を描画（Divider なし・同じ階層ブロック内に続けて表示） */}
      {property.contents?.map((content) =>
        renderPropertyInput(
          { ...content, nestedProperties: undefined, contents: undefined },
          templateId
        )
      )}
    </div>
  );
};
```

> **UI方針（子要素）**: Divider は不要。`borderLeft` + `paddingLeft` による
> インデントで「どのタグの子要素か」が明確になる。子 Property・子 Content は
> 同じ階層ブロック内に続けて表示する。

---

## 7. リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 再帰変換で無限ループが発生する | 中 | `depth < MAX_DEPTH`（MAX_DEPTH=5）で制限 |
| 保存時の `baseData` 構造が壊れる | 中 | DB実績パス（パターンA）は変更なし。フォールバックパスのみ修正 |
| `contentStringListType` の値を保存する際に型変換が必要 | 低 | バックエンドの `maimlDataWriter.ts` がスペース区切り文字列をそのまま扱う（既存実装確認済み） |
| 修正後も Content 子要素が MAIMLに正しく書き戻せない | 中 | Phase 5 の動作確認で保存・再オープンのテストを実施 |

---

## 8. 承認記録

- **計画書提示日時**: 2026-04-06 11:39（初版）/ 2026-04-06 11:46（調査結果反映版）
- **承認日時**: 2026-04-06 13:27
- **承認者コメント**: 承認。実装は新しいセッションで実行する。

---

## 9. 実施記録

（実装後に記入）

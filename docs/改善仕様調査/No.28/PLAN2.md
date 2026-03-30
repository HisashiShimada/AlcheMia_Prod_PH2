# タスク計画書: SubNetViewer PropertyPanel 表示修正

## メタデータ
- **作成日時**: 2026-03-27 09:27
- **タスクID**: subnet-propertypanel-fix
- **優先度**: 高
- **推定工数**: 2〜3時間

---

## 1. タスク概要

SubNetViewer でPlaceノードをクリックしたとき、右ペインのPropertyPanelに以下の問題がある：

1. **テンプレート情報（templateMap）が取得できないためプロパティが空** → SubNetViewerがtemplateMaのキーをtemplateId優先で参照しているが、キーはplaceId
2. **uuid/descriptionが表示されない** → PetriNetViewer.tsx の `placesForSubNet` 生成時にuuid/descriptionがnode.dataに含まれていない
3. **placeRef がテンプレートタブに表示されてしまう** → `extractTemplateProperties` がplaceRef要素をフィルタせず template プロパティとして返している
4. **プロパティがObject JSONのまま1行で表示される** → PropertyViewer の描画ロジック問題（Object型をJSON.stringifyで1行表示）

---

## 2. 問題の詳細分析

### 問題A: templateMapキー不一致（PLAN.md記載済み）

`buildTemplateMap()` のキーは **placeId** だが、SubNetViewer では **templateId** で参照。

### 問題B: XMLプロパティの表示形式

`extractTemplateProperties()` は XML Element の子要素を単純に `textContent` で取得しているが、MAIMLのpropertyノードは以下の構造を持つ：

```xml
<materialTemplate id="mt001">
  <name>サンプル材料</name>
  <description>説明文</description>
  <placeRef ref="p001"/>
  <property key="temperature" xsi:type="doubleType" units="K">
    <value>300</value>
    <description>温度</description>
  </property>
  <property key="composition" xsi:type="propertyListType">
    <property key="element" xsi:type="stringType">
      <value>Fe</value>
    </property>
  </property>
</materialTemplate>
```

現在の `extractTemplateProperties()` は子要素をフラットに列挙し、属性がある場合は `{ _value, attr1, attr2 }` というオブジェクトを作る。これが `JSON.stringify()` で1行表示される。

### 問題C: PropertyViewerのObject描画

```typescript
// 現在のコード
if (typeof value === 'object') {
  return <Text code>{JSON.stringify(value)}</Text>;  // ← JSON 1行表示
}
```

---

## 3. 修正方針

### 方針1: templateMapキー不一致修正（PLAN.md Phase 1）
`SubNetViewer.tsx` の templateMap 参照を placeId 優先に変更。

### 方針2: `extractTemplateProperties` をMAIMLのproperty構造対応に刷新
MAIMLのpropertyノードを正しく再帰パースする新関数に置き換える。

### 方針3: PropertyViewerの描画をネストObject対応に改善
- Objectの場合は再帰的に展開してテーブル表示
- 配列の場合はリスト表示
- プロパティのネスト階層を可視化

---

## 4. 影響ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `frontend/src/components/viewer/dialogs/SubNetViewer.tsx` | 修正 | ① templateMap参照をplaceId優先に変更、② `extractTemplateProperties` をMAIML property構造対応に刷新、③ `structuredProperties.template` にMAIMLプロパティを展開して詰める |
| `frontend/src/components/viewer/dialogs/PropertyViewer.tsx` | 修正 | テンプレートタブをネストされたMAIMLプロパティに対応した表示に変更 |

---

## 5. 実装ステップ

### Phase 1: templateMapキー不一致修正（SubNetViewer.tsx）

```typescript
// 修正前
let templateId = place.data.template?.id || place.data.templateId || place.id;
if (templateId && templateMap[templateId]) { ... }

// 修正後
let templateInfo: TemplateInfo | null = null;
// ① placeId優先
if (templateMap[place.id]?.element) {
  templateInfo = { id: place.id, ..., element: templateMap[place.id].element };
}
// ② フォールバック: templateId
if (!templateInfo) {
  const tid = place.data.template?.id || place.data.templateId;
  if (tid && templateMap[tid]?.element) {
    templateInfo = { id: tid, ..., element: templateMap[tid].element };
  }
}
```

### Phase 2: MAIMLプロパティ解析ロジックの刷新（SubNetViewer.tsx）

現在の `extractTemplateProperties()` を廃止または補完し、MAIML propertyノードを正しく解析する新関数 `extractMaimlTemplateData()` を追加する。

```typescript
/**
 * MAIML templateElement から基本情報とpropertyリストを抽出
 */
const extractMaimlTemplateData = (templateElement: Element, templateType: string): {
  basicInfo: Record<string, string>;
  properties: MaimlProperty[];
} => {
  // 基本情報
  const id = templateElement.getAttribute('id') || '';
  const nameEl = templateElement.querySelector(':scope > name');
  const descEl = templateElement.querySelector(':scope > description');
  const placeRefs = Array.from(templateElement.querySelectorAll(':scope > placeRef'))
    .map(el => el.getAttribute('ref') || '');

  const basicInfo = {
    id,
    name: nameEl?.textContent?.trim() || '',
    description: descEl?.textContent?.trim() || '',
    templateType,
    placeRefs: placeRefs.join(', '),
  };

  // property要素を再帰的に抽出
  const propElements = Array.from(templateElement.querySelectorAll(':scope > property'));
  const properties = propElements.map(parseMaimlProperty);

  return { basicInfo, properties };
};

/**
 * property要素を再帰的にパース
 */
interface MaimlProperty {
  key: string;
  xsiType: string;
  units?: string;
  value?: string;
  description?: string;
  children: MaimlProperty[];
}

const parseMaimlProperty = (el: Element): MaimlProperty => {
  const key = el.getAttribute('key') || el.getAttribute('id') || '';
  const xsiType = el.getAttribute('xsi:type') || '';
  const units = el.getAttribute('units') || undefined;
  const valueEl = el.querySelector(':scope > value');
  const descEl = el.querySelector(':scope > description');
  const childProps = Array.from(el.querySelectorAll(':scope > property'));

  return {
    key,
    xsiType,
    units,
    value: valueEl?.textContent?.trim(),
    description: descEl?.textContent?.trim(),
    children: childProps.map(parseMaimlProperty),
  };
};
```

### Phase 3: structuredProperties への詰め方を刷新（SubNetViewer.tsx の handleNodeClick）

```typescript
// Placeクリック時
if (node.data.template?.element) {
  const { basicInfo, properties } = extractMaimlTemplateData(
    node.data.template.element,
    node.data.templateType
  );

  // 基本情報タブ
  const basicProperties = Object.fromEntries(
    Object.entries(basicInfo).map(([k, v]) => [k, { key: k, value: v, type: 'string' }])
  );

  // テンプレートタブ: MAIMLプロパティリストを展開して詰める
  // プロパティを flat に展開（children は indent表示のためにkeyにprefixをつける）
  const templateProperties: Record<string, PropertyObject> = {};
  const flattenProperties = (props: MaimlProperty[], prefix = '') => {
    props.forEach(prop => {
      const displayKey = prefix ? `${prefix}.${prop.key}` : prop.key;
      templateProperties[displayKey] = {
        key: displayKey,
        value: prop.value ?? '',
        type: prop.xsiType,
        description: [
          prop.description,
          prop.units ? `単位: ${prop.units}` : undefined
        ].filter(Boolean).join(' / '),
      };
      if (prop.children.length > 0) {
        flattenProperties(prop.children, displayKey);
      }
    });
  };
  flattenProperties(properties);

  setStructuredProperties({
    basic: basicProperties,
    template: templateProperties,
    data: {},
  });
}
```

### Phase 4: PropertyViewer のテンプレートタブ表示改善

現在の `typeof value === 'object'` のときの `JSON.stringify` を廃止し、`type`（xsi:type）情報と `description` を活用した表示に変更。

```typescript
// PropertyViewer.tsx の columns render
render: (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return <Text type="secondary" italic>未設定</Text>;
  }
  if (typeof value === 'boolean') {
    return value ? <Tag color="success">はい</Tag> : <Tag color="error">いいえ</Tag>;
  }
  if (typeof value === 'object') {
    // ネストObjectは展開表示（旧: JSON.stringify）
    return (
      <details>
        <summary style={{ cursor: 'pointer' }}>
          <Text type="secondary">オブジェクト ({Object.keys(value as object).length}件)</Text>
        </summary>
        <Text code style={{ fontSize: 11 }}>
          {JSON.stringify(value, null, 2)}
        </Text>
      </details>
    );
  }
  return <Text>{String(value)}</Text>;
},
```

また、テンプレートタブのカラム定義に `type` と `description` 列を追加：

```typescript
// テンプレートタブ専用カラム
const templateColumns = [
  { title: 'キー', dataIndex: 'propKey', key: 'propKey', width: '30%', render: ... },
  { title: 'xsi:type', dataIndex: 'xsiType', key: 'xsiType', width: '20%', render: ... },
  { title: '値', dataIndex: 'value', key: 'value', width: '25%', render: ... },
  { title: '説明/単位', dataIndex: 'description', key: 'description', width: '25%', render: ... },
];
```

ただし、これは PropertyViewer の `structuredProperties` の型変更を伴うため、段階的に実施する。

**最小修正アプローチ（Phase 4 簡易版）**:
- PropertyViewer の変更は最小限
- SubNetViewer 側で `value` を文字列化（型情報も含めて）して渡す
- Object/Array が value に入らないように SubNetViewer 側で整形する

---

## 6. 実装優先順位

| 優先度 | 内容 | 効果 |
|--------|------|------|
| 🔴 最優先 | Phase 1: templateMapキー不一致修正 | templateInfo.elementがnullでなくなる |
| 🔴 最優先 | Phase 2+3: MAIMLプロパティ解析刷新 | テンプレートタブにプロパティ一覧が表示される |
| 🟡 重要 | Phase 4 簡易版: Object値の文字列化 | JSON1行問題が解消される |
| 🟢 改善 | Phase 4 正式版: PropertyViewerカラム拡張 | type/descriptionも表示される |

---

## 7. 変更前後の比較

### 修正前（現状）
```
[テンプレートタブ]
表示するプロパティがありません  ← templateMapヒットしないため
```

### 修正後（期待値）
```
[基本情報タブ]
ID        | mt001
名前      | サンプル材料
説明      | 材料の説明
種別      | material
参照Place | p001

[テンプレートタブ]
キー              | xsi:type    | 値   | 説明/単位
temperature       | doubleType  | 300  | 温度 / 単位: K
composition       | propertyListType | -  | -
composition.element | stringType | Fe  | 元素
```

---

## 8. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `extractMaimlTemplateData` でのDOM操作エラー | 中 | try-catchで囲みフォールバック |
| `structuredProperties` の型変更による他コンポーネントへの影響 | 中 | Phase 4は最小限の変更に留める |
| Phase 1のtemplateMapsキー修正でもヒットしないケース | 低 | ログ追加して原因調査 |

---

## 9. 承認記録

- **計画書提示日時**: 2026-03-27 09:27
- **承認日時**: （承認時に記入）
- **承認者コメント**: （未記入）

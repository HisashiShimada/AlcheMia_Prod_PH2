# PropertyViewerWithSelection 詳細設計書

## メタデータ
- **作成日時**: 2025-12-26 16:53
- **関連タスク**: viewer-layout-unification
- **目的**: PropertyViewerWithSelectionコンポーネントの具体的な設計と見た目を説明

## 1. コンポーネント概要

PropertyViewerWithSelectionは、既存の**PropertyViewer**（表示専用）と**StructuredPropertySelector**（選択機能）を統合した新しいコンポーネントです。

**統合の目的:**
- PropertyViewerの見やすい表示形式を維持
- StructuredPropertySelectorのチェックボックス選択機能を追加
- 一貫性のあるUI/UXを実現

## 2. UI構造とレイアウト

### 2.1. 全体構造

```
┌─────────────────────────────────────────────────┐
│ ヘッダー（ノードタイプ別カラー）                  │
│ 🟦 Material Node プロパティ [Material]    [×]   │
├─────────────────────────────────────────────────┤
│ タブ                                            │
│ [基本情報 2] [テンプレート 1] [データ 0]         │
├─────────────────────────────────────────────────┤
│ リスト（チェックボックス付き）                    │
│                                                 │
│ ☑ id                                           │
│   ID: mat_001                                   │
│                                                 │
│ ☐ name                                          │
│   名前: Sample Material                         │
│                                                 │
│ ☑ description                                   │
│   説明: This is a test material                 │
│                                                 │
│ ☐ uuid                                          │
│   UUID: 12345-abcde-67890                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 2.2. ヘッダー部分

**PropertyViewerから継承:**

```tsx
<div style={{
  padding: '12px 16px',
  backgroundColor: headerColor,  // ノードタイプ別
  borderBottom: '1px solid #f0f0f0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}}>
  <Space>
    <Title level={5} style={{ margin: 0, color: 'white' }}>
      {nodeName} プロパティ
    </Title>
    <Tag color="white" style={{ color: headerColor }}>
      {nodeType}
    </Tag>
  </Space>
  <Button
    type="text"
    icon={<CloseOutlined />}
    onClick={onClose}
    style={{ color: 'white' }}
  />
</div>
```

**ヘッダーカラー（ノードタイプ別）:**
- **Result**: `#D7BDE2` （マゼンタ）
- **Condition**: `#85C1E9` （シアン）
- **Material**: `#F8C471` （黄色）
- **Transition**: `#CCCCCC` （グレー）

### 2.3. タブ部分

**PropertyViewerから継承:**

```tsx
<Tabs
  activeKey={activeTab}
  onChange={setActiveTab}
  items={[
    {
      key: 'basic',
      label: (
        <Space>
          基本情報
          {selectedCount > 0 && <Tag color="blue">{selectedCount}</Tag>}
        </Space>
      ),
      children: renderPropertyList('basic'),
    },
    // template, data タブも同様
  ]}
/>
```

**タブラベル:**
- 選択済みプロパティ数をバッジ表示
- 例: `基本情報 [2]` `テンプレート [1]` `データ [0]`

### 2.4. プロパティリスト部分

**StructuredPropertySelectorから継承:**

```tsx
<List
  dataSource={propertyEntries}
  renderItem={([propKey, propertyObj]) => {
    const isSelected = selectedProperties[structure].includes(propKey);
    const label = getPropertyLabel(propKey, propertyObj);
    const value = formatPropertyValue(propertyObj);
    
    return (
      <List.Item
        style={{ 
          cursor: 'pointer', 
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
        }}
        onClick={() => onPropertyToggle(structure, propKey)}
      >
        <List.Item.Meta
          avatar={
            <Checkbox
              checked={isSelected}
              onChange={() => onPropertyToggle(structure, propKey)}
            />
          }
          title={<Text strong>{label}</Text>}
          description={
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {value}
            </Text>
          }
        />
      </List.Item>
    );
  }}
  style={{ maxHeight: '400px', overflow: 'auto' }}
/>
```

## 3. 具体的な表示例

### 3.1. Material ノード選択時

```
┌─────────────────────────────────────────────────┐
│ 🟨 Sample Material プロパティ [Material]   [×]  │
├─────────────────────────────────────────────────┤
│ [基本情報 3] [テンプレート 2] [データ 0]         │
├─────────────────────────────────────────────────┤
│ 基本情報タブ（active）                           │
│                                                 │
│ ☑ id                                           │
│   ID: mat_001                                   │
│                                                 │
│ ☑ name                                          │
│   名前: Sample Material                         │
│                                                 │
│ ☑ type                                          │
│   タイプ: Material                              │
│                                                 │
│ ☐ uuid                                          │
│   UUID: abc123-def456-ghi789                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 3.2. Condition ノード選択時

```
┌─────────────────────────────────────────────────┐
│ 🔵 Temperature Condition プロパティ [Condition] [×]│
├─────────────────────────────────────────────────┤
│ [基本情報 2] [テンプレート 3] [データ 1]         │
├─────────────────────────────────────────────────┤
│ テンプレートタブ（active）                       │
│                                                 │
│ ☑ template_id                                  │
│   Template ID: temp_cond_001                    │
│                                                 │
│ ☐ template_description                          │
│   Template Description: Temperature control...  │
│                                                 │
│ ☑ min_value                                     │
│   最小値: 20.0                                   │
│                                                 │
│ ☑ max_value                                     │
│   最大値: 80.0                                   │
│                                                 │
│ ☐ unit                                          │
│   単位: ℃                                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 3.3. Transition ノード選択時

```
┌─────────────────────────────────────────────────┐
│ ⚪ Mixing Process プロパティ [Transition]   [×] │
├─────────────────────────────────────────────────┤
│ [基本情報 3] [テンプレート 0] [データ 0]         │
├─────────────────────────────────────────────────┤
│ 基本情報タブ（active）                           │
│                                                 │
│ ☑ id                                           │
│   ID: trans_001                                 │
│                                                 │
│ ☑ name                                          │
│   名前: Mixing Process                          │
│                                                 │
│ ☑ type                                          │
│   タイプ: Transition                            │
│                                                 │
│ ☐ description                                   │
│   説明: Mix materials at controlled temperature │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 4. 既存コンポーネントとの比較

### 4.1. PropertyViewer（現行）

**見た目:**
```
┌─────────────────────────────────────────────────┐
│ 🟨 Sample Material プロパティ [Material]   [×]  │
├─────────────────────────────────────────────────┤
│ [基本情報] [テンプレート] [データ]               │
├─────────────────────────────────────────────────┤
│ プロパティ          | 値                        │
│─────────────────────┼──────────────────────────│
│ ID                  | mat_001                   │
│ 名前                | Sample Material           │
│ タイプ              | Material                  │
│ UUID                | abc123-def456-ghi789      │
└─────────────────────────────────────────────────┘
```

**特徴:**
- ✅ Table形式で整理されている
- ✅ ヘッダーカラーでノードタイプを識別
- ❌ プロパティ選択機能なし

### 4.2. StructuredPropertySelector（現行）

**見た目:**
```
┌─────────────────────────────────────────────────┐
│ プロパティ選択: Sample Material           [×]   │
├─────────────────────────────────────────────────┤
│ 選択中のプロパティ                              │
│ [基本情報: id] [基本情報: name]                 │
├─────────────────────────────────────────────────┤
│ [基本情報 2] [テンプレート 1] [データ 0]         │
├─────────────────────────────────────────────────┤
│ ☑ id                                           │
│   mat_001                                       │
│                                                 │
│ ☑ name                                          │
│   Sample Material                               │
│                                                 │
│ ☐ uuid                                          │
│   abc123-def456-ghi789                          │
└─────────────────────────────────────────────────┘
```

**特徴:**
- ✅ チェックボックスで選択可能
- ✅ 選択中のプロパティをチップ表示
- ❌ ヘッダーカラーなし（ノードタイプ識別が弱い）
- ❌ Modalまたは埋め込み表示のみ

### 4.3. PropertyViewerWithSelection（新規）

**見た目:**
```
┌─────────────────────────────────────────────────┐
│ 🟨 Sample Material プロパティ [Material]   [×]  │
├─────────────────────────────────────────────────┤
│ [基本情報 2] [テンプレート 1] [データ 0]         │
├─────────────────────────────────────────────────┤
│ ☑ id                                           │
│   ID: mat_001                                   │
│                                                 │
│ ☑ name                                          │
│   名前: Sample Material                         │
│                                                 │
│ ☐ uuid                                          │
│   UUID: abc123-def456-ghi789                    │
└─────────────────────────────────────────────────┘
```

**特徴:**
- ✅ PropertyViewerのヘッダーカラー
- ✅ StructuredPropertySelectorのチェックボックス
- ✅ プロパティ名と値の両方を表示
- ✅ Drawer表示に最適化

## 5. 技術実装詳細

### 5.1. インターフェース定義

```tsx
interface PropertyViewerWithSelectionProps {
  // プロパティ情報
  properties: {
    id: string;
    name: string;
    type: 'Material' | 'Condition' | 'Result' | 'Transition';
  };
  
  // MAIML データ
  maimlData: string;
  
  // 選択状態（親コンポーネントで管理）
  selectedProperties: {
    basic: string[];
    template: string[];
    data: string[];
  };
  
  // プロパティ選択時のコールバック
  onPropertyToggle: (
    structure: 'basic' | 'template' | 'data',
    property: string
  ) => void;
  
  // 閉じるボタンのハンドラ
  onClose?: () => void;
}
```

### 5.2. 主要な状態管理

```tsx
// アクティブタブ
const [activeTab, setActiveTab] = useState<string>('basic');

// 構造別プロパティデータ
const [structuredProps, setStructuredProps] = useState<{
  basic: Record<string, PropertyObject>;
  template: Record<string, PropertyObject>;
  data: Record<string, PropertyObject>;
}>({
  basic: {},
  template: {},
  data: {},
});

// ヘッダーカラー
const [headerColor, setHeaderColor] = useState<string>('#D7BDE2');

// XMLパース結果
const [parsedXml, setParsedXml] = useState<Document | null>(null);
```

### 5.3. プロパティ抽出ロジック

```tsx
useEffect(() => {
  if (!maimlData || !properties.id) return;
  
  // XMLをパース
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(maimlData, 'text/xml');
  setParsedXml(xmlDoc);
  
  // ノードタイプに応じてヘッダーカラーを設定
  switch (properties.type) {
    case 'Result':
      setHeaderColor('#D7BDE2');
      break;
    case 'Condition':
      setHeaderColor('#85C1E9');
      break;
    case 'Material':
      setHeaderColor('#F8C471');
      break;
    case 'Transition':
      setHeaderColor('#CCCCCC');
      break;
  }
  
  // プロパティを抽出して構造化
  const extracted = extractStructuredProperties(xmlDoc, properties.id);
  setStructuredProps(extracted);
}, [maimlData, properties]);
```

### 5.4. リストアイテムのレンダリング

```tsx
const renderPropertyList = (structure: 'basic' | 'template' | 'data') => {
  const properties = structuredProps[structure] || {};
  const selected = selectedProperties[structure] || [];
  
  const propertyEntries = Object.entries(properties);
  
  if (propertyEntries.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="プロパティがありません"
      />
    );
  }
  
  return (
    <List
      dataSource={propertyEntries}
      renderItem={([propKey, propertyObj]) => {
        const isSelected = selected.includes(propKey);
        const label = formatKey(propKey);  // "id" → "ID"
        const value = formatValue(propertyObj);  // オブジェクト → 文字列
        
        return (
          <List.Item
            style={{ 
              cursor: 'pointer',
              padding: '12px 16px',
              backgroundColor: isSelected ? '#e6f7ff' : 'transparent',
            }}
            onClick={() => onPropertyToggle(structure, propKey)}
          >
            <List.Item.Meta
              avatar={
                <Checkbox
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    onPropertyToggle(structure, propKey);
                  }}
                />
              }
              title={<Text strong>{label}</Text>}
              description={
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {value}
                </Text>
              }
            />
          </List.Item>
        );
      }}
      style={{ maxHeight: '400px', overflow: 'auto' }}
    />
  );
};
```

## 6. 使用例

### 6.1. PetriNetViewerでの使用

```tsx
// PetriNetViewer.tsx

const [drawerOpen, setDrawerOpen] = useState(false);
const [selectedNode, setSelectedNode] = useState<Node | null>(null);
const [selectedProperties, setSelectedProperties] = useState({
  basic: [],
  template: [],
  data: [],
});

const handleNodeClick: NodeMouseHandler = useCallback((event, node) => {
  setSelectedNode(node);
  setDrawerOpen(true);
}, []);

const handlePropertyToggle = useCallback(
  (structure: string, property: string) => {
    setSelectedProperties(prev => {
      const current = prev[structure] || [];
      const isSelected = current.includes(property);
      return {
        ...prev,
        [structure]: isSelected
          ? current.filter(p => p !== property)
          : [...current, property]
      };
    });
  },
  []
);

return (
  <>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodeClick={handleNodeClick}
      // ... その他のprops
    />
    
    <Drawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      width={400}
      getContainer={() => 
        document.getElementById('petri-net-viewer-container') || 
        document.body
      }
    >
      {selectedNode && (
        <PropertyViewerWithSelection
          properties={{
            id: selectedNode.id,
            name: selectedNode.data.label,
            type: selectedNode.data.templateType || 'Material',
          }}
          maimlData={maimlData}
          selectedProperties={selectedProperties}
          onPropertyToggle={handlePropertyToggle}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </Drawer>
  </>
);
```

### 6.2. SubNetViewerでの使用

```tsx
// SubNetViewer.tsx

// 同様の実装パターン
// PropertyViewerの代わりにPropertyViewerWithSelectionを使用
```

## 7. まとめ

### PropertyViewerWithSelectionの特徴

**良い点:**
✅ PropertyViewerの見やすさ（ヘッダーカラー、整理されたレイアウト）
✅ StructuredPropertySelectorの機能性（チェックボックス選択）
✅ 両方の長所を統合した統一UI
✅ Drawer表示に最適化

**既存コンポーネントとの関係:**
- PropertyViewer: 引き続き表示専用として使用可能
- StructuredPropertySelector: 引き続きModal/埋め込み表示として使用可能
- PropertyViewerWithSelection: Drawer表示用の新しい選択肢

これにより、用途に応じて適切なコンポーネントを選択できます。

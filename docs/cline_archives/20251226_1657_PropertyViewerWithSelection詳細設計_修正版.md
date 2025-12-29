# PropertyViewerWithSelection 詳細設計書（修正版）

## メタデータ
- **作成日時**: 2025-12-26 16:57
- **関連タスク**: viewer-layout-unification
- **目的**: PropertyViewerWithSelectionコンポーネントの具体的な設計と見た目を説明
- **修正内容**: PropertyViewerをベースとしたTable形式（チェックボックス、プロパティ名、値の3列構造）

## 1. コンポーネント概要

PropertyViewerWithSelectionは、既存の**PropertyViewer**（表示専用）をベースに、左端にチェックボックスを追加した新しいコンポーネントです。

**設計方針:**
- **PropertyViewerのTable形式を採用**（StructuredPropertySelectorのList形式は使用しない）
- 左端にチェックボックス列を追加
- プロパティ名と値を明確に分離した3列構造
- チェックボックス選択処理はStructuredPropertySelectorと同様

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
│ Table（3列構造）                                │
│                                                 │
│ [ ] | プロパティ          | 値                  │
│─────┼────────────────────┼─────────────────────│
│ [✓] | ID                 | mat_001             │
│ [ ] | 名前               | Sample Material     │
│ [✓] | 説明               | This is a test...   │
│ [ ] | UUID               | 12345-abcde-67890   │
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
      children: renderPropertyTable('basic'),
    },
    // template, data タブも同様
  ]}
/>
```

**タブラベル:**
- 選択済みプロパティ数をバッジ表示
- 例: `基本情報 [2]` `テンプレート [1]` `データ [0]`

### 2.4. プロパティテーブル部分（PropertyViewerベース）

**3列構造のTable:**

```tsx
<Table
  columns={[
    {
      title: '',
      dataIndex: 'selected',
      key: 'selected',
      width: 50,
      align: 'center',
      render: (_: any, record: any) => (
        <Checkbox
          checked={selectedProperties[structure].includes(record.key)}
          onChange={(e) => {
            e.stopPropagation();
            onPropertyToggle(structure, record.key);
          }}
        />
      ),
    },
    {
      title: 'プロパティ',
      dataIndex: 'propKey',
      key: 'propKey',
      width: '35%',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '値',
      dataIndex: 'value',
      key: 'value',
      render: (value: unknown) => {
        if (value === null || value === undefined || value === '') {
          return <Text type="secondary" italic>未設定</Text>;
        }
        if (typeof value === 'boolean') {
          return value ? (
            <Tag color="success">はい</Tag>
          ) : (
            <Tag color="error">いいえ</Tag>
          );
        }
        if (typeof value === 'object') {
          return <Text code>{JSON.stringify(value)}</Text>;
        }
        return <Text>{String(value)}</Text>;
      },
    },
  ]}
  dataSource={convertToTableData(properties)}
  pagination={false}
  size="small"
  showHeader={true}
  onRow={(record) => ({
    onClick: () => onPropertyToggle(structure, record.key),
    style: { 
      cursor: 'pointer',
      backgroundColor: selectedProperties[structure].includes(record.key) 
        ? '#e6f7ff' 
        : 'transparent',
    },
  })}
  scroll={{ y: 400 }}
/>
```

**特徴:**
- **1列目**: チェックボックス（幅50px、中央揃え）
- **2列目**: プロパティ名（幅35%、太字）
- **3列目**: 値（残りの幅、型に応じた表示）
- 行クリックでチェック状態を切り替え
- 選択行は背景色変更（#e6f7ff）

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
│ [ ] | プロパティ          | 値                  │
│─────┼────────────────────┼─────────────────────│
│ [✓] | ID                 | mat_001             │
│ [✓] | 名前               | Sample Material     │
│ [✓] | タイプ             | Material            │
│ [ ] | UUID               | abc123-def456-...   │
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
│ [ ] | プロパティ              | 値              │
│─────┼────────────────────────┼─────────────────│
│ [✓] | Template ID            | temp_cond_001   │
│ [ ] | Template Description   | Temperature...  │
│ [✓] | 最小値                 | 20.0            │
│ [✓] | 最大値                 | 80.0            │
│ [ ] | 単位                   | ℃              │
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
│ [ ] | プロパティ          | 値                  │
│─────┼────────────────────┼─────────────────────│
│ [✓] | ID                 | trans_001           │
│ [✓] | 名前               | Mixing Process      │
│ [✓] | タイプ             | Transition          │
│ [ ] | 説明               | Mix materials at... │
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
- ✅ Table形式（2列）で整理されている
- ✅ ヘッダーカラーでノードタイプを識別
- ❌ プロパティ選択機能なし

### 4.2. PropertyViewerWithSelection（新規・修正版）

**見た目:**
```
┌─────────────────────────────────────────────────┐
│ 🟨 Sample Material プロパティ [Material]   [×]  │
├─────────────────────────────────────────────────┤
│ [基本情報 2] [テンプレート 1] [データ 0]         │
├─────────────────────────────────────────────────┤
│ [ ] | プロパティ          | 値                  │
│─────┼────────────────────┼─────────────────────│
│ [✓] | ID                 | mat_001             │
│ [✓] | 名前               | Sample Material     │
│ [ ] | UUID               | abc123-def456-...   │
└─────────────────────────────────────────────────┘
```

**特徴:**
- ✅ PropertyViewerのヘッダーカラー
- ✅ PropertyViewerのTable形式を維持（3列に拡張）
- ✅ 左端にチェックボックス追加
- ✅ プロパティ名と値を明確に分離
- ✅ Drawer表示に最適化
- ✅ 行クリックで選択切り替え

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

### 5.3. テーブルデータ変換

```tsx
// プロパティデータをテーブル用に変換
const convertToTableData = (data: Record<string, any>) => {
  return Object.entries(data).map(([propKey, value]) => ({
    key: propKey,                    // 内部キー
    propKey: formatKey(propKey),     // 表示用プロパティ名
    value: value,                    // 値
  }));
};

// キー名をフォーマット
const formatKey = (key: string): string => {
  const keyMap: Record<string, string> = {
    id: 'ID',
    name: '名前',
    type: 'タイプ',
    description: '説明',
    uuid: 'UUID',
    // ... その他のマッピング
  };
  
  return keyMap[key] || key;
};
```

### 5.4. テーブルレンダリング

```tsx
const renderPropertyTable = (structure: 'basic' | 'template' | 'data') => {
  const properties = structuredProps[structure] || {};
  const selected = selectedProperties[structure] || [];
  
  const tableData = convertToTableData(properties);
  
  if (tableData.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="プロパティがありません"
      />
    );
  }
  
  // カラム定義
  const columns = [
    {
      title: '',
      dataIndex: 'selected',
      key: 'selected',
      width: 50,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Checkbox
          checked={selected.includes(record.key)}
          onChange={(e) => {
            e.stopPropagation();
            onPropertyToggle(structure, record.key);
          }}
        />
      ),
    },
    {
      title: 'プロパティ',
      dataIndex: 'propKey',
      key: 'propKey',
      width: '35%',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '値',
      dataIndex: 'value',
      key: 'value',
      render: (value: unknown) => {
        if (value === null || value === undefined || value === '') {
          return <Text type="secondary" italic>未設定</Text>;
        }
        if (typeof value === 'boolean') {
          return value ? (
            <Tag color="success">はい</Tag>
          ) : (
            <Tag color="error">いいえ</Tag>
          );
        }
        if (typeof value === 'object') {
          return <Text code>{JSON.stringify(value)}</Text>;
        }
        return <Text>{String(value)}</Text>;
      },
    },
  ];
  
  return (
    <Table
      columns={columns}
      dataSource={tableData}
      pagination={false}
      size="small"
      showHeader={true}
      onRow={(record) => ({
        onClick: () => onPropertyToggle(structure, record.key),
        style: { 
          cursor: 'pointer',
          backgroundColor: selected.includes(record.key) ? '#e6f7ff' : 'transparent',
        },
      })}
      scroll={{ y: 400 }}
    />
  );
};
```

## 6. PropertyViewerとの違い

### 変更点まとめ

| 項目 | PropertyViewer | PropertyViewerWithSelection |
|------|----------------|----------------------------|
| カラム数 | 2列 | 3列 |
| チェックボックス | なし | あり（1列目） |
| プロパティ名 | 1列目 | 2列目 |
| 値 | 2列目 | 3列目 |
| 行クリック | なし | チェック切り替え |
| 選択行の強調 | なし | 背景色変更 |
| タブバッジ | なし | 選択数表示 |

### コードの再利用

PropertyViewerWithSelectionは、PropertyViewerの以下を再利用します:
- ヘッダー部分のコンポーネント
- ヘッダーカラー設定ロジック
- プロパティ抽出ロジック
- タブ構造
- キー名フォーマット関数
- 値フォーマット関数

追加実装する部分:
- チェックボックス列
- 選択状態の管理
- onPropertyToggleコールバック
- 行クリックハンドラー
- タブバッジ（選択数表示）

## 7. 使用例

### 7.1. PetriNetViewerでの使用

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
      width={450}  // チェックボックス列分、少し広めに
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

## 8. まとめ

### PropertyViewerWithSelectionの特徴

**設計方針:**
✅ PropertyViewerをベースにした一貫性のあるUI
✅ Table形式（3列構造）でプロパティを明確に表示
✅ 左端にチェックボックスを追加してプロパティ選択機能を実現
✅ StructuredPropertySelectorのonPropertyToggleロジックを採用

**PropertyViewerとの違い:**
- カラム数: 2列 → 3列
- チェックボックス列を追加
- 行クリックでチェック状態切り替え
- 選択行の背景色変更
- タブに選択数バッジ表示

**StructuredPropertySelectorとの違い:**
- List形式 → Table形式
- ヘッダーカラーあり
- プロパティ名と値を明確に分離

これにより、PropertyViewerの見やすさとStructuredPropertySelectorの選択機能を両立した統一UIを実現します。

# UIポリシー

## 基本原則

### デザイントークンの使用を徹底

MaiML Viewerは、Ant Design v6のデザイントークンシステムを完全に活用し、一貫性のあるUIを提供します。

**重要なルール:**
- ✅ **Ant Designのデザイントークンを使用する**
- ❌ **インラインスタイル（`style` prop）でのハードコーディングを禁止**
- ✅ **テーマ設定（`theme.ts`）でトークンをカスタマイズする**
- ✅ **コンポーネントの props でスタイルを制御する**

### スタイル記述の原則

#### 1. デザイントークンの使用（推奨）

**DO（推奨）:**
```typescript
// ✅ コンポーネントのサイズpropsを使用
<Button size="large" type="primary">送信</Button>

// ✅ Spaceコンポーネントで間隔を制御
<Space size="middle" direction="vertical">
  <Card>...</Card>
  <Card>...</Card>
</Space>

// ✅ theme.tsで定義されたトークンを使用
import { theme } from 'antd';
const { token } = theme.useToken();
<div style={{ color: token.colorPrimary }}>テキスト</div>
```

**DON'T（非推奨）:**
```typescript
// ❌ インラインスタイルでハードコーディング
<Button style={{ height: '40px', backgroundColor: '#CF0027' }}>送信</Button>

// ❌ 具体的なピクセル値で間隔を指定
<div style={{ marginBottom: '16px' }}>...</div>

// ❌ 直接色コードを指定
<div style={{ color: '#CF0027' }}>テキスト</div>
```

#### 2. CSS Modules / CSS-in-JS（例外的に使用）

複雑なレイアウトやアニメーションが必要な場合のみ、CSS ModulesまたはCSS-in-JS（Emotion）を使用可能です。ただし、可能な限りデザイントークンを参照してください。

```typescript
// ✅ Emotionでデザイントークンを参照
import styled from '@emotion/styled';
import { theme } from 'antd';

const StyledCard = styled.div`
  padding: ${({ theme }) => theme.token.paddingLG}px;
  border-radius: ${({ theme }) => theme.token.borderRadiusLG}px;
  background: ${({ theme }) => theme.token.colorBgContainer};
`;

// 使用時にthemeを渡す
const { token } = theme.useToken();
<StyledCard theme={{ token }}>コンテンツ</StyledCard>
```

## デザインシステム概要

MaiML Viewerは、白を基調とした明るく清潔感のあるインターフェースに、赤系のアクセントカラーを組み合わせ、科学的な信頼性と使いやすさを両立します。

**具体的な色コードやサイズ値は `frontend/src/theme/theme.ts` で定義します。**

## デザイントークンの概要

### カラートークン

**プライマリカラー系:**
- `colorPrimary` - メインのブランドカラー（ボタン、リンクなど）
- `colorPrimaryHover` - ホバー時の色
- `colorPrimaryActive` - 押下時の色
- `colorPrimaryBg` - プライマリ背景色（薄い）
- `colorPrimaryText` - プライマリテキスト色

**背景カラー系:**
- `colorBgBase` - 基本背景色
- `colorBgLayout` - レイアウト背景（全体背景）
- `colorBgContainer` - コンテナ背景（カード、モーダル等）
- `colorBgElevated` - 浮き上がった要素の背景
- `colorBgSpotlight` - スポットライト背景

**テキストカラー系:**
- `colorText` - メインテキスト
- `colorTextSecondary` - 補足テキスト
- `colorTextTertiary` - 三次テキスト
- `colorTextDisabled` - 無効状態テキスト

**状態カラー系:**
- `colorSuccess` / `colorSuccessBg` - 成功
- `colorError` / `colorErrorBg` - エラー
- `colorWarning` / `colorWarningBg` - 警告
- `colorInfo` / `colorInfoBg` - 情報

**ボーダー系:**
- `colorBorder` - 標準ボーダー
- `colorBorderSecondary` - セカンダリボーダー
- `colorSplit` - 分割線

### タイポグラフィトークン

**フォント系:**
- `fontFamily` - フォントファミリー
- `fontSize` - 基本フォントサイズ（14px）
- `fontSizeSM` / `fontSizeLG` / `fontSizeXL` - サイズバリエーション
- `fontSizeHeading1` ～ `fontSizeHeading5` - 見出しサイズ
- `fontWeightStrong` - 強調フォントウェイト

**行の高さ:**
- `lineHeight` - 基本行高
- `lineHeightSM` / `lineHeightLG` - サイズバリエーション
- `lineHeightHeading1` ～ `lineHeightHeading5` - 見出し行高

### スペーシングトークン

**マージン系:**
- `marginXS` / `marginSM` / `margin` / `marginMD` / `marginLG` / `marginXL` / `marginXXL`

**パディング系:**
- `padding` / `paddingSM` / `paddingLG` / `paddingXL`
- `controlPaddingHorizontal` - コントロールの水平パディング

**推奨する`<Space>`コンポーネントのサイズ指定:**
- `size="small"` - 8px
- `size="middle"` - 16px（デフォルト）
- `size="large"` - 24px
- `size={数値}` - カスタム値（8の倍数を推奨）

### ボーダーラジアストークン

- `borderRadius` - 標準（8px）
- `borderRadiusSM` - 小（4px）
- `borderRadiusLG` - 大（12px）
- `borderRadiusXS` - 極小（2px）

### シャドウトークン

- `boxShadow` - 基本シャドウ（カード）
- `boxShadowSecondary` - セカンダリ（ドロップダウン）
- `boxShadowTertiary` - 三次（モーダル）

## コンポーネント使用ガイドライン

### ボタン（Button）

**DO（推奨）:**
```typescript
// ✅ type propsでスタイルを制御
<Button type="primary" size="large">送信</Button>
<Button type="default">キャンセル</Button>
<Button type="text">詳細</Button>
<Button type="link">リンク</Button>

// ✅ danger propsで危険な操作を表現
<Button type="primary" danger>削除</Button>

// ✅ icon propsでアイコン付きボタン
<Button type="primary" icon={<SearchOutlined />}>検索</Button>
```

**DON'T（非推奨）:**
```typescript
// ❌ インラインスタイルで色やサイズを指定
<Button style={{ backgroundColor: '#CF0027', height: '40px' }}>送信</Button>
```

### スペーシング（Space）

**DO（推奨）:**
```typescript
// ✅ Spaceコンポーネントで間隔を制御
<Space size="middle" direction="vertical" style={{ width: '100%' }}>
  <Card>カード1</Card>
  <Card>カード2</Card>
</Space>

// ✅ Flex + gap でレイアウト
<Flex gap="middle" vertical>
  <Card>カード1</Card>
  <Card>カード2</Card>
</Flex>
```

**DON'T（非推奨）:**
```typescript
// ❌ 各要素にmarginを個別指定
<div style={{ marginBottom: '16px' }}>カード1</div>
<div style={{ marginBottom: '16px' }}>カード2</div>
```

### カード（Card）

**DO（推奨）:**
```typescript
// ✅ Cardコンポーネントのpropsを使用
<Card 
  title="タイトル"
  bordered={false}
  size="small"
  hoverable
>
  コンテンツ
</Card>
```

**DON'T（非推奨）:**
```typescript
// ❌ インラインスタイルで背景や影を指定
<Card style={{ 
  background: '#fff',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  borderRadius: '12px'
}}>
  コンテンツ
</Card>
```

### レイアウト（Layout）

**DO（推奨）:**
```typescript
// ✅ theme.useToken()でトークンを取得して使用
import { theme, Layout } from 'antd';

function AppLayout() {
  const { token } = theme.useToken();
  
  return (
    <Layout>
      <Layout.Header style={{ background: token.colorBgContainer }}>
        ヘッダー
      </Layout.Header>
      <Layout.Content style={{ padding: token.paddingLG }}>
        コンテンツ
      </Layout.Content>
    </Layout>
  );
}
```

**DON'T（非推奨）:**
```typescript
// ❌ 具体的な値をハードコーディング
<Layout>
  <Layout.Header style={{ background: '#ffffff' }}>
    ヘッダー
  </Layout.Header>
  <Layout.Content style={{ padding: '24px' }}>
    コンテンツ
  </Layout.Content>
</Layout>
```

### テキスト（Typography）

**DO（推奨）:**
```typescript
// ✅ Typographyコンポーネントを使用
<Typography.Title level={1}>ページタイトル</Typography.Title>
<Typography.Title level={2}>セクションタイトル</Typography.Title>
<Typography.Text type="secondary">補足テキスト</Typography.Text>
<Typography.Text type="danger">エラーメッセージ</Typography.Text>
```

**DON'T（非推奨）:**
```typescript
// ❌ 直接HTMLタグとインラインスタイル
<h1 style={{ fontSize: '38px', color: '#212121' }}>タイトル</h1>
<span style={{ color: '#757575' }}>補足テキスト</span>
```

### フォーム（Form, Input, Select）

**DO（推奨）:**
```typescript
// ✅ Formコンポーネントのサイズpropsを使用
<Form size="large">
  <Form.Item name="username" label="ユーザー名">
    <Input />
  </Form.Item>
  <Form.Item name="role" label="ロール">
    <Select>
      <Select.Option value="admin">管理者</Select.Option>
      <Select.Option value="user">一般ユーザー</Select.Option>
    </Select>
  </Form.Item>
</Form>
```

**DON'T（非推奨）:**
```typescript
// ❌ 各入力要素に個別にスタイルを指定
<Input style={{ height: '40px', fontSize: '16px' }} />
<Select style={{ height: '40px' }} />
```

### リストコンポーネント（Table）

Ant DesignのTableコンポーネントは、データの一覧表示、フィルタリング、ソート、ページングなどの機能を提供します。

#### 基本構造

**DO（推奨）:**
```typescript
import { Table, Input, Select, Space, Row, Col, Badge } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface DataType {
  id: string;
  name: string;
  count: number;
  date: string;
  status: boolean;
}

const columns: ColumnsType<DataType> = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
    align: 'right',  // 数値は右寄せ
    sorter: (a, b) => parseInt(a.id) - parseInt(b.id),
  },
  {
    title: '名前',
    dataIndex: 'name',
    key: 'name',
    width: 200,
    align: 'left',  // テキストは左寄せ（デフォルト）
    sorter: (a, b) => a.name.localeCompare(b.name),
  },
  {
    title: '件数',
    dataIndex: 'count',
    key: 'count',
    width: 100,
    align: 'right',  // 数値は右寄せ
    sorter: (a, b) => a.count - b.count,
  },
  {
    title: '日付',
    dataIndex: 'date',
    key: 'date',
    width: 140,
    align: 'right',  // 日付は右寄せ
    sorter: (a, b) => a.date.localeCompare(b.date),
  },
  {
    title: 'ステータス',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    align: 'center',  // Boolean/バッジは中央寄せ
    render: (status: boolean) => (
      <Badge 
        status={status ? 'success' : 'default'} 
        text={status ? '有効' : '無効'} 
      />
    ),
  },
];

function DataList() {
  return (
    <>
      {/* フィルタリング部分（左寄せ） */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex="400px">
          <Input
            placeholder="検索"
            prefix={<SearchOutlined />}
            allowClear
          />
        </Col>
        <Col flex="150px">
          <Select
            placeholder="カテゴリー"
            allowClear
            style={{ width: '100%' }}
          />
        </Col>
        <Col flex="150px">
          <Select
            placeholder="ステータス"
            allowClear
            style={{ width: '100%' }}
          />
        </Col>
      </Row>

      {/* テーブル */}
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        scroll={{ x: 1200 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `全 ${total} 件`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
      />
    </>
  );
}
```

#### フィルタリング機能

**配置:** リスト上部に左寄せで配置

**DO（推奨）:**
```typescript
// ✅ Row/Colを使用したレスポンシブなフィルタリングエリア
<Row gutter={16} style={{ marginBottom: 16 }}>
  {/* 全体検索 */}
  <Col flex="400px">
    <Input
      placeholder="ID、名前、説明で検索"
      prefix={<SearchOutlined />}
      value={searchText}
      onChange={(e) => setSearchText(e.target.value)}
      allowClear
    />
  </Col>
  
  {/* カテゴリーフィルター */}
  <Col flex="150px">
    <Select
      placeholder="カテゴリー"
      value={selectedCategory || undefined}
      onChange={setSelectedCategory}
      allowClear
      style={{ width: '100%' }}
      options={categories.map(cat => ({ label: cat, value: cat }))}
    />
  </Col>
  
  {/* ステータスフィルター */}
  <Col flex="150px">
    <Select
      placeholder="ステータス"
      value={selectedStatus || undefined}
      onChange={setSelectedStatus}
      allowClear
      style={{ width: '100%' }}
    />
  </Col>
</Row>
```

**DON'T（非推奨）:**
```typescript
// ❌ 具体的な値をハードコーディング
<Layout>
  <Layout.Header style={{ background: '#ffffff' }}>
    ヘッダー
  </Layout.Header>
  <Layout.Content style={{ padding: '24px' }}>
    コンテンツ
  </Layout.Content>
</Layout>
```

### テキスト（Typography）

**DO（推奨）:**
```typescript
// ✅ Typographyコンポーネントを使用
<Typography.Title level={1}>ページタイトル</Typography.Title>
<Typography.Title level={2}>セクションタイトル</Typography.Title>
<Typography.Text type="secondary">補足テキスト</Typography.Text>
<Typography.Text type="danger">エラーメッセージ</Typography.Text>
```

**DON'T（非推奨）:**
```typescript
// ❌ 直接HTMLタグとインラインスタイル
<h1 style={{ fontSize: '38px', color: '#212121' }}>タイトル</h1>
<span style={{ color: '#757575' }}>補足テキスト</span>
```

### フォーム（Form, Input, Select）

**DO（推奨）:**
```typescript
// ✅ サイズpropsを使用
=======
// ❌ 固定幅でレスポンシブ対応していない
<div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
  <Input style={{ width: '400px' }} />
  <Select style={{ width: '150px' }} />
</div>
```

#### ソート機能

**DO（推奨）:**
```typescript
// ✅ sorterプロパティでソート機能を有効化
const columns: ColumnsType<DataType> = [
  {
    title: 'ID',
    dataIndex: 'id',
    sorter: (a, b) => parseInt(a.id) - parseInt(b.id),  // 数値ソート
  },
  {
    title: '名前',
    dataIndex: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name),  // 文字列ソート（日本語対応）
  },
  {
    title: '日付',
    dataIndex: 'date',
    sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),  // 日付ソート
  },
];
```

#### 列の配置（align）

**配置ルール:**
- **基本は左寄せ** (`align: 'left'` またはデフォルト)
- **数値は右寄せ** (`align: 'right'`)
- **日付は右寄せ** (`align: 'right'`)
- **バッジ表示は中央寄せ** (`align: 'center'`)
- **Boolean値（True/False）やステータス表示は中央寄せ** (`align: 'center'`)

**DO（推奨）:**
```typescript
const columns: ColumnsType<DataType> = [
  {
    title: 'ID',
    dataIndex: 'id',
    align: 'right',  // ✅ 数値は右寄せ
  },
  {
    title: 'ユーザー名',
    dataIndex: 'username',
    align: 'left',  // ✅ テキストは左寄せ（デフォルトなので省略可）
  },
  {
    title: '件数',
    dataIndex: 'count',
    align: 'right',  // ✅ 数値は右寄せ
  },
  {
    title: '更新日時',
    dataIndex: 'updatedAt',
    align: 'right',  // ✅ 日付は右寄せ
  },
  {
    title: 'アクティブ',
    dataIndex: 'isActive',
    align: 'center',  // ✅ Boolean値は中央寄せ
    render: (isActive: boolean) => (
      <Badge status={isActive ? 'success' : 'default'} text={isActive ? '有効' : '無効'} />
    ),
  },
  {
    title: 'ステータス',
    dataIndex: 'status',
    align: 'center',  // ✅ バッジは中央寄せ
    render: (status: string) => <Badge color="blue" text={status} />,
  },
];
```

**DON'T（非推奨）:**
```typescript
// ❌ 配置が不適切
const columns: ColumnsType<DataType> = [
  {
    title: 'ID',
    dataIndex: 'id',
    align: 'left',  // ❌ 数値なのに左寄せ
  },
  {
    title: 'ステータス',
    dataIndex: 'status',
    align: 'left',  // ❌ バッジなのに左寄せ
  },
];
```

#### ページング機能

**DO（推奨）:**
```typescript
// ✅ paginationプロパティで制御
<Table
  dataSource={data}
  columns={columns}
  pagination={{
    pageSize: 10,  // 1ページあたりの表示件数
    showSizeChanger: true,  // ページサイズ変更を有効化
    showTotal: (total) => `全 ${total} 件`,  // 総件数表示
    pageSizeOptions: ['10', '20', '50', '100'],  // ページサイズの選択肢
  }}
/>
```

**ページサイズの推奨値:**
- デフォルト: `10`
- 選択肢: `['10', '20', '50', '100']`

**DON'T（非推奨）:**
```typescript
// ❌ ページング機能を無効化（大量データの場合）
<Table
  dataSource={largeData}
  pagination={false}  // ❌ 大量データでページングなしは避ける
/>
```

#### 行選択機能

**DO（推奨）:**
```typescript
// ✅ rowSelectionでチェックボックスを表示
const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

const rowSelection = {
  selectedRowKeys,
  onChange: (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  },
};

<Table
  rowSelection={rowSelection}
  columns={columns}
  dataSource={data}
  rowKey="id"  // ✅ 一意のキーを指定（必須）
/>
```

#### スクロール設定

**DO（推奨）:**
```typescript
// ✅ 横スクロールを設定（カラムが多い場合）
<Table
  columns={columns}
  dataSource={data}
  scroll={{ x: 1200 }}  // ✅ 最小幅を指定
/>

// ✅ 縦スクロールも設定可能（固定ヘッダー）
<Table
  columns={columns}
  dataSource={data}
  scroll={{ x: 1200, y: 600 }}
/>
```

#### カラム幅の指定

**DO（推奨）:**
```typescript
// ✅ widthプロパティでカラム幅を明示
const columns: ColumnsType<DataType> = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 80,  // ✅ 固定幅（数値・短いテキスト）
  },
  {
    title: '名前',
    dataIndex: 'name',
    width: 200,  // ✅ 適度な幅（通常のテキスト）
  },
  {
    title: '説明',
    dataIndex: 'description',
    // width指定なし - 残りの幅を自動調整
  },
  {
    title: 'アクション',
    key: 'action',
    width: 150,
    fixed: 'right',  // ✅ 右端に固定
  },
];
```

#### カスタムレンダリング

**DO（推奨）:**
```typescript
// ✅ renderプロパティでカスタム表示
const columns: ColumnsType<DataType> = [
  {
    title: 'ステータス',
    dataIndex: 'isActive',
    align: 'center',
    render: (isActive: boolean) => (
      <Badge 
        status={isActive ? 'success' : 'default'} 
        text={isActive ? '有効' : '無効'} 
      />
    ),
  },
  {
    title: 'アクション',
    key: 'action',
    align: 'center',
    render: (_, record) => (
      <Space size="small">
        <Button icon={<EditOutlined />} onClick={() => handleEdit(record)}>
          編集
        </Button>
        <Button danger onClick={() => handleDelete(record.id)}>
          削除
        </Button>
      </Space>
    ),
  },
];
```

#### タイトルのカスタマイズ

**DO（推奨）:**
```typescript
// ✅ タイトルにバッジやアイコンを追加
const columns: ColumnsType<DataType> = [
  {
    title: (
      <Space size="middle" align="center">
        <span>ID</span>
        <Badge 
          count={inactiveCount} 
          style={{ backgroundColor: '#4169E1' }} 
        />
      </Space>
    ),
    dataIndex: 'id',
  },
];
```

#### ローディング状態

**DO（推奨）:**
```typescript
// ✅ loadingプロパティで読み込み中を表示
<Table
  columns={columns}
  dataSource={data}
  loading={isLoading}  // ✅ スピナーを自動表示
/>
```

#### 空データの表示

**DO（推奨）:**
```typescript
// ✅ localeプロパティでカスタムメッセージ
<Table
  columns={columns}
  dataSource={data}
  locale={{
    emptyText: 'データがありません',
  }}
/>
```

## レイアウト原則

### グリッドシステム（Grid / Row / Col）

Ant Designの24カラムグリッドシステムを使用します。

```typescript
// Gutterの設定
gutter: 16  // デフォルトの間隔
```

**ブレークポイント:**
```typescript
screen: {
  xs: 480,    // モバイル
  sm: 576,    // タブレット（縦）
  md: 768,    // タブレット（横）
  lg: 992,    // 小型ラップトップ
  xl: 1200,   // デスクトップ
  xxl: 1600   // 大型ディスプレイ
}
```

### レスポンシブデザイン

#### Col のレスポンシブプロパティ
```typescript
<Col xs={24} sm={12} md={8} lg={6} xl={4}>
  {/* コンテンツ */}
</Col>
```

#### モバイル（xs, sm）
- シングルカラムレイアウト（span={24}）
- フルスクリーンモーダル
- Drawer を使用したサイドナビゲーション
- タッチターゲット最小サイズ: `44px x 44px`

#### タブレット（md）
- 2カラムレイアウト（span={12}）
- サイドバー折りたたみ可能
- モーダル幅: 最大 `600px`

#### デスクトップ（lg, xl, xxl）
- 3-4カラムレイアウト可能（span={8} or span={6}）
- 固定サイドバー
- モーダル幅: 最大 `900px`

## アクセシビリティ

Ant Designは標準でアクセシビリティに対応していますが、以下の点に注意してください。

### コントラスト比
- 通常テキスト: 最低 4.5:1
- 大きなテキスト（18px以上）: 最低 3:1
- UI要素（ボタン、アイコン等）: 最低 3:1

### フォーカス表示
- Ant Designが自動的にフォーカススタイルを適用
- フォーカスアウトライン色: `colorPrimary`
- アウトライン幅: `2px`

### キーボード操作
- Tab順序の論理的な流れ
- Enterキーでボタン実行
- Escapeキーでモーダル閉じる
- 矢印キーでメニュー/リスト操作
- Space キーでチェックボックス/ラジオボタン切り替え

### スクリーンリーダー対応
- Ant Designコンポーネントは標準でARIA属性をサポート
- 追加のARIAラベルが必要な場合は適宜追加
- フォーム要素は自動的にラベル関連付け

## アニメーション・トランジション

### motion設定
```typescript
motion: true  // アニメーションを有効化（デフォルト）
```

### トランジション時間
```typescript
motionDurationFast: '0.1s',    // 100ms - 簡単な状態変化
motionDurationMid: '0.2s',     // 200ms - 標準
motionDurationSlow: '0.3s'     // 300ms - 複雑な遷移
```

### イージング関数
```typescript
motionEaseInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
motionEaseOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
motionEaseIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
motionEaseInBack: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
motionEaseOutBack: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
motionEaseInCirc: 'cubic-bezier(0.6, 0.04, 0.98, 0.335)',
motionEaseOutCirc: 'cubic-bezier(0.075, 0.82, 0.165, 1)'
```

### アニメーション対象
- ホバー状態: `0.2s ease-out`
- ボタン押下: `0.1s ease-in`
- モーダル表示/非表示: `0.3s ease-in-out`
- ドロップダウン: `0.2s ease-out`
- ページ遷移: `0.3s ease-in-out`

## アイコン

### アイコンライブラリ

#### @ant-design/icons（推奨）
```typescript
import { UserOutlined, HomeOutlined, SettingFilled } from '@ant-design/icons';
```
- Ant Design公式アイコンセット
- Outlined（線）、Filled（塗りつぶし）、TwoTone（2色）の3スタイル
- サイズ: デフォルト `14px`、`style={{ fontSize: 16 }}`でカスタマイズ可能

#### Lucide React（補助的に使用可）
```typescript
import { Settings, User } from 'lucide-react';
```
- 軽量でモダンなアイコンセット
- サイズ: `16px`（small）、`20px`（medium）、`24px`（large）
- 色: `currentColor`（親要素のテキスト色を継承）

### アイコン使用ガイドライン
- ボタン内のアイコン: `<Button icon={<UserOutlined />}>`
- テキストとの間隔: `Space` コンポーネントで `8px`
- アイコンのみのボタン: `<Button icon={<UserOutlined />} shape="circle" />`
- 装飾的アイコン: `aria-hidden="true"`

## 多言語化（i18n）

### 概要

MaiML Viewerは、テナント（組織）ごとに言語を切り替えられる多言語化システムを実装しています。

### Ant Designのローカライゼーション

```typescript
import { ConfigProvider } from 'antd';
import jaJP from 'antd/locale/ja_JP';
import enUS from 'antd/locale/en_US';

<ConfigProvider locale={locale === 'ja' ? jaJP : enUS}>
  {/* アプリケーション */}
</ConfigProvider>
```

### ディレクトリ構造

```
frontend/src/
├── locales/                    # 言語ファイル
│   ├── ja.json                 # 日本語
│   └── en.json                 # 英語
└── contexts/
    └── LanguageContext.tsx     # 言語コンテキスト
```

### 言語ファイル形式

```json
{
  "common

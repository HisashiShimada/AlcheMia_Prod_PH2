# テーブル形状ポリシー

## 標準3パターン

### パターン1: シンプル一覧テーブル
**用途**: ファイル一覧、フォルダ一覧、シンプルなデータ表示

- サイズ: `size="small"`
- ページネーション: `pagination={false}` または `pagination={{ pageSize: 10 }}`
- ボーダー: `bordered={false}`（デフォルト）
- 行の高さ: 約40px
- セル内パディング: 上下8px、左右8px
- ヘッダー背景色: `token.colorFillAlter` (#fafafa)
- ホバー背景色: `token.colorBgTextHover` (#f5f5f5)
- スクロール: 不要（データ件数が少ない場合）

**特徴:**
- コンパクトで読みやすい
- 少量データ（50件以内）向け
- アクションボタンは最小限（1-2個）
- 行クリック可能

**例:**
```tsx
<Table
  dataSource={files}
  columns={columns}
  rowKey="id"
  size="small"
  pagination={false}
  onRow={(record) => ({
    onClick: () => handleRowClick(record),
    style: { cursor: 'pointer' }
  })}
/>
```

---

### パターン2: データ管理テーブル
**用途**: タスク管理、ユーザー管理、実験記録など大量データ

- サイズ: `size="middle"`
- ページネーション: 必須
  ```tsx
  pagination={{
    pageSize: 20,
    showSizeChanger: true,
    showQuickJumper: false,
    showTotal: (total) => `全${total}件`,
    pageSizeOptions: ['10', '20', '50', '100'],
    position: ['bottomRight'],
    locale: {
      items_per_page: '件/ページ'
    }
  }}
  ```
- ボーダー: `bordered={true}`
- 行の高さ: 約48px
- セル内パディング: 上下12px、左右16px
- ヘッダー背景色: `token.colorFillAlter` (#fafafa)
- ホバー背景色: `token.colorBgTextHover` (#f5f5f5)
- スクロール: `scroll={{ x: 1200 }}` または適切な横幅
- 絞り込みUI: テーブル上部に配置（検索、Select）

**特徴:**
- 大量データに対応（100件以上）
- 絞り込み・検索機能付き
- 複数の操作ボタン列
- ソート・フィルター可能

**例:**
```tsx
<>
  {/* 絞り込みUI */}
  <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
    <Col xs={24} sm={12} md={8}>
      <Input
        placeholder="検索..."
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        allowClear
      />
    </Col>
    <Col xs={24} sm={12} md={8}>
      <Select
        placeholder="ステータス"
        style={{ width: '100%' }}
        value={selectedStatus}
        onChange={setSelectedStatus}
        allowClear
      />
    </Col>
  </Row>

  {/* テーブル */}
  <Table
    columns={columns}
    dataSource={filteredData}
    rowKey="id"
    size="middle"
    bordered
    pagination={{
      pageSize: 20,
      showSizeChanger: true,
      showTotal: (total) => `全${total}件`,
      pageSizeOptions: ['10', '20', '50', '100']
    }}
    scroll={{ x: 1200 }}
  />
</>
```

---

### パターン3: 詳細情報テーブル
**用途**: フォーマットファイル一覧、2行表示が必要な詳細データ

- サイズ: `size="small"`
- ページネーション: `pagination={false}` または `pagination={{ pageSize: 20 }}`
- ボーダー: `bordered={false}`（デフォルト）
- 行の高さ: 約60-80px（2行分）
- セル内パディング: 上下8px、左右8px
- ヘッダー背景色: `token.colorFillAlter` (#fafafa)
- ホバー背景色: `token.colorBgTextHover` (#f5f5f5)
- スクロール: 不要（データ件数が少ない場合）

**特徴:**
- メイン情報とサブ情報の2行表示
- 説明文や補足情報を表示
- コンパクトながら情報量が多い
- 行クリック可能

**例:**
```tsx
<Table
  dataSource={files}
  columns={[
    {
      title: 'ファイル名',
      dataIndex: 'name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          {record.description && (
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                {record.description}
              </Text>
            </div>
          )}
        </div>
      )
    }
  ]}
  rowKey="id"
  size="small"
  pagination={false}
  onRow={(record) => ({
    onClick: () => handleRowClick(record),
    style: { cursor: 'pointer' }
  })}
/>
```

---

## 共通仕様（全パターン）

### 色定義

**ヘッダー**
- 背景色: `token.colorFillAlter` (#fafafa)
- テキスト色: `token.colorText` (#212121)
- フォントウェイト: `token.fontWeightStrong` (600)

**行（通常）**
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorText` (#212121)

**行（ホバー）**
- 背景色: `token.colorBgTextHover` (#f5f5f5)

**行（選択時）**
- 背景色: `token.colorPrimaryBg` (#FFF1F3)

**ボーダー**
- 色: `token.colorBorder` (rgba(0,0,0,0.12))
- 太さ: 1px

### テキストスタイル

**標準テキスト**
- フォントサイズ: `token.fontSize` (14px)
- 行の高さ: `token.lineHeight` (1.5715)
- 色: `token.colorText` (#212121)

**セカンダリテキスト（補足情報）**
- フォントサイズ: `token.fontSizeSM` (12px)
- 色: `token.colorTextSecondary` (#757575)

**強調テキスト（重要データ）**
- フォントウェイト: `token.fontWeightStrong` (600)
- 色: `token.colorPrimary` (#CF0027) または `token.colorInfo` (#0093CF)

### アイコン

**サイズ**
- 標準: `token.fontSizeLG` (16px)
- 小: `token.fontSize` (14px)

**色**
- フォルダ: `token.colorWarning` (#ed6c02)
- ファイル（MAIML/PDF）: `token.colorInfo` (#0093CF)
- ファイル（Excel/CSV）: `token.colorSuccess` (#2e7d32)
- ファイル（その他）: `token.colorTextSecondary` (#757575)

### 列幅ガイドライン

| 列の種類 | 推奨幅 | 説明 |
|---------|--------|------|
| アイコン | 50px | タイプ識別用アイコン |
| チェックボックス | 40-50px | 選択用 |
| ステータスバッジ | 80-100px | Tag表示 |
| ID/番号 | 80-100px | 数値・短いID |
| 名前/タイトル | 200-300px | メインテキスト、ellipsis必須 |
| 日付 | 120-150px | formatRelativeTime使用 |
| サイズ | 100-120px | formatFileSize使用 |
| 操作ボタン（1個） | 80-100px | ボタン1つ |
| 操作ボタン（2個） | 200-220px | ボタン2つ + Space |
| 操作ボタン（3個以上） | 280-320px | ボタン3つ以上 + Space |

### ページネーション

**パターン1（シンプル一覧）**
```tsx
pagination={false}  // または
pagination={{ pageSize: 10, simple: true }}
```

**パターン2（データ管理）**
```tsx
pagination={{
  pageSize: 20,
  showSizeChanger: true,
  showQuickJumper: false,
  showTotal: (total, range) => `全${total}件`,
  pageSizeOptions: ['10', '20', '50', '100'],
  position: ['bottomRight'],
  locale: {
    items_per_page: '件/ページ',
    jump_to: 'ページ',
    page: ''
  }
}}
```

**パターン3（詳細情報）**
```tsx
pagination={false}  // または
pagination={{ pageSize: 20 }}
```

### ソート

```tsx
{
  title: 'ファイル名',
  dataIndex: 'name',
  sorter: (a, b) => a.name.localeCompare(b.name, 'ja'),  // 日本語対応
}

{
  title: 'サイズ',
  dataIndex: 'size',
  sorter: (a, b) => a.size - b.size,  // 数値
}

{
  title: '更新日',
  dataIndex: 'lastModified',
  sorter: (a, b) => new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime(),
}
```

### Empty状態

```tsx
locale={{
  emptyText: (
    <Empty
      description="データがありません"
      image={Empty.PRESENTED_IMAGE_SIMPLE}
    />
  )
}}
```

### レスポンシブ対応

**スクロール設定**
```tsx
scroll={{ x: 1200 }}  // 横スクロール有効（パターン2）
scroll={{ x: 'max-content' }}  // 自動調整
```

**列の表示制御（responsive）**
```tsx
{
  title: '詳細情報',
  dataIndex: 'details',
  responsive: ['md'],  // md以上でのみ表示
}
```

---

## パターン選択ガイド

| 用途 | 推奨パターン | 理由 |
|-----|-------------|------|
| ファイル一覧（50件以内） | パターン1 | コンパクトで十分 |
| フォルダ構造表示 | パターン1 | シンプルな階層表示 |
| タスク管理（100件以上） | パターン2 | 絞り込み・ページング必須 |
| ユーザー管理 | パターン2 | 大量データ + 複数操作 |
| 実験記録一覧 | パターン2 | 検索・フィルター必要 |
| フォーマットファイル | パターン3 | 説明文表示が必要 |
| プロジェクト一覧（詳細付き） | パターン3 | 補足情報が重要 |

---

## 操作ボタンの配置

### 1個ボタン
```tsx
<Button type="primary" size="small" icon={<EyeOutlined />}>
  ビューア
</Button>
```

### 2個ボタン
```tsx
<Space size="small">
  <Button type="default" size="small" icon={<DownloadOutlined />}>
    ダウンロード
  </Button>
  <Button type="primary" size="small" icon={<EyeOutlined />}>
    ビューア
  </Button>
</Space>
```

### 3個以上ボタン
```tsx
<Space size="small">
  <Button type="primary" size="small" icon={<EditOutlined />}>
    編集
  </Button>
  <Button type="default" size="small" icon={<DownloadOutlined />}>
    ダウンロード
  </Button>
  <Button type="default" danger size="small" icon={<DeleteOutlined />}>
    削除
  </Button>
</Space>
```

### ドロップダウンメニュー（4個以上の操作）
```tsx
<Dropdown
  menu={{
    items: [
      { key: 'edit', label: '編集', icon: <EditOutlined /> },
      { key: 'download', label: 'ダウンロード', icon: <DownloadOutlined /> },
      { key: 'copy', label: '複製', icon: <CopyOutlined /> },
      { type: 'divider' },
      { key: 'delete', label: '削除', icon: <DeleteOutlined />, danger: true }
    ]
  }}
  trigger={['click']}
>
  <Button size="small" icon={<MoreOutlined />} />
</Dropdown>
```

---

## 絞り込みUI

### 検索 + Select（2カラム）
```tsx
<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
  <Col xs={24} sm={12}>
    <Input
      placeholder="検索..."
      prefix={<SearchOutlined />}
      value={searchText}
      onChange={(e) => setSearchText(e.target.value)}
      allowClear
      style={{ width: '100%' }}
    />
  </Col>
  <Col xs={24} sm={12}>
    <Select
      placeholder="ステータス"
      style={{ width: '100%' }}
      value={selectedStatus}
      onChange={setSelectedStatus}
      allowClear
    />
  </Col>
</Row>
```

### 検索 + 複数Select（3カラム）
```tsx
<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
  <Col xs={24} sm={12} md={8}>
    <Input
      placeholder="全カラム検索..."
      prefix={<SearchOutlined />}
      value={searchText}
      onChange={(e) => setSearchText(e.target.value)}
      allowClear
    />
  </Col>
  <Col xs={24} sm={12} md={8}>
    <Select
      placeholder="カテゴリ"
      style={{ width: '100%' }}
      value={selectedCategory}
      onChange={setSelectedCategory}
      allowClear
    />
  </Col>
  <Col xs={24} sm={12} md={8}>
    <Select
      placeholder="ステータス"
      style={{ width: '100%' }}
      value={selectedStatus}
      onChange={setSelectedStatus}
      allowClear
    />
  </Col>
</Row>
```

---

## アクセシビリティ

### ARIA属性
```tsx
<Table
  aria-label="ファイル一覧"
  aria-describedby="file-list-description"
/>

<Button aria-label="ファイルをダウンロード">
  <DownloadOutlined />
</Button>
```

### キーボード操作
- **Tab**: 次のセル/ボタンへ移動
- **Enter**: 行クリック（onRow設定時）
- **Space**: チェックボックス選択

### rowClassName（縞模様）
```tsx
rowClassName={(_, index) => 
  index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
}
```

---

## ベストプラクティス

### DO（推奨）
✅ 適切なsizeを選択する（small/middle）
✅ 大量データにはページネーションを必須にする
✅ 列幅を明示的に指定する（width）
✅ 長いテキストにはellipsis + Tooltipを使う
✅ sorterで日本語対応する（localeCompare）
✅ 操作ボタンはSpaceで間隔を統一する
✅ レスポンシブ対応（responsive列、scroll設定）
✅ Empty状態を適切に表示する
✅ ARIA属性を付与する

### DON'T（非推奨）
❌ 全列に自動幅（width未指定）を使わない
❌ 100件以上のデータでpagination=falseにしない
❌ 操作ボタンを4個以上直接配置しない
❌ 絞り込みUIなしで大量データを表示しない
❌ 横スクロールなしで多数の列を詰め込まない
❌ rowKeyを指定し忘れない
❌ ソート関数で日本語を考慮しない

---

## カスタムスタイリング

### グローバルスタイル
```css
.ant-table {
  background: #ffffff;
  border-radius: 8px;
}

.ant-table-thead > tr > th {
  background: #fafafa;
  font-weight: 600;
  color: #212121;
}

.ant-table-tbody > tr:hover > td {
  background: #f5f5f5;
}

.ant-table-tbody > tr.ant-table-row-selected > td {
  background: #FFF1F3;
}

/* 縞模様（オプション） */
.table-row-light {
  background: #ffffff;
}

.table-row-dark {
  background: #fafafa;
}
```

### インラインスタイル
```tsx
<Table
  style={{
    background: '#ffffff',
    borderRadius: '8px'
  }}
  className="custom-table"
/>
```

---

## 実装チェックリスト

### 必須項目
- [ ] rowKeyを指定している
- [ ] 適切なsizeを選択している
- [ ] 列幅（width）を指定している
- [ ] ソート機能で日本語対応している
- [ ] Empty状態を設定している
- [ ] レスポンシブ対応している（scroll設定）

### 推奨項目
- [ ] ページネーション設定（大量データの場合）
- [ ] 絞り込みUI（検索・Select）
- [ ] 操作ボタンのSpace配置
- [ ] Tooltip + ellipsis（長いテキスト）
- [ ] ARIA属性の付与
- [ ] ホバー時のカーソル変更（clickable行）

### オプション項目
- [ ] 縞模様（rowClassName）
- [ ] カスタムスタイリング
- [ ] ドロップダウンメニュー（多数の操作）
- [ ] レスポンシブ列制御（responsive）

---

## 参考実装

### パターン1の完全実装例
```tsx
import { Table, Empty, Tooltip, Button, Space, theme } from 'antd';
import { FileOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';

interface FileData {
  id: string;
  name: string;
  size: number;
  lastModified: string;
}

export default function SimpleFileTable({ files }: { files: FileData[] }) {
  const { token } = theme.useToken();

  const columns = [
    {
      title: 'タイプ',
      key: 'type',
      width: 50,
      align: 'center' as const,
      render: () => <FileOutlined style={{ fontSize: token.fontSizeLG }} />
    },
    {
      title: 'ファイル名',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name, 'ja'),
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      )
    },
    {
      title: 'サイズ',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      sorter: (a, b) => a.size - b.size,
      render: (size: number) => formatFileSize(size)
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      align: 'center' as const,
      render: (_, record) => (
        <Space size="small">
          <Button type="default" size="small" icon={<DownloadOutlined />}>
            ダウンロード
          </Button>
          <Button type="primary" size="small" icon={<EyeOutlined />}>
            ビューア
          </Button>
        </Space>
      )
    }
  ];

  return (
    <Table
      dataSource={files}
      columns={columns}
      rowKey="id"
      size="small"
      pagination={false}
      locale={{
        emptyText: <Empty description="ファイルがありません" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      }}
    />
  );
}
```

### パターン2の完全実装例
```tsx
import { Table, Input, Select, Row, Col, Space, Button, Tag } from 'antd';
import { SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';

interface TaskData {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignee: string;
  dueDate: string;
}

export default function DataManagementTable({ tasks }: { tasks: TaskData[] }) {
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = !searchText || 
        task.name.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = !selectedStatus || task.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchText, selectedStatus]);

  const columns = [
    {
      title: 'タスク名',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name, 'ja')
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'green' : 'blue'}>
          {status}
        </Tag>
      )
    },
    {
      title: '担当者',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 120
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      align: 'center' as const,
      render: () => (
        <Space size="small">
          <Button type="primary" size="small" icon={<EditOutlined />}>
            編集
          </Button>
          <Button type="default" danger size="small" icon={<DeleteOutlined />}>
            削除
          </Button>
        </Space>
      )
    }
  ];

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Input
            placeholder="タスク名で検索..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Select
            placeholder="ステータス"
            style={{ width: '100%' }}
            value={selectedStatus}
            onChange={setSelectedStatus}
            allowClear
            options={[
              { label: '保留中', value: 'pending' },
              { label: '進行中', value: 'in_progress' },
              { label: '完了', value: 'completed' }
            ]}
          />
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={filteredTasks}
        rowKey="id"
        size="middle"
        bordered
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `全${total}件`,
          pageSizeOptions: ['10', '20', '50', '100']
        }}
        scroll={{ x: 1200 }}
      />
    </>
  );
}

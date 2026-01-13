# データテーブル表示形状ポリシー

## 標準3パターン

### パターン1: シンプルデータ表示
**用途**: ファイル一覧、フォルダ一覧、小規模データ表示

- サイズ: `size="small"`
- 行の高さ: 約40px
- セル内パディング: 上下8px、左右8px
- ページネーション: `pagination={false}` または `pagination={{ pageSize: 10, simple: true }}`
- ボーダー: `bordered={false}`（デフォルト）
- スクロール: 不要（データ件数50件以内）
- データ件数: **50件以内**
- 操作ボタン: 最小限（1-2個）
- 行クリック: 可能（cursor: pointer）

**特徴:**
- コンパクトで読みやすい
- 少量データに最適
- シンプルなレイアウト
- 高速なレンダリング

---

### パターン2: データ管理表示
**用途**: ユーザー管理、タスク管理、実験記録など大量データ

- サイズ: `size="middle"`
- 行の高さ: 約48px
- セル内パディング: 上下12px、左右16px
- ページネーション: 必須
  ```tsx
  pagination={{
    pageSize: 20,
    showSizeChanger: true,
    showQuickJumper: false,
    showTotal: (total) => `全${total}件`,
    pageSizeOptions: ['10', '20', '50', '100'],
    position: ['bottomRight']
  }}
  ```
- ボーダー: `bordered={true}`
- スクロール: `scroll={{ x: 1200 }}` 必須
- データ件数: **100件以上**
- 絞り込みUI: テーブル上部に配置（検索Input + Select）
- 操作ボタン: 複数可能（2-3個）
- ソート・フィルター: 有効

**特徴:**
- 大量データに対応
- 高度な検索・絞り込み機能
- ページネーション必須
- レスポンシブ対応

---

### パターン3: 詳細データ表示
**用途**: プロジェクト一覧、フォーマットファイル一覧、2行表示が必要なデータ

- サイズ: `size="small"`
- 行の高さ: 約60-80px（2行分）
- セル内パディング: 上下8px、左右8px
- ページネーション: `pagination={false}` または `pagination={{ pageSize: 20 }}`
- ボーダー: `bordered={false}`（デフォルト）
- スクロール: 不要（データ件数50件以内）
- データ件数: **50件以内**
- 2行構成: メイン情報（1行目、14px）+ サブ情報（2行目、12px）
- 操作ボタン: 最小限（1-2個）
- 行クリック: 可能（cursor: pointer）

**特徴:**
- メイン情報とサブ情報の2行表示
- 説明文や補足情報を表示
- コンパクトながら情報量が多い
- 視認性が高い

---

## 共通仕様（全パターン）

### 色定義

**ヘッダー**
- 背景色: `token.colorFillAlter` (#fafafa)
- テキスト色: `token.colorText` (#212121)
- フォントウェイト: `token.fontWeightStrong` (600)
- フォントサイズ: `token.fontSize` (14px)

**行（通常）**
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorText` (#212121)

**行（ホバー）**
- 背景色: `token.colorBgTextHover` (#f5f5f5)
- カーソル: `pointer`（行クリック可能な場合）

**行（選択時）**
- 背景色: `token.colorPrimaryBg` (#FFF1F3)
- ボーダー: なし

**ボーダー**
- 色: `token.colorBorder` (rgba(0,0,0,0.12))
- 太さ: 1px

### テキストスタイル

**メインテキスト**
- フォントサイズ: `token.fontSize` (14px)
- 行の高さ: `token.lineHeight` (1.5715)
- 色: `token.colorText` (#212121)
- フォントウェイト: 400（通常）または 600（強調）

**サブテキスト（補足情報）**
- フォントサイズ: `token.fontSizeSM` (12px)
- 行の高さ: 1.5
- 色: `token.colorTextSecondary` (#757575)
- フォントウェイト: 400
- マージン上: 4px

**数値データ**
- フォントサイズ: `token.fontSize` (14px)
- 色: `token.colorText` (#212121)
- 配置: 右揃え（align: 'right'）

**日付データ**
- フォントサイズ: `token.fontSize` (14px)
- 色: `token.colorTextSecondary` (#757575)
- フォーマット: `formatRelativeTime()` 使用

### アイコン

**サイズ**
- 標準: `token.fontSizeLG` (16px)
- 小: `token.fontSize` (14px)

**色（ファイルタイプ）**
- フォルダ: `token.colorWarning` (#ed6c02)
- MAIML/PDF: `token.colorInfo` (#0093CF)
- Excel/CSV: `token.colorSuccess` (#2e7d32)
- その他: `token.colorTextSecondary` (#757575)

**色（ステータス）**
- 完了: `token.colorSuccess` (#2e7d32)
- 進行中: `token.colorInfo` (#0093CF)
- 保留中: `token.colorWarning` (#ed6c02)
- エラー: `token.colorError` (#d32f2f)

### 列幅ガイドライン

| 列の種類 | 推奨幅 | 説明 |
|---------|--------|------|
| チェックボックス | 40-50px | rowSelection使用時 |
| アイコン | 50px | タイプ識別用 |
| ID/番号 | 80-100px | 数値・短いID |
| ステータス | 80-100px | Tag表示 |
| 名前/タイトル | 200-300px | ellipsis必須 |
| 説明文 | 300-400px | ellipsis + Tooltip |
| 日付 | 120-150px | formatRelativeTime |
| サイズ | 100-120px | formatFileSize |
| 操作（1個） | 80-100px | ボタン1つ |
| 操作（2個） | 200-220px | Space + ボタン2つ |
| 操作（3個以上） | 280-320px | Space + ボタン3つ以上 |

---

## パターン選択

- ファイル一覧（50件以内） → **パターン1（シンプルデータ表示）**
- フォルダ構造表示 → **パターン1（シンプルデータ表示）**
- ユーザー管理（100件以上） → **パターン2（データ管理表示）**
- タスク管理（100件以上） → **パターン2（データ管理表示）**
- 実験記録一覧 → **パターン2（データ管理表示）**
- プロジェクト一覧（詳細付き） → **パターン3（詳細データ表示）**
- フォーマットファイル一覧 → **パターン3（詳細データ表示）**

---

## 除外されたパターンと標準パターンの対応

以下のパターンは標準3パターンから除外されていますが、基本的には標準パターンの変種として扱います。

### カード型データ表示
- **対応する標準パターン**: パターン3（詳細データ表示）の変種
- **除外理由**: モバイル専用レイアウトのため
- **用途**: スマートフォン・タブレットでの表示
- **形状**: Cardコンポーネントを使用したリスト表示
- **データ件数**: 50件以内

### 編集可能テーブル
- **対応する標準パターン**: パターン2（データ管理表示）の変種
- **除外理由**: 使用頻度が低く、特殊用途のため
- **用途**: インライン編集が必要なデータ
- **形状**: パターン2とほぼ同じ
- **差異**: 各セルがInput/Selectになる

### ツリーテーブル
- **対応する標準パターン**: パターン1（シンプルデータ表示）の変種
- **除外理由**: 階層データ専用のため
- **用途**: フォルダ構造、組織図などの階層データ
- **形状**: パターン1 + expandable設定
- **データ件数**: 100件以内

### 固定列テーブル
- **対応する標準パターン**: パターン2（データ管理表示）の変種
- **除外理由**: 多数の列がある特殊ケースのため
- **用途**: 多数の列があるデータ（10列以上）
- **形状**: パターン2 + fixed列設定
- **scroll**: `scroll={{ x: 1500, y: 400 }}` 必須

### 縞模様テーブル
- **対応する標準パターン**: 全パターンのオプション設定
- **除外理由**: デザイン上の選択肢であり、パターンではない
- **用途**: 行の識別性を高めたい場合
- **形状**: 標準パターン + rowClassName設定
- **実装**: `rowClassName={(_, index) => index % 2 === 0 ? 'light' : 'dark'}`

### グループ化テーブル
- **対応する標準パターン**: パターン2（データ管理表示）の変種
- **除外理由**: 使用頻度が低く、実装が複雑なため
- **用途**: カテゴリごとにグループ化が必要なデータ
- **形状**: パターン2 + カスタムrenderRow
- **実装**: グループヘッダー行を挿入

---

## 実装例

### パターン1: シンプルデータ表示

```tsx
import { Table, Tooltip, Button, Space, theme } from 'antd';
import { FileOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface FileData {
  id: string;
  name: string;
  size: number;
  lastModified: string;
}

export function SimpleDataTable({ data }: { data: FileData[] }) {
  const { token } = theme.useToken();

  const columns: ColumnsType<FileData> = [
    {
      title: 'タイプ',
      key: 'type',
      width: 50,
      align: 'center',
      render: () => (
        <FileOutlined
          style={{
            fontSize: token.fontSizeLG,
            color: token.colorInfo
          }}
        />
      )
    },
    {
      title: 'ファイル名',
      dataIndex: 'name',
      key: 'name',
      ellipsis: {
        showTitle: false
      },
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
      align: 'right',
      sorter: (a, b) => a.size - b.size,
      render: (size: number) => formatFileSize(size)
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="default"
            size="small"
            icon={<DownloadOutlined />}
          >
            ダウンロード
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
          >
            ビューア
          </Button>
        </Space>
      )
    }
  ];

  return (
    <Table
      dataSource={data}
      columns={columns}
      rowKey="id"
      size="small"
      pagination={false}
      onRow={(record) => ({
        onClick: () => console.log('Row clicked:', record),
        style: { cursor: 'pointer' }
      })}
    />
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
```

### パターン2: データ管理表示

```tsx
import { Table, Input, Select, Row, Col, Space, Button, Tag, theme } from 'antd';
import { SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';
import type { ColumnsType } from 'antd/es/table';

interface TaskData {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignee: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
}

export function DataManagementTable({ data }: { data: TaskData[] }) {
  const { token } = theme.useToken();
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = !searchText ||
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.assignee.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = !selectedStatus || item.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [data, searchText, selectedStatus]);

  const columns: ColumnsType<TaskData> = [
    {
      title: 'タスク名',
      dataIndex: 'name',
      key: 'name',
      width: 300,
      ellipsis: {
        showTitle: false
      },
      sorter: (a, b) => a.name.localeCompare(b.name, 'ja'),
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      filters: [
        { text: '保留中', value: 'pending' },
        { text: '進行中', value: 'in_progress' },
        { text: '完了', value: 'completed' }
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => {
        const config = {
          pending: { color: 'orange', text: '保留中' },
          in_progress: { color: 'blue', text: '進行中' },
          completed: { color: 'green', text: '完了' }
        };
        const { color, text } = config[status as keyof typeof config];
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '担当者',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 120,
      sorter: (a, b) => a.assignee.localeCompare(b.assignee, 'ja')
    },
    {
      title: '期限',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 150,
      sorter: (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      render: (date: string) => (
        <span style={{ color: token.colorTextSecondary }}>
          {new Date(date).toLocaleDateString('ja-JP')}
        </span>
      )
    },
    {
      title: '優先度',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      align: 'center',
      filters: [
        { text: '高', value: 'high' },
        { text: '中', value: 'medium' },
        { text: '低', value: 'low' }
      ],
      onFilter: (value, record) => record.priority === value,
      render: (priority: string) => {
        const config = {
          high: { color: 'red', text: '高' },
          medium: { color: 'orange', text: '中' },
          low: { color: 'default', text: '低' }
        };
        const { color, text } = config[priority as keyof typeof config];
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
          >
            編集
          </Button>
          <Button
            type="default"
            danger
            size="small"
            icon={<DeleteOutlined />}
          >
            削除
          </Button>
        </Space>
      )
    }
  ];

  return (
    <>
      {/* 絞り込みUI */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Input
            placeholder="タスク名・担当者で検索..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: '100%' }}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Select
            placeholder="ステータスで絞り込み"
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
          showQuickJumper: false,
          showTotal: (total, range) => `全${total}件 (${range[0]}-${range[1]}件表示)`,
          pageSizeOptions: ['10', '20', '50', '100'],
          position: ['bottomRight'],
          locale: {
            items_per_page: '件/ページ'
          }
        }}
        scroll={{ x: 1200 }}
      />
    </>
  );
}
```

### パターン3: 詳細データ表示

```tsx
import { Table, Typography, Space, Button, theme } from 'antd';
import { FolderOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

interface ProjectData {
  id: string;
  name: string;
  description: string;
  owner: string;
  lastModified: string;
  fileCount: number;
}

export function DetailedDataTable({ data }: { data: ProjectData[] }) {
  const { token } = theme.useToken();

  const columns: ColumnsType<ProjectData> = [
    {
      title: 'タイプ',
      key: 'type',
      width: 50,
      align: 'center',
      render: () => (
        <FolderOutlined
          style={{
            fontSize: token.fontSizeLG,
            color: token.colorWarning
          }}
        />
      )
    },
    {
      title: 'プロジェクト情報',
      key: 'info',
      render: (_, record) => (
        <div>
          {/* 1行目: メイン情報 */}
          <Text strong style={{ fontSize: token.fontSize }}>
            {record.name}
          </Text>
          
          {/* 2行目: サブ情報 */}
          <div style={{ marginTop: 4 }}>
            <Text
              type="secondary"
              style={{ fontSize: token.fontSizeSM }}
            >
              {record.description}
            </Text>
          </div>
        </div>
      )
    },
    {
      title: '所有者',
      dataIndex: 'owner',
      key: 'owner',
      width: 120,
      render: (text: string) => (
        <Text style={{ fontSize: token.fontSize }}>
          {text}
        </Text>
      )
    },
    {
      title: 'ファイル数',
      dataIndex: 'fileCount',
      key: 'fileCount',
      width: 100,
      align: 'right',
      sorter: (a, b) => a.fileCount - b.fileCount,
      render: (count: number) => (
        <Text style={{ fontSize: token.fontSize }}>
          {count}件
        </Text>
      )
    },
    {
      title: '更新日',
      dataIndex: 'lastModified',
      key: 'lastModified',
      width: 150,
      sorter: (a, b) =>
        new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime(),
      render: (date: string) => (
        <Text
          type="secondary"
          style={{ fontSize: token.fontSize }}
        >
          {formatRelativeTime(date)}
        </Text>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
          >
            編集
          </Button>
          <Button
            type="default"
            size="small"
          >
            詳細
          </Button>
        </Space>
      )
    }
  ];

  return (
    <Table
      dataSource={data}
      columns={columns}
      rowKey="id"
      size="small"
      pagination={{
        pageSize: 20,
        showTotal: (total) => `全${total}件`
      }}
      onRow={(record) => ({
        onClick: () => console.log('Row clicked:', record),
        style: { cursor: 'pointer' }
      })}
    />
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}ヶ月前`;
  return date.toLocaleDateString('ja-JP');
}
```

---

## ベストプラクティス

### DO（推奨）
✅ データ件数に応じて適切なパターンを選択する
✅ rowKeyを必ず指定する
✅ 列幅（width）を明示的に指定する
✅ 長いテキストにはellipsis + Tooltipを使う
✅ ソート関数で日本語対応する（localeCompare）
✅ 大量データには必ずページネーションを使う
✅ 絞り込みUIはテーブル上部に配置する
✅ 操作ボタンはSpaceで間隔を統一する
✅ レスポンシブ対応（scroll設定）を行う
✅ Empty状態を適切に表示する

### DON'T（非推奨）
❌ 100件以上のデータでパターン1を使わない
❌ パターン2で絞り込みUIを省略しない
❌ 全列に自動幅（width未指定）を使わない
❌ 操作ボタンを4個以上直接配置しない
❌ 横スクロールなしで多数の列を詰め込まない
❌ rowKeyを指定し忘れない
❌ ソート関数で日本語を考慮しない
❌ サブテキストのフォントサイズを14pxにしない（12px必須）

---

## パフォーマンス最適化

### 大量データの場合
- 仮想スクロール（Virtual Scroll）を検討
- ページネーションのページサイズを適切に設定
- 不要な列を非表示にする（responsive）

### レンダリング最適化
- render関数内で重い処理を避ける
- useMemouseMemoでフィルタリング結果をキャッシュ
- shouldCellUpdateでセルの再レンダリングを制御

---

## アクセシビリティ

### ARIA属性
```tsx
<Table
  aria-label="データ一覧"
  aria-describedby="table-description"
/>
```

### キーボード操作
- Tab: 次のセル/ボタンへ移動
- Enter: 行クリック（onRow設定時）
- Space: チェックボックス選択

---

## 実装チェックリスト

### 必須項目
- [ ] rowKeyを指定している
- [ ] 適切なパターンを選択している（データ件数に応じて）
- [ ] 列幅（width）を指定している
- [ ] Empty状態を設定している

### 推奨項目
- [ ] ソート機能で日本語対応している
- [ ] 長いテキストにellipsis + Tooltipを使っている
- [ ] レスポンシブ対応している（scroll設定）
- [ ] パターン2の場合、絞り込みUIを実装している
- [ ] パターン

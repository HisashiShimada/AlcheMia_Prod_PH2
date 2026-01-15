'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  Space,
  Table,
  Input,
  Select,
  Button,
  Tag,
  Tooltip,
  Typography,
  Row,
  Col,
  Divider,
  theme,
  Empty
} from 'antd';
import {
  FileOutlined,
  FolderOutlined,
  DownloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Paragraph, Text } = Typography;

// データ型定義
interface FileData {
  id: string;
  name: string;
  size: number;
  lastModified: string;
}

interface TaskData {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignee: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
}

interface ProjectData {
  id: string;
  name: string;
  description: string;
  owner: string;
  lastModified: string;
  fileCount: number;
}

// ユーティリティ関数
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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

// サンプルデータ
const sampleFiles: FileData[] = Array.from({ length: 15 }, (_, i) => ({
  id: `file-${i + 1}`,
  name: `実験データ_${String(i + 1).padStart(3, '0')}.maiml`,
  size: Math.floor(Math.random() * 5000000) + 100000,
  lastModified: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
}));

const sampleTasks: TaskData[] = Array.from({ length: 50 }, (_, i) => {
  const statuses: TaskData['status'][] = ['pending', 'in_progress', 'completed'];
  const priorities: TaskData['priority'][] = ['high', 'medium', 'low'];
  const assignees = ['佐藤', '鈴木', '高橋', '田中', '渡辺'];
  
  return {
    id: `task-${i + 1}`,
    name: `タスク${String(i + 1).padStart(3, '0')}: 実験データの解析`,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    assignee: assignees[Math.floor(Math.random() * assignees.length)],
    dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    priority: priorities[Math.floor(Math.random() * priorities.length)]
  };
});

const sampleProjects: ProjectData[] = Array.from({ length: 12 }, (_, i) => ({
  id: `project-${i + 1}`,
  name: `プロジェクト${String(i + 1).padStart(2, '0')}`,
  description: `材料実験データ分析プロジェクト。機械学習を用いた材料特性の予測と最適化を目指す。`,
  owner: ['佐藤研究室', '鈴木研究室', '高橋研究室'][Math.floor(Math.random() * 3)],
  lastModified: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  fileCount: Math.floor(Math.random() * 50) + 10
}));

// パターン1: シンプルデータ表示
function SimpleDataTableDemo() {
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
      title: '更新日',
      dataIndex: 'lastModified',
      key: 'lastModified',
      width: 150,
      sorter: (a, b) =>
        new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime(),
      render: (date: string) => (
        <Text type="secondary">
          {formatRelativeTime(date)}
        </Text>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      align: 'center',
      render: () => (
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
    <Card
      title="パターン1: シンプルデータ表示"
      style={{ marginBottom: 24 }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Paragraph>
          <strong>用途:</strong> ファイル一覧、フォルダ一覧、小規模データ表示（50件以内）
        </Paragraph>
        <Paragraph>
          <strong>特徴:</strong> size=&quot;small&quot;、ページネーション不要、コンパクトで読みやすい、行クリック可能
        </Paragraph>

        <Table
          dataSource={sampleFiles.slice(0, 10)}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          onRow={(record) => ({
            onClick: () => console.log('Row clicked:', record),
            style: { cursor: 'pointer' }
          })}
          locale={{
            emptyText: (
              <Empty
                description="データがありません"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )
          }}
        />
      </Space>
    </Card>
  );
}

// パターン2: データ管理表示
function DataManagementTableDemo() {
  const { token } = theme.useToken();
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();

  const filteredData = useMemo(() => {
    return sampleTasks.filter(item => {
      const matchesSearch = !searchText ||
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.assignee.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = !selectedStatus || item.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [searchText, selectedStatus]);

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
      render: (text: string) => (
        <Tooltip title={text}>
          <strong>{text}</strong>
        </Tooltip>
      )
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
      render: (status: TaskData['status']) => {
        const config = {
          pending: { color: 'orange', text: '保留中' },
          in_progress: { color: 'blue', text: '進行中' },
          completed: { color: 'green', text: '完了' }
        };
        const { color, text } = config[status];
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
        <Text type="secondary">
          {new Date(date).toLocaleDateString('ja-JP')}
        </Text>
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
      render: (priority: TaskData['priority']) => {
        const config = {
          high: { color: 'red', text: '高' },
          medium: { color: 'orange', text: '中' },
          low: { color: 'default', text: '低' }
        };
        const { color, text } = config[priority];
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      align: 'center',
      fixed: 'right',
      render: () => (
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
    <Card
      title="パターン2: データ管理表示"
      style={{ marginBottom: 24 }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Paragraph>
          <strong>用途:</strong> ユーザー管理、タスク管理、実験記録など大量データ（100件以上）
        </Paragraph>
        <Paragraph>
          <strong>特徴:</strong> size=&quot;middle&quot;、ページネーション必須、絞り込みUI、bordered=true
        </Paragraph>

        {/* 絞り込みUI */}
        <Row gutter={[16, 16]}>
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
            showTotal: (total, range) => `全${total}件 (${range?.[0]}-${range?.[1]}件表示)`,
            pageSizeOptions: ['10', '20', '50', '100'],
            position: ['bottomRight'],
            locale: {
              items_per_page: '件/ページ'
            }
          }}
          scroll={{ x: 1200 }}
        />
      </Space>
    </Card>
  );
}

// パターン3: 詳細データ表示
function DetailedDataTableDemo() {
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
      render: () => (
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
    <Card
      title="パターン3: 詳細データ表示"
      style={{ marginBottom: 24 }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Paragraph>
          <strong>用途:</strong> プロジェクト一覧、フォーマットファイル一覧、2行表示が必要なデータ
        </Paragraph>
        <Paragraph>
          <strong>特徴:</strong> size=&quot;small&quot;、2行構成（メイン14px + サブ12px）、視認性が高い
        </Paragraph>

        <Table
          dataSource={sampleProjects}
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
      </Space>
    </Card>
  );
}

// 除外パターン: 縞模様テーブル
function StripedTableDemo() {
  const { token } = theme.useToken();

  const columns: ColumnsType<FileData> = [
    {
      title: 'ファイル名',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true
    },
    {
      title: 'サイズ',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      align: 'right',
      render: (size: number) => formatFileSize(size)
    },
    {
      title: '更新日',
      dataIndex: 'lastModified',
      key: 'lastModified',
      width: 150,
      render: (date: string) => formatRelativeTime(date)
    }
  ];

  return (
    <Card
      title="除外パターン: 縞模様テーブル"
      style={{ marginBottom: 24 }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Paragraph>
          <strong>説明:</strong> 全パターンのオプション設定。行の識別性を高めたい場合に使用。
        </Paragraph>
        <Paragraph>
          <strong>実装:</strong> rowClassNameで奇数・偶数行に異なる背景色を設定
        </Paragraph>

        <Table
          dataSource={sampleFiles.slice(0, 10)}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          rowClassName={(_, index) =>
            index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
          }
        />

        <style jsx global>{`
          .table-row-light {
            background: #ffffff;
          }
          .table-row-dark {
            background: #fafafa;
          }
        `}</style>
      </Space>
    </Card>
  );
}

// 除外パターン: 固定列テーブル
function FixedColumnTableDemo() {
  const columns: ColumnsType<TaskData> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      fixed: 'left'
    },
    {
      title: 'タスク名',
      dataIndex: 'name',
      key: 'name',
      width: 300
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 100
    },
    {
      title: '担当者',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 120
    },
    {
      title: '期限',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 150,
      render: (date: string) => new Date(date).toLocaleDateString('ja-JP')
    },
    {
      title: '優先度',
      dataIndex: 'priority',
      key: 'priority',
      width: 100
    },
    {
      title: '作成日',
      key: 'createdAt',
      width: 150,
      render: () => new Date().toLocaleDateString('ja-JP')
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: () => (
        <Space size="small">
          <Button type="primary" size="small">編集</Button>
          <Button danger size="small">削除</Button>
        </Space>
      )
    }
  ];

  return (
    <Card
      title="除外パターン: 固定列テーブル"
      style={{ marginBottom: 24 }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Paragraph>
          <strong>説明:</strong> パターン2の変種。多数の列がある特殊ケース（10列以上）。
        </Paragraph>
        <Paragraph>
          <strong>実装:</strong> fixed=&quot;left&quot; / fixed=&quot;right&quot;で列を固定、scroll必須
        </Paragraph>

        <Table
          dataSource={sampleTasks.slice(0, 10)}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1500 }}
          pagination={{ pageSize: 10 }}
        />
      </Space>
    </Card>
  );
}

// メインコンポーネント
export default function DataTablePatternsDemo() {
  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>データテーブル表示パターン</Title>
      <Paragraph>
        データテーブル表示の標準3パターンと除外パターンのデモです。
        データ件数と用途に応じて適切なパターンを選択してください。
      </Paragraph>

      <Divider />

      {/* 標準パターン */}
      <Title level={3}>標準パターン</Title>
      <SimpleDataTableDemo />
      <DataManagementTableDemo />
      <DetailedDataTableDemo />

      <Divider />

      {/* 除外パターン */}
      <Title level={3}>除外パターン</Title>
      <StripedTableDemo />
      <FixedColumnTableDemo />
    </div>
  );
}

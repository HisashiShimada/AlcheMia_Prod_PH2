'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  Space,
  Typography,
  Table,
  Button,
  Tag,
  Input,
  Select,
  Row,
  Col,
  Empty,
  Tooltip,
  Dropdown,
  theme,
  message
} from 'antd';
import {
  SearchOutlined,
  FileOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  DownloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  CopyOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text, Paragraph } = Typography;

// パターン1用のデータ型
interface FileData {
  id: string;
  name: string;
  size: number;
  lastModified: string;
  type: 'maiml' | 'pdf' | 'excel' | 'other';
  isFolder?: boolean;
  fileCount?: number;
}

// パターン2用のデータ型
interface TaskData {
  id: string;
  taskName: string;
  status: 'not_started' | 'started' | 'in_progress' | 'completed' | 'suspended';
  progressRate: number;
  assignee: string;
  dueDate: string;
}

// パターン3用のデータ型
interface FormatFileData {
  id: string;
  name: string;
  description: string;
  creator: string;
  size: number;
  lastModified: string;
  version: string;
  isFolder?: boolean;
  fileCount?: number;
}

/**
 * ファイルサイズをフォーマット
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * 相対時刻をフォーマット
 */
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  return date.toLocaleDateString('ja-JP');
};

/**
 * モックデータ生成
 */
const generateFileData = (): FileData[] => [
  { id: '1', name: 'experiment_001.maiml', size: 245760, lastModified: '2024-12-24T10:00:00', type: 'maiml' },
  { id: '2', name: 'result_report.pdf', size: 1048576, lastModified: '2024-12-24T09:30:00', type: 'pdf' },
  { id: '3', name: 'data_analysis.xlsx', size: 524288, lastModified: '2024-12-23T16:20:00', type: 'excel' },
  { id: '4', name: 'sample_data.csv', size: 102400, lastModified: '2024-12-23T14:10:00', type: 'other' },
  { id: '5', name: 'experiment_002.maiml', size: 327680, lastModified: '2024-12-22T11:45:00', type: 'maiml' },
  { id: '6', name: 'Documents', size: 0, lastModified: '2024-12-20T09:00:00', type: 'other', isFolder: true, fileCount: 12 },
];

const generateTaskData = (): TaskData[] => {
  const tasks: TaskData[] = [];
  const statuses: TaskData['status'][] = ['not_started', 'started', 'in_progress', 'completed', 'suspended'];
  const taskNames = [
    '実験準備', '試料調整', 'データ測定', '結果分析', 'レポート作成',
    '機器校正', '安全確認', '廃棄物処理', '清掃作業', '記録整理'
  ];
  const assignees = ['田中太郎', '佐藤花子', '鈴木一郎', '高橋美咲', '伊藤健太'];

  for (let i = 0; i < 50; i++) {
    tasks.push({
      id: `task-${i + 1}`,
      taskName: taskNames[i % taskNames.length] + ` #${Math.floor(i / taskNames.length) + 1}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      progressRate: Math.floor(Math.random() * 101),
      assignee: assignees[Math.floor(Math.random() * assignees.length)],
      dueDate: new Date(2024, 11, 25 + Math.floor(Math.random() * 10)).toISOString().split('T')[0]
    });
  }
  return tasks;
};

const generateFormatFileData = (): FormatFileData[] => [
  {
    id: 'f1',
    name: 'standard_experiment_v1.maiml',
    description: '標準実験フォーマット - 基本的な実験記録用テンプレート',
    creator: '田中太郎',
    size: 81920,
    lastModified: '2024-12-20T10:00:00',
    version: 'v1.2.0'
  },
  {
    id: 'f2',
    name: 'advanced_analysis_v2.maiml',
    description: '高度な分析フォーマット - 複雑なデータ解析に対応',
    creator: '佐藤花子',
    size: 163840,
    lastModified: '2024-12-19T14:30:00',
    version: 'v2.1.3'
  },
  {
    id: 'f3',
    name: 'quality_control.maiml',
    description: '品質管理フォーマット - QC/QAプロセス記録用',
    creator: '鈴木一郎',
    size: 122880,
    lastModified: '2024-12-18T09:15:00',
    version: 'v1.0.5'
  },
  {
    id: 'f4',
    name: 'Templates',
    description: '',
    creator: '',
    size: 0,
    lastModified: '2024-12-15T08:00:00',
    version: '',
    isFolder: true,
    fileCount: 8
  }
];

/**
 * テーブルパターンデモコンポーネント
 */
export default function TablePatternsDemo() {
  const { token } = theme.useToken();

  // パターン1のデータ
  const fileData = generateFileData();

  // パターン2のデータと状態
  const allTasks = useMemo(() => generateTaskData(), []);
  const [searchText, setSearchText] = useState('');
  const [selectedTaskName, setSelectedTaskName] = useState<string | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<TaskData['status'] | undefined>();

  // パターン3のデータ
  const formatFileData = generateFormatFileData();

  // ファイルアイコンを取得
  const getFileIcon = (file: FileData) => {
    if (file.isFolder) {
      return <FolderOpenOutlined style={{ fontSize: token.fontSizeLG, color: token.colorWarning }} />;
    }
    switch (file.type) {
      case 'maiml':
        return <FileTextOutlined style={{ fontSize: token.fontSizeLG, color: token.colorInfo }} />;
      case 'pdf':
        return <FileTextOutlined style={{ fontSize: token.fontSizeLG, color: token.colorError }} />;
      case 'excel':
        return <FileTextOutlined style={{ fontSize: token.fontSizeLG, color: token.colorSuccess }} />;
      default:
        return <FileOutlined style={{ fontSize: token.fontSizeLG, color: token.colorTextSecondary }} />;
    }
  };

  // ステータス設定を取得
  const getStatusConfig = (status: TaskData['status']) => {
    const configs = {
      not_started: { color: 'default', label: '開始前' },
      started: { color: 'blue', label: '開始' },
      in_progress: { color: 'orange', label: '作業中' },
      completed: { color: 'green', label: '完了' },
      suspended: { color: 'default', label: '中断' }
    };
    return configs[status];
  };

  // タスク名の選択肢
  const taskNameOptions = useMemo(() => {
    const uniqueNames = Array.from(new Set(allTasks.map(task => task.taskName)));
    return uniqueNames.map(name => ({ label: name, value: name }));
  }, [allTasks]);

  // ステータスの選択肢
  const statusOptions = [
    { label: '開始前', value: 'not_started' },
    { label: '開始', value: 'started' },
    { label: '作業中', value: 'in_progress' },
    { label: '完了', value: 'completed' },
    { label: '中断', value: 'suspended' }
  ];

  // フィルタリングされたタスク
  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      const matchesSearch = !searchText || 
        task.taskName.toLowerCase().includes(searchText.toLowerCase()) ||
        getStatusConfig(task.status).label.includes(searchText) ||
        task.progressRate.toString().includes(searchText);
      const matchesTaskName = !selectedTaskName || task.taskName === selectedTaskName;
      const matchesStatus = !selectedStatus || task.status === selectedStatus;
      return matchesSearch && matchesTaskName && matchesStatus;
    });
  }, [allTasks, searchText, selectedTaskName, selectedStatus]);

  // パターン1: シンプル一覧テーブルの列定義
  const pattern1Columns: ColumnsType<FileData> = [
    {
      title: 'タイプ',
      key: 'type',
      width: 50,
      align: 'center',
      render: (_text: string, record: FileData) => getFileIcon(record)
    },
    {
      title: 'ファイル名',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name, 'ja'),
      render: (text: string, record: FileData) => (
        <Tooltip title={record.isFolder ? `フォルダ: ${text}` : text} placement="topLeft">
          <Text strong={record.isFolder}>
            {text}
            {record.isFolder && record.fileCount !== undefined && ` (${record.fileCount})`}
          </Text>
        </Tooltip>
      )
    },
    {
      title: 'サイズ',
      key: 'size',
      width: 120,
      sorter: (a, b) => a.size - b.size,
      render: (_text: string, record: FileData) =>
        !record.isFolder ? (
          <Text type="secondary">{formatFileSize(record.size)}</Text>
        ) : null
    },
    {
      title: '最終更新日',
      key: 'lastModified',
      width: 150,
      sorter: (a, b) => new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime(),
      render: (_text: string, record: FileData) => (
        <Text type="secondary">{formatRelativeTime(record.lastModified)}</Text>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      align: 'center',
      render: (_text: string, record: FileData) =>
        !record.isFolder ? (
          <Space size="small">
            <Button
              type="default"
              size="small"
              icon={<DownloadOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                message.success(`${record.name} をダウンロードしました`);
              }}
            >
              ダウンロード
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                message.info(`${record.name} をビューアで開きます`);
              }}
            >
              ビューア
            </Button>
          </Space>
        ) : null
    }
  ];

  // パターン2: データ管理テーブルの列定義
  const pattern2Columns: ColumnsType<TaskData> = [
    {
      title: 'タスク名',
      dataIndex: 'taskName',
      key: 'taskName',
      width: 200,
      ellipsis: true,
      sorter: (a, b) => a.taskName.localeCompare(b.taskName, 'ja'),
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (status: TaskData['status']) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.label}</Tag>;
      }
    },
    {
      title: '進捗率',
      dataIndex: 'progressRate',
      key: 'progressRate',
      width: 100,
      align: 'center',
      sorter: (a, b) => a.progressRate - b.progressRate,
      render: (rate: number) => (
        <Text strong style={{ color: token.colorInfo }}>
          {rate}%
        </Text>
      )
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
      width: 120,
      sorter: (a, b) => a.dueDate.localeCompare(b.dueDate)
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      align: 'center',
      render: (_text: string, record: TaskData) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => message.info(`${record.taskName} を編集`)}
          >
            編集
          </Button>
          <Button
            type="default"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => message.warning(`${record.taskName} を削除`)}
          >
            削除
          </Button>
        </Space>
      )
    }
  ];

  // パターン3: 詳細情報テーブルの列定義
  const pattern3Columns: ColumnsType<FormatFileData> = [
    {
      title: 'タイプ',
      key: 'type',
      width: 50,
      align: 'center',
      render: (_text: string, record: FormatFileData) =>
        record.isFolder ? (
          <FolderOpenOutlined style={{ fontSize: token.fontSizeLG, color: token.colorWarning }} />
        ) : (
          <FileTextOutlined style={{ fontSize: token.fontSizeLG, color: token.colorInfo }} />
        )
    },
    {
      title: 'ファイル名',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name, 'ja'),
      render: (text: string, record: FormatFileData) => (
        <div>
          <Tooltip title={text} placement="topLeft">
            <Text strong={record.isFolder} style={{ color: record.isFolder ? token.colorWarning : 'inherit' }}>
              {text}
              {record.isFolder && record.fileCount !== undefined && ` (${record.fileCount})`}
            </Text>
          </Tooltip>
          {!record.isFolder && record.description && (
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                {record.description}
              </Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'バージョン',
      dataIndex: 'version',
      key: 'version',
      width: 100,
      render: (text: string, record: FormatFileData) =>
        !record.isFolder && text ? <Tag color="blue">{text}</Tag> : null
    },
    {
      title: '作成者',
      dataIndex: 'creator',
      key: 'creator',
      width: 120,
      sorter: (a, b) => (a.creator || '').localeCompare(b.creator || '', 'ja'),
      render: (text: string, record: FormatFileData) =>
        !record.isFolder && text ? <Text type="secondary">{text}</Text> : null
    },
    {
      title: 'サイズ',
      key: 'size',
      width: 120,
      sorter: (a, b) => a.size - b.size,
      render: (_text: string, record: FormatFileData) =>
        !record.isFolder ? <Text type="secondary">{formatFileSize(record.size)}</Text> : null
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      align: 'center',
      render: (_text: string, record: FormatFileData) =>
        !record.isFolder ? (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              style={{ backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }}
              onClick={(e) => {
                e.stopPropagation();
                message.success(`${record.name} を編集`);
              }}
            >
              編集
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'download',
                    label: 'ダウンロード',
                    icon: <DownloadOutlined />,
                    onClick: () => message.info(`${record.name} をダウンロード`)
                  },
                  {
                    key: 'copy',
                    label: '複製',
                    icon: <CopyOutlined />,
                    onClick: () => message.info(`${record.name} を複製`)
                  },
                  { type: 'divider' },
                  {
                    key: 'delete',
                    label: '削除',
                    icon: <DeleteOutlined />,
                    danger: true,
                    onClick: () => message.warning(`${record.name} を削除`)
                  }
                ]
              }}
              trigger={['click']}
            >
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        ) : null
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>テーブルパターン</Title>
      <Paragraph>
        Ant Design Tableコンポーネントの標準パターンを示します。
        用途に応じて適切なパターンを選択してください。
      </Paragraph>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* パターン1: シンプル一覧テーブル */}
        <Card title="パターン1: シンプル一覧テーブル" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途:</Text> ファイル一覧、フォルダ一覧、シンプルなデータ表示（50件以内）
            </div>
            <div>
              <Text strong>特徴:</Text>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>サイズ: small</li>
                <li>ページネーション: なし</li>
                <li>ボーダー: なし</li>
                <li>行クリック可能</li>
                <li>操作ボタン: 1-2個</li>
              </ul>
            </div>

            <Table
              dataSource={fileData}
              columns={pattern1Columns}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{
                emptyText: (
                  <Empty description="ファイルがありません" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )
              }}
              onRow={(record) => ({
                onClick: () => {
                  if (record.isFolder) {
                    message.info(`フォルダ「${record.name}」を開きます`);
                  }
                },
                style: {
                  cursor: record.isFolder ? 'pointer' : 'default'
                }
              })}
            />
          </Space>
        </Card>

        {/* パターン2: データ管理テーブル */}
        <Card title="パターン2: データ管理テーブル" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途:</Text> タスク管理、ユーザー管理、実験記録など大量データ（100件以上）
            </div>
            <div>
              <Text strong>特徴:</Text>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>サイズ: middle</li>
                <li>ページネーション: 必須（20件/ページ）</li>
                <li>ボーダー: あり</li>
                <li>絞り込みUI: テーブル上部に配置</li>
                <li>複数の操作ボタン</li>
                <li>横スクロール対応</li>
              </ul>
            </div>

            {/* 絞り込みUI */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Input
                  placeholder="タスク名、ステータス、進捗率..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                  aria-label="全カラム検索"
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Select
                  placeholder="タスク名"
                  style={{ width: '100%' }}
                  value={selectedTaskName}
                  onChange={(value) => setSelectedTaskName(value)}
                  allowClear
                  options={taskNameOptions}
                  aria-label="タスク名で絞り込み"
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Select
                  placeholder="ステータス"
                  style={{ width: '100%' }}
                  value={selectedStatus}
                  onChange={(value) => setSelectedStatus(value as TaskData['status'])}
                  allowClear
                  options={statusOptions}
                  aria-label="ステータスで絞り込み"
                />
              </Col>
            </Row>

            <Table
              columns={pattern2Columns}
              dataSource={filteredTasks}
              rowKey="id"
              size="middle"
              bordered
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: false,
                showTotal: (total) => `全${total}件`,
                pageSizeOptions: ['10', '20', '50', '100'],
                position: ['bottomRight'],
                locale: {
                  items_per_page: '件/ページ',
                  jump_to: 'ページ',
                  page: ''
                }
              }}
              scroll={{ x: 1200 }}
              aria-label="タスク一覧"
            />
          </Space>
        </Card>

        {/* パターン3: 詳細情報テーブル */}
        <Card title="パターン3: 詳細情報テーブル" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途:</Text> フォーマットファイル一覧、2行表示が必要な詳細データ
            </div>
            <div>
              <Text strong>特徴:</Text>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>サイズ: small</li>
                <li>ページネーション: なし（または少数）</li>
                <li>ボーダー: なし</li>
                <li>メイン情報 + サブ情報の2行表示</li>
                <li>説明文や補足情報を表示</li>
                <li>ドロップダウンメニュー（4個以上の操作）</li>
              </ul>
            </div>

            <Table
              dataSource={formatFileData}
              columns={pattern3Columns}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{
                emptyText: (
                  <Empty description="フォーマットファイルがありません" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )
              }}
              onRow={(record) => ({
                onClick: () => {
                  if (record.isFolder) {
                    message.info(`フォルダ「${record.name}」を開きます`);
                  } else {
                    message.info(`ファイル「${record.name}」の詳細を表示します`);
                  }
                },
                style: {
                  cursor: 'pointer'
                }
              })}
            />
          </Space>
        </Card>
      </Space>
    </div>
  );
}

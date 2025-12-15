'use client';

import React from 'react';
import {
  Table,
  Button,
  Tooltip,
  Space,
  Empty,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileTextOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { formatFileSize, formatRelativeTime } from '@/utils/formatters';

const { Text } = Typography;

/**
 * フォーマットファイルの型定義
 */
interface FormatFileData {
  id: string;
  name: string;
  path: string;
  size: number;
  lastModified: string;
  type: string;
  version?: string;
  description?: string;
}

/**
 * FormatFileListTableのProps
 */
interface FormatFileListTableProps {
  files: FormatFileData[];
  onFileClick?: (file: FormatFileData) => void;
  onEdit?: (file: FormatFileData) => void;
  onDelete?: (file: FormatFileData) => void;
}

/**
 * フォーマットファイル専用のテーブルコンポーネント
 * XMLファイル（.maiml）のみを表示
 */
const FormatFileListTable: React.FC<FormatFileListTableProps> = ({ 
  files, 
  onFileClick,
  onEdit,
  onDelete 
}) => {
  // フォーマットファイル（xml または maiml）をフィルタリング
  const formatFiles = files.filter(file => file.type === 'xml' || file.type === 'maiml');

  const columns: ColumnsType<FormatFileData> = [
    {
      title: 'タイプ',
      key: 'type',
      width: 50,
      align: 'center',
      render: () => <FileTextOutlined style={{ fontSize: 20, color: '#2196F3' }} />,
    },
    {
      title: 'ファイル名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: FormatFileData) => (
        <Tooltip title={record.description || record.path} placement="topLeft">
          <div>
            <div style={{ fontWeight: 500, marginBottom: record.description ? 4 : 0 }}>
              {text}
            </div>
            {record.description && (
              <Text type="secondary" style={{ fontSize: 11, display: 'block', lineHeight: 1.3 }}>
                {record.description}
              </Text>
            )}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'サイズ',
      key: 'size',
      width: 120,
      render: (_text: string, record: FormatFileData) => (
        <Text type="secondary">{formatFileSize(record.size)}</Text>
      ),
    },
    {
      title: '最終更新日',
      key: 'lastModified',
      width: 150,
      render: (_text: string, record: FormatFileData) => (
        <Text type="secondary">{formatRelativeTime(record.lastModified)}</Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 250,
      align: 'center',
      render: (_text: string, record: FormatFileData) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            style={{ backgroundColor: '#00695c', borderColor: '#00695c' }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(record);
              console.log('Edit file:', record.name);
            }}
          >
            編集
          </Button>
          <Button
            type="default"
            size="small"
            icon={<DownloadOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              console.log('Download file:', record.name);
            }}
          >
            ダウンロード
          </Button>
          <Button
            type="default"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(record);
              console.log('Delete file:', record.name);
            }}
          >
            削除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table
      dataSource={formatFiles}
      columns={columns}
      rowKey="id"
      size="small"
      pagination={false}
      locale={{
        emptyText: (
          <Empty
            description="フォーマットファイルがありません"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ),
      }}
      onRow={(record) => ({
        onClick: () => onFileClick?.(record),
        style: {
          cursor: onFileClick ? 'pointer' : 'default',
        },
      })}
    />
  );
};

export default FormatFileListTable;

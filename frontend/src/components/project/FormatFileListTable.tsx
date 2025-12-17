'use client';

import React from 'react';
import {
  Table,
  Button,
  Tooltip,
  Space,
  Empty,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileTextOutlined,
  FolderOpenOutlined,
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
  isFolder?: boolean;
  fileCount?: number;
}

/**
 * FormatFileListTableのProps
 */
interface FormatFileListTableProps {
  files: FormatFileData[];
  onFileClick?: (file: FormatFileData) => void;
  onFolderClick?: (folderId: string) => void;
  onEdit?: (file: FormatFileData) => void;
  onDelete?: (file: FormatFileData) => void;
}

/**
 * フォーマットファイル専用のテーブルコンポーネント
 * XMLファイル（.maiml）とフォルダを表示
 */
const FormatFileListTable: React.FC<FormatFileListTableProps> = ({ 
  files, 
  onFileClick,
  onFolderClick,
  onEdit,
  onDelete 
}) => {
  const { token } = theme.useToken();
  
  // ファイルタイプに応じたアイコンを取得
  const getFileIcon = (file: FormatFileData) => {
    if (file.isFolder) {
      return <FolderOpenOutlined style={{ fontSize: token.fontSizeLG, color: token.colorWarning }} />;
    }
    return <FileTextOutlined style={{ fontSize: token.fontSizeLG, color: token.colorInfo }} />;
  };

  const columns: ColumnsType<FormatFileData> = [
    {
      title: 'タイプ',
      key: 'type',
      width: 50,
      align: 'center',
      render: (_text: string, record: FormatFileData) => getFileIcon(record),
    },
    {
      title: 'ファイル名',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name, 'ja'),
      render: (text: string, record: FormatFileData) => (
        <Tooltip title={record.path} placement="topLeft">
          <Text 
            strong={record.isFolder}
            style={{
              color: record.isFolder ? token.colorWarning : 'inherit',
              cursor: record.isFolder ? 'pointer' : 'inherit',
            }}
          >
            {text}
            {record.isFolder && record.fileCount !== undefined && ` (${record.fileCount})`}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'サイズ',
      key: 'size',
      width: 120,
      sorter: (a, b) => a.size - b.size,
      render: (_text: string, record: FormatFileData) =>
        !record.isFolder ? (
          <Text type="secondary">{formatFileSize(record.size)}</Text>
        ) : null,
    },
    {
      title: '最終更新日',
      key: 'lastModified',
      width: 150,
      sorter: (a, b) => new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime(),
      render: (_text: string, record: FormatFileData) =>
        !record.isFolder ? (
          <Text type="secondary">{formatRelativeTime(record.lastModified)}</Text>
        ) : null,
    },
    {
      title: '操作',
      key: 'actions',
      width: 250,
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
        ) : null,
    },
  ];

  return (
    <Table
      dataSource={files}
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
        onClick: () => {
          if (record.isFolder) {
            onFolderClick?.(record.id);
          } else {
            onFileClick?.(record);
          }
        },
        style: {
          cursor: record.isFolder || onFileClick ? 'pointer' : 'default',
        },
      })}
    />
  );
};

export default FormatFileListTable;

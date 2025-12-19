'use client';

import React from 'react';
import {
  Table,
  Button,
  Tooltip,
  Space,
  Empty,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileTextOutlined,
  FileOutlined,
  TableOutlined,
  FolderOpenOutlined,
  DownloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { formatFileSize, formatRelativeTime } from '@/utils/formatters';

interface FileData {
  id: string;
  name: string;
  path: string;
  size: number;
  lastModified: string;
  type: string;
  isFolder?: boolean;
  fileCount?: number;
}

interface FileListTableProps {
  files: FileData[];
  onFileClick?: (file: FileData) => void;
  onFolderClick?: (folderId: string) => void;
}

/**
 * ファイル一覧テーブルコンポーネント
 */
const FileListTable: React.FC<FileListTableProps> = ({ files, onFileClick, onFolderClick }) => {
  const { token } = theme.useToken();
  
  // ファイルタイプに応じたアイコンを取得
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
        return <TableOutlined style={{ fontSize: token.fontSizeLG, color: token.colorSuccess }} />;
      case 'csv':
        return <TableOutlined style={{ fontSize: token.fontSizeLG, color: token.colorTextSecondary }} />;
      case 'archive':
        return <FolderOpenOutlined style={{ fontSize: token.fontSizeLG, color: token.colorWarning }} />;
      default:
        return <FileOutlined style={{ fontSize: token.fontSizeLG, color: token.colorTextSecondary }} />;
    }
  };

  const columns: ColumnsType<FileData> = [
    {
      title: 'タイプ',
      key: 'type',
      width: 50,
      align: 'center',
      render: (_text: string, record: FileData) => getFileIcon(record),
    },
    {
      title: 'ファイル名',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name, 'ja'),
      render: (text: string, record: FileData) => (
        <Tooltip title={record.path} placement="topLeft">
          <span
            style={{
              fontWeight: record.isFolder ? token.fontWeightStrong : 'normal',
              color: record.isFolder ? token.colorWarning : 'inherit',
              cursor: record.isFolder ? 'pointer' : 'inherit',
            }}
          >
            {text}
            {record.isFolder && record.fileCount !== undefined && ` (${record.fileCount})`}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'サイズ',
      key: 'size',
      width: 120,
      sorter: (a, b) => a.size - b.size,
      render: (_text: string, record: FileData) =>
        !record.isFolder ? (
          <span style={{ color: token.colorTextSecondary }}>{formatFileSize(record.size)}</span>
        ) : null,
    },
    {
      title: '最終更新日',
      key: 'lastModified',
      width: 150,
      sorter: (a, b) => new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime(),
      render: (_text: string, record: FileData) =>
        !record.isFolder ? (
          <span style={{ color: token.colorTextSecondary }}>{formatRelativeTime(record.lastModified)}</span>
        ) : null,
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
                console.log('Download file:', record.name);
              }}
            >
              ダウンロード
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              style={{ backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }}
              onClick={(e) => {
                e.stopPropagation();
                console.log('View file:', record.name);
              }}
            >
              ビューア
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
        emptyText: <Empty description="ファイルがありません" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
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

export default FileListTable;

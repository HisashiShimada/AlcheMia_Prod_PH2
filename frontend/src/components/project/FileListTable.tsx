'use client';

import React from 'react';
import {
  Table,
  Button,
  Tooltip,
  Space,
  Empty,
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
  // ファイルタイプに応じたアイコンを取得
  const getFileIcon = (file: FileData) => {
    if (file.isFolder) {
      return <FolderOpenOutlined style={{ fontSize: 20, color: '#FFA726' }} />;
    }
    
    switch (file.type) {
      case 'maiml':
        return <FileTextOutlined style={{ fontSize: 20, color: '#2196F3' }} />;
      case 'pdf':
        return <FileTextOutlined style={{ fontSize: 20, color: '#F44336' }} />;
      case 'excel':
        return <TableOutlined style={{ fontSize: 20, color: '#4CAF50' }} />;
      case 'csv':
        return <TableOutlined style={{ fontSize: 20, color: '#757575' }} />;
      case 'archive':
        return <FolderOpenOutlined style={{ fontSize: 20, color: '#FF9800' }} />;
      default:
        return <FileOutlined style={{ fontSize: 20, color: '#757575' }} />;
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
      render: (text: string, record: FileData) => (
        <Tooltip title={record.path} placement="topLeft">
          <span
            style={{
              fontWeight: record.isFolder ? 600 : 500,
              color: record.isFolder ? '#FFA726' : 'inherit',
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
      render: (_text: string, record: FileData) =>
        !record.isFolder ? (
          <span style={{ color: '#757575' }}>{formatFileSize(record.size)}</span>
        ) : null,
    },
    {
      title: '最終更新日',
      key: 'lastModified',
      width: 150,
      render: (_text: string, record: FileData) =>
        !record.isFolder ? (
          <span style={{ color: '#757575' }}>{formatRelativeTime(record.lastModified)}</span>
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
              style={{ backgroundColor: '#00695c', borderColor: '#00695c' }}
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

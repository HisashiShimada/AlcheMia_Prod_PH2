'use client';

import React from 'react';
import { Table, Tag, Tooltip, Button, Space, Typography, Flex } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileTextOutlined,
  FileOutlined,
  FolderOpenOutlined,
  TableOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { formatFileSize, formatRelativeTime } from '@/utils/formatters';

const { Text } = Typography;

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
        return <FilePdfOutlined style={{ fontSize: 20, color: '#F44336' }} />;
      case 'excel':
        return <FileExcelOutlined style={{ fontSize: 20, color: '#4CAF50' }} />;
      case 'csv':
        return <TableOutlined style={{ fontSize: 20, color: '#757575' }} />;
      case 'archive':
        return <FolderOpenOutlined style={{ fontSize: 20, color: '#FF9800' }} />;
      default:
        return <FileOutlined style={{ fontSize: 20, color: '#757575' }} />;
    }
  };

  // テーブルのカラム定義
  const columns: ColumnsType<FileData> = [
    {
      title: 'タイプ',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      align: 'center',
      render: (_, file) => (
        <Flex justify="center">
          {getFileIcon(file)}
        </Flex>
      ),
    },
    {
      title: 'ファイル名',
      dataIndex: 'name',
      key: 'name',
      render: (_, file) => (
        <Tooltip title={file.path} placement="topLeft">
          <Space direction="vertical" size={4}>
            <Text
              strong={file.isFolder}
              style={{
                color: file.isFolder ? '#FFA726' : 'inherit',
                cursor: file.isFolder ? 'pointer' : 'inherit',
              }}
            >
              {file.name}
              {file.isFolder && file.fileCount !== undefined && ` (${file.fileCount})`}
            </Text>
            {file.type === 'maiml' && !file.isFolder && (
              <Tag color="blue" style={{ marginTop: 4 }}>
                MaiML
              </Tag>
            )}
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'サイズ',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (_, file) =>
        !file.isFolder ? (
          <Text type="secondary">{formatFileSize(file.size)}</Text>
        ) : null,
    },
    {
      title: '最終更新日',
      dataIndex: 'lastModified',
      key: 'lastModified',
      width: 180,
      render: (_, file) =>
        !file.isFolder ? (
          <Text type="secondary">{formatRelativeTime(file.lastModified)}</Text>
        ) : null,
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      align: 'center',
      render: (_, file) =>
        !file.isFolder ? (
          <Space size="small">
            <Button
              size="middle"
              icon={<DownloadOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                console.log('Download file:', file.name);
              }}
            >
              ダウンロード
            </Button>
            <Button
              type="primary"
              size="middle"
              style={{
                backgroundColor: '#00695c',
              }}
              onClick={(e) => {
                e.stopPropagation();
                console.log('View file:', file.name);
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
      columns={columns}
      dataSource={files}
      rowKey="id"
      pagination={false}
      scroll={{ y: 600 }}
      locale={{
        emptyText: 'ファイルがありません',
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

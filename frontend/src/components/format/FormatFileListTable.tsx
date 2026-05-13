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
import { formatFileSize, formatRelativeTime } from '@/utils/formatUtils';
import type { FormatFileData } from '@/types/format';

const { Text } = Typography;

/**
 * FormatFileListTableのProps
 */
interface FormatFileListTableProps {
  files: FormatFileData[];
  onFileClick?: (file: FormatFileData) => void;
  onFolderClick?: (folderId: string) => void;
  onEdit?: (file: FormatFileData) => void;
  onDownload?: (file: FormatFileData) => void;
  onDelete?: (file: FormatFileData) => void;
  /** フォルダ削除ハンドラ（フォルダ行に削除ボタンを表示するために必要） */
  onDeleteFolder?: (file: FormatFileData) => void;
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
  onDownload,
  onDelete,
  onDeleteFolder,
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
        <div>
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
          {!record.isFolder && record.description && (
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                {record.description}
              </Text>
            </div>
          )}
        </div>
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
      width: 200,
      align: 'center',
      render: (_text: string, record: FormatFileData) => {
        // フォルダ行: 削除ボタンのみ表示（onDeleteFolder が渡されている場合）
        // ただし「↑ 戻る」エントリ（id === 'back'）には表示しない
        if (record.isFolder) {
          if (!onDeleteFolder || record.id === 'back') return null;
          return (
            <Space size="small">
              <Button
                type="default"
                size="small"
                danger
                icon={<DeleteOutlined />}
                data-testid={`folder-delete-button-${record.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(record);
                }}
              >
                削除
              </Button>
            </Space>
          );
        }

        return (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              style={{ backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }}
              data-testid={`file-edit-button-${record.name}`}
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
              data-testid={`file-download-button-${record.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onDownload?.(record);
              }}
            >
              ダウンロード
            </Button>
            <Button
              type="default"
              danger
              size="small"
              icon={<DeleteOutlined />}
              data-testid={`file-delete-button-${record.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(record);
                console.log('Delete file:', record.name);
              }}
            >
              削除
            </Button>
          </Space>
        );
      },
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

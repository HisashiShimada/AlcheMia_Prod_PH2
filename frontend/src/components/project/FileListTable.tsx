'use client';

import React, { useState } from 'react';
import {
  Table,
  Button,
  Tooltip,
  Space,
  Empty,
  message,
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
import {
  getFileDownloadUrlByKey,
} from '@/services/fileAccessService';
import type { ProjectFile } from '@/types/file';
import { useLanguage } from '@/contexts/LanguageContext';

interface FileListTableProps {
  files: ProjectFile[];
  projectId: string;
  onFileClick?: (file: ProjectFile) => void;
  onFolderClick?: (folderId: string) => void;
  onViewFile?: (file: ProjectFile) => void;
}

/**
 * ファイル一覧テーブルコンポーネント
 */
const FileListTable: React.FC<FileListTableProps> = ({ 
  files, 
  projectId, 
  onFileClick, 
  onFolderClick, 
  onViewFile 
}) => {
  const { token } = theme.useToken();
  const { t } = useLanguage();
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  /**
   * ファイルダウンロード処理（プロキシ方式）
   * バックエンド経由でファイルを直接ダウンロード
   */
  const handleDownloadFile = async (file: ProjectFile) => {
    try {
      setDownloadingFileId(file.id);

      // ファイルパスが存在するか確認
      if (!file.path || file.path.trim() === '') {
        throw new Error(t('projectManagement.fileManagement.messages.filePathMissing'));
      }

      // ファイルキーベースで直接ダウンロード（プロキシ方式）
      await getFileDownloadUrlByKey(file.path);

      // 成功メッセージ表示
      message.success(
        t('projectManagement.fileManagement.messages.downloadStarted').replace('{{fileName}}', file.name)
      );
    } catch (error) {
      console.error('ファイルダウンロードエラー:', error);
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      message.error(
        t('projectManagement.fileManagement.messages.downloadError').replace('{{error}}', errorMsg)
      );
    } finally {
      setDownloadingFileId(null);
    }
  };
  
  // ファイルタイプに応じたアイコンを取得
  const getFileIcon = (file: ProjectFile) => {
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

  const columns: ColumnsType<ProjectFile> = [
    {
      title: t('projectManagement.fileManagement.table.type'),
      key: 'type',
      width: 50,
      align: 'center',
      render: (_text: string, record: ProjectFile) => getFileIcon(record),
    },
    {
      title: t('projectManagement.fileManagement.table.fileName'),
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name, 'ja'),
      render: (text: string, record: ProjectFile) => (
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
      title: t('projectManagement.fileManagement.table.size'),
      key: 'size',
      width: 120,
      sorter: (a, b) => a.size - b.size,
      render: (_text: string, record: ProjectFile) =>
        !record.isFolder ? (
          <span style={{ color: token.colorTextSecondary }}>{formatFileSize(record.size)}</span>
        ) : null,
    },
    {
      title: t('projectManagement.fileManagement.table.lastModified'),
      key: 'lastModified',
      width: 150,
      sorter: (a, b) => new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime(),
      render: (_text: string, record: ProjectFile) =>
        !record.isFolder ? (
          <span style={{ color: token.colorTextSecondary }}>{formatRelativeTime(record.lastModified)}</span>
        ) : null,
    },
    {
      title: t('projectManagement.fileManagement.table.actions'),
      key: 'actions',
      width: 220,
      align: 'center',
      render: (_text: string, record: ProjectFile) =>
        !record.isFolder ? (
          <Space size="small">
            <Button
              type="default"
              size="small"
              icon={<DownloadOutlined />}
              loading={downloadingFileId === record.id}
              disabled={downloadingFileId !== null}
              data-testid="file-download-button"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadFile(record);
              }}
            >
              {t('projectManagement.fileManagement.buttons.download')}
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              style={{ backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }}
              data-testid="file-viewer-button"
              onClick={(e) => {
                e.stopPropagation();
                onViewFile?.(record);
              }}
            >
              {t('projectManagement.fileManagement.buttons.viewer')}
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
        emptyText: <Empty description={t('projectManagement.fileManagement.emptyState')} image={Empty.PRESENTED_IMAGE_SIMPLE} />,
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

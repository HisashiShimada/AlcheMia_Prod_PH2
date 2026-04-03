'use client';

import React, { useState } from 'react';
import {
  Table,
  Button,
  Tooltip,
  Space,
  Empty,
  Dropdown,
  message,
  theme,
} from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileTextOutlined,
  FileOutlined,
  TableOutlined,
  FolderOpenOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
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
  /** 現在表示中のフォルダパス（'root' またはパス文字列） */
  currentFolder?: string;
  onFileClick?: (file: ProjectFile) => void;
  onFolderClick?: (folderId: string) => void;
  onViewFile?: (file: ProjectFile) => void;
  onDeleteFile?: (file: ProjectFile) => void;
}

/**
 * フォルダ名（フルパスを含む可能性あり）から表示用の末尾セグメントのみを返す
 * 例: "rawdata/sub/" → "sub", "rawdata" → "rawdata"
 */
const extractFolderDisplayName = (name: string): string => {
  const parts = name.split('/').filter(s => s !== '');
  return parts[parts.length - 1] || name;
};

/**
 * ファイル一覧テーブルコンポーネント
 */
const FileListTable: React.FC<FileListTableProps> = ({ 
  files, 
  projectId, 
  onFileClick, 
  onFolderClick, 
  onViewFile,
  onDeleteFile
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
      render: (text: string, record: ProjectFile) => {
        // フォルダ名がフルパス（"rawdata/sub/" など）の場合、末尾スラッシュを除いた最後のセグメントのみ表示
        const getDisplayName = (name: string) => {
          if (!record.isFolder || !name.includes('/')) return name;
          // 末尾スラッシュを除いてから空でないセグメントの最後を取得
          const parts = name.split('/').filter(s => s !== '');
          return parts[parts.length - 1] || name;
        };
        const displayName = getDisplayName(text);
        return (
          <Tooltip title={record.path} placement="topLeft">
            <span
              style={{
                fontWeight: record.isFolder ? token.fontWeightStrong : 'normal',
                color: record.isFolder ? token.colorWarning : 'inherit',
                cursor: record.isFolder ? 'pointer' : 'inherit',
              }}
            >
              {displayName}
              {record.isFolder && record.fileCount !== undefined && ` (${record.fileCount})`}
            </span>
          </Tooltip>
        );
      },
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
      width: 280,
      align: 'center',
      render: (_text: string, record: ProjectFile) => {
        if (record.isFolder) return null;

        // ドロップダウンメニューの項目
        const menuItems: MenuProps['items'] = [
          {
            key: 'rename',
            label: '名前の変更',
            icon: <EditOutlined />,
            onClick: () => {
              console.log('ファイルリネームボタンがクリックされました:', record.name);
              message.info('名前の変更機能は未実装です');
            },
          },
          {
            type: 'divider',
          },
          {
            key: 'delete',
            label: '削除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
              console.log('ファイル削除ボタンがクリックされました:', record.name);
              onDeleteFile?.(record);
            },
          },
        ];

        return (
          <Space size="small">
            <Dropdown
              menu={{ items: menuItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button
                type="default"
                size="small"
                icon={<MoreOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              />
            </Dropdown>
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
        emptyText: <Empty description={t('projectManagement.fileManagement.emptyState')} image={Empty.PRESENTED_IMAGE_SIMPLE} />,
      }}
      onRow={(record) => ({
        onClick: () => {
          if (record.isFolder) {
            if (record.id === 'back') {
              onFolderClick?.('back');
            } else {
              // フォルダ名がフルパスの場合は末尾セグメントのみ渡す
              onFolderClick?.(extractFolderDisplayName(record.name));
            }
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

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
  Modal,
  Form,
  Input,
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
  WarningOutlined,
} from '@ant-design/icons';
import { formatFileSize, formatRelativeTime } from '@/utils/formatters';
import {
  getFileDownloadUrlByKey,
  renameFile,
} from '@/services/fileAccessService';
import type { ProjectFile } from '@/types/file';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MaimlAnalysisResultRow } from '@/services/maimlApiService';

interface FileListTableProps {
  files: ProjectFile[];
  projectId: string;
  /** 現在表示中のフォルダパス（'root' またはパス文字列） */
  currentFolder?: string;
  onFileClick?: (file: ProjectFile) => void;
  onFolderClick?: (folderId: string) => void;
  onViewFile?: (file: ProjectFile) => void;
  onDeleteFile?: (file: ProjectFile) => void;
  /** フォルダ削除ハンドラ（フォルダ行に削除ボタンを表示するために必要） */
  onDeleteFolder?: (file: ProjectFile) => void;
  /** ファイル名変更後に呼び出すコールバック（ファイル一覧再取得用） */
  onRenameFile?: () => void;
  /** MAIMLバリデーション結果（DB保存済み）。MAIMLファイル行に警告アイコンを表示するために使用 */
  maimlValidationRow?: MaimlAnalysisResultRow | null;
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
  onDeleteFile,
  onDeleteFolder,
  onRenameFile,
  maimlValidationRow,
}) => {
  const { token } = theme.useToken();
  const { t } = useLanguage();
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // ---- リネームモーダル ----
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renamingFile, setRenamingFile] = useState<ProjectFile | null>(null);
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameForm] = Form.useForm<{ newFileName: string }>();

  /** 「名前の変更」メニューをクリックしたときの処理 */
  const handleOpenRenameModal = (file: ProjectFile) => {
    setRenamingFile(file);
    // 拡張子を除いたベース名のみをデフォルト値にセット
    const dotIdx = file.name.lastIndexOf('.');
    const baseName = dotIdx > 0 ? file.name.substring(0, dotIdx) : file.name;
    renameForm.setFieldsValue({ newFileName: baseName });
    setRenameModalOpen(true);
  };

  /** モーダルの「OK」 */
  const handleRenameConfirm = async () => {
    if (!renamingFile) return;

    const values = await renameForm.validateFields();
    const baseName = values.newFileName.trim();

    // 拡張子を取得してベース名と結合
    const dotIdx = renamingFile.name.lastIndexOf('.');
    const ext = dotIdx > 0 ? renamingFile.name.substring(dotIdx) : '';
    const newFileName = baseName + ext;

    // 変更なし
    if (newFileName === renamingFile.name) {
      setRenameModalOpen(false);
      return;
    }

    setRenameLoading(true);
    try {
      const result = await renameFile({
        fileKey: renamingFile.path,
        newFileName,
      });

      if (!result.success) {
        const errMsg = result.error?.message ?? 'ファイル名の変更に失敗しました';
        message.error(errMsg);
        return;
      }

      message.success(`「${renamingFile.name}」を「${newFileName}」に変更しました`);
      setRenameModalOpen(false);
      // ファイル一覧を再取得
      onRenameFile?.();
    } catch (error) {
      console.error('ファイル名変更エラー:', error);
      const errMsg = error instanceof Error ? error.message : 'ファイル名の変更に失敗しました';
      message.error(errMsg);
    } finally {
      setRenameLoading(false);
    }
  };

  /** モーダルのキャンセル */
  const handleRenameCancel = () => {
    setRenameModalOpen(false);
    setRenamingFile(null);
    renameForm.resetFields();
  };

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

        // MAIMLファイルのバリデーション警告アイコン
        const maimlWarningIcon = (() => {
          if (record.type !== 'maiml' || !maimlValidationRow) return null;
          // JSONB は node-postgres が自動でオブジェクトに変換する場合がある。
          // 文字列なら JSON.parse、すでに配列ならそのまま使う。
          const parseField = (v: unknown): unknown[] => {
            if (Array.isArray(v)) return v;
            if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } }
            return [];
          };
          let errCount = 0;
          let warnCount = 0;
          try { errCount = parseField(maimlValidationRow.errors).length; } catch {}
          try { warnCount = parseField(maimlValidationRow.warnings).length; } catch {}
          if (errCount > 0) {
            return (
              <Tooltip title={`バリデーションエラーあり（${errCount}件）`}>
                <WarningOutlined style={{ color: token.colorError, marginLeft: 6, fontSize: 14 }} />
              </Tooltip>
            );
          }
          if (warnCount > 0) {
            return (
              <Tooltip title={`バリデーション警告あり（${warnCount}件）`}>
                <WarningOutlined style={{ color: token.colorWarning, marginLeft: 6, fontSize: 14 }} />
              </Tooltip>
            );
          }
          return null;
        })();

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
              {maimlWarningIcon}
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
        // フォルダ行: 削除ボタンのみ表示（onDeleteFolder が渡されている場合）
        if (record.isFolder) {
          if (!onDeleteFolder) return null;
          return (
            <Space size="small">
              <Button
                type="default"
                size="small"
                danger
                icon={<DeleteOutlined />}
                data-testid="folder-delete-button"
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

        // ドロップダウンメニューの項目
        const menuItems: MenuProps['items'] = [
          {
            key: 'rename',
            label: <span data-testid="file-menu-rename">名前の変更</span>,
            icon: <EditOutlined />,
            onClick: (info) => {
              info.domEvent.stopPropagation();
              handleOpenRenameModal(record);
            },
          },
          {
            type: 'divider',
          },
          {
            key: 'delete',
            label: <span data-testid="file-menu-delete">削除</span>,
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
                data-testid="file-more-menu-button"
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
    <>
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

      {/* ファイル名変更モーダル */}
      <Modal
        title="名前の変更"
        open={renameModalOpen}
        onOk={handleRenameConfirm}
        onCancel={handleRenameCancel}
        okText="変更"
        cancelText="キャンセル"
        confirmLoading={renameLoading}
        width={420}
        destroyOnClose
      >
        <Form form={renameForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="newFileName"
            label="新しいファイル名"
            rules={[
              { required: true, message: 'ファイル名を入力してください' },
              { whitespace: true, message: 'ファイル名に空白のみは使用できません' },
              { max: 255, message: 'ファイル名は255文字以内で入力してください' },
            ]}
          >
            <Input
              autoFocus
              placeholder="ファイル名を入力"
              onPressEnter={handleRenameConfirm}
              addonAfter={
                renamingFile && renamingFile.name.lastIndexOf('.') > 0
                  ? renamingFile.name.substring(renamingFile.name.lastIndexOf('.'))
                  : undefined
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default FileListTable;

'use client';

import React, { useState } from 'react';
import {
  App,
  Table,
  Button,
  Tooltip,
  Space,
  Empty,
  Dropdown,
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
import { formatFileSize, formatRelativeTime } from '@/utils/formatUtils';
import {
  getFileDownloadUrlByKey,
  renameFile,
} from '@/services/fileAccessService';
import type { ProjectFile } from '@/types/file';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MaimlAnalysisResultRow } from '@/types/maimlEditor';

interface FileListTableProps {
files: ProjectFile[];
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
  /** 編集権限フラグ。false の場合は変更系ボタンを非活性にする */
  isEditable?: boolean;
  /** プロジェクト完了フラグ。true の場合は変更系ボタンを非活性にする */
  isProjectCompleted?: boolean;
  /** チェックアウト中フラグ。true の場合は変更系ボタンを非活性にする */
  isCheckoutLocked?: boolean;
}

/**
 * ファイル一覧テーブルコンポーネント
 */
const FileListTable: React.FC<FileListTableProps> = ({ 
  files, 
  onFileClick, 
  onFolderClick, 
  onViewFile,
  onDeleteFile,
  onDeleteFolder,
  onRenameFile,
  maimlValidationRow,
  isEditable = true,
  isProjectCompleted = false,
  isCheckoutLocked = false,
}) => {
  const { token } = theme.useToken();
  const { message } = App.useApp();
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
        message.error(t('projectManagement.fileManagement.messages.renameFailed'));
        return;
      }

      message.success(
        t('projectManagement.fileManagement.messages.renameSuccess', { oldName: renamingFile.name, newName: newFileName })
      );
      setRenameModalOpen(false);
      // ファイル一覧を再取得
      onRenameFile?.();
    } catch (error) {
      console.error('ファイル名変更エラー:', error);
      message.error(t('projectManagement.fileManagement.messages.renameFailed'));
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
        t('projectManagement.fileManagement.messages.downloadStarted', { fileName: file.name })
      );
    } catch (error) {
      console.error('ファイルダウンロードエラー:', error);
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      message.error(
        t('projectManagement.fileManagement.messages.downloadError', { error: errorMsg })
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
              <Tooltip title={`${t('file.validationErrors')} (${errCount})`}>
                <WarningOutlined style={{ color: token.colorError, marginLeft: 6, fontSize: 14 }} />
              </Tooltip>
            );
          }
          if (warnCount > 0) {
            return (
              <Tooltip title={`${t('file.validationWarnings')} (${warnCount})`}>
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
                disabled={!isEditable || isProjectCompleted || isCheckoutLocked}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(record);
                }}
              >
                {t('common.delete')}
              </Button>
            </Space>
          );
        }

        // ドロップダウンメニューの項目
        const isDeleteDisabled = !isEditable || isProjectCompleted || isCheckoutLocked;
        const menuItems: MenuProps['items'] = [
          {
            key: 'rename',
            label: <span data-testid="file-menu-rename">{t('file.renameMenuLabel')}</span>,
            icon: <EditOutlined />,
            disabled: isDeleteDisabled,
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
            label: <span data-testid="file-menu-delete">{t('common.delete')}</span>,
            icon: <DeleteOutlined />,
            danger: true,
            disabled: isDeleteDisabled,
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
        title={t('file.renameModalTitle')}
        open={renameModalOpen}
        onOk={handleRenameConfirm}
        onCancel={handleRenameCancel}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        confirmLoading={renameLoading}
        width={420}
        destroyOnHidden
      >
        <Form form={renameForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="newFileName"
            label={t('file.renameNewNameLabel')}
            rules={[
              { required: true, message: t('file.renameRequired') },
              { whitespace: true, message: t('file.renameNoWhitespace') },
              { max: 255, message: t('file.renameMaxLength') },
            ]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input
                autoFocus
                placeholder={t('file.renameInputPlaceholder')}
                onPressEnter={handleRenameConfirm}
              />
              {renamingFile && renamingFile.name.lastIndexOf('.') > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0 11px',
                    background: 'rgba(0,0,0,0.02)',
                    border: '1px solid #d9d9d9',
                    borderLeft: 'none',
                    borderRadius: '0 6px 6px 0',
                    whiteSpace: 'nowrap',
                    lineHeight: '30px',
                  }}
                >
                  {renamingFile.name.substring(renamingFile.name.lastIndexOf('.'))}
                </span>
              )}
            </Space.Compact>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default FileListTable;

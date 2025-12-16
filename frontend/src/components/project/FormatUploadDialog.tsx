/**
 * FormatUploadDialog.tsx
 * フォーマット管理画面用の一括ファイルアップロードダイアログ
 * Ant Design v6を使用し、UIポリシーに準拠
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Modal,
  Segmented,
  Upload,
  Button,
  Cascader,
  Checkbox,
  Alert,
  Progress,
  Space,
  Typography,
  Divider,
  message,
} from 'antd';
import {
  UploadOutlined,
  InboxOutlined,
  FolderOutlined,
  FileOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps, RcFile } from 'antd/es/upload/interface';
import type { DefaultOptionType } from 'antd/es/cascader';

const { Text } = Typography;
const { Dragger } = Upload;

/**
 * アップロードモード
 */
type UploadMode = 'single' | 'bulk' | 'folder';

/**
 * アップロード状態
 */
interface UploadState {
  isUploading: boolean;
  progress: number;
  uploadedCount: number;
  totalCount: number;
  error: string | null;
}

/**
 * プロパティ
 */
interface FormatUploadDialogProps {
  /** ダイアログの表示/非表示 */
  open: boolean;
  /** 閉じるハンドラ */
  onClose: () => void;
  /** アップロード完了ハンドラ */
  onUploadComplete?: (result: {
    mode: UploadMode;
    fileCount: number;
    success: boolean;
  }) => void;
  /** ベースフォルダ（選択されたフォーマット） */
  baseFolder: {
    id: string;
    name: string;
    folderName: string;
  } | null;
  /** ベースフォルダ配下のサブフォルダ一覧 */
  subFolders?: Array<{
    value: string;
    label: string;
    children?: Array<{
      value: string;
      label: string;
    }>;
  }>;
}

/**
 * ファイルサイズをフォーマット
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * フォーマット用アップロードダイアログコンポーネント
 */
const FormatUploadDialog: React.FC<FormatUploadDialogProps> = ({
  open,
  onClose,
  onUploadComplete,
  baseFolder,
  subFolders = [],
}) => {
  // 状態管理
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedSubFolder, setSelectedSubFolder] = useState<string[]>([]);
  const [preserveFolderStructure, setPreserveFolderStructure] = useState<boolean>(true);
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    uploadedCount: 0,
    totalCount: 0,
    error: null,
  });

  // Refs
  const folderInputRef = useRef<HTMLInputElement>(null);

  /**
   * モード変更時のファイルリストクリア
   */
  const handleModeChange = useCallback((value: string | number) => {
    setUploadMode(value as UploadMode);
    setFileList([]);
  }, []);

  /**
   * ファイル選択時の処理
   */
  const handleFileChange: UploadProps['onChange'] = useCallback(
    (info: { fileList: UploadFile[] }) => {
      let newFileList = [...info.fileList];
      
      // 単一ファイルモードの場合は1つのみ
      if (uploadMode === 'single') {
        newFileList = newFileList.slice(-1);
      }

      setFileList(newFileList);
    },
    [uploadMode]
  );

  /**
   * ファイル選択前の処理（実際のアップロードは行わない）
   */
  const beforeUpload = useCallback(() => {
    return false; // 自動アップロードを無効化
  }, []);

  /**
   * フォルダ選択ハンドラ
   */
  const handleFolderSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const uploadFiles: UploadFile[] = Array.from(files).map((file, index) => {
        const fileWithPath = file as File & { webkitRelativePath?: string };
        const rcFile = file as RcFile;
        rcFile.uid = `${Date.now()}-${index}`;
        
        return {
          uid: rcFile.uid,
          name: fileWithPath.webkitRelativePath || file.name,
          status: 'done' as const,
          size: file.size,
          type: file.type,
          originFileObj: rcFile,
        };
      });

      setFileList(uploadFiles);
    },
    []
  );

  /**
   * アップロード実行
   */
  const handleUpload = useCallback(async () => {
    if (fileList.length === 0) {
      message.warning('ファイルを選択してください');
      return;
    }

    if (!baseFolder) {
      message.error('ベースフォルダが選択されていません');
      return;
    }

    setUploadState({
      isUploading: true,
      progress: 0,
      uploadedCount: 0,
      totalCount: fileList.length,
      error: null,
    });

    try {
      // ここに実際のアップロード処理を実装
      // 現在はモック動作
      for (let i = 0; i < fileList.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setUploadState((prev) => ({
          ...prev,
          uploadedCount: i + 1,
          progress: Math.round(((i + 1) / fileList.length) * 100),
        }));
      }

      message.success('アップロードが完了しました');
      
      if (onUploadComplete) {
        onUploadComplete({
          mode: uploadMode,
          fileCount: fileList.length,
          success: true,
        });
      }

      // 完了後の状態リセット
      setTimeout(() => {
        setFileList([]);
        setUploadState({
          isUploading: false,
          progress: 0,
          uploadedCount: 0,
          totalCount: 0,
          error: null,
        });
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'アップロードに失敗しました';
      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        error: errorMessage,
      }));
      message.error(errorMessage);
    }
  }, [fileList, uploadMode, onUploadComplete, baseFolder]);

  /**
   * ダイアログを閉じる
   */
  const handleClose = useCallback(() => {
    if (uploadState.isUploading) {
      Modal.confirm({
        title: 'アップロード中',
        content: 'アップロード処理が進行中です。キャンセルしますか？',
        okText: 'はい',
        cancelText: 'いいえ',
        onOk: onClose,
      });
    } else {
      onClose();
    }
  }, [uploadState.isUploading, onClose]);

  /**
   * サブフォルダ選択ハンドラ
   */
  const handleSubFolderChange = useCallback((value: (string | number | null)[]) => {
    // nullを除外し、すべてstringに変換してstateに保存
    const filteredValue = value
      .filter((v): v is string | number => v !== null)
      .map(v => String(v));
    setSelectedSubFolder(filteredValue);
  }, []);

  /**
   * 選択されたフォルダパスを文字列に変換
   */
  const selectedFolderPathString = useMemo(() => {
    if (!baseFolder) return '';
    
    if (selectedSubFolder.length === 0) {
      return baseFolder.folderName;
    }
    
    return `${baseFolder.folderName}/${selectedSubFolder.join('/')}`;
  }, [baseFolder, selectedSubFolder]);

  /**
   * Cascaderのプレースホルダー（モードに応じて変更）
   */
  const cascaderPlaceholder = useMemo(() => {
    if (subFolders.length === 0) {
      return 'サブフォルダなし';
    }
    if (uploadMode === 'single') {
      return 'サブフォルダを選択（省略可）';
    }
    return 'サブフォルダを選択（省略可）';
  }, [uploadMode, subFolders.length]);

  /**
   * サブフォルダレベルで選択可能かどうか（一括ファイル・フォルダタブのみ）
   */
  const changeOnSelect = useMemo(() => {
    return uploadMode === 'bulk' || uploadMode === 'folder';
  }, [uploadMode]);

  /**
   * ファイルリストの合計サイズ計算
   */
  const totalSize = fileList.reduce(
    (sum, file) => sum + (file.size || 0),
    0
  );

  // ベースフォルダが選択されていない場合のメッセージ
  if (!baseFolder) {
    return (
      <Modal
        title="ファイルアップロード"
        open={open}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            閉じる
          </Button>,
        ]}
      >
        <Alert
          message="フォーマットが選択されていません"
          description="先にフォーマットを選択してください。"
          type="warning"
          showIcon
        />
      </Modal>
    );
  }

  return (
    <Modal
      title="ファイルアップロード"
      open={open}
      onCancel={handleClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={uploadState.isUploading}>
          キャンセル
        </Button>,
        <Button
          key="upload"
          type="primary"
          onClick={handleUpload}
          disabled={fileList.length === 0 || uploadState.isUploading}
          icon={uploadState.isUploading ? <LoadingOutlined /> : <UploadOutlined />}
        >
          {uploadState.isUploading ? 'アップロード中...' : 'アップロード開始'}
        </Button>,
      ]}
      styles={{
        body: { maxHeight: '70vh', overflowY: 'auto' },
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* アップロードタイプ選択 */}
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            アップロードタイプ
          </Text>
          <Segmented
            value={uploadMode}
            onChange={handleModeChange}
            disabled={uploadState.isUploading}
            block
            options={[
              {
                label: '単一ファイル',
                value: 'single',
                icon: <FileOutlined />,
              },
              {
                label: '一括ファイル',
                value: 'bulk',
                icon: <InboxOutlined />,
              },
              {
                label: 'フォルダ',
                value: 'folder',
                icon: <FolderOutlined />,
              },
            ]}
          />
        </div>

        {/* ファイル選択エリア */}
        {uploadMode === 'folder' ? (
          <div>
            <Button
              icon={<FolderOutlined />}
              onClick={() => folderInputRef.current?.click()}
              disabled={uploadState.isUploading}
              block
              size="large"
            >
              フォルダを選択
            </Button>
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error - webkitdirectory is not in standard HTML attributes
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFolderSelect}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <Dragger
            fileList={fileList}
            onChange={handleFileChange}
            beforeUpload={beforeUpload}
            multiple={uploadMode !== 'single'}
            disabled={uploadState.isUploading}
            accept=".maiml,.xml,.json,.txt,.csv,.png,.jpg,.jpeg,.gif,.pdf,.tif,.tiff,.bmp,.svg,.webp"
            showUploadList={false}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: 48, color: '#0093CF' }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 16 }}>
              ファイルをドラッグ&ドロップ
            </p>
            <p className="ant-upload-hint" style={{ fontSize: 14 }}>
              または、クリックしてファイルを選択
            </p>
          </Dragger>
        )}

        {/* 選択ファイル表示 */}
        {fileList.length > 0 && (
          <div
            style={{
              backgroundColor: '#f5f5f5',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>選択ファイル ({fileList.length}個)</Text>
              <div
                style={{
                  maxHeight: 200,
                  overflowY: 'auto',
                }}
              >
                {fileList.slice(0, 10).map((file) => (
                  <div
                    key={file.uid}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                    }}
                  >
                    <Text
                      ellipsis
                      style={{ flex: 1, fontSize: 13 }}
                      title={file.name}
                    >
                      {file.name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
                      {formatFileSize(file.size || 0)}
                    </Text>
                  </div>
                ))}
                {fileList.length > 10 && (
                  <div style={{ textAlign: 'center', padding: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      他 {fileList.length - 10} ファイル...
                    </Text>
                  </div>
                )}
              </div>
              <div
                style={{
                  backgroundColor: '#E6F7FC',
                  borderRadius: 6,
                  padding: '8px 12px',
                  marginTop: 8,
                }}
              >
                <Text style={{ fontSize: 12, color: '#007AB3' }}>
                  総サイズ: {formatFileSize(totalSize)}
                </Text>
              </div>
            </Space>
          </div>
        )}

        <Divider style={{ margin: '12px 0' }} />

        {/* オプション設定 */}
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              アップロード先フォルダ
            </Text>
            {/* ベースフォルダ表示 */}
            <div
              style={{
                marginBottom: 8,
                padding: '8px 12px',
                backgroundColor: '#F0F0F0',
                borderRadius: 6,
                border: '1px solid #D9D9D9',
              }}
            >
              <Text style={{ fontSize: 13, color: '#595959' }}>
                ベースフォルダ: <Text strong>{baseFolder.name}</Text>
              </Text>
            </div>
            
            {/* サブフォルダ選択 */}
            {subFolders.length > 0 && (
              <Cascader
                options={subFolders}
                value={selectedSubFolder}
                onChange={handleSubFolderChange}
                placeholder={cascaderPlaceholder}
                disabled={uploadState.isUploading}
                expandTrigger="hover"
                showSearch
                changeOnSelect={changeOnSelect}
                style={{ width: '100%' }}
                allowClear
              />
            )}
            
            {selectedFolderPathString && (
              <div
                style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  backgroundColor: '#E6F7FC',
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 12, color: '#007AB3' }}>
                  選択パス: {selectedFolderPathString}
                </Text>
              </div>
            )}
          </div>

          {(uploadMode === 'bulk' || uploadMode === 'folder') && (
            <Checkbox
              checked={preserveFolderStructure}
              onChange={(e) => setPreserveFolderStructure(e.target.checked)}
              disabled={uploadState.isUploading}
            >
              フォルダ構造を保持する
            </Checkbox>
          )}
        </Space>

        {/* アップロード進行状況 */}
        {uploadState.isUploading && (
          <Alert
            message="アップロード中"
            description={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text>
                  {uploadState.uploadedCount} / {uploadState.totalCount} ファイル完了
                </Text>
                <Progress percent={uploadState.progress} status="active" />
              </Space>
            }
            type="info"
            showIcon
            icon={<LoadingOutlined />}
          />
        )}

        {/* アップロード完了 */}
        {!uploadState.isUploading && uploadState.progress === 100 && (
          <Alert
            message="アップロード完了"
            description={`${uploadState.totalCount}個のファイルが正常にアップロードされました`}
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
          />
        )}

        {/* エラー表示 */}
        {uploadState.error && (
          <Alert
            message="アップロードエラー"
            description={uploadState.error}
            type="error"
            showIcon
            icon={<CloseCircleOutlined />}
            closable
            onClose={() =>
              setUploadState((prev) => ({ ...prev, error: null }))
            }
          />
        )}
      </Space>
    </Modal>
  );
};

export default FormatUploadDialog;

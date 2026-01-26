/**
 * BulkUploadDialog.tsx
 * プロジェクト管理画面用の一括ファイルアップロードダイアログ
 * Ant Design v6を使用し、UIポリシーに準拠
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { fileService } from '@/services/fileService';
import { extractErrorMessage } from '@/utils/errorUtils';
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

const { Title, Text, Paragraph } = Typography;
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
interface BulkUploadDialogProps {
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
  /** 事前選択されたフォルダパス */
  preselectedFolder?: string;
  /** プロジェクトID（必須） */
  projectId: string;
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
 * フォルダ構造のモックデータ
 * 部門 → プロジェクト の2階層構造
 * 組織は所属組織に固定されるため、部門から選択
 */
const folderStructureOptions: DefaultOptionType[] = [
  {
    value: 'dept_research',
    label: 'dept_research (研究部門)',
    children: [
      { value: 'project_001', label: 'project_001 (合金開発プロジェクト)' },
      { value: 'project_002', label: 'project_002 (セラミックス研究)' },
      { value: 'project_003', label: 'project_003 (複合材料開発)' },
    ],
  },
  {
    value: 'dept_analysis',
    label: 'dept_analysis (分析部門)',
    children: [
      { value: 'project_101', label: 'project_101 (構造解析)' },
      { value: 'project_102', label: 'project_102 (物性測定)' },
    ],
  },
  {
    value: 'dept_synthesis',
    label: 'dept_synthesis (合成部門)',
    children: [
      { value: 'project_201', label: 'project_201 (有機合成)' },
      { value: 'project_202', label: 'project_202 (無機合成)' },
    ],
  },
  {
    value: 'dept_catalysis',
    label: 'dept_catalysis (触媒部門)',
    children: [
      { value: 'project_301', label: 'project_301 (触媒開発)' },
      { value: 'project_302', label: 'project_302 (反応解析)' },
    ],
  },
  {
    value: 'dept_quantum',
    label: 'dept_quantum (量子物理部門)',
    children: [
      { value: 'project_401', label: 'project_401 (量子材料)' },
      { value: 'project_402', label: 'project_402 (超伝導研究)' },
    ],
  },
];

/**
 * 一括アップロードダイアログコンポーネント
 */
const BulkUploadDialog: React.FC<BulkUploadDialogProps> = ({
  open,
  onClose,
  onUploadComplete,
  preselectedFolder = '',
  projectId,
}) => {
  // 状態管理
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedFolderPath, setSelectedFolderPath] = useState<(string | number)[]>(() => {
    // preselectedFolderから初期値を計算
    if (preselectedFolder) {
      const pathParts = preselectedFolder.split('/').filter(part => part.length > 0);
      return pathParts.length > 0 ? pathParts : [];
    }
    return [];
  });
  const [batchName, setBatchName] = useState<string>('');
  const [preserveFolderStructure, setPreserveFolderStructure] = useState<boolean>(true);
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    uploadedCount: 0,
    totalCount: 0,
    error: null,
  });

  // 所属組織（実際のアプリケーションではログイン情報から取得）
  const userOrganization = useMemo(() => ({
    id: 'org_materials',
    name: 'org_materials (材料科学組織)',
  }), []);

  // Refs
  const folderInputRef = useRef<HTMLInputElement>(null);

  /**
   * モード変更時のファイルリストクリア
   */
  const handleModeChange = useCallback((value: string | number) => {
    setUploadMode(value as UploadMode);
    setFileList([]);
    setBatchName('');
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

      // バッチ名の自動生成
      if (newFileList.length === 1) {
        setBatchName(`単一アップロード: ${newFileList[0].name}`);
      } else if (newFileList.length > 1) {
        setBatchName(`一括アップロード ${newFileList.length}ファイル`);
      }
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

      // フォルダ名を推測
      const firstFileWithPath = files[0] as File & { webkitRelativePath?: string };
      if (files[0] && firstFileWithPath.webkitRelativePath) {
        const folderName = firstFileWithPath.webkitRelativePath.split('/')[0];
        setBatchName(`フォルダアップロード: ${folderName}`);
      }
    },
    []
  );

  /**
   * 選択されたフォルダパスを文字列に変換（組織を含む完全パス）
   */
  const selectedFolderPathString = useMemo(() => {
    if (selectedFolderPath.length === 0) {
      return '';
    }
    // 組織を先頭に追加
    return `${userOrganization.id}/${selectedFolderPath.join('/')}`;
  }, [selectedFolderPath, userOrganization.id]);

  /**
   * アップロード実行
   */
  const handleUpload = useCallback(async () => {
    if (fileList.length === 0) {
      message.warning('ファイルを選択してください');
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
      // originFileObjを抽出してFile型に変換
      const files = fileList
        .map(f => f.originFileObj)
        .filter((f): f is RcFile => !!f)
        .map(f => f as unknown as File);

      // API呼び出し
      const response = await fileService.uploadFiles({
        projectId,
        uploadMode,
        targetFolder: selectedFolderPathString,
        files,
        batchName: batchName || undefined,
        preserveFolderStructure: uploadMode !== 'single' && preserveFolderStructure,
        onProgress: (progress) => {
          setUploadState(prev => ({
            ...prev,
            progress: progress.percentage,
            uploadedCount: progress.uploadedCount,
          }));
        },
      });

      if (response.success) {
        message.success('アップロードが完了しました');
        
        if (onUploadComplete) {
          onUploadComplete({
            mode: uploadMode,
            fileCount: fileList.length,
            success: true,
          });
        }

        // 完了後の状態リセット（2秒後）
        setTimeout(() => {
          setFileList([]);
          setBatchName('');
          setUploadState({
            isUploading: false,
            progress: 100,
            uploadedCount: fileList.length,
            totalCount: fileList.length,
            error: null,
          });
        }, 2000);
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage,
      }));
      message.error(errorMessage);
    }
  }, [fileList, uploadMode, projectId, selectedFolderPathString, batchName, preserveFolderStructure, onUploadComplete]);

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
   * フォルダパス選択ハンドラ
   */
  const handleFolderPathChange = useCallback((value: (string | number | null)[]) => {
    // nullを除外してstateに保存
    const filteredValue = value.filter((v): v is string | number => v !== null);
    setSelectedFolderPath(filteredValue);
  }, []);

  /**
   * Cascaderのプレースホルダー（モードに応じて変更）
   */
  const cascaderPlaceholder = useMemo(() => {
    if (uploadMode === 'single') {
      return 'プロジェクトを選択';
    }
    return '部門 または プロジェクト を選択';
  }, [uploadMode]);

  /**
   * 部門レベルで選択可能かどうか（一括ファイル・フォルダタブのみ）
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

  return (
    <Modal
      title="一括ファイルアップロード"
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
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
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
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
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
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              アップロード先フォルダ
            </Text>
            {/* 所属組織表示 */}
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
                所属組織: <Text strong>{userOrganization.name}</Text>
              </Text>
            </div>
            <Cascader
              options={folderStructureOptions}
              value={selectedFolderPath}
              onChange={handleFolderPathChange}
              placeholder={cascaderPlaceholder}
              disabled={uploadState.isUploading}
              expandTrigger="hover"
              showSearch
              changeOnSelect={changeOnSelect}
              style={{ width: '100%' }}
            />
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
              <Space orientation="vertical" size="small" style={{ width: '100%' }}>
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

export default BulkUploadDialog;

/**
 * BulkUploadDialog.tsx
 * プロジェクト管理画面用の一括ファイルアップロードダイアログ
 * Ant Design v6を使用し、UIポリシーに準拠
 */
import React, { useState, useCallback, useRef } from 'react';
import { uploadFiles, abortChunkUpload, cancelBatch } from '@/services/fileAccessService';
import { extractErrorMessage } from '@/utils/errorUtils';
import type { UploadRetryState, UploadResultSummary } from '@/types/file';
import {
  Modal,
  Segmented,
  Upload,
  Button,
  Input,
  Alert,
  Progress,
  Space,
  Typography,
  Divider,
  List,
  App,
} from 'antd';
import {
  UploadOutlined,
  InboxOutlined,
  FolderOutlined,
  FileOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps, RcFile } from 'antd/es/upload/interface';
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
    hasMaimlFile?: boolean; // ✨ Task: project_maiml_flg更新処理実装 - Phase 3
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
 * 一括アップロードダイアログコンポーネント
 */
const BulkUploadDialog: React.FC<BulkUploadDialogProps> = ({
  open,
  onClose,
  onUploadComplete,
  preselectedFolder = '',
  projectId,
}) => {
  const { message } = App.useApp();

  // 状態管理
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [subFolderPath, setSubFolderPath] = useState<string>('');
  const [batchName, setBatchName] = useState<string>('');
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    uploadedCount: 0,
    totalCount: 0,
    error: null,
  });
  /** リトライ状態（null = リトライなし） */
  const [retryState, setRetryState] = useState<UploadRetryState | null>(null);
  /** アップロードキャンセル用 AbortController */
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  /** バッチID（キャンセル時のサーバー側削除に使用） */
  const [batchId, setBatchId] = useState<string | null>(null);
  /** アップロード結果サマリー（null = 未完了） */
  const [resultSummary, setResultSummary] = useState<UploadResultSummary | null>(null);

  // Refs
  const folderInputRef = useRef<HTMLInputElement>(null);
  /** チャンクアップロード中のセッションID（キャンセル時に abort するために保持） */
  const activeUploadIdsRef = useRef<string[]>([]);

  /**
   * アップロード先パスを構築
   */
  const getTargetPath = useCallback(() => {
    if (!preselectedFolder) {
      return '';
    }
    
    // projects/{projectName} または projects/{projectName}/{subFolder}
    const basePath = `projects/${preselectedFolder}`;
    
    // サブフォルダパスから先頭・末尾のスラッシュを削除
    const cleanSubFolder = subFolderPath.trim().replace(/^\/+|\/+$/g, '');
    
    return cleanSubFolder ? `${basePath}/${cleanSubFolder}` : basePath;
  }, [preselectedFolder, subFolderPath]);

  /**
   * モード変更時のファイルリストクリア
   */
  const handleModeChange = useCallback((value: string | number) => {
    setUploadMode(value as UploadMode);
    setFileList([]);
    setBatchName('');
    setResultSummary(null);
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
      setResultSummary(null);

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

      const uploadFilesList: UploadFile[] = Array.from(files).map((file, index) => {
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

      setFileList(uploadFilesList);
      setResultSummary(null);

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
   * アップロード実行
   */
  const handleUpload = useCallback(async () => {
    if (fileList.length === 0) {
      message.warning('ファイルを選択してください');
      return;
    }

    if (!preselectedFolder) {
      message.error('プロジェクトが選択されていません');
      return;
    }

    // AbortController を作成
    const controller = new AbortController();
    setAbortController(controller);
    setResultSummary(null);
    setUploadState({
      isUploading: true,
      progress: 0,
      uploadedCount: 0,
      totalCount: fileList.length,
      error: null,
    });

    try {
      // originFileObjを抽出してFile型に変換
      // フォルダアップロードの場合、nameにパスを含む新しいFileオブジェクトを作成
      const files = fileList
        .map(f => {
          const originFile = f.originFileObj;
          if (!originFile) return null;
          
          // フォルダモードで、かつnameにパスが含まれている場合
          if (uploadMode === 'folder' && f.name.includes('/')) {
            return new File([originFile], f.name, {
              type: originFile.type,
              lastModified: originFile.lastModified,
            });
          }
          
          return originFile as File;
        })
        .filter((f): f is File => !!f);

      const targetPath = getTargetPath();

      // API呼び出し（onRetry でリトライ状態を UI に通知）
      const response = await uploadFiles({
        uploadMode,
        targetPath,
        files,
        metadata: {
          projectId,
          batchName: batchName || undefined,
        },
        signal: controller.signal,
        onProgress: (progress) => {
          // リトライ成功後はリトライ表示をクリア
          setRetryState(null);
          // 全体進捗を更新
          setUploadState(prev => ({
            ...prev,
            progress: progress.percentage,
            uploadedCount: progress.uploadedCount,
          }));
        },
        onRetry: (state) => {
          // リトライ発生時に状態を更新して UI に表示
          setRetryState(state);
        },
        onSessionInit: (uploadId) => {
          // チャンクアップロードセッション開始時に uploadId を記録
          activeUploadIdsRef.current.push(uploadId);
        },
      });

      // バッチIDを保存
      if (response.batchId) {
        setBatchId(response.batchId);
      }

      // 結果サマリーをセット
      const summary: UploadResultSummary = {
        successCount: response.summary.successfulFiles,
        failureCount: response.summary.failedFiles,
        failedFileNames: response.failedFileNames,
      };
      setResultSummary(summary);

      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 100,
      }));

      // ✨ Task: project_maiml_flg更新処理実装 - Phase 3
      // バックエンドからのhasMaimlFileをコールバックに渡す
      if (onUploadComplete) {
        onUploadComplete({
          mode: uploadMode,
          fileCount: fileList.length,
          success: summary.failureCount === 0,
          hasMaimlFile: response.hasMaimlFile,
        });
      }

      if (summary.failureCount === 0) {
        message.success('アップロードが完了しました');
      } else if (summary.successCount === 0) {
        message.error('すべてのファイルのアップロードに失敗しました');
      } else {
        message.warning(`${summary.failureCount} 件のファイルがアップロードに失敗しました`);
      }

    } catch (error) {
      // キャンセルエラーの処理
      if ((error as { name?: string }).name === 'CanceledError') {
        message.info('アップロードがキャンセルされました');
        
        // バックエンドに通知してファイル削除
        if (batchId) {
          try {
            await cancelBatch(batchId);
          } catch (cancelError) {
            console.error('バッチキャンセルエラー:', cancelError);
          }
        }
        
        setUploadState(prev => ({
          ...prev,
          isUploading: false,
          error: 'キャンセルされました',
        }));
      } else {
        // MAIMLバリデーションエラーの処理
        const axiosError = error as any;
        const errorCode = axiosError?.response?.data?.error?.code;
        if (errorCode === 'MAIML_VALIDATION_ERROR') {
          const details = axiosError.response.data.error.details;
          const errorList = (details?.errors ?? []) as Array<{ type: string; severity: string; message: string; suggestion?: string }>;
          setUploadState(prev => ({ ...prev, isUploading: false, error: null }));
          Modal.error({
            title: `MAIMLバリデーションエラー: ${details?.fileName ?? ''}`,
            width: 640,
            content: (
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                <Paragraph style={{ marginBottom: 8 }}>
                  致命的なエラーが{details?.errorCount ?? errorList.length}件検出されたため、アップロードを中止しました。
                </Paragraph>
                {errorList.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#fff2f0',
                      border: '1px solid #ffccc7',
                      borderRadius: 6,
                      padding: '8px 12px',
                      marginBottom: 8,
                    }}
                  >
                    <Text strong style={{ color: '#cf1322', fontSize: 13 }}>
                      [{e.type}] {e.message}
                    </Text>
                    {e.suggestion && (
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          💡 {e.suggestion}
                        </Text>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ),
            okText: '閉じる',
          });
        } else {
          const errorMessage = extractErrorMessage(error);
          setUploadState(prev => ({
            ...prev,
            isUploading: false,
            error: errorMessage,
          }));
          message.error(errorMessage);
        }
      }
    } finally {
      // クリーンアップ
      setAbortController(null);
      setBatchId(null);
    }
  }, [fileList, uploadMode, projectId, preselectedFolder, getTargetPath, batchName, onUploadComplete, batchId]);

  /**
   * アップロードキャンセル
   */
  const handleCancelUpload = useCallback(async () => {
    if (!abortController) return;
    
    // アップロードを即座に中断
    abortController.abort();
  }, [abortController]);

  /**
   * ダイアログを閉じる
   */
  const handleClose = useCallback(() => {
    if (uploadState.isUploading) {
      Modal.confirm({
        title: 'アップロード中',
        content: 'アップロード処理が進行中です。キャンセルしますか？',
        okText: '中断する',
        cancelText: '続行',
        onOk: async () => {
          // チャンクアップロード中のセッションをすべて中断してサーバー一時ファイルを削除
          const ids = activeUploadIdsRef.current;
          if (ids.length > 0) {
            await Promise.all(ids.map((id) => abortChunkUpload(id)));
            activeUploadIdsRef.current = [];
          }
          onClose();
        },
      });
    } else {
      onClose();
    }
  }, [uploadState.isUploading, onClose]);

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
                      padding: '8px 0',
                      borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
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

        {/* アップロード先プロジェクト表示 */}
        {preselectedFolder && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#E6F7FC',
              borderRadius: 8,
              border: '1px solid #0093CF',
            }}
          >
            <Space orientation="vertical" size={4} style={{ width: '100%' }}>
              <Text strong style={{ color: '#007AB3', fontSize: 13 }}>
                アップロード先プロジェクト
              </Text>
              <Text style={{ fontSize: 15, fontWeight: 500 }}>
                {preselectedFolder}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                パス: {getTargetPath() || `projects/${preselectedFolder}`}
              </Text>
            </Space>
          </div>
        )}

        {!preselectedFolder && (
          <Alert
            title="プロジェクトが選択されていません"
            description="プロジェクトを選択してからアップロードしてください"
            type="warning"
            showIcon
          />
        )}

        {/* サブフォルダパス入力（オプション） */}
        {preselectedFolder && (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              サブフォルダパス（オプション）
            </Text>
            <Input
              value={subFolderPath}
              onChange={(e) => setSubFolderPath(e.target.value)}
              placeholder="例: data/experiment01 （空欄の場合はプロジェクトルート）"
              disabled={uploadState.isUploading}
            />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              サブフォルダを指定しない場合は、プロジェクト直下にアップロードされます
            </Text>
          </div>
        )}

        {/* バッチ名入力（オプション） */}
        {uploadMode !== 'single' && fileList.length > 0 && (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              バッチ名（オプション）
            </Text>
            <Input
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="例: 実験データ2024-01-15"
              disabled={uploadState.isUploading}
            />
          </div>
        )}

        {/* リトライ中表示 */}
        {retryState && uploadState.isUploading && (
          <Alert
            title={`接続エラーが発生しました。自動リトライ中... (${retryState.retryCount}/${retryState.maxRetries})`}
            type="warning"
            showIcon
            icon={<LoadingOutlined />}
          />
        )}

        {/* アップロード進行状況 */}
        {uploadState.isUploading && (
          <Alert
            title="アップロード中"
            description={
              <div style={{ position: 'relative' }}>
                <button
                  onClick={handleCancelUpload}
                  disabled={!abortController || uploadState.progress >= 100}
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '0px',
                    padding: '4px 12px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: (abortController && uploadState.progress < 100) ? 'pointer' : 'not-allowed',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    opacity: (abortController && uploadState.progress < 100) ? 1 : 0.6,
                  }}
                >
                  キャンセル
                </button>
                <div style={{ paddingRight: '90px' }}>
                  <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                    <Text>
                      {uploadState.uploadedCount} / {uploadState.totalCount} ファイル完了
                    </Text>
                    <Progress percent={uploadState.progress} status="active" />
                  </Space>
                </div>
              </div>
            }
            type="info"
            showIcon
            icon={<LoadingOutlined />}
          />
        )}

        {/* アップロード結果サマリー */}
        {!uploadState.isUploading && resultSummary !== null && (
          <>
            {resultSummary.failureCount === 0 ? (
              <Alert
                title="アップロード完了"
                description={`成功: ${resultSummary.successCount} 件 / 失敗: 0 件`}
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
              />
            ) : resultSummary.successCount === 0 ? (
              <Alert
                title="アップロード失敗"
                description={
                  <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                    <Text>成功: 0 件 / 失敗: {resultSummary.failureCount} 件</Text>
                    <Text strong>失敗したファイル:</Text>
                    <List
                      size="small"
                      dataSource={resultSummary.failedFileNames}
                      renderItem={(name) => (
                        <List.Item style={{ padding: '2px 0' }}>
                          <Text style={{ fontSize: 12 }}>{name}</Text>
                        </List.Item>
                      )}
                    />
                  </Space>
                }
                type="error"
                showIcon
                icon={<CloseCircleOutlined />}
              />
            ) : (
              <Alert
                title="アップロード完了（一部失敗）"
                description={
                  <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                    <Text>
                      成功: {resultSummary.successCount} 件 / 失敗: {resultSummary.failureCount} 件
                    </Text>
                    <Text strong>失敗したファイル:</Text>
                    <List
                      size="small"
                      dataSource={resultSummary.failedFileNames}
                      renderItem={(name) => (
                        <List.Item style={{ padding: '2px 0' }}>
                          <Text style={{ fontSize: 12 }}>{name}</Text>
                        </List.Item>
                      )}
                    />
                  </Space>
                }
                type="warning"
                showIcon
                icon={<WarningOutlined />}
              />
            )}
          </>
        )}

        {/* エラー表示 */}
        {uploadState.error && (
          <Alert
            title="アップロードエラー"
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

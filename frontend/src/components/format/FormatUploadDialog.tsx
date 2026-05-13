/**
 * FormatUploadDialog.tsx
 * フォーマット管理画面用の一括ファイルアップロードダイアログ
 * Ant Design v6を使用し、UIポリシーに準拠
 */

import React, { useState, useCallback, useRef } from 'react';
import { uploadFiles, abortChunkUpload, cancelBatch, initBatch } from '@/services/fileAccessService';
import { extractErrorMessage } from '@/utils/errorUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { UploadRetryState, UploadResultSummary } from '@/types/file';
import type { UploadMode, UploadState } from '@/types/format';
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

const { Text, Paragraph } = Typography;
const { Dragger } = Upload;

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
    departmentCd?: string;
  } | null;
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
}) => {
  const { message } = App.useApp();
  const { t } = useLanguage();
  
  // 状態管理
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [subFolderPath, setSubFolderPath] = useState<string>('');
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    uploadedCount: 0,
    totalCount: 0,
    error: null,
  });
  /** リトライ状態（null = リトライなし） */
  const [retryState, setRetryState] = useState<UploadRetryState | null>(null);
  // ✨ Task: アップロードキャンセル機能実装
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  /** アップロード結果サマリー（null = 未完了） */
  const [resultSummary, setResultSummary] = useState<UploadResultSummary | null>(null);
  // Refs
  const folderInputRef = useRef<HTMLInputElement>(null);
  /** チャンクアップロード中のセッションID（キャンセル時に abort するために保持） */
  const activeUploadIdsRef = useRef<string[]>([]);
  /** batchId の ref（handleCancelUpload から非同期で参照するため state と併用） */
  const batchIdRef = useRef<string | null>(null);
  /**
   * abortController の ref
   * Modal.confirm の onOk は stale closure になりやすいため、
   * state と並行して ref でも最新値を保持する
   */
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * モード変更時のファイルリストクリア
   */
  const handleModeChange = useCallback((value: string | number) => {
    setUploadMode(value as UploadMode);
    setFileList([]);
    setResultSummary(null);
  }, []);

  const handleFileChange: UploadProps['onChange'] = useCallback(
    (info: { fileList: UploadFile[] }) => {
      let newFileList = [...info.fileList];
      
      // 単一ファイルモードの場合は1つのみ
      if (uploadMode === 'single') {
        newFileList = newFileList.slice(-1);
      }

      setFileList(newFileList);
      setResultSummary(null);
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
    },
    []
  );

  /**
   * アップロード先パスを構築
   */
  const getTargetPath = useCallback(() => {
    if (!baseFolder) {
      return '';
    }
    
    // formats/{departmentCd}/{formatFolderName} または formats/{formatFolderName}
    const basePath = baseFolder.departmentCd 
      ? `formats/${baseFolder.departmentCd}/${baseFolder.folderName}`
      : `formats/${baseFolder.folderName}`;
    
    // サブフォルダパスから先頭・末尾のスラッシュを削除
    const cleanSubFolder = subFolderPath.trim().replace(/^\/+|\/+$/g, '');
    
    // サブフォルダパスはフォーマットフォルダルートからの絶対パスとして扱う
    // （プロジェクト管理と同じ動作）
    const finalPath = cleanSubFolder ? `${basePath}/${cleanSubFolder}` : basePath;
    
    console.log('📂 [FormatUploadDialog] Final targetPath:', finalPath);
    
    return finalPath;
  }, [baseFolder, subFolderPath]);

  /**
   * アップロード実行
   */
  const handleUpload = useCallback(async () => {
    if (fileList.length === 0) {
      message.warning(t('upload.noFileSelected'));
      return;
    }

    if (!baseFolder) {
      message.error(t('upload.noFormatSelected'));
      return;
    }
    // ✨ AbortControllerを作成
    const controller = new AbortController();
    setAbortController(controller);
    abortControllerRef.current = controller;
    setResultSummary(null);
    setUploadState({
      isUploading: true,
      progress: 0,
      uploadedCount: 0,
      totalCount: fileList.length,
      error: null,
    });

    try {
      // batchId を先行取得（アップロード前にキャンセル可能にするため）
      try {
        const initialBatchId = await initBatch({ uploadType: uploadMode, totalFiles: fileList.length });
        setBatchId(initialBatchId);
        batchIdRef.current = initialBatchId;
      } catch (initError) {
        console.warn('バッチ先行作成に失敗しました（続行）:', initError);
      }

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
          formatId: baseFolder.id,
          batchId: batchIdRef.current || undefined,
        },
        signal: controller.signal, // ✨ AbortSignalを渡す
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
      // ✨ バッチIDを保存
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

      if (onUploadComplete) {
        onUploadComplete({
          mode: uploadMode,
          fileCount: fileList.length,
          success: summary.failureCount === 0,
        });
      }

      if (summary.failureCount === 0) {
        message.success(t('upload.completed'));
      } else if (summary.successCount === 0) {
        message.error(t('upload.allFailed'));
      } else {
        message.warning(`${summary.failureCount} ${t('upload.partialFailed')}`);
      }

    } catch (error) {
      // キャンセルエラーの処理（最初に判定）
      if ((error as { name?: string }).name === 'CanceledError') {
        message.info(t('upload.cancelled'));
        // バックエンドに通知してアップロード済みファイルを削除（batchIdRef.current で最新値を参照）
        const currentBatchId = batchIdRef.current;
        if (currentBatchId) {
          try {
            await cancelBatch(currentBatchId);
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
      // ✨ クリーンアップ
      setAbortController(null);
      abortControllerRef.current = null;
      setBatchId(null);
    }
  }, [fileList, uploadMode, baseFolder, getTargetPath, onUploadComplete, message, batchId]);

  /**
   * アップロードキャンセル（インライン「キャンセル」ボタン用）
   * 確認ダイアログを表示してから中断する
   */
  const handleCancelUpload = useCallback(() => {
    // ref から最新の controller を取得（stale closure 対策）
    const currentController = abortControllerRef.current;
    if (!currentController) return;

    Modal.confirm({
      title: 'アップロードを中断しますか？',
      content: '中断するとアップロード済みのファイルも削除されます。',
      okText: '中断する',
      okButtonProps: { danger: true },
      cancelText: '続行',
      onOk: async () => {
        // HTTP リクエストを中断（ref から参照）
        abortControllerRef.current?.abort();

        // チャンクセッションを中断
        const ids = activeUploadIdsRef.current;
        if (ids.length > 0) {
          await Promise.all(ids.map((id) => abortChunkUpload(id)));
          activeUploadIdsRef.current = [];
        }

        // バッチをキャンセル（batchIdRef 経由で最新値を参照）
        const currentBatchId = batchIdRef.current;
        if (currentBatchId) {
          try {
            await cancelBatch(currentBatchId);
          } catch (cancelError) {
            console.error('バッチキャンセルエラー:', cancelError);
          }
        }
      },
    });
  }, []);

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
          // HTTP リクエストを中断（ref から参照）
          abortControllerRef.current?.abort();

          // チャンクアップロード中のセッションをすべて中断してサーバー一時ファイルを削除
          const ids = activeUploadIdsRef.current;
          if (ids.length > 0) {
            await Promise.all(ids.map((id) => abortChunkUpload(id)));
            activeUploadIdsRef.current = [];
          }
          // upload_batch テーブルを cancelled に更新（batchIdRef 経由で最新値を参照）
          const currentBatchId = batchIdRef.current;
          if (currentBatchId) {
            try {
              await cancelBatch(currentBatchId);
            } catch (cancelError) {
              console.error('バッチキャンセルエラー:', cancelError);
            }
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

  // ベースフォルダが選択されていない場合のメッセージ
  if (!baseFolder) {
    return (
      <Modal
        title={t('upload.fileUploadTitle')}
        open={open}
        onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          {t('common.close')}
        </Button>,
      ]}
      >
        <Alert
          title={t('upload.noFormatSelectedAlert')}
          description={t('upload.noFormatSelectedAlert')}
          type="warning"
          showIcon
        />
      </Modal>
    );
  }

  return (
    <Modal
      title={t('upload.fileUploadTitle')}
      open={open}
      onCancel={handleClose}
      width={800}
      footer={[
        <Button key="close" onClick={handleClose} disabled={uploadState.isUploading}>
          {t('common.close')}
        </Button>,
        <Button
          key="upload"
          type="primary"
          onClick={handleUpload}
          disabled={fileList.length === 0 || uploadState.isUploading}
          icon={uploadState.isUploading ? <LoadingOutlined /> : <UploadOutlined />}
        >
          {uploadState.isUploading ? t('common.loading') : t('common.add')}
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

        {/* アップロード先フォーマット表示 */}
        {baseFolder && (
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
                アップロード先フォーマット
              </Text>
              <Text style={{ fontSize: 15, fontWeight: 500 }}>
                {baseFolder.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                パス: {getTargetPath() || 
                  (baseFolder.departmentCd 
                    ? `formats/${baseFolder.departmentCd}/${baseFolder.folderName}`
                    : `formats/${baseFolder.folderName}`)}
              </Text>
            </Space>
          </div>
        )}

        {/* サブフォルダパス入力（オプション） */}
        {baseFolder && (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              サブフォルダパス（オプション）
            </Text>
            <Input
              value={subFolderPath}
              onChange={(e) => setSubFolderPath(e.target.value)}
              placeholder="例: subfolder（空欄の場合は選択フォーマットフォルダ直下）"
              disabled={uploadState.isUploading}
            />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              サブフォルダを指定しない場合は、選択フォーマットフォルダ直下にアップロードされます
            </Text>
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
            title={t('upload.uploadingTitle')}
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
                title={t('upload.completedTitle')}
                description={`成功: ${resultSummary.successCount} 件 / 失敗: 0 件`}
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
              />
            ) : resultSummary.successCount === 0 ? (
              <Alert
                title={t('upload.failedTitle')}
                description={
                  <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                    <Text>Success: 0 / Failed: {resultSummary.failureCount}</Text>
                    <Text strong>{t('upload.failedFiles')}</Text>
                    <div>
                      {resultSummary.failedFileNames.map((name, i) => (
                        <div key={i} style={{ padding: '2px 0' }}>
                          <Text style={{ fontSize: 12 }}>{name}</Text>
                        </div>
                      ))}
                    </div>
                  </Space>
                }
                type="error"
                showIcon
                icon={<CloseCircleOutlined />}
              />
            ) : (
              <Alert
                title={t('upload.partialFailedTitle')}
                description={
                  <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                    <Text>
                      Success: {resultSummary.successCount} / Failed: {resultSummary.failureCount}
                    </Text>
                    <Text strong>{t('upload.failedFiles')}</Text>
                    <div>
                      {resultSummary.failedFileNames.map((name, i) => (
                        <div key={i} style={{ padding: '2px 0' }}>
                          <Text style={{ fontSize: 12 }}>{name}</Text>
                        </div>
                      ))}
                    </div>
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
            title={t('upload.errorTitle')}
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

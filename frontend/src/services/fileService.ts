/**
 * ファイルアップロードAPIサービス
 * プロジェクトファイルのアップロードAPI通信を担当
 */

import axios, { AxiosInstance, AxiosError, AxiosProgressEvent } from 'axios';
import type { ApiResponse } from '@/types/api';

/**
 * アップロードモード
 */
export type UploadMode = 'single' | 'bulk' | 'folder';

/**
 * アップロード進捗情報
 */
export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  uploadedCount: number;
  totalCount: number;
}

/**
 * アップロードファイル情報
 */
export interface UploadedFileInfo {
  fileId: string;
  fileName: string;
  filePath: string;
  s3Key: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
  status?: 'success' | 'failed';
  error?: string;
}

/**
 * アップロードレスポンスデータ
 */
export interface UploadResponseData {
  uploadMode: string;
  file?: UploadedFileInfo;
  files?: UploadedFileInfo[];
  summary?: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalSize: number;
  };
}

/**
 * アップロードレスポンス
 */
export interface UploadResponse {
  success: boolean;
  data: UploadResponseData;
}

/**
 * アップロードパラメータ
 */
export interface UploadFilesParams {
  projectId: string;
  uploadMode: UploadMode;
  targetFolder: string;
  files: File[];
  batchName?: string;
  preserveFolderStructure?: boolean;
  onProgress?: (progress: UploadProgress) => void;
}

/**
 * Axiosインスタンスの作成（ファイルアップロード用）
 */
const createFileApiClient = (): AxiosInstance => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  
  const client = axios.create({
    baseURL: `${baseURL}`,
    timeout: 300000, // 300秒（5分）
    headers: {
      // Content-Typeは自動設定されるため指定しない
    },
    withCredentials: true, // HTTPOnly Cookie送信のため
  });

  // リクエストインターセプター（組織IDヘッダーの自動付与）
  client.interceptors.request.use(
    (config) => {
      const organizationId = process.env.NEXT_PUBLIC_ORGANIZATION_ID;
      if (organizationId) {
        config.headers['X-Organization-Id'] = organizationId;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return client;
};

const fileApiClient = createFileApiClient();

/**
 * ファイルサービスエラー
 */
export class FileServiceError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public details?: unknown
  ) {
    super(message);
    this.name = 'FileServiceError';
  }
}

/**
 * エラーメッセージを日本語化
 */
const translateErrorMessage = (code: string, defaultMessage: string): string => {
  const errorMessages: Record<string, string> = {
    // バリデーションエラー
    VALIDATION_ERROR: 'ファイル情報が不正です',
    VALIDATION_FILE_SIZE_EXCEEDED: 'ファイルサイズが上限（100MB）を超えています',
    VALIDATION_FILE_COUNT_EXCEEDED: 'ファイル数が上限（100件）を超えています',
    
    // 認証エラー
    AUTH_TOKEN_EXPIRED: 'セッションが期限切れです。再ログインしてください',
    AUTH_TOKEN_INVALID: 'セッションが無効です。再ログインしてください',
    AUTH_UNAUTHORIZED: '認証が必要です',
    
    // 権限エラー
    PERMISSION_INSUFFICIENT: 'アップロード権限がありません',
    
    // リソースエラー
    RESOURCE_NOT_FOUND: 'プロジェクトが見つかりません',
    
    // システムエラー
    SYSTEM_S3_ERROR: 'ファイルストレージエラーが発生しました。しばらくしてから再試行してください',
    SYSTEM_DATABASE_ERROR: 'システムエラーが発生しました。管理者に連絡してください',
    SYSTEM_ERROR: 'システムエラーが発生しました',
    
    // ネットワークエラー
    NETWORK_ERROR: 'ネットワークエラーが発生しました。接続を確認してください',
    TIMEOUT_ERROR: 'アップロードがタイムアウトしました。ファイルサイズまたは接続を確認してください',
  };

  return errorMessages[code] || defaultMessage;
};

/**
 * Axiosエラーをハンドリング
 */
const handleApiError = (error: unknown): FileServiceError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse<never>>;
    
    // タイムアウトエラー
    if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
      return new FileServiceError(
        translateErrorMessage('TIMEOUT_ERROR', 'アップロードがタイムアウトしました'),
        'TIMEOUT_ERROR'
      );
    }
    
    // ネットワークエラー
    if (!axiosError.response) {
      return new FileServiceError(
        translateErrorMessage('NETWORK_ERROR', 'ネットワークエラーが発生しました'),
        'NETWORK_ERROR'
      );
    }
    
    // APIエラーレスポンス
    const response = axiosError.response.data;
    if (response && !response.success && response.error) {
      const errorCode = response.error.code;
      const errorMessage = translateErrorMessage(errorCode, response.error.message);
      return new FileServiceError(errorMessage, errorCode, response.error.details);
    }
    
    // HTTPステータスコード別デフォルトメッセージ
    const status = axiosError.response?.status;
    switch (status) {
      case 400:
        return new FileServiceError(
          translateErrorMessage('VALIDATION_ERROR', 'ファイル情報が不正です'),
          'VALIDATION_ERROR'
        );
      case 401:
        return new FileServiceError(
          translateErrorMessage('AUTH_TOKEN_EXPIRED', 'セッションが期限切れです'),
          'AUTH_TOKEN_EXPIRED'
        );
      case 403:
        return new FileServiceError(
          translateErrorMessage('PERMISSION_INSUFFICIENT', 'アップロード権限がありません'),
          'PERMISSION_INSUFFICIENT'
        );
      case 404:
        return new FileServiceError(
          translateErrorMessage('RESOURCE_NOT_FOUND', 'プロジェクトが見つかりません'),
          'RESOURCE_NOT_FOUND'
        );
      case 500:
        return new FileServiceError(
          translateErrorMessage('SYSTEM_ERROR', 'システムエラーが発生しました'),
          'SYSTEM_ERROR'
        );
      default:
        return new FileServiceError(
          'アップロードに失敗しました',
          'UPLOAD_FAILED'
        );
    }
  }
  
  // その他のエラー
  return new FileServiceError(
    translateErrorMessage('UNKNOWN_ERROR', 'エラーが発生しました'),
    'UNKNOWN_ERROR'
  );
};

/**
 * ファイルサービス
 */
export const fileService = {
  /**
   * ファイルアップロード
   * @param params アップロードパラメータ
   * @returns アップロード結果
   */
  async uploadFiles(params: UploadFilesParams): Promise<UploadResponse> {
    const {
      projectId,
      uploadMode,
      targetFolder,
      files,
      batchName,
      preserveFolderStructure,
      onProgress,
    } = params;

    try {
      // FormDataの構築
      const formData = new FormData();
      formData.append('uploadMode', uploadMode);
      formData.append('targetFolder', targetFolder);

      // ファイルを追加
      files.forEach((file) => {
        formData.append('files', file);
      });

      // オプショナルパラメータの追加
      if (batchName) {
        formData.append('batchName', batchName);
      }
      if (preserveFolderStructure !== undefined) {
        formData.append('preserveFolderStructure', String(preserveFolderStructure));
      }

      // アップロード実行
      const response = await fileApiClient.post<ApiResponse<UploadResponseData>>(
        `/projects/${projectId}/files/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentage = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              
              onProgress({
                uploadedBytes: progressEvent.loaded,
                totalBytes: progressEvent.total,
                percentage,
                uploadedCount: 0, // バックエンドから取得する場合は更新
                totalCount: files.length,
              });
            }
          },
        }
      );

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
        };
      }

      throw new FileServiceError('アップロードに失敗しました', 'UPLOAD_FAILED');
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

export default fileService;

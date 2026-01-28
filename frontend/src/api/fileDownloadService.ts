/**
 * ファイルダウンロードAPI通信サービス
 * 
 * Task 5.3: ファイルダウンロードAPI通信関数の実装
 * Requirements: 10
 */

import { AxiosError } from 'axios';
import { createApiClient } from '@/utils/authUtils';

// API Base URL（環境変数から取得、デフォルトは相対パス）
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * ファイルダウンロードレスポンス型
 */
export interface FileDownloadResponse {
  fileName: string;
  downloadUrl: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
  uploadedBy: string;
}

/**
 * 一括ダウンロードレスポンス型
 */
export interface BulkDownloadResponse {
  files: FileDownloadResponse[];
  totalFiles: number;
  totalSize: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * APIエラーレスポンス型
 */
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}


/**
 * 単一ファイルのダウンロード用署名付きURLを取得
 * 
 * @param projectId プロジェクトID
 * @param fileName ファイル名
 * @returns ファイルダウンロード情報
 * @throws Error APIエラー時
 */
export const downloadFile = async (
  projectId: string,
  fileName: string
): Promise<FileDownloadResponse> => {
  const client = createApiClient();

  try {
    const response = await client.get<{
      success: true;
      data: FileDownloadResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/api/v1/projects/${projectId}/files/${encodeURIComponent(fileName)}/download`);

    return response.data.data;
  } catch (error) {
    console.error('ファイルダウンロードAPIエラー:', error);
    throw error;
  }
};

/**
 * プロジェクト内全ファイルの一括ダウンロード用署名付きURLリストを取得
 * 
 * @param projectId プロジェクトID
 * @param page ページ番号（デフォルト: 1）
 * @param limit 1ページあたりの件数（デフォルト: 20、最大: 100）
 * @returns ファイル一覧とページネーション情報
 * @throws Error APIエラー時
 */
export const downloadAllFiles = async (
  projectId: string,
  page: number = 1,
  limit: number = 20
): Promise<BulkDownloadResponse> => {
  const client = createApiClient();

  try {
    const response = await client.get<{
      success: true;
      data: BulkDownloadResponse;
      meta: {
        timestamp: string;
        requestId: string;
      };
    }>(`/api/v1/projects/${projectId}/files/download-all`, {
      params: {
        page,
        limit,
      },
    });

    return response.data.data;
  } catch (error) {
    console.error('一括ダウンロードAPIエラー:', error);
    throw error;
  }
};

/**
 * ファイルを実際にダウンロードする（署名付きURLを使用）
 * 
 * @param downloadUrl 署名付きURL
 * @param fileName ファイル名（保存時のファイル名）
 */
export const executeFileDownload = (downloadUrl: string, fileName: string): void => {
  // 新しいタブでダウンロードを開始
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  
  // リンクをクリックしてダウンロード開始
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 複数ファイルを順次ダウンロードする
 * 
 * @param files ファイル情報の配列
 * @param onProgress 進捗コールバック（現在のファイル数、総ファイル数）
 * @param onError エラーコールバック（ファイル名、エラーメッセージ）
 */
export const executeMultipleDownloads = async (
  files: FileDownloadResponse[],
  onProgress?: (current: number, total: number) => void,
  onError?: (fileName: string, error: string) => void
): Promise<void> => {
  const total = files.length;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      // 進捗コールバック
      if (onProgress) {
        onProgress(i + 1, total);
      }
      
      // ファイルダウンロード実行
      executeFileDownload(file.downloadUrl, file.fileName);
      
      // 連続ダウンロードの間隔を設ける（ブラウザのダウンロード制限対策）
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms待機
      }
    } catch (error) {
      console.error(`ファイルダウンロードエラー: ${file.fileName}`, error);
      
      // エラーコールバック
      if (onError) {
        onError(file.fileName, error instanceof Error ? error.message : '不明なエラー');
      }
    }
  }
};

/**
 * ファイルサイズをフォーマット（バイト → KB/MB/GB）
 * 
 * @param bytes ファイルサイズ（バイト）
 * @returns フォーマットされたファイルサイズ文字列
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
};

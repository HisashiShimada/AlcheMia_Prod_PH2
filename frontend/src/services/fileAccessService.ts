/**
 * ファイルアクセスAPI通信サービス
 * 
 * ファイルのダウンロード、アップロード、削除などのファイルアクセス処理を提供
 * Task 5.3: ファイルダウンロードAPI通信関数の実装
 * Task: ファイルアップロード統一化
 * Requirements: 10
 */

import { createApiClient } from '@/utils/authUtils';
import type { ApiResponse } from '@/types/api';
import type { AxiosProgressEvent } from 'axios';
import type {
  UploadProgress,
  UploadedFileInfo,
  UploadResponseData,
  UploadMetadata,
  UploadFilesParams,
} from '@/types/file';


/**
 * 単一ファイルのダウンロード（プロキシ方式）
 * 
 * バックエンドからファイルをBlobとして受信し、即座にダウンロードを開始します。
 * 
 * @param projectId プロジェクトID
 * @param fileName ファイル名
 * @returns Promise<void> ダウンロード完了後に解決
 * @throws Error APIエラー時
 */
export const downloadFile = async (
  projectId: string,
  fileName: string
): Promise<void> => {
  const client = createApiClient();

  try {
    const response = await client.get(`/projects/${projectId}/files/${encodeURIComponent(fileName)}/download`, {
      responseType: 'blob', // 重要: Blobとして受信
    });

    // Blobからダウンロードを実行
    downloadBlobAsFile(response.data, fileName);
  } catch (error) {
    console.error('ファイルダウンロードAPIエラー:', error);
    throw error;
  }
};


/**
 * Blobをファイルとしてダウンロードするヘルパー関数
 * 
 * @param blob ダウンロードするBlob
 * @param fileName ファイル名（保存時のファイル名）
 */
const downloadBlobAsFile = (blob: Blob, fileName: string): void => {
  // Blob URLを生成
  const url = window.URL.createObjectURL(blob);
  
  // ダウンロードリンクを作成
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  
  // DOMに追加してクリック
  document.body.appendChild(link);
  link.click();
  
  // クリーンアップ
  document.body.removeChild(link);
  
  // Blob URLを解放（メモリリーク防止）
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 100);
};


/**
 * ファイルキーベースの汎用ダウンロード（プロキシ方式）
 * 
 * Task: S3ファイルダウンロード共通化 - プロキシ版
 * - ファイルキーを直接指定してファイルをダウンロード
 * - プロジェクト、フォーマット、その他のファイルで共通利用可能
 * - organization_idは認証情報から自動取得
 * 
 * @param fileKey ファイルキー（相対パス）
 * @returns Promise<void> ダウンロード完了後に解決
 * @throws Error APIエラー時
 * 
 * @example
 * // プロジェクトファイル
 * await getFileDownloadUrlByKey('projects/sample_project/sample.maiml');
 * 
 * // フォーマットファイル
 * await getFileDownloadUrlByKey('formats/chemistry/workflow.maiml');
 */
export const getFileDownloadUrlByKey = async (
  fileKey: string
): Promise<void> => {
  const client = createApiClient();

  try {
    const response = await client.post('/files/download-url', 
      { fileKey },
      { responseType: 'blob' } // 重要: Blobとして受信
    );

    // ファイル名をfileKeyから抽出
    const fileName = fileKey.split('/').pop() || 'download';

    // Blobからダウンロードを実行
    downloadBlobAsFile(response.data, fileName);
  } catch (error) {
    console.error('ファイルダウンロードエラー:', error);
    throw error;
  }
};

/**
 * フォルダZIPダウンロード（汎用）
 * 
 * Task: 汎用フォルダZIPダウンロード機能
 * - 指定されたフォルダパス配下のファイルをZIP形式でダウンロード
 * - プロジェクト、フォーマット、その他あらゆるフォルダで利用可能
 * - organization_idは認証情報から自動取得
 * 
 * @param folderPath フォルダパス（相対パス）
 * @returns Promise<void> ダウンロード完了後に解決
 * @throws Error APIエラー時
 * 
 * @example
 * // プロジェクトフォルダ全体をダウンロード
 * await downloadFolderAsZip('projects/sample_project');
 * // → sample_project.zip
 * 
 * // フォーマットフォルダ全体をダウンロード
 * await downloadFolderAsZip('formats/chemistry');
 * // → chemistry.zip
 * 
 * // サブフォルダをダウンロード
 * await downloadFolderAsZip('formats/materials/conditions');
 * // → conditions.zip
 */
export const downloadFolderAsZip = async (
  folderPath: string
): Promise<void> => {
  const client = createApiClient();

  try {
    const response = await client.post('/files/download-folder-as-zip', 
      { folderPath },
      { responseType: 'blob' } // 重要: Blobとして受信
    );

    // フォルダ名をfolderPathから抽出（最後のフォルダ名）
    const folderName = folderPath.split('/').pop() || 'download';

    // BlobからZIPファイルをダウンロード
    downloadBlobAsFile(response.data, `${folderName}.zip`);
  } catch (error) {
    console.error('フォルダZIPダウンロードエラー:', error);
    throw error;
  }
};

/**
 * ファイルアップロード（統一API）
 * 
 * Task: S3ファイルアップロード統一化
 * - 各画面で生成された完全なパスを使用してファイルをアップロード
 * - プロジェクト、フォーマット、その他のファイルで共通利用可能
 * - organization_idは認証情報から自動取得
 * 
 * @param params アップロードパラメータ
 * @returns Promise<UploadResponseData> アップロード結果
 * @throws Error APIエラー時
 * 
 * @example
 * // プロジェクトファイルアップロード
 * await uploadFiles({
 *   uploadMode: 'bulk',
 *   targetPath: `projects/${project.name}`,
 *   files: selectedFiles,
 *   metadata: { projectId: project.id, batchName: 'batch_001' },
 *   onProgress: (progress) => console.log(`${progress.percentage}%`),
 * });
 * 
 * // フォーマットファイルアップロード
 * await uploadFiles({
 *   uploadMode: 'single',
 *   targetPath: `formats/${baseFolder.name}/${subFolder}`,
 *   files: [selectedFile],
 *   metadata: { formatId: format.id },
 * });
 */
export const uploadFiles = async (
  params: UploadFilesParams
): Promise<UploadResponseData> => {
  const {
    uploadMode,
    targetPath,
    files,
    metadata,
    onProgress,
  } = params;

  const client = createApiClient();

  try {
    // FormDataの構築
    const formData = new FormData();
    formData.append('uploadMode', uploadMode);
    formData.append('targetPath', targetPath);

    // ファイルパス情報を配列として送信（フォルダ構造を保持するため）
    const filePaths = files.map(file => file.name);
    formData.append('filePaths', JSON.stringify(filePaths));

    // ファイルを追加
    files.forEach((file) => {
      formData.append('files', file);
    });

    // メタデータの追加（JSON文字列として送信）
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    // アップロード実行
    const response = await client.post<ApiResponse<UploadResponseData>>(
      '/files/upload',
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
              uploadedCount: 0,
              totalCount: files.length,
            });
          }
        },
      }
    );

    if (response.data.success) {
      return response.data.data;
    }

    throw new Error('アップロードに失敗しました');
  } catch (error) {
    console.error('ファイルアップロードエラー:', error);
    throw error;
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

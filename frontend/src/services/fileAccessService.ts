/**
 * ファイルアクセスAPI通信サービス
 * 
 * ファイルのダウンロード、アップロード、削除などのファイルアクセス処理を提供
 * Task 5.3: ファイルダウンロードAPI通信関数の実装
 * Task: ファイルアップロード統一化
 * Requirements: 10
 */

import axios from 'axios';
import { createApiClient } from '@/utils/authUtils';
import type { ApiResponse } from '@/types/api';
import type { AxiosProgressEvent } from 'axios';
import type {
  UploadProgress,
  UploadedFileInfo,
  UploadResponseData,
  UploadMetadata,
  UploadFilesParams,
  ChunkUploadOptions,
  UploadRetryOptions,
  UploadRetryState,
} from '@/types/file';

/** チャンク分割の閾値: 10MB を超えるファイルはチャンク方式に切り替える */
const CHUNK_THRESHOLD = 10 * 1024 * 1024; // 10MB
/** デフォルトのチャンクサイズ: 10MB */
const DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

// ---------------------------------------------------------------------------
// リトライ機能 (2026-03-26)
// ---------------------------------------------------------------------------

/** デフォルトのリトライ設定 */
const DEFAULT_RETRY_OPTIONS: UploadRetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
};

/**
 * エラーがリトライ対象かどうかを判定する
 *
 * - HTTP 500/502/503/504（サーバー一時エラー）→ リトライする
 * - ERR_NETWORK（ネットワーク切断）/ ECONNABORTED（タイムアウト）→ リトライする
 * - HTTP 400/401/403/404（入力ミス・認証エラー）→ リトライしない（即エラー）
 */
const isRetryableError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    // 400系（クライアントエラー）はリトライしない
    if (status && status >= 400 && status < 500) return false;
    // 500系（サーバーエラー）はリトライする
    if (status && status >= 500) return true;
    // ネットワークエラー・タイムアウトはリトライする
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') return true;
  }
  return false;
};

/**
 * 指数バックオフ付きリトライ実行
 *
 * 失敗した非同期処理を最大 maxRetries 回まで自動リトライする。
 * リトライ間隔は指数バックオフ（baseDelayMs → baseDelayMs×2 → baseDelayMs×4 ...）。
 *
 * @param fn       実行する非同期処理
 * @param options  リトライ設定（最大回数・待機時間）
 * @param onRetry  リトライ発生時に UI へ状態を通知するコールバック
 */
const withRetry = async <T>(
  fn: () => Promise<T>,
  options: UploadRetryOptions = DEFAULT_RETRY_OPTIONS,
  onRetry?: (state: UploadRetryState) => void
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 400系エラーはリトライせず即時スロー
      if (!isRetryableError(error)) throw error;

      // 最大リトライ回数に達したらスロー
      if (attempt === options.maxRetries) throw error;

      // UI へリトライ状態を通知（1始まり）
      if (onRetry) {
        onRetry({ retryCount: attempt + 1, maxRetries: options.maxRetries });
      }

      // 指数バックオフ待機: 1000ms → 2000ms → 4000ms
      const delayMs = options.baseDelayMs * Math.pow(2, attempt);
      console.log(`🔄 [Retry] ${attempt + 1}/${options.maxRetries} 回目リトライ (${delayMs}ms 後)`);
      await new Promise<void>(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
};


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
    onFileProgress,
    onRetry,
    onSessionInit,
  } = params;

  // ---------------------------------------------------------------------------
  // ファイルごと個別アップロード (2026-03-26)
  // 全ファイルを並行して個別リクエストで送信し、ファイルごとの進捗を onFileProgress で通知する。
  // 10MB 超のファイルはチャンク方式、10MB 以下は 1 リクエスト方式を使用。
  // ---------------------------------------------------------------------------

  // 完了カウンター（並行処理で共有）
  let completedCount = 0;
  const totalCount = files.length;

  /**
   * 1 ファイルをアップロードするヘルパー（通常方式）
   */
  const uploadSingleFile = async (file: File): Promise<UploadedFileInfo> => {
    const client = createApiClient();
    const filePath = `${targetPath.replace(/\/+$/, '')}/${file.name}`;

    // アップロード開始通知
    if (onFileProgress) onFileProgress(file.name, 0, 'active');

    const formData = new FormData();
    formData.append('uploadMode', uploadMode);
    formData.append('targetPath', targetPath);
    formData.append('filePaths', JSON.stringify([file.name]));
    formData.append('files', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await withRetry(
      () => client.post<ApiResponse<UploadResponseData>>(
        '/files/upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total) {
              const percent = Math.min(
                Math.round((progressEvent.loaded / progressEvent.total) * 100),
                99
              );
              if (onFileProgress) onFileProgress(file.name, percent, 'active');
              // 全体進捗も更新
              if (onProgress) {
                onProgress({
                  uploadedBytes: progressEvent.loaded,
                  totalBytes: progressEvent.total,
                  percentage: percent,
                  uploadedCount: completedCount,
                  totalCount,
                });
              }
            }
          },
        }
      ),
      DEFAULT_RETRY_OPTIONS,
      onRetry
    );

    if (!response.data.success) {
      throw new Error(`${file.name} のアップロードに失敗しました`);
    }

    // 完了通知
    completedCount++;
    if (onFileProgress) onFileProgress(file.name, 100, 'success');
    if (onProgress) {
      onProgress({
        uploadedBytes: file.size,
        totalBytes: file.size,
        percentage: Math.round((completedCount / totalCount) * 100),
        uploadedCount: completedCount,
        totalCount,
      });
    }

    const uploadedFile = response.data.data.files[0];
    return uploadedFile ?? {
      fileId: filePath,
      fileName: file.name,
      filePath,
      s3Key: filePath,
      fileSize: file.size,
      contentType: file.type || 'application/octet-stream',
      uploadedAt: new Date().toISOString(),
    };
  };

  /**
   * 1 ファイルをチャンク方式でアップロードするヘルパー
   */
  const uploadSingleFileWithChunks = async (file: File): Promise<UploadedFileInfo> => {
    const filePath = `${targetPath.replace(/\/+$/, '')}/${file.name}`;

    if (onFileProgress) onFileProgress(file.name, 0, 'active');

    const fileKey = await uploadFileWithChunks(file, filePath, {
      onProgress: (percent) => {
        if (onFileProgress) onFileProgress(file.name, percent, 'active');
        if (onProgress) {
          onProgress({
            uploadedBytes: Math.round((percent / 100) * file.size),
            totalBytes: file.size,
            percentage: percent,
            uploadedCount: completedCount,
            totalCount,
          });
        }
      },
      onSessionInit,
    });

    completedCount++;
    if (onFileProgress) onFileProgress(file.name, 100, 'success');
    if (onProgress) {
      onProgress({
        uploadedBytes: file.size,
        totalBytes: file.size,
        percentage: Math.round((completedCount / totalCount) * 100),
        uploadedCount: completedCount,
        totalCount,
      });
    }

    return {
      fileId: fileKey,
      fileName: file.name,
      filePath,
      s3Key: fileKey,
      fileSize: file.size,
      contentType: file.type || 'application/octet-stream',
      uploadedAt: new Date().toISOString(),
    };
  };

  // 全ファイルを並行アップロード
  const results = await Promise.allSettled(
    files.map((file) =>
      file.size > CHUNK_THRESHOLD
        ? uploadSingleFileWithChunks(file)
        : uploadSingleFile(file)
    )
  );

  // 結果を集計
  const successFiles: UploadedFileInfo[] = [];
  let failedCount = 0;

  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      successFiles.push(result.value);
    } else {
      failedCount++;
      const file = files[idx];
      if (onFileProgress) onFileProgress(file.name, 0, 'exception');
      console.error(`[uploadFiles] ${file.name} アップロード失敗:`, result.reason);
    }
  });

  // 全ファイルが失敗した場合は最初のエラーをそのままスロー
  // (AxiosError を維持することで extractErrorMessage が正確なメッセージを返す)
  if (failedCount === files.length) {
    const firstRejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    throw firstRejected?.reason ?? new Error('すべてのファイルのアップロードに失敗しました');
  }

  return {
    uploadMode,
    files: successFiles,
    summary: {
      totalFiles: files.length,
      successfulFiles: successFiles.length,
      failedFiles: failedCount,
      totalSize: successFiles.reduce((sum, f) => sum + f.fileSize, 0),
    },
  };
};

/**
 * ファイルテキスト内容取得（ビューア用）
 *
 * バックエンドがストレージからファイルを直接プロキシ取得し、テキスト文字列として返す。
 * 署名付きURL経由のクライアントfetchは行わない。
 * - organization_idは認証情報から自動取得
 *
 * @param fileKey ファイルキー（相対パス）
 * @returns ファイルのテキスト内容
 * @throws Error APIエラー時
 */
export const getFileContentAsText = async (fileKey: string): Promise<string> => {
  const client = createApiClient();

  try {
    const response = await client.post<ApiResponse<{ content: string }>>(
      '/files/content-as-text',
      { fileKey }
    );

    if (!response.data.success || response.data.data?.content === undefined) {
      throw new Error('ファイル内容の取得に失敗しました');
    }

    return response.data.data.content;
  } catch (error) {
    console.error('ファイルテキスト取得エラー:', error);
    throw error;
  }
};

/**
 * ファイル表示用署名付きURL取得（画像・TIFFビューア用）
 *
 * Task: ビューアボタン修正 - 画像・TIFFなど表示用URLをstring取得
 * - /files/view-url を使って署名付きURLを取得して返す
 * - ImageViewer・TiffViewerでそのままsrcとして使用可能
 * - organization_idは認証情報から自動取得
 *
 * @param fileKey ファイルキー（相対パス）
 * @returns 表示用署名付きURL
 * @throws Error APIエラー時
 */
export const getFileViewUrl = async (fileKey: string): Promise<string> => {
  const client = createApiClient();

  try {
    const response = await client.post<ApiResponse<{ url: string; expiresAt: string; expiresIn: number }>>(
      '/files/view-url',
      { fileKey }
    );

    if (!response.data.success || !response.data.data?.url) {
      throw new Error('ファイルURLの取得に失敗しました');
    }

    return response.data.data.url;
  } catch (error) {
    console.error('ファイル表示URL取得エラー:', error);
    throw error;
  }
};

/**
 * ファイルキーベースの汎用削除
 * 
 * Task: ファイル削除API共通化
 * - ファイルキー（相対パス）を指定してファイルを削除
 * - プロジェクト、フォーマット、その他のファイルで共通利用可能
 * - organization_idは認証情報から自動取得
 * 
 * @param fileKey ファイルキー（相対パス）
 * @returns Promise<void> 削除完了後に解決
 * @throws Error APIエラー時
 * 
 * @example
 * // フォーマットファイル削除
 * await deleteFileByKey('formats/chemistry/template.xml');
 * 
 * // プロジェクトファイル削除
 * await deleteFileByKey('projects/sample_project/data.csv');
 */
export const deleteFileByKey = async (
  fileKey: string
): Promise<void> => {
  const client = createApiClient();

  try {
    await client.delete('/files/delete', {
      data: { fileKey },
    });

    console.log('ファイル削除成功:', fileKey);
  } catch (error) {
    console.error('ファイル削除エラー:', error);
    throw error;
  }
};

/**
 * 単一ファイルをチャンク分割してアップロードする
 *
 * チャンク分割アップロード実装 (2026-03-25)
 * - ファイルを CHUNK_SIZE 単位に Blob.slice() で切り出し、順次送信する
 * - init → チャンク送信（N 回）→ complete の 3 ステップで構成される
 *
 * @param file       アップロードするファイル
 * @param filePath   ストレージ保存先パス（相対パス、例: "projects/foo/bar.zip"）
 * @param options    チャンクサイズや進捗コールバックを指定するオプション
 * @returns アップロード後のストレージキー
 * @throws Error  API エラー時、またはチャンク送信に失敗した場合
 */
export const uploadFileWithChunks = async (
  file: File,
  filePath: string,
  options: ChunkUploadOptions = {}
): Promise<string> => {
  const client = createApiClient();
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const totalChunks = Math.ceil(file.size / chunkSize);

  // 1. セッション開始（uploadId 取得）
  const initRes = await client.post<ApiResponse<{ uploadId: string }>>(
    '/files/chunks/init',
    {
      fileName: file.name,
      totalChunks,
      filePath,
    }
  );

  if (!initRes.data.success || !initRes.data.data?.uploadId) {
    throw new Error('チャンクアップロードセッションの開始に失敗しました');
  }

  const { uploadId } = initRes.data.data;
  console.log(`🆕 [ChunkUpload] セッション開始: uploadId=${uploadId}, totalChunks=${totalChunks}`);

  // セッション開始直後に uploadId を呼び出し元へ通知（キャンセル処理に使用）
  if (options.onSessionInit) {
    options.onSessionInit(uploadId);
  }

  // 2. チャンクを順次送信
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const blob = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', blob, file.name);
    formData.append('chunkIndex', String(i));

    await client.post(`/files/chunks/${uploadId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e: AxiosProgressEvent) => {
        // 統一計算式: (完了済みバイト数 + e.loaded) / file.size × 100
        // 完了済みバイト数 = 完了チャンク数 × chunkSize
        if (options.onProgress) {
          const completedBytes = i * chunkSize;
          const percent = Math.min(
            Math.round(((completedBytes + e.loaded) / file.size) * 100),
            99 // 100% は complete API 成功後にのみ設定
          );
          options.onProgress(percent);
        }
      },
    });

    console.log(`📦 [ChunkUpload] チャンク送信: ${i + 1}/${totalChunks}`);
  }

  // 3. 結合・完了
  const completeRes = await client.post<ApiResponse<{ fileKey: string; fileSize: number; contentType: string }>>(
    `/files/chunks/${uploadId}/complete`,
    {
      totalChunks,
      contentType: file.type || 'application/octet-stream',
    }
  );

  if (!completeRes.data.success || !completeRes.data.data?.fileKey) {
    throw new Error('チャンクアップロードの完了処理に失敗しました');
  }

  console.log(`✅ [ChunkUpload] 完了: fileKey=${completeRes.data.data.fileKey}`);
  return completeRes.data.data.fileKey;
};

/**
 * チャンクアップロードセッションを中断し、サーバー上の一時ファイルを削除する
 *
 * ダイアログを閉じたときなど、complete を呼ばずに終了するときに使用する。
 * エラーが発生しても例外は投げない（best-effort）。
 *
 * @param uploadId サーバーが発行したセッション識別子
 */
export const abortChunkUpload = async (uploadId: string): Promise<void> => {
  const client = createApiClient();
  try {
    await client.delete(`/files/chunks/${uploadId}`);
    console.log(`🚫 [ChunkUpload] 中断完了: uploadId=${uploadId}`);
  } catch (error) {
    // 中断は best-effort。エラーをログだけ出して無視する
    console.warn(`⚠️ [ChunkUpload] 中断リクエスト失敗（無視）: uploadId=${uploadId}`, error);
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

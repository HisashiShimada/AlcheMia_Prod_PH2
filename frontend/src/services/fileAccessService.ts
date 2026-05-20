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
import { extractErrorMessage } from '@/utils/errorUtils';
import { extractParentUuids } from '@/utils/maimlParentInjector';
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
  RenameFileRequest,
  RenameFileResponse,
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
 * @returns Promise<UploadResponseData & { failedFileNames: string[] }> アップロード結果
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
): Promise<UploadResponseData & { failedFileNames: string[] }> => {
  const {
    uploadMode,
    targetPath,
    files,
    metadata,
    onProgress,
    onRetry,
    onSessionInit,
    signal,
  } = params;

  // ---------------------------------------------------------------------------
  // ファイルごと個別アップロード (2026-03-26)
  // 全ファイルを並行して個別リクエストで送信する。
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

    // FormData の構築
    const formData = new FormData();
    formData.append('uploadMode', uploadMode);
    formData.append('targetPath', targetPath);
    formData.append('filePaths', JSON.stringify([file.name]));
    formData.append('files', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    // アップロード実行（リトライあり）
    const response = await withRetry(
      () => client.post<ApiResponse<UploadResponseData>>(
        '/files/upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          signal,
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total && onProgress) {
              const percent = Math.min(
                Math.round((progressEvent.loaded / progressEvent.total) * 100),
                99
              );
              onProgress({
                uploadedBytes: progressEvent.loaded,
                totalBytes: progressEvent.total,
                percentage: Math.round(
                  ((completedCount + percent / 100) / totalCount) * 100
                ),
                uploadedCount: completedCount,
                totalCount,
              });
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

    // サーバー側でアップロードが拒否された場合（UUID不一致等）
    // HTTP 200 でも files[] が空の場合は失敗扱いにする
    const uploadedFile = response.data.data.files[0];
    if (!uploadedFile) {
      const failedFiles = response.data.data.summary?.failedFiles ?? 0;
      const reason = failedFiles > 0
        ? `${file.name} のアップロードがサーバーで拒否されました（アップロード先プロジェクトに異なるMAIMLが登録済みの可能性があります）`
        : `${file.name} のアップロードに失敗しました`;
      throw new Error(reason);
    }

    // 完了通知
    completedCount++;
    if (onProgress) {
      onProgress({
        uploadedBytes: file.size,
        totalBytes: file.size,
        percentage: Math.round((completedCount / totalCount) * 100),
        uploadedCount: completedCount,
        totalCount,
      });
    }

    return uploadedFile;
  };

  /**
   * 1 ファイルをチャンク方式でアップロードするヘルパー
   */
  const uploadSingleFileWithChunks = async (file: File): Promise<UploadedFileInfo> => {
    const filePath = `${targetPath.replace(/\/+$/, '')}/${file.name}`;

    const fileKey = await uploadFileWithChunks(file, filePath, {
      onProgress: (percent) => {
        if (onProgress) {
          onProgress({
            uploadedBytes: Math.round((percent / 100) * file.size),
            totalBytes: file.size,
            percentage: Math.round(
              ((completedCount + percent / 100) / totalCount) * 100
            ),
            uploadedCount: completedCount,
            totalCount,
          });
        }
      },
      onSessionInit,
      onRetry,
      signal, // ✅ AbortSignal をチャンクアップロードにも伝播
      batchId: metadata?.batchId, // ✅ キャンセル競合検出用に batchId を伝播
    });

    completedCount++;
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
  const failedFileNames: string[] = [];
  const failedFileReasons: Record<string, string> = {};

  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      successFiles.push(result.value);
    } else {
      failedCount++;
      const file = files[idx];
      failedFileNames.push(file.name);
      // AxiosError のレスポンスボディからエラーコードを取得し、日本語メッセージに変換
      const reason = result.reason;
      const apiCode = (reason as any)?.response?.data?.error?.code as string | undefined;
      const errorMessage = apiCode
        ? extractErrorMessage(reason)
        : (reason instanceof Error ? reason.message : extractErrorMessage(reason));
      failedFileReasons[file.name] = errorMessage;
      console.error(`[uploadFiles] ${file.name} アップロード失敗 (${apiCode ?? 'unknown'}):`, reason);
    }
  });

  // キャンセルエラー判定ヘルパー
  // ERR_CANCELED（axios）/ CanceledError / AbortError / "canceled" メッセージをすべてキャンセルとみなす
  const isCanceledError = (reason: unknown): boolean => {
    if (!reason) return false;
    const r = reason as { code?: string; name?: string; message?: string };
    return (
      r.code === 'ERR_CANCELED' ||
      r.name === 'CanceledError' ||
      r.name === 'AbortError' ||
      r.message === 'canceled'
    );
  };

  // キャンセルエラーが1件でも含まれていたら CanceledError をスロー
  // （一部成功・一部キャンセルの場合も「キャンセル」として扱う）
  const hasCanceledError = results.some(
    (r): r is PromiseRejectedResult =>
      r.status === 'rejected' && isCanceledError(r.reason)
  );

  if (hasCanceledError) {
    const cancelError = new Error('アップロードがキャンセルされました');
    cancelError.name = 'CanceledError';
    throw cancelError;
  }

  // 全ファイルが失敗した場合は最初のエラーをそのままスロー
  // (AxiosError を維持することで extractErrorMessage が正確なメッセージを返す)
  if (failedCount === files.length) {
    const firstRejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    throw firstRejected?.reason ?? new Error('すべてのファイルのアップロードに失敗しました');
  }

  // 成功したファイルの中に .maiml が含まれるか判定
  const hasMaimlFile = successFiles.some(f => f.fileName.endsWith('.maiml'));

  return {
    uploadMode,
    files: successFiles,
    summary: {
      totalFiles: files.length,
      successfulFiles: successFiles.length,
      failedFiles: failedCount,
      totalSize: successFiles.reduce((sum, f) => sum + f.fileSize, 0),
    },
    failedFileNames,
    failedFileReasons,
    hasMaimlFile,
  };
};

/**
 * バッチ先行作成
 *
 * アップロード開始前にバッチを in_progress 状態で先行作成し、batchId を返す。
 * フロントエンドはこの batchId を使ってアップロード途中でもキャンセルを実行できる。
 *
 * @param params.batchName バッチ名（省略時はサーバー側で自動生成）
 * @param params.uploadType アップロード種別（single / bulk / folder）
 * @returns batchId
 * @throws Error APIエラー時
 */
export const initBatch = async (params: {
  batchName?: string;
  uploadType: 'single' | 'bulk' | 'folder';
  totalFiles: number;
}): Promise<string> => {
  const client = createApiClient();

  try {
    const response = await client.post<ApiResponse<{ batchId: string }>>(
      '/files/batches/init',
      params
    );
    if (!response.data.success) {
      throw new Error('バッチの作成に失敗しました');
    }
    return (response.data as { success: true; data: { batchId: string } }).data.batchId;
  } catch (error) {
    console.error('バッチ先行作成エラー:', error);
    throw error;
  }
};

/**
 * バッチキャンセル
 * 
 * Task: アップロードキャンセル機能実装
 * - バッチIDを指定してアップロード処理をキャンセル
 * - 既にアップロードされたファイルを削除
 * - organization_idは認証情報から自動取得
 * 
 * @param batchId バッチID
 * @returns Promise<void> キャンセル完了後に解決
 * @throws Error APIエラー時
 * 
 * @example
 * await cancelBatch('batch_abc123');
 */
export const cancelBatch = async (batchId: string): Promise<void> => {
  const client = createApiClient();

  try {
    await client.post(`/files/batches/${batchId}/cancel`);
    console.log('バッチキャンセル成功:', batchId);
  } catch (error) {
    console.error('バッチキャンセルエラー:', error);
    throw error;
  }
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
 * Task: プロジェクト管理画面maimlファイル削除時project_status確認（2026-03-27）
 * - オプショナルパラメータ: checkProjectStatus
 * - プロジェクト管理画面からはcheckProjectStatus=trueで呼び出し
 * - maimlファイル削除時にproject_status=0であることを確認
 * 
 * @param fileKey ファイルキー（相対パス）
 * @param checkProjectStatus project_statusチェックを行うか（デフォルト: false）
 * @returns Promise<void> 削除完了後に解決
 * @throws Error APIエラー時
 * 
 * @example
 * // フォーマットファイル削除（statusチェックなし）
 * await deleteFileByKey('formats/chemistry/template.xml');
 * 
 * // プロジェクトファイル削除（statusチェックなし）
 * await deleteFileByKey('projects/sample_project/data.csv');
 * 
 * // プロジェクト管理画面からのmaimlファイル削除（statusチェックあり）
 * await deleteFileByKey('projects/sample_project/sample_project.maiml', true);
 */
export const deleteFileByKey = async (
  fileKey: string,
  checkProjectStatus?: boolean
): Promise<void> => {
  const client = createApiClient();

  try {
    await client.delete('/files/delete', {
      data: {
        fileKey,
        ...(checkProjectStatus !== undefined && { checkProjectStatus }),
      },
    });

    console.log('ファイル削除成功:', fileKey);
  } catch (error) {
    console.error('ファイル削除エラー:', error);
    throw error;
  }
};

/**
 * MAIMLファイルの Parent チェーン UUID を抽出するヘルパー
 *
 * `<parent>` タグ配下の `<uuid>` 子要素テキストの配列を取得する。
 * injectParentTag() により Document UUID が再採番されるため、
 * 上書きチェックには Document UUID 直接比較ではなく Parentチェーンを使用する。
 * 失敗した場合は null を返す（例外はスローしない）。
 *
 * @param file MAIMLファイル
 * @returns Parent UUID 配列（Parentタグが存在しない場合は空配列、取得失敗は null）
 */
const extractMaimlParentUuids = async (file: File): Promise<string[] | null> => {
  try {
    const content = await file.text();
    return extractParentUuids(content);
  } catch {
    return null;
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

  // MAIMLファイルの場合、事前にParentチェーンUUIDを抽出してセッション初期化に含める
  // （options.parentUuids が既に指定されている場合はそれを優先）
  // injectParentTag() により Document UUID が再採番されるため、
  // Document UUID の直接比較は廃止し、Parentチェーンによる照合を行う
  let parentUuids = options.parentUuids;
  if (parentUuids === undefined && file.name.toLowerCase().endsWith('.maiml')) {
    const extracted = await extractMaimlParentUuids(file);
    if (extracted !== null && extracted.length > 0) {
      parentUuids = extracted;
      console.log(`🔍 [ChunkUpload] Parent UUID 抽出成功: ${JSON.stringify(parentUuids)}`);
    } else {
      console.warn('⚠️ [ChunkUpload] Parent UUID 抽出失敗またはParentタグなし（初回アップロードとして扱う）');
    }
  }

  // 1. セッション開始（uploadId 取得）
  const initRes = await withRetry(
    () => client.post<ApiResponse<{ uploadId: string }>>(
      '/files/chunks/init',
      {
        fileName: file.name,
        totalChunks,
        filePath,
        // Parentチェーン一致チェック用: MAIMLファイルかつParent UUID抽出成功時のみ送信
        ...(parentUuids && parentUuids.length > 0 ? { parentUuids: JSON.stringify(parentUuids) } : {}),
      },
      { signal: options.signal } // ✅ AbortSignal を渡す
    ),
    DEFAULT_RETRY_OPTIONS,
    options.onRetry
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

    await withRetry(
      () => client.post(`/files/chunks/${uploadId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: options.signal, // ✅ AbortSignal を渡す
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
      }),
      DEFAULT_RETRY_OPTIONS,
      options.onRetry
    );

    console.log(`📦 [ChunkUpload] チャンク送信: ${i + 1}/${totalChunks}`);
  }

  // 3. 結合・完了
  const completeRes = await withRetry(
    () => client.post<ApiResponse<{ fileKey: string; fileSize: number; contentType: string }>>(
      `/files/chunks/${uploadId}/complete`,
      {
        totalChunks,
        contentType: file.type || 'application/octet-stream',
        // ✅ batchId を渡すことでバックエンドがキャンセル済み判定を実施できる
        ...(options.batchId && { batchId: options.batchId }),
      },
      { signal: options.signal } // ✅ AbortSignal を渡す
    ),
    DEFAULT_RETRY_OPTIONS,
    options.onRetry
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

// ---------------------------------------------------------------------------
// ファイル名変更
// ---------------------------------------------------------------------------

/**
 * ファイル名変更API
 *
 * PATCH /api/v1/files/rename
 *
 * @param params fileKey と newFileName
 * @returns 変更後の fileKey
 */
export const renameFile = async (
  params: RenameFileRequest
): Promise<RenameFileResponse> => {
  const api = createApiClient();
  const response = await api.patch<ApiResponse<{ newFileKey: string }>>(
    '/files/rename',
    params
  );
  return response.data as RenameFileResponse;
};

// ---------------------------------------------------------------------------
// フォルダ削除
// ---------------------------------------------------------------------------

/**
 * フォルダ再帰削除API
 *
 * DELETE /api/v1/files/delete-folder
 *
 * 指定されたフォルダパス配下のファイルをすべて再帰的に削除する。
 *
 * @param folderPath 削除対象フォルダの相対パス（organizationId なし。例: "projects/foo/rawdata"）
 * @returns 削除されたファイル数を含む結果
 *
 * @example
 * // プロジェクト配下のサブフォルダを削除
 * await deleteFolderByPath('projects/sample_project/rawdata');
 *
 * // フォーマット配下のサブフォルダを削除
 * await deleteFolderByPath('formats/dept_001/chemistry');
 */
export const deleteFolderByPath = async (
  folderPath: string
): Promise<{ success: boolean; data?: { message: string; folderPath: string; deletedCount: number }; error?: { code: string; message: string } }> => {
  const api = createApiClient();
  const response = await api.delete('/files/delete-folder', {
    data: { folderPath },
  });
  return response.data;
};

/**
 * 並列処理制御ユーティリティ
 * 
 * Phase2-2: 並列処理最適化（2026-02-18）
 * Reference版uploadRoutes.jsの並列処理ロジックを移植
 * 
 * 目的:
 * - 大量ファイルアップロード時のメモリ使用量制御
 * - S3/Swift APIの同時接続数制限への対応
 * - サーバーリソースの最適利用
 */

/**
 * 並列処理結果の型定義
 */
export interface ConcurrencyResult<T> {
  /** 処理成功フラグ */
  success: boolean;
  /** 処理結果データ（成功時） */
  data?: T;
  /** エラーメッセージ（失敗時） */
  error?: string;
  /** エラーコード（失敗時・エラークラスが code プロパティを持つ場合） */
  errorCode?: string;
  /** 元のエラーオブジェクト（失敗時） */
  originalError?: unknown;
}

/**
 * 並列数を制御してPromiseを実行
 * 
 * @description
 * アイテム配列を指定された並列数でチャンク分割し、
 * 各チャンクを並列処理、チャンク間は順次処理する。
 * これにより、メモリ使用量とAPI接続数を制御する。
 * 
 * @example
 * ```typescript
 * const files = [file1, file2, ..., file100];
 * const results = await processConcurrently(
 *   files,
 *   async (file) => await uploadFile(file),
 *   5 // 5並列
 * );
 * 
 * // 100ファイル → 20チャンク（各5ファイル）
 * // チャンク1: [file1-5] 並列処理 → 完了待ち
 * // チャンク2: [file6-10] 並列処理 → 完了待ち
 * // ...
 * ```
 * 
 * @template T アイテムの型
 * @template R 処理結果の型
 * @param items 処理対象の配列
 * @param asyncFunction 各アイテムに対して実行する非同期関数
 * @param concurrency 並列数（デフォルト: 5）
 * @returns 実行結果の配列
 */
export async function processConcurrently<T, R>(
  items: T[],
  asyncFunction: (item: T, index: number) => Promise<R>,
  concurrency: number = 5
): Promise<ConcurrencyResult<R>[]> {
  const results: ConcurrencyResult<R>[] = [];

  // 空配列の場合は即座に返却
  if (!items || items.length === 0) {
    return results;
  }

  // 並列数の妥当性チェック
  const validConcurrency = Math.max(1, Math.min(concurrency, items.length));

  // アイテムをチャンクに分割
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += validConcurrency) {
    chunks.push(items.slice(i, i + validConcurrency));
  }

  console.log(
    `🔄 [Concurrency] 並列処理開始: ${items.length}件 (並列数: ${validConcurrency}, チャンク数: ${chunks.length})`
  );

  // 各チャンクを順次処理
  let processedCount = 0;
  const startTime = Date.now();

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    const chunkStartTime = Date.now();

    // チャンク内のアイテムを並列処理
    const chunkPromises = chunk.map(async (item, localIndex) => {
      const globalIndex = processedCount + localIndex;
      try {
        const data = await asyncFunction(item, globalIndex);
        return { success: true, data } as ConcurrencyResult<R>;
      } catch (error) {
        // エラーコードを保持
        // 優先順位:
        //   1. AxiosError のレスポンスボディ（error.response.data.error.code）
        //      → initChunkUpload 等がバックエンドから返した E7013 など
        //   2. カスタムエラークラスの code プロパティ（ValidationError 等）
        //      → バックエンドで throw された Error.code
        //   3. どちらも取れない場合は undefined
        const axiosApiCode = (error as any)?.response?.data?.error?.code as string | undefined;
        const errorCode: string | undefined = axiosApiCode ?? ((error as any)?.code as string | undefined);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          ...(errorCode ? { errorCode } : {}),
          originalError: error,
        } as ConcurrencyResult<R>;
      }
    });

    // チャンク内の全処理を待機
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
    processedCount += chunk.length;

    const chunkElapsed = Date.now() - chunkStartTime;
    const chunkSuccessCount = chunkResults.filter((r) => r.success).length;
    const chunkFailCount = chunkResults.filter((r) => !r.success).length;

    console.log(
      `📊 [Concurrency] チャンク${chunkIndex + 1}/${chunks.length} 完了: ` +
        `成功=${chunkSuccessCount}, 失敗=${chunkFailCount}, ` +
        `処理時間=${chunkElapsed}ms, 進捗=${processedCount}/${items.length}`
    );
  }

  const totalElapsed = Date.now() - startTime;
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log(
    `✅ [Concurrency] 並列処理完了: ` +
      `成功=${successCount}, 失敗=${failCount}, ` +
      `総処理時間=${totalElapsed}ms (平均: ${Math.round(totalElapsed / items.length)}ms/件)`
  );

  return results;
}

/**
 * 環境変数から並列数を取得
 * 
 * @description
 * UPLOAD_CONCURRENCY環境変数から並列数を取得する。
 * 設定がない場合はデフォルト値（5）を返す。
 * 不正な値の場合もデフォルト値を返す。
 * 
 * @returns 並列数（1-20の範囲、デフォルト: 5）
 * 
 * @example
 * ```typescript
 * // .env
 * UPLOAD_CONCURRENCY=10
 * 
 * // コード
 * const concurrency = getConcurrency(); // 10
 * ```
 */
export function getConcurrency(): number {
  const envValue = process.env.UPLOAD_CONCURRENCY;

  // 環境変数が設定されていない場合はデフォルト値
  if (!envValue) {
    return 5;
  }

  // 数値に変換
  const concurrency = parseInt(envValue, 10);

  // NaNまたは範囲外の場合はデフォルト値
  if (isNaN(concurrency) || concurrency < 1 || concurrency > 20) {
    console.warn(
      `⚠️ [Concurrency] 不正な並列数: ${envValue}、デフォルト(5)を使用します`
    );
    return 5;
  }

  return concurrency;
}

/**
 * 並列処理のパフォーマンスメトリクスを取得
 * 
 * @param results 並列処理結果
 * @returns パフォーマンスメトリクス
 */
export function getPerformanceMetrics<T>(
  results: ConcurrencyResult<T>[]
): {
  totalCount: number;
  successCount: number;
  failCount: number;
  successRate: number;
} {
  const totalCount = results.length;
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

  return {
    totalCount,
    successCount,
    failCount,
    successRate,
  };
}

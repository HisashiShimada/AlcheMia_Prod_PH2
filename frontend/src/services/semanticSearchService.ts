/**
 * セマンティック検索 APIクライアントサービス
 *
 * @description セマンティック検索APIとの通信を担当するサービス
 * @remarks Cookie認証方式（withCredentials）を使用
 */

import { createApiClient } from '@/utils/authUtils';
import type {
  SemanticSearchRequest,
  SemanticSearchResponse,
  IndexStatsResponse,
  SemanticSearchHealth,
  BatchJob,
  BatchStats,
  BatchIngestOptions,
  DecomposedQuery,
} from '@/types/semanticSearch';

const BASE_PATH = '/semantic-search';

/**
 * セマンティック検索を実行する
 *
 * @param params - 検索パラメータ
 * @returns 検索レスポンス
 */
export async function searchTransitionSets(
  params: SemanticSearchRequest
): Promise<SemanticSearchResponse> {
  const api = createApiClient();
  const response = await api.post<{ success: boolean; data: SemanticSearchResponse }>(
    `${BASE_PATH}/search`,
    params
  );
  return response.data.data;
}

/**
 * 1ファイルをインデックスに登録する
 *
 * @param filePath - ファイルパス（organization_id省略の相対パス）
 * @returns UPSERTされた件数
 */
export async function indexFile(
  filePath: string
): Promise<{ upsertedCount: number; filePath: string }> {
  const api = createApiClient();
  const response = await api.post<{
    success: boolean;
    data: { upsertedCount: number; filePath: string };
  }>(`${BASE_PATH}/index`, { filePath });
  return response.data.data;
}

/**
 * インデックス統計を取得する
 *
 * @returns インデックス統計
 */
export async function getIndexStats(): Promise<IndexStatsResponse> {
  const api = createApiClient();
  const response = await api.get<{ success: boolean; data: IndexStatsResponse }>(
    `${BASE_PATH}/stats`
  );
  return response.data.data;
}

/**
 * ヘルスチェック
 *
 * @returns ヘルス情報
 */
export async function checkHealth(): Promise<SemanticSearchHealth> {
  const api = createApiClient();
  const response = await api.get<{ success: boolean; data: SemanticSearchHealth }>(
    `${BASE_PATH}/health`
  );
  return response.data.data;
}

// ─── バッチ処理API ───────────────────────────────────────

/**
 * バッチ処理を開始する
 */
export async function startBatch(
  options: BatchIngestOptions
): Promise<{ batch_job_id: string }> {
  const api = createApiClient();
  const response = await api.post<{ success: boolean; data: { batch_job_id: string } }>(
    `${BASE_PATH}/batch`,
    options
  );
  return response.data.data;
}

/**
 * バッチジョブ一覧を取得する
 */
export async function listBatchJobs(): Promise<BatchJob[]> {
  const api = createApiClient();
  const response = await api.get<{ success: boolean; data: { jobs: BatchJob[] } }>(
    `${BASE_PATH}/batch`
  );
  return response.data.data.jobs;
}

/**
 * バッチ統計を取得する
 */
export async function getBatchStats(): Promise<BatchStats> {
  const api = createApiClient();
  const response = await api.get<{ success: boolean; data: BatchStats }>(
    `${BASE_PATH}/batch/stats`
  );
  return response.data.data;
}

/**
 * バッチジョブをキャンセルする
 */
export async function cancelBatchJob(jobId: string): Promise<void> {
  const api = createApiClient();
  await api.delete(`${BASE_PATH}/batch/${jobId}`);
}

// ─── クエリ分解API ───────────────────────────────────────

/**
 * 自然言語クエリを4軸に分解する
 *
 * @param query - 自然言語クエリ
 * @returns DecomposedQuery（gpt-oss未接続時はフォールバック動作）
 */
export async function decomposeNaturalLanguageQuery(query: string): Promise<DecomposedQuery> {
  const api = createApiClient();
  const response = await api.post<{ success: boolean; data: DecomposedQuery }>(
    `${BASE_PATH}/decompose`,
    { query }
  );
  return response.data.data;
}

/**
 * セマンティック検索コントローラー
 *
 * @description セマンティック検索のAPIリクエストハンドラ
 * @remarks
 * 流用元: semantic_search/backend/controllers/maimlDatalake/transitionSetSearchController.js
 * TypeScript変換・既存ミドルウェアへの組み込み
 */

import { Request, Response } from 'express';
import { JwtPayload } from '../types/auth';
import { generate4AxisVectors, healthCheck as embeddingHealthCheck, getServiceInfo } from '../services/transitionSetEmbeddingService';
import { ingestSingleFile } from '../services/singleFileIngestService';
import {
  ingestAllFiles,
  listBatchJobs,
  getBatchStats,
  cancelBatchJob,
} from '../services/batchIngestService';
import * as semanticSearchRepository from '../repositories/semanticSearchRepository';
import {
  SearchRequest,
  SearchResponse,
  IndexRequest,
  IndexResponse,
  DeleteIndexRequest,
  DeleteIndexResponse,
  IndexStatsResponse,
} from '../types/semanticSearch';

/** デフォルト重み設定 */
const DEFAULT_WEIGHTS = {
  input: 0.28,
  transition: 0.40,
  output: 0.22,
  structure: 0.10,
};

/** デフォルト返却件数 */
const DEFAULT_TOP_K = 10;
const MAX_TOP_K = 50;

/**
 * 共通エラーハンドラ
 */
function handleError(res: Response, error: unknown, defaultMessage: string): void {
  console.error(`[semanticSearchController] ${defaultMessage}:`, error);
  const message = error instanceof Error ? error.message : defaultMessage;
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message },
    meta: { timestamp: new Date().toISOString() },
  });
}

/**
 * セマンティック検索
 * POST /api/v1/semantic-search/search
 */
export async function search(req: Request, res: Response): Promise<void> {
  try {
    const authUser = req.user as JwtPayload;
    const body = req.body as SearchRequest;

    const {
      input_query,
      transition_query,
      output_query,
      structure_query,
      top_k = DEFAULT_TOP_K,
      project_name,
      technique,
      weights,
    } = body;

    // バリデーション
    if (!input_query && !transition_query && !output_query && !structure_query) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'At least one query field is required' },
      });
      return;
    }

    const resolvedTopK = Math.min(Math.max(1, top_k), MAX_TOP_K);
    const resolvedWeights = {
      input: weights?.input ?? DEFAULT_WEIGHTS.input,
      transition: weights?.transition ?? DEFAULT_WEIGHTS.transition,
      output: weights?.output ?? DEFAULT_WEIGHTS.output,
      structure: weights?.structure ?? DEFAULT_WEIGHTS.structure,
    };

    const startTime = Date.now();

    // クエリテキストを4軸ベクトルに変換
    const vectors = await generate4AxisVectors(
      input_query || '',
      transition_query || '',
      output_query || '',
      structure_query || ''
    );

    // DB検索
    const hits = await semanticSearchRepository.search(
      authUser.organizationId,
      vectors.emb_input,
      vectors.emb_transition,
      vectors.emb_output,
      vectors.emb_structure,
      resolvedWeights.input,
      resolvedWeights.transition,
      resolvedWeights.output,
      resolvedWeights.structure,
      resolvedTopK,
      technique ?? null,
      project_name ?? null
    );

    const elapsedMs = Date.now() - startTime;

    const response: SearchResponse = {
      hits,
      total: hits.length,
      query_info: {
        top_k: resolvedTopK,
        weights: resolvedWeights as Required<typeof resolvedWeights>,
        technique_filter: technique ?? null,
        project_name_filter: project_name ?? null,
        elapsed_ms: elapsedMs,
      },
    };

    res.json({
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    handleError(res, error, 'セマンティック検索エラー');
  }
}

/**
 * インデックス登録（1ファイル）
 * POST /api/v1/semantic-search/index
 */
export async function indexFile(req: Request, res: Response): Promise<void> {
  try {
    const authUser = req.user as JwtPayload;
    const { filePath } = req.body as IndexRequest;

    if (!filePath) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'filePath is required' },
      });
      return;
    }

    const result = await ingestSingleFile(authUser.organizationId, filePath);

    const response: IndexResponse = {
      upsertedCount: result.upsertedCount,
      filePath: result.filePath,
    };

    res.json({
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    handleError(res, error, 'インデックス登録エラー');
  }
}

/**
 * インデックス削除（ファイル単位）
 * DELETE /api/v1/semantic-search/index
 */
export async function deleteIndex(req: Request, res: Response): Promise<void> {
  try {
    const authUser = req.user as JwtPayload;
    const { filePath } = req.body as DeleteIndexRequest;

    if (!filePath) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'filePath is required' },
      });
      return;
    }

    const deletedCount = await semanticSearchRepository.deleteByFilePath(
      authUser.organizationId,
      filePath
    );

    const response: DeleteIndexResponse = { deletedCount, filePath };

    res.json({
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    handleError(res, error, 'インデックス削除エラー');
  }
}

/**
 * インデックス統計取得
 * GET /api/v1/semantic-search/stats
 */
export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const authUser = req.user as JwtPayload;
    const byProject = await semanticSearchRepository.getStats(authUser.organizationId);

    const totalTransitionSets = byProject.reduce(
      (sum, p) => sum + p.transition_set_count,
      0
    );
    const totalFiles = byProject.reduce((sum, p) => sum + p.file_count, 0);

    const response: IndexStatsResponse = {
      totalTransitionSets,
      totalFiles,
      byProject,
    };

    res.json({
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    handleError(res, error, '統計取得エラー');
  }
}

/**
 * バッチ処理開始
 * POST /api/v1/semantic-search/batch
 */
export async function startBatch(req: Request, res: Response): Promise<void> {
  try {
    const authUser = req.user as JwtPayload;
    const { forceReprocess, maxFiles } = req.body;

    const jobId = await ingestAllFiles(authUser.organizationId, {
      forceReprocess: Boolean(forceReprocess),
      maxFiles: maxFiles ? Number(maxFiles) : null,
    });

    res.json({
      success: true,
      data: { batch_job_id: jobId },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    handleError(res, error, 'バッチ処理開始エラー');
  }
}

/**
 * バッチジョブ一覧取得
 * GET /api/v1/semantic-search/batch
 */
export async function getBatchJobs(req: Request, res: Response): Promise<void> {
  try {
    const authUser = req.user as JwtPayload;
    const jobs = listBatchJobs(authUser.organizationId);
    res.json({
      success: true,
      data: { jobs },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    handleError(res, error, 'バッチジョブ一覧取得エラー');
  }
}

/**
 * バッチ統計取得
 * GET /api/v1/semantic-search/batch/stats
 */
export async function getBatchStatsController(req: Request, res: Response): Promise<void> {
  try {
    const authUser = req.user as JwtPayload;
    const stats = getBatchStats(authUser.organizationId);
    res.json({
      success: true,
      data: stats,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    handleError(res, error, 'バッチ統計取得エラー');
  }
}

/**
 * バッチジョブキャンセル
 * DELETE /api/v1/semantic-search/batch/:jobId
 */
export async function cancelBatch(req: Request, res: Response): Promise<void> {
  try {
    const authUser = req.user as JwtPayload;
    const { jobId } = req.params;

    const cancelled = cancelBatchJob(jobId, authUser.organizationId);
    if (!cancelled) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'ジョブが見つからないか、キャンセルできない状態です' },
      });
      return;
    }

    res.json({
      success: true,
      data: { jobId },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    handleError(res, error, 'バッチジョブキャンセルエラー');
  }
}

/**
 * ヘルスチェック
 * GET /api/v1/semantic-search/health
 */
export async function health(_req: Request, res: Response): Promise<void> {
  try {
    const ollamaHealthy = await embeddingHealthCheck();

    res.json({
      success: true,
      data: {
        status: ollamaHealthy ? 'ok' : 'degraded',
        ollama: ollamaHealthy ? 'ok' : 'unreachable',
        serviceInfo: getServiceInfo(),
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    handleError(res, error, 'ヘルスチェックエラー');
  }
}

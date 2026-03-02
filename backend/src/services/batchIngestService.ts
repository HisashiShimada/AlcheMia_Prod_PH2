/**
 * バッチIngestionサービス
 *
 * @description 組織配下の全MAIMLファイルをスキャンしてセマンティック検索インデックスを一括生成する。
 * @remarks
 * - 1ファイルずつ直列処理してOllama負荷を制御
 * - バッチジョブの状態はメモリ管理（再起動で消える）
 * - ジョブIDはUUID v4
 */

import { v4 as uuidv4 } from 'uuid';
import { getStorageService } from './storageService';
import { ingestSingleFile } from './singleFileIngestService';

/** バッチジョブステータス */
export type BatchJobStatus = 'started' | 'processing' | 'completed' | 'failed' | 'cancelled';

/** バッチジョブ */
export interface BatchJob {
  id: string;
  organization_id: string;
  status: BatchJobStatus;
  total_files: number;
  processed_files: number;
  failed_files: number;
  skipped_files: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

/** バッチ処理オプション */
export interface BatchIngestOptions {
  /** 既存インデックスを強制再処理するか */
  forceReprocess?: boolean;
  /** 最大処理ファイル数（省略時は全ファイル） */
  maxFiles?: number | null;
}

/** バッチ統計 */
export interface BatchStats {
  total_jobs: number;
  total_files_processed: number;
  total_files_failed: number;
  total_embeddings_generated: number;
}

/** メモリ上のジョブストア（キャンセル状態を別管理） */
const jobStore = new Map<string, BatchJob>();
const cancelledJobs = new Set<string>();

/**
 * 全バッチジョブを取得（新しい順）
 */
export function listBatchJobs(organizationId: string): BatchJob[] {
  return Array.from(jobStore.values())
    .filter((j) => j.organization_id === organizationId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/**
 * バッチ統計を取得
 */
export function getBatchStats(organizationId: string): BatchStats {
  const jobs = listBatchJobs(organizationId);
  return {
    total_jobs: jobs.length,
    total_files_processed: jobs.reduce((s, j) => s + j.processed_files, 0),
    total_files_failed: jobs.reduce((s, j) => s + j.failed_files, 0),
    total_embeddings_generated: jobs.reduce((s, j) => s + j.processed_files, 0),
  };
}

/**
 * ジョブをキャンセル
 */
export function cancelBatchJob(jobId: string, organizationId: string): boolean {
  const job = jobStore.get(jobId);
  if (!job || job.organization_id !== organizationId) return false;
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') return false;
  cancelledJobs.add(jobId);
  return true;
}

/**
 * 組織配下の全MAIMLファイルをバッチ処理
 * （fire-and-forget: 呼び出し元はジョブIDを受け取り即座に返る）
 *
 * @returns 作成したジョブID
 */
export async function ingestAllFiles(
  organizationId: string,
  options: BatchIngestOptions = {}
): Promise<string> {
  const jobId = uuidv4();

  const job: BatchJob = {
    id: jobId,
    organization_id: organizationId,
    status: 'started',
    total_files: 0,
    processed_files: 0,
    failed_files: 0,
    skipped_files: 0,
    error_message: null,
    created_at: new Date().toISOString(),
    completed_at: null,
  };

  jobStore.set(jobId, job);

  // バックグラウンドで非同期実行
  _runBatch(job, organizationId, options).catch((err) => {
    console.error('[batchIngestService] 予期しないバッチエラー:', err);
    job.status = 'failed';
    job.error_message = err instanceof Error ? err.message : '不明なエラー';
    job.completed_at = new Date().toISOString();
  });

  return jobId;
}

/**
 * バッチ実行本体（非同期バックグラウンド）
 */
async function _runBatch(
  job: BatchJob,
  organizationId: string,
  options: BatchIngestOptions
): Promise<void> {
  const { forceReprocess = false, maxFiles = null } = options;
  const storageService = getStorageService();

  try {
    // projects/ 配下の .maiml ファイルを列挙
    const allFiles = await storageService.listFiles(organizationId, 'projects');
    const maimlFiles = allFiles
      .filter((f) => f.key.endsWith('.maiml'))
      .map((f) => f.key);

    const targetFiles = maxFiles ? maimlFiles.slice(0, maxFiles) : maimlFiles;
    job.total_files = targetFiles.length;
    job.status = 'processing';

    for (const filePath of targetFiles) {
      // キャンセルチェック
      if (cancelledJobs.has(job.id)) {
        job.status = 'cancelled';
        break;
      }

      try {
        const result = await ingestSingleFile(organizationId, filePath);
        if (result.skippedCount > 0 && result.upsertedCount === 0) {
          job.skipped_files++;
        } else {
          job.processed_files++;
        }
      } catch (err) {
        console.error(`[batchIngestService] ファイル処理失敗: ${filePath}`, err);
        job.failed_files++;
      }
    }

    if (!cancelledJobs.has(job.id)) {
      job.status = 'completed';
    }
    cancelledJobs.delete(job.id);
    job.completed_at = new Date().toISOString();
  } catch (err) {
    job.status = 'failed';
    job.error_message = err instanceof Error ? err.message : '不明なエラー';
    job.completed_at = new Date().toISOString();
    throw err;
  }
}

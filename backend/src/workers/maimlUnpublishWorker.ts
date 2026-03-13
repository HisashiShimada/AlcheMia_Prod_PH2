/**
 * MaiML 非公開 Worker
 *
 * @description
 *   maiml-unpublish キューからジョブを取得し、
 *   組織スキーマの maiml_asset を CASCADE DELETE する。
 *
 * 処理フロー:
 *   1. maiml_publish_job を running に更新
 *   2. 指定 asset_id の maiml_asset を CASCADE DELETE（関連テーブルも連鎖削除）
 *   3. maiml_publish_job を done に更新
 *   エラー時: maiml_publish_job を error に更新
 *
 * @reference docs/MaiML_OpenData_Pipeline/spec.md §9.3
 */

import { Worker, Job }           from 'bullmq';
import { createBullRedisConnection } from '../config/redis';
import { MAIML_UNPUBLISH_QUEUE_NAME } from '../queues/maimlUnpublishQueue';
import * as publishJobRepo            from '../repositories/maimlPublishJobRepository';
import * as assetRepo                 from '../repositories/maimlAssetRepository';
import { UnpublishJobData }           from '../types/maimlOpenData';

// ============================================================
// Worker インスタンス
// ============================================================

let unpublishWorker: Worker<UnpublishJobData> | null = null;

/**
 * MaiML 非公開 Worker を起動する
 */
export function startMaimlUnpublishWorker(): Worker<UnpublishJobData> {
  unpublishWorker = new Worker<UnpublishJobData>(
    MAIML_UNPUBLISH_QUEUE_NAME,
    async (job: Job<UnpublishJobData>) => {
      const { jobId, organizationId, assetId } = job.data;

      console.info(`[maimlUnpublishWorker] 開始 job_id=${jobId}`, {
        organizationId,
        assetId: String(assetId),
      });

      // ── 1. ジョブ状態を running に更新 ──────────────────
      await publishJobRepo.updateStatus(jobId, 'running', {
        started_at: new Date(),
      });

      try {
        // ── 2. maiml_asset を CASCADE DELETE ──────────────
        // ON DELETE CASCADE により関連テーブルも自動削除される
        await assetRepo.deleteAsset(organizationId, assetId);

        // ── 3. ジョブを done に更新 ────────────────────────
        await publishJobRepo.updateStatus(jobId, 'done', {
          finished_at: new Date(),
        });

        console.info(`[maimlUnpublishWorker] 完了 job_id=${jobId}`);

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[maimlUnpublishWorker] エラー job_id=${jobId}`, message);

        await publishJobRepo.updateStatus(jobId, 'error', {
          finished_at:   new Date(),
          error_message: message,
        });

        throw err; // bullmq にリトライさせる
      }
    },
    {
      connection:  createBullRedisConnection(),
      concurrency: 1,
    },
  );

  unpublishWorker.on('completed', (job) => {
    console.info(`[maimlUnpublishWorker] ジョブ完了 job_id=${job.id}`);
  });

  unpublishWorker.on('failed', (job, err) => {
    console.error(`[maimlUnpublishWorker] ジョブ失敗 job_id=${job?.id}`, err.message);
  });

  unpublishWorker.on('error', (err) => {
    console.error('[maimlUnpublishWorker] Worker エラー:', err.message);
  });

  console.info('[maimlUnpublishWorker] 起動完了');
  return unpublishWorker;
}

/**
 * MaiML 非公開 Worker を停止する
 */
export async function stopMaimlUnpublishWorker(): Promise<void> {
  if (unpublishWorker) {
    await unpublishWorker.close();
    unpublishWorker = null;
    console.info('[maimlUnpublishWorker] 停止完了');
  }
}

/**
 * MaiML Scanner Worker
 *
 * @description
 *   毎日 0 時（Repeat Job）に起動し、全組織の maiml_asset を横断スキャンして
 *   bullmq の maiml-unpublish キューに delayed Job が存在しないアセットを再投入する
 *   リカバリ Worker。
 *
 * 処理フロー:
 *   1. Repeat Job（cron: 毎日 0 時）として自動起動
 *   2. 全組織スキーマの maiml_asset（retention_until IS NOT NULL）を取得
 *   3. 各アセットに対して:
 *        - unpublish Job が既に存在する → スキップ（重複防止）
 *        - retention_until <= now() かつ Job なし → 即時 Job 投入（delay: 0）
 *        - retention_until > now() かつ Job なし → delayed Job 再登録
 *
 * @reference docs/MaiML_OpenData_Pipeline/spec.md §4.2
 */

import { Worker, Job } from 'bullmq';
import { createBullRedisConnection }    from '../config/redis';
import { MAIML_SCANNER_QUEUE_NAME, maimlScannerQueue } from '../queues/maimlScannerQueue';
import { maimlUnpublishQueue }          from '../queues/maimlUnpublishQueue';
import * as assetRepo                   from '../repositories/maimlAssetRepository';
import { UnpublishJobData }             from '../types/maimlOpenData';

// ============================================================
// Worker インスタンス
// ============================================================

let scannerWorker: Worker | null = null;

// Repeat Job 名
const SCAN_JOB_NAME = 'scan-retention';

/**
 * Scanner Repeat Job を maimlScannerQueue に登録する
 *
 * 毎日 0 時（cron 形式）に起動。
 * 既に同じ jobId が存在する場合は bullmq が重複を防止する。
 */
async function registerRepeatJob(): Promise<void> {
  await maimlScannerQueue.add(
    SCAN_JOB_NAME,
    {},
    {
      repeat: {
        pattern: '0 0 * * *', // 毎日 0 時
      },
    }
  );
  console.info('[maimlScannerWorker] Repeat Job 登録完了 (pattern: 0 0 * * *)');
}

/**
 * MaiML Scanner Worker を起動する
 *
 * @returns 起動した Worker インスタンス
 */
export async function startMaimlScannerWorker(): Promise<Worker> {
  // Repeat Job をキューに登録（冪等）
  await registerRepeatJob();

  scannerWorker = new Worker(
    MAIML_SCANNER_QUEUE_NAME,
    async (_job: Job) => {
      console.info('[maimlScannerWorker] スキャン開始');

      // ── 全組織の retention_until 付きアセットを取得 ──
      const assets = await assetRepo.findAllWithRetentionUntil();

      console.info(`[maimlScannerWorker] スキャン対象アセット数: ${assets.length}`);

      let skipped  = 0;
      let enqueued = 0;

      for (const asset of assets) {
        const jobId = `unpublish-${asset.asset_id}`;

        // 既存 Job があればスキップ（重複投入防止）
        const existingJob = await maimlUnpublishQueue.getJob(jobId);
        if (existingJob) {
          skipped++;
          continue;
        }

        // Job がない → 再投入（即時 or delayed）
        const delayMs = asset.retention_until.getTime() - Date.now();

        await maimlUnpublishQueue.add(
          'auto-unpublish',
          {
            jobId,
            organizationId: asset.organization_id,
            projectName:    '',    // Scanner 経由では project_name 不要（asset_id で削除）
            assetId:        asset.asset_id,
            triggerType:    'schedule',
          } satisfies UnpublishJobData,
          {
            jobId,
            delay: Math.max(delayMs, 0),
          }
        );

        enqueued++;
        console.info(
          `[maimlScannerWorker] Job 再投入 asset_id=${asset.asset_id} ` +
          `org=${asset.organization_id} delay=${Math.max(delayMs, 0)}ms`
        );
      }

      console.info(
        `[maimlScannerWorker] スキャン完了 ` +
        `enqueued=${enqueued} skipped=${skipped} total=${assets.length}`
      );
    },
    {
      connection:  createBullRedisConnection(),
      concurrency: 1, // 逐次処理（DB 負荷を抑制）
    }
  );

  scannerWorker.on('completed', (job) => {
    console.info(`[maimlScannerWorker] ジョブ完了 job_id=${job.id}`);
  });

  scannerWorker.on('failed', (job, err) => {
    console.error(`[maimlScannerWorker] ジョブ失敗 job_id=${job?.id}`, err.message);
  });

  scannerWorker.on('error', (err) => {
    console.error('[maimlScannerWorker] Worker エラー:', err.message);
  });

  console.info('[maimlScannerWorker] 起動完了');
  return scannerWorker;
}

/**
 * MaiML Scanner Worker を停止する
 */
export async function stopMaimlScannerWorker(): Promise<void> {
  if (scannerWorker) {
    await scannerWorker.close();
    scannerWorker = null;
    console.info('[maimlScannerWorker] 停止完了');
  }
}

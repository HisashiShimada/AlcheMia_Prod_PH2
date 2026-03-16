/**
 * MaiML Scanner キュー定義
 *
 * @description
 *   bullmq の Queue インスタンスを生成・export する。
 *   Scanner Worker（maimlScannerWorker.ts）が Repeat Job をこのキューに登録し、
 *   毎日 0 時に期限切れアセットの自動非公開 Job をリカバリする。
 *
 * @reference docs/MaiML_OpenData_Pipeline/spec.md §4.2
 */

import { Queue } from 'bullmq';
import { createBullRedisConnection } from '../config/redis';

export const MAIML_SCANNER_QUEUE_NAME = 'maiml-scanner';

/**
 * MaiML Scanner キュー
 *
 * Repeat Job でスキャンを実行し、Job 消失アセットの delayed Job を再投入する。
 */
export const maimlScannerQueue = new Queue(MAIML_SCANNER_QUEUE_NAME, {
  connection: createBullRedisConnection(),
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 10 },
    removeOnFail:     { count: 50 },
  },
});

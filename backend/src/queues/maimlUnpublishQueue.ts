/**
 * MaiML 非公開キュー定義
 *
 * @description
 *   bullmq の Queue インスタンスを生成・export する。
 *   Worker（maimlUnpublishWorker.ts）がこのキューからジョブを取得して処理する。
 *
 * @reference docs/MaiML_OpenData_Pipeline/spec.md §9.1
 */

import { Queue } from 'bullmq';
import { createBullRedisConnection } from '../config/redis';

export const MAIML_UNPUBLISH_QUEUE_NAME = 'maiml-unpublish';

/**
 * MaiML 非公開キュー
 *
 * ジョブデータ型: UnpublishJobData（maimlUnpublishWorker.ts で定義）
 */
export const maimlUnpublishQueue = new Queue(MAIML_UNPUBLISH_QUEUE_NAME, {
  connection: createBullRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type:  'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 200 },
  },
});

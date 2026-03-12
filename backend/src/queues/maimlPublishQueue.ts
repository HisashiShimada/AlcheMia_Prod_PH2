/**
 * MaiML 公開キュー定義
 *
 * @description
 *   bullmq の Queue インスタンスを生成・export する。
 *   Worker（maimlPublishWorker.ts）がこのキューからジョブを取得して処理する。
 *
 * @reference docs/MaiML_OpenData_Pipeline/spec.md §9.1
 */

import { Queue } from 'bullmq';
import { createBullRedisConnection } from '../config/redis';

export const MAIML_PUBLISH_QUEUE_NAME = 'maiml-publish';

/**
 * MaiML 公開キュー
 *
 * ジョブデータ型: PublishJobData（maimlPublishWorker.ts で定義）
 */
export const maimlPublishQueue = new Queue(MAIML_PUBLISH_QUEUE_NAME, {
  connection:   createBullRedisConnection(),
  defaultJobOptions: {
    attempts:    3,
    backoff: {
      type:  'exponential',
      delay: 5000, // 初回リトライまで 5 秒
    },
    removeOnComplete: { count: 100 }, // 完了ジョブを最大 100 件保持
    removeOnFail:     { count: 200 }, // 失敗ジョブを最大 200 件保持
  },
});

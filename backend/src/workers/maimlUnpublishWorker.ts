/**
 * MaiML 非公開 Worker（スタブ）
 *
 * @description
 *   maiml-unpublish キューからジョブを取得し、MaiML ファイルの非公開処理を非同期で実行する。
 *   現在はスタブ実装。DB テーブル構成（db.md）確定後にプロセッサー本体を実装する。
 *
 * @todo DB テーブル構成確定後に processor 内を実装する
 *   - maiml_publish_job のステータスを 'running' に更新
 *   - mode に応じて KV / preview / raw を DB から削除
 *   - maiml_publish_registry の status を 'unpublished' に更新
 *   - maiml_publish_job のステータスを 'done' に更新
 *
 * @reference docs/MaiML_OpenData_Pipeline/spec.md §9
 */

import { Worker, Job } from 'bullmq';
import { createBullRedisConnection } from '../config/redis';
import { MAIML_UNPUBLISH_QUEUE_NAME } from '../queues/maimlUnpublishQueue';

// ============================================================
// ジョブデータ型定義
// ============================================================

/**
 * 非公開ジョブに渡すデータ
 */
export interface UnpublishJobData {
  organizationId: string;
  assetId:        number | null;
  mode:           'keep_meta' | 'full_delete';
}

// ============================================================
// Worker インスタンス
// ============================================================

let unpublishWorker: Worker<UnpublishJobData> | null = null;

/**
 * MaiML 非公開 Worker を起動する
 *
 * @description
 *   server.ts の startServer() から呼び出す。
 *   Redis 未接続でも lazyConnect により起動失敗にはならない。
 */
export function startMaimlUnpublishWorker(): Worker<UnpublishJobData> {
  unpublishWorker = new Worker<UnpublishJobData>(
    MAIML_UNPUBLISH_QUEUE_NAME,
    async (job: Job<UnpublishJobData>) => {
      console.info(`[maimlUnpublishWorker] ジョブ受信 job_id=${job.id}`, {
        organizationId: job.data.organizationId,
        assetId:        job.data.assetId,
        mode:           job.data.mode,
      });

      // ──────────────────────────────────────────────────────
      // TODO: DB テーブル構成（db.md）確定後に以下を実装する
      //
      // 1. maiml_publish_job のステータスを 'running' に更新
      // 2. mode === 'full_delete' の場合
      //    → maiml_asset を cascade DELETE
      // 3. mode === 'keep_meta' の場合
      //    → maiml_condition_kv / maiml_material_kv を DELETE
      //    → maiml_publish_registry の status を 'unpublished' に更新
      // 4. maiml_publish_job のステータスを 'done' に更新
      // ──────────────────────────────────────────────────────

      console.warn(
        `[maimlUnpublishWorker] job_id=${job.id} は未実装です（DB テーブル構成確定待ち）`,
      );
    },
    {
      connection:  createBullRedisConnection(),
      concurrency: 1,
    },
  );

  unpublishWorker.on('completed', (job) => {
    console.info(`[maimlUnpublishWorker] 完了 job_id=${job.id}`);
  });

  unpublishWorker.on('failed', (job, err) => {
    console.error(`[maimlUnpublishWorker] 失敗 job_id=${job?.id}`, err.message);
  });

  unpublishWorker.on('error', (err) => {
    console.error('[maimlUnpublishWorker] Worker エラー:', err.message);
  });

  console.info('[maimlUnpublishWorker] 起動完了（スタブモード）');
  return unpublishWorker;
}

/**
 * MaiML 非公開 Worker を停止する
 *
 * @description gracefulShutdown から呼び出す
 */
export async function stopMaimlUnpublishWorker(): Promise<void> {
  if (unpublishWorker) {
    await unpublishWorker.close();
    unpublishWorker = null;
    console.info('[maimlUnpublishWorker] 停止完了');
  }
}

/**
 * MaiML 公開 / 非公開 Worker 動作確認スクリプト
 *
 * @description
 *   test-maiml-publish-ingest.ts で使用した仮組織（DEFAULT_TEST_ORG_ID）に対して
 *   実際の Worker（maimlPublishWorker / maimlUnpublishWorker）を起動し、
 *   bullmq キューを経由した公開・非公開の一連フローを検証する。
 *
 * 処理フロー（公開テスト）:
 *   1. 仮組織レコードを organization テーブルに INSERT（なければ）
 *   2. 組織スキーマ・テーブルを初期化（旧スキーマは DROP して再作成）
 *   3. MAIML サンプルファイルを Swift/S3 にアップロード
 *   4. maiml_publish_job に publish ジョブを INSERT（status=pending）
 *   5. bullmq の maiml-publish キューにジョブを追加
 *   6. maimlPublishWorker を起動してジョブ完了まで待機
 *   7. DB の登録件数と job ステータスを確認
 *
 * 処理フロー（非公開テスト）:
 *   8. maiml_publish_job に unpublish ジョブを INSERT（status=pending）
 *   9. bullmq の maiml-unpublish キューにジョブを追加
 *  10. maimlUnpublishWorker を起動してジョブ完了まで待機
 *  11. maiml_asset が削除されたことを確認
 *
 * @usage
 *   npx ts-node backend/scripts/test-maiml-publish-worker.ts [organization_id]
 *
 * @example
 *   # デフォルト仮 org_id で実行
 *   npx ts-node backend/scripts/test-maiml-publish-worker.ts
 *
 *   # 実際の org_id を指定して実行
 *   npx ts-node backend/scripts/test-maiml-publish-worker.ts 2068841e-8014-4fed-8a2a-f83aef26b71e
 *
 * @note
 *   - 実際の Worker コードをそのまま使用するため、Redis が起動している必要がある
 *   - Swift/S3 接続が必要（backend/.env の設定を使用）
 *   - スクリプト終了後も仮組織スキーマは残るため、不要なら手動で DROP SCHEMA ～ CASCADE
 */

import * as dotenv from 'dotenv';
import * as path   from 'path';
import * as fs     from 'fs';

// .env 読み込み（backend/.env）
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { initializePool, closePool, getPgp, getPool } from '../src/database/db';
import * as assetRepo      from '../src/repositories/maimlAssetRepository';
import * as publishJobRepo from '../src/repositories/maimlPublishJobRepository';
import { maimlPublishQueue }   from '../src/queues/maimlPublishQueue';
import { maimlUnpublishQueue } from '../src/queues/maimlUnpublishQueue';
import { startMaimlPublishWorker, stopMaimlPublishWorker }     from '../src/workers/maimlPublishWorker';
import { startMaimlUnpublishWorker, stopMaimlUnpublishWorker } from '../src/workers/maimlUnpublishWorker';
import { getStorageService } from '../src/services/storageService';
import { PublishJobData, UnpublishJobData } from '../src/types/maimlOpenData';

// ============================================================
// 設定
// ============================================================

/**
 * テスト用仮組織 ID（test-maiml-publish-ingest.ts と同じ値）
 */
const DEFAULT_TEST_ORG_ID = '00000000-0000-4fed-8a2a-000000000001';

const ORG_ID        = process.argv[2] || DEFAULT_TEST_ORG_ID;
const ORG_CD        = `test_org_${ORG_ID}`;
const ORG_NAME      = 'Worker テスト用仮組織';
const PROJECT_NAME  = 'XRF_test_project';
const FILE_URI      = `projects/${PROJECT_NAME}/XRF.maiml`;

/** Worker ジョブ完了まで最大待機する時間（ミリ秒）*/
const JOB_TIMEOUT_MS = 120_000;

/** ジョブ完了確認のポーリング間隔（ミリ秒）*/
const POLL_INTERVAL_MS = 500;

/** サンプル MAIML ファイルパス */
const SAMPLE_MAIML_PATH = path.resolve(
  __dirname,
  '../../docs/MaiML_OpenData_Pipeline/sample/XRF.maiml'
);

// ============================================================
// ユーティリティ
// ============================================================

function hr(label = '') {
  const line = '─'.repeat(60);
  console.log(label ? `\n${line}\n  ${label}\n${line}` : `\n${line}`);
}

function ok(msg: string)   { console.log(`  ✅ ${msg}`); }
function info(msg: string) { console.log(`  ℹ️  ${msg}`); }
function warn(msg: string) { console.log(`  ⚠️  ${msg}`); }
function ng(msg: string)   { console.log(`  ❌ ${msg}`); }

// ============================================================
// ジョブ完了待機ヘルパー
// ============================================================

/**
 * maiml_publish_job が done または error になるまで DB をポーリングして待機する
 *
 * @param jobId - 待機するジョブ UUID
 * @returns 完了後のジョブレコード
 */
async function waitForJob(jobId: string) {
  const startAt = Date.now();

  while (Date.now() - startAt < JOB_TIMEOUT_MS) {
    const job = await publishJobRepo.findByJobId(jobId);
    if (!job) throw new Error(`job_id=${jobId} が見つかりません`);

    if (job.status === 'done')  return job;
    if (job.status === 'error') {
      throw new Error(`ジョブがエラーになりました job_id=${jobId} : ${job.error_message}`);
    }

    // pending / running → 次のポーリングまで待機
    process.stdout.write(`\r  ⏳ waiting... status=${job.status}  (${Math.round((Date.now() - startAt) / 1000)}s)`);
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }

  process.stdout.write('\n');
  throw new Error(`タイムアウト: job_id=${jobId} が ${JOB_TIMEOUT_MS / 1000}s 以内に完了しませんでした`);
}

// ============================================================
// DB 件数確認ヘルパー
// ============================================================

async function countRows(schemaName: string, tableName: string): Promise<number> {
  const pgp = getPgp();
  const row = await pgp.one<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM "${schemaName}"."${tableName}"`
  );
  return parseInt(row.cnt, 10);
}

// ============================================================
// メイン
// ============================================================

async function main() {
  hr('MaiML 公開 / 非公開 Worker 動作確認スクリプト');
  console.log(`  organization_id : ${ORG_ID}`);
  console.log(`  project_name    : ${PROJECT_NAME}`);
  console.log(`  file_uri        : ${FILE_URI}`);
  console.log(`  sample file     : ${SAMPLE_MAIML_PATH}`);

  // ── DB 接続 ──────────────────────────────────────────────
  hr('Step 0: DB 接続確認');
  initializePool();
  const pgp  = getPgp();
  const pool = getPool();
  await pgp.one('SELECT 1 AS ok');
  ok('DB 接続成功');

  const schemaName = assetRepo.toSchemaName(ORG_ID);
  info(`スキーマ名: "${schemaName}"`);

  // ── Step 1: 仮組織レコードを確保 ─────────────────────────
  hr('Step 1: 仮組織レコード確保（organization テーブル）');

  const existingOrg = await pool.query(
    'SELECT organization_id FROM organization WHERE organization_id = $1',
    [ORG_ID]
  );

  if (existingOrg.rows.length === 0) {
    await pool.query(
      `INSERT INTO organization
         (organization_id, organization_cd, organization_display_name,
          is_entry, use_deemed_progress, is_active, default_retention_days)
       VALUES ($1, $2, $3, 0, false, true, 365)`,
      [ORG_ID, ORG_CD, ORG_NAME]
    );
    ok(`仮組織を INSERT しました（organization_id=${ORG_ID}）`);
  } else {
    info('仮組織は既に存在します（スキップ）');
    // default_retention_days が 0 の場合は 365 に更新しておく
    await pool.query(
      `UPDATE organization SET default_retention_days = 365
       WHERE organization_id = $1 AND (default_retention_days IS NULL OR default_retention_days <= 0)`,
      [ORG_ID]
    );
  }

  // ── Step 1.5: Redis キューの残留ジョブを完全クリア ───────
  hr('Step 1.5: Redis キューの残留ジョブをクリア');

  // 前回の実行で残ったジョブ（リトライ待ち含む）が並行処理されると
  // FK 違反が発生するため、両キューを obliterate（完全削除）する
  // obliterate: waiting/delayed/failed/completed をすべて削除
  await maimlPublishQueue.obliterate({ force: true });
  await maimlUnpublishQueue.obliterate({ force: true });
  ok('maiml-publish / maiml-unpublish キューを完全クリアしました');

  // ── Step 2: 組織スキーマ・テーブル初期化 ─────────────────
  hr('Step 2: 組織スキーマ・テーブル初期化');

  const schemaAlreadyExists = await assetRepo.schemaExists(ORG_ID);
  if (schemaAlreadyExists) {
    info(`スキーマ "${schemaName}" が既に存在します → DROP CASCADE して再作成します`);
    await pgp.none(`DROP SCHEMA "${schemaName}" CASCADE`);
    ok(`スキーマ "${schemaName}" を DROP しました`);
  }

  await assetRepo.createSchemaIfNotExists(ORG_ID, ORG_CD);
  ok(`スキーマ "${schemaName}" を作成しました`);

  await assetRepo.createSchemaTables(ORG_ID);
  ok('テーブル作成完了');

  // ── Step 3: MAIML ファイルを Swift/S3 にアップロード ─────
  hr('Step 3: MAIML ファイルを Swift/S3 にアップロード');

  if (!fs.existsSync(SAMPLE_MAIML_PATH)) {
    throw new Error(`サンプルファイルが見つかりません: ${SAMPLE_MAIML_PATH}`);
  }

  const xmlBuffer = fs.readFileSync(SAMPLE_MAIML_PATH);
  const storage   = getStorageService();

  await storage.uploadFile(ORG_ID, FILE_URI, xmlBuffer, {
    contentType: 'application/xml',
  });
  ok(`アップロード完了: ${FILE_URI}`);
  info(`  ストレージ種別: ${storage.getStorageType()}`);
  info(`  バケット/コンテナ: ${storage.getBucketName()}`);

  // ── Step 4: publish ジョブレコードを DB に INSERT ─────────
  hr('Step 4: publish ジョブを DB に INSERT');

  const publishJobRecord = await publishJobRepo.insert({
    job_type:       'publish',
    organization_id: ORG_ID,
    project_name:   PROJECT_NAME,
    status:         'pending',
    trigger_type:   'manual',
    triggered_by:   'test-script',
  });
  const publishJobId = publishJobRecord.job_id!;
  ok(`maiml_publish_job INSERT 完了 job_id=${publishJobId}`);

  // ── Step 5: bullmq キューに publish ジョブを追加 ──────────
  hr('Step 5: maiml-publish キューにジョブを追加');

  await maimlPublishQueue.add(
    'publish',
    {
      jobId:          publishJobId,
      organizationId: ORG_ID,
      projectName:    PROJECT_NAME,
      fileUri:        FILE_URI,
    } satisfies PublishJobData,
    {
      jobId: `publish-test-${publishJobId}`,  // bullmq 上の重複防止 ID
    }
  );
  ok(`maiml-publish キューへ追加完了 bullmq jobId=publish-test-${publishJobId}`);

  // ── Step 6: publish Worker を起動してジョブ完了まで待機 ───
  hr('Step 6: maimlPublishWorker 起動 & 完了待機');

  const publishWorker = startMaimlPublishWorker();
  ok('maimlPublishWorker 起動完了');
  info('ジョブ完了をポーリング中...');

  let publishedJob: Awaited<ReturnType<typeof publishJobRepo.findByJobId>>;
  try {
    publishedJob = await waitForJob(publishJobId);
    process.stdout.write('\n');
    ok(`publish ジョブ完了 status=${publishedJob?.status} asset_id=${publishedJob?.asset_id}`);
  } finally {
    await stopMaimlPublishWorker();
    ok('maimlPublishWorker 停止完了');
  }

  const publishedAssetId = publishedJob?.asset_id;
  if (!publishedAssetId) {
    throw new Error('publish 完了後に asset_id が取得できませんでした');
  }

  // ── Step 7: DB 登録件数確認 ──────────────────────────────
  hr('Step 7: 公開後 DB 登録件数確認');

  const tables = [
    'maiml_asset',
    'maiml_instance',
    'maiml_element',
    'maiml_element_value',
    'maiml_insertion',
    'maiml_template',
    'maiml_template_element',
    'maiml_template_element_value',
    'maiml_template_insertion',
    'maiml_event',
    'maiml_event_element',
    'maiml_event_element_value',
  ];

  console.log('');
  console.log('  テーブル名                          件数');
  console.log('  ' + '─'.repeat(50));

  let hasData = true;
  for (const tbl of tables) {
    const cnt = await countRows(schemaName, tbl);
    const padded = tbl.padEnd(36);
    console.log(`  ${padded} ${cnt.toLocaleString().padStart(6)} 件`);
    if (tbl === 'maiml_asset' && cnt === 0) {
      hasData = false;
    }
  }

  if (hasData) {
    ok('maiml_asset に 1 件以上登録されていることを確認');
  } else {
    ng('maiml_asset が 0 件です（publish が正常に完了しませんでした）');
    throw new Error('publish 後のデータ確認に失敗しました');
  }

  // ── publish ジョブ詳細表示 ───────────────────────────────
  hr('公開ジョブ詳細');
  const latestPublishJob = await publishJobRepo.findLatestByProject(ORG_ID, PROJECT_NAME);
  if (latestPublishJob) {
    console.log(`  job_id        : ${latestPublishJob.job_id}`);
    console.log(`  job_type      : ${latestPublishJob.job_type}`);
    console.log(`  status        : ${latestPublishJob.status}`);
    console.log(`  asset_id      : ${latestPublishJob.asset_id}`);
    console.log(`  triggered_by  : ${latestPublishJob.triggered_by}`);
    console.log(`  trigger_type  : ${latestPublishJob.trigger_type}`);
    console.log(`  started_at    : ${latestPublishJob.started_at}`);
    console.log(`  finished_at   : ${latestPublishJob.finished_at}`);
    console.log(`  error_message : ${latestPublishJob.error_message ?? '(null)'}`);
  }

  // ── Step 8: unpublish ジョブレコードを DB に INSERT ──────
  hr('Step 8: unpublish ジョブを DB に INSERT');

  const unpublishJobRecord = await publishJobRepo.insert({
    job_type:        'unpublish',
    organization_id: ORG_ID,
    project_name:    PROJECT_NAME,
    asset_id:        publishedAssetId,
    status:          'pending',
    trigger_type:    'manual',
    triggered_by:    'test-script',
  });
  const unpublishJobId = unpublishJobRecord.job_id!;
  ok(`maiml_publish_job INSERT 完了 job_id=${unpublishJobId}`);

  // ── Step 9: bullmq キューに unpublish ジョブを追加 ────────
  hr('Step 9: maiml-unpublish キューにジョブを追加');

  await maimlUnpublishQueue.add(
    'unpublish',
    {
      jobId:          unpublishJobId,
      organizationId: ORG_ID,
      projectName:    PROJECT_NAME,
      assetId:        publishedAssetId,
      triggerType:    'manual',
      userId:         'test-script',
    } satisfies UnpublishJobData,
    {
      jobId: `unpublish-test-${unpublishJobId}`,  // bullmq 上の重複防止 ID
    }
  );
  ok(`maiml-unpublish キューへ追加完了 bullmq jobId=unpublish-test-${unpublishJobId}`);

  // ── Step 10: unpublish Worker を起動してジョブ完了まで待機
  hr('Step 10: maimlUnpublishWorker 起動 & 完了待機');

  const unpublishWorker = startMaimlUnpublishWorker();
  ok('maimlUnpublishWorker 起動完了');
  info('ジョブ完了をポーリング中...');

  try {
    const finishedJob = await waitForJob(unpublishJobId);
    process.stdout.write('\n');
    ok(`unpublish ジョブ完了 status=${finishedJob?.status}`);
  } finally {
    await stopMaimlUnpublishWorker();
    ok('maimlUnpublishWorker 停止完了');
  }

  // ── Step 11: 非公開後の確認 ───────────────────────────────
  hr('Step 11: 非公開後の確認');

  const assetAfterUnpublish = await assetRepo.findByProject(ORG_ID, PROJECT_NAME);
  if (assetAfterUnpublish === null) {
    ok('maiml_asset が削除されていることを確認（非公開成功）');
  } else {
    ng(`maiml_asset がまだ存在します asset_id=${assetAfterUnpublish.asset_id}（非公開失敗）`);
    throw new Error('unpublish 後のデータ確認に失敗しました');
  }

  // maiml_asset 件数が 0 であることを確認
  const assetCount = await countRows(schemaName, 'maiml_asset');
  if (assetCount === 0) {
    ok(`${schemaName}.maiml_asset の件数が 0 件であることを確認`);
  } else {
    warn(`${schemaName}.maiml_asset に ${assetCount} 件残っています`);
  }

  // unpublish ジョブ詳細表示
  hr('非公開ジョブ詳細');
  const latestUnpublishJob = await publishJobRepo.findByJobId(unpublishJobId);
  if (latestUnpublishJob) {
    console.log(`  job_id        : ${latestUnpublishJob.job_id}`);
    console.log(`  job_type      : ${latestUnpublishJob.job_type}`);
    console.log(`  status        : ${latestUnpublishJob.status}`);
    console.log(`  asset_id      : ${latestUnpublishJob.asset_id}`);
    console.log(`  triggered_by  : ${latestUnpublishJob.triggered_by}`);
    console.log(`  trigger_type  : ${latestUnpublishJob.trigger_type}`);
    console.log(`  started_at    : ${latestUnpublishJob.started_at}`);
    console.log(`  finished_at   : ${latestUnpublishJob.finished_at}`);
    console.log(`  error_message : ${latestUnpublishJob.error_message ?? '(null)'}`);
  }

  // ── 最終サマリー ─────────────────────────────────────────
  hr('✅ 全テスト完了');
  console.log('');
  console.log('  ┌─────────────────────────────────────────────────┐');
  console.log('  │  テスト結果サマリー                              │');
  console.log('  ├─────────────────────────────────────────────────┤');
  console.log('  │  [公開テスト]   maimlPublishWorker   ✅ PASS    │');
  console.log('  │  [非公開テスト] maimlUnpublishWorker ✅ PASS    │');
  console.log('  └─────────────────────────────────────────────────┘');
  console.log('');
  console.log(`  organization_id : ${ORG_ID}`);
  console.log(`  スキーマ        : "${schemaName}"`);
  console.log('');
  console.log('  ▶ テスト用スキーマの削除（不要になった場合）:');
  console.log(`     DROP SCHEMA "${schemaName}" CASCADE;`);
  console.log('');
  console.log('  ▶ テスト用組織の削除（不要になった場合）:');
  console.log(`     DELETE FROM organization WHERE organization_id = '${ORG_ID}';`);
  console.log('');
  console.log('  ▶ テスト用ジョブ履歴の削除（不要になった場合）:');
  console.log(`     DELETE FROM maiml_publish_job WHERE organization_id = '${ORG_ID}';`);
  console.log('');
}

main()
  .catch((err) => {
    console.error('\n❌ エラーが発生しました:', err?.message ?? err);
    if (err?.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  })
  .finally(async () => {
    // キュー接続をクローズ
    try {
      await maimlPublishQueue.close();
      await maimlUnpublishQueue.close();
    } catch (_) {
      // ignore
    }
    await closePool();
  });

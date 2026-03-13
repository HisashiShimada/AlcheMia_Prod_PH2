/**
 * MaiML 公開サービス
 *
 * @description
 *   公開（publish）・非公開（unpublish）の API ハンドラーから呼ばれるビジネスロジック。
 *   bullmq キューへのジョブ投入と、DB への初期レコード作成を担う。
 *
 * @reference docs/MaiML_OpenData_Pipeline/spec.md §7
 */

import { maimlPublishQueue }   from '../queues/maimlPublishQueue';
import { maimlUnpublishQueue } from '../queues/maimlUnpublishQueue';
import * as publishJobRepo     from '../repositories/maimlPublishJobRepository';
import * as assetRepo          from '../repositories/maimlAssetRepository';
import * as orgRepo            from '../repositories/organizationRepository';
import * as projectRepo        from '../repositories/projectRepository';
import * as projectTaskDetailRepo from '../repositories/projectTaskDetailRepository';
import { getStorageService }   from './storageService';
import {
  PublishJobResponse,
  PublishStatusResponse,
} from '../types/maimlOpenData';

/** タスクステータス: 完了 */
const TASK_STATUS_COMPLETED = 4;
/** タスクステータス: 異常終了 */
const TASK_STATUS_ABORTED = 5;
/** プロジェクトステータス: タスク結果レビュー待ち */
const PROJECT_STATUS_REVIEW_WAITING = 3;
/** プロジェクトステータス: プロジェクト完了 */
const PROJECT_STATUS_COMPLETED = 4;
/** チェックアウトステータス: チェックアウト中 */
const CHECKOUT_STATUS_CHECKED_OUT = 1;

// ============================================================
// 公開（publish）
// ============================================================

/**
 * MaiML 公開ジョブを発行する
 *
 * @description
 *   1. 既に running/pending ジョブがあれば 409 相当の例外を投げる
 *   2. 対象 MaiML ファイルが Swift/S3 に存在するか確認する
 *   3. maiml_publish_job テーブルに pending レコードを挿入する
 *   4. bullmq キューへジョブを投入する
 *   5. 202 相当のレスポンスを返す
 *
 * @param organizationId - 組織 ID
 * @param projectName    - プロジェクト名
 * @param userId         - 操作者のユーザー ID
 * @returns 202 レスポンス用ペイロード
 * @throws Error('ALREADY_IN_PROGRESS')      - 既に処理中のジョブが存在する場合
 * @throws Error('MAIML_NOT_FOUND')          - Swift/S3 に MaiML ファイルが存在しない場合
 * @throws Error('PROJECT_NOT_FOUND')        - プロジェクトが存在しない場合
 * @throws Error('PROJECT_NOT_CHECKED_OUT')  - チェックアウト状態でない場合
 * @throws Error('PROJECT_STATUS_INVALID')   - ステータスがタスク結果レビュー待ちでない場合
 * @throws Error('TASKS_NOT_COMPLETED')      - 完了・異常終了以外のタスク詳細が存在する場合
 */
export async function enqueuePublish(
  organizationId: string,
  projectName:    string,
  userId:         string | null
): Promise<PublishJobResponse> {
  // ── 1. プロジェクト存在確認 ──────────────────────────────
  const project = await projectRepo.findByName(organizationId, projectName);
  if (!project) {
    throw new Error('PROJECT_NOT_FOUND');
  }
  const projectId = project.project_id!;

  // ── 2. チェックアウト状態確認 ────────────────────────────
  if (project.checkout_status !== CHECKOUT_STATUS_CHECKED_OUT) {
    throw new Error('PROJECT_NOT_CHECKED_OUT');
  }

  // ── 3. プロジェクトステータス確認 ───────────────────────
  if (project.project_status !== PROJECT_STATUS_REVIEW_WAITING) {
    throw new Error('PROJECT_STATUS_INVALID');
  }

  // ── 4. タスク詳細の完了確認 ─────────────────────────────
  const taskDetails = await projectTaskDetailRepo.findByProject(organizationId, projectId);
  if (taskDetails.length > 0) {
    const hasIncomplete = taskDetails.some(
      (t) =>
        t.task_status !== TASK_STATUS_COMPLETED &&
        t.task_status !== TASK_STATUS_ABORTED
    );
    if (hasIncomplete) {
      throw new Error('TASKS_NOT_COMPLETED');
    }
  }

  // ── 5. 重複チェック ──────────────────────────────────────
  const latest = await publishJobRepo.findLatestByProject(organizationId, projectName);
  if (latest && (latest.status === 'pending' || latest.status === 'running')) {
    throw new Error('ALREADY_IN_PROGRESS');
  }

  // ── 6. Swift/S3 ファイル存在確認 ───────────────────────
  const fileUri = `projects/${projectName}/${projectName}.maiml`;
  const storage = getStorageService();
  const exists  = await storage.fileExists(organizationId, fileUri);
  if (!exists) {
    throw new Error('MAIML_NOT_FOUND');
  }

  // ── 7. DB に pending ジョブを作成 ───────────────────────
  const job = await publishJobRepo.insert({
    job_type:        'publish',
    organization_id: organizationId,
    project_name:    projectName,
    asset_id:        null,
    status:          'pending',
    triggered_by:    userId,
    trigger_type:    'manual',
    error_message:   null,
    started_at:      null,
    finished_at:     null,
  });

  const jobId = job.job_id!;

  // ── 8. bullmq へ投入 ────────────────────────────────────
  await maimlPublishQueue.add(
    'publish',
    {
      jobId,
      organizationId,
      projectName,
      fileUri,
      userId,
    },
    { jobId }   // bullmq ジョブ ID = DB job_id で統一
  );

  // ── 9. プロジェクトステータスを「プロジェクト完了（4）」に更新 ──
  await projectRepo.updateStatus(
    projectId,
    PROJECT_STATUS_COMPLETED,
    organizationId,
    userId ?? 'system'
  );

  // ── 10. レスポンス ───────────────────────────────────────
  return {
    job_id:  jobId,
    status:  'pending',
    message: '公開ジョブを受け付けました',
  };
}

// ============================================================
// 非公開（unpublish）
// ============================================================

/**
 * MaiML 非公開ジョブを発行する
 *
 * @description
 *   1. 公開済みアセット ID を取得する（なければ 404 相当の例外）
 *   2. 既に running/pending ジョブがあれば 409 相当の例外を投げる
 *   3. maiml_publish_job テーブルに pending レコードを挿入する
 *   4. bullmq キューへジョブを投入する
 *   5. 202 相当のレスポンスを返す
 *
 * @param organizationId - 組織 ID
 * @param projectName    - プロジェクト名
 * @param userId         - 操作者のユーザー ID
 * @returns 202 レスポンス用ペイロード
 * @throws Error('NOT_PUBLISHED')       - 公開済みアセットが存在しない場合
 * @throws Error('ALREADY_IN_PROGRESS') - 既に処理中のジョブが存在する場合
 */
export async function enqueueUnpublish(
  organizationId: string,
  projectName:    string,
  userId:         string | null
): Promise<PublishJobResponse> {
  // ── 1. 公開済みアセット確認 ──────────────────────────────
  const assetId = await publishJobRepo.findPublishedAssetId(organizationId, projectName);
  if (assetId === null) {
    throw new Error('NOT_PUBLISHED');
  }

  // ── 2. 重複チェック ──────────────────────────────────────
  const latest = await publishJobRepo.findLatestByProject(organizationId, projectName);
  if (latest && (latest.status === 'pending' || latest.status === 'running')) {
    throw new Error('ALREADY_IN_PROGRESS');
  }

  // ── 3. DB に pending ジョブを作成 ───────────────────────
  const job = await publishJobRepo.insert({
    job_type:        'unpublish',
    organization_id: organizationId,
    project_name:    projectName,
    asset_id:        assetId,
    status:          'pending',
    triggered_by:    userId,
    trigger_type:    'manual',
    error_message:   null,
    started_at:      null,
    finished_at:     null,
  });

  const jobId = job.job_id!;

  // ── 4. bullmq へ投入 ────────────────────────────────────
  await maimlUnpublishQueue.add(
    'unpublish',
    {
      jobId,
      organizationId,
      projectName,
      assetId,
      triggerType: 'manual',
      userId,
    },
    { jobId }
  );

  // ── 5. レスポンス ────────────────────────────────────────
  return {
    job_id:  jobId,
    status:  'pending',
    message: '非公開ジョブを受け付けました',
  };
}

// ============================================================
// ステータス取得
// ============================================================

/**
 * プロジェクトの公開ステータスを取得する
 *
 * @param organizationId - 組織 ID
 * @param projectName    - プロジェクト名
 * @returns 最新ジョブの状態、または unpublished 情報
 */
export async function getPublishStatus(
  organizationId: string,
  projectName:    string
): Promise<PublishStatusResponse> {
  const latest = await publishJobRepo.findLatestByProject(organizationId, projectName);

  if (!latest) {
    // ジョブ履歴なし → 未公開
    return {
      job_id:       null,
      job_type:     null,
      status:       null,
      asset_id:     null,
      project_name: projectName,
      started_at:   null,
      finished_at:  null,
      error_message: null,
    };
  }

  return {
    job_id:        latest.job_id ?? null,
    job_type:      latest.job_type,
    status:        latest.status,
    asset_id:      latest.asset_id ?? null,
    project_name:  projectName,
    started_at:    latest.started_at ?? null,
    finished_at:   latest.finished_at ?? null,
    error_message: latest.error_message ?? null,
  };
}

// ============================================================
// 組織スキーマ初期化（組織作成フック用）
// ============================================================

/**
 * 組織用スキーマと maiml_* テーブルを初期化する
 *
 * @description
 *   組織作成 API から呼び出す。既存スキーマがある場合はスキップする。
 *
 * @param organizationId - 組織 ID
 */
export async function initOrganizationSchema(organizationId: string): Promise<void> {
  const org = await orgRepo.findById(organizationId);
  if (!org) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  // スキーマが既に存在する場合はスキップ
  const exists = await assetRepo.schemaExists(organizationId);
  if (exists) {
    return;
  }

  await assetRepo.createSchemaIfNotExists(organizationId, org.organization_cd);
  await assetRepo.createSchemaTables(organizationId);
}

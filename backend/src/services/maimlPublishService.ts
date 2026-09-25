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
import { resolveMaimlFilePath } from '../utils/maimlPathResolver';
import {
  PublishJobResponse,
  PublishStatusResponse,
} from '../types/maimlOpenData';
import { ProjectStatusEnum, TaskStatusEnum } from '../enums/codeMaster.enum';

/** 公開可能なプロジェクトステータス一覧（レビュー待ち or 完了） */
const ALLOWED_PUBLISH_STATUSES = [ProjectStatusEnum.REVIEW_WAITING, ProjectStatusEnum.COMPLETED];

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
 * @param projectId      - プロジェクト ID
 * @param userId         - 操作者のユーザー ID
 * @returns 202 レスポンス用ペイロード
 * @throws Error('ALREADY_IN_PROGRESS')      - 既に処理中のジョブが存在する場合
 * @throws Error('MAIML_NOT_FOUND')          - Swift/S3 に MaiML ファイルが存在しない場合
 * @throws Error('PROJECT_NOT_FOUND')        - プロジェクトが存在しない場合
 * @throws Error('PROJECT_STATUS_INVALID')   - ステータスが完了（COMPLETED）でない場合
 * @throws Error('TASKS_NOT_COMPLETED')      - 完了・異常終了以外のタスク詳細が存在する場合
 */
export async function enqueuePublish(
  organizationId: string,
  projectId:      string,
  userId:         string | null
): Promise<PublishJobResponse> {
  // ── 1. プロジェクト存在確認 ──────────────────────────────
  const project = await projectRepo.findByIdFull(organizationId, projectId);
  if (!project) {
    throw new Error('PROJECT_NOT_FOUND');
  }
  const projectName = project.project_name!;
  console.log("projectあり");

  // ── 2. プロジェクトステータス確認 ───────────────────────
  // Phase2修正: 作業者→管理者返却時に自動チェックインされるため、チェックアウト確認は不要。
  // 公開ボタンを押す時点のステータスはプロジェクト完了（4）のみを許可する（再公開時はCOMPLETEDも許可）。
  if (!ALLOWED_PUBLISH_STATUSES.includes((project.project_status ?? -1) as typeof ALLOWED_PUBLISH_STATUSES[number])) {
    throw new Error('PROJECT_STATUS_INVALID');
  }
  console.log("レビュー待ち、完了");

  // ── 4. タスク詳細の完了確認 ─────────────────────────────
  const taskDetails = await projectTaskDetailRepo.findByProject(organizationId, projectId);
  if (taskDetails.length > 0) {
    const hasIncomplete = taskDetails.some(
      (t) =>
        t.task_status !== TaskStatusEnum.COMPLETED &&
        t.task_status !== TaskStatusEnum.FORCED_TERMINATED
    );
    if (hasIncomplete) {
      throw new Error('TASKS_NOT_COMPLETED');
    }
  }
  console.log("タスクは完了");

  // ── 5. 重複チェック ──────────────────────────────────────
  const latest = await publishJobRepo.findLatestByProject(organizationId, projectId);
  if (latest && (latest.status === 'pending' || latest.status === 'running')) {
    throw new Error('ALREADY_IN_PROGRESS');
  }
  console.log("重複なし");

  // ── 6. Swift/S3 ファイル存在確認 ───────────────────────
  // project_uuid → file_metadata → file_key の順で解決し、未設定の場合は project_name でフォールバック
  const fileUri = await resolveMaimlFilePath(organizationId, projectId, projectName);
  const storage = getStorageService();
  const exists  = await storage.fileExists(organizationId, fileUri);
  if (!exists) {
    throw new Error('MAIML_NOT_FOUND');
  }
  console.log("ファイルあり");

  // ── 7. DB に pending ジョブを作成 ───────────────────────
  const job = await publishJobRepo.insert({
    job_type:        'publish',
    organization_id: organizationId,
    project_id:      projectId,
    asset_id:        null,
    status:          'pending',
    triggered_by:    userId,
    trigger_type:    'manual',
    error_message:   null,
    started_at:      null,
    finished_at:     null,
  });
  console.log("job登録完了");

  const jobId = job.job_id!;

  // ── 8. bullmq へ投入 ────────────────────────────────────
  await maimlPublishQueue.add(
    'publish',
    {
      jobId,
      organizationId,
      projectId,
      projectName,
      fileUri,
      userId,
    },
    { jobId }   // bullmq ジョブ ID = DB job_id で統一
  );

  // ── 9. プロジェクトステータスを「プロジェクト完了（4）」に更新 ──
  await projectRepo.updateStatus(
    projectId,
    ProjectStatusEnum.COMPLETED,
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
 * @param projectId      - プロジェクト ID
 * @param userId         - 操作者のユーザー ID
 * @returns 202 レスポンス用ペイロード
 * @throws Error('NOT_PUBLISHED')       - 公開済みアセットが存在しない場合
 * @throws Error('ALREADY_IN_PROGRESS') - 既に処理中のジョブが存在する場合
 */
export async function enqueueUnpublish(
  organizationId: string,
  projectId:      string,
  userId:         string | null
): Promise<PublishJobResponse> {
  // ── 1. プロジェクト存在確認・名前取得 ────────────────────
  const project = await projectRepo.findByIdFull(organizationId, projectId);
  if (!project) {
    throw new Error('PROJECT_NOT_FOUND');
  }
  const projectName = project.project_name!;

  // ── 2. 公開済みアセット確認 ──────────────────────────────
  const assetId = await publishJobRepo.findPublishedAssetId(organizationId, projectId);
  if (assetId === null) {
    throw new Error('NOT_PUBLISHED');
  }

  // ── 3. 重複チェック ──────────────────────────────────────
  const latest = await publishJobRepo.findLatestByProject(organizationId, projectId);
  if (latest && (latest.status === 'pending' || latest.status === 'running')) {
    throw new Error('ALREADY_IN_PROGRESS');
  }

  // ── 4. DB に pending ジョブを作成 ───────────────────────
  const job = await publishJobRepo.insert({
    job_type:        'unpublish',
    organization_id: organizationId,
    project_id:      projectId,
    asset_id:        assetId,
    status:          'pending',
    triggered_by:    userId,
    trigger_type:    'manual',
    error_message:   null,
    started_at:      null,
    finished_at:     null,
  });

  const jobId = job.job_id!;

  // ── 5. bullmq へ投入 ────────────────────────────────────
  await maimlUnpublishQueue.add(
    'unpublish',
    {
      jobId,
      organizationId,
      projectId,
      projectName,
      assetId,
      triggerType: 'manual',
      userId,
    },
    { jobId }
  );

  // ── 6. レスポンス ────────────────────────────────────────
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
 * @param projectId      - プロジェクト ID
 * @returns 最新ジョブの状態、または unpublished 情報
 */
export async function getPublishStatus(
  organizationId: string,
  projectId:      string
): Promise<PublishStatusResponse> {
  const latest = await publishJobRepo.findLatestByProject(organizationId, projectId);

  if (!latest) {
    // ジョブ履歴なし → 未公開
    return {
      job_id:       null,
      job_type:     null,
      status:       null,
      asset_id:     null,
      project_id:   projectId,
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
    project_id:    projectId,
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

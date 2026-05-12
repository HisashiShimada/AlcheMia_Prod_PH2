/**
 * MaiML 公開ジョブ Repository
 *
 * @description public.maiml_publish_job テーブルの CRUD 操作
 * @reference docs/MaiML_OpenData_Pipeline/spec.md §10
 */

import { getPgp } from '../database/db';
import { MaimlPublishJob } from '../types/maimlOpenData';
import { loadSqlFile } from '../sql/loader';

// ============================================================
// INSERT
// ============================================================

/**
 * 公開ジョブを INSERT する
 *
 * @param data - 挿入するジョブデータ（job_id は DB 側で生成）
 * @returns 生成されたジョブレコード（job_id 付き）
 */
export async function insert(data: Omit<MaimlPublishJob, 'job_id' | 'created_at'>): Promise<MaimlPublishJob> {
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile('maiml_publish_job/insert.sql');
  return await pgp.one<MaimlPublishJob>(sqlQuery, [
    data.job_type,
    data.organization_id,
    data.project_id,
    data.asset_id ?? null,
    data.status,
    data.triggered_by ?? null,
    data.trigger_type,
    data.error_message ?? null,
    data.started_at ?? null,
    data.finished_at ?? null,
  ]);
}

// ============================================================
// UPDATE STATUS
// ============================================================

/**
 * ジョブステータスを更新する
 *
 * @param jobId - 対象ジョブの UUID
 * @param status - 新しいステータス
 * @param opts - 追加更新フィールド
 */
export async function updateStatus(
  jobId: string,
  status: MaimlPublishJob['status'],
  opts: {
    started_at?:    Date | null;
    finished_at?:   Date | null;
    error_message?: string | null;
    asset_id?:      bigint | null;
  } = {}
): Promise<void> {
  const pgp = getPgp();

  const setClauses: string[] = ['status = $2'];
  const params: unknown[] = [jobId, status];
  let idx = 3;

  if (opts.started_at !== undefined) {
    setClauses.push(`started_at = $${idx++}`);
    params.push(opts.started_at);
  }
  if (opts.finished_at !== undefined) {
    setClauses.push(`finished_at = $${idx++}`);
    params.push(opts.finished_at);
  }
  if (opts.error_message !== undefined) {
    setClauses.push(`error_message = $${idx++}`);
    params.push(opts.error_message);
  }
  if (opts.asset_id !== undefined) {
    setClauses.push(`asset_id = $${idx++}`);
    params.push(opts.asset_id);
  }

  const query = `
    UPDATE maiml_publish_job
    SET ${setClauses.join(', ')}
    WHERE job_id = $1
  `;

  await pgp.none(query, params);
}

// ============================================================
// SELECT
// ============================================================

/**
 * 最新のジョブを取得する（publish-status API 用）
 *
 * @param organizationId - 組織 ID
 * @param projectId - プロジェクト ID
 * @returns 最新ジョブレコード（なければ null）
 */
export async function findLatestByProject(
  organizationId: string,
  projectId:      string
): Promise<MaimlPublishJob | null> {
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile('maiml_publish_job/findLatestByProject.sql');
  return await pgp.oneOrNone<MaimlPublishJob>(sqlQuery, [organizationId, projectId]);
}

/**
 * job_id でジョブを取得する
 *
 * @param jobId - ジョブ UUID
 * @returns ジョブレコード（なければ null）
 */
export async function findByJobId(jobId: string): Promise<MaimlPublishJob | null> {
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile('maiml_publish_job/findByJobId.sql');
  return await pgp.oneOrNone<MaimlPublishJob>(sqlQuery, [jobId]);
}

/**
 * 対象プロジェクトの現在の公開済みアセット ID を返す
 *
 * @description 最新 done/publish ジョブから asset_id を返す。
 *              ただし unpublish の done ジョブが後続する場合は null を返す。
 * @param organizationId - 組織 ID
 * @param projectId - プロジェクト ID
 * @returns 公開済み asset_id（非公開・未公開なら null）
 */
export async function findPublishedAssetId(
  organizationId: string,
  projectId:      string
): Promise<bigint | null> {
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile('maiml_publish_job/findPublishedAssetId.sql');
  const row = await pgp.oneOrNone<{ job_type: string; asset_id: bigint | null }>(
    sqlQuery,
    [organizationId, projectId]
  );
  if (!row) return null;
  // 最新 done ジョブが unpublish なら非公開済みとみなす
  if (row.job_type === 'unpublish') return null;
  return row.asset_id ?? null;
}

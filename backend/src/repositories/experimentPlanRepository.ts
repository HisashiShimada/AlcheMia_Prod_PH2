/**
 * experimentPlanRepository.ts
 * 実験計画 Repository 層
 *
 * @remarks
 * experiment_plan テーブルの CRUD 操作を担当。
 * SQL は外部ファイル（src/sql/queries/experiment_plans/）で管理。
 */

import { getPool } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import type { ExperimentPlan, ExperimentPlanValues } from '../types/database';
import type { PoolClient } from 'pg';

// ──────────────────────────────────────────────
// 内部型
// ──────────────────────────────────────────────

interface ExperimentPlanRow {
  organization_id: string;
  project_id: string;
  method_id: string;
  task_no: number;
  planned_values: ExperimentPlanValues | null;
  create_user_id: string | null;
  create_at: Date;
  update_user_id: string | null;
  update_at: Date;
}

function rowToModel(row: ExperimentPlanRow): ExperimentPlan {
  return {
    organization_id: row.organization_id,
    project_id: row.project_id,
    method_id: row.method_id,
    task_no: row.task_no,
    planned_values: row.planned_values ?? undefined,
    create_user_id: row.create_user_id ?? undefined,
    create_at: row.create_at,
    update_user_id: row.update_user_id ?? undefined,
    update_at: row.update_at,
  };
}

// ──────────────────────────────────────────────
// Repository メソッド
// ──────────────────────────────────────────────

/**
 * 指定メソッドの全タスク分の実験計画を取得
 *
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @param methodId - メソッドID
 * @returns ExperimentPlan 配列（task_no 昇順）
 */
export async function findByMethod(
  organizationId: string,
  projectId: string,
  methodId: string
): Promise<ExperimentPlan[]> {
  const pool = getPool();
  const sql = await loadSqlFile('experiment_plans/findByMethod.sql');

  const result = await pool.query<ExperimentPlanRow>(sql, [
    organizationId,
    projectId,
    methodId,
  ]);

  return result.rows.map(rowToModel);
}

/**
 * 1タスク分の実験計画を UPSERT（存在すれば UPDATE、なければ INSERT）
 *
 * @param data - ExperimentPlan（task_no は 1〜N）
 * @returns 保存後のレコード
 */
export async function upsert(data: ExperimentPlan): Promise<ExperimentPlan> {
  const pool = getPool();
  const sql = await loadSqlFile('experiment_plans/upsert.sql');

  const result = await pool.query<ExperimentPlanRow>(sql, [
    data.organization_id,
    data.project_id,
    data.method_id,
    data.task_no,
    data.planned_values != null ? JSON.stringify(data.planned_values) : null,
    data.create_user_id ?? null,
    data.update_user_id ?? null,
  ]);

  return rowToModel(result.rows[0]);
}

/**
 * 指定プロジェクトの全実験計画を取得（全メソッド・全タスク）
 * チェックアウト時の MAIML 書き込みに使用
 *
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @returns ExperimentPlan 配列（method_id 昇順, task_no 昇順）
 */
export async function findByProject(
  organizationId: string,
  projectId: string
): Promise<ExperimentPlan[]> {
  const pool = getPool();
  const sql = await loadSqlFile('experiment_plans/findByProject.sql');

  const result = await pool.query<ExperimentPlanRow>(sql, [
    organizationId,
    projectId,
  ]);

  return result.rows.map(rowToModel);
}

/**
 * 指定メソッドの全タスク分の実験計画を取得（トランザクション内用）
 *
 * @remarks
 * タスク登録保存時に experiment_plan.__meta__.transitionOrder を読み取るために使用。
 * PoolClient を受け取りトランザクション内で実行する。
 *
 * @param client - トランザクション用 PoolClient
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @param methodId - メソッドID
 * @returns ExperimentPlan 配列（task_no 昇順）
 */
export async function findByMethodForTransaction(
  client: PoolClient,
  organizationId: string,
  projectId: string,
  methodId: string
): Promise<ExperimentPlan[]> {
  const sql = await loadSqlFile('experiment_plans/findByMethod.sql');

  const result = await client.query<ExperimentPlanRow>(sql, [
    organizationId,
    projectId,
    methodId,
  ]);

  // PoolClient.query() は result 自体が配列として返る場合がある
  const rows = Array.isArray(result) ? result : result.rows;
  return rows.map(rowToModel);
}

/**
 * タスク登録時の初期レコードを INSERT（既存データは上書きしない）
 *
 * @remarks
 * `ON CONFLICT DO NOTHING` により、既存の `planned_values` は保護される。
 * タスク登録保存のトランザクション内で呼び出す。
 *
 * @param client - トランザクション用 PoolClient
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @param methodId - メソッドID
 * @param taskNo - タスク番号（1〜N）
 * @param userId - 作成・更新ユーザーID
 */
export async function initInsertForTransaction(
  client: PoolClient,
  organizationId: string,
  projectId: string,
  methodId: string,
  taskNo: number,
  userId: string
): Promise<void> {
  const sql = await loadSqlFile('experiment_plans/initInsert.sql');
  await client.query(sql, [organizationId, projectId, methodId, taskNo, userId, userId]);
}

/**
 * 指定メソッドの全タスク分の実験計画を削除
 *
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @param methodId - メソッドID
 * @returns 削除件数
 */
export async function deleteByMethod(
  organizationId: string,
  projectId: string,
  methodId: string
): Promise<number> {
  const pool = getPool();
  const sql = await loadSqlFile('experiment_plans/deleteByMethod.sql');

  const result = await pool.query(sql, [organizationId, projectId, methodId]);
  return result.rowCount ?? 0;
}

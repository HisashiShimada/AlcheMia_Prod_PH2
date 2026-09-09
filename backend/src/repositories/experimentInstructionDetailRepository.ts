/**
 * experimentInstructionDetailRepository.ts
 * experiment_instruction_detail テーブルへのデータアクセス層
 *
 * @remarks
 * DDL: docs/design/db/ddl/experiment_instruction_detail.sql
 * 主キー: (organization_id, project_id, method_id, task_no, transition_id, template_name, prop_key)
 *
 * - insert / update: 規約準拠の基本メソッド（テーブル型 Object を引数として受け取る）
 * - upsertFromPlan: ExperimentPlanDialog 保存時に一括 UPSERT する
 * - updateActualAndUncertainty: WorkRecordPanel 保存時に実績値・不確かさを更新する
 */

import type { PoolClient } from 'pg';
import { getPool, getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import type { ExperimentInstructionDetail } from '../types/database';

const TABLE_NAME = 'experiment_instruction_detail';

const PRIMARY_KEYS: (keyof ExperimentInstructionDetail)[] = [
  'organization_id',
  'project_id',
  'method_id',
  'task_no',
  'transition_id',
  'template_id',
  'prop_key',
];

function buildInsertQuery(
  tableName: string,
  data: Record<string, unknown>
): { query: string; values: unknown[] } {
  const keys = Object.keys(data).filter((k) => data[k] !== undefined);
  const columns = keys.join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const values = keys.map((k) => data[k]);
  const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
  return { query, values };
}

function buildUpdateQuery(
  tableName: string,
  data: Record<string, unknown>,
  whereKeys: string[]
): { query: string; values: unknown[] } {
  const allKeys = Object.keys(data).filter((k) => data[k] !== undefined);
  const setKeys = allKeys.filter((k) => !whereKeys.includes(k));
  const setClause = setKeys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const whereClause = whereKeys
    .map((k, i) => `${k} = $${setKeys.length + i + 1}`)
    .join(' AND ');
  const values = [
    ...setKeys.map((k) => data[k]),
    ...whereKeys.map((k) => data[k]),
  ];
  const query = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause} RETURNING *`;
  return { query, values };
}

/**
 * 単一レコードを INSERT する（規約準拠）
 */
export async function insert(
  data: ExperimentInstructionDetail
): Promise<ExperimentInstructionDetail> {
  const pool = getPool();
  const record: Record<string, unknown> = { ...data };
  const { query, values } = buildInsertQuery(TABLE_NAME, record);
  const result = await pool.query<ExperimentInstructionDetail>(query, values);
  return result.rows[0];
}

/**
 * 単一レコードを UPDATE する（規約準拠）
 * 主キー7カラムで対象レコードを特定する
 */
export async function update(
  data: ExperimentInstructionDetail
): Promise<ExperimentInstructionDetail | null> {
  const pool = getPool();
  const record: Record<string, unknown> = { ...data };
  const { query, values } = buildUpdateQuery(TABLE_NAME, record, PRIMARY_KEYS as string[]);
  const result = await pool.query<ExperimentInstructionDetail>(query, values);
  return result.rows[0] ?? null;
}

/**
 * ExperimentPlanDialog 保存時に一括 UPSERT する（トランザクション内用）
 *
 * 既存レコードがある場合は expected_value / xsi_type / transition_name / template_name のみ更新する。
 * actual_value や不確かさ情報は上書きしない。
 */
export async function upsertFromPlan(
  client: PoolClient,
  rows: Array<{
    organizationId: string;
    projectId: string;
    methodId: string;
    taskNo: number;
    transitionId: string;
    templateId: string;
    propKey: string;
    xsiType: string | null;
    expectedValue: string | null;
    userId: string;
    transitionName: string | null;
    templateName: string | null;
  }>
): Promise<void> {
  if (rows.length === 0) return;

  const sqlQuery = await loadSqlFile('experiment_instruction_details/upsertFromPlan.sql');

  for (const row of rows) {
    await client.query(sqlQuery, [
      row.organizationId,   // $1
      row.projectId,        // $2
      row.methodId,         // $3
      row.taskNo,           // $4
      row.transitionId,     // $5
      row.templateId,       // $6
      row.propKey,          // $7
      row.xsiType,          // $8
      row.expectedValue,    // $9
      row.userId,           // $10 (create_user_id / update_user_id)
      row.transitionName,   // $11
      row.templateName,     // $12
    ]);
  }
}

/**
 * WorkRecordPanel 保存時に実績値・不確かさ情報を更新する。
 * レコードが存在しない場合は INSERT する（スケルトンがない環境への対応）。
 */
export async function updateActualAndUncertainty(params: {
  organizationId: string;
  projectId: string;
  methodId: string;
  taskNo: number;
  transitionId: string;
  templateId: string;
  propKey: string;
  actualValue: string | null;
  nameSpaceId: string | null;
  uncertaintyKey: string | null;
  uncertaintyAssignedValue: string | null;
  uncertaintyAssignedBy: string | null;
  uncertaintyAssignedAt: Date | null;
  updateUserId: string;
}): Promise<void> {
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile(
    'experiment_instruction_details/updateActualAndUncertainty.sql'
  );

  await pgp.none(sqlQuery, [
    params.organizationId,           // $1
    params.projectId,                // $2
    params.methodId,                 // $3
    params.taskNo,                   // $4
    params.transitionId,             // $5
    params.templateId,               // $6
    params.propKey,                  // $7
    params.actualValue,              // $8
    params.nameSpaceId,              // $9
    params.uncertaintyKey,           // $10
    params.uncertaintyAssignedValue, // $11
    params.uncertaintyAssignedBy,    // $12
    params.uncertaintyAssignedAt,    // $13
    params.updateUserId,             // $14
  ]);
}

/**
 * プロジェクト内の全 experiment_instruction_detail を取得する（実験指示タブ表示用）。
 * 定性評価情報（uncertainty_key / uncertainty_assigned_value）を一括取得し
 * Service 層でフィールドにマッピングするために使用する。
 *
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @returns 全レコード一覧
 */
export async function findByProject(
  organizationId: string,
  projectId: string
): Promise<ExperimentInstructionDetail[]> {
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile('experiment_instruction_details/findByProject.sql');
  return pgp.any<ExperimentInstructionDetail>(sqlQuery, [organizationId, projectId]);
}



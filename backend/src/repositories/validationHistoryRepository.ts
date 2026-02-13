/**
 * ValidationHistoryRepository
 * 
 * @description MAIMLバリデーション履歴のデータアクセス層
 * @table maiml_validation_history
 * @created 2026-01-27
 */

import { getPool } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * バリデーション履歴型定義
 */
export interface ValidationHistory {
  validation_id?: string;
  organization_id: string;
  project_id?: string | null;
  file_key?: string | null;
  user_id: string;
  validation_mode: 'basic' | 'full';
  is_valid: boolean;
  total_errors: number;
  total_warnings: number;
  error_details?: any;
  warning_details?: any;
  validation_duration_ms?: number | null;
  elements_validated?: number | null;
  attributes_validated?: number | null;
  nodes_validated?: number | null;
  arcs_validated?: number | null;
  created_at?: Date;
}

/**
 * バリデーション履歴作成
 */
export async function createValidationHistory(
  data: ValidationHistory
): Promise<ValidationHistory> {
  const pool = getPool();

  const validation_id = data.validation_id || uuidv4();

  const query = `
    INSERT INTO maiml_validation_history (
      validation_id,
      organization_id,
      project_id,
      file_key,
      user_id,
      validation_mode,
      is_valid,
      total_errors,
      total_warnings,
      error_details,
      warning_details,
      validation_duration_ms,
      elements_validated,
      attributes_validated,
      nodes_validated,
      arcs_validated,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
    RETURNING *
  `;

  const values = [
    validation_id,
    data.organization_id,
    data.project_id || null,
    data.file_key || null,
    data.user_id,
    data.validation_mode,
    data.is_valid,
    data.total_errors,
    data.total_warnings,
    data.error_details ? JSON.stringify(data.error_details) : null,
    data.warning_details ? JSON.stringify(data.warning_details) : null,
    data.validation_duration_ms || null,
    data.elements_validated || null,
    data.attributes_validated || null,
    data.nodes_validated || null,
    data.arcs_validated || null,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}

/**
 * 組織別バリデーション履歴一覧取得
 */
export async function findByOrganizationId(
  organizationId: string,
  options: {
    limit?: number;
    offset?: number;
    projectId?: string;
    isValid?: boolean;
  } = {}
): Promise<ValidationHistory[]> {
  const pool = getPool();

  const { limit = 100, offset = 0, projectId, isValid } = options;

  let query = `
    SELECT *
    FROM maiml_validation_history
    WHERE organization_id = $1
  `;

  const values: any[] = [organizationId];
  let paramIndex = 2;

  if (projectId) {
    query += ` AND project_id = $${paramIndex}`;
    values.push(projectId);
    paramIndex++;
  }

  if (typeof isValid === 'boolean') {
    query += ` AND is_valid = $${paramIndex}`;
    values.push(isValid);
    paramIndex++;
  }

  query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  values.push(limit, offset);

  const result = await pool.query(query, values);

  return result.rows;
}

/**
 * バリデーション履歴詳細取得
 */
export async function findById(
  validationId: string,
  organizationId: string
): Promise<ValidationHistory | null> {
  const pool = getPool();

  const query = `
    SELECT *
    FROM maiml_validation_history
    WHERE validation_id = $1 AND organization_id = $2
  `;

  const result = await pool.query(query, [validationId, organizationId]);

  return result.rows[0] || null;
}

/**
 * プロジェクト別統計取得
 */
export async function getProjectStatistics(
  projectId: string,
  organizationId: string
): Promise<any> {
  const pool = getPool();

  const query = `
    SELECT 
      COUNT(*) AS total_validations,
      SUM(CASE WHEN is_valid THEN 1 ELSE 0 END) AS valid_count,
      SUM(CASE WHEN is_valid THEN 0 ELSE 1 END) AS invalid_count,
      ROUND(AVG(validation_duration_ms), 2) AS avg_duration_ms,
      ROUND(AVG(total_errors), 2) AS avg_errors,
      ROUND(AVG(total_warnings), 2) AS avg_warnings
    FROM maiml_validation_history
    WHERE project_id = $1 AND organization_id = $2
  `;

  const result = await pool.query(query, [projectId, organizationId]);

  return result.rows[0];
}

/**
 * 頻出エラー分析
 */
export async function getFrequentErrors(
  organizationId: string,
  options: {
    projectId?: string;
    limit?: number;
  } = {}
): Promise<any[]> {
  const pool = getPool();

  const { projectId, limit = 10 } = options;

  let query = `
    SELECT 
      jsonb_array_elements(error_details)->>'type' AS error_type,
      jsonb_array_elements(error_details)->>'message' AS error_message,
      COUNT(*) AS occurrence_count
    FROM maiml_validation_history
    WHERE organization_id = $1 AND NOT is_valid AND error_details IS NOT NULL
  `;

  const values: any[] = [organizationId];
  let paramIndex = 2;

  if (projectId) {
    query += ` AND project_id = $${paramIndex}`;
    values.push(projectId);
    paramIndex++;
  }

  query += `
    GROUP BY error_type, error_message
    ORDER BY occurrence_count DESC
    LIMIT $${paramIndex}
  `;
  values.push(limit);

  const result = await pool.query(query, values);

  return result.rows;
}

/**
 * 古いバリデーション履歴の削除
 */
export async function deleteOldRecords(
  organizationId: string,
  daysToKeep: number = 90
): Promise<number> {
  const pool = getPool();

  const query = `
    DELETE FROM maiml_validation_history
    WHERE organization_id = $1
      AND created_at < CURRENT_TIMESTAMP - INTERVAL '${daysToKeep} days'
  `;

  const result = await pool.query(query, [organizationId]);

  return result.rowCount || 0;
}
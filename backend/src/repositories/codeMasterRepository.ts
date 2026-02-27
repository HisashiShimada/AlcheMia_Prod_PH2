/**
 * code_master Repository
 * 
 * code_masterテーブルへのデータアクセスを提供
 * 
 * @module codeMasterRepository
 * @version 1.0.0
 * @date 2026-02-20
 */

import { getPool } from '../database/db';

/**
 * code_master型定義
 */
export interface CodeMaster {
  organization_id: string;
  code_division: string;
  code_value: string;
  code_name: string;
  code_description?: string;
  code_remark?: string;
  create_user_id?: string;
  update_user_id?: string;
  create_at?: Date;
  update_at?: Date;
}

/**
 * code_division別にコードマスタを取得
 * 
 * @param organizationId - 組織ID
 * @param codeDivision - コード区分（例: 'experiment_condition'）
 * @returns {Promise<CodeMaster[]>} コードマスタ配列
 */
export async function findByDivision(
  organizationId: string,
  codeDivision: string
): Promise<CodeMaster[]> {
  const pool = getPool();
  
  const query = `
    SELECT
      organization_id,
      code_division,
      code_value,
      code_name,
      code_description,
      code_remark,
      create_user_id,
      update_user_id,
      create_at,
      update_at
    FROM code_master
    WHERE organization_id = $1
      AND code_division = $2
    ORDER BY code_value
  `;
  
  const result = await pool.query(query, [organizationId, codeDivision]);
  return result.rows;
}

/**
 * 特定のコード値を取得
 * 
 * @param organizationId - 組織ID
 * @param codeDivision - コード区分
 * @param codeValue - コード値
 * @returns {Promise<CodeMaster | null>} コードマスタ、または null
 */
export async function findByValue(
  organizationId: string,
  codeDivision: string,
  codeValue: string
): Promise<CodeMaster | null> {
  const pool = getPool();
  
  const query = `
    SELECT
      organization_id,
      code_division,
      code_value,
      code_name,
      code_description,
      code_remark,
      create_user_id,
      update_user_id,
      create_at,
      update_at
    FROM code_master
    WHERE organization_id = $1
      AND code_division = $2
      AND code_value = $3
  `;
  
  const result = await pool.query(query, [organizationId, codeDivision, codeValue]);
  return result.rows[0] || null;
}

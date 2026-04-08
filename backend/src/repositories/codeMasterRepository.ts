/**
 * code_master Repository
 * 
 * code_masterテーブルへのデータアクセスを提供
 * 
 * @module codeMasterRepository
 * @version 1.0.0
 * @date 2026-02-20
 */

import { ITask } from 'pg-promise';
import { getPool } from '../database/db';
import { loadSqlFile } from '../sql/loader';

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

/**
 * 組織用の code_master 初期データを一括登録
 *
 * test_data/public.code_master.csv に定義された35件のレコードを、
 * 指定した organization_id で登録する。
 * ON CONFLICT DO NOTHING によりべき等な処理を保証する。
 *
 * @param organizationId - 登録対象の組織ID
 * @param userId - 操作ユーザーID（create_user_id / update_user_id に設定）
 * @param t - pg-promise トランザクションオブジェクト（省略時はプール接続を使用）
 * @returns {Promise<void>}
 */
export async function insertInitialData(
  organizationId: string,
  userId: string,
  t?: ITask<unknown>
): Promise<void> {
  const query = await loadSqlFile('codeMaster/insertInitialData.sql');
  if (t) {
    await t.none(query, [organizationId, userId]);
  } else {
    const pool = getPool();
    await pool.query(query, [organizationId, userId]);
  }
}

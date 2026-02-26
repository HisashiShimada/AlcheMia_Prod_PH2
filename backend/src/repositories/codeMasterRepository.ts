/**
 * code_master Repository
 *
 * code_masterテーブルへのデータアクセスを提供
 * pg-promise + SQLファイル外部管理パターンを使用
 *
 * @module codeMasterRepository
 */

import { getPgp } from '../database/db';
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
  const pgp = getPgp();

  const sqlQuery = await loadSqlFile('code_master/findByDivision.sql');
  return await pgp.any<CodeMaster>(sqlQuery, [organizationId, codeDivision]);
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
  const pgp = getPgp();

  const sqlQuery = await loadSqlFile('code_master/findByValue.sql');
  const result = await pgp.oneOrNone<CodeMaster>(sqlQuery, [organizationId, codeDivision, codeValue]);
  return result ?? null;
}

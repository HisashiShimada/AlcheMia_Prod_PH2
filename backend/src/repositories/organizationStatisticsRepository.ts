/**
 * 組織統計情報リポジトリ
 * データアクセス層
 */

import { getPool } from '../database/db';

/**
 * 組織利用者数を取得（organization_userテーブル）
 *
 * @param organizationId 組織ID
 * @returns 組織利用者数
 */
export async function countOrganizationUsers(organizationId: string): Promise<number> {
  const pool = getPool();

  const query = `
    SELECT COUNT(*) AS count
    FROM organization_user
    WHERE organization_id = $1
  `;

  const result = await pool.query<{ count: string }>(query, [organizationId]);
  return parseInt(result.rows[0].count, 10);
}

/**
 * プロジェクト数を取得（projectテーブル）
 *
 * @param organizationId 組織ID
 * @returns プロジェクト数
 */
export async function countProjects(organizationId: string): Promise<number> {
  const pool = getPool();

  const query = `
    SELECT COUNT(*) AS count
    FROM project
    WHERE organization_id = $1
  `;

  const result = await pool.query<{ count: string }>(query, [organizationId]);
  return parseInt(result.rows[0].count, 10);
}

/**
 * 組織リポジトリ
 * organizationテーブルからデータを取得
 */

import { Pool } from 'pg';

/**
 * 組織の二段階認証要否フラグを取得
 * 
 * @param pool - データベース接続プール
 * @param organizationId - 組織ID
 * @returns is_entry値（true: 二段階認証必要, false: 不要）
 */
export async function getIsEntry(
  pool: Pool,
  organizationId: string
): Promise<boolean> {
  const query = `
    SELECT is_entry
    FROM organization
    WHERE organization_id = $1
  `;

  const result = await pool.query(query, [organizationId]);

  if (result.rows.length === 0) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  // is_entryがnullの場合はデフォルトでtrue（二段階認証あり）
  return result.rows[0].is_entry ?? true;
}

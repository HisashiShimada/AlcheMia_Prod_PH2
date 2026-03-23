/**
 * 組織リポジトリ
 * organizationテーブルからデータを取得
 */

import { Pool } from 'pg';
import { getPool } from '../database/db';

// ============================================================
// 組織行の型定義
// ============================================================

export interface OrganizationRow {
  organization_id:             string;
  organization_cd:             string;
  organization_display_name:   string;
  is_entry:                    boolean;
  use_deemed_progress:         boolean;
  default_retention_days:      number;
  [key: string]: unknown;
}

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

/**
 * 組織のみなし進捗使用フラグを取得
 * 
 * @param pool - データベース接続プール
 * @param organizationId - 組織ID
 * @returns use_deemed_progress値（true: みなし進捗を使用する, false: 使用しない）
 */
export async function getUseDeemedProgress(
  pool: Pool,
  organizationId: string
): Promise<boolean> {
  const query = `
    SELECT use_deemed_progress
    FROM organization
    WHERE organization_id = $1
  `;

  const result = await pool.query(query, [organizationId]);

  if (result.rows.length === 0) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  // use_deemed_progressがnullの場合はデフォルトでtrue（みなし進捗あり）
  return result.rows[0].use_deemed_progress ?? true;
}

/**
 * 組織 ID で組織レコードを取得する
 *
 * @param organizationId - 組織 ID
 * @returns 組織レコード（存在しない場合は null）
 */
export async function findById(organizationId: string): Promise<OrganizationRow | null> {
  const pool = getPool();

  const query = `
    SELECT
      organization_id,
      organization_cd,
      organization_display_name,
      is_entry,
      use_deemed_progress,
      COALESCE(default_retention_days, 365) AS default_retention_days
    FROM organization
    WHERE organization_id = $1
  `;

  const result = await pool.query(query, [organizationId]);
  return result.rows.length > 0 ? (result.rows[0] as OrganizationRow) : null;
}

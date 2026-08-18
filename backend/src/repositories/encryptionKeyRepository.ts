/**
 * 暗号化鍵 Repository
 *
 * @remarks
 * encryption_keys テーブルの CRUD 操作を管理する。
 * 本実装フェーズでは SQL クエリを外部ファイル化すること。
 */

import { getPool } from '../database/db';
import type {
  EncryptionKeyRow,
  EncryptionAlgorithmType,
  KeySourceType,
} from '../types/encryptionTypes';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

/** INSERT 用データ（key_id/created_at/update_at は自動生成） */
export type InsertEncryptionKeyData = Omit<
  EncryptionKeyRow,
  'created_at' | 'update_at' | 'usage_count'
>;

// ---------------------------------------------------------------------------
// 取得
// ---------------------------------------------------------------------------

/**
 * 組織の有効な鍵一覧を取得
 */
export async function findAllByOrganization(
  organizationId: string,
): Promise<EncryptionKeyRow[]> {
  // TODO: 本実装 - SQL外部ファイル化
  // const sql = await loadSqlFile('encryptionKeys/findAllByOrganization.sql');
  // return await db.any<EncryptionKeyRow>(sql, [organizationId]);

  const pool = getPool();
  const result = await pool.query<EncryptionKeyRow>(
    `SELECT * FROM encryption_keys
     WHERE organization_id = $1 AND is_active = TRUE
     ORDER BY created_at DESC`,
    [organizationId],
  );
  return result.rows;
}

/**
 * key_id で鍵を取得
 */
export async function findById(
  keyId: string,
  organizationId: string,
): Promise<EncryptionKeyRow | null> {
  const pool = getPool();
  const result = await pool.query<EncryptionKeyRow>(
    `SELECT * FROM encryption_keys
     WHERE key_id = $1 AND organization_id = $2`,
    [keyId, organizationId],
  );
  return result.rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// 書き込み
// ---------------------------------------------------------------------------

/**
 * 鍵メタデータを INSERT
 */
export async function insert(data: InsertEncryptionKeyData): Promise<EncryptionKeyRow> {
  const pool = getPool();

  const columns = Object.keys(data).filter((k) => (data as Record<string, unknown>)[k] !== undefined);
  const values = columns.map((col) => (data as Record<string, unknown>)[col]);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

  const result = await pool.query<EncryptionKeyRow>(
    `INSERT INTO encryption_keys (${columns.join(', ')})
     VALUES (${placeholders})
     RETURNING *`,
    values,
  );
  return result.rows[0];
}

/**
 * 鍵の使用回数・最終使用日時を更新
 */
export async function updateUsage(
  keyId: string,
  organizationId: string,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE encryption_keys
     SET usage_count = usage_count + 1,
         last_used_at = CURRENT_TIMESTAMP,
         update_at = CURRENT_TIMESTAMP
     WHERE key_id = $1 AND organization_id = $2`,
    [keyId, organizationId],
  );
}

/**
 * 鍵を論理削除（is_active = FALSE）
 */
export async function softDelete(
  keyId: string,
  organizationId: string,
): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query(
    `UPDATE encryption_keys
     SET is_active = FALSE, update_at = CURRENT_TIMESTAMP
     WHERE key_id = $1 AND organization_id = $2 AND is_active = TRUE`,
    [keyId, organizationId],
  );
  return (result.rowCount ?? 0) > 0;
}

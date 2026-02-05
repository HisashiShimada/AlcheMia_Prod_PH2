/**
 * Corporation（会社）リポジトリ
 * データベースアクセス層
 */

import { Pool } from 'pg';
import { getPool } from '../database/db';

/**
 * Corporationのデータ型定義
 */
export interface CorporationRow {
  corporation_id: string; // UUID
  corporation_name: string;
  is_active: boolean;
  create_at: Date;
  update_at: Date;
}

/**
 * Corporation検索フィルター
 */
export interface CorporationSearchFilters {
  search?: string;
  isActive?: boolean;
  sortBy?: 'corporation_id' | 'corporation_name' | 'update_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Corporation一覧を取得
 * 
 * @param filters 検索フィルター
 * @returns Corporationの配列
 */
export async function findAll(
  filters: CorporationSearchFilters = {}
): Promise<CorporationRow[]> {
  const pool: Pool = getPool();
  
  console.log('=== corporationRepository.findAll called ===');
  console.log('filters:', filters);
  
  let query = `
    SELECT 
      corporation_id,
      corporation_name,
      is_active,
      create_at,
      update_at
    FROM corporation
    WHERE 1=1
  `;
  
  const params: any[] = [];
  let paramIndex = 1;
  
  // 検索フィルター
  if (filters.search) {
    query += ` AND (
      corporation_id::text ILIKE $${paramIndex} OR
      corporation_name ILIKE $${paramIndex}
    )`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }
  
  // アクティブフィルター
  if (filters.isActive !== undefined) {
    query += ` AND is_active = $${paramIndex}`;
    params.push(filters.isActive);
    paramIndex++;
  }
  
  // ソート（デフォルト: 作成日時の昇順 - 新規アップロードデータが一番下に表示される）
  const sortBy = filters.sortBy || 'create_at';
  const sortOrder = filters.sortOrder || 'asc';
  query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
  
  console.log('=== Corporation Query Details ===');
  console.log('Sort By:', sortBy, '(default: create_at)');
  console.log('Sort Order:', sortOrder.toUpperCase(), '(default: ASC)');
  console.log('Executing query:', query);
  console.log('With params:', params);
  
  try {
    const result = await pool.query<CorporationRow>(query, params);
    console.log('Query executed successfully, rows:', result.rows.length);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Corporation IDで1件取得
 * 
 * @param corporationId Corporation ID (UUID)
 * @returns Corporation（見つからない場合はnull）
 */
export async function findById(
  corporationId: string
): Promise<CorporationRow | null> {
  const pool: Pool = getPool();
  
  const query = `
    SELECT 
      corporation_id,
      corporation_name,
      is_active,
      create_at,
      update_at
    FROM corporation
    WHERE corporation_id = $1
  `;
  
  const result = await pool.query<CorporationRow>(query, [corporationId]);
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Corporationの件数を取得
 * 
 * @returns 件数
 */
export async function count(): Promise<number> {
  const pool: Pool = getPool();
  
  const query = `
    SELECT COUNT(*) as count
    FROM corporation
  `;
  
  const result = await pool.query(query);
  return parseInt(result.rows[0].count, 10);
}

/**
 * Corporation名が既に存在するかチェック
 * 
 * @param corporationName Corporation名
 * @param excludeId チェック時に除外するID（更新時に使用、UUID）
 * @returns 存在する場合true
 */
export async function existsByName(
  corporationName: string,
  excludeId?: string
): Promise<boolean> {
  const pool: Pool = getPool();
  
  let query = `
    SELECT EXISTS (
      SELECT 1
      FROM corporation
      WHERE corporation_name = $1
  `;
  
  const params: any[] = [corporationName];
  
  if (excludeId !== undefined) {
    query += ` AND corporation_id != $2`;
    params.push(excludeId);
  }
  
  query += `) as exists`;
  
  const result = await pool.query(query, params);
  return result.rows[0].exists;
}

/**
 * Corporationを新規作成
 * 
 * @param data Corporation情報
 * @param userId ログインユーザーID
 * @returns 作成されたCorporation
 */
export async function create(
  data: {
    corporationId: string; // UUID
    corporationName: string;
    isActive?: boolean;
  },
  userId: string
): Promise<CorporationRow> {
  const pool: Pool = getPool();
  
  const query = `
    INSERT INTO corporation (
      corporation_id,
      corporation_name,
      is_active,
      create_user_id,
      update_user_id,
      create_at,
      update_at
    ) VALUES (
      $1, $2, $3, $4, $5, NOW(), NOW()
    )
    RETURNING 
      corporation_id,
      corporation_name,
      is_active,
      create_at,
      update_at
  `;
  
  const values = [
    data.corporationId,
    data.corporationName,
    data.isActive !== undefined ? data.isActive : true,
    userId,
    userId,
  ];
  
  const result = await pool.query<CorporationRow>(query, values);
  
  return result.rows[0];
}

/**
 * Corporationを更新
 * 
 * @param corporationId Corporation ID (UUID)
 * @param data 更新情報
 * @param userId ログインユーザーID
 * @returns 更新されたCorporation（見つからない場合はnull）
 */
export async function update(
  corporationId: string,
  data: {
    corporationName?: string;
    isActive?: boolean;
  },
  userId: string
): Promise<CorporationRow | null> {
  const pool: Pool = getPool();
  
  const updates: string[] = [];
  const values: any[] = [corporationId];
  let paramIndex = 2;
  
  if (data.corporationName !== undefined) {
    updates.push(`corporation_name = $${paramIndex}`);
    values.push(data.corporationName);
    paramIndex++;
  }
  
  if (data.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    values.push(data.isActive);
    paramIndex++;
  }
  
  if (updates.length === 0) {
    // 更新対象がない場合は現在のデータを返す
    return await findById(corporationId);
  }
  
  // update_user_id と update_at は常に更新
  updates.push(`update_user_id = $${paramIndex}`);
  values.push(userId);
  paramIndex++;
  updates.push(`update_at = NOW()`);
  
  const query = `
    UPDATE corporation
    SET ${updates.join(', ')}
    WHERE corporation_id = $1
    RETURNING 
      corporation_id,
      corporation_name,
      is_active,
      create_at,
      update_at
  `;
  
  const result = await pool.query<CorporationRow>(query, values);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

/**
 * Corporationのアクティブ状態を更新
 * 
 * @param corporationId Corporation ID (UUID)
 * @param isActive アクティブ状態
 * @param userId ログインユーザーID
 * @returns 更新されたCorporation（見つからない場合はnull）
 */
export async function updateStatus(
  corporationId: string,
  isActive: boolean,
  userId: string
): Promise<CorporationRow | null> {
  const pool: Pool = getPool();
  
  const query = `
    UPDATE corporation
    SET is_active = $1,
        update_user_id = $2,
        update_at = NOW()
    WHERE corporation_id = $3
    RETURNING 
      corporation_id,
      corporation_name,
      is_active,
      create_at,
      update_at
  `;
  
  const result = await pool.query<CorporationRow>(query, [isActive, userId, corporationId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

/**
 * Corporationを削除（物理削除）
 * ※通常はupdateStatusで論理削除を使用することを推奨
 * 
 * @param corporationId Corporation ID (UUID)
 * @returns 削除された場合true
 */
export async function deleteById(
  corporationId: string
): Promise<boolean> {
  const pool: Pool = getPool();
  
  const query = `
    DELETE FROM corporation
    WHERE corporation_id = $1
  `;
  
  const result = await pool.query(query, [corporationId]);
  
  return result.rowCount !== null && result.rowCount > 0;
}

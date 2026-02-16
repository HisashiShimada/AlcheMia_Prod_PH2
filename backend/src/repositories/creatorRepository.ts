/**
 * Creatorマスタリポジトリ
 * データベースアクセス層
 */

import { Pool } from 'pg';
import { getPool } from '../database/db';

/**
 * Creatorマスタのデータ型定義
 */
export interface CreatorMasterRow {
  creator_id: string;
  creator_uuid: string;
  creator_name: string;
  creator_description: string | null;
  creator_annotation: string | null;
  is_active: boolean;
  vendor_name: string | null;
  vendor_is_active: boolean | null;
  instrument_name: string | null;
  instrument_is_active: boolean | null;
  update_at: Date | null;
}

/**
 * Creatorマスタ検索フィルター
 */
export interface CreatorSearchFilters {
  displayScope?: 'all' | 'own';
  search?: string;
  isActive?: boolean;
}

/**
 * Creatorマスタ一覧を取得
 * 
 * @param organizationId 組織ID
 * @param filters 検索フィルター
 * @returns Creatorマスタの配列
 */
export async function findAll(
  organizationId: string,
  filters: CreatorSearchFilters = {}
): Promise<CreatorMasterRow[]> {
  const pool: Pool = getPool();
  
  console.log('=== creatorRepository.findAll called ===');
  console.log('organizationId:', organizationId);
  console.log('filters:', filters);
  
  let query = `
    SELECT 
      cm.creator_id,
      cm.creator_uuid,
      cm.creator_name,
      cm.creator_description,
      cm.creator_annotation,
      cm.is_active,
      vm.vendor_name,
      vm.is_active as vendor_is_active,
      im.instrument_name,
      im.is_active as instrument_is_active,
      cm.update_at
    FROM creator cm
    LEFT JOIN vendor vm ON cm.vendor_uuid = vm.vendor_uuid 
      AND cm.organization_id = vm.organization_id
    LEFT JOIN instrument im ON cm.instrument_uuid = im.instrument_uuid 
      AND cm.organization_id = im.organization_id
    WHERE cm.organization_id = $1
  `;
  
  const params: any[] = [organizationId];
  let paramIndex = 2;
  
  // 検索フィルター
  if (filters.search) {
    query += ` AND (
      cm.creator_id ILIKE $${paramIndex} OR
      cm.creator_name ILIKE $${paramIndex} OR
      cm.creator_description ILIKE $${paramIndex}
    )`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }
  
  // アクティブフィルター
  if (filters.isActive !== undefined) {
    query += ` AND cm.is_active = $${paramIndex}`;
    params.push(filters.isActive);
    paramIndex++;
  }
  
  // ソート
  query += ` ORDER BY cm.creator_id`;
  
  console.log('Executing query:', query);
  console.log('With params:', params);
  
  try {
    const result = await pool.query<CreatorMasterRow>(query, params);
    console.log('Query executed successfully, rows:', result.rows.length);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Creator IDで1件取得
 * 
 * @param organizationId 組織ID
 * @param creatorId Creator ID
 * @returns Creatorマスタ（見つからない場合はnull）
 */
export async function findById(
  organizationId: string,
  creatorId: string
): Promise<CreatorMasterRow | null> {
  const pool: Pool = getPool();
  
  const query = `
    SELECT 
      cm.creator_id,
      cm.creator_uuid,
      cm.creator_name,
      cm.creator_description,
      cm.creator_annotation,
      cm.is_active,
      vm.vendor_name,
      vm.is_active as vendor_is_active,
      im.instrument_name,
      im.is_active as instrument_is_active,
      cm.update_at
    FROM creator cm
    LEFT JOIN vendor vm ON cm.vendor_uuid = vm.vendor_uuid 
      AND cm.organization_id = vm.organization_id
    LEFT JOIN instrument im ON cm.instrument_uuid = im.instrument_uuid 
      AND cm.organization_id = im.organization_id
    WHERE cm.organization_id = $1 AND cm.creator_id = $2
  `;
  
  const result = await pool.query<CreatorMasterRow>(query, [organizationId, creatorId]);
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Creatorマスタの件数を取得
 * 
 * @param organizationId 組織ID
 * @returns 件数
 */
export async function count(organizationId: string): Promise<number> {
  const pool: Pool = getPool();
  
  const query = `
    SELECT COUNT(*) as count
    FROM creator
    WHERE organization_id = $1
  `;
  
  const result = await pool.query(query, [organizationId]);
  return parseInt(result.rows[0].count, 10);
}

/**
 * Creator IDが既に存在するかチェック
 * 
 * @param organizationId 組織ID
 * @param creatorId Creator ID
 * @returns 存在する場合true
 */
export async function existsById(
  organizationId: string,
  creatorId: string
): Promise<boolean> {
  const pool: Pool = getPool();
  
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM creator
      WHERE organization_id = $1
        AND creator_id = $2
    ) as exists
  `;
  
  const result = await pool.query(query, [organizationId, creatorId]);
  return result.rows[0].exists;
}

/**
 * Creatorマスタを新規作成
 * 
 * @param organizationId 組織ID
 * @param data Creator情報
 * @returns 作成されたCreatorマスタ
 */
export async function create(
  organizationId: string,
  data: {
    creatorId: string;
    creatorName: string;
    creatorDescription?: string;
    creatorAnnotation?: string;
    vendorName?: string;
    instrumentName?: string;
    isActive?: boolean;
  },
  userId: string
): Promise<CreatorMasterRow> {
  const pool: Pool = getPool();
  const { v4: uuidv4 } = require('uuid');
  
  // vendor_nameからvendor_uuidを取得（存在する場合）
  let vendorUuid: string | null = null;
  if (data.vendorName) {
    const vendorQuery = `
      SELECT vendor_uuid
      FROM vendor
      WHERE organization_id = $1 AND vendor_name = $2
      LIMIT 1
    `;
    const vendorResult = await pool.query(vendorQuery, [organizationId, data.vendorName]);
    vendorUuid = vendorResult.rows[0]?.vendor_uuid || null;
  }
  
  // instrument_nameからinstrument_uuidを取得（存在する場合）
  let instrumentUuid: string | null = null;
  if (data.instrumentName) {
    const instrumentQuery = `
      SELECT instrument_uuid
      FROM instrument
      WHERE organization_id = $1 AND instrument_name = $2
      LIMIT 1
    `;
    const instrumentResult = await pool.query(instrumentQuery, [organizationId, data.instrumentName]);
    instrumentUuid = instrumentResult.rows[0]?.instrument_uuid || null;
  }
  
  const query = `
    INSERT INTO creator (
      organization_id,
      creator_uuid,
      creator_id,
      creator_name,
      creator_description,
      creator_annotation,
      vendor_uuid,
      instrument_uuid,
      is_active,
      create_user_id,
      update_user_id,
      create_at,
      update_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
    )
    RETURNING 
      creator_id,
      creator_name,
      creator_description,
      creator_annotation,
      is_active,
      update_at
  `;
  
  const values = [
    organizationId,
    uuidv4(),
    data.creatorId,
    data.creatorName,
    data.creatorDescription || null,
    data.creatorAnnotation || null,
    vendorUuid,
    instrumentUuid,
    data.isActive !== undefined ? data.isActive : true,
    userId,
    userId,
  ];
  
  const result = await pool.query(query, values);
  
  // 返却データにvendor_nameとinstrument_nameを含める
  return {
    ...result.rows[0],
    vendor_name: data.vendorName || null,
    instrument_name: data.instrumentName || null,
  };
}

/**
 * Creatorマスタを更新
 * 
 * @param organizationId 組織ID
 * @param creatorId Creator ID
 * @param data 更新情報
 * @returns 更新されたCreatorマスタ（見つからない場合はnull）
 */
export async function update(
  organizationId: string,
  creatorId: string,
  data: {
    creatorName?: string;
    creatorDescription?: string;
    creatorAnnotation?: string;
    vendorName?: string;
    instrumentName?: string;
    isActive?: boolean;
  },
  userId: string
): Promise<CreatorMasterRow | null> {
  const pool: Pool = getPool();
  
  // vendor_nameからvendor_uuidを取得（存在する場合）
  let vendorUuid: string | null = null;
  if (data.vendorName !== undefined) {
    if (data.vendorName) {
      const vendorQuery = `
        SELECT vendor_uuid
        FROM vendor
        WHERE organization_id = $1 AND vendor_name = $2
        LIMIT 1
      `;
      const vendorResult = await pool.query(vendorQuery, [organizationId, data.vendorName]);
      vendorUuid = vendorResult.rows[0]?.vendor_uuid || null;
    }
  }
  
  // instrument_nameからinstrument_uuidを取得（存在する場合）
  let instrumentUuid: string | null = null;
  if (data.instrumentName !== undefined) {
    if (data.instrumentName) {
      const instrumentQuery = `
        SELECT instrument_uuid
        FROM instrument
        WHERE organization_id = $1 AND instrument_name = $2
        LIMIT 1
      `;
      const instrumentResult = await pool.query(instrumentQuery, [organizationId, data.instrumentName]);
      instrumentUuid = instrumentResult.rows[0]?.instrument_uuid || null;
    }
  }
  
  const updates: string[] = [];
  const values: any[] = [organizationId, creatorId];
  let paramIndex = 3;
  
  if (data.creatorName !== undefined) {
    updates.push(`creator_name = $${paramIndex}`);
    values.push(data.creatorName);
    paramIndex++;
  }
  
  if (data.creatorDescription !== undefined) {
    updates.push(`creator_description = $${paramIndex}`);
    values.push(data.creatorDescription || null);
    paramIndex++;
  }
  
  if (data.creatorAnnotation !== undefined) {
    updates.push(`creator_annotation = $${paramIndex}`);
    values.push(data.creatorAnnotation || null);
    paramIndex++;
  }
  
  if (data.vendorName !== undefined) {
    updates.push(`vendor_uuid = $${paramIndex}`);
    values.push(vendorUuid);
    paramIndex++;
  }
  
  if (data.instrumentName !== undefined) {
    updates.push(`instrument_uuid = $${paramIndex}`);
    values.push(instrumentUuid);
    paramIndex++;
  }
  
  if (data.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    values.push(data.isActive);
    paramIndex++;
  }
  
  if (updates.length === 0) {
    // 更新対象がない場合は現在のデータを返す
    return await findById(organizationId, creatorId);
  }
  
  updates.push(`update_user_id = $${paramIndex}`);
  values.push(userId);
  paramIndex++;
  updates.push(`update_at = NOW()`);
  
  const query = `
    UPDATE creator
    SET ${updates.join(', ')}
    WHERE organization_id = $1 AND creator_id = $2
    RETURNING 
      creator_id,
      creator_name,
      creator_description,
      creator_annotation,
      is_active,
      update_at
  `;
  
  const result = await pool.query(query, values);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  // 返却データにvendor_nameとinstrument_nameを含める
  return {
    ...result.rows[0],
    vendor_name: data.vendorName !== undefined ? (data.vendorName || null) : null,
    instrument_name: data.instrumentName !== undefined ? (data.instrumentName || null) : null,
  };
}

/**
 * Creatorマスタのアクティブ状態を更新
 * 
 * @param organizationId 組織ID
 * @param creatorId Creator ID
 * @param isActive アクティブ状態
 * @returns 更新されたCreatorマスタ（見つからない場合はnull）
 */
export async function updateStatus(
  organizationId: string,
  creatorId: string,
  isActive: boolean,
  userId: string
): Promise<CreatorMasterRow | null> {
  const pool: Pool = getPool();
  
  const query = `
    UPDATE creator
    SET is_active = $1,
        update_user_id = $2,
        update_at = NOW()
    WHERE organization_id = $3
      AND creator_id = $4
    RETURNING *
  `;
  
  const result = await pool.query(query, [isActive, userId, organizationId, creatorId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  // vendor_nameとinstrument_nameも取得して返す
  return await findById(organizationId, creatorId);
}

/**
 * フィルタ条件付きでCreatorマスタを取得（WHERE句でフィルタリング）
 * 
 * @param organizationId 組織ID
 * @param filters フィルタ条件
 * @returns Creatorマスタの配列
 */
export async function findAllWithFilters(
  organizationId: string,
  filters: {
    displayScope?: string;
    search?: string;
    isActive?: boolean;
  } = {}
): Promise<CreatorMasterRow[]> {
  const pool: Pool = getPool();
  
  console.log('=== creatorRepository.findAllWithFilters called ===');
  console.log('organizationId:', organizationId);
  console.log('filters:', filters);
  
  const whereClauses: string[] = ['cm.organization_id = $1'];
  const values: any[] = [organizationId];
  let paramIndex = 2;
  
  // 検索フィルタ（creator_id, creator_name, creator_description, creator_annotation, vendor_name, instrument_nameの6項目で部分一致検索）
  if (filters.search) {
    whereClauses.push(
      `(cm.creator_id ILIKE $${paramIndex} OR 
        cm.creator_name ILIKE $${paramIndex} OR 
        cm.creator_description ILIKE $${paramIndex} OR 
        cm.creator_annotation ILIKE $${paramIndex} OR 
        vm.vendor_name ILIKE $${paramIndex} OR 
        im.instrument_name ILIKE $${paramIndex})`
    );
    values.push(`%${filters.search}%`);
    paramIndex++;
  }
  
  // アクティブ状態フィルタ
  if (filters.isActive !== undefined) {
    whereClauses.push(`cm.is_active = $${paramIndex}`);
    values.push(filters.isActive);
    paramIndex++;
  }
  
  const query = `
    SELECT 
      cm.creator_id,
      cm.creator_uuid,
      cm.creator_name,
      cm.creator_description,
      cm.creator_annotation,
      cm.is_active,
      vm.vendor_name,
      vm.is_active as vendor_is_active,
      im.instrument_name,
      im.is_active as instrument_is_active,
      cm.update_at
    FROM creator cm
    LEFT JOIN vendor vm ON cm.vendor_uuid = vm.vendor_uuid 
      AND cm.organization_id = vm.organization_id
    LEFT JOIN instrument im ON cm.instrument_uuid = im.instrument_uuid 
      AND cm.organization_id = im.organization_id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY cm.creator_id
  `;
  
  console.log('Executing query:', query);
  console.log('With params:', values);
  
  try {
    const result = await pool.query<CreatorMasterRow>(query, values);
    console.log('Filtered count (from DB):', result.rows.length);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

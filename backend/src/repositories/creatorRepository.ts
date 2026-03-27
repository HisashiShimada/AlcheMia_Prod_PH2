/**
 * Creatorマスタリポジトリ
 * データベースアクセス層
 */

import { Pool } from 'pg';
import { getPool, getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import { v4 as uuidv4 } from 'uuid';

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
      AND (
        (cm.corporation_id IS NOT NULL AND cm.corporation_id = vm.corporation_id) OR
        (cm.corporation_id IS NULL AND cm.organization_id = vm.organization_id)
      )
    LEFT JOIN instrument im ON cm.instrument_uuid = im.instrument_uuid 
      AND (
        (cm.corporation_id IS NOT NULL AND cm.corporation_id = im.corporation_id) OR
        (cm.corporation_id IS NULL AND cm.organization_id = im.organization_id)
      )
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
 * @param corporationId 会社ID
 * @returns Creatorマスタ（見つからない場合はnull）
 */
export async function findById(
  organizationId: string,
  creatorId: string,
  corporationId?: string | null
): Promise<CreatorMasterRow | null> {
  const pool: Pool = getPool();
  
  // WHERE句の条件を構築
  let query: string;
  let values: any[];
  
  if (corporationId !== null && corporationId !== undefined) {
    // corporation_idが存在する場合：corporation_idで照合
    query = `
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
        AND (
          (cm.corporation_id IS NOT NULL AND cm.corporation_id = vm.corporation_id) OR
          (cm.corporation_id IS NULL AND cm.organization_id = vm.organization_id)
        )
      LEFT JOIN instrument im ON cm.instrument_uuid = im.instrument_uuid 
        AND (
          (cm.corporation_id IS NOT NULL AND cm.corporation_id = im.corporation_id) OR
          (cm.corporation_id IS NULL AND cm.organization_id = im.organization_id)
        )
      WHERE cm.corporation_id = $1 AND cm.creator_id = $2
    `;
    values = [corporationId, creatorId];
  } else {
    // corporation_idがNULLの場合：organization_idで照合
    query = `
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
        AND (
          (cm.corporation_id IS NOT NULL AND cm.corporation_id = vm.corporation_id) OR
          (cm.corporation_id IS NULL AND cm.organization_id = vm.organization_id)
        )
      LEFT JOIN instrument im ON cm.instrument_uuid = im.instrument_uuid 
        AND (
          (cm.corporation_id IS NOT NULL AND cm.corporation_id = im.corporation_id) OR
          (cm.corporation_id IS NULL AND cm.organization_id = im.organization_id)
        )
      WHERE cm.organization_id = $1 AND cm.creator_id = $2
    `;
    values = [organizationId, creatorId];
  }
  
  const result = await pool.query<CreatorMasterRow>(query, values);
  
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
 * corporationId が指定された場合は法人スコープ（同一法人内）で重複チェックを行う。
 * corporationId が null/undefined の場合は organization_id スコープでチェックする。
 * findById / update / findAllWithFilters と同じスコープ判定に統一。
 * 
 * @param organizationId 組織ID
 * @param creatorId Creator ID
 * @param corporationId 会社ID（任意）
 * @returns 存在する場合true
 */
export async function existsById(
  organizationId: string,
  creatorId: string,
  corporationId?: string | null
): Promise<boolean> {
  const pgp = getPgp();

  let query: string;
  let params: any[];

  if (corporationId !== null && corporationId !== undefined) {
    // 法人スコープ: 同一法人内で creator_id が一意であること
    query = await loadSqlFile('creators/existsByIdByCorporation.sql');
    params = [corporationId, creatorId];
  } else {
    // 組織スコープ: 同一組織内で creator_id が一意であること
    query = await loadSqlFile('creators/existsByIdByOrganization.sql');
    params = [organizationId, creatorId];
  }

  const result = await pgp.one<{ exists: boolean }>(query, params);
  return result.exists;
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
    vendorId?: string;
    vendorName?: string;
    instrumentId?: string;
    instrumentName?: string;
    isActive?: boolean;
  },
  userId: string,
  corporationId?: string | null
): Promise<CreatorMasterRow> {
  const pool: Pool = getPool();
  // vendor_idとvendor_nameからvendor_uuidを取得（存在する場合）
  let vendorUuid: string | null = null;
  if (data.vendorName) {
    let vendorQuery: string;
    let vendorParams: any[];

    if (corporationId !== null && corporationId !== undefined) {
      // corporation_idが存在する場合：corporation_id、vendor_id、vendor_nameで照合
      if (data.vendorId) {
        vendorQuery = `
          SELECT vendor_uuid
          FROM vendor
          WHERE corporation_id = $1 AND vendor_id = $2 AND vendor_name = $3
          LIMIT 1
        `;
        vendorParams = [corporationId, data.vendorId, data.vendorName];
      } else {
        vendorQuery = `
          SELECT vendor_uuid
          FROM vendor
          WHERE corporation_id = $1 AND vendor_name = $2
          LIMIT 1
        `;
        vendorParams = [corporationId, data.vendorName];
      }
    } else {
      // corporation_idがNULLの場合：organization_id、vendor_id、vendor_nameで照合
      if (data.vendorId) {
        vendorQuery = `
          SELECT vendor_uuid
          FROM vendor
          WHERE organization_id = $1 AND vendor_id = $2 AND vendor_name = $3
          LIMIT 1
        `;
        vendorParams = [organizationId, data.vendorId, data.vendorName];
      } else {
        vendorQuery = `
          SELECT vendor_uuid
          FROM vendor
          WHERE organization_id = $1 AND vendor_name = $2
          LIMIT 1
        `;
        vendorParams = [organizationId, data.vendorName];
      }
    }

    const vendorResult = await pool.query(vendorQuery, vendorParams);
    vendorUuid = vendorResult.rows[0]?.vendor_uuid || null;
  }
  
  // instrument_idとinstrument_nameからinstrument_uuidを取得（存在する場合）
  let instrumentUuid: string | null = null;
  if (data.instrumentName) {
    let instrumentQuery: string;
    let instrumentParams: any[];

    if (corporationId !== null && corporationId !== undefined) {
      // corporation_idが存在する場合：corporation_id、instrument_id、instrument_nameで照合
      if (data.instrumentId) {
        instrumentQuery = `
          SELECT instrument_uuid
          FROM instrument
          WHERE corporation_id = $1 AND instrument_id = $2 AND instrument_name = $3
          LIMIT 1
        `;
        instrumentParams = [corporationId, data.instrumentId, data.instrumentName];
      } else {
        instrumentQuery = `
          SELECT instrument_uuid
          FROM instrument
          WHERE corporation_id = $1 AND instrument_name = $2
          LIMIT 1
        `;
        instrumentParams = [corporationId, data.instrumentName];
      }
    } else {
      // corporation_idがNULLの場合：organization_id、instrument_id、instrument_nameで照合
      if (data.instrumentId) {
        instrumentQuery = `
          SELECT instrument_uuid
          FROM instrument
          WHERE organization_id = $1 AND instrument_id = $2 AND instrument_name = $3
          LIMIT 1
        `;
        instrumentParams = [organizationId, data.instrumentId, data.instrumentName];
      } else {
        instrumentQuery = `
          SELECT instrument_uuid
          FROM instrument
          WHERE organization_id = $1 AND instrument_name = $2
          LIMIT 1
        `;
        instrumentParams = [organizationId, data.instrumentName];
      }
    }

    const instrumentResult = await pool.query(instrumentQuery, instrumentParams);
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
      corporation_id,
      is_active,
      create_user_id,
      update_user_id,
      create_at,
      update_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
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
    corporationId,
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
 * @param userId ユーザーID
 * @param corporationId 会社ID
 * @returns 更新されたCreatorマスタ（見つからない場合はnull）
 */
export async function update(
  organizationId: string,
  creatorId: string,
  data: {
    creatorName?: string;
    creatorDescription?: string;
    creatorAnnotation?: string;
    vendorId?: string;
    vendorName?: string;
    instrumentId?: string;
    instrumentName?: string;
    isActive?: boolean;
  },
  userId: string,
  corporationId?: string | null
): Promise<CreatorMasterRow | null> {
  const pool: Pool = getPool();
  
  // vendor_idとvendor_nameからvendor_uuidを取得（存在する場合）
  let vendorUuid: string | null = null;
  if (data.vendorName !== undefined) {
    if (data.vendorName) {
      let vendorQuery: string;
      let vendorParams: any[];

      if (corporationId !== null && corporationId !== undefined) {
        // corporation_idが存在する場合：corporation_id、vendor_id、vendor_nameで照合
        if (data.vendorId) {
          vendorQuery = `
            SELECT vendor_uuid
            FROM vendor
            WHERE corporation_id = $1 AND vendor_id = $2 AND vendor_name = $3
            LIMIT 1
          `;
          vendorParams = [corporationId, data.vendorId, data.vendorName];
        } else {
          vendorQuery = `
            SELECT vendor_uuid
            FROM vendor
            WHERE corporation_id = $1 AND vendor_name = $2
            LIMIT 1
          `;
          vendorParams = [corporationId, data.vendorName];
        }
      } else {
        // corporation_idがNULLの場合：organization_id、vendor_id、vendor_nameで照合
        if (data.vendorId) {
          vendorQuery = `
            SELECT vendor_uuid
            FROM vendor
            WHERE organization_id = $1 AND vendor_id = $2 AND vendor_name = $3
            LIMIT 1
          `;
          vendorParams = [organizationId, data.vendorId, data.vendorName];
        } else {
          vendorQuery = `
            SELECT vendor_uuid
            FROM vendor
            WHERE organization_id = $1 AND vendor_name = $2
            LIMIT 1
          `;
          vendorParams = [organizationId, data.vendorName];
        }
      }

      const vendorResult = await pool.query(vendorQuery, vendorParams);
      vendorUuid = vendorResult.rows[0]?.vendor_uuid || null;
    }
  }
  
  // instrument_idとinstrument_nameからinstrument_uuidを取得（存在する場合）
  let instrumentUuid: string | null = null;
  if (data.instrumentName !== undefined) {
    if (data.instrumentName) {
      let instrumentQuery: string;
      let instrumentParams: any[];

      if (corporationId !== null && corporationId !== undefined) {
        // corporation_idが存在する場合：corporation_id、instrument_id、instrument_nameで照合
        if (data.instrumentId) {
          instrumentQuery = `
            SELECT instrument_uuid
            FROM instrument
            WHERE corporation_id = $1 AND instrument_id = $2 AND instrument_name = $3
            LIMIT 1
          `;
          instrumentParams = [corporationId, data.instrumentId, data.instrumentName];
        } else {
          instrumentQuery = `
            SELECT instrument_uuid
            FROM instrument
            WHERE corporation_id = $1 AND instrument_name = $2
            LIMIT 1
          `;
          instrumentParams = [corporationId, data.instrumentName];
        }
      } else {
        // corporation_idがNULLの場合：organization_id、instrument_id、instrument_nameで照合
        if (data.instrumentId) {
          instrumentQuery = `
            SELECT instrument_uuid
            FROM instrument
            WHERE organization_id = $1 AND instrument_id = $2 AND instrument_name = $3
            LIMIT 1
          `;
          instrumentParams = [organizationId, data.instrumentId, data.instrumentName];
        } else {
          instrumentQuery = `
            SELECT instrument_uuid
            FROM instrument
            WHERE organization_id = $1 AND instrument_name = $2
            LIMIT 1
          `;
          instrumentParams = [organizationId, data.instrumentName];
        }
      }

      const instrumentResult = await pool.query(instrumentQuery, instrumentParams);
      instrumentUuid = instrumentResult.rows[0]?.instrument_uuid || null;
    }
  }
  
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  // WHERE句の条件を構築
  let whereClause: string;
  let whereParam1: any;
  let whereParam2: any;
  
  if (corporationId !== null && corporationId !== undefined) {
    // corporation_idが存在する場合：corporation_idで照合
    whereClause = 'WHERE corporation_id = $1 AND creator_id = $2';
    whereParam1 = corporationId;
    whereParam2 = creatorId;
  } else {
    // corporation_idがNULLの場合：organization_idで照合
    whereClause = 'WHERE organization_id = $1 AND creator_id = $2';
    whereParam1 = organizationId;
    whereParam2 = creatorId;
  }
  
  values.push(whereParam1, whereParam2);
  paramIndex = 3;
  
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
    return await findById(organizationId, creatorId, corporationId);
  }
  
  updates.push(`update_user_id = $${paramIndex}`);
  values.push(userId);
  paramIndex++;
  updates.push(`update_at = NOW()`);
  
  const query = `
    UPDATE creator
    SET ${updates.join(', ')}
    ${whereClause}
    RETURNING creator_id
  `;
  
  const result = await pool.query(query, values);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  // 更新後に再取得して、vendor_name と instrument_name を含む完全なデータを返す
  return await findById(organizationId, creatorId, corporationId);
}

/**
 * Creatorマスタのアクティブ状態を更新
 * 
 * @param organizationId 組織ID
 * @param creatorId Creator ID
 * @param isActive アクティブ状態
 * @param userId ユーザーID
 * @param corporationId 会社ID
 * @returns 更新されたCreatorマスタ（見つからない場合はnull）
 */
export async function updateStatus(
  organizationId: string,
  creatorId: string,
  isActive: boolean,
  userId: string,
  corporationId?: string | null
): Promise<CreatorMasterRow | null> {
  const pool: Pool = getPool();
  
  // WHERE句の条件を構築
  let query: string;
  let values: any[];
  
  if (corporationId !== null && corporationId !== undefined) {
    // corporation_idが存在する場合：corporation_idで照合
    query = `
      UPDATE creator
      SET is_active = $1,
          update_user_id = $2,
          update_at = NOW()
      WHERE corporation_id = $3
        AND creator_id = $4
      RETURNING *
    `;
    values = [isActive, userId, corporationId, creatorId];
  } else {
    // corporation_idがNULLの場合：organization_idで照合
    query = `
      UPDATE creator
      SET is_active = $1,
          update_user_id = $2,
          update_at = NOW()
      WHERE organization_id = $3
        AND creator_id = $4
      RETURNING *
    `;
    values = [isActive, userId, organizationId, creatorId];
  }
  
  const result = await pool.query(query, values);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  // vendor_nameとinstrument_nameも取得して返す
  return await findById(organizationId, creatorId, corporationId);
}

/**
 * フィルタ条件付きでCreatorマスタを取得（WHERE句でフィルタリング）
 * 
 * @param organizationId 組織ID
 * @param corporationId 会社ID
 * @param filters フィルタ条件
 * @returns Creatorマスタの配列
 */
export async function findAllWithFilters(
  organizationId: string,
  corporationId: string | null,
  filters: {
    displayScope?: string;
    search?: string;
    isActive?: boolean;
  } = {}
): Promise<CreatorMasterRow[]> {
  const pool: Pool = getPool();
  
  console.log('=== creatorRepository.findAllWithFilters called ===');
  console.log('organizationId:', organizationId);
  console.log('corporationId:', corporationId);
  console.log('filters:', filters);
  
  const whereClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  // 表示切替フィルタ（display_scope）
  if (filters.displayScope === 'all' && corporationId) {
    // 全体選択: corporation_idが有効な場合はcorporation_idでフィルタ
    whereClauses.push(`cm.corporation_id = $${paramIndex}`);
    values.push(corporationId);
    paramIndex++;
  } else {
    // 自組織選択: organization_idのみでフィルタ
    whereClauses.push(`cm.organization_id = $${paramIndex}`);
    values.push(organizationId);
    paramIndex++;
  }
  
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
      AND (
        (cm.corporation_id IS NOT NULL AND cm.corporation_id = vm.corporation_id) OR
        (cm.corporation_id IS NULL AND cm.organization_id = vm.organization_id)
      )
    LEFT JOIN instrument im ON cm.instrument_uuid = im.instrument_uuid 
      AND (
        (cm.corporation_id IS NOT NULL AND cm.corporation_id = im.corporation_id) OR
        (cm.corporation_id IS NULL AND cm.organization_id = im.organization_id)
      )
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

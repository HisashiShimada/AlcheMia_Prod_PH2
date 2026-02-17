/**
 * Instrumentマスタリポジトリ
 * instrumentテーブルへのデータアクセスを担当
 */

import { getPool } from '../database/db';

/**
 * Instrument情報の型定義
 */
export interface InstrumentMaster {
  instrument_id: string;
  instrument_uuid: string;
  instrument_name: string;
  instrument_description: string | null;
  instrument_annotation: string | null;
  is_active: boolean;
  update_at: Date | null;
}

/**
 * 指定された組織のInstrumentマスタを全件取得
 * 
 * @param organizationId 組織ID
 * @returns Instrumentマスタの配列
 */
export const findAll = async (
  organizationId: string
): Promise<InstrumentMaster[]> => {
  const pool = getPool();
  
  const query = `
    SELECT 
      instrument_id,
      instrument_uuid,
      instrument_name,
      instrument_description,
      instrument_annotation,
      is_active,
      update_at
    FROM instrument
    WHERE organization_id = $1
    ORDER BY instrument_id
  `;
  
  const result = await pool.query(query, [organizationId]);
  return result.rows;
};

/**
 * IDでInstrumentマスタを取得
 * 
 * @param organizationId 組織ID
 * @param instrumentId Instrument ID
 * @returns Instrumentマスタ または null
 */
export const findById = async (
  organizationId: string,
  instrumentId: string
): Promise<InstrumentMaster | null> => {
  const pool = getPool();
  
  const query = `
    SELECT 
      instrument_id,
      instrument_uuid,
      instrument_name,
      instrument_description,
      instrument_annotation,
      is_active,
      update_at
    FROM instrument
    WHERE organization_id = $1
      AND instrument_id = $2
  `;
  
  const result = await pool.query(query, [organizationId, instrumentId]);
  return result.rows[0] || null;
};

/**
 * Instrumentマスタを新規作成
 * 
 * @param organizationId 組織ID
 * @param data Instrument情報
 * @returns 作成されたInstrumentマスタ
 */
export const create = async (
  organizationId: string,
  data: {
    instrumentId: string;
    instrumentName: string;
    instrumentDescription?: string;
    instrumentAnnotation?: string;
    isActive?: boolean;
  },
  userId: string,
  corporationId?: string | null
): Promise<InstrumentMaster> => {
  const pool = getPool();
  const { v4: uuidv4 } = require('uuid');
  
  const query = `
    INSERT INTO instrument (
      organization_id,
      instrument_uuid,
      instrument_id,
      instrument_name,
      instrument_description,
      instrument_annotation,
      corporation_id,
      is_active,
      create_user_id,
      update_user_id,
      create_at,
      update_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
    )
    RETURNING 
      instrument_id,
      instrument_name,
      instrument_description,
      instrument_annotation,
      is_active,
      update_at
  `;
  
  const values = [
    organizationId,
    uuidv4(),
    data.instrumentId,
    data.instrumentName,
    data.instrumentDescription || null,
    data.instrumentAnnotation || null,
    corporationId,
    data.isActive !== undefined ? data.isActive : true,
    userId,
    userId,
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Instrumentマスタを更新
 * 
 * @param organizationId 組織ID
 * @param instrumentId Instrument ID
 * @param data 更新データ
 * @param userId ユーザーID
 * @param corporationId 会社ID
 * @returns 更新されたInstrumentマスタ
 */
export const update = async (
  organizationId: string,
  instrumentId: string,
  data: {
    instrumentName?: string;
    instrumentDescription?: string;
    instrumentAnnotation?: string;
    isActive?: boolean;
  },
  userId: string,
  corporationId?: string | null
): Promise<InstrumentMaster | null> => {
  const pool = getPool();
  
  // WHERE句の条件を構築
  let query: string;
  let values: any[];
  
  if (corporationId !== null && corporationId !== undefined) {
    // corporation_idが存在する場合：corporation_idで照合
    query = `
      UPDATE instrument
      SET
        instrument_name = COALESCE($3, instrument_name),
        instrument_description = COALESCE($4, instrument_description),
        instrument_annotation = COALESCE($5, instrument_annotation),
        is_active = COALESCE($6, is_active),
        update_user_id = $7,
        update_at = NOW()
      WHERE corporation_id = $1
        AND instrument_id = $2
      RETURNING 
        instrument_id,
        instrument_name,
        instrument_description,
        instrument_annotation,
        is_active,
        update_at
    `;
    values = [
      corporationId,
      instrumentId,
      data.instrumentName,
      data.instrumentDescription,
      data.instrumentAnnotation,
      data.isActive,
      userId,
    ];
  } else {
    // corporation_idがNULLの場合：organization_idで照合
    query = `
      UPDATE instrument
      SET
        instrument_name = COALESCE($3, instrument_name),
        instrument_description = COALESCE($4, instrument_description),
        instrument_annotation = COALESCE($5, instrument_annotation),
        is_active = COALESCE($6, is_active),
        update_user_id = $7,
        update_at = NOW()
      WHERE organization_id = $1
        AND instrument_id = $2
      RETURNING 
        instrument_id,
        instrument_name,
        instrument_description,
        instrument_annotation,
        is_active,
        update_at
    `;
    values = [
      organizationId,
      instrumentId,
      data.instrumentName,
      data.instrumentDescription,
      data.instrumentAnnotation,
      data.isActive,
      userId,
    ];
  }
  
  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

/**
 * Instrumentマスタのアクティブ状態を更新
 * 
 * @param organizationId 組織ID
 * @param instrumentId Instrument ID
 * @param isActive アクティブ状態
 * @param userId ユーザーID
 * @param corporationId 会社ID
 * @returns 更新されたInstrumentマスタ
 */
export const updateStatus = async (
  organizationId: string,
  instrumentId: string,
  isActive: boolean,
  userId: string,
  corporationId?: string | null
): Promise<InstrumentMaster | null> => {
  const pool = getPool();
  
  // WHERE句の条件を構築
  let query: string;
  let values: any[];
  
  if (corporationId !== null && corporationId !== undefined) {
    // corporation_idが存在する場合：corporation_idで照合
    query = `
      UPDATE instrument
      SET
        is_active = $3,
        update_user_id = $4,
        update_at = NOW()
      WHERE corporation_id = $1
        AND instrument_id = $2
      RETURNING 
        instrument_id,
        instrument_name,
        instrument_description,
        instrument_annotation,
        is_active,
        update_at
    `;
    values = [corporationId, instrumentId, isActive, userId];
  } else {
    // corporation_idがNULLの場合：organization_idで照合
    query = `
      UPDATE instrument
      SET
        is_active = $3,
        update_user_id = $4,
        update_at = NOW()
      WHERE organization_id = $1
        AND instrument_id = $2
      RETURNING 
        instrument_id,
        instrument_name,
        instrument_description,
        instrument_annotation,
        is_active,
        update_at
    `;
    values = [organizationId, instrumentId, isActive, userId];
  }
  
  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

/**
 * Instrument IDが既に存在するかチェック
 * 
 * @param organizationId 組織ID
 * @param instrumentId Instrument ID
 * @returns 存在する場合true
 */
export const existsById = async (
  organizationId: string,
  instrumentId: string
): Promise<boolean> => {
  const pool = getPool();
  
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM instrument
      WHERE organization_id = $1
        AND instrument_id = $2
    ) as exists
  `;
  
  const result = await pool.query(query, [organizationId, instrumentId]);
  return result.rows[0].exists;
};

/**
 * フィルタ条件付きでInstrumentマスタを取得（WHERE句でフィルタリング）
 * 
 * @param organizationId 組織ID
 * @param corporationId 会社ID
 * @param filters フィルタ条件
 * @returns Instrumentマスタの配列
 */
export const findAllWithFilters = async (
  organizationId: string,
  corporationId: string | null,
  filters: {
    displayScope?: string;
    search?: string;
    isActive?: boolean;
  } = {}
): Promise<InstrumentMaster[]> => {
  const pool = getPool();
  
  const whereClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  // 表示切替フィルタ（display_scope）
  if (filters.displayScope === 'all') {
    // 全体選択: corporation_idのみでフィルタ（organization_idは照合しない）
    whereClauses.push(`corporation_id = $${paramIndex}`);
    values.push(corporationId);
    paramIndex++;
  } else {
    // 自組織選択: organization_idのみでフィルタ
    whereClauses.push(`organization_id = $${paramIndex}`);
    values.push(organizationId);
    paramIndex++;
  }
  
  // 検索フィルタ（instrument_id, instrument_name, instrument_description, instrument_annotationの4項目で部分一致検索）
  if (filters.search) {
    whereClauses.push(
      `(instrument_id ILIKE $${paramIndex} OR 
        instrument_name ILIKE $${paramIndex} OR 
        instrument_description ILIKE $${paramIndex} OR 
        instrument_annotation ILIKE $${paramIndex})`
    );
    values.push(`%${filters.search}%`);
    paramIndex++;
  }
  
  // アクティブ状態フィルタ
  if (filters.isActive !== undefined) {
    whereClauses.push(`is_active = $${paramIndex}`);
    values.push(filters.isActive);
    paramIndex++;
  }
  
  const query = `
    SELECT 
      instrument_id,
      instrument_uuid,
      instrument_name,
      instrument_description,
      instrument_annotation,
      is_active,
      update_at
    FROM instrument
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY instrument_id
  `;
  
  const result = await pool.query(query, values);
  return result.rows;
};

/**
 * Instrumentマスタリポジトリ
 * instrument_masterテーブルへのデータアクセスを担当
 */

import { getPool } from '../database/db';

/**
 * Instrument情報の型定義
 */
export interface InstrumentMaster {
  instrument_id: string;
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
      instrument_name,
      instrument_description,
      instrument_annotation,
      is_active,
      update_at
    FROM instrument_master
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
      instrument_name,
      instrument_description,
      instrument_annotation,
      is_active,
      update_at
    FROM instrument_master
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
  }
): Promise<InstrumentMaster> => {
  const pool = getPool();
  const { v4: uuidv4 } = require('uuid');
  
  const query = `
    INSERT INTO instrument_master (
      organization_id,
      instrument_uuid,
      instrument_id,
      instrument_name,
      instrument_description,
      instrument_annotation,
      is_active,
      create_at,
      update_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
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
    data.isActive !== undefined ? data.isActive : true,
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
  }
): Promise<InstrumentMaster | null> => {
  const pool = getPool();
  
  const query = `
    UPDATE instrument_master
    SET
      instrument_name = COALESCE($3, instrument_name),
      instrument_description = COALESCE($4, instrument_description),
      instrument_annotation = COALESCE($5, instrument_annotation),
      is_active = COALESCE($6, is_active),
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
  
  const values = [
    organizationId,
    instrumentId,
    data.instrumentName,
    data.instrumentDescription,
    data.instrumentAnnotation,
    data.isActive,
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

/**
 * Instrumentマスタのアクティブ状態を更新
 * 
 * @param organizationId 組織ID
 * @param instrumentId Instrument ID
 * @param isActive アクティブ状態
 * @returns 更新されたInstrumentマスタ
 */
export const updateStatus = async (
  organizationId: string,
  instrumentId: string,
  isActive: boolean
): Promise<InstrumentMaster | null> => {
  const pool = getPool();
  
  const query = `
    UPDATE instrument_master
    SET
      is_active = $3,
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
  
  const result = await pool.query(query, [organizationId, instrumentId, isActive]);
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
      FROM instrument_master
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
 * @param filters フィルタ条件
 * @returns Instrumentマスタの配列
 */
export const findAllWithFilters = async (
  organizationId: string,
  filters: {
    displayScope?: string;
    search?: string;
    isActive?: boolean;
  } = {}
): Promise<InstrumentMaster[]> => {
  const pool = getPool();
  
  const whereClauses: string[] = ['organization_id = $1'];
  const values: any[] = [organizationId];
  let paramIndex = 2;
  
  // 表示切替フィルタ（自組織のみ：IDの末尾2桁が偶数）
  if (filters.displayScope === 'own') {
    whereClauses.push(`(RIGHT(instrument_id, 2)::int % 2 = 0)`);
  }
  
  // 検索フィルタ（名称・説明での部分一致、大文字小文字を区別しない）
  if (filters.search) {
    whereClauses.push(`(instrument_name ILIKE $${paramIndex} OR instrument_description ILIKE $${paramIndex})`);
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
      instrument_name,
      instrument_description,
      instrument_annotation,
      is_active,
      update_at
    FROM instrument_master
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY instrument_id
  `;
  
  const result = await pool.query(query, values);
  return result.rows;
};

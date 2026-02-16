/**
 * Vendorマスタリポジトリ
 * vendor_masterテーブルへのデータアクセスを担当
 */

import { getPool } from '../database/db';

/**
 * Vendor情報の型定義
 */
export interface VendorMaster {
  vendor_id: string;
  vendor_name: string;
  vendor_description: string | null;
  vendor_annotation: string | null;
  is_active: boolean;
  update_at: Date | null;
}

/**
 * 指定された組織のVendorマスタを全件取得
 * 
 * @param organizationId 組織ID
 * @returns Vendorマスタの配列
 */
export const findAll = async (
  organizationId: string
): Promise<VendorMaster[]> => {
  const pool = getPool();
  
  const query = `
    SELECT 
      vendor_id,
      vendor_name,
      vendor_description,
      vendor_annotation,
      is_active,
      update_at
    FROM vendor
    WHERE organization_id = $1
    ORDER BY vendor_id
  `;
  
  const result = await pool.query(query, [organizationId]);
  return result.rows;
};

/**
 * IDでVendorマスタを取得
 * 
 * @param organizationId 組織ID
 * @param vendorId Vendor ID
 * @returns Vendorマスタ または null
 */
export const findById = async (
  organizationId: string,
  vendorId: string
): Promise<VendorMaster | null> => {
  const pool = getPool();
  
  const query = `
    SELECT 
      vendor_id,
      vendor_name,
      vendor_description,
      vendor_annotation,
      is_active,
      update_at
    FROM vendor
    WHERE organization_id = $1
      AND vendor_id = $2
  `;
  
  const result = await pool.query(query, [organizationId, vendorId]);
  return result.rows[0] || null;
};

/**
 * Vendorマスタを新規作成
 * 
 * @param organizationId 組織ID
 * @param data Vendor情報
 * @returns 作成されたVendorマスタ
 */
export const create = async (
  organizationId: string,
  data: {
    vendorId: string;
    vendorName: string;
    vendorDescription?: string;
    vendorAnnotation?: string;
    isActive?: boolean;
  },
  userId: string,
  corporationId?: string | null
): Promise<VendorMaster> => {
  const pool = getPool();
  const { v4: uuidv4 } = require('uuid');
  
  const query = `
    INSERT INTO vendor (
      organization_id,
      vendor_uuid,
      vendor_id,
      vendor_name,
      vendor_description,
      vendor_annotation,
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
      vendor_id,
      vendor_name,
      vendor_description,
      vendor_annotation,
      is_active,
      update_at
  `;
  
  const values = [
    organizationId,
    uuidv4(),
    data.vendorId,
    data.vendorName,
    data.vendorDescription || null,
    data.vendorAnnotation || null,
    corporationId,
    data.isActive !== undefined ? data.isActive : true,
    userId,
    userId,
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Vendorマスタを更新
 * 
 * @param organizationId 組織ID
 * @param vendorId Vendor ID
 * @param data 更新データ
 * @param userId ユーザーID
 * @param corporationId 会社ID
 * @returns 更新されたVendorマスタ
 */
export const update = async (
  organizationId: string,
  vendorId: string,
  data: {
    vendorName?: string;
    vendorDescription?: string;
    vendorAnnotation?: string;
    isActive?: boolean;
  },
  userId: string,
  corporationId?: string | null
): Promise<VendorMaster | null> => {
  const pool = getPool();
  
  // WHERE句の条件を構築
  let query: string;
  let values: any[];
  
  if (corporationId !== null && corporationId !== undefined) {
    // corporation_idが存在する場合：corporation_idで照合
    query = `
      UPDATE vendor
      SET
        vendor_name = COALESCE($3, vendor_name),
        vendor_description = COALESCE($4, vendor_description),
        vendor_annotation = COALESCE($5, vendor_annotation),
        is_active = COALESCE($6, is_active),
        update_user_id = $7,
        update_at = NOW()
      WHERE corporation_id = $1
        AND vendor_id = $2
      RETURNING 
        vendor_id,
        vendor_name,
        vendor_description,
        vendor_annotation,
        is_active,
        update_at
    `;
    values = [
      corporationId,
      vendorId,
      data.vendorName,
      data.vendorDescription,
      data.vendorAnnotation,
      data.isActive,
      userId,
    ];
  } else {
    // corporation_idがNULLの場合：organization_idで照合
    query = `
      UPDATE vendor
      SET
        vendor_name = COALESCE($3, vendor_name),
        vendor_description = COALESCE($4, vendor_description),
        vendor_annotation = COALESCE($5, vendor_annotation),
        is_active = COALESCE($6, is_active),
        update_user_id = $7,
        update_at = NOW()
      WHERE organization_id = $1
        AND vendor_id = $2
      RETURNING 
        vendor_id,
        vendor_name,
        vendor_description,
        vendor_annotation,
        is_active,
        update_at
    `;
    values = [
      organizationId,
      vendorId,
      data.vendorName,
      data.vendorDescription,
      data.vendorAnnotation,
      data.isActive,
      userId,
    ];
  }
  
  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

/**
 * Vendorマスタのアクティブ状態を更新
 * 
 * @param organizationId 組織ID
 * @param vendorId Vendor ID
 * @param isActive アクティブ状態
 * @param userId ユーザーID
 * @param corporationId 会社ID
 * @returns 更新されたVendorマスタ
 */
export const updateStatus = async (
  organizationId: string,
  vendorId: string,
  isActive: boolean,
  userId: string,
  corporationId?: string | null
): Promise<VendorMaster | null> => {
  const pool = getPool();
  
  // WHERE句の条件を構築
  let query: string;
  let values: any[];
  
  if (corporationId !== null && corporationId !== undefined) {
    // corporation_idが存在する場合：corporation_idで照合
    query = `
      UPDATE vendor
      SET
        is_active = $3,
        update_user_id = $4,
        update_at = NOW()
      WHERE corporation_id = $1
        AND vendor_id = $2
      RETURNING 
        vendor_id,
        vendor_name,
        vendor_description,
        vendor_annotation,
        is_active,
        update_at
    `;
    values = [corporationId, vendorId, isActive, userId];
  } else {
    // corporation_idがNULLの場合：organization_idで照合
    query = `
      UPDATE vendor
      SET
        is_active = $3,
        update_user_id = $4,
        update_at = NOW()
      WHERE organization_id = $1
        AND vendor_id = $2
      RETURNING 
        vendor_id,
        vendor_name,
        vendor_description,
        vendor_annotation,
        is_active,
        update_at
    `;
    values = [organizationId, vendorId, isActive, userId];
  }
  
  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

/**
 * Vendor IDが既に存在するかチェック
 * 
 * @param organizationId 組織ID
 * @param vendorId Vendor ID
 * @returns 存在する場合true
 */
export const existsById = async (
  organizationId: string,
  vendorId: string
): Promise<boolean> => {
  const pool = getPool();
  
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM vendor
      WHERE organization_id = $1
        AND vendor_id = $2
    ) as exists
  `;
  
  const result = await pool.query(query, [organizationId, vendorId]);
  return result.rows[0].exists;
};

/**
 * フィルタ条件付きでVendorマスタを取得（WHERE句でフィルタリング）
 * 
 * @param organizationId 組織ID
 * @param corporationId 会社ID
 * @param filters フィルタ条件
 * @returns Vendorマスタの配列
 */
export const findAllWithFilters = async (
  organizationId: string,
  corporationId: string | null,
  filters: {
    displayScope?: string;
    search?: string;
    isActive?: boolean;
  } = {}
): Promise<VendorMaster[]> => {
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
  
  // 検索フィルタ（ID・名称・説明・注釈での部分一致、大文字小文字を区別しない）
  if (filters.search) {
    whereClauses.push(
      `(vendor_id ILIKE $${paramIndex} OR 
        vendor_name ILIKE $${paramIndex} OR 
        vendor_description ILIKE $${paramIndex} OR 
        vendor_annotation ILIKE $${paramIndex})`
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
      vendor_id,
      vendor_name,
      vendor_description,
      vendor_annotation,
      is_active,
      update_at
    FROM vendor
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY vendor_id
  `;
  
  const result = await pool.query(query, values);
  return result.rows;
};

/**
 * Vendorマスタリポジトリ
 * vendor_masterテーブルへのデータアクセスを担当
 * pg-promise + SQLファイル外部管理パターンを使用
 */

import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import { v4 as uuidv4 } from 'uuid';

/**
 * Vendor情報の型定義
 */
export interface VendorMaster {
  vendor_id: string;
  vendor_uuid: string;
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
  const pgp = getPgp();

  const sqlQuery = await loadSqlFile('vendors/findAll.sql');
  return await pgp.any<VendorMaster>(sqlQuery, [organizationId]);
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
  const pgp = getPgp();

  const sqlQuery = await loadSqlFile('vendors/findById.sql');
  const result = await pgp.oneOrNone<VendorMaster>(sqlQuery, [organizationId, vendorId]);
  return result ?? null;
};

/**
 * Vendorマスタを新規作成
 *
 * @param organizationId 組織ID
 * @param data Vendor情報
 * @param userId ログインユーザーID
 * @param corporationId 会社ID（任意）
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
  const pgp = getPgp();

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
      vendor_uuid,
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
    corporationId ?? null,
    data.isActive !== undefined ? data.isActive : true,
    userId,
    userId,
  ];

  return await pgp.one<VendorMaster>(query, values);
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
  const pgp = getPgp();

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
        vendor_uuid,
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
        vendor_uuid,
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

  const result = await pgp.oneOrNone<VendorMaster>(query, values);
  return result ?? null;
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
  const pgp = getPgp();

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
        vendor_uuid,
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
        vendor_uuid,
        vendor_name,
        vendor_description,
        vendor_annotation,
        is_active,
        update_at
    `;
    values = [organizationId, vendorId, isActive, userId];
  }

  const result = await pgp.oneOrNone<VendorMaster>(query, values);
  return result ?? null;
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
  const pgp = getPgp();

  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM vendor
      WHERE organization_id = $1
        AND vendor_id = $2
    ) AS exists
  `;

  const result = await pgp.one<{ exists: boolean }>(query, [organizationId, vendorId]);
  return result.exists;
};

/**
 * フィルタ条件付きでVendorマスタを取得
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
  const pgp = getPgp();

  // ベースクエリを外部ファイルから読み込み
  let sqlQuery = await loadSqlFile('vendors/findAllWithFilters.sql');

  const values: any[] = [];
  let paramIndex = 1;

  // 表示切替フィルタ（display_scope）
  if (filters.displayScope === 'all') {
    // 全体選択: corporation_idのみでフィルタ（organization_idは照合しない）
    sqlQuery = sqlQuery.replace(
      'WHERE 1=1',
      `WHERE corporation_id = $${paramIndex}`
    );
    values.push(corporationId);
    paramIndex++;
  } else {
    // 自組織選択: organization_idのみでフィルタ
    sqlQuery = sqlQuery.replace(
      'WHERE 1=1',
      `WHERE organization_id = $${paramIndex}`
    );
    values.push(organizationId);
    paramIndex++;
  }

  // 検索フィルタ（ID・名称・説明・注釈での部分一致、大文字小文字を区別しない）
  if (filters.search) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND (
        vendor_id ILIKE $${paramIndex} OR
        vendor_name ILIKE $${paramIndex} OR
        vendor_description ILIKE $${paramIndex} OR
        vendor_annotation ILIKE $${paramIndex}
      )
ORDER BY`
    );
    values.push(`%${filters.search}%`);
    paramIndex++;
  }

  // アクティブ状態フィルタ
  if (filters.isActive !== undefined) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND is_active = $${paramIndex}
ORDER BY`
    );
    values.push(filters.isActive);
    paramIndex++;
  }

  return await pgp.any<VendorMaster>(sqlQuery, values);
};

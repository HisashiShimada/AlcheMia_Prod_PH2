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

  const query = await loadSqlFile('vendors/create.sql');
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
    query = await loadSqlFile('vendors/updateByCorporation.sql');
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
    query = await loadSqlFile('vendors/updateByOrganization.sql');
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
    query = await loadSqlFile('vendors/updateStatusByCorporation.sql');
    values = [corporationId, vendorId, isActive, userId];
  } else {
    // corporation_idがNULLの場合：organization_idで照合
    query = await loadSqlFile('vendors/updateStatusByOrganization.sql');
    values = [organizationId, vendorId, isActive, userId];
  }

  const result = await pgp.oneOrNone<VendorMaster>(query, values);
  return result ?? null;
};

/**
 * Vendor IDが既に存在するかチェック
 *
 * corporationId が指定された場合は法人スコープ（同一法人内）で重複チェックを行う。
 * corporationId が null/undefined の場合は organization_id スコープでチェックする。
 * update / updateStatus / findAllWithFilters と同じスコープ判定に統一。
 *
 * @param organizationId 組織ID
 * @param vendorId Vendor ID
 * @param corporationId 会社ID（任意）
 * @returns 存在する場合true
 */
export const existsById = async (
  organizationId: string,
  vendorId: string,
  corporationId?: string | null
): Promise<boolean> => {
  const pgp = getPgp();

  let query: string;
  let values: any[];

  if (corporationId !== null && corporationId !== undefined) {
    // 法人スコープ: 同一法人内で vendor_id が一意であること
    query = await loadSqlFile('vendors/existsByIdByCorporation.sql');
    values = [corporationId, vendorId];
  } else {
    // 組織スコープ: 同一組織内で vendor_id が一意であること
    query = await loadSqlFile('vendors/existsByIdByOrganization.sql');
    values = [organizationId, vendorId];
  }

  const result = await pgp.one<{ exists: boolean }>(query, values);
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
  if (filters.displayScope === 'all' && corporationId) {
    // 全体選択: corporation_idが有効な場合はcorporation_idでフィルタ
    sqlQuery = sqlQuery.replace(
      'WHERE 1=1',
      `WHERE corporation_id = $${paramIndex}`
    );
    values.push(corporationId);
    paramIndex++;
  } else {
    // 自組織選択、またはcorporationIdがnullの場合: organization_idでフィルタ
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

/**
 * Attributeマスタリポジトリ
 * attributeテーブルへのデータアクセスを担当
 * pg-promise + SQLファイル外部管理パターンを使用
 *
 * 主キー: (organization_id, attribute_name, attribute_value)
 * ※ attribute_id カラムは存在しない（DDL 2026-04-08 変更）
 */

import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';

/**
 * Attribute情報の型定義
 */
export interface AttributeMaster {
  attribute_name: string;
  attribute_value: string | null;
  attribute_remark: string | null;
  organization_group_cd: string | null;
  organization_group_name: string | null;
  is_active: boolean;
  update_at: Date | null;
}

/**
 * 指定された組織のAttributeマスタを全件取得
 *
 * @param organizationId 組織ID
 * @returns Attributeマスタの配列
 */
export const findAll = async (
  organizationId: string
): Promise<AttributeMaster[]> => {
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile('attributes/findAll.sql');
  return await pgp.any<AttributeMaster>(sqlQuery, [organizationId]);
};

/**
 * 主キーでAttributeマスタを取得
 *
 * @param organizationId 組織ID
 * @param attributeName 属性名
 * @param attributeValue 属性値
 * @returns Attributeマスタ または null
 */
export const findByPk = async (
  organizationId: string,
  attributeName: string,
  attributeValue: string
): Promise<AttributeMaster | null> => {
  const pgp = getPgp();
  const sqlQuery = await loadSqlFile('attributes/findById.sql');
  const result = await pgp.oneOrNone<AttributeMaster>(sqlQuery, [organizationId, attributeName, attributeValue]);
  return result ?? null;
};

/**
 * フィルタ条件付きでAttributeマスタを取得
 *
 * @param organizationId 組織ID
 * @param filters フィルタ条件
 * @returns Attributeマスタの配列
 */
export const findAllWithFilters = async (
  organizationId: string,
  filters: {
    search?: string;
    isActive?: boolean;
    organizationGroupCds?: string[];
  } = {}
): Promise<AttributeMaster[]> => {
  const pgp = getPgp();

  // ベースクエリを外部ファイルから読み込み
  let sqlQuery = await loadSqlFile('attributes/findAllWithFilters.sql');

  const values: any[] = [];
  let paramIndex = 1;

  // organization_id フィルタ
  sqlQuery = sqlQuery.replace(
    'WHERE 1=1',
    `WHERE a.organization_id = $${paramIndex}`
  );
  values.push(organizationId);
  paramIndex++;

  // 検索フィルタ（属性名・属性値・備考での部分一致、大文字小文字を区別しない）
  if (filters.search) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND (
        a.attribute_name ILIKE $${paramIndex} OR
        a.attribute_value ILIKE $${paramIndex} OR
        a.attribute_remark ILIKE $${paramIndex}
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
      `AND a.is_active = $${paramIndex}
ORDER BY`
    );
    values.push(filters.isActive);
    paramIndex++;
  }

  // 組織グループコードフィルタ（ログインユーザーの組織グループのいずれか OR 組織グループ指定なし）
  // apply_organization_group_filter=true 時のみ適用（マスタ管理画面では使用しない）
  // 複数グループ所属ユーザー対応: ANY($n) で配列比較
  if (filters.organizationGroupCds && filters.organizationGroupCds.length > 0) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND (a.organization_group_cd = ANY($${paramIndex}) OR a.organization_group_cd IS NULL OR a.organization_group_cd = '')
ORDER BY`
    );
    values.push(filters.organizationGroupCds);
    paramIndex++;
  }

  return await pgp.any<AttributeMaster>(sqlQuery, values);
};

/**
 * Attributeマスタを新規作成
 *
 * @param organizationId 組織ID
 * @param data Attribute情報
 * @param userId ログインユーザーID
 * @returns 作成されたAttributeマスタ
 */
export const create = async (
  organizationId: string,
  data: {
    attributeName: string;
    attributeValue?: string;
    attributeRemark?: string;
    organizationGroupCd?: string;
    isActive?: boolean;
  },
  userId: string
): Promise<AttributeMaster> => {
  const pgp = getPgp();
  const query = await loadSqlFile('attributes/create.sql');
  const values = [
    organizationId,
    data.attributeName,
    data.attributeValue || null,
    data.attributeRemark || null,
    data.organizationGroupCd || null,
    data.isActive !== undefined ? data.isActive : true,
    userId,
  ];
  return await pgp.one<AttributeMaster>(query, values);
};

/**
 * Attributeマスタを更新
 *
 * @param organizationId 組織ID
 * @param attributeName 属性名（主キー）
 * @param attributeValue 属性値（主キー）
 * @param data 更新データ
 * @param userId ユーザーID
 * @returns 更新されたAttributeマスタ または null
 */
export const update = async (
  organizationId: string,
  attributeName: string,
  attributeValue: string,
  data: {
    attributeRemark?: string;
    organizationGroupCd?: string;
    isActive?: boolean;
  },
  userId: string
): Promise<AttributeMaster | null> => {
  const pgp = getPgp();
  const query = await loadSqlFile('attributes/update.sql');
  const values = [
    organizationId,
    attributeName,
    attributeValue,
    data.attributeRemark ?? null,
    data.organizationGroupCd ?? null,
    data.isActive,
    userId,
  ];
  const result = await pgp.oneOrNone<AttributeMaster>(query, values);
  return result ?? null;
};

/**
 * Attributeマスタのアクティブ状態を更新
 *
 * @param organizationId 組織ID
 * @param attributeName 属性名（主キー）
 * @param attributeValue 属性値（主キー）
 * @param isActive アクティブ状態
 * @param userId ユーザーID
 * @returns 更新されたAttributeマスタ または null
 */
export const updateStatus = async (
  organizationId: string,
  attributeName: string,
  attributeValue: string,
  isActive: boolean,
  userId: string
): Promise<AttributeMaster | null> => {
  const pgp = getPgp();
  const query = await loadSqlFile('attributes/updateStatus.sql');
  const values = [organizationId, attributeName, attributeValue, isActive, userId];
  const result = await pgp.oneOrNone<AttributeMaster>(query, values);
  return result ?? null;
};

/**
 * 主キー（attribute_name + attribute_value）が既に存在するかチェック
 *
 * @param organizationId 組織ID
 * @param attributeName 属性名
 * @param attributeValue 属性値
 * @returns 存在する場合true
 */
export const existsByPk = async (
  organizationId: string,
  attributeName: string,
  attributeValue: string
): Promise<boolean> => {
  const pgp = getPgp();
  const query = await loadSqlFile('attributes/existsByPk.sql');
  const result = await pgp.one<{ exists: boolean }>(query, [organizationId, attributeName, attributeValue]);
  return result.exists;
};

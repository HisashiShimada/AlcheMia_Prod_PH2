/**
 * organizationGroup Repository
 *
 * 組織階層グループ管理のデータアクセスを提供
 *
 * @module organizationGroupRepository
 * @version 1.0.0
 */

import { getPool } from '../database/db';
import { loadSqlFile } from '../sql/loader';

/**
 * organization_group テーブルの型定義
 *
 * @remarks
 * DDL: docs/design/db/ddl/organization_group.sql
 * 主キー: (organization_id, organization_group_cd)
 */
export interface OrganizationGroupRow {
  organization_id: string;
  organization_group_cd: string;
  organization_group_name: string;
  chief_user_id: string;
  parent_group_cd: string | null;
  layer: string | null;
  create_user_id: string | null;
  create_at: Date | null;
  update_user_id: string | null;
  update_at: Date | null;
}

/**
 * 一覧取得フィルタ
 */
export interface OrganizationGroupFilters {
  search?: string;
}

/**
 * organization_group 一覧取得
 *
 * @param organizationId - 組織ID
 * @param filters - 検索フィルタ
 * @returns 組織グループ一覧
 */
export async function findAll(
  organizationId: string,
  filters?: OrganizationGroupFilters
): Promise<OrganizationGroupRow[]> {
  const pool = getPool();

  let sql = await loadSqlFile('organization_groups/findAll.sql');
  const params: unknown[] = [organizationId];

  // 動的検索フィルタを付加
  if (filters?.search) {
    const paramIndex = params.length + 1;
    sql = sql.replace(
      'ORDER BY',
      `AND (organization_group_cd ILIKE $${paramIndex} OR organization_group_name ILIKE $${paramIndex})
ORDER BY`
    );
    params.push(`%${filters.search}%`);
  }

  const result = await pool.query<OrganizationGroupRow>(sql, params);
  return result.rows;
}

/**
 * organization_group 単件取得
 *
 * @param organizationId - 組織ID
 * @param groupCd - 組織グループCD
 * @returns 組織グループ（存在しない場合は null）
 */
export async function findById(
  organizationId: string,
  groupCd: string
): Promise<OrganizationGroupRow | null> {
  const pool = getPool();
  const sql = await loadSqlFile('organization_groups/findById.sql');
  const result = await pool.query<OrganizationGroupRow>(sql, [organizationId, groupCd]);
  return result.rows[0] ?? null;
}

/**
 * organization_group 存在確認
 *
 * @param organizationId - 組織ID
 * @param groupCd - 組織グループCD
 * @returns 存在する場合 true
 */
export async function existsById(
  organizationId: string,
  groupCd: string
): Promise<boolean> {
  const pool = getPool();
  const sql = await loadSqlFile('organization_groups/existsById.sql');
  const result = await pool.query<{ exists: boolean }>(sql, [organizationId, groupCd]);
  return result.rows[0]?.exists ?? false;
}

/**
 * organization_group 新規作成
 *
 * @param data - 登録するグループデータ
 * @returns 登録された組織グループ
 */
export async function create(data: {
  organization_id: string;
  organization_group_cd: string;
  organization_group_name: string;
  chief_user_id: string;
  parent_group_cd?: string | null;
  layer?: string | null;
  create_user_id?: string | null;
}): Promise<OrganizationGroupRow> {
  const pool = getPool();
  const sql = await loadSqlFile('organization_groups/create.sql');
  const result = await pool.query<OrganizationGroupRow>(sql, [
    data.organization_id,
    data.organization_group_cd,
    data.organization_group_name,
    data.chief_user_id,
    data.parent_group_cd ?? null,
    data.layer ?? null,
    data.create_user_id ?? null,
  ]);
  return result.rows[0];
}

/**
 * organization_group 更新
 *
 * @param data - 更新するグループデータ（organization_id・organization_group_cd はWHERE条件）
 * @returns 更新された組織グループ（存在しない場合は null）
 */
export async function update(data: {
  organization_id: string;
  organization_group_cd: string;
  organization_group_name: string;
  chief_user_id: string;
  parent_group_cd?: string | null;
  layer?: string | null;
  update_user_id?: string | null;
}): Promise<OrganizationGroupRow | null> {
  const pool = getPool();
  const sql = await loadSqlFile('organization_groups/update.sql');
  const result = await pool.query<OrganizationGroupRow>(sql, [
    data.organization_group_name,
    data.chief_user_id,
    data.parent_group_cd ?? null,
    data.layer ?? null,
    data.update_user_id ?? null,
    data.organization_id,
    data.organization_group_cd,
  ]);
  return result.rows[0] ?? null;
}

/**
 * organization_group ユーザー所属グループ取得
 *
 * ログインユーザーが所属するグループと、その全祖先グループを返す（ツリー表示用）。
 * 未所属の場合は空配列を返す。
 *
 * @param organizationId - 組織ID
 * @param userId - ユーザーID
 * @returns 所属グループ＋祖先グループ一覧
 */
export async function findByUser(
  organizationId: string,
  userId: string
): Promise<OrganizationGroupRow[]> {
  const pool = getPool();
  const sql = await loadSqlFile('organization_groups/findByUser.sql');
  const result = await pool.query<OrganizationGroupRow>(sql, [organizationId, userId]);
  return result.rows;
}

/**
 * organization_group 子孫CD一覧取得（再帰）
 *
 * 指定されたルートグループCD群とその全配下グループのCDを返す。
 * WITH RECURSIVE を使用して組織階層ツリーを再帰的に辿る。
 *
 * @param organizationId - 組織ID
 * @param rootCds - ルートグループCDの配列（空の場合は空配列を返す）
 * @returns ルート群とその全配下のグループCDの配列（重複なし）
 */
export async function findDescendantCds(
  organizationId: string,
  rootCds: string[]
): Promise<string[]> {
  // ルートCDが空の場合は0件を返す（グループ未所属ユーザー対策）
  if (rootCds.length === 0) {
    return [];
  }
  const pool = getPool();
  const sql = await loadSqlFile('organization_groups/findDescendantCds.sql');
  const result = await pool.query<{ organization_group_cd: string }>(sql, [organizationId, rootCds]);
  return result.rows.map((row) => row.organization_group_cd);
}

/**
 * organization_group 削除
 *
 * @param organizationId - 組織ID
 * @param groupCd - 組織グループCD
 * @returns 削除された行数
 */
export async function deleteById(
  organizationId: string,
  groupCd: string
): Promise<number> {
  const pool = getPool();
  const sql = await loadSqlFile('organization_groups/deleteById.sql');
  const result = await pool.query(sql, [organizationId, groupCd]);
  return result.rowCount ?? 0;
}

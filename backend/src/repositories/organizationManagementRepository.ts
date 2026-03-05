/**
 * Organization（組織）リポジトリ
 * データアクセス層
 * pg-promise + SQLファイル外部管理パターンを使用
 */

import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';

/**
 * Organizationのデータ型定義（DB型）
 */
export interface OrganizationRow {
  organization_id: string; // UUID
  organization_cd: string;
  organization_display_name: string;
  organization_email: string;
  chief_user_id: string | null; // VARCHAR(50)
  chief_user_name: string | null; // JOIN結果
  corporation_id: string | null; // UUID
  corporation_name: string | null; // JOIN結果
  is_entry: number; // 二段階認証判定（0: なし, 1: あり）
  use_deemed_progress: boolean; // みなし進捗使用フラグ
  is_active: boolean;
  contract_capacity: number | null; // 契約容量
  contracted_users: number | null;  // 契約ユーザー数
  contracted_projects: number | null; // 契約プロジェクト数
  update_at: Date;
}

/**
 * Organization検索フィルター
 */
export interface OrganizationSearchFilters {
  search?: string;
  isActive?: boolean;
  organizationCd?: string;
  organizationDisplayName?: string;
  corporationName?: string;
  sortBy?: 'organization_cd' | 'organization_display_name' | 'update_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Organization一覧を取得
 *
 * @param filters 検索フィルター
 * @returns Organizationの配列
 */
export async function findAll(
  filters: OrganizationSearchFilters = {}
): Promise<OrganizationRow[]> {
  const pgp = getPgp();

  // 外部SQLファイルを読み込み（ベースクエリ）
  let sqlQuery = await loadSqlFile('organizations/findAll.sql');

  const params: any[] = [];
  let paramIndex = 1;

  // 検索フィルター（動的条件をWHERE 1=1の後に追加）
  if (filters.search) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND (
        o.organization_cd ILIKE $${paramIndex} OR
        o.organization_email ILIKE $${paramIndex}
      )
ORDER BY`
    );
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  // 組織CDフィルター
  if (filters.organizationCd) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND o.organization_cd = $${paramIndex}
ORDER BY`
    );
    params.push(filters.organizationCd);
    paramIndex++;
  }

  // 組織表示名フィルター
  if (filters.organizationDisplayName) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND o.organization_display_name = $${paramIndex}
ORDER BY`
    );
    params.push(filters.organizationDisplayName);
    paramIndex++;
  }

  // 会社名フィルター
  if (filters.corporationName) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND c.corporation_name = $${paramIndex}
ORDER BY`
    );
    params.push(filters.corporationName);
    paramIndex++;
  }

  // アクティブフィルター
  if (filters.isActive !== undefined) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND o.is_active = $${paramIndex}
ORDER BY`
    );
    params.push(filters.isActive);
    paramIndex++;
  }

  // ソート順を置換
  const sortBy = filters.sortBy || 'organization_cd';
  const sortOrder = (filters.sortOrder || 'asc').toUpperCase();
  sqlQuery = sqlQuery.replace(
    'ORDER BY o.organization_cd ASC',
    `ORDER BY o.${sortBy} ${sortOrder}`
  );

  return await pgp.any<OrganizationRow>(sqlQuery, params);
}

/**
 * Organization IDで1件取得
 *
 * @param organizationId 組織ID
 * @returns Organization（見つからない場合はnull）
 */
export async function findById(
  organizationId: string
): Promise<OrganizationRow | null> {
  const pgp = getPgp();

  const sqlQuery = await loadSqlFile('organizations/findById.sql');
  const result = await pgp.oneOrNone<OrganizationRow>(sqlQuery, [organizationId]);
  return result ?? null;
}

/**
 * 情報ダウンロード用の組織統計データ型定義
 */
export interface OrganizationStatsRow {
  organization_id: string;
  organization_cd: string;
  organization_display_name: string;
  organization_email: string;
  chief_user_name: string | null;
  corporation_name: string | null;
  contracted_users: number | null;
  contracted_projects: number | null;
  contract_capacity: number | null;
  project_count: number;
  active_user_count: number;
  total_user_count: number;
}

/**
 * 情報ダウンロード用：全組織の統計情報を取得
 * プロジェクト数・アクティブユーザー数・総ユーザー数を集計して返す
 *
 * @returns 組織統計情報の配列
 */
export async function findAllWithStats(): Promise<OrganizationStatsRow[]> {
  const pgp = getPgp();

  const sqlQuery = await loadSqlFile('organizations/findAllWithStats.sql');
  return await pgp.any<OrganizationStatsRow>(sqlQuery);
}

/**
 * OrganizationIDが既に存在するかチェック
 *
 * @param organizationId 組織ID
 * @returns 存在する場合true
 */
export async function existsById(
  organizationId: string
): Promise<boolean> {
  const pgp = getPgp();

  const query = await loadSqlFile('organizations/existsById.sql');
  const result = await pgp.one<{ exists: boolean }>(query, [organizationId]);
  return result.exists;
}

/**
 * Organization CDが既に存在するかチェック
 *
 * @param organizationCd 組織CD
 * @param excludeId チェック時に除外するID（更新時に使用）
 * @returns 存在する場合true
 */
export async function existsByCd(
  organizationCd: string,
  excludeId?: string
): Promise<boolean> {
  const pgp = getPgp();

  let query: string;
  let params: any[];

  if (excludeId !== undefined) {
    query = await loadSqlFile('organizations/existsByCdExclude.sql');
    params = [organizationCd, excludeId];
  } else {
    query = await loadSqlFile('organizations/existsByCd.sql');
    params = [organizationCd];
  }

  const result = await pgp.one<{ exists: boolean }>(query, params);
  return result.exists;
}

/**
 * Organizationを新規作成
 *
 * @param data Organization情報
 * @param userId ログインユーザーID
 * @returns 作成されたOrganization
 */
export async function create(
  data: {
    organizationId: string;
    organizationCd: string;
    organizationDisplayName: string;
    organizationEmail: string;
    chiefUserId?: string;
    corporationId?: string;
    isEntry?: number;
    useDeemedProgress?: boolean;
    isActive?: boolean;
    contractCapacity?: number | null;
    contractedUsers?: number | null;
  },
  userId: string
): Promise<OrganizationRow> {
  const pgp = getPgp();

  const query = await loadSqlFile('organizations/create.sql');

  const values = [
    data.organizationId,
    data.organizationCd,
    data.organizationDisplayName,
    data.organizationEmail,
    data.chiefUserId || null,
    data.corporationId || null,
    data.isEntry !== undefined ? data.isEntry : 0,
    data.useDeemedProgress !== undefined ? data.useDeemedProgress : true,
    data.isActive !== undefined ? data.isActive : true,
    data.contractCapacity ?? null,
    data.contractedUsers ?? null,
    userId,
    userId,
  ];

  return await pgp.one<OrganizationRow>(query, values);
}

/**
 * Organizationを更新
 *
 * @param organizationId 組織ID
 * @param data 更新情報
 * @param userId ログインユーザーID
 * @returns 更新されたOrganization（見つからない場合はnull）
 */
export async function update(
  organizationId: string,
  data: {
    organizationDisplayName?: string;
    organizationPrefix?: string;
    organizationEmail?: string;
    chiefUserId?: string;
    corporationId?: string;
    isEntry?: number;
    useDeemedProgress?: boolean;
    isActive?: boolean;
    contractCapacity?: number | null;
    contractedUsers?: number | null;
    contractedProjects?: number | null;
  },
  userId: string
): Promise<OrganizationRow | null> {
  const pgp = getPgp();

  const query = await loadSqlFile('organizations/update.sql');
  const values = [
    organizationId,
    data.organizationDisplayName ?? null,
    data.organizationEmail ?? null,
    data.chiefUserId ?? null,
    data.corporationId ?? null,
    data.isEntry ?? null,
    data.useDeemedProgress ?? null,
    data.isActive ?? null,
    userId,
    data.contractCapacity ?? null,
    data.contractedUsers ?? null,
    data.contractedProjects ?? null,
  ];

  const updated = await pgp.oneOrNone<{ organization_id: string }>(query, values);

  if (!updated) {
    return null;
  }

  // JOINでchief_user_nameとcorporation_nameを取得
  return await findById(organizationId);
}

/**
 * Organizationのアクティブ状態を更新
 *
 * @param organizationId 組織ID
 * @param isActive アクティブ状態
 * @param userId ログインユーザーID
 * @returns 更新されたOrganization（見つからない場合はnull）
 */
export async function updateStatus(
  organizationId: string,
  isActive: boolean,
  userId: string
): Promise<OrganizationRow | null> {
  const pgp = getPgp();

  const query = await loadSqlFile('organizations/updateStatus.sql');

  const updated = await pgp.oneOrNone<{ organization_id: string }>(
    query,
    [isActive, userId, organizationId]
  );

  if (!updated) {
    return null;
  }

  // JOINでchief_user_nameとcorporation_nameを取得
  return await findById(organizationId);
}

/**
 * Organizationを削除（物理削除）
 * ※通常はupdateStatusで論理削除を使用することを推奨
 *
 * @param organizationId 組織ID
 * @returns 削除された場合true
 */
export async function deleteById(
  organizationId: string
): Promise<boolean> {
  const pgp = getPgp();

  const query = await loadSqlFile('organizations/deleteById.sql');

  const result = await pgp.result(query, [organizationId]);
  return result.rowCount > 0;
}

/**
 * 組織のシステム管理者一覧を取得
 *
 * @param organizationId 組織ID
 * @returns システム管理者の配列
 */
export async function findSystemAdminsByOrganizationId(
  organizationId: string
): Promise<Array<{ user_id: string; user_name: string }>> {
  const pgp = getPgp();

  const sqlQuery = await loadSqlFile('organizations/findSystemAdmins.sql');
  return await pgp.any<{ user_id: string; user_name: string }>(sqlQuery, [organizationId]);
}

/**
 * 組織利用者を作成（organization_user）
 *
 * @param data 組織利用者情報
 * @param userId ログインユーザーID
 * @param t pg-promiseトランザクションオブジェクト
 */
export async function createOrganizationUser(
  data: {
    userId: string;
    organizationId: string;
    userName: string;
    roleCd: string;
    mailAddress: string;
    departmentCd?: string | null;
    isActive: boolean;
  },
  userId: string,
  t: any
): Promise<void> {
  const query = await loadSqlFile('organizations/createOrganizationUser.sql');

  const values = [
    data.userId,
    data.organizationId,
    data.userName,
    data.roleCd,
    data.mailAddress,
    data.departmentCd || null,
    data.isActive,
    userId,
    userId,
  ];

  await t.none(query, values);
}

/**
 * ロールを作成（role）
 *
 * @param data ロール情報
 * @param userId ログインユーザーID
 * @param t pg-promiseトランザクションオブジェクト
 */
export async function createRole(
  data: {
    organizationId: string;
    roleCd: string;
    roleName: string;
    initialScreenFunctionCd: string;
    isActive: boolean;
  },
  userId: string,
  t: any
): Promise<void> {
  const query = await loadSqlFile('organizations/createRole.sql');

  const values = [
    data.organizationId,
    data.roleCd,
    data.roleName,
    data.initialScreenFunctionCd,
    data.isActive,
    userId,
    userId,
  ];

  await t.none(query, values);
}

/**
 * ロール権限を一括作成（role_permission）
 *
 * @param data ロール権限情報の配列
 * @param userId ログインユーザーID
 * @param t pg-promiseトランザクションオブジェクト
 */
export async function createRolePermissions(
  data: Array<{
    organizationId: string;
    roleCd: string;
    functionCd: string;
    permission: number;
  }>,
  userId: string,
  t: any
): Promise<void> {
  const query = await loadSqlFile('organizations/createRolePermission.sql');

  for (const permission of data) {
    const values = [
      permission.organizationId,
      permission.roleCd,
      permission.functionCd,
      permission.permission,
      userId,
      userId,
    ];

    await t.none(query, values);
  }
}

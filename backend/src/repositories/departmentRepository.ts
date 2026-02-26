/**
 * Department（部署）リポジトリ
 * データベースアクセス層
 * pg-promise + SQLファイル外部管理パターンを使用
 */

import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';

/**
 * Departmentのデータ型定義
 */
export interface DepartmentRow {
  organization_id: string; // UUID
  department_cd: string;
  department_name: string;
  is_active: boolean;
  create_at: Date;
  update_at: Date;
}

/**
 * Department検索フィルター
 */
export interface DepartmentSearchFilters {
  search?: string;
  isActive?: boolean;
  sortBy?: 'department_cd' | 'department_name' | 'update_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Department一覧を取得
 *
 * @param organizationId 組織ID
 * @param filters 検索フィルター
 * @returns Departmentの配列
 */
export async function findAll(
  organizationId: string,
  filters: DepartmentSearchFilters = {}
): Promise<DepartmentRow[]> {
  const pgp = getPgp();

  // 外部SQLファイルを読み込み
  let sqlQuery = await loadSqlFile('departments/findAll.sql');

  const params: any[] = [organizationId];
  let paramIndex = 2;

  // 動的フィルター追加（WHERE句に条件を追加）
  if (filters.search) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND (
        department_cd ILIKE $${paramIndex} OR
        department_name ILIKE $${paramIndex}
      )
ORDER BY`
    );
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  if (filters.isActive !== undefined) {
    sqlQuery = sqlQuery.replace(
      'ORDER BY',
      `AND is_active = $${paramIndex}
ORDER BY`
    );
    params.push(filters.isActive);
    paramIndex++;
  }

  // ソート順を置換
  if (filters.sortBy || filters.sortOrder) {
    const sortBy = filters.sortBy || 'department_cd';
    const sortOrder = (filters.sortOrder || 'asc').toUpperCase();
    sqlQuery = sqlQuery.replace(
      'ORDER BY department_cd ASC',
      `ORDER BY ${sortBy} ${sortOrder}`
    );
  }

  return await pgp.any<DepartmentRow>(sqlQuery, params);
}

/**
 * Department CDで1件取得
 *
 * @param organizationId 組織ID
 * @param departmentCd 部署CD
 * @returns Department（見つからない場合はnull）
 */
export async function findById(
  organizationId: string,
  departmentCd: string
): Promise<DepartmentRow | null> {
  const pgp = getPgp();

  const sqlQuery = await loadSqlFile('departments/findById.sql');
  const result = await pgp.oneOrNone<DepartmentRow>(sqlQuery, [organizationId, departmentCd]);

  return result ?? null;
}

/**
 * Department CDが既に存在するかチェック
 *
 * @param organizationId 組織ID
 * @param departmentCd 部署CD
 * @returns 存在する場合true
 */
export async function existsById(
  organizationId: string,
  departmentCd: string
): Promise<boolean> {
  const pgp = getPgp();

  const query = await loadSqlFile('departments/existsById.sql');
  const result = await pgp.one<{ exists: boolean }>(query, [organizationId, departmentCd]);
  return result.exists;
}

/**
 * Departmentを新規作成
 *
 * @param organizationId 組織ID
 * @param data Department情報
 * @param userId ログインユーザーID
 * @returns 作成されたDepartment
 */
export async function create(
  organizationId: string,
  data: {
    departmentCd: string;
    departmentName: string;
    isActive?: boolean;
    updateAt?: string;
  },
  userId: string
): Promise<DepartmentRow> {
  const pgp = getPgp();

  const query = await loadSqlFile('departments/create.sql');
  const values = [
    organizationId,
    data.departmentCd,
    data.departmentName,
    data.isActive !== undefined ? data.isActive : true,
    userId,
    userId,
  ];

  return await pgp.one<DepartmentRow>(query, values);
}

/**
 * Departmentを更新
 *
 * @param organizationId 組織ID
 * @param departmentCd 部署CD
 * @param data 更新情報
 * @param userId ログインユーザーID
 * @returns 更新されたDepartment（見つからない場合はnull）
 */
export async function update(
  organizationId: string,
  departmentCd: string,
  data: {
    departmentName?: string;
    isActive?: boolean;
    updateAt?: string;
  },
  userId: string
): Promise<DepartmentRow | null> {
  const pgp = getPgp();

  const updates: string[] = [];
  const values: any[] = [organizationId, departmentCd];
  let paramIndex = 3;

  if (data.departmentName !== undefined) {
    updates.push(`department_name = $${paramIndex}`);
    values.push(data.departmentName);
    paramIndex++;
  }

  if (data.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    values.push(data.isActive);
    paramIndex++;
  }

  if (updates.length === 0) {
    return await findById(organizationId, departmentCd);
  }

  // update_user_id と update_at は常に更新
  updates.push(`update_user_id = $${paramIndex}`);
  values.push(userId);
  paramIndex++;

  if (data.updateAt !== undefined) {
    updates.push(`update_at = $${paramIndex}`);
    values.push(data.updateAt);
    paramIndex++;
  } else {
    updates.push(`update_at = NOW()`);
  }

  const query = `
    UPDATE department
    SET ${updates.join(', ')}
    WHERE organization_id = $1
      AND department_cd = $2
    RETURNING
      organization_id,
      department_cd,
      department_name,
      is_active,
      create_at,
      update_at
  `;

  const result = await pgp.oneOrNone<DepartmentRow>(query, values);
  return result ?? null;
}

/**
 * Departmentのアクティブ状態を更新
 *
 * @param organizationId 組織ID
 * @param departmentCd 部署CD
 * @param isActive アクティブ状態
 * @param userId ログインユーザーID
 * @returns 更新されたDepartment（見つからない場合はnull）
 */
export async function updateStatus(
  organizationId: string,
  departmentCd: string,
  isActive: boolean,
  userId: string
): Promise<DepartmentRow | null> {
  const pgp = getPgp();

  const query = await loadSqlFile('departments/updateStatus.sql');
  const result = await pgp.oneOrNone<DepartmentRow>(query, [isActive, userId, organizationId, departmentCd]);
  return result ?? null;
}

/**
 * Departmentを削除（物理削除）
 * ※通常はupdateStatusで論理削除を使用することを推奨
 *
 * @param organizationId 組織ID
 * @param departmentCd 部署CD
 * @returns 削除された場合true
 */
export async function deleteById(
  organizationId: string,
  departmentCd: string
): Promise<boolean> {
  const pgp = getPgp();

  const query = await loadSqlFile('departments/deleteById.sql');
  const result = await pgp.result(query, [organizationId, departmentCd]);
  return result.rowCount > 0;
}

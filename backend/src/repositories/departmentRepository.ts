/**
 * Department（部署）リポジトリ
 * データベースアクセス層
 */

import { Pool } from 'pg';
import { getPool } from '../database/db';

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
  const pool: Pool = getPool();
  
  console.log('=== departmentRepository.findAll called ===');
  console.log('organizationId:', organizationId);
  console.log('filters:', filters);
  
  let query = `
    SELECT 
      organization_id,
      department_cd,
      department_name,
      is_active,
      create_at,
      update_at
    FROM department
    WHERE organization_id = $1
  `;
  
  const params: any[] = [organizationId];
  let paramIndex = 2;
  
  // 検索フィルター
  if (filters.search) {
    query += ` AND (
      department_cd ILIKE $${paramIndex} OR
      department_name ILIKE $${paramIndex}
    )`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }
  
  // アクティブフィルター
  if (filters.isActive !== undefined) {
    query += ` AND is_active = $${paramIndex}`;
    params.push(filters.isActive);
    paramIndex++;
  }
  
  // ソート
  const sortBy = filters.sortBy || 'department_cd';
  const sortOrder = filters.sortOrder || 'asc';
  query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
  
  console.log('Executing query:', query);
  console.log('With params:', params);
  
  try {
    const result = await pool.query<DepartmentRow>(query, params);
    console.log('Query executed successfully, rows:', result.rows.length);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
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
  const pool: Pool = getPool();
  
  const query = `
    SELECT 
      organization_id,
      department_cd,
      department_name,
      is_active,
      create_at,
      update_at
    FROM department
    WHERE organization_id = $1
      AND department_cd = $2
  `;
  
  const result = await pool.query<DepartmentRow>(query, [organizationId, departmentCd]);
  
  return result.rows.length > 0 ? result.rows[0] : null;
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
  const pool: Pool = getPool();
  
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM department
      WHERE organization_id = $1
        AND department_cd = $2
    ) as exists
  `;
  
  const result = await pool.query(query, [organizationId, departmentCd]);
  return result.rows[0].exists;
}

/**
 * Departmentを新規作成
 * 
 * @param organizationId 組織ID
 * @param data Department情報
 * @returns 作成されたDepartment
 */
export async function create(
  organizationId: string,
  data: {
    departmentCd: string;
    departmentName: string;
    isActive?: boolean;
  }
): Promise<DepartmentRow> {
  const pool: Pool = getPool();
  
  const query = `
    INSERT INTO department (
      organization_id,
      department_cd,
      department_name,
      is_active,
      create_at,
      update_at
    ) VALUES (
      $1, $2, $3, $4, NOW(), NOW()
    )
    RETURNING 
      organization_id,
      department_cd,
      department_name,
      is_active,
      create_at,
      update_at
  `;
  
  const values = [
    organizationId,
    data.departmentCd,
    data.departmentName,
    data.isActive !== undefined ? data.isActive : true,
  ];
  
  const result = await pool.query<DepartmentRow>(query, values);
  
  return result.rows[0];
}

/**
 * Departmentを更新
 * 
 * @param organizationId 組織ID
 * @param departmentCd 部署CD
 * @param data 更新情報
 * @returns 更新されたDepartment（見つからない場合はnull）
 */
export async function update(
  organizationId: string,
  departmentCd: string,
  data: {
    departmentName?: string;
    isActive?: boolean;
  }
): Promise<DepartmentRow | null> {
  const pool: Pool = getPool();
  
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
    // 更新対象がない場合は現在のデータを返す
    return await findById(organizationId, departmentCd);
  }
  
  updates.push(`update_at = NOW()`);
  
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
  
  const result = await pool.query<DepartmentRow>(query, values);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

/**
 * Departmentのアクティブ状態を更新
 * 
 * @param organizationId 組織ID
 * @param departmentCd 部署CD
 * @param isActive アクティブ状態
 * @returns 更新されたDepartment（見つからない場合はnull）
 */
export async function updateStatus(
  organizationId: string,
  departmentCd: string,
  isActive: boolean
): Promise<DepartmentRow | null> {
  const pool: Pool = getPool();
  
  const query = `
    UPDATE department
    SET is_active = $1,
        update_at = NOW()
    WHERE organization_id = $2
      AND department_cd = $3
    RETURNING 
      organization_id,
      department_cd,
      department_name,
      is_active,
      create_at,
      update_at
  `;
  
  const result = await pool.query<DepartmentRow>(query, [isActive, organizationId, departmentCd]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
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
  const pool: Pool = getPool();
  
  const query = `
    DELETE FROM department
    WHERE organization_id = $1
      AND department_cd = $2
  `;
  
  const result = await pool.query(query, [organizationId, departmentCd]);
  
  return result.rowCount !== null && result.rowCount > 0;
}

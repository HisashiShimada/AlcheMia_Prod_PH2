/**
 * Organization（組織）リポジトリ
 * データアクセス層
 */

import { Pool } from 'pg';
import { getPool } from '../database/db';

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
  is_active: boolean;
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
  const pool: Pool = getPool();
  
  console.log('=== organizationManagementRepository.findAll called ===');
  console.log('filters:', filters);
  
  let query = `
    SELECT 
      o.organization_id,
      o.organization_cd,
      o.organization_display_name,
      o.organization_email,
      o.chief_user_id,
      ou.user_name as chief_user_name,
      o.corporation_id,
      c.corporation_name,
      o.is_entry,
      o.is_active,
      o.update_at
    FROM organization o
    LEFT JOIN organization_user ou 
      ON ou.user_id = o.chief_user_id
      AND ou.organization_id = o.organization_id
    LEFT JOIN corporation c 
      ON c.corporation_id = o.corporation_id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  let paramIndex = 1;
  
  // 検索フィルター
  if (filters.search) {
    query += ` AND (
      o.organization_cd ILIKE $${paramIndex} OR
      o.organization_email ILIKE $${paramIndex}
    )`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }
  
  // 組織CDフィルター
  if (filters.organizationCd) {
    query += ` AND o.organization_cd = $${paramIndex}`;
    params.push(filters.organizationCd);
    paramIndex++;
  }
  
  // 組織表示名フィルター
  if (filters.organizationDisplayName) {
    query += ` AND o.organization_display_name = $${paramIndex}`;
    params.push(filters.organizationDisplayName);
    paramIndex++;
  }
  
  // 会社名フィルター
  if (filters.corporationName) {
    query += ` AND c.corporation_name = $${paramIndex}`;
    params.push(filters.corporationName);
    paramIndex++;
  }
  
  // アクティブフィルター
  if (filters.isActive !== undefined) {
    query += ` AND o.is_active = $${paramIndex}`;
    params.push(filters.isActive);
    paramIndex++;
  }
  
  // ソート
  const sortBy = filters.sortBy || 'organization_cd';
  const sortOrder = filters.sortOrder || 'asc';
  query += ` ORDER BY o.${sortBy} ${sortOrder.toUpperCase()}`;
  
  console.log('Executing query:', query);
  console.log('With params:', params);
  
  try {
    const result = await pool.query<OrganizationRow>(query, params);
    console.log('Query executed successfully, rows:', result.rows.length);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
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
  const pool: Pool = getPool();
  
  const query = `
    SELECT 
      o.organization_id,
      o.organization_cd,
      o.organization_display_name,
      o.organization_email,
      o.chief_user_id,
      ou.user_name as chief_user_name,
      o.corporation_id,
      c.corporation_name,
      o.is_entry,
      o.is_active,
      o.update_at
    FROM organization o
    LEFT JOIN organization_user ou 
      ON ou.user_id = o.chief_user_id
      AND ou.organization_id = o.organization_id
    LEFT JOIN corporation c 
      ON c.corporation_id = o.corporation_id
    WHERE o.organization_id = $1
  `;
  
  const result = await pool.query<OrganizationRow>(query, [organizationId]);
  
  return result.rows.length > 0 ? result.rows[0] : null;
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
  const pool: Pool = getPool();
  
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM organization
      WHERE organization_id = $1
    ) as exists
  `;
  
  const result = await pool.query(query, [organizationId]);
  return result.rows[0].exists;
}

/**
 * Organization CDが既に存在するかチェック
 * 
 * @param organizationCd 組織CD
 * @returns 存在する場合true
 */
export async function existsByCd(
  organizationCd: string,
  excludeId?: string
): Promise<boolean> {
  const pool: Pool = getPool();
  
  let query = `
    SELECT EXISTS (
      SELECT 1
      FROM organization
      WHERE organization_cd = $1
  `;
  
  const params: any[] = [organizationCd];
  
  if (excludeId !== undefined) {
    query += ` AND organization_id != $2`;
    params.push(excludeId);
  }
  
  query += `) as exists`;
  
  const result = await pool.query(query, params);
  return result.rows[0].exists;
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
    isActive?: boolean;
  },
  userId: string
): Promise<OrganizationRow> {
  const pool: Pool = getPool();
  
  const query = `
    INSERT INTO organization (
      organization_id,
      organization_cd,
      organization_display_name,
      organization_email,
      chief_user_id,
      corporation_id,
      is_entry,
      is_active,
      create_user_id,
      update_user_id,
      create_at,
      update_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
    )
    RETURNING 
      organization_id,
      organization_cd,
      organization_display_name,
      organization_email,
      chief_user_id,
      corporation_id,
      is_active,
      update_at
  `;
  
  const values = [
    data.organizationId,
    data.organizationCd,
    data.organizationDisplayName,
    data.organizationEmail,
    data.chiefUserId || null,
    data.corporationId || null,
    data.isEntry !== undefined ? data.isEntry : 0,
    data.isActive !== undefined ? data.isActive : true,
    userId,
    userId,
  ];
  
  const result = await pool.query<OrganizationRow>(query, values);
  
  return result.rows[0];
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
    isActive?: boolean;
  },
  userId: string
): Promise<OrganizationRow | null> {
  const pool: Pool = getPool();
  
  const updates: string[] = [];
  const values: any[] = [organizationId];
  let paramIndex = 2;
  
  if (data.organizationDisplayName !== undefined) {
    updates.push(`organization_display_name = $${paramIndex}`);
    values.push(data.organizationDisplayName);
    paramIndex++;
  }
  
  if (data.organizationEmail !== undefined) {
    updates.push(`organization_email = $${paramIndex}`);
    values.push(data.organizationEmail);
    paramIndex++;
  }
  
  if (data.chiefUserId !== undefined) {
    updates.push(`chief_user_id = $${paramIndex}`);
    values.push(data.chiefUserId);
    paramIndex++;
  }
  
  if (data.corporationId !== undefined) {
    updates.push(`corporation_id = $${paramIndex}`);
    values.push(data.corporationId);
    paramIndex++;
  }
  
  if (data.isEntry !== undefined) {
    updates.push(`is_entry = $${paramIndex}`);
    values.push(data.isEntry);
    paramIndex++;
  }
  
  if (data.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    values.push(data.isActive);
    paramIndex++;
  }
  
  if (updates.length === 0) {
    // 更新対象がない場合は現在のデータを返す
    return await findById(organizationId);
  }
  
  // update_user_id と update_at は常に更新
  updates.push(`update_user_id = $${paramIndex}`);
  values.push(userId);
  paramIndex++;
  
  updates.push(`update_at = NOW()`);
  
  const query = `
    UPDATE organization
    SET ${updates.join(', ')}
    WHERE organization_id = $1
    RETURNING 
      organization_id,
      organization_cd,
      organization_display_name,
      organization_email,
      chief_user_id,
      corporation_id,
      is_active,
      update_at
  `;
  
  const result = await pool.query<OrganizationRow>(query, values);
  
  if (result.rows.length === 0) {
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
  const pool: Pool = getPool();
  
  const query = `
    UPDATE organization
    SET is_active = $1,
        update_user_id = $2,
        update_at = NOW()
    WHERE organization_id = $3
    RETURNING 
      organization_id,
      organization_cd,
      organization_display_name,
      organization_email,
      chief_user_id,
      corporation_id,
      is_active,
      update_at
  `;
  
  const result = await pool.query<OrganizationRow>(query, [isActive, userId, organizationId]);
  
  if (result.rows.length === 0) {
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
  const pool: Pool = getPool();
  
  const query = `
    DELETE FROM organization
    WHERE organization_id = $1
  `;
  
  const result = await pool.query(query, [organizationId]);
  
  return result.rowCount !== null && result.rowCount > 0;
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
  const pool: Pool = getPool();
  
  const query = `
    SELECT 
      user_id,
      user_name
    FROM organization_user
    WHERE organization_id = $1
      AND role_cd = 'ROLE002'
      AND is_active = true
    ORDER BY user_name
  `;
  
  const result = await pool.query(query, [organizationId]);
  
  return result.rows;
}

/**
 * 組織利用者を作成（organization_user）
 * 
 * @param data 組織利用者情報
 * @param client PostgreSQLクライアント（トランザクション用）
 * @returns 作成された組織利用者
 */
export async function createOrganizationUser(
  data: {
    userId: string;
    organizationId: string;
    userName: string;
    roleCd: string;
    mailAddress: string;
    departmentCd?: string | null;
    lockedUntil?: Date | null;
    isActive: boolean;
  },
  userId: string,
  client: any
): Promise<void> {
  const query = `
    INSERT INTO organization_user (
      user_id,
      organization_id,
      user_name,
      role_cd,
      mail_address,
      department_cd,
      locked_until,
      is_active,
      create_user_id,
      update_user_id,
      create_at,
      update_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
    )
  `;
  
  const values = [
    data.userId,
    data.organizationId,
    data.userName,
    data.roleCd,
    data.mailAddress,
    data.departmentCd || null,
    data.lockedUntil || null,
    data.isActive,
    userId,
    userId,
  ];
  
  await client.query(query, values);
}

/**
 * ロールを作成（role）
 * 
 * @param data ロール情報
 * @param userId ログインユーザーID
 * @param client PostgreSQLクライアント（トランザクション用）
 * @returns 作成されたロール
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
  client: any
): Promise<void> {
  const query = `
    INSERT INTO role (
      organization_id,
      role_cd,
      role_name,
      initial_screen_function_cd,
      is_active,
      create_user_id,
      update_user_id,
      create_at,
      update_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
    )
    ON CONFLICT (organization_id, role_cd) DO NOTHING
  `;
  
  const values = [
    data.organizationId,
    data.roleCd,
    data.roleName,
    data.initialScreenFunctionCd,
    data.isActive,
    userId,
    userId,
  ];
  
  await client.query(query, values);
}

/**
 * ロール権限を一括作成（role_permission）
 * 
 * @param data ロール権限情報の配列
 * @param userId ログインユーザーID
 * @param client PostgreSQLクライアント（トランザクション用）
 * @returns 作成されたロール権限
 */
export async function createRolePermissions(
  data: Array<{
    organizationId: string;
    roleCd: string;
    functionCd: string;
    permission: number;
  }>,
  userId: string,
  client: any
): Promise<void> {
  // 各権限を順次挿入
  for (const permission of data) {
    const query = `
      INSERT INTO role_permission (
        organization_id,
        role_cd,
        function_cd,
        permission,
        create_user_id,
        update_user_id,
        create_at,
        update_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW(), NOW()
      )
      ON CONFLICT (organization_id, role_cd, function_cd) DO NOTHING
    `;
    
    const values = [
      permission.organizationId,
      permission.roleCd,
      permission.functionCd,
      permission.permission,
      userId,
      userId,
    ];
    
    await client.query(query, values);
  }
}

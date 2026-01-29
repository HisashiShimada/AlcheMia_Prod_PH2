/**
 * ロールリポジトリ
 * roleテーブル、role_permissionテーブル、code_masterテーブルからデータを取得
 */

import { getPool } from '../database/db';

/**
 * ロールの生データ型（SQL結果）
 */
interface RoleRawData {
  role_id: string;
  role_name: string;
  is_active: boolean;
  function_id: string | null;
  permission: number | null;
  function_name: string | null;
  permission_name: string | null;
  update_at: Date | null;
}

/**
 * ロール型（整形後）
 */
export interface Role {
  roleId: string;
  roleName: string;
  isActive: boolean;
  functionName: string;
  functionWritePermissions: string;
  updatedAt: string | null;
}

/**
 * ロール一覧を取得
 * 
 * @param organizationId - 組織ID
 * @returns ロール配列
 */
export async function getRoles(organizationId: string): Promise<Role[]> {
  const pool = getPool();

  // 最適化されたSQL（1回のクエリで全データ取得）
  const query = `
    SELECT
        r.role_id,
        r.role_name,
        r.is_active,
        r.update_at,
        rp.function_id,
        rp.permission,
        cm_func.code_name as function_name,
        cm_perm.code_name as permission_name
    FROM 
        role r
    LEFT JOIN
        role_permission rp
        ON r.organization_id = rp.organization_id
        AND r.role_id = rp.role_id
    LEFT JOIN
        code_master cm_func
        ON r.organization_id = cm_func.organization_id
        AND cm_func.code_division = 'role_function'
        AND rp.function_id = cm_func.code_value
    LEFT JOIN
        code_master cm_perm
        ON r.organization_id = cm_perm.organization_id
        AND cm_perm.code_division = 'role_function_permission'
        AND CAST(rp.permission AS VARCHAR) = cm_perm.code_value
    WHERE
        r.organization_id = $1
    ORDER BY
        r.role_id, rp.function_id;
  `;

  const result = await pool.query<RoleRawData>(query, [organizationId]);

  // データ集約：role_idごとにグループ化
  const roleMap = new Map<string, Role>();

  for (const row of result.rows) {
    const roleId = row.role_id;

    if (!roleMap.has(roleId)) {
      // 初回のrole_idの場合、新しいRoleオブジェクトを作成
      roleMap.set(roleId, {
        roleId: row.role_id,
        roleName: row.role_name,
        isActive: row.is_active,
        functionName: '',
        functionWritePermissions: '',
        updatedAt: row.update_at ? row.update_at.toISOString() : null,
      });
    }

    const role = roleMap.get(roleId)!;

    // 機能名と権限名を集約
    if (row.function_name) {
      // functionNameに追加（すべての機能）
      if (role.functionName) {
        role.functionName += '/' + row.function_name;
      } else {
        role.functionName = row.function_name;
      }

      // functionWritePermissionsに追加（書き込み権限のみ）
      // permission === 2 が書き込み権限
      if (row.permission === 2) {
        if (role.functionWritePermissions) {
          role.functionWritePermissions += '/' + row.function_name;
        } else {
          role.functionWritePermissions = row.function_name;
        }
      }
    }
  }

  // Mapから配列に変換
  return Array.from(roleMap.values());
}

/**
 * ロールIDで1件取得
 * 
 * @param organizationId - 組織ID
 * @param roleId - ロールID
 * @returns ロール（存在しない場合はnull）
 */
export async function getRoleById(
  organizationId: string,
  roleId: string
): Promise<Role | null> {
  const pool = getPool();

  const query = `
    SELECT
        r.role_id,
        r.role_name,
        r.is_active,
        r.update_at,
        rp.function_id,
        rp.permission,
        cm_func.code_name as function_name,
        cm_perm.code_name as permission_name
    FROM 
        role r
    LEFT JOIN
        role_permission rp
        ON r.organization_id = rp.organization_id
        AND r.role_id = rp.role_id
    LEFT JOIN
        code_master cm_func
        ON r.organization_id = cm_func.organization_id
        AND cm_func.code_division = 'role_function'
        AND rp.function_id = cm_func.code_value
    LEFT JOIN
        code_master cm_perm
        ON r.organization_id = cm_perm.organization_id
        AND cm_perm.code_division = 'role_function_permission'
        AND CAST(rp.permission AS VARCHAR) = cm_perm.code_value
    WHERE
        r.organization_id = $1
        AND r.role_id = $2
    ORDER BY
        rp.function_id;
  `;

  const result = await pool.query<RoleRawData>(query, [organizationId, roleId]);

  if (result.rows.length === 0) {
    return null;
  }

  // データ集約
  let role: Role | null = null;

  for (const row of result.rows) {
    if (!role) {
      // 初回の行でRoleオブジェクトを作成
      role = {
        roleId: row.role_id,
        roleName: row.role_name,
        isActive: row.is_active,
        functionName: '',
        functionWritePermissions: '',
        updatedAt: row.update_at ? row.update_at.toISOString() : null,
      };
    }

    // 機能名と権限名を集約
    if (row.function_name) {
      // functionNameに追加（すべての機能）
      if (role.functionName) {
        role.functionName += '/' + row.function_name;
      } else {
        role.functionName = row.function_name;
      }

      // functionWritePermissionsに追加（書き込み権限のみ）
      if (row.permission === 2) {
        if (role.functionWritePermissions) {
          role.functionWritePermissions += '/' + row.function_name;
        } else {
          role.functionWritePermissions = row.function_name;
        }
      }
    }
  }

  return role;
}

/**
 * ロールリポジトリ
 * roleテーブル、role_permissionテーブルからデータを取得
 * 機能名と権限記号はenumから取得
 */

import { getPool } from '../database/db';
import { FunctionList, PermissionList } from '../enums/roleFunctionPermission.enum';

/**
 * DateオブジェクトをYYYYMMDDhhmmss形式の文字列に変換
 * @param date Dateオブジェクト
 * @returns YYYYMMDDhhmmss形式の文字列（例: "20240126143000"）
 */
function formatDateToYYYYMMDDhhmmss(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hour}${minute}${second}`;
}

/**
 * ロールの生データ型（SQL結果）
 */
interface RoleRawData {
  role_cd: string;
  role_name: string;
  is_active: boolean;
  initial_screen_function_cd: string | null;
  function_cd: string | null;
  permission: number | null;
  update_at: Date | null;
}

/**
 * 機能IDから機能名を取得
 * @param functionId 機能ID (例: "FUNC001")
 * @returns 機能名 (例: "会社管理")
 */
function getFunctionName(functionId: string): string {
  const name = FunctionList[functionId as keyof typeof FunctionList];
  return name || functionId;
}

/**
 * 権限コードから権限記号を取得
 * @param permission 権限コード (0=書込, 1=読取)
 * @returns 権限記号 (例: "Ⓦ", "Ⓡ")
 */
function getPermissionSymbol(permission: number): string {
  if (permission === 0) return PermissionList.WRITER; // Ⓦ
  if (permission === 1) return PermissionList.READER; // Ⓡ
  return '';
}

/**
 * 機能情報の型
 */
export interface FunctionInfo {
  name: string;           // 機能名（例: "会社管理"）
  permission: string;     // 権限（"WRITER" or "READER"）
  color: string;          // 色コード（"#52c41a" or "#1890ff"）
  icon: string;           // アイコン（"Ⓦ" or "Ⓡ"）
}

/**
 * ロール型（整形後）
 */
export interface Role {
  roleId: string;
  roleName: string;
  isActive: boolean;
  initialScreenFunctionName: string | null;  // 初期画面機能名
  functionName: string;
  functionWritePermissions: string;
  functionIds: string[];  // 機能IDのリスト
  writableFunctionIds: string[];  // 書込可能な機能IDのリスト
  functions: FunctionInfo[];  // 機能情報の配列（色とアイコン付き）
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

  // シンプルなSQL（code_masterテーブル不要）
  const query = `
    SELECT
        r.role_cd,
        r.role_name,
        r.is_active,
        r.initial_screen_function_cd,
        r.update_at,
        rp.function_cd,
        rp.permission
    FROM 
        role r
    LEFT JOIN
        role_permission rp
        ON r.organization_id = rp.organization_id
        AND r.role_cd = rp.role_cd
    WHERE
        r.organization_id = $1
    ORDER BY
        r.role_cd, rp.function_cd;
  `;

  const result = await pool.query<RoleRawData>(query, [organizationId]);

  // データ集約：role_cdごとにグループ化
  const roleMap = new Map<string, Role>();

  for (const row of result.rows) {
    const roleId = row.role_cd;

    if (!roleMap.has(roleId)) {
      // 初回のrole_cdの場合、新しいRoleオブジェクトを作成
      // 初期画面機能名をCDから変換
      const initialScreenFunctionName = row.initial_screen_function_cd
        ? getFunctionName(row.initial_screen_function_cd)
        : null;
      
      roleMap.set(roleId, {
        roleId: row.role_cd,
        roleName: row.role_name,
        isActive: row.is_active,
        initialScreenFunctionName,
        functionName: '',
        functionWritePermissions: '',
        functionIds: [],
        writableFunctionIds: [],
        functions: [],
        updatedAt: row.update_at ? formatDateToYYYYMMDDhhmmss(row.update_at) : null,
      });
    }

    const role = roleMap.get(roleId)!;

    // 機能名と権限記号を集約
    if (row.function_cd && row.permission !== null) {
      const funcName = getFunctionName(row.function_cd);
      const permSymbol = getPermissionSymbol(row.permission);
      const displayText = `${permSymbol}${funcName}`; // "Ⓦ会社管理"

      // functionIdsに機能IDを追加
      role.functionIds.push(row.function_cd);

      // functionNameに追加（すべての機能）
      if (role.functionName) {
        role.functionName += '/' + displayText;
      } else {
        role.functionName = displayText;
      }

      // 機能情報の配列に追加（色とアイコン付き）
      const isWriter = row.permission === 0;
      role.functions.push({
        name: funcName,
        permission: isWriter ? 'WRITER' : 'READER',
        color: isWriter ? '#52c41a' : '#1890ff',
        icon: permSymbol,
      });

      // functionWritePermissionsに追加（書き込み権限のみ）
      // permission === 0 が書き込み権限
      if (row.permission === 0) {
        // writableFunctionIdsに機能IDを追加
        role.writableFunctionIds.push(row.function_cd);
        
        if (role.functionWritePermissions) {
          role.functionWritePermissions += '/' + funcName;
        } else {
          role.functionWritePermissions = funcName;
        }
      }
    }
  }

  // Mapから配列に変換
  return Array.from(roleMap.values());
}

/**
 * ロールCDで1件取得
 * 
 * @param organizationId - 組織ID
 * @param roleId - ロールCD
 * @returns ロール（存在しない場合はnull）
 */
export async function getRoleById(
  organizationId: string,
  roleId: string
): Promise<Role | null> {
  const pool = getPool();

  const query = `
    SELECT
        r.role_cd,
        r.role_name,
        r.is_active,
        r.initial_screen_function_cd,
        r.update_at,
        rp.function_cd,
        rp.permission
    FROM 
        role r
    LEFT JOIN
        role_permission rp
        ON r.organization_id = rp.organization_id
        AND r.role_cd = rp.role_cd
    WHERE
        r.organization_id = $1
        AND r.role_cd = $2
    ORDER BY
        rp.function_cd;
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
      // 初期画面機能名をCDから変換
      const initialScreenFunctionName = row.initial_screen_function_cd
        ? getFunctionName(row.initial_screen_function_cd)
        : null;
      
      role = {
        roleId: row.role_cd,
        roleName: row.role_name,
        isActive: row.is_active,
        initialScreenFunctionName,
        functionName: '',
        functionWritePermissions: '',
        functionIds: [],
        writableFunctionIds: [],
        functions: [],
        updatedAt: row.update_at ? formatDateToYYYYMMDDhhmmss(row.update_at) : null,
      };
    }

    // 機能名と権限記号を集約
    if (row.function_cd && row.permission !== null) {
      const funcName = getFunctionName(row.function_cd);
      const permSymbol = getPermissionSymbol(row.permission);
      const displayText = `${permSymbol}${funcName}`; // "Ⓦ会社管理"

      // functionIdsに機能IDを追加
      role.functionIds.push(row.function_cd);

      // functionNameに追加（すべての機能）
      if (role.functionName) {
        role.functionName += '/' + displayText;
      } else {
        role.functionName = displayText;
      }

      // 機能情報の配列に追加（色とアイコン付き）
      const isWriter = row.permission === 0;
      role.functions.push({
        name: funcName,
        permission: isWriter ? 'WRITER' : 'READER',
        color: isWriter ? '#52c41a' : '#1890ff',
        icon: permSymbol,
      });

      // functionWritePermissionsに追加（書き込み権限のみ）
      // permission === 0 が書き込み権限
      if (row.permission === 0) {
        // writableFunctionIdsに機能IDを追加
        role.writableFunctionIds.push(row.function_cd);
        
        if (role.functionWritePermissions) {
          role.functionWritePermissions += '/' + funcName;
        } else {
          role.functionWritePermissions = funcName;
        }
      }
    }
  }

  return role;
}

/**
 * 機能名から機能IDを取得（逆引き）
 * @param functionName 機能名 (例: "会社管理")
 * @returns 機能ID (例: "FUNC001") または null
 */
export function getFunctionIdByName(functionName: string): string | null {
  // FunctionListのキーと値を逆引き
  const entries = Object.entries(FunctionList);
  const found = entries.find(([, value]) => value === functionName);
  return found ? found[0] : null;
}

/**
 * ロールを新規追加
 * 
 * @param organizationId - 組織ID
 * @param roleData - ロールデータ
 * @param userId - ログインユーザーID
 */
export async function createRole(
  organizationId: string,
  roleData: {
    roleId: string;
    roleName: string;
    initialScreenFunctionName: string | null;
    isActive: boolean;
  },
  userId: string
): Promise<void> {
  const pool = getPool();
  
  // 重複チェック
  const checkQuery = `
    SELECT role_cd FROM role
    WHERE organization_id = $1 AND role_cd = $2;
  `;
  const checkResult = await pool.query(checkQuery, [organizationId, roleData.roleId]);
  
  if (checkResult.rows.length > 0) {
    throw new Error('ロールCDが既に存在しています');
  }
  
  // 初期画面機能名 → CD変換
  const initialScreenFunctionCd = roleData.initialScreenFunctionName
    ? getFunctionIdByName(roleData.initialScreenFunctionName)
    : null;
  
  const insertQuery = `
    INSERT INTO role (
      organization_id, role_cd, role_name, initial_screen_function_cd,
      is_active, create_user_id, create_at, update_user_id, update_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, CURRENT_TIMESTAMP);
  `;
  
  await pool.query(insertQuery, [
    organizationId,
    roleData.roleId,
    roleData.roleName,
    initialScreenFunctionCd,
    roleData.isActive,
    userId,
    userId,
  ]);
}

/**
 * ロールを更新
 * 
 * @param organizationId - 組織ID
 * @param roleId - ロールCD
 * @param roleData - 更新データ
 * @param userId - ログインユーザーID
 */
export async function updateRole(
  organizationId: string,
  roleId: string,
  roleData: {
    roleName?: string;
    initialScreenFunctionName?: string | null;
    isActive?: boolean;
  },
  userId: string
): Promise<void> {
  const pool = getPool();
  
  // 初期画面機能名 → CD変換
  let initialScreenFunctionCd: string | null | undefined = undefined;
  if (roleData.initialScreenFunctionName !== undefined) {
    initialScreenFunctionCd = roleData.initialScreenFunctionName
      ? getFunctionIdByName(roleData.initialScreenFunctionName)
      : null;
  }
  
  // 動的にUPDATE文を構築
  const updates: string[] = [];
  const values: any[] = [organizationId, roleId];
  let paramIndex = 3;
  
  if (roleData.roleName !== undefined) {
    updates.push(`role_name = $${paramIndex++}`);
    values.push(roleData.roleName);
  }
  
  if (initialScreenFunctionCd !== undefined) {
    updates.push(`initial_screen_function_cd = $${paramIndex++}`);
    values.push(initialScreenFunctionCd);
  }
  
  if (roleData.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(roleData.isActive);
  }
  
  // update_user_id と update_at は常に更新
  updates.push(`update_user_id = $${paramIndex++}`);
  values.push(userId);
  updates.push(`update_at = CURRENT_TIMESTAMP`);
  
  if (updates.length === 0) {
    return; // 更新項目がない場合は何もしない
  }
  
  const updateQuery = `
    UPDATE role
    SET ${updates.join(', ')}
    WHERE organization_id = $1 AND role_cd = $2;
  `;
  
  await pool.query(updateQuery, values);
}

/**
 * ロールの権限を更新
 * role_permissionテーブルの既存データを削除し、新規データを挿入
 * 
 * @param organizationId - 組織ID
 * @param roleId - ロールCD
 * @param permissions - 権限配列 [{ functionName, writable }]
 * @param userId - ログインユーザーID
 */
export async function updateRolePermissions(
  organizationId: string,
  roleId: string,
  permissions: Array<{ functionName: string; writable: boolean }>,
  userId: string
): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 既存のrole_permissionを削除
    const deleteQuery = `
      DELETE FROM role_permission
      WHERE organization_id = $1 AND role_cd = $2;
    `;
    await client.query(deleteQuery, [organizationId, roleId]);

    // 新しいrole_permissionを挿入
    if (permissions.length > 0) {
      for (const perm of permissions) {
        const functionId = getFunctionIdByName(perm.functionName);
        
        if (!functionId) {
          console.warn(`Function name "${perm.functionName}" not found in FunctionList`);
          continue;
        }

        const insertQuery = `
          INSERT INTO role_permission (
            organization_id, role_cd, function_cd, permission,
            create_user_id, create_at, update_user_id, update_at
          )
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, CURRENT_TIMESTAMP);
        `;
        
        // permission: 0=書込可、1=読取のみ
        const permissionValue = perm.writable ? 0 : 1;
        
        await client.query(insertQuery, [
          organizationId,
          roleId,
          functionId,
          permissionValue,
          userId,
          userId,
        ]);
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating role permissions:', error);
    throw error;
  } finally {
    client.release();
  }
}

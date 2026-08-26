/**
 * ロールリポジトリ
 * roleテーブル、role_permissionテーブルからデータを取得
 * pg-promise + SQLファイル外部管理パターンを使用
 * 機能名と権限記号はenumから取得
 */

import { getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import { FunctionList, PermissionList } from '../enums/roleFunctionPermission.enum';
import { formatDateTimeJST } from '../utils/dateUtils';

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
 * @param permission 権限コード (0=読取専用, 1=書込可)
 * @returns 権限記号 (例: "Ⓦ", "Ⓡ")
 */
function getPermissionSymbol(permission: number): string {
  if (permission === 0) return PermissionList.READER; // Ⓡ
  if (permission === 1) return PermissionList.WRITER; // Ⓦ
  return '';
}

/**
 * 機能情報の型
 */
export interface FunctionInfo {
  name: string;       // 機能名（例: "会社管理"）
  permission: string; // 権限（"WRITER" or "READER"）
  color: string;      // 色コード（"#52c41a" or "#1890ff"）
  icon: string;       // アイコン（"Ⓦ" or "Ⓡ"）
}

/**
 * ロール型（整形後）
 */
export interface Role {
  roleId: string;
  roleName: string;
  isActive: boolean;
  initialScreenFunctionName: string | null; // 初期画面機能名
  functionName: string;
  functionWritePermissions: string;
  functionIds: string[];         // 機能IDのリスト
  writableFunctionIds: string[]; // 書込可能な機能IDのリスト
  functions: FunctionInfo[];     // 機能情報の配列（色とアイコン付き）
  updatedAt: string | null;
}

/**
 * RoleRawData行をRoleオブジェクトに集約するヘルパー
 */
function aggregateRoles(rows: RoleRawData[]): Role[] {
  const roleMap = new Map<string, Role>();

  for (const row of rows) {
    const roleId = row.role_cd;

    if (!roleMap.has(roleId)) {
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
        updatedAt: row.update_at ? formatDateTimeJST(row.update_at) : null,
      });
    }

    const role = roleMap.get(roleId)!;

    if (row.function_cd && row.permission !== null) {
      const funcName = getFunctionName(row.function_cd);
      const permSymbol = getPermissionSymbol(row.permission);
      const displayText = `${permSymbol}${funcName}`;

      role.functionIds.push(row.function_cd);

      if (role.functionName) {
        role.functionName += '/' + displayText;
      } else {
        role.functionName = displayText;
      }

      const isWriter = row.permission === 1;
      role.functions.push({
        name: funcName,
        permission: isWriter ? 'WRITER' : 'READER',
        color: isWriter ? '#52c41a' : '#1890ff',
        icon: permSymbol,
      });

      if (row.permission === 1) {
        role.writableFunctionIds.push(row.function_cd);

        if (role.functionWritePermissions) {
          role.functionWritePermissions += '/' + funcName;
        } else {
          role.functionWritePermissions = funcName;
        }
      }
    }
  }

  return Array.from(roleMap.values());
}

/**
 * ロール一覧を取得
 *
 * @param organizationId - 組織ID
 * @returns ロール配列
 */
export async function getRoles(organizationId: string): Promise<Role[]> {
  const pgp = getPgp();

  const sqlQuery = await loadSqlFile('roles/findAll.sql');
  const rows = await pgp.any<RoleRawData>(sqlQuery, [organizationId]);

  return aggregateRoles(rows);
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
  const pgp = getPgp();

  const sqlQuery = await loadSqlFile('roles/findById.sql');
  const rows = await pgp.any<RoleRawData>(sqlQuery, [organizationId, roleId]);

  if (rows.length === 0) {
    return null;
  }

  const roles = aggregateRoles(rows);
  return roles[0] ?? null;
}

/**
 * 機能名から機能IDを取得（逆引き）
 * @param functionName 機能名 (例: "会社管理")
 * @returns 機能ID (例: "FUNC001") または null
 */
export function getFunctionIdByName(functionName: string): string | null {
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
  const pgp = getPgp();

  // 重複チェック（SQLファイル使用）
  const checkSql = await loadSqlFile('roles/checkExists.sql');
  const existing = await pgp.oneOrNone(checkSql, [organizationId, roleData.roleId]);

  if (existing) {
    throw new Error('ロールCDが既に存在しています');
  }

  // 初期画面機能名 → CD変換
  const initialScreenFunctionCd = roleData.initialScreenFunctionName
    ? getFunctionIdByName(roleData.initialScreenFunctionName)
    : null;

  const insertQuery = await loadSqlFile('roles/create.sql');
  await pgp.none(insertQuery, [
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
  const pgp = getPgp();

  // 初期画面機能名 → CD変換
  let initialScreenFunctionCd: string | null | undefined = undefined;
  if (roleData.initialScreenFunctionName !== undefined) {
    initialScreenFunctionCd = roleData.initialScreenFunctionName
      ? getFunctionIdByName(roleData.initialScreenFunctionName)
      : null;
  }

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

  if (updates.length === 0) {
    return;
  }

  updates.push(`update_user_id = $${paramIndex++}`);
  values.push(userId);
  updates.push(`update_at = CURRENT_TIMESTAMP`);

  const updateQuery = `
    UPDATE role
    SET ${updates.join(', ')}
    WHERE organization_id = $1 AND role_cd = $2
  `;

  await pgp.none(updateQuery, values);
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
  const pgp = getPgp();

  // SQLファイルを事前に読み込み（トランザクション外で実施）
  const deleteSql = await loadSqlFile('roles/deletePermissions.sql');
  const insertSql = await loadSqlFile('roles/insertPermission.sql');

  await pgp.tx(async (t) => {
    // 既存のrole_permissionを削除（SQLファイル使用）
    await t.none(deleteSql, [organizationId, roleId]);

    // 新しいrole_permissionを挿入（SQLファイル使用）
    if (permissions.length > 0) {
      for (const perm of permissions) {
        const functionId = getFunctionIdByName(perm.functionName);

        if (!functionId) {
          console.warn(`Function name "${perm.functionName}" not found in FunctionList`);
          continue;
        }

        // permission: 0=読取専用、1=書込可
        const permissionValue = perm.writable ? 1 : 0;

        await t.none(insertSql, [
          organizationId,
          roleId,
          functionId,
          permissionValue,
          userId,
          userId,
        ]);
      }
    }
  });
}

/**
 * ロールの存在チェック
 *
 * @param organizationId - 組織ID
 * @param roleCd - ロールCD
 * @returns 存在する場合true
 */
export async function existsById(
  organizationId: string,
  roleCd: string
): Promise<boolean> {
  const pgp = getPgp();

  const query = await loadSqlFile('roles/existsById.sql');
  const result = await pgp.one<{ exists: boolean }>(query, [organizationId, roleCd]);
  return result.exists;
}

/**
 * 初期画面機能CDを取得（authController用）
 *
 * @param organizationId - 組織ID
 * @param roleCd - ロールコード
 * @returns 初期画面機能CD（nullの可能性あり）
 */
export async function getInitialScreenFunctionCd(
  organizationId: string,
  roleCd: string
): Promise<string | null> {
  const pgp = getPgp();

  const sqlQuery = await loadSqlFile('roles/findInitialScreenFunctionCd.sql');
  const result = await pgp.oneOrNone<{ initial_screen_function_cd: string | null }>(
    sqlQuery,
    [organizationId, roleCd]
  );

  if (!result) {
    return null;
  }

  return result.initial_screen_function_cd?.trim() || null;
}

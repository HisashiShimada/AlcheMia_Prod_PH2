/**
 * ロール権限リポジトリ
 * 
 * @description role_permissionテーブルからロール別の権限情報を取得
 */

import { getPool } from '../database/db';
import type { Permission } from '../types/auth';

/**
 * ロール権限リポジトリクラス
 */
export class RolePermissionRepository {
  /**
   * 指定されたrole_idとorganization_idに対応する権限情報を取得
   * 
   * @param roleId - ロールID
   * @param organizationId - 組織ID
   * @returns 権限情報の配列（function_cdとpermissionを含む）
   */
  async getPermissionsByRoleId(
    roleCd: string,
    organizationId: string
  ): Promise<Permission[]> {
    const pool = getPool();
    
    try {
      // role_permissionテーブルから権限情報を取得
      const result = await pool.query<{ function_cd: string; permission: number }>(
        `SELECT function_cd, permission
         FROM role_permission 
         WHERE role_cd = $1 
           AND organization_id = $2
         ORDER BY function_cd`,
        [roleCd, organizationId]
      );

      // Permission型の配列に変換して返す
      return result.rows.map(row => ({
        functionId: row.function_cd,
        permission: row.permission
      }));
    } catch (error) {
      console.error('Error fetching permissions by role_id:', error);
      // エラー時は空配列を返す（フォールバック）
      return [];
    }
  }

  /**
   * 指定されたrole_idが特定の機能にアクセス可能かチェック
   * 
   * @param roleId - ロールID
   * @param organizationId - 組織ID
   * @param functionId - 機能ID
   * @returns アクセス可能な場合true
   */
  async hasPermission(
    roleId: string,
    organizationId: string,
    functionId: string
  ): Promise<boolean> {
    const pool = getPool();
    
    try {
      const result = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS(
          SELECT 1 FROM role_permission 
          WHERE role_cd = $1 
            AND organization_id = $2 
            AND function_cd = $3
         ) as exists`,
        [roleId, organizationId, functionId]
      );

      return result.rows[0]?.exists || false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }
}

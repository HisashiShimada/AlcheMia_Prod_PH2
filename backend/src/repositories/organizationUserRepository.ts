import { Pool } from 'pg';
import type { Result } from '../types/service';

/**
 * organization_userテーブルに対するデータアクセス層
 * マルチテナント分離を保証し、ユーザー情報の取得を提供
 */

export interface OrganizationUser {
  user_id: string;
  user_name: string;
  mail_address: string;
  role_cd: string;
  organization_id: string;
  is_active: boolean;
  locked_until: Date | null;
  department_cd: string | null;
  corporation_id: string | null;
}

export interface OrganizationUserWithRole extends OrganizationUser {
  initial_screen_function_cd: string | null;
  organization_display_name: string;
  role_name: string | null;
}

export class OrganizationUserRepository {
  /**
   * ユーザーIDで検索（基本情報）
   * 
   * @param pool - PostgreSQLコネクションプール
   * @param userId - ユーザーID
   * @param organizationId - 組織ID（マルチテナント分離）
   * @returns ユーザー情報
   */
  async findByUserId(
    pool: Pool,
    userId: string,
    organizationId: string
  ): Promise<Result<OrganizationUser>> {
    try {
      const query = `
        SELECT 
          ou.user_id,
          ou.user_name,
          ou.mail_address,
          ou.role_cd,
          ou.organization_id,
          ou.is_active,
          ou.locked_until,
          ou.department_cd,
          o.corporation_id
        FROM organization_user ou
        LEFT JOIN organization o ON ou.organization_id = o.organization_id
        WHERE ou.user_id = $1 AND ou.organization_id = $2
      `;

      const result = await pool.query(query, [userId, organizationId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'User not found',
          },
        };
      }

      return {
        success: true,
        data: result.rows[0],
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'Database error occurred',
        },
      };
    }
  }

  /**
   * メールアドレスで検索
   * 
   * @param pool - PostgreSQLコネクションプール
   * @param email - メールアドレス
   * @param organizationId - 組織ID（マルチテナント分離）
   * @returns ユーザー情報
   */
  async findByEmail(
    pool: Pool,
    email: string,
    organizationId: string
  ): Promise<Result<OrganizationUser>> {
    try {
      const query = `
        SELECT 
          ou.user_id,
          ou.user_name,
          ou.mail_address,
          ou.role_cd,
          ou.organization_id,
          ou.is_active,
          ou.locked_until,
          ou.department_cd,
          o.corporation_id
        FROM organization_user ou
        LEFT JOIN organization o ON ou.organization_id = o.organization_id
        WHERE ou.mail_address = $1 AND ou.organization_id = $2
      `;

      const result = await pool.query(query, [email, organizationId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'User not found',
          },
        };
      }

      return {
        success: true,
        data: result.rows[0],
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'Database error occurred',
        },
      };
    }
  }

  /**
   * ユーザーIDで検索（ロール情報含む）
   * refreshToken APIで使用
   * 
   * @param pool - PostgreSQLコネクションプール
   * @param userId - ユーザーID
   * @param organizationId - 組織ID（マルチテナント分離）
   * @returns ユーザー情報（ロール情報含む）
   */
  async findByUserIdWithRole(
    pool: Pool,
    userId: string,
    organizationId: string
  ): Promise<Result<OrganizationUserWithRole>> {
    try {
      const query = `
        SELECT 
          ou.user_id,
          ou.user_name,
          ou.mail_address,
          ou.role_cd,
          ou.organization_id,
          ou.is_active,
          ou.locked_until,
          ou.department_cd,
          o.corporation_id,
          r.initial_screen_function_cd,
          r.role_name,
          o.organization_display_name
        FROM organization_user ou
        JOIN role r ON ou.role_cd = r.role_cd AND ou.organization_id = r.organization_id
        LEFT JOIN organization o ON ou.organization_id = o.organization_id
        WHERE ou.user_id = $1 AND ou.organization_id = $2
      `;

      const result = await pool.query(query, [userId, organizationId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'User not found',
          },
        };
      }

      return {
        success: true,
        data: result.rows[0],
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'Database error occurred',
        },
      };
    }
  }

  /**
   * セッショントークンからユーザー情報を取得（PINコード再送信用）
   * pin_codesテーブルとorganization_userテーブルをJOINして取得
   * 
   * @param pool - データベース接続プール
   * @param sessionToken - セッショントークン
   * @param organizationId - 組織ID
   * @returns ユーザー情報（user_id, organization_id, user_name, mail_address）
   */
  async findBySessionToken(
    pool: Pool,
    sessionToken: string,
    organizationId: string
  ): Promise<Result<{ user_id: string; organization_id: string; user_name: string; mail_address: string }>> {
    try {
      const query = `
        SELECT 
          pc.user_id,
          pc.organization_id,
          ou.user_name,
          ou.mail_address
        FROM pin_codes pc
        JOIN organization_user ou ON pc.user_id = ou.user_id AND pc.organization_id = ou.organization_id
        WHERE pc.session_token = $1 AND pc.organization_id = $2
      `;

      const result = await pool.query(query, [sessionToken, organizationId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'セッショントークンに対応するユーザーが見つかりません',
          },
        };
      }

      return {
        success: true,
        data: result.rows[0],
      };
    } catch (error) {
      console.error('セッショントークンからのユーザー検索エラー:', error);
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました',
        },
      };
    }
  }
}

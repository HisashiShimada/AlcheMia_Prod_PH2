import { Pool } from 'pg';
import type { Result } from '../types/service';
import { loadSqlFile } from '../sql/loader';

/**
 * user_authenticationテーブルに対するデータアクセス層
 * パスワード管理とその状態（一時パスワードフラグ）を提供
 */

export interface PasswordStatus {
  is_temporary_flg: boolean;
}

export class UserAuthenticationRepository {
  /**
   * パスワード状態を取得
   * 
   * @param pool - PostgreSQLコネクションプール
   * @param userId - ユーザーID
   * @param organizationId - 組織ID（マルチテナント分離）
   * @returns パスワード状態（一時パスワードフラグ）
   */
  async getPasswordStatus(
    pool: Pool,
    userId: string,
    organizationId: string
  ): Promise<Result<PasswordStatus>> {
    try {
      const query = `
        SELECT is_temporary_flg
        FROM user_authentication
        WHERE user_id = $1 AND organization_id = $2
      `;

      const result = await pool.query(query, [userId, organizationId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: {
            code: 'E6001',
            message: 'User authentication record not found',
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
   * 一時パスワードとして更新（パスワードリセット用）
   * is_temporary_flgをtrueに設定する
   * 
   * @param pool - データベース接続プール
   * @param userId - ユーザーID
   * @param organizationId - 組織ID
   * @param hashedPassword - ハッシュ化されたパスワード
   * @returns 更新結果
   */
  async updateAsTemporary(
    pool: Pool,
    userId: string,
    organizationId: string,
    hashedPassword: string
  ): Promise<Result<void>> {
    try {
      const query = `
        UPDATE user_authentication
        SET password = $1,
            is_temporary_flg = true,
            update_at = NOW()
        WHERE user_id = $2 AND organization_id = $3
      `;

      await pool.query(query, [hashedPassword, userId, organizationId]);

      return { 
        success: true,
        data: undefined,
      };
    } catch (error) {
      console.error('一時パスワード更新エラー:', error);
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました',
        },
      };
    }
  }

  /**
   * パスワード変更後に一時パスワードフラグをクリア
   * ユーザーがパスワード変更モーダルから新しいパスワードを設定する際に使用
   * 
   * @param pool - PostgreSQLコネクションプール
   * @param userId - ユーザーID
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param hashedPassword - ハッシュ化されたパスワード
   * @returns 成功/失敗
   */
  async clearPasswordExpiry(
    pool: Pool,
    userId: string,
    organizationId: string,
    hashedPassword: string
  ): Promise<Result<void>> {
    try {
      const query = `
        UPDATE user_authentication
        SET password = $1,
            is_temporary_flg = false,
            update_at = NOW()
        WHERE user_id = $2 AND organization_id = $3
      `;

      const result = await pool.query(query, [
        hashedPassword,
        userId,
        organizationId,
      ]);

      if (result.rowCount === 0) {
        return {
          success: false,
          error: {
            code: 'E6001',
            message: 'User authentication record not found',
          },
        };
      }

      return {
        success: true,
        data: undefined,
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
}

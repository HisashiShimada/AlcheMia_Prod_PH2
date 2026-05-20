import { Pool } from 'pg';
import type { Result } from '../types/service';
import { loadSqlFile } from '../sql/loader';

/**
 * password_reset_tokensテーブルに対するデータアクセス層
 * パスワードリセットトークンの管理を提供
 */

export interface PasswordResetToken {
  user_id: string;
  organization_id: string;
  role_cd: string;
  expires_at: Date;
  is_used: boolean;
}

export class PasswordResetTokenRepository {
  /**
   * リセットトークンで検索
   * 
   * @param pool - PostgreSQLコネクションプール
   * @param resetToken - リセットトークン
   * @returns トークン情報
   */
  async findByToken(
    pool: Pool,
    resetToken: string
  ): Promise<Result<PasswordResetToken>> {
    try {
      const query = await loadSqlFile('password_reset_tokens/findByToken.sql');

      const result = await pool.query(query, [resetToken]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: {
            code: 'E6001',
            message: 'Reset token not found',
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
   * リセットトークンを削除
   * 
   * @param pool - PostgreSQLコネクションプール
   * @param resetToken - リセットトークン
   * @returns 成功/失敗
   */
  async deleteByToken(
    pool: Pool,
    resetToken: string
  ): Promise<Result<void>> {
    try {
      const query = await loadSqlFile('password_reset_tokens/deleteByToken.sql');

      await pool.query(query, [resetToken]);

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

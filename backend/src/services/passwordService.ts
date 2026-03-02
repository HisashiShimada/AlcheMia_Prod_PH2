/**
 * passwordService - パスワードハッシュ化・検証サービス
 * 
 * Requirements: 1.1, 6.2, 7.3
 * - bcryptによるパスワードハッシュ化（Admin: 14 rounds, Others: 12 rounds）
 * - パスワード検証機能
 * - user_authenticationテーブルへの更新機能
 */

import bcrypt from 'bcrypt';
import type { Pool } from 'pg';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Result, UserRole } from '../types/service';
import { BCRYPT_ROUNDS, DEFAULT_BCRYPT_ROUNDS } from '../types/service';

/**
 * PasswordService クラス
 */
export class PasswordService {
  constructor(private pool: Pool) {}

  /**
   * パスワードをハッシュ化
   * 
   * @param password - ハッシュ化するパスワード（8-255文字）
   * @param role - ユーザーロール（オプショナル、rounds数の決定に使用）
   * @returns ハッシュ化されたパスワード
   */
  async hash(password: string, role?: string): Promise<Result<string>> {
    try {
      // バリデーション
      if (!password || password.length === 0) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password cannot be empty',
          },
        };
      }

      if (password.length < 8) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password must be at least 8 characters',
          },
        };
      }

      if (password.length > 255) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password must be less than 255 characters',
          },
        };
      }

      // ロール別のrounds数を取得
      // roleが指定されている場合はBCRYPT_ROUNDSから取得
      // 指定されていない場合はデフォルト値を使用
      const rounds = role && role in BCRYPT_ROUNDS 
        ? BCRYPT_ROUNDS[role as UserRole] 
        : DEFAULT_BCRYPT_ROUNDS;

      // bcryptでハッシュ化（非同期版）
      const hash = await bcrypt.hash(password, rounds);

      return {
        success: true,
        data: hash,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'Failed to hash password',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * パスワードを検証
   * 
   * @param userId - ユーザーID
   * @param orgId - 組織ID（マルチテナント分離）
   * @param password - 検証するパスワード
   * @returns パスワードが一致する場合true
   */
  async verify(
    userId: string,
    orgId: string,
    password: string
  ): Promise<Result<boolean>> {
    try {
      // user_authenticationテーブルからハッシュを取得
      // Parameterized Query使用、organization_idフィルタ必須
      const result = await this.pool.query(
        `SELECT password 
         FROM user_authentication 
         WHERE user_id = $1 AND organization_id = $2`,
        [userId, orgId]
      );
      console.log(result);

      // ユーザーが存在しない場合
      if (result.rows.length === 0) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        };
      }

      const storedHash = result.rows[0].password;

      // bcryptで検証（非同期版）
      const isMatch = await bcrypt.compare(password, storedHash);

      return {
        success: true,
        data: isMatch,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'Failed to verify password',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * パスワードを更新
   * 
   * @param userId - ユーザーID
   * @param orgId - 組織ID（マルチテナント分離）
   * @param newPasswordHash - 新しいパスワードのハッシュ
   * @returns 更新成功時にvoid
   */
  async update(
    userId: string,
    orgId: string,
    newPasswordHash: string
  ): Promise<Result<void>> {
    try {
      // user_authenticationテーブルを更新
      // Parameterized Query使用、organization_idフィルタ必須
      const result = await this.pool.query(
        `UPDATE user_authentication 
         SET password = $1, update_at = CURRENT_TIMESTAMP 
         WHERE user_id = $2 AND organization_id = $3`,
        [newPasswordHash, userId, orgId]
      );

      // 更新対象が存在しない場合
      if (result.rowCount === 0) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found or update failed',
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
          message: 'Failed to update password',
          originalError: error as Error,
        },
      };
    }
  }
}

/**
 * passwordService のシングルトンインスタンス
 * 実際の使用時にはpoolを注入する必要があります
 */
export const createPasswordService = (pool: Pool): PasswordService => {
  return new PasswordService(pool);
};

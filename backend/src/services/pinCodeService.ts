/**
 * pinCodeService - PINコード生成・検証サービス
 * 
 * Requirements: 1.2, 2.1, 2.4, 3.1, 8.1
 * - 6桁ランダムPINコード生成
 * - pin_codesテーブルへの保存・検索・削除
 * - 有効期限チェック（5分）
 * - 試行回数管理（最大3回）
 * - 期限切れPINコード削除
 */

import crypto from 'crypto';
import type { Pool } from 'pg';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Result, PinCodeData, UserInfo, UserRole } from '../types/service';

/**
 * PinCodeService クラス
 */
export class PinCodeService {
  private readonly PIN_EXPIRY_MINUTES = 5;
  private readonly MAX_ATTEMPTS = 3;

  constructor(private pool: Pool) {}

  /**
   * PINコードを生成して保存
   * 
   * @param userId - ユーザーID
   * @param orgId - 組織ID（マルチテナント分離）
   * @param sessionToken - 仮セッショントークン
   * @returns 生成されたPINコードと有効期限
   */
  async generateAndSave(
    userId: string,
    orgId: string,
    sessionToken: string
  ): Promise<Result<PinCodeData>> {
    try {
      // 6桁のランダムPINコード生成（100000-999999）
      const pinCode = this.generatePinCode();

      // 有効期限を5分後に設定
      const expiresAt = new Date(Date.now() + this.PIN_EXPIRY_MINUTES * 60 * 1000);

      // pin_codesテーブルに保存
      // Parameterized Query使用、organization_id含む
      const result = await this.pool.query(
        `INSERT INTO pin_codes 
         (user_id, org_id, pin_code, session_token, expires_at, attempts_count, max_attempts) 
         VALUES ($1, $2, $3, $4, $5, 0, $6)
         RETURNING pin_code, expires_at`,
        [userId, orgId, pinCode, sessionToken, expiresAt, this.MAX_ATTEMPTS]
      );

      return {
        success: true,
        data: {
          pinCode: result.rows[0].pin_code,
          expiresAt: result.rows[0].expires_at,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'Failed to generate and save PIN code',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * PINコードを検証
   * 
   * @param pinCode - 検証するPINコード
   * @param sessionToken - 仮セッショントークン
   * @returns ユーザー情報
   */
  async verify(
    pinCode: string,
    sessionToken: string
  ): Promise<Result<UserInfo>> {
    try {
      // pin_codesとorganization_userをJOINしてユーザー情報を取得
      // Parameterized Query使用
      const result = await this.pool.query(
        `SELECT 
           pc.user_id,
           pc.org_id as organization_id,
           pc.expires_at,
           pc.attempts_count,
           pc.max_attempts,
           ou.user_name as username,
           ou.mail_address as email,
           ou.role,
           ou.user_name as display_name,
           o.organization_name
         FROM pin_codes pc
         INNER JOIN organization_user ou ON pc.user_id = ou.user_id AND pc.org_id = ou.organization_id
         LEFT JOIN organization o ON pc.org_id = o.organization_id
         WHERE pc.pin_code = $1 AND pc.session_token = $2 AND pc.is_used = false`,
        [pinCode, sessionToken]
      );

      // PINコードが見つからない場合
      if (result.rows.length === 0) {
        return {
          success: false,
          error: {
            code: 'AUTH_PIN_INVALID',
            message: 'Invalid PIN code',
          },
        };
      }

      const row = result.rows[0];

      // 有効期限チェック
      const now = new Date();
      const expiresAt = new Date(row.expires_at);
      if (now > expiresAt) {
        return {
          success: false,
          error: {
            code: 'AUTH_PIN_EXPIRED',
            message: 'PIN code has expired',
          },
        };
      }

      // 試行回数チェック
      if (row.attempts_count >= row.max_attempts) {
        return {
          success: false,
          error: {
            code: 'AUTH_PIN_MAX_ATTEMPTS',
            message: 'Maximum PIN attempts exceeded',
          },
        };
      }

      // ユーザー情報を返す
      return {
        success: true,
        data: {
          id: row.user_id,
          username: row.username,
          email: row.email,
          role: row.role as UserRole,
          organizationId: row.organization_id,
          organizationName: row.organization_name || '',
          displayName: row.display_name,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'Failed to verify PIN code',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * PINコードを削除
   * 
   * @param sessionToken - 仮セッショントークン
   * @returns 削除成功時にvoid
   */
  async delete(sessionToken: string): Promise<Result<void>> {
    try {
      // pin_codesテーブルから削除
      // Parameterized Query使用
      await this.pool.query(
        `DELETE FROM pin_codes WHERE session_token = $1`,
        [sessionToken]
      );

      // 削除対象がなくても成功
      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'Failed to delete PIN code',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * 期限切れPINコードを削除
   * 定期実行用（cronジョブまたはNode.js setInterval）
   * 
   * @returns 削除件数
   */
  async deleteExpired(): Promise<Result<number>> {
    try {
      // 期限切れのPINコードを削除
      const result = await this.pool.query(
        `DELETE FROM pin_codes WHERE expires_at < CURRENT_TIMESTAMP`
      );

      return {
        success: true,
        data: result.rowCount || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'Failed to delete expired PIN codes',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * 試行回数をインクリメント
   * 
   * @param pinCode - PINコード
   * @param sessionToken - セッショントークン
   * @returns 更新成功時にvoid
   */
  async incrementAttempts(
    pinCode: string,
    sessionToken: string
  ): Promise<Result<void>> {
    try {
      // attempts_countをインクリメント
      // Parameterized Query使用
      const result = await this.pool.query(
        `UPDATE pin_codes 
         SET attempts_count = attempts_count + 1 
         WHERE pin_code = $1 AND session_token = $2`,
        [pinCode, sessionToken]
      );

      // 更新対象が存在しない場合
      if (result.rowCount === 0) {
        return {
          success: false,
          error: {
            code: 'PIN_NOT_FOUND',
            message: 'PIN code not found',
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
          message: 'Failed to increment attempts',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * 6桁のランダムPINコードを生成（プライベートメソッド）
   * 
   * @returns 6桁の数字文字列
   */
  private generatePinCode(): string {
    // crypto.randomIntで暗号学的に安全な乱数生成（100000-999999）
    const pinNumber = crypto.randomInt(100000, 1000000);
    return pinNumber.toString();
  }
}

/**
 * pinCodeService のファクトリ関数
 */
export const createPinCodeService = (pool: Pool): PinCodeService => {
  return new PinCodeService(pool);
};

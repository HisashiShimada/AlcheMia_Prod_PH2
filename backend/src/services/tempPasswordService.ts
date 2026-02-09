/**
 * 仮パスワードサービス
 * 
 * @description 仮パスワードの生成・管理機能を提供
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { getPool } from '../database/db';
import type { Result, ServiceError } from '../types/auth';

/**
 * 仮パスワードサービスクラス
 */
export class TempPasswordService {
  private readonly passwordMinLength = 8;
  private readonly passwordMaxLength = 12;
  private readonly expiryHours = 24;

  /**
   * 仮パスワード生成
   * 
   * @returns 8〜12文字のランダムな文字列（大文字・小文字・数字・記号を含む）
   */
  generateTempPassword(): string {
    const length = Math.floor(Math.random() * (this.passwordMaxLength - this.passwordMinLength + 1)) + this.passwordMinLength;
    
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    
    // 各カテゴリから最低1文字を含める
    password += uppercase[crypto.randomInt(0, uppercase.length)];
    password += lowercase[crypto.randomInt(0, lowercase.length)];
    password += numbers[crypto.randomInt(0, numbers.length)];
    password += symbols[crypto.randomInt(0, symbols.length)];
    
    // 残りの文字をランダムに追加
    for (let i = password.length; i < length; i++) {
      password += allChars[crypto.randomInt(0, allChars.length)];
    }
    
    // シャッフル
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * 仮パスワードを設定（既存パスワードを上書き）
   * 
   * @param userId - ユーザーID
   * @param organizationId - 組織ID
   * @param tempPassword - 仮パスワード（平文）
   * @returns 設定結果
   */
  async setTempPassword(
    userId: string,
    organizationId: string,
    tempPassword: string
  ): Promise<Result<void, ServiceError>> {
    const pool = getPool();

    try {
      // パスワードをハッシュ化
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      // user_authenticationテーブルを更新
      const result = await pool.query(
        `UPDATE user_authentication
         SET password = $1,
             temp_password_flag = true,
             temp_password_created_at = NOW(),
             update_at = NOW()
         WHERE user_id = $2 AND organization_id = $3`,
        [hashedPassword, userId, organizationId]
      );

      if (result.rowCount === 0) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_USER_NOT_FOUND',
            message: 'User not found'
          }
        };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'Failed to set temporary password',
          originalError: error as Error
        }
      };
    }
  }

  /**
   * 仮パスワードの有効期限チェック
   * 
   * @param createdAt - 仮パスワード生成日時
   * @returns 有効期限内ならtrue
   */
  isTempPasswordValid(createdAt: Date): boolean {
    const now = new Date();
    const expiryTime = this.expiryHours * 60 * 60 * 1000; // 24時間（ミリ秒）
    return (now.getTime() - createdAt.getTime()) < expiryTime;
  }

  /**
   * 仮パスワードフラグをクリア
   * 
   * @param userId - ユーザーID
   * @param organizationId - 組織ID
   * @returns クリア結果
   */
  async clearTempPasswordFlag(
    userId: string,
    organizationId: string
  ): Promise<Result<void, ServiceError>> {
    const pool = getPool();

    try {
      await pool.query(
        `UPDATE user_authentication
         SET temp_password_flag = false,
             temp_password_created_at = NULL,
             update_at = NOW()
         WHERE user_id = $1 AND organization_id = $2`,
        [userId, organizationId]
      );

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'Failed to clear temporary password flag',
          originalError: error as Error
        }
      };
    }
  }

  /**
   * メールアドレスをマスキング
   * 
   * @param email - メールアドレス
   * @returns マスキングされたメールアドレス（例: use***@example.com）
   */
  maskEmail(email: string): string {
    const atIndex = email.indexOf('@');
    if (atIndex <= 0) {
      return email;
    }

    const localPart = email.substring(0, atIndex);
    const domain = email.substring(atIndex);

    // ローカルパートの最初の3文字を表示、残りをマスク
    const visibleChars = Math.min(3, localPart.length);
    const maskedLocalPart = localPart.substring(0, visibleChars) + '***';

    return maskedLocalPart + domain;
  }
}

// シングルトンインスタンスをエクスポート
export const tempPasswordService = new TempPasswordService();

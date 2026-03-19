/**
 * pinExemptionService - PINコード免除判定サービス
 * 
 * 組織別のPINコード免除期間設定に基づいて、
 * ユーザーがPINコード認証をスキップできるかを判定します。
 */

import type { Pool } from 'pg';
import type { Result, PinExemptionCheck } from '../types/service';
import * as organizationRepository from '../repositories/organizationRepository';
import * as loginHistoryRepository from '../repositories/loginHistoryRepository';

/**
 * PinExemptionService クラス
 */
export class PinExemptionService {
  constructor(private pool: Pool) {}

  /**
   * PINコード免除が適用可能かを判定（新仕様）
   * 
   * 判定フロー：
   * 1. organizationテーブルからis_entryを取得
   * 2. is_entry=false → 常に免除（二段階認証不要）
   * 3. is_entry=true → 環境変数TWO_FACTOR_AUTH_EXEMPTION_DAYSを取得
   * 4. 免除期間=0日 → 常に二段階認証必要
   * 5. login_historyから最終二段階認証日時を取得（entry_execute_flg=true）
   * 6. 履歴なし → 二段階認証必要（初回ログイン）
   * 7. 経過日数 <= 免除期間 → 免除適用
   * 8. 経過日数 > 免除期間 → 二段階認証必要
   * 
   * @param userId - ユーザーID（organization_user.user_id）
   * @param organizationId - 組織ID
   * @returns 免除判定結果
   */
  async isExemptionApplicable(
    userId: string,
    organizationId: string
  ): Promise<Result<PinExemptionCheck>> {
    try {
      // 1. 組織のis_entryフラグを取得
      const isEntry = await organizationRepository.getIsEntry(
        this.pool,
        organizationId
      );

      // EMAIL_ENABLED=true または本番環境の場合は、is_entry=false でも免除しない
      // （メール送信が有効な場合は必ず二段階認証を通す）
      const emailEnabled =
        process.env.NODE_ENV === 'production' ||
        process.env.EMAIL_ENABLED === 'true';

      // is_entry=false の場合は常に免除（二段階認証不要）
      // ただし EMAIL_ENABLED=true または本番環境では免除しない
      if (!isEntry && !emailEnabled) {
        return {
          success: true,
          data: {
            isExempt: true,
            daysSinceLastLogin: null,
            exemptionPeriodDays: 0,
            reason: 'Organization does not require two-factor authentication (is_entry=false)',
          },
        };
      }

      // 2. envファイルから免除期間を取得
      const exemptionDays = parseInt(
        process.env.TWO_FACTOR_AUTH_EXEMPTION_DAYS || '0',
        10
      );

      // 免除期間が0日の場合は常に二段階認証必要
      if (exemptionDays === 0) {
        return {
          success: true,
          data: {
            isExempt: false,
            daysSinceLastLogin: null,
            exemptionPeriodDays: 0,
            reason: 'Exemption period is 0 days',
          },
        };
      }

      // 3. ユーザーの最終二段階認証日時を取得
      const lastAuthLogin = await loginHistoryRepository.getLastTwoFactorAuthLogin(
        this.pool,
        userId,
        organizationId
      );

      if (!lastAuthLogin) {
        return {
          success: true,
          data: {
            isExempt: false,
            daysSinceLastLogin: null,
            exemptionPeriodDays: exemptionDays,
            reason: 'No previous two-factor authentication history',
          },
        };
      }

      // 4. 経過日数を計算
      const daysSince = this.calculateDaysSinceLastLogin(lastAuthLogin.login_at);

      // 5. 免除期間内かどうかを判定
      const isExempt = daysSince <= exemptionDays;

      return {
        success: true,
        data: {
          isExempt,
          daysSinceLastLogin: daysSince,
          exemptionPeriodDays: exemptionDays,
          reason: isExempt
            ? `Within exemption period (${daysSince} days since last two-factor auth)`
            : `Exemption period expired (${daysSince} days > ${exemptionDays} days)`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'Failed to check PIN exemption',
          originalError: error as Error,
        },
      };
    }
  }

  /**
   * 最終ログイン日時からの経過日数を計算（プライベートメソッド）
   * 
   * @param lastLoginAt - 最終ログイン日時
   * @returns 経過日数（整数）
   */
  private calculateDaysSinceLastLogin(lastLoginAt: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - lastLoginAt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}

/**
 * pinExemptionService のファクトリ関数
 */
export const createPinExemptionService = (pool: Pool): PinExemptionService => {
  return new PinExemptionService(pool);
};

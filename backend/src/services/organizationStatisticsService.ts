/**
 * 組織統計情報サービス
 * ビジネスロジック層
 *
 * 以下の3つのデータソースから統計情報を取得する：
 * - Redis: アクティブセッション数（組織IDでフィルタ）
 * - PostgreSQL: 組織利用者数・プロジェクト数
 * - StorageService: ストレージ使用量（組織IDフォルダ配下の合計）
 */

import { RefreshTokenService } from './refreshTokenService';
import { getStorageService } from './storageService';
import * as organizationStatisticsRepository from '../repositories/organizationStatisticsRepository';

/**
 * 組織統計情報レスポンス型
 */
export interface OrganizationStatisticsResponse {
  storage: {
    used: number;
    total: number;
    unit: string;
    usageRate: number;
  };
  projects: {
    count: number;
    total: number;
  };
  activeUsers: {
    count: number;
    total: number;
  };
}

/**
 * バイトをGBに変換
 *
 * @param bytes バイト数
 * @returns GB値（小数点4桁）
 */
function bytesToGB(bytes: number): number {
  const gb = bytes / (1024 * 1024 * 1024);
  return parseFloat(gb.toFixed(8));
}

/**
 * 組織統計情報を取得
 *
 * @param organizationId 組織ID
 * @returns 組織統計情報
 */
export async function getOrganizationStatistics(
  organizationId: string
): Promise<OrganizationStatisticsResponse> {
  // 環境変数から上限値を取得
  const maxProjects = parseFloat(process.env.MAX_PROJECTS_PER_ORG || '999');
  const maxStorageGB = parseFloat(process.env.MAX_STORAGE_GB_PER_ORG || '999.0');

  // 並列でデータ取得
  const [
    totalUsers,
    projectCount,
    storageUsedBytes,
    activeSessionCount,
  ] = await Promise.all([
    // 1. organization_userテーブルから組織利用者数を取得（アクティブユーザーの分母）
    organizationStatisticsRepository.countOrganizationUsers(organizationId),

    // 2. projectテーブルから組織のプロジェクト数を取得（プロジェクト数の分子）
    organizationStatisticsRepository.countProjects(organizationId),

    // 3. StorageServiceから組織フォルダ配下の合計サイズを取得（ストレージの分子）
    getStorageUsedBytes(organizationId),

    // 4. Redisから組織のアクティブセッション数を取得（アクティブユーザーの分子）
    getActiveSessionCount(organizationId),
  ]);

  const storageUsedGB = bytesToGB(storageUsedBytes);
  const usageRate = maxStorageGB > 0 ? storageUsedGB / maxStorageGB : 0;

  return {
    storage: {
      used: storageUsedGB,
      total: maxStorageGB,
      unit: 'GB',
      usageRate: parseFloat(usageRate.toFixed(6)),
    },
    projects: {
      count: projectCount,
      total: maxProjects,
    },
    activeUsers: {
      count: activeSessionCount,
      total: totalUsers,
    },
  };
}

/**
 * StorageServiceから組織フォルダ配下の合計バイト数を取得
 *
 * @param organizationId 組織ID
 * @returns 合計バイト数
 */
async function getStorageUsedBytes(organizationId: string): Promise<number> {
  try {
    const storageService = getStorageService();
    // 組織IDフォルダ配下のすべてのファイルを取得
    // maxKeysは十分大きな値を設定（デフォルト500では不足する可能性がある）
    const files = await storageService.listFiles(organizationId, '', 10000);
    const totalBytes = files.reduce((sum, file) => sum + (file.size || 0), 0);
    return totalBytes;
  } catch (error) {
    // ストレージ接続エラーは0として扱う（サービス継続のため）
    console.warn('[organizationStatisticsService] Storage usage fetch failed:', error);
    return 0;
  }
}

/**
 * Redisから組織のアクティブセッション数を取得
 *
 * @param organizationId 組織ID
 * @returns アクティブセッション数（Redis未接続時は0）
 */
async function getActiveSessionCount(organizationId: string): Promise<number> {
  try {
    const refreshTokenService = new RefreshTokenService();
    const tokensResult = await refreshTokenService.getAllActiveTokens();

    if (!tokensResult.success) {
      console.warn('[organizationStatisticsService] Failed to get active tokens from Redis');
      return 0;
    }

    // 組織IDでフィルタしてカウント
    const orgTokens = tokensResult.data.filter(
      (token) => token.organizationId === organizationId
    );

    return orgTokens.length;
  } catch (error) {
    // Redis未接続時は0として扱う（サービス継続のため）
    console.warn('[organizationStatisticsService] Redis session count fetch failed:', error);
    return 0;
  }
}

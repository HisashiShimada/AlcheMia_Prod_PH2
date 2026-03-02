/**
 * システム概要サービス
 * システム概要画面に必要な統計情報を集約して返す
 */

import * as systemOverviewRepository from '../repositories/systemOverviewRepository';
import { RefreshTokenService } from './refreshTokenService';
import { getStorageService } from './storageService';
import { logError } from '../utils/logger';

/**
 * システム概要レスポンスの型定義
 */
export interface SystemOverviewData {
  users: {
    total: number;
    active: number;
  };
  sessions: {
    total: number;
  };
  experimentSystem: {
    totalProjects: number;
    planning: number;
    inProgress: number;
    completed: number;
  };
  storage: {
    totalFiles: number;
    usedCapacityGB: number;
  };
  loginLast7Days: {
    total: number;
    success: number;
    failed: number;
  };
}

/**
 * システム概要統計を取得
 *
 * @param organizationId 組織ID（ログインユーザーのorganization_id）
 * @returns システム概要データ
 */
export async function getSystemOverview(organizationId: string): Promise<SystemOverviewData> {
  // 並列でDB・Redis・ストレージから取得
  const [
    userStats,
    projectStats,
    loginStats,
    activeTokens,
    storageFiles,
  ] = await Promise.all([
    // ユーザー統計（DB）
    systemOverviewRepository.getUserStats(organizationId),
    // プロジェクト統計（DB）
    systemOverviewRepository.getProjectStats(organizationId),
    // ログイン統計（DB）
    systemOverviewRepository.getLoginStats(organizationId),
    // セッション統計（Redis）
    getSessionCount(organizationId),
    // ストレージ統計（Swift/S3）
    getStorageStats(organizationId),
  ]);

  return {
    users: {
      total: userStats.total,
      active: userStats.active,
    },
    sessions: {
      total: activeTokens,
    },
    experimentSystem: {
      totalProjects: projectStats.total,
      planning: projectStats.planning,
      inProgress: projectStats.in_progress,
      completed: projectStats.completed,
    },
    storage: {
      totalFiles: storageFiles.totalFiles,
      usedCapacityGB: storageFiles.usedCapacityGB,
    },
    loginLast7Days: {
      total: loginStats.total,
      success: loginStats.success,
      failed: loginStats.failed,
    },
  };
}

/**
 * RedisのアクティブセッションをorganizationIdでフィルタしてカウント
 *
 * @param organizationId 組織ID
 * @returns アクティブセッション数
 */
async function getSessionCount(organizationId: string): Promise<number> {
  try {
    const refreshTokenService = new RefreshTokenService();
    const result = await refreshTokenService.getAllActiveTokens();
    if (!result.success) {
      return 0;
    }
    return result.data.filter(token => token.organizationId === organizationId).length;
  } catch (error) {
    logError('Failed to get session count', error as Error, {
      action: 'get_session_count',
      organizationId,
    });
    return 0;
  }
}

/**
 * Swift/S3からストレージ統計を取得
 * organizationId配下のフォルダを除いた実ファイルのみをカウント・集計
 *
 * @param organizationId 組織ID
 * @returns ストレージ統計（ファイル数、使用容量GB）
 */
async function getStorageStats(organizationId: string): Promise<{ totalFiles: number; usedCapacityGB: number }> {
  try {
    const storageService = getStorageService();
    // buildKey() 内で {organizationId}/ プレフィックスを自動付与するため、
    // 対象は {organizationId}/ フォルダ配下のオブジェクトのみに限定される
    const allObjects = await storageService.listFiles(organizationId, '');

    // フォルダオブジェクト（key が "/" で終わるもの）と
    // フォルダ作成時に自動生成されるプレースホルダー（.keep）を除外して実ファイルのみ対象
    const actualFiles = allObjects.filter(f => !f.key.endsWith('/') && !f.key.endsWith('.keep'));

    const totalFiles = actualFiles.length;
    const totalBytes = actualFiles.reduce((sum, f) => sum + (f.size || 0), 0);
    const usedCapacityGB = parseFloat((totalBytes / 1073741824).toFixed(3)); // GB、小数点3桁

    return { totalFiles, usedCapacityGB };
  } catch (error) {
    logError('Failed to get storage stats', error as Error, {
      action: 'get_storage_stats',
      organizationId,
    });
    return { totalFiles: 0, usedCapacityGB: 0 };
  }
}

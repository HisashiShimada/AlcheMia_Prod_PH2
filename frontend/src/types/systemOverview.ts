/**
 * システム概要の型定義
 */

/**
 * システム概要データ
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

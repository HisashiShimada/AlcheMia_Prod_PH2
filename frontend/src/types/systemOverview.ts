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
    contractedUsers: number | null;
  };
  sessions: {
    total: number;
  };
  experimentSystem: {
    totalProjects: number;
    planning: number;
    inProgress: number;
    completed: number;
    contractedProjects: number | null;
  };
  storage: {
    totalFiles: number;
    usedCapacityGB: number;
    contractCapacityGB: number | null;
  };
  loginLast7Days: {
    total: number;
    success: number;
    failed: number;
  };
}

import type { Priority, InstructionType } from '@/types/experimentWorker';

/**
 * 優先度に対応する色を取得
 */
export const getPriorityColor = (priority: Priority): string => {
  const colors: Record<Priority, string> = {
    high: '#dc2626',
    medium: '#f59e0b',
    normal: '#9ca3af',
    low: '#3b82f6'
  };
  return colors[priority];
};

/**
 * 優先度のラベルを取得
 */
export const getPriorityLabel = (priority: Priority): string => {
  const labels: Record<Priority, string> = {
    high: '高',
    medium: '中',
    normal: '通常',
    low: '低'
  };
  return labels[priority];
};

/**
 * 指示タイプのラベルを取得
 */
export const getTypeLabel = (type: InstructionType): string => {
  const labels: Record<InstructionType, string> = {
    safety: '⚠️ 安全',
    setup: '🔧 セットアップ',
    measurement: '📊 測定',
    cleanup: '🧹 清掃',
    general: '📋 一般',
  };
  return labels[type];
};

/**
 * 相対時間のフォーマット
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'たった今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  return date.toLocaleDateString('ja-JP');
};

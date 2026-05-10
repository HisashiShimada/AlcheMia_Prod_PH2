/**
 * ユーティリティ関数: データフォーマッター
 */
import { getTranslation } from '@/contexts/LanguageContext';

/**
 * ファイルサイズを人間が読みやすい形式に変換
 * @param bytes バイト数
 * @returns フォーマットされたサイズ文字列
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${Math.round((bytes / Math.pow(k, i)) * 10) / 10} ${sizes[i]}`;
};

/**
 * 日時を相対的な表現に変換
 * @param dateString ISO形式の日時文字列
 * @returns フォーマットされた日時文字列
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return getTranslation('formatters.justNow');
  if (diffMins < 60) return getTranslation('formatters.minutesAgo').replace('{n}', String(diffMins));
  if (diffHours < 24) return getTranslation('formatters.hoursAgo').replace('{n}', String(diffHours));
  if (diffDays === 1) return getTranslation('formatters.yesterday');
  if (diffDays < 7) return getTranslation('formatters.daysAgo').replace('{n}', String(diffDays));
  
  // 1週間以上前は日付を表示
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}/${month}/${day}`;
};

/**
 * ステータスを日本語に変換
 * @param status ステータス値
 * @returns 日本語のステータス文字列
 */
export const formatProjectStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'active': getTranslation('formatters.status.active'),
    'completed': getTranslation('formatters.status.completed'),
    'on_hold': getTranslation('formatters.status.onHold'),
    'archived': getTranslation('formatters.status.archived'),
  };

  return statusMap[status] || status;
};

/**
 * ファイルタイプに応じたアイコン名を取得
 * @param type ファイルタイプ
 * @returns Lucide Reactのアイコン名
 */
export const getFileIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    'maiml': 'FileCode',
    'pdf': 'FileText',
    'excel': 'FileSpreadsheet',
    'csv': 'Table',
    'archive': 'Archive',
    'image': 'Image',
    'video': 'Video',
    'audio': 'Music'
  };
  
  return iconMap[type] || 'File';
};

/**
 * ステータスに応じた色を取得
 * @param status ステータス値
 * @returns Material-UIのカラー名
 */
export const getStatusColor = (status: string): 'success' | 'default' | 'warning' | 'error' => {
  const colorMap: Record<string, 'success' | 'default' | 'warning' | 'error'> = {
    'active': 'success',
    'completed': 'default',
    'on_hold': 'warning',
    'archived': 'error'
  };
  
  return colorMap[status] || 'default';
};

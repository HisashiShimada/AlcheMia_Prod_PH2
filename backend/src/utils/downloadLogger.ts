/**
 * ダウンロード履歴ログ記録機能
 * 
 * タスク1.3: ダウンロード履歴ログ記録機能の実装
 * Requirements: 6 (ダウンロード履歴の記録)
 * 
 * Winstonロガーを使用してダウンロード履歴を記録し、
 * Admin権限ユーザーの操作をadmin_audit_logテーブルに保存します。
 */

import { getPool } from '../database/db';
import { randomBytes } from 'crypto';

/**
 * ダウンロード履歴ログデータ
 */
export interface DownloadLogData {
  userId: string;
  organizationId: string;
  projectId: string;
  fileName: string;
  requestId?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * 一括ダウンロード履歴ログデータ
 */
export interface BulkDownloadLogData {
  userId: string;
  organizationId: string;
  projectId: string;
  fileCount: number;
  totalSize: number;
  requestId?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * リクエストIDを生成
 * 
 * @returns req_プレフィックスを持つユニークなID
 * 
 * @example
 * ```typescript
 * const requestId = generateRequestId();
 * // => 'req_a1b2c3d4e5f6'
 * ```
 */
export function generateRequestId(): string {
  const randomPart = randomBytes(8).toString('hex');
  return `req_${randomPart}`;
}

/**
 * 単一ファイルダウンロード履歴を記録
 * 
 * ログはコンソールに出力され、Admin権限ユーザーの場合は
 * admin_audit_logテーブルにも記録されます。
 * 
 * @param data - ダウンロードログデータ
 * 
 * @example
 * ```typescript
 * await logDownloadHistory({
 *   userId: 'user_123',
 *   organizationId: 'org_456',
 *   projectId: 'project_789',
 *   fileName: 'file.maiml',
 *   requestId: 'req_abc123',
 *   userRole: 'admin',
 * });
 * ```
 */
export async function logDownloadHistory(
  data: DownloadLogData
): Promise<void> {
  const timestamp = new Date().toISOString();
  const requestId = data.requestId || generateRequestId();

  // コンソールログに出力
  const logObject = {
    userId: data.userId,
    organizationId: data.organizationId,
    projectId: data.projectId,
    fileName: data.fileName,
    requestId,
    timestamp,
  };

  console.log('[DOWNLOAD]', logObject);

  // Admin権限ユーザーの場合は監査ログに記録
  if (data.userRole === 'admin') {
    try {
      await saveAdminAuditLog({
        userId: data.userId,
        organizationId: data.organizationId,
        action: 'FILE_DOWNLOAD',
        details: {
          projectId: data.projectId,
          fileName: data.fileName,
          requestId,
        },
        ipAddress: data.ipAddress || 'unknown',
        userAgent: data.userAgent || 'unknown',
      });
    } catch (error) {
      console.error('Failed to save admin audit log:', error);
      // エラーが発生してもログ記録自体は継続
    }
  }
}

/**
 * 一括ダウンロード履歴を記録
 * 
 * @param data - 一括ダウンロードログデータ
 * 
 * @example
 * ```typescript
 * await logBulkDownloadHistory({
 *   userId: 'user_123',
 *   organizationId: 'org_456',
 *   projectId: 'project_789',
 *   fileCount: 10,
 *   totalSize: 1024000,
 *   requestId: 'req_bulk123',
 *   userRole: 'manager',
 * });
 * ```
 */
export async function logBulkDownloadHistory(
  data: BulkDownloadLogData
): Promise<void> {
  const timestamp = new Date().toISOString();
  const requestId = data.requestId || generateRequestId();

  // コンソールログに出力
  const logObject = {
    userId: data.userId,
    organizationId: data.organizationId,
    projectId: data.projectId,
    fileCount: data.fileCount,
    totalSize: data.totalSize,
    requestId,
    timestamp,
  };

  console.log('[BULK_DOWNLOAD]', logObject);

  // Admin権限ユーザーの場合は監査ログに記録
  if (data.userRole === 'admin') {
    try {
      await saveAdminAuditLog({
        userId: data.userId,
        organizationId: data.organizationId,
        action: 'BULK_FILE_DOWNLOAD',
        details: {
          projectId: data.projectId,
          fileCount: data.fileCount,
          totalSize: data.totalSize,
          requestId,
        },
        ipAddress: data.ipAddress || 'unknown',
        userAgent: data.userAgent || 'unknown',
      });
    } catch (error) {
      console.error('Failed to save admin audit log:', error);
      // エラーが発生してもログ記録自体は継続
    }
  }
}

/**
 * 管理者監査ログをデータベースに保存
 * 
 * @param data - 監査ログデータ
 */
async function saveAdminAuditLog(data: {
  userId: string;
  organizationId: string;
  action: string;
  details: any;
  ipAddress: string;
  userAgent: string;
}): Promise<void> {
  const pool = getPool();
  
  const query = `
    INSERT INTO admin_audit_log (
      user_id,
      organization_id,
      action,
      details,
      ip_address,
      user_agent,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
  `;

  const values = [
    data.userId,
    data.organizationId,
    data.action,
    JSON.stringify(data.details),
    data.ipAddress,
    data.userAgent,
  ];

  await pool.query(query, values);
}

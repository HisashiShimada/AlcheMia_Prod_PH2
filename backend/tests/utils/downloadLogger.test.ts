/**
 * ダウンロード履歴ログ記録機能のテスト
 * 
 * タスク1.3: ダウンロード履歴ログ記録機能の実装
 * Requirements: 6 (ダウンロード履歴の記録)
 */

import {
  logDownloadHistory,
  logBulkDownloadHistory,
  generateRequestId,
} from '../../src/utils/downloadLogger';
import { getPool } from '../../src/database/db';

// データベース接続のモック
jest.mock('../../src/database/db');

describe('Download Logger', () => {
  let mockQuery: jest.Mock;

  beforeEach(() => {
    // モックのリセット
    mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
    });

    // コンソールのモック（ログ出力を抑制）
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateRequestId', () => {
    it('req_ プレフィックスを持つIDを生成する', () => {
      const requestId = generateRequestId();
      
      expect(requestId).toMatch(/^req_[a-z0-9]+$/);
    });

    it('毎回異なるIDを生成する', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      
      expect(id1).not.toBe(id2);
    });

    it('IDの長さが適切である（20文字程度）', () => {
      const requestId = generateRequestId();
      
      expect(requestId.length).toBeGreaterThan(10);
      expect(requestId.length).toBeLessThan(50);
    });
  });

  describe('logDownloadHistory', () => {
    const mockLogData = {
      userId: 'user_123',
      organizationId: 'org_456',
      projectId: 'project_789',
      fileName: 'test_file.maiml',
      requestId: 'req_abc123',
    };

    it('ログ情報を正しく記録する', async () => {
      await logDownloadHistory(mockLogData);
      
      // コンソールログが呼ばれることを確認
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[DOWNLOAD]'),
        expect.objectContaining({
          userId: 'user_123',
          organizationId: 'org_456',
          projectId: 'project_789',
          fileName: 'test_file.maiml',
          requestId: 'req_abc123',
          timestamp: expect.any(String),
        })
      );
    });

    it('タイムスタンプが ISO 8601 形式である', async () => {
      await logDownloadHistory(mockLogData);
      
      const logCall = (console.log as jest.Mock).mock.calls[0];
      const logObject = logCall[1];
      
      expect(logObject.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it('requestId が省略された場合は自動生成する', async () => {
      const dataWithoutRequestId = {
        userId: 'user_123',
        organizationId: 'org_456',
        projectId: 'project_789',
        fileName: 'test_file.maiml',
      };
      
      await logDownloadHistory(dataWithoutRequestId);
      
      const logCall = (console.log as jest.Mock).mock.calls[0];
      const logObject = logCall[1];
      
      expect(logObject.requestId).toMatch(/^req_[a-z0-9]+$/);
    });
  });

  describe('logBulkDownloadHistory', () => {
    const mockBulkLogData = {
      userId: 'user_123',
      organizationId: 'org_456',
      projectId: 'project_789',
      fileCount: 5,
      totalSize: 1024000,
      requestId: 'req_bulk123',
    };

    it('一括ダウンロードのログ情報を記録する', async () => {
      await logBulkDownloadHistory(mockBulkLogData);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[BULK_DOWNLOAD]'),
        expect.objectContaining({
          userId: 'user_123',
          organizationId: 'org_456',
          projectId: 'project_789',
          fileCount: 5,
          totalSize: 1024000,
          requestId: 'req_bulk123',
          timestamp: expect.any(String),
        })
      );
    });

    it('fileCount と totalSize が数値として記録される', async () => {
      // モックをクリア
      (console.log as jest.Mock).mockClear();
      
      await logBulkDownloadHistory(mockBulkLogData);
      
      // console.logが呼ばれていることを確認
      expect(console.log).toHaveBeenCalledTimes(1);
      
      const logCall = (console.log as jest.Mock).mock.calls[0];
      const logObject = logCall[1];
      
      expect(logObject.fileCount).toBe(5);
      expect(logObject.totalSize).toBe(1024000);
      expect(typeof logObject.fileCount).toBe('number');
      expect(typeof logObject.totalSize).toBe('number');
    });
  });

  describe('Admin audit log recording', () => {
    it('Admin権限ユーザーの単一ダウンロードを監査ログに記録する', async () => {
      const adminLogData = {
        userId: 'admin_user_123',
        organizationId: 'org_456',
        projectId: 'project_789',
        fileName: 'sensitive_file.maiml',
        requestId: 'req_admin123',
        userRole: 'admin',
      };
      
      await logDownloadHistory(adminLogData);
      
      // admin_audit_log テーブルへの挿入を確認
      expect(mockQuery).toHaveBeenCalled();
      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[0]).toContain('INSERT INTO admin_audit_log');
      expect(callArgs[1][0]).toBe('admin_user_123');
      expect(callArgs[1][1]).toBe('org_456');
      expect(callArgs[1][2]).toBe('FILE_DOWNLOAD');
      
      // detailsはJSON文字列として保存される
      const details = JSON.parse(callArgs[1][3]);
      expect(details.projectId).toBe('project_789');
      expect(details.fileName).toBe('sensitive_file.maiml');
      expect(details.requestId).toBe('req_admin123');
    });

    it('Admin権限ユーザーの一括ダウンロードを監査ログに記録する', async () => {
      const adminBulkLogData = {
        userId: 'admin_user_123',
        organizationId: 'org_456',
        projectId: 'project_789',
        fileCount: 10,
        totalSize: 5120000,
        requestId: 'req_admin_bulk123',
        userRole: 'admin',
      };
      
      await logBulkDownloadHistory(adminBulkLogData);
      
      // admin_audit_log テーブルへの挿入を確認
      expect(mockQuery).toHaveBeenCalled();
      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[0]).toContain('INSERT INTO admin_audit_log');
      expect(callArgs[1][0]).toBe('admin_user_123');
      expect(callArgs[1][1]).toBe('org_456');
      expect(callArgs[1][2]).toBe('BULK_FILE_DOWNLOAD');
      
      // detailsはJSON文字列として保存される
      const details = JSON.parse(callArgs[1][3]);
      expect(details.projectId).toBe('project_789');
      expect(details.fileCount).toBe(10);
      expect(details.totalSize).toBe(5120000);
      expect(details.requestId).toBe('req_admin_bulk123');
    });

    it('Admin以外のユーザーは監査ログに記録されない', async () => {
      const managerLogData = {
        userId: 'manager_123',
        organizationId: 'org_456',
        projectId: 'project_789',
        fileName: 'file.maiml',
        requestId: 'req_mgr123',
        userRole: 'manager',
      };
      
      await logDownloadHistory(managerLogData);
      
      // admin_audit_log への挿入が呼ばれないことを確認
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('データベースエラー時もログ記録は継続する', async () => {
      // データベースエラーをシミュレート
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));
      
      const adminLogData = {
        userId: 'admin_user_123',
        organizationId: 'org_456',
        projectId: 'project_789',
        fileName: 'file.maiml',
        userRole: 'admin',
      };
      
      // エラーがスローされないことを確認
      await expect(logDownloadHistory(adminLogData)).resolves.not.toThrow();
      
      // エラーログが記録されることを確認
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save admin audit log'),
        expect.any(Error)
      );
    });
  });

  describe('Error handling', () => {
    it('必須フィールドが欠けている場合でもエラーをスローしない', async () => {
      const incompleteData: any = {
        userId: 'user_123',
        // organizationId と projectId が欠けている
      };
      
      await expect(logDownloadHistory(incompleteData)).resolves.not.toThrow();
    });

    it('無効なデータ型でもエラーをスローしない', async () => {
      const invalidData: any = {
        userId: 123, // 数値（本来は文字列）
        organizationId: null,
        projectId: undefined,
        fileName: {},
      };
      
      await expect(logDownloadHistory(invalidData)).resolves.not.toThrow();
    });
  });
});

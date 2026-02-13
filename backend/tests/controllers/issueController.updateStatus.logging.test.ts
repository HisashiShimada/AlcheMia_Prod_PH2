/**
 * IssueController.updateStatus - 構造化ログ記録テスト
 * 
 * タスク4.1: 構造化ログの記録内容検証
 * - ステータス変更リクエスト時に requestId、userId、organizationId、issueId、status がログに記録されること
 * - 成功時に infoレベルのログが記録されること
 * - エラー時に errorレベルのログが記録され、スタックトレースが含まれること
 * - ログフォーマットが構造化ログ形式に準拠していること
 */

import { Request, Response } from 'express';
import * as issueController from '../../src/controllers/issueController';
import { IssueService } from '../../src/services/issueService';
import { logger, logError } from '../../src/utils/logger';

// モック化
jest.mock('../../src/services/issueService');
jest.mock('../../src/utils/logger', () => {
  const actualLogger = jest.requireActual('../../src/utils/logger');
  return {
    ...actualLogger,
    logger: {
      ...actualLogger.logger,
      info: jest.fn(),
      error: jest.fn(),
    },
    logError: jest.fn(),
  };
});

// UUID v4を実際に生成するヘルパー（既存テストと同じパターン）
let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => {
    uuidCounter++;
    // UUID v4形式の文字列を生成（テスト用）
    const hex = uuidCounter.toString(16).padStart(12, '0');
    return `12345678-1234-4${hex.substring(0, 3)}-a${hex.substring(3, 6)}-${hex.substring(6, 12)}${uuidCounter.toString(16).padStart(6, '0')}`;
  }),
}));

describe('IssueController.updateStatus - 構造化ログ記録 (Task 4.1)', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
    uuidCounter = 0;

    // レスポンスモックの設定
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    // リクエストモックの基本設定
    mockRequest = {
      user: {
        userId: 'test_user_001',
        organizationId: 'test_org_001',
        role: 'manager',
      } as any,
      params: {
        issueId: 'test_issue_001',
      },
      body: {
        status: 'resolved',
      },
    };
  });

  describe('✅ リクエスト受信時のログ記録', () => {
    it('should log request with requestId, userId, organizationId, issueId, status', async () => {
      // Arrange
      const mockServiceResult = {
        success: true,
        data: {
          id: 'test_issue_001',
          status: 'resolved',
          resolvedBy: 'test_user_001',
          resolvedByName: 'Test User',
          resolvedAt: '2026-02-13T06:30:00.000Z',
          updatedAt: '2026-02-13T06:30:00.000Z',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert: logger.info が呼ばれたことを確認
      expect(logger.info).toHaveBeenCalledWith(
        'Issue status update request received',
        expect.objectContaining({
          action: 'issue_updateStatus',
          requestId: expect.any(String),
          userId: 'test_user_001',
          organizationId: 'test_org_001',
          issueId: 'test_issue_001',
          status: 'resolved',
        })
      );
    });

    it('should generate requestId in UUID format', async () => {
      // Arrange
      const mockServiceResult = {
        success: true,
        data: {
          id: 'test_issue_001',
          status: 'resolved',
          resolvedBy: 'test_user_001',
          resolvedByName: 'Test User',
          resolvedAt: '2026-02-13T06:30:00.000Z',
          updatedAt: '2026-02-13T06:30:00.000Z',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert: requestIdがUUID形式であることを確認
      const logCall = (logger.info as jest.Mock).mock.calls[0];
      const context = logCall[1];
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(context.requestId).toMatch(uuidRegex);
    });
  });

  describe('✅ 成功時のログ記録', () => {
    it('should log success with info level when status update succeeds', async () => {
      // Arrange
      const mockServiceResult = {
        success: true,
        data: {
          id: 'test_issue_001',
          status: 'resolved',
          resolvedBy: 'test_user_001',
          resolvedByName: 'Test User',
          resolvedAt: '2026-02-13T06:30:00.000Z',
          updatedAt: '2026-02-13T06:30:00.000Z',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert: 成功ログが記録されること
      expect(logger.info).toHaveBeenCalledWith(
        'Issue status update successful',
        expect.objectContaining({
          action: 'issue_updateStatus',
          requestId: expect.any(String),
          userId: 'test_user_001',
          organizationId: 'test_org_001',
          issueId: 'test_issue_001',
          status: 'resolved',
          newStatus: 'resolved',
        })
      );
    });

    it('should log resolvedBy when status changes to resolved', async () => {
      // Arrange
      const mockServiceResult = {
        success: true,
        data: {
          id: 'test_issue_001',
          status: 'resolved',
          resolvedBy: 'test_user_001',
          resolvedByName: 'Test User',
          resolvedAt: '2026-02-13T06:30:00.000Z',
          updatedAt: '2026-02-13T06:30:00.000Z',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert: resolvedByがログに含まれること
      expect(logger.info).toHaveBeenCalledWith(
        'Issue status update successful',
        expect.objectContaining({
          resolvedBy: 'test_user_001',
        })
      );
    });
  });

  describe('❌ エラー時のログ記録', () => {
    it('should log error with stack trace when system error occurs', async () => {
      // Arrange
      const systemError = new Error('Database connection failed');
      systemError.stack = 'Error: Database connection failed\n    at Object.<anonymous> (/app/test.js:10:15)';

      (IssueService.prototype.updateStatus as jest.Mock).mockRejectedValue(systemError);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert: logErrorが呼ばれ、スタックトレースが含まれること
      expect(logError).toHaveBeenCalledWith(
        'Issue updateStatus error',
        systemError,
        expect.objectContaining({
          action: 'issue_updateStatus',
          organizationId: 'test_org_001',
          issueId: 'test_issue_001',
          requestId: expect.any(String),
        })
      );
    });

    it('should log request even when 404 error occurs', async () => {
      // Arrange
      const mockServiceResult = {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Issue not found or does not belong to your organization',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      mockRequest.params = { issueId: 'nonexistent_issue' };

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert: リクエスト受信ログは記録されること
      expect(logger.info).toHaveBeenCalledWith(
        'Issue status update request received',
        expect.objectContaining({
          action: 'issue_updateStatus',
          issueId: 'nonexistent_issue',
        })
      );
    });

    it('should log request even when validation error occurs', async () => {
      // Arrange
      const mockServiceResult = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status value',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert: リクエスト受信ログは記録されること
      expect(logger.info).toHaveBeenCalledWith(
        'Issue status update request received',
        expect.objectContaining({
          action: 'issue_updateStatus',
        })
      );
    });
  });

  describe('✅ ログフォーマット検証', () => {
    it('should include action field in all logs', async () => {
      // Arrange
      const mockServiceResult = {
        success: true,
        data: {
          id: 'test_issue_001',
          status: 'resolved',
          resolvedBy: 'test_user_001',
          resolvedByName: 'Test User',
          resolvedAt: '2026-02-13T06:30:00.000Z',
          updatedAt: '2026-02-13T06:30:00.000Z',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert: すべてのログにactionフィールドがあること
      const allInfoCalls = (logger.info as jest.Mock).mock.calls;
      allInfoCalls.forEach(([_message, context]: [string, any]) => {
        expect(context).toHaveProperty('action');
        expect(context.action).toBe('issue_updateStatus');
      });
    });

    it('should include requestId field in all logs', async () => {
      // Arrange
      const mockServiceResult = {
        success: true,
        data: {
          id: 'test_issue_001',
          status: 'resolved',
          resolvedBy: 'test_user_001',
          resolvedByName: 'Test User',
          resolvedAt: '2026-02-13T06:30:00.000Z',
          updatedAt: '2026-02-13T06:30:00.000Z',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert: すべてのログにrequestIdフィールドがあること
      const allInfoCalls = (logger.info as jest.Mock).mock.calls;
      allInfoCalls.forEach(([_message, context]: [string, any]) => {
        expect(context).toHaveProperty('requestId');
        expect(typeof context.requestId).toBe('string');
        expect(context.requestId.length).toBeGreaterThan(0);
      });
    });

    it('should use same requestId for request and success logs', async () => {
      // Arrange
      const mockServiceResult = {
        success: true,
        data: {
          id: 'test_issue_001',
          status: 'resolved',
          resolvedBy: 'test_user_001',
          resolvedByName: 'Test User',
          resolvedAt: '2026-02-13T06:30:00.000Z',
          updatedAt: '2026-02-13T06:30:00.000Z',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert: requestIdが同じであること
      const allInfoCalls = (logger.info as jest.Mock).mock.calls;
      expect(allInfoCalls.length).toBeGreaterThanOrEqual(2);

      const requestLogContext = allInfoCalls[0][1];
      const successLogContext = allInfoCalls[1][1];

      expect(requestLogContext.requestId).toBe(successLogContext.requestId);
    });
  });

  describe('✅ 構造化ログの完全性', () => {
    it('should include all required fields in request log', async () => {
      // Arrange
      const mockServiceResult = {
        success: true,
        data: {
          id: 'test_issue_001',
          status: 'resolved',
          resolvedBy: 'test_user_001',
          resolvedByName: 'Test User',
          resolvedAt: '2026-02-13T06:30:00.000Z',
          updatedAt: '2026-02-13T06:30:00.000Z',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert: 必須フィールド検証
      const requestLogContext = (logger.info as jest.Mock).mock.calls[0][1];

      expect(requestLogContext).toHaveProperty('action');
      expect(requestLogContext).toHaveProperty('requestId');
      expect(requestLogContext).toHaveProperty('userId');
      expect(requestLogContext).toHaveProperty('organizationId');
      expect(requestLogContext).toHaveProperty('issueId');
      expect(requestLogContext).toHaveProperty('status');

      // 値の型検証
      expect(typeof requestLogContext.action).toBe('string');
      expect(typeof requestLogContext.requestId).toBe('string');
      expect(typeof requestLogContext.userId).toBe('string');
      expect(typeof requestLogContext.organizationId).toBe('string');
      expect(typeof requestLogContext.issueId).toBe('string');
      expect(typeof requestLogContext.status).toBe('string');
    });

    it('should include all required fields in success log', async () => {
      // Arrange
      const mockServiceResult = {
        success: true,
        data: {
          id: 'test_issue_001',
          status: 'resolved',
          resolvedBy: 'test_user_001',
          resolvedByName: 'Test User',
          resolvedAt: '2026-02-13T06:30:00.000Z',
          updatedAt: '2026-02-13T06:30:00.000Z',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert: 必須フィールド検証
      const successLogContext = (logger.info as jest.Mock).mock.calls[1][1];

      expect(successLogContext).toHaveProperty('action');
      expect(successLogContext).toHaveProperty('requestId');
      expect(successLogContext).toHaveProperty('userId');
      expect(successLogContext).toHaveProperty('organizationId');
      expect(successLogContext).toHaveProperty('issueId');
      expect(successLogContext).toHaveProperty('status');
      expect(successLogContext).toHaveProperty('newStatus');
    });
  });
});

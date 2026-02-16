/**
 * IssueController.updateStatus - 単体テスト (Task 5.1)
 * 
 * 要件:
 * - ServiceResult.success = true の場合に200レスポンスが返ること
 * - ServiceResult.error.code = 'RESOURCE_NOT_FOUND' の場合に404レスポンスが返ること
 * - ServiceResult.error.code = 'VALIDATION_ERROR' の場合に400レスポンスが返ること
 * - Winstonロガーが適切に呼び出されること
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

// UUID v4を実際に生成するヘルパー
let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => {
    uuidCounter++;
    const hex = uuidCounter.toString(16).padStart(12, '0');
    return `12345678-1234-4${hex.substring(0, 3)}-a${hex.substring(3, 6)}-${hex.substring(6, 12)}${uuidCounter.toString(16).padStart(6, '0')}`;
  }),
}));

describe('IssueController.updateStatus - 単体テスト (Task 5.1)', () => {
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

  describe('✅ ServiceResult.success = true の場合に200レスポンスが返ること', () => {
    it('should return 200 OK when ServiceResult.success is true', async () => {
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

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockServiceResult.data,
          meta: expect.objectContaining({
            timestamp: expect.any(String),
            requestId: expect.any(String),
          }),
        })
      );
    });

    it('should include all data fields in response when success', async () => {
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

      // Assert
      const responseCall = mockJson.mock.calls[0][0];
      expect(responseCall.data).toEqual(mockServiceResult.data);
      expect(responseCall.data.id).toBe('test_issue_001');
      expect(responseCall.data.status).toBe('resolved');
      expect(responseCall.data.resolvedBy).toBe('test_user_001');
      expect(responseCall.data.resolvedByName).toBe('Test User');
      expect(responseCall.data.resolvedAt).toBe('2026-02-13T06:30:00.000Z');
      expect(responseCall.data.updatedAt).toBe('2026-02-13T06:30:00.000Z');
    });
  });

  describe('❌ ServiceResult.error.code = "RESOURCE_NOT_FOUND" の場合に404レスポンスが返ること', () => {
    it('should return 404 Not Found when ServiceResult.error.code is RESOURCE_NOT_FOUND', async () => {
      // Arrange
      const mockServiceResult = {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Issue not found or does not belong to your organization',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Issue not found or does not belong to your organization',
          },
          meta: expect.objectContaining({
            timestamp: expect.any(String),
            requestId: expect.any(String),
          }),
        })
      );
    });

    it('should not log success when 404 error occurs', async () => {
      // Arrange
      const mockServiceResult = {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Issue not found',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      const successLogCalls = (logger.info as jest.Mock).mock.calls.filter(
        ([message]: [string]) => message === 'Issue status update successful'
      );
      expect(successLogCalls).toHaveLength(0);
    });
  });

  describe('❌ ServiceResult.error.code = "VALIDATION_ERROR" の場合に400レスポンスが返ること', () => {
    it('should return 400 Bad Request when ServiceResult.error.code is VALIDATION_ERROR', async () => {
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

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status value',
          },
          meta: expect.objectContaining({
            timestamp: expect.any(String),
            requestId: expect.any(String),
          }),
        })
      );
    });

    it('should handle VALIDATION_ERROR with details field', async () => {
      // Arrange
      const mockServiceResult = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: [
            {
              field: 'status',
              message: 'Invalid status value',
              code: 'INVALID_VALUE',
            },
          ],
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      const responseCall = mockJson.mock.calls[0][0];
      expect(responseCall.error.details).toEqual(mockServiceResult.error.details);
    });

    it('should not log success when validation error occurs', async () => {
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

      // Assert
      const successLogCalls = (logger.info as jest.Mock).mock.calls.filter(
        ([message]: [string]) => message === 'Issue status update successful'
      );
      expect(successLogCalls).toHaveLength(0);
    });
  });

  describe('✅ Winstonロガーが適切に呼び出されること', () => {
    it('should call logger.info with request details on every request', async () => {
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

      // Assert
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

    it('should call logger.info with success details when operation succeeds', async () => {
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

      // Assert
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
          resolvedBy: 'test_user_001',
        })
      );
    });

    it('should call logError when system exception occurs', async () => {
      // Arrange
      const systemError = new Error('Database connection failed');
      (IssueService.prototype.updateStatus as jest.Mock).mockRejectedValue(systemError);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
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

    it('should not call logError when business logic error occurs (404, 400)', async () => {
      // Arrange
      const mockServiceResult = {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Issue not found',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(logError).not.toHaveBeenCalled();
    });
  });

  describe('✅ エラーコードからHTTPステータスコードへのマッピング', () => {
    it('should return 403 for PERMISSION_INSUFFICIENT', async () => {
      // Arrange
      const mockServiceResult = {
        success: false,
        error: {
          code: 'PERMISSION_INSUFFICIENT',
          message: 'Only managers and admins can change issue status',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(403);
    });

    it('should return 500 for SYSTEM_ERROR', async () => {
      // Arrange
      const mockServiceResult = {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'システムエラーが発生しました',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
    });

    it('should return 500 for unknown error code', async () => {
      // Arrange
      const mockServiceResult = {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Unknown error occurred',
        },
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue(mockServiceResult);

      // Act
      await issueController.updateStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('✅ IssueServiceの呼び出し検証', () => {
    it('should call IssueService.updateStatus with correct parameters', async () => {
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

      // Assert
      expect(IssueService.prototype.updateStatus).toHaveBeenCalledWith(
        'test_org_001',
        'test_issue_001',
        'test_user_001',
        'resolved'
      );
    });

    it('should call IssueService.updateStatus exactly once per request', async () => {
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

      // Assert
      expect(IssueService.prototype.updateStatus).toHaveBeenCalledTimes(1);
    });
  });
});

/**
 * TaskController ユニットテスト
 * 
 * @description タスクステータス更新のリクエスト処理テスト
 * Task: 2.1, 2.2 コントローラー層実装
 */

import { Request, Response } from 'express';
import { updateStatus } from '../../src/controllers/taskController';
import * as taskService from '../../src/services/taskService';
import * as logger from '../../src/utils/logger';

// taskServiceをモック
jest.mock('../../src/services/taskService');

// loggerをモック
jest.mock('../../src/utils/logger');

// uuidをモック
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-request-id-456')
}));

describe('TaskController - updateStatus', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    // モックのリセット
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      params: {
        projectId: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
        methodId: 'method1',
        taskNo: '1'
      },
      body: {
        status: 'in_progress',
        currentUpdateAt: '2026-01-28T08:00:00Z'
      },
      user: {
        userId: 'user123',
        organizationId: 'org123',
        role: 'experiment_worker',
        sessionId: 'session123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400
      }
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_TOKEN_INVALID',
            message: expect.stringContaining('認証が必要です')
          })
        })
      );
    });
  });

  describe('Parameter Validation', () => {
    it('should return 400 when projectId is not UUID format', async () => {
      // Arrange
      mockRequest.params = {
        ...mockRequest.params,
        projectId: 'invalid-uuid'
      };

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_INVALID_FORMAT',
            message: expect.stringContaining('UUID形式')
          })
        })
      );
    });

    it('should return 400 when taskNo is not a number', async () => {
      // Arrange
      mockRequest.params = {
        ...mockRequest.params,
        taskNo: 'abc'
      };

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_INVALID_FORMAT',
            message: expect.stringContaining('taskNo')
          })
        })
      );
    });

    it('should return 400 when taskNo is less than 1', async () => {
      // Arrange
      mockRequest.params = {
        ...mockRequest.params,
        taskNo: '0'
      };

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_INVALID_FORMAT',
            message: expect.stringContaining('taskNo')
          })
        })
      );
    });
  });

  describe('Success Cases', () => {
    it('should return 200 with updated task when service succeeds', async () => {
      // Arrange
      const mockTaskData = {
        organizationId: 'org123',
        projectId: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
        projectName: 'Test Project',
        methodId: 'method1',
        taskNo: 1,
        taskStatus: 'in_progress' as const,
        experimentUserId: 'user123',
        experimentUserName: 'Test User',
        experimentStartAt: '2026-01-28T08:00:00Z',
        experimentEndAt: null,
        updateAt: '2026-01-28T08:00:00Z'
      };

      (taskService.updateTaskStatus as jest.Mock).mockResolvedValue({
        success: true,
        data: mockTaskData
      });

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        'org123',
        'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
        'method1',
        1,
        'user123',
        'experiment_worker',
        'in_progress',
        '2026-01-28T08:00:00Z',
        undefined
      );

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockTaskData,
        meta: {
          timestamp: expect.any(String),
          requestId: 'test-request-id-456'
        }
      });
    });

    it('should pass comment parameter when provided', async () => {
      // Arrange
      mockRequest.body = {
        ...mockRequest.body,
        comment: 'タスクを開始しました'
      };

      (taskService.updateTaskStatus as jest.Mock).mockResolvedValue({
        success: true,
        data: {}
      });

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith(
        'org123',
        'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
        'method1',
        1,
        'user123',
        'experiment_worker',
        'in_progress',
        '2026-01-28T08:00:00Z',
        'タスクを開始しました'
      );
    });
  });

  describe('Service Error Handling', () => {
    it('should return 404 when service returns RESOURCE_NOT_FOUND', async () => {
      // Arrange
      (taskService.updateTaskStatus as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'タスクが見つかりません'
        }
      });

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'RESOURCE_NOT_FOUND'
          })
        })
      );
    });

    it('should return 403 when service returns PERMISSION_INSUFFICIENT', async () => {
      // Arrange
      (taskService.updateTaskStatus as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'PERMISSION_INSUFFICIENT',
          message: 'このタスクを更新する権限がありません'
        }
      });

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(403);
    });

    it('should return 400 when service returns INVALID_STATUS_TRANSITION', async () => {
      // Arrange
      (taskService.updateTaskStatus as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: '不正な状態遷移です'
        }
      });

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 409 when service returns CONCURRENT_UPDATE_DETECTED', async () => {
      // Arrange
      (taskService.updateTaskStatus as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'CONCURRENT_UPDATE_DETECTED',
          message: 'タスクが他のユーザーによって更新されました'
        }
      });

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(409);
    });

    it('should return 500 when service returns SYSTEM_DATABASE_ERROR', async () => {
      // Arrange
      (taskService.updateTaskStatus as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました'
        }
      });

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
    });

    it('should return 500 for unexpected errors', async () => {
      // Arrange
      (taskService.updateTaskStatus as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'SYSTEM_ERROR'
          })
        })
      );
    });
  });

  describe('Request ID Generation', () => {
    it('should include requestId in response meta', async () => {
      // Arrange
      (taskService.updateTaskStatus as jest.Mock).mockResolvedValue({
        success: true,
        data: {}
      });

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            requestId: 'test-request-id-456'
          })
        })
      );
    });
  });

  describe('Logging - Task 2.2', () => {
    beforeEach(() => {
      // ロガーモックをリセット
      jest.clearAllMocks();
    });

    it('should log info when task status update succeeds', async () => {
      // Arrange
      const mockTaskData = {
        organizationId: 'org123',
        projectId: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
        projectName: 'Test Project',
        methodId: 'method1',
        taskNo: 1,
        taskStatus: 'in_progress' as const,
        experimentUserId: 'user123',
        experimentUserName: 'Test User',
        experimentStartAt: '2026-01-28T08:00:00Z',
        experimentEndAt: null,
        updateAt: '2026-01-28T08:00:00Z'
      };

      (taskService.updateTaskStatus as jest.Mock).mockResolvedValue({
        success: true,
        data: mockTaskData
      });

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(logger.logger.info).toHaveBeenCalledWith(
        'Task status updated successfully',
        expect.objectContaining({
          organizationId: 'org123',
          userId: 'user123',
          projectId: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
          methodId: 'method1',
          taskNo: 1,
          status: 'in_progress',
          requestId: 'test-request-id-456'
        })
      );
    });

    it('should log error when service returns error', async () => {
      // Arrange
      (taskService.updateTaskStatus as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'タスクが見つかりません'
        }
      });

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(logger.logger.error).toHaveBeenCalledWith(
        'Task status update failed',
        expect.objectContaining({
          organizationId: 'org123',
          userId: 'user123',
          projectId: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
          methodId: 'method1',
          taskNo: 1,
          errorCode: 'RESOURCE_NOT_FOUND',
          errorMessage: 'タスクが見つかりません',
          requestId: 'test-request-id-456'
        })
      );
    });

    it('should log error when unexpected exception occurs', async () => {
      // Arrange
      const mockError = new Error('Unexpected database error');
      (taskService.updateTaskStatus as jest.Mock).mockRejectedValue(mockError);

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(logger.logger.error).toHaveBeenCalledWith(
        'Task updateStatus unexpected error',
        expect.objectContaining({
          organizationId: 'org123',
          userId: 'user123',
          projectId: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
          methodId: 'method1',
          taskNo: 1,
          requestId: 'test-request-id-456',
          errorMessage: 'Unexpected database error',
          errorStack: expect.any(String)
        })
      );
    });

    it('should not expose stack trace in error response', async () => {
      // Arrange
      const mockError = new Error('Database connection failed');
      mockError.stack = 'Error: Database connection failed\n  at someFunction...';
      (taskService.updateTaskStatus as jest.Mock).mockRejectedValue(mockError);

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'SYSTEM_ERROR',
            message: 'システムエラーが発生しました'
          })
        })
      );
      
      // エラーレスポンスにスタックトレースが含まれていないことを確認
      const responseCall = mockJson.mock.calls[0][0];
      expect(responseCall.error).not.toHaveProperty('stack');
      expect(responseCall.error.message).not.toContain('at someFunction');
    });

    it('should log with comment when provided', async () => {
      // Arrange
      mockRequest.body = {
        ...mockRequest.body,
        comment: 'タスクを開始しました'
      };

      (taskService.updateTaskStatus as jest.Mock).mockResolvedValue({
        success: true,
        data: {}
      });

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(logger.logger.info).toHaveBeenCalledWith(
        'Task status updated successfully',
        expect.objectContaining({
          comment: 'タスクを開始しました'
        })
      );
    });

    it('should log validation errors with error level', async () => {
      // Arrange
      mockRequest.params = {
        ...mockRequest.params,
        projectId: 'invalid-uuid'
      };

      // Act
      await updateStatus(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(logger.logger.error).toHaveBeenCalledWith(
        'Task status update validation failed',
        expect.objectContaining({
          errorCode: 'VALIDATION_INVALID_FORMAT',
          errorMessage: 'projectIdはUUID形式である必要があります',
          requestId: 'test-request-id-456'
        })
      );
    });
  });
});
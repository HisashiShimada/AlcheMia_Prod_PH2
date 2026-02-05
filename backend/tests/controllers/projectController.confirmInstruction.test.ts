/**
 * ProjectController.confirmInstruction ユニットテスト
 * 
 * @description 指示確認APIのリクエスト処理テスト
 * Task: 4.3 Controller層テスト実装
 * API: 2.14 指示確認完了
 */

import { Request, Response } from 'express';
import { confirmInstruction } from '../../src/controllers/projectController';
import { ProjectService } from '../../src/services/projectService';

// ProjectServiceをモック
jest.mock('../../src/services/projectService');

// uuidをモック
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-request-id-123')
}));

// loggerをモック
jest.mock('../../src/utils/logger', () => ({
  logError: jest.fn()
}));

describe('ProjectController - confirmInstruction', () => {
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
        projectName: 'test-project',
        instructionId: '123e4567-e89b-12d3-a456-426614174000'
      },
      user: {
        userId: 'user123',
        organizationId: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
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

  describe('正常系', () => {
    it('should confirm instruction successfully', async () => {
      // Arrange
      const mockResult = {
        success: true,
        data: {
          historyId: 'hist123',
          instructionId: '123e4567-e89b-12d3-a456-426614174000',
          acknowledgedUserId: 'user123',
          acknowledgedUserName: 'Test User',
          acknowledgedAt: '2026-01-31T10:00:00.000Z'
        }
      };

      (ProjectService.prototype.confirmInstruction as jest.Mock).mockResolvedValue(mockResult);

      // Act
      await confirmInstruction(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(ProjectService.prototype.confirmInstruction).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        'user123',
        'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
        'experiment_worker'
      );

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockResult.data,
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: 'test-request-id-123'
        })
      });
    });
  });

  describe('バリデーションエラー', () => {
    it('should return 400 when projectName is missing', async () => {
      // Arrange
      mockRequest.params = { projectName: '', instructionId: '123e4567-e89b-12d3-a456-426614174000' };

      // Act
      await confirmInstruction(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_REQUIRED_FIELD',
            message: 'projectNameは必須です'
          })
        })
      );
    });

    it('should return 400 when instructionId is not UUID format', async () => {
      // Arrange
      mockRequest.params = { projectName: 'test-project', instructionId: 'invalid-uuid' };

      // Act
      await confirmInstruction(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_INVALID_FORMAT',
            message: 'instructionIdはUUID形式である必要があります',
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'instructionId',
                code: 'INVALID_FORMAT'
              })
            ])
          })
        })
      );
    });
  });

  describe('サービス層エラー', () => {
    it('should return 404 when instruction not found', async () => {
      // Arrange
      (ProjectService.prototype.confirmInstruction as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: '指示が見つかりません'
        }
      });

      // Act
      await confirmInstruction(mockRequest as Request, mockResponse as Response);

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

    it('should return 400 when instruction already acknowledged', async () => {
      // Arrange
      (ProjectService.prototype.confirmInstruction as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'BUSINESS_ALREADY_ACKNOWLEDGED',
          message: 'この指示は既に確認済みです'
        }
      });

      // Act
      await confirmInstruction(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'BUSINESS_ALREADY_ACKNOWLEDGED'
          })
        })
      );
    });

    it('should return 403 when permission insufficient', async () => {
      // Arrange
      (ProjectService.prototype.confirmInstruction as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'PERMISSION_INSUFFICIENT',
          message: '権限が不足しています'
        }
      });

      // Act
      await confirmInstruction(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'PERMISSION_INSUFFICIENT'
          })
        })
      );
    });

    it('should return 500 when database error occurs', async () => {
      // Arrange
      (ProjectService.prototype.confirmInstruction as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました'
        }
      });

      // Act
      await confirmInstruction(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'SYSTEM_DATABASE_ERROR'
          })
        })
      );
    });
  });

  describe('例外処理', () => {
    it('should handle unexpected errors', async () => {
      // Arrange
      const testError = new Error('Unexpected error');
      (ProjectService.prototype.confirmInstruction as jest.Mock).mockRejectedValue(testError);

      // Act
      await confirmInstruction(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'SYSTEM_ERROR',
            message: 'システムエラーが発生しました'
          })
        })
      );
    });
  });

  describe('パラメータ渡し', () => {
    it('should pass correct parameters to service layer', async () => {
      // Arrange
      mockRequest.user = {
        userId: 'worker123',
        organizationId: 'org456',
        role: 'experiment_worker',
        sessionId: 'session123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400
      };
      mockRequest.params = {
        projectName: 'my-project',
        instructionId: '987e6543-e21b-12d3-a456-426614174999'
      };

      (ProjectService.prototype.confirmInstruction as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          historyId: 'hist999',
          instructionId: '987e6543-e21b-12d3-a456-426614174999',
          acknowledgedUserId: 'worker123',
          acknowledgedUserName: 'Worker User',
          acknowledgedAt: '2026-01-31T12:00:00.000Z'
        }
      });

      // Act
      await confirmInstruction(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(ProjectService.prototype.confirmInstruction).toHaveBeenCalledWith(
        '987e6543-e21b-12d3-a456-426614174999',
        'worker123',
        'org456',
        'experiment_worker'
      );

      expect(mockStatus).toHaveBeenCalledWith(200);
    });
  });
});
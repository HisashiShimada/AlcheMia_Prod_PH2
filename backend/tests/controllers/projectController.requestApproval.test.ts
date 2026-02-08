/**
 * ProjectController.requestApproval ユニットテスト
 * 
 * @description 承認依頼エンドポイントのバリデーション処理テスト
 * Task: 2.1 リクエストバリデーションとパラメータ抽出
 * Task: 2.2 レスポンス生成とエラーハンドリング
 * Requirements: 1, 4, 8, 10, 14
 */

import { Request, Response } from 'express';
import { requestApproval } from '../../src/controllers/projectController';
import { ProjectService } from '../../src/services/projectService';

// ProjectServiceをモック
jest.mock('../../src/services/projectService');

// uuidをモック
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-request-id-123')
}));

describe('ProjectController.requestApproval', () => {
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
        projectId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' // 有効なUUID
      },
      body: {},
      headers: {},
      user: {
        userId: 'user-uuid-123',
        organizationId: 'org-uuid-456',
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

  describe('Task 2.1: バリデーション: projectId', () => {
    it('should return 400 when projectId is not a valid UUID', async () => {
      // Arrange
      mockRequest.params = { projectId: 'invalid-uuid' };

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_INVALID_FORMAT',
            message: expect.stringContaining('UUID形式'),
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'projectId',
                code: 'INVALID_FORMAT'
              })
            ])
          })
        })
      );
    });

    it('should accept valid UUID format for projectId', async () => {
      // Arrange
      const validUuid = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
      mockRequest.params = { projectId: validUuid };

      (ProjectService.prototype.requestApproval as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          project_id: validUuid,
          project_name: 'Test Project',
          previous_status: 'active',
          new_status: 'waiting_approval',
          requested_by: 'user-uuid-123',
          requested_by_name: 'Test User',
          requested_at: new Date().toISOString(),
          comment: null
        }
      });

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
    });
  });

  describe('Task 2.1: バリデーション: comment', () => {
    it('should accept request without comment', async () => {
      // Arrange
      mockRequest.body = {};

      (ProjectService.prototype.requestApproval as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          project_id: mockRequest.params!.projectId,
          project_name: 'Test Project',
          previous_status: 'active',
          new_status: 'waiting_approval',
          requested_by: 'user-uuid-123',
          requested_by_name: 'Test User',
          requested_at: new Date().toISOString(),
          comment: null
        }
      });

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(ProjectService.prototype.requestApproval).toHaveBeenCalledWith(
        mockRequest.params!.projectId,
        null,
        mockRequest.user!.organizationId,
        mockRequest.user!.userId
      );
    });

    it('should accept comment with valid length (< 1000 chars)', async () => {
      // Arrange
      const validComment = 'Valid comment text';
      mockRequest.body = { comment: validComment };

      (ProjectService.prototype.requestApproval as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          project_id: mockRequest.params!.projectId,
          project_name: 'Test Project',
          previous_status: 'active',
          new_status: 'waiting_approval',
          requested_by: 'user-uuid-123',
          requested_by_name: 'Test User',
          requested_at: new Date().toISOString(),
          comment: validComment
        }
      });

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(ProjectService.prototype.requestApproval).toHaveBeenCalledWith(
        mockRequest.params!.projectId,
        validComment,
        mockRequest.user!.organizationId,
        mockRequest.user!.userId
      );
    });

    it('should return 400 when comment exceeds 1000 characters', async () => {
      // Arrange
      const longComment = 'a'.repeat(1001);
      mockRequest.body = { comment: longComment };

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_STRING_TOO_LONG',
            message: expect.stringContaining('1000文字以内'),
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'comment',
                code: 'STRING_TOO_LONG'
              })
            ])
          })
        })
      );
    });

    it('should accept comment with exactly 1000 characters', async () => {
      // Arrange
      const maxComment = 'a'.repeat(1000);
      mockRequest.body = { comment: maxComment };

      (ProjectService.prototype.requestApproval as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          project_id: mockRequest.params!.projectId,
          project_name: 'Test Project',
          previous_status: 'active',
          new_status: 'waiting_approval',
          requested_by: 'user-uuid-123',
          requested_by_name: 'Test User',
          requested_at: new Date().toISOString(),
          comment: maxComment
        }
      });

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
    });
  });

  describe('Task 2.1: 認証チェック', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_TOKEN_INVALID',
            message: expect.stringContaining('認証')
          })
        })
      );
    });
  });

  describe('Task 2.1: パラメータ抽出', () => {
    it('should extract userId, organizationId from req.user', async () => {
      // Arrange
      (ProjectService.prototype.requestApproval as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          project_id: mockRequest.params!.projectId,
          project_name: 'Test Project',
          previous_status: 'active',
          new_status: 'waiting_approval',
          requested_by: 'user-uuid-123',
          requested_by_name: 'Test User',
          requested_at: new Date().toISOString(),
          comment: null
        }
      });

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(ProjectService.prototype.requestApproval).toHaveBeenCalledWith(
        mockRequest.params!.projectId,
        null,
        'org-uuid-456', // organizationId
        'user-uuid-123'  // userId
      );
    });
  });

  describe('Task 2.2: レスポンス生成（成功時）', () => {
    it('should return 200 with success response when service succeeds', async () => {
      // Arrange
      const mockServiceData = {
        project_id: mockRequest.params!.projectId,
        project_name: 'Sample Project',
        previous_status: 'active',
        new_status: 'waiting_approval',
        requested_by: 'user-uuid-123',
        requested_by_name: 'Test User',
        requested_at: '2026-01-28T10:00:00.000Z',
        comment: 'Test comment'
      };

      (ProjectService.prototype.requestApproval as jest.Mock).mockResolvedValue({
        success: true,
        data: mockServiceData
      });

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockServiceData,
          meta: expect.objectContaining({
            timestamp: expect.any(String),
            requestId: 'test-request-id-123'
          })
        })
      );
    });

    it('should include all required data fields in response', async () => {
      // Arrange
      (ProjectService.prototype.requestApproval as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          project_id: mockRequest.params!.projectId,
          project_name: 'Sample Project',
          previous_status: 'active',
          new_status: 'waiting_approval',
          requested_by: 'user-uuid-123',
          requested_by_name: 'Test User',
          requested_at: '2026-01-28T10:00:00.000Z',
          comment: null
        }
      });

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            project_id: expect.any(String),
            project_name: expect.any(String),
            previous_status: expect.any(String),
            new_status: expect.any(String),
            requested_by: expect.any(String),
            requested_by_name: expect.any(String),
            requested_at: expect.any(String)
          })
        })
      );
    });

    it('should include meta fields (timestamp, requestId) in response', async () => {
      // Arrange
      (ProjectService.prototype.requestApproval as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          project_id: mockRequest.params!.projectId,
          project_name: 'Test Project',
          previous_status: 'active',
          new_status: 'waiting_approval',
          requested_by: 'user-uuid-123',
          requested_by_name: 'Test User',
          requested_at: new Date().toISOString(),
          comment: null
        }
      });

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: {
            timestamp: expect.any(String),
            requestId: 'test-request-id-123'
          }
        })
      );
    });
  });

  describe('Task 2.2: エラーハンドリング', () => {
    it('should return 404 when project not found', async () => {
      // Arrange
      (ProjectService.prototype.requestApproval as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'プロジェクトが見つかりません'
        }
      });

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'RESOURCE_NOT_FOUND',
            message: 'プロジェクトが見つかりません'
          })
        })
      );
    });

    it('should return 409 when project status is invalid (BUSINESS_ error)', async () => {
      // Arrange
      (ProjectService.prototype.requestApproval as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'BUSINESS_STATUS_INVALID',
          message: 'プロジェクトステータスがactiveではありません',
          details: {
            currentStatus: 'archived'
          }
        }
      });

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'BUSINESS_STATUS_INVALID',
            message: expect.any(String),
            details: expect.any(Object)
          })
        })
      );
    });

    it('should return 500 when database error occurs', async () => {
      // Arrange
      (ProjectService.prototype.requestApproval as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました'
        }
      });

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'SYSTEM_DATABASE_ERROR',
            message: expect.any(String)
          })
        })
      );
    });

    it('should return 400 when validation error occurs (VALIDATION_ error)', async () => {
      // Arrange
      (ProjectService.prototype.requestApproval as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラー'
        }
      });

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should include error details in response when provided', async () => {
      // Arrange
      (ProjectService.prototype.requestApproval as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'BUSINESS_STATUS_INVALID',
          message: 'エラーメッセージ',
          details: {
            field: 'project_status',
            current: 'archived',
            required: 'active'
          }
        }
      });

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              field: 'project_status',
              current: 'archived',
              required: 'active'
            })
          })
        })
      );
    });

    it('should handle unexpected errors with 500 status', async () => {
      // Arrange
      (ProjectService.prototype.requestApproval as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

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
});
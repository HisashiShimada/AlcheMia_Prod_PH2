/**
 * ProjectController.requestApproval エッジケーステスト
 * 
 * @description Task 6.2.2-6.2.4: エッジケースと詳細検証
 * Requirements: 1, 4, 8, 10, 14
 */

import { Request, Response } from 'express';
import { requestApproval } from '../../src/controllers/projectController';
import { ProjectService } from '../../src/services/projectService';

// ProjectServiceをモック
jest.mock('../../src/services/projectService');

// uuidをモック
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-request-id-edge-case-123')
}));

describe('ProjectController.requestApproval - Edge Cases', () => {
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

  describe('Task 6.2.2: comment エッジケース', () => {
    it('should accept empty string comment', async () => {
      // Arrange: RED - 空文字列をテスト
      mockRequest.body = { comment: '' };

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
          comment: null // 空文字列はnullに変換される
        }
      });

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert: 空文字列はnullとしてServiceに渡される
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(ProjectService.prototype.requestApproval).toHaveBeenCalledWith(
        mockRequest.params!.projectId,
        null, // '' || null = null
        mockRequest.user!.organizationId,
        mockRequest.user!.userId
      );
    });

    it('should accept whitespace-only comment', async () => {
      // Arrange: RED - スペースのみをテスト
      mockRequest.body = { comment: '   ' };

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
          comment: '   ' // スペースはそのまま渡される
        }
      });

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert: スペースはそのままServiceに渡される
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(ProjectService.prototype.requestApproval).toHaveBeenCalledWith(
        mockRequest.params!.projectId,
        '   ',
        mockRequest.user!.organizationId,
        mockRequest.user!.userId
      );
    });

    it('should accept null comment explicitly', async () => {
      // Arrange: RED - 明示的なnullをテスト
      mockRequest.body = { comment: null };

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

    it('should accept comment with special characters', async () => {
      // Arrange: RED - 特殊文字を含むコメントをテスト
      const specialComment = '実験完了しました！結果: 良好 (90%)、次回は改善予定。\n追記: 温度調整が必要';
      mockRequest.body = { comment: specialComment };

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
          comment: specialComment
        }
      });

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(ProjectService.prototype.requestApproval).toHaveBeenCalledWith(
        mockRequest.params!.projectId,
        specialComment,
        mockRequest.user!.organizationId,
        mockRequest.user!.userId
      );
    });
  });

  describe('Task 6.2.3: projectId エッジケース', () => {
    it('should return 400 when projectId is empty string', async () => {
      // Arrange: RED - 空文字列のprojectIdをテスト
      mockRequest.params = { projectId: '' };

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

    it('should return 400 when projectId contains whitespace', async () => {
      // Arrange: RED - スペース含むUUIDをテスト
      mockRequest.params = { projectId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d ' };

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_INVALID_FORMAT',
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'projectId'
              })
            ])
          })
        })
      );
    });
  });

  describe('Task 6.2.4: レスポンスフィールドの詳細検証', () => {
    it('should return timestamp in ISO 8601 format', async () => {
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

      // Assert: ISO 8601形式（YYYY-MM-DDTHH:mm:ss.sssZ）
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
          })
        })
      );
    });

    it('should return requestId as string (UUID v4)', async () => {
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
          meta: expect.objectContaining({
            requestId: 'test-request-id-edge-case-123'
          })
        })
      );
    });

    it('should include all required fields in data object', async () => {
      // Arrange
      const completeData = {
        project_id: mockRequest.params!.projectId,
        project_name: 'Complete Test Project',
        previous_status: 'active',
        new_status: 'waiting_approval',
        requested_by: 'user-uuid-123',
        requested_by_name: 'Test User Name',
        requested_at: '2026-01-28T12:00:00.000Z',
        comment: 'Complete comment'
      };

      (ProjectService.prototype.requestApproval as jest.Mock).mockResolvedValue({
        success: true,
        data: completeData
      });

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert: すべてのフィールドが存在し、正しい型であることを検証
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            project_id: expect.any(String),
            project_name: expect.any(String),
            previous_status: 'active',
            new_status: 'waiting_approval',
            requested_by: expect.any(String),
            requested_by_name: expect.any(String),
            requested_at: expect.any(String),
            comment: expect.any(String)
          }
        })
      );
    });

    it('should handle comment as null in data object', async () => {
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
          comment: null // nullケース
        }
      });

      // Act
      await requestApproval(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            comment: null
          })
        })
      );
    });
  });

  describe('Task 6.2.4: エラーレスポンスの詳細検証', () => {
    it('should include meta fields in error response', async () => {
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

      // Assert: エラーレスポンスにもmetaフィールドが含まれる
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(Object),
          meta: expect.objectContaining({
            timestamp: expect.any(String),
            requestId: expect.any(String)
          })
        })
      );
    });

    it('should map error codes to correct HTTP status codes', async () => {
      // Arrange: 各エラーコードのマッピングをテスト
      const errorMappings = [
        { code: 'RESOURCE_NOT_FOUND', status: 404, message: 'Not found' },
        { code: 'BUSINESS_STATUS_INVALID', status: 409, message: 'Conflict' },
        { code: 'VALIDATION_ERROR', status: 400, message: 'Validation error' },
        { code: 'SYSTEM_DATABASE_ERROR', status: 500, message: 'Database error' },
        { code: 'UNKNOWN_ERROR', status: 500, message: 'Unknown error' }
      ];

      for (const mapping of errorMappings) {
        jest.clearAllMocks();
        mockStatus.mockReturnValue({ json: mockJson });

        (ProjectService.prototype.requestApproval as jest.Mock).mockResolvedValue({
          success: false,
          error: {
            code: mapping.code,
            message: mapping.message
          }
        });

        // Act
        await requestApproval(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(mockStatus).toHaveBeenCalledWith(mapping.status);
      }
    });
  });
});
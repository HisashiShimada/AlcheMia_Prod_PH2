/**
 * ProjectController ユニットテスト
 * 
 * @description プロジェクト一覧取得のリクエスト処理テスト
 * Task: 2.1, 2.2, 2.3 Controller層実装
 */

import { Request, Response } from 'express';
import { list } from '../../src/controllers/projectController';
import { ProjectService } from '../../src/services/projectService';

// ProjectServiceをモック
jest.mock('../../src/services/projectService');

// uuidをモック
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-request-id-123')
}));

describe('ProjectController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    // モックのリセット
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      query: {},
      headers: {},
      user: {
        userId: 'user123',
        organizationId: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
        role: 'experiment_admin',
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

  describe('list', () => {
    it('should return project list with default pagination', async () => {
      // Arrange
      const mockProjects = {
        projects: [
          {
            organizationId: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
            projectId: 'proj1',
            projectName: 'Project 1',
            description: 'Test project',
            departmentId: null,
            ownerUserId: 'user123',
            projectStatus: 1,
            projectMaimlFlg: true,
            checkoutStatus: 0,
            createAt: '2026-01-05T10:00:00.000Z',
            taskCount: 3
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      (ProjectService.prototype.list as jest.Mock).mockResolvedValue({
        success: true,
        data: mockProjects
      });

      // Act
      await list(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockProjects.projects,
        pagination: mockProjects.pagination,
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: expect.any(String)
        })
      });
    });

    it('should validate page parameter is positive integer', async () => {
      // Arrange
      mockRequest.query = { page: '-1' };

      // Act
      await list(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('ページ番号')
          })
        })
      );
    });

    it('should validate limit parameter is within range (1-100)', async () => {
      // Arrange
      mockRequest.query = { limit: '150' };

      // Act
      await list(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('limit')
          })
        })
      );
    });

    it('should validate sort_by parameter allowed values', async () => {
      // Arrange
      mockRequest.query = { sort_by: 'invalid_column' };

      // Act
      await list(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('sort_by')
          })
        })
      );
    });

    it('should validate order parameter allowed values', async () => {
      // Arrange
      mockRequest.query = { order: 'invalid' };

      // Act
      await list(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('order')
          })
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await list(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_TOKEN_INVALID'
          })
        })
      );
    });

    it('should handle service layer errors', async () => {
      // Arrange
      (ProjectService.prototype.list as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'Database connection failed'
        }
      });

      // Act
      await list(mockRequest as Request, mockResponse as Response);

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

    it('should pass includeCompleted parameter to service', async () => {
      // Arrange
      mockRequest.query = { include_completed: 'true' };

      (ProjectService.prototype.list as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          projects: [],
          pagination: {
            page: 1,
            limit: 20,
            totalItems: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      });

      // Act
      await list(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(ProjectService.prototype.list).toHaveBeenCalledWith(
        'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
        expect.objectContaining({
          includeCompleted: true
        })
      );
    });

    it('should use organization_id from authenticated user', async () => {
      // Arrange
      (ProjectService.prototype.list as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          projects: [],
          pagination: {
            page: 1,
            limit: 20,
            totalItems: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      });

      // Act
      await list(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(ProjectService.prototype.list).toHaveBeenCalledWith(
        'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
        expect.any(Object)
      );
    });
  });
});

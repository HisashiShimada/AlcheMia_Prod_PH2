/**
 * ProjectController ユニットテスト
 * 
 * @description プロジェクト一覧取得のリクエスト処理テスト
 * Task: 2.1, 2.2, 2.3 Controller層実装
 */

import { Request, Response } from 'express';
import { list, getProjectMaiml } from '../../src/controllers/projectController';
import { ProjectService } from '../../src/services/projectService';

// ProjectServiceをモック
jest.mock('../../src/services/projectService');

// データベースモジュールをモック
jest.mock('../../src/database/db', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn()
  }))
}));

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
        sessionId: 'session123',
        permissions: [],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400
      } as any
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

  describe('getProjectMaiml', () => {
    beforeEach(() => {
      mockRequest.params = {
        projectId: '550e8400-e29b-41d4-a716-446655440000'
      };
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await getProjectMaiml(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_TOKEN_INVALID',
            message: '認証が必要です'
          })
        })
      );
    });

    it('should return 404 when organization_prefix retrieval fails', async () => {
      // Arrange
      const { getPool } = require('../../src/database/db');
      const mockPool = {
        query: jest.fn().mockResolvedValue({ rows: [] })
      };
      (getPool as jest.Mock).mockReturnValue(mockPool);

      // Act
      await getProjectMaiml(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'RESOURCE_NOT_FOUND',
            message: '組織情報が見つかりません'
          })
        })
      );
    });

    it('should return 404 when service returns RESOURCE_NOT_FOUND error', async () => {
      // Arrange
      const { getPool } = require('../../src/database/db');
      const mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ organization_prefix: 'maiml_lab_001' }]
        })
      };
      (getPool as jest.Mock).mockReturnValue(mockPool);

      (ProjectService.prototype.getProjectMaiml as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'プロジェクトが見つかりません'
        }
      });

      // Act
      await getProjectMaiml(mockRequest as Request, mockResponse as Response);

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

    it('should return 404 when service returns FILE_NOT_FOUND error', async () => {
      // Arrange
      const { getPool } = require('../../src/database/db');
      const mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ organization_prefix: 'maiml_lab_001' }]
        })
      };
      (getPool as jest.Mock).mockReturnValue(mockPool);

      (ProjectService.prototype.getProjectMaiml as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'MAIMLファイルが見つかりません'
        }
      });

      // Act
      await getProjectMaiml(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'FILE_NOT_FOUND',
            message: 'MAIMLファイルが見つかりません'
          })
        })
      );
    });

    it('should return 500 when service returns SYSTEM_ERROR', async () => {
      // Arrange
      const { getPool } = require('../../src/database/db');
      const mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ organization_prefix: 'maiml_lab_001' }]
        })
      };
      (getPool as jest.Mock).mockReturnValue(mockPool);

      (ProjectService.prototype.getProjectMaiml as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'システムエラーが発生しました'
        }
      });

      // Act
      await getProjectMaiml(mockRequest as Request, mockResponse as Response);

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

    it('should return 200 with MAIML file data when service succeeds', async () => {
      // Arrange
      const { getPool } = require('../../src/database/db');
      const mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ organization_prefix: 'maiml_lab_001' }]
        })
      };
      (getPool as jest.Mock).mockReturnValue(mockPool);

      const mockMAIMLData = {
        file_id: 'org_maiml_lab_001/projects/test_project/test_project.maiml',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        file_name: 'test_project.maiml',
        file_path: 'projects/test_project/test_project.maiml',
        file_size: 1024,
        content: '<?xml version="1.0"?><MAIML></MAIML>',
        content_type: 'application/xml',
        loaded_at: '2026-02-16T13:00:00.000Z'
      };

      (ProjectService.prototype.getProjectMaiml as jest.Mock).mockResolvedValue({
        success: true,
        data: mockMAIMLData
      });

      // Act
      await getProjectMaiml(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockMAIMLData,
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: 'test-request-id-123'
        })
      });
    });

    it('should include requestId and timestamp in response meta', async () => {
      // Arrange
      const { getPool } = require('../../src/database/db');
      const mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ organization_prefix: 'maiml_lab_001' }]
        })
      };
      (getPool as jest.Mock).mockReturnValue(mockPool);

      const mockMAIMLData = {
        file_id: 'org_maiml_lab_001/projects/test_project/test_project.maiml',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        file_name: 'test_project.maiml',
        file_path: 'projects/test_project/test_project.maiml',
        file_size: 1024,
        content: '<?xml version="1.0"?><MAIML></MAIML>',
        content_type: 'application/xml',
        loaded_at: '2026-02-16T13:00:00.000Z'
      };

      (ProjectService.prototype.getProjectMaiml as jest.Mock).mockResolvedValue({
        success: true,
        data: mockMAIMLData
      });

      // Act
      await getProjectMaiml(mockRequest as Request, mockResponse as Response);

      // Assert
      const jsonCall = mockJson.mock.calls[0][0];
      expect(jsonCall.meta).toBeDefined();
      expect(jsonCall.meta.requestId).toBe('test-request-id-123');
      expect(jsonCall.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should call service with correct parameters', async () => {
      // Arrange
      const { getPool } = require('../../src/database/db');
      const mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ organization_prefix: 'maiml_lab_001' }]
        })
      };
      (getPool as jest.Mock).mockReturnValue(mockPool);

      const mockMAIMLData = {
        file_id: 'org_maiml_lab_001/projects/test_project/test_project.maiml',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        file_name: 'test_project.maiml',
        file_path: 'projects/test_project/test_project.maiml',
        file_size: 1024,
        content: '<?xml version="1.0"?><MAIML></MAIML>',
        content_type: 'application/xml',
        loaded_at: '2026-02-16T13:00:00.000Z'
      };

      (ProjectService.prototype.getProjectMaiml as jest.Mock).mockResolvedValue({
        success: true,
        data: mockMAIMLData
      });

      // Act
      await getProjectMaiml(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(ProjectService.prototype.getProjectMaiml).toHaveBeenCalledWith(
        'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
        '550e8400-e29b-41d4-a716-446655440000',
        'maiml_lab_001'
      );
    });
  });
});

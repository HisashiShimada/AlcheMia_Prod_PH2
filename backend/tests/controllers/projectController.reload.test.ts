/**
 * ProjectController.reload のユニットテスト
 * 
 * Task 3.1: Controllerのリロードハンドラー実装
 * Requirements: REQ-1, REQ-4, REQ-5
 */

import { Request, Response } from 'express';
import { reload } from '../../src/controllers/projectController';
import { ProjectService } from '../../src/services/projectService';
import { logError } from '../../src/utils/logger';
import { v4 as uuidv4 } from 'uuid';

// モック設定
jest.mock('../../src/services/projectService');
jest.mock('../../src/utils/logger');
jest.mock('../../src/database/db');
jest.mock('uuid');

describe('ProjectController.reload', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockProjectService: jest.Mocked<ProjectService>;

  const testRequestId = 'test-request-id-123';
  const testOrganizationId = 'org-123';
  const testUserId = 'user-123';
  const testProjectId = '550e8400-e29b-41d4-a716-446655440000';
  const testProjectName = 'test_project';
  const testOrganizationPrefix = 'test_org';

  beforeEach(() => {
    // uuidv4のモック
    (uuidv4 as jest.Mock).mockReturnValue(testRequestId);

    // Responseのモック
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    // Requestのモック
    mockRequest = {
      user: {
        organizationId: testOrganizationId,
        userId: testUserId,
        role: 'experiment_admin',
        sessionId: 'test-session-id',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      params: {
        projectId: testProjectId,
      },
    };

    // ProjectServiceのモック
    mockProjectService = new ProjectService() as jest.Mocked<ProjectService>;
    (ProjectService as jest.Mock).mockImplementation(() => mockProjectService);

    // データベースモック
    const mockPool = {
      query: jest.fn().mockResolvedValue({
        rows: [{ organization_name: 'test org', project_name: testProjectName }],
      }),
    };
    const { getPool } = require('../../src/database/db');
    (getPool as jest.Mock).mockReturnValue(mockPool);

    // logErrorのモック
    (logError as jest.Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('正常系', () => {
    it('リロード成功時、200 OKとサマリーを返す', async () => {
      // Arrange
      const mockReloadResult = {
        success: true,
        data: {
          projectId: testProjectId,
          summary: {
            filesAdded: 3,
            filesUpdated: 2,
            filesDeleted: 1,
            cacheCleared: true,
          },
        },
      };
      mockProjectService.reloadProject = jest.fn().mockResolvedValue(mockReloadResult);

      // Act
      await reload(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockProjectService.reloadProject).toHaveBeenCalledWith(
        testOrganizationId,
        testOrganizationPrefix,
        testProjectId,
        testProjectName
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockReloadResult.data,
        meta: {
          timestamp: expect.any(String),
          requestId: testRequestId,
        },
      });
    });
  });

  describe('バリデーション', () => {
    it('認証されていない場合、401エラーを返す', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await reload(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: '認証が必要です',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: testRequestId,
        },
      });
      expect(mockProjectService.reloadProject).not.toHaveBeenCalled();
    });

    it('projectIdがUUID形式でない場合、400エラーを返す', async () => {
      // Arrange
      mockRequest.params = { projectId: 'invalid-uuid' };

      // Act
      await reload(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_INVALID_FORMAT',
          message: 'projectIdはUUID形式である必要があります',
          details: [{
            field: 'projectId',
            message: 'UUID形式が必要です',
            code: 'INVALID_FORMAT',
          }],
        },
        meta: {
          timestamp: expect.any(String),
          requestId: testRequestId,
        },
      });
      expect(mockProjectService.reloadProject).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    it('プロジェクトが存在しない場合、404エラーを返す', async () => {
      // Arrange
      const mockErrorResult = {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'プロジェクトが見つかりません',
        },
      };
      mockProjectService.reloadProject = jest.fn().mockResolvedValue(mockErrorResult);

      // Act
      await reload(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'プロジェクトが見つかりません',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: testRequestId,
        },
      });
    });

    it('並行リロード実行中の場合、409エラーを返す', async () => {
      // Arrange
      const mockErrorResult = {
        success: false,
        error: {
          code: 'PROJECT_RELOAD_IN_PROGRESS',
          message: '別のリロード処理が実行中です。しばらく待ってから再試行してください。',
        },
      };
      mockProjectService.reloadProject = jest.fn().mockResolvedValue(mockErrorResult);

      // Act
      await reload(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'PROJECT_RELOAD_IN_PROGRESS',
          message: '別のリロード処理が実行中です。しばらく待ってから再試行してください。',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: testRequestId,
        },
      });
    });

    it('S3エラーの場合、500エラーを返す', async () => {
      // Arrange
      const mockErrorResult = {
        success: false,
        error: {
          code: 'SYSTEM_S3_ERROR',
          message: 'S3エラーが発生しました',
        },
      };
      mockProjectService.reloadProject = jest.fn().mockResolvedValue(mockErrorResult);

      // Act
      await reload(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SYSTEM_S3_ERROR',
          message: 'S3エラーが発生しました',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: testRequestId,
        },
      });
    });

    it('データベースエラーの場合、500エラーを返す', async () => {
      // Arrange
      const mockErrorResult = {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました',
        },
      };
      mockProjectService.reloadProject = jest.fn().mockResolvedValue(mockErrorResult);

      // Act
      await reload(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: testRequestId,
        },
      });
    });

    it('予期しないエラーの場合、500エラーとログを記録する', async () => {
      // Arrange
      const testError = new Error('Unexpected error');
      mockProjectService.reloadProject = jest.fn().mockRejectedValue(testError);

      // Act
      await reload(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(logError).toHaveBeenCalledWith(
        'Project reload error',
        testError,
        {
          action: 'project_reload',
          organizationId: testOrganizationId,
          projectId: testProjectId,
          userId: testUserId,
          requestId: testRequestId,
        }
      );
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'システムエラーが発生しました',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: testRequestId,
        },
      });
    });
  });

  describe('organization_prefix取得', () => {
    it('組織情報が見つからない場合、404エラーを返す', async () => {
      // Arrange
      const mockPool = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      };
      const { getPool } = require('../../src/database/db');
      (getPool as jest.Mock).mockReturnValue(mockPool);

      // Act
      await reload(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: '組織情報が見つかりません',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: testRequestId,
        },
      });
      expect(mockProjectService.reloadProject).not.toHaveBeenCalled();
    });
  });
});

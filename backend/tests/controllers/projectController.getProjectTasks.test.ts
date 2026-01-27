/**
 * ProjectController.getProjectTasks Tests
 * 
 * TDD: Task 3.2 - Controller Layer Tests (RED Phase)
 */

import { Request, Response } from 'express';
import * as projectController from '../../src/controllers/projectController';
import { ProjectService } from '../../src/services/projectService';

jest.mock('../../src/services/projectService');
jest.mock('../../src/utils/logger');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

describe('ProjectController.getProjectTasks', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      params: { projectId: '123e4567-e89b-12d3-a456-426614174000' },
      query: {},
      user: {
        organizationId: 'org-123',
        userId: 'user-456',
        role: 'experiment_admin',
        sessionId: 'session-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('正常系', () => {
    it('status=all の場合、全タスクと統計情報を返す（200 OK）', async () => {
      // Arrange
      mockRequest.query = { status: 'all' };

      const mockServiceResult = {
        success: true,
        data: {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          projectName: 'Test Project',
          tasks: [
            {
              methodId: 'method-1',
              taskNo: 1,
              taskStatus: 'pending',
              experimentUserId: null,
              experimentUserName: null,
            },
            {
              methodId: 'method-1',
              taskNo: 2,
              taskStatus: 'in_progress',
              experimentUserId: 'user-1',
              experimentUserName: 'Worker 1',
            },
          ],
          statistics: {
            total: 2,
            pending: 1,
            inProgress: 1,
            completed: 0,
            failed: 0,
          },
        },
      };

      ProjectService.prototype.getProjectTasks = jest
        .fn()
        .mockResolvedValue(mockServiceResult);

      // Act
      await projectController.getProjectTasks(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            projectId: '123e4567-e89b-12d3-a456-426614174000',
            projectName: 'Test Project',
            tasks: expect.arrayContaining([
              expect.objectContaining({
                methodId: 'method-1',
                taskNo: 1,
                taskStatus: 'pending',
              }),
            ]),
            statistics: expect.objectContaining({
              total: 2,
              pending: 1,
              inProgress: 1,
            }),
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(String),
            requestId: expect.any(String),
          }),
        })
      );
    });

    it('status=pending の場合、実行待ちタスクのみを返す（200 OK）', async () => {
      // Arrange
      mockRequest.query = { status: 'pending' };

      const mockServiceResult = {
        success: true,
        data: {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          projectName: 'Test Project',
          tasks: [
            {
              methodId: 'method-1',
              taskNo: 1,
              taskStatus: 'pending',
            },
          ],
          statistics: {
            total: 10,
            pending: 5,
            inProgress: 3,
            completed: 2,
            failed: 0,
          },
        },
      };

      ProjectService.prototype.getProjectTasks = jest
        .fn()
        .mockResolvedValue(mockServiceResult);

      // Act
      await projectController.getProjectTasks(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            tasks: expect.arrayContaining([
              expect.objectContaining({
                taskStatus: 'pending',
              }),
            ]),
          }),
        })
      );
    });

    it('statusクエリパラメータが省略された場合、all として処理する（200 OK）', async () => {
      // Arrange
      mockRequest.query = {};

      const mockServiceResult = {
        success: true,
        data: {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          projectName: 'Test Project',
          tasks: [],
          statistics: {
            total: 0,
            pending: 0,
            inProgress: 0,
            completed: 0,
            failed: 0,
          },
        },
      };

      ProjectService.prototype.getProjectTasks = jest
        .fn()
        .mockResolvedValue(mockServiceResult);

      // Act
      await projectController.getProjectTasks(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(ProjectService.prototype.getProjectTasks).toHaveBeenCalledWith(
        'org-123',
        '123e4567-e89b-12d3-a456-426614174000',
        'all'
      );
    });
  });

  describe('異常系', () => {
    it('認証エラー時、401を返す', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await projectController.getProjectTasks(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_TOKEN_INVALID',
            message: '認証が必要です',
          }),
        })
      );
    });

    it('projectIdがUUID形式でない場合、400を返す', async () => {
      // Arrange
      mockRequest.params = { projectId: 'invalid-uuid' };

      // Act
      await projectController.getProjectTasks(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_INVALID_FORMAT',
            message: expect.stringContaining('UUID形式'),
          }),
        })
      );
    });

    it('不正なstatusパラメータの場合、400 Bad Request を返す', async () => {
      // Arrange
      mockRequest.query = { status: 'invalid_status' };

      // Act
      await projectController.getProjectTasks(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('status'),
          }),
        })
      );
    });

    it('プロジェクトが存在しない場合、404 Not Found を返す', async () => {
      // Arrange
      const mockServiceResult = {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'プロジェクトが見つかりません',
        },
      };

      ProjectService.prototype.getProjectTasks = jest
        .fn()
        .mockResolvedValue(mockServiceResult);

      // Act
      await projectController.getProjectTasks(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'RESOURCE_NOT_FOUND',
          }),
        })
      );
    });

    it('データベースエラー時、500 Internal Server Error を返す', async () => {
      // Arrange
      const mockServiceResult = {
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'データベースエラーが発生しました',
        },
      };

      ProjectService.prototype.getProjectTasks = jest
        .fn()
        .mockResolvedValue(mockServiceResult);

      // Act
      await projectController.getProjectTasks(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'SYSTEM_DATABASE_ERROR',
          }),
        })
      );
    });

    it('システムエラー時、500を返す', async () => {
      // Arrange
      ProjectService.prototype.getProjectTasks = jest
        .fn()
        .mockRejectedValue(new Error('Unexpected error'));

      // Act
      await projectController.getProjectTasks(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'SYSTEM_ERROR',
            message: 'システムエラーが発生しました',
          }),
        })
      );
    });
  });
});
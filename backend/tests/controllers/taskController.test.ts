/**
 * TaskController Unit Tests
 * 
 * Feature: worker-task-list-api
 * Task: 3.1 TaskControllerの作成
 * 
 * TDD: RED Phase - テストを先に作成
 */

import { Request, Response } from 'express';
import { TaskController } from '../../src/controllers/taskController';
import { TaskService } from '../../src/services/taskService';
import { MethodGroup } from '../../src/types/task';

// TaskServiceのモック
jest.mock('../../src/services/taskService');

// uuidのモック
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

describe('TaskController', () => {
  let taskController: TaskController;
  let mockTaskService: jest.Mocked<TaskService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    // TaskServiceのモックインスタンス作成
    mockTaskService = new TaskService(null as any) as jest.Mocked<TaskService>;
    mockTaskService.getTasksGroupedByMethod = jest.fn();

    // TaskControllerのインスタンス作成
    taskController = new TaskController(mockTaskService);

    // Request/Response/NextFunctionのモック作成
    mockRequest = {
      query: {},
      organizationId: 'org-123',
      headers: {
        'x-request-id': 'req-456',
      },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Date.nowのモック（タイムスタンプを固定）
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-01-30T00:00:00.000Z');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('必須パラメータ（projectId）を正しく抽出してServiceを呼び出す', async () => {
      // Arrange
      mockRequest.query = {
        projectId: 'project-123',
      };

      const mockMethodGroups: MethodGroup[] = [
        {
          method_id: 'method-1',
          method_name: 'Test Method',
          experiment_order: 1,
          tasks: [],
        },
      ];

      mockTaskService.getTasksGroupedByMethod.mockResolvedValue(mockMethodGroups);

      // Act
      await taskController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockTaskService.getTasksGroupedByMethod).toHaveBeenCalledWith(
        'project-123',
        'org-123',
        {
          methodId: undefined,
          status: undefined,
          assignUserId: undefined,
          sortBy: undefined,
          order: undefined,
        }
      );
    });

    it('オプションパラメータ（methodId, status, assignUserId, sortBy, order）を正しく抽出する', async () => {
      // Arrange
      mockRequest.query = {
        projectId: 'project-123',
        methodId: 'method-456',
        status: 'in_progress',
        assignUserId: 'user-789',
        sortBy: 'task_no',
        order: 'asc',
      };

      mockTaskService.getTasksGroupedByMethod.mockResolvedValue([]);

      // Act
      await taskController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockTaskService.getTasksGroupedByMethod).toHaveBeenCalledWith(
        'project-123',
        'org-123',
        {
          methodId: 'method-456',
          status: 'in_progress',
          assignUserId: 'user-789',
          sortBy: 'task_no',
          order: 'asc',
        }
      );
    });

    it('成功時に統一レスポンス形式（success: true, data, meta）を返却する', async () => {
      // Arrange
      mockRequest.query = {
        projectId: 'project-123',
      };

      const mockMethodGroups: MethodGroup[] = [
        {
          method_id: 'method-1',
          method_name: 'Test Method 1',
          experiment_order: 1,
          tasks: [
            {
              task_id: 'task-1',
              task_no: 1,
              task_status: 'in_progress',
              assign_user_id: 'user-1',
              assign_user_name: 'Test User',
              progress_rate: 50,
              created_at: '2026-01-29T00:00:00.000Z',
              updated_at: '2026-01-30T00:00:00.000Z',
            },
          ],
        },
        {
          method_id: 'method-2',
          method_name: 'Test Method 2',
          experiment_order: 2,
          tasks: [],
        },
      ];

      mockTaskService.getTasksGroupedByMethod.mockResolvedValue(mockMethodGroups);

      // Act
      await taskController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockMethodGroups,
        meta: {
          timestamp: '2026-01-30T00:00:00.000Z',
          requestId: 'req-456',
        },
      });
    });

    it('organizationIdがない場合はエラーをスローする', async () => {
      // Arrange
      mockRequest.query = {
        projectId: 'project-123',
      };
      delete mockRequest.organizationId;

      // Act
      await taskController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toContain('Organization');
    });

    it('projectIdがない場合はバリデーションエラーをスローする', async () => {
      // Arrange
      mockRequest.query = {};

      // Act
      await taskController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('projectId'),
          statusCode: 400,
          code: 'VALIDATION_ERROR',
        })
      );
    });

    it('TaskServiceでエラーが発生した場合はエラーハンドリングミドルウェアにスローする', async () => {
      // Arrange
      mockRequest.query = {
        projectId: 'project-123',
      };

      const serviceError = new Error('Database connection failed');
      mockTaskService.getTasksGroupedByMethod.mockRejectedValue(serviceError);

      // Act
      await taskController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('requestIdがない場合は自動生成する', async () => {
      // Arrange
      mockRequest.query = {
        projectId: 'project-123',
      };
      mockRequest.headers = {}; // x-request-idがない状態

      mockTaskService.getTasksGroupedByMethod.mockResolvedValue([]);

      // Act
      await taskController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          meta: expect.objectContaining({
            requestId: expect.any(String),
            timestamp: expect.any(String),
          }),
        })
      );
    });
  });
});
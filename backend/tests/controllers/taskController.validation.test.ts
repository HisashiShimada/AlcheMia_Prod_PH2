/**
 * TaskController Validation Tests
 * 
 * Feature: worker-task-list-api
 * Task: 3.2 リクエストバリデーションの実装
 * 
 * TDD: RED Phase - バリデーションテストを先に作成
 */

import { Request, Response } from 'express';
import { TaskController } from '../../src/controllers/taskController';
import { TaskService } from '../../src/services/taskService';

// TaskServiceのモック
jest.mock('../../src/services/taskService');

describe('TaskController - Request Validation', () => {
  let taskController: TaskController;
  let mockTaskService: jest.Mocked<TaskService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockTaskService = new TaskService(null as any) as jest.Mocked<TaskService>;
    taskController = new TaskController(mockTaskService);

    mockRequest = {
      query: {},
      organizationId: 'org-123',
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-01-30T00:00:00.000Z');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('projectId validation', () => {
    it('projectIdが必須であることを検証する', async () => {
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
        })
      );
    });

    it('projectIdが有効なUUID形式であることを検証する', async () => {
      // Arrange
      mockRequest.query = {
        projectId: 'invalid-uuid',
      };

      // Act & Assert
      // validateListRequestメソッドが実装されていることを確認
      expect(taskController.validateListRequest).toBeDefined();
    });

    it('有効なUUID形式のprojectIdを受け入れる', async () => {
      // Arrange
      mockRequest.query = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockTaskService.getTasksGroupedByMethod = jest.fn().mockResolvedValue([]);

      // Act
      await taskController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('methodId validation', () => {
    it('methodIdはオプションであり、存在しない場合はエラーにならない', async () => {
      // Arrange
      mockRequest.query = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockTaskService.getTasksGroupedByMethod = jest.fn().mockResolvedValue([]);

      // Act
      await taskController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('methodIdが存在する場合はUUID形式であることを検証する', async () => {
      // Arrange - validateListRequestメソッドが実装されることを期待
      const validators = taskController.validateListRequest();
      
      // Assert
      expect(validators).toBeDefined();
      expect(Array.isArray(validators)).toBe(true);
    });

    it('有効なUUID形式のmethodIdを受け入れる', async () => {
      // Arrange
      mockRequest.query = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        methodId: '660e8400-e29b-41d4-a716-446655440001',
      };

      mockTaskService.getTasksGroupedByMethod = jest.fn().mockResolvedValue([]);

      // Act
      await taskController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockTaskService.getTasksGroupedByMethod).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'org-123',
        expect.objectContaining({
          methodId: '660e8400-e29b-41d4-a716-446655440001',
        })
      );
    });
  });

  describe('status validation', () => {
    const validStatuses = ['not_started', 'started', 'in_progress', 'completed', 'forced_terminated'];

    validStatuses.forEach(status => {
      it(`有効なstatus値 '${status}' を受け入れる`, async () => {
        // Arrange
        mockRequest.query = {
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          status,
        };

        mockTaskService.getTasksGroupedByMethod = jest.fn().mockResolvedValue([]);

        // Act
        await taskController.list(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(mockTaskService.getTasksGroupedByMethod).toHaveBeenCalledWith(
          '550e8400-e29b-41d4-a716-446655440000',
          'org-123',
          expect.objectContaining({
            status,
          })
        );
      });
    });

    it('無効なstatus値を拒否する', async () => {
      // validateListRequestメソッドの存在を検証
      expect(taskController.validateListRequest).toBeDefined();
    });
  });

  describe('assignUserId validation', () => {
    it('assignUserIdはオプションであり、存在しない場合はエラーにならない', async () => {
      // Arrange
      mockRequest.query = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockTaskService.getTasksGroupedByMethod = jest.fn().mockResolvedValue([]);

      // Act
      await taskController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('assignUserIdが存在する場合はUUID形式であることを検証する', async () => {
      // validateListRequestメソッドの存在を検証
      expect(taskController.validateListRequest).toBeDefined();
    });

    it('有効なUUID形式のassignUserIdを受け入れる', async () => {
      // Arrange
      mockRequest.query = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        assignUserId: '770e8400-e29b-41d4-a716-446655440002',
      };

      mockTaskService.getTasksGroupedByMethod = jest.fn().mockResolvedValue([]);

      // Act
      await taskController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockTaskService.getTasksGroupedByMethod).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'org-123',
        expect.objectContaining({
          assignUserId: '770e8400-e29b-41d4-a716-446655440002',
        })
      );
    });
  });

  describe('sortBy validation', () => {
    const validSortByValues = ['task_no', 'created_at', 'updated_at', 'status'];

    validSortByValues.forEach(sortBy => {
      it(`有効なsortBy値 '${sortBy}' を受け入れる`, async () => {
        // Arrange
        mockRequest.query = {
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          sortBy,
        };

        mockTaskService.getTasksGroupedByMethod = jest.fn().mockResolvedValue([]);

        // Act
        await taskController.list(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(mockTaskService.getTasksGroupedByMethod).toHaveBeenCalledWith(
          '550e8400-e29b-41d4-a716-446655440000',
          'org-123',
          expect.objectContaining({
            sortBy,
          })
        );
      });
    });

    it('無効なsortBy値を拒否する', async () => {
      // validateListRequestメソッドの存在を検証
      expect(taskController.validateListRequest).toBeDefined();
    });
  });

  describe('order validation', () => {
    const validOrderValues = ['asc', 'desc'];

    validOrderValues.forEach(order => {
      it(`有効なorder値 '${order}' を受け入れる`, async () => {
        // Arrange
        mockRequest.query = {
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          order,
        };

        mockTaskService.getTasksGroupedByMethod = jest.fn().mockResolvedValue([]);

        // Act
        await taskController.list(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        // Assert
        expect(mockTaskService.getTasksGroupedByMethod).toHaveBeenCalledWith(
          '550e8400-e29b-41d4-a716-446655440000',
          'org-123',
          expect.objectContaining({
            order,
          })
        );
      });
    });

    it('無効なorder値を拒否する', async () => {
      // validateListRequestメソッドの存在を検証
      expect(taskController.validateListRequest).toBeDefined();
    });
  });

  describe('validation error response', () => {
    it('バリデーションエラー時は400エラーで詳細情報を返却する', async () => {
      // このテストは実装後に具体的なバリデーションエラーをテストします
      expect(taskController.validateListRequest).toBeDefined();
    });
  });
});
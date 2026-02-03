/**
 * Task API Integration Tests - フィルタリングとソート
 * 
 * TDD: Task 6.2 - API統合テスト: フィルタリングとソート
 * 
 * Tests filtering and sorting functionality:
 * - methodId filtering
 * - status filtering
 * - assignUserId filtering
 * - Multiple filter combinations
 * - Sorting by task_no, created_at, updated_at, status
 * - Sort order (asc/desc)
 * 
 * @requirements REQ-2, REQ-3
 */

import request from 'supertest';
import express, { Express } from 'express';
import taskRoutes from '../../src/routes/taskRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { tenantIsolation } from '../../src/middleware/tenantIsolation';

// Mock dependencies
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/middleware/tenantIsolation');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-request-id-12345'),
}));

// TaskServiceのモック
jest.mock('../../src/services/taskService', () => {
  const mockFn = jest.fn();
  return {
    TaskService: jest.fn().mockImplementation(() => {
      return {
        getTasksGroupedByMethod: mockFn,
      };
    }),
    __mockGetTasksGroupedByMethod: mockFn,
  };
});

const TaskServiceModule = require('../../src/services/taskService');
const mockGetTasksGroupedByMethodRef = TaskServiceModule.__mockGetTasksGroupedByMethod;

describe('Task API Integration Tests - フィルタリングとソート', () => {
  let app: Express;
  const projectId = '123e4567-e89b-12d3-a456-426614174000';
  const organizationId = 'org-123';
  
  // Valid UUID format test data
  const methodId1 = '223e4567-e89b-12d3-a456-426614174001';
  const methodId2 = '323e4567-e89b-12d3-a456-426614174002';
  const userId1 = '423e4567-e89b-12d3-a456-426614174003';
  const userId2 = '523e4567-e89b-12d3-a456-426614174004';

  beforeAll(() => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1/tasks', taskRoutes);

    // Mock auth middleware
    (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
      req.user = {
        userId: 'user-123',
        organizationId: organizationId,
        role: 'experiment_admin',
      };
      next();
    });

    // Mock tenant isolation middleware
    (tenantIsolation as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
      req.organizationId = organizationId;
      req.organizationPrefix = 'maiml_lab_001';
      next();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodIdフィルタ', () => {
    it('methodIdフィルタでタスクが絞り込まれることを確認', async () => {
      // Arrange
      const methodIdToFilter = methodId2;
      const mockMethodGroups = [
        {
          method_id: methodId2,
          method_name: '測定',
          experiment_order: 2,
          tasks: [
            {
              task_id: 'task-3',
              task_no: 1,
              task_status: 'in_progress' as const,
              assign_user_id: 'user-789',
              assign_user_name: '実験花子',
              progress_rate: 60,
              created_at: '2024-01-02T10:00:00.000Z',
              updated_at: '2024-01-04T11:00:00.000Z',
            },
          ],
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}&methodId=${methodIdToFilter}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].method_id).toBe(methodIdToFilter);
      
      // TaskService.getTasksGroupedByMethodが正しいフィルタで呼ばれたことを確認
      expect(mockGetTasksGroupedByMethodRef).toHaveBeenCalledWith(
        projectId,
        organizationId,
        expect.objectContaining({
          methodId: methodIdToFilter,
        })
      );
    });
  });

  describe('statusフィルタ', () => {
    it('statusフィルタで指定ステータスのみ返却されることを確認', async () => {
      // Arrange
      const statusToFilter = 'in_progress';
      const mockMethodGroups = [
        {
          method_id: 'method-1',
          method_name: 'サンプル調整',
          experiment_order: 1,
          tasks: [
            {
              task_id: 'task-2',
              task_no: 2,
              task_status: 'in_progress' as const,
              assign_user_id: 'user-456',
              assign_user_name: '実験太郎',
              progress_rate: 50,
              created_at: '2024-01-01T11:00:00.000Z',
              updated_at: '2024-01-03T10:00:00.000Z',
            },
          ],
        },
        {
          method_id: 'method-2',
          method_name: '測定',
          experiment_order: 2,
          tasks: [
            {
              task_id: 'task-4',
              task_no: 2,
              task_status: 'in_progress' as const,
              assign_user_id: 'user-789',
              assign_user_name: '実験花子',
              progress_rate: 75,
              created_at: '2024-01-02T11:00:00.000Z',
              updated_at: '2024-01-04T14:00:00.000Z',
            },
          ],
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}&status=${statusToFilter}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      
      // すべてのタスクが指定されたステータスであることを確認
      response.body.data.forEach((method: any) => {
        method.tasks.forEach((task: any) => {
          expect(task.task_status).toBe(statusToFilter);
        });
      });
      
      // TaskService.getTasksGroupedByMethodが正しいフィルタで呼ばれたことを確認
      expect(mockGetTasksGroupedByMethodRef).toHaveBeenCalledWith(
        projectId,
        organizationId,
        expect.objectContaining({
          status: statusToFilter,
        })
      );
    });

    it('status=completedでフィルタリングすると完了タスクのみ返却される', async () => {
      // Arrange
      const statusToFilter = 'completed';
      const mockMethodGroups = [
        {
          method_id: 'method-1',
          method_name: 'サンプル調整',
          experiment_order: 1,
          tasks: [
            {
              task_id: 'task-1',
              task_no: 1,
              task_status: 'completed' as const,
              assign_user_id: 'user-456',
              assign_user_name: '実験太郎',
              progress_rate: 100,
              created_at: '2024-01-01T10:00:00.000Z',
              updated_at: '2024-01-02T16:00:00.000Z',
            },
          ],
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}&status=${statusToFilter}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data[0].tasks[0].task_status).toBe('completed');
      expect(response.body.data[0].tasks[0].progress_rate).toBe(100);
    });
  });

  describe('assignUserIdフィルタ', () => {
    it('assignUserIdフィルタで担当者のタスクのみ返却されることを確認', async () => {
      // Arrange
      const assignUserIdToFilter = userId1;
      const mockMethodGroups = [
        {
          method_id: 'method-1',
          method_name: 'サンプル調整',
          experiment_order: 1,
          tasks: [
            {
              task_id: 'task-1',
              task_no: 1,
              task_status: 'completed' as const,
              assign_user_id: userId1,
              assign_user_name: '実験太郎',
              progress_rate: 100,
              created_at: '2024-01-01T10:00:00.000Z',
              updated_at: '2024-01-02T16:00:00.000Z',
            },
            {
              task_id: 'task-2',
              task_no: 2,
              task_status: 'in_progress' as const,
              assign_user_id: userId1,
              assign_user_name: '実験太郎',
              progress_rate: 50,
              created_at: '2024-01-01T11:00:00.000Z',
              updated_at: '2024-01-03T10:00:00.000Z',
            },
          ],
        },
        {
          method_id: 'method-2',
          method_name: '測定',
          experiment_order: 2,
          tasks: [
            {
              task_id: 'task-5',
              task_no: 3,
              task_status: 'started' as const,
              assign_user_id: userId1,
              assign_user_name: '実験太郎',
              progress_rate: 25,
              created_at: '2024-01-03T10:00:00.000Z',
              updated_at: '2024-01-04T09:00:00.000Z',
            },
          ],
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}&assignUserId=${assignUserIdToFilter}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // すべてのタスクが指定された担当者のものであることを確認
      response.body.data.forEach((method: any) => {
        method.tasks.forEach((task: any) => {
          expect(task.assign_user_id).toBe(assignUserIdToFilter);
          expect(task.assign_user_name).toBe('実験太郎');
        });
      });
      
      // TaskService.getTasksGroupedByMethodが正しいフィルタで呼ばれたことを確認
      expect(mockGetTasksGroupedByMethodRef).toHaveBeenCalledWith(
        projectId,
        organizationId,
        expect.objectContaining({
          assignUserId: assignUserIdToFilter,
        })
      );
    });
  });

  describe('複数フィルタ条件の組み合わせ', () => {
    it('methodId + status の組み合わせが正しく動作することを確認', async () => {
      // Arrange
      const methodIdToFilter = methodId1;
      const statusToFilter = 'in_progress';
      const mockMethodGroups = [
        {
          method_id: methodId1,
          method_name: 'サンプル調整',
          experiment_order: 1,
          tasks: [
            {
              task_id: 'task-2',
              task_no: 2,
              task_status: 'in_progress' as const,
              assign_user_id: 'user-456',
              assign_user_name: '実験太郎',
              progress_rate: 50,
              created_at: '2024-01-01T11:00:00.000Z',
              updated_at: '2024-01-03T10:00:00.000Z',
            },
          ],
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}&methodId=${methodIdToFilter}&status=${statusToFilter}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].method_id).toBe(methodIdToFilter);
      expect(response.body.data[0].tasks[0].task_status).toBe(statusToFilter);
      
      expect(mockGetTasksGroupedByMethodRef).toHaveBeenCalledWith(
        projectId,
        organizationId,
        expect.objectContaining({
          methodId: methodIdToFilter,
          status: statusToFilter,
        })
      );
    });

    it('methodId + assignUserId の組み合わせが正しく動作することを確認', async () => {
      // Arrange
      const methodIdToFilter = methodId2;
      const assignUserIdToFilter = userId2;
      const mockMethodGroups = [
        {
          method_id: methodId2,
          method_name: '測定',
          experiment_order: 2,
          tasks: [
            {
              task_id: 'task-3',
              task_no: 1,
              task_status: 'in_progress' as const,
              assign_user_id: userId2,
              assign_user_name: '実験花子',
              progress_rate: 60,
              created_at: '2024-01-02T10:00:00.000Z',
              updated_at: '2024-01-04T11:00:00.000Z',
            },
          ],
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}&methodId=${methodIdToFilter}&assignUserId=${assignUserIdToFilter}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data[0].method_id).toBe(methodIdToFilter);
      expect(response.body.data[0].tasks[0].assign_user_id).toBe(assignUserIdToFilter);
      
      expect(mockGetTasksGroupedByMethodRef).toHaveBeenCalledWith(
        projectId,
        organizationId,
        expect.objectContaining({
          methodId: methodIdToFilter,
          assignUserId: assignUserIdToFilter,
        })
      );
    });

    it('status + assignUserId の組み合わせが正しく動作することを確認', async () => {
      // Arrange
      const statusToFilter = 'completed';
      const assignUserIdToFilter = userId1;
      const mockMethodGroups = [
        {
          method_id: 'method-1',
          method_name: 'サンプル調整',
          experiment_order: 1,
          tasks: [
            {
              task_id: 'task-1',
              task_no: 1,
              task_status: 'completed' as const,
              assign_user_id: userId1,
              assign_user_name: '実験太郎',
              progress_rate: 100,
              created_at: '2024-01-01T10:00:00.000Z',
              updated_at: '2024-01-02T16:00:00.000Z',
            },
          ],
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}&status=${statusToFilter}&assignUserId=${assignUserIdToFilter}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data[0].tasks[0].task_status).toBe(statusToFilter);
      expect(response.body.data[0].tasks[0].assign_user_id).toBe(assignUserIdToFilter);
      
      expect(mockGetTasksGroupedByMethodRef).toHaveBeenCalledWith(
        projectId,
        organizationId,
        expect.objectContaining({
          status: statusToFilter,
          assignUserId: assignUserIdToFilter,
        })
      );
    });

    it('methodId + status + assignUserId の3条件組み合わせが正しく動作することを確認', async () => {
      // Arrange
      const methodIdToFilter = methodId1;
      const statusToFilter = 'in_progress';
      const assignUserIdToFilter = userId1;
      const mockMethodGroups = [
        {
          method_id: methodId1,
          method_name: 'サンプル調整',
          experiment_order: 1,
          tasks: [
            {
              task_id: 'task-2',
              task_no: 2,
              task_status: 'in_progress' as const,
              assign_user_id: userId1,
              assign_user_name: '実験太郎',
              progress_rate: 50,
              created_at: '2024-01-01T11:00:00.000Z',
              updated_at: '2024-01-03T10:00:00.000Z',
            },
          ],
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}&methodId=${methodIdToFilter}&status=${statusToFilter}&assignUserId=${assignUserIdToFilter}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data[0].method_id).toBe(methodIdToFilter);
      expect(response.body.data[0].tasks[0].task_status).toBe(statusToFilter);
      expect(response.body.data[0].tasks[0].assign_user_id).toBe(assignUserIdToFilter);
      
      expect(mockGetTasksGroupedByMethodRef).toHaveBeenCalledWith(
        projectId,
        organizationId,
        expect.objectContaining({
          methodId: methodIdToFilter,
          status: statusToFilter,
          assignUserId: assignUserIdToFilter,
        })
      );
    });
  });

  describe('ソート機能', () => {
    it('sortBy=task_no&order=ascで正しくソートされることを確認', async () => {
      // Arrange
      const mockMethodGroups = [
        {
          method_id: 'method-1',
          method_name: 'サンプル調整',
          experiment_order: 1,
          tasks: [
            {
              task_id: 'task-1',
              task_no: 1,
              task_status: 'completed' as const,
              assign_user_id: 'user-456',
              assign_user_name: '実験太郎',
              progress_rate: 100,
              created_at: '2024-01-01T10:00:00.000Z',
              updated_at: '2024-01-02T16:00:00.000Z',
            },
            {
              task_id: 'task-2',
              task_no: 2,
              task_status: 'in_progress' as const,
              assign_user_id: 'user-456',
              assign_user_name: '実験太郎',
              progress_rate: 50,
              created_at: '2024-01-01T11:00:00.000Z',
              updated_at: '2024-01-03T10:00:00.000Z',
            },
            {
              task_id: 'task-3',
              task_no: 3,
              task_status: 'not_started' as const,
              assign_user_id: null,
              assign_user_name: null,
              progress_rate: 0,
              created_at: '2024-01-01T12:00:00.000Z',
              updated_at: '2024-01-01T12:00:00.000Z',
            },
          ],
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}&sortBy=task_no&order=asc`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);
      const tasks = response.body.data[0].tasks;
      expect(tasks[0].task_no).toBe(1);
      expect(tasks[1].task_no).toBe(2);
      expect(tasks[2].task_no).toBe(3);
      
      expect(mockGetTasksGroupedByMethodRef).toHaveBeenCalledWith(
        projectId,
        organizationId,
        expect.objectContaining({
          sortBy: 'task_no',
          order: 'asc',
        })
      );
    });

    it('sortBy=created_at&order=descで正しくソートされることを確認', async () => {
      // Arrange
      const mockMethodGroups = [
        {
          method_id: 'method-1',
          method_name: 'サンプル調整',
          experiment_order: 1,
          tasks: [
            {
              task_id: 'task-3',
              task_no: 3,
              task_status: 'not_started' as const,
              assign_user_id: null,
              assign_user_name: null,
              progress_rate: 0,
              created_at: '2024-01-03T12:00:00.000Z',
              updated_at: '2024-01-03T12:00:00.000Z',
            },
            {
              task_id: 'task-2',
              task_no: 2,
              task_status: 'in_progress' as const,
              assign_user_id: 'user-456',
              assign_user_name: '実験太郎',
              progress_rate: 50,
              created_at: '2024-01-02T11:00:00.000Z',
              updated_at: '2024-01-03T10:00:00.000Z',
            },
            {
              task_id: 'task-1',
              task_no: 1,
              task_status: 'completed' as const,
              assign_user_id: 'user-456',
              assign_user_name: '実験太郎',
              progress_rate: 100,
              created_at: '2024-01-01T10:00:00.000Z',
              updated_at: '2024-01-02T16:00:00.000Z',
            },
          ],
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}&sortBy=created_at&order=desc`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);
      const tasks = response.body.data[0].tasks;
      
      // created_atの降順（新しい順）で並んでいることを確認
      const createdAt1 = new Date(tasks[0].created_at).getTime();
      const createdAt2 = new Date(tasks[1].created_at).getTime();
      const createdAt3 = new Date(tasks[2].created_at).getTime();
      expect(createdAt1).toBeGreaterThanOrEqual(createdAt2);
      expect(createdAt2).toBeGreaterThanOrEqual(createdAt3);
      
      expect(mockGetTasksGroupedByMethodRef).toHaveBeenCalledWith(
        projectId,
        organizationId,
        expect.objectContaining({
          sortBy: 'created_at',
          order: 'desc',
        })
      );
    });

    it('sortBy=updated_at&order=ascで正しくソートされることを確認', async () => {
      // Arrange
      const mockMethodGroups = [
        {
          method_id: 'method-1',
          method_name: 'サンプル調整',
          experiment_order: 1,
          tasks: [
            {
              task_id: 'task-1',
              task_no: 1,
              task_status: 'completed' as const,
              assign_user_id: 'user-456',
              assign_user_name: '実験太郎',
              progress_rate: 100,
              created_at: '2024-01-01T10:00:00.000Z',
              updated_at: '2024-01-02T16:00:00.000Z',
            },
            {
              task_id: 'task-2',
              task_no: 2,
              task_status: 'in_progress' as const,
              assign_user_id: 'user-456',
              assign_user_name: '実験太郎',
              progress_rate: 50,
              created_at: '2024-01-01T11:00:00.000Z',
              updated_at: '2024-01-03T10:00:00.000Z',
            },
            {
              task_id: 'task-3',
              task_no: 3,
              task_status: 'not_started' as const,
              assign_user_id: null,
              assign_user_name: null,
              progress_rate: 0,
              created_at: '2024-01-01T12:00:00.000Z',
              updated_at: '2024-01-04T09:00:00.000Z',
            },
          ],
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}&sortBy=updated_at&order=asc`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);
      const tasks = response.body.data[0].tasks;
      
      // updated_atの昇順（古い順）で並んでいることを確認
      const updatedAt1 = new Date(tasks[0].updated_at).getTime();
      const updatedAt2 = new Date(tasks[1].updated_at).getTime();
      const updatedAt3 = new Date(tasks[2].updated_at).getTime();
      expect(updatedAt1).toBeLessThanOrEqual(updatedAt2);
      expect(updatedAt2).toBeLessThanOrEqual(updatedAt3);
      
      expect(mockGetTasksGroupedByMethodRef).toHaveBeenCalledWith(
        projectId,
        organizationId,
        expect.objectContaining({
          sortBy: 'updated_at',
          order: 'asc',
        })
      );
    });

    it('sortBy=status&order=descで正しくソートされることを確認', async () => {
      // Arrange
      const mockMethodGroups = [
        {
          method_id: 'method-1',
          method_name: 'サンプル調整',
          experiment_order: 1,
          tasks: [
            {
              task_id: 'task-3',
              task_no: 3,
              task_status: 'started' as const,
              assign_user_id: 'user-456',
              assign_user_name: '実験太郎',
              progress_rate: 10,
              created_at: '2024-01-01T12:00:00.000Z',
              updated_at: '2024-01-02T08:00:00.000Z',
            },
            {
              task_id: 'task-2',
              task_no: 2,
              task_status: 'in_progress' as const,
              assign_user_id: 'user-456',
              assign_user_name: '実験太郎',
              progress_rate: 50,
              created_at: '2024-01-01T11:00:00.000Z',
              updated_at: '2024-01-03T10:00:00.000Z',
            },
            {
              task_id: 'task-1',
              task_no: 1,
              task_status: 'completed' as const,
              assign_user_id: 'user-456',
              assign_user_name: '実験太郎',
              progress_rate: 100,
              created_at: '2024-01-01T10:00:00.000Z',
              updated_at: '2024-01-02T16:00:00.000Z',
            },
          ],
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}&sortBy=status&order=desc`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);
      const tasks = response.body.data[0].tasks;
      
      // ステータスが降順で並んでいることを確認
      expect(tasks[0].task_status).toBe('started');
      expect(tasks[1].task_status).toBe('in_progress');
      expect(tasks[2].task_status).toBe('completed');
      
      expect(mockGetTasksGroupedByMethodRef).toHaveBeenCalledWith(
        projectId,
        organizationId,
        expect.objectContaining({
          sortBy: 'status',
          order: 'desc',
        })
      );
    });
  });
});

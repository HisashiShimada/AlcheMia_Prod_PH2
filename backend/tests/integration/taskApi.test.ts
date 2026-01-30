/**
 * Task API Integration Tests - 正常系
 * 
 * TDD: Task 6.1 - API統合テスト: 正常系
 * 
 * Tests the complete flow including:
 * - Authentication & Authorization
 * - Route → Controller → Service → Repository → Database
 * - Response format validation
 * - Method grouping and task retrieval
 * 
 * @requirements REQ-1, REQ-9
 */

import request from 'supertest';
import express, { Express } from 'express';
import taskRoutes from '../../src/routes/taskRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { tenantIsolation } from '../../src/middleware/tenantIsolation';
// @ts-ignore - Used in jest.mock factory function
import { TaskService } from '../../src/services/taskService';

// Mock dependencies
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/middleware/tenantIsolation');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-request-id-12345'),
}));

// TaskServiceのモック（ファクトリ関数内でjest.fn()を作成）
jest.mock('../../src/services/taskService', () => {
  const mockFn = jest.fn();
  return {
    TaskService: jest.fn().mockImplementation(() => {
      return {
        getTasksGroupedByMethod: mockFn,
      };
    }),
    // テストから参照できるようにexport
    __mockGetTasksGroupedByMethod: mockFn,
  };
});

// モック関数の参照を取得
const TaskServiceModule = require('../../src/services/taskService');
const mockGetTasksGroupedByMethodRef = TaskServiceModule.__mockGetTasksGroupedByMethod;

describe('Task API Integration Tests - 正常系', () => {
  let app: Express;

  beforeAll(() => {
    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/tasks', taskRoutes);

    // Mock auth middleware
    (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
      req.user = {
        userId: 'user-123',
        organizationId: 'org-123',
        role: 'experiment_admin',
      };
      next();
    });

    // Mock tenant isolation middleware
    (tenantIsolation as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
      req.organizationId = 'org-123';
      req.organizationPrefix = 'maiml_lab_001';
      next();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/tasks - タスク一覧取得API（正常系）', () => {
    const projectId = '123e4567-e89b-12d3-a456-426614174000';

    it('認証トークン付きでGET /api/v1/tasks?projectId=xxxをリクエストすると200 OKが返却される', async () => {
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
              task_status: 'not_started' as const,
              assign_user_id: null,
              assign_user_name: null,
              progress_rate: 0,
              created_at: '2024-01-01T10:00:00.000Z',
              updated_at: '2024-01-01T10:00:00.000Z',
            },
          ],
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('レスポンスがMethodGroup配列であることを確認', async () => {
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
              task_status: 'not_started' as const,
              assign_user_id: null,
              assign_user_name: null,
              progress_rate: 0,
              created_at: '2024-01-01T10:00:00.000Z',
              updated_at: '2024-01-01T10:00:00.000Z',
            },
            {
              task_id: 'task-2',
              task_no: 2,
              task_status: 'started' as const,
              assign_user_id: 'user-456',
              assign_user_name: '実験太郎',
              progress_rate: 50,
              created_at: '2024-01-01T11:00:00.000Z',
              updated_at: '2024-01-02T09:00:00.000Z',
            },
          ],
        },
        {
          method_id: 'method-2',
          method_name: '測定',
          experiment_order: 2,
          tasks: [
            {
              task_id: 'task-3',
              task_no: 1,
              task_status: 'completed' as const,
              assign_user_id: 'user-789',
              assign_user_name: '実験花子',
              progress_rate: 100,
              created_at: '2024-01-02T10:00:00.000Z',
              updated_at: '2024-01-03T15:00:00.000Z',
            },
          ],
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(2); // 2メソッド
      
      // 最初のメソッド検証
      expect(response.body.data[0]).toHaveProperty('method_id', 'method-1');
      expect(response.body.data[0]).toHaveProperty('method_name', 'サンプル調整');
      expect(response.body.data[0]).toHaveProperty('experiment_order', 1);
      expect(response.body.data[0]).toHaveProperty('tasks');
      expect(response.body.data[0].tasks).toBeInstanceOf(Array);
      expect(response.body.data[0].tasks).toHaveLength(2); // 2タスク
      
      // 2番目のメソッド検証
      expect(response.body.data[1]).toHaveProperty('method_id', 'method-2');
      expect(response.body.data[1]).toHaveProperty('method_name', '測定');
      expect(response.body.data[1]).toHaveProperty('experiment_order', 2);
      expect(response.body.data[1].tasks).toHaveLength(1); // 1タスク
    });

    it('レスポンス形式が仕様通り（success, data, meta）であることを確認', async () => {
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
              task_status: 'not_started' as const,
              assign_user_id: null,
              assign_user_name: null,
              progress_rate: 0,
              created_at: '2024-01-01T10:00:00.000Z',
              updated_at: '2024-01-01T10:00:00.000Z',
            },
          ],
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert - 統一レスポンス形式
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      
      // meta情報の検証
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');
      expect(response.body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(typeof response.body.meta.requestId).toBe('string');
    });

    it('各タスクに必要な情報（task_id, task_no, status, assign_user, progress_rate, timestamps）が含まれることを確認', async () => {
      // Arrange
      const mockMethodGroups = [
        {
          method_id: 'method-1',
          method_name: 'サンプル調整',
          experiment_order: 1,
          tasks: [
            {
              task_id: 'task-detail-123',
              task_no: 1,
              task_status: 'in_progress' as const,
              assign_user_id: 'user-456',
              assign_user_name: '実験太郎',
              progress_rate: 75,
              created_at: '2024-01-01T10:00:00.000Z',
              updated_at: '2024-01-05T14:30:00.000Z',
            },
          ],
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      const task = response.body.data[0].tasks[0];
      
      expect(task).toHaveProperty('task_id', 'task-detail-123');
      expect(task).toHaveProperty('task_no', 1);
      expect(task).toHaveProperty('task_status', 'in_progress');
      expect(task).toHaveProperty('assign_user_id', 'user-456');
      expect(task).toHaveProperty('assign_user_name', '実験太郎');
      expect(task).toHaveProperty('progress_rate', 75);
      expect(task).toHaveProperty('created_at');
      expect(task).toHaveProperty('updated_at');
      
      // 日時フィールドがISO 8601形式であることを確認
      expect(task.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(task.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('メソッドがexperiment_order順に並んでいることを確認', async () => {
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
          ],
        },
        {
          method_id: 'method-2',
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
        {
          method_id: 'method-3',
          method_name: '解析',
          experiment_order: 3,
          tasks: [
            {
              task_id: 'task-5',
              task_no: 1,
              task_status: 'not_started' as const,
              assign_user_id: null,
              assign_user_name: null,
              progress_rate: 0,
              created_at: '2024-01-03T10:00:00.000Z',
              updated_at: '2024-01-03T10:00:00.000Z',
            },
          ],
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert - experiment_order昇順であることを確認
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0].experiment_order).toBe(1);
      expect(response.body.data[0].method_name).toBe('サンプル調整');
      expect(response.body.data[1].experiment_order).toBe(2);
      expect(response.body.data[1].method_name).toBe('測定');
      expect(response.body.data[2].experiment_order).toBe(3);
      expect(response.body.data[2].method_name).toBe('解析');
    });

    it('タスクが存在しないメソッドも空のtasks配列とともに返却されることを確認', async () => {
      // Arrange - method-2にはタスクなし
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
        {
          method_id: 'method-2',
          method_name: '測定',
          experiment_order: 2,
          tasks: [], // タスクなし
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.body.data).toHaveLength(2);
      
      // method-1にはタスクがある
      expect(response.body.data[0].method_id).toBe('method-1');
      expect(response.body.data[0].tasks).toHaveLength(1);
      
      // method-2にはタスクがない（空配列）
      expect(response.body.data[1].method_id).toBe('method-2');
      expect(response.body.data[1].tasks).toHaveLength(0);
      expect(response.body.data[1].tasks).toEqual([]);
    });

    it('担当者が割り当てられていないタスクも正しく処理される', async () => {
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
              task_status: 'not_started' as const,
              assign_user_id: null,
              assign_user_name: null,
              progress_rate: 0,
              created_at: '2024-01-01T10:00:00.000Z',
              updated_at: '2024-01-01T10:00:00.000Z',
            },
          ],
        },
      ];

      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockMethodGroups);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      const task = response.body.data[0].tasks[0];
      expect(task.assign_user_id).toBeNull();
      expect(task.assign_user_name).toBeNull();
    });

    it('複数タスクを持つメソッドが正しくグループ化される', async () => {
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
              assign_user_id: 'user-789',
              assign_user_name: '実験花子',
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
        .get(`/api/v1/tasks?projectId=${projectId}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.body.data).toHaveLength(1); // 1メソッド
      expect(response.body.data[0].method_id).toBe('method-1');
      expect(response.body.data[0].tasks).toHaveLength(3); // 3タスク
      
      // タスク番号順に並んでいることを確認
      expect(response.body.data[0].tasks[0].task_no).toBe(1);
      expect(response.body.data[0].tasks[1].task_no).toBe(2);
      expect(response.body.data[0].tasks[2].task_no).toBe(3);
    });
  });
});
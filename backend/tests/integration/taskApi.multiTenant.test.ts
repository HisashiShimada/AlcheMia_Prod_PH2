/**
 * Task API Integration Tests - マルチテナント分離
 * 
 * TDD: Task 6.4 - マルチテナント分離テスト
 * 
 * Tests multi-tenant isolation including:
 * - Cross-organization access prevention (404)
 * - Response filtering by organization_id
 * - organization_id filter applied to all database queries
 * - Strict tenant boundary enforcement
 * 
 * @requirements REQ-5 (マルチテナント分離)
 */

import request from 'supertest';
import express, { Express } from 'express';
import taskRoutes from '../../src/routes/taskRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { tenantIsolation } from '../../src/middleware/tenantIsolation';
import { errorHandler } from '../../src/middleware/errorHandlerMiddleware';
// @ts-ignore - Used in jest.mock factory function
import { TaskService } from '../../src/services/taskService';

// Mock dependencies
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/middleware/tenantIsolation');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-request-id-multitenant-12345'),
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

// モック関数の参照を取得
const TaskServiceModule = require('../../src/services/taskService');
const mockGetTasksGroupedByMethodRef = TaskServiceModule.__mockGetTasksGroupedByMethod;

describe('Task API Integration Tests - マルチテナント分離', () => {
  let app: Express;

  // テストデータ: 2つの異なる組織
  const org1 = {
    organizationId: 'org-123',
    organizationPrefix: 'maiml_lab_001',
    projectId: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID
    userId: '111e4567-e89b-12d3-a456-426614174111',    // Valid UUID
  };

  const org2 = {
    organizationId: 'org-456',
    organizationPrefix: 'maiml_lab_002',
    projectId: '456e4567-e89b-12d3-a456-426614174000', // Valid UUID (different org)
    userId: '222e4567-e89b-12d3-a456-426614174222',    // Valid UUID (different org)
  };

  beforeAll(() => {
    // Setup Express app with routes and error handler
    app = express();
    app.use(express.json());
    app.use('/api/v1/tasks', taskRoutes);
    app.use(errorHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('クロステナントアクセスの防止', () => {
    it('異なる組織のprojectIdで404エラーが返却される', async () => {
      // Arrange - org1のユーザーとしてログイン
      (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = {
          userId: org1.userId,
          organizationId: org1.organizationId,
          role: 'experiment_admin',
        };
        next();
      });

      (tenantIsolation as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.organizationId = org1.organizationId;
        req.organizationPrefix = org1.organizationPrefix;
        next();
      });

      // org2のprojectIdにアクセスしようとするとProjectNotFoundError
      const projectNotFoundError = new Error('Project not found');
      (projectNotFoundError as any).statusCode = 404;
      (projectNotFoundError as any).name = 'ProjectNotFoundError';
      mockGetTasksGroupedByMethodRef.mockRejectedValueOnce(projectNotFoundError);

      // Act - org2のprojectIdを指定してリクエスト
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${org2.projectId}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('ProjectNotFoundError');
      expect(response.body.error.message).toContain('not found');

      // TaskServiceが正しいorganizationIdでフィルタしたことを確認
      expect(mockGetTasksGroupedByMethodRef).toHaveBeenCalledWith(
        org2.projectId,
        org1.organizationId, // org1のorganizationIdでフィルタされる
        expect.any(Object)
      );
    });

    it('同じ組織内のprojectIdでは正常にアクセスできる', async () => {
      // Arrange - org1のユーザーとしてログイン
      (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = {
          userId: org1.userId,
          organizationId: org1.organizationId,
          role: 'experiment_admin',
        };
        next();
      });

      (tenantIsolation as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.organizationId = org1.organizationId;
        req.organizationPrefix = org1.organizationPrefix;
        next();
      });

      // 正常なレスポンスデータ
      const mockResponse = [
        {
          method_id: 'method-1',
          method_name: 'Test Method',
          experiment_order: 1,
          tasks: [],
        },
      ];
      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockResponse);

      // Act - org1のprojectIdを指定してリクエスト
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${org1.projectId}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // TaskServiceが正しいorganizationIdでフィルタしたことを確認
      expect(mockGetTasksGroupedByMethodRef).toHaveBeenCalledWith(
        org1.projectId,
        org1.organizationId,
        expect.any(Object)
      );
    });
  });

  describe('レスポンスデータのフィルタリング', () => {
    it('レスポンスに他組織のタスクが含まれない', async () => {
      // Arrange - org1のユーザーとしてログイン
      (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = {
          userId: org1.userId,
          organizationId: org1.organizationId,
          role: 'experiment_admin',
        };
        next();
      });

      (tenantIsolation as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.organizationId = org1.organizationId;
        req.organizationPrefix = org1.organizationPrefix;
        next();
      });

      // org1のタスクのみを含むレスポンス
      const mockResponse = [
        {
          method_id: 'method-org1-1',
          method_name: 'Org1 Method 1',
          experiment_order: 1,
          tasks: [
            {
              task_id: 'task-org1-1',
              task_no: 1,
              task_status: 'in_progress',
              assign_user_id: org1.userId,
              assign_user_name: 'User Org1',
              progress_rate: 50,
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-15T00:00:00.000Z',
            },
          ],
        },
      ];
      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockResponse);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${org1.projectId}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);

      // org1のデータのみが含まれることを確認
      const method = response.body.data[0];
      expect(method.method_id).toBe('method-org1-1');
      expect(method.tasks).toHaveLength(1);
      expect(method.tasks[0].assign_user_id).toBe(org1.userId);

      // org2のデータが含まれていないことを暗黙的に確認（上記のアサーションで十分）
    });

    it('複数メソッドの場合も他組織のタスクが含まれない', async () => {
      // Arrange - org1のユーザーとしてログイン
      (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = {
          userId: org1.userId,
          organizationId: org1.organizationId,
          role: 'experiment_admin',
        };
        next();
      });

      (tenantIsolation as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.organizationId = org1.organizationId;
        req.organizationPrefix = org1.organizationPrefix;
        next();
      });

      // org1の複数メソッドとタスク
      const mockResponse = [
        {
          method_id: 'method-org1-1',
          method_name: 'Org1 Method 1',
          experiment_order: 1,
          tasks: [
            {
              task_id: 'task-org1-1',
              task_no: 1,
              task_status: 'completed',
              assign_user_id: org1.userId,
              assign_user_name: 'User Org1',
              progress_rate: 100,
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-10T00:00:00.000Z',
            },
          ],
        },
        {
          method_id: 'method-org1-2',
          method_name: 'Org1 Method 2',
          experiment_order: 2,
          tasks: [
            {
              task_id: 'task-org1-2',
              task_no: 2,
              task_status: 'in_progress',
              assign_user_id: org1.userId,
              assign_user_name: 'User Org1',
              progress_rate: 75,
              created_at: '2026-01-05T00:00:00.000Z',
              updated_at: '2026-01-20T00:00:00.000Z',
            },
          ],
        },
      ];
      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockResponse);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${org1.projectId}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      // すべてのメソッドとタスクがorg1のものであることを確認
      response.body.data.forEach((method: any) => {
        expect(method.method_id).toContain('org1');
        method.tasks.forEach((task: any) => {
          expect(task.task_id).toContain('org1');
          expect(task.assign_user_id).toBe(org1.userId);
        });
      });
    });
  });

  describe('organization_idフィルタの適用', () => {
    it('organization_idフィルタが全クエリに適用されている', async () => {
      // Arrange - org1のユーザーとしてログイン
      (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = {
          userId: org1.userId,
          organizationId: org1.organizationId,
          role: 'experiment_admin',
        };
        next();
      });

      (tenantIsolation as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.organizationId = org1.organizationId;
        req.organizationPrefix = org1.organizationPrefix;
        next();
      });

      const mockMethodId = '333e4567-e89b-12d3-a456-426614174333'; // Valid UUID
      const mockResponse = [
        {
          method_id: mockMethodId,
          method_name: 'Test Method',
          experiment_order: 1,
          tasks: [],
        },
      ];
      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockResponse);

      // Act - 各種フィルタを指定してリクエスト
      const response = await request(app)
        .get(
          `/api/v1/tasks?projectId=${org1.projectId}&methodId=${mockMethodId}&status=in_progress&assignUserId=${org1.userId}`
        )
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);

      // TaskServiceが正しいorganizationIdとフィルタでフィルタしたことを確認
      expect(mockGetTasksGroupedByMethodRef).toHaveBeenCalledWith(
        org1.projectId,
        org1.organizationId, // organization_idが必ず渡される
        expect.objectContaining({
          methodId: mockMethodId,
          status: 'in_progress',
          assignUserId: org1.userId,
        })
      );
    });

    it('フィルタなしの場合もorganization_idフィルタが適用される', async () => {
      // Arrange - org2のユーザーとしてログイン
      (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = {
          userId: org2.userId,
          organizationId: org2.organizationId,
          role: 'experiment_worker',
        };
        next();
      });

      (tenantIsolation as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.organizationId = org2.organizationId;
        req.organizationPrefix = org2.organizationPrefix;
        next();
      });

      const mockResponse = [
        {
          method_id: 'method-2',
          method_name: 'Org2 Method',
          experiment_order: 1,
          tasks: [],
        },
      ];
      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce(mockResponse);

      // Act - フィルタなしでリクエスト
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${org2.projectId}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);

      // organization_idが必ず渡されることを確認
      expect(mockGetTasksGroupedByMethodRef).toHaveBeenCalledWith(
        org2.projectId,
        org2.organizationId, // org2のorganization_idでフィルタされる
        expect.any(Object)
      );
    });
  });

  describe('クロステナントアクセスの厳格な防止', () => {
    it('他組織のmethodIdフィルタを指定しても404エラー', async () => {
      // Arrange - org1のユーザーとしてログイン
      (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = {
          userId: org1.userId,
          organizationId: org1.organizationId,
          role: 'experiment_admin',
        };
        next();
      });

      (tenantIsolation as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.organizationId = org1.organizationId;
        req.organizationPrefix = org1.organizationPrefix;
        next();
      });

      // org2のmethodIdを指定しても、org1のorganization_idでフィルタされるため見つからない
      const org2MethodId = '444e4567-e89b-12d3-a456-426614174444'; // Valid UUID for org2
      const projectNotFoundError = new Error('Project not found');
      (projectNotFoundError as any).statusCode = 404;
      (projectNotFoundError as any).name = 'ProjectNotFoundError';
      mockGetTasksGroupedByMethodRef.mockRejectedValueOnce(projectNotFoundError);

      // Act - org1のprojectIdにorg2のmethodIdを指定
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${org1.projectId}&methodId=${org2MethodId}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);

      // org1のorganization_idでフィルタされたことを確認
      expect(mockGetTasksGroupedByMethodRef).toHaveBeenCalledWith(
        org1.projectId,
        org1.organizationId,
        expect.objectContaining({
          methodId: org2MethodId,
        })
      );
    });

    it('他組織のassignUserIdフィルタを指定しても該当タスクなし', async () => {
      // Arrange - org1のユーザーとしてログイン
      (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = {
          userId: org1.userId,
          organizationId: org1.organizationId,
          role: 'experiment_admin',
        };
        next();
      });

      (tenantIsolation as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.organizationId = org1.organizationId;
        req.organizationPrefix = org1.organizationPrefix;
        next();
      });

      // org2のユーザーIDを指定しても、org1のorganization_idでフィルタされるため該当タスクなし（空配列）
      mockGetTasksGroupedByMethodRef.mockResolvedValueOnce([]);

      // Act - org1のprojectIdにorg2のassignUserIdを指定
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${org1.projectId}&assignUserId=${org2.userId}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]); // 該当タスクなし

      // org1のorganization_idでフィルタされたことを確認
      expect(mockGetTasksGroupedByMethodRef).toHaveBeenCalledWith(
        org1.projectId,
        org1.organizationId,
        expect.objectContaining({
          assignUserId: org2.userId,
        })
      );
    });

    it('System Adminでも他組織のデータは取得できない（通常のフロー）', async () => {
      // Arrange - system_adminでも通常は自組織のデータのみ
      (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'admin-user',
          organizationId: org1.organizationId,
          role: 'system_admin',
        };
        next();
      });

      (tenantIsolation as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.organizationId = org1.organizationId;
        req.organizationPrefix = org1.organizationPrefix;
        next();
      });

      // org2のprojectIdにアクセスしようとすると404
      const projectNotFoundError = new Error('Project not found');
      (projectNotFoundError as any).statusCode = 404;
      (projectNotFoundError as any).name = 'ProjectNotFoundError';
      mockGetTasksGroupedByMethodRef.mockRejectedValueOnce(projectNotFoundError);

      // Act - org2のprojectIdを指定
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${org2.projectId}`)
        .set('Authorization', 'Bearer admin-jwt-token');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);

      // system_adminでもorg1のorganization_idでフィルタされる
      expect(mockGetTasksGroupedByMethodRef).toHaveBeenCalledWith(
        org2.projectId,
        org1.organizationId,
        expect.any(Object)
      );
    });
  });
});
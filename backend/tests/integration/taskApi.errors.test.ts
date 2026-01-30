/**
 * Task API Integration Tests - エラーケース
 * 
 * TDD: Task 6.3 - API統合テスト: エラーケース
 * 
 * Tests error scenarios including:
 * - Authentication errors (401)
 * - Not Found errors (404)
 * - Validation errors (400)
 * - Error response format validation
 * 
 * @requirements REQ-6, REQ-7, REQ-8
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
  v4: jest.fn(() => 'mock-request-id-error-12345'),
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

describe('Task API Integration Tests - エラーケース', () => {
  let app: Express;

  beforeAll(() => {
    // Setup Express app with routes and error handler
    app = express();
    app.use(express.json());
    app.use('/api/v1/tasks', taskRoutes);
    app.use(errorHandler); // エラーハンドリングミドルウェアを追加
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('認証エラー (401)', () => {
    it('認証トークンなしで401エラーが返却される', async () => {
      // Arrange - authMiddlewareが認証エラーを返すようにモック
      (authMiddleware as jest.Mock).mockImplementationOnce((_req: any, res: any, _next: any) => {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_TOKEN_MISSING',
            message: 'Authentication token is required',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: 'mock-request-id-error-12345',
          },
        });
      });

      const projectId = '123e4567-e89b-12d3-a456-426614174000';

      // Act
      const response = await request(app).get(`/api/v1/tasks?projectId=${projectId}`);
      // No Authorization header

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
      expect(response.body.error.message).toContain('Authentication token');
    });

    it('無効な認証トークンで401エラーが返却される', async () => {
      // Arrange - authMiddlewareが無効なトークンエラーを返すようにモック
      (authMiddleware as jest.Mock).mockImplementationOnce((_req: any, res: any, _next: any) => {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Invalid authentication token',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: 'mock-request-id-error-12345',
          },
        });
      });

      const projectId = '123e4567-e89b-12d3-a456-426614174000';

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}`)
        .set('Authorization', 'Bearer invalid-token');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTH_TOKEN_INVALID');
      expect(response.body.error.message).toContain('Invalid authentication token');
    });
  });

  describe('Not Found エラー (404)', () => {
    beforeEach(() => {
      // 正常な認証とテナント分離のモック
      (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'user-123',
          organizationId: 'org-123',
          role: 'experiment_admin',
        };
        next();
      });

      (tenantIsolation as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.organizationId = 'org-123';
        req.organizationPrefix = 'maiml_lab_001';
        next();
      });
    });

    it('存在しないprojectIdで404エラーが返却される', async () => {
      // Arrange
      const nonExistentProjectId = '00000000-0000-0000-0000-000000000000';
      
      // ProjectNotFoundErrorをスローするようにモック
      const projectNotFoundError = new Error('Project not found');
      (projectNotFoundError as any).statusCode = 404;
      (projectNotFoundError as any).name = 'ProjectNotFoundError';
      mockGetTasksGroupedByMethodRef.mockRejectedValueOnce(projectNotFoundError);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${nonExistentProjectId}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('ProjectNotFoundError');
      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('バリデーションエラー (400)', () => {
    beforeEach(() => {
      // 正常な認証とテナント分離のモック
      (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'user-123',
          organizationId: 'org-123',
          role: 'experiment_admin',
        };
        next();
      });

      (tenantIsolation as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.organizationId = 'org-123';
        req.organizationPrefix = 'maiml_lab_001';
        next();
      });
    });

    it('projectIdが指定されていない場合に400エラーが返却される', async () => {
      // Act - projectIdパラメータなし
      const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
      expect(response.body.error.details).toBeInstanceOf(Array);
      
      // projectIdが必須エラーであることを確認
      const projectIdError = response.body.error.details.find(
        (d: any) => d.field === 'projectId'
      );
      expect(projectIdError).toBeDefined();
      expect(projectIdError.message).toContain('required');
    });

    it('不正なprojectId形式で400エラーが返却される', async () => {
      // Act - 無効なUUID形式
      const response = await request(app)
        .get('/api/v1/tasks?projectId=invalid-uuid')
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
      
      // projectIdのUUID形式エラーであることを確認
      const projectIdError = response.body.error.details.find(
        (d: any) => d.field === 'projectId'
      );
      expect(projectIdError).toBeDefined();
      expect(projectIdError.message).toContain('UUID');
    });

    it('不正なstatus値で400エラーが返却される', async () => {
      // Arrange
      const projectId = '123e4567-e89b-12d3-a456-426614174000';

      // Act - 無効なstatus値
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}&status=invalid_status`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
      
      // statusの列挙型エラーであることを確認
      const statusError = response.body.error.details.find(
        (d: any) => d.field === 'status'
      );
      expect(statusError).toBeDefined();
      expect(statusError.message).toMatch(/not_started|started|in_progress|completed|forced_terminated/);
    });

    it('不正なmethodId形式で400エラーが返却される', async () => {
      // Arrange
      const projectId = '123e4567-e89b-12d3-a456-426614174000';

      // Act - 無効なUUID形式
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}&methodId=invalid-uuid`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      
      const methodIdError = response.body.error.details.find(
        (d: any) => d.field === 'methodId'
      );
      expect(methodIdError).toBeDefined();
      expect(methodIdError.message).toContain('UUID');
    });

    it('不正なassignUserId形式で400エラーが返却される', async () => {
      // Arrange
      const projectId = '123e4567-e89b-12d3-a456-426614174000';

      // Act - 無効なUUID形式
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}&assignUserId=invalid-uuid`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      
      const assignUserIdError = response.body.error.details.find(
        (d: any) => d.field === 'assignUserId'
      );
      expect(assignUserIdError).toBeDefined();
      expect(assignUserIdError.message).toContain('UUID');
    });

    it('不正なsortBy値で400エラーが返却される', async () => {
      // Arrange
      const projectId = '123e4567-e89b-12d3-a456-426614174000';

      // Act - 無効なsortBy値
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}&sortBy=invalid_sort`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      
      const sortByError = response.body.error.details.find(
        (d: any) => d.field === 'sortBy'
      );
      expect(sortByError).toBeDefined();
      expect(sortByError.message).toMatch(/task_no|created_at|updated_at|status/);
    });

    it('不正なorder値で400エラーが返却される', async () => {
      // Arrange
      const projectId = '123e4567-e89b-12d3-a456-426614174000';

      // Act - 無効なorder値
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${projectId}&order=invalid_order`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      
      const orderError = response.body.error.details.find(
        (d: any) => d.field === 'order'
      );
      expect(orderError).toBeDefined();
      expect(orderError.message).toMatch(/asc|desc/);
    });
  });

  describe('エラーレスポンス形式の検証', () => {
    beforeEach(() => {
      // 正常な認証とテナント分離のモック
      (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.user = {
          userId: 'user-123',
          organizationId: 'org-123',
          role: 'experiment_admin',
        };
        next();
      });

      (tenantIsolation as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
        req.organizationId = 'org-123';
        req.organizationPrefix = 'maiml_lab_001';
        next();
      });
    });

    it('エラーレスポンスにerror code、message、detailsが含まれる（バリデーションエラー）', async () => {
      // Act - 複数のバリデーションエラー
      const response = await request(app)
        .get('/api/v1/tasks?projectId=invalid&status=bad_status')
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert - レスポンス形式の検証
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('meta');
      
      // error構造の検証
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('details');
      expect(typeof response.body.error.code).toBe('string');
      expect(typeof response.body.error.message).toBe('string');
      expect(response.body.error.details).toBeInstanceOf(Array);
      
      // meta構造の検証
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');
      expect(response.body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // details配列の検証（複数エラー）
      expect(response.body.error.details.length).toBeGreaterThan(0);
      response.body.error.details.forEach((detail: any) => {
        expect(detail).toHaveProperty('field');
        expect(detail).toHaveProperty('message');
        expect(typeof detail.field).toBe('string');
        expect(typeof detail.message).toBe('string');
      });
    });

    it('エラーレスポンスにerror code、message、detailsが含まれる（Not Foundエラー）', async () => {
      // Arrange
      const nonExistentProjectId = '00000000-0000-0000-0000-000000000000';
      
      const projectNotFoundError = new Error('Project not found');
      (projectNotFoundError as any).statusCode = 404;
      (projectNotFoundError as any).name = 'ProjectNotFoundError';
      mockGetTasksGroupedByMethodRef.mockRejectedValueOnce(projectNotFoundError);

      // Act
      const response = await request(app)
        .get(`/api/v1/tasks?projectId=${nonExistentProjectId}`)
        .set('Authorization', 'Bearer mock-jwt-token');

      // Assert - レスポンス形式の検証
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('meta');
      
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(typeof response.body.error.code).toBe('string');
      expect(typeof response.body.error.message).toBe('string');
      
      // 404エラーの場合、detailsはoptional
      // あれば配列、なければundefined
      if (response.body.error.details) {
        expect(response.body.error.details).toBeInstanceOf(Array);
      }
    });
  });
});
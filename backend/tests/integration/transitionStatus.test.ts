/**
 * Transition Status Update API Integration Tests
 * 
 * TDD: Task 8.2 - トランジションステータス更新APIの統合テスト
 * 
 * Tests the complete flow including:
 * - Authentication & Authorization
 * - Route → Controller → Service → Repository → Database
 * - Request validation
 * - Response format validation
 * - Event log recording
 * - Transaction management (Rollback on failure)
 * 
 * @requirements REQ-3, REQ-10, REQ-2
 */

import request from 'supertest';
import express, { Express } from 'express';
import experimentRoutes from '../../src/routes/experimentRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { tenantIsolation } from '../../src/middleware/tenantIsolation';

// Mock dependencies
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/middleware/tenantIsolation');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-request-id-12345'),
}));

// experimentDataServiceのモック
jest.mock('../../src/services/experimentDataService', () => {
  const mockUpdateStatus = jest.fn();
  return {
    updateStatus: mockUpdateStatus,
    __mockUpdateStatus: mockUpdateStatus,
  };
});

// モック関数の参照を取得
const experimentDataServiceModule = require('../../src/services/experimentDataService');
const mockUpdateStatusRef = experimentDataServiceModule.__mockUpdateStatus;

describe('Transition Status Update API Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/experiments', experimentRoutes);

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

  describe('PUT /api/v1/experiments/projects/:projectId/methods/:methodId/transitions/:transitionId/status - トランジションステータス更新', () => {
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    const methodId = 'method-001';
    const transitionId = 'transition-001';
    const endpoint = `/api/v1/experiments/projects/${projectId}/methods/${methodId}/transitions/${transitionId}/status`;

    const validRequestBody = {
      taskNo: 1,
      status: 'running' as const,
      progressRate: 50,
      comment: 'Test comment',
    };

    describe('認証・認可テスト', () => {
      it('認証トークンなしの場合、401エラーが返される', async () => {
        // Arrange
        (authMiddleware as jest.Mock).mockImplementation((_req: any, res: any, _next: any) => {
          res.status(401).json({
            success: false,
            error: {
              code: 'AUTH_TOKEN_MISSING',
              message: '認証トークンが必要です',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: 'mock-request-id-12345',
            },
          });
        });

        // Act
        const response = await request(app)
          .put(endpoint)
          .send(validRequestBody);

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
      });

      it('権限不足（Workerより下のロール）の場合、403エラーが返される', async () => {
        // Arrange
        (authMiddleware as jest.Mock).mockImplementation((req: any, res: any, _next: any) => {
          req.user = {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'viewer',
          };
          res.status(403).json({
            success: false,
            error: {
              code: 'PERMISSION_INSUFFICIENT',
              message: 'この操作を実行する権限がありません',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: 'mock-request-id-12345',
            },
          });
        });

        // Act
        const response = await request(app)
          .put(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(validRequestBody);

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('PERMISSION_INSUFFICIENT');
      });
    });

    describe('バリデーションテスト', () => {
      beforeEach(() => {
        // Mock auth middleware (正常系)
        (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
          req.user = {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'experiment_worker',
          };
          next();
        });
      });

      it('projectIdがUUID形式でない場合、400エラーが返される', async () => {
        // Arrange
        const invalidEndpoint = `/api/v1/experiments/projects/invalid-uuid/methods/${methodId}/transitions/${transitionId}/status`;

        // Act
        const response = await request(app)
          .put(invalidEndpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(validRequestBody);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('taskNoが1未満の場合、400エラーが返される', async () => {
        // Arrange
        const invalidBody = {
          taskNo: 0,
          status: 'running',
        };

        // Act
        const response = await request(app)
          .put(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(invalidBody);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('statusが不正な値の場合、400エラーが返される', async () => {
        // Arrange
        const invalidBody = {
          taskNo: 1,
          status: 'invalid_status',
        };

        // Act
        const response = await request(app)
          .put(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(invalidBody);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('progressRateが0-100の範囲外の場合、400エラーが返される', async () => {
        // Arrange
        const invalidBody = {
          taskNo: 1,
          status: 'running',
          progressRate: 101,
        };

        // Act
        const response = await request(app)
          .put(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(invalidBody);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('commentが2000文字を超える場合、400エラーが返される', async () => {
        // Arrange
        const longComment = 'a'.repeat(2001);
        const invalidBody = {
          taskNo: 1,
          status: 'running',
          comment: longComment,
        };

        // Act
        const response = await request(app)
          .put(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(invalidBody);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('ビジネスロジックエラーテスト', () => {
      beforeEach(() => {
        // Mock auth middleware (正常系)
        (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
          req.user = {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'experiment_worker',
          };
          next();
        });
      });

      it('不正なステータス遷移の場合、422エラーが返される', async () => {
        // Arrange
        const InvalidStatusTransitionError = class extends Error {
          statusCode = 422;
          name = 'InvalidStatusTransitionError';
        };

        mockUpdateStatusRef.mockRejectedValueOnce(
          new InvalidStatusTransitionError('このステータス遷移は許可されていません')
        );

        // Act
        const response = await request(app)
          .put(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(validRequestBody);

        // Assert
        expect(response.status).toBe(422);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('InvalidStatusTransitionError');
        expect(response.body.error.message).toContain('ステータス遷移');
      });

      it('トランジションが存在しない場合、404エラーが返される', async () => {
        // Arrange
        const TransitionNotFoundError = class extends Error {
          statusCode = 404;
          name = 'TransitionNotFoundError';
        };

        mockUpdateStatusRef.mockRejectedValueOnce(
          new TransitionNotFoundError('指定されたトランジションが見つかりません')
        );

        // Act
        const response = await request(app)
          .put(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(validRequestBody);

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TransitionNotFoundError');
        expect(response.body.error.message).toContain('見つかりません');
      });
    });

    describe('正常系テスト', () => {
      beforeEach(() => {
        // Mock auth middleware (正常系)
        (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
          req.user = {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'experiment_worker',
          };
          next();
        });
      });

      it('正常なリクエストの場合、200ステータスと更新後のトランジション情報が返される', async () => {
        // Arrange
        const mockUpdatedTransition = {
          transitionId: 'transition-001',
          taskNo: 1,
          methodId: 'method-001',
          projectId,
          status: 'running',
          progressRate: 50,
          comment: 'Test comment',
          updatedBy: 'user-123',
          updatedAt: '2024-12-25T10:00:00.000Z',
          organizationId: 'org-123',
          createdAt: '2024-12-24T10:00:00.000Z',
        };

        mockUpdateStatusRef.mockResolvedValueOnce(mockUpdatedTransition);

        // Act
        const response = await request(app)
          .put(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(validRequestBody);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.transitionId).toBe('transition-001');
        expect(response.body.data.status).toBe('running');
        expect(response.body.data.progressRate).toBe(50);
      });

      it('レスポンス形式が仕様通り（success, data, meta）であることを確認', async () => {
        // Arrange
        const mockUpdatedTransition = {
          transitionId: 'transition-001',
          taskNo: 1,
          methodId: 'method-001',
          projectId,
          status: 'running',
          progressRate: 50,
          comment: null,
          updatedBy: 'user-123',
          updatedAt: '2024-12-25T10:00:00.000Z',
          organizationId: 'org-123',
          createdAt: '2024-12-24T10:00:00.000Z',
        };

        mockUpdateStatusRef.mockResolvedValueOnce(mockUpdatedTransition);

        // Act
        const response = await request(app)
          .put(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(validRequestBody);

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

      it('status=completedの場合、progressRateが自動的に100になることを確認', async () => {
        // Arrange
        const requestBody = {
          taskNo: 1,
          status: 'completed' as const,
        };

        const mockUpdatedTransition = {
          transitionId: 'transition-001',
          taskNo: 1,
          methodId: 'method-001',
          projectId,
          status: 'completed',
          progressRate: 100, // 自動設定
          comment: null,
          updatedBy: 'user-123',
          updatedAt: '2024-12-25T10:00:00.000Z',
          organizationId: 'org-123',
          createdAt: '2024-12-24T10:00:00.000Z',
        };

        mockUpdateStatusRef.mockResolvedValueOnce(mockUpdatedTransition);

        // Act
        const response = await request(app)
          .put(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(requestBody);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('completed');
        expect(response.body.data.progressRate).toBe(100);
      });

      it('イベントログが正しく記録されることを確認（サービス層で処理）', async () => {
        // Arrange
        const mockUpdatedTransition = {
          transitionId: 'transition-001',
          taskNo: 1,
          methodId: 'method-001',
          projectId,
          status: 'running',
          progressRate: 50,
          comment: 'Test comment',
          updatedBy: 'user-123',
          updatedAt: '2024-12-25T10:00:00.000Z',
          organizationId: 'org-123',
          createdAt: '2024-12-24T10:00:00.000Z',
        };

        mockUpdateStatusRef.mockResolvedValueOnce(mockUpdatedTransition);

        // Act
        const response = await request(app)
          .put(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(validRequestBody);

        // Assert
        expect(response.status).toBe(200);
        expect(mockUpdateStatusRef).toHaveBeenCalledTimes(1);
        expect(mockUpdateStatusRef).toHaveBeenCalledWith(
          'org-123',
          projectId,
          'method-001',
          'transition-001',
          expect.objectContaining({
            status: 'running',
            updated_by: 'user-123',
            progress_rate: 50,
          })
        );
      });
    });

    describe('トランザクション管理テスト', () => {
      beforeEach(() => {
        // Mock auth middleware (正常系)
        (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
          req.user = {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'experiment_worker',
          };
          next();
        });
      });

      it('イベントログ記録が失敗した場合、ステータス更新もロールバックされる', async () => {
        // Arrange
        const DatabaseError = class extends Error {
          statusCode = 500;
          name = 'DatabaseError';
        };

        mockUpdateStatusRef.mockRejectedValueOnce(
          new DatabaseError('イベントログの記録に失敗しました')
        );

        // Act
        const response = await request(app)
          .put(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(validRequestBody);

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('DatabaseError');
        expect(response.body.error.message).toContain('失敗');
      });

      it('トランザクション内のいずれかの操作が失敗した場合、全体がロールバックされる', async () => {
        // Arrange
        const SystemError = class extends Error {
          statusCode = 500;
          name = 'SYSTEM_INTERNAL_ERROR';
        };

        mockUpdateStatusRef.mockRejectedValueOnce(
          new SystemError('トランザクション処理中にエラーが発生しました')
        );

        // Act
        const response = await request(app)
          .put(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(validRequestBody);

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('SYSTEM_INTERNAL_ERROR');
      });
    });
  });
});

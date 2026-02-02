/**
 * Worker Instructions API - エラーハンドリングテスト
 * タスク3.1: エラーハンドリングの実装
 */

import request from 'supertest';
import express, { Express } from 'express';
import projectRoutes from '../../src/routes/projectRoutes';
import { ProjectService } from '../../src/services/projectService';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { logError } from '../../src/utils/logger';

// モックの設定
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/services/projectService');
jest.mock('../../src/utils/logger');

describe('Worker Instructions API - Error Handling (Task 3.1)', () => {
  let app: Express;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Expressアプリケーションのセットアップ
    app = express();
    app.use(express.json());
    
    // authミドルウェアのモック（正常な認証ユーザー）
    (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = {
        userId: 'test-user-id',
        role: 'experiment_worker',
        organizationId: 'org-123'
      };
      req.organizationId = 'org-123';
      next();
    });
    
    app.use('/api/v1/projects', projectRoutes);
    
    // エラーハンドリングミドルウェア
    app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: {
          code: err.name || 'INTERNAL_SERVER_ERROR',
          message: err.message,
          details: err.details || undefined
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'test-request-id'
        }
      });
    });
  });

  describe('バリデーションエラー（400）', () => {
    it('projectNameが不正な場合、400エラーを返す', async () => {
      const response = await request(app)
        .get('/api/v1/projects/invalid@project/worker-instructions')
        .set('x-request-id', 'test-req-001');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('projectName');
      expect(response.body.meta.requestId).toBe('test-req-001');
      
      // ログ記録の確認
      expect(logError).toHaveBeenCalled();
    });

  });

  describe('認証エラー（401）', () => {
    it('認証トークンがない場合、401エラーを返す', async () => {
      // authミドルウェアを認証失敗に設定
      (authMiddleware as jest.Mock).mockImplementation((_req, _res, next) => {
        const error: any = new Error('Authentication required');
        error.statusCode = 401;
        error.name = 'AuthenticationError';
        next(error);
      });

      const response = await request(app)
        .get('/api/v1/projects/test-project/worker-instructions');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AuthenticationError');
      expect(response.body.error.message).toContain('Authentication');
    });

    it('トークンが無効な場合、401エラーを返す', async () => {
      (authMiddleware as jest.Mock).mockImplementation((_req, _res, next) => {
        const error: any = new Error('Invalid token');
        error.statusCode = 401;
        error.name = 'AuthenticationError';
        next(error);
      });

      const response = await request(app)
        .get('/api/v1/projects/test-project/worker-instructions')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AuthenticationError');
    });
  });

  describe('権限エラー（403）', () => {
    it('organization_idが一致しない場合、403エラーを返す', async () => {
      // 異なる組織のユーザー
      (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'test-user-id',
          role: 'experiment_worker',
          organizationId: 'org-999'
        };
        req.organizationId = 'org-999';
        next();
      });

      // ProjectServiceのモック
      const mockService = ProjectService.prototype.getWorkerInstructions as jest.Mock;
      mockService.mockImplementation(() => {
        const error: any = new Error('Access denied to this organization');
        error.statusCode = 403;
        error.name = 'AuthorizationError';
        throw error;
      });

      const response = await request(app)
        .get('/api/v1/projects/test-project/worker-instructions');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AuthorizationError');
      expect(response.body.error.message).toContain('Access denied');
    });
  });

  describe('データベースエラー（500）', () => {
    it('データベース接続エラーの場合、500エラーを返す', async () => {
      const mockService = ProjectService.prototype.getWorkerInstructions as jest.Mock;
      mockService.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/v1/projects/test-project/worker-instructions');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SYSTEM_ERROR');
      expect(response.body.error.message).toContain('システムエラー');
      
      // ログにスタックトレースが記録されることを確認
      expect(logError).toHaveBeenCalledWith(
        'Worker instructions list error',
        expect.any(Error),
        expect.objectContaining({
          action: 'worker_instructions_list'
        })
      );
    });

    it('クエリ実行エラーの場合、500エラーを返す', async () => {
      const mockService = ProjectService.prototype.getWorkerInstructions as jest.Mock;
      mockService.mockRejectedValue(new Error('Query execution failed'));

      const response = await request(app)
        .get('/api/v1/projects/test-project/worker-instructions');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('S3エラー（500）', () => {
    it('S3接続エラーの場合、500エラーを返す', async () => {
      const mockService = ProjectService.prototype.getWorkerInstructions as jest.Mock;
      mockService.mockRejectedValue(new Error('S3 connection failed'));

      const response = await request(app)
        .get('/api/v1/projects/test-project/worker-instructions');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SYSTEM_ERROR');
      expect(response.body.error.message).toContain('システムエラー');
    });
  });

  describe('予期しないエラー（500）', () => {
    it('予期しないエラーの場合、500エラーを返す', async () => {
      const mockService = ProjectService.prototype.getWorkerInstructions as jest.Mock;
      mockService.mockRejectedValue(new Error('Unexpected error occurred'));

      const response = await request(app)
        .get('/api/v1/projects/test-project/worker-instructions');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SYSTEM_ERROR');
      expect(response.body.error.message).toContain('システムエラー');
    });
  });

  describe('エラーレスポンス形式の検証', () => {
    it('すべてのエラーレスポンスが統一された形式である', async () => {
      const mockService = ProjectService.prototype.getWorkerInstructions as jest.Mock;
      mockService.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get('/api/v1/projects/test-project/worker-instructions')
        .set('x-request-id', 'test-unified-format');

      // 統一されたエラーレスポンス形式の確認
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId', 'test-unified-format');
      
      // success=trueやdataプロパティが存在しないことを確認
      expect(response.body).not.toHaveProperty('data');
    });
  });

  describe('ログ記録の検証', () => {
    it('エラー発生時にログが記録される', async () => {
      const testError = new Error('Test error for logging');
      const mockService = ProjectService.prototype.getWorkerInstructions as jest.Mock;
      mockService.mockRejectedValue(testError);

      await request(app)
        .get('/api/v1/projects/test-project/worker-instructions')
        .set('x-request-id', 'test-logging');

      // ログが記録されたことを確認
      expect(logError).toHaveBeenCalled();
      
      // ログに必要な情報が含まれることを確認
      expect(logError).toHaveBeenCalledWith(
        'Worker instructions list error',
        testError,
        expect.objectContaining({
          action: 'worker_instructions_list',
          organizationId: 'org-123',
          projectName: 'test-project',
          requestId: 'test-logging'
        })
      );
    });

    it('エラーのスタックトレースがログに記録される', async () => {
      const testError = new Error('Test error with stack');
      const mockService = ProjectService.prototype.getWorkerInstructions as jest.Mock;
      mockService.mockRejectedValue(testError);

      await request(app)
        .get('/api/v1/projects/test-project/worker-instructions');

      expect(logError).toHaveBeenCalled();
      const logCall = (logError as jest.Mock).mock.calls[0];
      expect(logCall[1]).toBeInstanceOf(Error);
      expect(logCall[1].stack).toBeDefined();
    });
  });
});
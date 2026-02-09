/**
 * WorkerProject Route Integration Test
 * 
 * Task 4.1: ルート定義とミドルウェアチェーン適用のテスト
 */

import request from 'supertest';
import express, { Express } from 'express';
import projectRoutes from '../../src/routes/projectRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import * as workerProjectController from '../../src/controllers/workerProjectController';

// Mocks
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
}));
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/controllers/workerProjectController');
jest.mock('../../src/controllers/projectController');

describe('WorkerProject Route Integration', () => {
  let app: Express;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/projects', projectRoutes);
    
    // デフォルトのモック動作
    (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = {
        userId: 'test-user-id',
        role: 'experiment_worker',
        organizationId: 'test-org-id',
      };
      next();
    });
    
    (workerProjectController.listWorkerAccessible as jest.Mock).mockImplementation(
      async (_req, res) => {
        res.status(200).json({
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            totalItems: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: 'test-request-id',
          },
        });
      }
    );
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/projects/worker-accessible', () => {
    test('should apply authMiddleware', async () => {
      await request(app).get('/api/v1/projects/worker-accessible');
      
      expect(authMiddleware).toHaveBeenCalled();
    });
    
    test('should call workerProjectController.listWorkerAccessible', async () => {
      await request(app).get('/api/v1/projects/worker-accessible');
      
      expect(workerProjectController.listWorkerAccessible).toHaveBeenCalled();
    });
    
    test('should return 200 with valid response structure', async () => {
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('meta');
    });
    
    test('should pass query parameters to controller', async () => {
      await request(app)
        .get('/api/v1/projects/worker-accessible')
        .query({ page: '2', limit: '50', status: 'pending' });
      
      expect(workerProjectController.listWorkerAccessible).toHaveBeenCalled();
      const callArgs = (workerProjectController.listWorkerAccessible as jest.Mock).mock.calls[0];
      const req = callArgs[0];
      
      expect(req.query.page).toBe('2');
      expect(req.query.limit).toBe('50');
      expect(req.query.status).toBe('pending');
    });
    
    test('should support experiment_worker role', async () => {
      (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'worker-id',
          role: 'experiment_worker',
          organizationId: 'org-id',
        };
        next();
      });
      
      await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(200);
    });
    
    test('should support experiment_admin role', async () => {
      (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'admin-id',
          role: 'experiment_admin',
          organizationId: 'org-id',
        };
        next();
      });
      
      await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(200);
    });
    
    test('should support system_admin role', async () => {
      (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'sysadmin-id',
          role: 'system_admin',
          organizationId: 'org-id',
        };
        next();
      });
      
      await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(200);
    });
  });

  describe('Validation Tests', () => {
    test('should accept request with no query parameters (defaults)', async () => {
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
    
    test('should accept valid page parameter', async () => {
      await request(app)
        .get('/api/v1/projects/worker-accessible')
        .query({ page: '1' })
        .expect(200);
      
      await request(app)
        .get('/api/v1/projects/worker-accessible')
        .query({ page: '10' })
        .expect(200);
    });
    
    test('should reject page=0', async () => {
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .query({ page: '0' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'page',
            code: 'INVALID_VALUE',
          }),
        ])
      );
    });
    
    test('should reject negative page number', async () => {
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .query({ page: '-1' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    test('should reject non-integer page', async () => {
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .query({ page: 'abc' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    test('should accept valid limit parameter', async () => {
      await request(app)
        .get('/api/v1/projects/worker-accessible')
        .query({ limit: '1' })
        .expect(200);
      
      await request(app)
        .get('/api/v1/projects/worker-accessible')
        .query({ limit: '100' })
        .expect(200);
    });
    
    test('should reject limit=0', async () => {
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .query({ limit: '0' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    test('should reject limit > 100', async () => {
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .query({ limit: '101' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    test('should accept valid status values', async () => {
      const validStatuses = ['1', '2', '3'];
      
      for (const status of validStatuses) {
        await request(app)
          .get('/api/v1/projects/worker-accessible')
          .query({ status })
          .expect(200);
      }
    });
    
    test('should reject invalid status value', async () => {
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .query({ status: 'invalid_status' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    test('should accept valid sort_by values', async () => {
      const validSortBy = ['create_at', 'project_name', 'update_at'];
      
      for (const sortBy of validSortBy) {
        await request(app)
          .get('/api/v1/projects/worker-accessible')
          .query({ sort_by: sortBy })
          .expect(200);
      }
    });
    
    test('should reject invalid sort_by value', async () => {
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .query({ sort_by: 'invalid_field' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    test('should accept valid order values', async () => {
      await request(app)
        .get('/api/v1/projects/worker-accessible')
        .query({ order: 'asc' })
        .expect(200);
      
      await request(app)
        .get('/api/v1/projects/worker-accessible')
        .query({ order: 'desc' })
        .expect(200);
    });
    
    test('should reject invalid order value', async () => {
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .query({ order: 'invalid_order' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    test('should accept multiple valid query parameters', async () => {
      await request(app)
        .get('/api/v1/projects/worker-accessible')
        .query({
          page: '2',
          limit: '50',
          status: '2',
          sort_by: 'project_name',
          order: 'asc',
        })
        .expect(200);
    });
    
    test('should return proper error response structure', async () => {
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .query({ page: '0' })
        .expect(400);
      
      // エラーレスポンスの構造を確認
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('details');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');
      
      // detailsの構造を確認
      expect(Array.isArray(response.body.error.details)).toBe(true);
      expect(response.body.error.details[0]).toHaveProperty('field');
      expect(response.body.error.details[0]).toHaveProperty('message');
      expect(response.body.error.details[0]).toHaveProperty('code');
    });
  });

  describe('Task 4.2: エクスポートとserver.ts統合', () => {
    test('projectRoutes.tsがdefault exportしている', () => {
      // projectRoutesがRouter型（function）であることを確認
      expect(projectRoutes).toBeDefined();
      expect(typeof projectRoutes).toBe('function');
    });

    test('ルーターが/api/v1/projectsにマウントされている', async () => {
      // /api/v1/projectsプレフィックスでアクセス可能
      await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(200);
    });

    test('プレフィックスなしではアクセスできない', async () => {
      // /projectsプレフィックスなしでは404
      await request(app)
        .get('/worker-accessible')
        .expect(404);
    });

    test('静的ルートが動的ルートより優先される', async () => {
      // /worker-accessibleが/:projectIdとして解釈されない
      const response = await request(app)
        .get('/api/v1/projects/worker-accessible')
        .expect(200);

      // UUIDエラーメッセージが含まれていないことを確認
      const bodyText = JSON.stringify(response.body).toLowerCase();
      expect(bodyText).not.toContain('uuid');
      expect(bodyText).not.toContain('invalid');
    });
  });
});

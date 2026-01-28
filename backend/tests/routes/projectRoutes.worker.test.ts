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

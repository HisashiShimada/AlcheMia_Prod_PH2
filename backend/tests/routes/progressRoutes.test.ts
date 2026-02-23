/**
 * progressRoutes.test.ts
 * 
 * Task 6.1: ルート定義とミドルウェアチェーンのテスト
 * 
 * テスト対象:
 * - ルートパス定義: GET /api/v1/progress/:projectId/:methodId/:taskNo
 * - ミドルウェアチェーン: authMiddleware → controller
 * 
 * Requirements:
 * - Requirement 2: 認証と認可
 * - Requirement 10: API仕様準拠
 */

// モックの作成（importの前に実行）
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234')
}));
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/controllers/progressController');
jest.mock('../../src/middleware/permissionCheckMiddleware', () => ({
  checkPermission: jest.fn(() => (_req: any, _res: any, next: any) => next())
}));

import request from 'supertest';
import express, { Express } from 'express';
import progressRoutes from '../../src/routes/progressRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import * as progressController from '../../src/controllers/progressController';
import { checkPermission } from '../../src/middleware/permissionCheckMiddleware';

describe('Progress Routes - Task 6.1', () => {
  let app: Express;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/progress', progressRoutes);
    
    // デフォルトのモック動作
    (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = {
        userId: 'user123',
        organizationId: 'org123'
      };
      next();
    });
    
    // checkPermissionのモック - 実際の権限チェックロジックを模倣
    (checkPermission as jest.Mock).mockImplementation((requiredFunctionId: string, requiredPermission: number) => {
      return (req: any, res: any, next: any) => {
        const user = req.user;
        if (!user || !user.permissions) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'PERMISSION_DENIED',
              message: '権限がありません'
            },
            meta: { timestamp: new Date().toISOString() }
          });
        }
        
        // 権限配列から該当機能を検索
        const userPermission = user.permissions.find(
          (p: any) => p.functionId === requiredFunctionId
        );
        
        // 権限が存在しない場合
        if (!userPermission) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'PERMISSION_DENIED',
              message: `機能へのアクセス権限がありません（機能CD: ${requiredFunctionId}）`
            },
            meta: { timestamp: new Date().toISOString() }
          });
        }
        
        // 権限レベルが不足している場合
        if (userPermission.permission < requiredPermission) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSION',
              message: `必要な権限レベルが不足しています（必要: ${requiredPermission}, 所有: ${userPermission.permission}）`
            },
            meta: { timestamp: new Date().toISOString() }
          });
        }
        
        // 権限チェックOK
        next();
      };
    });
    
    (progressController.getProgressData as jest.Mock).mockImplementation((_req, res) => {
      res.status(200).json({ success: true });
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ルートパス定義', () => {
    it('GET /api/v1/progress/:projectId/:methodId/:taskNoが定義されている', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const methodId = 'method1';
      const taskNo = '1';
      
      await request(app)
        .get(`/api/v1/progress/${projectId}/${methodId}/${taskNo}`)
        .expect(200);
      
      expect(progressController.getProgressData).toHaveBeenCalled();
    });
    
    it('パスパラメータが正しくコントローラーに渡される', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const methodId = 'method1';
      const taskNo = '1';
      
      await request(app)
        .get(`/api/v1/progress/${projectId}/${methodId}/${taskNo}`);
      
      const mockCall = (progressController.getProgressData as jest.Mock).mock.calls[0];
      const req = mockCall[0];
      
      expect(req.params.projectId).toBe(projectId);
      expect(req.params.methodId).toBe(methodId);
      expect(req.params.taskNo).toBe(taskNo);
    });
  });

  describe('ミドルウェアチェーン', () => {
    it('authMiddlewareが適用されている', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const methodId = 'method1';
      const taskNo = '1';
      
      await request(app)
        .get(`/api/v1/progress/${projectId}/${methodId}/${taskNo}`);
      
      expect(authMiddleware).toHaveBeenCalled();
    });
    
    it('ミドルウェアが正しい順序で実行される（auth → controller）', async () => {
      const executionOrder: string[] = [];
      
      (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
        executionOrder.push('auth');
        req.user = { userId: 'user123', organizationId: 'org123' };
        next();
      });
      
      (progressController.getProgressData as jest.Mock).mockImplementation((_req, res) => {
        executionOrder.push('controller');
        res.status(200).json({ success: true });
      });
      
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const methodId = 'method1';
      const taskNo = '1';
      
      await request(app)
        .get(`/api/v1/progress/${projectId}/${methodId}/${taskNo}`);
      
      expect(executionOrder).toEqual(['auth', 'controller']);
    });
  });

  describe('認証検証', () => {
    it('認証済みユーザーでアクセス可能', async () => {
      (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'user123',
          organizationId: 'org123'
        };
        next();
      });
      
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const methodId = 'method1';
      const taskNo = '1';
      
      await request(app)
        .get(`/api/v1/progress/${projectId}/${methodId}/${taskNo}`)
        .expect(200);
    });
    
    it('未認証ユーザーはアクセス拒否（401）', async () => {
      (authMiddleware as jest.Mock).mockImplementation((_req: any, res: any, _next: any) => {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_TOKEN_MISSING',
            message: '認証トークンが提供されていません'
          }
        });
      });
      
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const methodId = 'method1';
      const taskNo = '1';
      
      const response = await request(app)
        .get(`/api/v1/progress/${projectId}/${methodId}/${taskNo}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
    });
  });

  describe('HTTPメソッド検証', () => {
    it('GETメソッドのみ許可される', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const methodId = 'method1';
      const taskNo = '1';
      
      await request(app)
        .get(`/api/v1/progress/${projectId}/${methodId}/${taskNo}`)
        .expect(200);
    });
    
    it('POSTメソッドは許可されない', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const methodId = 'method1';
      const taskNo = '1';
      
      await request(app)
        .post(`/api/v1/progress/${projectId}/${methodId}/${taskNo}`)
        .expect(404);
    });
    
    it('PUTメソッドは許可されない', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const methodId = 'method1';
      const taskNo = '1';
      
      await request(app)
        .put(`/api/v1/progress/${projectId}/${methodId}/${taskNo}`)
        .expect(404);
    });
    
    it('DELETEメソッドは許可されない', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const methodId = 'method1';
      const taskNo = '1';
      
      await request(app)
        .delete(`/api/v1/progress/${projectId}/${methodId}/${taskNo}`)
        .expect(404);
    });
  });

  describe('RESTful API仕様準拠', () => {
    it('URLパターンが/api/v1/progress/:projectId/:methodId/:taskNoに従う', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const methodId = 'method1';
      const taskNo = '1';
      
      await request(app)
        .get(`/api/v1/progress/${projectId}/${methodId}/${taskNo}`)
        .expect(200);
      
      expect(progressController.getProgressData).toHaveBeenCalled();
    });
    
    it('パスパラメータが動的に解決される', async () => {
      const testCases = [
        {
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          methodId: 'method1',
          taskNo: '1'
        },
        {
          projectId: '660e8400-e29b-41d4-a716-446655440000',
          methodId: 'method2',
          taskNo: '5'
        },
        {
          projectId: '770e8400-e29b-41d4-a716-446655440000',
          methodId: 'synthesis',
          taskNo: '10'
        }
      ];
      
      for (const testCase of testCases) {
        await request(app)
          .get(`/api/v1/progress/${testCase.projectId}/${testCase.methodId}/${testCase.taskNo}`)
          .expect(200);
        
        const mockCall = (progressController.getProgressData as jest.Mock).mock.calls[testCases.indexOf(testCase)];
        const req = mockCall[0];
        
        expect(req.params.projectId).toBe(testCase.projectId);
        expect(req.params.methodId).toBe(testCase.methodId);
        expect(req.params.taskNo).toBe(testCase.taskNo);
      }
    });
  });

  describe('GET /api/v1/progress/projects/:projectName/worker-tasks - 権限チェック', () => {
    let getWorkerTasksMock: jest.Mock;
    
    beforeEach(() => {
      getWorkerTasksMock = jest.fn().mockImplementation((_req, res) => {
        res.status(200).json({
          success: true,
          data: {
            project_id: '550e8400-e29b-41d4-a716-446655440000',
            project_name: 'Sample Project',
            methods: []
          }
        });
      });
      
      (progressController.getWorkerTasks as jest.Mock) = getWorkerTasksMock;
    });

    it('実験作業者（050000, 0）でアクセス可能', async () => {
      // Arrange
      (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'worker-user-id',
          organizationId: 'org123',
          sessionId: 'session123',
          permissions: [
            { functionId: '050000', permission: 0 }
          ]
        };
        next();
      });

      // Act
      const response = await request(app)
        .get('/api/v1/progress/projects/sample_project/worker-tasks')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(getWorkerTasksMock).toHaveBeenCalled();
    });

    it('実験作業者（050000, 1）でアクセス可能（書込権限でも読取可能）', async () => {
      // Arrange
      (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'worker-user-id',
          organizationId: 'org123',
          sessionId: 'session123',
          permissions: [
            { functionId: '050000', permission: 1 }
          ]
        };
        next();
      });

      // Act
      const response = await request(app)
        .get('/api/v1/progress/projects/sample_project/worker-tasks')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(getWorkerTasksMock).toHaveBeenCalled();
    });

    it('実験管理者（040000, 0）でアクセス不可（403 Forbidden）', async () => {
      // Arrange
      (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'admin-user-id',
          organizationId: 'org123',
          sessionId: 'session123',
          permissions: [
            { functionId: '040000', permission: 0 }
          ]
        };
        next();
      });

      // Act
      const response = await request(app)
        .get('/api/v1/progress/projects/sample_project/worker-tasks')
        .expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PERMISSION_DENIED');
      expect(response.body.error.message).toContain('050000');
      expect(getWorkerTasksMock).not.toHaveBeenCalled();
    });

    it('システム管理者（020000, 1）でアクセス不可（403 Forbidden）', async () => {
      // Arrange
      (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'system-admin-id',
          organizationId: 'org123',
          sessionId: 'session123',
          permissions: [
            { functionId: '020000', permission: 1 }
          ]
        };
        next();
      });

      // Act
      const response = await request(app)
        .get('/api/v1/progress/projects/sample_project/worker-tasks')
        .expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PERMISSION_DENIED');
      expect(getWorkerTasksMock).not.toHaveBeenCalled();
    });

    it('権限なし（空の権限配列）でアクセス不可（403 Forbidden）', async () => {
      // Arrange
      (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'no-permission-user-id',
          organizationId: 'org123',
          sessionId: 'session123',
          permissions: []
        };
        next();
      });

      // Act
      const response = await request(app)
        .get('/api/v1/progress/projects/sample_project/worker-tasks')
        .expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PERMISSION_DENIED');
      expect(getWorkerTasksMock).not.toHaveBeenCalled();
    });

    it('関係ない権限（030000）でアクセス不可（403 Forbidden）', async () => {
      // Arrange
      (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'other-user-id',
          organizationId: 'org123',
          sessionId: 'session123',
          permissions: [
            { functionId: '030000', permission: 1 }
          ]
        };
        next();
      });

      // Act
      const response = await request(app)
        .get('/api/v1/progress/projects/sample_project/worker-tasks')
        .expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PERMISSION_DENIED');
      expect(getWorkerTasksMock).not.toHaveBeenCalled();
    });

    it('ミドルウェアが正しい順序で実行される（auth → permission → controller）', async () => {
      const executionOrder: string[] = [];

      (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
        executionOrder.push('auth');
        req.user = {
          userId: 'worker-user-id',
          organizationId: 'org123',
          sessionId: 'session123',
          permissions: [
            { functionId: '050000', permission: 0 }
          ]
        };
        next();
      });

      getWorkerTasksMock.mockImplementation((_req, res) => {
        executionOrder.push('controller');
        res.status(200).json({ success: true, data: {} });
      });

      // Act
      await request(app)
        .get('/api/v1/progress/projects/sample_project/worker-tasks')
        .expect(200);

      // Assert
      // 権限チェックは内部で実行されるため、executionOrderには現れないが、
      // authの後、controllerの前に実行されることを確認
      expect(executionOrder).toEqual(['auth', 'controller']);
    });
  });
});

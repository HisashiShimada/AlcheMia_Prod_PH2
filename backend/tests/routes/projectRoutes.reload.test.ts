/**
 * ProjectRoutes - reload エンドポイントテスト
 * 
 * Task 3.2: Routerのエンドポイント定義
 */

import request from 'supertest';
import express, { Express } from 'express';
import projectRoutes from '../../src/routes/projectRoutes';
import * as projectController from '../../src/controllers/projectController';
import { authMiddleware } from '../../src/middleware/authMiddleware';

// モック設定
jest.mock('../../src/controllers/projectController');
jest.mock('../../src/middleware/authMiddleware');

describe('POST /api/v1/projects/:projectId/reload', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/projects', projectRoutes);
    
    // モックのリセット
    jest.clearAllMocks();
    
    // authMiddleware モック
    (authMiddleware as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = {
        userId: 'test-user-id',
        organizationId: 'test-org-id',
        role: 'experiment_admin',
      };
      next();
    });
    
    // projectController.reload モック
    (projectController.reload as jest.Mock).mockImplementation(async (_req, res) => {
      res.status(200).json({
        success: true,
        data: { message: 'Reload completed' },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: 'test-request-id',
        },
      });
    });
  });

  describe('ルーティング', () => {
    it('POST /api/v1/projects/:projectId/reload エンドポイントが存在すること', async () => {
      const response = await request(app)
        .post('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/reload')
        .send();

      // 404でないことを確認（エンドポイントが存在）
      expect(response.status).not.toBe(404);
    });

    it('authMiddleware が適用されていること', async () => {
      await request(app)
        .post('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/reload')
        .send();

      expect(authMiddleware).toHaveBeenCalled();
    });

    it('projectController.reload が呼び出されること', async () => {
      await request(app)
        .post('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/reload')
        .send();

      expect(projectController.reload).toHaveBeenCalled();
    });

    it('projectIdがURLから正しく渡されること', async () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      
      await request(app)
        .post(`/api/v1/projects/${projectId}/reload`)
        .send();

      expect(projectController.reload).toHaveBeenCalled();
      const mockCall = (projectController.reload as jest.Mock).mock.calls[0];
      const req = mockCall[0];
      expect(req.params.projectId).toBe(projectId);
    });
  });

  describe('バリデーション', () => {
    it('UUID形式のprojectIdを受け入れること', async () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        '00000000-0000-0000-0000-000000000000',
      ];

      for (const uuid of validUUIDs) {
        const response = await request(app)
          .post(`/api/v1/projects/${uuid}/reload`)
          .send();

        expect(response.status).toBe(200);
      }
    });
  });

  describe('HTTPメソッド', () => {
    it('POSTメソッドでアクセス可能であること', async () => {
      const response = await request(app)
        .post('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/reload')
        .send();

      expect(response.status).toBe(200);
    });

    it('GETメソッドでアクセスできないこと', async () => {
      const response = await request(app)
        .get('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/reload')
        .send();

      expect(response.status).toBe(404);
    });

    it('PUTメソッドでアクセスできないこと', async () => {
      const response = await request(app)
        .put('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/reload')
        .send();

      expect(response.status).toBe(404);
    });

    it('DELETEメソッドでアクセスできないこと', async () => {
      const response = await request(app)
        .delete('/api/v1/projects/123e4567-e89b-12d3-a456-426614174000/reload')
        .send();

      expect(response.status).toBe(404);
    });
  });
});

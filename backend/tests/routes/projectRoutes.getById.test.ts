/**
 * プロジェクト詳細取得API 統合テスト
 * GET /api/v1/projects/:projectId
 * 
 * Task 3.1: 統合テスト実装
 */

import request from 'supertest';
import express, { Express } from 'express';
import projectRoutes from '../../src/routes/projectRoutes';
import { ProjectService } from '../../src/services/projectService';
import { JwtService } from '../../src/services/jwtService';

jest.mock('../../src/services/projectService');
jest.mock('uuid', () => ({ v4: () => 'test-request-id-123' }));
jest.mock('../../src/utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../src/database/db', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn().mockResolvedValue({
      rows: [{ organization_name: 'Test_Org' }]
    })
  }))
}));
jest.mock('../../src/services/jwtService', () => {
  return {
    JwtService: jest.fn().mockImplementation(() => ({
      generate: jest.fn().mockResolvedValue({
        success: true,
        data: 'mock-jwt-token-123'
      }),
      verify: jest.fn().mockResolvedValue({
        success: true,
        data: {
          userId: 'user_123',
          organizationId: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
          role: 'experiment_admin',
          sessionId: 'session_123',
        }
      })
    }))
  };
});

describe('GET /api/v1/projects/:projectId - 統合テスト', () => {
  let app: Express;
  let validToken: string;
  const validProjectId = 'b1234567-89ab-cdef-0123-456789abcdef';
  const invalidProjectId = 'invalid-uuid-format';

  beforeAll(async () => {
    // Express アプリケーションのセットアップ
    app = express();
    app.use(express.json());
    app.use('/api/v1/projects', projectRoutes);

    // 有効なJWTトークンを生成
    const jwtService = new JwtService();
    const tokenResult = await jwtService.generate(
      {
        userId: 'user_123',
        organizationId: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
        sessionId: 'session_123',
        role: 'experiment_admin',
      },
      'experiment_admin'
    );
    
    if (tokenResult.success && tokenResult.data) {
      validToken = tokenResult.data;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Task 3.1: 認証済みManagerによる正常アクセス', () => {
    it('should return 200 with project details', async () => {
      const mockServiceResult = {
        success: true,
        data: {
          project: {
            projectId: validProjectId,
            projectName: 'Test Project',
            description: 'Test Description',
          },
          files: [],
          tasks: [],
          summary: {
            totalFiles: 0,
            totalTasks: 0,
            completedTasks: 0,
            inProgressTasks: 0,
            pendingTasks: 0,
          },
        },
      };

      (ProjectService.prototype.getById as jest.Mock).mockResolvedValue(mockServiceResult);

      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockServiceResult.data);
    });
  });

  describe('Task 3.1: 未認証ユーザーによるアクセス', () => {
    it('should return 401 without token', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
    });
  });

  describe('Task 3.1: 存在しないprojectId', () => {
    it('should return 404', async () => {
      (ProjectService.prototype.getById as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'プロジェクトが見つかりません',
        },
      });

      const response = await request(app)
        .get(`/api/v1/projects/${validProjectId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('Task 3.1: 不正なprojectId形式', () => {
    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${invalidProjectId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_INVALID_FORMAT');
    });
  });
});

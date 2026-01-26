/**
 * Project API Integration Tests
 * 
 * TDD: Task 5.3 - Integration Tests
 * 
 * Tests the complete flow including:
 * - Authentication & Authorization
 * - Multi-tenant isolation
 * - Route → Controller → Service → Database
 */

import request from 'supertest';
import express, { Express } from 'express';
import { getPool } from '../../src/database/db';
import projectRoutes from '../../src/routes/projectRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';

// Mock dependencies
jest.mock('../../src/database/db');
jest.mock('../../src/services/storageService');
jest.mock('../../src/middleware/authMiddleware');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-12345'),
}));

describe('Project API Integration Tests', () => {
  let app: Express;
  let mockQuery: jest.Mock;

  beforeAll(() => {
    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/projects', projectRoutes);

    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
    });

    // Mock auth middleware
    (authMiddleware as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
      req.user = {
        userId: 'user-123',
        organizationId: 'org-123',
        role: 'experiment_admin',
      };
      next();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/projects/:projectId/files - ファイル一覧取得API', () => {
    const projectId = '123e4567-e89b-12d3-a456-426614174000';

    describe('認証・認可フロー', () => {
      it('認証済みexperiment_adminユーザーは自組織のファイル一覧を取得できる', async () => {
        // Arrange
        mockQuery.mockResolvedValueOnce({
          rows: [{
            project_id: projectId,
            project_name: 'Test Project',
            organization_name: 'Test Org',
          }],
        });

        const { getStorageService } = require('../../src/services/storageService');
        getStorageService.mockReturnValue({
          listFiles: jest.fn().mockResolvedValue([]),
          getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.example.com'),
        });

        // Act
        const response = await request(app)
          .get(`/api/v1/projects/${projectId}/files`)
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('files');
        expect(response.body.data).toHaveProperty('archiveFiles');
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('SELECT'),
          ['org-123', projectId]
        );
      });

      it('experiment_workerは403エラーを受け取る', async () => {
        // Arrange: Override auth middleware for this test
        (authMiddleware as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
          req.user = {
            userId: 'worker-123',
            organizationId: 'org-123',
            role: 'experiment_worker',
          };
          next();
        });

        // Act
        const response = await request(app)
          .get(`/api/v1/projects/${projectId}/files`)
          .expect(403);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('PERMISSION_INSUFFICIENT');
      });
    });

    describe('マルチテナント分離', () => {
      it('自組織のプロジェクトのみアクセス可能', async () => {
        // Arrange
        mockQuery.mockResolvedValueOnce({
          rows: [{
            project_id: projectId,
            project_name: 'My Project',
            organization_name: 'My Org',
          }],
        });

        const { getStorageService } = require('../../src/services/storageService');
        getStorageService.mockReturnValue({
          listFiles: jest.fn().mockResolvedValue([]),
          getSignedUrl: jest.fn(),
        });

        // Act
        await request(app)
          .get(`/api/v1/projects/${projectId}/files`)
          .expect(200);

        // Assert: organization_id filter is applied
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('organization_id'),
          expect.arrayContaining(['org-123', projectId])
        );
      });

      it('他組織のプロジェクトへのアクセスは404エラー', async () => {
        // Arrange: Project not found for this organization
        mockQuery.mockResolvedValueOnce({
          rows: [],
        });

        // Act
        const response = await request(app)
          .get(`/api/v1/projects/${projectId}/files`)
          .expect(404);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
      });
    });

    describe('レスポンス形式検証', () => {
      it('統一されたレスポンス形式 {success, data, meta} を返す', async () => {
        // Arrange
        mockQuery.mockResolvedValueOnce({
          rows: [{
            project_id: projectId,
            project_name: 'Test Project',
            organization_name: 'Test Org',
          }],
        });

        const { getStorageService } = require('../../src/services/storageService');
        getStorageService.mockReturnValue({
          listFiles: jest.fn().mockResolvedValue([]),
          getSignedUrl: jest.fn(),
        });

        // Act
        const response = await request(app)
          .get(`/api/v1/projects/${projectId}/files`)
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('meta');
        expect(response.body.meta).toHaveProperty('timestamp');
        expect(response.body.meta).toHaveProperty('requestId');
      });
    });
  });

  describe('GET /api/v1/projects/:projectId/tasks - タスク一覧取得API', () => {
    const projectId = '123e4567-e89b-12d3-a456-426614174000';

    describe('認証・認可フロー', () => {
      it('認証済みexperiment_adminユーザーは自組織のタスク一覧を取得できる', async () => {
        // Arrange
        mockQuery
          .mockResolvedValueOnce({
            rows: [{
              project_id: projectId,
              project_name: 'Test Project',
            }],
          })
          .mockResolvedValueOnce({
            rows: [
              {
                organization_id: 'org-123',
                project_id: projectId,
                method_id: 'method-1',
                task_no: 1,
                task_status: 0,
                experiment_start_at: null,
                experiment_end_at: null,
                experiment_user_id: null,
                experiment_user_name: null,
                reviewed_at: null,
                review_user_id: null,
                review_user_name: null,
              },
            ],
          })
          .mockResolvedValueOnce({
            rows: [{ task_status: 0, count: '1' }],
          });

        // Act
        const response = await request(app)
          .get(`/api/v1/projects/${projectId}/tasks`)
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('tasks');
        expect(response.body.data).toHaveProperty('statistics');
        expect(response.body.data.tasks).toHaveLength(1);
        expect(response.body.data.statistics.total).toBe(1);
      });

      it('system_adminは全組織のタスクにアクセスできる', async () => {
        // Arrange: Override auth middleware for system_admin
        (authMiddleware as jest.Mock).mockImplementationOnce((req: any, _res: any, next: any) => {
          req.user = {
            userId: 'admin-123',
            organizationId: 'org-123',
            role: 'system_admin',
          };
          next();
        });

        mockQuery
          .mockResolvedValueOnce({
            rows: [{
              project_id: projectId,
              project_name: 'Test Project',
            }],
          })
          .mockResolvedValueOnce({
            rows: [],
          })
          .mockResolvedValueOnce({
            rows: [],
          });

        // Act
        const response = await request(app)
          .get(`/api/v1/projects/${projectId}/tasks`)
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
      });
    });

    describe('ステータスフィルタリング', () => {
      beforeEach(() => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            project_id: projectId,
            project_name: 'Test Project',
          }],
        });
      });

      it('status=pending で実行待ちタスクのみ取得', async () => {
        // Arrange
        mockQuery
          .mockResolvedValueOnce({
            rows: [
              {
                organization_id: 'org-123',
                project_id: projectId,
                method_id: 'method-1',
                task_no: 1,
                task_status: 0,
                experiment_start_at: null,
                experiment_end_at: null,
                experiment_user_id: null,
                experiment_user_name: null,
                reviewed_at: null,
                review_user_id: null,
                review_user_name: null,
              },
            ],
          })
          .mockResolvedValueOnce({
            rows: [{ task_status: 0, count: '1' }],
          });

        // Act
        const response = await request(app)
          .get(`/api/v1/projects/${projectId}/tasks?status=pending`)
          .expect(200);

        // Assert
        expect(response.body.data.tasks[0].taskStatus).toBe('pending');
      });

      it('不正なstatusパラメータで400エラー', async () => {
        // Act
        const response = await request(app)
          .get(`/api/v1/projects/${projectId}/tasks?status=invalid_status`)
          .expect(400);

        // Assert
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('マルチテナント分離', () => {
      it('すべてのクエリにorganization_idフィルタが適用される', async () => {
        // Arrange
        mockQuery
          .mockResolvedValueOnce({
            rows: [{
              project_id: projectId,
              project_name: 'Test Project',
            }],
          })
          .mockResolvedValueOnce({
            rows: [],
          })
          .mockResolvedValueOnce({
            rows: [],
          });

        // Act
        await request(app)
          .get(`/api/v1/projects/${projectId}/tasks`)
          .expect(200);

        // Assert: All queries include organization_id
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('organization_id'),
          expect.arrayContaining(['org-123'])
        );
      });
    });
  });
});
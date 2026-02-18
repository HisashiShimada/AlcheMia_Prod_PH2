/**
 * Experiment Data API Integration Tests
 * 
 * TDD: Task 8.1 - 実験データ一括保存APIの統合テスト
 * 
 * Tests the complete flow including:
 * - Authentication & Authorization
 * - Route → Controller → Service → Repository → Database
 * - Request validation
 * - Response format validation
 * - Transaction management (All or Nothing)
 * 
 * @requirements REQ-1, REQ-2, REQ-6, REQ-7
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
  const mockSaveBatchData = jest.fn();
  return {
    saveBatchData: mockSaveBatchData,
    __mockSaveBatchData: mockSaveBatchData,
  };
});

// モック関数の参照を取得
const experimentDataServiceModule = require('../../src/services/experimentDataService');
const mockSaveBatchDataRef = experimentDataServiceModule.__mockSaveBatchData;

describe('Experiment Data API Integration Tests', () => {
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

  describe('POST /api/v1/experiments/projects/:projectId/methods/:methodId/tasks/:taskNo/data - 実験データ一括保存', () => {
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    const methodId = 'method-001';
    const taskNo = 1;
    const endpoint = `/api/v1/experiments/projects/${projectId}/methods/${methodId}/tasks/${taskNo}/data`;

    const validRequestBody = {
      records: [
        {
          placeId: 'place-001',
          templateType: 'material' as const,
          templateId: 'template-001',
          data: { property1: 'value1', property2: 123 },
          status: 'ready' as const,
          comment: 'Test comment',
        },
        {
          placeId: 'place-002',
          templateType: 'condition' as const,
          templateId: 'template-002',
          data: { temperature: 25, humidity: 60 },
        },
      ],
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
          .post(endpoint)
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
            role: 'viewer', // Workerより下のロール
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
          .post(endpoint)
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

      it('records配列が空の場合、400エラーが返される', async () => {
        // Act
        const response = await request(app)
          .post(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send({ records: [] });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('projectIdがUUID形式でない場合、400エラーが返される', async () => {
        // Arrange
        const invalidEndpoint = `/api/v1/experiments/projects/invalid-uuid/methods/${methodId}/tasks/${taskNo}/data`;

        // Act
        const response = await request(app)
          .post(invalidEndpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(validRequestBody);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('taskNoが1未満の場合、400エラーが返される', async () => {
        // Arrange
        const invalidEndpoint = `/api/v1/experiments/projects/${projectId}/methods/${methodId}/tasks/0/data`;

        // Act
        const response = await request(app)
          .post(invalidEndpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(validRequestBody);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('必須フィールド（placeId）が欠けている場合、400エラーが返される', async () => {
        // Arrange
        const invalidBody = {
          records: [
            {
              // placeId: 欠損
              templateType: 'material',
              templateId: 'template-001',
              data: { property1: 'value1' },
            },
          ],
        };

        // Act
        const response = await request(app)
          .post(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(invalidBody);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('templateTypeが不正な値の場合、400エラーが返される', async () => {
        // Arrange
        const invalidBody = {
          records: [
            {
              placeId: 'place-001',
              templateType: 'invalid_type', // 不正な値
              templateId: 'template-001',
              data: { property1: 'value1' },
            },
          ],
        };

        // Act
        const response = await request(app)
          .post(endpoint)
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
          records: [
            {
              placeId: 'place-001',
              templateType: 'material',
              templateId: 'template-001',
              data: { property1: 'value1' },
              comment: longComment,
            },
          ],
        };

        // Act
        const response = await request(app)
          .post(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(invalidBody);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
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

      it('正常なリクエストの場合、201ステータスとsavedRecords[]が返される', async () => {
        // Arrange
        const mockSavedRecords = [
          {
            id: 'rec-001',
            projectId,
            methodId,
            taskNo,
            placeId: 'place-001',
            templateType: 'material',
            templateId: 'template-001',
            data: { property1: 'value1', property2: 123 },
            status: 'ready',
            comment: 'Test comment',
            recordedBy: 'user-123',
            recordedAt: '2024-12-25T10:00:00.000Z',
            organizationId: 'org-123',
            createdAt: '2024-12-25T10:00:00.000Z',
            updatedAt: '2024-12-25T10:00:00.000Z',
          },
          {
            id: 'rec-002',
            projectId,
            methodId,
            taskNo,
            placeId: 'place-002',
            templateType: 'condition',
            templateId: 'template-002',
            data: { temperature: 25, humidity: 60 },
            status: null,
            comment: null,
            recordedBy: 'user-123',
            recordedAt: '2024-12-25T10:00:00.000Z',
            organizationId: 'org-123',
            createdAt: '2024-12-25T10:00:00.000Z',
            updatedAt: '2024-12-25T10:00:00.000Z',
          },
        ];

        mockSaveBatchDataRef.mockResolvedValueOnce(mockSavedRecords);

        // Act
        const response = await request(app)
          .post(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(validRequestBody);

        // Assert
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.saved).toBe(2);
        expect(response.body.data.records).toHaveLength(2);
      });

      it('レスポンス形式が仕様通り（success, data, meta）であることを確認', async () => {
        // Arrange
        const mockSavedRecords = [
          {
            id: 'rec-001',
            projectId,
            methodId,
            taskNo,
            placeId: 'place-001',
            templateType: 'material',
            templateId: 'template-001',
            data: { property1: 'value1' },
            status: 'ready',
            comment: null,
            recordedBy: 'user-123',
            recordedAt: '2024-12-25T10:00:00.000Z',
            organizationId: 'org-123',
            createdAt: '2024-12-25T10:00:00.000Z',
            updatedAt: '2024-12-25T10:00:00.000Z',
          },
        ];

        mockSaveBatchDataRef.mockResolvedValueOnce(mockSavedRecords);

        // Act
        const response = await request(app)
          .post(endpoint)
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

      it('保存されたレコードに必要な情報が含まれることを確認', async () => {
        // Arrange
        const mockSavedRecords = [
          {
            id: 'rec-001',
            projectId,
            methodId,
            taskNo,
            placeId: 'place-001',
            templateType: 'material',
            templateId: 'template-001',
            data: { property1: 'value1', property2: 123 },
            status: 'ready',
            comment: 'Test comment',
            recordedBy: 'user-123',
            recordedAt: '2024-12-25T10:00:00.000Z',
            organizationId: 'org-123',
            createdAt: '2024-12-25T10:00:00.000Z',
            updatedAt: '2024-12-25T10:00:00.000Z',
          },
        ];

        mockSaveBatchDataRef.mockResolvedValueOnce(mockSavedRecords);

        // Act
        const response = await request(app)
          .post(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(validRequestBody);

        // Assert
        const record = response.body.data.records[0];

        expect(record).toHaveProperty('id', 'rec-001');
        expect(record).toHaveProperty('projectId', projectId);
        expect(record).toHaveProperty('methodId', methodId);
        expect(record).toHaveProperty('taskNo', taskNo);
        expect(record).toHaveProperty('placeId', 'place-001');
        expect(record).toHaveProperty('templateType', 'material');
        expect(record).toHaveProperty('templateId', 'template-001');
        expect(record).toHaveProperty('data');
        expect(record).toHaveProperty('status', 'ready');
        expect(record).toHaveProperty('comment', 'Test comment');
        expect(record).toHaveProperty('recordedBy', 'user-123');
        expect(record).toHaveProperty('recordedAt');
        expect(record).toHaveProperty('organizationId', 'org-123');
        expect(record).toHaveProperty('createdAt');
        expect(record).toHaveProperty('updatedAt');

        // 日時フィールドがISO 8601形式であることを確認
        expect(record.recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(record.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(record.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
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

      it('プロジェクトステータスがarchivedの場合、403エラーが返される', async () => {
        // Arrange
        const ProjectNotEditableError = class extends Error {
          statusCode = 403;
          name = 'ProjectNotEditableError';
        };

        mockSaveBatchDataRef.mockRejectedValueOnce(
          new ProjectNotEditableError('このプロジェクトは現在編集できません')
        );

        // Act
        const response = await request(app)
          .post(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(validRequestBody);

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ProjectNotEditableError');
      });

      it('records配列の途中で失敗した場合、すべてロールバックされる（All or Nothing）', async () => {
        // Arrange
        const DatabaseError = class extends Error {
          statusCode = 500;
          name = 'DatabaseError';
        };

        mockSaveBatchDataRef.mockRejectedValueOnce(
          new DatabaseError('データベースエラーが発生しました')
        );

        // Act
        const response = await request(app)
          .post(endpoint)
          .set('Authorization', 'Bearer mock-jwt-token')
          .send(validRequestBody);

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('DatabaseError');
      });
    });
  });
});

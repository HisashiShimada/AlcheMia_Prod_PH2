/**
 * 実験データ一括保存APIのバリデーションテスト
 * 
 * @description Task 5.1のテスト - TDD RED Phase
 */

import request from 'supertest';
import express, { Express } from 'express';
import experimentRoutes from '../../src/routes/experimentRoutes';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { tenantIsolation } from '../../src/middleware/tenantIsolation';

// モックの設定
jest.mock('../../src/middleware/authMiddleware');
jest.mock('../../src/middleware/tenantIsolation');
jest.mock('../../src/controllers/experimentController');

const mockAuthMiddleware = authMiddleware as jest.MockedFunction<typeof authMiddleware>;
const mockTenantIsolation = tenantIsolation as jest.MockedFunction<typeof tenantIsolation>;

describe('POST /projects/:projectId/methods/:methodId/tasks/:taskNo/data - Validation Tests', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // モックミドルウェアの設定
    mockAuthMiddleware.mockImplementation((req: any, _res, next) => {
      req.user = {
        id: 'user-123',
        organizationId: 'org-123',
        role: 'worker'
      };
      next();
      return Promise.resolve();
    });

    mockTenantIsolation.mockImplementation((req: any, _res, next) => {
      req.organizationId = 'org-123';
      next();
    });

    app.use('/api/v1/experiments', experimentRoutes);
  });

  describe('パスパラメータのバリデーション', () => {
    it('projectIdがUUID形式でない場合、400エラーを返す', async () => {
      const response = await request(app)
        .post('/api/v1/experiments/projects/invalid-uuid/methods/method1/tasks/1/data')
        .send({
          records: [
            {
              placeId: 'place1',
              templateType: 'material',
              templateId: 'template1',
              data: {}
            }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'projectId',
            message: expect.stringContaining('UUID')
          })
        ])
      );
    });

    it('methodIdが空の場合、400エラーを返す', async () => {
      const response = await request(app)
        .post('/api/v1/experiments/projects/123e4567-e89b-12d3-a456-426614174000/methods/ /tasks/1/data')
        .send({
          records: [
            {
              placeId: 'place1',
              templateType: 'material',
              templateId: 'template1',
              data: {}
            }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'methodId'
          })
        ])
      );
    });

    it('taskNoが1未満の場合、400エラーを返す', async () => {
      const response = await request(app)
        .post('/api/v1/experiments/projects/123e4567-e89b-12d3-a456-426614174000/methods/method1/tasks/0/data')
        .send({
          records: [
            {
              placeId: 'place1',
              templateType: 'material',
              templateId: 'template1',
              data: {}
            }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'taskNo',
            message: expect.stringContaining('1以上')
          })
        ])
      );
    });

    it('taskNoが整数でない場合、400エラーを返す', async () => {
      const response = await request(app)
        .post('/api/v1/experiments/projects/123e4567-e89b-12d3-a456-426614174000/methods/method1/tasks/abc/data')
        .send({
          records: [
            {
              placeId: 'place1',
              templateType: 'material',
              templateId: 'template1',
              data: {}
            }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('records配列のバリデーション', () => {
    const validProjectId = '123e4567-e89b-12d3-a456-426614174000';
    const validMethodId = 'method1';
    const validTaskNo = '1';

    it('recordsが配列でない場合、400エラーを返す', async () => {
      const response = await request(app)
        .post(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/tasks/${validTaskNo}/data`)
        .send({
          records: 'not-an-array'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'records',
            message: expect.stringContaining('配列')
          })
        ])
      );
    });

    it('recordsが空配列の場合、400エラーを返す', async () => {
      const response = await request(app)
        .post(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/tasks/${validTaskNo}/data`)
        .send({
          records: []
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'records',
            message: expect.stringContaining('1件以上')
          })
        ])
      );
    });

    it('recordsが51件以上の場合、400エラーを返す', async () => {
      const records = Array.from({ length: 51 }, (_, i) => ({
        placeId: `place${i}`,
        templateType: 'material',
        templateId: 'template1',
        data: {}
      }));

      const response = await request(app)
        .post(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/tasks/${validTaskNo}/data`)
        .send({ records });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'records',
            message: expect.stringContaining('50件以下')
          })
        ])
      );
    });
  });

  describe('records要素のバリデーション', () => {
    const validProjectId = '123e4567-e89b-12d3-a456-426614174000';
    const validMethodId = 'method1';
    const validTaskNo = '1';

    it('placeIdが空の場合、400エラーを返す', async () => {
      const response = await request(app)
        .post(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/tasks/${validTaskNo}/data`)
        .send({
          records: [
            {
              placeId: '',
              templateType: 'material',
              templateId: 'template1',
              data: {}
            }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'records[0].placeId'
          })
        ])
      );
    });

    it('templateTypeが不正な値の場合、400エラーを返す', async () => {
      const response = await request(app)
        .post(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/tasks/${validTaskNo}/data`)
        .send({
          records: [
            {
              placeId: 'place1',
              templateType: 'invalid-type',
              templateId: 'template1',
              data: {}
            }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'records[0].templateType',
            message: expect.stringMatching(/material|condition|result/)
          })
        ])
      );
    });

    it('templateIdが空の場合、400エラーを返す', async () => {
      const response = await request(app)
        .post(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/tasks/${validTaskNo}/data`)
        .send({
          records: [
            {
              placeId: 'place1',
              templateType: 'material',
              templateId: '',
              data: {}
            }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('dataが欠けている場合、400エラーを返す', async () => {
      const response = await request(app)
        .post(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/tasks/${validTaskNo}/data`)
        .send({
          records: [
            {
              placeId: 'place1',
              templateType: 'material',
              templateId: 'template1'
            }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('statusが不正な値の場合、400エラーを返す', async () => {
      const response = await request(app)
        .post(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/tasks/${validTaskNo}/data`)
        .send({
          records: [
            {
              placeId: 'place1',
              templateType: 'material',
              templateId: 'template1',
              data: {},
              status: 'invalid-status'
            }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'records[0].status',
            message: expect.stringMatching(/initial|preparing|ready|running|paused|completed|error/)
          })
        ])
      );
    });

    it('commentが2000文字を超える場合、400エラーを返す', async () => {
      const longComment = 'a'.repeat(2001);

      const response = await request(app)
        .post(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/tasks/${validTaskNo}/data`)
        .send({
          records: [
            {
              placeId: 'place1',
              templateType: 'material',
              templateId: 'template1',
              data: {},
              comment: longComment
            }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'records[0].comment',
            message: expect.stringContaining('2000文字')
          })
        ])
      );
    });
  });

  describe('正常なバリデーション', () => {
    it('すべてのバリデーションが成功した場合、コントローラーが呼ばれる', async () => {
      const validProjectId = '123e4567-e89b-12d3-a456-426614174000';
      const validMethodId = 'method1';
      const validTaskNo = '1';

      const validRecords = [
        {
          placeId: 'place1',
          templateType: 'material',
          templateId: 'template1',
          data: { key: 'value' }
        },
        {
          placeId: 'place2',
          templateType: 'condition',
          templateId: 'template2',
          data: { temp: 25 },
          status: 'ready',
          comment: 'Test comment'
        }
      ];

      // コントローラーのモック（正常応答）
      const experimentController = require('../../src/controllers/experimentController');
      experimentController.saveBatchData = jest.fn((_req, res) => {
        res.status(201).json({
          success: true,
          data: { saved: 2, records: [] },
          meta: { timestamp: new Date().toISOString(), requestId: 'test-id' }
        });
      });

      const response = await request(app)
        .post(`/api/v1/experiments/projects/${validProjectId}/methods/${validMethodId}/tasks/${validTaskNo}/data`)
        .send({ records: validRecords });

      expect(response.status).toBe(201);
      expect(experimentController.saveBatchData).toHaveBeenCalled();
    });
  });
});

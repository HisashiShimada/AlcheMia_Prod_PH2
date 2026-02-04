/**
 * バリデーションミドルウェアのユニットテスト
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { handleValidationErrors } from '../../src/middleware/validationMiddleware';

// validationResultをモック化
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
  param: jest.fn(),
  body: jest.fn(),
  query: jest.fn(),
}));

describe('handleValidationErrors', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    req = {
      headers: {
        'x-request-id': 'test-request-id',
      },
    };

    res = {
      status: statusMock,
      json: jsonMock,
    };

    next = jest.fn();

    jest.clearAllMocks();
  });

  describe('バリデーションエラーがない場合', () => {
    it('next()を呼び出す', () => {
      // validationResultがエラーなしを返す
      (validationResult as jest.Mock).mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      });

      handleValidationErrors(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
    });
  });

  describe('バリデーションエラーがある場合', () => {
    it('400ステータスで統一形式のエラーレスポンスを返す', () => {
      // validationResultがエラーを返す
      const mockErrors = [
        {
          type: 'field',
          path: 'projectName',
          value: '',
          msg: 'projectNameは必須です',
          location: 'body',
        },
      ];

      (validationResult as jest.Mock).mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      handleValidationErrors(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラーが発生しました',
          details: [
            {
              field: 'projectName',
              message: 'projectNameは必須です',
              code: 'REQUIRED_FIELD',
              value: '',
            },
          ],
        },
        meta: {
          timestamp: expect.any(String),
          requestId: 'test-request-id',
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('複数のバリデーションエラーをdetails配列で返す', () => {
      const mockErrors = [
        {
          type: 'field',
          path: 'projectName',
          value: '',
          msg: 'projectNameは必須です',
          location: 'body',
        },
        {
          type: 'field',
          path: 'description',
          value: 'a'.repeat(2000),
          msg: 'descriptionは1000文字以内である必要があります',
          location: 'body',
        },
      ];

      (validationResult as jest.Mock).mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      handleValidationErrors(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      const response = jsonMock.mock.calls[0][0];
      expect(response.error.details).toHaveLength(2);
      expect(response.error.details[0].field).toBe('projectName');
      expect(response.error.details[1].field).toBe('description');
    });

    it('requestIdがない場合、UUIDを自動生成する', () => {
      req.headers = {};

      const mockErrors = [
        {
          type: 'field',
          path: 'projectName',
          value: '',
          msg: 'projectNameは必須です',
          location: 'body',
        },
      ];

      (validationResult as jest.Mock).mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      handleValidationErrors(req as Request, res as Response, next);

      const response = jsonMock.mock.calls[0][0];
      expect(response.meta.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });
  });

  describe('エラーコードのマッピング', () => {
    it('「必須」を含むメッセージをREQUIRED_FIELDにマッピング', () => {
      const mockErrors = [
        {
          type: 'field',
          path: 'username',
          value: '',
          msg: 'usernameは必須です',
          location: 'body',
        },
      ];

      (validationResult as jest.Mock).mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      handleValidationErrors(req as Request, res as Response, next);

      const response = jsonMock.mock.calls[0][0];
      expect(response.error.details[0].code).toBe('REQUIRED_FIELD');
    });

    it('「文字」を含むメッセージをSTRING_LENGTH_INVALIDにマッピング', () => {
      const mockErrors = [
        {
          type: 'field',
          path: 'projectName',
          value: 'a'.repeat(300),
          msg: 'projectNameは1〜255文字である必要があります',
          location: 'body',
        },
      ];

      (validationResult as jest.Mock).mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      handleValidationErrors(req as Request, res as Response, next);

      const response = jsonMock.mock.calls[0][0];
      expect(response.error.details[0].code).toBe('STRING_LENGTH_INVALID');
    });

    it('「UUID」を含むメッセージをINVALID_FORMATにマッピング', () => {
      const mockErrors = [
        {
          type: 'field',
          path: 'projectId',
          value: 'invalid-uuid',
          msg: 'projectIdはUUID形式である必要があります',
          location: 'param',
        },
      ];

      (validationResult as jest.Mock).mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      handleValidationErrors(req as Request, res as Response, next);

      const response = jsonMock.mock.calls[0][0];
      expect(response.error.details[0].code).toBe('INVALID_FORMAT');
    });

    it('「整数」を含むメッセージをINVALID_TYPEにマッピング', () => {
      const mockErrors = [
        {
          type: 'field',
          path: 'page',
          value: 'abc',
          msg: 'pageは1以上の整数である必要があります',
          location: 'query',
        },
      ];

      (validationResult as jest.Mock).mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      handleValidationErrors(req as Request, res as Response, next);

      const response = jsonMock.mock.calls[0][0];
      expect(response.error.details[0].code).toBe('INVALID_TYPE');
    });

    it('マッピングできないメッセージはVALIDATION_ERRORにマッピング', () => {
      const mockErrors = [
        {
          type: 'field',
          path: 'customField',
          value: 'test',
          msg: 'Some custom error message',
          location: 'body',
        },
      ];

      (validationResult as jest.Mock).mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      handleValidationErrors(req as Request, res as Response, next);

      const response = jsonMock.mock.calls[0][0];
      expect(response.error.details[0].code).toBe('VALIDATION_ERROR');
    });
  });
});
</content>
<task_progress>
- [x] Phase 1-3: 調査・設計・基本実装（完了）
- [ ] Phase 6: 既存コードへの適用
  - [ ] Phase 6-1: サンプル実装（PUT /api/v1/projects/:projectId/methods/:methodId/tasks/:taskNo/status）
    - [x] taskRoutes.tsにhandleValidationErrors追加
    - [x] バリデーションルール定義追加
    - [x] taskController.tsからバリデーション処理削除
    - [x] ユニットテストの作成
    - [ ] 統合テストの作成
    - [ ] 動作確認
  - [ ] Phase 6-2-5: その他のルートへの適用
- [ ] Phase 7-8: テスト・ドキュメント作成
</task_progress>
</replace_in_file>

次に、統合テストを作成します。

<write_to_file>
<path>backend/tests/routes/taskRoutes.validation.test.ts</path>
<content>/**
 * タスクルートのバリデーション統合テスト
 */

import request from 'supertest';
import express from 'express';
import taskRoutes from '../../src/routes/taskRoutes';
import { auth } from '../../src/middleware/auth';
import { tenantIsolation } from '../../src/middleware/tenantIsolation';

// モックの設定
jest.mock('../../src/middleware/auth');
jest.mock('../../src/middleware/tenantIsolation');
jest.mock('../../src/middleware/permissionCheck', () => ({
  permissionCheck: () => (req: any, res: any, next: any) => next(),
}));
jest.mock('../../src/controllers/taskController');

describe('PUT /api/v1/projects/:projectId/methods/:methodId/tasks/:taskNo/status - バリデーション', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // 認証ミドルウェアのモック
    (auth as jest.Mock).mockImplementation((req, res, next) => {
      req.user = {
        userId: 'test-user-id',
        username: 'testuser',
        role: 'experiment_worker',
      };
      next();
    });

    // tenantIsolationミドルウェアのモック
    (tenantIsolation as jest.Mock).mockImplementation((req, res, next) => {
      req.organizationId = 'test-org-id';
      req.organizationPrefix = 'test_org';
      next();
    });

    // ルートを登録
    app.use('/api/v1', taskRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('正常系', () => {
    it('正しいリクエストで次のミドルウェアに進む', async () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      const validMethodId = '123e4567-e89b-12d3-a456-426614174001';

      const response = await request(app)
        .put(`/api/v1/projects/${validUUID}/methods/${validMethodId}/tasks/1/status`)
        .send({
          status: 'completed',
          comment: 'タスク完了',
        });

      // バリデーションエラーが発生しないことを確認
      // （コントローラーのモックが呼ばれる）
      expect(response.status).not.toBe(400);
    });
  });

  describe('異常系: projectId', () => {
    it('projectIdが無効なUUID形式の場合、400エラーを返す', async () => {
      const invalidProjectId = 'invalid-uuid';
      const validMethodId = '123e4567-e89b-12d3-a456-426614174001';

      const response = await request(app)
        .put(`/api/v1/projects/${invalidProjectId}/methods/${validMethodId}/tasks/1/status`)
        .send({
          status: 'completed',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'projectId',
            code: 'INVALID_FORMAT',
          }),
        ])
      );
    });
  });

  describe('異常系: methodId', () => {
    it('methodIdが無効なUUID形式の場合、400エラーを返す', async () => {
      const validProjectId = '123e4567-e89b-12d3-a456-426614174000';
      const invalidMethodId = 'not-a-uuid';

      const response = await request(app)
        .put(`/api/v1/projects/${validProjectId}/methods/${invalidMethodId}/tasks/1/status`)
        .send({
          status: 'completed',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'methodId',
            code: 'INVALID_FORMAT',
          }),
        ])
      );
    });
  });

  describe('異常系: taskNo', () => {
    it('taskNoが整数でない場合、400エラーを返す', async () => {
      const validProjectId = '123e4567-e89b-12d3-a456-426614174000';
      const validMethodId = '123e4567-e89b-12d3-a456-426614174001';

      const response = await request(app)
        .put(`/api/v1/projects/${validProjectId}/methods/${validMethodId}/tasks/abc/status`)
        .send({
          status: 'completed',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'taskNo',
            code: 'INVALID_TYPE',
          }),
        ])
      );
    });

    it('taskNoが0以下の場合、400エラーを返す', async () => {
      const validProjectId = '123e4567-e89b-12d3-a456-426614174000';
      const validMethodId = '123e4567-e89b-12d3-a456-426614174001';

      const response = await request(app)
        .put(`/api/v1/projects/${validProjectId}/methods/${validMethodId}/tasks/0/status`)
        .send({
          status: 'completed',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'taskNo',
            code: 'INVALID_TYPE',
          }),
        ])
      );
    });
  });

  describe('異常系: status', () => {
    it('statusが空の場合、400エラーを返す', async () => {
      const validProjectId = '123e4567-e89b-12d3-a456-426614174000';
      const validMethodId = '123e4567-e89b-12d3-a456-426614174001';

      const response = await request(app)
        .put(`/api/v1/projects/${validProjectId}/methods/${validMethodId}/tasks/1/status`)
        .send({
          status: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'status',
            message: expect.stringContaining('status'),
          }),
        ])
      );
    });

    it('statusが許可されていない値の場合、400エラーを返す', async () => {
      const validProjectId = '123e4567-e89b-12d3-a456-426614174000';
      const validMethodId = '123e4567-e89b-12d3-a456-426614174001';

      const response = await request(app)
        .put(`/api/v1/projects/${validProjectId}/methods/${validMethodId}/tasks/1/status`)
        .send({
          status: 'invalid_status',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'status',
            message: expect.stringContaining('次のいずれか'),
          }),
        ])
      );
    });
  });

  describe('異常系: comment', () => {
    it('commentが1000文字を超える場合、400エラーを返す', async () => {
      const validProjectId = '123e4567-e89b-12d3-a456-426614174000';
      const validMethodId = '123e4567-e89b-12d3-a456-426614174001';

      const response = await request(app)
        .put(`/api/v1/projects/${validProjectId}/methods/${validMethodId}/tasks/1/status`)
        .send({
          status: 'completed',
          comment: 'a'.repeat(1001),
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'comment',
            code: 'STRING_LENGTH_INVALID',
          }),
        ])
      );
    });

    it('commentが文字列でない場合、400エラーを返す', async () => {
      const validProjectId = '123e4567-e89b-12d3-a456-426614174000';
      const validMethodId = '123e4567-e89b-12d3-a456-426614174001';

      const response = await request(app)
        .put(`/api/v1/projects/${validProjectId}/methods/${validMethodId}/tasks/1/status`)
        .send({
          status: 'completed',
          comment: 12345,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'comment',
            code: 'INVALID_TYPE',
          }),
        ])
      );
    });
  });

  describe('複合的なエラー', () => {
    it('複数のフィールドでバリデーションエラーがある場合、すべてを返す', async () => {
      const invalidProjectId = 'invalid-uuid';
      const invalidMethodId = 'not-uuid';

      const response = await request(app)
        .put(`/api/v1/projects/${invalidProjectId}/methods/${invalidMethodId}/tasks/abc/status`)
        .send({
          status: 'invalid_status',
          comment: 'a'.repeat(1001),
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details.length).toBeGreaterThanOrEqual(3);
      
      const fields = response.body.error.details.map((d: any) => d.field);
      expect(fields).toContain('projectId');
      expect(fields).toContain('methodId');
      expect(fields).toContain('taskNo');
    });
  });
});
/**
 * WorkerProjectController Unit Tests
 * 
 * @description
 * Task 3.1: WorkerProjectControllerの単体テスト
 * TDD RED Phase: 失敗するテストを先に作成
 */

import { Request, Response, NextFunction } from 'express';
import { WorkerProjectController } from '../../src/controllers/workerProjectController';
import { WorkerProjectService } from '../../src/services/workerProjectService';

// WorkerProjectServiceをモック化
jest.mock('../../src/services/workerProjectService');

// uuidをモック化
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-request-id-123')
}));

describe('WorkerProjectController', () => {
  let controller: WorkerProjectController;
  let mockService: jest.Mocked<WorkerProjectService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // サービスのモックインスタンスを作成
    mockService = new WorkerProjectService() as jest.Mocked<WorkerProjectService>;
    controller = new WorkerProjectController(mockService);

    // Requestモック
    mockReq = {
      user: {
        userId: 'user-123',
        role: 'experiment_worker',
        organizationId: 'org-456',
      } as any,
      query: {},
      headers: {
        'x-request-id': 'req-789',
      },
    };

    // Responseモック
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // NextFunctionモック
    mockNext = jest.fn();

    // モックのリセット
    jest.clearAllMocks();
  });

  describe('listWorkerAccessible', () => {
    describe('認証チェック', () => {
      test('req.userが存在しない場合、401エラーを返す', async () => {
        mockReq.user = undefined;

        await controller.listWorkerAccessible(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: '認証が必要です',
          },
          meta: expect.objectContaining({
            timestamp: expect.any(String),
            requestId: expect.any(String),
          }),
        });
      });
    });

    describe('クエリパラメータバリデーション', () => {
      test('pageが1未満の場合、400エラーを返す', async () => {
        mockReq.query = { page: '0' };

        await controller.listWorkerAccessible(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR',
              message: expect.stringContaining('ページ番号は1以上'),
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'page',
                  code: 'INVALID_VALUE',
                }),
              ]),
            }),
          })
        );
      });

      test('pageが整数でない場合、400エラーを返す', async () => {
        mockReq.query = { page: 'abc' };

        await controller.listWorkerAccessible(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR',
            }),
          })
        );
      });

      test('limitが1未満の場合、400エラーを返す', async () => {
        mockReq.query = { limit: '0' };

        await controller.listWorkerAccessible(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR',
              message: expect.stringContaining('limitは1から100'),
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'limit',
                  code: 'OUT_OF_RANGE',
                }),
              ]),
            }),
          })
        );
      });

      test('limitが100を超える場合、400エラーを返す', async () => {
        mockReq.query = { limit: '101' };

        await controller.listWorkerAccessible(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR',
              message: expect.stringContaining('limitは1から100'),
            }),
          })
        );
      });

      test('statusが無効な値の場合、400エラーを返す', async () => {
        mockReq.query = { status: 'invalid_status' };

        await controller.listWorkerAccessible(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR',
              message: expect.stringContaining("statusは'pending', 'in_progress', 'review_waiting'"),
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'status',
                  code: 'INVALID_VALUE',
                }),
              ]),
            }),
          })
        );
      });

      test('sort_byが無効な値の場合、400エラーを返す', async () => {
        mockReq.query = { sort_by: 'invalid_field' };

        await controller.listWorkerAccessible(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR',
              message: expect.stringContaining("sort_byは'create_at', 'project_name', 'update_at'"),
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'sort_by',
                  code: 'INVALID_VALUE',
                }),
              ]),
            }),
          })
        );
      });

      test('orderが無効な値の場合、400エラーを返す', async () => {
        mockReq.query = { order: 'invalid_order' };

        await controller.listWorkerAccessible(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR',
              message: expect.stringContaining("orderは'asc'または'desc'"),
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'order',
                  code: 'INVALID_VALUE',
                }),
              ]),
            }),
          })
        );
      });
    });

    describe('サービス層の呼び出し', () => {
      test('有効なリクエストでサービス層を正しいパラメータで呼び出す', async () => {
        mockReq.query = {
          page: '2',
          limit: '10',
          status: 'pending',
          sort_by: 'project_name',
          order: 'asc',
        };

        const mockResult = {
          items: [
            {
              projectId: 'proj-1',
              projectName: 'Test Project',
              description: 'Test Description',
              projectStatus: 'pending' as const,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-02T00:00:00.000Z',
            },
          ],
          pagination: {
            page: 2,
            limit: 10,
            totalItems: 25,
            totalPages: 3,
            hasNext: true,
            hasPrev: true,
          },
        };

        mockService.listWorkerAccessible = jest.fn().mockResolvedValue(mockResult);

        await controller.listWorkerAccessible(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockService.listWorkerAccessible).toHaveBeenCalledWith(
          'user-123',
          'experiment_worker',
          'org-456',
          {
            page: 2,
            limit: 10,
            status: 'pending',
            sortBy: 'project_name',
            order: 'asc',
          }
        );
      });

      test('デフォルト値を使用してサービス層を呼び出す', async () => {
        mockReq.query = {};

        const mockResult = {
          items: [],
          pagination: {
            page: 1,
            limit: 20,
            totalItems: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };

        mockService.listWorkerAccessible = jest.fn().mockResolvedValue(mockResult);

        await controller.listWorkerAccessible(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockService.listWorkerAccessible).toHaveBeenCalledWith(
          'user-123',
          'experiment_worker',
          'org-456',
          {
            page: 1,
            limit: 20,
            status: undefined,
            sortBy: 'create_at',
            order: 'desc',
          }
        );
      });
    });

    describe('成功レスポンス', () => {
      test('統一レスポンス形式で200を返す', async () => {
        const mockResult = {
          items: [
            {
              projectId: 'proj-1',
              projectName: 'Test Project',
              description: 'Test Description',
              projectStatus: 'pending' as const,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-02T00:00:00.000Z',
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            totalItems: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        };

        mockService.listWorkerAccessible = jest.fn().mockResolvedValue(mockResult);

        await controller.listWorkerAccessible(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockResult.items,
          pagination: mockResult.pagination,
          meta: {
            timestamp: expect.any(String),
            requestId: 'req-789',
          },
        });
      });

      test('requestIdが存在しない場合、UUIDを生成する', async () => {
        mockReq.headers = {};

        const mockResult = {
          items: [],
          pagination: {
            page: 1,
            limit: 20,
            totalItems: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };

        mockService.listWorkerAccessible = jest.fn().mockResolvedValue(mockResult);

        await controller.listWorkerAccessible(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            meta: expect.objectContaining({
              requestId: 'test-request-id-123', // モックされたUUID
            }),
          })
        );
      });
    });

    describe('エラーハンドリング', () => {
      test('サービス層でDatabaseErrorが発生した場合、500エラーを返す', async () => {
        const dbError = new Error('Database connection failed');
        (dbError as any).name = 'DatabaseError';

        mockService.listWorkerAccessible = jest.fn().mockRejectedValue(dbError);

        await controller.listWorkerAccessible(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'SYSTEM_DATABASE_ERROR',
              message: expect.stringContaining('データベースエラー'),
            }),
          })
        );
      });

      test('サービス層で予期しないエラーが発生した場合、500エラーを返す', async () => {
        const unexpectedError = new Error('Unexpected error');

        mockService.listWorkerAccessible = jest.fn().mockRejectedValue(unexpectedError);

        await controller.listWorkerAccessible(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'SYSTEM_ERROR',
              message: 'システムエラーが発生しました',
            }),
          })
        );
      });
    });
  });
});
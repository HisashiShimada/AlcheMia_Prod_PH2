/**
 * TaskController Unit Tests
 * 
 * @description TaskController.listメソッドの単体テスト
 * Feature: worker-task-list-api
 * Task: 5.3
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { list } from '../../src/controllers/taskController';
import { MethodGroup } from '../../src/types/task';

// モック設定
jest.mock('express-validator');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

// TaskServiceのgetTasksGroupedByMethodをモック化
jest.mock('../../src/services/taskService', () => {
  const mockGetTasksGroupedByMethod = jest.fn();
  return {
    TaskService: jest.fn().mockImplementation(() => {
      return {
        getTasksGroupedByMethod: mockGetTasksGroupedByMethod,
      };
    }),
    mockGetTasksGroupedByMethod,
  };
});

// モックされたメソッドへの参照を取得
const { mockGetTasksGroupedByMethod: actualMockMethod } = jest.requireMock('../../src/services/taskService');

describe('TaskController - list', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // モックリクエストの初期化
    mockReq = {
      query: {},
      headers: {},
    } as any;

    // モックレスポンスの初期化
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    // モックNextの初期化
    mockNext = jest.fn();

    // validationResultのモック
    (validationResult as unknown as jest.Mock).mockReturnValue({
      isEmpty: jest.fn().mockReturnValue(true),
      array: jest.fn().mockReturnValue([]),
    });

    // モックのクリア
    jest.clearAllMocks();
    actualMockMethod.mockClear();
  });

  describe('正常系テスト', () => {
    it('正常にタスク一覧を取得できる', async () => {
      // Arrange
      const organizationId = '11111111-1111-1111-1111-111111111111';
      const projectId = '22222222-2222-2222-2222-222222222222';
      const requestId = 'test-request-id';

      mockReq.query = { projectId };
      (mockReq as any).organizationId = organizationId;
      mockReq.headers = { 'x-request-id': requestId };

      const mockMethodGroups: MethodGroup[] = [
        {
          method_id: '33333333-3333-3333-3333-333333333333',
          method_name: 'Method 1',
          experiment_order: 1,
          tasks: [
            {
              task_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              task_no: 1,
              task_status: 'not_started',
              assign_user_id: null,
              assign_user_name: null,
              progress_rate: 0,
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      ];

      actualMockMethod.mockResolvedValue(mockMethodGroups);

      // Act
      await list(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(actualMockMethod).toHaveBeenCalledWith(
        projectId,
        organizationId,
        {
          methodId: undefined,
          status: undefined,
          assignUserId: undefined,
          sortBy: undefined,
          order: undefined,
        }
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMethodGroups,
        meta: {
          timestamp: expect.any(String),
          requestId,
        },
      });
    });

    it('requestIdがない場合はUUIDを生成する', async () => {
      // Arrange
      const organizationId = '11111111-1111-1111-1111-111111111111';
      const projectId = '22222222-2222-2222-2222-222222222222';

      mockReq.query = { projectId };
      (mockReq as any).organizationId = organizationId;
      mockReq.headers = {};

      actualMockMethod.mockResolvedValue([]);

      // Act
      await list(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        meta: {
          timestamp: expect.any(String),
          requestId: 'test-uuid-1234', // uuidモックで生成された値
        },
      });
    });
  });

  describe('パラメータ抽出テスト', () => {
    it('projectIdが正しく抽出される', async () => {
      // Arrange
      const organizationId = '11111111-1111-1111-1111-111111111111';
      const projectId = '22222222-2222-2222-2222-222222222222';

      mockReq.query = { projectId };
      (mockReq as any).organizationId = organizationId;

      actualMockMethod.mockResolvedValue([]);

      // Act
      await list(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(actualMockMethod).toHaveBeenCalledWith(
        projectId,
        organizationId,
        expect.any(Object)
      );
    });

    it('オプションフィルタが正しく抽出される', async () => {
      // Arrange
      const organizationId = '11111111-1111-1111-1111-111111111111';
      const projectId = '22222222-2222-2222-2222-222222222222';
      const methodId = '33333333-3333-3333-3333-333333333333';
      const assignUserId = '44444444-4444-4444-4444-444444444444';

      mockReq.query = {
        projectId,
        methodId,
        status: 'in_progress',
        assignUserId,
        sortBy: 'task_no',
        order: 'asc',
      };
      (mockReq as any).organizationId = organizationId;

      actualMockMethod.mockResolvedValue([]);

      // Act
      await list(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(actualMockMethod).toHaveBeenCalledWith(
        projectId,
        organizationId,
        {
          methodId,
          status: 'in_progress',
          assignUserId,
          sortBy: 'task_no',
          order: 'asc',
        }
      );
    });
  });

  describe('バリデーションエラーテスト', () => {
    it('バリデーションエラー時に400エラーをスローする', async () => {
      // Arrange
      const validationErrors = [
        {
          type: 'field',
          msg: 'projectIdはUUID形式である必要があります',
          path: 'projectId',
          location: 'query',
        },
      ];

      (validationResult as unknown as jest.Mock).mockReturnValue({
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(validationErrors),
      });

      mockReq.query = { projectId: 'invalid-uuid' };
      (mockReq as any).organizationId = '11111111-1111-1111-1111-111111111111';

      // Act
      await list(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'projectIdはUUID形式である必要があります',
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          details: [
            {
              field: 'projectId',
              message: 'projectIdはUUID形式である必要があります',
              code: 'INVALID_VALUE',
            },
          ],
        })
      );
    });

    it('複数のバリデーションエラーがある場合、最初のエラーメッセージを使用する', async () => {
      // Arrange
      const validationErrors = [
        {
          type: 'field',
          msg: 'projectIdは必須です',
          path: 'projectId',
          location: 'query',
        },
        {
          type: 'field',
          msg: 'statusは不正な値です',
          path: 'status',
          location: 'query',
        },
      ];

      (validationResult as unknown as jest.Mock).mockReturnValue({
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(validationErrors),
      });

      mockReq.query = {};
      (mockReq as any).organizationId = '11111111-1111-1111-1111-111111111111';

      // Act
      await list(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'projectIdは必須です',
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'projectId' }),
            expect.objectContaining({ field: 'status' }),
          ]),
        })
      );
    });
  });

  describe('サービスエラーテスト', () => {
    it('TaskServiceでエラーが発生した場合、nextにエラーを渡す', async () => {
      // Arrange
      const organizationId = '11111111-1111-1111-1111-111111111111';
      const projectId = '22222222-2222-2222-2222-222222222222';

      mockReq.query = { projectId };
      (mockReq as any).organizationId = organizationId;

      const serviceError = new Error('Database connection failed');
      actualMockMethod.mockRejectedValue(serviceError);

      // Act
      await list(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });

    it('予期しないエラーもnextに渡される', async () => {
      // Arrange
      const organizationId = '11111111-1111-1111-1111-111111111111';
      const projectId = '22222222-2222-2222-2222-222222222222';

      mockReq.query = { projectId };
      (mockReq as any).organizationId = organizationId;

      const unexpectedError = new Error('Unexpected error');
      actualMockMethod.mockRejectedValue(unexpectedError);

      // Act
      await list(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
    });
  });

  describe('レスポンス形式テスト', () => {
    it('統一レスポンス形式（success, data, meta）で返却される', async () => {
      // Arrange
      const organizationId = '11111111-1111-1111-1111-111111111111';
      const projectId = '22222222-2222-2222-2222-222222222222';

      mockReq.query = { projectId };
      (mockReq as any).organizationId = organizationId;

      const mockMethodGroups: MethodGroup[] = [];
      actualMockMethod.mockResolvedValue(mockMethodGroups);

      // Act
      await list(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          meta: expect.objectContaining({
            timestamp: expect.any(String),
            requestId: expect.any(String),
          }),
        })
      );
    });

    it('metaのtimestampはISO 8601形式である', async () => {
      // Arrange
      const organizationId = '11111111-1111-1111-1111-111111111111';
      const projectId = '22222222-2222-2222-2222-222222222222';

      mockReq.query = { projectId };
      (mockReq as any).organizationId = organizationId;

      actualMockMethod.mockResolvedValue([]);

      // Act
      await list(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      const timestamp = callArgs.meta.timestamp;

      // ISO 8601形式の検証
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });
  });
});
/**
 * InstructionControllerのテスト
 */

import { Request, Response, NextFunction } from 'express';
import { InstructionController } from '../../src/controllers/instructionController';
import { InstructionService } from '../../src/services/instructionService';
import { TaskInput, InstructionInput } from '../../src/types/instruction';

describe('InstructionController', () => {
  let controller: InstructionController;
  let mockService: jest.Mocked<InstructionService>;
  let mockRequest: any; // Partial<Request>では拡張プロパティが認識されないため
  let mockResponse: any; // Responseチェーンのモック用
  let mockNext: NextFunction;

  beforeEach(() => {
    // モックサービスを手動作成
    mockService = {
      createInstruction: jest.fn(),
    } as any;

    // コントローラインスタンスを作成
    controller = new InstructionController(mockService);

    // モックレスポンスのセットアップ（チェーン対応）
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // モックNextのセットアップ
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const projectId = 'proj-123';
    const organizationId = 'org-456';
    const userId = 'user-789';

    const validTasks: TaskInput[] = [
      {
        methodId: 'method_001',
        experimentCondition: 0,
        trialCount: 2,
      },
    ];

    const validInstructions: InstructionInput[] = [
      {
        content: 'テスト指示1',
        priority: 1,
        type: 0,
        targetType: 0,
        transitionId: null,
        taskNumber: null,
      },
    ];

    test('正常系: 指示とタスクを作成して201レスポンスを返す', async () => {
      // リクエストのセットアップ
      mockRequest = {
        params: { projectId },
        body: {
          tasks: validTasks,
          instructions: validInstructions,
        },
        headers: {}, // headersを追加
        organizationId, // tenantIsolationミドルウェアで設定
        user: { userId, organizationId, role: 'experiment_admin' as any, sessionId: 'sess-123', iat: 0, exp: 0 }, // authミドルウェアで設定
      };

      // サービス層のモック
      mockService.createInstruction = jest.fn().mockResolvedValue({
        totalTasks: 1,
        createdTasks: 1,
      });

      await controller.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // デバッグ: nextが呼ばれたか確認
      if ((mockNext as jest.Mock).mock.calls.length > 0) {
        console.log('nextが呼ばれました:', (mockNext as jest.Mock).mock.calls[0][0]);
      }

      // サービスが正しく呼ばれたことを確認
      expect(mockService.createInstruction).toHaveBeenCalledWith(
        projectId,
        {
          tasks: validTasks,
          instructions: validInstructions,
        },
        organizationId,
        userId
      );

      // 201レスポンスが返されたことを確認
      expect(mockResponse.status).toHaveBeenCalledWith(201);

      // レスポンスボディが正しいことを確認
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          summary: {
            totalTasks: 1,
            createdTasks: 1,
          },
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: expect.any(String),
        }),
      });

      // nextが呼ばれていないことを確認（エラーなし）
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('正常系: 複数タスクの作成サマリーが正しく返される', async () => {
      const multipleTasks: TaskInput[] = [
        { methodId: 'method_001', experimentCondition: 0, trialCount: 2 },
        { methodId: 'method_002', experimentCondition: 1, trialCount: 3 },
        { methodId: 'method_003', experimentCondition: 0 },
      ];

      mockRequest = {
        params: { projectId },
        body: {
          tasks: multipleTasks,
          instructions: validInstructions,
        },
        headers: {}, // headersを追加
        organizationId,
        user: { userId, organizationId, role: 'experiment_admin' as any, sessionId: 'sess-123', iat: 0, exp: 0 },
      };

      mockService.createInstruction = jest.fn().mockResolvedValue({
        totalTasks: 3,
        createdTasks: 3,
      });

      await controller.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            summary: {
              totalTasks: 3,
              createdTasks: 3,
            },
          },
        })
      );
    });

    test('異常系: projectIdがない場合、エラーをnextに渡す', async () => {
      mockRequest = {
        params: {}, // projectIdなし
        body: {
          tasks: validTasks,
          instructions: validInstructions,
        },
        organizationId,
        user: { userId, organizationId, role: 'experiment_admin' as any, sessionId: 'sess-123', iat: 0, exp: 0 },
      };

      await controller.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // nextにエラーが渡されたことを確認
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect((mockNext as jest.Mock).mock.calls[0][0].message).toContain(
        'projectId'
      );

      // レスポンスが返されていないことを確認
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    test('異常系: tasksがない場合、エラーをnextに渡す', async () => {
      mockRequest = {
        params: { projectId },
        body: {
          // tasksなし
          instructions: validInstructions,
        },
        organizationId,
        user: { userId, organizationId, role: 'experiment_admin' as any, sessionId: 'sess-123', iat: 0, exp: 0 },
      };

      await controller.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect((mockNext as jest.Mock).mock.calls[0][0].message).toContain(
        'tasks'
      );
    });

    test('異常系: tasks配列が空の場合、エラーをnextに渡す', async () => {
      mockRequest = {
        params: { projectId },
        body: {
          tasks: [], // 空配列
          instructions: validInstructions,
        },
        organizationId,
        user: { userId, organizationId, role: 'experiment_admin' as any, sessionId: 'sess-123', iat: 0, exp: 0 },
      };

      await controller.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect((mockNext as jest.Mock).mock.calls[0][0].message).toContain(
        'tasks'
      );
    });

    test('異常系: instructionsがない場合、エラーをnextに渡す', async () => {
      mockRequest = {
        params: { projectId },
        body: {
          tasks: validTasks,
          // instructionsなし
        },
        organizationId,
        user: { userId, organizationId, role: 'experiment_admin' as any, sessionId: 'sess-123', iat: 0, exp: 0 },
      };

      await controller.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect((mockNext as jest.Mock).mock.calls[0][0].message).toContain(
        'instructions'
      );
    });

    test('異常系: instructions配列が空の場合、エラーをnextに渡す', async () => {
      mockRequest = {
        params: { projectId },
        body: {
          tasks: validTasks,
          instructions: [], // 空配列
        },
        organizationId,
        user: { userId, organizationId, role: 'experiment_admin' as any, sessionId: 'sess-123', iat: 0, exp: 0 },
      };

      await controller.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect((mockNext as jest.Mock).mock.calls[0][0].message).toContain(
        'instructions'
      );
    });

    test('異常系: organizationIdがない場合、エラーをnextに渡す', async () => {
      mockRequest = {
        params: { projectId },
        body: {
          tasks: validTasks,
          instructions: validInstructions,
        },
        // organizationIdなし（tenantIsolation未適用）
        user: { userId, organizationId, role: 'experiment_admin' as any, sessionId: 'sess-123', iat: 0, exp: 0 },
      };

      await controller.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    test('異常系: userIdがない場合、エラーをnextに渡す', async () => {
      mockRequest = {
        params: { projectId },
        body: {
          tasks: validTasks,
          instructions: validInstructions,
        },
        organizationId,
        // userなし（auth未適用）
      };

      await controller.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    test('異常系: サービス層でエラーが発生した場合、nextに渡す', async () => {
      mockRequest = {
        params: { projectId },
        body: {
          tasks: validTasks,
          instructions: validInstructions,
        },
        organizationId,
        user: { userId, organizationId, role: 'experiment_admin' as any, sessionId: 'sess-123', iat: 0, exp: 0 },
      };

      const serviceError = new Error('Project not found');
      mockService.createInstruction = jest.fn().mockRejectedValue(serviceError);

      await controller.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // nextにエラーが渡されたことを確認
      expect(mockNext).toHaveBeenCalledWith(serviceError);

      // レスポンスが返されていないことを確認
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    test('レスポンスのmetaにtimestampとrequestIdが含まれる', async () => {
      mockRequest = {
        params: { projectId },
        body: {
          tasks: validTasks,
          instructions: validInstructions,
        },
        organizationId,
        user: { userId, organizationId, role: 'experiment_admin' as any, sessionId: 'sess-123', iat: 0, exp: 0 },
        headers: {
          'x-request-id': 'req-test-123',
        },
      };

      mockService.createInstruction = jest.fn().mockResolvedValue({
        totalTasks: 1,
        createdTasks: 1,
      });

      await controller.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];

      // timestampがISO 8601形式であることを確認
      expect(jsonCall.meta.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );

      // requestIdが設定されていることを確認
      expect(jsonCall.meta.requestId).toBe('req-test-123');
    });

    test('x-request-idヘッダーがない場合、UUIDが生成される', async () => {
      mockRequest = {
        params: { projectId },
        body: {
          tasks: validTasks,
          instructions: validInstructions,
        },
        organizationId,
        user: { userId, organizationId, role: 'experiment_admin' as any, sessionId: 'sess-123', iat: 0, exp: 0 },
        headers: {}, // x-request-idなし
      };

      mockService.createInstruction = jest.fn().mockResolvedValue({
        totalTasks: 1,
        createdTasks: 1,
      });

      await controller.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];

      // requestIdがUUID形式であることを確認
      expect(jsonCall.meta.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });
});

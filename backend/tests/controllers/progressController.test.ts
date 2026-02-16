/**
 * ProgressController.getProgressData ユニットテスト
 * Task 5.1: getProgressDataメソッドの実装
 * 
 * テスト観点:
 * - パラメータバリデーション（UUID形式、整数型、文字列型）
 * - ProgressService呼び出しの正常系・異常系
 * - エラーレスポンス形式の検証
 * - HTTPステータスコードの検証
 */

import { Request, Response } from 'express';
import * as progressController from '../../src/controllers/progressController';
import { ProgressService } from '../../src/services/progressService';
import { TaskRepository } from '../../src/repositories/taskRepository';
import { TransitionDataRepository } from '../../src/repositories/transitionDataRepository';
import type { ProgressData } from '../../src/types/progress';

jest.mock('../../src/services/progressService');
jest.mock('../../src/repositories/taskRepository');
jest.mock('../../src/repositories/transitionDataRepository');
jest.mock('uuid', () => ({ v4: () => 'test-request-id-123' }));
jest.mock('../../src/utils/logger', () => ({ 
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

describe('ProgressController.getProgressData', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockProgressService: jest.Mocked<ProgressService>;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    
    mockResponse = {
      status: mockStatus,
      json: mockJson,
      setHeader: jest.fn(),
    };

    mockRequest = {
      params: {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        methodId: 'method1',
        taskNo: '5'
      },
      user: {
        organizationId: 'org_maiml_lab_001',
        userId: 'user_123',
        role: 'experiment_admin',
        sessionId: 'session_123',
        iat: Date.now(),
        exp: Date.now() + 3600,
      } as any,
    };

    // Mock ProgressService with proper constructor
    mockProgressService = {
      getProgressData: jest.fn()
    } as any;
    
    (ProgressService as jest.Mock).mockImplementation(() => mockProgressService);
    (TaskRepository as jest.Mock).mockImplementation(() => ({}));
    (TransitionDataRepository as jest.Mock).mockImplementation(() => ({}));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Task 5.1: 正常系テスト', () => {
    it('should retrieve progress data successfully', async () => {
      const mockProgressData: ProgressData = {
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'Test Project',
        method_id: 'method1',
        method_name: 'Test Method',
        task_no: 5,
        task_name: 'Test Task',
        transitions: [
          {
            transition_id: 't1',
            transition_name: 'Transition 1',
            status: 'completed',
            progress: 100,
            last_updated: '2026-02-16T12:00:00Z',
            has_data: true,
            data_count: 3
          },
          {
            transition_id: 't2',
            transition_name: 'Transition 2',
            status: 'in_progress',
            progress: 50,
            last_updated: '2026-02-16T11:00:00Z',
            has_data: true,
            data_count: 1
          },
          {
            transition_id: 't3',
            transition_name: 'Transition 3',
            status: 'not_started',
            progress: 0,
            last_updated: null,
            has_data: false,
            data_count: 0
          }
        ],
        overall_progress: {
          total_transitions: 3,
          completed: 1,
          in_progress: 1,
          not_started: 1,
          overall_percentage: 50.0
        }
      };

      mockProgressService.getProgressData = jest.fn().mockResolvedValue({
        success: true,
        data: mockProgressData
      });

      await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

      expect(mockProgressService.getProgressData).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'method1',
        5,
        'org_maiml_lab_001'
      );

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockProgressData,
          meta: expect.objectContaining({
            timestamp: expect.any(String),
            requestId: 'test-request-id-123'
          })
        })
      );
    });

    it('should set Content-Type and X-Request-Id headers', async () => {
      const mockProgressData: ProgressData = {
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'Test Project',
        method_id: 'method1',
        method_name: 'Test Method',
        task_no: 5,
        task_name: 'Test Task',
        transitions: [],
        overall_progress: {
          total_transitions: 0,
          completed: 0,
          in_progress: 0,
          not_started: 0,
          overall_percentage: 0.0
        }
      };

      mockProgressService.getProgressData = jest.fn().mockResolvedValue({
        success: true,
        data: mockProgressData
      });

      await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', 'test-request-id-123');
    });

    it('should convert taskNo from string to number', async () => {
      mockRequest.params!.taskNo = '42';

      mockProgressService.getProgressData = jest.fn().mockResolvedValue({
        success: true,
        data: expect.any(Object)
      });

      await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

      expect(mockProgressService.getProgressData).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        42, // Should be number
        expect.any(String)
      );
    });
  });

  describe('Task 5.1: パラメータバリデーション', () => {
    it('should return 400 for invalid projectId (not UUID)', async () => {
      mockRequest.params!.projectId = 'invalid-uuid';

      await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('UUID')
          })
        })
      );
    });

    it('should return 400 for invalid taskNo (not integer)', async () => {
      mockRequest.params!.taskNo = 'abc';

      await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('整数')
          })
        })
      );
    });

    it('should return 400 for negative taskNo', async () => {
      mockRequest.params!.taskNo = '-5';

      await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('正の整数')
          })
        })
      );
    });

    it('should return 400 for empty methodId', async () => {
      mockRequest.params!.methodId = '';

      await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('methodId')
          })
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_TOKEN_MISSING',
            message: expect.stringContaining('認証')
          })
        })
      );
    });
  });

  describe('Task 5.1: エラーハンドリング', () => {
    it('should return 404 when task not found', async () => {
      mockProgressService.getProgressData = jest.fn().mockResolvedValue({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'タスクが見つかりません'
        }
      });

      await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'TASK_NOT_FOUND',
            message: 'タスクが見つかりません'
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(String),
            requestId: 'test-request-id-123'
          })
        })
      );
    });

    it('should return 404 when method not found', async () => {
      mockProgressService.getProgressData = jest.fn().mockResolvedValue({
        success: false,
        error: {
          code: 'METHOD_NOT_FOUND',
          message: 'メソッドが見つかりません'
        }
      });

      await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'METHOD_NOT_FOUND'
          })
        })
      );
    });

    it('should return 500 when MAIML download fails', async () => {
      mockProgressService.getProgressData = jest.fn().mockResolvedValue({
        success: false,
        error: {
          code: 'MAIML_DOWNLOAD_FAILED',
          message: 'MAIMLファイルのダウンロードに失敗しました'
        }
      });

      await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'MAIML_DOWNLOAD_FAILED'
          })
        })
      );
    });

    it('should return 500 when MAIML parse fails', async () => {
      mockProgressService.getProgressData = jest.fn().mockResolvedValue({
        success: false,
        error: {
          code: 'MAIML_PARSE_FAILED',
          message: 'MAIMLファイルの解析に失敗しました'
        }
      });

      await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'MAIML_PARSE_FAILED'
          })
        })
      );
    });

    it('should return 500 when database error occurs', async () => {
      mockProgressService.getProgressData = jest.fn().mockResolvedValue({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'データベースエラーが発生しました'
        }
      });

      await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'DATABASE_ERROR'
          })
        })
      );
    });

    it('should return 500 and not expose stack trace for unexpected errors', async () => {
      mockProgressService.getProgressData = jest.fn().mockRejectedValue(
        new Error('Unexpected database connection failure')
      );

      await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'SYSTEM_ERROR',
            message: 'システムエラーが発生しました'
          })
        })
      );

      // Stack trace should not be exposed - details should not contain sensitive info
      const callArgs = mockJson.mock.calls[0][0];
      // Verify that details property doesn't expose internal error messages
      if (callArgs.error.details) {
        expect(callArgs.error.details).not.toContain('Unexpected database connection failure');
      }
      // Most importantly, the message should be generic
      expect(callArgs.error.message).toBe('システムエラーが発生しました');
    });
  });

  describe('Task 5.1: レスポンス形式検証', () => {
    it('should return unified response format on success', async () => {
      const mockProgressData: ProgressData = {
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'Test Project',
        method_id: 'method1',
        method_name: 'Test Method',
        task_no: 5,
        task_name: 'Test Task',
        transitions: [],
        overall_progress: {
          total_transitions: 0,
          completed: 0,
          in_progress: 0,
          not_started: 0,
          overall_percentage: 0.0
        }
      };

      mockProgressService.getProgressData = jest.fn().mockResolvedValue({
        success: true,
        data: mockProgressData
      });

      await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

      const response = mockJson.mock.calls[0][0];
      
      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('meta');
      expect(response.meta).toHaveProperty('timestamp');
      expect(response.meta).toHaveProperty('requestId');
    });

    it('should return unified error response format on failure', async () => {
      mockProgressService.getProgressData = jest.fn().mockResolvedValue({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'タスクが見つかりません'
        }
      });

      await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

      const response = mockJson.mock.calls[0][0];
      
      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('error');
      expect(response).toHaveProperty('meta');
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
      expect(response.meta).toHaveProperty('timestamp');
      expect(response.meta).toHaveProperty('requestId');
    });

    it('should use ISO 8601 timestamp format', async () => {
      mockProgressService.getProgressData = jest.fn().mockResolvedValue({
        success: true,
        data: expect.any(Object)
      });

      await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

      const response = mockJson.mock.calls[0][0];
      const timestamp = response.meta.timestamp;
      
      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Task 5.1: HTTPステータスコード検証', () => {
    const testCases = [
      { errorCode: 'TASK_NOT_FOUND', expectedStatus: 404 },
      { errorCode: 'METHOD_NOT_FOUND', expectedStatus: 404 },
      { errorCode: 'MAIML_DOWNLOAD_FAILED', expectedStatus: 500 },
      { errorCode: 'MAIML_PARSE_FAILED', expectedStatus: 500 },
      { errorCode: 'DATABASE_ERROR', expectedStatus: 500 }
    ];

    testCases.forEach(({ errorCode, expectedStatus }) => {
      it(`should return ${expectedStatus} for ${errorCode}`, async () => {
        mockProgressService.getProgressData = jest.fn().mockResolvedValue({
          success: false,
          error: {
            code: errorCode,
            message: `Error: ${errorCode}`
          }
        });

        await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(expectedStatus);
      });
    });
  });

  describe('Task 5.2: 統一レスポンス形式への変換', () => {
    describe('成功時のレスポンス形式', () => {
      it('should return 200 OK with unified success response format', async () => {
        const mockProgressData: ProgressData = {
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          project_name: 'Test Project',
          method_id: 'method1',
          method_name: 'Test Method',
          task_no: 5,
          task_name: 'Test Task',
          transitions: [
            {
              transition_id: 't1',
              transition_name: 'Transition 1',
              status: 'completed',
              progress: 100,
              last_updated: '2026-02-16T12:00:00Z',
              has_data: true,
              data_count: 3
            }
          ],
          overall_progress: {
            total_transitions: 1,
            completed: 1,
            in_progress: 0,
            not_started: 0,
            overall_percentage: 100.0
          }
        };

        mockProgressService.getProgressData = jest.fn().mockResolvedValue({
          success: true,
          data: mockProgressData
        });

        await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

        // HTTPステータスコード検証
        expect(mockStatus).toHaveBeenCalledWith(200);
        
        // レスポンス構造検証
        const response = mockJson.mock.calls[0][0];
        expect(response).toEqual({
          success: true,
          data: mockProgressData,
          meta: {
            timestamp: expect.any(String),
            requestId: 'test-request-id-123'
          }
        });

        // success フィールドが true であることを明示的に確認
        expect(response.success).toBe(true);
        
        // data フィールドにプログレスデータが含まれることを確認
        expect(response.data).toEqual(mockProgressData);
        
        // meta フィールドに必須項目が含まれることを確認
        expect(response.meta).toHaveProperty('timestamp');
        expect(response.meta).toHaveProperty('requestId');
      });

      it('should include ISO 8601 timestamp in meta', async () => {
        mockProgressService.getProgressData = jest.fn().mockResolvedValue({
          success: true,
          data: expect.any(Object)
        });

        await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

        const response = mockJson.mock.calls[0][0];
        const timestamp = response.meta.timestamp;
        
        // ISO 8601形式の検証: YYYY-MM-DDTHH:mm:ss.sssZ
        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        
        // 有効な日付であることを確認
        const date = new Date(timestamp);
        expect(date.toISOString()).toBe(timestamp);
      });

      it('should include requestId in meta', async () => {
        mockProgressService.getProgressData = jest.fn().mockResolvedValue({
          success: true,
          data: expect.any(Object)
        });

        await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

        const response = mockJson.mock.calls[0][0];
        
        expect(response.meta.requestId).toBe('test-request-id-123');
        expect(typeof response.meta.requestId).toBe('string');
        expect(response.meta.requestId.length).toBeGreaterThan(0);
      });
    });

    describe('エラー時のレスポンス形式', () => {
      it('should return 404 with unified error response format for TASK_NOT_FOUND', async () => {
        mockProgressService.getProgressData = jest.fn().mockResolvedValue({
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: 'タスクが見つかりません'
          }
        });

        await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

        // HTTPステータスコード検証
        expect(mockStatus).toHaveBeenCalledWith(404);
        
        // レスポンス構造検証
        const response = mockJson.mock.calls[0][0];
        expect(response).toEqual({
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: 'タスクが見つかりません'
          },
          meta: {
            timestamp: expect.any(String),
            requestId: 'test-request-id-123'
          }
        });

        // success フィールドが false であることを明示的に確認
        expect(response.success).toBe(false);
        
        // error フィールドに必須項目が含まれることを確認
        expect(response.error).toHaveProperty('code');
        expect(response.error).toHaveProperty('message');
        
        // meta フィールドに必須項目が含まれることを確認
        expect(response.meta).toHaveProperty('timestamp');
        expect(response.meta).toHaveProperty('requestId');
      });

      it('should return 500 with unified error response format for system errors', async () => {
        mockProgressService.getProgressData = jest.fn().mockResolvedValue({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'データベースエラーが発生しました'
          }
        });

        await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

        // HTTPステータスコード検証
        expect(mockStatus).toHaveBeenCalledWith(500);
        
        // レスポンス構造検証
        const response = mockJson.mock.calls[0][0];
        expect(response.success).toBe(false);
        expect(response.error.code).toBe('DATABASE_ERROR');
        expect(response.error.message).toBe('データベースエラーが発生しました');
      });

      it('should return 400 with unified error response format for validation errors', async () => {
        mockRequest.params!.projectId = 'invalid-uuid';

        await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

        // HTTPステータスコード検証
        expect(mockStatus).toHaveBeenCalledWith(400);
        
        // レスポンス構造検証
        const response = mockJson.mock.calls[0][0];
        expect(response).toEqual({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: expect.any(String),
            details: expect.any(Array)
          },
          meta: {
            timestamp: expect.any(String),
            requestId: 'test-request-id-123'
          }
        });

        // エラーメッセージにUUIDに関する情報が含まれることを確認
        expect(response.error.message).toContain('UUID');
      });

      it('should not expose internal errors in response', async () => {
        mockProgressService.getProgressData = jest.fn().mockRejectedValue(
          new Error('Internal database connection string: postgresql://user:password@localhost/db')
        );

        await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

        const response = mockJson.mock.calls[0][0];
        
        // 汎用的なエラーメッセージのみが返されることを確認
        expect(response.error.message).toBe('システムエラーが発生しました');
        expect(response.error.code).toBe('SYSTEM_ERROR');
        
        // 内部エラー詳細（データベース接続文字列など）が含まれていないことを確認
        expect(JSON.stringify(response)).not.toContain('postgresql://');
        expect(JSON.stringify(response)).not.toContain('password');
      });
    });

    describe('HTTPヘッダー設定', () => {
      it('should set Content-Type header to application/json', async () => {
        mockProgressService.getProgressData = jest.fn().mockResolvedValue({
          success: true,
          data: expect.any(Object)
        });

        await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      });

      it('should set X-Request-Id header', async () => {
        mockProgressService.getProgressData = jest.fn().mockResolvedValue({
          success: true,
          data: expect.any(Object)
        });

        await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', 'test-request-id-123');
      });

      it('should set headers before processing request', async () => {
        const setHeaderCalls: string[] = [];
        mockResponse.setHeader = jest.fn((name: string) => {
          setHeaderCalls.push(name);
          return mockResponse as Response;
        }) as any;

        mockProgressService.getProgressData = jest.fn().mockResolvedValue({
          success: true,
          data: expect.any(Object)
        });

        await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

        // ヘッダーが設定されていることを確認
        expect(setHeaderCalls).toContain('Content-Type');
        expect(setHeaderCalls).toContain('X-Request-Id');
        expect(setHeaderCalls.length).toBeGreaterThanOrEqual(2);
      });

      it('should set headers even when error occurs', async () => {
        mockRequest.params!.projectId = 'invalid-uuid';

        await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

        // エラー時でもヘッダーが設定されることを確認
        expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', 'test-request-id-123');
      });
    });

    describe('レスポンスフィールドの完全性検証', () => {
      it('should ensure success response has all required fields and no extra fields', async () => {
        const mockProgressData: ProgressData = {
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          project_name: 'Test Project',
          method_id: 'method1',
          method_name: 'Test Method',
          task_no: 5,
          task_name: 'Test Task',
          transitions: [],
          overall_progress: {
            total_transitions: 0,
            completed: 0,
            in_progress: 0,
            not_started: 0,
            overall_percentage: 0.0
          }
        };

        mockProgressService.getProgressData = jest.fn().mockResolvedValue({
          success: true,
          data: mockProgressData
        });

        await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

        const response = mockJson.mock.calls[0][0];
        const keys = Object.keys(response);
        
        // 必須フィールドのみが存在することを確認
        expect(keys).toEqual(expect.arrayContaining(['success', 'data', 'meta']));
        expect(keys.length).toBe(3);
        
        // meta の必須フィールドを確認
        const metaKeys = Object.keys(response.meta);
        expect(metaKeys).toEqual(expect.arrayContaining(['timestamp', 'requestId']));
        expect(metaKeys.length).toBe(2);
      });

      it('should ensure error response has all required fields and no extra fields', async () => {
        mockProgressService.getProgressData = jest.fn().mockResolvedValue({
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: 'タスクが見つかりません'
          }
        });

        await progressController.getProgressData(mockRequest as Request, mockResponse as Response);

        const response = mockJson.mock.calls[0][0];
        const keys = Object.keys(response);
        
        // 必須フィールドのみが存在することを確認
        expect(keys).toEqual(expect.arrayContaining(['success', 'error', 'meta']));
        expect(keys.length).toBe(3);
        
        // error の必須フィールドを確認
        const errorKeys = Object.keys(response.error);
        expect(errorKeys).toContain('code');
        expect(errorKeys).toContain('message');
      });
    });
  });
});

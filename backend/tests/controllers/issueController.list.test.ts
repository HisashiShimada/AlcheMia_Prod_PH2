/**
 * IssueController.list ユニットテスト
 * Task 4.2: コントローラー層のユニットテスト
 */

import { Request, Response } from 'express';
import * as issueController from '../../src/controllers/issueController';
import { IssueService } from '../../src/services/issueService';

// Mock uuid to avoid ESM import issues
jest.mock('uuid', () => ({
  v4: jest.fn(() => '550e8400-e29b-41d4-a716-446655440000')
}));

// Mock IssueService
jest.mock('../../src/services/issueService');

describe('issueController.list - Task 4.2', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockIssueServiceInstance: jest.Mocked<IssueService>;

  beforeEach(() => {
    mockRequest = {
      query: {},
      user: {
        userId: 'user-123',
        organizationId: 'org-456',
        role: 'experiment_worker',
        sessionId: 'session-789',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      organizationId: 'org-456',
      headers: {
        'x-request-id': 'req-789'
      }
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    // IssueServiceのインスタンスメソッドをモック
    mockIssueServiceInstance = {
      list: jest.fn(),
    } as any;

    (IssueService as jest.MockedClass<typeof IssueService>).mockImplementation(() => mockIssueServiceInstance);

    jest.clearAllMocks();
  });

  describe('Task 4.2.1: 成功時のApiResponse形式レスポンステスト', () => {
    it('問題一覧を含むApiResponse形式でレスポンスを返す', async () => {
      // Arrange
      const mockIssues = [
        {
          id: 'issue-1',
          projectId: 'proj-1',
          projectName: 'Test Project',
          methodId: 'method-1',
          targetType: 'task' as const,
          taskNo: 1,
          transitionId: null,
          title: 'Test Issue 1',
          issueType: 'operational_error',
          contents: 'Description 1',
          status: 'unresolved' as const,
          reportedBy: 'user-123',
          reportedByName: 'Test User',
          reportedAt: '2026-02-05T10:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [
            {
              sequenceNo: 1,
              comment: 'Test comment',
              authorId: 'user-123',
              authorName: 'Test User',
              commentedAt: '2026-02-05T11:00:00Z'
            }
          ]
        }
      ];

      const mockResult = {
        success: true,
        data: mockIssues
      };

      mockIssueServiceInstance.list.mockResolvedValue(mockResult);

      mockRequest.query = {
        projectId: 'proj-1',
        methodId: 'method-1',
        taskNo: '1',
        transitionId: 'trans-1'
      };

      // Act
      await issueController.list(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockIssues,
        meta: {
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });

    it('空配列を返す場合もApiResponse形式でレスポンスする', async () => {
      // Arrange
      const mockResult = {
        success: true,
        data: []
      };

      mockIssueServiceInstance.list.mockResolvedValue(mockResult);

      mockRequest.query = {
        projectId: 'proj-1',
        methodId: 'method-1',
        taskNo: '1',
        transitionId: 'trans-1'
      };

      // Act
      await issueController.list(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        meta: {
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });

    it('コメントを含む問題一覧を正しく返す', async () => {
      // Arrange
      const mockIssues = [
        {
          id: 'issue-1',
          projectId: 'proj-1',
          projectName: 'Test Project',
          methodId: 'method-1',
          targetType: 'task' as const,
          taskNo: 1,
          transitionId: null,
          title: 'Test Issue',
          issueType: 'operational_error',
          contents: 'Description',
          status: 'unresolved' as const,
          reportedBy: 'user-123',
          reportedByName: 'Test User',
          reportedAt: '2026-02-05T09:00:00Z',
          completedBy: null,
          completedByName: null,
          completedAt: null,
          comments: [
            {
              sequenceNo: 1,
              comment: 'First comment',
              authorId: 'user-1',
              authorName: 'User 1',
              commentedAt: '2026-02-05T10:00:00Z'
            },
            {
              sequenceNo: 2,
              comment: 'Second comment',
              authorId: 'user-2',
              authorName: 'User 2',
              commentedAt: '2026-02-05T11:00:00Z'
            }
          ]
        }
      ];

      mockIssueServiceInstance.list.mockResolvedValue({
        success: true,
        data: mockIssues
      });

      mockRequest.query = {
        projectId: 'proj-1',
        methodId: 'method-1',
        taskNo: '1',
        transitionId: 'trans-1'
      };

      // Act
      await issueController.list(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 'issue-1',
              comments: expect.arrayContaining([
                expect.objectContaining({ sequenceNo: 1 }),
                expect.objectContaining({ sequenceNo: 2 })
              ])
            })
          ])
        })
      );
    });
  });

  describe('Task 4.2.2: バリデーションエラー時の400エラーレスポンステスト', () => {
    it('サービス層からバリデーションエラーが返された場合、400エラーを返す', async () => {
      // Arrange
      const mockResult = {
        success: false,
        error: {
          code: 'VALIDATION_INVALID_FORMAT',
          message: 'プロジェクトIDが不正です'
        }
      };

      mockIssueServiceInstance.list.mockResolvedValue(mockResult);

      mockRequest.query = {
        projectId: 'invalid-uuid',
        methodId: 'method-1',
        taskNo: '1',
        transitionId: 'trans-1'
      };

      // Act
      await issueController.list(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_INVALID_FORMAT',
          message: 'プロジェクトIDが不正です'
        },
        meta: {
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });

    it('バリデーションエラーレスポンスにmeta情報が含まれることを確認', async () => {
      // Arrange
      const mockResult = {
        success: false,
        error: {
          code: 'VALIDATION_REQUIRED_FIELD',
          message: '必須フィールドが不足しています'
        }
      };

      mockIssueServiceInstance.list.mockResolvedValue(mockResult);

      mockRequest.query = {
        projectId: 'proj-1',
        methodId: 'method-1',
        taskNo: '1',
        transitionId: 'trans-1'
      };

      // Act
      await issueController.list(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          meta: {
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
            requestId: expect.any(String)
          }
        })
      );
    });
  });

  describe('Task 4.2.3: サービス層エラー時の500エラーレスポンステスト', () => {
    it('サービス層で例外が発生した場合、500エラーとシステムエラーメッセージを返す', async () => {
      // Arrange
      const mockError = new Error('Database connection failed');
      mockIssueServiceInstance.list.mockRejectedValue(mockError);

      mockRequest.query = {
        projectId: 'proj-1',
        methodId: 'method-1',
        taskNo: '1',
        transitionId: 'trans-1'
      };

      // Act
      await issueController.list(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'システムエラーが発生しました'
        },
        meta: {
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });

    it('データベース接続エラー時に500エラーを返し、機密情報を含めない', async () => {
      // Arrange
      const dbError = new Error('Connection failed: password=secret123 host=db.internal.com');
      mockIssueServiceInstance.list.mockRejectedValue(dbError);

      mockRequest.query = {
        projectId: 'proj-1',
        methodId: 'method-1',
        taskNo: '1',
        transitionId: 'trans-1'
      };

      // Act
      await issueController.list(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      const errorResponse = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(errorResponse.error.message).not.toContain('password');
      expect(errorResponse.error.message).not.toContain('secret123');
      expect(errorResponse.error.message).not.toContain('db.internal.com');
      expect(errorResponse.error.message).toBe('システムエラーが発生しました');
    });

    it('エラーレスポンスにスタックトレースを含めない', async () => {
      // Arrange
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at Object.<anonymous> (/app/src/test.ts:10:15)';
      mockIssueServiceInstance.list.mockRejectedValue(error);

      mockRequest.query = {
        projectId: 'proj-1',
        methodId: 'method-1',
        taskNo: '1',
        transitionId: 'trans-1'
      };

      // Act
      await issueController.list(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      const errorResponse = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(errorResponse).not.toHaveProperty('stack');
      expect(errorResponse.error).not.toHaveProperty('stack');
      expect(errorResponse.error.message).not.toContain('/app/src/test.ts');
    });

    it('すべてのエラーレスポンスにmeta情報が含まれることを確認', async () => {
      // Arrange
      const error = new Error('Test error');
      mockIssueServiceInstance.list.mockRejectedValue(error);

      mockRequest.query = {
        projectId: 'proj-1',
        methodId: 'method-1',
        taskNo: '1',
        transitionId: 'trans-1'
      };

      // Act
      await issueController.list(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: {
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
            requestId: expect.any(String)
          }
        })
      );
    });

    it('サービス層からシステムエラーが返された場合、500エラーを返す', async () => {
      // Arrange
      const mockResult = {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'データベース接続エラー'
        }
      };

      mockIssueServiceInstance.list.mockResolvedValue(mockResult);

      mockRequest.query = {
        projectId: 'proj-1',
        methodId: 'method-1',
        taskNo: '1',
        transitionId: 'trans-1'
      };

      // Act
      await issueController.list(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'データベース接続エラー'
        },
        meta: {
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });
  });

  describe('Task 4.2.4: meta情報（timestamp、requestId）が含まれることを確認', () => {
    it('成功レスポンスにtimestampとrequestIdが含まれる', async () => {
      // Arrange
      const mockResult = {
        success: true,
        data: []
      };

      mockIssueServiceInstance.list.mockResolvedValue(mockResult);

      mockRequest.query = {
        projectId: 'proj-1',
        methodId: 'method-1',
        taskNo: '1',
        transitionId: 'trans-1'
      };

      // Act
      await issueController.list(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.meta).toBeDefined();
      expect(callArgs.meta.timestamp).toBeDefined();
      expect(callArgs.meta.requestId).toBeDefined();
      expect(typeof callArgs.meta.timestamp).toBe('string');
      expect(typeof callArgs.meta.requestId).toBe('string');
    });

    it('timestampがISO 8601形式であることを確認', async () => {
      // Arrange
      const mockResult = {
        success: true,
        data: []
      };

      mockIssueServiceInstance.list.mockResolvedValue(mockResult);

      mockRequest.query = {
        projectId: 'proj-1',
        methodId: 'method-1',
        taskNo: '1',
        transitionId: 'trans-1'
      };

      // Act
      await issueController.list(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const timestamp = callArgs.meta.timestamp;
      
      // ISO 8601形式のバリデーション
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('エラーレスポンスにもtimestampとrequestIdが含まれる', async () => {
      // Arrange
      const error = new Error('Test error');
      mockIssueServiceInstance.list.mockRejectedValue(error);

      mockRequest.query = {
        projectId: 'proj-1',
        methodId: 'method-1',
        taskNo: '1',
        transitionId: 'trans-1'
      };

      // Act
      await issueController.list(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.meta).toBeDefined();
      expect(callArgs.meta.timestamp).toBeDefined();
      expect(callArgs.meta.requestId).toBeDefined();
    });

    it('requestIdがUUID形式であることを確認', async () => {
      // Arrange
      const mockResult = {
        success: true,
        data: []
      };

      mockIssueServiceInstance.list.mockResolvedValue(mockResult);

      mockRequest.query = {
        projectId: 'proj-1',
        methodId: 'method-1',
        taskNo: '1',
        transitionId: 'trans-1'
      };

      // Act
      await issueController.list(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const requestId = callArgs.meta.requestId;
      
      // UUID v4形式のバリデーション
      expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('Task 4.2補足: サービス層呼び出しの検証', () => {
    it('サービス層にorganizationIdとfiltersを正しく渡す', async () => {
      // Arrange
      const mockResult = {
        success: true,
        data: []
      };

      mockIssueServiceInstance.list.mockResolvedValue(mockResult);

      mockRequest.query = {
        projectId: 'proj-1',
        methodId: 'method-1',
        taskNo: '5',
        transitionId: 'trans-1',
        status: 'unresolved',
        issueType: 'operational_error'
      };

      // Act
      await issueController.list(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockIssueServiceInstance.list).toHaveBeenCalledWith(
        'org-456',
        {
          projectId: 'proj-1',
          methodId: 'method-1',
          taskNo: 5,
          transitionId: 'trans-1',
          status: 'unresolved',
          issueType: 'operational_error'
        }
      );
    });

    it('オプショナルフィルタが未指定の場合、undefinedとして渡す', async () => {
      // Arrange
      const mockResult = {
        success: true,
        data: []
      };

      mockIssueServiceInstance.list.mockResolvedValue(mockResult);

      mockRequest.query = {
        projectId: 'proj-1',
        methodId: 'method-1',
        taskNo: '1',
        transitionId: 'trans-1'
      };

      // Act
      await issueController.list(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockIssueServiceInstance.list).toHaveBeenCalledWith(
        'org-456',
        expect.objectContaining({
          status: undefined,
          issueType: undefined
        })
      );
    });
  });
});
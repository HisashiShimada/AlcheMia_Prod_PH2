import { Request, Response } from 'express';
import * as issueController from '../../src/controllers/issueController';
import { IssueService } from '../../src/services/issueService';

// Mock IssueService
jest.mock('../../src/services/issueService');

describe('issueController.list', () => {
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

  describe('正常系', () => {
    it('問題一覧とコメントを含むApiResponse形式でレスポンスを返す', async () => {
      // Arrange
      const mockResult = {
        success: true,
        data: {
          issues: [
            {
              organizationId: 'org-456',
              projectId: 'proj-1',
              issueId: 'issue-1',
              methodId: 'method-1',
              issueTarget: 2,
              taskNo: 1,
              transitionId: null,
              issueTitle: 'Test Issue 1',
              issueType: 1,
              issueContents: 'Description 1',
              status: 'unresolved',
              issueReporterId: 'user-123',
              issueReportAt: '2026-02-05T10:00:00Z',
              issueCompleterId: null,
              issueComplateAt: null,
              createUserId: 'user-123',
              createAt: '2026-02-05T10:00:00Z',
              updateUserId: 'user-123',
              updateAt: '2026-02-05T10:00:00Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            totalItems: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      };

      mockIssueServiceInstance.list.mockResolvedValue(mockResult);

      mockRequest.query = {
        projectId: 'proj-1',
        page: '1',
        limit: '20'
      };

      // Act
      await issueController.list(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockIssueServiceInstance.list).toHaveBeenCalledWith(
        'org-456',
        expect.any(Object),
        expect.any(Object)
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.data.issues,
        pagination: mockResult.data.pagination,
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
        data: {
          issues: [],
          pagination: {
            page: 1,
            limit: 20,
            totalItems: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      };

      mockIssueServiceInstance.list.mockResolvedValue(mockResult);

      mockRequest.query = {
        projectId: 'proj-1',
        page: '1',
        limit: '20'
      };

      // Act
      await issueController.list(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        pagination: expect.objectContaining({
          page: 1,
          limit: 20,
          totalItems: 0
        }),
        meta: {
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });
  });

  describe('異常系 - Task 2.2: エラーハンドリング', () => {
    it('サービス層でエラーが発生した場合、500エラーとシステムエラーメッセージを返す', async () => {
      // Arrange
      const mockError = new Error('Database connection failed');
      mockIssueServiceInstance.list.mockRejectedValue(mockError);

      mockRequest.query = {
        projectId: 'proj-1'
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
        projectId: 'proj-1'
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
        projectId: 'proj-1'
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
        projectId: 'proj-1'
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
  });

  describe('metaフィールドの検証', () => {
    it('timestampがISO 8601形式であることを確認', async () => {
      // Arrange
      const mockResult = {
        success: true,
        data: {
          issues: [],
          pagination: {
            page: 1,
            limit: 20,
            totalItems: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      };

      mockIssueServiceInstance.list.mockResolvedValue(mockResult);

      mockRequest.query = {
        projectId: 'proj-1'
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
  });
});
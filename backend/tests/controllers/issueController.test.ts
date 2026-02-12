/**
 * IssueController Tests
 * 
 * @description 問題報告コントローラーのユニットテスト
 * Task 4.1: IssueController実装
 * TDD: RED Phase - テストファースト
 */

import { Request, Response } from 'express';
import * as issueController from '../../src/controllers/issueController';
import { IssueService } from '../../src/services/issueService';

// モック
jest.mock('../../src/services/issueService');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-request-id-123'),
}));

describe('IssueController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    mockRequest = {
      user: {
        userId: 'user-123',
        organizationId: 'org-123',
        role: 'worker',
      } as any,
      params: {},
      query: {},
      body: {},
    };

    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('正常系: 問題を正常に作成する（201 Created）', async () => {
      const issueData = {
        projectId: 'project-123',
        issueType: 'equipment_failure',
        targetType: 'project',
        title: 'Test Issue',
        description: 'Test Description',
      };

      mockRequest.body = issueData;

      const mockIssue = {
        id: 'issue-123',
        ...issueData,
        organizationId: 'org-123',
        reportedBy: 'user-123',
        reportedByName: 'Test User',
        status: 'unresolved',
        createdAt: '2026-02-04T00:00:00Z',
      };

      (IssueService.prototype.create as jest.Mock).mockResolvedValue({
        success: true,
        data: mockIssue,
      });

      await issueController.create(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockIssue,
        meta: {
          timestamp: expect.any(String),
          requestId: 'test-request-id-123',
        },
      });
    });

    it('異常系: 認証なしで401エラー', async () => {
      mockRequest.user = undefined;

      await issueController.create(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: '認証が必要です',
        },
        meta: expect.any(Object),
      });
    });

    it('異常系: バリデーションエラー（titleが空）', async () => {
      mockRequest.body = {
        projectId: 'project-123',
        issueType: 'equipment_failure',
        targetType: 'project',
        title: '',
        description: 'Test Description',
      };

      await issueController.create(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_REQUIRED_FIELD',
          }),
        })
      );
    });

    it('異常系: Service層でエラー（プロジェクト未検出）', async () => {
      mockRequest.body = {
        projectId: 'invalid-project',
        issueType: 'equipment_failure',
        targetType: 'project',
        title: 'Test Issue',
        description: 'Test Description',
      };

      (IssueService.prototype.create as jest.Mock).mockResolvedValue({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Project not found',
        },
      });

      await issueController.create(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'RESOURCE_NOT_FOUND',
          }),
        })
      );
    });
  });

  describe('list()', () => {
    it('正常系: 問題一覧を取得する（200 OK）', async () => {
      mockRequest.query = {
        page: '1',
        limit: '20',
      };

      const mockIssues = [
        {
          id: 'issue-1',
          title: 'Issue 1',
          status: 'unresolved',
        },
        {
          id: 'issue-2',
          title: 'Issue 2',
          status: 'resolved',
        },
      ];

      (IssueService.prototype.list as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          issues: mockIssues,
          pagination: {
            page: 1,
            limit: 20,
            totalItems: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
      });

      await issueController.list(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockIssues,
        pagination: expect.any(Object),
        meta: expect.any(Object),
      });
    });

    it('正常系: フィルタリングを適用（projectId指定）', async () => {
      mockRequest.query = {
        projectId: 'project-123',
        status: 'unresolved',
      };

      (IssueService.prototype.list as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          issues: [],
          pagination: {
            page: 1,
            limit: 20,
            totalItems: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        },
      });

      await issueController.list(mockRequest as Request, mockResponse as Response);

      expect(IssueService.prototype.list).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          projectId: 'project-123',
          status: 'unresolved',
        }),
        expect.any(Object)
      );
    });
  });

  describe('getById()', () => {
    it('正常系: 問題詳細を取得する（200 OK）', async () => {
      mockRequest.params = { issueId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' };

      const mockIssue = {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        title: 'Test Issue',
        description: 'Test Description',
        comments: [],
      };

      (IssueService.prototype.getById as jest.Mock).mockResolvedValue({
        success: true,
        data: mockIssue,
      });

      await issueController.getById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockIssue,
        meta: expect.any(Object),
      });
    });

    it('異常系: UUID形式不正で400エラー', async () => {
      mockRequest.params = { issueId: 'invalid-uuid' };

      await issueController.getById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_INVALID_FORMAT',
          }),
        })
      );
    });
  });

  describe('updateStatus()', () => {
    it('正常系: ステータスを更新する（200 OK）', async () => {
      mockRequest.params = { issueId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' };
      mockRequest.body = { status: 'resolved' };

      const mockUpdatedIssue = {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        status: 'resolved',
        resolvedBy: 'user-123',
        resolvedAt: '2026-02-04T00:00:00Z',
      };

      (IssueService.prototype.updateStatus as jest.Mock).mockResolvedValue({
        success: true,
        data: mockUpdatedIssue,
      });

      await issueController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedIssue,
        meta: expect.any(Object),
      });
    });

    it('異常系: 無効なstatusで400エラー', async () => {
      mockRequest.params = { issueId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' };
      mockRequest.body = { status: 'invalid-status' };

      await issueController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_INVALID_VALUE',
          }),
        })
      );
    });
  });

  describe('addComment()', () => {
    it('正常系: コメントを追加する（201 Created）', async () => {
      mockRequest.params = { issueId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' };
      mockRequest.body = { comment: 'This is a test comment' };

      const mockComment = {
        id: 'comment-123',
        issueId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        comment: 'This is a test comment',
        userId: 'user-123',
        userName: 'Test User',
        createdAt: '2026-02-04T00:00:00Z',
      };

      (IssueService.prototype.addComment as jest.Mock).mockResolvedValue({
        success: true,
        data: mockComment,
      });

      await issueController.addComment(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockComment,
        meta: expect.any(Object),
      });
    });

    it('異常系: commentが空で400エラー', async () => {
      mockRequest.params = { issueId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' };
      mockRequest.body = { comment: '' };

      await issueController.addComment(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_REQUIRED_FIELD',
          }),
        })
      );
    });
  });
});
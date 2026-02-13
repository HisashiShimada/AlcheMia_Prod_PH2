/**
 * IssueController.addComment() Authentication Tests
 * 
 * @description 問題コメント投稿APIの認証エラーテスト
 * Task 9.3: 認証エラーレスポンステスト
 * TDD: RED Phase - テストファースト
 */

import { Request, Response } from 'express';
import * as issueController from '../../src/controllers/issueController';
import { IssueService } from '../../src/services/issueService';

// モック
jest.mock('../../src/services/issueService');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-request-id-auth-456'),
}));

describe('IssueController.addComment() - Authentication Errors', () => {
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
      params: {
        issueId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      },
      body: {
        comment: 'This is a valid comment for auth test',
      },
    };

    jest.clearAllMocks();
  });

  describe('Task 9.3: 認証エラー', () => {
    it('JWT なしで HTTP 401 Unauthorized を返す', async () => {
      // Arrange: req.user が undefined（認証なし）
      mockRequest.user = undefined;

      // Act: コントローラーを呼び出し
      await issueController.addComment(mockRequest as Request, mockResponse as Response);

      // Assert: 401 Unauthorized レスポンス
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: '認証が必要です',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: 'test-request-id-auth-456',
        },
      });

      // サービス層が呼び出されないことを確認
      expect(IssueService.prototype.addComment).not.toHaveBeenCalled();
    });

    it('不正なトークン（userIdなし）で HTTP 401 Unauthorized を返す', async () => {
      // Arrange: req.user は存在するが userId がない（不正なトークン）
      mockRequest.user = {
        organizationId: 'org-123',
        role: 'worker',
      } as any;

      // Act: コントローラーを呼び出し
      await issueController.addComment(mockRequest as Request, mockResponse as Response);

      // Assert: 401 Unauthorized レスポンス
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: '認証が必要です',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: 'test-request-id-auth-456',
        },
      });

      // サービス層が呼び出されないことを確認
      expect(IssueService.prototype.addComment).not.toHaveBeenCalled();
    });

    it('不正なトークン（organizationIdなし）で HTTP 401 Unauthorized を返す', async () => {
      // Arrange: req.user は存在するが organizationId がない
      mockRequest.user = {
        userId: 'user-123',
        role: 'worker',
      } as any;

      // Act: コントローラーを呼び出し
      await issueController.addComment(mockRequest as Request, mockResponse as Response);

      // Assert: 401 Unauthorized レスポンス
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: '認証が必要です',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: 'test-request-id-auth-456',
        },
      });

      // サービス層が呼び出されないことを確認
      expect(IssueService.prototype.addComment).not.toHaveBeenCalled();
    });

    it('認証情報が部分的に欠けている場合に HTTP 401 Unauthorized を返す', async () => {
      // Arrange: req.user は存在するが必須フィールドが不完全
      mockRequest.user = {
        role: 'worker',
      } as any;

      // Act: コントローラーを呼び出し
      await issueController.addComment(mockRequest as Request, mockResponse as Response);

      // Assert: 401 Unauthorized レスポンス
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: '認証が必要です',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: 'test-request-id-auth-456',
        },
      });

      // サービス層が呼び出されないことを確認
      expect(IssueService.prototype.addComment).not.toHaveBeenCalled();
    });
  });

  describe('正常系: 認証成功', () => {
    it('完全な認証情報がある場合はサービス層を呼び出す', async () => {
      // Arrange: 正常な req.user
      mockRequest.user = {
        userId: 'user-123',
        organizationId: 'org-123',
        role: 'worker',
      } as any;

      const mockComment = {
        projectId: 'project-123',
        issueId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        sequenceNo: 1,
        comment: 'This is a valid comment for auth test',
        authorId: 'user-123',
        authorName: 'Test User',
        commentedAt: '2026-02-04T12:00:00Z',
      };

      (IssueService.prototype.addComment as jest.Mock).mockResolvedValue({
        success: true,
        data: mockComment,
      });

      // Act: コントローラーを呼び出し
      await issueController.addComment(mockRequest as Request, mockResponse as Response);

      // Assert: サービス層が正しく呼び出される
      expect(IssueService.prototype.addComment).toHaveBeenCalledWith(
        'org-123',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'user-123',
        'This is a valid comment for auth test'
      );

      // 201 Created レスポンス
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockComment,
        meta: {
          timestamp: expect.any(String),
          requestId: 'test-request-id-auth-456',
        },
      });
    });
  });
});
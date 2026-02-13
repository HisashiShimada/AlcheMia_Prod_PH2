/**
 * Issue Controller - Add Comment Validation Error Tests
 * 
 * テスト対象: addComment() method
 * 目的: バリデーションエラー時のレスポンスを検証
 * 
 * Requirements: REQ-002, REQ-009
 * Task: 9.2 バリデーションエラーレスポンステスト
 */

import { Request, Response } from 'express';
import * as issueController from '../../src/controllers/issueController';
import { IssueService } from '../../src/services/issueService';

// モック
jest.mock('../../src/services/issueService');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-request-id-validation'),
}));

describe('IssueController - addComment Validation Errors', () => {
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
        organizationId: 'org-456',
        role: 'worker',
      } as any,
      params: {
        issueId: '123e4567-e89b-12d3-a456-426614174000',
      },
      body: {},
    };

    jest.clearAllMocks();
  });

  describe('addComment() - Validation Errors', () => {
    it('異常系: commentが空文字列で400エラー', async () => {
      // Arrange
      mockRequest.body = { comment: '' };

      const mockServiceError = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'コメントを入力してください',
        },
      };

      (IssueService.prototype.addComment as jest.Mock).mockResolvedValue(mockServiceError);

      // Act
      await issueController.addComment(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.any(String),
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(String),
            requestId: 'test-request-id-validation',
          }),
        })
      );
    });

    it('異常系: commentが空白のみで400エラー', async () => {
      // Arrange
      mockRequest.body = { comment: '   ' };

      const mockServiceError = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'コメントを入力してください',
        },
      };

      (IssueService.prototype.addComment as jest.Mock).mockResolvedValue(mockServiceError);

      // Act
      await issueController.addComment(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    it('異常系: commentが2001文字で400エラー', async () => {
      // Arrange
      const longComment = 'a'.repeat(2001);
      mockRequest.body = { comment: longComment };

      const mockServiceError = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'コメントは2000文字以内で入力してください',
        },
      };

      (IssueService.prototype.addComment as jest.Mock).mockResolvedValue(mockServiceError);

      // Act
      await issueController.addComment(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('2000文字'),
          }),
        })
      );
    });

    it('異常系: commentフィールドが欠落で400エラー', async () => {
      // Arrange
      mockRequest.body = {}; // commentフィールドなし

      const mockServiceError = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'コメントを入力してください',
        },
      };

      (IssueService.prototype.addComment as jest.Mock).mockResolvedValue(mockServiceError);

      // Act
      await issueController.addComment(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    it('異常系: issueIdがUUID形式でない場合400エラー', async () => {
      // Arrange
      mockRequest.params = { issueId: 'invalid-uuid-format' };
      mockRequest.body = { comment: 'Valid comment' };

      // Act
      await issueController.addComment(mockRequest as Request, mockResponse as Response);

      // Assert
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

    it('異常系: エラーレスポンスに詳細情報が含まれる', async () => {
      // Arrange
      mockRequest.body = { comment: '' };

      const mockServiceError = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラー',
          details: [
            { field: 'comment', message: 'コメントを入力してください' },
          ],
        },
      };

      (IssueService.prototype.addComment as jest.Mock).mockResolvedValue(mockServiceError);

      // Act
      await issueController.addComment(mockRequest as Request, mockResponse as Response);

      // Assert
      const callArgs = mockJson.mock.calls[0][0];
      expect(callArgs).toHaveProperty('success', false);
      expect(callArgs).toHaveProperty('error');
      expect(callArgs.error).toHaveProperty('code');
      expect(callArgs.error).toHaveProperty('message');
      expect(callArgs).toHaveProperty('meta');
      expect(callArgs.meta).toHaveProperty('timestamp');
      expect(callArgs.meta).toHaveProperty('requestId');
    });

    it('異常系: エラーレスポンス構造が統一されている', async () => {
      // Arrange
      mockRequest.body = { comment: 'a'.repeat(2001) };

      const mockServiceError = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'コメントは2000文字以内で入力してください',
        },
      };

      (IssueService.prototype.addComment as jest.Mock).mockResolvedValue(mockServiceError);

      // Act
      await issueController.addComment(mockRequest as Request, mockResponse as Response);

      // Assert
      const response = mockJson.mock.calls[0][0];
      
      // 統一レスポンス形式の検証
      expect(response).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: expect.any(String),
            message: expect.any(String),
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(String),
            requestId: expect.any(String),
          }),
        })
      );

      // errorオブジェクトの必須プロパティ
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');

      // metaオブジェクトの必須プロパティ
      expect(response.meta).toHaveProperty('timestamp');
      expect(response.meta).toHaveProperty('requestId');
    });

    it('異常系: 複数のバリデーションエラーの詳細が返却される', async () => {
      // Arrange
      mockRequest.body = { comment: '' };

      const mockServiceError = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'バリデーションに失敗しました',
          details: [
            { field: 'comment', message: 'コメントを入力してください' },
            { field: 'comment', message: 'コメントは1文字以上必要です' },
          ],
        },
      };

      (IssueService.prototype.addComment as jest.Mock).mockResolvedValue(mockServiceError);

      // Act
      await issueController.addComment(mockRequest as Request, mockResponse as Response);

      // Assert
      const response = mockJson.mock.calls[0][0];
      expect(response.error.details).toBeDefined();
      if (response.error.details) {
        expect(Array.isArray(response.error.details)).toBe(true);
        expect(response.error.details.length).toBeGreaterThan(0);
        expect(response.error.details[0]).toHaveProperty('field');
        expect(response.error.details[0]).toHaveProperty('message');
      }
    });
  });
});
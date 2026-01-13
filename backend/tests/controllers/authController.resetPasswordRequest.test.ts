import { Request, Response } from 'express';
import { resetPasswordRequest } from '../../src/controllers/authController';
import { EmailService } from '../../src/services/emailService';
import { getPool } from '../../src/database/db';

// Mock dependencies
jest.mock('../../src/services/emailService');
jest.mock('../../src/database/db');

// Mock service instances
const mockEmailService = {
  sendPasswordReset: jest.fn(),
};

(EmailService as jest.MockedClass<typeof EmailService>).mockImplementation(() => mockEmailService as any);

describe('authController - resetPasswordRequest', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      body: {},
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({ query: mockQuery });
  });

  describe('成功シナリオ', () => {
    test('有効なユーザー名でパスワードリセット要求を送信する', async () => {
      // Arrange
      const username = 'test_user';
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.body = { username };
      mockRequest.headers = { 'x-organization-id': organizationId };

      // Mock user search result
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user123',
            user_name: 'test_user',
            mail_address: 'user@example.com',
            organization_id: organizationId,
          },
        ],
      });

      // Mock email sending
      mockEmailService.sendPasswordReset.mockResolvedValue({
        success: true,
        data: undefined,
      });

      // Act
      await resetPasswordRequest(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            message: expect.any(String),
            email: 'use***@example.com',
          }),
        })
      );

      // Verify email was sent with reset token
      expect(mockEmailService.sendPasswordReset).toHaveBeenCalledWith(
        'user@example.com',
        expect.stringMatching(/^reset_[0-9a-f-]+_\d+$/),
        'test_user'
      );
    });

    test('ユーザーが存在しない場合も同じレスポンスを返す（情報漏洩防止）', async () => {
      // Arrange
      const username = 'nonexistent_user';
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.body = { username };
      mockRequest.headers = { 'x-organization-id': organizationId };

      // Mock user not found
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await resetPasswordRequest(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            message: expect.any(String),
            email: expect.any(String),
          }),
        })
      );

      // Verify email was NOT sent
      expect(mockEmailService.sendPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe('失敗シナリオ', () => {
    test('必須パラメータが不足している場合、400エラーを返す', async () => {
      // Arrange
      mockRequest.body = {}; // username missing
      mockRequest.headers = { 'x-organization-id': '123e4567-e89b-12d3-a456-426614174000' };

      // Act
      await resetPasswordRequest(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.any(String),
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'username',
                message: expect.any(String),
                code: 'REQUIRED_FIELD',
              }),
            ]),
          }),
        })
      );
    });

    test('X-Organization-Idヘッダーが不足している場合、400エラーを返す', async () => {
      // Arrange
      mockRequest.body = { username: 'test_user' };
      mockRequest.headers = {}; // missing X-Organization-Id

      // Act
      await resetPasswordRequest(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.any(String),
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'X-Organization-Id',
                message: expect.any(String),
                code: 'REQUIRED_HEADER',
              }),
            ]),
          }),
        })
      );
    });

    test('メール送信が失敗した場合、500エラーを返す', async () => {
      // Arrange
      const username = 'test_user';
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.body = { username };
      mockRequest.headers = { 'x-organization-id': organizationId };

      // Mock user found
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user123',
            user_name: 'test_user',
            mail_address: 'user@example.com',
            organization_id: organizationId,
          },
        ],
      });

      // Mock email sending failure
      mockEmailService.sendPasswordReset.mockResolvedValue({
        success: false,
        error: {
          code: 'SYSTEM_EMAIL_SEND_FAILED',
          message: 'Failed to send email',
        },
      });

      // Act
      await resetPasswordRequest(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'SYSTEM_EMAIL_SEND_FAILED',
            message: expect.any(String),
          }),
        })
      );
    });
  });

  describe('バリデーション', () => {
    test('ユーザー名が100文字を超える場合、400エラーを返す', async () => {
      // Arrange
      mockRequest.body = {
        username: 'a'.repeat(101),
      };
      mockRequest.headers = { 'x-organization-id': '123e4567-e89b-12d3-a456-426614174000' };

      // Act
      await resetPasswordRequest(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.any(String),
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'username',
                message: expect.any(String),
                code: 'MAX_LENGTH_EXCEEDED',
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('セキュリティ', () => {
    test('リセットトークンはUUID形式で生成される', async () => {
      // Arrange
      const username = 'test_user';
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.body = { username };
      mockRequest.headers = { 'x-organization-id': organizationId };

      // Mock user found
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user123',
            user_name: 'test_user',
            mail_address: 'user@example.com',
            organization_id: organizationId,
          },
        ],
      });

      // Mock email sending
      mockEmailService.sendPasswordReset.mockResolvedValue({
        success: true,
        data: undefined,
      });

      // Act
      await resetPasswordRequest(mockRequest as Request, mockResponse as Response);

      // Assert
      const emailCall = mockEmailService.sendPasswordReset.mock.calls[0];
      const resetToken = emailCall[1];

      // Verify token format: reset_{uuid}_{timestamp}
      expect(resetToken).toMatch(/^reset_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_\d{13}$/);
    });

    test('メールアドレスは常にマスキングされる', async () => {
      // Arrange
      const username = 'long_username';
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.body = { username };
      mockRequest.headers = { 'x-organization-id': organizationId };

      // Mock user found with long email
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user123',
            user_name: 'long_username',
            mail_address: 'long.email.address@example.com',
            organization_id: organizationId,
          },
        ],
      });

      // Mock email sending
      mockEmailService.sendPasswordReset.mockResolvedValue({
        success: true,
        data: undefined,
      });

      // Act
      await resetPasswordRequest(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            email: 'lon***@example.com',
          }),
        })
      );
    });
  });
});

import { Request, Response } from 'express';
import { resendPin } from '../../src/controllers/authController';
import { PinCodeService } from '../../src/services/pinCodeService';
import { EmailService } from '../../src/services/emailService';
import { getPool } from '../../src/database/db';

// Mock dependencies
jest.mock('../../src/services/pinCodeService');
jest.mock('../../src/services/emailService');
jest.mock('../../src/database/db');

// Mock service instances
const mockPinCodeService = {
  delete: jest.fn(),
  generateAndSave: jest.fn(),
};
const mockEmailService = {
  sendPinCode: jest.fn(),
};

(PinCodeService as jest.MockedClass<typeof PinCodeService>).mockImplementation(() => mockPinCodeService as any);
(EmailService as jest.MockedClass<typeof EmailService>).mockImplementation(() => mockEmailService as any);

describe('authController - resendPin', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
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
    test('有効な仮セッショントークンで新しいPINコードを再送信する', async () => {
      // Arrange
      const sessionToken = 'temp_session-abc123_1735185000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.headers = {
        authorization: `Bearer ${sessionToken}`,
        'x-organization-id': organizationId,
      };

      // Mock user info retrieval from pin_codes table
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user123',
            organization_id: organizationId,
            user_name: 'test_user',
            mail_address: 'user@example.com',
          },
        ],
      });

      // Mock PIN code deletion
      mockPinCodeService.delete.mockResolvedValue({
        success: true,
      });

      // Mock new PIN code generation
      mockPinCodeService.generateAndSave.mockResolvedValue({
        success: true,
        data: {
          pinCode: '654321',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      // Mock email sending
      mockEmailService.sendPinCode.mockResolvedValue({
        success: true,
        data: undefined,
      });

      // Act
      await resendPin(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            message: 'PINコードを再送信しました',
            email: 'use***@example.com',
            expiresIn: 300,
          }),
        })
      );

      // Verify old PIN code was deleted
      expect(mockPinCodeService.delete).toHaveBeenCalledWith(sessionToken);

      // Verify new PIN code was generated
      expect(mockPinCodeService.generateAndSave).toHaveBeenCalledWith(
        'user123',
        organizationId,
        sessionToken
      );

      // Verify email was sent
      expect(mockEmailService.sendPinCode).toHaveBeenCalledWith(
        'user@example.com',
        '654321',
        'test_user'
      );
    });
  });

  describe('失敗シナリオ', () => {
    test('仮セッショントークンが不正な場合、401エラーを返す', async () => {
      // Arrange
      const sessionToken = 'invalid_token';
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.headers = {
        authorization: `Bearer ${sessionToken}`,
        'x-organization-id': organizationId,
      };

      // Mock pin_codes not found
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await resendPin(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_TOKEN_INVALID',
            message: 'セッショントークンが不正です',
          }),
        })
      );
    });

    test('Authorizationヘッダーが不足している場合、400エラーを返す', async () => {
      // Arrange
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.headers = {
        'x-organization-id': organizationId,
      };

      // Act
      await resendPin(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Authorizationヘッダーが必要です',
          }),
        })
      );
    });

    test('Organization-Idヘッダーが不足している場合、400エラーを返す', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer temp_session-abc123_1735185000',
      };

      // Act
      await resendPin(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: '組織IDヘッダーが必要です',
          }),
        })
      );
    });

    test('メール送信が失敗した場合、500エラーを返す', async () => {
      // Arrange
      const sessionToken = 'temp_session-abc123_1735185000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.headers = {
        authorization: `Bearer ${sessionToken}`,
        'x-organization-id': organizationId,
      };

      // Mock user info retrieval
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user123',
            organization_id: organizationId,
            user_name: 'test_user',
            mail_address: 'user@example.com',
          },
        ],
      });

      // Mock PIN code deletion
      mockPinCodeService.delete.mockResolvedValue({
        success: true,
      });

      // Mock PIN code generation
      mockPinCodeService.generateAndSave.mockResolvedValue({
        success: true,
        data: {
          pinCode: '654321',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      // Mock email sending failure
      mockEmailService.sendPinCode.mockResolvedValue({
        success: false,
        error: {
          code: 'SYSTEM_EMAIL_SEND_FAILED',
          message: 'Failed to send email',
        },
      });

      // Act
      await resendPin(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'SYSTEM_EMAIL_SEND_FAILED',
          }),
        })
      );
    });
  });

  describe('バリデーション', () => {
    test('Authorizationヘッダーの形式が不正な場合、400エラーを返す', async () => {
      // Arrange
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.headers = {
        authorization: 'InvalidFormat token123',
        'x-organization-id': organizationId,
      };

      // Act
      await resendPin(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Authorizationヘッダーの形式が不正です',
          }),
        })
      );
    });
  });
});

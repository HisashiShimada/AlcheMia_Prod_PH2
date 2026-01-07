import { Request, Response } from 'express';
import { login, verifyPin, resendPin } from '../../src/controllers/authController';
import { PasswordService } from '../../src/services/passwordService';
import { PinCodeService } from '../../src/services/pinCodeService';
import { EmailService } from '../../src/services/emailService';
import { JwtService } from '../../src/services/jwtService';
import { getPool } from '../../src/database/db';

// Mock dependencies
jest.mock('../../src/services/passwordService');
jest.mock('../../src/services/pinCodeService');
jest.mock('../../src/services/emailService');
jest.mock('../../src/services/jwtService');
jest.mock('../../src/database/db');

// Mock service instances
const mockPasswordService = {
  verify: jest.fn(),
};
const mockPinCodeService = {
  generateAndSave: jest.fn(),
  verify: jest.fn(),
  delete: jest.fn(),
};
const mockEmailService = {
  sendPinCode: jest.fn(),
};
const mockJwtService = {
  generate: jest.fn(),
};

(PasswordService as jest.MockedClass<typeof PasswordService>).mockImplementation(() => mockPasswordService as any);
(PinCodeService as jest.MockedClass<typeof PinCodeService>).mockImplementation(() => mockPinCodeService as any);
(EmailService as jest.MockedClass<typeof EmailService>).mockImplementation(() => mockEmailService as any);
(JwtService as jest.MockedClass<typeof JwtService>).mockImplementation(() => mockJwtService as any);

describe('authController - login', () => {
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
    test('有効な認証情報でログインし、PINコードを送信する', async () => {
      // Arrange
      const username = 'test_user';
      const password = 'Test@1234';
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.body = { username, password };
      mockRequest.headers = { 'x-organization-id': organizationId };

      // Mock user search result
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user123',
            user_name: 'test_user',
            mail_address: 'user@example.com',
            role: 'experiment_worker',
            organization_id: organizationId,
            is_active: true,
            locked_until: null,
          },
        ],
      });

      // Mock password verification
      mockPasswordService.verify.mockResolvedValue({
        success: true,
        data: true,
      });

      // Mock PIN code generation
      mockPinCodeService.generateAndSave.mockResolvedValue({
        success: true,
        data: {
          pinCode: '123456',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      // Mock email sending
      mockEmailService.sendPinCode.mockResolvedValue({
        success: true,
        data: undefined,
      });

      // Mock login history insert
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await login(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            sessionToken: expect.stringMatching(/^temp_session-/),
            message: expect.any(String),
            email: 'use***@example.com',
            expiresIn: 300,
          }),
        })
      );

      // Verify password was checked
      expect(mockPasswordService.verify).toHaveBeenCalledWith(
        'user123',
        organizationId,
        password
      );

      // Verify PIN code was generated
      expect(mockPinCodeService.generateAndSave).toHaveBeenCalledWith(
        'user123',
        organizationId,
        expect.stringMatching(/^temp_session-/)
      );

      // Verify email was sent
      expect(mockEmailService.sendPinCode).toHaveBeenCalledWith(
        'user@example.com',
        '123456',
        'test_user'
      );

      // Verify login history was recorded
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO login_history'),
        expect.arrayContaining(['user123', organizationId, true])
      );
    });
  });

  describe('失敗シナリオ', () => {
    test('ユーザー名が存在しない場合、401エラーを返す', async () => {
      // Arrange
      mockRequest.body = {
        username: 'nonexistent',
        password: 'Test@1234',
      };
      mockRequest.headers = { 'x-organization-id': '123e4567-e89b-12d3-a456-426614174000' };

      // Mock user not found
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await login(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_INVALID_CREDENTIALS',
            message: 'ユーザー名またはパスワードが正しくありません',
          }),
        })
      );
    });

    test('パスワードが不正な場合、401エラーを返しlogin_historyに記録する', async () => {
      // Arrange
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.body = {
        username: 'test_user',
        password: 'WrongPassword',
      };
      mockRequest.headers = { 'x-organization-id': organizationId };

      // Mock user found
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user123',
            user_name: 'test_user',
            mail_address: 'user@example.com',
            role: 'experiment_worker',
            organization_id: organizationId,
            is_active: true,
            locked_until: null,
          },
        ],
      });

      // Mock password verification failure
      mockPasswordService.verify.mockResolvedValue({
        success: true,
        data: false,
      });

      // Mock login history insert
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await login(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_INVALID_CREDENTIALS',
            message: 'ユーザー名またはパスワードが正しくありません',
          }),
        })
      );

      // Verify login failure was recorded
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO login_history'),
        expect.arrayContaining(['user123', organizationId, false, 'Invalid password'])
      );
    });

    test('アカウントが無効化されている場合、403エラーを返す', async () => {
      // Arrange
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.body = {
        username: 'disabled_user',
        password: 'Test@1234',
      };
      mockRequest.headers = { 'x-organization-id': organizationId };

      // Mock disabled user
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user123',
            user_name: 'disabled_user',
            is_active: false,
          },
        ],
      });

      // Act
      await login(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_ACCOUNT_DISABLED',
            message: 'アカウントが無効化されています。管理者にお問い合わせください',
          }),
        })
      );
    });

    test('必須パラメータが不足している場合、400エラーを返す', async () => {
      // Arrange
      mockRequest.body = { username: 'test_user' }; // password missing
      mockRequest.headers = { 'x-organization-id': '123e4567-e89b-12d3-a456-426614174000' };

      // Act
      await login(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    test('Organization-Idヘッダーが不足している場合、400エラーを返す', async () => {
      // Arrange
      mockRequest.body = {
        username: 'test_user',
        password: 'Test@1234',
      };
      mockRequest.headers = {}; // missing X-Organization-Id

      // Act
      await login(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    test('メール送信が失敗した場合、500エラーを返す', async () => {
      // Arrange
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';
      mockRequest.body = {
        username: 'test_user',
        password: 'Test@1234',
      };
      mockRequest.headers = { 'x-organization-id': organizationId };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user123',
            user_name: 'test_user',
            mail_address: 'user@example.com',
            role: 'experiment_worker',
            organization_id: organizationId,
            is_active: true,
            locked_until: null,
          },
        ],
      });

      mockPasswordService.verify.mockResolvedValue({
        success: true,
        data: true,
      });

      mockPinCodeService.generateAndSave.mockResolvedValue({
        success: true,
        data: {
          pinCode: '123456',
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
      await login(mockRequest as Request, mockResponse as Response);

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
    test('ユーザー名が100文字を超える場合、400エラーを返す', async () => {
      // Arrange
      mockRequest.body = {
        username: 'a'.repeat(101),
        password: 'Test@1234',
      };
      mockRequest.headers = { 'x-organization-id': '123e4567-e89b-12d3-a456-426614174000' };

      // Act
      await login(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    test('パスワードが8文字未満の場合、400エラーを返す', async () => {
      // Arrange
      mockRequest.body = {
        username: 'test_user',
        password: 'Test@1',
      };
      mockRequest.headers = { 'x-organization-id': '123e4567-e89b-12d3-a456-426614174000' };

      // Act
      await login(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });
  });
});

describe('authController - verifyPin', () => {
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
      cookie: jest.fn().mockReturnThis(),
    };

    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({ query: mockQuery });
  });

  describe('成功シナリオ', () => {
    test('有効なPINコードでセッションを生成する', async () => {
      // Arrange
      const pinCode = '123456';
      const sessionToken = 'temp_session-abc123_1735185000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.body = { pinCode };
      mockRequest.headers = {
        authorization: `Bearer ${sessionToken}`,
        'x-organization-id': organizationId,
      };

      // Mock PIN code verification - returns UserInfo directly
      mockPinCodeService.verify.mockResolvedValue({
        success: true,
        data: {
          id: 'user123',
          username: 'test_user',
          email: 'user@example.com',
          role: 'experiment_admin',
          organizationId: organizationId,
          organizationName: 'MAIML研究室',
          displayName: '山田 太郎',
        },
      });

      // Mock JWT generation
      const jwtToken = 'maiml_session-xyz789_1735185300';
      mockJwtService.generate.mockResolvedValue({
        success: true,
        data: jwtToken,
      });

      // Mock PIN code deletion
      mockPinCodeService.delete.mockResolvedValue({
        success: true,
      });

      // Act
      await verifyPin(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'maiml_session',
        jwtToken,
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 86400000, // 24時間（ミリ秒）
          path: '/',
        })
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: 'user123',
              username: 'test_user',
              email: 'user@example.com',
              role: 'experiment_admin',
              organizationId: organizationId,
              organizationName: 'MAIML研究室',
              displayName: '山田 太郎',
            }),
            session: expect.objectContaining({
              token: jwtToken,
              expiresAt: expect.any(String),
            }),
            redirectUrl: '/experiment-admin',
          }),
        })
      );

      // Verify PIN code was deleted
      expect(mockPinCodeService.delete).toHaveBeenCalledWith(sessionToken);
    });

    test('Admin権限の場合、監査ログを記録する', async () => {
      // Arrange
      const pinCode = '123456';
      const sessionToken = 'temp_session-abc123_1735185000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.body = { pinCode };
      mockRequest.headers = {
        authorization: `Bearer ${sessionToken}`,
        'x-organization-id': organizationId,
      };
      mockRequest.ip = '192.168.1.1';
      mockRequest.get = jest.fn().mockReturnValue('Mozilla/5.0');

      // Mock PIN code verification
      mockPinCodeService.verify.mockResolvedValue({
        success: true,
        data: {
          id: 'admin123',
          username: 'admin_user',
          email: 'admin@example.com',
          role: 'system_admin',
          organizationId: organizationId,
          organizationName: 'MAIML研究室',
          displayName: 'システム管理者',
        },
      });

      // Mock JWT generation
      mockJwtService.generate.mockResolvedValue({
        success: true,
        data: 'maiml_session-admin789_1735185300',
      });

      // Mock PIN code deletion
      mockPinCodeService.delete.mockResolvedValue({
        success: true,
      });

      // Mock audit log insert
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await verifyPin(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      // Verify audit log was recorded
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO admin_audit_log'),
        expect.arrayContaining([
          'admin123',
          organizationId,
          'login',
          '192.168.1.1',
          'Mozilla/5.0',
        ])
      );
    });
  });

  describe('失敗シナリオ', () => {
    test('PINコードが不正な場合、401エラーを返す', async () => {
      // Arrange
      const pinCode = '999999';
      const sessionToken = 'temp_session-abc123_1735185000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.body = { pinCode };
      mockRequest.headers = {
        authorization: `Bearer ${sessionToken}`,
        'x-organization-id': organizationId,
      };

      // Mock PIN code verification failure
      mockPinCodeService.verify.mockResolvedValue({
        success: false,
        error: {
          code: 'AUTH_PIN_INVALID',
          message: 'PINコードが正しくありません',
        },
      });

      // Act
      await verifyPin(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_PIN_INVALID',
            message: 'PINコードが正しくありません',
          }),
        })
      );
    });

    test('PINコードの有効期限が切れている場合、401エラーを返す', async () => {
      // Arrange
      const pinCode = '123456';
      const sessionToken = 'temp_session-abc123_1735185000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.body = { pinCode };
      mockRequest.headers = {
        authorization: `Bearer ${sessionToken}`,
        'x-organization-id': organizationId,
      };

      // Mock PIN code expired
      mockPinCodeService.verify.mockResolvedValue({
        success: false,
        error: {
          code: 'AUTH_PIN_EXPIRED',
          message: 'PINコードの有効期限が切れています',
        },
      });

      // Act
      await verifyPin(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_PIN_EXPIRED',
            message: 'PINコードの有効期限が切れています',
          }),
        })
      );
    });

    test('PINコード試行回数が上限を超えた場合、429エラーを返す', async () => {
      // Arrange
      const pinCode = '123456';
      const sessionToken = 'temp_session-abc123_1735185000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.body = { pinCode };
      mockRequest.headers = {
        authorization: `Bearer ${sessionToken}`,
        'x-organization-id': organizationId,
      };

      // Mock PIN code max attempts exceeded
      mockPinCodeService.verify.mockResolvedValue({
        success: false,
        error: {
          code: 'AUTH_PIN_MAX_ATTEMPTS',
          message: 'PINコードの入力試行回数が上限を超えました',
        },
      });

      // Act
      await verifyPin(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_PIN_MAX_ATTEMPTS',
            message: 'PINコードの入力試行回数が上限を超えました',
          }),
        })
      );
    });

    test('仮セッショントークンが不正な場合、401エラーを返す', async () => {
      // Arrange
      const pinCode = '123456';
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.body = { pinCode };
      mockRequest.headers = {
        authorization: 'Bearer invalid_token',
        'x-organization-id': organizationId,
      };

      // Mock PIN code verification failure
      mockPinCodeService.verify.mockResolvedValue({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'セッショントークンが不正です',
        },
      });

      // Act
      await verifyPin(mockRequest as Request, mockResponse as Response);

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

    test('必須パラメータが不足している場合、400エラーを返す', async () => {
      // Arrange
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.body = {}; // pinCode missing
      mockRequest.headers = {
        authorization: 'Bearer temp_session-abc123_1735185000',
        'x-organization-id': organizationId,
      };

      // Act
      await verifyPin(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    test('Authorizationヘッダーが不足している場合、400エラーを返す', async () => {
      // Arrange
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.body = { pinCode: '123456' };
      mockRequest.headers = {
        'x-organization-id': organizationId,
      };

      // Act
      await verifyPin(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });
  });

  describe('バリデーション', () => {
    test('PINコードが6桁でない場合、400エラーを返す', async () => {
      // Arrange
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.body = { pinCode: '12345' }; // 5桁
      mockRequest.headers = {
        authorization: 'Bearer temp_session-abc123_1735185000',
        'x-organization-id': organizationId,
      };

      // Act
      await verifyPin(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    test('PINコードが数字でない場合、400エラーを返す', async () => {
      // Arrange
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.body = { pinCode: 'abcdef' };
      mockRequest.headers = {
        authorization: 'Bearer temp_session-abc123_1735185000',
        'x-organization-id': organizationId,
      };

      // Act
      await verifyPin(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });
  });
});

describe('authController - resendPin', () => {
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
    test('有効な仮セッショントークンで新しいPINコードを再送信する', async () => {
      // Arrange
      const sessionToken = 'temp_session-abc123_1735185000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174000';

      mockRequest.headers = {
        authorization: `Bearer ${sessionToken}`,
        'x-organization-id': organizationId,
      };

      // Mock user info retrieval from session token
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user123',
            user_name: 'test_user',
            mail_address: 'user@example.com',
            organization_id: organizationId,

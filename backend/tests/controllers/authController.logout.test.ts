import { Request, Response } from 'express';
import { logout } from '../../src/controllers/authController';
import { getPool } from '../../src/database/db';

// Mock dependencies
jest.mock('../../src/database/db');

describe('authController - logout', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockQuery: jest.Mock;
  let mockClearCookie: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClearCookie = jest.fn().mockReturnThis();

    mockRequest = {
      user: {
        userId: 'user123',
        organizationId: 'org456',
        role: 'experiment_admin',
        sessionId: 'session789',
      },
      ip: '192.168.1.1',
      headers: {
        'user-agent': 'Mozilla/5.0',
      },
      get: jest.fn((header: string) => {
        if (header === 'user-agent') return 'Mozilla/5.0';
        return undefined;
      }),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      clearCookie: mockClearCookie,
    };

    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({ query: mockQuery });
  });

  describe('成功シナリオ', () => {
    test('一般ユーザーがログアウトできる', async () => {
      // Arrange
      mockRequest.user = {
        userId: 'user123',
        organizationId: 'org456',
        role: 'experiment_worker',
        sessionId: 'session789',
      };

      // Act
      await logout(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('maiml_session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            message: 'ログアウトしました',
          }),
        })
      );

      // Admin監査ログが記録されないことを確認
      expect(mockQuery).not.toHaveBeenCalled();
    });

    test('Providerユーザーがログアウトすると監査ログが記録される', async () => {
      // Arrange
      mockRequest.user = {
        userId: 'admin123',
        organizationId: 'org456',
        role: 'provider',
        sessionId: 'session789',
      };

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      // Act
      await logout(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.clearCookie).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      // Admin監査ログが記録されることを確認
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO admin_audit_log'),
        expect.arrayContaining([
          'admin123',
          'org456',
          'logout',
          '192.168.1.1',
          'Mozilla/5.0',
        ])
      );
    });

    test('System Adminユーザーがログアウトすると監査ログが記録される', async () => {
      // Arrange
      mockRequest.user = {
        userId: 'sysadmin123',
        organizationId: 'org456',
        role: 'system_admin',
        sessionId: 'session789',
      };

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      // Act
      await logout(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.clearCookie).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      // Admin監査ログが記録されることを確認
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO admin_audit_log'),
        expect.arrayContaining([
          'sysadmin123',
          'org456',
          'logout',
          '192.168.1.1',
          'Mozilla/5.0',
        ])
      );
    });
  });

  describe('異常系', () => {
    test('req.userが存在しない場合、401エラーを返す', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await logout(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTH_UNAUTHORIZED',
            message: '認証が必要です',
          }),
        })
      );

      expect(mockResponse.clearCookie).not.toHaveBeenCalled();
    });

    test('監査ログ記録に失敗しても正常にログアウトできる', async () => {
      // Arrange
      mockRequest.user = {
        userId: 'admin123',
        organizationId: 'org456',
        role: 'provider',
        sessionId: 'session789',
      };

      // Mock database error
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      // Act
      await logout(mockRequest as Request, mockResponse as Response);

      // Assert - エラーでもログアウトは成功
      expect(mockResponse.clearCookie).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            message: 'ログアウトしました',
          }),
        })
      );
    });
  });

  describe('Cookie削除', () => {
    test('Cookieが正しいオプションで削除される', async () => {
      // Arrange
      mockRequest.user = {
        userId: 'user123',
        organizationId: 'org456',
        role: 'experiment_worker',
        sessionId: 'session789',
      };

      // Act
      await logout(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('maiml_session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
    });
  });

  describe('Admin監査ログ', () => {
    test('Data Adminロールは監査ログが記録されない', async () => {
      // Arrange
      mockRequest.user = {
        userId: 'dataadmin123',
        organizationId: 'org456',
        role: 'data_admin',
        sessionId: 'session789',
      };

      // Act
      await logout(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockQuery).not.toHaveBeenCalled();
    });

    test('Experiment Adminロールは監査ログが記録されない', async () => {
      // Arrange
      mockRequest.user = {
        userId: 'expadmin123',
        organizationId: 'org456',
        role: 'experiment_admin',
        sessionId: 'session789',
      };

      // Act
      await logout(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockQuery).not.toHaveBeenCalled();
    });

    test('MI Engineerロールは監査ログが記録されない', async () => {
      // Arrange
      mockRequest.user = {
        userId: 'miengineer123',
        organizationId: 'org456',
        role: 'mi_engineer',
        sessionId: 'session789',
      };

      // Act
      await logout(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });
});

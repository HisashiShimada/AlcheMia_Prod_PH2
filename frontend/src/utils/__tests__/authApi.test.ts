/**
 * authApi のユニットテスト
 */

import axios from 'axios';
import {
  login,
  verifyPin,
  resendPin,
  resetPasswordRequest,
  resetPassword,
  logout,
} from '../authApi';
import type {
  LoginResponse,
  VerifyPINResponse,
  ResendPINResponse,
  MessageResponse,
} from '../../types/auth';

// axiosをモック化
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('authApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    test('成功時: LoginResponseを返す', async () => {
      const mockResponse: LoginResponse = {
        sessionToken: 'temp_session_abc123_1735185000',
        message: 'PINコードをメールに送信しました',
        email: 'use***@example.com',
        expiresIn: 300,
      };

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockResponse,
        },
      });

      const result = await login('user001', 'password123', 'org_001');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        {
          username: 'user001',
          password: 'password123',
        },
        {
          headers: {
            'X-Organization-Id': 'org_001',
          },
          timeout: 30000,
        }
      );
      expect(result).toEqual(mockResponse);
    });

    test('エラー時: エラーメッセージを含む例外を投げる', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            success: false,
            error: {
              code: 'AUTH_INVALID_CREDENTIALS',
              message: 'ユーザー名またはパスワードが正しくありません',
            },
          },
        },
      });

      await expect(
        login('user001', 'wrongpassword', 'org_001')
      ).rejects.toThrow('ユーザー名またはパスワードが正しくありません');
    });

    test('タイムアウトエラー時: 適切なエラーメッセージを投げる', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      });

      await expect(
        login('user001', 'password123', 'org_001')
      ).rejects.toThrow();
    });
  });

  describe('verifyPin', () => {
    test('成功時: VerifyPINResponseを返す', async () => {
      const mockResponse: VerifyPINResponse = {
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          username: 'user001',
          email: 'user001@example.com',
          role: 'experiment_admin',
          organizationId: 'org_maiml_lab_001',
          organizationName: 'MAIML研究室',
          displayName: '山田 太郎',
        },
        session: {
          token: 'maiml_session-abc123_1735185000',
          expiresAt: '2025-12-27T10:30:00.000Z',
        },
        redirectUrl: '/experiment-admin',
      };

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockResponse,
        },
      });

      const result = await verifyPin(
        '123456',
        'temp_session_abc123',
        'org_001'
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/v1/auth/verify-pin',
        {
          pinCode: '123456',
        },
        {
          headers: {
            Authorization: 'Bearer temp_session_abc123',
            'X-Organization-Id': 'org_001',
          },
          timeout: 30000,
        }
      );
      expect(result).toEqual(mockResponse);
    });

    test('PINコード不正時: エラーメッセージを投げる', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            success: false,
            error: {
              code: 'AUTH_PIN_INVALID',
              message: 'PINコードが正しくありません',
            },
          },
        },
      });

      await expect(
        verifyPin('000000', 'temp_session_abc123', 'org_001')
      ).rejects.toThrow('PINコードが正しくありません');
    });
  });

  describe('resendPin', () => {
    test('成功時: ResendPINResponseを返す', async () => {
      const mockResponse: ResendPINResponse = {
        message: 'PINコードを再送信しました',
        email: 'use***@example.com',
        expiresIn: 300,
      };

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockResponse,
        },
      });

      const result = await resendPin('temp_session_abc123', 'org_001');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/v1/auth/resend-pin',
        {},
        {
          headers: {
            Authorization: 'Bearer temp_session_abc123',
            'X-Organization-Id': 'org_001',
          },
          timeout: 30000,
        }
      );
      expect(result).toEqual(mockResponse);
    });

    test('レート制限超過時: エラーメッセージを投げる', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            success: false,
            error: {
              code: 'AUTH_RESEND_LIMIT_EXCEEDED',
              message: 'PINコード再送信回数が上限に達しました',
            },
          },
        },
      });

      await expect(
        resendPin('temp_session_abc123', 'org_001')
      ).rejects.toThrow('PINコード再送信回数が上限に達しました');
    });
  });

  describe('resetPasswordRequest', () => {
    test('成功時: MessageResponseを返す', async () => {
      const mockResponse: MessageResponse = {
        message: 'パスワードリセット用のリンクをメールに送信しました',
      };

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockResponse,
        },
      });

      const result = await resetPasswordRequest('user001', 'org_001');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/v1/auth/reset-password-request',
        {
          username: 'user001',
        },
        {
          headers: {
            'X-Organization-Id': 'org_001',
          },
          timeout: 30000,
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('resetPassword', () => {
    test('成功時: MessageResponseを返す', async () => {
      const mockResponse: MessageResponse = {
        message: 'パスワードを変更しました',
      };

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockResponse,
        },
      });

      const result = await resetPassword('reset_token_123', 'NewPassword123!');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/v1/auth/reset-password',
        {
          resetToken: 'reset_token_123',
          newPassword: 'NewPassword123!',
        },
        {
          timeout: 30000,
        }
      );
      expect(result).toEqual(mockResponse);
    });

    test('トークン無効時: エラーメッセージを投げる', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            success: false,
            error: {
              code: 'AUTH_RESET_TOKEN_INVALID',
              message: 'リセットトークンが無効です',
            },
          },
        },
      });

      await expect(
        resetPassword('invalid_token', 'NewPassword123!')
      ).rejects.toThrow();
    });
  });

  describe('logout', () => {
    test('成功時: MessageResponseを返す', async () => {
      const mockResponse: MessageResponse = {
        message: 'ログアウトしました',
      };

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockResponse,
        },
      });

      const result = await logout('maiml_session-abc123', 'org_001');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/v1/auth/logout',
        {},
        {
          headers: {
            Authorization: 'Bearer maiml_session-abc123',
            'X-Organization-Id': 'org_001',
          },
          timeout: 30000,
        }
      );
      expect(result).toEqual(mockResponse);
    });

    test('トークン無効時: エラーメッセージを投げる', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            success: false,
            error: {
              code: 'AUTH_TOKEN_INVALID',
              message: 'セッショントークンが無効です',
            },
          },
        },
      });

      await expect(
        logout('invalid_token', 'org_001')
      ).rejects.toThrow('セッショントークンが無効です');
    });
  });
});

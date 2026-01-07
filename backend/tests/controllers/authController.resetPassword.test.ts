/**
 * authController.resetPassword のユニットテスト
 * 
 * Task 6.2: パスワードリセット実行エンドポイントの実装
 * Requirements: 6.1, 6.2
 */

import type { Request, Response } from 'express';
import { resetPassword } from '../../src/controllers/authController';
import { getPool } from '../../src/database/db';
import { createPasswordService } from '../../src/services/passwordService';
import type { Pool } from 'pg';

// モック設定
jest.mock('../../src/database/db');
jest.mock('../../src/services/passwordService');

describe('authController.resetPassword', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockPool: jest.Mocked<Pool>;
  let mockPasswordService: any;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // リクエストモック
    mockRequest = {
      body: {},
      headers: {},
    };

    // レスポンスモック
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    // プールモック
    mockPool = {
      query: jest.fn(),
    } as any;
    (getPool as jest.Mock).mockReturnValue(mockPool);

    // passwordServiceモック
    mockPasswordService = {
      hash: jest.fn(),
      update: jest.fn(),
    };
    (createPasswordService as jest.Mock).mockReturnValue(mockPasswordService);

    jest.clearAllMocks();
  });

  describe('成功シナリオ', () => {
    it('有効なリセットトークンでパスワードをリセットできる', async () => {
      // Arrange
      const resetToken = 'reset_123e4567-e89b-12d3-a456-426614174000_1704441600000';
      const newPassword = 'NewP@ssw0rd123';

      mockRequest.body = {
        resetToken,
        newPassword,
      };

      // リセットトークンの検証結果（有効）
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user-123',
            organization_id: 'org-456',
            role: 'manager',
            expires_at: new Date(Date.now() + 30 * 60 * 1000), // 30分後
            is_used: false,
          },
        ],
        rowCount: 1,
      });

      // パスワードハッシュ化成功
      mockPasswordService.hash.mockResolvedValue({
        success: true,
        data: '$2b$12$hashedPassword',
      });

      // パスワード更新成功
      mockPasswordService.update.mockResolvedValue({
        success: true,
        data: undefined,
      });

      // リセットトークン削除成功
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
      });

      // Act
      await resetPassword(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Password has been successfully reset',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });

      // リセットトークン検証クエリ
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [resetToken]
      );

      // パスワードハッシュ化
      expect(mockPasswordService.hash).toHaveBeenCalledWith(newPassword, 'manager');

      // パスワード更新
      expect(mockPasswordService.update).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        '$2b$12$hashedPassword'
      );

      // リセットトークン削除
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        [resetToken]
      );
    });
  });

  describe('バリデーションエラー', () => {
    it('resetTokenが空の場合、400エラーを返す', async () => {
      // Arrange
      mockRequest.body = {
        resetToken: '',
        newPassword: 'NewP@ssw0rd123',
      };

      // Act
      await resetPassword(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Reset token is required',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
    });

    it('newPasswordが空の場合、400エラーを返す', async () => {
      // Arrange
      mockRequest.body = {
        resetToken: 'reset_123e4567-e89b-12d3-a456-426614174000_1704441600000',
        newPassword: '',
      };

      // Act
      await resetPassword(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'New password is required',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
    });

    it('newPasswordが8文字未満の場合、400エラーを返す', async () => {
      // Arrange
      mockRequest.body = {
        resetToken: 'reset_123e4567-e89b-12d3-a456-426614174000_1704441600000',
        newPassword: 'Short1!',
      };

      // Act
      await resetPassword(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
    });
  });

  describe('リセットトークンエラー', () => {
    it('無効なリセットトークンの場合、400エラーを返す', async () => {
      // Arrange
      const resetToken = 'reset_123e4567-e89b-12d3-a456-426614174000_1704441600000';
      const newPassword = 'NewP@ssw0rd123';

      mockRequest.body = {
        resetToken,
        newPassword,
      };

      // リセットトークンが見つからない
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      // Act
      await resetPassword(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_RESET_TOKEN_INVALID',
          message: 'Invalid or expired reset token',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
    });

    it('期限切れリセットトークンの場合、400エラーを返す', async () => {
      // Arrange
      const resetToken = 'reset_123e4567-e89b-12d3-a456-426614174000_1704441600000';
      const newPassword = 'NewP@ssw0rd123';

      mockRequest.body = {
        resetToken,
        newPassword,
      };

      // リセットトークンは存在するが期限切れ
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user-123',
            organization_id: 'org-456',
            role: 'manager',
            expires_at: new Date(Date.now() - 10 * 60 * 1000), // 10分前（期限切れ）
            is_used: false,
          },
        ],
        rowCount: 1,
      });

      // Act
      await resetPassword(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_RESET_TOKEN_EXPIRED',
          message: 'Reset token has expired',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
    });

    it('使用済みリセットトークンの場合、400エラーを返す', async () => {
      // Arrange
      const resetToken = 'reset_123e4567-e89b-12d3-a456-426614174000_1704441600000';
      const newPassword = 'NewP@ssw0rd123';

      mockRequest.body = {
        resetToken,
        newPassword,
      };

      // リセットトークンは存在するが既に使用済み
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user-123',
            organization_id: 'org-456',
            role: 'manager',
            expires_at: new Date(Date.now() + 30 * 60 * 1000), // 30分後
            is_used: true, // 使用済み
          },
        ],
        rowCount: 1,
      });

      // Act
      await resetPassword(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_RESET_TOKEN_USED',
          message: 'Reset token has already been used',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
    });
  });

  describe('パスワードサービスエラー', () => {
    it('パスワードハッシュ化に失敗した場合、500エラーを返す', async () => {
      // Arrange
      const resetToken = 'reset_123e4567-e89b-12d3-a456-426614174000_1704441600000';
      const newPassword = 'NewP@ssw0rd123';

      mockRequest.body = {
        resetToken,
        newPassword,
      };

      // リセットトークン検証成功
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user-123',
            organization_id: 'org-456',
            role: 'manager',
            expires_at: new Date(Date.now() + 30 * 60 * 1000),
            is_used: false,
          },
        ],
        rowCount: 1,
      });

      // パスワードハッシュ化失敗
      mockPasswordService.hash.mockResolvedValue({
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'Failed to hash password',
        },
      });

      // Act
      await resetPassword(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'Failed to hash password',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
    });

    it('パスワード更新に失敗した場合、500エラーを返す', async () => {
      // Arrange
      const resetToken = 'reset_123e4567-e89b-12d3-a456-426614174000_1704441600000';
      const newPassword = 'NewP@ssw0rd123';

      mockRequest.body = {
        resetToken,
        newPassword,
      };

      // リセットトークン検証成功
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user-123',
            organization_id: 'org-456',
            role: 'manager',
            expires_at: new Date(Date.now() + 30 * 60 * 1000),
            is_used: false,
          },
        ],
        rowCount: 1,
      });

      // パスワードハッシュ化成功
      mockPasswordService.hash.mockResolvedValue({
        success: true,
        data: '$2b$12$hashedPassword',
      });

      // パスワード更新失敗
      mockPasswordService.update.mockResolvedValue({
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'Failed to update password',
        },
      });

      // Act
      await resetPassword(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'Failed to update password',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
    });
  });

  describe('データベースエラー', () => {
    it('リセットトークン検証時のDB接続エラーの場合、500エラーを返す', async () => {
      // Arrange
      mockRequest.body = {
        resetToken: 'reset_123e4567-e89b-12d3-a456-426614174000_1704441600000',
        newPassword: 'NewP@ssw0rd123',
      };

      // DB接続エラー
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      // Act
      await resetPassword(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SYSTEM_DATABASE_ERROR',
          message: 'Database error occurred',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
    });
  });
});

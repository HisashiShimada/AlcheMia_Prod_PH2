/**
 * 認証ミドルウェアのテスト
 * 
 * @description
 * JWT認証ミドルウェアのユニットテスト
 * - Authorizationヘッダーからトークン抽出
 * - JWTトークン検証
 * - req.userへのユーザー情報格納
 * - 認証失敗時の401エラー返却
 */

import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../src/middleware/authMiddleware';
import { JwtService } from '../../src/services/jwtService';
import { JwtPayload } from '../../src/types/auth';

// jwtServiceをモック化
jest.mock('../../src/services/jwtService');

describe('authMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockVerify: jest.Mock;

  beforeEach(() => {
    // リクエストオブジェクトのモック
    mockRequest = {
      headers: {},
      user: undefined
    };

    // レスポンスオブジェクトのモック
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // next関数のモック
    mockNext = jest.fn();

    // JwtService.verifyメソッドのモック
    mockVerify = jest.fn();
    (JwtService as jest.MockedClass<typeof JwtService>).mockImplementation(() => ({
      verify: mockVerify,
      generate: jest.fn(),
      decode: jest.fn()
    } as any));

    // モックをクリア
    jest.clearAllMocks();
  });

  describe('正常系', () => {
    test('有効なJWTトークンがあればreq.userに情報を格納してnextを呼ぶ', async () => {
      // Arrange
      const validToken = 'maiml_session-123_1234567890';
      const mockPayload: JwtPayload = {
        userId: 'user123',
        organizationId: 'org456',
        role: 'experiment_admin',
        sessionId: '123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockRequest.headers = {
        authorization: `Bearer ${validToken}`
      };

      // jwtService.verifyをモック
      mockVerify.mockResolvedValue({
        success: true,
        data: mockPayload
      });

      // Act
      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockVerify).toHaveBeenCalledWith(validToken);
      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    test('Bearer スキームなしでもトークンを抽出できる', async () => {
      // Arrange
      const validToken = 'maiml_session-123_1234567890';
      const mockPayload: JwtPayload = {
        userId: 'user123',
        organizationId: 'org456',
        role: 'system_admin',
        sessionId: '123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockRequest.headers = {
        authorization: validToken // Bearer なし
      };

      mockVerify.mockResolvedValue({
        success: true,
        data: mockPayload
      });

      // Act
      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockVerify).toHaveBeenCalledWith(validToken);
      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('異常系', () => {
    test('Authorizationヘッダーがない場合は401エラーを返す', async () => {
      // Arrange
      mockRequest.headers = {}; // Authorizationヘッダーなし

      // Act
      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_TOKEN_MISSING',
          message: '認証トークンが提供されていません'
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String)
        })
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('トークンが空文字の場合は401エラーを返す', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: ''
      };

      // Act
      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_TOKEN_MISSING',
          message: '認証トークンが提供されていません'
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String)
        })
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('トークン検証が失敗した場合は401エラーを返す', async () => {
      // Arrange
      const invalidToken = 'invalid_token';
      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`
      };

      mockVerify.mockResolvedValue({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'トークンが無効です'
        }
      });

      // Act
      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockVerify).toHaveBeenCalledWith(invalidToken);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'トークンが無効です'
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String)
        })
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('トークンの有効期限が切れている場合は401エラーを返す', async () => {
      // Arrange
      const expiredToken = 'maiml_session-123_1234567890';
      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`
      };

      mockVerify.mockResolvedValue({
        success: false,
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'トークンの有効期限が切れています'
        }
      });

      // Act
      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'トークンの有効期限が切れています'
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String)
        })
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('予期しないエラーが発生した場合は500エラーを返す', async () => {
      // Arrange
      const validToken = 'maiml_session-123_1234567890';
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`
      };

      mockVerify.mockRejectedValue(
        new Error('Unexpected error')
      );

      // Act
      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'システムエラーが発生しました'
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String)
        })
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Bearer スキーム処理', () => {
    test('Bearer スキームを正しく除去する', async () => {
      // Arrange
      const token = 'maiml_session-123_1234567890';
      const mockPayload: JwtPayload = {
        userId: 'user123',
        organizationId: 'org456',
        role: 'provider',
        sessionId: '123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      mockVerify.mockResolvedValue({
        success: true,
        data: mockPayload
      });

      // Act
      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockVerify).toHaveBeenCalledWith(token);
    });

    test('Bearer スキームの大文字小文字を区別しない', async () => {
      // Arrange
      const token = 'maiml_session-123_1234567890';
      const mockPayload: JwtPayload = {
        userId: 'user123',
        organizationId: 'org456',
        role: 'data_admin',
        sessionId: '123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockRequest.headers = {
        authorization: `bearer ${token}` // 小文字
      };

      mockVerify.mockResolvedValue({
        success: true,
        data: mockPayload
      });

      // Act
      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockVerify).toHaveBeenCalledWith(token);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });
});

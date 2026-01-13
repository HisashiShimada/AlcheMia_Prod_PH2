import { Request, Response, NextFunction } from 'express';
import { rateLimitMiddleware, RateLimitConfig } from '../../src/middleware/rateLimitMiddleware';

// モックDB接続
jest.mock('../../src/database/db', () => ({
  getPool: jest.fn(),
}));

const { getPool } = require('../../src/database/db');

describe('rateLimitMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockPool: { query: jest.Mock };

  beforeEach(() => {
    // モックリクエスト
    mockRequest = {
      body: {},
      headers: {},
      ip: '192.168.1.1',
    };

    // モックレスポンス
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };

    // モックNext
    mockNext = jest.fn();

    // モックDB
    mockPool = {
      query: jest.fn(),
    };
    getPool.mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ログインエンドポイントのレート制限', () => {
    const loginConfig: RateLimitConfig = {
      windowMs: 15 * 60 * 1000, // 15分
      maxAttempts: 5,
      keyGenerator: (req) => `${req.headers['x-organization-id']}-${req.body.username}`,
      errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'ログイン試行回数が上限に達しました。15分後に再試行してください。',
    };

    test('失敗回数が制限以下の場合、nextを呼び出す', async () => {
      mockRequest.headers = { 'x-organization-id': 'org-123' };
      mockRequest.body = { username: 'testuser', password: 'password123' };

      // login_historyから4回の失敗履歴を返す
      mockPool.query.mockResolvedValue({
        rows: [{ count: '4' }],
      });

      const middleware = rateLimitMiddleware(loginConfig);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test('失敗回数が制限を超えた場合、429エラーを返す', async () => {
      mockRequest.headers = { 'x-organization-id': 'org-123' };
      mockRequest.body = { username: 'testuser', password: 'password123' };

      // login_historyから5回の失敗履歴を返す（制限に達している）
      mockPool.query.mockResolvedValue({
        rows: [{ count: '5' }],
      });

      const middleware = rateLimitMiddleware(loginConfig);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          message: 'ログイン試行回数が上限に達しました。15分後に再試行してください。',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: expect.any(String),
        }),
      });
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', '900'); // 15分 = 900秒
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('組織IDが異なる場合、別のキーでカウントする', async () => {
      mockRequest.headers = { 'x-organization-id': 'org-456' };
      mockRequest.body = { username: 'testuser', password: 'password123' };

      mockPool.query.mockResolvedValue({
        rows: [{ count: '0' }],
      });

      const middleware = rateLimitMiddleware(loginConfig);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('org-456'),
        expect.any(Array)
      );
    });

    test('データベースエラーの場合、nextにエラーを渡す', async () => {
      mockRequest.headers = { 'x-organization-id': 'org-123' };
      mockRequest.body = { username: 'testuser', password: 'password123' };

      const dbError = new Error('Database connection error');
      mockPool.query.mockRejectedValue(dbError);

      const middleware = rateLimitMiddleware(loginConfig);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dbError);
    });
  });

  describe('PINコード検証エンドポイントのレート制限', () => {
    const pinConfig: RateLimitConfig = {
      windowMs: 5 * 60 * 1000, // 5分
      maxAttempts: 3,
      keyGenerator: (req) => req.headers.authorization?.replace('Bearer ', '') || '',
      errorCode: 'AUTH_PIN_MAX_ATTEMPTS',
      message: 'PIN検証の試行回数が上限に達しました。再度ログインしてください。',
      useTable: 'pin_codes',
      attemptsColumn: 'attempts_count',
    };

    test('試行回数が制限以下の場合、nextを呼び出す', async () => {
      mockRequest.headers = { authorization: 'Bearer temp_session_123' };
      mockRequest.body = { pinCode: '123456' };

      // pin_codesテーブルから2回の試行履歴を返す
      mockPool.query.mockResolvedValue({
        rows: [{ attempts_count: 2 }],
      });

      const middleware = rateLimitMiddleware(pinConfig);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test('試行回数が制限を超えた場合、429エラーを返す', async () => {
      mockRequest.headers = { authorization: 'Bearer temp_session_123' };
      mockRequest.body = { pinCode: '123456' };

      // pin_codesテーブルから3回の試行履歴を返す（制限に達している）
      mockPool.query.mockResolvedValue({
        rows: [{ attempts_count: 3 }],
      });

      const middleware = rateLimitMiddleware(pinConfig);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_PIN_MAX_ATTEMPTS',
          message: 'PIN検証の試行回数が上限に達しました。再度ログインしてください。',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: expect.any(String),
        }),
      });
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', '300'); // 5分 = 300秒
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('PINコードレコードが存在しない場合、nextを呼び出す', async () => {
      mockRequest.headers = { authorization: 'Bearer temp_session_123' };
      mockRequest.body = { pinCode: '123456' };

      mockPool.query.mockResolvedValue({
        rows: [],
      });

      const middleware = rateLimitMiddleware(pinConfig);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('PINコード再送信エンドポイントのレート制限', () => {
    const resendConfig: RateLimitConfig = {
      windowMs: 15 * 60 * 1000, // 15分
      maxAttempts: 3,
      keyGenerator: (req) => req.headers.authorization?.replace('Bearer ', '') || '',
      errorCode: 'AUTH_RESEND_LIMIT_EXCEEDED',
      message: 'PIN再送信の回数が上限に達しました。15分後に再試行してください。',
      useTable: 'pin_codes',
      countColumn: 'created_at',
    };

    test('再送信回数が制限以下の場合、nextを呼び出す', async () => {
      mockRequest.headers = { authorization: 'Bearer temp_session_123' };

      mockPool.query.mockResolvedValue({
        rows: [{ count: '2' }],
      });

      const middleware = rateLimitMiddleware(resendConfig);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('再送信回数が制限を超えた場合、429エラーを返す', async () => {
      mockRequest.headers = { authorization: 'Bearer temp_session_123' };

      mockPool.query.mockResolvedValue({
        rows: [{ count: '3' }],
      });

      const middleware = rateLimitMiddleware(resendConfig);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_RESEND_LIMIT_EXCEEDED',
          message: 'PIN再送信の回数が上限に達しました。15分後に再試行してください。',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: expect.any(String),
        }),
      });
    });
  });

  describe('パスワードリセット要求エンドポイントのレート制限', () => {
    const resetConfig: RateLimitConfig = {
      windowMs: 15 * 60 * 1000, // 15分
      maxAttempts: 3,
      keyGenerator: (req) => req.headers['x-organization-id'] as string || '',
      errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'パスワードリセット要求の回数が上限に達しました。15分後に再試行してください。',
    };

    test('要求回数が制限以下の場合、nextを呼び出す', async () => {
      mockRequest.headers = { 'x-organization-id': 'org-123' };
      mockRequest.body = { username: 'testuser' };

      mockPool.query.mockResolvedValue({
        rows: [{ count: '2' }],
      });

      const middleware = rateLimitMiddleware(resetConfig);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('要求回数が制限を超えた場合、429エラーを返す', async () => {
      mockRequest.headers = { 'x-organization-id': 'org-123' };
      mockRequest.body = { username: 'testuser' };

      mockPool.query.mockResolvedValue({
        rows: [{ count: '3' }],
      });

      const middleware = rateLimitMiddleware(resetConfig);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          message: 'パスワードリセット要求の回数が上限に達しました。15分後に再試行してください。',
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: expect.any(String),
        }),
      });
    });
  });

  describe('キー生成', () => {
    test('組織ID + ユーザー名でキーを生成', () => {
      const config: RateLimitConfig = {
        windowMs: 15 * 60 * 1000,
        maxAttempts: 5,
        keyGenerator: (req) => `${req.headers['x-organization-id']}-${req.body.username}`,
        errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
      };

      mockRequest.headers = { 'x-organization-id': 'org-123' };
      mockRequest.body = { username: 'testuser' };

      const key = config.keyGenerator(mockRequest as Request);
      expect(key).toBe('org-123-testuser');
    });

    test('セッショントークンでキーを生成', () => {
      const config: RateLimitConfig = {
        windowMs: 5 * 60 * 1000,
        maxAttempts: 3,
        keyGenerator: (req) => req.headers.authorization?.replace('Bearer ', '') || '',
        errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
      };

      mockRequest.headers = { authorization: 'Bearer temp_session_123' };

      const key = config.keyGenerator(mockRequest as Request);
      expect(key).toBe('temp_session_123');
    });
  });
});

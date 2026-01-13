import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../src/middleware/errorHandlerMiddleware';

describe('errorHandlerMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      headers: {},
      path: '/api/v1/auth/login',
      method: 'POST',
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();

    // Clear console.error mock
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('統一エラーレスポンス形式', () => {
    it('should return unified error response format', () => {
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
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
    });

    it('should include error code, message, and optional details', () => {
      const error = new Error('Validation error');
      (error as any).statusCode = 400;
      (error as any).code = 'VALIDATION_ERROR';
      (error as any).details = [{ field: 'username', message: 'Required' }];

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation error',
            details: [{ field: 'username', message: 'Required' }],
          },
        })
      );
    });
  });

  describe('HTTPステータスコードマッピング', () => {
    it('should use 500 for generic errors without statusCode', () => {
      const error = new Error('Generic error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should use custom statusCode from error object', () => {
      const error = new Error('Not found');
      (error as any).statusCode = 404;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should handle 400 Bad Request errors', () => {
      const error = new Error('Bad request');
      (error as any).statusCode = 400;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should handle 401 Unauthorized errors', () => {
      const error = new Error('Unauthorized');
      (error as any).statusCode = 401;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle 403 Forbidden errors', () => {
      const error = new Error('Forbidden');
      (error as any).statusCode = 403;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should handle 429 Too Many Requests errors', () => {
      const error = new Error('Rate limit exceeded');
      (error as any).statusCode = 429;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(429);
    });
  });

  describe('エラーコード体系', () => {
    it('should handle AUTH_* error codes', () => {
      const error = new Error('Invalid credentials');
      (error as any).statusCode = 401;
      (error as any).code = 'AUTH_INVALID_CREDENTIALS';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'AUTH_INVALID_CREDENTIALS',
          }),
        })
      );
    });

    it('should handle VALIDATION_* error codes', () => {
      const error = new Error('Validation failed');
      (error as any).statusCode = 400;
      (error as any).code = 'VALIDATION_ERROR';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    it('should handle SYSTEM_* error codes', () => {
      const error = new Error('Database error');
      (error as any).statusCode = 500;
      (error as any).code = 'SYSTEM_DATABASE_ERROR';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'SYSTEM_DATABASE_ERROR',
          }),
        })
      );
    });

    it('should use SYSTEM_INTERNAL_ERROR as default code', () => {
      const error = new Error('Unknown error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'SYSTEM_INTERNAL_ERROR',
          }),
        })
      );
    });
  });

  describe('スタックトレース記録', () => {
    it('should log error details to console.error', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.objectContaining({
          message: 'Test error',
          stack: expect.any(String),
        })
      );
    });

    it('should not include stack trace in response', () => {
      const error = new Error('Test error');
      error.stack = 'Sensitive stack trace information';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const responseData = jsonMock.mock.calls[0][0];
      expect(responseData.error).not.toHaveProperty('stack');
      expect(JSON.stringify(responseData)).not.toContain('Sensitive stack trace');
    });
  });

  describe('ユーザーフレンドリーなエラーメッセージ', () => {
    it('should use generic message for 500 errors', () => {
      const error = new Error('Detailed technical error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const responseData = jsonMock.mock.calls[0][0];
      expect(responseData.error.message).toBe('システムエラーが発生しました');
    });

    it('should preserve custom message for non-500 errors', () => {
      const error = new Error('ユーザー名またはパスワードが正しくありません');
      (error as any).statusCode = 401;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const responseData = jsonMock.mock.calls[0][0];
      expect(responseData.error.message).toBe('ユーザー名またはパスワードが正しくありません');
    });

    it('should handle validation errors with details', () => {
      const error = new Error('バリデーションエラー');
      (error as any).statusCode = 400;
      (error as any).code = 'VALIDATION_ERROR';
      (error as any).details = [
        { field: 'username', message: 'ユーザー名は必須です' },
        { field: 'password', message: 'パスワードは8文字以上必要です' },
      ];

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const responseData = jsonMock.mock.calls[0][0];
      expect(responseData.error.details).toHaveLength(2);
      expect(responseData.error.details[0]).toEqual({
        field: 'username',
        message: 'ユーザー名は必須です',
      });
    });
  });

  describe('メタ情報', () => {
    it('should include timestamp in ISO format', () => {
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const responseData = jsonMock.mock.calls[0][0];
      expect(responseData.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should generate requestId if not present', () => {
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const responseData = jsonMock.mock.calls[0][0];
      expect(responseData.meta.requestId).toMatch(/^req_[a-f0-9]+$/);
    });

    it('should use existing X-Request-Id header if present', () => {
      const error = new Error('Test error');
      mockRequest.headers = { 'x-request-id': 'req_existing123' };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const responseData = jsonMock.mock.calls[0][0];
      expect(responseData.meta.requestId).toBe('req_existing123');
    });
  });

  describe('エッジケース', () => {
    it('should handle non-Error objects', () => {
      const error = 'String error';

      errorHandler(error as any, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'システムエラーが発生しました',
          }),
        })
      );
    });

    it('should handle errors with null values', () => {
      const error = new Error();
      (error as any).message = null;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalled();
    });

    it('should handle errors without details array', () => {
      const error = new Error('Error without details');
      (error as any).statusCode = 400;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const responseData = jsonMock.mock.calls[0][0];
      expect(responseData.error).not.toHaveProperty('details');
    });
  });
});

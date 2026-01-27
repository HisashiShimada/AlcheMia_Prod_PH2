/**
 * エラークラスのテスト
 * 
 * タスク1.2: エラークラスとエラーハンドリング機能の実装
 * Requirements: 7 (エラーハンドリングとレスポンス)
 */

import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  StorageError,
  formatErrorResponse,
  getHttpStatusFromError,
} from '../../src/utils/errorClasses';

describe('Error Classes', () => {
  describe('ValidationError', () => {
    it('正しいプロパティを持つ', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('詳細情報を持つことができる', () => {
      const details = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'age', message: 'Must be 18 or older' },
      ];
      const error = new ValidationError('Validation failed', details);
      
      expect(error.details).toEqual(details);
    });

    it('Error クラスを継承している', () => {
      const error = new ValidationError('Test');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('AuthenticationError', () => {
    it('正しいプロパティを持つ', () => {
      const error = new AuthenticationError('Token expired');
      
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Token expired');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('デフォルトメッセージを持つ', () => {
      const error = new AuthenticationError();
      
      expect(error.message).toBe('Authentication failed');
    });
  });

  describe('AuthorizationError', () => {
    it('正しいプロパティを持つ', () => {
      const error = new AuthorizationError('Access denied');
      
      expect(error.name).toBe('AuthorizationError');
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('デフォルトメッセージを持つ', () => {
      const error = new AuthorizationError();
      
      expect(error.message).toBe('Insufficient permissions');
    });
  });

  describe('NotFoundError', () => {
    it('正しいプロパティを持つ', () => {
      const error = new NotFoundError('File not found');
      
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('File not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('デフォルトメッセージを持つ', () => {
      const error = new NotFoundError();
      
      expect(error.message).toBe('Resource not found');
    });

    it('リソースタイプを指定できる', () => {
      const error = new NotFoundError('Project not found', 'Project');
      
      expect(error.resourceType).toBe('Project');
    });
  });

  describe('StorageError', () => {
    it('正しいプロパティを持つ', () => {
      const error = new StorageError('S3 connection failed');
      
      expect(error.name).toBe('StorageError');
      expect(error.message).toBe('S3 connection failed');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('STORAGE_ERROR');
    });

    it('元のエラーを保持できる', () => {
      const originalError = new Error('Network timeout');
      const error = new StorageError('Storage operation failed', originalError);
      
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('formatErrorResponse', () => {
    it('ValidationError を正しくフォーマットする', () => {
      const details = [{ field: 'email', message: 'Required' }];
      const error = new ValidationError('Validation failed', details);
      const response = formatErrorResponse(error, 'req_123');
      
      expect(response).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: details,
        },
        meta: {
          timestamp: expect.any(String),
          requestId: 'req_123',
        },
      });
    });

    it('AuthenticationError を正しくフォーマットする', () => {
      const error = new AuthenticationError('Invalid token');
      const response = formatErrorResponse(error, 'req_456');
      
      expect(response).toEqual({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid token',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: 'req_456',
        },
      });
    });

    it('NotFoundError を正しくフォーマットする', () => {
      const error = new NotFoundError('File not found', 'File');
      const response = formatErrorResponse(error, 'req_789');
      
      expect(response.error).toMatchObject({
        code: 'NOT_FOUND',
        message: 'File not found',
      });
    });

    it('一般的な Error を正しくフォーマットする', () => {
      const error = new Error('Unexpected error');
      const response = formatErrorResponse(error, 'req_000');
      
      expect(response).toEqual({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Unexpected error',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: 'req_000',
        },
      });
    });

    it('タイムスタンプが ISO 8601 形式である', () => {
      const error = new ValidationError('Test');
      const response = formatErrorResponse(error);
      
      const timestamp = response.meta.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('requestId が省略可能である', () => {
      const error = new ValidationError('Test');
      const response = formatErrorResponse(error);
      
      expect(response.meta.requestId).toBeUndefined();
    });
  });

  describe('getHttpStatusFromError', () => {
    it('ValidationError から 400 を返す', () => {
      const error = new ValidationError('Invalid');
      expect(getHttpStatusFromError(error)).toBe(400);
    });

    it('AuthenticationError から 401 を返す', () => {
      const error = new AuthenticationError();
      expect(getHttpStatusFromError(error)).toBe(401);
    });

    it('AuthorizationError から 403 を返す', () => {
      const error = new AuthorizationError();
      expect(getHttpStatusFromError(error)).toBe(403);
    });

    it('NotFoundError から 404 を返す', () => {
      const error = new NotFoundError();
      expect(getHttpStatusFromError(error)).toBe(404);
    });

    it('StorageError から 500 を返す', () => {
      const error = new StorageError('Failed');
      expect(getHttpStatusFromError(error)).toBe(500);
    });

    it('一般的な Error から 500 を返す', () => {
      const error = new Error('Unknown');
      expect(getHttpStatusFromError(error)).toBe(500);
    });

    it('statusCode プロパティを持つエラーから適切なコードを返す', () => {
      const error: any = new Error('Custom');
      error.statusCode = 418;
      expect(getHttpStatusFromError(error)).toBe(418);
    });
  });
});

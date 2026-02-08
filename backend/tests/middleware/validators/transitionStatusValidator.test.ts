/**
 * TransitionStatusValidator Unit Tests
 * 
 * トランジションステータス更新バリデーターのユニットテスト
 */

import { Request, Response, NextFunction } from 'express';
import { updateStatusValidator } from '../../../src/middleware/validators/transitionStatusValidator';

describe('TransitionStatusValidator', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // レスポンスのモック
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('statusフィールドの検証', () => {
    test('正常系: 許可されたstatus値（initial）でバリデーションが成功する', async () => {
      // Arrange
      mockRequest = {
        body: {
          status: 'initial',
          comment: 'Test comment',
        },
      };

      // Act
      for (const validator of updateStatusValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(400);
    });

    test('正常系: 許可されたstatus値（preparing）でバリデーションが成功する', async () => {
      // Arrange
      mockRequest = {
        body: {
          status: 'preparing',
        },
      };

      // Act
      for (const validator of updateStatusValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(400);
    });

    test('正常系: 許可されたstatus値（ready）でバリデーションが成功する', async () => {
      // Arrange
      mockRequest = {
        body: {
          status: 'ready',
        },
      };

      // Act
      for (const validator of updateStatusValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(400);
    });

    test('正常系: 許可されたstatus値（running）でバリデーションが成功する', async () => {
      // Arrange
      mockRequest = {
        body: {
          status: 'running',
        },
      };

      // Act
      for (const validator of updateStatusValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(400);
    });

    test('正常系: 許可されたstatus値（completed）でバリデーションが成功する', async () => {
      // Arrange
      mockRequest = {
        body: {
          status: 'completed',
        },
      };

      // Act
      for (const validator of updateStatusValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(400);
    });

    test('異常系: 不正なstatus値でバリデーションが失敗する', async () => {
      // Arrange
      mockRequest = {
        body: {
          status: 'invalid_status',
        },
      };

      // Act
      for (const validator of updateStatusValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalled();
      
      const errorResponse = jsonMock.mock.calls[0][0];
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe('VALIDATION_ERROR');
      expect(errorResponse.error.details).toBeDefined();
    });

    test('異常系: statusフィールドが空の場合、バリデーションが失敗する', async () => {
      // Arrange
      mockRequest = {
        body: {
          status: '',
        },
      };

      // Act
      for (const validator of updateStatusValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalled();
    });

    test('異常系: statusフィールドが存在しない場合、バリデーションが失敗する', async () => {
      // Arrange
      mockRequest = {
        body: {},
      };

      // Act
      for (const validator of updateStatusValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalled();
    });
  });

  describe('commentフィールドの検証', () => {
    test('正常系: commentがnullまたはundefinedの場合、バリデーションが成功する（オプショナル）', async () => {
      // Arrange
      mockRequest = {
        body: {
          status: 'running',
          comment: undefined,
        },
      };

      // Act
      for (const validator of updateStatusValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(400);
    });

    test('正常系: commentが空文字の場合、バリデーションが成功する', async () => {
      // Arrange
      mockRequest = {
        body: {
          status: 'running',
          comment: '',
        },
      };

      // Act
      for (const validator of updateStatusValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(400);
    });

    test('正常系: commentが2000文字以内の場合、バリデーションが成功する', async () => {
      // Arrange
      const validComment = 'a'.repeat(2000);
      mockRequest = {
        body: {
          status: 'running',
          comment: validComment,
        },
      };

      // Act
      for (const validator of updateStatusValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(400);
    });

    test('異常系: commentが2000文字を超える場合、バリデーションが失敗する', async () => {
      // Arrange
      const invalidComment = 'a'.repeat(2001);
      mockRequest = {
        body: {
          status: 'running',
          comment: invalidComment,
        },
      };

      // Act
      for (const validator of updateStatusValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalled();
      
      const errorResponse = jsonMock.mock.calls[0][0];
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe('VALIDATION_ERROR');
      expect(errorResponse.error.details).toBeDefined();
      expect(errorResponse.error.details.some((d: any) => d.field === 'comment')).toBe(true);
    });
  });

  describe('複合バリデーション', () => {
    test('正常系: statusとcommentの両方が正しい場合、バリデーションが成功する', async () => {
      // Arrange
      mockRequest = {
        body: {
          status: 'completed',
          comment: 'Task completed successfully',
        },
      };

      // Act
      for (const validator of updateStatusValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(400);
    });

    test('異常系: statusとcommentの両方が不正な場合、複数のエラーが返る', async () => {
      // Arrange
      const invalidComment = 'a'.repeat(2001);
      mockRequest = {
        body: {
          status: 'invalid_status',
          comment: invalidComment,
        },
      };

      // Act
      for (const validator of updateStatusValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalled();
      
      const errorResponse = jsonMock.mock.calls[0][0];
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe('VALIDATION_ERROR');
      expect(errorResponse.error.details.length).toBeGreaterThan(1);
    });
  });

  describe('エラーレスポンス形式', () => {
    test('バリデーションエラー時、統一されたApiResponse形式でエラーを返す', async () => {
      // Arrange
      mockRequest = {
        body: {
          status: 'invalid',
        },
      };

      // Act
      for (const validator of updateStatusValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalled();
      
      const errorResponse = jsonMock.mock.calls[0][0];
      expect(errorResponse).toHaveProperty('success');
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse.error).toHaveProperty('code');
      expect(errorResponse.error).toHaveProperty('message');
      expect(errorResponse.error).toHaveProperty('details');
      expect(Array.isArray(errorResponse.error.details)).toBe(true);
    });

    test('エラー詳細にfieldとmessageが含まれる', async () => {
      // Arrange
      mockRequest = {
        body: {
          status: '',
        },
      };

      // Act
      for (const validator of updateStatusValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      const errorResponse = jsonMock.mock.calls[0][0];
      expect(errorResponse.error.details[0]).toHaveProperty('field');
      expect(errorResponse.error.details[0]).toHaveProperty('message');
    });
  });

  describe('trim処理', () => {
    test('statusフィールドの前後の空白が除去される', async () => {
      // Arrange
      mockRequest = {
        body: {
          status: '  running  ',
        },
      };

      // Act
      for (const validator of updateStatusValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(400);
    });

    test('commentフィールドの前後の空白が除去される', async () => {
      // Arrange
      mockRequest = {
        body: {
          status: 'running',
          comment: '  Test comment  ',
        },
      };

      // Act
      for (const validator of updateStatusValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(400);
    });
  });
});
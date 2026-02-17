/**
 * permissionCheckMiddlewareのテスト
 * 
 * @description
 * checkPermission, checkPermissionPairs, checkAnyPermission関数のテスト
 */

import { Request, Response, NextFunction } from 'express';
import {
  checkPermission,
  checkPermissionPairs,
  checkAnyPermission,
  PermissionPair
} from '../../src/middleware/permissionCheckMiddleware';
import { JwtPayload, Permission } from '../../src/types/auth';

describe('permissionCheckMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    
    mockNext = jest.fn();
  });

  describe('checkPermission', () => {
    it('権限がある場合、next()を呼び出す', () => {
      // Arrange
      const permissions: Permission[] = [
        { functionId: '050000', permission: 1 }
      ];
      
      mockReq = {
        user: {
          userId: 'test-user-id',
          organizationId: 'test-org-id',
          sessionId: 'test-session-id',
          permissions,
          iat: 0,
          exp: 0
        } as JwtPayload
      };

      const middleware = checkPermission('050000', 1);

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('機能CDが存在しない場合、403エラーを返す', () => {
      // Arrange
      const permissions: Permission[] = [
        { functionId: '040000', permission: 1 }
      ];
      
      mockReq = {
        user: {
          userId: 'test-user-id',
          organizationId: 'test-org-id',
          sessionId: 'test-session-id',
          permissions,
          iat: 0,
          exp: 0
        } as JwtPayload
      };

      const middleware = checkPermission('050000', 1);

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'PERMISSION_DENIED',
            message: expect.stringContaining('050000')
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('権限レベルが不足している場合、403エラーを返す', () => {
      // Arrange
      const permissions: Permission[] = [
        { functionId: '050000', permission: 0 }
      ];
      
      mockReq = {
        user: {
          userId: 'test-user-id',
          organizationId: 'test-org-id',
          sessionId: 'test-session-id',
          permissions,
          iat: 0,
          exp: 0
        } as JwtPayload
      };

      const middleware = checkPermission('050000', 1);

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INSUFFICIENT_PERMISSION',
            message: expect.stringContaining('権限レベルが不足')
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('権限レベルが等しい場合、next()を呼び出す', () => {
      // Arrange
      const permissions: Permission[] = [
        { functionId: '050000', permission: 1 }
      ];
      
      mockReq = {
        user: {
          userId: 'test-user-id',
          organizationId: 'test-org-id',
          sessionId: 'test-session-id',
          permissions,
          iat: 0,
          exp: 0
        } as JwtPayload
      };

      const middleware = checkPermission('050000', 1);

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('権限レベルが上回っている場合、next()を呼び出す', () => {
      // Arrange
      const permissions: Permission[] = [
        { functionId: '050000', permission: 2 }
      ];
      
      mockReq = {
        user: {
          userId: 'test-user-id',
          organizationId: 'test-org-id',
          sessionId: 'test-session-id',
          permissions,
          iat: 0,
          exp: 0
        } as JwtPayload
      };

      const middleware = checkPermission('050000', 1);

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('checkPermissionPairs', () => {
    it('いずれかのペアにマッチする場合、next()を呼び出す（最初のペア）', () => {
      // Arrange
      const permissions: Permission[] = [
        { functionId: '050000', permission: 1 }
      ];
      
      mockReq = {
        user: {
          userId: 'test-user-id',
          organizationId: 'test-org-id',
          sessionId: 'test-session-id',
          permissions,
          iat: 0,
          exp: 0
        } as JwtPayload
      };

      const permissionPairs: PermissionPair[] = [
        { functionId: '050000', permission: 1 },
        { functionId: '040000', permission: 0 }
      ];

      const middleware = checkPermissionPairs(permissionPairs);

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('いずれかのペアにマッチする場合、next()を呼び出す（2番目のペア）', () => {
      // Arrange
      const permissions: Permission[] = [
        { functionId: '040000', permission: 0 }
      ];
      
      mockReq = {
        user: {
          userId: 'test-user-id',
          organizationId: 'test-org-id',
          sessionId: 'test-session-id',
          permissions,
          iat: 0,
          exp: 0
        } as JwtPayload
      };

      const permissionPairs: PermissionPair[] = [
        { functionId: '050000', permission: 1 },
        { functionId: '040000', permission: 0 }
      ];

      const middleware = checkPermissionPairs(permissionPairs);

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('どのペアにもマッチしない場合、403エラーを返す', () => {
      // Arrange
      const permissions: Permission[] = [
        { functionId: '030000', permission: 1 }
      ];
      
      mockReq = {
        user: {
          userId: 'test-user-id',
          organizationId: 'test-org-id',
          sessionId: 'test-session-id',
          permissions,
          iat: 0,
          exp: 0
        } as JwtPayload
      };

      const permissionPairs: PermissionPair[] = [
        { functionId: '050000', permission: 1 },
        { functionId: '040000', permission: 0 }
      ];

      const middleware = checkPermissionPairs(permissionPairs);

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'PERMISSION_DENIED',
            message: expect.stringContaining('050000')
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('機能CDは一致するが権限レベルが不足している場合、403エラーを返す', () => {
      // Arrange
      const permissions: Permission[] = [
        { functionId: '050000', permission: 0 }
      ];
      
      mockReq = {
        user: {
          userId: 'test-user-id',
          organizationId: 'test-org-id',
          sessionId: 'test-session-id',
          permissions,
          iat: 0,
          exp: 0
        } as JwtPayload
      };

      const permissionPairs: PermissionPair[] = [
        { functionId: '050000', permission: 1 },
        { functionId: '040000', permission: 1 }
      ];

      const middleware = checkPermissionPairs(permissionPairs);

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'PERMISSION_DENIED'
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('複数の権限を持つユーザーで、いずれかがマッチする場合、next()を呼び出す', () => {
      // Arrange
      const permissions: Permission[] = [
        { functionId: '030000', permission: 1 },
        { functionId: '040000', permission: 0 },
        { functionId: '060000', permission: 1 }
      ];
      
      mockReq = {
        user: {
          userId: 'test-user-id',
          organizationId: 'test-org-id',
          sessionId: 'test-session-id',
          permissions,
          iat: 0,
          exp: 0
        } as JwtPayload
      };

      const permissionPairs: PermissionPair[] = [
        { functionId: '050000', permission: 1 },
        { functionId: '040000', permission: 0 }
      ];

      const middleware = checkPermissionPairs(permissionPairs);

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('checkAnyPermission', () => {
    it('いずれかの機能CDに権限がある場合、next()を呼び出す', () => {
      // Arrange
      const permissions: Permission[] = [
        { functionId: '050000', permission: 1 }
      ];
      
      mockReq = {
        user: {
          userId: 'test-user-id',
          organizationId: 'test-org-id',
          sessionId: 'test-session-id',
          permissions,
          iat: 0,
          exp: 0
        } as JwtPayload
      };

      const middleware = checkAnyPermission(['040000', '050000'], 1);

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('どの機能CDにも権限がない場合、403エラーを返す', () => {
      // Arrange
      const permissions: Permission[] = [
        { functionId: '030000', permission: 1 }
      ];
      
      mockReq = {
        user: {
          userId: 'test-user-id',
          organizationId: 'test-org-id',
          sessionId: 'test-session-id',
          permissions,
          iat: 0,
          exp: 0
        } as JwtPayload
      };

      const middleware = checkAnyPermission(['040000', '050000'], 1);

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'PERMISSION_DENIED'
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('権限レベルが不足している場合、403エラーを返す', () => {
      // Arrange
      const permissions: Permission[] = [
        { functionId: '050000', permission: 0 }
      ];
      
      mockReq = {
        user: {
          userId: 'test-user-id',
          organizationId: 'test-org-id',
          sessionId: 'test-session-id',
          permissions,
          iat: 0,
          exp: 0
        } as JwtPayload
      };

      const middleware = checkAnyPermission(['040000', '050000'], 1);

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

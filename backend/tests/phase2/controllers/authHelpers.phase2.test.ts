/**
 * authHelpers フェーズ２ テスト
 *
 * 分類A：issueSessionTokens の動作確認
 * - organization_group_cds を JWT に含める処理（Phase2 変更箇所）
 * - JWTトークン生成失敗時の 500 レスポンス
 * - 成功時のレスポンス形式（organizationGroupCds フィールドの存在確認）
 */

import { Request, Response } from 'express';
import { issueSessionTokens } from '../../../src/controllers/authHelpers';
import { JwtService } from '../../../src/services/jwtService';
import { RefreshTokenService } from '../../../src/services/refreshTokenService';
import { RolePermissionRepository } from '../../../src/repositories/rolePermissionRepository';

jest.mock('../../../src/services/jwtService');
jest.mock('../../../src/services/refreshTokenService');
jest.mock('../../../src/repositories/rolePermissionRepository');

describe('authHelpers - Phase2 テスト', () => {
  let mockPool: { query: jest.Mock };
  let mockReq: Partial<Request>;
  let mockRes: {
    status: jest.Mock;
    json: jest.Mock;
    cookie: jest.Mock;
  };

  const baseUser = {
    user_id: 'user-001',
    user_name: 'テストユーザー',
    mail_address: 'test@example.com',
    role_cd: 'admin',
    organization_id: 'org-001',
    organization_group_cds: ['group-A', 'group-B'],
  };

  beforeEach(() => {
    mockPool = { query: jest.fn() };

    mockReq = {
      headers: { 'user-agent': 'test-agent' },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
    };

    // rolePermissionRepository のモック
    (RolePermissionRepository as jest.Mock).mockImplementation(() => ({
      getPermissionsByRoleId: jest.fn().mockResolvedValue(['read', 'write']),
    }));

    // refreshTokenService のモック
    (RefreshTokenService as jest.Mock).mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(undefined),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // issueSessionTokens
  // ==========================================================================
  describe('issueSessionTokens()', () => {
    test('正常系: organization_group_cds を含む JWT を発行し、200 レスポンスを返すこと', async () => {
      // pool.query のレスポンス設定（userInfo / role / auth の 3クエリ）
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            user_id: 'user-001',
            organization_display_name: 'テスト組織',
            corporation_id: 'corp-001',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{ initial_screen_function_cd: 'TOP', role_name: '管理者' }],
        })
        .mockResolvedValueOnce({
          rows: [{ is_temporary_flg: false }],
        });

      // JwtService のモック
      (JwtService as jest.Mock).mockImplementation(() => ({
        generateTokenPair: jest.fn().mockResolvedValue({
          success: true,
          data: { accessToken: 'access-token-xxx', refreshToken: 'refresh-token-xxx' },
        }),
        decode: jest.fn().mockReturnValue({ tokenId: 'token-id-xxx' }),
        getRefreshTokenMaxAge: jest.fn().mockReturnValue(1800000),
      }));

      await issueSessionTokens(
        mockPool as any,
        baseUser,
        mockReq as Request,
        mockRes as unknown as Response,
        'req-id-001'
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              organizationGroupCds: ['group-A', 'group-B'],
            }),
          }),
        })
      );
    });

    test('異常系: JWT 生成失敗時に 500 を返すこと', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ organization_display_name: 'テスト組織', corporation_id: null }] })
        .mockResolvedValueOnce({ rows: [{ initial_screen_function_cd: null, role_name: 'admin' }] })
        .mockResolvedValueOnce({ rows: [{ is_temporary_flg: false }] });

      (JwtService as jest.Mock).mockImplementation(() => ({
        generateTokenPair: jest.fn().mockResolvedValue({ success: false, data: null }),
        decode: jest.fn(),
        getRefreshTokenMaxAge: jest.fn().mockReturnValue(1800000),
      }));

      await issueSessionTokens(
        mockPool as any,
        baseUser,
        mockReq as Request,
        mockRes as unknown as Response,
        'req-id-002'
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    test('正常系: organization_group_cds が空配列の場合も正常に処理されること', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ organization_display_name: 'テスト組織', corporation_id: null }] })
        .mockResolvedValueOnce({ rows: [{ initial_screen_function_cd: null, role_name: 'admin' }] })
        .mockResolvedValueOnce({ rows: [{ is_temporary_flg: false }] });

      (JwtService as jest.Mock).mockImplementation(() => ({
        generateTokenPair: jest.fn().mockResolvedValue({
          success: true,
          data: { accessToken: 'access-token-yyy', refreshToken: 'refresh-token-yyy' },
        }),
        decode: jest.fn().mockReturnValue({ tokenId: 'token-id-yyy' }),
        getRefreshTokenMaxAge: jest.fn().mockReturnValue(1800000),
      }));

      const userWithEmptyGroups = { ...baseUser, organization_group_cds: [] };

      await issueSessionTokens(
        mockPool as any,
        userWithEmptyGroups,
        mockReq as Request,
        mockRes as unknown as Response,
        'req-id-003'
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user: expect.objectContaining({
              organizationGroupCds: [],
            }),
          }),
        })
      );
    });

    test('正常系: 仮パスワードの場合、passwordChangeRequired が true になること', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ organization_display_name: 'テスト組織', corporation_id: null }] })
        .mockResolvedValueOnce({ rows: [{ initial_screen_function_cd: null, role_name: 'admin' }] })
        .mockResolvedValueOnce({ rows: [{ is_temporary_flg: true }] });

      (JwtService as jest.Mock).mockImplementation(() => ({
        generateTokenPair: jest.fn().mockResolvedValue({
          success: true,
          data: { accessToken: 'access-token-zzz', refreshToken: 'refresh-token-zzz' },
        }),
        decode: jest.fn().mockReturnValue({ tokenId: 'token-id-zzz' }),
        getRefreshTokenMaxAge: jest.fn().mockReturnValue(1800000),
      }));

      await issueSessionTokens(
        mockPool as any,
        baseUser,
        mockReq as Request,
        mockRes as unknown as Response,
        'req-id-004'
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordChangeRequired: true,
            isTemporaryPassword: true,
          }),
        })
      );
    });
  });
});

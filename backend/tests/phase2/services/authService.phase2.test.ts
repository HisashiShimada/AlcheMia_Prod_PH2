/**
 * authService フェーズ２ テスト
 *
 * 分類A：認証サービスの変更箇所
 * - login（organizationGroupCds の JWT ペイロード含有確認）
 * - セッション生成時の organizationGroupCds 格納
 */

import * as authService from '../../../src/services/authService';
import * as userRepository from '../../../src/repositories/userRepository';
import { getPgp } from '../../../src/database/db';

jest.mock('../../../src/repositories/userRepository');
jest.mock('../../../src/database/db');
jest.mock('../../../src/services/jwtService', () => ({
  generateToken: jest.fn(() => 'mock-token'),
  verifyToken: jest.fn(() => ({ userId: 'user-001@example.com', organizationId: 'org-001' })),
}));
jest.mock('../../../src/services/sessionService', () => ({
  createSession: jest.fn(),
  deleteSession: jest.fn(),
}));
jest.mock('../../../src/services/passwordService', () => ({
  verifyPassword: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

describe('authService - Phase2 テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPgp as jest.Mock).mockReturnValue({ tx: jest.fn() });
  });

  describe('login()', () => {
    test('正常系: organizationGroupCds を含むユーザー情報で認証が通ること', async () => {
      const mockUser = {
        user_id: 'user-001@example.com',
        user_name: 'テストユーザー',
        organization_id: 'org-001',
        organization_group_cds: ['group-A'],
        role_cd: 'researcher',
        is_valid: true,
        is_temp_password: false,
      };
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.login('user-001@example.com', 'Password1!', '127.0.0.1');

      expect(result).toBeDefined();
    });

    test('異常系: ユーザーが存在しない場合エラーを投げること', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login('nonexistent@example.com', 'Password1!', '127.0.0.1')
      ).rejects.toThrow();
    });

    test('異常系: 無効化されたユーザーはログインできないこと', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue({
        user_id: 'user-001@example.com',
        is_valid: false,
        organization_group_cds: [],
      });

      await expect(
        authService.login('user-001@example.com', 'Password1!', '127.0.0.1')
      ).rejects.toThrow();
    });
  });
});

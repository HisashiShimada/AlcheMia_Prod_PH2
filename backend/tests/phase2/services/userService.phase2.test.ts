/**
 * userService フェーズ２ テスト
 *
 * 分類A：ユーザー管理サービスの変更箇所
 * - getUsers / getUserById
 * - createUser（名前空間URI自動生成連携）
 * - updateUser
 * - updateUserStatus
 * - generateCSV / uploadUsersFromCSV
 */

import * as userService from '../../../src/services/userService';
import * as userRepository from '../../../src/repositories/userRepository';
import * as namespaceTermRepository from '../../../src/repositories/namespaceTermRepository';
import { getPgp } from '../../../src/database/db';

// ──────────────────────────────────────────────
// モック
// ──────────────────────────────────────────────
jest.mock('../../../src/repositories/userRepository');
jest.mock('../../../src/repositories/namespaceTermRepository');
jest.mock('../../../src/database/db');
jest.mock('../../../src/services/emailService');
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockTx = jest.fn();
const mockPgp = { tx: mockTx };

// ──────────────────────────────────────────────
// テスト
// ──────────────────────────────────────────────
describe('userService - Phase2 テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  // ==========================================================================
  // getUsers
  // ==========================================================================
  describe('getUsers()', () => {
    test('正常系: findAll を呼び出してユーザー一覧を返すこと', async () => {
      const mockUsers = [
        { user_id: 'user-001@example.com', user_name: 'テストA', organization_id: 'org-001' },
        { user_id: 'user-002@example.com', user_name: 'テストB', organization_id: 'org-001' },
      ];
      (userRepository.findAll as jest.Mock).mockResolvedValue(mockUsers);

      const result = await userService.getUsers('org-001');

      expect(userRepository.findAll).toHaveBeenCalledWith('org-001', {});
      expect(result).toEqual(mockUsers);
    });

    test('正常系: filters を渡して findAll を呼び出すこと', async () => {
      (userRepository.findAll as jest.Mock).mockResolvedValue([]);

      await userService.getUsers('org-001', { search: 'テスト' });

      expect(userRepository.findAll).toHaveBeenCalledWith('org-001', { search: 'テスト' });
    });

    test('異常系: Repository が例外を投げた場合にエラーを伝播すること', async () => {
      (userRepository.findAll as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(userService.getUsers('org-001')).rejects.toThrow();
    });
  });

  // ==========================================================================
  // getUserById
  // ==========================================================================
  describe('getUserById()', () => {
    test('正常系: findById を呼び出してユーザーを返すこと', async () => {
      const mockUser = { user_id: 'user-001@example.com', user_name: 'テストA' };
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.getUserById('org-001', 'user-001@example.com');

      expect(userRepository.findById).toHaveBeenCalledWith('org-001', 'user-001@example.com');
      expect(result).toEqual(mockUser);
    });

    test('正常系: ユーザーが存在しない場合 null を返すこと', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await userService.getUserById('org-001', 'nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // updateUserStatus（Phase2 変更箇所）
  // ==========================================================================
  describe('updateUserStatus()', () => {
    test('正常系: updateStatus を呼び出してステータスを更新すること', async () => {
      const mockUpdated = { user_id: 'user-001@example.com', is_valid: false };
      (userRepository.updateStatus as jest.Mock).mockResolvedValue(mockUpdated);

      const result = await userService.updateUserStatus(
        'org-001',
        'user-001@example.com',
        false,
        'admin@example.com'
      );

      expect(userRepository.updateStatus).toHaveBeenCalledWith(
        'org-001',
        'user-001@example.com',
        false,
        'admin@example.com'
      );
      expect(result).toEqual(mockUpdated);
    });
  });
});

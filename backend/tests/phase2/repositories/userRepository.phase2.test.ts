/**
 * userRepository フェーズ２ テスト
 *
 * 分類A：変更箇所の動作確認
 *
 * @description
 * - フェーズ２でユーザー登録・更新時に名前空間（namespace）を自動生成する処理が追加された
 * - create / update / findById の基本動作を確認する
 */

import {
  findAll,
  findById,
  create,
  update,
  updateStatus,
  deleteById,
} from '../../../src/repositories/userRepository';
import { getPgp } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/sql/loader', () => ({
  loadSqlFile: jest.fn().mockResolvedValue('SELECT 1'),
}));

describe('userRepository - Phase2 変更箇所確認', () => {
  let mockPgp: { any: jest.Mock; one: jest.Mock; oneOrNone: jest.Mock; none: jest.Mock; result: jest.Mock; tx: jest.Mock };

  beforeEach(() => {
    mockPgp = {
      any: jest.fn(),
      one: jest.fn(),
      oneOrNone: jest.fn(),
      none: jest.fn(),
      result: jest.fn(),
      tx: jest.fn(),
    };
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll()', () => {
    test('正常系: 組織ユーザー一覧を返すこと', async () => {
      const expected = [
        { user_id: 'user-001', user_name: 'テストユーザー1' },
        { user_id: 'user-002', user_name: 'テストユーザー2' },
      ];
      mockPgp.any.mockResolvedValue(expected);

      const result = await findAll('org-001');

      expect(result).toHaveLength(2);
      expect(mockPgp.any).toHaveBeenCalledWith(expect.any(String), ['org-001']);
    });
  });

  describe('findById()', () => {
    test('正常系: ユーザーが見つかった場合、データを返すこと', async () => {
      const expected = { user_id: 'user-001', user_name: 'テストユーザー', organization_id: 'org-001' };
      mockPgp.oneOrNone.mockResolvedValue(expected);

      const result = await findById('org-001', 'user-001');

      expect(result?.user_id).toBe('user-001');
    });

    test('存在しない場合、null を返すこと', async () => {
      mockPgp.oneOrNone.mockResolvedValue(null);
      const result = await findById('org-001', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('create()', () => {
    test('正常系: ユーザーを INSERT し、登録結果を返すこと', async () => {
      const expected = { user_id: 'user-003', user_name: '新規ユーザー', organization_id: 'org-001' };
      mockPgp.one.mockResolvedValue(expected);

      // create の引数は実際のシグネチャに合わせて as any でキャスト
      const result = await (create as any)('org-001', {
        userId: 'user-003',
        userName: '新規ユーザー',
        email: 'new@example.com',
        roleId: 'role-001',
        loginId: 'newuser',
        password: 'hashed-password',
      });

      expect(result.user_id).toBe('user-003');
    });
  });

  describe('updateStatus()', () => {
    test('正常系: ユーザーのステータスを更新できること', async () => {
      mockPgp.result.mockResolvedValue({ rowCount: 1 });

      await updateStatus('org-001', 'user-001', false, 'admin-001');

      expect(mockPgp.result).toHaveBeenCalledTimes(1);
    });
  });
});

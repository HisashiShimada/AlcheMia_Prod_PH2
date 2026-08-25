/**
 * organizationManagementRepository フェーズ２ テスト
 *
 * 分類A：変更箇所の動作確認
 *
 * @description
 * - 組織管理の変更箇所（フェーズ２で organization_group 対応が追加）の動作確認
 */

import {
  findAll,
  findById,
  existsById,
  create,
  update,
  updateStatus,
  deleteById,
  findSystemAdminsByOrganizationId,
  createOrganizationUser,
} from '../../../src/repositories/organizationManagementRepository';
import { getPgp } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/sql/loader', () => ({
  loadSqlFile: jest.fn().mockResolvedValue('SELECT 1'),
}));

describe('organizationManagementRepository - Phase2 変更箇所確認', () => {
  let mockPgp: { any: jest.Mock; one: jest.Mock; oneOrNone: jest.Mock; none: jest.Mock; result: jest.Mock };

  beforeEach(() => {
    mockPgp = {
      any: jest.fn(),
      one: jest.fn(),
      oneOrNone: jest.fn(),
      none: jest.fn(),
      result: jest.fn(),
    };
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll()', () => {
    test('正常系: 組織一覧を返すこと', async () => {
      const expected = [
        { organization_id: 'org-001', organization_name: '組織A', is_active: true },
        { organization_id: 'org-002', organization_name: '組織B', is_active: true },
      ];
      mockPgp.any.mockResolvedValue(expected);

      const result = await findAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('findById()', () => {
    test('正常系: 組織が見つかった場合、データを返すこと', async () => {
      const expected = { organization_id: 'org-001', organization_name: '組織A', is_active: true };
      mockPgp.oneOrNone.mockResolvedValue(expected);

      const result = await findById('org-001');

      expect(result?.organization_id).toBe('org-001');
    });

    test('存在しない場合、null を返すこと', async () => {
      mockPgp.oneOrNone.mockResolvedValue(null);
      const result = await findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('create()', () => {
    test('正常系: 組織を INSERT できること', async () => {
      const expected = { organization_id: 'org-003', organization_name: '新組織' };
      mockPgp.one.mockResolvedValue(expected);

      // 実際のシグネチャに合わせて as any でキャスト
      const result = await (create as any)({
        organizationId: 'org-003',
        organizationName: '新組織',
        organizationCd: 'ORG003',
      });

      expect(result.organization_id).toBe('org-003');
    });
  });

  describe('updateStatus()', () => {
    test('正常系: 組織のステータスを更新できること', async () => {
      mockPgp.result.mockResolvedValue({ rowCount: 1 });

      // updateStatus は第3引数（userId）が必要
      await (updateStatus as any)('org-001', false, 'admin-001');

      expect(mockPgp.none).toHaveBeenCalledTimes(1);
    });
  });

  describe('findSystemAdminsByOrganizationId()', () => {
    test('正常系: 組織のシステム管理者一覧を返すこと', async () => {
      const expected = [{ user_id: 'admin-001', user_name: 'システム管理者' }];
      mockPgp.any.mockResolvedValue(expected);

      const result = await findSystemAdminsByOrganizationId('org-001');

      expect(result).toHaveLength(1);
    });
  });
});

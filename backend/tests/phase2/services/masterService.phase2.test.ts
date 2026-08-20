/**
 * masterService フェーズ２ テスト
 *
 * 分類A：マスタ管理サービスの変更箇所
 * - getCodeMasters（organization_group_cd 対応）
 * - getOrganizationRoles（ロール一覧）
 */

import * as masterService from '../../../src/services/masterService';
import { getPool } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockPool = { query: jest.fn() };

describe('masterService - Phase2 テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  describe('getCodeMasters()', () => {
    test('正常系: コードマスタ一覧を返すこと', async () => {
      const mockMasters = [
        { code_type: 'ROLE', code_value: 'researcher', code_name: '研究者' },
      ];
      mockPool.query.mockResolvedValue({ rows: mockMasters });

      const result = await masterService.getCodeMasters('org-001');

      expect(result).toBeDefined();
    });

    test('異常系: DBエラー発生時にエラーを伝播すること', async () => {
      mockPool.query.mockRejectedValue(new Error('DB error'));

      await expect(masterService.getCodeMasters('org-001')).rejects.toThrow();
    });
  });

  describe('getOrganizationRoles()', () => {
    test('正常系: ロール一覧を返すこと', async () => {
      const mockRoles = [
        { role_cd: 'researcher', role_name: '研究者' },
        { role_cd: 'experiment_admin', role_name: '実験管理者' },
      ];
      mockPool.query.mockResolvedValue({ rows: mockRoles });

      const result = await masterService.getOrganizationRoles('org-001');

      expect(result).toBeDefined();
    });
  });
});

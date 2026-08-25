/**
 * organizationService フェーズ２ テスト
 *
 * 分類A：組織管理サービスの変更箇所（department → organization_group 移行）
 * - getOrganization
 * - updateOrganization
 */

import * as organizationService from '../../../src/services/organizationService';
import * as organizationManagementRepository from '../../../src/repositories/organizationManagementRepository';
import { getPool, getPgp } from '../../../src/database/db';

jest.mock('../../../src/repositories/organizationManagementRepository');
jest.mock('../../../src/database/db');
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockPool = { query: jest.fn() };
const mockPgp = { tx: jest.fn(), none: jest.fn() };

describe('organizationService - Phase2 テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPool as jest.Mock).mockReturnValue(mockPool);
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  describe('getOrganization()', () => {
    test('正常系: 組織情報を返すこと', async () => {
      const mockOrg = {
        organization_id: 'org-001',
        organization_name: 'テスト組織',
        organization_cd: 'test-org',
      };
      (organizationManagementRepository.findById as jest.Mock).mockResolvedValue(mockOrg);

      const result = await organizationService.getOrganization('org-001');

      expect(organizationManagementRepository.findById).toHaveBeenCalledWith('org-001');
      expect(result).toEqual(mockOrg);
    });

    test('正常系: 組織が存在しない場合 null を返すこと', async () => {
      (organizationManagementRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await organizationService.getOrganization('nonexistent');

      expect(result).toBeNull();
    });

    test('異常系: Repository が例外を投げた場合にエラーを伝播すること', async () => {
      (organizationManagementRepository.findById as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(organizationService.getOrganization('org-001')).rejects.toThrow();
    });
  });

  describe('updateOrganization()', () => {
    test('正常系: 組織情報を更新して返すこと', async () => {
      const mockUpdated = { organization_id: 'org-001', organization_name: '更新後組織名' };
      (organizationManagementRepository.update as jest.Mock).mockResolvedValue(mockUpdated);

      const result = await organizationService.updateOrganization(
        'org-001',
        { organizationName: '更新後組織名' },
        'admin@example.com'
      );

      expect(result).toBeDefined();
    });

    test('異常系: Repository が例外を投げた場合にエラーを伝播すること', async () => {
      (organizationManagementRepository.update as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(
        organizationService.updateOrganization('org-001', {}, 'admin@example.com')
      ).rejects.toThrow();
    });
  });
});

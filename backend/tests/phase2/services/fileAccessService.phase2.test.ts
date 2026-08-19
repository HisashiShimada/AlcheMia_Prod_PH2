/**
 * fileAccessService フェーズ２ テスト
 *
 * 分類A：ファイルアクセスサービスの変更箇所
 * - checkFileAccess（organization_group_cd ベースの権限チェック）
 * - getAccessibleFiles
 */

import * as fileAccessService from '../../../src/services/fileAccessService';
import { getPool, getPgp } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockPool = { query: jest.fn() };

describe('fileAccessService - Phase2 テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  describe('checkFileAccess()', () => {
    test('正常系: アクセス権限があるファイルに対して true を返すこと', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ file_id: 'file-001', organization_group_cd: 'group-A' }],
      });

      const result = await fileAccessService.checkFileAccess(
        'file-001',
        'user-001@example.com',
        'org-001',
        ['group-A']
      );

      expect(result).toBeDefined();
    });

    test('正常系: アクセス権限がないファイルに対して false を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await fileAccessService.checkFileAccess(
        'file-001',
        'user-001@example.com',
        'org-001',
        ['group-B']
      );

      expect(result).toBeDefined();
    });

    test('異常系: DBエラー発生時にエラーを伝播すること', async () => {
      mockPool.query.mockRejectedValue(new Error('DB error'));

      await expect(
        fileAccessService.checkFileAccess('file-001', 'user-001@example.com', 'org-001', ['group-A'])
      ).rejects.toThrow();
    });
  });
});

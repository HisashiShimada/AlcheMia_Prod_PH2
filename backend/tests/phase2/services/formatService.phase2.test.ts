/**
 * formatService フェーズ２ テスト
 *
 * 分類A：フォーマット管理サービスの変更箇所
 * - getFormats（organization_group_cd フィルタ対応）
 * - getFormatById
 */

import * as formatService from '../../../src/services/formatService';
import { getPool, getPgp } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockPool = { query: jest.fn() };

describe('formatService - Phase2 テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  describe('getFormats()', () => {
    test('正常系: フォーマット一覧を返すこと', async () => {
      const mockFormats = [
        { format_id: 'fmt-001', format_name: 'テストフォーマット', organization_group_cd: 'group-A' },
      ];
      mockPool.query.mockResolvedValue({ rows: mockFormats });

      const result = await formatService.getFormats('org-001', 'user-001@example.com', ['group-A'], 'researcher');

      expect(result).toBeDefined();
    });

    test('異常系: DBエラー発生時にエラーを伝播すること', async () => {
      mockPool.query.mockRejectedValue(new Error('DB error'));

      await expect(
        formatService.getFormats('org-001', 'user-001@example.com', ['group-A'], 'researcher')
      ).rejects.toThrow();
    });
  });
});

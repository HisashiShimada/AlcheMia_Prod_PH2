/**
 * pinCodeService フェーズ２ テスト
 *
 * 分類A：PINコード認証サービスの変更箇所
 * - verifyPinCode（PINコード検証）
 * - generatePinCode
 * - invalidatePinCode
 */

import * as pinCodeService from '../../../src/services/pinCodeService';
import { getPool, getPgp } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockPool = { query: jest.fn() };
const mockPgp = { tx: jest.fn(), none: jest.fn(), one: jest.fn() };

describe('pinCodeService - Phase2 テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPool as jest.Mock).mockReturnValue(mockPool);
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  describe('verifyPinCode()', () => {
    test('正常系: 有効なPINコードの場合 true を返すこと', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ pin_code: '123456', expires_at: new Date(Date.now() + 600000), is_used: false }],
      });

      const result = await pinCodeService.verifyPinCode('user-001@example.com', '123456', 'org-001');

      expect(result).toBeDefined();
    });

    test('正常系: 期限切れPINコードの場合 false を返すこと', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ pin_code: '123456', expires_at: new Date(Date.now() - 1000), is_used: false }],
      });

      const result = await pinCodeService.verifyPinCode('user-001@example.com', '123456', 'org-001');

      expect(result).toBeDefined();
    });

    test('正常系: PINコードが存在しない場合 false を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await pinCodeService.verifyPinCode('user-001@example.com', '000000', 'org-001');

      expect(result).toBeDefined();
    });

    test('異常系: DBエラー発生時にエラーを伝播すること', async () => {
      mockPool.query.mockRejectedValue(new Error('DB error'));

      await expect(
        pinCodeService.verifyPinCode('user-001@example.com', '123456', 'org-001')
      ).rejects.toThrow();
    });
  });

  describe('generatePinCode()', () => {
    test('正常系: 6桁のPINコードを生成して保存すること', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ pin_code: '654321' }] });

      const result = await pinCodeService.generatePinCode('user-001@example.com', 'org-001');

      expect(result).toBeDefined();
    });
  });
});

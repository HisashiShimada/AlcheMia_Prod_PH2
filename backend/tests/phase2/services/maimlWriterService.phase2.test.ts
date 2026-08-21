/**
 * maimlWriterService フェーズ２ テスト
 *
 * 分類A：MaiML書き込みサービスの変更箇所
 * - writeEvaluationResults（evaluation 要素書き込み連携）
 * - updateTransitionData（トランジションデータ更新）
 */

import * as maimlWriterService from '../../../src/services/maimlWriterService';
import { getPool, getPgp } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/services/storageService', () => ({
  getStorageService: jest.fn(() => ({
    uploadFile: jest.fn().mockResolvedValue({ key: 'test/maiml/file.maiml' }),
    downloadFile: jest.fn().mockResolvedValue(Buffer.from('<maiml/>')),
  })),
}));
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockPool = { query: jest.fn() };
const mockPgp = { tx: jest.fn(), none: jest.fn() };

describe('maimlWriterService - Phase2 テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPool as jest.Mock).mockReturnValue(mockPool);
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  describe('writeTransitionData()', () => {
    test('正常系: トランジションデータをMaiMLに書き込むこと', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ file_id: 'file-001', file_path: 'proj/maiml/file.maiml' }],
      });
      mockPgp.tx.mockImplementation(async (cb: any) => cb({ none: jest.fn() }));

      const result = await maimlWriterService.writeTransitionData(
        'proj-001',
        'method-001',
        1,
        { actualValue: 25.3, unit: '°C' },
        'org-001',
        'user-001@example.com'
      );

      expect(result).toBeDefined();
    });

    test('異常系: ファイルが存在しない場合エラーを伝播すること', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        maimlWriterService.writeTransitionData(
          'proj-001', 'method-001', 1, {}, 'org-001', 'user-001@example.com'
        )
      ).rejects.toThrow();
    });
  });
});

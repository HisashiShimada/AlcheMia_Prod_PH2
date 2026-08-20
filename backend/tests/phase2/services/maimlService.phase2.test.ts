/**
 * maimlService フェーズ２ テスト
 *
 * 分類A：MaiML処理サービスの変更箇所
 * - parsePetriNetStructure（ペトリネット構造パース）
 * - saveMaimlFile（保存処理）
 * - getMaimlFile（取得処理）
 */

import * as maimlService from '../../../src/services/maimlService';
import { getPool, getPgp } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/services/storageService', () => ({
  getStorageService: jest.fn(() => ({
    uploadFile: jest.fn().mockResolvedValue({ key: 'test/maiml/file.maiml' }),
    downloadFile: jest.fn().mockResolvedValue(Buffer.from('<maiml/>')),
    getSignedUrl: jest.fn().mockResolvedValue('https://example.com/file.maiml'),
  })),
}));
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockPool = { query: jest.fn() };
const mockPgp = { tx: jest.fn(), none: jest.fn() };

describe('maimlService - Phase2 テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPool as jest.Mock).mockReturnValue(mockPool);
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  describe('parsePetriNetStructure()', () => {
    test('正常系: 有効なMaiML XMLからペトリネット構造を返すこと', () => {
      const xml = `<maiml>
        <method id="m1">
          <place id="p1"/>
          <transition id="t1"/>
          <arc source="p1" target="t1"/>
        </method>
      </maiml>`;

      const result = maimlService.parsePetriNetStructure(xml);

      expect(result).toBeDefined();
    });

    test('異常系: 不正なXMLの場合エラーを投げること', () => {
      expect(() => maimlService.parsePetriNetStructure('<invalid>')).toThrow();
    });
  });

  describe('saveMaimlFile()', () => {
    test('正常系: MaiMLファイルを保存して結果を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ file_id: 'file-001' }] });

      const result = await maimlService.saveMaimlFile(
        'proj-001',
        'org-001',
        'user-001@example.com',
        'test.maiml',
        Buffer.from('<maiml/>')
      );

      expect(result).toBeDefined();
    });
  });
});

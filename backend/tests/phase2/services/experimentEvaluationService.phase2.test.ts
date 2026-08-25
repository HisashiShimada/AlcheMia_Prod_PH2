/**
 * experimentEvaluationService フェーズ２ テスト
 *
 * 分類A：実験評価サービス（Phase2 新規）
 * - getEvaluations（プロジェクト別一覧取得）
 * - saveEvaluations（一括保存）
 * - exportToMaiml（MaiML書き込み連携）
 */

import * as experimentEvaluationService from '../../../src/services/experimentEvaluationService';
import { getPool, getPgp } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockPool = { query: jest.fn() };
const mockPgp = { tx: jest.fn(), none: jest.fn(), any: jest.fn() };

describe('experimentEvaluationService - Phase2 テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPool as jest.Mock).mockReturnValue(mockPool);
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  describe('getEvaluations()', () => {
    test('正常系: プロジェクト別の評価一覧を返すこと', async () => {
      const mockEvaluations = [
        {
          evaluation_id: 'eval-001',
          project_id: 'proj-001',
          uncertainty_key: 'uk-001',
          uc_version: 1,
        },
      ];
      mockPool.query.mockResolvedValue({ rows: mockEvaluations });

      const result = await experimentEvaluationService.getEvaluations('proj-001', 'org-001');

      expect(result).toBeDefined();
    });

    test('異常系: DBエラー発生時にエラーを伝播すること', async () => {
      mockPool.query.mockRejectedValue(new Error('DB error'));

      await expect(
        experimentEvaluationService.getEvaluations('proj-001', 'org-001')
      ).rejects.toThrow();
    });
  });

  describe('saveEvaluations()', () => {
    test('正常系: 評価を一括保存すること', async () => {
      mockPgp.tx.mockImplementation(async (cb: any) => cb({ none: jest.fn() }));

      const evaluations = [
        {
          evaluationUnit: 'unit-001',
          nameSpaceId: 'ns-001',
          uncertaintyKey: 'uk-001',
          ucVersion: 1,
        },
      ];

      const result = await experimentEvaluationService.saveEvaluations(
        'proj-001',
        'org-001',
        evaluations,
        'user-001@example.com'
      );

      expect(result).toBeDefined();
    });

    test('異常系: トランザクション失敗時にエラーを伝播すること', async () => {
      mockPgp.tx.mockRejectedValue(new Error('Transaction failed'));

      await expect(
        experimentEvaluationService.saveEvaluations('proj-001', 'org-001', [], 'user-001@example.com')
      ).rejects.toThrow();
    });
  });
});

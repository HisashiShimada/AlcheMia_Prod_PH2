/**
 * experimentInstructionService フェーズ２ テスト
 *
 * 分類A：実験指示サービス（Phase2 新規）
 * - getExperimentInstructions（実験指示一覧）
 * - getProjectMethods（メソッド一覧）
 * - approveTask（タスク承認）
 * - recordNg（NG記録）
 */

import * as experimentInstructionService from '../../../src/services/experimentInstructionService';
import { getPool, getPgp } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockPool = { query: jest.fn() };
const mockPgp = { tx: jest.fn(), none: jest.fn(), one: jest.fn() };

describe('experimentInstructionService - Phase2 テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPool as jest.Mock).mockReturnValue(mockPool);
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  describe('getExperimentInstructions()', () => {
    test('正常系: 実験指示一覧を返すこと', async () => {
      const mockInstructions = [
        { task_id: 'task-001', method_id: 'method-001', task_status: 1 },
      ];
      mockPool.query.mockResolvedValue({ rows: mockInstructions });

      const result = await experimentInstructionService.getExperimentInstructions('proj-001', 'org-001');

      expect(result).toBeDefined();
    });
  });

  describe('approveTask()', () => {
    test('正常系: タスクを承認すること', async () => {
      mockPgp.tx.mockImplementation(async (cb: any) => cb({ none: jest.fn() }));

      const result = await experimentInstructionService.approveTask(
        'proj-001',
        'method-001',
        1,
        'org-001',
        'admin@example.com'
      );

      expect(result).toBeDefined();
    });

    test('異常系: タスクが存在しない場合エラーを伝播すること', async () => {
      mockPgp.tx.mockRejectedValue(new Error('Task not found'));

      await expect(
        experimentInstructionService.approveTask('proj-001', 'method-001', 999, 'org-001', 'admin@example.com')
      ).rejects.toThrow();
    });
  });

  describe('recordNg()', () => {
    test('正常系: NG理由を記録すること', async () => {
      mockPgp.tx.mockImplementation(async (cb: any) => cb({ none: jest.fn() }));

      const result = await experimentInstructionService.recordNg(
        'proj-001',
        'method-001',
        1,
        'データが不正です',
        'org-001',
        'admin@example.com'
      );

      expect(result).toBeDefined();
    });

    test('異常系: NG理由が空の場合エラーを伝播すること', async () => {
      await expect(
        experimentInstructionService.recordNg('proj-001', 'method-001', 1, '', 'org-001', 'admin@example.com')
      ).rejects.toThrow();
    });
  });
});

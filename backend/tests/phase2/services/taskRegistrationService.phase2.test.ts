/**
 * taskRegistrationService フェーズ２ テスト
 *
 * 分類A：タスク登録サービスの変更箇所
 * - registerTasks（タスク一括登録）
 * - sendInstructions（指示書配布）
 * - getRegistrationStatus
 */

import * as taskRegistrationService from '../../../src/services/taskRegistrationService';
import { getPool, getPgp } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
jest.mock('../../../src/services/storageService', () => ({
  getStorageService: jest.fn(() => ({
    uploadFile: jest.fn().mockResolvedValue({ key: 'test/key' }),
    listFiles: jest.fn().mockResolvedValue([]),
  })),
}));

const mockPool = { query: jest.fn() };
const mockPgp = { tx: jest.fn(), none: jest.fn(), any: jest.fn() };

describe('taskRegistrationService - Phase2 テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPool as jest.Mock).mockReturnValue(mockPool);
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  describe('registerTasks()', () => {
    test('正常系: タスクを一括登録すること', async () => {
      mockPgp.tx.mockImplementation(async (cb: any) => cb({ none: jest.fn(), any: jest.fn() }));

      const tasks = [
        {
          methodId: 'method-001',
          taskNo: 1,
          assigneeId: 'worker@example.com',
          plannedValues: { temperature: 25 },
        },
      ];

      const result = await taskRegistrationService.registerTasks(
        'proj-001',
        'org-001',
        tasks,
        'admin@example.com'
      );

      expect(result).toBeDefined();
    });

    test('異常系: トランザクション失敗時にエラーを伝播すること', async () => {
      mockPgp.tx.mockRejectedValue(new Error('Transaction failed'));

      await expect(
        taskRegistrationService.registerTasks('proj-001', 'org-001', [], 'admin@example.com')
      ).rejects.toThrow();
    });
  });

  describe('sendInstructions()', () => {
    test('正常系: 指示書を配布して件数を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ count: '3' }] });
      mockPgp.tx.mockImplementation(async (cb: any) => cb({ none: jest.fn() }));

      const result = await taskRegistrationService.sendInstructions(
        'proj-001',
        'method-001',
        'org-001',
        'admin@example.com'
      );

      expect(result).toBeDefined();
    });

    test('異常系: 配布対象タスクが存在しない場合エラーを伝播すること', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        taskRegistrationService.sendInstructions('proj-001', 'method-001', 'org-001', 'admin@example.com')
      ).rejects.toThrow();
    });
  });
});

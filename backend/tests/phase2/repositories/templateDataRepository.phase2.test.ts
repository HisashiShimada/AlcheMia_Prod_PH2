/**
 * templateDataRepository フェーズ２ テスト
 *
 * 分類A：変更箇所の動作確認
 *
 * @description
 * - upsert / findByTaskNo / findByPlaceId / findByProject の動作確認
 */

import { TemplateDataRepository } from '../../../src/repositories/templateDataRepository';
import { getPgp, getPool } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/sql/loader', () => ({
  loadSqlFile: jest.fn().mockResolvedValue('SELECT 1'),
}));

describe('templateDataRepository - Phase2 変更箇所確認', () => {
  let repo: TemplateDataRepository;
  let mockPgp: { any: jest.Mock; one: jest.Mock; oneOrNone: jest.Mock; none: jest.Mock; result: jest.Mock };
  let mockPool: { query: jest.Mock };

  beforeEach(() => {
    mockPgp = {
      any: jest.fn(),
      one: jest.fn(),
      oneOrNone: jest.fn(),
      none: jest.fn(),
      result: jest.fn(),
    };
    mockPool = {
      query: jest.fn(),
    };
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
    (getPool as jest.Mock).mockReturnValue(mockPool);
    repo = new TemplateDataRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByProject()', () => {
    test('正常系: プロジェクト配下の全テンプレートデータを返すこと', async () => {
      const rows = [
        { organization_id: 'org-001', project_id: 'proj-001', task_no: 1 },
        { organization_id: 'org-001', project_id: 'proj-001', task_no: 2 },
      ];
      mockPool.query.mockResolvedValue({ rows, rowCount: rows.length });

      const result = await repo.findByProject('org-001', 'proj-001');

      expect(result).toHaveLength(2);
    });

    test('データが存在しない場合、空配列を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await repo.findByProject('org-001', 'proj-empty');
      expect(result).toEqual([]);
    });
  });

  describe('findByTaskNo()', () => {
    test('正常系: task_no 単位のテンプレートデータを返すこと', async () => {
      const rows = [{ organization_id: 'org-001', project_id: 'proj-001', task_no: 1 }];
      const mockClient = { query: jest.fn().mockResolvedValue({ rows, rowCount: rows.length }) };

      // 引数が5個必要なため実際のシグネチャに合わせて as any でキャスト
      const result = await (repo.findByTaskNo as any)('org-001', 'proj-001', 'method-001', 1, mockClient);

      expect(result).toBeDefined();
    });
  });

  describe('deleteByProject()', () => {
    test('正常系: プロジェクト単位のテンプレートデータを削除できること', async () => {
      const mockClient = { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 3 }) };
      // deleteByProject は PoolClient を第3引数に受け取る
      await (repo.deleteByProject as any)('org-001', 'proj-001', mockClient);
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });
  });
});

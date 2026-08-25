/**
 * instructionRepository フェーズ２ テスト
 *
 * 分類A：新規テーブル（experiment_instruction_detail / instruction_acknowledged_history）の
 * 全CRUD・確認履歴登録・権限チェック確認
 *
 * @remarks
 * instructionRepository は getPgp()（pg-promise）を使用するため、getPgp をモック対象とする。
 * ただし insertAcknowledgedWithClient は PoolClient を直接受け取る。
 */

import {
  findById,
  checkAcknowledged,
  checkWorkerAssignment,
  insertAcknowledged,
  insertAcknowledgedWithClient,
  findUserNameFromAuth,
  findByProject,
  batchInsert,
} from '../../../src/repositories/instructionRepository';
import { getPgp } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/sql/loader', () => ({
  loadSqlFile: jest.fn().mockResolvedValue('SELECT 1'),
}));

describe('instructionRepository - Phase2 全CRUD・確認履歴テスト', () => {
  let mockPgp: {
    any: jest.Mock;
    one: jest.Mock;
    oneOrNone: jest.Mock;
    none: jest.Mock;
    tx: jest.Mock;
  };

  beforeEach(() => {
    mockPgp = {
      any: jest.fn(),
      one: jest.fn(),
      oneOrNone: jest.fn(),
      none: jest.fn(),
      tx: jest.fn(),
    };
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // findById
  // ==========================================================================
  describe('findById()', () => {
    test('正常系: 指示1件を返すこと', async () => {
      const row = {
        instruction_id: 'inst-001',
        project_id: 'proj-001',
        organization_id: 'org-001',
        method_id: 'method-001',
        task_no: 1,
        transition_id: 'trans-001',
      };
      mockPgp.oneOrNone.mockResolvedValue(row);

      const result = await findById('inst-001', 'proj-001', 'org-001');

      expect(mockPgp.oneOrNone).toHaveBeenCalledTimes(1);
      expect(result).not.toBeNull();
      expect(result!.instruction_id).toBe('inst-001');
    });

    test('存在しない場合、null を返すこと', async () => {
      mockPgp.oneOrNone.mockResolvedValue(null);

      const result = await findById('non-existent', 'proj-001', 'org-001');

      expect(result).toBeNull();
    });

    test('異常系: DB エラー時にエラーをスローすること', async () => {
      mockPgp.oneOrNone.mockRejectedValue(new Error('DB error'));

      await expect(findById('inst-001', 'proj-001', 'org-001')).rejects.toThrow('DB error');
    });
  });

  // ==========================================================================
  // checkAcknowledged
  // ==========================================================================
  describe('checkAcknowledged()', () => {
    test('正常系: 確認済みの場合、確認履歴を返すこと', async () => {
      const row = { acknowledged_at: new Date('2026-06-01T10:00:00Z') };
      mockPgp.oneOrNone.mockResolvedValue(row);

      const result = await checkAcknowledged('inst-001', 'proj-001', 'org-001');

      expect(result).not.toBeNull();
      expect(result!.acknowledged_at).toBeInstanceOf(Date);
    });

    test('未確認の場合、null を返すこと', async () => {
      mockPgp.oneOrNone.mockResolvedValue(null);

      const result = await checkAcknowledged('inst-001', 'proj-001', 'org-001');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // checkWorkerAssignment
  // ==========================================================================
  describe('checkWorkerAssignment()', () => {
    test('正常系: 割り当てが存在する場合、タスク割り当て一覧を返すこと', async () => {
      const rows = [{ task_id: 'task-001' }];
      mockPgp.any.mockResolvedValue(rows);

      const result = await checkWorkerAssignment('inst-001', 'proj-001', 'user-001', 'org-001');

      expect(mockPgp.any).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0].task_id).toBe('task-001');
    });

    test('割り当てが存在しない場合、空配列を返すこと', async () => {
      mockPgp.any.mockResolvedValue([]);

      const result = await checkWorkerAssignment('inst-001', 'proj-001', 'user-999', 'org-001');

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // insertAcknowledged
  // ==========================================================================
  describe('insertAcknowledged()', () => {
    test('正常系: 確認履歴を INSERT し、登録結果を返すこと', async () => {
      const row = { acknowledged_at: new Date('2026-06-01T10:00:00Z') };
      mockPgp.one.mockResolvedValue(row);

      const result = await insertAcknowledged('inst-001', 'proj-001', 'user-001', 'org-001');

      expect(mockPgp.one).toHaveBeenCalledTimes(1);
      expect(result.acknowledged_at).toBeInstanceOf(Date);
    });

    test('異常系: DB エラー時にエラーをスローすること', async () => {
      mockPgp.one.mockRejectedValue(new Error('DB error'));

      await expect(
        insertAcknowledged('inst-001', 'proj-001', 'user-001', 'org-001')
      ).rejects.toThrow('DB error');
    });
  });

  // ==========================================================================
  // insertAcknowledgedWithClient
  // ==========================================================================
  describe('insertAcknowledgedWithClient()', () => {
    test('正常系: PoolClient 経由で確認履歴を INSERT し、登録結果を返すこと', async () => {
      const row = { acknowledged_at: new Date('2026-06-01T10:00:00Z') };
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [row] }),
      };

      const result = await insertAcknowledgedWithClient(
        'inst-001',
        'proj-001',
        'user-001',
        'org-001',
        mockClient as any
      );

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(result.acknowledged_at).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // findUserNameFromAuth
  // ==========================================================================
  describe('findUserNameFromAuth()', () => {
    test('正常系: ユーザー名を返すこと', async () => {
      mockPgp.oneOrNone.mockResolvedValue({ user_name: 'テストユーザー' });

      const result = await findUserNameFromAuth('user-001', 'org-001');

      expect(result).toBe('テストユーザー');
    });

    test('ユーザーが存在しない場合、null を返すこと', async () => {
      mockPgp.oneOrNone.mockResolvedValue(null);

      const result = await findUserNameFromAuth('non-existent', 'org-001');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // findByProject
  // ==========================================================================
  describe('findByProject()', () => {
    test('正常系: プロジェクトの全指示一覧を返すこと', async () => {
      const rows = [
        {
          instruction_id: 'proj_001',
          organization_id: 'org-001',
          project_id: 'proj-001',
          method_id: 'method-001',
          target_type: 1,
          priority: 1,
          type: 1,
          task_no: null,
          transition_id: null,
          content: '指示内容A',
          instruction_status: 1,
          create_at: new Date(),
          create_user_id: 'user-001',
          update_at: new Date(),
          update_user_id: 'user-001',
        },
      ];
      mockPgp.any.mockResolvedValue(rows);

      const result = await findByProject('org-001', 'proj-001');

      expect(result).toHaveLength(1);
      expect(result[0].instruction_id).toBe('proj_001');
    });

    test('指示が存在しない場合、空配列を返すこと', async () => {
      mockPgp.any.mockResolvedValue([]);

      const result = await findByProject('org-001', 'proj-empty');

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // batchInsert
  // ==========================================================================
  describe('batchInsert()', () => {
    test('正常系: 複数の指示を一括 INSERT できること', async () => {
      // プロジェクト名取得
      mockPgp.oneOrNone.mockResolvedValue({ project_name: 'TestProj' });
      // 既存指示数取得
      mockPgp.one.mockResolvedValue({ count: '2' });

      const mockClient = {
        query: jest.fn().mockResolvedValue(undefined),
      };

      const instructions = [
        {
          methodId: 'method-001',
          content: '指示A',
          priority: 1,
          type: 1,
          targetType: 1,
          transitionId: null,
          taskNumber: null,
        },
        {
          methodId: 'method-001',
          content: '指示B',
          priority: 2,
          type: 1,
          targetType: 1,
          transitionId: 'trans-001',
          taskNumber: 1,
        },
      ];

      await batchInsert(mockClient, 'org-001', 'proj-001', 'user-001', instructions);

      // 2件の指示 INSERT が実行されること
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });

    test('指示が空配列の場合、INSERT は実行されないこと', async () => {
      mockPgp.oneOrNone.mockResolvedValue({ project_name: 'TestProj' });
      mockPgp.one.mockResolvedValue({ count: '0' });

      const mockClient = {
        query: jest.fn().mockResolvedValue(undefined),
      };

      await batchInsert(mockClient, 'org-001', 'proj-001', 'user-001', []);

      expect(mockClient.query).toHaveBeenCalledTimes(0);
    });

    test('異常系: プロジェクトが存在しない場合、エラーをスローすること', async () => {
      mockPgp.oneOrNone.mockResolvedValue(null);

      const mockClient = { query: jest.fn() };

      await expect(
        batchInsert(mockClient, 'org-001', 'non-existent', 'user-001', [
          { methodId: 'm', content: 'x', priority: 1, type: 1, targetType: 1, transitionId: null, taskNumber: null },
        ])
      ).rejects.toThrow('Project not found');
    });
  });
});

/**
 * projectInstructionRepository フェーズ２ テスト
 *
 * 分類A：新規テーブル（project_instruction）の全CRUD・ステータス管理・削除再採番確認
 *
 * @remarks
 * projectInstructionRepository は getPool()（pg.Pool）を使用するため、getPool をモック対象とする。
 */

import {
  insert,
  update,
  bulkUpdateStatus,
  findByProject,
  findById,
  deleteById,
  hasUnsentInstructions,
} from '../../../src/repositories/projectInstructionRepository';
import { getPool } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/sql/loader', () => ({
  loadSqlFile: jest.fn().mockResolvedValue('SELECT 1'),
}));

describe('projectInstructionRepository - Phase2 全CRUD・ステータス管理テスト', () => {
  let mockPool: { query: jest.Mock; connect: jest.Mock };

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
    };
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // insert
  // ==========================================================================
  describe('insert()', () => {
    test('正常系: 指示を INSERT し、登録結果を返すこと', async () => {
      const row = {
        organization_id: 'org-001',
        project_id: 'proj-001',
        experiment_instruction_id: 'proj_001',
        instruction_status: 0,
      };
      mockPool.query.mockResolvedValue({ rows: [row] });

      const result = await insert({
        organization_id: 'org-001',
        project_id: 'proj-001',
        experiment_instruction_id: 'proj_001',
        instruction_status: 0,
      } as any);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result.experiment_instruction_id).toBe('proj_001');
    });
  });

  // ==========================================================================
  // update
  // ==========================================================================
  describe('update()', () => {
    test('正常系: 未送信指示を更新し、更新結果を返すこと', async () => {
      const row = {
        organization_id: 'org-001',
        project_id: 'proj-001',
        experiment_instruction_id: 'proj_001',
        instruction_status: 0,
      };
      mockPool.query.mockResolvedValue({ rows: [row] });

      const result = await update({
        organization_id: 'org-001',
        project_id: 'proj-001',
        experiment_instruction_id: 'proj_001',
      } as any);

      expect(result.experiment_instruction_id).toBe('proj_001');
    });

    test('異常系: 見つからないか送信済の場合、エラーをスローすること', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        update({
          organization_id: 'org-001',
          project_id: 'proj-001',
          experiment_instruction_id: 'non-existent',
        } as any)
      ).rejects.toThrow('指示が見つからないか、既に送信済です');
    });
  });

  // ==========================================================================
  // bulkUpdateStatus
  // ==========================================================================
  describe('bulkUpdateStatus()', () => {
    test('正常系: 未送信指示を一括で送信済に更新し、更新件数を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 3 });

      const result = await bulkUpdateStatus('org-001', 'proj-001', 'user-001');

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toBe(3);
    });

    test('更新対象がない場合、0 を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rowCount: null });

      const result = await bulkUpdateStatus('org-001', 'proj-001', 'user-001');

      expect(result).toBe(0);
    });
  });

  // ==========================================================================
  // findByProject
  // ==========================================================================
  describe('findByProject()', () => {
    test('正常系: プロジェクト内の指示一覧を返すこと（ステータス指定なし）', async () => {
      const rows = [
        { organization_id: 'org-001', project_id: 'proj-001', experiment_instruction_id: 'proj_001', instruction_status: 0 },
        { organization_id: 'org-001', project_id: 'proj-001', experiment_instruction_id: 'proj_002', instruction_status: 1 },
      ];
      mockPool.query.mockResolvedValue({ rows });

      const result = await findByProject('org-001', 'proj-001');

      expect(result).toHaveLength(2);
    });

    test('正常系: ステータス指定で絞り込んで返すこと', async () => {
      const rows = [
        { organization_id: 'org-001', project_id: 'proj-001', experiment_instruction_id: 'proj_001', instruction_status: 0 },
      ];
      mockPool.query.mockResolvedValue({ rows });

      const result = await findByProject('org-001', 'proj-001', 0);

      expect(result).toHaveLength(1);
      expect(result[0].instruction_status).toBe(0);
    });

    test('指示が存在しない場合、空配列を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await findByProject('org-001', 'proj-empty');

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // findById
  // ==========================================================================
  describe('findById()', () => {
    test('正常系: 指示1件を返すこと', async () => {
      const row = {
        organization_id: 'org-001',
        project_id: 'proj-001',
        experiment_instruction_id: 'proj_001',
        instruction_status: 0,
      };
      mockPool.query.mockResolvedValue({ rows: [row] });

      const result = await findById('org-001', 'proj-001', 'proj_001');

      expect(result).not.toBeNull();
      expect(result!.experiment_instruction_id).toBe('proj_001');
    });

    test('存在しない場合、null を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await findById('org-001', 'proj-001', 'non-existent');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // deleteById
  // ==========================================================================
  describe('deleteById()', () => {
    test('正常系: 未送信指示を削除し、後続の連番を詰めて true を返すこと', async () => {
      const mockClient = {
        query: jest.fn(),
      };
      mockPool.connect.mockResolvedValue({
        ...mockClient,
        release: jest.fn(),
      });

      const mockClientRef = { query: jest.fn(), release: jest.fn() };
      mockPool.connect.mockResolvedValue(mockClientRef);

      // BEGIN
      mockClientRef.query.mockResolvedValueOnce(undefined);
      // 削除対象取得（未送信あり）
      mockClientRef.query.mockResolvedValueOnce({
        rows: [{ experiment_instruction_id: 'proj_002', instruction_status: 0 }],
      });
      // プロジェクト名取得
      mockClientRef.query.mockResolvedValueOnce({ rows: [{ project_name: 'proj' }] });
      // 後続の指示取得
      mockClientRef.query.mockResolvedValueOnce({
        rows: [
          { experiment_instruction_id: 'proj_003' },
          { experiment_instruction_id: 'proj_004' },
        ],
      });
      // 削除
      mockClientRef.query.mockResolvedValueOnce(undefined);
      // 再採番 UPDATE x2
      mockClientRef.query.mockResolvedValueOnce(undefined);
      mockClientRef.query.mockResolvedValueOnce(undefined);
      // COMMIT
      mockClientRef.query.mockResolvedValueOnce(undefined);

      const result = await deleteById('org-001', 'proj-001', 'proj_002');

      expect(result).toBe(true);
      expect(mockClientRef.release).toHaveBeenCalledTimes(1);
    });

    test('異常系: 見つからないまたは送信済の場合、false を返すこと', async () => {
      const mockClientRef = { query: jest.fn(), release: jest.fn() };
      mockPool.connect.mockResolvedValue(mockClientRef);

      // BEGIN
      mockClientRef.query.mockResolvedValueOnce(undefined);
      // 削除対象取得（なし）
      mockClientRef.query.mockResolvedValueOnce({ rows: [] });
      // ROLLBACK
      mockClientRef.query.mockResolvedValueOnce(undefined);

      const result = await deleteById('org-001', 'proj-001', 'non-existent');

      expect(result).toBe(false);
    });

    test('異常系: クエリエラー時に ROLLBACK し、エラーをスローすること', async () => {
      const mockClientRef = { query: jest.fn(), release: jest.fn() };
      mockPool.connect.mockResolvedValue(mockClientRef);

      // BEGIN
      mockClientRef.query.mockResolvedValueOnce(undefined);
      // 削除対象取得でエラー
      mockClientRef.query.mockRejectedValueOnce(new Error('DB error'));
      // ROLLBACK
      mockClientRef.query.mockResolvedValueOnce(undefined);

      await expect(deleteById('org-001', 'proj-001', 'proj_001')).rejects.toThrow('DB error');
      expect(mockClientRef.release).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // hasUnsentInstructions
  // ==========================================================================
  describe('hasUnsentInstructions()', () => {
    test('未送信指示が存在する場合、true を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ count: '2' }] });

      const result = await hasUnsentInstructions('org-001', 'proj-001');

      expect(result).toBe(true);
    });

    test('未送信指示が存在しない場合、false を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await hasUnsentInstructions('org-001', 'proj-001');

      expect(result).toBe(false);
    });
  });
});

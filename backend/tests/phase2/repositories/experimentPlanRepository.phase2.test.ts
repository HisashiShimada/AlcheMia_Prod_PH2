/**
 * experimentPlanRepository フェーズ２ テスト
 *
 * 分類A：新規テーブル（experiment_plan）の全CRUD確認
 *
 * @description
 * - experiment_plan テーブル（planned_values JSON管理）の全CRUD
 * - upsert（INSERT ON CONFLICT UPDATE）動作の確認
 * - project・method単位での取得・削除
 */

import {
  findByMethod,
  upsert,
  findByProject,
  findByMethodForTransaction,
  deleteByMethod,
} from '../../../src/repositories/experimentPlanRepository';
import { getPool } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/sql/loader', () => ({
  loadSqlFile: jest.fn().mockResolvedValue('SELECT 1'),
}));

describe('experimentPlanRepository - Phase2 新規テーブル CRUD テスト', () => {
  let mockPool: { query: jest.Mock };

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // findByMethod() - SELECT by method
  // ─────────────────────────────────────────────

  describe('findByMethod()', () => {
    test('正常系: method単位の実験計画一覧を返すこと', async () => {
      const rows = [
        {
          organization_id: 'org-001',
          project_id: 'proj-001',
          method_id: 'method-001',
          task_no: 1,
          planned_values: { temperature: 25, pressure: 1.0 },
          create_user_id: null,
          create_at: new Date(),
          update_user_id: null,
          update_at: new Date(),
        },
      ];
      mockPool.query.mockResolvedValue({ rows, rowCount: rows.length });

      const result = await findByMethod('org-001', 'proj-001', 'method-001');

      expect(result[0].method_id).toBe('method-001');
      expect(result[0].planned_values).toEqual({ temperature: 25, pressure: 1.0 });
    });

    test('存在しない場合、空配列を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await findByMethod('org-001', 'proj-001', 'non-existent');
      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────
  // upsert() - INSERT ON CONFLICT UPDATE
  // ─────────────────────────────────────────────

  describe('upsert()', () => {
    test('正常系: 新規レコードを INSERT できること', async () => {
      // planned_values は ExperimentPlanValues 型（TransitionPlanValues のマップ）のためテストデータは as any でキャスト
      const insertData = {
        organization_id: 'org-001',
        project_id: 'proj-001',
        method_id: 'method-001',
        task_no: 1,
        planned_values: { 'ns1:Temperature': { value: 25, unit: '℃' } },
        create_user_id: null,
        create_at: new Date(),
        update_user_id: null,
        update_at: new Date(),
      } as any;
      mockPool.query.mockResolvedValue({ rows: [insertData], rowCount: 1 });

      const result = await upsert(insertData);

      expect(result.method_id).toBe('method-001');
    });

    test('正常系: 既存レコードを UPDATE できること（upsert）', async () => {
      const updateData = {
        organization_id: 'org-001',
        project_id: 'proj-001',
        method_id: 'method-001',
        task_no: 1,
        planned_values: { 'ns1:Temperature': { value: 30, unit: '℃' } },
        create_user_id: null,
        create_at: new Date(),
        update_user_id: null,
        update_at: new Date(),
      } as any;
      mockPool.query.mockResolvedValue({ rows: [updateData], rowCount: 1 });

      const result = await upsert(updateData);

      expect((result.planned_values as any)?.['ns1:Temperature']?.value).toBe(30);
    });

    test('planned_values が未指定でも動作すること', async () => {
      const minData = {
        organization_id: 'org-001',
        project_id: 'proj-001',
        method_id: 'method-002',
        task_no: 2,
        planned_values: null,
        create_user_id: null,
        create_at: new Date(),
        update_user_id: null,
        update_at: new Date(),
      } as any;
      mockPool.query.mockResolvedValue({ rows: [minData], rowCount: 1 });

      const result = await upsert(minData);

      expect(result.method_id).toBe('method-002');
    });
  });

  // ─────────────────────────────────────────────
  // findByProject() - SELECT by project
  // ─────────────────────────────────────────────

  describe('findByProject()', () => {
    test('正常系: プロジェクト配下の全実験計画を返すこと', async () => {
      const rows = [
        { organization_id: 'org-001', project_id: 'proj-001', method_id: 'method-001', task_no: 1, planned_values: { temperature: 25 }, create_user_id: null, create_at: new Date(), update_user_id: null, update_at: new Date() },
        { organization_id: 'org-001', project_id: 'proj-001', method_id: 'method-002', task_no: 1, planned_values: { temperature: 30 }, create_user_id: null, create_at: new Date(), update_user_id: null, update_at: new Date() },
      ];
      mockPool.query.mockResolvedValue({ rows, rowCount: rows.length });

      const result = await findByProject('org-001', 'proj-001');

      expect(result).toHaveLength(2);
      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), ['org-001', 'proj-001']);
    });

    test('実験計画が存在しない場合、空配列を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await findByProject('org-001', 'proj-empty');
      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────
  // deleteByMethod() - DELETE
  // ─────────────────────────────────────────────

  describe('deleteByMethod()', () => {
    test('正常系: method単位の実験計画を削除できること', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 1 });

      const count = await deleteByMethod('org-001', 'proj-001', 'method-001');

      expect(count).toBe(1);
    });

    test('対象が存在しない場合、0 を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const count = await deleteByMethod('org-001', 'proj-001', 'non-existent');
      expect(count).toBe(0);
    });
  });
});

/**
 * projectRepository フェーズ２ テスト
 *
 * 分類A：既存機能への影響箇所 回帰テスト
 * 対象変更: フェーズ２で department_cd → organization_group_cd リネーム後の対応
 *
 * @description
 * - `findAllWithDetails()` に visibleGroupCds・editableGroupCds パラメータが追加された
 * - `findWithOwnerAndOrgGroup()` が department → organization_group 対応
 * - `deleteProjectRelatedData()` に instruction_acknowledged_history・project_instruction の削除が追加された
 */

import {
  findAllWithDetails,
  findWithOwnerAndOrgGroup,
  deleteProjectRelatedData,
  getById,
  update,
} from '../../../src/repositories/projectRepository';
import { getPool, getPgp } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/sql/loader', () => ({
  loadSqlFile: jest.fn().mockResolvedValue('SELECT 1'),
}));

describe('projectRepository - Phase2 回帰テスト', () => {
  let mockPool: { query: jest.Mock; connect: jest.Mock };
  let mockPgp: { any: jest.Mock; one: jest.Mock; oneOrNone: jest.Mock; result: jest.Mock };
  let mockClient: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    mockClient = { query: jest.fn(), release: jest.fn() };
    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient),
    };
    mockPgp = {
      any: jest.fn(),
      one: jest.fn(),
      oneOrNone: jest.fn(),
      result: jest.fn(),
    };
    (getPool as jest.Mock).mockReturnValue(mockPool);
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // findAllWithDetails() - organization_group_cd 対応
  // ─────────────────────────────────────────────

  describe('findAllWithDetails()', () => {
    test('visibleGroupCds・editableGroupCds が正しく SQL パラメータとして渡されること', async () => {
      mockPgp.any.mockResolvedValue([]);

      await findAllWithDetails(
        'org-001',
        false,
        'create_at',
        'desc',
        ['group-A', 'group-B'],  // visibleGroupCds
        ['group-A']               // editableGroupCds
      );

      expect(mockPgp.any).toHaveBeenCalledWith(
        expect.any(String),
        ['org-001', false, ['group-A', 'group-B'], ['group-A']]
      );
    });

    test('visibleGroupCds・editableGroupCds が null の場合（全件返す）も動作すること', async () => {
      mockPgp.any.mockResolvedValue([]);

      await findAllWithDetails('org-001', true, 'create_at', 'asc', null, null);

      expect(mockPgp.any).toHaveBeenCalledWith(
        expect.any(String),
        ['org-001', true, null, null]
      );
    });

    test('不正なソートカラムはデフォルト（p.create_at）に置き換えられること', async () => {
      mockPgp.any.mockResolvedValue([]);

      await findAllWithDetails('org-001', false, 'invalid_column', 'desc');

      const calledQuery = mockPgp.any.mock.calls[0][0] as string;
      // 不正なカラムが SQL インジェクションに使われないこと
      expect(calledQuery).not.toContain('invalid_column');
      expect(calledQuery).toContain('p.create_at');
    });

    test('正常系: プロジェクト一覧を返すこと', async () => {
      const expectedProjects = [
        { project_id: 'proj-001', project_name: 'テストプロジェクト', organization_group_cd: 'group-A' },
        { project_id: 'proj-002', project_name: 'プロジェクトB', organization_group_cd: 'group-B' },
      ];
      mockPgp.any.mockResolvedValue(expectedProjects);

      const result = await findAllWithDetails('org-001', false);

      expect(result).toHaveLength(2);
      expect(result[0].organization_group_cd).toBe('group-A');
    });
  });

  // ─────────────────────────────────────────────
  // findWithOwnerAndOrgGroup() - department → organization_group 対応
  // ─────────────────────────────────────────────

  describe('findWithOwnerAndOrgGroup()', () => {
    test('正常系: organization_group 対応後のプロジェクト情報を返すこと', async () => {
      const expectedRow = {
        project_id: 'proj-001',
        project_name: 'テストプロジェクト',
        organization_group_cd: 'group-A',
        organization_group_name: 'グループA',
        owner_user_id: 'user-001',
        owner_user_name: 'テストユーザー',
      };
      mockPgp.oneOrNone.mockResolvedValue(expectedRow);

      const result = await findWithOwnerAndOrgGroup('proj-001', 'org-001');

      expect(result).toEqual(expectedRow);
      expect(mockPgp.oneOrNone).toHaveBeenCalledWith(
        expect.any(String),
        ['proj-001', 'org-001']
      );
    });

    test('プロジェクトが存在しない場合、null を返すこと', async () => {
      mockPgp.oneOrNone.mockResolvedValue(null);

      const result = await findWithOwnerAndOrgGroup('non-existent', 'org-001');

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // deleteProjectRelatedData() - フェーズ２追加テーブルの削除確認
  // ─────────────────────────────────────────────

  describe('deleteProjectRelatedData()', () => {
    test('instruction_acknowledged_history・project_instruction が削除対象に含まれること', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await deleteProjectRelatedData('org-001', 'proj-001', mockClient as any);

      // 削除対象テーブルの数（9テーブル分のクエリが実行されること）
      expect(mockClient.query).toHaveBeenCalledTimes(9);
    });

    test('DB エラー時に例外がスローされること', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // project_task_detail
        .mockRejectedValueOnce(new Error('DB error')); // template_data

      await expect(
        deleteProjectRelatedData('org-001', 'proj-001', mockClient as any)
      ).rejects.toThrow('DB error');
    });
  });

  // ─────────────────────────────────────────────
  // getById() - 既存メソッドへの影響確認
  // ─────────────────────────────────────────────

  describe('getById()', () => {
    test('正常系: プロジェクトが見つかった場合、データを返すこと', async () => {
      const expectedRow = {
        organization_id: 'org-001',
        project_id: 'proj-001',
        project_name: 'テストプロジェクト',
        organization_group_cd: 'group-A',
      };
      mockPool.query.mockResolvedValue({ rows: [expectedRow] });

      const result = await getById('proj-001', 'org-001');

      expect(result).toEqual(expectedRow);
    });

    test('プロジェクトが存在しない場合、null を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await getById('non-existent', 'org-001');

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // update() - organization_group_cd を含む動的クエリ構築
  // ─────────────────────────────────────────────

  describe('update()', () => {
    test('organization_group_cd を含むデータで UPDATE クエリが構築されること', async () => {
      const updateData = {
        project_id: 'proj-001',
        organization_id: 'org-001',
        project_name: '更新プロジェクト',
        organization_group_cd: 'group-B',
      };
      mockPool.query.mockResolvedValue({ rows: [updateData] });

      const result = await update(updateData as any);

      expect(result).toEqual(updateData);
      const calledQuery = mockPool.query.mock.calls[0][0] as string;
      expect(calledQuery).toContain('organization_group_cd');
    });

    test('対象行が存在しない場合、Error をスローすること', async () => {
      const updateData = {
        project_id: 'non-existent',
        organization_id: 'org-001',
        project_name: '存在しないプロジェクト',
      };
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(update(updateData as any)).rejects.toThrow('No rows updated');
    });
  });
});

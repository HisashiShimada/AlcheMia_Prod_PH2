/**
 * organizationGroupRepository フェーズ２ テスト
 *
 * 分類A：新規テーブル（organization_group / organization_group_user）の全CRUD・is_active 制御確認
 *
 * @remarks
 * organizationGroupRepository は getPool()（pg.Pool）を使用するため、getPool をモック対象とする。
 */

import {
  findAll,
  findById,
  create,
  update,
  updateActiveStatus,
  findByUser,
  findDescendantCds,
  findMembersByGroupCd,
  insertMember,
  setMembers,
} from '../../../src/repositories/organizationGroupRepository';
import { getPool } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/sql/loader', () => ({
  loadSqlFile: jest.fn().mockResolvedValue('SELECT 1'),
}));

describe('organizationGroupRepository - Phase2 全CRUD・is_active テスト', () => {
  let mockPool: { query: jest.Mock };

  beforeEach(() => {
    mockPool = { query: jest.fn() };
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll()', () => {
    test('正常系: 組織グループ一覧を返すこと', async () => {
      const rows = [
        { organization_group_cd: 'group-A', organization_group_name: 'グループA', is_active: true },
        { organization_group_cd: 'group-B', organization_group_name: 'グループB', is_active: true },
      ];
      mockPool.query.mockResolvedValue({ rows });

      const result = await findAll('org-001');

      expect(result).toHaveLength(2);
      expect(result[0].organization_group_cd).toBe('group-A');
    });

    test('グループが存在しない場合、空配列を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      const result = await findAll('org-empty');
      expect(result).toEqual([]);
    });
  });

  describe('findById()', () => {
    test('正常系: グループが見つかった場合、データを返すこと', async () => {
      const rows = [{ organization_group_cd: 'group-A', organization_group_name: 'グループA', is_active: true }];
      mockPool.query.mockResolvedValue({ rows });

      const result = await findById('org-001', 'group-A');

      expect(result?.organization_group_cd).toBe('group-A');
    });

    test('存在しない場合、null を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      const result = await findById('org-001', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('create()', () => {
    test('正常系: 組織グループを INSERT し、登録結果を返すこと', async () => {
      const rows = [{ organization_group_cd: 'group-C', organization_group_name: 'グループC', is_active: true }];
      mockPool.query.mockResolvedValue({ rows });

      const result = await create({
        organization_id: 'org-001',
        organization_group_cd: 'group-C',
        organization_group_name: 'グループC',
        chief_user_id: 'user-001',
      });

      expect(result.organization_group_cd).toBe('group-C');
    });
  });

  describe('update()', () => {
    test('正常系: 組織グループを更新し、更新結果を返すこと', async () => {
      const rows = [{ organization_group_cd: 'group-A', organization_group_name: 'グループA（更新済み）', is_active: true }];
      mockPool.query.mockResolvedValue({ rows });

      const result = await update({
        organization_id: 'org-001',
        organization_group_cd: 'group-A',
        organization_group_name: 'グループA（更新済み）',
        chief_user_id: 'user-001',
      });

      expect(result?.organization_group_name).toBe('グループA（更新済み）');
    });

    test('対象が存在しない場合、null を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      const result = await update({
        organization_id: 'org-001',
        organization_group_cd: 'non-existent',
        organization_group_name: '',
        chief_user_id: 'user-001',
      });
      expect(result).toBeNull();
    });
  });

  describe('updateActiveStatus()', () => {
    test('正常系: is_active を false に更新できること', async () => {
      const rows = [{ organization_group_cd: 'group-A', is_active: false }];
      mockPool.query.mockResolvedValue({ rows });

      const result = await updateActiveStatus('org-001', 'group-A', false, 'user-001');

      expect(result?.is_active).toBe(false);
    });

    test('正常系: is_active を true に復元できること', async () => {
      const rows = [{ organization_group_cd: 'group-A', is_active: true }];
      mockPool.query.mockResolvedValue({ rows });

      const result = await updateActiveStatus('org-001', 'group-A', true, 'user-001');

      expect(result?.is_active).toBe(true);
    });

    test('対象が存在しない場合、null を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      const result = await updateActiveStatus('org-001', 'non-existent', false, 'user-001');
      expect(result).toBeNull();
    });
  });

  describe('findByUser()', () => {
    test('正常系: ユーザーが所属するグループ一覧を返すこと', async () => {
      const rows = [{ organization_group_cd: 'group-A', organization_group_name: 'グループA' }];
      mockPool.query.mockResolvedValue({ rows });

      const result = await findByUser('org-001', 'user-001');

      expect(result).toHaveLength(1);
    });
  });

  describe('findDescendantCds()', () => {
    test('正常系: 子孫グループのCD一覧を返すこと', async () => {
      const rows = [{ organization_group_cd: 'group-B' }, { organization_group_cd: 'group-C' }];
      mockPool.query.mockResolvedValue({ rows });

      const result = await findDescendantCds('org-001', ['group-A']);

      expect(result).toHaveLength(2);
    });
  });

  describe('insertMember()', () => {
    test('正常系: トランザクションクライアント経由でメンバーを追加できること', async () => {
      const mockClient = { query: jest.fn().mockResolvedValue({ rows: [] }) };

      await insertMember('org-001', 'group-A', 'user-002', mockClient as any);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('setMembers()', () => {
    test('正常系: トランザクションクライアント経由でメンバーを一括置換できること', async () => {
      const mockClient = { query: jest.fn().mockResolvedValue({ rows: [] }) };

      await setMembers('org-001', 'group-A', ['user-001', 'user-002'], mockClient as any);

      expect(mockClient.query.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('findMembersByGroupCd()', () => {
    test('正常系: グループのメンバー一覧を返すこと', async () => {
      const rows = [
        { user_id: 'user-001', user_name: 'ユーザー1' },
        { user_id: 'user-002', user_name: 'ユーザー2' },
      ];
      mockPool.query.mockResolvedValue({ rows });

      const result = await findMembersByGroupCd('org-001', 'group-A');

      expect(result).toHaveLength(2);
    });
  });
});

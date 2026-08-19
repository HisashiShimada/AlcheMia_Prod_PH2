/**
 * departmentUnitRepository フェーズ２ テスト
 *
 * 分類A：新規テーブル（department_unit）の全CRUD・メンバー管理確認
 *
 * @remarks
 * departmentUnitRepository は getPool()（pg.Pool）を使用するため、getPool をモック対象とする。
 * updateMembers はトランザクション（connect/BEGIN/COMMIT/ROLLBACK）を使用する。
 */

import {
  create,
  findAllByOrganization,
  findMembersByUnitId,
  findUsersByOrganization,
  updateMembers,
} from '../../../src/repositories/departmentUnitRepository';
import { getPool } from '../../../src/database/db';

jest.mock('../../../src/database/db');

describe('departmentUnitRepository - Phase2 全CRUD・メンバー管理テスト', () => {
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
  // create
  // ==========================================================================
  describe('create()', () => {
    test('正常系: 部署ユニットを INSERT し、登録結果を返すこと', async () => {
      const row = {
        organizationId: 'org-001',
        departmentUnitId: 'unit-uuid-001',
        departmentCd: 'dept-A',
        unitName: '開発チームA',
        layer: 1,
        description: '説明',
        isActive: true,
      };
      mockPool.query.mockResolvedValue({ rows: [row] });

      const result = await create({
        organizationId: 'org-001',
        departmentCd: 'dept-A',
        unitName: '開発チームA',
        layer: 1,
        description: '説明',
        createUserId: 'user-001',
      });

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result.unitName).toBe('開発チームA');
      expect(result.isActive).toBe(true);
    });

    test('正常系: departmentCd・description・createUserId が省略可能であること', async () => {
      const row = {
        organizationId: 'org-001',
        departmentUnitId: 'unit-uuid-002',
        departmentCd: null,
        unitName: '開発チームB',
        layer: 2,
        description: null,
        isActive: true,
      };
      mockPool.query.mockResolvedValue({ rows: [row] });

      const result = await create({
        organizationId: 'org-001',
        unitName: '開発チームB',
        layer: 2,
      });

      expect(result.departmentCd).toBeNull();
      expect(result.description).toBeNull();
    });
  });

  // ==========================================================================
  // findAllByOrganization
  // ==========================================================================
  describe('findAllByOrganization()', () => {
    test('正常系: 組織内の全部署ユニット一覧を返すこと', async () => {
      const rows = [
        {
          organizationId: 'org-001',
          departmentUnitId: 'unit-001',
          departmentCd: 'dept-A',
          unitName: 'チームA',
          layer: 1,
          description: null,
          isActive: true,
        },
        {
          organizationId: 'org-001',
          departmentUnitId: 'unit-002',
          departmentCd: 'dept-A',
          unitName: 'チームB',
          layer: 2,
          description: '説明B',
          isActive: true,
        },
      ];
      mockPool.query.mockResolvedValue({ rows });

      const result = await findAllByOrganization('org-001');

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0].unitName).toBe('チームA');
      expect(result[1].layer).toBe(2);
    });

    test('部署ユニットが存在しない場合、空配列を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await findAllByOrganization('org-empty');

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // findMembersByUnitId
  // ==========================================================================
  describe('findMembersByUnitId()', () => {
    test('正常系: ユニットのメンバー一覧を返すこと', async () => {
      const rows = [
        { userId: 'user-001', userName: 'ユーザー1', departmentUnitId: 'unit-001' },
        { userId: 'user-002', userName: 'ユーザー2', departmentUnitId: 'unit-001' },
      ];
      mockPool.query.mockResolvedValue({ rows });

      const result = await findMembersByUnitId('org-001', 'unit-001');

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user-001');
    });

    test('メンバーが存在しない場合、空配列を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await findMembersByUnitId('org-001', 'unit-empty');

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // findUsersByOrganization
  // ==========================================================================
  describe('findUsersByOrganization()', () => {
    test('正常系: 組織内の全ユーザー一覧を返すこと', async () => {
      const rows = [
        { userId: 'user-001', userName: 'ユーザー1', departmentUnitId: 'unit-001' },
        { userId: 'user-002', userName: 'ユーザー2', departmentUnitId: null },
        { userId: 'user-003', userName: 'ユーザー3', departmentUnitId: 'unit-002' },
      ];
      mockPool.query.mockResolvedValue({ rows });

      const result = await findUsersByOrganization('org-001');

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(3);
      expect(result[1].departmentUnitId).toBeNull();
    });

    test('ユーザーが存在しない場合、空配列を返すこと', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await findUsersByOrganization('org-empty');

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // updateMembers
  // ==========================================================================
  describe('updateMembers()', () => {
    test('正常系: メンバーを一括更新し、トランザクションが COMMIT されること', async () => {
      const mockClient = { query: jest.fn(), release: jest.fn() };
      mockPool.connect.mockResolvedValue(mockClient);

      // BEGIN
      mockClient.query.mockResolvedValueOnce(undefined);
      // 既存メンバーをリセット
      mockClient.query.mockResolvedValueOnce(undefined);
      // 新しいメンバーを設定
      mockClient.query.mockResolvedValueOnce(undefined);
      // COMMIT
      mockClient.query.mockResolvedValueOnce(undefined);

      await updateMembers('org-001', 'unit-001', ['user-001', 'user-002']);

      expect(mockClient.release).toHaveBeenCalledTimes(1);
      // BEGIN + リセット + 設定 + COMMIT = 4回
      expect(mockClient.query).toHaveBeenCalledTimes(4);
    });

    test('正常系: メンバーが空配列の場合、リセットのみ実行されること', async () => {
      const mockClient = { query: jest.fn(), release: jest.fn() };
      mockPool.connect.mockResolvedValue(mockClient);

      // BEGIN
      mockClient.query.mockResolvedValueOnce(undefined);
      // 既存メンバーをリセット
      mockClient.query.mockResolvedValueOnce(undefined);
      // COMMIT
      mockClient.query.mockResolvedValueOnce(undefined);

      await updateMembers('org-001', 'unit-001', []);

      // BEGIN + リセット + COMMIT = 3回（新しいメンバー設定なし）
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    test('異常系: クエリエラー時に ROLLBACK し、エラーをスローすること', async () => {
      const mockClient = { query: jest.fn(), release: jest.fn() };
      mockPool.connect.mockResolvedValue(mockClient);

      // BEGIN
      mockClient.query.mockResolvedValueOnce(undefined);
      // 既存メンバーリセットでエラー
      mockClient.query.mockRejectedValueOnce(new Error('DB error'));
      // ROLLBACK
      mockClient.query.mockResolvedValueOnce(undefined);

      await expect(
        updateMembers('org-001', 'unit-001', ['user-001'])
      ).rejects.toThrow('DB error');

      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });
});

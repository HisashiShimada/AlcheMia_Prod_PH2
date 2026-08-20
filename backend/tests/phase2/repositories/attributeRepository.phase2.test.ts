/**
 * attributeRepository フェーズ２ テスト
 *
 * 分類A：既存機能への影響箇所 回帰テスト
 * 対象変更: フェーズ２で department_cd → organization_group_cd リネーム後の対応
 *
 * @description
 * - `AttributeMaster` 型に `organization_group_cd` フィールドが追加された
 * - `findAllWithFilters()` に `organizationGroupCds` フィルタパラメータが追加された
 * - `create()` に `organizationGroupCd` パラメータが追加された
 * - `update()` に `organizationGroupCd` パラメータが追加された
 */

import {
  findAll,
  findAllWithFilters,
  create,
  update,
  findByPk,
} from '../../../src/repositories/attributeRepository';
import { getPgp } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/sql/loader', () => ({
  loadSqlFile: jest.fn().mockResolvedValue('SELECT 1\nORDER BY'),
}));

describe('attributeRepository - Phase2 回帰テスト', () => {
  let mockPgp: { any: jest.Mock; one: jest.Mock; oneOrNone: jest.Mock };

  beforeEach(() => {
    mockPgp = {
      any: jest.fn(),
      one: jest.fn(),
      oneOrNone: jest.fn(),
    };
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // findAllWithFilters() - organization_group_cd フィルタ対応
  // ─────────────────────────────────────────────

  describe('findAllWithFilters()', () => {
    test('organizationGroupCds フィルタが指定された場合、SQL に ANY 条件が追加されること', async () => {
      mockPgp.any.mockResolvedValue([]);

      await findAllWithFilters('org-001', {
        organizationGroupCds: ['group-A', 'group-B'],
      });

      expect(mockPgp.any).toHaveBeenCalledTimes(1);
      const calledQuery = mockPgp.any.mock.calls[0][0] as string;
      const calledValues = mockPgp.any.mock.calls[0][1] as any[];

      // organization_group_cd フィルタが適用されること
      expect(calledQuery).toContain('organization_group_cd');
      expect(calledQuery).toContain('ANY(');
      // 配列として渡されること
      expect(calledValues).toContain(['group-A', 'group-B']);
    });

    test('organizationGroupCds が空配列の場合、グループフィルタは適用されないこと', async () => {
      mockPgp.any.mockResolvedValue([]);

      await findAllWithFilters('org-001', {
        organizationGroupCds: [],
      });

      const calledQuery = mockPgp.any.mock.calls[0][0] as string;
      // 空配列のときは ANY フィルタが追加されないこと
      expect(calledQuery).not.toContain('ANY(');
    });

    test('フィルタなしの場合、organization_id のみで取得されること', async () => {
      mockPgp.any.mockResolvedValue([]);

      await findAllWithFilters('org-001', {});

      expect(mockPgp.any).toHaveBeenCalledTimes(1);
      const calledValues = mockPgp.any.mock.calls[0][1] as any[];
      // 最初のパラメータが organization_id であること
      expect(calledValues[0]).toBe('org-001');
    });

    test('isActive フィルタが組み合わせで動作すること', async () => {
      mockPgp.any.mockResolvedValue([]);

      await findAllWithFilters('org-001', {
        isActive: true,
        organizationGroupCds: ['group-A'],
      });

      const calledQuery = mockPgp.any.mock.calls[0][0] as string;
      expect(calledQuery).toContain('is_active');
      expect(calledQuery).toContain('organization_group_cd');
    });

    test('正常系: organization_group_cd を含むデータを返すこと', async () => {
      const expectedData = [
        {
          attribute_name: '重さ',
          attribute_value: 'kg',
          attribute_remark: null,
          organization_group_cd: 'group-A',
          organization_group_name: 'グループA',
          is_active: true,
          update_at: new Date(),
        },
      ];
      mockPgp.any.mockResolvedValue(expectedData);

      const result = await findAllWithFilters('org-001', {});

      expect(result[0].organization_group_cd).toBe('group-A');
    });
  });

  // ─────────────────────────────────────────────
  // create() - organizationGroupCd パラメータ追加
  // ─────────────────────────────────────────────

  describe('create()', () => {
    test('organizationGroupCd が正しいパラメータ位置（第5番目）で渡されること', async () => {
      const expectedRow = {
        attribute_name: '重さ',
        attribute_value: 'kg',
        organization_group_cd: 'group-A',
        is_active: true,
      };
      mockPgp.one.mockResolvedValue(expectedRow);

      await create(
        'org-001',
        {
          attributeName: '重さ',
          attributeValue: 'kg',
          organizationGroupCd: 'group-A',
          isActive: true,
        },
        'user-001'
      );

      const calledValues = mockPgp.one.mock.calls[0][1] as any[];
      expect(calledValues[0]).toBe('org-001');         // organization_id
      expect(calledValues[1]).toBe('重さ');             // attribute_name
      expect(calledValues[2]).toBe('kg');               // attribute_value
      expect(calledValues[3]).toBeNull();               // attribute_remark
      expect(calledValues[4]).toBe('group-A');          // organization_group_cd（フェーズ２追加）
      expect(calledValues[5]).toBe(true);               // is_active
      expect(calledValues[6]).toBe('user-001');         // user_id
    });

    test('organizationGroupCd が未指定の場合、null が渡されること', async () => {
      mockPgp.one.mockResolvedValue({});

      await create('org-001', { attributeName: '重さ', attributeValue: 'kg' }, 'user-001');

      const calledValues = mockPgp.one.mock.calls[0][1] as any[];
      expect(calledValues[4]).toBeNull(); // organization_group_cd = null
    });
  });

  // ─────────────────────────────────────────────
  // update() - organizationGroupCd パラメータ追加
  // ─────────────────────────────────────────────

  describe('update()', () => {
    test('organizationGroupCd が正しいパラメータ位置（第5番目）で渡されること', async () => {
      const expectedRow = {
        attribute_name: '重さ',
        attribute_value: 'kg',
        organization_group_cd: 'group-B',
        is_active: true,
      };
      mockPgp.oneOrNone.mockResolvedValue(expectedRow);

      await update(
        'org-001',
        '重さ',
        'kg',
        { organizationGroupCd: 'group-B', isActive: true },
        'user-001'
      );

      const calledValues = mockPgp.oneOrNone.mock.calls[0][1] as any[];
      expect(calledValues[0]).toBe('org-001');   // organization_id
      expect(calledValues[1]).toBe('重さ');       // attribute_name
      expect(calledValues[2]).toBe('kg');         // attribute_value
      expect(calledValues[3]).toBeNull();         // attribute_remark
      expect(calledValues[4]).toBe('group-B');   // organization_group_cd（フェーズ２追加）
      expect(calledValues[5]).toBe(true);         // is_active
      expect(calledValues[6]).toBe('user-001');  // user_id
    });

    test('対象が存在しない場合、null を返すこと', async () => {
      mockPgp.oneOrNone.mockResolvedValue(null);

      const result = await update('org-001', 'non-existent', 'value', {}, 'user-001');

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // findAll() - 既存メソッドへの影響確認
  // ─────────────────────────────────────────────

  describe('findAll()', () => {
    test('正常系: organization_group_cd フィールドを含むデータを返すこと', async () => {
      const expectedData = [
        {
          attribute_name: '重さ',
          attribute_value: 'kg',
          organization_group_cd: 'group-A',
          organization_group_name: 'グループA',
          is_active: true,
        },
      ];
      mockPgp.any.mockResolvedValue(expectedData);

      const result = await findAll('org-001');

      expect(result).toHaveLength(1);
      expect(result[0].organization_group_cd).toBe('group-A');
      expect(mockPgp.any).toHaveBeenCalledWith(expect.any(String), ['org-001']);
    });
  });
});

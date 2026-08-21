/**
 * namespaceTermRepository フェーズ２ テスト
 *
 * 分類A：新規テーブル（namespace / prefix / namespace_term）の全CRUD確認
 *
 * @description
 * フェーズ２で新規追加された名前空間管理テーブル群に対する
 * CRUD操作・重複チェック・スコープ検索の動作を確認する。
 */

import {
  findAllByOrganization,
  create,
  update,
  remove,
  createNamespace,
  removeNamespace,
  toggleActive,
  existsByScopeKey,
  findUserOrgGroupCd,
} from '../../../src/repositories/namespaceTermRepository';
import { getPgp } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/sql/loader', () => ({
  loadSqlFile: jest.fn().mockResolvedValue('SELECT 1'),
}));

describe('namespaceTermRepository - Phase2 新規テーブル CRUD テスト', () => {
  let mockPgp: {
    any: jest.Mock;
    one: jest.Mock;
    oneOrNone: jest.Mock;
    none: jest.Mock;
    result: jest.Mock;
  };

  beforeEach(() => {
    mockPgp = {
      any: jest.fn(),
      one: jest.fn(),
      oneOrNone: jest.fn(),
      none: jest.fn(),
      result: jest.fn(),
    };
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // findAllByOrganization() - SELECT
  // ─────────────────────────────────────────────

  describe('findAllByOrganization()', () => {
    test('正常系: 組織の全用語一覧を返すこと', async () => {
      const expected = [
        { qname: 'ns1:Temperature', prefix: 'ns1', localName: 'Temperature', isActive: true },
        { qname: 'ns1:Pressure', prefix: 'ns1', localName: 'Pressure', isActive: true },
      ];
      mockPgp.any.mockResolvedValue(expected);

      const result = await findAllByOrganization('org-001');

      expect(result).toHaveLength(2);
      expect(result[0].qname).toBe('ns1:Temperature');
      expect(mockPgp.any).toHaveBeenCalledWith(expect.any(String), ['org-001']);
    });

    test('用語が登録されていない場合、空配列を返すこと', async () => {
      mockPgp.any.mockResolvedValue([]);
      const result = await findAllByOrganization('org-empty');
      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────
  // create() - INSERT（重複チェック含む）
  // ─────────────────────────────────────────────

  describe('create()', () => {
    const baseData = {
      organizationId: 'org-001',
      prefix: 'ns1',
      localName: 'Temperature',
      displayName: '温度',
      description: '測定温度',
      typeHint: 'FloatValue',
      unitHint: '℃',
    };

    test('正常系: 新規用語を INSERT し、登録結果を返すこと', async () => {
      const namespaceRow = { namespace_id: 'NS0001' };
      const expectedTerm = {
        qname: 'ns1:Temperature',
        prefix: 'ns1',
        localName: 'Temperature',
        isActive: true,
      };

      // prefix → namespace_id 取得
      mockPgp.oneOrNone
        .mockResolvedValueOnce(namespaceRow)  // findPrefixNamespaceId
        .mockResolvedValueOnce(null)           // findTermByKey（重複なし）
        .mockResolvedValueOnce(expectedTerm);  // findTermByKey（登録後）
      mockPgp.none.mockResolvedValue(undefined);
      mockPgp.one.mockResolvedValue(expectedTerm);

      const result = await create(baseData);

      expect(result.qname).toBe('ns1:Temperature');
    });

    test('prefix に対応する namespace_id が存在しない場合、Error をスローすること', async () => {
      mockPgp.oneOrNone.mockResolvedValueOnce(null); // namespace_id 未発見

      await expect(create(baseData)).rejects.toThrow(
        `prefix "${baseData.prefix}" に対応する namespace_id が見つかりません`
      );
    });

    test('同名の用語が既に存在する場合、409 エラーをスローすること', async () => {
      mockPgp.oneOrNone
        .mockResolvedValueOnce({ namespace_id: 'NS0001' }) // prefix found
        .mockResolvedValueOnce({ qname: 'ns1:Temperature' }) // 重複あり
        .mockResolvedValueOnce({ scope_name: 'グループA' }); // scope_name

      await expect(create(baseData)).rejects.toMatchObject({
        statusCode: 409,
        code: 'E6005',
      });
    });
  });

  // ─────────────────────────────────────────────
  // update() - UPDATE
  // ─────────────────────────────────────────────

  describe('update()', () => {
    test('正常系: 用語を更新し、更新後のデータを返すこと', async () => {
      const updatedTerm = {
        qname: 'ns1:Temperature',
        displayName: '温度（更新済み）',
        isActive: true,
      };
      mockPgp.result.mockResolvedValue({ rowCount: 1 });
      mockPgp.oneOrNone.mockResolvedValue(updatedTerm);

      const result = await update('org-001', 'ns1', 'Temperature', {
        displayName: '温度（更新済み）',
      });

      expect(result?.displayName).toBe('温度（更新済み）');
    });

    test('対象用語が存在しない場合、null を返すこと', async () => {
      mockPgp.result.mockResolvedValue({ rowCount: 0 });

      const result = await update('org-001', 'ns1', 'NonExistent', {});

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // remove() - DELETE
  // ─────────────────────────────────────────────

  describe('remove()', () => {
    test('正常系: 用語を削除し、削除件数 1 を返すこと', async () => {
      mockPgp.result.mockResolvedValue({ rowCount: 1 });

      const count = await remove('org-001', 'ns1', 'Temperature');

      expect(count).toBe(1);
      expect(mockPgp.result).toHaveBeenCalledWith(
        expect.any(String),
        ['org-001', 'ns1', 'Temperature']
      );
    });

    test('対象用語が存在しない場合、0 を返すこと', async () => {
      mockPgp.result.mockResolvedValue({ rowCount: 0 });

      const count = await remove('org-001', 'ns1', 'NonExistent');

      expect(count).toBe(0);
    });
  });

  // ─────────────────────────────────────────────
  // createNamespace() - namespace + prefix の2テーブル INSERT
  // ─────────────────────────────────────────────

  describe('createNamespace()', () => {
    test('正常系: namespace + prefix を INSERT し、namespace_id を返すこと', async () => {
      mockPgp.one.mockResolvedValue({ next_seq: 1 });
      mockPgp.none.mockResolvedValue(undefined);

      const namespaceId = await createNamespace({
        organizationId: 'org-001',
        prefix: 'ns1',
        uri: 'https://example.com/ns1/',
        userId: 'user-001',
        scopeKey: 'group-A',
      });

      // NS0001 形式で返すこと
      expect(namespaceId).toBe('NS0001');
      // namespace INSERT + prefix INSERT の2回 none が呼ばれること
      expect(mockPgp.none).toHaveBeenCalledTimes(2);
    });

    test('namespace_id の採番が NS連番形式（4桁）であること', async () => {
      mockPgp.one.mockResolvedValue({ next_seq: 10 });
      mockPgp.none.mockResolvedValue(undefined);

      const namespaceId = await createNamespace({
        organizationId: 'org-001',
        prefix: 'ns2',
        uri: 'https://example.com/ns2/',
        userId: 'user-001',
      });

      expect(namespaceId).toBe('NS0010');
    });
  });

  // ─────────────────────────────────────────────
  // removeNamespace() - prefix テーブルから DELETE
  // ─────────────────────────────────────────────

  describe('removeNamespace()', () => {
    test('正常系: prefix を削除し、削除件数を返すこと', async () => {
      mockPgp.result.mockResolvedValue({ rowCount: 1 });

      const count = await removeNamespace('org-001', 'ns1');

      expect(count).toBe(1);
    });
  });

  // ─────────────────────────────────────────────
  // toggleActive() - is_active の切り替え
  // ─────────────────────────────────────────────

  describe('toggleActive()', () => {
    test('正常系: is_active を false に切り替えること', async () => {
      const deactivated = { qname: 'ns1:Temperature', isActive: false };
      mockPgp.result.mockResolvedValue({ rowCount: 1 });
      mockPgp.oneOrNone.mockResolvedValue(deactivated);

      const result = await toggleActive('org-001', 'ns1', 'Temperature', false);

      expect(result?.isActive).toBe(false);
    });

    test('対象用語が存在しない場合、null を返すこと', async () => {
      mockPgp.result.mockResolvedValue({ rowCount: 0 });

      const result = await toggleActive('org-001', 'ns1', 'NonExistent', false);

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // existsByScopeKey() - 冪等性チェック
  // ─────────────────────────────────────────────

  describe('existsByScopeKey()', () => {
    test('scope_key に対応するレコードが存在する場合、true を返すこと', async () => {
      mockPgp.oneOrNone.mockResolvedValue({ exists: true });

      const result = await existsByScopeKey('org-001', 'group-A');

      expect(result).toBe(true);
    });

    test('存在しない場合、false を返すこと', async () => {
      mockPgp.oneOrNone.mockResolvedValue(null);

      const result = await existsByScopeKey('org-001', 'non-existent-scope');

      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // findUserOrgGroupCd() - ユーザーの organization_group_cd 取得
  // ─────────────────────────────────────────────

  describe('findUserOrgGroupCd()', () => {
    test('ユーザーの organization_group_cd を返すこと', async () => {
      mockPgp.oneOrNone.mockResolvedValue({ organization_group_cd: 'group-A' });

      const result = await findUserOrgGroupCd('org-001', 'user-001');

      expect(result).toBe('group-A');
    });

    test('未所属ユーザー（sys_admin 等）の場合、null を返すこと', async () => {
      mockPgp.oneOrNone.mockResolvedValue(null);

      const result = await findUserOrgGroupCd('org-001', 'sys-admin-user');

      expect(result).toBeNull();
    });
  });
});

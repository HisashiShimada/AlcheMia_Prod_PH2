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
  createNamespaceUri,
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
        .mockResolvedValueOnce(null);          // findTermInScope（重複なし）
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

    test('同一スコープに同名の用語が既に存在する場合、409 エラーをスローすること', async () => {
      mockPgp.oneOrNone
        .mockResolvedValueOnce({ namespace_id: 'NS0001' })          // findPrefixNamespaceId
        .mockResolvedValueOnce({ qname: 'ns1:Temperature' })         // findTermInScope（重複あり）
        .mockResolvedValueOnce({ scope_name: 'グループA' });          // findScopeNameByNamespaceId

      await expect(create(baseData)).rejects.toMatchObject({
        statusCode: 409,
        code: 'E6005',
      });
    });

    test('同一スコープに同名の用語が既に存在する場合、エラーの details.scopeName にスコープ名が含まれること', async () => {
      mockPgp.oneOrNone
        .mockResolvedValueOnce({ namespace_id: 'NS0001' })          // findPrefixNamespaceId
        .mockResolvedValueOnce({ qname: 'ns1:Temperature' })         // findTermInScope（重複あり）
        .mockResolvedValueOnce({ scope_name: '結合テスト グループ001' }); // findScopeNameByNamespaceId

      let caughtError: any;
      try {
        await create(baseData);
      } catch (e) {
        caughtError = e;
      }

      expect(caughtError).toBeDefined();
      expect(caughtError.details?.scopeName).toBe('結合テスト グループ001');
    });

    test('異なるスコープ（namespace_id）に同名の用語が存在しても、別スコープへの登録は成功すること', async () => {
      // グループ001（NS0001）に既存用語あり、グループ002（NS0002）への新規登録を想定
      const namespaceRowGroup002 = { namespace_id: 'NS0002' };
      const expectedTerm = {
        qname: 'Uncertainty:projectA',
        prefix: 'Uncertainty',
        localName: 'projectA',
        isActive: true,
      };

      mockPgp.oneOrNone
        .mockResolvedValueOnce(namespaceRowGroup002)  // findPrefixNamespaceId → NS0002（グループ002）
        .mockResolvedValueOnce(null);                  // findTermInScope → NS0002 には存在しない（null）
      mockPgp.none.mockResolvedValue(undefined);
      mockPgp.one.mockResolvedValue(expectedTerm);

      const dataForGroup002 = {
        ...baseData,
        prefix: 'Uncertainty',
        localName: 'projectA',
        scopeKey: 'group-002',
      };

      const result = await create(dataForGroup002);

      // 別スコープへの登録が成功すること
      expect(result.qname).toBe('Uncertainty:projectA');
    });
    test('上位スコープの prefix を使って下位スコープに用語を追加しようとした場合、上位スコープに同名用語が存在すれば 409 エラーをスローすること', async () => {
      // グループ002を選択中（scopeKey='group-002'）
      // グループ002には Uncertainty prefix なし → findNamespaceIdByScopeKeyAndPrefix → null
      // フォールバック: findPrefixNamespaceId → グループ001の NS0001 を取得
      // findTermInScope（NS0001）→ 既に存在する（重複）
      mockPgp.oneOrNone
        .mockResolvedValueOnce(null)                                       // findNamespaceIdByScopeKeyAndPrefix（グループ002には prefix なし）
        .mockResolvedValueOnce({ namespace_id: 'NS0001' })                 // findPrefixNamespaceId（グループ001の namespace_id）
        .mockResolvedValueOnce({ qname: 'Uncertainty:projectA' })          // findTermInScope（重複あり）
        .mockResolvedValueOnce({ scope_name: '結合テスト グループ001' });   // findScopeNameByNamespaceId

      const dataWithScopeKey = {
        ...baseData,
        prefix: 'Uncertainty',
        localName: 'projectA',
        scopeKey: 'group-002',
      };

      await expect(create(dataWithScopeKey)).rejects.toMatchObject({
        statusCode: 409,
        code: 'E6005',
      });
    });

    test('上位スコープの prefix を使って下位スコープに用語を追加した場合、エラーの details.scopeName に上位スコープ名が含まれること', async () => {
      mockPgp.oneOrNone
        .mockResolvedValueOnce(null)                                       // findNamespaceIdByScopeKeyAndPrefix（グループ002には prefix なし）
        .mockResolvedValueOnce({ namespace_id: 'NS0001' })                 // findPrefixNamespaceId（グループ001の namespace_id）
        .mockResolvedValueOnce({ qname: 'Uncertainty:projectA' })          // findTermInScope（重複あり）
        .mockResolvedValueOnce({ scope_name: '結合テスト グループ001' });   // findScopeNameByNamespaceId

      const dataWithScopeKey = {
        ...baseData,
        prefix: 'Uncertainty',
        localName: 'projectA',
        scopeKey: 'group-002',
      };

      let caughtError: any;
      try {
        await create(dataWithScopeKey);
      } catch (e) {
        caughtError = e;
      }

      expect(caughtError).toBeDefined();
      // ✅ 正しいスコープ（グループ001）が表示されること
      expect(caughtError.details?.scopeName).toBe('結合テスト グループ001');
    });

    test('上位スコープの prefix を使って下位スコープに新規用語（上位スコープに存在しない用語）を追加した場合、上位スコープへ INSERT が成功すること', async () => {
      // グループ002選択中（scopeKey='group-002'）
      // グループ002には Uncertainty prefix なし → null
      // フォールバック: グループ001の NS0001 を使用
      // NS0001 には 'newTerm' は存在しない → INSERT 成功
      const expectedTerm = {
        qname: 'Uncertainty:newTerm',
        prefix: 'Uncertainty',
        localName: 'newTerm',
        isActive: true,
      };

      mockPgp.oneOrNone
        .mockResolvedValueOnce(null)                        // findNamespaceIdByScopeKeyAndPrefix（グループ002には prefix なし）
        .mockResolvedValueOnce({ namespace_id: 'NS0001' })  // findPrefixNamespaceId（グループ001）
        .mockResolvedValueOnce(null);                       // findTermInScope（重複なし）
      mockPgp.none.mockResolvedValue(undefined);
      mockPgp.one.mockResolvedValue(expectedTerm);

      const dataWithScopeKey = {
        ...baseData,
        prefix: 'Uncertainty',
        localName: 'newTerm',
        scopeKey: 'group-002',
      };

      const result = await create(dataWithScopeKey);

      expect(result.qname).toBe('Uncertainty:newTerm');
    });

    test('scopeKey を指定した場合に現在スコープにも組織内にも prefix が存在しない場合、404 エラーをスローすること', async () => {
      mockPgp.oneOrNone
        .mockResolvedValueOnce(null)  // findNamespaceIdByScopeKeyAndPrefix（該当なし）
        .mockResolvedValueOnce(null); // findPrefixNamespaceId（組織内にも prefix なし）

      const dataWithScopeKey = {
        ...baseData,
        prefix: 'nonExistentPrefix',
        scopeKey: 'group-002',
      };

      await expect(create(dataWithScopeKey)).rejects.toMatchObject({
        statusCode: 404,
        code: 'E6001',
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
  // createNamespaceUri() - namespace + prefix の2テーブル INSERT
  // ─────────────────────────────────────────────

  describe('createNamespaceUri()', () => {
    test('正常系: namespace + prefix を INSERT し、namespace_id を返すこと', async () => {
      mockPgp.one.mockResolvedValue({ next_seq: 1 });
      mockPgp.none.mockResolvedValue(undefined);

      const namespaceId = await createNamespaceUri({
        organizationId: 'org-001',
        uri: 'https://example.com/ns1/',
        userId: 'user-001',
        scopeKey: 'group-A',
      });

      // NS0001 形式で返すこと
      expect(namespaceId).toBe('NS0001');
      // namespace INSERT の1回 none が呼ばれること
      expect(mockPgp.none).toHaveBeenCalledTimes(1);
    });

    test('namespace_id の採番が NS連番形式（4桁）であること', async () => {
      mockPgp.one.mockResolvedValue({ next_seq: 10 });
      mockPgp.none.mockResolvedValue(undefined);

      const namespaceId = await createNamespaceUri({
        organizationId: 'org-001',
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

  // ─────────────────────────────────────────────
  // create() — findPrefixNamespaceId ORDER BY 修正確認
  // グループとユーザ両方に同名 prefix が存在するケース
  // ─────────────────────────────────────────────

  describe('create() — findPrefixNamespaceId で組織グループ優先ケース', () => {
    test('scopeKey 指定なし・グループ001とユーザ004の両方に Uncertainty prefix が存在する場合、\
グループ001（組織グループ）のスコープ名がエラーに含まれること', async () => {
      // findPrefixNamespaceId が NS_GROUP001（組織グループ）を返すよう ORDER BY が効いている想定
      // SQL修正後: 組織グループが優先されるので NS_GROUP001 が返る
      mockPgp.oneOrNone
        .mockResolvedValueOnce({ namespace_id: 'NS_GROUP001' })           // findPrefixNamespaceId → グループ001
        .mockResolvedValueOnce({ qname: 'Uncertainty:projectA' })         // findTermInScope（重複あり）
        .mockResolvedValueOnce({ scope_name: '結合テスト グループ001' }); // findScopeNameByNamespaceId

      const dataWithoutScopeKey = {
        organizationId: 'org-001',
        prefix: 'Uncertainty',
        localName: 'projectA',
      };

      let caughtError: Error & { code?: string; details?: { scopeName: string } } | null = null;
      try {
        await create(dataWithoutScopeKey);
      } catch (e) {
        caughtError = e as Error & { code?: string; details?: { scopeName: string } };
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError!.details?.scopeName).toBe('結合テスト グループ001');
    });

    test('scopeKey 指定なし・グループ001とユーザ004の両方に prefix が存在するとき、\
ユーザ004のスコープ名がエラーに含まれないこと（グループが優先されること）', async () => {
      // SQL修正前の挙動（ORDER BY なし・ユーザ004が先に返るケース）がないことを確認
      // SQL修正後は必ず組織グループ側が返る想定
      mockPgp.oneOrNone
        .mockResolvedValueOnce({ namespace_id: 'NS_GROUP001' })           // findPrefixNamespaceId → グループ001（ORDER BY により）
        .mockResolvedValueOnce({ qname: 'Uncertainty:projectA' })         // findTermInScope（重複あり）
        .mockResolvedValueOnce({ scope_name: '結合テスト グループ001' }); // findScopeNameByNamespaceId

      const dataWithoutScopeKey = {
        organizationId: 'org-001',
        prefix: 'Uncertainty',
        localName: 'projectA',
      };

      let caughtError: Error & { code?: string; details?: { scopeName: string } } | null = null;
      try {
        await create(dataWithoutScopeKey);
      } catch (e) {
        caughtError = e as Error & { code?: string; details?: { scopeName: string } };
      }

      expect(caughtError).not.toBeNull();
      // ユーザ004（ユーザスコープ）のスコープ名ではないことを確認
      expect(caughtError!.details?.scopeName).not.toBe('ユーザ004');
      // グループ001（組織グループ）のスコープ名であることを確認
      expect(caughtError!.details?.scopeName).toBe('結合テスト グループ001');
    });
  });
});

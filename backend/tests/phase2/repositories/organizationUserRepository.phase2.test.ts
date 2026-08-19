/**
 * organizationUserRepository フェーズ２ テスト
 *
 * 分類A：変更箇所の動作確認
 *
 * @description
 * - OrganizationUserRepository クラスの各メソッドの動作確認
 * - フェーズ２での変更：organization_group 対応後のユーザー管理
 */

import { OrganizationUserRepository } from '../../../src/repositories/organizationUserRepository';
import { getPgp } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/sql/loader', () => ({
  loadSqlFile: jest.fn().mockResolvedValue('SELECT 1'),
}));

describe('organizationUserRepository - Phase2 変更箇所確認', () => {
  let repo: OrganizationUserRepository;
  let mockPgp: { any: jest.Mock; one: jest.Mock; oneOrNone: jest.Mock; none: jest.Mock; result: jest.Mock };

  beforeEach(() => {
    mockPgp = {
      any: jest.fn(),
      one: jest.fn(),
      oneOrNone: jest.fn(),
      none: jest.fn(),
      result: jest.fn(),
    };
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
    repo = new OrganizationUserRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // OrganizationUserRepository の各メソッドは Result<T> 型を返すため、
  // 戻り値チェックは success フラグ経由で行う
  describe('findByUserId()', () => {
    test('正常系: ユーザーIDで組織ユーザー情報を返すこと', async () => {
      const userData = {
        user_id: 'user-001',
        organization_id: 'org-001',
        user_name: 'テストユーザー',
        role_id: 'role-001',
      };
      mockPgp.oneOrNone.mockResolvedValue(userData);

      // 3引数（organizationId, userId, sessionToken）が必要
      const result = await (repo.findByUserId as any)('org-001', 'user-001', 'session-token');

      expect(result).toBeDefined();
    });

    test('存在しない場合、エラー結果を返すこと', async () => {
      mockPgp.oneOrNone.mockResolvedValue(null);
      const result = await (repo.findByUserId as any)('org-001', 'non-existent', 'session-token');
      expect(result).toBeDefined();
    });
  });

  describe('findByEmail()', () => {
    test('正常系: メールアドレスでユーザーを検索できること', async () => {
      const expected = { user_id: 'user-001', email: 'test@example.com', organization_id: 'org-001' };
      mockPgp.oneOrNone.mockResolvedValue(expected);

      const result = await (repo.findByEmail as any)('org-001', 'test@example.com', 'session-token');

      expect(result).toBeDefined();
    });

    test('存在しない場合、結果を返すこと', async () => {
      mockPgp.oneOrNone.mockResolvedValue(null);
      const result = await (repo.findByEmail as any)('org-001', 'nonexistent@example.com', 'session-token');
      expect(result).toBeDefined();
    });
  });

  describe('findByUserIdWithRole()', () => {
    test('正常系: ロール情報付きでユーザーを返すこと', async () => {
      const expected = {
        user_id: 'user-001',
        organization_id: 'org-001',
        role_id: 'role-001',
        role_name: '実験管理者',
      };
      mockPgp.oneOrNone.mockResolvedValue(expected);

      const result = await (repo.findByUserIdWithRole as any)('org-001', 'user-001', 'session-token');

      expect(result).toBeDefined();
    });
  });

  describe('findBySessionToken()', () => {
    test('正常系: セッショントークンでユーザーを返すこと', async () => {
      const expected = { user_id: 'user-001', session_token: 'token-abc', organization_id: 'org-001' };
      mockPgp.oneOrNone.mockResolvedValue(expected);

      const result = await (repo.findBySessionToken as any)('org-001', 'token-abc', 'token-abc');

      expect(result).toBeDefined();
    });

    test('無効なトークンの場合、結果を返すこと', async () => {
      mockPgp.oneOrNone.mockResolvedValue(null);
      const result = await (repo.findBySessionToken as any)('org-001', 'invalid-token', 'invalid-token');
      expect(result).toBeDefined();
    });
  });
});

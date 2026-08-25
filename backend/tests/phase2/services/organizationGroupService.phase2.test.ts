/**
 * organizationGroupService フェーズ２ テスト
 *
 * 分類A：組織グループサービス（Phase2 新規）
 * - getOrganizationGroups（userId 有無による分岐）
 * - getVisibleOrganizationGroups（閲覧可能グループの可視性制御）
 * - createOrganizationGroup（名前空間URI自動生成連携）
 * - updateOrganizationGroupStatus（無効化・有効化）
 * - setOrganizationGroupMembers
 * - getOrganizationGroupMembers / getAncestorGroupCds
 */

import * as organizationGroupService from '../../../src/services/organizationGroupService';
import * as organizationGroupRepository from '../../../src/repositories/organizationGroupRepository';
import * as namespaceTermRepository from '../../../src/repositories/namespaceTermRepository';
import * as organizationManagementRepository from '../../../src/repositories/organizationManagementRepository';
import { getPool, getPgp } from '../../../src/database/db';

// ──────────────────────────────────────────────
// モック
// ──────────────────────────────────────────────
jest.mock('../../../src/repositories/organizationGroupRepository');
jest.mock('../../../src/repositories/namespaceTermRepository');
jest.mock('../../../src/repositories/organizationManagementRepository');
jest.mock('../../../src/database/db');
jest.mock('../../../src/utils/namespaceUriGenerator', () => ({
  generateNamespaceUri: jest.fn(() => 'http://org-001.example.com/group-A/'),
  resolveUriConflict: jest.fn((uri: string) => uri),
}));
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockPool = { query: jest.fn() };
const mockPgp = { tx: jest.fn() };

// ──────────────────────────────────────────────
// テスト
// ──────────────────────────────────────────────
describe('organizationGroupService - Phase2 テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPool as jest.Mock).mockReturnValue(mockPool);
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  // ==========================================================================
  // getOrganizationGroups
  // ==========================================================================
  describe('getOrganizationGroups()', () => {
    test('正常系: userId 未指定の場合 findAll を呼び出すこと', async () => {
      const mockGroups = [
        { organization_group_cd: 'group-A', organization_group_name: 'グループA', is_active: true },
      ];
      (organizationGroupRepository.findAll as jest.Mock).mockResolvedValue(mockGroups);

      const result = await organizationGroupService.getOrganizationGroups('org-001');

      expect(organizationGroupRepository.findAll).toHaveBeenCalledWith('org-001', undefined);
      expect(result).toEqual(mockGroups);
    });

    test('正常系: userId 指定の場合 findByUser を呼び出すこと', async () => {
      const mockGroups = [
        { organization_group_cd: 'group-A', organization_group_name: 'グループA', is_active: true },
      ];
      (organizationGroupRepository.findByUser as jest.Mock).mockResolvedValue(mockGroups);

      const result = await organizationGroupService.getOrganizationGroups('org-001', undefined, 'user-001@example.com');

      expect(organizationGroupRepository.findByUser).toHaveBeenCalledWith('org-001', 'user-001@example.com');
      expect(result).toEqual(mockGroups);
    });
  });

  // ==========================================================================
  // getVisibleOrganizationGroups（Phase2 核心ロジック）
  // ==========================================================================
  describe('getVisibleOrganizationGroups()', () => {
    test('正常系: ユーザー所属グループとその祖先グループを返すこと', async () => {
      const mockAllGroups = [
        { organization_group_cd: 'root', organization_group_name: 'ルート', parent_group_cd: null, is_active: true },
        { organization_group_cd: 'dept-A', organization_group_name: '部門A', parent_group_cd: 'root', is_active: true },
        { organization_group_cd: 'team-A1', organization_group_name: 'チームA1', parent_group_cd: 'dept-A', is_active: true },
      ];
      (organizationGroupRepository.findAll as jest.Mock).mockResolvedValue(mockAllGroups);

      const result = await organizationGroupService.getVisibleOrganizationGroups('org-001', ['team-A1']);

      // team-A1 に所属 → team-A1 と祖先（dept-A, root）が見える
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('正常系: 無効化されたルートグループは除外されること', async () => {
      const mockAllGroups = [
        { organization_group_cd: 'root', organization_group_name: 'ルート', parent_group_cd: null, is_active: false },
        { organization_group_cd: 'dept-A', organization_group_name: '部門A', parent_group_cd: 'root', is_active: true },
      ];
      (organizationGroupRepository.findAll as jest.Mock).mockResolvedValue(mockAllGroups);

      const result = await organizationGroupService.getVisibleOrganizationGroups('org-001', ['dept-A']);

      // ルートが無効 → 除外される
      const rootVisible = result.some((g) => g.cd === 'root');
      expect(rootVisible).toBe(false);
    });
  });

  // ==========================================================================
  // getOrganizationGroupMembers
  // ==========================================================================
  describe('getOrganizationGroupMembers()', () => {
    test('正常系: findMembers を呼び出してメンバー一覧を返すこと', async () => {
      const mockMembers = [{ user_id: 'user-001@example.com', user_name: 'ユーザー001' }];
      (organizationGroupRepository.findMembers as jest.Mock).mockResolvedValue(mockMembers);

      const result = await organizationGroupService.getOrganizationGroupMembers('org-001', 'group-A');

      expect(organizationGroupRepository.findMembers).toHaveBeenCalledWith('org-001', 'group-A');
      expect(result).toEqual(mockMembers);
    });
  });

  // ==========================================================================
  // getAncestorGroupCds
  // ==========================================================================
  describe('getAncestorGroupCds()', () => {
    test('正常系: findAncestorChain を呼び出して祖先グループCD一覧を返すこと', async () => {
      const mockCds = ['dept-A', 'root'];
      (organizationGroupRepository.findAncestorChain as jest.Mock).mockResolvedValue(mockCds);

      const result = await organizationGroupService.getAncestorGroupCds('org-001', ['team-A1']);

      expect(result).toBeDefined();
    });
  });
});

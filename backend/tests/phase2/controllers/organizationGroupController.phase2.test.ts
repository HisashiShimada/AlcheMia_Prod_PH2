/**
 * organizationGroupController フェーズ２ テスト
 *
 * 分類A：組織グループ管理APIの動作確認
 * - getOrganizationGroups / getOrganizationGroupById / createOrganizationGroup
 * - updateOrganizationGroup / updateOrganizationGroupStatus
 * - getAncestorGroupCds / getOrgUsers
 * - getOrganizationGroupMembers / setOrganizationGroupMembers / updateOrganizationGroupChief
 */

import { Request, Response, NextFunction } from 'express';
import * as organizationGroupService from '../../../src/services/organizationGroupService';
import * as organizationGroupRepository from '../../../src/repositories/organizationGroupRepository';
import {
  getOrganizationGroups,
  getOrganizationGroupById,
  createOrganizationGroup,
  updateOrganizationGroup,
  updateOrganizationGroupStatus,
  getAncestorGroupCds,
  getOrgUsers,
  getOrganizationGroupMembers,
  setOrganizationGroupMembers,
  updateOrganizationGroupChief,
} from '../../../src/controllers/organizationGroupController';

jest.mock('../../../src/services/organizationGroupService');
jest.mock('../../../src/repositories/organizationGroupRepository');
jest.mock('../../../src/services/jwtService', () => ({
  JwtService: jest.fn().mockImplementation(() => ({
    generateAccessToken: jest.fn().mockResolvedValue({ success: true, data: 'mock-access-token' }),
  })),
}));
jest.mock('../../../src/repositories/rolePermissionRepository', () => ({
  RolePermissionRepository: jest.fn().mockImplementation(() => ({
    getPermissionsByRoleId: jest.fn().mockResolvedValue([]),
  })),
}));
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-uuid-mock') }));

function makeMocks(overrides: {
  params?: Record<string, string>;
  body?: Record<string, any>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  organizationId?: string;
  userId?: string;
  organizationGroupCds?: string[];
} = {}) {
  const req = {
    params: overrides.params ?? {},
    body: overrides.body ?? {},
    query: overrides.query ?? {},
    headers: overrides.headers ?? {},
    user: {
      userId: overrides.userId ?? 'user-001',
      organizationId: overrides.organizationId ?? 'org-001',
      organizationGroupCds: overrides.organizationGroupCds ?? ['group-A'],
    },
    organizationId: overrides.organizationId ?? 'org-001',
    userId: overrides.userId ?? 'user-001',
  } as unknown as Request;

  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  } as unknown as Response;

  const next = jest.fn() as NextFunction;

  return { req, res, next };
}

describe('organizationGroupController - Phase2 テスト', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // getOrganizationGroups
  // ==========================================================================
  describe('getOrganizationGroups()', () => {
    test('正常系（visibleOnly=false）: チーフユーザーのグループ一覧を返すこと', async () => {
      const groups = [{ organization_group_cd: 'group-A' }];
      (organizationGroupService.getOrganizationGroups as jest.Mock).mockResolvedValue(groups);

      const { req, res, next } = makeMocks({ query: { visibleOnly: 'false' } });

      await getOrganizationGroups(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: groups });
    });

    test('正常系（visibleOnly=true）: 閲覧可能グループ一覧を返すこと', async () => {
      const groups = [{ organization_group_cd: 'group-A' }, { organization_group_cd: 'group-B' }];
      (organizationGroupService.getVisibleOrganizationGroups as jest.Mock).mockResolvedValue(groups);

      const { req, res, next } = makeMocks({ query: { visibleOnly: 'true' } });

      await getOrganizationGroups(req, res, next);

      expect(organizationGroupService.getVisibleOrganizationGroups).toHaveBeenCalledWith('org-001', ['group-A']);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { groups } });
    });

    test('異常系: エラー発生時に next を呼ぶこと', async () => {
      const error = new Error('service error');
      (organizationGroupService.getOrganizationGroups as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks();

      await getOrganizationGroups(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==========================================================================
  // getOrganizationGroupById
  // ==========================================================================
  describe('getOrganizationGroupById()', () => {
    test('正常系: グループ詳細を返すこと', async () => {
      const group = { organization_group_cd: 'group-A', organization_group_name: 'グループA' };
      (organizationGroupService.getOrganizationGroupById as jest.Mock).mockResolvedValue(group);

      const { req, res, next } = makeMocks({ params: { groupCd: 'group-A' } });

      await getOrganizationGroupById(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: group });
    });
  });

  // ==========================================================================
  // createOrganizationGroup
  // ==========================================================================
  describe('createOrganizationGroup()', () => {
    test('正常系: 組織グループを新規作成し、201 を返すこと', async () => {
      const created = { organization_group_cd: 'group-C', organization_group_name: 'グループC' };
      (organizationGroupService.createOrganizationGroup as jest.Mock).mockResolvedValue(created);
      // findByUser は最新の所属グループCD取得に使われる
      (organizationGroupRepository.findByUser as jest.Mock).mockResolvedValue([
        { organization_group_cd: 'group-A' },
        { organization_group_cd: 'group-C' },
      ]);

      const { req, res, next } = makeMocks({
        body: {
          organization_group_cd: 'group-C',
          organization_group_name: 'グループC',
          parent_group_cd: null,
        },
      });

      await createOrganizationGroup(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      // accessToken が含まれること（モックなので 'mock-access-token'）
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: created,
        accessToken: 'mock-access-token',
        organizationGroupCds: ['group-A', 'group-C'],
      }));
    });

    test('異常系: エラー発生時に next を呼ぶこと', async () => {
      const error = new Error('create error');
      (organizationGroupService.createOrganizationGroup as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks({
        body: { organization_group_cd: 'group-C', organization_group_name: 'グループC' },
      });

      await createOrganizationGroup(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==========================================================================
  // updateOrganizationGroup
  // ==========================================================================
  describe('updateOrganizationGroup()', () => {
    test('正常系: 組織グループを更新し、結果を返すこと', async () => {
      const updated = { organization_group_cd: 'group-A', organization_group_name: 'グループA（更新）' };
      (organizationGroupService.updateOrganizationGroup as jest.Mock).mockResolvedValue(updated);

      const { req, res, next } = makeMocks({
        params: { groupCd: 'group-A' },
        body: { organization_group_name: 'グループA（更新）' },
      });

      await updateOrganizationGroup(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
    });
  });

  // ==========================================================================
  // updateOrganizationGroupStatus
  // ==========================================================================
  describe('updateOrganizationGroupStatus()', () => {
    test('正常系（無効化）: isActive=false でグループを無効化できること', async () => {
      const updated = { organization_group_cd: 'group-A', is_active: false };
      (organizationGroupService.updateOrganizationGroupActiveStatus as jest.Mock).mockResolvedValue(updated);

      const { req, res, next } = makeMocks({
        params: { groupCd: 'group-A' },
        body: { isActive: false },
      });

      await updateOrganizationGroupStatus(req, res, next);

      expect(organizationGroupService.updateOrganizationGroupActiveStatus).toHaveBeenCalledWith(
        'org-001', 'group-A', false, 'user-001', expect.any(String)
      );
      expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
    });

    test('正常系（有効化）: isActive=true でグループを有効化できること', async () => {
      const updated = { organization_group_cd: 'group-A', is_active: true };
      (organizationGroupService.updateOrganizationGroupActiveStatus as jest.Mock).mockResolvedValue(updated);

      const { req, res, next } = makeMocks({
        params: { groupCd: 'group-A' },
        body: { isActive: true },
      });

      await updateOrganizationGroupStatus(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
    });
  });

  // ==========================================================================
  // getAncestorGroupCds
  // ==========================================================================
  describe('getAncestorGroupCds()', () => {
    test('正常系: 祖先グループのCD一覧を返すこと', async () => {
      const groups = [
        { organization_group_cd: 'group-A' },
        { organization_group_cd: 'group-root' },
      ];
      (organizationGroupRepository.findByUser as jest.Mock).mockResolvedValue(groups);

      const { req, res, next } = makeMocks();

      await getAncestorGroupCds(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: ['group-A', 'group-root'] });
    });
  });

  // ==========================================================================
  // getOrgUsers
  // ==========================================================================
  describe('getOrgUsers()', () => {
    test('正常系: 組織ユーザー一覧を返すこと', async () => {
      const users = [{ userId: 'user-001' }, { userId: 'user-002' }];
      (organizationGroupService.getOrgUsersForGroups as jest.Mock).mockResolvedValue(users);

      const { req, res, next } = makeMocks();

      await getOrgUsers(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: users });
    });
  });

  // ==========================================================================
  // getOrganizationGroupMembers
  // ==========================================================================
  describe('getOrganizationGroupMembers()', () => {
    test('正常系: グループのメンバー一覧を返すこと', async () => {
      const members = [{ userId: 'user-001' }, { userId: 'user-002' }];
      (organizationGroupService.getOrganizationGroupMembers as jest.Mock).mockResolvedValue(members);

      const { req, res, next } = makeMocks({ params: { groupCd: 'group-A' } });

      await getOrganizationGroupMembers(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: members });
    });
  });

  // ==========================================================================
  // setOrganizationGroupMembers
  // ==========================================================================
  describe('setOrganizationGroupMembers()', () => {
    test('正常系: メンバーを一括更新できること', async () => {
      (organizationGroupService.setOrganizationGroupMembers as jest.Mock).mockResolvedValue(undefined);

      const { req, res, next } = makeMocks({
        params: { groupCd: 'group-A' },
        body: { userIds: ['user-001', 'user-002'] },
      });

      await setOrganizationGroupMembers(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });

  // ==========================================================================
  // updateOrganizationGroupChief
  // ==========================================================================
  describe('updateOrganizationGroupChief()', () => {
    test('正常系: グループ代表者を変更できること', async () => {
      const updated = { organization_group_cd: 'group-A', chief_user_id: 'user-002' };
      (organizationGroupService.updateOrganizationGroupChief as jest.Mock).mockResolvedValue(updated);

      const { req, res, next } = makeMocks({
        params: { groupCd: 'group-A' },
        body: { chiefUserId: 'user-002' },
      });

      await updateOrganizationGroupChief(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
    });
  });
});

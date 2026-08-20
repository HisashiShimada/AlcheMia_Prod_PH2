/**
 * projectController フェーズ２ テスト
 *
 * 分類A：プロジェクト管理APIの動作確認（Phase2 変更箇所）
 * - organization_group_cd 対応（findWithOwnerAndOrgGroup 使用）
 * - list / create / renameProjectHandler / deleteProject / getProjectTasks / requestApproval
 */

import { Request, Response, NextFunction } from 'express';
import * as projectRepository from '../../../src/repositories/projectRepository';
import {
  list,
  create,
  renameProjectHandler,
  deleteProject,
  getProjectTasks,
  requestApproval,
} from '../../../src/controllers/projectController';

jest.mock('../../../src/repositories/projectRepository');
jest.mock('../../../src/repositories/projectTaskDetailRepository');
jest.mock('../../../src/repositories/transitionDataRepository');
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

function makeMocks(overrides: {
  params?: Record<string, string>;
  body?: Record<string, any>;
  query?: Record<string, string>;
  organizationId?: string;
  userId?: string;
  organizationGroupCds?: string[];
} = {}) {
  const req = {
    params: overrides.params ?? {},
    body: overrides.body ?? {},
    query: overrides.query ?? {},
    headers: {},
    user: {
      userId: overrides.userId ?? 'user-001',
      organizationId: overrides.organizationId ?? 'org-001',
      organizationGroupCds: overrides.organizationGroupCds ?? ['group-A'],
    },
  } as unknown as Request;
  (req as any).organizationId = overrides.organizationId ?? 'org-001';

  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    setHeader: jest.fn(),
  } as unknown as Response;

  const next = jest.fn() as NextFunction;

  return { req, res, next };
}

describe('projectController - Phase2 テスト', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // list
  // ==========================================================================
  describe('list()', () => {
    test('正常系: プロジェクト一覧を返すこと', async () => {
      const projects = [
        { project_id: 'proj-001', project_name: 'プロジェクトA', organization_group_cd: 'group-A' },
        { project_id: 'proj-002', project_name: 'プロジェクトB', organization_group_cd: 'group-A' },
      ];
      (projectRepository.findAllWithDetails as jest.Mock).mockResolvedValue(projects);

      const { req, res } = makeMocks();

      await list(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    test('正常系: organization_group_cd でフィルタリングされること', async () => {
      const projects = [
        { project_id: 'proj-001', project_name: 'プロジェクトA', organization_group_cd: 'group-A' },
      ];
      (projectRepository.findAllWithDetails as jest.Mock).mockResolvedValue(projects);

      const { req, res } = makeMocks({
        query: { organizationGroupCd: 'group-A' },
        organizationGroupCds: ['group-A'],
      });

      await list(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ==========================================================================
  // create
  // ==========================================================================
  describe('create()', () => {
    test('正常系: organization_group_cd を含むプロジェクトを新規作成し、201 を返すこと', async () => {
      const created = {
        project_id: 'proj-003',
        project_name: 'プロジェクトC',
        organization_group_cd: 'group-A',
      };
      (projectRepository.insert as jest.Mock).mockResolvedValue(created);
      (projectRepository.existsByName as jest.Mock).mockResolvedValue(false);

      const { req, res } = makeMocks({
        body: {
          projectName: 'プロジェクトC',
          organizationGroupCd: 'group-A',
          description: 'テスト',
          methodIds: ['method-001'],
        },
      });

      await create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  // ==========================================================================
  // renameProjectHandler
  // ==========================================================================
  describe('renameProjectHandler()', () => {
    test('正常系: プロジェクト名を変更し、200 を返すこと', async () => {
      (projectRepository.getById as jest.Mock).mockResolvedValue({
        project_id: 'proj-001',
        project_name: 'プロジェクトA',
        project_status: 1,
      });
      (projectRepository.existsByName as jest.Mock).mockResolvedValue(false);
      (projectRepository.update as jest.Mock).mockResolvedValue({
        project_id: 'proj-001',
        project_name: '新プロジェクト名',
      });

      const { req, res } = makeMocks({
        params: { projectId: 'proj-001' },
        body: { projectName: '新プロジェクト名' },
      });

      await renameProjectHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ==========================================================================
  // deleteProject
  // ==========================================================================
  describe('deleteProject()', () => {
    test('正常系: プロジェクトを削除し、204 を返すこと', async () => {
      (projectRepository.findProjectForDelete as jest.Mock).mockResolvedValue({
        project_id: 'proj-001',
        project_status: 1,
      });
      (projectRepository.deleteProjectRelatedData as jest.Mock).mockResolvedValue(undefined);
      (projectRepository.deleteProject as jest.Mock).mockResolvedValue(1);

      const { req, res } = makeMocks({ params: { projectId: 'proj-001' } });

      await deleteProject(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  // ==========================================================================
  // getProjectTasks
  // ==========================================================================
  describe('getProjectTasks()', () => {
    test('正常系: タスク一覧を返すこと', async () => {
      (projectRepository.getById as jest.Mock).mockResolvedValue({
        project_id: 'proj-001',
        project_status: 2,
      });
      (projectRepository.findProjectTasks as jest.Mock).mockResolvedValue([
        { task_no: 1, method_id: 'method-001', task_status: 1 },
      ]);

      const { req, res } = makeMocks({ params: { projectId: 'proj-001' } });

      await getProjectTasks(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ==========================================================================
  // requestApproval
  // ==========================================================================
  describe('requestApproval()', () => {
    test('正常系: 承認申請を送信し、200 を返すこと', async () => {
      (projectRepository.getById as jest.Mock).mockResolvedValue({
        project_id: 'proj-001',
        project_status: 1,
      });
      (projectRepository.updateApprovalStatus as jest.Mock).mockResolvedValue({
        project_id: 'proj-001',
        project_status: 3,
      });

      const { req, res } = makeMocks({ params: { projectId: 'proj-001' } });

      await requestApproval(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});

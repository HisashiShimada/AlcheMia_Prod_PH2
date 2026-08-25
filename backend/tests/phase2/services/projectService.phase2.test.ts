/**
 * projectService フェーズ２ テスト
 *
 * 分類A：プロジェクト管理サービスの変更箇所（organization_group 対応）
 * - listProjects（organization_group_cd フィルタ）
 * - createProject
 * - requestApproval（承認依頼フロー）
 * - deleteProject
 */

import * as projectService from '../../../src/services/projectService';
import * as projectRepository from '../../../src/repositories/projectRepository';
import { getPool, getPgp } from '../../../src/database/db';

// ──────────────────────────────────────────────
// モック
// ──────────────────────────────────────────────
jest.mock('../../../src/repositories/projectRepository');
jest.mock('../../../src/database/db');
jest.mock('../../../src/services/storageService', () => ({
  getStorageService: jest.fn(() => ({
    deleteDirectory: jest.fn(),
    listFiles: jest.fn().mockResolvedValue([]),
  })),
}));
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockPool = { query: jest.fn() };
const mockPgp = { tx: jest.fn(), none: jest.fn() };

// ──────────────────────────────────────────────
// テスト
// ──────────────────────────────────────────────
describe('projectService - Phase2 テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPool as jest.Mock).mockReturnValue(mockPool);
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  // ==========================================================================
  // listProjects（organization_group_cd フィルタ対応）
  // ==========================================================================
  describe('listProjects()', () => {
    test('正常系: プロジェクト一覧を返すこと', async () => {
      const mockProjects = [
        { project_id: 'proj-001', project_name: 'テストプロジェクト', organization_group_cd: 'group-A' },
      ];
      (projectRepository.findAll as jest.Mock).mockResolvedValue(mockProjects);

      const result = await projectService.listProjects('org-001', 'user-001@example.com', ['group-A'], 'researcher');

      expect(projectRepository.findAll).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test('正常系: organizationGroupCds が複数の場合も正常に動作すること', async () => {
      const mockProjects = [
        { project_id: 'proj-001', project_name: 'プロジェクト1', organization_group_cd: 'group-A' },
        { project_id: 'proj-002', project_name: 'プロジェクト2', organization_group_cd: 'group-B' },
      ];
      (projectRepository.findAll as jest.Mock).mockResolvedValue(mockProjects);

      const result = await projectService.listProjects(
        'org-001',
        'user-001@example.com',
        ['group-A', 'group-B'],
        'experiment_admin'
      );

      expect(result).toBeDefined();
    });

    test('異常系: Repository が例外を投げた場合にエラーを伝播すること', async () => {
      (projectRepository.findAll as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(
        projectService.listProjects('org-001', 'user-001@example.com', ['group-A'], 'researcher')
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // createProject
  // ==========================================================================
  describe('createProject()', () => {
    test('正常系: プロジェクトを作成して返すこと', async () => {
      const mockProject = { project_id: 'proj-new', project_name: '新規プロジェクト' };
      (projectRepository.insert as jest.Mock).mockResolvedValue(mockProject);

      const result = await projectService.createProject(
        'org-001',
        '新規プロジェクト',
        'user-001@example.com',
        'group-A',
        undefined
      );

      expect(result).toBeDefined();
    });

    test('異常系: プロジェクト名が重複した場合エラーを伝播すること', async () => {
      (projectRepository.insert as jest.Mock).mockRejectedValue(new Error('Duplicate project name'));

      await expect(
        projectService.createProject('org-001', '重複プロジェクト', 'user-001@example.com', 'group-A', undefined)
      ).rejects.toThrow();
    });
  });
});

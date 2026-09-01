/**
 * WorkerProjectService tests
 *
 * Group-filtering version of worker project service tests.
 */

import { WorkerProjectService } from '../../src/services/workerProjectService';
import type { ListWorkerProjectsParams } from '../../src/types/workerProject';

jest.mock('../../src/database/db');
jest.mock('../../src/repositories/organizationGroupRepository', () => ({
  findAll: jest.fn().mockResolvedValue([]),
  findDescendantCds: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../src/repositories/workerProjectRepository', () => ({
  findWorkerAccessible: jest.fn().mockResolvedValue([]),
  countWorkerAccessible: jest.fn().mockResolvedValue(0),
}));

import * as workerProjectRepository from '../../src/repositories/workerProjectRepository';
import * as organizationGroupRepository from '../../src/repositories/organizationGroupRepository';

describe('WorkerProjectService', () => {
  let service: WorkerProjectService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkerProjectService();
  });

  describe('listWorkerAccessible', () => {
    const baseParams: ListWorkerProjectsParams = {
      page: 1, limit: 20, sortBy: 'create_at', order: 'desc',
    };

    it('returns empty when organizationGroupCds is empty', async () => {
      (organizationGroupRepository.findAll as jest.Mock).mockResolvedValue([]);
      const result = await service.listWorkerAccessible('user-1', 'org-1', [], baseParams);
      expect(result.items).toHaveLength(0);
      expect(result.pagination.totalItems).toBe(0);
    });

    it('calls findDescendantCds when groups are provided', async () => {
      (organizationGroupRepository.findAll as jest.Mock).mockResolvedValue([
        { organization_group_cd: 'g-A', parent_group_cd: null, is_active: true },
      ]);
      (organizationGroupRepository.findDescendantCds as jest.Mock).mockResolvedValue(['g-A']);
      (workerProjectRepository.findWorkerAccessible as jest.Mock).mockResolvedValue([]);
      (workerProjectRepository.countWorkerAccessible as jest.Mock).mockResolvedValue(0);
      await service.listWorkerAccessible('user-1', 'org-1', ['g-A'], baseParams);
      expect(organizationGroupRepository.findDescendantCds).toHaveBeenCalledWith('org-1', ['g-A']);
    });

    it('passes visibleGroupCds to repository', async () => {
      const descendantCds = ['g-A', 'g-B'];
      (organizationGroupRepository.findAll as jest.Mock).mockResolvedValue([
        { organization_group_cd: 'g-A', parent_group_cd: null, is_active: true },
      ]);
      (organizationGroupRepository.findDescendantCds as jest.Mock).mockResolvedValue(descendantCds);
      (workerProjectRepository.findWorkerAccessible as jest.Mock).mockResolvedValue([]);
      (workerProjectRepository.countWorkerAccessible as jest.Mock).mockResolvedValue(0);
      await service.listWorkerAccessible('user-1', 'org-1', ['g-A'], baseParams);
      expect(workerProjectRepository.findWorkerAccessible).toHaveBeenCalledWith(
        'org-1', 'user-1',
        expect.objectContaining({ visibleGroupCds: descendantCds })
      );
    });
  });
});
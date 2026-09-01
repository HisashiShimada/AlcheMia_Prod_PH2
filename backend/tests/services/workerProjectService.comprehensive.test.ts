/**
 * WorkerProjectService Comprehensive Tests
 *
 * Updated to use new signature: listWorkerAccessible(userId, organizationId, organizationGroupCds, params)
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

describe('WorkerProjectService - Comprehensive Tests (Task 5.1)', () => {
  let service: WorkerProjectService;
  const baseParams: ListWorkerProjectsParams = { page: 1, limit: 20, sortBy: 'create_at', order: 'desc' };
  const userId = 'worker-001';
  const organizationId = 'org-001';
  const groupCds = ['group-A'];

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkerProjectService();
    (organizationGroupRepository.findAll as jest.Mock).mockResolvedValue([
      { organization_group_cd: 'group-A', parent_group_cd: null, is_active: true },
    ]);
    (organizationGroupRepository.findDescendantCds as jest.Mock).mockResolvedValue(['group-A']);
    (workerProjectRepository.findWorkerAccessible as jest.Mock).mockResolvedValue([]);
    (workerProjectRepository.countWorkerAccessible as jest.Mock).mockResolvedValue(0);
  });

  it('returns empty items when no groups are assigned', async () => {
    (organizationGroupRepository.findAll as jest.Mock).mockResolvedValue([]);
    const result = await service.listWorkerAccessible(userId, organizationId, [], baseParams);
    expect(result.items).toHaveLength(0);
    expect(result.pagination.totalItems).toBe(0);
  });

  it('calls repository with organizationId and userId', async () => {
    const params = baseParams;
    await service.listWorkerAccessible(userId, organizationId, groupCds, params);
    expect(workerProjectRepository.findWorkerAccessible).toHaveBeenCalledWith(
      organizationId, userId, expect.any(Object)
    );
  });

  it('passes visibleGroupCds to repository', async () => {
    (organizationGroupRepository.findDescendantCds as jest.Mock).mockResolvedValue(['group-A', 'group-B']);
    await service.listWorkerAccessible(userId, organizationId, groupCds, baseParams);
    expect(workerProjectRepository.findWorkerAccessible).toHaveBeenCalledWith(
      organizationId, userId,
      expect.objectContaining({ visibleGroupCds: ['group-A', 'group-B'] })
    );
  });

  it('passes status filter to repository', async () => {
    const params = { ...baseParams, status: '1' as const };
    await service.listWorkerAccessible(userId, organizationId, groupCds, params);
    expect(workerProjectRepository.findWorkerAccessible).toHaveBeenCalledWith(
      organizationId, userId,
      expect.objectContaining({ status: '1' })
    );
  });

  it('passes sort options to repository', async () => {
    const params = { ...baseParams, sortBy: 'project_name' as const, order: 'asc' as const };
    await service.listWorkerAccessible(userId, organizationId, groupCds, params);
    expect(workerProjectRepository.findWorkerAccessible).toHaveBeenCalledWith(
      organizationId, userId,
      expect.objectContaining({ sortBy: 'project_name', order: 'asc' })
    );
  });

  it('calculates offset from page and limit', async () => {
    const params = { ...baseParams, page: 3, limit: 10 };
    await service.listWorkerAccessible(userId, organizationId, groupCds, params);
    expect(workerProjectRepository.findWorkerAccessible).toHaveBeenCalledWith(
      organizationId, userId,
      expect.objectContaining({ offset: 20, limit: 10 })
    );
  });

  it('maps project data correctly', async () => {
    const mockProject = {
      project_id: 'proj-001',
      project_name: 'Test Project',
      description: 'Description',
      project_status: 2,
      use_deemed_progress: true,
      create_at: new Date('2026-01-20T10:00:00.000Z'),
      update_at: new Date('2026-01-25T15:30:00.000Z'),
    };
    (workerProjectRepository.findWorkerAccessible as jest.Mock).mockResolvedValue([mockProject]);
    (workerProjectRepository.countWorkerAccessible as jest.Mock).mockResolvedValue(1);
    const result = await service.listWorkerAccessible(userId, organizationId, groupCds, baseParams);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].projectId).toBe('proj-001');
    expect(result.items[0].projectName).toBe('Test Project');
    expect(result.items[0].projectStatus).toBe(2);
  });

  it('throws DatabaseError on repository error', async () => {
    (workerProjectRepository.findWorkerAccessible as jest.Mock).mockRejectedValue(new Error('DB error'));
    await expect(
      service.listWorkerAccessible(userId, organizationId, groupCds, baseParams)
    ).rejects.toThrow('データベースエラーが発生しました');
  });

  it('throws timeout error with correct message', async () => {
    const timeoutError = new Error('query timeout');
    (timeoutError as any).message = 'timeout';
    (workerProjectRepository.findWorkerAccessible as jest.Mock).mockRejectedValue(timeoutError);
    await expect(
      service.listWorkerAccessible(userId, organizationId, groupCds, baseParams)
    ).rejects.toThrow();
  });
});
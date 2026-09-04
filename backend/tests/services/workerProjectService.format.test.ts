/**
 * WorkerProjectService data format tests
 *
 * Updated to use new signature.
 */

import { WorkerProjectService } from '../../src/services/workerProjectService';
import type { ListWorkerProjectsParams } from '../../src/types/workerProject';

jest.mock('../../src/database/db');
jest.mock('../../src/repositories/organizationGroupRepository', () => ({
  findAll: jest.fn().mockResolvedValue([
    { organization_group_cd: 'group-A', parent_group_cd: null, is_active: true },
  ]),
  findDescendantCds: jest.fn().mockResolvedValue(['group-A']),
}));
jest.mock('../../src/repositories/workerProjectRepository', () => ({
  findWorkerAccessible: jest.fn().mockResolvedValue([]),
  countWorkerAccessible: jest.fn().mockResolvedValue(0),
}));

import * as workerProjectRepository from '../../src/repositories/workerProjectRepository';
import * as organizationGroupRepository from '../../src/repositories/organizationGroupRepository';

describe('WorkerProjectService - Data Format Tests', () => {
  let service: WorkerProjectService;
  const baseParams: ListWorkerProjectsParams = { page: 1, limit: 20, sortBy: 'create_at', order: 'desc' };
  const userId = 'user-123';
  const orgId = 'org-456';
  const groupCds = ['group-A'];

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkerProjectService();
    (organizationGroupRepository.findAll as jest.Mock).mockResolvedValue([
      { organization_group_cd: 'group-A', parent_group_cd: null, is_active: true },
    ]);
    (organizationGroupRepository.findDescendantCds as jest.Mock).mockResolvedValue(['group-A']);
  });

  it('converts snake_case to camelCase', async () => {
    const mockProject = {
      project_id: '123e4567-e89b-12d3-a456-426614174000',
      project_name: 'Test Project',
      description: 'Test Description',
      project_status: 1,
      use_deemed_progress: true,
      create_at: new Date('2024-01-01T00:00:00.000Z'),
      update_at: new Date('2024-01-02T00:00:00.000Z'),
    };
    (workerProjectRepository.findWorkerAccessible as jest.Mock).mockResolvedValue([mockProject]);
    (workerProjectRepository.countWorkerAccessible as jest.Mock).mockResolvedValue(1);

    const result = await service.listWorkerAccessible(userId, orgId, groupCds, baseParams);

    expect(result.items[0].projectId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(result.items[0].projectName).toBe('Test Project');
    expect(result.items[0].projectStatus).toBe(1);
  });

  it('converts Date to ISO 8601 string', async () => {
    const createDate = new Date('2024-01-01T00:00:00.000Z');
    const mockProject = {
      project_id: 'proj-001',
      project_name: 'Test',
      description: '',
      project_status: 1,
      use_deemed_progress: true,
      create_at: createDate,
      update_at: createDate,
    };
    (workerProjectRepository.findWorkerAccessible as jest.Mock).mockResolvedValue([mockProject]);
    (workerProjectRepository.countWorkerAccessible as jest.Mock).mockResolvedValue(1);

    const result = await service.listWorkerAccessible(userId, orgId, groupCds, baseParams);

    expect(result.items[0].createdAt).toBe(createDate.toISOString());
  });

  it('returns correct pagination info', async () => {
    (workerProjectRepository.findWorkerAccessible as jest.Mock).mockResolvedValue([]);
    (workerProjectRepository.countWorkerAccessible as jest.Mock).mockResolvedValue(25);
    const params = { ...baseParams, page: 2, limit: 10 };

    const result = await service.listWorkerAccessible(userId, orgId, groupCds, params);

    expect(result.pagination.page).toBe(2);
    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.totalItems).toBe(25);
    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.hasNext).toBe(true);
    expect(result.pagination.hasPrev).toBe(true);
  });
});
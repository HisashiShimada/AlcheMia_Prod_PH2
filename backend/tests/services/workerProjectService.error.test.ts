/**
 * WorkerProjectService Error Handling Tests
 *
 * Updated to use new signature.
 */

import { WorkerProjectService } from '../../src/services/workerProjectService';
import { logger } from '../../src/utils/logger';
import type { ListWorkerProjectsParams } from '../../src/types/workerProject';

jest.mock('../../src/database/db');
jest.mock('../../src/utils/logger');
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

describe('WorkerProjectService - Error Handling', () => {
  let service: WorkerProjectService;
  const params: ListWorkerProjectsParams = { page: 1, limit: 20, sortBy: 'create_at', order: 'desc' };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkerProjectService();
    (organizationGroupRepository.findAll as jest.Mock).mockResolvedValue([
      { organization_group_cd: 'group-A', parent_group_cd: null, is_active: true },
    ]);
    (organizationGroupRepository.findDescendantCds as jest.Mock).mockResolvedValue(['group-A']);
  });

  it('throws DatabaseError on DB connection error', async () => {
    (workerProjectRepository.findWorkerAccessible as jest.Mock).mockRejectedValue(
      new Error('Connection refused')
    );
    await expect(
      service.listWorkerAccessible('user-123', 'org-456', ['group-A'], params)
    ).rejects.toThrow('データベースエラーが発生しました');
  });

  it('logs error on DB failure', async () => {
    const dbError = new Error('Deadlock detected');
    (workerProjectRepository.findWorkerAccessible as jest.Mock).mockRejectedValue(dbError);
    try {
      await service.listWorkerAccessible('user-123', 'org-456', ['group-A'], params);
    } catch (_) {}
    expect(logger.error).toHaveBeenCalledWith(
      'Worker project list query failed',
      expect.objectContaining({
        userId: 'user-123',
        organizationId: 'org-456',
        error: expect.stringContaining('Deadlock detected'),
      })
    );
  });

  it('throws on SELECT query error', async () => {
    (workerProjectRepository.findWorkerAccessible as jest.Mock).mockRejectedValue(
      new Error('Syntax error in SQL query')
    );
    await expect(
      service.listWorkerAccessible('user-123', 'org-456', ['group-A'], params)
    ).rejects.toThrow('データベースエラーが発生しました');
  });

  it('throws on COUNT query error', async () => {
    (workerProjectRepository.findWorkerAccessible as jest.Mock).mockResolvedValue([]);
    (workerProjectRepository.countWorkerAccessible as jest.Mock).mockRejectedValue(
      new Error('Count error')
    );
    await expect(
      service.listWorkerAccessible('user-123', 'org-456', ['group-A'], params)
    ).rejects.toThrow('データベースエラーが発生しました');
  });

  it('throws timeout error', async () => {
    const timeoutError: any = new Error('Connection timeout');
    timeoutError.code = 'ETIMEDOUT';
    (workerProjectRepository.findWorkerAccessible as jest.Mock).mockRejectedValue(timeoutError);
    await expect(
      service.listWorkerAccessible('user-123', 'org-456', ['group-A'], params)
    ).rejects.toThrow();
  });
});
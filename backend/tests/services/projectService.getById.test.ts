/**
 * ProjectService.getById ユニットテスト (TDD: RED phase)
 */

import { ProjectService } from '../../src/services/projectService';
import { getPool } from '../../src/database/db';
import { getStorageService } from '../../src/services/storageService';

jest.mock('../../src/database/db');
jest.mock('../../src/services/storageService');

describe('ProjectService.getById', () => {
  let projectService: ProjectService;
  let mockQuery: jest.Mock;
  let mockListFiles: jest.Mock;
  let mockGetSignedUrl: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockListFiles = jest.fn();
    mockGetSignedUrl = jest.fn();

    (getPool as jest.Mock).mockReturnValue({ query: mockQuery });
    (getStorageService as jest.Mock).mockReturnValue({
      listFiles: mockListFiles,
      getSignedUrl: mockGetSignedUrl
    });

    projectService = new ProjectService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const organizationId = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';
  const projectId = 'b1234567-89ab-cdef-0123-456789abcdef';
  const organizationPrefix = 'maiml_lab_001';

  it('Task 1.1: should retrieve project basic information', async () => {
    mockQuery
      .mockResolvedValueOnce({ 
        rows: [{ 
          organization_id: organizationId,
          project_id: projectId,
          project_name: 'Sample Project',
          owner_user_name: 'Taro Yamada',
          project_status: 1,
          project_status_name: 'プロジェクト実施中',
          checkout_status: 0,
          checkout_status_name: 'チェックイン中',
          create_at: new Date('2026-01-05T10:30:00Z')
        }] 
      })
      .mockResolvedValueOnce({ rows: [{ has_tasks: false }] });

    mockListFiles.mockResolvedValueOnce([]);

    const result = await projectService.getById(organizationId, projectId, organizationPrefix);

    expect(result.success).toBe(true);
    expect(result.data?.project.projectId).toBe(projectId);
    expect(result.data?.project.ownerUserName).toBe('Taro Yamada');
  });

  it('Task 1.2: should list S3 files gracefully on error', async () => {
    mockQuery
      .mockResolvedValueOnce({ 
        rows: [{ 
          organization_id: organizationId,
          project_id: projectId, 
          project_name: 'test',
          create_at: new Date()
        }] 
      })
      .mockResolvedValueOnce({ rows: [{ has_tasks: false }] });

    mockListFiles.mockRejectedValueOnce(new Error('S3 error'));

    const result = await projectService.getById(organizationId, projectId, organizationPrefix);

    expect(result.success).toBe(true);
    expect(result.data?.files).toEqual([]);
  });

  it('Task 1.3: should return empty tasks when not exist', async () => {
    mockQuery
      .mockResolvedValueOnce({ 
        rows: [{ 
          organization_id: organizationId,
          project_id: projectId, 
          project_name: 'test',
          create_at: new Date()
        }] 
      })
      .mockResolvedValueOnce({ rows: [{ has_tasks: false }] });

    mockListFiles.mockResolvedValueOnce([]);

    const result = await projectService.getById(organizationId, projectId, organizationPrefix);

    expect(result.data?.tasks).toEqual([]);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('Task 1.4: should retrieve task details when tasks exist', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          organization_id: organizationId,
          project_id: projectId,
          project_name: 'Sample Project',
          create_at: new Date()
        }]
      })
      .mockResolvedValueOnce({ rows: [{ has_tasks: true }] })
      .mockResolvedValueOnce({
        rows: [
          {
            organization_id: organizationId,
            project_id: projectId,
            method_id: 'method_001',
            task_no: 1,
            task_status: 3,
            task_status_name: '完了',
            experiment_start_at: new Date('2026-01-06T09:00:00Z'),
            experiment_end_at: new Date('2026-01-06T17:30:00Z'),
            experiment_user_id: 'user_123',
            experiment_user_name: '山田太郎',
            reviewed_at: new Date('2026-01-07T10:00:00Z'),
            review_user_id: 'user_456',
            review_user_name: '佐藤花子'
          }
        ]
      });

    mockListFiles.mockResolvedValue([]);

    const result = await projectService.getById(organizationId, projectId, organizationPrefix);

    expect(result.success).toBe(true);
    expect(result.data?.tasks).toHaveLength(1);
    expect(result.data?.tasks[0].methodId).toBe('method_001');
    expect(result.data?.tasks[0].taskNo).toBe(1);
    expect(result.data?.tasks[0].experimentUserName).toBe('山田太郎');
  });

  it('Task 1.5: should generate summary with correct counts', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          organization_id: organizationId,
          project_id: projectId,
          project_name: 'Sample Project',
          create_at: new Date()
        }]
      })
      .mockResolvedValueOnce({ rows: [{ has_tasks: true }] })
      .mockResolvedValueOnce({
        rows: [
          { task_status: 0, method_id: 'm1', task_no: 1 },
          { task_status: 1, method_id: 'm1', task_no: 2 },
          { task_status: 3, method_id: 'm2', task_no: 1 },
          { task_status: 3, method_id: 'm2', task_no: 2 },
        ].map(t => ({
          organization_id: organizationId,
          project_id: projectId,
          method_id: t.method_id,
          task_no: t.task_no,
          task_status: t.task_status,
          task_status_name: '',
          experiment_start_at: null,
          experiment_end_at: null,
          experiment_user_id: null,
          experiment_user_name: null,
          reviewed_at: null,
          review_user_id: null,
          review_user_name: null
        }))
      });

    mockListFiles
      .mockResolvedValueOnce([
        { key: 'file1.maiml', size: 100, lastModified: new Date() },
        { key: 'file2.maiml', size: 200, lastModified: new Date() }
      ])
      .mockResolvedValueOnce([
        { key: 'archive/file1_v1.maiml', size: 150, lastModified: new Date() }
      ]);

    mockGetSignedUrl.mockResolvedValue('https://signed-url.com');

    const result = await projectService.getById(organizationId, projectId, organizationPrefix);

    expect(result.success).toBe(true);
    expect(result.data?.summary).toBeDefined();
    expect(result.data?.summary.totalFiles).toBe(3);
    expect(result.data?.summary.totalTasks).toBe(4);
    expect(result.data?.summary.completedTasks).toBe(2);
    expect(result.data?.summary.inProgressTasks).toBe(1);
    expect(result.data?.summary.pendingTasks).toBe(1);
  });

  it('Task 1.5: should return zero counts when no tasks', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ 
          organization_id: organizationId, 
          project_id: projectId, 
          project_name: 'Test', 
          create_at: new Date() 
        }]
      })
      .mockResolvedValueOnce({ rows: [{ has_tasks: false }] });

    mockListFiles.mockResolvedValue([]);

    const result = await projectService.getById(organizationId, projectId, organizationPrefix);

    expect(result.data?.summary.totalTasks).toBe(0);
    expect(result.data?.summary.completedTasks).toBe(0);
    expect(result.data?.summary.inProgressTasks).toBe(0);
    expect(result.data?.summary.pendingTasks).toBe(0);
  });
});

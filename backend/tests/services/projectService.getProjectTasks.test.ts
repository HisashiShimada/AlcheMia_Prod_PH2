/**
 * ProjectService.getProjectTasks Tests
 * 
 * TDD: Task 3.1 - Service Layer Tests (RED Phase)
 */

import { ProjectService } from '../../src/services/projectService';
import { getPool } from '../../src/database/db';

jest.mock('../../src/database/db');

describe('ProjectService.getProjectTasks', () => {
  let projectService: ProjectService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    projectService = new ProjectService();
    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('正常系', () => {
    it('プロジェクトが存在する場合、タスク一覧と統計情報を返す', async () => {
      // Arrange
      const organizationId = 'org-123';
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      const status = 'all';

      // プロジェクト存在確認のモック
      mockQuery.mockResolvedValueOnce({
        rows: [{ project_id: projectId, project_name: 'Test Project' }],
      });

      // タスク一覧取得のモック
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            organization_id: organizationId,
            project_id: projectId,
            method_id: 'method-1',
            task_no: 1,
            task_status: 0, // pending
            experiment_start_at: null,
            experiment_end_at: null,
            experiment_user_id: 'user-1',
            experiment_user_name: 'Worker 1',
            reviewed_at: null,
            review_user_id: null,
            review_user_name: null,
          },
          {
            organization_id: organizationId,
            project_id: projectId,
            method_id: 'method-1',
            task_no: 2,
            task_status: 1, // in_progress
            experiment_start_at: new Date('2026-01-23T10:00:00Z'),
            experiment_end_at: null,
            experiment_user_id: 'user-2',
            experiment_user_name: 'Worker 2',
            reviewed_at: null,
            review_user_id: null,
            review_user_name: null,
          },
        ],
      });

      // 統計情報取得のモック
      mockQuery.mockResolvedValueOnce({
        rows: [
          { task_status: 0, count: '1' },
          { task_status: 1, count: '1' },
        ],
      });

      // Act
      const result = await projectService.getProjectTasks(
        organizationId,
        projectId,
        status
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.projectId).toBe(projectId);
      expect(result.data?.projectName).toBe('Test Project');
      expect(result.data?.tasks).toHaveLength(2);
      expect(result.data?.tasks[0]).toMatchObject({
        methodId: 'method-1',
        taskNo: 1,
        taskStatus: 'pending',
        experimentUserId: 'user-1',
        experimentUserName: 'Worker 1',
      });
      expect(result.data?.statistics).toEqual({
        total: 2,
        pending: 1,
        inProgress: 1,
        completed: 0,
        failed: 0,
      });
    });

    it('status=pending の場合、実行待ちタスクのみを返す', async () => {
      // Arrange
      const organizationId = 'org-123';
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      const status = 'pending';

      mockQuery.mockResolvedValueOnce({
        rows: [{ project_id: projectId, project_name: 'Test Project' }],
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            organization_id: organizationId,
            project_id: projectId,
            method_id: 'method-1',
            task_no: 1,
            task_status: 0,
            experiment_start_at: null,
            experiment_end_at: null,
            experiment_user_id: null,
            experiment_user_name: null,
            reviewed_at: null,
            review_user_id: null,
            review_user_name: null,
          },
        ],
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          { task_status: 0, count: '5' },
          { task_status: 1, count: '3' },
          { task_status: 3, count: '2' },
        ],
      });

      // Act
      const result = await projectService.getProjectTasks(
        organizationId,
        projectId,
        status
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.tasks).toHaveLength(1);
      expect(result.data?.tasks[0].taskStatus).toBe('pending');
      expect(result.data?.statistics.total).toBe(10);
      expect(result.data?.statistics.pending).toBe(5);
    });

    it('タスクが0件の場合、空配列と統計情報（全て0）を返す', async () => {
      // Arrange
      const organizationId = 'org-123';
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      const status = 'all';

      mockQuery.mockResolvedValueOnce({
        rows: [{ project_id: projectId, project_name: 'Test Project' }],
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      // Act
      const result = await projectService.getProjectTasks(
        organizationId,
        projectId,
        status
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.tasks).toEqual([]);
      expect(result.data?.statistics).toEqual({
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        failed: 0,
      });
    });
  });

  describe('異常系', () => {
    it('プロジェクトが存在しない場合、RESOURCE_NOT_FOUNDエラーを返す', async () => {
      // Arrange
      const organizationId = 'org-123';
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      const status = 'all';

      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      // Act
      const result = await projectService.getProjectTasks(
        organizationId,
        projectId,
        status
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
      expect(result.error?.message).toContain('プロジェクトが見つかりません');
    });

    it('データベースエラー時、SYSTEM_DATABASE_ERRORを返す', async () => {
      // Arrange
      const organizationId = 'org-123';
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      const status = 'all';

      mockQuery.mockRejectedValueOnce(new Error('Database connection error'));

      // Act
      const result = await projectService.getProjectTasks(
        organizationId,
        projectId,
        status
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SYSTEM_DATABASE_ERROR');
      expect(result.error?.message).toContain('データベースエラーが発生しました');
    });
  });
});
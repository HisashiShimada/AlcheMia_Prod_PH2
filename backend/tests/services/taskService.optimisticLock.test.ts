/**
 * タスクサービス - 楽観的ロック制御テスト
 * 
 * @description updateTaskStatusの楽観的ロック制御をテスト（TDD方式）
 */

import { updateTaskStatus, TaskStatusEnum } from '../../src/services/taskService';
import { getPool } from '../../src/database/db';

// データベース接続プールをモック化
jest.mock('../../src/database/db');

describe('taskService - Optimistic Lock Control', () => {
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    // モッククライアントの初期化
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // モックプールの初期化
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('楽観的ロック制御', () => {
    const validParams = {
      organizationId: 'org-123',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      methodId: 'method-001',
      taskNo: 1,
      status: TaskStatusEnum.IN_PROGRESS,
      currentUpdateAt: '2026-01-28T10:00:00.000Z',
      userId: 'user-123',
      role: 'experiment_worker',
      comment: 'Starting task',
    };

    it('should successfully update when update_at matches (no concurrent update)', async () => {
      // BEGINトランザクション
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // SELECT FOR UPDATE - タスクを取得
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          organization_id: 'org-123',
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method-001',
          task_no: 1,
          task_status: TaskStatusEnum.PENDING,
          update_at: '2026-01-28T10:00:00.000Z',
          experiment_user_id: 'user-123',
        }],
        rowCount: 1,
      });

      // UPDATE - 更新成功（rowCount = 1）
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          organization_id: 'org-123',
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method-001',
          task_no: 1,
          task_status: TaskStatusEnum.IN_PROGRESS,
          update_at: '2026-01-28T10:05:00.000Z',
          experiment_start_at: '2026-01-28T10:05:00.000Z',
          experiment_user_id: 'user-123',
        }],
        rowCount: 1,
      });

      // COMMITトランザクション
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await updateTaskStatus(validParams);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.taskStatus).toBe('in_progress'); // 文字列形式
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should detect concurrent update when update_at does not match', async () => {
      // BEGINトランザクション
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // SELECT FOR UPDATE - タスクを取得
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          organization_id: 'org-123',
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method-001',
          task_no: 1,
          task_status: TaskStatusEnum.PENDING,
          update_at: '2026-01-28T10:00:00.000Z', // 元のタイムスタンプ
          experiment_user_id: 'user-123',
        }],
        rowCount: 1,
      });

      // UPDATE - 更新失敗（rowCount = 0: update_atが一致しない）
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0, // 楽観的ロック失敗
      });

      // ROLLBACKトランザクション
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await updateTaskStatus({
        ...validParams,
        currentUpdateAt: '2026-01-28T09:00:00.000Z', // 古いタイムスタンプ
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('CONCURRENT_UPDATE_DETECTED');
      expect(result.error?.message.toLowerCase()).toContain('concurrent update');
      expect(result.error?.message.toLowerCase()).toContain('retry');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should include retry instructions in error message', async () => {
      // BEGINトランザクション
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // SELECT FOR UPDATE
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          organization_id: 'org-123',
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method-001',
          task_no: 1,
          task_status: TaskStatusEnum.PENDING,
          update_at: '2026-01-28T10:00:00.000Z',
          experiment_user_id: 'user-123',
        }],
        rowCount: 1,
      });

      // UPDATE失敗
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await updateTaskStatus({
        ...validParams,
        currentUpdateAt: '2026-01-28T09:00:00.000Z',
      });

      expect(result.error?.message.toLowerCase()).toMatch(/retry/);
      expect(result.error?.message).toContain('fetch the latest data');
    });

    it('should return 409 Conflict for concurrent update', async () => {
      // BEGINトランザクション
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // SELECT FOR UPDATE
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          organization_id: 'org-123',
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          method_id: 'method-001',
          task_no: 1,
          task_status: TaskStatusEnum.PENDING,
          update_at: '2026-01-28T10:00:00.000Z',
          experiment_user_id: 'user-123',
        }],
        rowCount: 1,
      });

      // UPDATE失敗
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await updateTaskStatus({
        ...validParams,
        currentUpdateAt: '2026-01-28T09:00:00.000Z',
      });

      // エラーコードからHTTPステータスコードへのマッピングは
      // コントローラー層で行われるが、ここではエラーコードを確認
      expect(result.error?.code).toBe('CONCURRENT_UPDATE_DETECTED');
    });
  });

  describe('楽観的ロック制御 - エッジケース', () => {
    it('should handle null currentUpdateAt as validation error', async () => {
      const result = await updateTaskStatus({
        organizationId: 'org-123',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        methodId: 'method-001',
        taskNo: 1,
        status: TaskStatusEnum.IN_PROGRESS,
        currentUpdateAt: null as any,
        userId: 'user-123',
        role: 'experiment_worker',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should handle invalid ISO8601 format for currentUpdateAt', async () => {
      const result = await updateTaskStatus({
        organizationId: 'org-123',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        methodId: 'method-001',
        taskNo: 1,
        status: TaskStatusEnum.IN_PROGRESS,
        currentUpdateAt: 'invalid-date',
        userId: 'user-123',
        role: 'experiment_worker',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });
});
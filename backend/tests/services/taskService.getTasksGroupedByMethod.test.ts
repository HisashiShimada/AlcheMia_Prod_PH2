/**
 * TaskService.getTasksGroupedByMethod単体テスト
 * 
 * Feature: worker-task-list-api
 * Task: 5.2 TaskServiceの単体テスト
 * 
 * テスト対象:
 * - タスクがmethod_id単位で正しくグループ化される
 * - 空のメソッド（タスクなし）も含まれる
 * - experiment_order順にソートされる
 * - ソート条件が正しく適用される（Repositoryに正しく渡される）
 * - 日時フィールドがISO 8601形式に変換される
 * - データ整合性検証（不正なmethod_idの除外）
 * 
 * Requirements: 1, 3, 4, 11
 */

import { TaskService } from '../../src/services/taskService';
import { TaskRepository } from '../../src/repositories/taskRepository';
import { MethodTaskRecord, TaskFilters } from '../../src/types/task';
import { logger } from '../../src/utils/logger';

// TaskRepositoryのモック
jest.mock('../../src/repositories/taskRepository');

// loggerのモック
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('TaskService.getTasksGroupedByMethod', () => {
  let taskService: TaskService;
  let mockTaskRepository: jest.Mocked<TaskRepository>;

  const projectId = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6';
  const organizationId = 'b2c3d4e5-f6a7-48b9-c0d1-e2f3a4b5c6d7';

  beforeEach(() => {
    // モックのクリア
    jest.clearAllMocks();

    // TaskRepositoryのモックインスタンス作成
    mockTaskRepository = new TaskRepository() as jest.Mocked<TaskRepository>;
    
    // TaskServiceのインスタンス作成（モックRepositoryを注入）
    taskService = new TaskService(mockTaskRepository);
  });

  describe('基本機能: タスクのグループ化', () => {
    it('タスクをmethod_id単位で正しくグループ化する', async () => {
      // Arrange: 2つのメソッド、それぞれ2つと1つのタスク
      const mockRecords: MethodTaskRecord[] = [
        // メソッド1のタスク1
        {
          method_id: 'c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8',
          method_name: 'メソッド1',
          experiment_order: 1,
          task_detail_id: 'task-1-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: 'user-1',
          assign_user_name: 'ユーザー1',
          progress_rate: 30,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-02T10:00:00Z'),
        },
        // メソッド1のタスク2
        {
          method_id: 'c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8',
          method_name: 'メソッド1',
          experiment_order: 1,
          task_detail_id: 'task-1-2',
          task_detail_no: 2,
          task_status: 'started',
          assign_user_id: 'user-2',
          assign_user_name: 'ユーザー2',
          progress_rate: 60,
          created_at: new Date('2024-01-03T10:00:00Z'),
          updated_at: new Date('2024-01-04T10:00:00Z'),
        },
        // メソッド2のタスク1
        {
          method_id: 'd4e5f6a7-b8c9-40d1-e2f3-a4b5c6d7e8f9',
          method_name: 'メソッド2',
          experiment_order: 2,
          task_detail_id: 'task-2-1',
          task_detail_no: 1,
          task_status: 'in_progress',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-05T10:00:00Z'),
          updated_at: new Date('2024-01-06T10:00:00Z'),
        },
      ];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      // Act
      const result = await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // Assert
      expect(result).toHaveLength(2); // 2つのメソッドグループ
      
      // メソッド1のグループ検証
      expect(result[0].method_id).toBe('c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8');
      expect(result[0].method_name).toBe('メソッド1');
      expect(result[0].experiment_order).toBe(1);
      expect(result[0].tasks).toHaveLength(2);
      expect(result[0].tasks[0].task_id).toBe('task-1-1');
      expect(result[0].tasks[1].task_id).toBe('task-1-2');
      
      // メソッド2のグループ検証
      expect(result[1].method_id).toBe('d4e5f6a7-b8c9-40d1-e2f3-a4b5c6d7e8f9');
      expect(result[1].method_name).toBe('メソッド2');
      expect(result[1].experiment_order).toBe(2);
      expect(result[1].tasks).toHaveLength(1);
      expect(result[1].tasks[0].task_id).toBe('task-2-1');
    });

    it('空のメソッド（タスクなし）も含める - task_detail_idがnullの場合', async () => {
      // Arrange: メソッド情報のみ（task_detail_idがnull）のレコードを含む
      const mockRecords: MethodTaskRecord[] = [
        // メソッド1: タスクあり
        {
          method_id: 'c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8',
          method_name: 'メソッド1',
          experiment_order: 1,
          task_detail_id: 'task-1-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-02T10:00:00Z'),
        },
        // メソッド2: タスクなし（task_detail_idがnull）
        {
          method_id: 'd4e5f6a7-b8c9-40d1-e2f3-a4b5c6d7e8f9',
          method_name: 'メソッド2',
          experiment_order: 2,
          task_detail_id: null,
          task_detail_no: null,
          task_status: null,
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: null,
          updated_at: null,
        },
        // メソッド3: タスクあり
        {
          method_id: 'e5f6a7b8-c9d0-41e2-f3a4-b5c6d7e8f9a0',
          method_name: 'メソッド3',
          experiment_order: 3,
          task_detail_id: 'task-3-1',
          task_detail_no: 1,
          task_status: 'completed',
          assign_user_id: 'user-3',
          assign_user_name: 'ユーザー3',
          progress_rate: 100,
          created_at: new Date('2024-01-03T10:00:00Z'),
          updated_at: new Date('2024-01-04T10:00:00Z'),
        },
      ];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      // Act
      const result = await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // Assert
      expect(result).toHaveLength(3); // 3つのメソッドグループ
      
      // メソッド1: タスクあり
      expect(result[0].method_id).toBe('c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8');
      expect(result[0].tasks).toHaveLength(1);
      
      // メソッド2: タスクなし（空配列）
      expect(result[1].method_id).toBe('d4e5f6a7-b8c9-40d1-e2f3-a4b5c6d7e8f9');
      expect(result[1].method_name).toBe('メソッド2');
      expect(result[1].experiment_order).toBe(2);
      expect(result[1].tasks).toHaveLength(0); // 空配列
      expect(result[1].tasks).toEqual([]); // 明示的に空配列であることを確認
      
      // メソッド3: タスクあり
      expect(result[2].method_id).toBe('e5f6a7b8-c9d0-41e2-f3a4-b5c6d7e8f9a0');
      expect(result[2].tasks).toHaveLength(1);
    });

    it('データが空の場合、空配列を返す', async () => {
      // Arrange
      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue([]);

      // Act
      const result = await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // Assert
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });
  });

  describe('ソート機能', () => {
    it('experiment_order順にメソッドをソートする', async () => {
      // Arrange: experiment_orderが逆順で返される
      const mockRecords: MethodTaskRecord[] = [
        // メソッド3 (experiment_order: 3)
        {
          method_id: 'e5f6a7b8-c9d0-41e2-f3a4-b5c6d7e8f9a0',
          method_name: 'メソッド3',
          experiment_order: 3,
          task_detail_id: 'task-3-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-02T10:00:00Z'),
        },
        // メソッド1 (experiment_order: 1)
        {
          method_id: 'c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8',
          method_name: 'メソッド1',
          experiment_order: 1,
          task_detail_id: 'task-1-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-03T10:00:00Z'),
          updated_at: new Date('2024-01-04T10:00:00Z'),
        },
        // メソッド2 (experiment_order: 2)
        {
          method_id: 'd4e5f6a7-b8c9-40d1-e2f3-a4b5c6d7e8f9',
          method_name: 'メソッド2',
          experiment_order: 2,
          task_detail_id: 'task-2-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-05T10:00:00Z'),
          updated_at: new Date('2024-01-06T10:00:00Z'),
        },
      ];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      // Act
      const result = await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // Assert: experiment_order昇順にソートされていることを確認
      expect(result[0].experiment_order).toBe(1);
      expect(result[0].method_name).toBe('メソッド1');
      expect(result[1].experiment_order).toBe(2);
      expect(result[1].method_name).toBe('メソッド2');
      expect(result[2].experiment_order).toBe(3);
      expect(result[2].method_name).toBe('メソッド3');
    });

    it('フィルタ条件をTaskRepositoryに正しく渡す', async () => {
      // Arrange
      const mockRecords: MethodTaskRecord[] = [];
      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      const filters: TaskFilters = {
        methodId: 'c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8',
        status: 'started',
        assignUserId: 'user-1',
        sortBy: 'created_at',
        order: 'desc',
      };

      // Act
      await taskService.getTasksGroupedByMethod(projectId, organizationId, filters);

      // Assert: TaskRepositoryが正しいパラメータで呼ばれたことを確認
      expect(mockTaskRepository.findMethodsAndTasksByProject).toHaveBeenCalledTimes(1);
      expect(mockTaskRepository.findMethodsAndTasksByProject).toHaveBeenCalledWith(
        projectId,
        organizationId,
        filters
      );
    });
  });

  describe('データ変換機能', () => {
    it('日時フィールドをISO 8601形式に変換する', async () => {
      // Arrange
      const mockRecords: MethodTaskRecord[] = [
        {
          method_id: 'c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8',
          method_name: 'メソッド1',
          experiment_order: 1,
          task_detail_id: 'task-1-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-01T10:30:45.123Z'),
          updated_at: new Date('2024-01-02T15:45:30.456Z'),
        },
      ];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      // Act
      const result = await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // Assert: ISO 8601形式（YYYY-MM-DDTHH:mm:ss.sssZ）に変換されていることを確認
      expect(result[0].tasks[0].created_at).toBe('2024-01-01T10:30:45.123Z');
      expect(result[0].tasks[0].updated_at).toBe('2024-01-02T15:45:30.456Z');
      
      // ISO 8601形式の正規表現チェック
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(result[0].tasks[0].created_at).toMatch(iso8601Regex);
      expect(result[0].tasks[0].updated_at).toMatch(iso8601Regex);
    });

    it('担当者名がnullの場合も正しく処理する', async () => {
      // Arrange
      const mockRecords: MethodTaskRecord[] = [
        {
          method_id: 'c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8',
          method_name: 'メソッド1',
          experiment_order: 1,
          task_detail_id: 'task-1-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-02T10:00:00Z'),
        },
      ];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      // Act
      const result = await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // Assert: nullが正しく保持されていることを確認
      expect(result[0].tasks[0].assign_user_id).toBeNull();
      expect(result[0].tasks[0].assign_user_name).toBeNull();
    });

    it('progress_rateが正しく保持される', async () => {
      // Arrange
      const mockRecords: MethodTaskRecord[] = [
        {
          method_id: 'c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8',
          method_name: 'メソッド1',
          experiment_order: 1,
          task_detail_id: 'task-1-1',
          task_detail_no: 1,
          task_status: 'in_progress',
          assign_user_id: 'user-1',
          assign_user_name: 'ユーザー1',
          progress_rate: 75.5,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-02T10:00:00Z'),
        },
      ];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      // Act
      const result = await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // Assert
      expect(result[0].tasks[0].progress_rate).toBe(75.5);
    });
  });

  describe('データ整合性検証', () => {
    it('不正なmethod_id（UUID形式でない）を持つレコードを除外する', async () => {
      // Arrange: 正常なレコードと不正なmethod_idを持つレコード
      const mockRecords: MethodTaskRecord[] = [
        // 正常なレコード1
        {
          method_id: 'c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8',
          method_name: 'メソッド1',
          experiment_order: 1,
          task_detail_id: 'task-1-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-02T10:00:00Z'),
        },
        // 不正なmethod_id（UUID形式でない）
        {
          method_id: 'invalid-method-id',
          method_name: 'メソッド不正',
          experiment_order: 2,
          task_detail_id: 'task-2-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-03T10:00:00Z'),
          updated_at: new Date('2024-01-04T10:00:00Z'),
        },
        // 正常なレコード2
        {
          method_id: 'd4e5f6a7-b8c9-40d1-e2f3-a4b5c6d7e8f9',
          method_name: 'メソッド3',
          experiment_order: 3,
          task_detail_id: 'task-3-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-05T10:00:00Z'),
          updated_at: new Date('2024-01-06T10:00:00Z'),
        },
      ];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      // Act
      const result = await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // Assert: 不正なレコードが除外され、正常なレコードのみが含まれる
      expect(result).toHaveLength(2);
      expect(result[0].method_id).toBe('c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8');
      expect(result[1].method_id).toBe('d4e5f6a7-b8c9-40d1-e2f3-a4b5c6d7e8f9');
      
      // 警告ログが出力されることを確認
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        'Data inconsistency detected: Invalid method_id found in project tasks',
        expect.objectContaining({
          projectId,
          organizationId,
          invalidCount: 1,
          totalCount: 3,
        })
      );
    });

    it('method_idがnullまたは空文字のレコードを除外する', async () => {
      // Arrange
      const mockRecords: MethodTaskRecord[] = [
        // 正常なレコード
        {
          method_id: 'c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8',
          method_name: 'メソッド1',
          experiment_order: 1,
          task_detail_id: 'task-1-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-02T10:00:00Z'),
        },
        // method_idがnull
        {
          method_id: null as any,
          method_name: 'メソッドNull',
          experiment_order: 2,
          task_detail_id: 'task-2-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-03T10:00:00Z'),
          updated_at: new Date('2024-01-04T10:00:00Z'),
        },
        // method_idが空文字
        {
          method_id: '',
          method_name: 'メソッド空文字',
          experiment_order: 3,
          task_detail_id: 'task-3-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-05T10:00:00Z'),
          updated_at: new Date('2024-01-06T10:00:00Z'),
        },
      ];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      // Act
      const result = await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // Assert: 不正なレコードが除外され、正常なレコードのみが含まれる
      expect(result).toHaveLength(1);
      expect(result[0].method_id).toBe('c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8');
      
      // 警告ログが出力されることを確認
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        'Data inconsistency detected: Invalid method_id found in project tasks',
        expect.objectContaining({
          projectId,
          organizationId,
          invalidCount: 2,
          totalCount: 3,
        })
      );
    });

    it('不正なmethod_idが複数ある場合、すべて除外する', async () => {
      // Arrange: すべて不正なmethod_id
      const mockRecords: MethodTaskRecord[] = [
        {
          method_id: 'invalid-1',
          method_name: 'メソッド不正1',
          experiment_order: 1,
          task_detail_id: 'task-1-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-02T10:00:00Z'),
        },
        {
          method_id: '',
          method_name: 'メソッド空文字',
          experiment_order: 2,
          task_detail_id: 'task-2-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-03T10:00:00Z'),
          updated_at: new Date('2024-01-04T10:00:00Z'),
        },
      ];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      // Act
      const result = await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // Assert: すべて除外され、空配列
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
      
      // 警告ログが出力されることを確認
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        'Data inconsistency detected: Invalid method_id found in project tasks',
        expect.objectContaining({
          projectId,
          organizationId,
          invalidCount: 2,
          totalCount: 2,
        })
      );
    });
  });

  describe('ログ出力', () => {
    it('INFO: API呼び出し開始時と完了時にログを出力する', async () => {
      // Arrange
      const mockRecords: MethodTaskRecord[] = [
        {
          method_id: 'c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8',
          method_name: 'メソッド1',
          experiment_order: 1,
          task_detail_id: 'task-1-1',
          task_detail_no: 1,
          task_status: 'not_started',
          assign_user_id: null,
          assign_user_name: null,
          progress_rate: 0,
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-02T10:00:00Z'),
        },
      ];

      mockTaskRepository.findMethodsAndTasksByProject.mockResolvedValue(mockRecords);

      // Act
      await taskService.getTasksGroupedByMethod(projectId, organizationId, {});

      // Assert: INFO ログが2回呼ばれる（開始と完了）
      expect(logger.info).toHaveBeenCalledTimes(2);
      
      // 開始ログ
      expect(logger.info).toHaveBeenNthCalledWith(1, 'TaskService.getTasksGroupedByMethod - Start', 
        expect.objectContaining({
          action: 'get_tasks_grouped_by_method',
          projectId,
          organizationId,
        })
      );
      
      // 完了ログ（結果件数とレスポンスタイムを含む）
      expect(logger.info).toHaveBeenNthCalledWith(2, 'TaskService.getTasksGroupedByMethod - Success',
        expect.objectContaining({
          action: 'get_tasks_grouped_by_method',
          projectId,
          organizationId,
          result: expect.objectContaining({
            methodCount: 1,
            taskCount: 1,
            responseTimeMs: expect.any(Number),
          }),
        })
      );
    });

    it('ERROR: 例外発生時にエラーログを出力する', async () => {
      // Arrange: Repositoryがエラーをスロー
      const mockError = new Error('Database connection failed');
      mockTaskRepository.findMethodsAndTasksByProject.mockRejectedValue(mockError);

      // Act & Assert
      await expect(
        taskService.getTasksGroupedByMethod(projectId, organizationId, {})
      ).rejects.toThrow('Database connection failed');

      // ERROR ログが出力されることを確認
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith('TaskService.getTasksGroupedByMethod - Error',
        expect.objectContaining({
          action: 'get_tasks_grouped_by_method',
          projectId,
          organizationId,
          responseTimeMs: expect.any(Number),
          errorMessage: 'Database connection failed',
          errorStack: expect.any(String),
          errorName: 'Error',
        })
      );
    });
  });
});

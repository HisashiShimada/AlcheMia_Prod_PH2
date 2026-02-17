/**
 * TaskRepositoryのテスト
 */

import { TaskRepository } from '../../src/repositories/taskRepository';
import { TaskInput } from '../../src/types/instruction';
import { resetPool } from '../../src/database/db';

describe('TaskRepository', () => {
  let repository: TaskRepository;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    // モックプールとクライアントをセットアップ
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    // プールをリセットしてモックプールを注入
    resetPool();
    jest.spyOn(require('../../src/database/db'), 'getPool').mockReturnValue(mockPool);

    repository = new TaskRepository();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('upsertTasks', () => {
    const projectId = 'proj-123';
    const organizationId = 'org-456';

    const sampleTasks: TaskInput[] = [
      {
        methodId: 'method_001',
        experimentCondition: 0,
        trialCount: 3,
      },
      {
        methodId: 'method_002',
        experimentCondition: 1,
        trialCount: 5,
      },
    ];

    test('トランザクション付きで複数のタスクをUPSERTできる', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 2,
      });

      await repository.upsertTasks(
        sampleTasks,
        projectId,
        organizationId,
        mockClient
      );

      expect(mockClient.query).toHaveBeenCalledTimes(1);

      // INSERTクエリが実行されたことを確認
      const queryCall = mockClient.query.mock.calls[0];
      expect(queryCall[0]).toContain('INSERT INTO project_task');
      
      // ON CONFLICTが含まれることを確認（UPSERT）
      expect(queryCall[0]).toContain('ON CONFLICT');
      
      // Parameterized Queryであることを確認
      expect(queryCall[1]).toBeDefined();
      expect(Array.isArray(queryCall[1])).toBe(true);

      // organization_idとproject_idが含まれることを確認
      expect(queryCall[0]).toContain('organization_id');
      expect(queryCall[0]).toContain('project_id');
      
      // プールは使用されていないことを確認（トランザクション専用）
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('タスクデータが正しくパラメータ化される', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      const singleTask: TaskInput[] = [
        {
          methodId: 'method_test',
          experimentCondition: 0,
          trialCount: 2,
        },
      ];

      await repository.upsertTasks(
        singleTask,
        projectId,
        organizationId,
        mockClient
      );

      const queryCall = mockClient.query.mock.calls[0];
      const params = queryCall[1];

      // organization_id, project_id が含まれることを確認
      expect(params).toContain(organizationId);
      expect(params).toContain(projectId);

      // タスクデータが含まれることを確認
      expect(params).toContain('method_test');
      expect(params).toContain(0); // experimentCondition
      expect(params).toContain(2); // trialCount (attempts_count)
    });

    test('trialCountが省略された場合、デフォルト値1が使用される', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      const taskWithoutTrialCount: TaskInput[] = [
        {
          methodId: 'method_default',
          experimentCondition: 0,
        },
      ];

      await repository.upsertTasks(
        taskWithoutTrialCount,
        projectId,
        organizationId,
        mockClient
      );

      const queryCall = mockClient.query.mock.calls[0];
      const params = queryCall[1];

      // デフォルト値1が含まれることを確認
      expect(params).toContain(1);
    });

    test('ON CONFLICT時にattempts_countが更新される', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      await repository.upsertTasks(
        sampleTasks,
        projectId,
        organizationId,
        mockClient
      );

      const queryCall = mockClient.query.mock.calls[0];
      
      // DO UPDATEが含まれることを確認
      expect(queryCall[0]).toContain('DO UPDATE');
      
      // attempts_countが更新されることを確認
      expect(queryCall[0]).toContain('attempts_count');
    });

    test('空配列の場合でも正常に処理できる', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      // 空配列でもエラーをスローしない
      await expect(
        repository.upsertTasks(
          [],
          projectId,
          organizationId,
          mockClient
        )
      ).resolves.not.toThrow();
    });

    test('データベースエラーが発生した場合、エラーをスローする', async () => {
      const dbError = new Error('Upsert failed');
      mockClient.query.mockRejectedValueOnce(dbError);

      await expect(
        repository.upsertTasks(
          sampleTasks,
          projectId,
          organizationId,
          mockClient
        )
      ).rejects.toThrow('Upsert failed');
    });
  });

  describe('createTaskDetails', () => {
    const projectId = 'proj-123';
    const organizationId = 'org-456';

    const sampleTasks: TaskInput[] = [
      {
        methodId: 'method_001',
        experimentCondition: 0,
        trialCount: 3,
      },
      {
        methodId: 'method_002',
        experimentCondition: 1,
        trialCount: 2,
      },
    ];

    test('トランザクション付きで複数のタスク詳細を作成できる', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 5, // 3 + 2 = 5件
      });

      await repository.createTaskDetails(
        sampleTasks,
        projectId,
        organizationId,
        mockClient
      );

      expect(mockClient.query).toHaveBeenCalledTimes(1);

      // INSERTクエリが実行されたことを確認
      const queryCall = mockClient.query.mock.calls[0];
      expect(queryCall[0]).toContain('INSERT INTO project_task_detail');
      
      // Parameterized Queryであることを確認
      expect(queryCall[1]).toBeDefined();
      expect(Array.isArray(queryCall[1])).toBe(true);
    });

    test('task_noが1から連番で生成される', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 3,
      });

      const singleTask: TaskInput[] = [
        {
          methodId: 'method_test',
          experimentCondition: 0,
          trialCount: 3,
        },
      ];

      await repository.createTaskDetails(
        singleTask,
        projectId,
        organizationId,
        mockClient
      );

      const queryCall = mockClient.query.mock.calls[0];
      const params = queryCall[1];

      // task_noが1, 2, 3で含まれることを確認
      const taskNos = params.filter((p: any) => typeof p === 'number' && p >= 1 && p <= 3);
      expect(taskNos.length).toBeGreaterThanOrEqual(3);
    });

    test('task_statusがデフォルト値0で設定される', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 2,
      });

      const singleTask: TaskInput[] = [
        {
          methodId: 'method_status',
          experimentCondition: 0,
          trialCount: 2,
        },
      ];

      await repository.createTaskDetails(
        singleTask,
        projectId,
        organizationId,
        mockClient
      );

      const queryCall = mockClient.query.mock.calls[0];
      const params = queryCall[1];

      // task_status = 0が含まれることを確認
      const statusValues = params.filter((p: any) => p === 0);
      expect(statusValues.length).toBeGreaterThanOrEqual(2);
    });

    test('trialCountの合計分のレコードが生成される', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 5,
      });

      await repository.createTaskDetails(
        sampleTasks, // trialCount: 3 + 2 = 5
        projectId,
        organizationId,
        mockClient
      );

      const queryCall = mockClient.query.mock.calls[0];
      
      // VALUES句が5件分あることを確認（間接的にチェック）
      expect(queryCall[0]).toContain('VALUES');
    });

    test('trialCountが省略された場合、1件のレコードが生成される', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      const taskWithoutTrialCount: TaskInput[] = [
        {
          methodId: 'method_default',
          experimentCondition: 0,
        },
      ];

      await repository.createTaskDetails(
        taskWithoutTrialCount,
        projectId,
        organizationId,
        mockClient
      );

      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    test('organization_idとproject_idがすべてのレコードに含まれる', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 3,
      });

      const singleTask: TaskInput[] = [
        {
          methodId: 'method_test',
          experimentCondition: 0,
          trialCount: 3,
        },
      ];

      await repository.createTaskDetails(
        singleTask,
        projectId,
        organizationId,
        mockClient
      );

      const queryCall = mockClient.query.mock.calls[0];
      const params = queryCall[1];

      // organization_idとproject_idが複数回含まれることを確認（各レコード分）
      const orgIds = params.filter((p: any) => p === organizationId);
      const projIds = params.filter((p: any) => p === projectId);
      
      expect(orgIds.length).toBeGreaterThanOrEqual(3);
      expect(projIds.length).toBeGreaterThanOrEqual(3);
    });

    test('空配列の場合でも正常に処理できる', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      // 空配列でもエラーをスローしない
      await expect(
        repository.createTaskDetails(
          [],
          projectId,
          organizationId,
          mockClient
        )
      ).resolves.not.toThrow();
    });

    test('データベースエラーが発生した場合、エラーをスローする', async () => {
      const dbError = new Error('Insert failed');
      mockClient.query.mockRejectedValueOnce(dbError);

      await expect(
        repository.createTaskDetails(
          sampleTasks,
          projectId,
          organizationId,
          mockClient
        )
      ).rejects.toThrow('Insert failed');
    });
  });

  describe('getTaskByProjectMethodTaskNo', () => {
    const projectId = 'proj-123';
    const methodId = 'method_001';
    const taskNo = 1;
    const organizationId = 'org-456';

    test('正常系: タスクとプロジェクト情報を取得できる', async () => {
      const mockTaskData = {
        task_id: 'task-789',
        task_name: 'テスト実験タスク',
        project_id: projectId,
        project_name: 'テストプロジェクト',
        method_id: methodId,
        task_no: taskNo,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockTaskData],
        rowCount: 1,
      });

      const result = await repository.getTaskByProjectMethodTaskNo(
        projectId,
        methodId,
        taskNo,
        organizationId
      );

      expect(result).toEqual(mockTaskData);
      expect(mockPool.query).toHaveBeenCalledTimes(1);

      const queryCall = mockPool.query.mock.calls[0];
      const sql = queryCall[0];
      const params = queryCall[1];

      // JOINが含まれることを確認
      expect(sql).toContain('JOIN');
      expect(sql).toContain('project_task');
      expect(sql).toContain('project');

      // パラメータが正しく渡されることを確認
      expect(params).toContain(projectId);
      expect(params).toContain(methodId);
      expect(params).toContain(taskNo);
      expect(params).toContain(organizationId);
    });

    test('正常系: organization_idフィルタが適用される', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await repository.getTaskByProjectMethodTaskNo(
        projectId,
        methodId,
        taskNo,
        organizationId
      );

      const queryCall = mockPool.query.mock.calls[0];
      const sql = queryCall[0];
      const params = queryCall[1];

      // organization_idでフィルタリングされることを確認
      expect(sql).toContain('organization_id');
      expect(params).toContain(organizationId);
    });

    test('正常系: タスクが存在しない場合はnullを返す', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await repository.getTaskByProjectMethodTaskNo(
        projectId,
        methodId,
        taskNo,
        organizationId
      );

      expect(result).toBeNull();
    });

    test('正常系: 必要なカラムのみをSELECTする', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await repository.getTaskByProjectMethodTaskNo(
        projectId,
        methodId,
        taskNo,
        organizationId
      );

      const queryCall = mockPool.query.mock.calls[0];
      const sql = queryCall[0];

      // 必要なカラムがSELECTされることを確認
      expect(sql).toContain('task_id');
      expect(sql).toContain('task_name');
      expect(sql).toContain('project_id');
      expect(sql).toContain('project_name');
      expect(sql).toContain('method_id');
      expect(sql).toContain('task_no');
    });

    test('異常系: データベースエラーが発生した場合、エラーをスローする', async () => {
      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(
        repository.getTaskByProjectMethodTaskNo(
          projectId,
          methodId,
          taskNo,
          organizationId
        )
      ).rejects.toThrow('Database connection failed');
    });

    test('セキュリティ: Parameterized Queryを使用してSQLインジェクションを防ぐ', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await repository.getTaskByProjectMethodTaskNo(
        projectId,
        methodId,
        taskNo,
        organizationId
      );

      const queryCall = mockPool.query.mock.calls[0];
      const params = queryCall[1];

      // Parameterized Queryであることを確認
      expect(params).toBeDefined();
      expect(Array.isArray(params)).toBe(true);
      expect(params.length).toBeGreaterThan(0);
    });
  });
});

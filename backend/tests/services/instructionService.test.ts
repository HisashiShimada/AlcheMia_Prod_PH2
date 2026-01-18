/**
 * InstructionServiceのテスト
 */

import { InstructionService } from '../../src/services/instructionService';
import { ProjectRepository } from '../../src/repositories/projectRepository';
import { InstructionRepository } from '../../src/repositories/instructionRepository';
import { TaskRepository } from '../../src/repositories/taskRepository';
import { getPool } from '../../src/database/db';
import { TaskInput, InstructionInput } from '../../src/types/instruction';

// モック設定
jest.mock('../../src/repositories/projectRepository');
jest.mock('../../src/repositories/instructionRepository');
jest.mock('../../src/repositories/taskRepository');
jest.mock('../../src/database/db');

describe('InstructionService', () => {
  let service: InstructionService;
  let mockProjectRepo: jest.Mocked<ProjectRepository>;
  let mockInstructionRepo: jest.Mocked<InstructionRepository>;
  let mockTaskRepo: jest.Mocked<TaskRepository>;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    // モックリポジトリのセットアップ
    mockProjectRepo = new ProjectRepository() as jest.Mocked<ProjectRepository>;
    mockInstructionRepo = new InstructionRepository() as jest.Mocked<InstructionRepository>;
    mockTaskRepo = new TaskRepository() as jest.Mocked<TaskRepository>;

    // モックプールとクライアントをセットアップ
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);

    // サービスインスタンスを作成
    service = new InstructionService(
      mockProjectRepo,
      mockInstructionRepo,
      mockTaskRepo
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInstruction', () => {
    const projectId = 'proj-123';
    const organizationId = 'org-456';
    const userId = 'user-789';

    const sampleTasks: TaskInput[] = [
      {
        methodId: 'method_001',
        experimentCondition: 0,
        trialCount: 2,
      },
    ];

    const sampleInstructions: InstructionInput[] = [
      {
        content: 'テスト指示1',
        priority: 1,
        type: 0,
        targetType: 0,
        transitionId: null,
        taskNumber: null,
      },
    ];

    test('正常系: プロジェクトに指示とタスクを作成できる', async () => {
      // プロジェクトが存在し、ステータスが0
      mockProjectRepo.findById = jest.fn().mockResolvedValue({
        organization_id: organizationId,
        project_id: projectId,
        project_name: 'Test Project',
        project_status: 0,
      });

      // トランザクション内の各操作をモック
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });
      mockInstructionRepo.createInstructions = jest.fn().mockResolvedValue(undefined);
      mockTaskRepo.upsertTasks = jest.fn().mockResolvedValue(undefined);
      mockTaskRepo.createTaskDetails = jest.fn().mockResolvedValue(undefined);
      mockProjectRepo.updateStatus = jest.fn().mockResolvedValue(undefined);

      const result = await service.createInstruction(
        projectId,
        {
          tasks: sampleTasks,
          instructions: sampleInstructions,
        },
        organizationId,
        userId
      );

      // プロジェクト存在確認が呼ばれたことを確認
      expect(mockProjectRepo.findById).toHaveBeenCalledWith(
        projectId,
        organizationId
      );

      // トランザクションが開始されたことを確認
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');

      // 各リポジトリメソッドが呼ばれたことを確認
      expect(mockInstructionRepo.createInstructions).toHaveBeenCalledWith(
        sampleInstructions,
        projectId,
        organizationId,
        userId,
        mockClient
      );

      expect(mockTaskRepo.upsertTasks).toHaveBeenCalledWith(
        sampleTasks,
        projectId,
        organizationId,
        mockClient
      );

      expect(mockTaskRepo.createTaskDetails).toHaveBeenCalledWith(
        sampleTasks,
        projectId,
        organizationId,
        mockClient
      );

      expect(mockProjectRepo.updateStatus).toHaveBeenCalledWith(
        projectId,
        1, // project_status = 1
        organizationId,
        mockClient
      );

      // トランザクションがコミットされたことを確認
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

      // 作成サマリーが正しいことを確認
      expect(result).toEqual({
        totalTasks: 1,
        createdTasks: 1,
      });

      // クライアントがリリースされたことを確認
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('正常系: 複数タスクの作成サマリーが正しく生成される', async () => {
      const multipleTasks: TaskInput[] = [
        { methodId: 'method_001', experimentCondition: 0, trialCount: 2 },
        { methodId: 'method_002', experimentCondition: 1, trialCount: 3 },
        { methodId: 'method_003', experimentCondition: 0 }, // trialCount省略
      ];

      mockProjectRepo.findById = jest.fn().mockResolvedValue({
        organization_id: organizationId,
        project_id: projectId,
        project_status: 0,
      });

      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });
      mockInstructionRepo.createInstructions = jest.fn().mockResolvedValue(undefined);
      mockTaskRepo.upsertTasks = jest.fn().mockResolvedValue(undefined);
      mockTaskRepo.createTaskDetails = jest.fn().mockResolvedValue(undefined);
      mockProjectRepo.updateStatus = jest.fn().mockResolvedValue(undefined);

      const result = await service.createInstruction(
        projectId,
        {
          tasks: multipleTasks,
          instructions: sampleInstructions,
        },
        organizationId,
        userId
      );

      expect(result).toEqual({
        totalTasks: 3,
        createdTasks: 3,
      });
    });

    test('異常系: プロジェクトが存在しない場合、NotFoundErrorをスローする', async () => {
      mockProjectRepo.findById = jest.fn().mockResolvedValue(null);

      await expect(
        service.createInstruction(
          projectId,
          {
            tasks: sampleTasks,
            instructions: sampleInstructions,
          },
          organizationId,
          userId
        )
      ).rejects.toThrow('Project not found');

      // トランザクションが開始されていないことを確認
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test('異常系: project_statusが0でない場合、BusinessLogicErrorをスローする', async () => {
      mockProjectRepo.findById = jest.fn().mockResolvedValue({
        organization_id: organizationId,
        project_id: projectId,
        project_status: 1, // ステータスが1（タスク実行待ち）
      });

      await expect(
        service.createInstruction(
          projectId,
          {
            tasks: sampleTasks,
            instructions: sampleInstructions,
          },
          organizationId,
          userId
        )
      ).rejects.toThrow('Project status must be 0');

      // トランザクションが開始されていないことを確認
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test('異常系: トランザクション中にエラーが発生した場合、ロールバックする', async () => {
      mockProjectRepo.findById = jest.fn().mockResolvedValue({
        organization_id: organizationId,
        project_id: projectId,
        project_status: 0,
      });

      // BEGINは成功
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // createInstructionsでエラー
      mockInstructionRepo.createInstructions = jest.fn().mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        service.createInstruction(
          projectId,
          {
            tasks: sampleTasks,
            instructions: sampleInstructions,
          },
          organizationId,
          userId
        )
      ).rejects.toThrow('Database error');

      // ROLLBACKが呼ばれたことを確認
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');

      // クライアントがリリースされたことを確認
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('異常系: upsertTasks失敗時にロールバックする', async () => {
      mockProjectRepo.findById = jest.fn().mockResolvedValue({
        organization_id: organizationId,
        project_id: projectId,
        project_status: 0,
      });

      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockInstructionRepo.createInstructions = jest.fn().mockResolvedValue(undefined);

      // upsertTasksでエラー
      mockTaskRepo.upsertTasks = jest.fn().mockRejectedValue(
        new Error('Upsert failed')
      );

      await expect(
        service.createInstruction(
          projectId,
          {
            tasks: sampleTasks,
            instructions: sampleInstructions,
          },
          organizationId,
          userId
        )
      ).rejects.toThrow('Upsert failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('異常系: createTaskDetails失敗時にロールバックする', async () => {
      mockProjectRepo.findById = jest.fn().mockResolvedValue({
        organization_id: organizationId,
        project_id: projectId,
        project_status: 0,
      });

      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockInstructionRepo.createInstructions = jest.fn().mockResolvedValue(undefined);
      mockTaskRepo.upsertTasks = jest.fn().mockResolvedValue(undefined);

      // createTaskDetailsでエラー
      mockTaskRepo.createTaskDetails = jest.fn().mockRejectedValue(
        new Error('Insert failed')
      );

      await expect(
        service.createInstruction(
          projectId,
          {
            tasks: sampleTasks,
            instructions: sampleInstructions,
          },
          organizationId,
          userId
        )
      ).rejects.toThrow('Insert failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('異常系: updateStatus失敗時にロールバックする', async () => {
      mockProjectRepo.findById = jest.fn().mockResolvedValue({
        organization_id: organizationId,
        project_id: projectId,
        project_status: 0,
      });

      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockInstructionRepo.createInstructions = jest.fn().mockResolvedValue(undefined);
      mockTaskRepo.upsertTasks = jest.fn().mockResolvedValue(undefined);
      mockTaskRepo.createTaskDetails = jest.fn().mockResolvedValue(undefined);

      // updateStatusでエラー
      mockProjectRepo.updateStatus = jest.fn().mockRejectedValue(
        new Error('Update failed')
      );

      await expect(
        service.createInstruction(
          projectId,
          {
            tasks: sampleTasks,
            instructions: sampleInstructions,
          },
          organizationId,
          userId
        )
      ).rejects.toThrow('Update failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('トランザクション操作の順序が正しいことを確認', async () => {
      mockProjectRepo.findById = jest.fn().mockResolvedValue({
        organization_id: organizationId,
        project_id: projectId,
        project_status: 0,
      });

      const callOrder: string[] = [];

      mockClient.query.mockImplementation((query: string) => {
        callOrder.push(query);
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      mockInstructionRepo.createInstructions = jest.fn().mockImplementation(() => {
        callOrder.push('createInstructions');
        return Promise.resolve();
      });

      mockTaskRepo.upsertTasks = jest.fn().mockImplementation(() => {
        callOrder.push('upsertTasks');
        return Promise.resolve();
      });

      mockTaskRepo.createTaskDetails = jest.fn().mockImplementation(() => {
        callOrder.push('createTaskDetails');
        return Promise.resolve();
      });

      mockProjectRepo.updateStatus = jest.fn().mockImplementation(() => {
        callOrder.push('updateStatus');
        return Promise.resolve();
      });

      await service.createInstruction(
        projectId,
        {
          tasks: sampleTasks,
          instructions: sampleInstructions,
        },
        organizationId,
        userId
      );

      // 操作順序を確認
      expect(callOrder).toEqual([
        'BEGIN',
        'createInstructions',
        'upsertTasks',
        'createTaskDetails',
        'updateStatus',
        'COMMIT',
      ]);
    });
  });
});

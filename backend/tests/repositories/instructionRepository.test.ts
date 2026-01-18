/**
 * InstructionRepositoryのテスト
 */

import { InstructionRepository } from '../../src/repositories/instructionRepository';
import { InstructionInput } from '../../src/types/instruction';
import { resetPool } from '../../src/database/db';

describe('InstructionRepository', () => {
  let repository: InstructionRepository;
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

    repository = new InstructionRepository();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createInstructions', () => {
    const projectId = 'proj-123';
    const organizationId = 'org-456';
    const userId = 'user-789';

    const sampleInstructions: InstructionInput[] = [
      {
        content: '実験を開始してください',
        priority: 1,
        type: 0,
        targetType: 0,
        transitionId: null,
        taskNumber: null,
      },
      {
        content: 'タスク1を実行してください',
        priority: 2,
        type: 1,
        targetType: 1,
        transitionId: null,
        taskNumber: 1,
      },
    ];

    test('トランザクション付きで複数の指示を作成できる', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 2,
      });

      await repository.createInstructions(
        sampleInstructions,
        projectId,
        organizationId,
        userId,
        mockClient
      );

      expect(mockClient.query).toHaveBeenCalledTimes(1);

      // INSERTクエリが実行されたことを確認
      const queryCall = mockClient.query.mock.calls[0];
      expect(queryCall[0]).toContain('INSERT INTO project_instruction');
      
      // Parameterized Queryであることを確認
      expect(queryCall[1]).toBeDefined();
      expect(Array.isArray(queryCall[1])).toBe(true);

      // organization_idとproject_idが含まれることを確認
      expect(queryCall[0]).toContain('organization_id');
      expect(queryCall[0]).toContain('project_id');
      
      // プールは使用されていないことを確認（トランザクション専用）
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('指示データが正しくパラメータ化される', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      const singleInstruction: InstructionInput[] = [
        {
          content: 'テスト指示',
          priority: 1,
          type: 0,
          targetType: 0,
          transitionId: null,
          taskNumber: null,
        },
      ];

      await repository.createInstructions(
        singleInstruction,
        projectId,
        organizationId,
        userId,
        mockClient
      );

      const queryCall = mockClient.query.mock.calls[0];
      const params = queryCall[1];

      // organization_id, project_id, user_id が含まれることを確認
      expect(params).toContain(organizationId);
      expect(params).toContain(projectId);
      expect(params).toContain(userId);

      // 指示内容が含まれることを確認
      expect(params).toContain('テスト指示');
      expect(params).toContain(1); // priority
      expect(params).toContain(0); // type
      expect(params).toContain(0); // targetType
    });

    test('targetType=1（タスク）の場合、taskNumberが設定される', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      const taskInstruction: InstructionInput[] = [
        {
          content: 'タスク指示',
          priority: 2,
          type: 1,
          targetType: 1,
          transitionId: null,
          taskNumber: 5,
        },
      ];

      await repository.createInstructions(
        taskInstruction,
        projectId,
        organizationId,
        userId,
        mockClient
      );

      const queryCall = mockClient.query.mock.calls[0];
      const params = queryCall[1];

      // taskNumberが含まれることを確認
      expect(params).toContain(5);
      
      // task_noカラムが含まれることを確認
      expect(queryCall[0]).toContain('task_no');
    });

    test('targetType=2（トランジション）の場合、transitionIdが設定される', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      const transitionInstruction: InstructionInput[] = [
        {
          content: 'トランジション指示',
          priority: 3,
          type: 2,
          targetType: 2,
          transitionId: 'trans_001',
          taskNumber: null,
        },
      ];

      await repository.createInstructions(
        transitionInstruction,
        projectId,
        organizationId,
        userId,
        mockClient
      );

      const queryCall = mockClient.query.mock.calls[0];
      const params = queryCall[1];

      // transitionIdが含まれることを確認
      expect(params).toContain('trans_001');
      
      // transition_idカラムが含まれることを確認
      expect(queryCall[0]).toContain('transition_id');
    });

    test('experiment_instruction_idがUUIDで生成される', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      await repository.createInstructions(
        [sampleInstructions[0]],
        projectId,
        organizationId,
        userId,
        mockClient
      );

      const queryCall = mockClient.query.mock.calls[0];
      
      // experiment_instruction_idカラムが含まれることを確認
      expect(queryCall[0]).toContain('experiment_instruction_id');
      
      // UUIDフォーマットのパラメータが含まれることを確認（簡易チェック）
      const params = queryCall[1];
      const hasUuidLikeValue = params.some((param: any) => 
        typeof param === 'string' && 
        param.length === 36 && 
        param.includes('-')
      );
      expect(hasUuidLikeValue).toBe(true);
    });

    test('instruction_dateが自動設定される', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      await repository.createInstructions(
        [sampleInstructions[0]],
        projectId,
        organizationId,
        userId,
        mockClient
      );

      const queryCall = mockClient.query.mock.calls[0];
      
      // instruction_dateカラムが含まれることを確認
      expect(queryCall[0]).toContain('instruction_date');
      
      // 日付型のパラメータが含まれることを確認
      const params = queryCall[1];
      const hasDateValue = params.some((param: any) => param instanceof Date);
      expect(hasDateValue).toBe(true);
    });

    test('データベースエラーが発生した場合、エラーをスローする', async () => {
      const dbError = new Error('Insert failed');
      mockClient.query.mockRejectedValueOnce(dbError);

      await expect(
        repository.createInstructions(
          sampleInstructions,
          projectId,
          organizationId,
          userId,
          mockClient
        )
      ).rejects.toThrow('Insert failed');
    });

    test('空配列の場合でも正常に処理できる', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      // 空配列でもエラーをスローしない
      await expect(
        repository.createInstructions(
          [],
          projectId,
          organizationId,
          userId,
          mockClient
        )
      ).resolves.not.toThrow();
    });
  });
});

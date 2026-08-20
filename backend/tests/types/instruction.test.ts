/**
 * 指示送信API型定義のテスト
 */

import {
  TargetType,
  ExperimentCondition,
  TaskInput,
  InstructionInput,
  CreateInstructionRequest,
  InstructionCreationSummary,
  CreateInstructionResponse,
  Project,
  Instruction,
  Task,
  TaskDetail
} from '../../src/types/instruction';

describe('指示送信API型定義', () => {
  describe('Enum定義', () => {
    test('TargetTypeの値が正しく定義されている', () => {
      expect(TargetType.FILE).toBe(0);
      expect(TargetType.TASK).toBe(1);
      expect(TargetType.TRANSITION).toBe(2);
    });

    test('ExperimentConditionの値が正しく定義されている', () => {
      expect(ExperimentCondition.SAME).toBe(0);
      expect(ExperimentCondition.VARIABLE).toBe(1);
    });
  });

  describe('TaskInput型', () => {
    test('有効なTaskInputオブジェクトを作成できる', () => {
      const taskInput: TaskInput = {
        methodId: 'method_001',
        experimentCondition: ExperimentCondition.SAME,
        trialCount: 3
      };

      expect(taskInput.methodId).toBe('method_001');
      expect(taskInput.experimentCondition).toBe(0);
      expect(taskInput.trialCount).toBe(3);
    });

    test('trialCountを省略したTaskInputオブジェクトを作成できる', () => {
      const taskInput: TaskInput = {
        methodId: 'method_002',
        experimentCondition: ExperimentCondition.VARIABLE
      };

      expect(taskInput.methodId).toBe('method_002');
      expect(taskInput.experimentCondition).toBe(1);
      expect(taskInput.trialCount).toBeUndefined();
    });
  });

  describe('InstructionInput型', () => {
    test('targetType=FILEの有効なInstructionInputを作成できる', () => {
      const instructionInput: InstructionInput = {
        content: 'ファイル全体への指示',
        targetType: TargetType.FILE,
        transitionId: null,
        taskNumber: null
      };

      expect(instructionInput.content).toBe('ファイル全体への指示');
      expect(instructionInput.targetType).toBe(0);
      expect(instructionInput.transitionId).toBeNull();
      expect(instructionInput.taskNumber).toBeNull();
    });

    test('targetType=TASKの有効なInstructionInputを作成できる', () => {
      const instructionInput: InstructionInput = {
        content: 'タスクへの指示',
        targetType: TargetType.TASK,
        transitionId: null,
        taskNumber: 1
      };

      expect(instructionInput.targetType).toBe(1);
      expect(instructionInput.taskNumber).toBe(1);
      expect(instructionInput.transitionId).toBeNull();
    });

    test('targetType=TRANSITIONの有効なInstructionInputを作成できる', () => {
      const instructionInput: InstructionInput = {
        content: 'トランジションへの指示',
        targetType: TargetType.TRANSITION,
        transitionId: 'trans_001',
        taskNumber: null
      };

      expect(instructionInput.targetType).toBe(2);
      expect(instructionInput.transitionId).toBe('trans_001');
      expect(instructionInput.taskNumber).toBeNull();
    });
  });

  describe('CreateInstructionRequest型', () => {
    test('有効なCreateInstructionRequestオブジェクトを作成できる', () => {
      const request: CreateInstructionRequest = {
        tasks: [
          {
            methodId: 'method_001',
            experimentCondition: ExperimentCondition.SAME,
            trialCount: 2
          }
        ],
        instructions: [
          {
            content: '実験を開始してください',
            targetType: TargetType.FILE,
            transitionId: null,
            taskNumber: null
          }
        ]
      };

      expect(request.tasks).toHaveLength(1);
      expect(request.instructions).toHaveLength(1);
      expect(request.tasks[0].methodId).toBe('method_001');
      expect(request.instructions[0].content).toBe('実験を開始してください');
    });

    test('複数のタスクと指示を含むリクエストを作成できる', () => {
      const request: CreateInstructionRequest = {
        tasks: [
          {
            methodId: 'method_001',
            experimentCondition: ExperimentCondition.SAME,
            trialCount: 3
          },
          {
            methodId: 'method_002',
            experimentCondition: ExperimentCondition.VARIABLE,
            trialCount: 5
          }
        ],
        instructions: [
          {
            content: '指示1',
            targetType: TargetType.FILE,
            transitionId: null,
            taskNumber: null
          },
          {
            content: '指示2',
            targetType: TargetType.TASK,
            transitionId: null,
            taskNumber: 1
          }
        ]
      };

      expect(request.tasks).toHaveLength(2);
      expect(request.instructions).toHaveLength(2);
    });
  });

  describe('InstructionCreationSummary型', () => {
    test('有効なInstructionCreationSummaryオブジェクトを作成できる', () => {
      const summary: InstructionCreationSummary = {
        totalTasks: 10,
        createdTasks: 10
      };

      expect(summary.totalTasks).toBe(10);
      expect(summary.createdTasks).toBe(10);
    });
  });

  describe('CreateInstructionResponse型', () => {
    test('有効なCreateInstructionResponseオブジェクトを作成できる', () => {
      const response: CreateInstructionResponse = {
        success: true,
        data: {
          summary: {
            totalTasks: 5,
            createdTasks: 5
          }
        },
        meta: {
          timestamp: '2026-01-15T10:00:00Z',
          requestId: 'req_12345'
        }
      };

      expect(response.success).toBe(true);
      expect(response.data.summary.totalTasks).toBe(5);
      expect(response.meta.timestamp).toBe('2026-01-15T10:00:00Z');
      expect(response.meta.requestId).toBe('req_12345');
    });
  });

  describe('ドメインモデル型', () => {
    test('有効なProjectオブジェクトを作成できる', () => {
      const project: Project = {
        organization_id: 'org_001',
        project_id: 'proj_001',
        project_name: 'テストプロジェクト',
        project_status: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      expect(project.organization_id).toBe('org_001');
      expect(project.project_id).toBe('proj_001');
      expect(project.project_status).toBe(0);
    });

    test('有効なInstructionオブジェクトを作成できる', () => {
      const instruction: Instruction = {
        organization_id: 'org_001',
        project_id: 'proj_001',
        experiment_instruction_id: 'inst_001',
        method_id: null,
        task_no: null,
        transition_id: null,
        instructions: 'テスト指示',
        instruction_user_id: 'user_001',
        instruction_date: new Date()
      };

      expect(instruction.organization_id).toBe('org_001');
      expect(instruction.experiment_instruction_id).toBe('inst_001');
    });

    test('有効なTaskオブジェクトを作成できる', () => {
      const task: Task = {
        organization_id: 'org_001',
        project_id: 'proj_001',
        method_id: 'method_001',
        experiment_condition: 0,
        attempts_count: 3
      };

      expect(task.organization_id).toBe('org_001');
      expect(task.method_id).toBe('method_001');
      expect(task.attempts_count).toBe(3);
    });

    test('有効なTaskDetailオブジェクトを作成できる', () => {
      const taskDetail: TaskDetail = {
        organization_id: 'org_001',
        project_id: 'proj_001',
        method_id: 'method_001',
        task_no: 1,
        task_status: 0,
        experiment_start_at: null,
        experiment_end_at: null,
        experiment_user_id: null,
        reviewed_at: null,
        review_user_id: null
      };

      expect(taskDetail.organization_id).toBe('org_001');
      expect(taskDetail.task_no).toBe(1);
      expect(taskDetail.task_status).toBe(0);
      expect(taskDetail.experiment_user_id).toBeNull();
    });
  });
});

/**
 * ProgressService - ユニットテスト
 * 
 * @description 進捗データ取得サービスのテスト
 * Feature: progress-data-retrieval-api
 * Task: 4.1 getProgressDataメソッドの基本構造実装
 */

import { ProgressService } from '../../src/services/progressService';
import { TaskRepository } from '../../src/repositories/taskRepository';
import { TransitionDataRepository } from '../../src/repositories/transitionDataRepository';
import { getStorageService } from '../../src/services/storageService';
import { parsePetriNetStructure } from '../../src/services/maimlService';

// モックの設定
jest.mock('../../src/repositories/taskRepository');
jest.mock('../../src/repositories/transitionDataRepository');
jest.mock('../../src/services/storageService');
jest.mock('../../src/services/maimlService');

describe('ProgressService - タスク4.1: 基本構造実装', () => {
  let progressService: ProgressService;
  let mockTaskRepository: jest.Mocked<TaskRepository>;
  let mockTransitionDataRepository: jest.Mocked<TransitionDataRepository>;

  beforeEach(() => {
    // モックインスタンスの初期化
    mockTaskRepository = new TaskRepository() as jest.Mocked<TaskRepository>;
    mockTransitionDataRepository = new TransitionDataRepository() as jest.Mocked<TransitionDataRepository>;
    
    // ProgressServiceのインスタンス化
    progressService = new ProgressService(
      mockTaskRepository,
      mockTransitionDataRepository
    );

    // Jest モックのクリア
    jest.clearAllMocks();
  });

  describe('基本構造のテスト', () => {
    it('ProgressServiceクラスがインスタンス化できること', () => {
      expect(progressService).toBeInstanceOf(ProgressService);
    });

    it('getProgressDataメソッドが存在すること', () => {
      expect(progressService.getProgressData).toBeDefined();
      expect(typeof progressService.getProgressData).toBe('function');
    });

    it('getProgressDataメソッドが正しいシグネチャを持つこと', async () => {
      // モックデータの準備（最小限）
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(null);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        '550e8400-e29b-41d4-a716-446655440000', // projectId
        'method1',                                // methodId
        1,                                        // taskNo
        'maiml_lab_001'                           // organizationId
      );

      // Result型の構造を持つことを確認
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
  });

  describe('タスク4.4: メソッド検索とトランジション抽出', () => {
    it('正常系: 指定されたmethodIdのメソッドを正しく検索できること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        method_id: 'target_method',
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージサービス
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml></maiml>', 'utf-8')
      );

      // モック: MAIMLパーサー（複数メソッド）
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: true,
        methods: [
          {
            methodId: 'method_a',
            methodName: 'メソッドA',
            petriNet: { transitions: [{ id: 'ta1', name: 'トランジションA1' }] }
          },
          {
            methodId: 'target_method',
            methodName: 'ターゲットメソッド',
            petriNet: {
              transitions: [
                { id: 'tt1', name: 'ターゲットトランジション1' },
                { id: 'tt2', name: 'ターゲットトランジション2' }
              ]
            }
          },
          {
            methodId: 'method_c',
            methodName: 'メソッドC',
            petriNet: { transitions: [{ id: 'tc1', name: 'トランジションC1' }] }
          }
        ]
      });

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // 正しいメソッドが検索されていることを確認
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method_id).toBe('target_method');
        expect(result.data.method_name).toBe('ターゲットメソッド');
      }
    });

    it('正常系: メソッドからpetriNet.transitionsを正しく抽出できること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        method_id: 'method1',
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージサービス
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml></maiml>', 'utf-8')
      );

      // モック: MAIMLパーサー
      const mockTransitions = [
        { id: 't1', name: 'トランジション1' },
        { id: 't2', name: 'トランジション2' },
        { id: 't3', name: 'トランジション3' }
      ];

      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'テストメソッド',
          petriNet: {
            transitions: mockTransitions
          }
        }]
      });

      // TransitionDataRepositoryのモック
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn().mockResolvedValue(null);
      mockTransitionDataRepository.countRecordsByTransition = jest.fn().mockResolvedValue(0);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // トランジションが正しく抽出されていることを確認
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transitions).toHaveLength(3);
        expect(result.data.transitions[0].transition_id).toBe('t1');
        expect(result.data.transitions[0].transition_name).toBe('トランジション1');
        expect(result.data.transitions[1].transition_id).toBe('t2');
        expect(result.data.transitions[2].transition_id).toBe('t3');
      }
    });

    it('正常系: method_nameがMAIMLから正しく取得されること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        method_id: 'synthesis_method',
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージサービス
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml></maiml>', 'utf-8')
      );

      // モック: MAIMLパーサー
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'synthesis_method',
          methodName: '有機合成実験手順',
          petriNet: { transitions: [] }
        }]
      });

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // method_nameがMAIMLから取得されていることを確認
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method_id).toBe('synthesis_method');
        expect(result.data.method_name).toBe('有機合成実験手順');
      }
    });

    it('異常系: 指定されたmethodIdが存在しない場合、METHOD_NOT_FOUNDエラーを返すこと', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        method_id: 'missing_method',
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージサービス
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml></maiml>', 'utf-8')
      );

      // モック: MAIMLパーサー（異なるメソッドIDのみ）
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: true,
        methods: [
          { methodId: 'method1', methodName: 'メソッド1', petriNet: { transitions: [] } },
          { methodId: 'method2', methodName: 'メソッド2', petriNet: { transitions: [] } }
        ]
      });

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // METHOD_NOT_FOUNDエラーを返すことを確認
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('METHOD_NOT_FOUND');
        expect(result.error.message).toContain('メソッドが見つかりません');
        expect(result.error.message).toContain('missing_method');
      }
    });

    it('エッジケース: methods配列が空の場合、METHOD_NOT_FOUNDエラーを返すこと', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        method_id: 'method1',
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージサービス
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml></maiml>', 'utf-8')
      );

      // モック: MAIMLパーサー（空のmethods配列）
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: []
      });

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // METHOD_NOT_FOUNDエラーを返すことを確認
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('METHOD_NOT_FOUND');
      }
    });

    it('正常系: 大文字小文字を区別してmethodIdを検索すること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        method_id: 'Method1', // 大文字
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージサービス
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml></maiml>', 'utf-8')
      );

      // モック: MAIMLパーサー
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: true,
        methods: [
          { methodId: 'method1', methodName: '小文字メソッド', petriNet: { transitions: [] } },
          { methodId: 'Method1', methodName: '大文字メソッド', petriNet: { transitions: [] } }
        ]
      });

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // 大文字小文字を区別して検索されることを確認
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method_id).toBe('Method1');
        expect(result.data.method_name).toBe('大文字メソッド');
      }
    });

    it('正常系: transitions配列が空の場合でも正常に処理できること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        method_id: 'empty_method',
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージサービス
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml></maiml>', 'utf-8')
      );

      // モック: MAIMLパーサー（空のtransitions配列）
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'empty_method',
          methodName: '空メソッド',
          petriNet: {
            transitions: []
          }
        }]
      });

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // 正常に処理されることを確認
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transitions).toHaveLength(0);
        expect(result.data.overall_progress.total_transitions).toBe(0);
        expect(result.data.overall_progress.overall_percentage).toBe(0);
      }
    });
  });
});

  describe('エラーハンドリングのテスト', () => {
    it('タスクが存在しない場合、TASK_NOT_FOUNDエラーを返すこと', async () => {
      // モック: タスクが見つからない
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(null);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        '550e8400-e29b-41d4-a716-446655440000',
        'method1',
        1,
        'maiml_lab_001'
      );

      // エラーレスポンスの検証
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('TASK_NOT_FOUND');
        expect(result.error.message).toContain('タスクが見つかりません');
      }
    });

    it('データベースエラーが発生した場合、DATABASE_ERRORを返すこと', async () => {
      // モック: データベースエラー
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        '550e8400-e29b-41d4-a716-446655440000',
        'method1',
        1,
        'maiml_lab_001'
      );

      // エラーレスポンスの検証
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('DATABASE_ERROR');
        expect(result.error.message).toContain('データベースエラー');
      }
    });
  });

  describe('Result型の構造テスト', () => {
    it('成功時はsuccess: trueとdataプロパティを返すこと', async () => {
      // モック: タスク取得成功
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue({
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'テストプロジェクト',
        method_id: 'method1',
        task_no: 1
      });

      // モック: ストレージサービス
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml><methods><method id="method1" name="テストメソッド"><petriNet><transitions></transitions></petriNet></method></methods></maiml>')
      );

      // モック: MAIMLパーサー
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'テストメソッド',
          petriNet: {
            transitions: []
          }
        }]
      });

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        '550e8400-e29b-41d4-a716-446655440000',
        'method1',
        1,
        'maiml_lab_001'
      );

      // 成功レスポンスの構造検証
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data).toHaveProperty('project_id');
        expect(result.data).toHaveProperty('project_name');
        expect(result.data).toHaveProperty('method_id');
        expect(result.data).toHaveProperty('method_name');
        expect(result.data).toHaveProperty('task_no');
        expect(result.data).toHaveProperty('task_name');
        expect(result.data).toHaveProperty('transitions');
        expect(result.data).toHaveProperty('overall_progress');
      }
    });

    it('失敗時はsuccess: falseとerrorプロパティを返すこと', async () => {
      // モック: タスクが見つからない
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(null);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        '550e8400-e29b-41d4-a716-446655440000',
        'method1',
        1,
        'maiml_lab_001'
      );

      // 失敗レスポンスの構造検証
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error).toHaveProperty('code');
        expect(result.error).toHaveProperty('message');
      }
    });
  });

  describe('タスク4.2: タスク基本情報取得の実装', () => {
    it('正常系: タスク基本情報を正しく取得できること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'テストプロジェクト',
        method_id: 'method1',
        task_no: 1
      };
      
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージとパーサー
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml><methods><method id="method1" name="テストメソッド"><petriNet><transitions></transitions></petriNet></method></methods></maiml>')
      );
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'テストメソッド',
          petriNet: { transitions: [] }
        }]
      });

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // タスク基本情報が正しく取得されていることを確認
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.project_id).toBe(mockTask.project_id);
        expect(result.data.project_name).toBe(mockTask.project_name);
        expect(result.data.task_no).toBe(mockTask.task_no);
        expect(result.data.task_name).toBe(mockTask.task_name);
      }
    });

    it('異常系: タスクが存在しない場合、TASK_NOT_FOUNDエラーを返すこと', async () => {
      // モック: タスクが見つからない
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(null);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        '550e8400-e29b-41d4-a716-446655440000',
        'method1',
        1,
        'maiml_lab_001'
      );

      // エラーレスポンスの検証
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('TASK_NOT_FOUND');
        expect(result.error.message).toContain('タスクが見つかりません');
      }

      // TaskRepositoryが呼ばれたことを確認
      expect(mockTaskRepository.getTaskByProjectMethodTaskNo).toHaveBeenCalledTimes(1);
    });

    it('タスク取得時にproject_nameとtask_nameが含まれること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'サンプルタスク名',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'サンプルプロジェクト名',
        method_id: 'method1',
        task_no: 1
      };
      
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージとパーサー
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml><methods><method id="method1" name="メソッド名"><petriNet><transitions></transitions></petriNet></method></methods></maiml>')
      );
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'メソッド名',
          petriNet: { transitions: [] }
        }]
      });

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // project_nameとtask_nameが正しく含まれていることを確認
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.project_name).toBe('サンプルプロジェクト名');
        expect(result.data.task_name).toBe('サンプルタスク名');
      }
    });

    it('TaskRepositoryに正しいパラメータが渡されること', async () => {
      // モック
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(null);

      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const methodId = 'method1';
      const taskNo = 1;
      const organizationId = 'maiml_lab_001';

      // メソッド呼び出し
      await progressService.getProgressData(projectId, methodId, taskNo, organizationId);

      // TaskRepositoryに正しいパラメータが渡されたことを確認
      expect(mockTaskRepository.getTaskByProjectMethodTaskNo).toHaveBeenCalledWith(
        projectId,
        methodId,
        taskNo,
        organizationId
      );
    });

    it('マルチテナント分離: organizationIdがTaskRepositoryに渡されること', async () => {
      // モック
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(null);

      const organizationId = 'org_test_123';

      // メソッド呼び出し
      await progressService.getProgressData(
        '550e8400-e29b-41d4-a716-446655440000',
        'method1',
        1,
        organizationId
      );

      // organizationIdが正しく渡されたことを確認
      expect(mockTaskRepository.getTaskByProjectMethodTaskNo).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        organizationId
      );
    });
  });

  describe('マルチテナント分離のテスト', () => {
    it('異なる組織IDでタスクが見つからない場合、TASK_NOT_FOUNDを返すこと', async () => {
      // モック: 異なる組織IDで検索するとnull
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(null);

      // メソッド呼び出し（異なる組織ID）
      const result = await progressService.getProgressData(
        '550e8400-e29b-41d4-a716-446655440000',
        'method1',
        1,
        'different_org'
      );

      // エラーレスポンスの検証
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('TASK_NOT_FOUND');
      }
    });
  });

  describe('タスク4.3: MAIMLファイルのダウンロードとパース', () => {
    it('正常系: MAIMLファイルを正しくダウンロードし、パースできること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        method_id: 'method1',
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージサービス（MAIMLダウンロード）
      const mockMAIMLContent = `<maiml>
        <methods>
          <method id="method1" name="テストメソッド">
            <petriNet>
              <transitions>
                <transition id="t1" name="トランジション1" />
              </transitions>
            </petriNet>
          </method>
        </methods>
      </maiml>`;
      
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from(mockMAIMLContent, 'utf-8')
      );

      // モック: MAIMLパーサー
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'テストメソッド',
          petriNet: {
            transitions: [
              { id: 't1', name: 'トランジション1' }
            ]
          }
        }]
      });

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // 成功レスポンスの検証
      expect(result.success).toBe(true);

      // storageService.downloadFileが正しいパラメータで呼ばれたことを確認
      expect(mockStorageService.downloadFile).toHaveBeenCalledWith(
        'maiml_lab_001',
        'projects/test_project/test_project.maiml'
      );

      // parsePetriNetStructureが呼ばれたことを確認
      expect(parsePetriNetStructure).toHaveBeenCalledWith(mockMAIMLContent);
    });

    it('正常系: MAIMLファイルからmethod_nameを正しく取得できること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'sample_project',
        method_id: 'method_abc',
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージサービス
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml></maiml>', 'utf-8')
      );

      // モック: MAIMLパーサー（特定のメソッド名を返す）
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: true,
        methods: [{
          methodId: 'method_abc',
          methodName: '合成実験メソッド',
          petriNet: {
            transitions: []
          }
        }]
      });

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // method_nameが正しく設定されていることを確認
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method_name).toBe('合成実験メソッド');
      }
    });

    it('正常系: 複数メソッドのMAIMLファイルから指定メソッドを抽出できること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'multi_method_project',
        method_id: 'method2',
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージサービス
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml></maiml>', 'utf-8')
      );

      // モック: MAIMLパーサー（複数メソッド）
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: true,
        methods: [
          {
            methodId: 'method1',
            methodName: 'メソッド1',
            petriNet: { transitions: [] }
          },
          {
            methodId: 'method2',
            methodName: 'メソッド2',
            petriNet: { transitions: [] }
          },
          {
            methodId: 'method3',
            methodName: 'メソッド3',
            petriNet: { transitions: [] }
          }
        ]
      });

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // 正しいメソッドが抽出されていることを確認
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method_id).toBe('method2');
        expect(result.data.method_name).toBe('メソッド2');
      }
    });

    it('異常系: MAIMLファイルダウンロード失敗時、MAIML_DOWNLOAD_FAILEDエラーを返すこと', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        method_id: 'method1',
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージサービス（ダウンロード失敗）
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockRejectedValue(
        new Error('S3 GetObject failed')
      );

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // エラーレスポンスの検証
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('MAIML_DOWNLOAD_FAILED');
        expect(result.error.message).toContain('MAIMLファイルのダウンロードに失敗');
      }
    });

    it('異常系: MAIMLパース失敗時、MAIML_PARSE_FAILEDエラーを返すこと', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        method_id: 'method1',
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージサービス（ダウンロード成功）
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<invalid-xml', 'utf-8')
      );

      // モック: MAIMLパーサー（パース失敗）
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: false,
        methods: null
      });

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // エラーレスポンスの検証
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('MAIML_PARSE_FAILED');
        expect(result.error.message).toContain('MAIMLファイルの解析に失敗');
      }
    });

    it('異常系: 指定されたメソッドIDが存在しない場合、METHOD_NOT_FOUNDエラーを返すこと', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        method_id: 'nonexistent_method',
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージサービス
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml></maiml>', 'utf-8')
      );

      // モック: MAIMLパーサー（異なるメソッドIDのみ）
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'メソッド1',
          petriNet: { transitions: [] }
        }]
      });

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // エラーレスポンスの検証
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('METHOD_NOT_FOUND');
        expect(result.error.message).toContain('メソッドが見つかりません');
        expect(result.error.message).toContain('nonexistent_method');
      }
    });

    it('マルチテナント分離: organization prefixを使用してMAIMLファイルをダウンロードすること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'secure_project',
        method_id: 'method1',
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージサービス
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml></maiml>', 'utf-8')
      );

      // モック: MAIMLパーサー
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'メソッド1',
          petriNet: { transitions: [] }
        }]
      });

      const organizationId = 'org_secure_123';

      // メソッド呼び出し
      await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        organizationId
      );

      // organizationIdが正しく渡されたことを確認
      expect(mockStorageService.downloadFile).toHaveBeenCalledWith(
        organizationId,
        expect.stringContaining('projects/secure_project/secure_project.maiml')
      );
    });

    it('MAIMLファイルパスが正しい形式で構築されること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'my_project_name',
        method_id: 'method1',
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージサービス
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml></maiml>', 'utf-8')
      );

      // モック: MAIMLパーサー
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'メソッド1',
          petriNet: { transitions: [] }
        }]
      });

      // メソッド呼び出し
      await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // ファイルパスが正しい形式であることを確認
      expect(mockStorageService.downloadFile).toHaveBeenCalledWith(
        'maiml_lab_001',
        'projects/my_project_name/my_project_name.maiml'
      );
    });

    it('BufferをUTF-8文字列に変換してパーサーに渡すこと', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        method_id: 'method1',
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      const mockMAIMLContent = '<maiml><methods><method id="method1" name="Test"><petriNet><transitions></transitions></petriNet></method></methods></maiml>';

      // モック: ストレージサービス（Bufferを返す）
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from(mockMAIMLContent, 'utf-8')
      );

      // モック: MAIMLパーサー
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'Test',
          petriNet: { transitions: [] }
        }]
      });

      // メソッド呼び出し
      await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // parsePetriNetStructureに文字列が渡されたことを確認
      expect(parsePetriNetStructure).toHaveBeenCalledWith(mockMAIMLContent);
      expect(typeof (parsePetriNetStructure as jest.Mock).mock.calls[0][0]).toBe('string');
    });
  });
});

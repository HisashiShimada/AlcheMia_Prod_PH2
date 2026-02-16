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

  describe('タスク4.5: トランジション進捗データの並列取得', () => {
    it('正常系: 複数トランジションの進捗データを並列取得できること', async () => {
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

      // モック: MAIMLパーサー（3つのトランジション）
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'テストメソッド',
          petriNet: {
            transitions: [
              { id: 't1', name: 'トランジション1' },
              { id: 't2', name: 'トランジション2' },
              { id: 't3', name: 'トランジション3' }
            ]
          }
        }]
      });

      // モック: TransitionDataRepository（各トランジションのデータ）
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn()
        .mockResolvedValueOnce({ record_id: 'r1', status: 'completed', progress: 100, updated_at: '2026-02-01T10:00:00Z' })
        .mockResolvedValueOnce({ record_id: 'r2', status: 'in_progress', progress: 50, updated_at: '2026-02-02T10:00:00Z' })
        .mockResolvedValueOnce(null); // t3はレコードなし

      mockTransitionDataRepository.countRecordsByTransition = jest.fn()
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // 成功レスポンスの検証
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transitions).toHaveLength(3);
        
        // t1: completed
        expect(result.data.transitions[0].transition_id).toBe('t1');
        expect(result.data.transitions[0].status).toBe('completed');
        expect(result.data.transitions[0].progress).toBe(100);
        expect(result.data.transitions[0].has_data).toBe(true);
        expect(result.data.transitions[0].data_count).toBe(5);
        expect(result.data.transitions[0].last_updated).toBe('2026-02-01T10:00:00Z');

        // t2: in_progress
        expect(result.data.transitions[1].transition_id).toBe('t2');
        expect(result.data.transitions[1].status).toBe('in_progress');
        expect(result.data.transitions[1].progress).toBe(50);
        expect(result.data.transitions[1].has_data).toBe(true);
        expect(result.data.transitions[1].data_count).toBe(3);

        // t3: not_started（レコードなし）
        expect(result.data.transitions[2].transition_id).toBe('t3');
        expect(result.data.transitions[2].status).toBe('not_started');
        expect(result.data.transitions[2].progress).toBe(0);
        expect(result.data.transitions[2].has_data).toBe(false);
        expect(result.data.transitions[2].data_count).toBe(0);
        expect(result.data.transitions[2].last_updated).toBeNull();
      }

      // 並列呼び出しが実行されたことを確認
      expect(mockTransitionDataRepository.getLatestRecordByTransition).toHaveBeenCalledTimes(3);
      expect(mockTransitionDataRepository.countRecordsByTransition).toHaveBeenCalledTimes(3);
    });

    it('正常系: レコードが存在しない場合、not_started/progress=0を返すこと', async () => {
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

      // モック: MAIMLパーサー（1つのトランジション）
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

      // モック: レコードなし
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn().mockResolvedValue(null);
      mockTransitionDataRepository.countRecordsByTransition = jest.fn().mockResolvedValue(0);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // レスポンスの検証
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transitions[0].status).toBe('not_started');
        expect(result.data.transitions[0].progress).toBe(0);
        expect(result.data.transitions[0].has_data).toBe(false);
        expect(result.data.transitions[0].data_count).toBe(0);
        expect(result.data.transitions[0].last_updated).toBeNull();
      }
    });

    it('正常系: has_dataフラグが正しく設定されること', async () => {
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
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'テストメソッド',
          petriNet: {
            transitions: [
              { id: 't1', name: 'データあり' },
              { id: 't2', name: 'データなし' }
            ]
          }
        }]
      });

      // モック: t1はデータあり、t2はデータなし
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn()
        .mockResolvedValueOnce({ record_id: 'r1', status: 'in_progress', progress: 30, updated_at: '2026-02-01T10:00:00Z' })
        .mockResolvedValueOnce(null);

      mockTransitionDataRepository.countRecordsByTransition = jest.fn()
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // has_dataフラグの検証
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transitions[0].has_data).toBe(true);
        expect(result.data.transitions[0].data_count).toBe(10);
        expect(result.data.transitions[1].has_data).toBe(false);
        expect(result.data.transitions[1].data_count).toBe(0);
      }
    });

    it('正常系: 各トランジションに正しいパラメータが渡されること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-123',
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
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'テストメソッド',
          petriNet: {
            transitions: [
              { id: 'transition_a', name: 'トランジションA' },
              { id: 'transition_b', name: 'トランジションB' }
            ]
          }
        }]
      });

      // モック
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn().mockResolvedValue(null);
      mockTransitionDataRepository.countRecordsByTransition = jest.fn().mockResolvedValue(0);

      const organizationId = 'org_test_123';

      // メソッド呼び出し
      await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        organizationId
      );

      // 正しいパラメータで呼ばれたことを確認
      expect(mockTransitionDataRepository.getLatestRecordByTransition).toHaveBeenCalledWith(
        'task-uuid-123',
        'transition_a',
        organizationId
      );
      expect(mockTransitionDataRepository.getLatestRecordByTransition).toHaveBeenCalledWith(
        'task-uuid-123',
        'transition_b',
        organizationId
      );

      expect(mockTransitionDataRepository.countRecordsByTransition).toHaveBeenCalledWith(
        'task-uuid-123',
        'transition_a',
        organizationId
      );
      expect(mockTransitionDataRepository.countRecordsByTransition).toHaveBeenCalledWith(
        'task-uuid-123',
        'transition_b',
        organizationId
      );
    });

    it('正常系: Promise.allで並列処理が実行されること（パフォーマンステスト）', async () => {
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

      // モック: MAIMLパーサー（10個のトランジション）
      const transitions = Array.from({ length: 10 }, (_, i) => ({
        id: `t${i + 1}`,
        name: `トランジション${i + 1}`
      }));

      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'テストメソッド',
          petriNet: { transitions }
        }]
      });

      // モック: 各呼び出しに遅延を追加
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn().mockImplementation(async () => {
        await delay(10); // 10ms遅延
        return null;
      });
      mockTransitionDataRepository.countRecordsByTransition = jest.fn().mockImplementation(async () => {
        await delay(10); // 10ms遅延
        return 0;
      });

      // 実行時間を測定
      const startTime = Date.now();
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // 並列処理されていることを確認
      // 10個のトランジション x 2回の呼び出し x 10ms = 200ms（シーケンシャル）
      // 並列処理の場合は約20ms程度で完了するはず
      expect(executionTime).toBeLessThan(100); // 100ms未満であることを確認

      expect(result.success).toBe(true);
      expect(mockTransitionDataRepository.getLatestRecordByTransition).toHaveBeenCalledTimes(10);
      expect(mockTransitionDataRepository.countRecordsByTransition).toHaveBeenCalledTimes(10);
    });

    it('異常系: データベースエラー発生時、DATABASE_ERRORを返すこと', async () => {
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

      // モック: データベースエラー
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
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
        expect(result.error.code).toBe('DATABASE_ERROR');
        expect(result.error.message).toContain('データベースエラー');
      }
    });

    it('正常系: トランジションが0個の場合でも正常に処理できること', async () => {
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

      // モック: MAIMLパーサー（トランジション0個）
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
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // 正常に処理されることを確認
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transitions).toHaveLength(0);
        // Repositoryメソッドが呼ばれないことを確認
        expect(mockTransitionDataRepository.getLatestRecordByTransition).not.toHaveBeenCalled();
        expect(mockTransitionDataRepository.countRecordsByTransition).not.toHaveBeenCalled();
      }
    });

    it('マルチテナント分離: organization_idが各Repository呼び出しに渡されること', async () => {
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

      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn().mockResolvedValue(null);
      mockTransitionDataRepository.countRecordsByTransition = jest.fn().mockResolvedValue(0);

      const organizationId = 'org_secure_456';

      // メソッド呼び出し
      await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        organizationId
      );

      // すべての呼び出しにorganization_idが渡されていることを確認
      expect(mockTransitionDataRepository.getLatestRecordByTransition).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        organizationId
      );
      expect(mockTransitionDataRepository.countRecordsByTransition).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        organizationId
      );
    });
  });

  describe('タスク4.7: レスポンスデータの構築', () => {
    it('正常系: ProgressData型の全フィールドが正しく設定されること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-123',
        task_name: 'サンプルタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'sample_project',
        method_id: 'method_abc',
        task_no: 5
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
          methodId: 'method_abc',
          methodName: '実験メソッド名',
          petriNet: {
            transitions: [
              { id: 't1', name: 'トランジション1' },
              { id: 't2', name: 'トランジション2' }
            ]
          }
        }]
      });

      // モック: TransitionDataRepository
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn()
        .mockResolvedValueOnce({
          record_id: 'r1',
          status: 'completed',
          progress_rate: 100,
          updated_at: new Date('2026-02-10T10:00:00Z')
        })
        .mockResolvedValueOnce({
          record_id: 'r2',
          status: 'running',
          progress_rate: 50,
          updated_at: new Date('2026-02-15T15:30:00Z')
        });

      mockTransitionDataRepository.countRecordsByTransition = jest.fn()
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // ProgressData型の全フィールドが存在することを確認
      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        
        // 全フィールドの存在確認
        expect(data).toHaveProperty('project_id');
        expect(data).toHaveProperty('project_name');
        expect(data).toHaveProperty('method_id');
        expect(data).toHaveProperty('method_name');
        expect(data).toHaveProperty('task_no');
        expect(data).toHaveProperty('task_name');
        expect(data).toHaveProperty('transitions');
        expect(data).toHaveProperty('overall_progress');
        
        // 各フィールドの値検証
        expect(data.project_id).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(data.project_name).toBe('sample_project');
        expect(data.method_id).toBe('method_abc');
        expect(data.method_name).toBe('実験メソッド名');
        expect(data.task_no).toBe(5);
        expect(data.task_name).toBe('サンプルタスク');
        expect(Array.isArray(data.transitions)).toBe(true);
        expect(typeof data.overall_progress).toBe('object');
      }
    });

    it('正常系: project情報がTaskRepositoryから取得した値と一致すること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'タスクA',
        project_id: 'project-uuid-999',
        project_name: 'Project Alpha',
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
          methodName: 'Method Name',
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

      // project情報の検証
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.project_id).toBe('project-uuid-999');
        expect(result.data.project_name).toBe('Project Alpha');
      }
    });

    it('正常系: method情報がMAIMLパースで取得した値と一致すること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'タスクB',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        method_id: 'synthesis_001',
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージサービス
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml></maiml>', 'utf-8')
      );

      // モック: MAIMLパーサー（特定のmethod_name）
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'synthesis_001',
          methodName: '有機化合物合成プロセス',
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

      // method情報の検証
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method_id).toBe('synthesis_001');
        expect(result.data.method_name).toBe('有機化合物合成プロセス');
      }
    });

    it('正常系: task情報がTaskRepositoryから取得した値と一致すること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: '材料準備タスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        method_id: 'method1',
        task_no: 42
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
          methodName: 'Test Method',
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

      // task情報の検証
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.task_no).toBe(42);
        expect(result.data.task_name).toBe('材料準備タスク');
      }
    });

    it('正常系: transitions配列に各トランジションの全フィールドが含まれること', async () => {
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
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'Test Method',
          petriNet: {
            transitions: [
              { id: 'transition_a', name: 'トランジションA' }
            ]
          }
        }]
      });

      // モック: TransitionDataRepository
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn()
        .mockResolvedValue({
          record_id: 'r1',
          status: 'running',
          progress_rate: 75,
          updated_at: new Date('2026-02-16T10:00:00Z')
        });

      mockTransitionDataRepository.countRecordsByTransition = jest.fn()
        .mockResolvedValue(8);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // transitions配列のフィールド検証
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transitions).toHaveLength(1);
        
        const transition = result.data.transitions[0];
        
        // 全フィールドの存在確認
        expect(transition).toHaveProperty('transition_id');
        expect(transition).toHaveProperty('transition_name');
        expect(transition).toHaveProperty('status');
        expect(transition).toHaveProperty('progress');
        expect(transition).toHaveProperty('last_updated');
        expect(transition).toHaveProperty('has_data');
        expect(transition).toHaveProperty('data_count');
        
        // 値の検証
        expect(transition.transition_id).toBe('transition_a');
        expect(transition.transition_name).toBe('トランジションA');
        expect(transition.status).toBe('in_progress');
        expect(transition.progress).toBe(75);
        expect(transition.last_updated).toBe('2026-02-16T10:00:00.000Z');
        expect(transition.has_data).toBe(true);
        expect(transition.data_count).toBe(8);
      }
    });

    it('正常系: overall_progress情報に全フィールドが含まれること', async () => {
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

      // モック: MAIMLパーサー（3つのトランジション）
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'Test Method',
          petriNet: {
            transitions: [
              { id: 't1', name: 'T1' },
              { id: 't2', name: 'T2' },
              { id: 't3', name: 'T3' }
            ]
          }
        }]
      });

      // モック: TransitionDataRepository
      // t1: completed(100), t2: in_progress(60), t3: not_started(0)
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn()
        .mockResolvedValueOnce({
          record_id: 'r1',
          status: 'completed',
          progress_rate: 100,
          updated_at: new Date('2026-02-16T10:00:00Z')
        })
        .mockResolvedValueOnce({
          record_id: 'r2',
          status: 'running',
          progress_rate: 60,
          updated_at: new Date('2026-02-16T11:00:00Z')
        })
        .mockResolvedValueOnce(null);

      mockTransitionDataRepository.countRecordsByTransition = jest.fn()
        .mockResolvedValue(1);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // overall_progress情報の検証
      expect(result.success).toBe(true);
      if (result.success) {
        const overallProgress = result.data.overall_progress;
        
        // 全フィールドの存在確認
        expect(overallProgress).toHaveProperty('total_transitions');
        expect(overallProgress).toHaveProperty('completed');
        expect(overallProgress).toHaveProperty('in_progress');
        expect(overallProgress).toHaveProperty('not_started');
        expect(overallProgress).toHaveProperty('overall_percentage');
        
        // 値の検証
        expect(overallProgress.total_transitions).toBe(3);
        expect(overallProgress.completed).toBe(1);
        expect(overallProgress.in_progress).toBe(1);
        expect(overallProgress.not_started).toBe(1);
        // (100 + 60 + 0) / 3 = 53.3
        expect(overallProgress.overall_percentage).toBe(53.3);
      }
    });

    it('データ整合性: transitions配列の長さとoverall_progress.total_transitionsが一致すること', async () => {
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

      // モック: MAIMLパーサー（5つのトランジション）
      const transitions = Array.from({ length: 5 }, (_, i) => ({
        id: `t${i + 1}`,
        name: `トランジション${i + 1}`
      }));

      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'Test Method',
          petriNet: { transitions }
        }]
      });

      // モック: TransitionDataRepository
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn()
        .mockResolvedValue(null);
      mockTransitionDataRepository.countRecordsByTransition = jest.fn()
        .mockResolvedValue(0);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // データ整合性の検証
      expect(result.success).toBe(true);
      if (result.success) {
        const transitionsLength = result.data.transitions.length;
        const totalTransitions = result.data.overall_progress.total_transitions;
        
        expect(transitionsLength).toBe(totalTransitions);
        expect(transitionsLength).toBe(5);
      }
    });

    it('型検証: 各フィールドが正しい型であること', async () => {
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
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'Test Method',
          petriNet: {
            transitions: [
              { id: 't1', name: 'T1' }
            ]
          }
        }]
      });

      // モック: TransitionDataRepository
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn()
        .mockResolvedValue({
          record_id: 'r1',
          status: 'completed',
          progress_rate: 100,
          updated_at: new Date('2026-02-16T10:00:00Z')
        });

      mockTransitionDataRepository.countRecordsByTransition = jest.fn()
        .mockResolvedValue(5);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // 型検証
      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        
        // 文字列型
        expect(typeof data.project_id).toBe('string');
        expect(typeof data.project_name).toBe('string');
        expect(typeof data.method_id).toBe('string');
        expect(typeof data.method_name).toBe('string');
        expect(typeof data.task_name).toBe('string');
        
        // 数値型
        expect(typeof data.task_no).toBe('number');
        
        // 配列型
        expect(Array.isArray(data.transitions)).toBe(true);
        
        // オブジェクト型
        expect(typeof data.overall_progress).toBe('object');
        expect(data.overall_progress).not.toBeNull();
        
        // transitions配列の各要素の型
        if (data.transitions.length > 0) {
          const transition = data.transitions[0];
          expect(typeof transition.transition_id).toBe('string');
          expect(typeof transition.transition_name).toBe('string');
          expect(typeof transition.status).toBe('string');
          expect(typeof transition.progress).toBe('number');
          expect(typeof transition.has_data).toBe('boolean');
          expect(typeof transition.data_count).toBe('number');
          // last_updatedは文字列またはnull
          expect(typeof transition.last_updated === 'string' || transition.last_updated === null).toBe(true);
        }
        
        // overall_progressの各フィールドの型
        expect(typeof data.overall_progress.total_transitions).toBe('number');
        expect(typeof data.overall_progress.completed).toBe('number');
        expect(typeof data.overall_progress.in_progress).toBe('number');
        expect(typeof data.overall_progress.not_started).toBe('number');
        expect(typeof data.overall_progress.overall_percentage).toBe('number');
      }
    });
  });

  describe('タスク4.6: 進捗計算ロジックの実装', () => {
    it('正常系: 各トランジションのステータスを正しくカウントできること', async () => {
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

      // モック: MAIMLパーサー（5つのトランジション）
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'テストメソッド',
          petriNet: {
            transitions: [
              { id: 't1', name: 'トランジション1' },
              { id: 't2', name: 'トランジション2' },
              { id: 't3', name: 'トランジション3' },
              { id: 't4', name: 'トランジション4' },
              { id: 't5', name: 'トランジション5' }
            ]
          }
        }]
      });

      // モック: TransitionDataRepository
      // t1, t2: completed, t3, t4: in_progress, t5: not_started
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn()
        .mockResolvedValueOnce({ record_id: 'r1', status: 'completed', progress_rate: 100, updated_at: new Date('2026-02-01T10:00:00Z') })
        .mockResolvedValueOnce({ record_id: 'r2', status: 'completed', progress_rate: 100, updated_at: new Date('2026-02-02T10:00:00Z') })
        .mockResolvedValueOnce({ record_id: 'r3', status: 'running', progress_rate: 50, updated_at: new Date('2026-02-03T10:00:00Z') })
        .mockResolvedValueOnce({ record_id: 'r4', status: 'ready', progress_rate: 30, updated_at: new Date('2026-02-04T10:00:00Z') })
        .mockResolvedValueOnce(null); // t5: レコードなし

      mockTransitionDataRepository.countRecordsByTransition = jest.fn()
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // ステータスカウントの検証
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.overall_progress.total_transitions).toBe(5);
        expect(result.data.overall_progress.completed).toBe(2);
        expect(result.data.overall_progress.in_progress).toBe(2);
        expect(result.data.overall_progress.not_started).toBe(1);
      }
    });

    it('正常系: overall_percentageが全トランジションの進捗率の平均値として計算されること', async () => {
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

      // モック: MAIMLパーサー（4つのトランジション）
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'テストメソッド',
          petriNet: {
            transitions: [
              { id: 't1', name: 'トランジション1' },
              { id: 't2', name: 'トランジション2' },
              { id: 't3', name: 'トランジション3' },
              { id: 't4', name: 'トランジション4' }
            ]
          }
        }]
      });

      // モック: progress = 100, 80, 60, 20 → 平均 = 260 / 4 = 65.0
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn()
        .mockResolvedValueOnce({ record_id: 'r1', status: 'completed', progress_rate: 100, updated_at: new Date('2026-02-01T10:00:00Z') })
        .mockResolvedValueOnce({ record_id: 'r2', status: 'running', progress_rate: 80, updated_at: new Date('2026-02-02T10:00:00Z') })
        .mockResolvedValueOnce({ record_id: 'r3', status: 'running', progress_rate: 60, updated_at: new Date('2026-02-03T10:00:00Z') })
        .mockResolvedValueOnce({ record_id: 'r4', status: 'ready', progress_rate: 20, updated_at: new Date('2026-02-04T10:00:00Z') });

      mockTransitionDataRepository.countRecordsByTransition = jest.fn()
        .mockResolvedValue(1);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // overall_percentageの検証
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.overall_progress.overall_percentage).toBe(65.0);
      }
    });

    it('正常系: overall_percentageが小数点第1位に丸められること', async () => {
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

      // モック: MAIMLパーサー（3つのトランジション）
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'テストメソッド',
          petriNet: {
            transitions: [
              { id: 't1', name: 'トランジション1' },
              { id: 't2', name: 'トランジション2' },
              { id: 't3', name: 'トランジション3' }
            ]
          }
        }]
      });

      // モック: progress = 33, 33, 34 → 平均 = 100 / 3 = 33.333... → 33.3
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn()
        .mockResolvedValueOnce({ record_id: 'r1', status: 'running', progress_rate: 33, updated_at: new Date('2026-02-01T10:00:00Z') })
        .mockResolvedValueOnce({ record_id: 'r2', status: 'running', progress_rate: 33, updated_at: new Date('2026-02-02T10:00:00Z') })
        .mockResolvedValueOnce({ record_id: 'r3', status: 'running', progress_rate: 34, updated_at: new Date('2026-02-03T10:00:00Z') });

      mockTransitionDataRepository.countRecordsByTransition = jest.fn()
        .mockResolvedValue(1);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // 小数点第1位の検証
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.overall_progress.overall_percentage).toBe(33.3);
        expect(typeof result.data.overall_progress.overall_percentage).toBe('number');
      }
    });

    it('正常系: トランジション数が0の場合、overall_percentageは0を返すこと', async () => {
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

      // モック: MAIMLパーサー（トランジション0個）
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
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // トランジション0個の場合の検証
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.overall_progress.total_transitions).toBe(0);
        expect(result.data.overall_progress.completed).toBe(0);
        expect(result.data.overall_progress.in_progress).toBe(0);
        expect(result.data.overall_progress.not_started).toBe(0);
        expect(result.data.overall_progress.overall_percentage).toBe(0);
      }
    });

    it('Invariant検証: completed + in_progress + not_started = total_transitions', async () => {
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

      // モック: MAIMLパーサー（10個のトランジション）
      const transitions = Array.from({ length: 10 }, (_, i) => ({
        id: `t${i + 1}`,
        name: `トランジション${i + 1}`
      }));

      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'テストメソッド',
          petriNet: { transitions }
        }]
      });

      // モック: ランダムなステータス
      const statuses = ['completed', 'completed', 'completed', 'running', 'running', 'ready', 'paused', 'initial', 'initial', 'initial'];
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn();
      statuses.forEach((status, index) => {
        if (status === 'initial') {
          (mockTransitionDataRepository.getLatestRecordByTransition as jest.Mock)
            .mockResolvedValueOnce(null);
        } else {
          (mockTransitionDataRepository.getLatestRecordByTransition as jest.Mock)
            .mockResolvedValueOnce({
              record_id: `r${index + 1}`,
              status,
              progress_rate: status === 'completed' ? 100 : 50,
              updated_at: new Date()
            });
        }
      });

      mockTransitionDataRepository.countRecordsByTransition = jest.fn()
        .mockResolvedValue(1);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // Invariant検証
      expect(result.success).toBe(true);
      if (result.success) {
        const { total_transitions, completed, in_progress, not_started } = result.data.overall_progress;
        expect(completed + in_progress + not_started).toBe(total_transitions);
        expect(total_transitions).toBe(10);
      }
    });

    it('Invariant検証: completedステータスのトランジションはprogress=100であること', async () => {
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

      // モック: completedステータス（DBのprogress_rateは90だが、正規化されて100になるべき）
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn()
        .mockResolvedValue({
          record_id: 'r1',
          status: 'completed',
          progress_rate: 90, // 実際は100であるべきだが、データ不整合をシミュレート
          updated_at: new Date('2026-02-01T10:00:00Z')
        });

      mockTransitionDataRepository.countRecordsByTransition = jest.fn()
        .mockResolvedValue(5);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // Invariant検証: completedステータスは必ずprogress=100
      expect(result.success).toBe(true);
      if (result.success) {
        const completedTransition = result.data.transitions.find(t => t.status === 'completed');
        expect(completedTransition).toBeDefined();
        if (completedTransition) {
          expect(completedTransition.progress).toBe(100);
        }
      }
    });

    it('Invariant検証: not_startedステータスのトランジションはprogress=0であること', async () => {
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

      // モック: レコードなし（not_started）
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn()
        .mockResolvedValue(null);

      mockTransitionDataRepository.countRecordsByTransition = jest.fn()
        .mockResolvedValue(0);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // Invariant検証: not_startedステータスは必ずprogress=0
      expect(result.success).toBe(true);
      if (result.success) {
        const notStartedTransition = result.data.transitions.find(t => t.status === 'not_started');
        expect(notStartedTransition).toBeDefined();
        if (notStartedTransition) {
          expect(notStartedTransition.progress).toBe(0);
        }
      }
    });

    it('エッジケース: すべてのトランジションがcompletedの場合、overall_percentage=100.0', async () => {
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

      // モック: MAIMLパーサー（3つのトランジション）
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'テストメソッド',
          petriNet: {
            transitions: [
              { id: 't1', name: 'トランジション1' },
              { id: 't2', name: 'トランジション2' },
              { id: 't3', name: 'トランジション3' }
            ]
          }
        }]
      });

      // モック: すべてcompleted
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn()
        .mockResolvedValue({
          record_id: 'r1',
          status: 'completed',
          progress_rate: 100,
          updated_at: new Date('2026-02-01T10:00:00Z')
        });

      mockTransitionDataRepository.countRecordsByTransition = jest.fn()
        .mockResolvedValue(5);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // すべて完了の場合の検証
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.overall_progress.completed).toBe(3);
        expect(result.data.overall_progress.in_progress).toBe(0);
        expect(result.data.overall_progress.not_started).toBe(0);
        expect(result.data.overall_progress.overall_percentage).toBe(100.0);
      }
    });

    it('エッジケース: すべてのトランジションがnot_startedの場合、overall_percentage=0.0', async () => {
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

      // モック: MAIMLパーサー（3つのトランジション）
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'テストメソッド',
          petriNet: {
            transitions: [
              { id: 't1', name: 'トランジション1' },
              { id: 't2', name: 'トランジション2' },
              { id: 't3', name: 'トランジション3' }
            ]
          }
        }]
      });

      // モック: すべてnot_started（レコードなし）
      mockTransitionDataRepository.getLatestRecordByTransition = jest.fn()
        .mockResolvedValue(null);

      mockTransitionDataRepository.countRecordsByTransition = jest.fn()
        .mockResolvedValue(0);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // すべて未開始の場合の検証
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.overall_progress.completed).toBe(0);
        expect(result.data.overall_progress.in_progress).toBe(0);
        expect(result.data.overall_progress.not_started).toBe(3);
        expect(result.data.overall_progress.overall_percentage).toBe(0.0);
      }
    });
  });

  describe('タスク8.1: MAIMLパーサーアダプターのテスト', () => {
    /**
     * タスク8.1: MAIMLパーサーアダプターのテスト
     * 
     * @description 既存のparsePetriNetStructureを活用したアダプターのテスト
     * @requirements Requirement 4: MAIMLファイルとの連携
     * @reference 既存のmaimlService.parsePetriNetStructureのテストパターン
     */

    it('正常系: parsePetriNetStructure関数が正しく呼び出されること', async () => {
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

      const mockMAIMLContent = '<maiml><methods><method id="method1" name="Test"><petriNet><transitions><transition id="t1" name="T1" /></transitions></petriNet></method></methods></maiml>';

      // モック: ストレージサービス
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from(mockMAIMLContent, 'utf-8')
      );

      // モック: parsePetriNetStructure
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: false,
        methods: [{
          methodId: 'method1',
          methodName: 'Test',
          petriNet: {
            transitions: [{ id: 't1', name: 'T1' }]
          }
        }]
      });

      // メソッド呼び出し
      await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // parsePetriNetStructureが正しく呼ばれたことを確認
      expect(parsePetriNetStructure).toHaveBeenCalledTimes(1);
      expect(parsePetriNetStructure).toHaveBeenCalledWith(mockMAIMLContent);
    });

    it('正常系: parsePetriNetStructureの返却データ構造（methods配列）をそのまま使用できること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        method_id: 'method_abc',
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージサービス
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml></maiml>', 'utf-8')
      );

      // モック: parsePetriNetStructureの返却データ構造
      const mockParsedData = {
        success: true,
        isMultiMethod: true,
        methods: [
          {
            methodId: 'method_abc',
            methodName: 'アダプターテストメソッド',
            petriNet: {
              transitions: [
                { id: 't1', name: 'トランジション1' },
                { id: 't2', name: 'トランジション2' }
              ]
            }
          }
        ]
      };

      (parsePetriNetStructure as jest.Mock).mockResolvedValue(mockParsedData);

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // 返却データ構造がそのまま使用されていることを確認
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method_id).toBe('method_abc');
        expect(result.data.method_name).toBe('アダプターテストメソッド');
        expect(result.data.transitions).toHaveLength(2);
      }
    });

    it('正常系: 複数メソッド対応（isMultiMethod: true）を検証できること', async () => {
      // モック: タスク取得成功
      const mockTask = {
        task_id: 'task-uuid-1',
        task_name: 'テストタスク',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'test_project',
        method_id: 'method2',
        task_no: 1
      };
      mockTaskRepository.getTaskByProjectMethodTaskNo = jest.fn().mockResolvedValue(mockTask);

      // モック: ストレージサービス
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml></maiml>', 'utf-8')
      );

      // モック: 複数メソッド対応のparsePetriNetStructure
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        isMultiMethod: true,
        methods: [
          {
            methodId: 'method1',
            methodName: 'メソッド1',
            petriNet: { transitions: [{ id: 't1', name: 'T1' }] }
          },
          {
            methodId: 'method2',
            methodName: 'メソッド2',
            petriNet: { transitions: [{ id: 't2', name: 'T2' }] }
          },
          {
            methodId: 'method3',
            methodName: 'メソッド3',
            petriNet: { transitions: [{ id: 't3', name: 'T3' }] }
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

      // 複数メソッドから正しいメソッドが選択されていることを確認
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method_id).toBe('method2');
        expect(result.data.method_name).toBe('メソッド2');
      }
    });

    it('異常系: parsePetriNetStructureがsuccess: falseを返した場合、MAIML_PARSE_FAILEDエラーを返すこと', async () => {
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
        Buffer.from('<invalid-xml', 'utf-8')
      );

      // モック: parsePetriNetStructureがパース失敗を返す
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: false,
        methods: null,
        error: 'XML parsing failed'
      });

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // エラーハンドリングの検証
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('MAIML_PARSE_FAILED');
        expect(result.error.message).toContain('MAIMLファイルの解析に失敗');
      }
    });

    it('異常系: parsePetriNetStructureがmethods: nullを返した場合、MAIML_PARSE_FAILEDエラーを返すこと', async () => {
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

      // モック: parsePetriNetStructureがmethods: nullを返す
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        methods: null
      });

      // メソッド呼び出し
      const result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      // エラーハンドリングの検証
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('MAIML_PARSE_FAILED');
      }
    });

    it('データ変換: ダウンロードしたBufferをUTF-8文字列に変換してparsePetriNetStructureに渡すこと', async () => {
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

      // モック: ストレージサービス（Buffer返却）
      const mockStorageService = getStorageService();
      const testXMLContent = '<maiml><methods><method id="method1" name="Test"><petriNet><transitions></transitions></petriNet></method></methods></maiml>';
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from(testXMLContent, 'utf-8')
      );

      // モック: parsePetriNetStructure
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

      // parsePetriNetStructureに文字列として渡されたことを確認
      expect(parsePetriNetStructure).toHaveBeenCalledWith(testXMLContent);
      const callArg = (parsePetriNetStructure as jest.Mock).mock.calls[0][0];
      expect(typeof callArg).toBe('string');
      expect(callArg).toBe(testXMLContent);
    });

    it('エラーハンドリング統合: storageService→parsePetriNetStructure→ProgressServiceのエラー伝播を検証', async () => {
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

      // ケース1: storageServiceエラー
      const mockStorageService = getStorageService();
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockRejectedValue(
        new Error('Storage service error')
      );

      let result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('MAIML_DOWNLOAD_FAILED');
      }

      // ケース2: parsePetriNetStructureエラー
      (mockStorageService.downloadFile as jest.Mock) = jest.fn().mockResolvedValue(
        Buffer.from('<maiml></maiml>', 'utf-8')
      );
      (parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: false,
        methods: null
      });

      result = await progressService.getProgressData(
        mockTask.project_id,
        mockTask.method_id,
        mockTask.task_no,
        'maiml_lab_001'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('MAIML_PARSE_FAILED');
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

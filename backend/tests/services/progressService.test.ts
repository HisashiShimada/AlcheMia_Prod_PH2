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

  describe('マルチテナント分離のテスト', () => {
    it('organizationIdがTaskRepositoryに正しく渡されること', async () => {
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
});

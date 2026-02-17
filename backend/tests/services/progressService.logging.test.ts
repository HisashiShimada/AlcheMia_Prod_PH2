/**
 * ProgressService ログ記録テスト
 * 
 * @description タスク7.1: ProgressServiceのログ記録実装のテスト
 * Feature: progress-data-retrieval-api
 * Requirements: Requirement 7 (ログ記録と監査)
 */

import { ProgressService } from '../../src/services/progressService';
import { TaskRepository } from '../../src/repositories/taskRepository';
import { TransitionDataRepository } from '../../src/repositories/transitionDataRepository';
import { logger } from '../../src/utils/logger';
import * as storageServiceModule from '../../src/services/storageService';
import * as maimlServiceModule from '../../src/services/maimlService';

// モック設定
jest.mock('../../src/utils/logger');
jest.mock('../../src/services/storageService');
jest.mock('../../src/services/maimlService');

describe('ProgressService - ログ記録 (Task 7.1)', () => {
  let progressService: ProgressService;
  let mockTaskRepository: jest.Mocked<TaskRepository>;
  let mockTransitionDataRepository: jest.Mocked<TransitionDataRepository>;
  let mockLogger: jest.Mocked<typeof logger>;

  beforeEach(() => {
    // リポジトリのモック
    mockTaskRepository = {
      getTaskByProjectMethodTaskNo: jest.fn()
    } as any;

    mockTransitionDataRepository = {
      getLatestRecordByTransition: jest.fn(),
      countRecordsByTransition: jest.fn()
    } as any;

    // ロガーのモック
    mockLogger = logger as jest.Mocked<typeof logger>;
    mockLogger.info = jest.fn();
    mockLogger.error = jest.fn();
    mockLogger.warn = jest.fn();
    mockLogger.debug = jest.fn();

    progressService = new ProgressService(
      mockTaskRepository,
      mockTransitionDataRepository
    );

    // デフォルトのモックデータ
    mockTaskRepository.getTaskByProjectMethodTaskNo.mockResolvedValue({
      task_id: 'task-123',
      task_name: 'テストタスク',
      project_id: 'project-123',
      project_name: 'テストプロジェクト',
      method_id: 'method1',
      task_no: 1
    });

    const mockStorageService = {
      downloadFile: jest.fn().mockResolvedValue(Buffer.from('<maiml></maiml>'))
    };
    (storageServiceModule.getStorageService as jest.Mock).mockReturnValue(mockStorageService);

    (maimlServiceModule.parsePetriNetStructure as jest.Mock).mockResolvedValue({
      success: true,
      methods: [
        {
          methodId: 'method1',
          methodName: 'テストメソッド',
          petriNet: {
            transitions: [
              { id: 't1', name: 'トランジション1' }
            ]
          }
        }
      ]
    });

    mockTransitionDataRepository.getLatestRecordByTransition.mockResolvedValue({
      record_id: 'record-1',
      status: 'running',
      progress_rate: 50,
      updated_at: new Date('2026-02-16T10:00:00Z')
    });

    mockTransitionDataRepository.countRecordsByTransition.mockResolvedValue(5);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('APIリクエスト受信時のログ記録', () => {
    it('進捗データ取得開始時にリクエスト情報をログ記録すること', async () => {
      // When
      await progressService.getProgressData(
        'project-123',
        'method1',
        1,
        'org-001'
      );

      // Then
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('進捗データ取得開始'),
        expect.objectContaining({
          projectId: 'project-123',
          methodId: 'method1',
          taskNo: 1,
          organizationId: 'org-001'
        })
      );
    });

    it('ログにタイムスタンプ情報が含まれること', async () => {
      // When
      await progressService.getProgressData(
        'project-123',
        'method1',
        1,
        'org-001'
      );

      // Then
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('MAIMLファイルダウンロード時のログ記録', () => {
    it('MAIMLファイルダウンロード成功時にファイルパスとサイズをログ記録すること', async () => {
      // Given
      const mockBuffer = Buffer.from('<maiml></maiml>');
      const mockStorageService = {
        downloadFile: jest.fn().mockResolvedValue(mockBuffer)
      };
      (storageServiceModule.getStorageService as jest.Mock).mockReturnValue(mockStorageService);

      // When
      await progressService.getProgressData(
        'project-123',
        'method1',
        1,
        'org-001'
      );

      // Then
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('MAIMLファイルダウンロード成功'),
        expect.objectContaining({
          filePath: 'projects/テストプロジェクト/テストプロジェクト.maiml',
          fileSize: mockBuffer.length
        })
      );
    });

    it('MAIMLファイルダウンロード失敗時にエラーログを記録すること', async () => {
      // Given
      const mockError = new Error('S3接続エラー');
      const mockStorageService = {
        downloadFile: jest.fn().mockRejectedValue(mockError)
      };
      (storageServiceModule.getStorageService as jest.Mock).mockReturnValue(mockStorageService);

      // When
      await progressService.getProgressData(
        'project-123',
        'method1',
        1,
        'org-001'
      );

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('MAIMLダウンロードエラー'),
        expect.objectContaining({
          error: mockError,
          projectName: 'テストプロジェクト',
          organizationId: 'org-001'
        })
      );
    });
  });

  describe('データベースクエリ実行時のログ記録', () => {
    it('データベースクエリ実行時間をデバッグログに記録すること', async () => {
      // When
      await progressService.getProgressData(
        'project-123',
        'method1',
        1,
        'org-001'
      );

      // Then
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('データベースクエリ実行'),
        expect.objectContaining({
          operation: expect.any(String),
          duration: expect.any(Number)
        })
      );
    });

    it('クエリ実行時間が100msを超える場合は警告ログを記録すること', async () => {
      // Given: クエリが遅い状態をシミュレート
      mockTaskRepository.getTaskByProjectMethodTaskNo.mockImplementation(
        () => new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              task_id: 'task-123',
              task_name: 'テストタスク',
              project_id: 'project-123',
              project_name: 'テストプロジェクト',
              method_id: 'method1',
              task_no: 1
            });
          }, 150);
        })
      );

      // When
      await progressService.getProgressData(
        'project-123',
        'method1',
        1,
        'org-001'
      );

      // Then
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('クエリ実行時間が閾値を超過'),
        expect.objectContaining({
          operation: expect.any(String),
          duration: expect.any(Number)
        })
      );
    });
  });

  describe('エラー発生時のログ記録', () => {
    it('タスクが見つからない場合に警告ログを記録すること', async () => {
      // Given
      mockTaskRepository.getTaskByProjectMethodTaskNo.mockResolvedValue(null);

      // When
      await progressService.getProgressData(
        'project-123',
        'method1',
        1,
        'org-001'
      );

      // Then
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('タスクが見つかりません'),
        expect.objectContaining({
          projectId: 'project-123',
          methodId: 'method1',
          taskNo: 1,
          organizationId: 'org-001'
        })
      );
    });

    it('メソッドが見つからない場合に警告ログを記録すること', async () => {
      // Given
      (maimlServiceModule.parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        methods: [
          {
            methodId: 'different-method',
            methodName: '異なるメソッド',
            petriNet: { transitions: [] }
          }
        ]
      });

      // When
      await progressService.getProgressData(
        'project-123',
        'method1',
        1,
        'org-001'
      );

      // Then
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('メソッドが見つかりません'),
        expect.objectContaining({
          methodId: 'method1',
          availableMethods: expect.any(Array)
        })
      );
    });

    it('データベースエラー発生時にエラー詳細とスタックトレースをログ記録すること', async () => {
      // Given
      const mockError = new Error('Database connection failed');
      mockError.stack = 'Error: Database connection failed\n  at ...\n  at ...';
      mockTaskRepository.getTaskByProjectMethodTaskNo.mockRejectedValue(mockError);

      // When
      await progressService.getProgressData(
        'project-123',
        'method1',
        1,
        'org-001'
      );

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('エラー'),
        expect.objectContaining({
          error: mockError,
          errorMessage: mockError.message,
          errorStack: mockError.stack
        })
      );
    });

    it('エラーログにコンテキスト情報を含めること', async () => {
      // Given
      const mockError = new Error('Test error');
      mockTaskRepository.getTaskByProjectMethodTaskNo.mockRejectedValue(mockError);

      // When
      await progressService.getProgressData(
        'project-123',
        'method1',
        1,
        'org-001'
      );

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          projectId: 'project-123',
          methodId: 'method1',
          taskNo: 1,
          organizationId: 'org-001'
        })
      );
    });
  });

  describe('レスポンス返却時のログ記録', () => {
    it('成功時にレスポンス情報と処理時間をログ記録すること', async () => {
      // When
      const startTime = Date.now();
      await progressService.getProgressData(
        'project-123',
        'method1',
        1,
        'org-001'
      );
      const endTime = Date.now();

      // Then
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('進捗データ取得完了'),
        expect.objectContaining({
          success: true,
          transitionCount: 1,
          duration: expect.any(Number)
        })
      );

      // 処理時間が合理的な範囲内であることを確認
      const logCall = mockLogger.info.mock.calls.find(
        call => call[0].includes('進捗データ取得完了')
      );
      if (logCall && logCall[1]) {
        const duration = logCall[1].duration;
        expect(duration).toBeGreaterThanOrEqual(0);
        expect(duration).toBeLessThan(endTime - startTime + 100);
      }
    });

    it('エラー時にエラー情報と処理時間をログ記録すること', async () => {
      // Given
      mockTaskRepository.getTaskByProjectMethodTaskNo.mockResolvedValue(null);

      // When
      await progressService.getProgressData(
        'project-123',
        'method1',
        1,
        'org-001'
      );

      // Then
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          success: false,
          errorCode: 'TASK_NOT_FOUND',
          duration: expect.any(Number)
        })
      );
    });

    it('処理時間が1秒を超える場合は警告ログを記録すること', async () => {
      // Given: 処理が遅い状態をシミュレート
      mockTaskRepository.getTaskByProjectMethodTaskNo.mockImplementation(
        () => new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              task_id: 'task-123',
              task_name: 'テストタスク',
              project_id: 'project-123',
              project_name: 'テストプロジェクト',
              method_id: 'method1',
              task_no: 1
            });
          }, 1100);
        })
      );

      // When
      await progressService.getProgressData(
        'project-123',
        'method1',
        1,
        'org-001'
      );

      // Then
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('処理時間が閾値を超過'),
        expect.objectContaining({
          duration: expect.any(Number)
        })
      );
    });
  });

  describe('パフォーマンス監視', () => {
    it('並列処理の実行時間をデバッグログに記録すること', async () => {
      // Given: 複数のトランジション
      (maimlServiceModule.parsePetriNetStructure as jest.Mock).mockResolvedValue({
        success: true,
        methods: [
          {
            methodId: 'method1',
            methodName: 'テストメソッド',
            petriNet: {
              transitions: [
                { id: 't1', name: 'トランジション1' },
                { id: 't2', name: 'トランジション2' },
                { id: 't3', name: 'トランジション3' }
              ]
            }
          }
        ]
      });

      // When
      await progressService.getProgressData(
        'project-123',
        'method1',
        1,
        'org-001'
      );

      // Then
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('トランジション進捗取得完了'),
        expect.objectContaining({
          transitionCount: 3,
          duration: expect.any(Number)
        })
      );
    });
  });
});

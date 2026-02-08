/**
 * ExperimentDataService Unit Tests
 * 
 * トランジション状態更新サービスのユニットテスト
 */

import {
  ExperimentDataService,
  ALLOWED_TRANSITIONS,
  InvalidStatusTransitionError
} from '../../src/services/experimentDataService';
import { TransitionDataRepository } from '../../src/repositories/transitionDataRepository';
import { Status, TransitionDataUpdate } from '../../src/types/transitionData';
import { getPool } from '../../src/database/db';

// モック
jest.mock('../../src/database/db');
jest.mock('../../src/repositories/transitionDataRepository');

describe('ExperimentDataService', () => {
  let service: ExperimentDataService;
  let mockRepository: jest.Mocked<TransitionDataRepository>;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    // リポジトリのモック
    mockRepository = {
      findByTransitionId: jest.fn(),
      updateStatus: jest.fn()
    } as any;

    // データベースクライアントのモック
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient)
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);

    service = new ExperimentDataService(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateStatusTransition', () => {
    describe('許可された遷移', () => {
      test('initial → preparing は許可される', () => {
        expect(() => {
          service.validateStatusTransition('initial', 'preparing');
        }).not.toThrow();
      });

      test('initial → completed は許可される', () => {
        expect(() => {
          service.validateStatusTransition('initial', 'completed');
        }).not.toThrow();
      });

      test('preparing → ready は許可される', () => {
        expect(() => {
          service.validateStatusTransition('preparing', 'ready');
        }).not.toThrow();
      });

      test('ready → running は許可される', () => {
        expect(() => {
          service.validateStatusTransition('ready', 'running');
        }).not.toThrow();
      });

      test('ready → ready (自己遷移) は許可される', () => {
        expect(() => {
          service.validateStatusTransition('ready', 'ready');
        }).not.toThrow();
      });

      test('running → paused は許可される', () => {
        expect(() => {
          service.validateStatusTransition('running', 'paused');
        }).not.toThrow();
      });

      test('paused → running は許可される', () => {
        expect(() => {
          service.validateStatusTransition('paused', 'running');
        }).not.toThrow();
      });

      test('running → completed は許可される', () => {
        expect(() => {
          service.validateStatusTransition('running', 'completed');
        }).not.toThrow();
      });

      test('running → error は許可される', () => {
        expect(() => {
          service.validateStatusTransition('running', 'error');
        }).not.toThrow();
      });
    });

    describe('禁止された遷移', () => {
      test('completed → initial は禁止される（最終状態からの変更不可）', () => {
        expect(() => {
          service.validateStatusTransition('completed', 'initial');
        }).toThrow(InvalidStatusTransitionError);

        expect(() => {
          service.validateStatusTransition('completed', 'initial');
        }).toThrow(/Cannot change status from terminal state 'completed'/);
      });

      test('error → preparing は禁止される（最終状態からの変更不可）', () => {
        expect(() => {
          service.validateStatusTransition('error', 'preparing');
        }).toThrow(InvalidStatusTransitionError);

        expect(() => {
          service.validateStatusTransition('error', 'preparing');
        }).toThrow(/Cannot change status from terminal state 'error'/);
      });

      test('initial → running は禁止される（スキップ不可）', () => {
        expect(() => {
          service.validateStatusTransition('initial', 'running');
        }).toThrow(InvalidStatusTransitionError);

        expect(() => {
          service.validateStatusTransition('initial', 'running');
        }).toThrow(/Invalid status transition from 'initial' to 'running'/);
      });

      test('preparing → running は禁止される（準備完了を経由する必要がある）', () => {
        expect(() => {
          service.validateStatusTransition('preparing', 'running');
        }).toThrow(InvalidStatusTransitionError);
      });

      test('running → ready は禁止される（逆戻り不可）', () => {
        expect(() => {
          service.validateStatusTransition('running', 'ready');
        }).toThrow(InvalidStatusTransitionError);
      });
    });

    describe('バリデーション', () => {
      test('fromStatusが空の場合、エラーをスローする', () => {
        expect(() => {
          service.validateStatusTransition('' as Status, 'preparing');
        }).toThrow('Source and target status are required');
      });

      test('toStatusが空の場合、エラーをスローする', () => {
        expect(() => {
          service.validateStatusTransition('initial', '' as Status);
        }).toThrow('Source and target status are required');
      });

      test('不正なfromStatusの場合、エラーをスローする', () => {
        expect(() => {
          service.validateStatusTransition('invalid' as Status, 'preparing');
        }).toThrow(/Unknown status: invalid/);
      });

      test('不正なtoStatusの場合、エラーをスローする', () => {
        expect(() => {
          service.validateStatusTransition('initial', 'invalid' as Status);
        }).toThrow(/Unknown status: invalid/);
      });
    });
  });

  describe('updateStatus', () => {
    const organizationId = 'org-123';
    const projectId = 'proj-456';
    const methodId = 'method-789';
    const transitionId = 'trans-001';

      const updateData: TransitionDataUpdate = {
        status: 'running',
        progress_rate: 50,
        updated_by: 'test-user-id',
      };

    describe('正常系', () => {
      test('ステータス更新が成功する', async () => {
        // Arrange
        const currentTransition = {
          method_id: methodId,
          task_no: 1,
          status: 'ready' as Status
        };

        const updatedTransition = {
          organization_id: organizationId,
          project_id: projectId,
          method_id: methodId,
          task_no: 1,
          transition_id: transitionId,
          status: 'running' as Status,
          progress_rate: 50,
          updated_by: 'user-123',
          updated_at: new Date(),
          created_at: new Date()
        };

        // トランザクション関連のモック
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' }) // BEGIN
          .mockResolvedValueOnce({ rows: [currentTransition] }) // SELECT
          .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // COUNT
          .mockResolvedValueOnce({ rows: [{ sum: '150' }] }) // SUM
          .mockResolvedValueOnce({ command: 'UPDATE' }) // UPDATE project_task
          .mockResolvedValueOnce({ command: 'COMMIT' }); // COMMIT

        mockRepository.updateStatus.mockResolvedValue(updatedTransition);

        // Act
        const result = await service.updateStatus(
          organizationId,
          projectId,
          methodId,
          transitionId,
          updateData
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockRepository.updateStatus).toHaveBeenCalledWith(
          organizationId,
          projectId,
          methodId,
          1,
          transitionId,
          expect.objectContaining({
            status: 'running',
            progress_rate: 50
          })
        );
        expect(mockClient.release).toHaveBeenCalled();
      });

      test('completedステータス時、進捗率を100%に自動設定する', async () => {
        // Arrange
        const currentTransition = {
          method_id: methodId,
          task_no: 1,
          status: 'running' as Status
        };

        const completedUpdate: TransitionDataUpdate = {
          status: 'completed',
          progress_rate: 75, // 75%を指定しても100%に上書きされる
          updated_by: 'user-123'
        };

        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rows: [currentTransition] })
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          .mockResolvedValueOnce({ rows: [{ sum: '100' }] })
          .mockResolvedValueOnce({ command: 'UPDATE' })
          .mockResolvedValueOnce({ command: 'COMMIT' });

        mockRepository.updateStatus.mockResolvedValue({
          organization_id: organizationId,
          project_id: projectId,
          method_id: methodId,
          task_no: 1,
          transition_id: transitionId,
          status: 'completed',
          progress_rate: 100,
          updated_by: 'user-123',
          updated_at: new Date(),
          created_at: new Date()
        });

        // Act
        await service.updateStatus(
          organizationId,
          projectId,
          methodId,
          transitionId,
          completedUpdate
        );

        // Assert
        expect(mockRepository.updateStatus).toHaveBeenCalledWith(
          organizationId,
          projectId,
          methodId,
          1,
          transitionId,
          expect.objectContaining({
            status: 'completed',
            progress_rate: 100 // 100%に自動設定される
          })
        );
      });

      test('タスク進捗率を正しく再計算する', async () => {
        // Arrange
        const currentTransition = {
          method_id: methodId,
          task_no: 1,
          status: 'ready' as Status
        };

        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rows: [currentTransition] })
          .mockResolvedValueOnce({ rows: [{ count: '4' }] }) // 4個のトランジション
          .mockResolvedValueOnce({ rows: [{ sum: '260' }] }) // 合計260%
          .mockResolvedValueOnce({ command: 'UPDATE' })
          .mockResolvedValueOnce({ command: 'COMMIT' });

        mockRepository.updateStatus.mockResolvedValue({
          organization_id: organizationId,
          project_id: projectId,
          method_id: methodId,
          task_no: 1,
          transition_id: transitionId,
          status: 'running',
          progress_rate: 50,
          updated_by: 'user-123',
          updated_at: new Date(),
          created_at: new Date()
        });

        // Act
        await service.updateStatus(
          organizationId,
          projectId,
          methodId,
          transitionId,
          updateData
        );

        // Assert
        // タスク進捗率 = 260 / 4 = 65%
        const updateTaskCall = mockClient.query.mock.calls.find((call: any[]) =>
          call[0].includes('UPDATE project_task')
        );
        expect(updateTaskCall).toBeDefined();
        expect(updateTaskCall![1]).toContain(65); // 平均65%
      });
    });

    describe('異常系', () => {
      test('トランジションが存在しない場合、エラーをスローする', async () => {
        // Arrange
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rows: [] }); // トランジション見つからない

        // Act & Assert
        await expect(
          service.updateStatus(
            organizationId,
            projectId,
            methodId,
            transitionId,
            updateData
          )
        ).rejects.toThrow('Transition not found');

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });

      test('ステータス遷移ルール違反の場合、エラーをスローしてロールバックする', async () => {
        // Arrange
        const currentTransition = {
          method_id: methodId,
          task_no: 1,
          status: 'completed' as Status // 最終状態
        };

        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rows: [currentTransition] });

        const invalidUpdate: TransitionDataUpdate = {
          status: 'initial', // completedから他の状態への変更は不可
          progress_rate: 0,
          updated_by: 'user-123'
        };

        // Act & Assert
        await expect(
          service.updateStatus(
            organizationId,
            projectId,
            methodId,
            transitionId,
            invalidUpdate
          )
        ).rejects.toThrow(InvalidStatusTransitionError);

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockRepository.updateStatus).not.toHaveBeenCalled();
        expect(mockClient.release).toHaveBeenCalled();
      });

      test('データベースエラーが発生した場合、ロールバックする', async () => {
        // Arrange
        const dbError = new Error('Database connection failed');
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockRejectedValueOnce(dbError);

        // Act & Assert
        await expect(
          service.updateStatus(
            organizationId,
            projectId,
            methodId,
            transitionId,
            updateData
          )
        ).rejects.toThrow('Database connection failed');

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });

      test('リポジトリ更新が失敗した場合、ロールバックする', async () => {
        // Arrange
        const currentTransition = {
          method_id: methodId,
          task_no: 1,
          status: 'ready' as Status
        };

        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rows: [currentTransition] });

        const repoError = new Error('Repository error');
        mockRepository.updateStatus.mockRejectedValue(repoError);

        // Act & Assert
        await expect(
          service.updateStatus(
            organizationId,
            projectId,
            methodId,
            transitionId,
            updateData
          )
        ).rejects.toThrow('Repository error');

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });
    });

    describe('トランザクション管理', () => {
      test('正常系では必ずCOMMITが呼ばれる', async () => {
        // Arrange
        const currentTransition = {
          method_id: methodId,
          task_no: 1,
          status: 'ready' as Status
        };

        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rows: [currentTransition] })
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          .mockResolvedValueOnce({ rows: [{ sum: '100' }] })
          .mockResolvedValueOnce({ command: 'UPDATE' })
          .mockResolvedValueOnce({ command: 'COMMIT' });

        mockRepository.updateStatus.mockResolvedValue({
          organization_id: organizationId,
          project_id: projectId,
          method_id: methodId,
          task_no: 1,
          transition_id: transitionId,
          status: 'completed',
          progress_rate: 100,
          updated_by: 'user-123',
          updated_at: new Date(),
          created_at: new Date()
        });

        // Act
        await service.updateStatus(
          organizationId,
          projectId,
          methodId,
          transitionId,
          updateData
        );

        // Assert
        const queryCallsStr = mockClient.query.mock.calls.map((c: any) => String(c[0]));
        expect(queryCallsStr).toContain('BEGIN');
        expect(queryCallsStr).toContain('COMMIT');
        expect(queryCallsStr).not.toContain('ROLLBACK');
      });

      test('異常系では必ずROLLBACKが呼ばれる', async () => {
        // Arrange
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockRejectedValueOnce(new Error('Query failed'));

        // Act & Assert
        await expect(
          service.updateStatus(
            organizationId,
            projectId,
            methodId,
            transitionId,
            updateData
          )
        ).rejects.toThrow();

        const queryCallsStr = mockClient.query.mock.calls.map((c: any) => String(c[0]));
        expect(queryCallsStr).toContain('BEGIN');
        expect(queryCallsStr).toContain('ROLLBACK');
        expect(queryCallsStr).not.toContain('COMMIT');
      });

      test('エラー時でもclient.releaseが必ず呼ばれる', async () => {
        // Arrange
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockRejectedValueOnce(new Error('Query failed'));

        // Act & Assert
        await expect(
          service.updateStatus(
            organizationId,
            projectId,
            methodId,
            transitionId,
            updateData
          )
        ).rejects.toThrow();

        expect(mockClient.release).toHaveBeenCalled();
      });
    });
  });

  describe('ALLOWED_TRANSITIONS定数', () => {
    test('すべてのステータスが定義されている', () => {
      const expectedStatuses: Status[] = [
        'initial',
        'preparing',
        'ready',
        'running',
        'paused',
        'completed',
        'error'
      ];

      expectedStatuses.forEach((status) => {
        expect(ALLOWED_TRANSITIONS).toHaveProperty(status);
      });
    });

    test('最終状態(completed, error)からの遷移は空配列', () => {
      expect(ALLOWED_TRANSITIONS.completed).toEqual([]);
      expect(ALLOWED_TRANSITIONS.error).toEqual([]);
    });

    test('initialから遷移可能なステータス', () => {
      expect(ALLOWED_TRANSITIONS.initial).toContain('preparing');
      expect(ALLOWED_TRANSITIONS.initial).toContain('completed');
      expect(ALLOWED_TRANSITIONS.initial).toContain('error');
    });

    test('readyは自己遷移可能', () => {
      expect(ALLOWED_TRANSITIONS.ready).toContain('ready');
    });
  });
});
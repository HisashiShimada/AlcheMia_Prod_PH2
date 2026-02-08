/**
 * ExperimentDataService ユニットテスト
 * 
 * トランジション状態更新のビジネスロジックをテストします。
 */

import { ExperimentDataService } from '../../src/services/experimentDataService';
import { TransitionDataRepository } from '../../src/repositories/transitionDataRepository';
import { Status, TransitionDataUpdate } from '../../src/types/transitionData';
import { getPool } from '../../src/database/db';

// リポジトリとデータベースをモック
jest.mock('../../src/repositories/transitionDataRepository');
jest.mock('../../src/database/db');

describe('ExperimentDataService', () => {
  let service: ExperimentDataService;
  let mockRepository: jest.Mocked<TransitionDataRepository>;

  beforeEach(() => {
    mockRepository = new TransitionDataRepository() as jest.Mocked<TransitionDataRepository>;
    service = new ExperimentDataService(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateStatusTransition', () => {
    describe('Allowed transitions from initial', () => {
      it('should allow transition from initial to preparing', () => {
        expect(() => {
          service.validateStatusTransition('initial', 'preparing');
        }).not.toThrow();
      });

      it('should allow transition from initial to completed', () => {
        expect(() => {
          service.validateStatusTransition('initial', 'completed');
        }).not.toThrow();
      });

      it('should allow transition from initial to error', () => {
        expect(() => {
          service.validateStatusTransition('initial', 'error');
        }).not.toThrow();
      });

      it('should reject transition from initial to ready', () => {
        expect(() => {
          service.validateStatusTransition('initial', 'ready');
        }).toThrow('Invalid status transition');
      });

      it('should reject transition from initial to running', () => {
        expect(() => {
          service.validateStatusTransition('initial', 'running');
        }).toThrow('Invalid status transition');
      });

      it('should reject transition from initial to paused', () => {
        expect(() => {
          service.validateStatusTransition('initial', 'paused');
        }).toThrow('Invalid status transition');
      });
    });

    describe('Allowed transitions from preparing', () => {
      it('should allow transition from preparing to ready', () => {
        expect(() => {
          service.validateStatusTransition('preparing', 'ready');
        }).not.toThrow();
      });

      it('should allow transition from preparing to completed', () => {
        expect(() => {
          service.validateStatusTransition('preparing', 'completed');
        }).not.toThrow();
      });

      it('should allow transition from preparing to error', () => {
        expect(() => {
          service.validateStatusTransition('preparing', 'error');
        }).not.toThrow();
      });

      it('should reject transition from preparing to running', () => {
        expect(() => {
          service.validateStatusTransition('preparing', 'running');
        }).toThrow('Invalid status transition');
      });
    });

    describe('Allowed transitions from ready', () => {
      it('should allow transition from ready to ready (self-transition)', () => {
        expect(() => {
          service.validateStatusTransition('ready', 'ready');
        }).not.toThrow();
      });

      it('should allow transition from ready to running', () => {
        expect(() => {
          service.validateStatusTransition('ready', 'running');
        }).not.toThrow();
      });

      it('should allow transition from ready to completed', () => {
        expect(() => {
          service.validateStatusTransition('ready', 'completed');
        }).not.toThrow();
      });

      it('should allow transition from ready to error', () => {
        expect(() => {
          service.validateStatusTransition('ready', 'error');
        }).not.toThrow();
      });

      it('should reject transition from ready to preparing', () => {
        expect(() => {
          service.validateStatusTransition('ready', 'preparing');
        }).toThrow('Invalid status transition');
      });

      it('should reject transition from ready to paused', () => {
        expect(() => {
          service.validateStatusTransition('ready', 'paused');
        }).toThrow('Invalid status transition');
      });
    });

    describe('Allowed transitions from running', () => {
      it('should allow transition from running to paused', () => {
        expect(() => {
          service.validateStatusTransition('running', 'paused');
        }).not.toThrow();
      });

      it('should allow transition from running to completed', () => {
        expect(() => {
          service.validateStatusTransition('running', 'completed');
        }).not.toThrow();
      });

      it('should allow transition from running to error', () => {
        expect(() => {
          service.validateStatusTransition('running', 'error');
        }).not.toThrow();
      });

      it('should reject transition from running to initial', () => {
        expect(() => {
          service.validateStatusTransition('running', 'initial');
        }).toThrow('Invalid status transition');
      });

      it('should reject transition from running to ready', () => {
        expect(() => {
          service.validateStatusTransition('running', 'ready');
        }).toThrow('Invalid status transition');
      });
    });

    describe('Allowed transitions from paused', () => {
      it('should allow transition from paused to running', () => {
        expect(() => {
          service.validateStatusTransition('paused', 'running');
        }).not.toThrow();
      });

      it('should allow transition from paused to completed', () => {
        expect(() => {
          service.validateStatusTransition('paused', 'completed');
        }).not.toThrow();
      });

      it('should allow transition from paused to error', () => {
        expect(() => {
          service.validateStatusTransition('paused', 'error');
        }).not.toThrow();
      });

      it('should reject transition from paused to ready', () => {
        expect(() => {
          service.validateStatusTransition('paused', 'ready');
        }).toThrow('Invalid status transition');
      });
    });

    describe('Terminal states - completed', () => {
      it('should reject any transition from completed (terminal state)', () => {
        const allStatuses: Status[] = ['initial', 'preparing', 'ready', 'running', 'paused', 'completed', 'error'];
        
        allStatuses.forEach((targetStatus) => {
          expect(() => {
            service.validateStatusTransition('completed', targetStatus);
          }).toThrow('Cannot change status from terminal state');
        });
      });
    });

    describe('Terminal states - error', () => {
      it('should reject any transition from error (terminal state)', () => {
        const allStatuses: Status[] = ['initial', 'preparing', 'ready', 'running', 'paused', 'completed', 'error'];
        
        allStatuses.forEach((targetStatus) => {
          expect(() => {
            service.validateStatusTransition('error', targetStatus);
          }).toThrow('Cannot change status from terminal state');
        });
      });
    });

    describe('Error messages', () => {
      it('should provide detailed error message for invalid transition', () => {
        expect(() => {
          service.validateStatusTransition('initial', 'running');
        }).toThrow(/Invalid status transition from 'initial' to 'running'/);
      });

      it('should provide specific error message for terminal state', () => {
        expect(() => {
          service.validateStatusTransition('completed', 'initial');
        }).toThrow(/Cannot change status from terminal state 'completed'/);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle same status transition (idempotent for ready)', () => {
      expect(() => {
        service.validateStatusTransition('ready', 'ready');
      }).not.toThrow();
    });

    it('should reject same status transition for non-idempotent states', () => {
      expect(() => {
        service.validateStatusTransition('initial', 'initial');
      }).toThrow('Invalid status transition');
    });

    it('should reject undefined source status', () => {
      expect(() => {
        service.validateStatusTransition(undefined as any, 'preparing');
      }).toThrow();
    });

    it('should reject undefined target status', () => {
      expect(() => {
        service.validateStatusTransition('initial', undefined as any);
      }).toThrow();
    });
  });

  describe('updateStatus', () => {
    const mockOrganizationId = 'org-123';
    const mockProjectId = 'proj-456';
    const mockMethodId = 'method-789';
    const mockTaskNo = 1;
    const mockTransitionId = 'trans-001';
    const mockUserId = 'user-001';

    let mockPoolClient: any;

    beforeEach(() => {
      // モックのトランザクションクライアント
      mockPoolClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockPoolClient)
      };

      (getPool as jest.Mock).mockReturnValue(mockPool);
    });

    describe('正常系', () => {
      it('should update status from initial to preparing successfully', async () => {
        // トランジションID検索結果をモック
        mockPoolClient.query
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({
            rows: [{
              method_id: mockMethodId,
              task_no: mockTaskNo,
              status: 'initial'
            }]
          }); // SELECT transition_data

        // 更新後のデータをモック
        const updatedTransition = {
          organization_id: mockOrganizationId,
          project_id: mockProjectId,
          method_id: mockMethodId,
          task_no: mockTaskNo,
          transition_id: mockTransitionId,
          status: 'preparing' as Status,
          progress_rate: 10,
          comment: 'Starting preparation',
          updated_by: mockUserId,
          updated_at: new Date('2026-02-03'),
          created_at: new Date('2026-01-01')
        };

        mockRepository.updateStatus.mockResolvedValue(updatedTransition);

        // 残りのトランザクションクエリをモック
        mockPoolClient.query
          .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // COUNT - トランジション総数
          .mockResolvedValueOnce({ rows: [{ sum: '150' }] }) // SUM - 進捗率合計
          .mockResolvedValueOnce({ rows: [] }) // UPDATE project_task
          .mockResolvedValueOnce({ rows: [] }); // COMMIT

        const update: TransitionDataUpdate = {
          status: 'preparing',
          progress_rate: 10,
          updated_by: mockUserId
        };

        const result = await service.updateStatus(
          mockOrganizationId,
          mockProjectId,
          mockMethodId,
          mockTransitionId,
          update
        );

        expect(result).toEqual(updatedTransition);
        expect(mockRepository.updateStatus).toHaveBeenCalledWith(
          mockOrganizationId,
          mockProjectId,
          mockMethodId,
          mockTaskNo,
          mockTransitionId,
          expect.objectContaining({
            status: 'preparing',
            progress_rate: 10
          })
        );
        expect(mockPoolClient.release).toHaveBeenCalled();
      });

      it('should automatically set progress_rate to 100 when status is completed', async () => {
        // トランジションID検索結果をモック
        mockPoolClient.query
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({
            rows: [{
              method_id: mockMethodId,
              task_no: mockTaskNo,
              status: 'running'
            }]
          }); // SELECT transition_data

        const updatedTransition = {
          organization_id: mockOrganizationId,
          project_id: mockProjectId,
          method_id: mockMethodId,
          task_no: mockTaskNo,
          transition_id: mockTransitionId,
          status: 'completed' as Status,
          progress_rate: 100,
          comment: 'Work completed',
          updated_by: mockUserId,
          updated_at: new Date('2026-02-03'),
          created_at: new Date('2026-01-01')
        };

        mockRepository.updateStatus.mockResolvedValue(updatedTransition);

        // 残りのトランザクションクエリをモック
        mockPoolClient.query
          .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // COUNT - トランジション総数
          .mockResolvedValueOnce({ rows: [{ sum: '400' }] }) // SUM - 進捗率合計
          .mockResolvedValueOnce({ rows: [] }) // UPDATE project_task
          .mockResolvedValueOnce({ rows: [] }); // COMMIT

        const update: TransitionDataUpdate = {
          status: 'completed',
          progress_rate: 50, // この値は無視され、100に設定される
          updated_by: mockUserId
        };

        await service.updateStatus(
          mockOrganizationId,
          mockProjectId,
          mockMethodId,
          mockTransitionId,
          update
        );

        // progress_rateが100に自動設定されることを確認
        expect(mockRepository.updateStatus).toHaveBeenCalledWith(
          mockOrganizationId,
          mockProjectId,
          mockMethodId,
          mockTaskNo,
          mockTransitionId,
          expect.objectContaining({
            status: 'completed',
            progress_rate: 100
          })
        );
      });
    });

    describe('異常系 - トランジション不存在', () => {
      it('should throw TransitionNotFoundError when transition does not exist', async () => {
        // トランジションが見つからない
        mockPoolClient.query
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [] }); // SELECT transition_data - 空の結果

        const update: TransitionDataUpdate = {
          status: 'preparing',
          updated_by: mockUserId
        };

        await expect(
          service.updateStatus(
            mockOrganizationId,
            mockProjectId,
            mockMethodId,
            mockTransitionId,
            update
          )
        ).rejects.toThrow('Transition not found');

        expect(mockPoolClient.release).toHaveBeenCalled();
      });
    });

    describe('異常系 - 不正なステータス遷移', () => {
      it('should throw InvalidStatusTransitionError for invalid transition', async () => {
        // トランジションID検索結果をモック（completedステータス）
        mockPoolClient.query
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({
            rows: [{
              method_id: mockMethodId,
              task_no: mockTaskNo,
              status: 'completed' // 最終状態
            }]
          }); // SELECT transition_data

        const update: TransitionDataUpdate = {
          status: 'initial', // completedからは変更不可
          updated_by: mockUserId
        };

        await expect(
          service.updateStatus(
            mockOrganizationId,
            mockProjectId,
            mockMethodId,
            mockTransitionId,
            update
          )
        ).rejects.toThrow('Cannot change status from terminal state');

        expect(mockPoolClient.release).toHaveBeenCalled();
      });
    });

    describe('トランザクション管理', () => {
      it('should rollback transaction when error occurs', async () => {
        // トランジションID検索結果をモック
        mockPoolClient.query
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({
            rows: [{
              method_id: mockMethodId,
              task_no: mockTaskNo,
              status: 'initial'
            }]
          }); // SELECT transition_data

        // updateStatusでエラー発生
        mockRepository.updateStatus.mockRejectedValue(new Error('Database error'));

        const update: TransitionDataUpdate = {
          status: 'preparing',
          updated_by: mockUserId
        };

        await expect(
          service.updateStatus(
            mockOrganizationId,
            mockProjectId,
            mockMethodId,
            mockTransitionId,
            update
          )
        ).rejects.toThrow('Database error');

        expect(mockPoolClient.release).toHaveBeenCalled();
      });
    });
  });
});
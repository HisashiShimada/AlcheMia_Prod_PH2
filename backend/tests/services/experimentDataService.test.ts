/**
 * ExperimentDataService ユニットテスト
 * 
 * トランジション状態更新のビジネスロジックをテストします。
 */

import { ExperimentDataService } from '../../src/services/experimentDataService';
import { TransitionDataRepository } from '../../src/repositories/transitionDataRepository';
import { TemplateDataRepository, TemplateDataRecord } from '../../src/repositories/templateDataRepository';
import { EventLogRepository } from '../../src/repositories/eventLogRepository';
import { Status, TransitionDataUpdate } from '../../src/types/transitionData';
import { getPool } from '../../src/database/db';

// リポジトリとデータベースをモック
jest.mock('../../src/repositories/transitionDataRepository');
jest.mock('../../src/repositories/templateDataRepository');
jest.mock('../../src/repositories/eventLogRepository');
jest.mock('../../src/database/db');

describe('ExperimentDataService', () => {
  let service: ExperimentDataService;
  let mockTransitionRepository: jest.Mocked<TransitionDataRepository>;
  let mockTemplateRepository: jest.Mocked<TemplateDataRepository>;
  let mockEventLogRepository: jest.Mocked<EventLogRepository>;

  beforeEach(() => {
    mockTransitionRepository = new TransitionDataRepository() as jest.Mocked<TransitionDataRepository>;
    mockTemplateRepository = new TemplateDataRepository() as jest.Mocked<TemplateDataRepository>;
    mockEventLogRepository = new EventLogRepository() as jest.Mocked<EventLogRepository>;
    service = new ExperimentDataService(mockTransitionRepository, mockTemplateRepository, mockEventLogRepository);
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

        mockTransitionRepository.updateStatus.mockResolvedValue(updatedTransition);

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
        expect(mockTransitionRepository.updateStatus).toHaveBeenCalledWith(
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

        mockTransitionRepository.updateStatus.mockResolvedValue(updatedTransition);

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
        expect(mockTransitionRepository.updateStatus).toHaveBeenCalledWith(
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

      it('should log event to maiml_event_log after updating status', async () => {
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
          progress_rate: 25,
          comment: 'Progress update',
          updated_by: mockUserId,
          updated_at: new Date('2026-02-17'),
          created_at: new Date('2026-01-01')
        };

        mockTransitionRepository.updateStatus.mockResolvedValue(updatedTransition);
        mockEventLogRepository.logEvent.mockResolvedValue(undefined);

        // 残りのトランザクションクエリをモック
        mockPoolClient.query
          .mockResolvedValueOnce({ rows: [{ count: '4' }] }) // COUNT
          .mockResolvedValueOnce({ rows: [{ sum: '100' }] }) // SUM
          .mockResolvedValueOnce({ rows: [] }) // UPDATE project_task
          .mockResolvedValueOnce({ rows: [] }); // COMMIT

        const update: TransitionDataUpdate = {
          status: 'preparing',
          progress_rate: 25,
          updated_by: mockUserId
        };

        await service.updateStatus(
          mockOrganizationId,
          mockProjectId,
          mockMethodId,
          mockTransitionId,
          update
        );

        // イベントログが記録されることを確認
        expect(mockEventLogRepository.logEvent).toHaveBeenCalledWith(
          mockOrganizationId,
          mockProjectId,
          expect.objectContaining({
            event_type: 'transition_status_update',
            method_id: mockMethodId,
            task_no: mockTaskNo,
            transition_id: mockTransitionId,
            status: 'preparing',
            progress_rate: 25,
            updated_by: mockUserId,
            timestamp: expect.any(Date)
          }),
          mockPoolClient
        );
      });

      it('should include comment in event log when provided', async () => {
        mockPoolClient.query
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({
            rows: [{
              method_id: mockMethodId,
              task_no: mockTaskNo,
              status: 'ready'
            }]
          });

        const updatedTransition = {
          organization_id: mockOrganizationId,
          project_id: mockProjectId,
          method_id: mockMethodId,
          task_no: mockTaskNo,
          transition_id: mockTransitionId,
          status: 'running' as Status,
          progress_rate: 50,
          comment: 'Started processing',
          updated_by: mockUserId,
          updated_at: new Date('2026-02-17'),
          created_at: new Date('2026-01-01')
        };

        mockTransitionRepository.updateStatus.mockResolvedValue(updatedTransition);
        mockEventLogRepository.logEvent.mockResolvedValue(undefined);

        mockPoolClient.query
          .mockResolvedValueOnce({ rows: [{ count: '3' }] })
          .mockResolvedValueOnce({ rows: [{ sum: '150' }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        const update: TransitionDataUpdate = {
          status: 'running',
          progress_rate: 50,
          updated_by: mockUserId
        };

        await service.updateStatus(
          mockOrganizationId,
          mockProjectId,
          mockMethodId,
          mockTransitionId,
          update
        );

        expect(mockEventLogRepository.logEvent).toHaveBeenCalledWith(
          mockOrganizationId,
          mockProjectId,
          expect.objectContaining({
            comment: 'Started processing'
          }),
          mockPoolClient
        );
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
        mockTransitionRepository.updateStatus.mockRejectedValue(new Error('Database error'));

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

      it('should rollback transaction when event logging fails', async () => {
        mockPoolClient.query
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({
            rows: [{
              method_id: mockMethodId,
              task_no: mockTaskNo,
              status: 'initial'
            }]
          });

        const updatedTransition = {
          organization_id: mockOrganizationId,
          project_id: mockProjectId,
          method_id: mockMethodId,
          task_no: mockTaskNo,
          transition_id: mockTransitionId,
          status: 'preparing' as Status,
          progress_rate: 10,
          comment: null,
          updated_by: mockUserId,
          updated_at: new Date('2026-02-17'),
          created_at: new Date('2026-01-01')
        };

        mockTransitionRepository.updateStatus.mockResolvedValue(updatedTransition);
        
        // イベントログ記録でエラー発生
        mockEventLogRepository.logEvent.mockRejectedValue(new Error('Event log failed'));

        const update: TransitionDataUpdate = {
          status: 'preparing',
          progress_rate: 10,
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
        ).rejects.toThrow('Event log failed');

        expect(mockPoolClient.release).toHaveBeenCalled();
      });
    });
  });

  describe('saveBatchData', () => {
    const mockOrganizationId = 'org-123';
    const mockProjectId = 'proj-456';
    const mockMethodId = 'method-789';
    const mockTaskNo = 1;
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
      it('should save batch data successfully when project status is draft', async () => {
        const records: TemplateDataRecord[] = [
          {
            placeId: 'place-001',
            templateType: 'material',
            templateId: 'template-mat-001',
            data: { name: 'Material A', amount: 100 },
            status: 'initial',
            comment: 'First record'
          },
          {
            placeId: 'place-002',
            templateType: 'condition',
            templateId: 'template-cond-001',
            data: { temperature: 25, pressure: 1 },
            status: 'preparing',
            comment: 'Second record'
          }
        ];

        // BEGIN
        mockPoolClient.query.mockResolvedValueOnce({ rows: [] });

        // SELECT projects - ステータス確認
        mockPoolClient.query.mockResolvedValueOnce({
          rows: [{ status: 'draft' }]
        });

        // SELECT project_task - タスク存在確認
        mockPoolClient.query.mockResolvedValueOnce({
          rows: [{ task_no: mockTaskNo }]
        });

        // upsert結果をモック
        const savedRecord1 = {
          id: 'record-001',
          organization_id: mockOrganizationId,
          project_id: mockProjectId,
          method_id: mockMethodId,
          task_no: mockTaskNo,
          place_id: 'place-001',
          template_type: 'material' as const,
          template_id: 'template-mat-001',
          data: { name: 'Material A', amount: 100 },
          status: 'initial' as const,
          comment: 'First record',
          recorded_by: mockUserId,
          recorded_at: new Date('2026-02-17'),
          created_at: new Date('2026-02-17'),
          updated_at: new Date('2026-02-17')
        };

        const savedRecord2 = {
          id: 'record-002',
          organization_id: mockOrganizationId,
          project_id: mockProjectId,
          method_id: mockMethodId,
          task_no: mockTaskNo,
          place_id: 'place-002',
          template_type: 'condition' as const,
          template_id: 'template-cond-001',
          data: { temperature: 25, pressure: 1 },
          status: 'preparing' as const,
          comment: 'Second record',
          recorded_by: mockUserId,
          recorded_at: new Date('2026-02-17'),
          created_at: new Date('2026-02-17'),
          updated_at: new Date('2026-02-17')
        };

        mockTemplateRepository.upsert
          .mockResolvedValueOnce(savedRecord1)
          .mockResolvedValueOnce(savedRecord2);

        // COMMIT
        mockPoolClient.query.mockResolvedValueOnce({ rows: [] });

        const result = await service.saveBatchData(
          mockOrganizationId,
          mockProjectId,
          mockMethodId,
          mockTaskNo,
          records,
          mockUserId
        );

        expect(result).toEqual([savedRecord1, savedRecord2]);
        expect(mockTemplateRepository.upsert).toHaveBeenCalledTimes(2);
        expect(mockPoolClient.release).toHaveBeenCalled();
      });

      it('should save batch data successfully when project status is active', async () => {
        const records: TemplateDataRecord[] = [
          {
            placeId: 'place-001',
            templateType: 'result',
            templateId: 'template-res-001',
            data: { output: 'Result A' }
          }
        ];

        // BEGIN
        mockPoolClient.query.mockResolvedValueOnce({ rows: [] });

        // SELECT projects - ステータス確認（active）
        mockPoolClient.query.mockResolvedValueOnce({
          rows: [{ status: 'active' }]
        });

        // SELECT project_task - タスク存在確認
        mockPoolClient.query.mockResolvedValueOnce({
          rows: [{ task_no: mockTaskNo }]
        });

        const savedRecord = {
          id: 'record-001',
          organization_id: mockOrganizationId,
          project_id: mockProjectId,
          method_id: mockMethodId,
          task_no: mockTaskNo,
          place_id: 'place-001',
          template_type: 'result' as const,
          template_id: 'template-res-001',
          data: { output: 'Result A' },
          status: null,
          comment: null,
          recorded_by: mockUserId,
          recorded_at: new Date('2026-02-17'),
          created_at: new Date('2026-02-17'),
          updated_at: new Date('2026-02-17')
        };

        mockTemplateRepository.upsert.mockResolvedValueOnce(savedRecord);

        // COMMIT
        mockPoolClient.query.mockResolvedValueOnce({ rows: [] });

        const result = await service.saveBatchData(
          mockOrganizationId,
          mockProjectId,
          mockMethodId,
          mockTaskNo,
          records,
          mockUserId
        );

        expect(result).toEqual([savedRecord]);
        expect(mockPoolClient.release).toHaveBeenCalled();
      });

      it('should save batch data successfully when project status is waiting_approval', async () => {
        const records: TemplateDataRecord[] = [
          {
            placeId: 'place-001',
            templateType: 'material',
            templateId: 'template-mat-001',
            data: { name: 'Material B' }
          }
        ];

        // BEGIN
        mockPoolClient.query.mockResolvedValueOnce({ rows: [] });

        // SELECT projects - ステータス確認（waiting_approval）
        mockPoolClient.query.mockResolvedValueOnce({
          rows: [{ status: 'waiting_approval' }]
        });

        // SELECT project_task - タスク存在確認
        mockPoolClient.query.mockResolvedValueOnce({
          rows: [{ task_no: mockTaskNo }]
        });

        const savedRecord = {
          id: 'record-001',
          organization_id: mockOrganizationId,
          project_id: mockProjectId,
          method_id: mockMethodId,
          task_no: mockTaskNo,
          place_id: 'place-001',
          template_type: 'material' as const,
          template_id: 'template-mat-001',
          data: { name: 'Material B' },
          status: null,
          comment: null,
          recorded_by: mockUserId,
          recorded_at: new Date('2026-02-17'),
          created_at: new Date('2026-02-17'),
          updated_at: new Date('2026-02-17')
        };

        mockTemplateRepository.upsert.mockResolvedValueOnce(savedRecord);

        // COMMIT
        mockPoolClient.query.mockResolvedValueOnce({ rows: [] });

        const result = await service.saveBatchData(
          mockOrganizationId,
          mockProjectId,
          mockMethodId,
          mockTaskNo,
          records,
          mockUserId
        );

        expect(result).toEqual([savedRecord]);
        expect(mockPoolClient.release).toHaveBeenCalled();
      });
    });

    describe('異常系 - プロジェクトステータス編集不可', () => {
      it('should throw ProjectNotEditableError when project status is archived', async () => {
        const records: TemplateDataRecord[] = [
          {
            placeId: 'place-001',
            templateType: 'material',
            templateId: 'template-mat-001',
            data: { name: 'Material A' }
          }
        ];

        // BEGIN
        mockPoolClient.query.mockResolvedValueOnce({ rows: [] });

        // SELECT projects - ステータス確認（archived）
        mockPoolClient.query.mockResolvedValueOnce({
          rows: [{ status: 'archived' }]
        });

        await expect(
          service.saveBatchData(
            mockOrganizationId,
            mockProjectId,
            mockMethodId,
            mockTaskNo,
            records,
            mockUserId
          )
        ).rejects.toThrow('Project is not editable');

        expect(mockPoolClient.release).toHaveBeenCalled();
      });

      it('should throw ProjectNotEditableError when project status is completed', async () => {
        const records: TemplateDataRecord[] = [
          {
            placeId: 'place-001',
            templateType: 'material',
            templateId: 'template-mat-001',
            data: { name: 'Material A' }
          }
        ];

        // BEGIN
        mockPoolClient.query.mockResolvedValueOnce({ rows: [] });

        // SELECT projects - ステータス確認（completed）
        mockPoolClient.query.mockResolvedValueOnce({
          rows: [{ status: 'completed' }]
        });

        await expect(
          service.saveBatchData(
            mockOrganizationId,
            mockProjectId,
            mockMethodId,
            mockTaskNo,
            records,
            mockUserId
          )
        ).rejects.toThrow('Project is not editable');

        expect(mockPoolClient.release).toHaveBeenCalled();
      });
    });

    describe('異常系 - タスク不存在', () => {
      it('should throw TaskNotFoundError when task does not exist', async () => {
        const records: TemplateDataRecord[] = [
          {
            placeId: 'place-001',
            templateType: 'material',
            templateId: 'template-mat-001',
            data: { name: 'Material A' }
          }
        ];

        // BEGIN
        mockPoolClient.query.mockResolvedValueOnce({ rows: [] });

        // SELECT projects - ステータス確認（draft）
        mockPoolClient.query.mockResolvedValueOnce({
          rows: [{ status: 'draft' }]
        });

        // SELECT project_task - タスクが見つからない
        mockPoolClient.query.mockResolvedValueOnce({
          rows: []
        });

        await expect(
          service.saveBatchData(
            mockOrganizationId,
            mockProjectId,
            mockMethodId,
            mockTaskNo,
            records,
            mockUserId
          )
        ).rejects.toThrow('Task not found');

        expect(mockPoolClient.release).toHaveBeenCalled();
      });
    });

    describe('異常系 - トランザクションロールバック', () => {
      it('should rollback transaction when one record fails to save', async () => {
        const records: TemplateDataRecord[] = [
          {
            placeId: 'place-001',
            templateType: 'material',
            templateId: 'template-mat-001',
            data: { name: 'Material A' }
          },
          {
            placeId: 'place-002',
            templateType: 'condition',
            templateId: 'template-cond-001',
            data: { temperature: 25 }
          }
        ];

        // BEGIN
        mockPoolClient.query.mockResolvedValueOnce({ rows: [] });

        // SELECT projects - ステータス確認
        mockPoolClient.query.mockResolvedValueOnce({
          rows: [{ status: 'draft' }]
        });

        // SELECT project_task - タスク存在確認
        mockPoolClient.query.mockResolvedValueOnce({
          rows: [{ task_no: mockTaskNo }]
        });

        const savedRecord1 = {
          id: 'record-001',
          organization_id: mockOrganizationId,
          project_id: mockProjectId,
          method_id: mockMethodId,
          task_no: mockTaskNo,
          place_id: 'place-001',
          template_type: 'material' as const,
          template_id: 'template-mat-001',
          data: { name: 'Material A' },
          status: null,
          comment: null,
          recorded_by: mockUserId,
          recorded_at: new Date('2026-02-17'),
          created_at: new Date('2026-02-17'),
          updated_at: new Date('2026-02-17')
        };

        // 1件目は成功、2件目で失敗
        mockTemplateRepository.upsert
          .mockResolvedValueOnce(savedRecord1)
          .mockRejectedValueOnce(new Error('Database error'));

        await expect(
          service.saveBatchData(
            mockOrganizationId,
            mockProjectId,
            mockMethodId,
            mockTaskNo,
            records,
            mockUserId
          )
        ).rejects.toThrow('Database error');

        expect(mockTemplateRepository.upsert).toHaveBeenCalledTimes(2);
        expect(mockPoolClient.release).toHaveBeenCalled();
      });

      it('should rollback entire transaction on any failure', async () => {
        const records: TemplateDataRecord[] = [
          {
            placeId: 'place-001',
            templateType: 'material',
            templateId: 'template-mat-001',
            data: { name: 'Material A' }
          }
        ];

        // BEGIN
        mockPoolClient.query.mockResolvedValueOnce({ rows: [] });

        // SELECT projects - ステータス確認
        mockPoolClient.query.mockResolvedValueOnce({
          rows: [{ status: 'draft' }]
        });

        // SELECT project_task - タスク存在確認
        mockPoolClient.query.mockResolvedValueOnce({
          rows: [{ task_no: mockTaskNo }]
        });

        // upsertで失敗
        mockTemplateRepository.upsert.mockRejectedValueOnce(new Error('Connection lost'));

        await expect(
          service.saveBatchData(
            mockOrganizationId,
            mockProjectId,
            mockMethodId,
            mockTaskNo,
            records,
            mockUserId
          )
        ).rejects.toThrow('Connection lost');

        expect(mockPoolClient.release).toHaveBeenCalled();
      });
    });
  });
});

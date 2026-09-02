/**
 * progressController フェーズ２ テスト
 *
 * 分類A：進捗管理APIの動作確認
 * - getProgressData / getNgTasks / updateTransitionStatus / getWorkerTasks / updateTaskStatus
 */

import { Request, Response, NextFunction } from 'express';
import {
  getProgressData,
  getNgTasks,
  updateTransitionStatus,
  getWorkerTasks,
} from '../../../src/controllers/progressController';
import { ProgressService } from '../../../src/services/progressService';
import { TaskService } from '../../../src/services/taskService';
import * as projectTaskDetailRepository from '../../../src/repositories/projectTaskDetailRepository';
import * as projectRepository from '../../../src/repositories/projectRepository';

jest.mock('../../../src/services/progressService');
jest.mock('../../../src/services/taskService');
jest.mock('../../../src/repositories/projectTaskDetailRepository');
jest.mock('../../../src/repositories/projectRepository');
jest.mock('../../../src/repositories/transitionDataRepository');
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

function makeMocks(overrides: {
  params?: Record<string, string>;
  body?: Record<string, any>;
  query?: Record<string, string>;
  user?: { organizationId: string; userId: string };
} = {}) {
  const req = {
    params: overrides.params ?? {},
    body: overrides.body ?? {},
    query: overrides.query ?? {},
    headers: {},
    user: overrides.user ?? { organizationId: 'org-001', userId: 'user-001' },
  } as unknown as Request;

  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    setHeader: jest.fn(),
  } as unknown as Response;

  const next = jest.fn() as NextFunction;

  return { req, res, next };
}

describe('progressController - Phase2 テスト', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // getProgressData
  // ==========================================================================
  describe('getProgressData()', () => {
    test('正常系: 進捗データを返すこと', async () => {
      const data = { transitions: [{ transitionId: 'trans-001', status: 1 }] };
      (ProgressService as jest.Mock).mockImplementation(() => ({
        getProgressData: jest.fn().mockResolvedValue({ success: true, data }),
      }));

      const { req, res } = makeMocks({
        params: { projectId: 'proj-001', methodId: 'method-001', taskNo: '1' },
      });

      await getProgressData(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data })
      );
    });

    test('異常系: エラーコードに対応する HTTP ステータスを返すこと', async () => {
      (ProgressService as jest.Mock).mockImplementation(() => ({
        getProgressData: jest.fn().mockResolvedValue({
          success: false,
          error: { code: 'E7008', message: 'not found' },
        }),
      }));

      const { req, res } = makeMocks({
        params: { projectId: 'proj-001', methodId: 'method-001', taskNo: '1' },
      });

      await getProgressData(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  // ==========================================================================
  // getNgTasks
  // ==========================================================================
  describe('getNgTasks()', () => {
    test('正常系: NG タスク一覧を返すこと', async () => {
      const tasks = [
        { task_no: 1, method_id: 'method-001', task_status: 5, review_result: 'NG理由', reviewed_at: new Date(), review_user_id: 'user-001' },
        { task_no: 2, method_id: 'method-001', task_status: 5, review_result: null, reviewed_at: null, review_user_id: null },
      ];
      (projectTaskDetailRepository.findByProject as jest.Mock).mockResolvedValue([
        ...tasks,
        { task_no: 3, method_id: 'method-001', task_status: 2 }, // NG 以外は除外
      ]);

      const { req, res, next } = makeMocks({ params: { projectId: 'proj-001' } });

      await getNgTasks(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ ngTasks: expect.any(Array) }),
        })
      );
      // NG タスクのみ（task_status=5（REVIEW_NG）の 2件）
      const call = (res.json as jest.Mock).mock.calls[0][0];
      expect(call.data.ngTasks).toHaveLength(2);
    });

    test('異常系: エラー発生時に next を呼ぶこと', async () => {
      const error = new Error('DB error');
      (projectTaskDetailRepository.findByProject as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks({ params: { projectId: 'proj-001' } });

      await getNgTasks(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==========================================================================
  // updateTransitionStatus
  // ==========================================================================
  describe('updateTransitionStatus()', () => {
    test('正常系: トランジションステータスを更新し、200 を返すこと', async () => {
      (projectRepository.getById as jest.Mock).mockResolvedValue({
        project_id: 'proj-001',
        project_status: 2,
      });
      (ProgressService as jest.Mock).mockImplementation(() => ({
        updateTransitionStatus: jest.fn().mockResolvedValue({
          status: 2,
          progress_rate: 50,
          updated_at: new Date(),
        }),
      }));

      const { req, res, next } = makeMocks({
        params: { projectId: 'proj-001', methodId: 'method-001', transitionId: 'trans-001' },
        body: { status: 2, progressRate: 50 },
      });

      await updateTransitionStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    test('異常系: プロジェクトが存在しない場合、エラーをスローすること', async () => {
      (projectRepository.getById as jest.Mock).mockResolvedValue(null);

      const { req, res, next } = makeMocks({
        params: { projectId: 'non-existent', methodId: 'method-001', transitionId: 'trans-001' },
        body: { status: 2 },
      });

      await updateTransitionStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ==========================================================================
  // getWorkerTasks
  // ==========================================================================
  describe('getWorkerTasks()', () => {
    test('正常系: タスク一覧をメソッド単位でグループ化して返すこと', async () => {
      const methodGroups = [{ method_id: 'method-001', tasks: [{ task_no: 1 }] }];
      (TaskService as jest.Mock).mockImplementation(() => ({
        getTasksGroupedByMethod: jest.fn().mockResolvedValue(methodGroups),
      }));

      const { req, res, next } = makeMocks({ params: { projectId: 'proj-001' } });

      await getWorkerTasks(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            project_id: 'proj-001',
            methods: methodGroups,
          }),
        })
      );
    });

    test('異常系: エラー発生時に next を呼ぶこと', async () => {
      const error = new Error('service error');
      (TaskService as jest.Mock).mockImplementation(() => ({
        getTasksGroupedByMethod: jest.fn().mockRejectedValue(error),
      }));

      const { req, res, next } = makeMocks({ params: { projectId: 'proj-001' } });

      await getWorkerTasks(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});

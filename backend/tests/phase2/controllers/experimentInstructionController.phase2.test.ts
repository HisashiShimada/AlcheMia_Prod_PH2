/**
 * experimentInstructionController フェーズ２ テスト
 *
 * 分類A：実験指示APIの動作確認
 * - getExperimentInstructions / getProjectMethods / approveTask / recordNg / getPlanDialogData
 */

import { Request, Response, NextFunction } from 'express';
import * as experimentInstructionService from '../../../src/services/experimentInstructionService';
import {
  getExperimentInstructions,
  getProjectMethods,
  approveTask,
  recordNg,
  getPlanDialogData,
} from '../../../src/controllers/experimentInstructionController';

jest.mock('../../../src/services/experimentInstructionService');
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

function makeMocks(overrides: {
  params?: Record<string, string>;
  body?: Record<string, any>;
  user?: { organizationId: string; userId: string };
} = {}) {
  const req = {
    params: overrides.params ?? {},
    body: overrides.body ?? {},
    user: overrides.user ?? { organizationId: 'org-001', userId: 'user-001' },
  } as unknown as Request;

  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  } as unknown as Response;

  const next = jest.fn() as NextFunction;

  return { req, res, next };
}

describe('experimentInstructionController - Phase2 テスト', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // getExperimentInstructions
  // ==========================================================================
  describe('getExperimentInstructions()', () => {
    test('正常系: 実験指示一覧を返すこと', async () => {
      const result = [{ methodId: 'method-001', tasks: [] }];
      (experimentInstructionService.getExperimentInstructions as jest.Mock).mockResolvedValue(result);

      const { req, res, next } = makeMocks({ params: { projectId: 'proj-001' } });

      await getExperimentInstructions(req, res, next);

      expect(experimentInstructionService.getExperimentInstructions).toHaveBeenCalledWith('org-001', 'proj-001');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
    });

    test('異常系: エラー発生時に next を呼ぶこと', async () => {
      const error = new Error('service error');
      (experimentInstructionService.getExperimentInstructions as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks({ params: { projectId: 'proj-001' } });

      await getExperimentInstructions(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==========================================================================
  // getProjectMethods
  // ==========================================================================
  describe('getProjectMethods()', () => {
    test('正常系: メソッドID一覧を返すこと', async () => {
      const methods = ['method-001', 'method-002'];
      (experimentInstructionService.getProjectMethods as jest.Mock).mockResolvedValue(methods);

      const { req, res, next } = makeMocks({ params: { projectId: 'proj-001' } });

      await getProjectMethods(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: methods });
    });

    test('異常系: エラー発生時に next を呼ぶこと', async () => {
      const error = new Error('service error');
      (experimentInstructionService.getProjectMethods as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks({ params: { projectId: 'proj-001' } });

      await getProjectMethods(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==========================================================================
  // approveTask
  // ==========================================================================
  describe('approveTask()', () => {
    test('正常系: タスクを承認し、結果を返すこと', async () => {
      const result = { task_status: 5 };
      (experimentInstructionService.approveTask as jest.Mock).mockResolvedValue(result);

      const { req, res, next } = makeMocks({
        params: { projectId: 'proj-001', methodId: 'method-001', taskNo: '1' },
      });

      await approveTask(req, res, next);

      expect(experimentInstructionService.approveTask).toHaveBeenCalledWith(
        'org-001', 'proj-001', 'method-001', 1, 'user-001'
      );
      expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
    });

    test('異常系: 承認不可状態（null）の場合、409 を返すこと', async () => {
      (experimentInstructionService.approveTask as jest.Mock).mockResolvedValue(null);

      const { req, res, next } = makeMocks({
        params: { projectId: 'proj-001', methodId: 'method-001', taskNo: '1' },
      });

      await approveTask(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.objectContaining({ code: 'E7005' }) })
      );
    });

    test('異常系: エラー発生時に next を呼ぶこと', async () => {
      const error = new Error('unexpected');
      (experimentInstructionService.approveTask as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks({
        params: { projectId: 'proj-001', methodId: 'method-001', taskNo: '1' },
      });

      await approveTask(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==========================================================================
  // recordNg
  // ==========================================================================
  describe('recordNg()', () => {
    test('正常系: NG 記録し、結果を返すこと', async () => {
      const result = { task_status: 6, review_result: 'NG理由' };
      (experimentInstructionService.recordNg as jest.Mock).mockResolvedValue(result);

      const { req, res, next } = makeMocks({
        params: { projectId: 'proj-001', methodId: 'method-001', taskNo: '1' },
        body: { ngReason: 'NG理由' },
      });

      await recordNg(req, res, next);

      expect(experimentInstructionService.recordNg).toHaveBeenCalledWith(
        'org-001', 'proj-001', 'method-001', 1, 'user-001', 'NG理由'
      );
      expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
    });

    test('異常系: NG 記録不可状態（null）の場合、409 を返すこと', async () => {
      (experimentInstructionService.recordNg as jest.Mock).mockResolvedValue(null);

      const { req, res, next } = makeMocks({
        params: { projectId: 'proj-001', methodId: 'method-001', taskNo: '1' },
        body: { ngReason: '' },
      });

      await recordNg(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.objectContaining({ code: 'E7005' }) })
      );
    });
  });

  // ==========================================================================
  // getPlanDialogData
  // ==========================================================================
  describe('getPlanDialogData()', () => {
    test('正常系: ExperimentPlanDialog 用データを返すこと', async () => {
      const data = { transitions: [], templates: [] };
      (experimentInstructionService.getPlanDialogDataFromMaiml as jest.Mock).mockResolvedValue(data);

      const { req, res, next } = makeMocks({
        params: { projectId: 'proj-001', methodId: 'method-001' },
      });

      await getPlanDialogData(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, data });
    });

    test('異常系（E6002）: MAIMLファイルが存在しない場合、404 を返すこと', async () => {
      const error = Object.assign(new Error('MAIML not found'), { code: 'E6002' });
      (experimentInstructionService.getPlanDialogDataFromMaiml as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks({
        params: { projectId: 'proj-001', methodId: 'method-001' },
      });

      await getPlanDialogData(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.objectContaining({ code: 'E6002' }) })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('異常系（E6001）: メソッドIDが存在しない場合、404 を返すこと', async () => {
      const error = Object.assign(new Error('Method not found'), { code: 'E6001' });
      (experimentInstructionService.getPlanDialogDataFromMaiml as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks({
        params: { projectId: 'proj-001', methodId: 'non-existent' },
      });

      await getPlanDialogData(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.objectContaining({ code: 'E6001' }) })
      );
    });

    test('異常系（その他）: next を呼ぶこと', async () => {
      const error = new Error('unexpected');
      (experimentInstructionService.getPlanDialogDataFromMaiml as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks({
        params: { projectId: 'proj-001', methodId: 'method-001' },
      });

      await getPlanDialogData(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});

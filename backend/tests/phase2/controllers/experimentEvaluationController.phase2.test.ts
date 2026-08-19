/**
 * experimentEvaluationController フェーズ２ テスト
 *
 * 分類A：実験評価APIの動作確認
 * - getByProject / saveEvaluations / exportToMaiml（E6001/E6002 エラー分岐含む）
 *
 * @remarks
 * Controller は Service 層のみを呼び出す。Service を jest.mock でモックする。
 */

import { Request, Response, NextFunction } from 'express';
import * as experimentEvaluationService from '../../../src/services/experimentEvaluationService';
import {
  getByProject,
  saveEvaluations,
  exportToMaiml,
} from '../../../src/controllers/experimentEvaluationController';

jest.mock('../../../src/services/experimentEvaluationService');

// ヘルパー: モック req / res / next を生成
function makeMocks(overrides: {
  params?: Record<string, string>;
  body?: Record<string, any>;
  organizationId?: string;
  userId?: string;
} = {}) {
  const req = {
    params: overrides.params ?? {},
    body: overrides.body ?? {},
    organizationId: overrides.organizationId ?? 'org-001',
    userId: overrides.userId ?? 'user-001',
  } as unknown as Request;
  (req as any).organizationId = overrides.organizationId ?? 'org-001';
  (req as any).userId = overrides.userId ?? 'user-001';

  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  } as unknown as Response;

  const next = jest.fn() as NextFunction;

  return { req, res, next };
}

describe('experimentEvaluationController - Phase2 テスト', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // getByProject
  // ==========================================================================
  describe('getByProject()', () => {
    test('正常系: 評価結果一覧を返すこと', async () => {
      const rows = [{ evaluationId: 'eval-001', score: 90 }];
      (experimentEvaluationService.getByProject as jest.Mock).mockResolvedValue(rows);

      const { req, res, next } = makeMocks({ params: { projectId: 'proj-001' } });

      await getByProject(req, res, next);

      expect(experimentEvaluationService.getByProject).toHaveBeenCalledWith('org-001', 'proj-001');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: rows });
      expect(next).not.toHaveBeenCalled();
    });

    test('異常系: エラー発生時に next を呼ぶこと', async () => {
      const error = new Error('DB error');
      (experimentEvaluationService.getByProject as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks({ params: { projectId: 'proj-001' } });

      await getByProject(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==========================================================================
  // saveEvaluations
  // ==========================================================================
  describe('saveEvaluations()', () => {
    test('正常系: 評価結果を保存し、結果を返すこと', async () => {
      const saved = [{ evaluationId: 'eval-001' }];
      (experimentEvaluationService.saveEvaluations as jest.Mock).mockResolvedValue(saved);

      const { req, res, next } = makeMocks({
        body: {
          projectId: 'proj-001',
          evaluations: [{ transitionId: 'trans-001', score: 90 }],
        },
      });

      await saveEvaluations(req, res, next);

      expect(experimentEvaluationService.saveEvaluations).toHaveBeenCalledWith(
        'org-001',
        'user-001',
        'proj-001',
        [{ transitionId: 'trans-001', score: 90 }]
      );
      expect(res.json).toHaveBeenCalledWith({ success: true, data: saved });
    });

    test('異常系: エラー発生時に next を呼ぶこと', async () => {
      const error = new Error('save error');
      (experimentEvaluationService.saveEvaluations as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks({
        body: { projectId: 'proj-001', evaluations: [] },
      });

      await saveEvaluations(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==========================================================================
  // exportToMaiml
  // ==========================================================================
  describe('exportToMaiml()', () => {
    test('正常系: MAIMLへの書き込み結果を返すこと（written > 0）', async () => {
      const result = { written: 5, projectId: 'proj-001' };
      (experimentEvaluationService.exportToMaiml as jest.Mock).mockResolvedValue(result);

      const { req, res, next } = makeMocks({ params: { projectId: 'proj-001' } });

      await exportToMaiml(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
    });

    test('正常系: written が 0 の場合も success: true を返すこと', async () => {
      const result = { written: 0, projectId: 'proj-001' };
      (experimentEvaluationService.exportToMaiml as jest.Mock).mockResolvedValue(result);

      const { req, res, next } = makeMocks({ params: { projectId: 'proj-001' } });

      await exportToMaiml(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
    });

    test('異常系（E6001）: 404 とエラーコードを返すこと', async () => {
      const error = Object.assign(new Error('Method not found'), { code: 'E6001' });
      (experimentEvaluationService.exportToMaiml as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks({ params: { projectId: 'proj-001' } });

      await exportToMaiml(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: { code: 'E6001', message: error.message },
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('異常系（E6002）: 404 とエラーコードを返すこと', async () => {
      const error = Object.assign(new Error('MAIML file not found'), { code: 'E6002' });
      (experimentEvaluationService.exportToMaiml as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks({ params: { projectId: 'proj-001' } });

      await exportToMaiml(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: { code: 'E6002', message: error.message },
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('異常系（その他エラー）: next を呼ぶこと', async () => {
      const error = new Error('unexpected');
      (experimentEvaluationService.exportToMaiml as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks({ params: { projectId: 'proj-001' } });

      await exportToMaiml(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});

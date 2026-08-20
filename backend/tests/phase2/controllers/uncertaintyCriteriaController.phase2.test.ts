/**
 * uncertaintyCriteriaController フェーズ２ テスト
 *
 * 分類A：不確かさ基準管理APIの動作確認
 * - getList / getForSelector / getDetail（404分岐） / createNewVersion
 */

import { Request, Response, NextFunction } from 'express';
import * as uncertaintyCriteriaService from '../../../src/services/uncertaintyCriteriaService';
import {
  getList,
  getForSelector,
  getDetail,
  createNewVersion,
} from '../../../src/controllers/uncertaintyCriteriaController';

jest.mock('../../../src/services/uncertaintyCriteriaService');

function makeMocks(overrides: {
  params?: Record<string, string>;
  body?: Record<string, any>;
  query?: Record<string, string>;
  organizationId?: string;
  userId?: string;
} = {}) {
  const req = {
    params: overrides.params ?? {},
    body: overrides.body ?? {},
    query: overrides.query ?? {},
    user: { userId: overrides.userId ?? 'user-001' },
  } as unknown as Request;
  (req as any).organizationId = overrides.organizationId ?? 'org-001';

  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  } as unknown as Response;

  const next = jest.fn() as NextFunction;

  return { req, res, next };
}

describe('uncertaintyCriteriaController - Phase2 テスト', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // getList
  // ==========================================================================
  describe('getList()', () => {
    test('正常系: 不確かさ基準一覧を返すこと', async () => {
      const rows = [{ uncertaintyKey: 'key-001', version: 1 }];
      (uncertaintyCriteriaService.getList as jest.Mock).mockResolvedValue(rows);

      const { req, res, next } = makeMocks();

      await getList(req, res, next);

      expect(uncertaintyCriteriaService.getList).toHaveBeenCalledWith('org-001');
      expect(res.json).toHaveBeenCalledWith(rows);
    });

    test('異常系: エラー発生時に next を呼ぶこと', async () => {
      const error = new Error('service error');
      (uncertaintyCriteriaService.getList as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks();

      await getList(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==========================================================================
  // getForSelector
  // ==========================================================================
  describe('getForSelector()', () => {
    test('正常系: セレクター用一覧を返すこと', async () => {
      const rows = [{ uncertaintyKey: 'key-001', qualitativeOptions: [] }];
      (uncertaintyCriteriaService.getForSelector as jest.Mock).mockResolvedValue(rows);

      const { req, res, next } = makeMocks();

      await getForSelector(req, res, next);

      expect(res.json).toHaveBeenCalledWith(rows);
    });

    test('異常系: エラー発生時に next を呼ぶこと', async () => {
      const error = new Error('service error');
      (uncertaintyCriteriaService.getForSelector as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks();

      await getForSelector(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==========================================================================
  // getDetail
  // ==========================================================================
  describe('getDetail()', () => {
    test('正常系: 不確かさ基準詳細を返すこと', async () => {
      const detail = { uncertaintyKey: 'key-001', version: 1, qualitativeOptions: [] };
      (uncertaintyCriteriaService.getDetail as jest.Mock).mockResolvedValue(detail);

      const { req, res, next } = makeMocks({
        params: { uncertaintyKey: 'key-001' },
        query: { version: '1' },
      });

      await getDetail(req, res, next);

      expect(uncertaintyCriteriaService.getDetail).toHaveBeenCalledWith('org-001', 'key-001', 1);
      expect(res.json).toHaveBeenCalledWith(detail);
    });

    test('異常系（404）: 存在しない場合、404 を返すこと', async () => {
      (uncertaintyCriteriaService.getDetail as jest.Mock).mockResolvedValue(null);

      const { req, res, next } = makeMocks({
        params: { uncertaintyKey: 'non-existent' },
        query: { version: '1' },
      });

      await getDetail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 'E6001' }) })
      );
    });

    test('異常系: エラー発生時に next を呼ぶこと', async () => {
      const error = new Error('service error');
      (uncertaintyCriteriaService.getDetail as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks({
        params: { uncertaintyKey: 'key-001' },
        query: { version: '1' },
      });

      await getDetail(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==========================================================================
  // createNewVersion
  // ==========================================================================
  describe('createNewVersion()', () => {
    test('正常系（定量）: 新バージョンを保存し、version を返すこと', async () => {
      (uncertaintyCriteriaService.createNewVersion as jest.Mock).mockResolvedValue({ version: 2 });

      const { req, res, next } = makeMocks({
        body: {
          nameSpaceId: 'ns-001',
          uncertaintyKey: 'key-001',
          uncertaintyName: '基準A',
          evaluationMethod: 1,
          isInvalid: false,
          qualitativeOptions: [],
        },
      });

      await createNewVersion(req, res, next);

      expect(uncertaintyCriteriaService.createNewVersion).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ version: 2 });
    });

    test('正常系（定性）: 選択肢を含む新バージョンを保存できること', async () => {
      (uncertaintyCriteriaService.createNewVersion as jest.Mock).mockResolvedValue({ version: 1 });

      const { req, res, next } = makeMocks({
        body: {
          nameSpaceId: 'ns-001',
          uncertaintyKey: 'key-002',
          uncertaintyName: '基準B',
          evaluationMethod: 2,
          isInvalid: false,
          qualitativeOptions: [
            { displayOrder: 1, value: '良', displayColor: '#00FF00', isDefault: true },
          ],
        },
      });

      await createNewVersion(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ version: 1 });
    });

    test('異常系: エラー発生時に next を呼ぶこと', async () => {
      const error = new Error('insert error');
      (uncertaintyCriteriaService.createNewVersion as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks({
        body: { nameSpaceId: 'ns-001', uncertaintyKey: 'key-001' },
      });

      await createNewVersion(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});

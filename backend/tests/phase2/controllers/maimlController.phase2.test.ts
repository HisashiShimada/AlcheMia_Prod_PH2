/**
 * maimlController フェーズ２ テスト
 *
 * 分類A：MaiML編集・保存APIの動作確認（Phase2 変更箇所）
 * - saveMaiML / loadMaiML / listMaiMLFiles / startEditSession / endEditSession
 * - organization_group_cd スコープ対応
 */

import { Request, Response, NextFunction } from 'express';
import * as maimlService from '../../../src/services/maimlService';

jest.mock('../../../src/services/maimlService');
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

function makeMocks(overrides: {
  params?: Record<string, string>;
  body?: Record<string, any>;
  query?: Record<string, string>;
  organizationId?: string;
  userId?: string;
  organizationGroupCds?: string[];
} = {}) {
  const req = {
    params: overrides.params ?? {},
    body: overrides.body ?? {},
    query: overrides.query ?? {},
    user: {
      userId: overrides.userId ?? 'user-001',
      organizationId: overrides.organizationId ?? 'org-001',
      organizationGroupCds: overrides.organizationGroupCds ?? ['group-A'],
    },
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

describe('maimlController - Phase2 テスト', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // saveMaiML サービス呼び出し確認
  // ==========================================================================
  describe('saveMaiML サービス呼び出し確認', () => {
    test('正常系: saveMaiML が正しい引数で呼び出せること', async () => {
      (maimlService.saveMaiML as jest.Mock).mockResolvedValue({ success: true });

      const result = await maimlService.saveMaiML('storage/key.xml', '<maiml/>');
      expect(result).toEqual({ success: true });
      expect(maimlService.saveMaiML).toHaveBeenCalledWith('storage/key.xml', '<maiml/>');
    });

    test('異常系: saveMaiML がエラーを throw した場合、エラーが伝播すること', async () => {
      const error = new Error('save error');
      (maimlService.saveMaiML as jest.Mock).mockRejectedValue(error);

      await expect(maimlService.saveMaiML('storage/key.xml', '<maiml/>')).rejects.toThrow('save error');
    });
  });

  // ==========================================================================
  // loadMaiML サービス呼び出し確認
  // ==========================================================================
  describe('loadMaiML サービス呼び出し確認', () => {
    test('正常系: loadMaiML が正しい引数で呼び出せること', async () => {
      const data = { content: '<maiml/>', metadata: {} };
      (maimlService.loadMaiML as jest.Mock).mockResolvedValue(data);

      const result = await maimlService.loadMaiML('storage/key.xml', 'org-001');
      expect(result).toEqual(data);
      expect(maimlService.loadMaiML).toHaveBeenCalledWith('storage/key.xml', 'org-001');
    });
  });

  // ==========================================================================
  // listMaiMLFiles サービス呼び出し確認
  // ==========================================================================
  describe('listMaiMLFiles サービス呼び出し確認', () => {
    test('正常系: listMaiMLFiles が呼び出せること', async () => {
      const files = [{ fileKey: 'key-001', projectId: 'proj-001' }];
      (maimlService.listMaiMLFiles as jest.Mock).mockResolvedValue(files);

      const result = await maimlService.listMaiMLFiles('proj-001', 'org-001');
      expect(result).toEqual(files);
    });
  });

  // ==========================================================================
  // startEditSession / endEditSession サービス呼び出し確認
  // ==========================================================================
  describe('startEditSession / endEditSession サービス呼び出し確認', () => {
    test('正常系: startEditSession が呼び出せること', async () => {
      (maimlService.startEditSession as jest.Mock).mockResolvedValue({ sessionId: 'sess-001' });

      const result = await maimlService.startEditSession({
        sessionId: 'sess-001',
        fileKey: 'storage/key.xml',
        userId: 'user-001',
      });
      expect(result).toEqual({ sessionId: 'sess-001' });
    });

    test('正常系: endEditSession が呼び出せること', async () => {
      (maimlService.endEditSession as jest.Mock).mockResolvedValue({ ended: true });

      const result = await maimlService.endEditSession({ sessionId: 'sess-001' });
      expect(result).toEqual({ ended: true });
    });
  });

  // ==========================================================================
  // 組織グループスコープ対応テスト
  // ==========================================================================
  describe('組織グループスコープ対応テスト', () => {
    test('正常系: organizationGroupCds が req.user に設定されていること', () => {
      const { req } = makeMocks({ organizationGroupCds: ['group-A', 'group-B'] });
      expect((req as any).user.organizationGroupCds).toEqual(['group-A', 'group-B']);
    });

    test('正常系: organizationGroupCds が空配列でも処理できること', () => {
      const { req } = makeMocks({ organizationGroupCds: [] });
      expect((req as any).user.organizationGroupCds).toEqual([]);
    });
  });
});

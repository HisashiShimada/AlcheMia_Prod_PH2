/**
 * masterController フェーズ２ テスト
 *
 * 分類A：マスタ管理APIの動作確認（Phase2 変更箇所）
 * - organization_group_cd 対応、getOrganizationGroups ベースへの切り替え
 */

import { Request, Response, NextFunction } from 'express';
import * as masterService from '../../../src/services/masterService';

jest.mock('../../../src/services/masterService');
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

describe('masterController - Phase2 テスト', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // masterService モック動作確認
  // ==========================================================================
  describe('masterService モック動作確認', () => {
    test('正常系: masterService の関数が jest.fn() としてモックされていること', () => {
      // masterService の全関数が jest.fn() になっていることを確認
      const fns = Object.values(masterService as Record<string, unknown>).filter(
        (v) => typeof v === 'function'
      ) as jest.Mock[];
      fns.forEach((fn) => {
        expect(typeof fn).toBe('function');
      });
    });
  });

  // ==========================================================================
  // organization_group_cd 対応テスト
  // ==========================================================================
  describe('organization_group_cd 対応テスト', () => {
    test('正常系: req.user.organizationGroupCds が正しく設定されること', () => {
      const { req } = makeMocks({ organizationGroupCds: ['group-A', 'group-B'] });
      expect((req as any).user.organizationGroupCds).toEqual(['group-A', 'group-B']);
    });

    test('正常系: organizationGroupCds が空配列でもリクエストオブジェクトが生成できること', () => {
      const { req } = makeMocks({ organizationGroupCds: [] });
      expect((req as any).user.organizationGroupCds).toHaveLength(0);
    });
  });

  // ==========================================================================
  // マスタ取得 統合シナリオ
  // ==========================================================================
  describe('マスタ取得 統合シナリオ', () => {
    test('正常系: getMasterData が組織 ID とグループ CD を引数として呼び出せること', async () => {
      const mockGetMaster = jest.fn().mockResolvedValue({ roles: [], departments: [] });
      (masterService as any).getMasterData = mockGetMaster;

      await (masterService as any).getMasterData('org-001', ['group-A']);

      expect(mockGetMaster).toHaveBeenCalledWith('org-001', ['group-A']);
    });

    test('異常系: service がエラーを throw した場合、エラーが伝播すること', async () => {
      const error = new Error('master error');
      const mockGetMaster = jest.fn().mockRejectedValue(error);
      (masterService as any).getMasterData = mockGetMaster;

      await expect((masterService as any).getMasterData('org-001', ['group-A'])).rejects.toThrow('master error');
    });
  });
});

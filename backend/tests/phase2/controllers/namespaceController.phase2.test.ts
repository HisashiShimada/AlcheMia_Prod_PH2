/**
 * namespaceController フェーズ２ テスト
 *
 * 分類A：名前空間・用語管理APIの動作確認
 * - createNamespace / updateNamespace / getNamespaces / deleteNamespace
 * - createTerm / updateTerm / deleteTerm / getDeclarations
 * - getDeclarationsByProject / getTerms / toggleTermActive
 */

import { Request, Response, NextFunction } from 'express';
import * as namespaceService from '../../../src/services/namespaceService';
import {
  createNamespace,
  updateNamespace,
  getNamespaces,
  deleteNamespace,
  createTerm,
  updateTerm,
  deleteTerm,
  getDeclarations,
  getDeclarationsByProject,
  getTerms,
  toggleTermActive,
} from '../../../src/controllers/namespaceController';

jest.mock('../../../src/services/namespaceService');

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
    headers: {},
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

describe('namespaceController - Phase2 テスト', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // createNamespace
  // ==========================================================================
  describe('createNamespace()', () => {
    test('正常系: 名前空間を新規作成し、201 を返すこと', async () => {
      const created = { prefix: 'ex', uri: 'http://example.org/' };
      (namespaceService.createNamespace as jest.Mock).mockResolvedValue(created);

      const { req, res, next } = makeMocks({
        body: { prefix: 'ex', uri: 'http://example.org/', scopeKey: 'group-A' },
      });

      await createNamespace(req, res, next);

      expect(namespaceService.createNamespace).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(created);
    });

    test('異常系: エラー発生時に next を呼ぶこと', async () => {
      const error = new Error('create error');
      (namespaceService.createNamespace as jest.Mock).mockRejectedValue(error);

      const { req, res, next } = makeMocks({
        body: { prefix: 'ex', uri: 'http://example.org/' },
      });

      await createNamespace(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ==========================================================================
  // updateNamespace
  // ==========================================================================
  describe('updateNamespace()', () => {
    test('正常系: 名前空間の URI を更新し、結果を返すこと', async () => {
      const updated = { prefix: 'ex', uri: 'http://example.org/new/' };
      (namespaceService.updateNamespace as jest.Mock).mockResolvedValue(updated);

      const { req, res, next } = makeMocks({
        params: { prefix: 'ex' },
        body: { uri: 'http://example.org/new/' },
      });

      await updateNamespace(req, res, next);

      expect(res.json).toHaveBeenCalledWith(updated);
    });

    test('異常系（404）: 存在しない場合、404 を返すこと', async () => {
      (namespaceService.updateNamespace as jest.Mock).mockResolvedValue(null);

      const { req, res, next } = makeMocks({
        params: { prefix: 'non-existent' },
        body: { uri: 'http://example.org/' },
      });

      await updateNamespace(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.objectContaining({ code: 'E6001' }) })
      );
    });
  });

  // ==========================================================================
  // getNamespaces
  // ==========================================================================
  describe('getNamespaces()', () => {
    test('正常系（scopeKey なし）: 全名前空間一覧を返すこと', async () => {
      const namespaces = [{ prefix: 'ex', uri: 'http://example.org/' }];
      (namespaceService.getNamespaces as jest.Mock).mockResolvedValue(namespaces);

      const { req, res, next } = makeMocks();

      await getNamespaces(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ namespaces });
    });

    test('正常系（scopeKey あり）: スコープ絞り込みで名前空間一覧を返すこと', async () => {
      const namespaces = [{ prefix: 'ex', uri: 'http://example.org/' }];
      (namespaceService.getNamespacesByScopeKey as jest.Mock).mockResolvedValue(namespaces);

      const { req, res, next } = makeMocks({ query: { scopeKey: 'group-A' } });

      await getNamespaces(req, res, next);

      expect(namespaceService.getNamespacesByScopeKey).toHaveBeenCalledWith('org-001', 'group-A');
      expect(res.json).toHaveBeenCalledWith({ namespaces });
    });
  });

  // ==========================================================================
  // deleteNamespace
  // ==========================================================================
  describe('deleteNamespace()', () => {
    test('正常系: 名前空間を削除し、204 を返すこと', async () => {
      (namespaceService.deleteNamespace as jest.Mock).mockResolvedValue(1);

      const { req, res, next } = makeMocks({ params: { prefix: 'ex' } });

      await deleteNamespace(req, res, next);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    test('異常系（404）: 存在しない場合、404 を返すこと', async () => {
      (namespaceService.deleteNamespace as jest.Mock).mockResolvedValue(0);

      const { req, res, next } = makeMocks({ params: { prefix: 'non-existent' } });

      await deleteNamespace(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ==========================================================================
  // createTerm
  // ==========================================================================
  describe('createTerm()', () => {
    test('正常系: 用語を新規作成し、201 を返すこと', async () => {
      const created = { prefix: 'ex', localName: 'term1' };
      (namespaceService.createTerm as jest.Mock).mockResolvedValue(created);

      const { req, res, next } = makeMocks({
        body: { prefix: 'ex', localName: 'term1', displayName: '用語1' },
      });

      await createTerm(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(created);
    });

    test('異常系（404）: 名前空間が存在しない場合、404 を返すこと', async () => {
      (namespaceService.createTerm as jest.Mock).mockResolvedValue(null);

      const { req, res, next } = makeMocks({
        body: { prefix: 'non-existent', localName: 'term1' },
      });

      await createTerm(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ==========================================================================
  // updateTerm
  // ==========================================================================
  describe('updateTerm()', () => {
    test('正常系: 用語を更新し、結果を返すこと', async () => {
      const updated = { prefix: 'ex', localName: 'term1', displayName: '更新後用語' };
      (namespaceService.updateTerm as jest.Mock).mockResolvedValue(updated);

      const { req, res, next } = makeMocks({
        params: { prefix: 'ex', localName: 'term1' },
        body: { displayName: '更新後用語' },
      });

      await updateTerm(req, res, next);

      expect(res.json).toHaveBeenCalledWith(updated);
    });

    test('異常系（404）: 存在しない場合、404 を返すこと', async () => {
      (namespaceService.updateTerm as jest.Mock).mockResolvedValue(null);

      const { req, res, next } = makeMocks({
        params: { prefix: 'ex', localName: 'non-existent' },
        body: { displayName: '更新後用語' },
      });

      await updateTerm(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ==========================================================================
  // deleteTerm
  // ==========================================================================
  describe('deleteTerm()', () => {
    test('正常系: 用語を削除し、204 を返すこと', async () => {
      (namespaceService.deleteTerm as jest.Mock).mockResolvedValue(1);

      const { req, res, next } = makeMocks({ params: { prefix: 'ex', localName: 'term1' } });

      await deleteTerm(req, res, next);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    test('異常系（404）: 存在しない場合、404 を返すこと', async () => {
      (namespaceService.deleteTerm as jest.Mock).mockResolvedValue(0);

      const { req, res, next } = makeMocks({ params: { prefix: 'ex', localName: 'non-existent' } });

      await deleteTerm(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ==========================================================================
  // getDeclarations
  // ==========================================================================
  describe('getDeclarations()', () => {
    test('正常系: 名前空間宣言一覧を返すこと', async () => {
      const uri = 'http://example.org/';
      (namespaceService.getDeclarations as jest.Mock).mockResolvedValue(uri);

      const { req, res, next } = makeMocks();

      await getDeclarations(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ uri });
    });

    test('正常系: URI が null の場合、{ uri: null } を返すこと', async () => {
      (namespaceService.getDeclarations as jest.Mock).mockResolvedValue(null);

      const { req, res, next } = makeMocks();

      await getDeclarations(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ uri: null });
    });
  });

  // ==========================================================================
  // getDeclarationsByProject
  // ==========================================================================
  describe('getDeclarationsByProject()', () => {
    test('正常系: プロジェクトスコープの宣言一覧を返すこと', async () => {
      const declarations = [{ prefix: 'ex', uri: 'http://example.org/' }];
      (namespaceService.getDeclarationsByProject as jest.Mock).mockResolvedValue(declarations);

      const { req, res, next } = makeMocks({ query: { projectId: 'proj-001' } });

      await getDeclarationsByProject(req, res, next);

      expect(res.json).toHaveBeenCalledWith(declarations);
    });

    test('異常系（404）: プロジェクトが存在しない場合、404 を返すこと', async () => {
      (namespaceService.getDeclarationsByProject as jest.Mock).mockResolvedValue(null);

      const { req, res, next } = makeMocks({ query: { projectId: 'non-existent' } });

      await getDeclarationsByProject(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ==========================================================================
  // getTerms
  // ==========================================================================
  describe('getTerms()', () => {
    test('正常系（条件なし）: 全用語を返すこと', async () => {
      const terms = [{ prefix: 'ex', localName: 'term1' }];
      (namespaceService.getTerms as jest.Mock).mockResolvedValue(terms);

      const { req, res, next } = makeMocks();

      await getTerms(req, res, next);

      expect(namespaceService.getTerms).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(terms);
    });

    test('正常系（globalFlg=true）: グローバル用語を返すこと', async () => {
      const terms = [{ prefix: 'ex', localName: 'global-term' }];
      (namespaceService.getTermsGlobal as jest.Mock).mockResolvedValue(terms);

      const { req, res, next } = makeMocks({ query: { globalFlg: 'true' } });

      await getTerms(req, res, next);

      expect(namespaceService.getTermsGlobal).toHaveBeenCalledWith('org-001');
      expect(res.json).toHaveBeenCalledWith(terms);
    });

    test('正常系（scopeKey あり）: スコープ絞り込みで用語を返すこと', async () => {
      const terms = [{ prefix: 'ex', localName: 'scoped-term' }];
      (namespaceService.getTermsByScopeKey as jest.Mock).mockResolvedValue(terms);

      const { req, res, next } = makeMocks({ query: { scopeKey: 'group-A' } });

      await getTerms(req, res, next);

      expect(namespaceService.getTermsByScopeKey).toHaveBeenCalledWith('org-001', 'group-A');
      expect(res.json).toHaveBeenCalledWith(terms);
    });
  });

  // ==========================================================================
  // toggleTermActive
  // ==========================================================================
  describe('toggleTermActive()', () => {
    test('正常系: 用語の is_active を切り替えること', async () => {
      const updated = { prefix: 'ex', localName: 'term1', is_active: false };
      (namespaceService.toggleTermActive as jest.Mock).mockResolvedValue(updated);

      const { req, res, next } = makeMocks({
        params: { prefix: 'ex', localName: 'term1' },
        body: { isActive: false },
      });

      await toggleTermActive(req, res, next);

      expect(namespaceService.toggleTermActive).toHaveBeenCalledWith('org-001', 'ex', 'term1', false);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    test('異常系（404）: 用語が存在しない場合、404 を返すこと', async () => {
      (namespaceService.toggleTermActive as jest.Mock).mockResolvedValue(null);

      const { req, res, next } = makeMocks({
        params: { prefix: 'ex', localName: 'non-existent' },
        body: { isActive: false },
      });

      await toggleTermActive(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});

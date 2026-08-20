/**
 * namespaceService フェーズ２ テスト
 *
 * 分類A：名前空間サービス（Phase2 新規）
 * - createNamespace（scopeKey・globalFlg 制御）
 * - updateNamespace
 * - deleteNamespace
 * - getNamespaces（scopeKey・globalFlg フィルタ）
 * - createTerm / updateTerm / deleteTerm / toggleTermActive
 * - getTerms / getDeclarations / getDeclarationsByProject
 */

import * as namespaceService from '../../../src/services/namespaceService';
import * as namespaceTermRepository from '../../../src/repositories/namespaceTermRepository';

// ──────────────────────────────────────────────
// モック
// ──────────────────────────────────────────────
jest.mock('../../../src/repositories/namespaceTermRepository');
jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// ──────────────────────────────────────────────
// テスト
// ──────────────────────────────────────────────
describe('namespaceService - Phase2 テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // createNamespace
  // ==========================================================================
  describe('createNamespace()', () => {
    test('正常系: Repository の insertNamespace を呼び出して結果を返すこと', async () => {
      const mockResult = { namespaceId: 'ns-001', prefix: 'ex', uri: 'http://example.org/' };
      (namespaceTermRepository.insertNamespace as jest.Mock).mockResolvedValue(mockResult);

      const input: namespaceService.CreateNamespaceInput = {
        organizationId: 'org-001',
        prefix: 'ex',
        uri: 'http://example.org/',
        userId: 'user-001@example.com',
        scopeKey: 'group-A',
      };

      const result = await namespaceService.createNamespace(input);

      expect(namespaceTermRepository.insertNamespace).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResult);
    });

    test('異常系: Repository が例外を投げた場合にエラーを伝播すること', async () => {
      (namespaceTermRepository.insertNamespace as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(
        namespaceService.createNamespace({
          organizationId: 'org-001',
          prefix: 'ex',
          uri: 'http://example.org/',
          userId: 'user-001@example.com',
        })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // updateNamespace
  // ==========================================================================
  describe('updateNamespace()', () => {
    test('正常系: updateNamespace を呼び出して結果を返すこと', async () => {
      const mockResult = { namespaceId: 'ns-001', prefix: 'ex', uri: 'http://example.org/v2/', scopeKey: null, globalFlg: false };
      (namespaceTermRepository.updateNamespace as jest.Mock).mockResolvedValue(mockResult);

      const result = await namespaceService.updateNamespace({
        organizationId: 'org-001',
        prefix: 'ex',
        uri: 'http://example.org/v2/',
      });

      expect(namespaceTermRepository.updateNamespace).toHaveBeenCalledWith(
        'org-001',
        'ex',
        'http://example.org/v2/'
      );
      expect(result).toEqual(mockResult);
    });

    test('異常系: 名前空間が存在しない場合エラーを伝播すること', async () => {
      (namespaceTermRepository.updateNamespace as jest.Mock).mockRejectedValue(new Error('Not found'));

      await expect(
        namespaceService.updateNamespace({ organizationId: 'org-001', prefix: 'nonexistent', uri: 'http://x.org/' })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // getTerms
  // ==========================================================================
  describe('getTerms()', () => {
    test('正常系: getTerms を呼び出して用語一覧を返すこと', async () => {
      const mockTerms = [
        { prefix: 'ex', local_name: 'temperature', display_name: '温度', is_active: true },
      ];
      (namespaceTermRepository.getTerms as jest.Mock).mockResolvedValue(mockTerms);

      const result = await namespaceService.getTerms('org-001');

      expect(namespaceTermRepository.getTerms).toHaveBeenCalledWith('org-001', undefined);
      expect(result).toEqual(mockTerms);
    });

    test('正常系: scopeKey フィルタ付きで呼び出すこと', async () => {
      (namespaceTermRepository.getTerms as jest.Mock).mockResolvedValue([]);

      await namespaceService.getTerms('org-001', 'group-A');

      expect(namespaceTermRepository.getTerms).toHaveBeenCalledWith('org-001', 'group-A');
    });
  });

  // ==========================================================================
  // createTerm
  // ==========================================================================
  describe('createTerm()', () => {
    test('正常系: insertTerm を呼び出して用語を登録すること', async () => {
      const mockTerm = { term_id: 'term-001', prefix: 'ex', local_name: 'temperature' };
      (namespaceTermRepository.insertTerm as jest.Mock).mockResolvedValue(mockTerm);

      const input: namespaceService.CreateTermInput = {
        organizationId: 'org-001',
        prefix: 'ex',
        localName: 'temperature',
        displayName: '温度',
      };

      const result = await namespaceService.createTerm(input);

      expect(namespaceTermRepository.insertTerm).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTerm);
    });
  });

  // ==========================================================================
  // toggleTermActive
  // ==========================================================================
  describe('toggleTermActive()', () => {
    test('正常系: setTermActive を呼び出してアクティブ状態を切り替えること', async () => {
      (namespaceTermRepository.setTermActive as jest.Mock).mockResolvedValue(undefined);

      await namespaceService.toggleTermActive('org-001', 'ex', 'temperature', false);

      expect(namespaceTermRepository.setTermActive).toHaveBeenCalledWith(
        'org-001', 'ex', 'temperature', false
      );
    });
  });

  // ==========================================================================
  // getDeclarationsByProject
  // ==========================================================================
  describe('getDeclarationsByProject()', () => {
    test('正常系: プロジェクトスコープの名前空間宣言一覧を返すこと', async () => {
      const mockDeclarations: namespaceService.ProjectScopeDeclaration[] = [
        { prefix: 'ex', uri: 'http://example.org/', globalFlg: true },
        { prefix: 'my', uri: 'http://my.org/', globalFlg: false },
      ];
      (namespaceTermRepository.getDeclarationsByProject as jest.Mock).mockResolvedValue(mockDeclarations);

      const result = await namespaceService.getDeclarationsByProject('org-001', 'proj-001');

      expect(namespaceTermRepository.getDeclarationsByProject).toHaveBeenCalledWith('org-001', 'proj-001');
      expect(result).toEqual(mockDeclarations);
    });
  });
});

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
 * - getSuggestedUri
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
jest.mock('../../../src/services/globalNamespaceFileService', () => ({
  readGlobalDeclarations: jest.fn().mockResolvedValue([]),
  writeGlobalDeclarations: jest.fn(),
  parseGlobalDeclarationsCsv: jest.fn().mockReturnValue([]),
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
    test('正常系: findNamespaceIdByScopeKey で namespace_id を取得し createPrefixOnly を呼び出すこと', async () => {
      (namespaceTermRepository.findNamespaceIdByScopeKey as jest.Mock).mockResolvedValue('ns-001');
      (namespaceTermRepository.createPrefixOnly as jest.Mock).mockResolvedValue(undefined);

      const input: namespaceService.CreateNamespaceInput = {
        organizationId: 'org-001',
        prefix: 'ex',
        uri: 'http://example.org/',
        userId: 'user-001@example.com',
        scopeKey: 'group-A',
      };

      const result = await namespaceService.createNamespace(input);

      expect(namespaceTermRepository.findNamespaceIdByScopeKey).toHaveBeenCalledWith('org-001', 'group-A');
      expect(namespaceTermRepository.createPrefixOnly).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ namespaceId: 'ns-001', prefix: 'ex', uri: 'http://example.org/' });
    });

    test('異常系: scopeKey に対応する namespace が存在しない場合に 404 エラーを投げること', async () => {
      (namespaceTermRepository.findNamespaceIdByScopeKey as jest.Mock).mockResolvedValue(null);

      await expect(
        namespaceService.createNamespace({
          organizationId: 'org-001',
          prefix: 'ex',
          uri: 'http://example.org/',
          userId: 'user-001@example.com',
        })
      ).rejects.toMatchObject({ statusCode: 404, code: 'E6001' });
    });
  });

  // ==========================================================================
  // updateNamespace
  // ==========================================================================
  describe('updateNamespace()', () => {
    test('正常系: updateNamespace を呼び出して結果を返すこと', async () => {
      const mockResult = { namespaceId: 'ns-001', prefix: 'ex', uri: 'http://example.org/v2/', scopeKey: null };
      (namespaceTermRepository.updateNamespace as jest.Mock).mockResolvedValue(mockResult);

      const result = await namespaceService.updateNamespace({
        organizationId: 'org-001',
        prefix: 'ex',
        description: 'updated',
      });

      expect(namespaceTermRepository.updateNamespace).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResult);
    });

    test('異常系: 名前空間が存在しない場合エラーを伝播すること', async () => {
      (namespaceTermRepository.updateNamespace as jest.Mock).mockRejectedValue(new Error('Not found'));

      await expect(
        namespaceService.updateNamespace({ organizationId: 'org-001', prefix: 'nonexistent' })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // getDeclarationsByProject
  // ==========================================================================
  describe('getDeclarationsByProject()', () => {
    test('正常系: findProjectGroupCd と findDeclarationsByProjectScope を呼び出して宣言一覧を返すこと', async () => {
      const mockProjectRow = { organization_group_cd: 'group-A' };
      const mockOrgDeclarations: namespaceService.ProjectScopeDeclaration[] = [
        { prefix: 'my', uri: 'http://my.org/' },
      ];
      (namespaceTermRepository.findProjectGroupCd as jest.Mock).mockResolvedValue(mockProjectRow);
      (namespaceTermRepository.findDeclarationsByProjectScope as jest.Mock).mockResolvedValue(mockOrgDeclarations);

      const result = await namespaceService.getDeclarationsByProject('org-001', 'proj-001');

      expect(namespaceTermRepository.findProjectGroupCd).toHaveBeenCalledWith('org-001', 'proj-001');
      expect(result).not.toBeNull();
    });

    test('正常系: プロジェクトが見つからない場合は null を返すこと', async () => {
      (namespaceTermRepository.findProjectGroupCd as jest.Mock).mockResolvedValue(null);

      const result = await namespaceService.getDeclarationsByProject('org-001', 'unknown-proj');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // getSuggestedUri
  // ==========================================================================
  describe('getSuggestedUri()', () => {
    test('正常系（個人スコープ）: organization_cd をドメイン部に使用した URI を返すこと', async () => {
      (namespaceTermRepository.findOrganizationCd as jest.Mock).mockResolvedValue('ORG001-AIML');
      (namespaceTermRepository.findUserMailAddress as jest.Mock).mockResolvedValue('test.user004@soft-service.co.jp');
      (namespaceTermRepository.findUrisByOrganization as jest.Mock).mockResolvedValue([]);

      const result = await namespaceService.getSuggestedUri('org-001', 'test.user004@soft-service.co.jp');

      expect(result).toBe('https://ORG001-AIML.Alchemia.co.jp/test.user004');
      // findUserOrgGroupCd は呼ばれないこと（個人スコープではグループCDを参照しない）
      expect(namespaceTermRepository.findUserOrgGroupCd).not.toHaveBeenCalled();
    });

    test('正常系（個人スコープ・scopeKey が userId と一致）: organization_cd をドメイン部に使用した URI を返すこと', async () => {
      (namespaceTermRepository.findOrganizationCd as jest.Mock).mockResolvedValue('ORG001-AIML');
      (namespaceTermRepository.findUserMailAddress as jest.Mock).mockResolvedValue('test.user004@soft-service.co.jp');
      (namespaceTermRepository.findUrisByOrganization as jest.Mock).mockResolvedValue([]);

      // scopeKey と userId が一致する場合も個人スコープとして扱われる
      const result = await namespaceService.getSuggestedUri(
        'org-001',
        'test.user004@soft-service.co.jp',
        'test.user004@soft-service.co.jp'
      );

      expect(result).toBe('https://ORG001-AIML.Alchemia.co.jp/test.user004');
      expect(namespaceTermRepository.findUserOrgGroupCd).not.toHaveBeenCalled();
    });

    test('正常系（個人スコープ・URI 重複あり）: 連番サフィックスが付与された URI を返すこと', async () => {
      (namespaceTermRepository.findOrganizationCd as jest.Mock).mockResolvedValue('ORG001-AIML');
      (namespaceTermRepository.findUserMailAddress as jest.Mock).mockResolvedValue('test.user004@soft-service.co.jp');
      (namespaceTermRepository.findUrisByOrganization as jest.Mock).mockResolvedValue([
        'https://ORG001-AIML.Alchemia.co.jp/test.user004',
      ]);

      const result = await namespaceService.getSuggestedUri('org-001', 'test.user004@soft-service.co.jp');

      expect(result).toBe('https://ORG001-AIML.Alchemia.co.jp/test.user0041');
    });

    test('正常系（グループスコープ）: 祖先グループCD をドメイン部に使用した URI を返すこと', async () => {
      (namespaceTermRepository.findOrganizationCd as jest.Mock).mockResolvedValue('ORG001-AIML');
      (namespaceTermRepository.findOrgGroupAncestors as jest.Mock).mockResolvedValue(['ROOT_GRP', 'TEAM_A']);
      (namespaceTermRepository.findUrisByOrganization as jest.Mock).mockResolvedValue([]);

      const result = await namespaceService.getSuggestedUri(
        'org-001',
        'test.user004@soft-service.co.jp',
        'TEAM_A'
      );

      expect(result).toBe('https://ROOT_GRP.Alchemia.co.jp/TEAM_A');
      // グループスコープでは findUserMailAddress を呼ばない
      expect(namespaceTermRepository.findUserMailAddress).not.toHaveBeenCalled();
    });

    test('異常系: organization_id が存在しない場合にエラーを投げること', async () => {
      (namespaceTermRepository.findOrganizationCd as jest.Mock).mockResolvedValue(null);

      await expect(
        namespaceService.getSuggestedUri('invalid-org', 'test.user004@soft-service.co.jp')
      ).rejects.toThrow('Organization not found: invalid-org');
    });
  });
});

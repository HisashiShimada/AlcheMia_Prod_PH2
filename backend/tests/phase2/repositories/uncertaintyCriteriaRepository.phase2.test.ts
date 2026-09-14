/**
 * uncertaintyCriteriaRepository フェーズ２ テスト
 *
 * 分類A：新規テーブル（uncertainty_criteria / intuition_selector）の全CRUD・バージョン管理確認
 *
 * @remarks
 * uncertaintyCriteriaRepository は getPgp()（pg-promise）を使用するため、getPgp をモック対象とする。
 */

import {
  findAllByOrganization,
  findByKey,
  findForSelector,
  insertNewVersion,
} from '../../../src/repositories/uncertaintyCriteriaRepository';
import { getPgp } from '../../../src/database/db';

jest.mock('../../../src/database/db');
jest.mock('../../../src/sql/loader', () => ({
  loadSqlFile: jest.fn().mockResolvedValue('SELECT 1'),
}));

describe('uncertaintyCriteriaRepository - Phase2 全CRUD・バージョン管理テスト', () => {
  let mockPgp: {
    any: jest.Mock;
    one: jest.Mock;
    oneOrNone: jest.Mock;
    none: jest.Mock;
    tx: jest.Mock;
  };

  beforeEach(() => {
    mockPgp = {
      any: jest.fn(),
      one: jest.fn(),
      oneOrNone: jest.fn(),
      none: jest.fn(),
      tx: jest.fn(),
    };
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // findAllByOrganization
  // ==========================================================================
  describe('findAllByOrganization()', () => {
    test('正常系: 組織に紐づく不確かさ基準一覧を返すこと', async () => {
      const rows = [
        {
          uncertaintyKey: 'key-001',
          uncertaintyName: '基準A',
          nameSpaceId: 'ns-001',
          version: 1,
          evaluationMethod: 1,
          isInvalid: false,
          inheritanceUncertaintyKey: null,
          xsiType: 'double',
          units: 'mm',
          formatString: null,
          description: '説明A',
        },
        {
          uncertaintyKey: 'key-002',
          uncertaintyName: '基準B',
          nameSpaceId: 'ns-001',
          version: 1,
          evaluationMethod: 2,
          isInvalid: false,
          inheritanceUncertaintyKey: null,
          xsiType: null,
          units: null,
          formatString: null,
          description: null,
        },
      ];
      mockPgp.any.mockResolvedValue(rows);

      const result = await findAllByOrganization('org-001');

      expect(mockPgp.any).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0].uncertaintyKey).toBe('key-001');
      expect(result[1].evaluationMethod).toBe(2);
    });

    test('基準が存在しない場合、空配列を返すこと', async () => {
      mockPgp.any.mockResolvedValue([]);

      const result = await findAllByOrganization('org-empty');

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // findByKey
  // ==========================================================================
  describe('findByKey()', () => {
    test('正常系（定量）: 不確かさ基準詳細を返すこと（qualitativeOptions は空配列）', async () => {
      const rows = [
        {
          uncertaintyKey: 'key-001',
          uncertaintyName: '基準A',
          nameSpaceId: 'ns-001',
          version: 1,
          evaluationMethod: 1,
          isInvalid: false,
          inheritanceUncertaintyKey: null,
          xsiType: 'double',
          units: 'mm',
          formatString: null,
          description: null,
          displayOrder: null,
          selectorValue: null,
          displayColor: null,
        },
      ];
      mockPgp.any.mockResolvedValue(rows);

      const result = await findByKey('org-001', 'key-001', 1);

      expect(result).not.toBeNull();
      expect(result!.uncertaintyKey).toBe('key-001');
      expect(result!.qualitativeOptions).toEqual([]);
    });

    test('正常系（定性）: qualitativeOptions に選択肢が含まれること', async () => {
      const rows = [
        {
          uncertaintyKey: 'key-002',
          uncertaintyName: '基準B',
          nameSpaceId: 'ns-001',
          version: 1,
          evaluationMethod: 2,
          isInvalid: false,
          inheritanceUncertaintyKey: null,
          xsiType: null,
          units: null,
          formatString: null,
          description: null,
          displayOrder: 1,
          selectorValue: '良',
          displayColor: '#00FF00',
        },
        {
          uncertaintyKey: 'key-002',
          uncertaintyName: '基準B',
          nameSpaceId: 'ns-001',
          version: 1,
          evaluationMethod: 2,
          isInvalid: false,
          inheritanceUncertaintyKey: null,
          xsiType: null,
          units: null,
          formatString: null,
          description: null,
          displayOrder: 2,
          selectorValue: '否',
          displayColor: '#FF0000',
        },
      ];
      mockPgp.any.mockResolvedValue(rows);

      const result = await findByKey('org-001', 'key-002', 1);

      expect(result).not.toBeNull();
      expect(result!.qualitativeOptions).toHaveLength(2);
      expect(result!.qualitativeOptions[0].selectorValue).toBe('良');
    });

    test('存在しない場合、null を返すこと', async () => {
      mockPgp.any.mockResolvedValue([]);

      const result = await findByKey('org-001', 'non-existent', 1);

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // findForSelector
  // ==========================================================================
  describe('findForSelector()', () => {
    test('正常系: セレクター用基準一覧をグループ化して返すこと', async () => {
      const rows = [
        {
          uncertaintyKey: 'key-001',
          uncertaintyName: '基準A',
          nameSpaceId: 'ns-001',
          version: 1,
          evaluationMethod: 1,
          xsiType: 'double',
          units: 'mm',
          formatString: null,
          description: null,
          displayOrder: null,
          selectorValue: null,
          displayColor: null,
        },
        {
          uncertaintyKey: 'key-002',
          uncertaintyName: '基準B',
          nameSpaceId: 'ns-001',
          version: 1,
          evaluationMethod: 2,
          xsiType: null,
          units: null,
          formatString: null,
          description: null,
          displayOrder: 1,
          selectorValue: '良',
          displayColor: '#00FF00',
        },
      ];
      mockPgp.any.mockResolvedValue(rows);

      const result = await findForSelector('org-001');

      expect(result).toHaveLength(2);
      expect(result[0].qualitativeOptions).toEqual([]);
      expect(result[1].qualitativeOptions).toHaveLength(1);
    });

    test('organizationGroupCd 指定時: $2 に値を渡して呼び出すこと', async () => {
      mockPgp.any.mockResolvedValue([]);

      await findForSelector('org-001', 'group-001');

      // SQL には [organizationId, organizationGroupCd] の2引数が渡る
      expect(mockPgp.any).toHaveBeenCalledWith(
        expect.any(String),
        ['org-001', 'group-001']
      );
    });

    test('organizationGroupCd 未指定時: $2 に null を渡して呼び出すこと（後方互換）', async () => {
      mockPgp.any.mockResolvedValue([]);

      await findForSelector('org-001');

      expect(mockPgp.any).toHaveBeenCalledWith(
        expect.any(String),
        ['org-001', null]
      );
    });

    test('存在しない場合、空配列を返すこと', async () => {
      mockPgp.any.mockResolvedValue([]);

      const result = await findForSelector('org-empty');

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // insertNewVersion
  // ==========================================================================
  describe('insertNewVersion()', () => {
    test('正常系（定量）: トランザクション内で新バージョンを INSERT し、version を返すこと', async () => {
      mockPgp.tx.mockImplementation(async (fn: Function) => {
        const mockT = {
          one: jest.fn().mockResolvedValue({ version: 2 }),
          none: jest.fn().mockResolvedValue(undefined),
        };
        return fn(mockT);
      });

      const result = await insertNewVersion('org-001', {
        nameSpaceId: 'ns-001',
        uncertaintyKey: 'key-001',
        uncertaintyName: '基準A',
        evaluationMethod: 1,
        isInvalid: false,
        inheritanceUncertaintyKey: null,
        xsiType: 'double',
        units: 'mm',
        scaleFactor: null,
        formatString: null,
        toleranceUpper: null,
        toleranceLower: null,
        description: null,
        qualitativeOptions: [],
        createUserId: 'user-001',
      });

      expect(mockPgp.tx).toHaveBeenCalledTimes(1);
      expect(result.version).toBe(2);
    });

    test('正常系（定性）: 選択肢が存在する場合、intuition_selector への INSERT も実行されること', async () => {
      const mockNone = jest.fn().mockResolvedValue(undefined);
      mockPgp.tx.mockImplementation(async (fn: Function) => {
        const mockT = {
          one: jest.fn().mockResolvedValue({ version: 1 }),
          none: mockNone,
        };
        return fn(mockT);
      });

      await insertNewVersion('org-001', {
        nameSpaceId: 'ns-001',
        uncertaintyKey: 'key-002',
        uncertaintyName: '基準B',
        evaluationMethod: 2,
        isInvalid: false,
        inheritanceUncertaintyKey: null,
        xsiType: null,
        units: null,
        scaleFactor: null,
        formatString: null,
        toleranceUpper: null,
        toleranceLower: null,
        description: null,
        qualitativeOptions: [
          { displayOrder: 1, value: '良', displayColor: '#00FF00' },
          { displayOrder: 2, value: '否', displayColor: '#FF0000' },
        ],
        createUserId: 'user-001',
      });

      // invalidatePreviousVersions + intuition_selector 2件 = 3回 none が呼ばれる
      expect(mockNone).toHaveBeenCalledTimes(3);
    });

    test('定性・選択肢なしの場合、intuition_selector INSERT は実行されないこと', async () => {
      const mockNone = jest.fn().mockResolvedValue(undefined);
      mockPgp.tx.mockImplementation(async (fn: Function) => {
        const mockT = {
          one: jest.fn().mockResolvedValue({ version: 1 }),
          none: mockNone,
        };
        return fn(mockT);
      });

      await insertNewVersion('org-001', {
        nameSpaceId: 'ns-001',
        uncertaintyKey: 'key-002',
        uncertaintyName: '基準B',
        evaluationMethod: 2,
        isInvalid: false,
        inheritanceUncertaintyKey: null,
        xsiType: null,
        units: null,
        scaleFactor: null,
        formatString: null,
        toleranceUpper: null,
        toleranceLower: null,
        description: null,
        qualitativeOptions: [],
        createUserId: 'user-001',
      });

      // invalidatePreviousVersions の1回のみ
      expect(mockNone).toHaveBeenCalledTimes(1);
    });
  });
});

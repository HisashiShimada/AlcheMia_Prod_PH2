/**
 * maimlService.validateMaiML ユニットテスト
 *
 * テスト観点:
 *   1. fileKey あり + skipAnalysisSave=false → DB保存される（effectiveSkip=false）
 *   2. fileKey なし                          → DB保存がスキップされる（effectiveSkip=true）
 *   3. skipAnalysisSave=true               → DB保存がスキップされる（effectiveSkip=true）
 *   4. analyzeMaiMLFile がエラーを返した場合の AnalysisResult
 *   5. analyzeMaiMLFile が例外を投げた場合に例外が伝播する
 */

import * as maimlService from '../../src/services/maimlService';
import * as maimlParser from '../../src/utils/maimlParser';

// --- モック定義 -----------------------------------------------------------

jest.mock('../../src/utils/maimlParser');
jest.mock('../../src/database/db', () => ({
  getPool: jest.fn(() => ({ query: jest.fn() })),
  getPgp: jest.fn(),
}));
jest.mock('../../src/services/storageService', () => ({
  getStorageService: jest.fn(() => ({
    uploadFile: jest.fn(),
    downloadFile: jest.fn(),
    listFiles: jest.fn(),
  })),
}));
jest.mock('../../src/repositories/maimlDraftsRepository', () => ({
  MaimlDraftsRepository: jest.fn().mockImplementation(() => ({
    findDraft: jest.fn(),
    saveDraft: jest.fn(),
    deleteDraft: jest.fn(),
    listDrafts: jest.fn(),
  })),
}));
// uuid ESM 対応モック
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-001'),
}));

// =========================================================================
// テストデータ
// =========================================================================

const ORG_ID = 'org-001';
const FILE_KEY = 'org-001/projects/sample/sample.maiml';

const VALID_ANALYSIS_RESULT = {
  isValid: true,
  errors: [],
  warnings: [],
  namespace: 'http://maiml.io/ns/1.0',
  version: '1.0',
  statistics: { placeCount: 2, transitionCount: 1, arcCount: 3 },
};

const INVALID_ANALYSIS_RESULT = {
  isValid: false,
  errors: [
    { severity: 'error', message: 'required element missing', xpath: '/maiml' },
  ],
  warnings: [],
  namespace: null,
  version: null,
  statistics: { placeCount: 0, transitionCount: 0, arcCount: 0 },
};

// =========================================================================
// テスト本体
// =========================================================================

describe('maimlService.validateMaiML', () => {
  afterEach(() => jest.clearAllMocks());

  // -----------------------------------------------------------------------
  it('正常系: fileKey あり + skipAnalysisSave=false の場合、effectiveSkip=false で analyzeMaiMLFile が呼ばれる', async () => {
    (maimlParser.analyzeMaiMLFile as jest.Mock).mockResolvedValue(VALID_ANALYSIS_RESULT);

    const result = await maimlService.validateMaiML(ORG_ID, '<maiml/>', FILE_KEY, false);

    expect(maimlParser.analyzeMaiMLFile).toHaveBeenCalledWith(
      ORG_ID,
      expect.any(String), // content
      FILE_KEY,
      false,              // skipSave = effectiveSkip = false
      'strict',
    );
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  it('正常系: fileKey が空文字の場合、effectiveSkip=true（DB保存スキップ）で呼ばれる', async () => {
    (maimlParser.analyzeMaiMLFile as jest.Mock).mockResolvedValue(VALID_ANALYSIS_RESULT);

    await maimlService.validateMaiML(ORG_ID, '<maiml/>', '', false);

    // fileKey が空 → effectiveSkip = true (skipAnalysisSave OR !fileKey)
    const callArgs = (maimlParser.analyzeMaiMLFile as jest.Mock).mock.calls[0];
    // 第4引数が skipSave
    expect(callArgs[3]).toBe(true);
  });

  // -----------------------------------------------------------------------
  it('正常系: skipAnalysisSave=true の場合、effectiveSkip=true（DB保存スキップ）で呼ばれる', async () => {
    (maimlParser.analyzeMaiMLFile as jest.Mock).mockResolvedValue(VALID_ANALYSIS_RESULT);

    await maimlService.validateMaiML(ORG_ID, '<maiml/>', FILE_KEY, true);

    const callArgs = (maimlParser.analyzeMaiMLFile as jest.Mock).mock.calls[0];
    expect(callArgs[3]).toBe(true);
  });

  // -----------------------------------------------------------------------
  it('正常系: デフォルト引数（fileKey=""）の場合、effectiveSkip=true で呼ばれる', async () => {
    (maimlParser.analyzeMaiMLFile as jest.Mock).mockResolvedValue(VALID_ANALYSIS_RESULT);

    // fileKey と skipAnalysisSave を省略 → デフォルト値 fileKey='' skipAnalysisSave=false
    await maimlService.validateMaiML(ORG_ID, '<maiml/>');

    const callArgs = (maimlParser.analyzeMaiMLFile as jest.Mock).mock.calls[0];
    // fileKey='' なので effectiveSkip = false || !'' = true
    expect(callArgs[3]).toBe(true);
  });

  // -----------------------------------------------------------------------
  it('正常系: バリデーションエラーがある場合は isValid=false の AnalysisResult を返す', async () => {
    (maimlParser.analyzeMaiMLFile as jest.Mock).mockResolvedValue(INVALID_ANALYSIS_RESULT);

    const result = await maimlService.validateMaiML(ORG_ID, '<maiml/>', FILE_KEY, false);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  it('異常系: analyzeMaiMLFile が例外を投げた場合、例外が伝播する', async () => {
    (maimlParser.analyzeMaiMLFile as jest.Mock).mockRejectedValue(
      new Error('XML parse error')
    );

    await expect(
      maimlService.validateMaiML(ORG_ID, '<broken-xml', FILE_KEY, false)
    ).rejects.toThrow('XML parse error');
  });

  // -----------------------------------------------------------------------
  it('正常系: fileKey あり + skipAnalysisSave=false で fileKey が analyzeMaiMLFile に渡される', async () => {
    (maimlParser.analyzeMaiMLFile as jest.Mock).mockResolvedValue(VALID_ANALYSIS_RESULT);

    const customFileKey = 'org-001/projects/custom/file.maiml';
    await maimlService.validateMaiML(ORG_ID, '<maiml/>', customFileKey, false);

    const callArgs = (maimlParser.analyzeMaiMLFile as jest.Mock).mock.calls[0];
    // 引数順: (organizationId, content, fileKey, skipSave, mode)
    expect(callArgs[2]).toBe(customFileKey);
  });
});

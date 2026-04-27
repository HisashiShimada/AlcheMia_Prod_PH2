/**
 * maimlController — getAnalysisResult / validate ユニットテスト
 *
 * 対象:
 *   - GET  /api/v1/maiml/analysis-result  → getAnalysisResult()
 *   - POST /api/v1/maiml/validate          → validate()
 */

import { Request, Response } from 'express';
import { getAnalysisResult, validate } from '../../src/controllers/maimlController';
import * as maimlAnalysisResultRepository from '../../src/repositories/maimlAnalysisResultRepository';
import * as maimlService from '../../src/services/maimlService';

// --- モック定義 -----------------------------------------------------------

jest.mock('../../src/repositories/maimlAnalysisResultRepository');
jest.mock('../../src/services/maimlService');
jest.mock('../../src/database/db', () => ({
  getPool: jest.fn(() => ({ query: jest.fn() })),
}));
// ingestSingleFileAsync は fire-and-forget なので空実装
jest.mock('../../src/services/singleFileIngestService', () => ({
  ingestSingleFileAsync: jest.fn(),
}));
// uuid ESM 対応モック
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-001'),
}));

// --- ヘルパー -------------------------------------------------------------

function buildRes(): { res: Partial<Response>; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { json, status } as Partial<Response>;
  return { res, json, status };
}

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'user-001',
    organizationId: 'org-001',
    sessionId: 'session-001',
    permissions: [],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
    ...overrides,
  };
}

const MOCK_RECORD: maimlAnalysisResultRepository.MaimlAnalysisResult = {
  id: 1,
  file_key: 'org-001/projects/sample/sample.maiml',
  is_valid: true,
  errors: '[]',
  warnings: '[]',
  suggestions: '[]',
  statistics: '{}',
  analysis_timestamp: '2026-04-24T00:00:00.000Z',
};

// =========================================================================
// getAnalysisResult
// =========================================================================

describe('maimlController.getAnalysisResult', () => {
  afterEach(() => jest.clearAllMocks());

  it('正常系: レコードが存在する場合は 200 + data を返す', async () => {
    (maimlAnalysisResultRepository.getByFileKey as jest.Mock).mockResolvedValue(MOCK_RECORD);

    const req = {
      user: buildUser(),
      query: { fileKey: 'org-001/projects/sample/sample.maiml' },
    } as unknown as Request;
    const { res, json } = buildRes();

    await getAnalysisResult(req, res as Response);

    expect(maimlAnalysisResultRepository.getByFileKey).toHaveBeenCalledWith(
      'org-001/projects/sample/sample.maiml'
    );
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: MOCK_RECORD,
      })
    );
  });

  it('正常系: レコードが存在しない場合は 404 を返す', async () => {
    (maimlAnalysisResultRepository.getByFileKey as jest.Mock).mockResolvedValue(null);

    const req = {
      user: buildUser(),
      query: { fileKey: 'org-001/projects/missing/missing.maiml' },
    } as unknown as Request;
    const { res, status, json } = buildRes();

    await getAnalysisResult(req, res as Response);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'E6001' }),
      })
    );
  });

  it('異常系: fileKey が空の場合は 400 を返す', async () => {
    const req = {
      user: buildUser(),
      query: {},
    } as unknown as Request;
    const { res, status, json } = buildRes();

    await getAnalysisResult(req, res as Response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'E1004' }),
      })
    );
  });

  it('異常系: fileKey が配列の場合は 400 を返す', async () => {
    const req = {
      user: buildUser(),
      query: { fileKey: ['a', 'b'] },
    } as unknown as Request;
    const { res, status } = buildRes();

    await getAnalysisResult(req, res as Response);

    expect(status).toHaveBeenCalledWith(400);
  });

  it('異常系: DB例外発生時は 500 を返す', async () => {
    (maimlAnalysisResultRepository.getByFileKey as jest.Mock).mockRejectedValue(
      new Error('DB connection lost')
    );

    const req = {
      user: buildUser(),
      query: { fileKey: 'org-001/projects/sample/sample.maiml' },
    } as unknown as Request;
    const { res, status, json } = buildRes();

    await getAnalysisResult(req, res as Response);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });
});

// =========================================================================
// validate
// =========================================================================

describe('maimlController.validate', () => {
  afterEach(() => jest.clearAllMocks());

  const VALID_XML = '<maiml><header/></maiml>';
  const BASE64_VALID = Buffer.from(VALID_XML).toString('base64');

  const MOCK_ANALYSIS_RESULT = {
    isValid: true,
    errors: [],
    warnings: [],
    namespace: 'http://example.com/maiml',
    version: '1.0',
    statistics: { placeCount: 0, transitionCount: 0, arcCount: 0 },
  };

  it('正常系: バリデーション成功時に success:true と結果を返す', async () => {
    (maimlService.validateMaiML as jest.Mock).mockResolvedValue(MOCK_ANALYSIS_RESULT);

    const req = {
      user: buildUser(),
      body: {
        content: BASE64_VALID,
        fileKey: 'org-001/projects/sample/sample.maiml',
        skipAnalysisSave: false,
      },
    } as unknown as Request;
    const { res, json } = buildRes();

    await validate(req, res as Response);

    expect(maimlService.validateMaiML).toHaveBeenCalledWith(
      'org-001',                                      // organizationId
      VALID_XML,                                       // decodedContent
      'org-001/projects/sample/sample.maiml',          // fileKey
      false                                            // skipAnalysisSave
    );
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ isValid: true }),
      })
    );
  });

  it('正常系: fileKey 省略時はデフォルト値で呼ばれる', async () => {
    (maimlService.validateMaiML as jest.Mock).mockResolvedValue(MOCK_ANALYSIS_RESULT);

    const req = {
      user: buildUser(),
      body: { content: BASE64_VALID },
    } as unknown as Request;
    const { res, json } = buildRes();

    await validate(req, res as Response);

    expect(maimlService.validateMaiML).toHaveBeenCalledWith(
      'org-001',
      VALID_XML,
      undefined,   // fileKey は body から取られる (undefined)
      true         // skipAnalysisSave デフォルト true
    );
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('正常系: バリデーションエラーがある場合も success:true で返す', async () => {
    const resultWithErrors = {
      ...MOCK_ANALYSIS_RESULT,
      isValid: false,
      errors: [{ severity: 'error', message: 'missing required element', xpath: '/maiml' }],
    };
    (maimlService.validateMaiML as jest.Mock).mockResolvedValue(resultWithErrors);

    const req = {
      user: buildUser(),
      body: { content: BASE64_VALID, fileKey: 'key', skipAnalysisSave: false },
    } as unknown as Request;
    const { res, json } = buildRes();

    await validate(req, res as Response);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ isValid: false }),
      })
    );
  });

  it('異常系: maimlService が例外を投げた場合は 500 を返す', async () => {
    (maimlService.validateMaiML as jest.Mock).mockRejectedValue(new Error('parse failed'));

    const req = {
      user: buildUser(),
      body: { content: BASE64_VALID, fileKey: 'key' },
    } as unknown as Request;
    const { res, status } = buildRes();

    await validate(req, res as Response);

    expect(status).toHaveBeenCalledWith(500);
  });

  it('異常系: content が不正な Base64 の場合は 500 を返す', async () => {
    const req = {
      user: buildUser(),
      body: { content: '!!invalid_base64!!' },
    } as unknown as Request;
    const { res, status } = buildRes();

    // Base64 デコード自体は失敗しないが、その後の validateMaiML でエラーになり得る
    (maimlService.validateMaiML as jest.Mock).mockRejectedValue(new Error('invalid xml'));

    await validate(req, res as Response);

    expect(status).toHaveBeenCalledWith(500);
  });
});

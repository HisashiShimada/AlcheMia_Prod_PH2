/**
 * maimlApiService — validateMaiml / getAnalysisResult ユニットテスト
 *
 * テスト観点:
 *   validateMaiml:
 *     1. options なしで呼んだ場合、strict=false / fileKey='' がリクエストされる
 *     2. options.strict=true を渡した場合、strict=true がリクエストされる
 *     3. options.fileKey を渡した場合、fileKey がリクエストに含まれる
 *     4. API 成功時に ApiResponse<AnalysisResult> を返す
 *     5. API エラー時に例外を投げる
 *
 *   getAnalysisResult:
 *     6. fileKey をエンコードして GET リクエストを送る
 *     7. レコードが存在する場合に MaimlAnalysisResultRow を返す
 *     8. レコードが存在しない場合 (data: null) を返す
 *     9. API エラー時に例外を投げる
 */

import axios from 'axios';
import { validateMaiml, getAnalysisResult } from '../maimlApiService';

// ---- axios インスタンスモック -------------------------------------------------
// createApiClient は内部で axios.create を呼ぶため、モジュールごとモックする
jest.mock('@/utils/authUtils', () => ({
  createApiClient: jest.fn(),
}));

import { createApiClient } from '@/utils/authUtils';

// =========================================================================
// テストデータ
// =========================================================================

const MOCK_ANALYSIS_RESULT = {
  isValid: true,
  errors: [],
  warnings: [],
  namespace: 'http://maiml.io/ns/1.0',
  version: '1.0',
  statistics: { placeCount: 2, transitionCount: 1, arcCount: 3 },
};

const MOCK_ANALYSIS_ROW = {
  id: 1,
  file_key: 'org-001/projects/sample/sample.maiml',
  is_valid: true,
  errors: '[]',
  warnings: '[]',
  analysis_timestamp: '2026-04-24T00:00:00.000Z',
};

const MOCK_SUCCESS_VALIDATE_RESPONSE = {
  data: {
    success: true,
    data: MOCK_ANALYSIS_RESULT,
    meta: { timestamp: '2026-04-24T00:00:00.000Z', requestId: 'req-001' },
  },
};

const MOCK_SUCCESS_GETRESULT_RESPONSE = {
  data: {
    success: true,
    data: MOCK_ANALYSIS_ROW,
    meta: { timestamp: '2026-04-24T00:00:00.000Z', requestId: 'req-002' },
  },
};

// =========================================================================
// validateMaiml
// =========================================================================

describe('maimlApiService.validateMaiml', () => {
  let mockPost: jest.Mock;

  beforeEach(() => {
    mockPost = jest.fn();
    (createApiClient as jest.Mock).mockReturnValue({ post: mockPost, get: jest.fn() });
  });

  afterEach(() => jest.clearAllMocks());

  it('正常系: options なしで呼んだ場合、strict=false / fileKey="" がリクエストに含まれる', async () => {
    mockPost.mockResolvedValue(MOCK_SUCCESS_VALIDATE_RESPONSE);

    const BASE64 = Buffer.from('<maiml/>').toString('base64');
    await validateMaiml(BASE64);

    expect(mockPost).toHaveBeenCalledWith(
      '/maiml/validate',
      expect.objectContaining({
        content: BASE64,
        strict: false,
        fileKey: '',
      })
    );
  });

  it('正常系: options.strict=true を渡した場合、strict=true がリクエストされる', async () => {
    mockPost.mockResolvedValue(MOCK_SUCCESS_VALIDATE_RESPONSE);

    const BASE64 = Buffer.from('<maiml/>').toString('base64');
    await validateMaiml(BASE64, { strict: true });

    expect(mockPost).toHaveBeenCalledWith(
      '/maiml/validate',
      expect.objectContaining({ strict: true })
    );
  });

  it('正常系: options.fileKey を渡した場合、fileKey がリクエストに含まれる', async () => {
    mockPost.mockResolvedValue(MOCK_SUCCESS_VALIDATE_RESPONSE);

    const FILE_KEY = 'org-001/projects/sample/sample.maiml';
    const BASE64 = Buffer.from('<maiml/>').toString('base64');
    await validateMaiml(BASE64, { fileKey: FILE_KEY });

    expect(mockPost).toHaveBeenCalledWith(
      '/maiml/validate',
      expect.objectContaining({ fileKey: FILE_KEY })
    );
  });

  it('正常系: API 成功時に ApiResponse<AnalysisResult> を返す', async () => {
    mockPost.mockResolvedValue(MOCK_SUCCESS_VALIDATE_RESPONSE);

    const result = await validateMaiml(Buffer.from('<maiml/>').toString('base64'));

    expect(result.success).toBe(true);
    expect(result.data?.isValid).toBe(true);
    expect(result.data?.errors).toHaveLength(0);
  });

  it('異常系: API エラー時に例外を投げる', async () => {
    mockPost.mockRejectedValue(new Error('Network Error'));

    await expect(
      validateMaiml(Buffer.from('<maiml/>').toString('base64'))
    ).rejects.toThrow('Network Error');
  });
});

// =========================================================================
// getAnalysisResult
// =========================================================================

describe('maimlApiService.getAnalysisResult', () => {
  let mockGet: jest.Mock;

  beforeEach(() => {
    mockGet = jest.fn();
    (createApiClient as jest.Mock).mockReturnValue({ post: jest.fn(), get: mockGet });
  });

  afterEach(() => jest.clearAllMocks());

  it('正常系: fileKey を encodeURIComponent してGETリクエストを送る', async () => {
    mockGet.mockResolvedValue(MOCK_SUCCESS_GETRESULT_RESPONSE);

    const FILE_KEY = 'org-001/projects/sample/sample.maiml';
    await getAnalysisResult(FILE_KEY);

    expect(mockGet).toHaveBeenCalledWith(
      `/maiml/analysis-result?fileKey=${encodeURIComponent(FILE_KEY)}`
    );
  });

  it('正常系: レコードが存在する場合に MaimlAnalysisResultRow を返す', async () => {
    mockGet.mockResolvedValue(MOCK_SUCCESS_GETRESULT_RESPONSE);

    const result = await getAnalysisResult('org-001/projects/sample/sample.maiml');

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      id: 1,
      file_key: 'org-001/projects/sample/sample.maiml',
      is_valid: true,
    });
  });

  it('正常系: データが null の場合でも ApiResponse を返す', async () => {
    const nullResponse = {
      data: {
        success: true,
        data: null,
        meta: { timestamp: '2026-04-24T00:00:00.000Z', requestId: 'req-003' },
      },
    };
    mockGet.mockResolvedValue(nullResponse);

    const result = await getAnalysisResult('org-001/projects/notfound/notfound.maiml');

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it('異常系: API エラー時（404等）に例外を投げる', async () => {
    const axiosError = Object.assign(new Error('Request failed with status code 404'), {
      response: { status: 404, data: { success: false } },
    });
    mockGet.mockRejectedValue(axiosError);

    await expect(
      getAnalysisResult('org-001/projects/missing/missing.maiml')
    ).rejects.toThrow('Request failed with status code 404');
  });

  it('正常系: fileKey に特殊文字（スラッシュ等）が含まれる場合も正しくエンコードされる', async () => {
    mockGet.mockResolvedValue(MOCK_SUCCESS_GETRESULT_RESPONSE);

    const FILE_KEY_WITH_SPECIAL = 'org-001/projects/テスト/test file.maiml';
    await getAnalysisResult(FILE_KEY_WITH_SPECIAL);

    expect(mockGet).toHaveBeenCalledWith(
      `/maiml/analysis-result?fileKey=${encodeURIComponent(FILE_KEY_WITH_SPECIAL)}`
    );
  });
});

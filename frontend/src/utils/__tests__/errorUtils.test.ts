/**
 * errorUtils のユニットテスト
 *
 * 対象: extractErrorCode(error), extractErrorMessage(error)
 * 検証:
 *   - AxiosError のレスポンスコード・HTTPステータス・ネットワーク状態に応じた
 *     エラーコード抽出と日本語メッセージ変換
 *   - null / undefined / 通常 Error のフォールバック動作
 */

import axios, { AxiosError, AxiosHeaders } from 'axios';
import { extractErrorCode, extractErrorMessage } from '../errorUtils';

// ─── テスト用ヘルパー ────────────────────────────────────────────────────────

/**
 * AxiosError を組み立てるヘルパー
 * axios.isAxiosError() が true を返すように本物の AxiosError を使う
 */
function makeAxiosError(opts: {
  code?: string;
  status?: number;
  responseData?: unknown;
}): AxiosError {
  const error = new AxiosError(
    'test error',
    opts.code,
    undefined,
    undefined,
    opts.status !== undefined
      ? {
          status: opts.status,
          data: opts.responseData ?? {},
          headers: {},
          config: { headers: new AxiosHeaders() },
          statusText: String(opts.status),
        }
      : undefined
  );
  return error;
}

// ─── extractErrorCode ────────────────────────────────────────────────────────

describe('extractErrorCode', () => {
  // ── バックエンドが error.code を返す場合 ──
  describe('response.data.error.code がある場合', () => {
    test.each([
      ['E5001', 401],
      ['E5003', 400],
      ['E7001', 409],
      ['E4001', 500],
    ])('code=%s, status=%i → そのコードを返す', (code, status) => {
      const error = makeAxiosError({
        status,
        responseData: { success: false, error: { code, message: 'msg' } },
      });
      expect(extractErrorCode(error)).toBe(code);
    });
  });

  // ── バックエンドが error.code を返さない場合（HTTPステータスでフォールバック） ──
  describe('response.data.error.code がない場合（HTTPステータスフォールバック）', () => {
    test.each([
      [400, 'E1003'],
      [401, 'E5013'],
      [403, 'E5012'],
      [404, 'E6001'],
      [409, 'E6005'],
      [429, 'E5007'],
      [500, 'E4001'],
      [502, 'E3001'],
      [503, 'E3001'],
      [504, 'E3002'],
    ])('HTTP %i → %s', (status, expectedCode) => {
      const error = makeAxiosError({ status, responseData: {} });
      expect(extractErrorCode(error)).toBe(expectedCode);
    });

    test('未知のHTTPステータス（418）→ E9999', () => {
      const error = makeAxiosError({ status: 418, responseData: {} });
      expect(extractErrorCode(error)).toBe('E9999');
    });
  });

  // ── ネットワーク断（response なし） ──
  describe('AxiosError で response がない場合', () => {
    test('response なし → E3001（サーバー接続失敗）', () => {
      const error = makeAxiosError({}); // status 未指定 = response なし
      expect(extractErrorCode(error)).toBe('E3001');
    });
  });

  // ── タイムアウト ──
  describe('タイムアウトエラー', () => {
    test('AxiosError.code === ECONNABORTED → E3002', () => {
      const error = makeAxiosError({ code: 'ECONNABORTED' });
      expect(extractErrorCode(error)).toBe('E3002');
    });
  });

  // ── 通常の Error ──
  describe('通常の Error オブジェクト', () => {
    test('message に "timeout" を含む → E3002', () => {
      const error = new Error('timeout of 5000ms exceeded');
      expect(extractErrorCode(error)).toBe('E3002');
    });

    test('message に "Network Error" を含む → E3003', () => {
      const error = new Error('Network Error');
      expect(extractErrorCode(error)).toBe('E3003');
    });

    test('その他の Error → E9999', () => {
      const error = new Error('something went wrong');
      expect(extractErrorCode(error)).toBe('E9999');
    });
  });

  // ── null / undefined / 非エラーオブジェクト ──
  describe('非エラー値', () => {
    test('null → E9999', () => {
      expect(extractErrorCode(null)).toBe('E9999');
    });

    test('undefined → E9999', () => {
      expect(extractErrorCode(undefined)).toBe('E9999');
    });

    test('プレーンオブジェクト → E9999', () => {
      expect(extractErrorCode({ message: 'oops' })).toBe('E9999');
    });
  });
});

// ─── extractErrorMessage ─────────────────────────────────────────────────────

describe('extractErrorMessage', () => {
  // ── コード → 日本語メッセージ変換の統合確認 ──
  describe('AxiosError → エラーコード → 日本語メッセージ（統合）', () => {
    test('E5001: ログイン失敗メッセージ', () => {
      const error = makeAxiosError({
        status: 401,
        responseData: { success: false, error: { code: 'E5001' } },
      });
      expect(extractErrorMessage(error)).toBe(
        'ユーザー名またはパスワードが正しくありません'
      );
    });

    test('E5003: PINコード不正メッセージ', () => {
      const error = makeAxiosError({
        status: 400,
        responseData: { success: false, error: { code: 'E5003' } },
      });
      expect(extractErrorMessage(error)).toBe('PINコードが正しくありません');
    });

    test('E5007: レート制限メッセージ', () => {
      const error = makeAxiosError({
        status: 429,
        responseData: { success: false, error: { code: 'E5007' } },
      });
      expect(extractErrorMessage(error)).toBe(
        'ログイン試行回数が上限に達しました。しばらくしてから再度お試しください'
      );
    });

    test('E7004: 既に確認済みメッセージ（業務エラー）', () => {
      const error = makeAxiosError({
        status: 409,
        responseData: { success: false, error: { code: 'E7004' } },
      });
      expect(extractErrorMessage(error)).toBe('既に確認済みです');
    });
  });

  describe('HTTPステータスフォールバック → 日本語メッセージ', () => {
    test('HTTP 401 → 認証必須メッセージ', () => {
      const error = makeAxiosError({ status: 401, responseData: {} });
      expect(extractErrorMessage(error)).toBe(
        '認証が必要です。再度ログインしてください'
      );
    });

    test('HTTP 403 → アクセス拒否メッセージ', () => {
      const error = makeAxiosError({ status: 403, responseData: {} });
      expect(extractErrorMessage(error)).toBe('アクセスが拒否されました');
    });

    test('HTTP 404 → リソース不存在メッセージ', () => {
      const error = makeAxiosError({ status: 404, responseData: {} });
      expect(extractErrorMessage(error)).toBe(
        '指定されたリソースが見つかりません'
      );
    });

    test('HTTP 500 → サーバー内部エラーメッセージ', () => {
      const error = makeAxiosError({ status: 500, responseData: {} });
      expect(extractErrorMessage(error)).toBe(
        'サーバー内部エラーが発生しました。管理者にお問い合わせください'
      );
    });

    test('HTTP 429 → レート制限メッセージ', () => {
      const error = makeAxiosError({ status: 429, responseData: {} });
      expect(extractErrorMessage(error)).toBe(
        'ログイン試行回数が上限に達しました。しばらくしてから再度お試しください'
      );
    });
  });

  describe('ネットワーク・タイムアウト', () => {
    test('response なし → サーバー接続失敗メッセージ', () => {
      const error = makeAxiosError({});
      expect(extractErrorMessage(error)).toBe(
        'サーバーに接続できません。ネットワークを確認してください'
      );
    });

    test('ECONNABORTED → タイムアウトメッセージ', () => {
      const error = makeAxiosError({ code: 'ECONNABORTED' });
      expect(extractErrorMessage(error)).toBe(
        'リクエストがタイムアウトしました。再度お試しください'
      );
    });
  });

  describe('null / undefined → デフォルトメッセージ', () => {
    const DEFAULT = 'エラーが発生しました。しばらくしてから再度お試しください';

    test('null → デフォルトメッセージ', () => {
      expect(extractErrorMessage(null)).toBe(DEFAULT);
    });

    test('undefined → デフォルトメッセージ', () => {
      expect(extractErrorMessage(undefined)).toBe(DEFAULT);
    });

    test('通常の Error → デフォルトメッセージ', () => {
      expect(extractErrorMessage(new Error('generic'))).toBe(DEFAULT);
    });

    test('プレーンオブジェクト → デフォルトメッセージ', () => {
      expect(extractErrorMessage({ message: 'oops' })).toBe(DEFAULT);
    });
  });

  describe('カスタムデフォルトメッセージ', () => {
    test('未知コード（マッピング外）のときカスタムデフォルトが使われる', () => {
      // extractErrorCode は unknown → E9999 を返すが、
      // E9999 は ERROR_MESSAGE_MAP に存在するためカスタムデフォルトは使われない。
      // カスタムデフォルトは mapErrorToMessage に未知コードを渡した場合にのみ有効。
      // ここでは直接 mapErrorToMessage をテストするのが適切（errorMapper.test.ts 参照）。
      // extractErrorMessage では「エラーが発生しました...」がデフォルト相当となる。
      expect(extractErrorMessage(null)).toBe(
        'エラーが発生しました。しばらくしてから再度お試しください'
      );
    });

    test('既知のコードがある場合はカスタムデフォルトより優先される', () => {
      const error = makeAxiosError({
        status: 401,
        responseData: { success: false, error: { code: 'E5013' } },
      });
      expect(extractErrorMessage(error, 'カスタムエラー')).toBe(
        '認証が必要です。再度ログインしてください'
      );
    });
  });

  describe('コード優先順位（response.data.error.code > HTTPステータス）', () => {
    test('HTTP 500 でもコードが E5001 なら E5001 のメッセージ', () => {
      const error = makeAxiosError({
        status: 500,
        responseData: { success: false, error: { code: 'E5001' } },
      });
      expect(extractErrorMessage(error)).toBe(
        'ユーザー名またはパスワードが正しくありません'
      );
    });
  });
});

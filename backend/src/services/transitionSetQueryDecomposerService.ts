/**
 * トランジションセット クエリ分解サービス
 *
 * @description 自然言語クエリを4軸（q_in/q_tr/q_out/q_struct）に分解する
 * @remarks
 * 流用元: semantic_search/backend/services/maimlDatalake/transitionSetQueryDecomposer.service.js
 * TypeScript変換・GPT_OSS_ENDPOINT 環境変数を使用
 *
 * gpt-oss-20b が利用不可の場合はフォールバック動作：
 *   元クエリをそのまま 4 軸全てに使用（検索精度は低下するが動作継続）
 */

import axios from 'axios';
import { DecomposedQuery } from '../types/semanticSearch';

// gpt-oss-20b 接続設定（環境変数から取得）
const GPT_OSS_ENABLED = process.env.GPT_OSS_ENABLED === 'true';
const GPT_OSS_HOST = process.env.GPT_OSS_ENDPOINT || 'http://localhost:8001';
const TIMEOUT_MS = parseInt(process.env.GPT_OSS_TIMEOUT || '60000', 10);
const MAX_RETRIES = parseInt(process.env.GPT_OSS_MAX_RETRIES || '3', 10);
const RETRY_DELAY_MS = 1000;

/**
 * 自然言語クエリを 4 軸に分解する
 *
 * @param query - 検索クエリ（自然言語）
 * @returns DecomposedQuery（GPT_OSS_ENABLED=false または未接続時はフォールバック）
 */
export async function decomposeQuery(query: string): Promise<DecomposedQuery> {
  if (!query || query.trim().length === 0) {
    console.warn('[transitionSetQueryDecomposer] Empty query provided');
    return createEmptyDecomposition('Empty query');
  }

  // GPT_OSS_ENABLED=false の場合はフォールバック動作（APIは呼び出さない）
  if (!GPT_OSS_ENABLED) {
    console.info('[transitionSetQueryDecomposer] GPT_OSS_ENABLED=false, using fallback');
    return createFallbackDecomposition(query, 'GPT_OSS_ENABLED=false');
  }

  try {
    console.info('[transitionSetQueryDecomposer] Decomposing query', {
      queryLength: query.length,
      endpoint: GPT_OSS_HOST,
    });

    const decomposition = await callDecomposeAPIWithRetry({ query });
    const normalized = normalizeDecomposition(decomposition);

    console.info('[transitionSetQueryDecomposer] Decomposition complete', {
      confidence: normalized.confidence,
      methodology: normalized.methodology,
    });

    return normalized;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[transitionSetQueryDecomposer] Decomposition failed, using fallback', {
      error: message,
    });
    return createFallbackDecomposition(query, message);
  }
}

/**
 * gpt-oss-20b の decompose API を呼び出す（リトライあり）
 * @private
 */
async function callDecomposeAPIWithRetry(
  requestBody: { query: string },
  attempt: number = 1
): Promise<Record<string, unknown>> {
  const endpoint = `${GPT_OSS_HOST}/decompose/transition_set_query`;

  try {
    console.debug('[transitionSetQueryDecomposer] Calling API', {
      endpoint,
      attempt,
      maxRetries: MAX_RETRIES,
    });

    const response = await axios.post<Record<string, unknown>>(endpoint, requestBody, {
      timeout: TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
    });

    return response.data;
  } catch (error) {
    const isLastAttempt = attempt >= MAX_RETRIES;

    if (axios.isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status;
        console.error('[transitionSetQueryDecomposer] HTTP error', {
          attempt,
          status,
          data: error.response.data,
        });
        // 4xx（429除く）はリトライしない
        if (status >= 400 && status < 500 && status !== 429) {
          throw new Error(`HTTP ${status}: ${JSON.stringify(error.response.data)}`);
        }
      } else if (error.code === 'ECONNREFUSED') {
        console.error('[transitionSetQueryDecomposer] Connection refused', {
          attempt,
          endpoint,
        });
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        console.error('[transitionSetQueryDecomposer] Timeout', {
          attempt,
          timeout: TIMEOUT_MS,
        });
      }
    }

    if (!isLastAttempt) {
      const backoffMs = Math.min(RETRY_DELAY_MS * Math.pow(2, attempt - 1), 10000);
      console.info('[transitionSetQueryDecomposer] Retrying', {
        attempt: attempt + 1,
        maxRetries: MAX_RETRIES,
        backoffMs,
      });
      await sleep(backoffMs);
      return callDecomposeAPIWithRetry(requestBody, attempt + 1);
    }

    throw error;
  }
}

/**
 * gpt-oss レスポンスを正規化・バリデーション
 * @private
 */
function normalizeDecomposition(raw: Record<string, unknown>): DecomposedQuery {
  const normalized: DecomposedQuery = {
    q_in: '',
    q_tr: '',
    q_out: '',
    q_struct: '',
    methodology: null,
    methodology_confidence: 0.0,
    confidence: 0.0,
  };

  if (typeof raw.q_in === 'string') normalized.q_in = raw.q_in.trim();
  if (typeof raw.q_tr === 'string') normalized.q_tr = raw.q_tr.trim();
  if (typeof raw.q_out === 'string') normalized.q_out = raw.q_out.trim();
  if (typeof raw.q_struct === 'string') normalized.q_struct = raw.q_struct.trim();

  if (typeof raw.confidence === 'number') {
    normalized.confidence = Math.max(0, Math.min(1, raw.confidence));
  }
  if (typeof raw.methodology === 'string') {
    normalized.methodology = raw.methodology || null;
  }
  if (typeof raw.methodology_confidence === 'number') {
    normalized.methodology_confidence = Math.max(0, Math.min(1, raw.methodology_confidence));
  }

  return normalized;
}

/**
 * 空のクエリ分解結果（エラーケース）
 * @private
 */
function createEmptyDecomposition(error: string): DecomposedQuery {
  return {
    q_in: '',
    q_tr: '',
    q_out: '',
    q_struct: '',
    methodology: null,
    methodology_confidence: 0.0,
    confidence: 0.0,
    fallback: true,
    error,
  };
}

/**
 * フォールバック分解結果（gpt-oss未接続時 - 元クエリを全軸に使用）
 * @private
 */
function createFallbackDecomposition(query: string, error: string): DecomposedQuery {
  console.warn('[transitionSetQueryDecomposer] Using fallback decomposition', {
    queryPreview: query.substring(0, 100),
    error,
  });

  return {
    q_in: query,
    q_tr: query,
    q_out: query,
    q_struct: query,
    methodology: null,
    methodology_confidence: 0.0,
    confidence: 0.3, // フォールバック時は低信頼度
    fallback: true,
    error,
  };
}

/**
 * gpt-oss-20b サービスのヘルスチェック
 *
 * @returns ヘルス状態（GPT_OSS_ENABLED=false の場合は disabled を返す）
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy' | 'disabled';
  endpoint: string;
  enabled: boolean;
  error?: string;
}> {
  if (!GPT_OSS_ENABLED) {
    console.info('[transitionSetQueryDecomposer] Health check skipped (GPT_OSS_ENABLED=false)');
    return { status: 'disabled', endpoint: GPT_OSS_HOST, enabled: false };
  }

  try {
    await axios.get(`${GPT_OSS_HOST}/health`, { timeout: 5000 });
    console.info('[transitionSetQueryDecomposer] Health check passed');
    return { status: 'healthy', endpoint: GPT_OSS_HOST, enabled: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[transitionSetQueryDecomposer] Health check failed', { error: message });
    return { status: 'unhealthy', endpoint: GPT_OSS_HOST, enabled: true, error: message };
  }
}

/**
 * サービス情報取得
 */
export function getServiceInfo(): Record<string, unknown> {
  return {
    service: 'TransitionSetQueryDecomposer',
    enabled: GPT_OSS_ENABLED,
    endpoint: GPT_OSS_HOST,
    timeout: TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
    decompositionAxes: ['q_in', 'q_tr', 'q_out', 'q_struct'],
  };
}

/**
 * sleep ユーティリティ
 * @private
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

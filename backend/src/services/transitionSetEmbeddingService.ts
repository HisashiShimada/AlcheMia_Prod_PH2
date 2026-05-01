/**
 * トランジションセット Embedding サービス
 *
 * @description 環境変数 EMBEDDING_PROVIDER に応じて、
 *              - "bedrock": AWS Bedrock (cohere.embed-v4:0) → 1024次元
 *              - "ollama" (デフォルト): Ollama (embeddinggemma:latest) → 768次元
 *              でテキスト→ベクトル変換を行う。
 */

import axios from 'axios';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { HTTP_STATUS } from '../constants/httpStatus';

// ============================================================
// 環境変数
// ============================================================
const EMBEDDING_PROVIDER = (process.env.EMBEDDING_PROVIDER || 'ollama').toLowerCase();

// --- Ollama ---
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://ollama:11434';
const OLLAMA_EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'embeddinggemma:latest';

// --- Bedrock ---
const BEDROCK_REGION = process.env.BEDROCK_REGION || 'ap-northeast-1';
const BEDROCK_EMBEDDING_MODEL_ID =
  process.env.BEDROCK_EMBEDDING_MODEL_ID || 'cohere.embed-v4:0';
const BEDROCK_EMBEDDING_OUTPUT_DIMENSION = parseInt(
  process.env.BEDROCK_EMBEDDING_OUTPUT_DIMENSION || '1024',
  10
);

// --- 共通 ---
const REQUEST_TIMEOUT_MS = 60000; // 60秒

/** 期待次元数: bedrock=1024, ollama=768 */
export const EXPECTED_DIMENSION = EMBEDDING_PROVIDER === 'bedrock'
  ? BEDROCK_EMBEDDING_OUTPUT_DIMENSION
  : 768;

/**
 * input_type (Cohere Embed v4 専用)
 * - インデックス登録時: 'search_document'
 * - 検索クエリ時:       'search_query'
 */
export type CohereInputType = 'search_document' | 'search_query';

// ============================================================
// ユーティリティ
// ============================================================

/**
 * ベクトルの妥当性を検証する
 */
export function validateVector(
  vector: unknown,
  expectedDimension: number = EXPECTED_DIMENSION
): boolean {
  if (!Array.isArray(vector)) return false;
  if (vector.length !== expectedDimension) return false;
  if (vector.some((v) => typeof v !== 'number' || isNaN(v))) return false;
  if (vector.every((v) => v === 0)) return false;
  return true;
}

// ============================================================
// Ollama 実装
// ============================================================

/**
 * Ollama API を呼び出してembeddingを生成する（768次元）
 */
async function generateEmbeddingOllama(text: string): Promise<number[]> {
  const response = await axios.post(
    `${OLLAMA_HOST}/api/embeddings`,
    { model: OLLAMA_EMBEDDING_MODEL, prompt: text },
    { timeout: REQUEST_TIMEOUT_MS, headers: { 'Content-Type': 'application/json' } }
  );

  if (!response.data || !Array.isArray(response.data.embedding)) {
    throw new Error('[transitionSetEmbeddingService] Invalid response from Ollama API');
  }

  const embedding: number[] = response.data.embedding;

  if (embedding.length !== 768) {
    throw new Error(
      `[transitionSetEmbeddingService] Ollama: Expected 768D vector, got ${embedding.length}D`
    );
  }

  return embedding;
}

// ============================================================
// Bedrock 実装
// ============================================================

let _bedrockClient: BedrockRuntimeClient | null = null;

function getBedrockClient(): BedrockRuntimeClient {
  if (!_bedrockClient) {
    _bedrockClient = new BedrockRuntimeClient({ region: BEDROCK_REGION });
  }
  return _bedrockClient;
}

/**
 * AWS Bedrock (cohere.embed-v4:0) を呼び出してembeddingを生成する（1024次元）
 *
 * @param text - 埋め込み生成対象テキスト
 * @param inputType - 'search_document'（インデックス登録時）or 'search_query'（検索時）
 */
async function generateEmbeddingBedrock(
  text: string,
  inputType: CohereInputType = 'search_document'
): Promise<number[]> {
  const client = getBedrockClient();

  const requestBody = {
    texts: [text],
    input_type: inputType,
    output_dimension: BEDROCK_EMBEDDING_OUTPUT_DIMENSION,
    embedding_types: ['float'],
  };

  const command = new InvokeModelCommand({
    modelId: BEDROCK_EMBEDDING_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  });

  const response = await client.send(command);
  const result = JSON.parse(Buffer.from(response.body).toString('utf-8'));

  // Cohere レスポンス形式: { embeddings: { float: [[...]] } } または { embeddings: [[...]] }
  let embedding: number[] | null = null;

  if (result?.embeddings?.float && Array.isArray(result.embeddings.float[0])) {
    embedding = result.embeddings.float[0];
  } else if (Array.isArray(result?.embeddings?.[0])) {
    embedding = result.embeddings[0];
  }

  if (!embedding) {
    throw new Error(
      '[transitionSetEmbeddingService] Invalid response from Bedrock API: embeddings not found'
    );
  }

  if (embedding.length !== BEDROCK_EMBEDDING_OUTPUT_DIMENSION) {
    throw new Error(
      `[transitionSetEmbeddingService] Bedrock: Expected ${BEDROCK_EMBEDDING_OUTPUT_DIMENSION}D vector, got ${embedding.length}D`
    );
  }

  return embedding;
}

// ============================================================
// 公開API（ファサード）
// ============================================================

/**
 * 単一テキストからベクトルを生成する（provider に応じて切り替え）
 *
 * @param text - 埋め込み生成対象テキスト
 * @param inputType - Cohere専用: 'search_document'（インデックス）or 'search_query'（検索）
 * @returns ベクトル（bedrock:1024次元 / ollama:768次元）
 */
export async function generateEmbedding(
  text: string,
  inputType: CohereInputType = 'search_document'
): Promise<number[]> {
  if (EMBEDDING_PROVIDER === 'bedrock') {
    return generateEmbeddingBedrock(text, inputType);
  }
  return generateEmbeddingOllama(text);
}

/**
 * 複数テキストを順次処理してベクトル配列を生成
 * （Ollamaは並列処理に弱いため順次実行、Bedrockも安全のため順次実行）
 *
 * @param texts - テキスト配列
 * @param inputType - Cohere専用 input_type
 */
export async function generateBatchEmbeddings(
  texts: string[],
  inputType: CohereInputType = 'search_document'
): Promise<number[][]> {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('[transitionSetEmbeddingService] texts must be a non-empty array');
  }

  const embeddings: number[][] = [];
  for (const text of texts) {
    const embedding = await generateEmbedding(text, inputType);
    embeddings.push(embedding);
  }
  return embeddings;
}

/**
 * 4軸テキストから4軸ベクトルを生成（インデックス登録用）
 *
 * @param inputText - Input正規化テキスト
 * @param transitionText - Transition正規化テキスト
 * @param outputText - Output正規化テキスト
 * @param structureText - Structure正規化テキスト
 * @returns 4軸ベクトル
 */
export async function generate4AxisVectors(
  inputText: string,
  transitionText: string,
  outputText: string,
  structureText: string
): Promise<{
  emb_input: number[];
  emb_transition: number[];
  emb_output: number[];
  emb_structure: number[];
}> {
  const texts = [inputText, transitionText, outputText, structureText];
  // インデックス登録時は search_document
  const embeddings = await generateBatchEmbeddings(texts, 'search_document');

  if (embeddings.length !== 4) {
    throw new Error(
      `[transitionSetEmbeddingService] Expected 4 embeddings, got ${embeddings.length}`
    );
  }

  return {
    emb_input: embeddings[0],
    emb_transition: embeddings[1],
    emb_output: embeddings[2],
    emb_structure: embeddings[3],
  };
}

/**
 * Embeddingサービスのヘルスチェック
 * - bedrock: Bedrock Runtime へのダミーリクエスト（あるいは AWS SDK の接続確認）
 * - ollama:  Ollama /api/tags への GET リクエスト
 */
export async function healthCheck(): Promise<boolean> {
  try {
    if (EMBEDDING_PROVIDER === 'bedrock') {
      // Bedrock のヘルスチェック: 最小テキストで実際にembeddingを試みる
      await generateEmbeddingBedrock('health check', 'search_query');
      return true;
    } else {
      const response = await axios.get(`${OLLAMA_HOST}/api/tags`, { timeout: 5000 });
      return response.status === HTTP_STATUS.OK;
    }
  } catch {
    return false;
  }
}

/**
 * サービス情報取得
 */
export function getServiceInfo(): Record<string, unknown> {
  const base: Record<string, unknown> = {
    service: 'TransitionSetEmbeddingService',
    version: '2.0',
    provider: EMBEDDING_PROVIDER,
    vectorDimension: EXPECTED_DIMENSION,
    timeout: REQUEST_TIMEOUT_MS,
  };

  if (EMBEDDING_PROVIDER === 'bedrock') {
    base.bedrockRegion = BEDROCK_REGION;
    base.bedrockModelId = BEDROCK_EMBEDDING_MODEL_ID;
    base.outputDimension = BEDROCK_EMBEDDING_OUTPUT_DIMENSION;
  } else {
    base.ollamaHost = OLLAMA_HOST;
    base.embeddingModel = OLLAMA_EMBEDDING_MODEL;
  }

  return base;
}

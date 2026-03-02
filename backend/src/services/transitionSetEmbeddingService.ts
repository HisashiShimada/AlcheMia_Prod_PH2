/**
 * トランジションセット Embedding サービス
 *
 * @description Ollama API（embeddinggemma:latest）を呼び出してテキスト→768次元ベクトルに変換する
 * @remarks
 * 流用元: semantic_search/backend/services/maimlDatalake/transitionSetEmbedding.service.js
 * TypeScript変換・OllamaホストURL環境変数変更
 */

import axios from 'axios';

// Ollama API設定
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://ollama:11434';
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'embeddinggemma:latest';
const REQUEST_TIMEOUT_MS = 60000; // 60秒

/** EmbeddingGemmaの期待次元数 */
const EXPECTED_DIMENSION = 768;

/**
 * ベクトルの妥当性を検証する
 *
 * @param vector - 検証するベクトル
 * @param expectedDimension - 期待次元数
 * @returns 妥当性フラグ
 */
export function validateVector(
  vector: unknown,
  expectedDimension: number = EXPECTED_DIMENSION
): boolean {
  if (!Array.isArray(vector)) return false;
  if (vector.length !== expectedDimension) return false;

  // 全要素が数値かチェック
  if (vector.some((v) => typeof v !== 'number' || isNaN(v))) return false;

  // ゼロベクトルチェック
  if (vector.every((v) => v === 0)) return false;

  return true;
}

/**
 * 単一テキストから768次元ベクトルを生成（Ollama API呼び出し）
 *
 * @param text - 埋め込み生成対象テキスト
 * @returns 768次元ベクトル
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await axios.post(
    `${OLLAMA_HOST}/api/embeddings`,
    {
      model: EMBEDDING_MODEL,
      prompt: text,
    },
    {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.data || !Array.isArray(response.data.embedding)) {
    throw new Error('[transitionSetEmbeddingService] Invalid response from Ollama API');
  }

  const embedding: number[] = response.data.embedding;

  if (embedding.length !== EXPECTED_DIMENSION) {
    throw new Error(
      `[transitionSetEmbeddingService] Expected ${EXPECTED_DIMENSION}D vector, got ${embedding.length}D`
    );
  }

  return embedding;
}

/**
 * 複数テキストを順次処理してベクトル配列を生成（Ollamaは並列処理に弱いため順次実行）
 *
 * @param texts - テキスト配列
 * @returns ベクトル配列
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('[transitionSetEmbeddingService] texts must be a non-empty array');
  }

  const embeddings: number[][] = [];
  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    embeddings.push(embedding);
  }
  return embeddings;
}

/**
 * 4軸テキストから4軸ベクトルを生成
 *
 * @param inputText - Input正規化テキスト
 * @param transitionText - Transition正規化テキスト
 * @param outputText - Output正規化テキスト
 * @param structureText - Structure正規化テキスト
 * @returns 4軸ベクトル { emb_input, emb_transition, emb_output, emb_structure }
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
  const embeddings = await generateBatchEmbeddings(texts);

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
 * Ollama サービスのヘルスチェック
 *
 * @returns サービスが正常かどうか
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await axios.get(`${OLLAMA_HOST}/api/tags`, { timeout: 5000 });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * サービス情報取得
 */
export function getServiceInfo(): Record<string, unknown> {
  return {
    service: 'TransitionSetEmbeddingService',
    version: '1.0',
    ollamaHost: OLLAMA_HOST,
    embeddingModel: EMBEDDING_MODEL,
    vectorDimension: EXPECTED_DIMENSION,
    timeout: REQUEST_TIMEOUT_MS,
  };
}

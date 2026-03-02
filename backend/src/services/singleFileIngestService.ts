/**
 * シングルファイル インジェストサービス
 *
 * @description 1ファイル分のセマンティック検索インデックス投入処理
 *              MAIMLファイル読込 → 4軸テキスト生成 → Embedding生成 → DB保存
 * @remarks
 * 新規実装（Reference版の transitionSetBatchProcessing.service.js を参考）
 * 呼び出し元からfire-and-forget（バックグラウンド）で使用する
 */

import { getStorageService } from './storageService';
import { generateTransitionSetMetadata } from './transitionSetGeneratorService';
import { generate4AxisVectors, validateVector } from './transitionSetEmbeddingService';
import * as semanticSearchRepository from '../repositories/semanticSearchRepository';
import { TransitionSetUpsertData } from '../types/semanticSearch';

const storageService = getStorageService();

/**
 * 1ファイル分のインジェスト処理結果
 */
export interface IngestResult {
  filePath: string;
  upsertedCount: number;
  skippedCount: number;
  errorCount: number;
  durationMs: number;
}

/**
 * 1つのMAIMLファイルをセマンティック検索インデックスに投入する
 *
 * @param organizationId - 組織ID
 * @param filePath - ファイルパス（organization_id省略の相対パス）
 * @param technique - 分析手法コード（省略時は自動抽出）
 * @returns 処理結果
 */
export async function ingestSingleFile(
  organizationId: string,
  filePath: string,
  technique?: string | null
): Promise<IngestResult> {
  const startTime = Date.now();
  let upsertedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  console.log(`[singleFileIngestService] Start: ${filePath}`);

  try {
    // Step 1: ストレージからMAIMLファイルを読み込む
    const fileBuffer = await storageService.downloadFile(organizationId, filePath);
    const maimlContent = fileBuffer.toString('utf-8');

    // Step 2: MAIMLから4軸テキスト＋メタデータを生成
    const metadataList = generateTransitionSetMetadata(
      maimlContent,
      organizationId,
      filePath,
      technique
    );

    if (metadataList.length === 0) {
      console.log(`[singleFileIngestService] No transition sets found: ${filePath}`);
      return {
        filePath,
        upsertedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        durationMs: Date.now() - startTime,
      };
    }

    console.log(
      `[singleFileIngestService] ${metadataList.length} transition sets to embed: ${filePath}`
    );

    // Step 3: 各トランジションセットのEmbeddingを生成してDBへUPSERT
    for (const meta of metadataList) {
      try {
        // Embedding生成（4軸）
        const vectors = await generate4AxisVectors(
          meta.input_text,
          meta.transition_text,
          meta.output_text,
          meta.structure_text
        );

        // ゼロベクトルチェック（Ollamaエラー時スキップ）
        if (
          !validateVector(vectors.emb_input) ||
          !validateVector(vectors.emb_transition) ||
          !validateVector(vectors.emb_output) ||
          !validateVector(vectors.emb_structure)
        ) {
          console.warn(
            `[singleFileIngestService] Zero or invalid vector detected, skipping: ` +
              `${meta.transition_id}`
          );
          skippedCount++;
          continue;
        }

        // DBへUPSERT
        const upsertData: TransitionSetUpsertData = {
          ...meta,
          ...vectors,
        };

        await semanticSearchRepository.upsertTransitionSet(upsertData);
        upsertedCount++;
      } catch (err) {
        console.error(
          `[singleFileIngestService] Error processing transition ${meta.transition_id}:`,
          err
        );
        errorCount++;
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(
      `[singleFileIngestService] Done: ${filePath} ` +
        `upserted=${upsertedCount} skipped=${skippedCount} errors=${errorCount} ${durationMs}ms`
    );

    return { filePath, upsertedCount, skippedCount, errorCount, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error(`[singleFileIngestService] Fatal error for ${filePath}:`, err);
    return { filePath, upsertedCount, skippedCount: 0, errorCount: 1, durationMs };
  }
}

/**
 * 1ファイルをfire-and-forgetでインジェスト（非同期・エラーを握りつぶす）
 *
 * @description MAIMLの保存完了後など、レスポンスをブロックせずに
 *              バックグラウンドでインデックスを更新したい場合に使用する
 */
export function ingestSingleFileAsync(
  organizationId: string,
  filePath: string,
  technique?: string | null
): void {
  ingestSingleFile(organizationId, filePath, technique).catch((err) => {
    console.error(
      `[singleFileIngestService] Background ingest failed for ${filePath}:`,
      err
    );
  });
}

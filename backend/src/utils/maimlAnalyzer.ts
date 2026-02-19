/**
 * MAIML簡易解析ユーティリティ
 * 
 * Phase2-3: MAIML解析統合（2026-02-18）
 * アップロード時の軽量・高速な簡易解析を提供
 * 
 * 目的:
 * - アップロード直後の即時フィードバック
 * - ファイル妥当性の簡易チェック
 * - 既存の詳細解析API（maimlService.parseMAIML）との使い分け
 * 
 * 処理方法:
 * - 正規表現によるタグカウント（軽量・高速）
 * - 詳細解析は既存のmaimlServiceを使用
 */

import { MaimlAnalysisResult, MaimlAnalysisStats } from '../types/maimlAnalysis';

/**
 * MAIMLファイルを簡易解析する
 * 
 * @description
 * アップロード時の即時フィードバック用の軽量解析。
 * 正規表現でtransition/placeタグの数をカウントする。
 * 詳細な構造解析は既存のmaimlService.parseMAIML()を使用。
 * 
 * Reference版uploadRoutes.jsの実装を移植:
 * ```javascript
 * const transitionMatches = content.match(/<transition/g) || [];
 * const placeMatches = content.match(/<place/g) || [];
 * return { isValid, isMaimlFile, transitionsCount, placesCount };
 * ```
 * 
 * @param content ファイル内容（文字列）
 * @returns MAIML解析結果
 * 
 * @example
 * ```typescript
 * const buffer = file.buffer;
 * const content = buffer.toString('utf-8');
 * const analysis = analyzeMaimlFile(content);
 * 
 * if (analysis.isValid) {
 *   console.log(`Transitions: ${analysis.transitionsCount}`);
 *   console.log(`Places: ${analysis.placesCount}`);
 * }
 * ```
 */
export function analyzeMaimlFile(content: string): MaimlAnalysisResult {
  try {
    // 空のコンテンツチェック
    if (!content || content.trim().length === 0) {
      return {
        isValid: false,
        isMaimlFile: false,
        transitionsCount: 0,
        placesCount: 0,
        version: null,
        error: 'Empty content',
      };
    }

    // 1. XMLとして基本的な妥当性チェック
    const isXml =
      content.includes('<?xml') ||
      content.includes('<maiml') ||
      content.includes('<pnml');

    // 2. MAIMLファイルかどうかをチェック
    const isMaimlFile = content.includes('<maiml') || content.includes('<pnml');

    // 3. transition タグの数をカウント
    const transitionMatches = content.match(/<transition/g);
    const transitionsCount = transitionMatches ? transitionMatches.length : 0;

    // 4. place タグの数をカウント
    const placeMatches = content.match(/<place/g);
    const placesCount = placeMatches ? placeMatches.length : 0;

    // 5. 妥当性判定
    // XMLとして基本的な構造を持ち、かつtransitionまたはplaceが存在する
    const isValid = isXml && (transitionsCount > 0 || placesCount > 0);

    return {
      isValid,
      isMaimlFile,
      transitionsCount,
      placesCount,
      version: null, // 簡易解析ではバージョン情報は取得しない
    };
  } catch (error) {
    return {
      isValid: false,
      isMaimlFile: false,
      transitionsCount: 0,
      placesCount: 0,
      version: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ファイルがMAIMLファイルかどうかを判定
 * 
 * @description
 * ファイル名の拡張子とContent-Typeから判定する。
 * 実際の解析はanalyzeMaimlFile()を使用。
 * 
 * @param fileName ファイル名
 * @param contentType Content-Type（オプション）
 * @returns MAIMLファイルならtrue
 * 
 * @example
 * ```typescript
 * if (isMaimlFile('experiment.maiml', 'application/xml')) {
 *   // MAIML解析を実行
 *   const analysis = analyzeMaimlFile(content);
 * }
 * ```
 */
export function isMaimlFile(fileName: string, contentType?: string): boolean {
  // 拡張子チェック
  const hasMaimlExtension = fileName.toLowerCase().endsWith('.maiml');

  // Content-Typeチェック
  const isXmlContentType =
    contentType === 'application/xml' || contentType === 'text/xml';

  return hasMaimlExtension || isXmlContentType;
}

/**
 * MAIML解析結果の統計情報を取得
 * 
 * @param results MAIML解析結果の配列
 * @returns 統計情報
 */
export function getMaimlAnalysisStats(
  results: MaimlAnalysisResult[]
): MaimlAnalysisStats {
  const totalFiles = results.length;
  const validFiles = results.filter((r) => r.isValid).length;
  const invalidFiles = results.filter((r) => !r.isValid).length;
  const totalTransitions = results.reduce(
    (sum, r) => sum + r.transitionsCount,
    0
  );
  const totalPlaces = results.reduce((sum, r) => sum + r.placesCount, 0);

  return {
    totalFiles,
    validFiles,
    invalidFiles,
    totalTransitions,
    totalPlaces,
  };
}

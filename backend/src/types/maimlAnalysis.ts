/**
 * MAIML解析関連の型定義
 * 
 * Phase2-3: MAIML解析統合（2026-02-18）
 */

/**
 * MAIML簡易解析結果
 */
export interface MaimlAnalysisResult {
  /** MAIMLファイルとして妥当か */
  isValid: boolean;
  /** MAIMLファイルであるか（pnmlも含む） */
  isMaimlFile: boolean;
  /** transition要素の数 */
  transitionsCount: number;
  /** place要素の数 */
  placesCount: number;
  /** バージョン情報（簡易解析では取得しない） */
  version: string | null;
  /** エラーメッセージ（解析失敗時） */
  error?: string;
}

/**
 * MAIML解析統計情報
 */
export interface MaimlAnalysisStats {
  /** 総ファイル数 */
  totalFiles: number;
  /** 妥当なファイル数 */
  validFiles: number;
  /** 不正なファイル数 */
  invalidFiles: number;
  /** 総transition数 */
  totalTransitions: number;
  /** 総place数 */
  totalPlaces: number;
}

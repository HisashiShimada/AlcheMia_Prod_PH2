

/**
 * 編集セッション型定義
 */
// export interface EditSession {
//   sessionId: string;
//   fileKey: string;
//   fileName: string;
//   userId: string;
//   startTime: Date;
//   lastActivity: Date;
//   changes: any[];
//   locked: boolean;
// }

// /**
//  * MAIML解析結果型定義
//  */
// export interface ParseResult {
//   metadata: Record<string, any>;
//   places: any[];
//   transitions: any[];
//   arcs: any[];
//   statistics: {
//     placeCount: number;
//     transitionCount: number;
//     arcCount: number;
//   };
// }

export interface AnalysisResult {
    fileKey: string;
    isValid: boolean;
    version?: number;
    namespace? : string;
    errors : ErrorContent[];
    warnings : ErrorContent[];
    suggestions? : ErrorContent[];
    statistics?: statistics;
    processingTime?: number;
    timestamp?: string;
    autoCorrections: Correction[];
}

export interface ErrorContent {
  type: string;
  severity?: string;
  message: string;
  details?: string;
  suggestion?: string;
  line?: number;
  column?: number;
  ref? : string;
  path? : string;
  duplicateId?: string;
  occurrences? : number;
  elementTypes? : string;
  paths? : string[];
  element? :unknown;
}

export interface statistics {
  totalElements: number;
  placesCount : number;
  transitionsCount: number;
  arcsCount: number;
}

export interface Correction { 
    type: string;
    target: string;
    attribute?: string;
    value?: string;
    description: string;
    original: string;
    fixed: string;
    ref? : string;
}
/**
 * バリデーションモード型定義
 * - 'strict': 編集画面保存時に使用。すべての項目をエラーとして扱う
 * - 'lenient': アップロード時に使用。編集画面で修正可能な項目を警告に降格する
 */
export type ValidationMode = 'strict' | 'lenient';

/**
 * 編集セッション型定義
 */
export interface EditSession {
  sessionId: string;
  fileKey: string;
  fileName: string;
  userId: string;
  startTime: Date;
  lastActivity: Date;
  changes: any[];
  locked: boolean;
}

/**
 * MAIML解析結果型定義
 */
export interface ParseResult {
  metadata: Record<string, any>;
  places: any[];
  transitions: any[];
  arcs: any[];
  statistics: {
    placeCount: number;
    transitionCount: number;
    arcCount: number;
  };
}

export interface AnalysisResult {
    fileKey: string;
    isValid: boolean;
    version?: number;
    namespace? : string;
    errors : ErrorContent[];
    warnings : ErrorContent[];
    suggestions : ErrorContent[];
    statistics?: statistics;
    processingTime?: number;
    timestamp?: string;
    autoCorrections: Correction[];
}

export interface ErrorContent {
  type: string;
  severity: string;
  /**
   * trueの場合、アップロード時にこのエラーを無視してアップロードを許可する。
   * 編集画面で補正・追記可能な項目（document id, creator, vendor, owner, date, method id等）に設定。
   * DB保存時はerrorとして記録され、情報が失われない。
   */
  canBeIgnoredOnUpload?: boolean;
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
  element? :any;
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
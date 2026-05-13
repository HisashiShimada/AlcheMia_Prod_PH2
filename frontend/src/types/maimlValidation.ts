

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
  element? :unknown;
  /** ValidationError との互換性のためのインデックスシグネチャ */
  [key: string]: unknown;
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

/**
 * バリデーションエラーの型定義
 * SaveConfirmDialog などで使用するバリデーション結果の1件分
 */
export interface ValidationError {
  type?: string;
  message?: string;
  description?: string;
  xpath?: string;
  /** 参照先テンプレートID */
  ref?: string;
  /** JSON属性 @_ref（xml-js 形式） */
  '@_ref'?: string;
  /** 関連パスリスト */
  paths?: string[];
  [key: string]: unknown;
}

/**
 * バリデーション結果の型定義
 * SaveConfirmDialog などで使用するバリデーション結果全体
 */
export interface ValidationResult {
  errors?: ValidationError[];
  warnings?: ValidationError[];
  corrections?: unknown[];
}

/**
 * ワークフロー検証結果の型定義（validationUtils.ts より移動）
 */
export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

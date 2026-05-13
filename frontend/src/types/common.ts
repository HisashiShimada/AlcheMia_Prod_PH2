/**
 * 共通型定義
 *
 * 複数のレイヤで横断的に使用される汎用型をまとめたファイル。
 */

// ---------------------------------------------------------------------------
// UI汎用型
// ---------------------------------------------------------------------------

/**
 * セレクトボックス用オプション型
 * codeMasterApiService で使用
 */
export interface SelectOption {
  value: number | string;
  label: string;
}

/**
 * システム設定値の型（キー名 → 値）
 * systemConfigApiService で使用
 */
export type SystemConfig = Record<string, string | number | boolean>;

/**
 * 汎用セレクトオプション型（string value限定）
 * Provider/OrganizationManagement などで使用
 */
export interface OptionType {
  label: string;
  value: string;
}

// ---------------------------------------------------------------------------
// デバイス / ビュー種別
// ---------------------------------------------------------------------------

/**
 * デバイス種別
 * viewer/ViewRenderer で使用
 */
export type DeviceType = 'desktop' | 'tablet' | 'mobile';

/**
 * ビュー種別
 * viewer/ViewRenderer で使用
 */
export type ViewType = 'main' | 'edit' | 'experiment' | 'experimentControl';

// ---------------------------------------------------------------------------
// テーマ / タブ
// ---------------------------------------------------------------------------

/**
 * Ant Design テーマトークン型
 * common/SubHeader で使用
 */
export interface ThemeToken {
  colorInfo: string;
  colorBorderSecondary: string;
  paddingXS: number;
  paddingLG: number;
  paddingXL: number;
  marginLG: number;
  fontSizeHeading4: number;
  fontWeightStrong: number;
  fontSize: number;
}

/**
 * タブアイテム型
 * common/SubHeader で使用
 */
export interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// 多言語化
// ---------------------------------------------------------------------------

/**
 * 翻訳データ型
 * contexts/LanguageContext で使用
 */
export type Translations = Record<string, string | Record<string, string>>;

/**
 * ロケール型
 * contexts/LanguageContext で使用
 */
export type Locale = 'ja' | 'en';

/**
 * 言語コンテキスト型
 * contexts/LanguageContext で使用
 */
export interface LanguageContextType {
  locale: Locale;
  translations: Translations;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

// ---------------------------------------------------------------------------
// エラー境界
// ---------------------------------------------------------------------------

/**
 * ErrorBoundary コンポーネントの state 型
 * viewer/ErrorBoundary で使用
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: import('react').ErrorInfo | null;
}

// ---------------------------------------------------------------------------
// フォーム入力バリデーション
// ---------------------------------------------------------------------------

/**
 * フォーム入力バリデーション結果型（validationUtils.ts より移動）
 * ワークフロー検証の ValidationResult とは別物
 */
export interface FormValidationResult {
  /** バリデーションが成功したか */
  isValid: boolean;
  /** エラーメッセージ（バリデーション失敗時のみ） */
  error?: string;
}

// ---------------------------------------------------------------------------
// ロガー
// ---------------------------------------------------------------------------

/**
 * ログエントリ型（consoleLogger.ts より移動）
 */
export interface LogEntry {
  /** 発生日時（ISO 8601） */
  timestamp: string;
  /** ログレベル */
  level: 'log' | 'info' | 'warn' | 'error';
  /** メッセージ文字列 */
  message: string;
  /** 発生URL */
  url: string;
  /** ユーザーエージェント */
  userAgent: string;
  /** スタックトレース（error レベルのみ） */
  stackTrace?: string;
}

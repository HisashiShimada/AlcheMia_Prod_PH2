/**
 * xsi:type に基づくプロパティ値入力バリデーション
 *
 * MAIML の xsi:type 属性値に応じて、プロパティ値の形式チェックを行うユーティリティ。
 *
 * @module xsiTypeValidator
 * @see specification/MaiML-Schema-1_0/maiml-property.xsd
 */

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

/**
 * バリデーション結果
 */
export interface XsiTypeValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

// ===== 型分類定数 =====

/** 整数型（符号あり）*/
const SIGNED_INT_TYPES = ['intType', 'longType', 'shortType', 'byteType'] as const;

/** 整数型（符号なし）*/
const UNSIGNED_INT_TYPES = [
  'unsignedIntType',
  'unsignedLongType',
  'unsignedShortType',
  'unsignedByteType',
] as const;

/** 実数型 */
const FLOAT_TYPES = ['floatType', 'doubleType', 'decimalType'] as const;

/** 文字列型（バリデーションなし） */
const STRING_TYPES = [
  'stringType',
  'tokenType',
  'idType',
  'idRefType',
  'qualifiedNameType',
  'languageType',
] as const;

/** リスト型（スペース区切り文字列として緩やかに許容） */
const LIST_TYPES = [
  'stringListType',
  'tokenListType',
  'idRefListType',
  'qualifiedNameListType',
  'dateTimeListType',
  'decimalListType',
  'doubleListType',
  'floatListType',
  'intListType',
  'longListType',
  'shortListType',
  'byteListType',
  'unsignedIntListType',
  'unsignedLongListType',
  'unsignedShortListType',
  'unsignedByteListType',
  'booleanListType',
  'base64BinaryListType',
  'hexBinaryListType',
  'uriListType',
  'uuidListType',
  'languageListType',
  'stringEnumType',
  // Content 用リスト型
  'contentStringListType',
  'contentDoubleListType',
  'contentFloatListType',
  'contentIntListType',
  'contentBooleanListType',
  'contentStringEnumType',
  'contentUuidListType',
] as const;

/** 範囲制約付き整数型 */
const INT_RANGE_MAP: Record<string, { min: number; max: number }> = {
  shortType:         { min: -32768,    max: 32767 },
  byteType:          { min: -128,      max: 127 },
  unsignedShortType: { min: 0,         max: 65535 },
  unsignedByteType:  { min: 0,         max: 255 },
  unsignedIntType:   { min: 0,         max: 4294967295 },
  unsignedLongType:  { min: 0,         max: Number.MAX_SAFE_INTEGER },
};

// ===== 正規表現 =====

/** 整数（符号あり） */
const INTEGER_REGEX = /^-?\d+$/;

/** 0 以上の整数 */
const UNSIGNED_INTEGER_REGEX = /^\d+$/;

/** 数値（整数・小数・指数表記） */
const NUMERIC_REGEX = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

/** UUID v4 形式 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Base64 */
const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;

/** 16進バイナリ */
const HEX_BINARY_REGEX = /^[0-9a-fA-F]*$/;

// ===== 個別バリデーター =====

function validateSignedInt(xsiType: string, value: string): XsiTypeValidationResult {
  if (!INTEGER_REGEX.test(value)) {
    return { isValid: false, errorMessage: `${xsiType}: 整数値を入力してください（例: 42, -10）` };
  }
  const num = Number(value);
  const range = INT_RANGE_MAP[xsiType];
  if (range && (num < range.min || num > range.max)) {
    return {
      isValid: false,
      errorMessage: `${xsiType}: ${range.min} 〜 ${range.max} の範囲で入力してください`,
    };
  }
  return { isValid: true };
}

function validateUnsignedInt(xsiType: string, value: string): XsiTypeValidationResult {
  if (!UNSIGNED_INTEGER_REGEX.test(value)) {
    return { isValid: false, errorMessage: `${xsiType}: 0以上の整数値を入力してください（例: 0, 42）` };
  }
  const num = Number(value);
  const range = INT_RANGE_MAP[xsiType];
  if (range && (num < range.min || num > range.max)) {
    return {
      isValid: false,
      errorMessage: `${xsiType}: ${range.min} 〜 ${range.max} の範囲で入力してください`,
    };
  }
  return { isValid: true };
}

function validateFloat(xsiType: string, value: string): XsiTypeValidationResult {
  if (!NUMERIC_REGEX.test(value)) {
    return {
      isValid: false,
      errorMessage: `${xsiType}: 数値を入力してください（例: 3.14, -1.5, 1e10）`,
    };
  }
  return { isValid: true };
}

function validateBoolean(_xsiType: string, value: string): XsiTypeValidationResult {
  const lower = value.toLowerCase();
  if (!['true', 'false', '1', '0'].includes(lower)) {
    return {
      isValid: false,
      errorMessage: 'booleanType: "true" / "false"（または "1" / "0"）を入力してください',
    };
  }
  return { isValid: true };
}

/** dateTimeType で許容するフォーマット一覧（strict モードで検証） */
const DATE_TIME_FORMATS = [
  'YYYY-MM-DD HH:mm:ss',
  'YYYY-MM-DDTHH:mm:ss',
  'YYYY-MM-DDTHH:mm:ssZ',
  'YYYY-MM-DDTHH:mm:ss.SSSZ',
  'YYYY-MM-DD HH:mm',
  'YYYY-MM-DDTHH:mm',
  'YYYY-MM-DD',       // 日付のみ形式も dateTimeType として許容
  'YYYY/MM/DD',
] as const;

function validateDateTime(_xsiType: string, value: string): XsiTypeValidationResult {
  // strict モード（第3引数 true）で各フォーマットを試す
  const isValid = DATE_TIME_FORMATS.some((fmt) => dayjs(value, fmt, true).isValid());
  if (!isValid) {
    return {
      isValid: false,
      errorMessage: 'dateTimeType: 有効な日時形式を入力してください（例: 2024-01-15 12:30:00）',
    };
  }
  return { isValid: true };
}

function validateDate(_xsiType: string, value: string): XsiTypeValidationResult {
  const parsed = dayjs(value, ['YYYY-MM-DD', 'YYYY/MM/DD'], true);
  if (!parsed.isValid()) {
    return {
      isValid: false,
      errorMessage: 'dateType: 有効な日付形式を入力してください（例: 2024-01-15）',
    };
  }
  return { isValid: true };
}

function validateUri(_xsiType: string, value: string): XsiTypeValidationResult {
  // http/https URL または相対パスを許容（簡易チェック）
  try {
    new URL(value);
    return { isValid: true };
  } catch {
    // 相対パスは URL コンストラクタで失敗するが許容する
    if (value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) {
      return { isValid: true };
    }
    return {
      isValid: false,
      errorMessage: 'uriType: 有効な URI を入力してください（例: https://example.com/path）',
    };
  }
}

function validateUuid(_xsiType: string, value: string): XsiTypeValidationResult {
  if (!UUID_REGEX.test(value)) {
    return {
      isValid: false,
      errorMessage: 'uuidType: UUID形式で入力してください（例: 550e8400-e29b-41d4-a716-446655440000）',
    };
  }
  return { isValid: true };
}

function validateBase64(_xsiType: string, value: string): XsiTypeValidationResult {
  if (!BASE64_REGEX.test(value)) {
    return {
      isValid: false,
      errorMessage: 'base64BinaryType: Base64エンコードされた文字列を入力してください',
    };
  }
  return { isValid: true };
}

function validateHexBinary(_xsiType: string, value: string): XsiTypeValidationResult {
  if (!HEX_BINARY_REGEX.test(value)) {
    return {
      isValid: false,
      errorMessage: 'hexBinaryType: 16進数文字列を入力してください（例: 1A2B3C）',
    };
  }
  return { isValid: true };
}

// ===== メインバリデーター =====

/**
 * xsi:type に応じて値の形式バリデーションを行う
 *
 * @param xsiType - xsi:type の値（例: 'intType', 'floatType'）
 * @param value - 検証対象の値（文字列）
 * @returns バリデーション結果
 *
 * @example
 * validateByXsiType('intType', '42')   // { isValid: true }
 * validateByXsiType('intType', 'abc')  // { isValid: false, errorMessage: '...' }
 */
export function validateByXsiType(xsiType: string, value: string): XsiTypeValidationResult {
  // 空文字列は必須チェックではなく型チェックでは無視する
  if (value === '' || value === null || value === undefined) {
    return { isValid: true };
  }

  // ----- 符号あり整数型 -----
  if ((SIGNED_INT_TYPES as readonly string[]).includes(xsiType)) {
    return validateSignedInt(xsiType, value);
  }

  // ----- 符号なし整数型 -----
  if ((UNSIGNED_INT_TYPES as readonly string[]).includes(xsiType)) {
    return validateUnsignedInt(xsiType, value);
  }

  // ----- 実数型 -----
  if ((FLOAT_TYPES as readonly string[]).includes(xsiType)) {
    return validateFloat(xsiType, value);
  }

  // ----- 真偽値型 -----
  if (xsiType === 'booleanType') {
    return validateBoolean(xsiType, value);
  }

  // ----- 日時型 -----
  if (xsiType === 'dateTimeType') {
    return validateDateTime(xsiType, value);
  }

  // ----- 日付型 -----
  if (xsiType === 'dateType') {
    return validateDate(xsiType, value);
  }

  // ----- URI型 -----
  if (xsiType === 'uriType') {
    return validateUri(xsiType, value);
  }

  // ----- UUID型 -----
  if (xsiType === 'uuidType') {
    return validateUuid(xsiType, value);
  }

  // ----- Base64バイナリ型 -----
  if (xsiType === 'base64BinaryType') {
    return validateBase64(xsiType, value);
  }

  // ----- 16進バイナリ型 -----
  if (xsiType === 'hexBinaryType') {
    return validateHexBinary(xsiType, value);
  }

  // ----- 文字列型（バリデーションなし） -----
  if ((STRING_TYPES as readonly string[]).includes(xsiType)) {
    return { isValid: true };
  }

  // ----- リスト型（緩やかに許容） -----
  if ((LIST_TYPES as readonly string[]).includes(xsiType)) {
    return { isValid: true };
  }

  // ----- propertyListType（子要素で管理するためバリデーションなし） -----
  if (xsiType === 'propertyListType') {
    return { isValid: true };
  }

  // ----- 未知の型（フォールバック: 許容） -----
  return { isValid: true };
}

/**
 * xsi:type が数値系（整数・実数）かどうかを返す
 *
 * NestedPropertyEditor の入力コンポーネント切り替えで使用する。
 */
export function isNumericXsiType(xsiType: string): boolean {
  return (
    (SIGNED_INT_TYPES as readonly string[]).includes(xsiType) ||
    (UNSIGNED_INT_TYPES as readonly string[]).includes(xsiType) ||
    (FLOAT_TYPES as readonly string[]).includes(xsiType)
  );
}

/**
 * xsi:type が整数系かどうかを返す
 */
export function isIntegerXsiType(xsiType: string): boolean {
  return (
    (SIGNED_INT_TYPES as readonly string[]).includes(xsiType) ||
    (UNSIGNED_INT_TYPES as readonly string[]).includes(xsiType)
  );
}

/**
 * xsi:type が符号なし整数型かどうかを返す
 */
export function isUnsignedIntXsiType(xsiType: string): boolean {
  return (UNSIGNED_INT_TYPES as readonly string[]).includes(xsiType);
}

/**
 * xsi:type がリスト型かどうかを返す
 */
export function isListXsiType(xsiType: string): boolean {
  return (LIST_TYPES as readonly string[]).includes(xsiType);
}

/**
 * xsi:type の日本語ラベルを返す（エラーメッセージ等で使用）
 */
export function getXsiTypeLabel(xsiType: string): string {
  const labelMap: Record<string, string> = {
    intType: '整数',
    longType: '長整数',
    shortType: '短整数',
    byteType: 'バイト整数',
    unsignedIntType: '符号なし整数',
    unsignedLongType: '符号なし長整数',
    unsignedShortType: '符号なし短整数',
    unsignedByteType: '符号なしバイト整数',
    floatType: '単精度実数',
    doubleType: '倍精度実数',
    decimalType: '10進数',
    booleanType: '真偽値',
    dateTimeType: '日時',
    dateType: '日付',
    stringType: '文字列',
    tokenType: 'トークン',
    idType: 'ID',
    uriType: 'URI',
    uuidType: 'UUID',
    base64BinaryType: 'Base64バイナリ',
    hexBinaryType: '16進バイナリ',
    propertyListType: 'プロパティリスト',
  };
  return labelMap[xsiType] ?? xsiType;
}

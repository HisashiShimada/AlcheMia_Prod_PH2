/**
 * MAIML型ガード関数
 * 
 * Property型の動的な型判別を型安全に行うためのユーティリティ関数群
 * TypeScriptの型ガード機能を活用して、実行時の型チェックとコンパイル時の型推論を両立
 * 
 * @see frontend/src/types/maiml-unified.ts
 * @version 1.0.0
 * @date 2026-02-02
 */

import type {
  Property,
  PropertyType,
} from './maiml-unified';

// ============================================================================
// 文字列型Property判定
// ============================================================================

/**
 * String型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns StringPropertyであればtrue
 */
export function isStringProperty(property: Property): property is Property & { 'xsi:type': 'stringType' } {
  return property['xsi:type'] === 'stringType';
}

/**
 * Token型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns TokenPropertyであればtrue
 */
export function isTokenProperty(property: Property): property is Property & { 'xsi:type': 'tokenType' } {
  return property['xsi:type'] === 'tokenType';
}

/**
 * ID型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns IdPropertyであればtrue
 */
export function isIdProperty(property: Property): property is Property & { 'xsi:type': 'idType' } {
  return property['xsi:type'] === 'idType';
}

/**
 * IDRef型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns IdRefPropertyであればtrue
 */
export function isIdRefProperty(property: Property): property is Property & { 'xsi:type': 'idRefType' } {
  return property['xsi:type'] === 'idRefType';
}

/**
 * QualifiedName型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns QualifiedNamePropertyであればtrue
 */
export function isQualifiedNameProperty(property: Property): property is Property & { 'xsi:type': 'qualifiedNameType' } {
  return property['xsi:type'] === 'qualifiedNameType';
}

// ============================================================================
// 整数型Property判定
// ============================================================================

/**
 * Int型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns IntPropertyであればtrue
 */
export function isIntProperty(property: Property): property is Property & { 'xsi:type': 'intType' } {
  return property['xsi:type'] === 'intType';
}

/**
 * Long型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns LongPropertyであればtrue
 */
export function isLongProperty(property: Property): property is Property & { 'xsi:type': 'longType' } {
  return property['xsi:type'] === 'longType';
}

/**
 * Short型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns ShortPropertyであればtrue
 */
export function isShortProperty(property: Property): property is Property & { 'xsi:type': 'shortType' } {
  return property['xsi:type'] === 'shortType';
}

/**
 * Byte型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns BytePropertyであればtrue
 */
export function isByteProperty(property: Property): property is Property & { 'xsi:type': 'byteType' } {
  return property['xsi:type'] === 'byteType';
}

/**
 * UnsignedInt型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns UnsignedIntPropertyであればtrue
 */
export function isUnsignedIntProperty(property: Property): property is Property & { 'xsi:type': 'unsignedIntType' } {
  return property['xsi:type'] === 'unsignedIntType';
}

/**
 * UnsignedLong型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns UnsignedLongPropertyであればtrue
 */
export function isUnsignedLongProperty(property: Property): property is Property & { 'xsi:type': 'unsignedLongType' } {
  return property['xsi:type'] === 'unsignedLongType';
}

/**
 * UnsignedShort型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns UnsignedShortPropertyであればtrue
 */
export function isUnsignedShortProperty(property: Property): property is Property & { 'xsi:type': 'unsignedShortType' } {
  return property['xsi:type'] === 'unsignedShortType';
}

/**
 * UnsignedByte型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns UnsignedBytePropertyであればtrue
 */
export function isUnsignedByteProperty(property: Property): property is Property & { 'xsi:type': 'unsignedByteType' } {
  return property['xsi:type'] === 'unsignedByteType';
}

// ============================================================================
// 浮動小数点型Property判定
// ============================================================================

/**
 * Float型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns FloatPropertyであればtrue
 */
export function isFloatProperty(property: Property): property is Property & { 'xsi:type': 'floatType' } {
  return property['xsi:type'] === 'floatType';
}

/**
 * Double型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns DoublePropertyであればtrue
 */
export function isDoubleProperty(property: Property): property is Property & { 'xsi:type': 'doubleType' } {
  return property['xsi:type'] === 'doubleType';
}

/**
 * Decimal型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns DecimalPropertyであればtrue
 */
export function isDecimalProperty(property: Property): property is Property & { 'xsi:type': 'decimalType' } {
  return property['xsi:type'] === 'decimalType';
}

// ============================================================================
// その他の型Property判定
// ============================================================================

/**
 * Boolean型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns BooleanPropertyであればtrue
 */
export function isBooleanProperty(property: Property): property is Property & { 'xsi:type': 'booleanType' } {
  return property['xsi:type'] === 'booleanType';
}

/**
 * DateTime型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns DateTimePropertyであればtrue
 */
export function isDateTimeProperty(property: Property): property is Property & { 'xsi:type': 'dateTimeType' } {
  return property['xsi:type'] === 'dateTimeType';
}

/**
 * URI型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns UriPropertyであればtrue
 */
export function isUriProperty(property: Property): property is Property & { 'xsi:type': 'uriType' } {
  return property['xsi:type'] === 'uriType';
}

/**
 * UUID型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns UuidPropertyであればtrue
 */
export function isUuidProperty(property: Property): property is Property & { 'xsi:type': 'uuidType' } {
  return property['xsi:type'] === 'uuidType';
}

/**
 * Base64Binary型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns Base64BinaryPropertyであればtrue
 */
export function isBase64BinaryProperty(property: Property): property is Property & { 'xsi:type': 'base64BinaryType' } {
  return property['xsi:type'] === 'base64BinaryType';
}

/**
 * HexBinary型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns HexBinaryPropertyであればtrue
 */
export function isHexBinaryProperty(property: Property): property is Property & { 'xsi:type': 'hexBinaryType' } {
  return property['xsi:type'] === 'hexBinaryType';
}

/**
 * Language型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns LanguagePropertyであればtrue
 */
export function isLanguageProperty(property: Property): property is Property & { 'xsi:type': 'languageType' } {
  return property['xsi:type'] === 'languageType';
}

/**
 * PropertyList型Propertyかどうかを判定（ネスト構造対応）
 * @param property 判定対象のProperty
 * @returns PropertyListPropertyであればtrue
 */
export function isPropertyListProperty(property: Property): property is Property & { 'xsi:type': 'propertyListType' } {
  return property['xsi:type'] === 'propertyListType';
}

// ============================================================================
// リスト型Property判定
// ============================================================================

/**
 * StringList型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns StringListPropertyであればtrue
 */
export function isStringListProperty(property: Property): property is Property & { 'xsi:type': 'stringListType' } {
  return property['xsi:type'] === 'stringListType';
}

/**
 * IntList型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns IntListPropertyであればtrue
 */
export function isIntListProperty(property: Property): property is Property & { 'xsi:type': 'intListType' } {
  return property['xsi:type'] === 'intListType';
}

/**
 * DoubleList型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns DoubleListPropertyであればtrue
 */
export function isDoubleListProperty(property: Property): property is Property & { 'xsi:type': 'doubleListType' } {
  return property['xsi:type'] === 'doubleListType';
}

/**
 * BooleanList型Propertyかどうかを判定
 * @param property 判定対象のProperty
 * @returns BooleanListPropertyであればtrue
 */
export function isBooleanListProperty(property: Property): property is Property & { 'xsi:type': 'booleanListType' } {
  return property['xsi:type'] === 'booleanListType';
}

// ============================================================================
// カテゴリ別型判定（便利関数）
// ============================================================================

/**
 * 数値型Propertyかどうかを判定（Int, Long, Short, Byte, UnsignedInt, UnsignedLong, UnsignedShort, UnsignedByte, Float, Double, Decimalのいずれか）
 * @param property 判定対象のProperty
 * @returns 数値型Propertyであればtrue
 */
export function isNumberProperty(property: Property): boolean {
  const numberTypes: PropertyType[] = [
    'intType',
    'longType',
    'shortType',
    'byteType',
    'unsignedIntType',
    'unsignedLongType',
    'unsignedShortType',
    'unsignedByteType',
    'floatType',
    'doubleType',
    'decimalType',
  ];
  return numberTypes.includes(property['xsi:type']);
}

/**
 * 整数型Propertyかどうかを判定（Int, Long, Short, Byte, UnsignedInt, UnsignedLong, UnsignedShort, UnsignedByteのいずれか）
 * @param property 判定対象のProperty
 * @returns 整数型Propertyであればtrue
 */
export function isIntegerProperty(property: Property): boolean {
  const integerTypes: PropertyType[] = [
    'intType',
    'longType',
    'shortType',
    'byteType',
    'unsignedIntType',
    'unsignedLongType',
    'unsignedShortType',
    'unsignedByteType',
  ];
  return integerTypes.includes(property['xsi:type']);
}

/**
 * 浮動小数点型Propertyかどうかを判定（Float, Double, Decimalのいずれか）
 * @param property 判定対象のProperty
 * @returns 浮動小数点型Propertyであればtrue
 */
export function isFloatingPointProperty(property: Property): boolean {
  const floatTypes: PropertyType[] = ['floatType', 'doubleType', 'decimalType'];
  return floatTypes.includes(property['xsi:type']);
}

/**
 * 文字列系Propertyかどうかを判定（String, Token, ID, IDRef, QualifiedName, URI, UUID, Languageのいずれか）
 * @param property 判定対象のProperty
 * @returns 文字列系Propertyであればtrue
 */
export function isStringLikeProperty(property: Property): boolean {
  const stringTypes: PropertyType[] = [
    'stringType',
    'tokenType',
    'idType',
    'idRefType',
    'qualifiedNameType',
    'uriType',
    'uuidType',
    'languageType',
  ];
  return stringTypes.includes(property['xsi:type']);
}

/**
 * バイナリ型Propertyかどうかを判定（Base64Binary, HexBinaryのいずれか）
 * @param property 判定対象のProperty
 * @returns バイナリ型Propertyであればtrue
 */
export function isBinaryProperty(property: Property): boolean {
  const binaryTypes: PropertyType[] = ['base64BinaryType', 'hexBinaryType'];
  return binaryTypes.includes(property['xsi:type']);
}

/**
 * リスト型Propertyかどうかを判定（PropertyList, StringList, IntList, DoubleList, BooleanListのいずれか）
 * @param property 判定対象のProperty
 * @returns リスト型Propertyであればtrue
 */
export function isListProperty(property: Property): boolean {
  const listTypes: PropertyType[] = [
    'propertyListType',
    'stringListType',
    'intListType',
    'doubleListType',
    'booleanListType',
  ];
  return listTypes.includes(property['xsi:type']);
}

// ============================================================================
// 値抽出ヘルパー関数
// ============================================================================

/**
 * Propertyから値を安全に抽出
 * 型に応じて適切な値を返す
 * @param property 対象Property
 * @returns 抽出された値（型に応じてstring, number, boolean, Property[], string[], number[], boolean[], undefinedのいずれか）
 */
export function extractPropertyValue(
  property: Property
): string | number | boolean | Property[] | string[] | number[] | boolean[] | undefined {
  if (isPropertyListProperty(property)) {
    return property.properties;
  } else if (isStringListProperty(property)) {
    return property.values as string[];
  } else if (isIntListProperty(property) || isDoubleListProperty(property)) {
    return property.values as number[];
  } else if (isBooleanListProperty(property)) {
    return property.values as boolean[];
  } else if (isStringLikeProperty(property) || isDateTimeProperty(property) || isBinaryProperty(property) || isUriProperty(property) || isUuidProperty(property) || isLanguageProperty(property)) {
    return property.value as string;
  } else if (isNumberProperty(property)) {
    return property.value as number;
  } else if (isBooleanProperty(property)) {
    return property.value as boolean;
  }
  return undefined;
}

/**
 * Propertyから文字列値を安全に取得
 * 数値や真偽値も文字列に変換して返す
 * @param property 対象Property
 * @returns 文字列値（取得できない場合は空文字列）
 */
export function getPropertyValueAsString(property: Property): string {
  const value = extractPropertyValue(property);
  if (value === undefined || value === null) {
    return '';
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Propertyから数値を安全に取得
 * @param property 対象Property
 * @returns 数値（取得できない場合はundefined）
 */
export function getPropertyValueAsNumber(property: Property): number | undefined {
  if (!isNumberProperty(property)) {
    return undefined;
  }
  return property.value as number;
}

/**
 * Propertyから真偽値を安全に取得
 * @param property 対象Property
 * @returns 真偽値（取得できない場合はundefined）
 */
export function getPropertyValueAsBoolean(property: Property): boolean | undefined {
  if (!isBooleanProperty(property)) {
    return undefined;
  }
  return property.value as boolean;
}

/**
 * Propertyの単位を取得
 * @param property 対象Property
 * @returns 単位文字列（単位がない場合はundefined）
 */
export function getPropertyUnit(property: Property): string | undefined {
  if (isNumberProperty(property)) {
    return property.units;
  }
  return undefined;
}

/**
 * Propertyの説明を取得
 * @param property 対象Property
 * @returns 説明文字列（説明がない場合はundefined）
 */
export function getPropertyDescription(property: Property): string | undefined {
  return property.description;
}
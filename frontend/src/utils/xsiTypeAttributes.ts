/**
 * xsi:type ごとに許可される追加属性の定義
 *
 * MaiML XSD仕様（docs/design/maiml/maiml-property.xsd）に基づき、
 * 各 xsi:type に対して設定可能な属性名一覧を定義する。
 *
 * @module xsiTypeAttributes
 * @see docs/design/maiml/maiml-property.xsd
 */

/**
 * xsi:type ごとに許可される追加属性名セット（固定属性のみ対象）
 *
 * - 数値型: units / formatString / scaleFactor が使用可能
 * - dateTimeType / dateTimeListType: formatString のみ使用可能
 * - 文字列型・boolean等その他: 許可属性なし
 * - propertyListType: 許可属性なし
 */
export const ALLOWED_ATTRIBUTES_BY_XSI_TYPE: Readonly<Record<string, readonly string[]>> = {
  // ===== 数値型: units / formatString / scaleFactor =====
  decimalType:         ['units', 'formatString', 'scaleFactor'],
  doubleType:          ['units', 'formatString', 'scaleFactor'],
  floatType:           ['units', 'formatString', 'scaleFactor'],
  intType:             ['units', 'formatString', 'scaleFactor'],
  longType:            ['units', 'formatString', 'scaleFactor'],
  shortType:           ['units', 'formatString', 'scaleFactor'],
  byteType:            ['units', 'formatString', 'scaleFactor'],
  unsignedIntType:     ['units', 'formatString', 'scaleFactor'],
  unsignedLongType:    ['units', 'formatString', 'scaleFactor'],
  unsignedShortType:   ['units', 'formatString', 'scaleFactor'],
  unsignedByteType:    ['units', 'formatString', 'scaleFactor'],

  // ===== 数値リスト型: units / formatString / scaleFactor =====
  decimalListType:         ['units', 'formatString', 'scaleFactor'],
  doubleListType:          ['units', 'formatString', 'scaleFactor'],
  floatListType:           ['units', 'formatString', 'scaleFactor'],
  intListType:             ['units', 'formatString', 'scaleFactor'],
  longListType:            ['units', 'formatString', 'scaleFactor'],
  shortListType:           ['units', 'formatString', 'scaleFactor'],
  byteListType:            ['units', 'formatString', 'scaleFactor'],
  unsignedIntListType:     ['units', 'formatString', 'scaleFactor'],
  unsignedLongListType:    ['units', 'formatString', 'scaleFactor'],
  unsignedShortListType:   ['units', 'formatString', 'scaleFactor'],
  unsignedByteListType:    ['units', 'formatString', 'scaleFactor'],

  // ===== 日時型: formatString のみ =====
  dateTimeType:     ['formatString'],
  dateTimeListType: ['formatString'],

  // ===== 文字列型・その他: 許可属性なし =====
  stringType:          [],
  tokenType:           [],
  idType:              [],
  idRefType:           [],
  qualifiedNameType:   [],
  uriType:             [],
  uuidType:            [],
  languageType:        [],
  booleanType:         [],
  base64BinaryType:    [],
  hexBinaryType:       [],
  stringEnumType:      [],
  dateType:            [],

  // ===== 文字列リスト型: 許可属性なし =====
  stringListType:          [],
  tokenListType:           [],
  idRefListType:           [],
  qualifiedNameListType:   [],
  uriListType:             [],
  uuidListType:            [],
  languageListType:        [],
  booleanListType:         [],
  base64BinaryListType:    [],
  hexBinaryListType:       [],

  // ===== propertyListType: 許可属性なし =====
  propertyListType: [],

  // ===== Content専用型 =====
  contentStringListType:  [],
  contentDoubleListType:  ['units', 'formatString', 'scaleFactor'],
  contentFloatListType:   ['units', 'formatString', 'scaleFactor'],
  contentIntListType:     ['units', 'formatString', 'scaleFactor'],
  contentBooleanListType: [],
  contentStringEnumType:  [],
  contentUuidListType:    [],
};

/**
 * 指定した xsi:type に対して許可される追加属性名一覧を返す
 *
 * @param xsiType - xsi:type の値（例: 'doubleType', 'stringType'）
 * @returns
 *   - `null`   : 型未指定または未知の型 → 制限なし（固定属性すべて表示）
 *   - `string[]`: 許可される属性名一覧（空配列の場合は固定追加属性を非表示）
 *
 * @example
 * getAllowedAttributeNames('doubleType')
 * // → ['units', 'formatString', 'scaleFactor']
 *
 * getAllowedAttributeNames('stringType')
 * // → []
 *
 * getAllowedAttributeNames(undefined)
 * // → null  （制限なし）
 *
 * getAllowedAttributeNames('customUnknownType')
 * // → null  （未知の型は制限しない）
 */
export function getAllowedAttributeNames(xsiType: string | undefined): string[] | null {
  if (!xsiType) return null; // 型未指定 → 制限なし
  const allowed = ALLOWED_ATTRIBUTES_BY_XSI_TYPE[xsiType];
  if (allowed === undefined) return null; // 未知の型 → 制限なし
  return [...allowed];
}

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

// ===== MaiML property タイプ一覧 =====

/**
 * MaiML property タイプ定義の型
 */
export interface MaimlPropertyTypeOption {
  value: string;
  label: string;
  category: 'Simple' | 'List';
}

/**
 * MaiMLスキーマで定義されているpropertyタイプ一覧
 *
 * @remarks
 * NestedPropertyEditor / NamespaceMain など複数コンポーネントで共有する共通定数。
 * 追加・変更時はここだけを修正すること。
 *
 * @see specification/MaiML-Schema-1_0/maiml-property.xsd
 */
export const MAIML_PROPERTY_TYPES: MaimlPropertyTypeOption[] = [
  // Simple Types
  { value: 'stringType',        label: 'stringType - 文字列',              category: 'Simple' },
  { value: 'tokenType',         label: 'tokenType - トークン',              category: 'Simple' },
  { value: 'idType',            label: 'idType - ID',                       category: 'Simple' },
  { value: 'idRefType',         label: 'idRefType - ID参照',                category: 'Simple' },
  { value: 'qualifiedNameType', label: 'qualifiedNameType - 修飾名',        category: 'Simple' },
  { value: 'dateTimeType',      label: 'dateTimeType - 日時',               category: 'Simple' },
  { value: 'decimalType',       label: 'decimalType - 10進数',              category: 'Simple' },
  { value: 'doubleType',        label: 'doubleType - 倍精度実数',           category: 'Simple' },
  { value: 'floatType',         label: 'floatType - 単精度実数',            category: 'Simple' },
  { value: 'intType',           label: 'intType - 整数',                    category: 'Simple' },
  { value: 'longType',          label: 'longType - 長整数',                 category: 'Simple' },
  { value: 'shortType',         label: 'shortType - 短整数',                category: 'Simple' },
  { value: 'byteType',          label: 'byteType - バイト',                 category: 'Simple' },
  { value: 'unsignedIntType',   label: 'unsignedIntType - 符号なし整数',    category: 'Simple' },
  { value: 'unsignedLongType',  label: 'unsignedLongType - 符号なし長整数', category: 'Simple' },
  { value: 'unsignedShortType', label: 'unsignedShortType - 符号なし短整数', category: 'Simple' },
  { value: 'unsignedByteType',  label: 'unsignedByteType - 符号なしバイト', category: 'Simple' },
  { value: 'booleanType',       label: 'booleanType - 真偽値',              category: 'Simple' },
  { value: 'base64BinaryType',  label: 'base64BinaryType - Base64バイナリ', category: 'Simple' },
  { value: 'hexBinaryType',     label: 'hexBinaryType - 16進バイナリ',      category: 'Simple' },
  { value: 'uriType',           label: 'uriType - URI',                     category: 'Simple' },
  { value: 'uuidType',          label: 'uuidType - UUID',                   category: 'Simple' },
  { value: 'languageType',      label: 'languageType - 言語',               category: 'Simple' },
  // List Types
  { value: 'propertyListType',      label: 'propertyListType - プロパティリスト（子要素を持つ）', category: 'List' },
  { value: 'stringListType',        label: 'stringListType - 文字列リスト',               category: 'List' },
  { value: 'idRefListType',         label: 'idRefListType - ID参照リスト',                category: 'List' },
  { value: 'qualifiedNameListType', label: 'qualifiedNameListType - 修飾名リスト',         category: 'List' },
  { value: 'dateTimeListType',      label: 'dateTimeListType - 日時リスト',               category: 'List' },
  { value: 'decimalListType',       label: 'decimalListType - 10進数リスト',              category: 'List' },
  { value: 'doubleListType',        label: 'doubleListType - 倍精度実数リスト',           category: 'List' },
  { value: 'floatListType',         label: 'floatListType - 単精度実数リスト',            category: 'List' },
  { value: 'intListType',           label: 'intListType - 整数リスト',                    category: 'List' },
  { value: 'longListType',          label: 'longListType - 長整数リスト',                 category: 'List' },
  { value: 'shortListType',         label: 'shortListType - 短整数リスト',                category: 'List' },
  { value: 'byteListType',          label: 'byteListType - バイトリスト',                 category: 'List' },
  { value: 'unsignedIntListType',   label: 'unsignedIntListType - 符号なし整数リスト',    category: 'List' },
  { value: 'unsignedLongListType',  label: 'unsignedLongListType - 符号なし長整数リスト', category: 'List' },
  { value: 'unsignedShortListType', label: 'unsignedShortListType - 符号なし短整数リスト', category: 'List' },
  { value: 'unsignedByteListType',  label: 'unsignedByteListType - 符号なしバイトリスト', category: 'List' },
  { value: 'booleanListType',       label: 'booleanListType - 真偽値リスト',              category: 'List' },
  { value: 'base64BinaryListType',  label: 'base64BinaryListType - Base64バイナリリスト', category: 'List' },
  { value: 'hexBinaryListType',     label: 'hexBinaryListType - 16進バイナリリスト',      category: 'List' },
  { value: 'uriListType',           label: 'uriListType - URIリスト',                     category: 'List' },
  { value: 'uuidListType',          label: 'uuidListType - UUIDリスト',                   category: 'List' },
  { value: 'languageListType',      label: 'languageListType - 言語リスト',               category: 'List' },
  { value: 'stringEnumType',        label: 'stringEnumType - 文字列列挙',                 category: 'List' },
];

/**
 * MaiML content タグ向け xsi:type 選択肢
 *
 * @remarks
 * DataRecordDialog の KNOWN_CONTENT_TYPES と一致させること。
 */
export const MAIML_CONTENT_TYPES: Array<{ value: string; label: string }> = [
  { value: 'contentStringListType',      label: 'contentStringListType - 文字列リスト' },
  { value: 'contentIntListType',         label: 'contentIntListType - 整数リスト' },
  { value: 'contentLongListType',        label: 'contentLongListType - 長整数リスト' },
  { value: 'contentShortListType',       label: 'contentShortListType - 短整数リスト' },
  { value: 'contentByteListType',        label: 'contentByteListType - バイトリスト' },
  { value: 'contentUnsignedIntListType', label: 'contentUnsignedIntListType - 符号なし整数リスト' },
  { value: 'contentFloatListType',       label: 'contentFloatListType - 単精度実数リスト' },
  { value: 'contentDoubleListType',      label: 'contentDoubleListType - 倍精度実数リスト' },
  { value: 'contentDecimalListType',     label: 'contentDecimalListType - 10進数リスト' },
  { value: 'contentBooleanListType',     label: 'contentBooleanListType - 真偽値リスト' },
  { value: 'contentDateTimeListType',    label: 'contentDateTimeListType - 日時リスト' },
];

// ===== ヘルパー関数 =====

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

/**
 * 指定した xsi:type に対して units 属性が許可されるかどうかを返す
 *
 * @param xsiType - xsi:type の値（例: 'doubleType', 'stringType'）
 * @returns
 *   - `true`  : units 属性が許可される（数値型・数値リスト型など）
 *   - `false` : units 属性が許可されない（文字列型・boolean型など）
 *
 * @remarks
 * NamespaceMain の単位入力フィールド制御に使用する。
 * 型未指定・未知の型の場合は制限しない（true を返す）。
 *
 * @example
 * isUnitAllowed('doubleType')   // → true
 * isUnitAllowed('stringType')   // → false
 * isUnitAllowed('booleanType')  // → false
 * isUnitAllowed(undefined)      // → true（制限なし）
 */
export function isUnitAllowed(xsiType: string | undefined): boolean {
  const allowed = getAllowedAttributeNames(xsiType);
  if (allowed === null) return true; // 未知の型・未指定 → 制限なし
  return allowed.includes('units');
}

/**
 * units 属性が許可される property タイプのみに絞り込んだ選択肢
 *
 * @remarks
 * UncertaintyCreateModal / UncertaintyDetailModal の xsi:type セレクトで使用する。
 * 不確かさ基準は数値として測定された property に適用するため、units が使用できる型のみに限定する。
 * MAIML_PROPERTY_TYPES と isUnitAllowed() から自動導出することで DRY を維持する。
 *
 * 含まれる型:
 *   - Simple 数値型 11種: decimalType, doubleType, floatType, intType, longType, shortType,
 *                         byteType, unsignedIntType, unsignedLongType, unsignedShortType, unsignedByteType
 *   - List 数値型 11種: 上記の ～ListType 形式
 *
 * @see MAIML_PROPERTY_TYPES
 * @see isUnitAllowed
 */
export const NUMERIC_PROPERTY_TYPES: Array<{ value: string; label: string; category: 'Simple' | 'List' }> =
  MAIML_PROPERTY_TYPES.filter((t) => isUnitAllowed(t.value));

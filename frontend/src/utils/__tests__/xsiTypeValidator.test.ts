/**
 * xsiTypeValidator のユニットテスト
 */

import {
  validateByXsiType,
  isNumericXsiType,
  isIntegerXsiType,
  isUnsignedIntXsiType,
  isListXsiType,
  getXsiTypeLabel,
} from '../xsiTypeValidator';

// ===== validateByXsiType =====

describe('validateByXsiType', () => {
  // ----- 空値は常に valid -----
  describe('空値は型チェックをスキップする', () => {
    test.each([
      ['intType', ''],
      ['floatType', ''],
      ['booleanType', ''],
      ['uuidType', ''],
    ])('xsiType=%s, value="" → isValid: true', (xsiType, value) => {
      expect(validateByXsiType(xsiType, value).isValid).toBe(true);
    });
  });

  // ----- intType -----
  describe('intType', () => {
    test.each([
      ['0', true],
      ['42', true],
      ['-10', true],
      ['2147483647', true],
      ['-2147483648', true],
    ])('正常系: "%s" → isValid: true', (value, expected) => {
      expect(validateByXsiType('intType', value).isValid).toBe(expected);
    });

    test.each([
      ['abc'],
      ['3.14'],
      ['1e5'],
      ['1.0'],
      [' 1'],
      ['1 '],
    ])('異常系: "%s" → isValid: false', (value) => {
      const result = validateByXsiType('intType', value);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });
  });

  // ----- longType -----
  describe('longType', () => {
    test('正常系: "9999999999" → isValid: true', () => {
      expect(validateByXsiType('longType', '9999999999').isValid).toBe(true);
    });
    test('異常系: "3.14" → isValid: false', () => {
      expect(validateByXsiType('longType', '3.14').isValid).toBe(false);
    });
  });

  // ----- shortType（範囲チェック）-----
  describe('shortType', () => {
    test.each([
      ['0', true],
      ['-32768', true],
      ['32767', true],
    ])('正常系: "%s" → isValid: true', (value, expected) => {
      expect(validateByXsiType('shortType', value).isValid).toBe(expected);
    });

    test.each([
      ['-32769'],
      ['32768'],
    ])('異常系（範囲外）: "%s" → isValid: false', (value) => {
      expect(validateByXsiType('shortType', value).isValid).toBe(false);
    });
  });

  // ----- byteType（範囲チェック）-----
  describe('byteType', () => {
    test.each([
      ['-128', true],
      ['127', true],
      ['0', true],
    ])('正常系: "%s" → isValid: true', (value, expected) => {
      expect(validateByXsiType('byteType', value).isValid).toBe(expected);
    });

    test.each([
      ['-129'],
      ['128'],
    ])('異常系（範囲外）: "%s" → isValid: false', (value) => {
      expect(validateByXsiType('byteType', value).isValid).toBe(false);
    });
  });

  // ----- unsignedIntType -----
  describe('unsignedIntType', () => {
    test.each([
      ['0', true],
      ['42', true],
      ['4294967295', true],
    ])('正常系: "%s" → isValid: true', (value, expected) => {
      expect(validateByXsiType('unsignedIntType', value).isValid).toBe(expected);
    });

    test.each([
      ['-1'],
      ['abc'],
      ['3.14'],
    ])('異常系: "%s" → isValid: false', (value) => {
      expect(validateByXsiType('unsignedIntType', value).isValid).toBe(false);
    });
  });

  // ----- unsignedByteType（範囲チェック）-----
  describe('unsignedByteType', () => {
    test.each([
      ['0', true],
      ['255', true],
    ])('正常系: "%s" → isValid: true', (value, expected) => {
      expect(validateByXsiType('unsignedByteType', value).isValid).toBe(expected);
    });

    test.each([
      ['-1'],
      ['256'],
    ])('異常系（範囲外）: "%s" → isValid: false', (value) => {
      expect(validateByXsiType('unsignedByteType', value).isValid).toBe(false);
    });
  });

  // ----- unsignedShortType（範囲チェック）-----
  describe('unsignedShortType', () => {
    test.each([
      ['0', true],
      ['65535', true],
    ])('正常系: "%s" → isValid: true', (value, expected) => {
      expect(validateByXsiType('unsignedShortType', value).isValid).toBe(expected);
    });

    test.each([
      ['-1'],
      ['65536'],
    ])('異常系（範囲外）: "%s" → isValid: false', (value) => {
      expect(validateByXsiType('unsignedShortType', value).isValid).toBe(false);
    });
  });

  // ----- floatType -----
  describe('floatType', () => {
    test.each([
      ['3.14', true],
      ['-1.5', true],
      ['0', true],
      ['1e10', true],
      ['1.5e-3', true],
      ['-2.0E+8', true],
    ])('正常系: "%s" → isValid: true', (value, expected) => {
      expect(validateByXsiType('floatType', value).isValid).toBe(expected);
    });

    test.each([
      ['abc'],
      ['1.2.3'],
      ['hello'],
    ])('異常系: "%s" → isValid: false', (value) => {
      expect(validateByXsiType('floatType', value).isValid).toBe(false);
    });
  });

  // ----- doubleType -----
  describe('doubleType', () => {
    test('正常系: "3.14159265358979" → isValid: true', () => {
      expect(validateByXsiType('doubleType', '3.14159265358979').isValid).toBe(true);
    });
    test('異常系: "not_a_number" → isValid: false', () => {
      expect(validateByXsiType('doubleType', 'not_a_number').isValid).toBe(false);
    });
  });

  // ----- decimalType -----
  describe('decimalType', () => {
    test('正常系: "100.00" → isValid: true', () => {
      expect(validateByXsiType('decimalType', '100.00').isValid).toBe(true);
    });
    test('異常系: "abc" → isValid: false', () => {
      expect(validateByXsiType('decimalType', 'abc').isValid).toBe(false);
    });
  });

  // ----- booleanType -----
  describe('booleanType', () => {
    test.each([
      ['true', true],
      ['false', true],
      ['True', true],
      ['False', true],
      ['TRUE', true],
      ['1', true],
      ['0', true],
    ])('正常系: "%s" → isValid: true', (value, expected) => {
      expect(validateByXsiType('booleanType', value).isValid).toBe(expected);
    });

    test.each([
      ['yes'],
      ['no'],
      ['on'],
      ['off'],
      ['abc'],
      ['2'],
    ])('異常系: "%s" → isValid: false', (value) => {
      expect(validateByXsiType('booleanType', value).isValid).toBe(false);
    });
  });

  // ----- dateTimeType -----
  describe('dateTimeType', () => {
    test.each([
      ['2024-01-15 12:30:00', true],
      ['2024-01-15T12:30:00', true],
      ['2024-01-15', true],
    ])('正常系: "%s" → isValid: true', (value, expected) => {
      expect(validateByXsiType('dateTimeType', value).isValid).toBe(expected);
    });

    test.each([
      ['not-a-date'],
      ['2024-13-99'],
    ])('異常系: "%s" → isValid: false', (value) => {
      expect(validateByXsiType('dateTimeType', value).isValid).toBe(false);
    });
  });

  // ----- dateType -----
  describe('dateType', () => {
    test.each([
      ['2024-01-15', true],
      ['2024/01/15', true],
    ])('正常系: "%s" → isValid: true', (value, expected) => {
      expect(validateByXsiType('dateType', value).isValid).toBe(expected);
    });

    test.each([
      ['not-a-date'],
      ['2024-13-99'],
      ['15-01-2024'],
    ])('異常系: "%s" → isValid: false', (value) => {
      expect(validateByXsiType('dateType', value).isValid).toBe(false);
    });
  });

  // ----- uriType -----
  describe('uriType', () => {
    test.each([
      ['https://example.com/path', true],
      ['http://localhost:3000', true],
      ['/relative/path', true],
      ['./relative', true],
      ['../parent', true],
    ])('正常系: "%s" → isValid: true', (value, expected) => {
      expect(validateByXsiType('uriType', value).isValid).toBe(expected);
    });

    test.each([
      ['not a uri'],
      ['ftp no colon'],
    ])('異常系: "%s" → isValid: false', (value) => {
      expect(validateByXsiType('uriType', value).isValid).toBe(false);
    });
  });

  // ----- uuidType -----
  describe('uuidType', () => {
    test.each([
      ['550e8400-e29b-41d4-a716-446655440000', true],
      ['00000000-0000-0000-0000-000000000000', true],
      ['FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF', true],
    ])('正常系: "%s" → isValid: true', (value, expected) => {
      expect(validateByXsiType('uuidType', value).isValid).toBe(expected);
    });

    test.each([
      ['not-a-uuid'],
      ['550e8400e29b41d4a716446655440000'],  // ハイフンなし
      ['550e8400-e29b-41d4-a716'],           // 短い
    ])('異常系: "%s" → isValid: false', (value) => {
      expect(validateByXsiType('uuidType', value).isValid).toBe(false);
    });
  });

  // ----- base64BinaryType -----
  describe('base64BinaryType', () => {
    test.each([
      ['SGVsbG8gV29ybGQ=', true],
      ['dGVzdA==', true],
      ['', true],
    ])('正常系: "%s" → isValid: true', (value, expected) => {
      expect(validateByXsiType('base64BinaryType', value).isValid).toBe(expected);
    });

    test.each([
      ['not base64!@#$'],
    ])('異常系: "%s" → isValid: false', (value) => {
      expect(validateByXsiType('base64BinaryType', value).isValid).toBe(false);
    });
  });

  // ----- hexBinaryType -----
  describe('hexBinaryType', () => {
    test.each([
      ['1A2B3C', true],
      ['deadbeef', true],
      ['DEADBEEF', true],
      ['', true],
    ])('正常系: "%s" → isValid: true', (value, expected) => {
      expect(validateByXsiType('hexBinaryType', value).isValid).toBe(expected);
    });

    test.each([
      ['GHIJ'],
      ['0x1A2B'],
    ])('異常系: "%s" → isValid: false', (value) => {
      expect(validateByXsiType('hexBinaryType', value).isValid).toBe(false);
    });
  });

  // ----- stringType（バリデーションなし）-----
  describe('stringType', () => {
    test.each([
      ['hello world', true],
      ['任意のテキスト', true],
      ['123abc!@#', true],
    ])('"%s" → isValid: true（何でも許容）', (value, expected) => {
      expect(validateByXsiType('stringType', value).isValid).toBe(expected);
    });
  });

  // ----- リスト型（緩やかに許容）-----
  describe('リスト型（intListType, floatListType 等）', () => {
    test.each([
      ['intListType', '1 2 3 4 5'],
      ['floatListType', '1.0 2.5 3.7'],
      ['booleanListType', 'true false true'],
      ['stringListType', 'aaa bbb ccc'],
      ['contentDoubleListType', '1.0 2.0 3.0'],
    ])('xsiType=%s, value="%s" → isValid: true', (xsiType, value) => {
      expect(validateByXsiType(xsiType, value).isValid).toBe(true);
    });
  });

  // ----- propertyListType -----
  describe('propertyListType', () => {
    test('任意の値 → isValid: true（子要素で管理）', () => {
      expect(validateByXsiType('propertyListType', 'anything').isValid).toBe(true);
    });
  });

  // ----- 未知の型 -----
  describe('未知の型', () => {
    test('"unknownCustomType" → isValid: true（フォールバック）', () => {
      expect(validateByXsiType('unknownCustomType', 'any value').isValid).toBe(true);
    });
  });
});

// ===== ヘルパー関数 =====

describe('isNumericXsiType', () => {
  test.each([
    ['intType', true],
    ['longType', true],
    ['shortType', true],
    ['byteType', true],
    ['unsignedIntType', true],
    ['unsignedLongType', true],
    ['unsignedShortType', true],
    ['unsignedByteType', true],
    ['floatType', true],
    ['doubleType', true],
    ['decimalType', true],
    ['stringType', false],
    ['booleanType', false],
    ['dateType', false],
    ['propertyListType', false],
  ])('xsiType=%s → %s', (xsiType, expected) => {
    expect(isNumericXsiType(xsiType)).toBe(expected);
  });
});

describe('isIntegerXsiType', () => {
  test.each([
    ['intType', true],
    ['unsignedByteType', true],
    ['floatType', false],
    ['stringType', false],
  ])('xsiType=%s → %s', (xsiType, expected) => {
    expect(isIntegerXsiType(xsiType)).toBe(expected);
  });
});

describe('isUnsignedIntXsiType', () => {
  test.each([
    ['unsignedIntType', true],
    ['unsignedByteType', true],
    ['intType', false],
    ['floatType', false],
  ])('xsiType=%s → %s', (xsiType, expected) => {
    expect(isUnsignedIntXsiType(xsiType)).toBe(expected);
  });
});

describe('isListXsiType', () => {
  test.each([
    ['intListType', true],
    ['floatListType', true],
    ['booleanListType', true],
    ['contentDoubleListType', true],
    ['stringEnumType', true],
    ['intType', false],
    ['floatType', false],
    ['propertyListType', false],  // propertyListType はリスト型ではなく別カテゴリ
  ])('xsiType=%s → %s', (xsiType, expected) => {
    expect(isListXsiType(xsiType)).toBe(expected);
  });
});

describe('getXsiTypeLabel', () => {
  test.each([
    ['intType', '整数'],
    ['floatType', '単精度実数'],
    ['booleanType', '真偽値'],
    ['dateTimeType', '日時'],
    ['propertyListType', 'プロパティリスト'],
    ['unknownType', 'unknownType'],  // 未知の型はそのまま返す
  ])('xsiType=%s → "%s"', (xsiType, expected) => {
    expect(getXsiTypeLabel(xsiType)).toBe(expected);
  });
});

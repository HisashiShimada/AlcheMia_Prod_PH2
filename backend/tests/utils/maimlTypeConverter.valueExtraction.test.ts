/**
 * MAIML Type Converter - valueExtraction テスト（バックエンド）
 *
 * convertXmlJsProperty / convertContent における
 * <value> タグの有無による値取得ロジックの検証
 */

import { convertXmlJsProperty, convertContent } from '../../src/utils/maimlTypeConverter';

// ============================================================
// 1. intType のテスト
// ============================================================

describe('[backend] convertXmlJsProperty - intType', () => {
  test('valueタグあり: value = 42', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'count', 'xsi:type': 'intType' },
      value: { _text: '42' },
    });
    expect(prop.value).toBe(42);
  });

  test('valueタグなし: value = undefined', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'count', 'xsi:type': 'intType' },
    });
    expect(prop.value).toBeUndefined();
  });

  test('valueタグあり・テキストなし（空タグ）: value = 0', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'count', 'xsi:type': 'intType' },
      value: {},
    });
    expect(prop.value).toBe(0);
  });

  test('valueタグ複数: スペース区切りの先頭数値', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'count', 'xsi:type': 'intType' },
      value: [{ _text: '10' }, { _text: '20' }, { _text: '30' }],
    });
    // "10 20 30" → parseFloat → 10 → Math.floor → 10
    expect(prop.value).toBe(10);
  });

  test('小数値は整数型に切り捨てられる', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'count', 'xsi:type': 'intType' },
      value: { _text: '3.7' },
    });
    expect(prop.value).toBe(3);
  });
});

// ============================================================
// 2. doubleType のテスト
// ============================================================

describe('[backend] convertXmlJsProperty - doubleType', () => {
  test('valueタグあり: value = 3.14', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'pi', 'xsi:type': 'doubleType' },
      value: { _text: '3.14' },
    });
    expect(prop.value).toBeCloseTo(3.14);
  });

  test('valueタグなし: value = undefined', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'pi', 'xsi:type': 'doubleType' },
    });
    expect(prop.value).toBeUndefined();
  });

  test('valueタグあり・テキストなし: value = 0', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'pi', 'xsi:type': 'doubleType' },
      value: {},
    });
    expect(prop.value).toBe(0);
  });
});

// ============================================================
// 3. booleanType のテスト
// ============================================================

describe('[backend] convertXmlJsProperty - booleanType', () => {
  test('valueタグあり true: value = true', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'flag', 'xsi:type': 'booleanType' },
      value: { _text: 'true' },
    });
    expect(prop.value).toBe(true);
  });

  test('valueタグあり false: value = false', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'flag', 'xsi:type': 'booleanType' },
      value: { _text: 'false' },
    });
    expect(prop.value).toBe(false);
  });

  test('valueタグなし: value = undefined', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'flag', 'xsi:type': 'booleanType' },
    });
    expect(prop.value).toBeUndefined();
  });

  test('valueタグあり・テキストなし: value = false（デフォルト）', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'flag', 'xsi:type': 'booleanType' },
      value: {},
    });
    expect(prop.value).toBe(false);
  });
});

// ============================================================
// 4. stringType のテスト
// ============================================================

describe('[backend] convertXmlJsProperty - stringType', () => {
  test('valueタグあり: value = "hello"', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'label', 'xsi:type': 'stringType' },
      value: { _text: 'hello' },
    });
    expect(prop.value).toBe('hello');
  });

  test('valueタグなし: value = undefined', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'label', 'xsi:type': 'stringType' },
    });
    expect(prop.value).toBeUndefined();
  });

  test('valueタグあり・テキストなし: value = ""（空文字）', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'label', 'xsi:type': 'stringType' },
      value: {},
    });
    expect(prop.value).toBe('');
  });

  test('valueタグ複数: スペース区切りで連結', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'label', 'xsi:type': 'stringType' },
      value: [{ _text: 'foo' }, { _text: 'bar' }, { _text: 'baz' }],
    });
    expect(prop.value).toBe('foo bar baz');
  });
});

// ============================================================
// 5. dateTimeType のテスト
// ============================================================

describe('[backend] convertXmlJsProperty - dateTimeType', () => {
  test('valueタグあり: value = "2026-04-20T10:00:00"', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'timestamp', 'xsi:type': 'dateTimeType' },
      value: { _text: '2026-04-20T10:00:00' },
    });
    expect(prop.value).toBe('2026-04-20T10:00:00');
  });

  test('valueタグなし: value = undefined', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'timestamp', 'xsi:type': 'dateTimeType' },
    });
    expect(prop.value).toBeUndefined();
  });
});

// ============================================================
// 6. stringEnumType のテスト
// ============================================================

describe('[backend] convertXmlJsProperty - stringEnumType', () => {
  test('valueタグあり: value = "optionA"', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'mode', 'xsi:type': 'stringEnumType' },
      value: { _text: 'optionA' },
    });
    expect(prop.value).toBe('optionA');
  });

  test('valueタグなし: value = undefined', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'mode', 'xsi:type': 'stringEnumType' },
    });
    expect(prop.value).toBeUndefined();
  });
});

// ============================================================
// 7. *ListType（valuesタグ）のテスト
// ============================================================

describe('[backend] convertXmlJsProperty - intListType', () => {
  test('valuesタグあり: value = "1 2 3"', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'data', 'xsi:type': 'intListType' },
      values: { _text: '1 2 3' },
    });
    expect(prop.value).toBe('1 2 3');
  });

  test('valueタグあり: value = "10 20"', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'data', 'xsi:type': 'doubleListType' },
      value: { _text: '10 20' },
    });
    expect(prop.value).toBe('10 20');
  });

  test('valueもvaluesタグもなし: value = undefined', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'data', 'xsi:type': 'intListType' },
    });
    expect(prop.value).toBeUndefined();
  });
});

// ============================================================
// 8. xsi:type 未指定（デフォルト stringType）のテスト
// ============================================================

describe('[backend] convertXmlJsProperty - xsi:type 未指定', () => {
  test('valueタグあり: xsiType=stringType, value = "raw text"', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'unknown' },
      value: { _text: 'raw text' },
    });
    expect(prop.value).toBe('raw text');
    // バックエンドはデフォルト stringType
    expect(prop.xsiType).toBe('stringType');
  });

  test('valueタグなし: value = undefined', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'unknown' },
    });
    expect(prop.value).toBeUndefined();
  });
});

// ============================================================
// 9. propertyListType（再帰ネスト）のテスト
// ============================================================

describe('[backend] convertXmlJsProperty - propertyListType', () => {
  test('ネストされた property が変換される', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'group', 'xsi:type': 'propertyListType' },
      property: [
        {
          _attributes: { key: 'child1', 'xsi:type': 'intType' },
          value: { _text: '100' },
        },
        {
          _attributes: { key: 'child2', 'xsi:type': 'stringType' },
          value: { _text: 'hello' },
        },
      ],
    });
    expect(prop.xsiType).toBe('propertyListType');
    expect((prop as any).properties).toHaveLength(2);
    expect((prop as any).properties[0].value).toBe(100);
    expect((prop as any).properties[1].value).toBe('hello');
  });

  test('ネストされた propertyListType にvalueタグなしの子があっても ok', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'group', 'xsi:type': 'propertyListType' },
      property: {
        _attributes: { key: 'child', 'xsi:type': 'doubleType' },
        // value タグなし
      },
    });
    expect((prop as any).properties[0].value).toBeUndefined();
  });
});

// ============================================================
// 10. convertContent のテスト
// ============================================================

describe('[backend] convertContent - value タグの有無', () => {
  test('valueタグあり: value = "some-value"', () => {
    const content = convertContent({
      _attributes: { key: 'c1', 'xsi:type': 'contentStringType' },
      value: { _text: 'some-value' },
    });
    expect(content.value).toBe('some-value');
  });

  test('valueタグなし: value = undefined', () => {
    const content = convertContent({
      _attributes: { key: 'c1', 'xsi:type': 'contentStringType' },
    });
    expect(content.value).toBeUndefined();
  });

  test('valueタグあり・テキストなし: value = ""（空文字）', () => {
    const content = convertContent({
      _attributes: { key: 'c1' },
      value: {},
    });
    expect(content.value).toBe('');
  });

  test('valuesタグあり: value = "1.0 2.0 3.0"', () => {
    const content = convertContent({
      _attributes: { key: 'c1', 'xsi:type': 'contentDoubleListType' },
      values: { _text: '1.0 2.0 3.0' },
    });
    expect(content.value).toBe('1.0 2.0 3.0');
  });

  test('valueタグ複数: スペース区切りで連結', () => {
    const content = convertContent({
      _attributes: { key: 'c1' },
      value: [{ _text: 'a' }, { _text: 'b' }, { _text: 'c' }],
    });
    expect(content.value).toBe('a b c');
  });
});

// ============================================================
// 11. バイナリ型のテスト
// ============================================================

describe('[backend] convertXmlJsProperty - base64BinaryType', () => {
  test('valueタグあり: value = "SGVsbG8="', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'data', 'xsi:type': 'base64BinaryType' },
      value: { _text: 'SGVsbG8=' },
    });
    expect(prop.value).toBe('SGVsbG8=');
  });

  test('valueタグなし: value = undefined', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'data', 'xsi:type': 'base64BinaryType' },
    });
    expect(prop.value).toBeUndefined();
  });
});

// ============================================================
// 12. 文字列系特殊型（tokenType 等）のテスト
// ============================================================

describe('[backend] convertXmlJsProperty - tokenType', () => {
  test('valueタグあり: value = "myToken"', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'tok', 'xsi:type': 'tokenType' },
      value: { _text: 'myToken' },
    });
    expect(prop.value).toBe('myToken');
  });

  test('valueタグなし: value = undefined', () => {
    const prop = convertXmlJsProperty({
      _attributes: { key: 'tok', 'xsi:type': 'tokenType' },
    });
    expect(prop.value).toBeUndefined();
  });
});

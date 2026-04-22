/**
 * MAIML Type Converter - valueExtraction テスト（フロントエンド）
 *
 * convertXmlJsProperty / convertContent における
 * <value> タグの有無による値取得ロジックの検証
 *
 * テストケース:
 *   1. extractPropertyValue の動作（valueタグなし/あり/複数/valuesタグ）
 *   2. 各数値型（intType / doubleType 等）のvalueタグ有無
 *   3. booleanType のvalueタグ有無
 *   4. stringType / dateTimeType 等のvalueタグ有無
 *   5. listType のvalueタグ有無・valuesタグ
 *   6. propertyListType（再帰構造）
 *   7. convertContent のvalueタグ有無
 */

import { convertXmlJsToMaimlRoot } from '../maimlTypeConverter';

// ============================================================
// テスト用ヘルパー：property 1つを持つ最小 xml-js オブジェクト
// ============================================================

function buildXmlWithProperty(propObj: Record<string, any>): any {
  return {
    maiml: {
      _attributes: { version: '1.0' },
      document: {
        uuid: { _text: 'doc-uuid' },
        creator: { _attributes: { id: 'c1' }, name: { _text: 'C1' } },
      },
      protocol: {
        _attributes: { id: 'proto-1' },
        method: {
          _attributes: { id: 'method-1' },
          pnml: {},
          materialtemplate: {
            _attributes: { id: 'tmpl-1' },
            property: propObj,
          },
        },
      },
    },
  };
}

/** 最初の property を取り出すショートカット */
function getFirstProperty(xmlData: any) {
  const result = convertXmlJsToMaimlRoot(xmlData);
  return result.data?.protocol?.methods?.[0]?.materialTemplates?.[0]?.properties?.[0];
}

// テスト用ヘルパー：content 1つを持つ最小 xml-js オブジェクト
function buildXmlWithContent(contentObj: Record<string, any>): any {
  return {
    maiml: {
      _attributes: { version: '1.0' },
      document: {
        uuid: { _text: 'doc-uuid' },
        creator: { _attributes: { id: 'c1' }, name: { _text: 'C1' } },
      },
      protocol: {
        _attributes: { id: 'proto-1' },
        method: {
          _attributes: { id: 'method-1' },
          pnml: {},
          materialtemplate: {
            _attributes: { id: 'tmpl-1' },
            content: contentObj,
          },
        },
      },
    },
  };
}

function getFirstContent(xmlData: any) {
  const result = convertXmlJsToMaimlRoot(xmlData);
  return result.data?.protocol?.methods?.[0]?.materialTemplates?.[0]?.contents?.[0];
}

// ============================================================
// 1. intType のテスト
// ============================================================

describe('[frontend] convertXmlJsProperty - intType', () => {
  test('valueタグあり: value = 42', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'count', 'xsi:type': 'intType' },
      value: { _text: '42' },
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBe(42);
  });

  test('valueタグなし: value = undefined', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'count', 'xsi:type': 'intType' },
      // value タグなし
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBeUndefined();
  });

  test('valueタグあり・テキストなし（空タグ）: value = 0（デフォルト）', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'count', 'xsi:type': 'intType' },
      value: {}, // テキストなし
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBe(0);
  });

  test('valueタグ複数: スペース区切りの先頭数値', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'count', 'xsi:type': 'intType' },
      value: [{ _text: '10' }, { _text: '20' }, { _text: '30' }],
    });
    const prop = getFirstProperty(xmlData);
    // "10 20 30" → parseFloat → 10
    expect(prop?.value).toBe(10);
  });

  test('小数値は整数型に切り捨てられる', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'count', 'xsi:type': 'intType' },
      value: { _text: '3.7' },
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBe(3);
  });
});

// ============================================================
// 2. doubleType のテスト
// ============================================================

describe('[frontend] convertXmlJsProperty - doubleType', () => {
  test('valueタグあり: value = 3.14', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'pi', 'xsi:type': 'doubleType' },
      value: { _text: '3.14' },
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBeCloseTo(3.14);
  });

  test('valueタグなし: value = undefined', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'pi', 'xsi:type': 'doubleType' },
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBeUndefined();
  });

  test('valueタグあり・テキストなし: value = 0（デフォルト）', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'pi', 'xsi:type': 'doubleType' },
      value: {},
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBe(0);
  });
});

// ============================================================
// 3. booleanType のテスト
// ============================================================

describe('[frontend] convertXmlJsProperty - booleanType', () => {
  test('valueタグあり true: value = true', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'flag', 'xsi:type': 'booleanType' },
      value: { _text: 'true' },
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBe(true);
  });

  test('valueタグあり false: value = false', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'flag', 'xsi:type': 'booleanType' },
      value: { _text: 'false' },
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBe(false);
  });

  test('valueタグなし: value = undefined', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'flag', 'xsi:type': 'booleanType' },
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBeUndefined();
  });

  test('valueタグあり・テキストなし（空タグ）: value = false（デフォルト）', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'flag', 'xsi:type': 'booleanType' },
      value: {},
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBe(false);
  });
});

// ============================================================
// 4. stringType のテスト
// ============================================================

describe('[frontend] convertXmlJsProperty - stringType', () => {
  test('valueタグあり: value = "hello"', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'label', 'xsi:type': 'stringType' },
      value: { _text: 'hello' },
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBe('hello');
  });

  test('valueタグなし: value = undefined', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'label', 'xsi:type': 'stringType' },
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBeUndefined();
  });

  test('valueタグあり・テキストなし: value = ""（空文字）', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'label', 'xsi:type': 'stringType' },
      value: {},
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBe('');
  });

  test('valueタグ複数: スペース区切りで連結', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'label', 'xsi:type': 'stringType' },
      value: [{ _text: 'foo' }, { _text: 'bar' }, { _text: 'baz' }],
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBe('foo bar baz');
  });
});

// ============================================================
// 5. dateTimeType のテスト
// ============================================================

describe('[frontend] convertXmlJsProperty - dateTimeType', () => {
  test('valueタグあり: value = "2026-04-20T10:00:00"', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'timestamp', 'xsi:type': 'dateTimeType' },
      value: { _text: '2026-04-20T10:00:00' },
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBe('2026-04-20T10:00:00');
  });

  test('valueタグなし: value = undefined', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'timestamp', 'xsi:type': 'dateTimeType' },
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBeUndefined();
  });
});

// ============================================================
// 6. stringEnumType のテスト
// ============================================================

describe('[frontend] convertXmlJsProperty - stringEnumType', () => {
  test('valueタグあり: value = "optionA"', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'mode', 'xsi:type': 'stringEnumType' },
      value: { _text: 'optionA' },
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBe('optionA');
  });

  test('valueタグなし: value = undefined', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'mode', 'xsi:type': 'stringEnumType' },
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBeUndefined();
  });
});

// ============================================================
// 7. *ListType（valuesタグ）のテスト
// ============================================================

describe('[frontend] convertXmlJsProperty - intListType', () => {
  test('valuesタグあり: value = "1 2 3"', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'data', 'xsi:type': 'intListType' },
      values: { _text: '1 2 3' },
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBe('1 2 3');
  });

  test('valueタグあり: value = "10 20"', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'data', 'xsi:type': 'doubleListType' },
      value: { _text: '10 20' },
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBe('10 20');
  });

  test('valueもvaluesタグもなし: value = undefined', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'data', 'xsi:type': 'intListType' },
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBeUndefined();
  });
});

// ============================================================
// 8. xsi:type 未指定のテスト
// ============================================================

describe('[frontend] convertXmlJsProperty - xsi:type 未指定', () => {
  test('valueタグあり: value = "raw text"', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'unknown' }, // xsi:type なし
      value: { _text: 'raw text' },
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBe('raw text');
    expect(prop?.xsiType).toBe('');
  });

  test('valueタグなし: value = undefined', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'unknown' },
    });
    const prop = getFirstProperty(xmlData);
    expect(prop?.value).toBeUndefined();
  });
});

// ============================================================
// 9. propertyListType（再帰ネスト）のテスト
// ============================================================

describe('[frontend] convertXmlJsProperty - propertyListType', () => {
  test('ネストされた property が変換される', () => {
    const xmlData = buildXmlWithProperty({
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
    const prop = getFirstProperty(xmlData);
    expect(prop?.xsiType).toBe('propertyListType');
    expect((prop as any)?.properties).toHaveLength(2);
    expect((prop as any)?.properties[0].value).toBe(100);
    expect((prop as any)?.properties[1].value).toBe('hello');
  });

  test('ネストされた propertyListType にvalueタグなしの子があっても ok', () => {
    const xmlData = buildXmlWithProperty({
      _attributes: { key: 'group', 'xsi:type': 'propertyListType' },
      property: {
        _attributes: { key: 'child', 'xsi:type': 'doubleType' },
        // value タグなし
      },
    });
    const prop = getFirstProperty(xmlData);
    expect((prop as any)?.properties[0].value).toBeUndefined();
  });
});

// ============================================================
// 10. convertContent のテスト
// ============================================================

describe('[frontend] convertContent - value タグの有無', () => {
  test('valueタグあり: value = "some-value"', () => {
    const xmlData = buildXmlWithContent({
      _attributes: { key: 'c1', 'xsi:type': 'contentStringType' },
      value: { _text: 'some-value' },
    });
    const content = getFirstContent(xmlData);
    expect(content?.value).toBe('some-value');
  });

  test('valueタグなし: value = undefined', () => {
    const xmlData = buildXmlWithContent({
      _attributes: { key: 'c1', 'xsi:type': 'contentStringType' },
      // value タグなし
    });
    const content = getFirstContent(xmlData);
    expect(content?.value).toBeUndefined();
  });

  test('valueタグあり・テキストなし: value = ""（空文字）', () => {
    const xmlData = buildXmlWithContent({
      _attributes: { key: 'c1', 'xsi:type': 'contentStringType' },
      value: {}, // テキストなし
    });
    const content = getFirstContent(xmlData);
    expect(content?.value).toBe('');
  });

  test('valuesタグあり: value = "1.0 2.0 3.0"', () => {
    const xmlData = buildXmlWithContent({
      _attributes: { key: 'c1', 'xsi:type': 'contentDoubleListType' },
      values: { _text: '1.0 2.0 3.0' },
    });
    const content = getFirstContent(xmlData);
    expect(content?.value).toBe('1.0 2.0 3.0');
  });

  test('valueタグ複数: スペース区切りで連結', () => {
    const xmlData = buildXmlWithContent({
      _attributes: { key: 'c1' },
      value: [{ _text: 'a' }, { _text: 'b' }, { _text: 'c' }],
    });
    const content = getFirstContent(xmlData);
    expect(content?.value).toBe('a b c');
  });
});

// ============================================================
// 11. 統合テスト（複数 property）
// ============================================================

describe('[frontend] convertXmlJsToMaimlRoot - 複数 property の value 取得', () => {
  test('valueタグあり/なし混在の property が正しく変換される', () => {
    const xmlData = {
      maiml: {
        _attributes: { version: '1.0' },
        document: {
          uuid: { _text: 'doc-uuid' },
          creator: { _attributes: { id: 'c1' }, name: { _text: 'C1' } },
        },
        protocol: {
          _attributes: { id: 'proto-1' },
          method: {
            _attributes: { id: 'method-1' },
            pnml: {},
            materialtemplate: {
              _attributes: { id: 'tmpl-1' },
              property: [
                {
                  _attributes: { key: 'withValue', 'xsi:type': 'doubleType' },
                  value: { _text: '9.8' },
                },
                {
                  _attributes: { key: 'noValue', 'xsi:type': 'doubleType' },
                  // value タグなし
                },
                {
                  _attributes: { key: 'emptyValue', 'xsi:type': 'intType' },
                  value: {}, // テキストなし
                },
              ],
            },
          },
        },
      },
    };

    const result = convertXmlJsToMaimlRoot(xmlData);
    const props = result.data?.protocol?.methods?.[0]?.materialTemplates?.[0]?.properties;

    expect(props).toHaveLength(3);
    // valueタグあり → 9.8
    expect(props?.[0].value).toBeCloseTo(9.8);
    // valueタグなし → undefined
    expect(props?.[1].value).toBeUndefined();
    // valueタグあり・テキストなし → 0（デフォルト）
    expect(props?.[2].value).toBe(0);
  });
});

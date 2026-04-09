/**
 * MAIML Type Converter 同期対応テスト（フロントエンド）
 *
 * 2026-04-08 実施の backend/frontend 同期作業で追加した機能のテスト
 *
 * 対象機能：
 *   1. Place / Transition の position フィールド読み取り
 *   2. Protocol / Method の unknownElements 収集
 *   3. convertXmlJsToMaimlRoot の統合テスト（position + unknownElements）
 *
 * frontend の convertXmlJsToMaimlRoot は ConversionResult 型を返す。
 * result.data が変換後の MaimlRoot に相当する。
 *
 * MaimlRoot 構造:
 *   result.data.protocol           ← Protocol
 *   result.data.protocol.methods   ← Method[]
 *   result.data.protocol.methods[0].pnml.places      ← Place[]
 *   result.data.protocol.methods[0].pnml.transitions ← Transition[]
 */

import { convertXmlJsToMaimlRoot } from '../maimlTypeConverter';

// ============================================================
// テスト用 XML-JS オブジェクト生成ヘルパー
// ============================================================

/** Place を含む xml-js オブジェクトを生成 */
function buildXmlWithPlace(placeAttrs: Record<string, any>): any {
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
          pnml: {
            place: placeAttrs,
          },
        },
      },
    },
  };
}

/** Transition を含む xml-js オブジェクトを生成 */
function buildXmlWithTransition(transitionAttrs: Record<string, any>): any {
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
          pnml: {
            transition: transitionAttrs,
          },
        },
      },
    },
  };
}

/** Protocol に任意フィールドを追加した xml-js オブジェクトを生成 */
function buildXmlWithProtocol(protocolExtra: Record<string, any>): any {
  return {
    maiml: {
      _attributes: { version: '1.0' },
      document: {
        uuid: { _text: 'doc-uuid' },
        creator: { _attributes: { id: 'c1' }, name: { _text: 'C1' } },
      },
      protocol: {
        _attributes: { id: 'proto-1' },
        name: { _text: 'Protocol1' },
        ...protocolExtra,
      },
    },
  };
}

/** Method に任意フィールドを追加した xml-js オブジェクトを生成 */
function buildXmlWithMethod(methodExtra: Record<string, any>): any {
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
          name: { _text: 'Method1' },
          // pnml は convertMethod で必須のため常に含める
          pnml: {},
          ...methodExtra,
        },
      },
    },
  };
}

// ============================================================
// 1. Place.position フィールドのテスト
// ============================================================

describe('[frontend] convertPlace - position フィールド', () => {
  test('position 要素がある場合 x,y が変換される', () => {
    const xmlData = buildXmlWithPlace({
      _attributes: { id: 'p1' },
      name: { _text: 'Place1' },
      position: { _attributes: { x: '100', y: '200' } },
    });

    const result = convertXmlJsToMaimlRoot(xmlData);
    const place = result.data?.protocol?.methods?.[0]?.pnml?.places?.[0];

    expect(place).toBeDefined();
    expect(place?.position).toEqual({ x: 100, y: 200 });
  });

  test('position 要素がない場合 position は undefined', () => {
    const xmlData = buildXmlWithPlace({
      _attributes: { id: 'p1' },
      name: { _text: 'Place1' },
      // position なし
    });

    const result = convertXmlJsToMaimlRoot(xmlData);
    const place = result.data?.protocol?.methods?.[0]?.pnml?.places?.[0];

    expect(place).toBeDefined();
    expect(place?.position).toBeUndefined();
  });

  test('position の x/y が数値以外の場合 position は undefined', () => {
    const xmlData = buildXmlWithPlace({
      _attributes: { id: 'p1' },
      position: { _attributes: { x: 'abc', y: 'def' } },
    });

    const result = convertXmlJsToMaimlRoot(xmlData);
    const place = result.data?.protocol?.methods?.[0]?.pnml?.places?.[0];

    expect(place?.position).toBeUndefined();
  });

  test('小数点座標（300.5, 400.75）も正しく変換される', () => {
    const xmlData = buildXmlWithPlace({
      _attributes: { id: 'p1' },
      position: { _attributes: { x: '300.5', y: '400.75' } },
    });

    const result = convertXmlJsToMaimlRoot(xmlData);
    const place = result.data?.protocol?.methods?.[0]?.pnml?.places?.[0];

    expect(place?.position).toEqual({ x: 300.5, y: 400.75 });
  });

  test('x=0, y=0 の座標も正しく変換される', () => {
    const xmlData = buildXmlWithPlace({
      _attributes: { id: 'p1' },
      position: { _attributes: { x: '0', y: '0' } },
    });

    const result = convertXmlJsToMaimlRoot(xmlData);
    const place = result.data?.protocol?.methods?.[0]?.pnml?.places?.[0];

    expect(place?.position).toEqual({ x: 0, y: 0 });
  });
});

// ============================================================
// 2. Transition.position フィールドのテスト
// ============================================================

describe('[frontend] convertTransition - position フィールド', () => {
  test('position 要素がある場合 x,y が変換される', () => {
    const xmlData = buildXmlWithTransition({
      _attributes: { id: 't1' },
      name: { _text: 'Transition1' },
      position: { _attributes: { x: '300.5', y: '400.75' } },
    });

    const result = convertXmlJsToMaimlRoot(xmlData);
    const transition = result.data?.protocol?.methods?.[0]?.pnml?.transitions?.[0];

    expect(transition).toBeDefined();
    expect(transition?.position).toEqual({ x: 300.5, y: 400.75 });
  });

  test('position 要素がない場合 position は undefined', () => {
    const xmlData = buildXmlWithTransition({
      _attributes: { id: 't1' },
      // position なし
    });

    const result = convertXmlJsToMaimlRoot(xmlData);
    const transition = result.data?.protocol?.methods?.[0]?.pnml?.transitions?.[0];

    expect(transition?.position).toBeUndefined();
  });

  test('x=0, y=0 の座標も正しく変換される', () => {
    const xmlData = buildXmlWithTransition({
      _attributes: { id: 't1' },
      position: { _attributes: { x: '0', y: '0' } },
    });

    const result = convertXmlJsToMaimlRoot(xmlData);
    const transition = result.data?.protocol?.methods?.[0]?.pnml?.transitions?.[0];

    expect(transition?.position).toEqual({ x: 0, y: 0 });
  });
});

// ============================================================
// 3. Protocol.unknownElements のテスト
// ============================================================

describe('[frontend] convertProtocol - unknownElements', () => {
  test('既知キー以外の要素が unknownElements に収集される（normalizeTagCase で小文字化）', () => {
    const xmlData = buildXmlWithProtocol({
      customTag: { _text: 'custom-value' },
      anotherTag: { someData: 'data' },
    });

    const result = convertXmlJsToMaimlRoot(xmlData);
    const protocol = result.data?.protocol;

    expect(protocol?.unknownElements).toBeDefined();
    // normalizeTagCase により全キーは小文字化される
    expect(protocol?.unknownElements?.customtag).toEqual({ _text: 'custom-value' });
    expect(protocol?.unknownElements?.anothertag).toEqual({ somedata: 'data' });
  });

  test('既知キーのみの場合 unknownElements は undefined', () => {
    const xmlData = buildXmlWithProtocol({
      // 追加フィールドなし（既知キーのみ）
    });

    const result = convertXmlJsToMaimlRoot(xmlData);
    const protocol = result.data?.protocol;

    expect(protocol?.unknownElements).toBeUndefined();
  });

  test('既知キー（method, materialTemplate 等）は unknownElements に含まれない', () => {
    const xmlData = buildXmlWithProtocol({
      // method は既知キー。pnml は convertMethod で必須のため含める
      method: { _attributes: { id: 'm1' }, pnml: {} },
      unknownField: { _text: 'unknown' },
    });

    const result = convertXmlJsToMaimlRoot(xmlData);
    const protocol = result.data?.protocol;

    // method は既知キーなので unknownElements に含まれない
    expect(protocol?.unknownElements?.method).toBeUndefined();
    // unknownfield は含まれる（normalizeTagCase により小文字化）
    expect(protocol?.unknownElements?.unknownfield).toEqual({ _text: 'unknown' });
  });
});

// ============================================================
// 4. Method.unknownElements のテスト
// ============================================================

describe('[frontend] convertMethod - unknownElements', () => {
  test('既知キー以外の要素が unknownElements に収集される（normalizeTagCase で小文字化）', () => {
    const xmlData = buildXmlWithMethod({
      extraElement: { _text: 'extra-value' },
      anotherExtra: { nested: 'value' },
    });

    const result = convertXmlJsToMaimlRoot(xmlData);
    const method = result.data?.protocol?.methods?.[0];

    expect(method?.unknownElements).toBeDefined();
    // normalizeTagCase により全キーは小文字化される
    // extraElement → extraelement, anotherExtra → anotherextra
    expect(method?.unknownElements?.extraelement).toEqual({ _text: 'extra-value' });
    expect(method?.unknownElements?.anotherextra).toBeDefined();
  });

  test('既知キーのみの場合 unknownElements は undefined', () => {
    const xmlData = buildXmlWithMethod({
      // 追加フィールドなし（既知キーのみ）
    });

    const result = convertXmlJsToMaimlRoot(xmlData);
    const method = result.data?.protocol?.methods?.[0];

    expect(method?.unknownElements).toBeUndefined();
  });

  test('既知キー（pnml, program 等）は unknownElements に含まれない', () => {
    const xmlData = buildXmlWithMethod({
      pnml: { place: { _attributes: { id: 'p1' } } },
      customKey: { _text: 'custom' },
    });

    const result = convertXmlJsToMaimlRoot(xmlData);
    const method = result.data?.protocol?.methods?.[0];

    // pnml は既知キーなので含まれない
    expect(method?.unknownElements?.pnml).toBeUndefined();
    // customkey は含まれる（normalizeTagCase により小文字化）
    expect(method?.unknownElements?.customkey).toEqual({ _text: 'custom' });
  });
});

// ============================================================
// 5. 統合テスト（position + unknownElements）
// ============================================================

describe('[frontend] convertXmlJsToMaimlRoot - 統合テスト（position + unknownElements）', () => {
  test('Place の position と Protocol の unknownElements が同時に取得できる', () => {
    const xmlData = {
      maiml: {
        _attributes: { version: '1.0' },
        document: {
          uuid: { _text: 'doc-uuid' },
          creator: { _attributes: { id: 'c1' }, name: { _text: 'C1' } },
        },
        protocol: {
          _attributes: { id: 'proto-1' },
          customField: { _text: 'custom' },
          method: {
            _attributes: { id: 'method-1' },
            pnml: {
              place: {
                _attributes: { id: 'p1' },
                position: { _attributes: { x: '50', y: '75' } },
              },
            },
          },
        },
      },
    };

    const result = convertXmlJsToMaimlRoot(xmlData);

    // Place.position
    const place = result.data?.protocol?.methods?.[0]?.pnml?.places?.[0];
    expect(place?.position).toEqual({ x: 50, y: 75 });

    // Protocol.unknownElements（normalizeTagCase により小文字化: customField → customfield）
    expect(result.data?.protocol?.unknownElements?.customfield).toEqual({ _text: 'custom' });
  });

  test('Transition の position と Method の unknownElements が同時に取得できる', () => {
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
            methodExtra: { _text: 'extra' },
            pnml: {
              transition: {
                _attributes: { id: 't1' },
                position: { _attributes: { x: '120', y: '240' } },
              },
            },
          },
        },
      },
    };

    const result = convertXmlJsToMaimlRoot(xmlData);

    // Transition.position
    const transition = result.data?.protocol?.methods?.[0]?.pnml?.transitions?.[0];
    expect(transition?.position).toEqual({ x: 120, y: 240 });

    // Method.unknownElements（normalizeTagCase により小文字化: methodExtra → methodextra）
    expect(result.data?.protocol?.methods?.[0]?.unknownElements?.methodextra).toEqual({ _text: 'extra' });
  });
});

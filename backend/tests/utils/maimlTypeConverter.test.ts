/**
 * MAIML Type Converter Tests
 * xml2js出力を型定義に変換できることを検証
 */

import { convertToMaimlType, normalizeArray } from '../../src/utils/maimlTypeConverter';

describe('MAIML Type Converter', () => {
  describe('convertToMaimlType', () => {
    test('_text構造を抽出する', () => {
      const xmljsOutput = {
        uuid: { _text: 'test-uuid-123' },
        name: { _text: 'Test Name' },
      };

      const result = convertToMaimlType<any>(xmljsOutput);

      expect(result).toEqual({
        uuid: 'test-uuid-123',
        name: 'Test Name',
      });
    });

    test('ネストされた_text構造を再帰的に抽出する', () => {
      const xmljsOutput = {
        document: {
          uuid: { _text: 'doc-uuid' },
          name: { _text: 'Document Name' },
          description: { _text: 'Description' },
        },
      };

      const result = convertToMaimlType<any>(xmljsOutput);

      expect(result).toEqual({
        document: {
          uuid: 'doc-uuid',
          name: 'Document Name',
          description: 'Description',
        },
      });
    });

    test('配列内の_text構造を抽出する', () => {
      const xmljsOutput = {
        creator: [
          { uuid: { _text: 'creator1' }, name: { _text: 'Creator 1' } },
          { uuid: { _text: 'creator2' }, name: { _text: 'Creator 2' } },
        ],
      };

      const result = convertToMaimlType<any>(xmljsOutput);

      expect(result).toEqual({
        creator: [
          { uuid: 'creator1', name: 'Creator 1' },
          { uuid: 'creator2', name: 'Creator 2' },
        ],
      });
    });

    test('undefinedを処理する', () => {
      const result = convertToMaimlType<any>(undefined);
      expect(result).toBeUndefined();
    });

    test('nullを処理する', () => {
      const result = convertToMaimlType<any>(null);
      expect(result).toBeUndefined();
    });
  });

  describe('normalizeArray', () => {
    test('単一要素を配列に変換する', () => {
      const result = normalizeArray('single');
      expect(result).toEqual(['single']);
    });

    test('配列はそのまま返す', () => {
      const result = normalizeArray(['a', 'b', 'c']);
      expect(result).toEqual(['a', 'b', 'c']);
    });

    test('undefinedは空配列を返す', () => {
      const result = normalizeArray(undefined);
      expect(result).toEqual([]);
    });
  });

  // 実データテストは実際のMAIMLファイルが用意されたら追加可能
  // describe('実データ検証', () => { ... });
});
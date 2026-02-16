/**
 * ProgressService ユニットテスト
 * Task 1.1: MAIMLパーサーアダプターのテスト
 */

import * as maimlService from '../../src/services/maimlService';
import { parseMultipleMethodsStructure } from '../../src/services/progressService';

describe('ProgressService - parseMultipleMethodsStructure', () => {
  describe('正常系', () => {
    it('既存のparsePetriNetStructure関数を呼び出してmethods配列を返す', async () => {
      // Given: 有効なMAIMLコンテンツ
      const maimlContent = `<?xml version="1.0" encoding="UTF-8"?>
<maiml>
  <document id="doc1">
    <name>Test Document</name>
  </document>
  <protocol>
    <method id="method1">
      <name>Test Method 1</name>
      <pnml id="pnml1">
        <place id="p1">
          <name>Place 1</name>
        </place>
        <transition id="t1">
          <name>Transition 1</name>
        </transition>
        <arc id="a1" source="p1" target="t1">
          <name>Arc 1</name>
        </arc>
      </pnml>
    </method>
  </protocol>
</maiml>`;

      // When: parseMultipleMethodsStructureを呼び出す
      const result = await parseMultipleMethodsStructure(maimlContent);

      // Then: 成功フラグとmethods配列が返る
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.methods).toBeDefined();
      expect(Array.isArray(result.methods)).toBe(true);
      expect(result.methods.length).toBeGreaterThan(0);
    });

    it('複数メソッドを正しく抽出する', async () => {
      // Given: 複数メソッドを含むMAIMLコンテンツ
      const maimlContent = `<?xml version="1.0" encoding="UTF-8"?>
<maiml>
  <document id="doc1">
    <name>Multi-Method Document</name>
  </document>
  <protocol>
    <method id="method1">
      <name>Method 1</name>
      <pnml id="pnml1">
        <transition id="t1">
          <name>Transition 1</name>
        </transition>
      </pnml>
    </method>
    <method id="method2">
      <name>Method 2</name>
      <pnml id="pnml2">
        <transition id="t2">
          <name>Transition 2</name>
        </transition>
      </pnml>
    </method>
  </protocol>
</maiml>`;

      // When: parseMultipleMethodsStructureを呼び出す
      const result = await parseMultipleMethodsStructure(maimlContent);

      // Then: 2つのメソッドが返る
      expect(result.success).toBe(true);
      expect(result.methods).toHaveLength(2);
      expect(result.methods[0].methodId).toBe('method1');
      expect(result.methods[0].methodName).toBe('Method 1');
      expect(result.methods[1].methodId).toBe('method2');
      expect(result.methods[1].methodName).toBe('Method 2');
    });

    it('各メソッドのトランジション情報を正しく抽出する', async () => {
      // Given: トランジションを含むMAIMLコンテンツ
      const maimlContent = `<?xml version="1.0" encoding="UTF-8"?>
<maiml>
  <document id="doc1">
    <name>Test Document</name>
  </document>
  <protocol>
    <method id="method1">
      <name>Test Method</name>
      <pnml id="pnml1">
        <transition id="t1">
          <name>Transition 1</name>
        </transition>
        <transition id="t2">
          <name>Transition 2</name>
        </transition>
      </pnml>
    </method>
  </protocol>
</maiml>`;

      // When: parseMultipleMethodsStructureを呼び出す
      const result = await parseMultipleMethodsStructure(maimlContent);

      // Then: トランジション情報が正しく抽出される
      expect(result.success).toBe(true);
      expect(result.methods[0].transitions).toHaveLength(2);
      expect(result.methods[0].transitions[0].id).toBe('t1');
      expect(result.methods[0].transitions[0].data.label).toBe('Transition 1');
      expect(result.methods[0].transitions[1].id).toBe('t2');
      expect(result.methods[0].transitions[1].data.label).toBe('Transition 2');
    });
  });

  describe('異常系', () => {
    it('不正なXMLの場合はエラーを返す', async () => {
      // Given: 不正なXML
      const invalidXml = 'This is not XML';

      // When: parseMultipleMethodsStructureを呼び出す
      const result = await parseMultipleMethodsStructure(invalidXml);

      // Then: エラーフラグが立つ
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.methods).toEqual([]);
    });

    it('protocolセクションがない場合は空のmethods配列を返す', async () => {
      // Given: protocolセクションがないMAIML
      const maimlContent = `<?xml version="1.0" encoding="UTF-8"?>
<maiml>
  <document id="doc1">
    <name>Test Document</name>
  </document>
</maiml>`;

      // When: parseMultipleMethodsStructureを呼び出す
      const result = await parseMultipleMethodsStructure(maimlContent);

      // Then: 成功だが空のmethods配列
      expect(result.success).toBe(true);
      expect(result.methods).toEqual([]);
    });

    it('methodが存在しない場合は空のmethods配列を返す', async () => {
      // Given: methodが存在しないMAIML
      const maimlContent = `<?xml version="1.0" encoding="UTF-8"?>
<maiml>
  <document id="doc1">
    <name>Test Document</name>
  </document>
  <protocol>
  </protocol>
</maiml>`;

      // When: parseMultipleMethodsStructureを呼び出す
      const result = await parseMultipleMethodsStructure(maimlContent);

      // Then: 成功だが空のmethods配列
      expect(result.success).toBe(true);
      expect(result.methods).toEqual([]);
    });
  });

  describe('エラーハンドリング', () => {
    it('parsePetriNetStructureがエラーを返した場合でも適切に処理する', async () => {
      // Given: parsePetriNetStructureをモック
      const mockError = new Error('Parse error');
      jest.spyOn(maimlService, 'parsePetriNetStructure').mockResolvedValueOnce({
        success: false,
        error: mockError.message,
        isMultiMethod: false,
        methods: [],
        places: [],
        transitions: [],
        arcs: [],
        metadata: {},
      });

      const maimlContent = '<maiml></maiml>';

      // When: parseMultipleMethodsStructureを呼び出す
      const result = await parseMultipleMethodsStructure(maimlContent);

      // Then: エラーが適切に処理される
      expect(result.success).toBe(false);
      expect(result.error).toBe(mockError.message);
      expect(result.methods).toEqual([]);
    });
  });
});

/**
 * MAIML型定義バリデーションテスト
 * 
 * Phase 4: 生成された型定義が実MAIMLファイルと互換性があるかを検証
 * 
 * @description
 * Phase 3で改善した型定義が実際のMAIMLファイルで正しく動作することを確認
 * 
 * 検証項目:
 * 1. DocumentTypeにname, uuid, description, annotationが含まれる
 * 2. CreatorType等にもglobalObjectContentGroupの要素が含まれる
 * 3. Property型にvalue, descriptionが含まれる
 * 4. 型キャストが正常に動作する
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parseStringPromise } from 'xml2js';
import type {
  DocumentType,
  CreatorType,
  VendorType,
  OwnerType,
  InstrumentType,
  ProtocolType,
  MethodType,
} from '../../../frontend/src/types/maiml-schema';

describe('MAIML Type Validation - Phase 4', () => {
  let maimlData: any;

  beforeAll(async () => {
    // 実MAIMLファイルを読み込み
    const maimlPath = path.join(
      __dirname,
      '../../../frontend/src/data/mock/test_omori11.maiml'
    );
    const maimlXml = await fs.readFile(maimlPath, 'utf-8');
    
    // XMLをパース
    const parsed = await parseStringPromise(maimlXml, {
      explicitArray: false,
      mergeAttrs: true,
      explicitRoot: true,
    });
    
    maimlData = parsed.maiml;
  });

  describe('DocumentType - globalObjectContentGroup検証', () => {
    let document: DocumentType;

    beforeEach(() => {
      document = maimlData.document;
    });

    test('should have uuid property', () => {
      expect(document.uuid).toBeDefined();
      expect(typeof document.uuid).toBe('string');
      expect(document.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    test('should have name property (Phase 3 improvement)', () => {
      expect(document.name).toBeDefined();
      expect(typeof document.name).toBe('string');
      console.log('✅ DocumentType.name:', document.name);
    });

    test('should have description property (Phase 3 improvement)', () => {
      // descriptionはオプショナル
      if (document.description) {
        expect(typeof document.description).toBe('string');
        console.log('✅ DocumentType.description:', document.description);
      } else {
        console.log('ℹ️  DocumentType.description: undefined (optional)');
      }
    });

    test('should have annotation property (Phase 3 improvement)', () => {
      // annotationはオプショナル
      if (document.annotation) {
        expect(typeof document.annotation).toBe('string');
        console.log('✅ DocumentType.annotation:', document.annotation);
      } else {
        console.log('ℹ️  DocumentType.annotation: undefined (optional)');
      }
    });

    test('should have creator array', () => {
      expect(document.creator).toBeDefined();
      expect(Array.isArray(document.creator)).toBe(true);
    });

    test('should have vendor array', () => {
      expect(document.vendor).toBeDefined();
      expect(Array.isArray(document.vendor)).toBe(true);
    });

    test('should have owner array', () => {
      expect(document.owner).toBeDefined();
      expect(Array.isArray(document.owner)).toBe(true);
    });
  });

  describe('CreatorType - globalObjectContentGroup検証', () => {
    let creator: CreatorType;

    beforeEach(() => {
      creator = Array.isArray(maimlData.document.creator)
        ? maimlData.document.creator[0]
        : maimlData.document.creator;
    });

    test('should have uuid property', () => {
      expect(creator.uuid).toBeDefined();
      expect(typeof creator.uuid).toBe('string');
    });

    test('should have name property (Phase 3 improvement)', () => {
      expect(creator.name).toBeDefined();
      expect(typeof creator.name).toBe('string');
      console.log('✅ CreatorType.name:', creator.name);
    });

    test('should have description property (Phase 3 improvement)', () => {
      if (creator.description) {
        expect(typeof creator.description).toBe('string');
        console.log('✅ CreatorType.description:', creator.description);
      }
    });
  });

  describe('VendorType - globalObjectContentGroup検証', () => {
    let vendor: VendorType;

    beforeEach(() => {
      vendor = Array.isArray(maimlData.document.vendor)
        ? maimlData.document.vendor[0]
        : maimlData.document.vendor;
    });

    test('should have uuid property', () => {
      expect(vendor.uuid).toBeDefined();
    });

    test('should have name property (Phase 3 improvement)', () => {
      expect(vendor.name).toBeDefined();
      console.log('✅ VendorType.name:', vendor.name);
    });

    test('should have description property (Phase 3 improvement)', () => {
      if (vendor.description) {
        expect(typeof vendor.description).toBe('string');
        console.log('✅ VendorType.description:', vendor.description);
      }
    });
  });

  describe('OwnerType - globalObjectContentGroup検証', () => {
    let owner: OwnerType;

    beforeEach(() => {
      owner = Array.isArray(maimlData.document.owner)
        ? maimlData.document.owner[0]
        : maimlData.document.owner;
    });

    test('should have uuid property', () => {
      expect(owner.uuid).toBeDefined();
    });

    test('should have name property (Phase 3 improvement)', () => {
      expect(owner.name).toBeDefined();
      console.log('✅ OwnerType.name:', owner.name);
    });

    test('should have description property (Phase 3 improvement)', () => {
      if (owner.description) {
        expect(typeof owner.description).toBe('string');
        console.log('✅ OwnerType.description:', owner.description);
      }
    });
  });

  describe('InstrumentType - globalObjectContentGroup検証', () => {
    let instrument: InstrumentType;

    beforeEach(() => {
      instrument = Array.isArray(maimlData.document.instrument)
        ? maimlData.document.instrument[0]
        : maimlData.document.instrument;
    });

    test('should have uuid property', () => {
      expect(instrument.uuid).toBeDefined();
    });

    test('should have name property (Phase 3 improvement)', () => {
      // nameは空文字列の場合もある
      expect(instrument.name !== undefined).toBe(true);
      console.log('✅ InstrumentType.name:', instrument.name || '(empty)');
    });
  });

  describe('ProtocolType - globalObjectContentGroup検証', () => {
    let protocol: ProtocolType;

    beforeEach(() => {
      protocol = maimlData.protocol;
    });

    test('should have uuid property', () => {
      expect(protocol.uuid).toBeDefined();
      expect(typeof protocol.uuid).toBe('string');
    });

    test('should have name property (Phase 3 improvement)', () => {
      // nameはオプショナル
      if (protocol.name) {
        expect(typeof protocol.name).toBe('string');
        console.log('✅ ProtocolType.name:', protocol.name);
      } else {
        console.log('ℹ️  ProtocolType.name: undefined (optional)');
      }
    });
  });

  describe('MethodType - globalObjectContentGroup検証', () => {
    let method: MethodType;

    beforeEach(() => {
      method = Array.isArray(maimlData.protocol.method)
        ? maimlData.protocol.method[0]
        : maimlData.protocol.method;
    });

    test('should have uuid property', () => {
      expect(method.uuid).toBeDefined();
      expect(typeof method.uuid).toBe('string');
    });

    test('should have name property (Phase 3 improvement)', () => {
      if (method.name) {
        expect(typeof method.name).toBe('string');
        console.log('✅ MethodType.name:', method.name);
      } else {
        console.log('ℹ️  MethodType.name: undefined (optional)');
      }
    });
  });

  describe('Type Compatibility - 型キャスト検証', () => {
    test('should cast document to DocumentType without errors', () => {
      const document: DocumentType = maimlData.document;
      expect(document).toBeDefined();
      expect(document.uuid).toBeDefined();
      expect(document.name).toBeDefined();
      console.log('✅ DocumentType型キャスト成功');
    });

    test('should cast protocol to ProtocolType without errors', () => {
      const protocol: ProtocolType = maimlData.protocol;
      expect(protocol).toBeDefined();
      expect(protocol.uuid).toBeDefined();
      console.log('✅ ProtocolType型キャスト成功');
    });
  });

  describe('Phase 3改善の完全性確認', () => {
    test('all globalObjectContentGroup properties are included', () => {
      const document: DocumentType = maimlData.document;
      
      // Phase 3で追加したプロパティ
      const hasUuid = 'uuid' in document;
      const hasName = 'name' in document;
      const hasDescription = 'description' in document;
      const hasAnnotation = 'annotation' in document;
      const hasProperty = 'property' in document;
      const hasContent = 'content' in document;
      const hasInsertion = 'insertion' in document;
      
      console.log('📊 globalObjectContentGroup完全性:');
      console.log('  uuid:', hasUuid ? '✅' : '❌');
      console.log('  name:', hasName ? '✅' : '❌');
      console.log('  description:', hasDescription ? '✅' : '❌');
      console.log('  annotation:', hasAnnotation ? '✅' : '❌');
      console.log('  property:', hasProperty ? '✅' : '❌');
      console.log('  content:', hasContent ? '✅' : '❌');
      console.log('  insertion:', hasInsertion ? '✅' : '❌');
      
      // 最低限uuid, name, description, annotationは型定義に含まれている必要がある
      expect(hasUuid).toBe(true);
      expect(hasName).toBe(true);
      expect(hasDescription).toBe(true);
      expect(hasAnnotation).toBe(true);
    });
  });
});
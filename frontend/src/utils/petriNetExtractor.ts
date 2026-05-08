/**
 * petriNetExtractor.ts - ペトリネット構造抽出ユーティリティ
 * 型安全なMaimlParserTypedを使用してペトリネット構造を抽出
 * 
 * Phase 5-4: maimlParserExp → maimlParserTyped に完全移行
 */

import { MaimlParserTyped } from './maimlParserTyped';

// XSD準拠型（maiml-unified.ts）
import type {
  Template,
  Property,
  PropertyCustomElement
} from '@/types/maiml-unified';
import { xml2js, Element as XmlJsNonCompactElement } from 'xml-js';

/**
 * テンプレートマップを構築
 * @param parserOrData - MaiMLParserインスタンスまたはMaiML XML文字列
 * @returns テンプレートIDをキーとするマップ
 */
export const buildTemplateMap = (parserOrData: MaimlParserTyped | string): Record<string, Template> => {
  if (!parserOrData) {
    console.warn('[petriNetExtractor] parserOrDataが空です（buildTemplateMap）');
    return {};
  }
  
  try {
    console.log('🗂️ [petriNetExtractor] テンプレートマップ構築開始');
    
    // MaimlParserTypedインスタンスかmaimlData文字列かを判定
    let parser: MaimlParserTyped;
    
    if (typeof parserOrData === 'string') {
      // 文字列の場合は新しいparserインスタンスを作成
      parser = new MaimlParserTyped(parserOrData);
    } else if (parserOrData instanceof MaimlParserTyped) {
      // MaimlParserTypedインスタンスの場合はそのまま使用
      parser = parserOrData;
    } else {
      throw new Error('Invalid argument type: expected MaimlParserTyped instance or string');
    }
    
    const templates = parser.getTemplates();
    
    const templateMap: Record<string, Template> = {};
    
    // Materials
    templates.material.forEach((t: Template) => {
      const templateEntry: Template = {
        id: t.id,
        name: t.name,
        description: t.description,
        annotation: t.annotation,
        properties: t.properties || [],
        contents: t.contents || [],
        category: 'material',
        uuid: t.uuid,
        placeRefs: t.placeRefs,
        templateRef: t.templateRef,
      };

      // ✅ 全placeRefsをキーとしてマッピング（共通テンプレートの複数place対応）
      if (t.placeRefs && t.placeRefs.length > 0) {
        t.placeRefs.forEach(pr => {
          // ✅ Fix: pr.ref が空の場合は pr.id をフォールバックとして使用
          const key = pr.ref || pr.id;
          if (key) {
            templateMap[key] = templateEntry;
          }
        });
      } else {
        // placeRefsがない場合は従来通り最初のplaceRefで登録
        const placeId = parser.getPlaceRefByTemplateId(t.id);
        if (placeId) {
          templateMap[placeId] = templateEntry;
        }
      }
    });
    
    // Conditions
    templates.condition.forEach((t: Template) => {
      const templateEntry: Template = {
        id: t.id,
        name: t.name,
        description: t.description,
        annotation: t.annotation,
        properties: t.properties || [],
        contents: t.contents || [],
        category: 'condition',
        uuid: t.uuid,
        placeRefs: t.placeRefs,
        templateRef: t.templateRef,
      };

      // ✅ 全placeRefsをキーとしてマッピング（共通テンプレートの複数place対応）
      if (t.placeRefs && t.placeRefs.length > 0) {
        t.placeRefs.forEach(pr => {
          // ✅ Fix: pr.ref が空の場合は pr.id をフォールバックとして使用
          const key = pr.ref || pr.id;
          if (key) {
            templateMap[key] = templateEntry;
          }
        });
      } else {
        const placeId = parser.getPlaceRefByTemplateId(t.id);
        if (placeId) {
          templateMap[placeId] = templateEntry;
        }
      }
    });
    
    // Results
    templates.result.forEach((t: Template) => {
      const templateEntry: Template = {
        id: t.id,
        name: t.name,
        description: t.description,
        annotation: t.annotation,
        properties: t.properties || [],
        contents: t.contents || [],
        category: 'result',
        uuid: t.uuid,
        placeRefs: t.placeRefs,
        templateRef: t.templateRef,
      };

      // ✅ 全placeRefsをキーとしてマッピング（共通テンプレートの複数place対応）
      if (t.placeRefs && t.placeRefs.length > 0) {
        t.placeRefs.forEach(pr => {
          // ✅ Fix: pr.ref が空の場合は pr.id をフォールバックとして使用
          const key = pr.ref || pr.id;
          if (key) {
            templateMap[key] = templateEntry;
          }
        });
      } else {
        const placeId = parser.getPlaceRefByTemplateId(t.id);
        if (placeId) {
          templateMap[placeId] = templateEntry;
        }
      }
    });
    
    // const insertionCount = Object.values(templateMap).filter((t: TemplateMapEntry) => t.insertion).length;
    const insertionCount = 0;
    
    console.log('✅ [petriNetExtractor] テンプレートマップ構築完了:', {
      totalTemplates: Object.keys(templateMap).length,
      withInsertion: insertionCount
    });
    
    if (insertionCount > 0) {
      console.log('📎 [petriNetExtractor] insertion要素を持つテンプレート:', insertionCount);
    }
    
    return templateMap;
    
  } catch (error) {
    console.error('❌ [petriNetExtractor] テンプレートマップ構築エラー:', error);
    return {};
  }
};

  
    // ============================================================================
    // 名前空間テンプレートXMLパース機能（maimlParserTyped.tsから移動）
    // ============================================================================
    
    /**
     * 名前空間テンプレートXMLをパース
     * 
     * keyDictionary形式のXMLファイルから、Property配列を抽出します。
     * カスタム要素（wavelength, power等）はcustomElementsとして保持されます。
     * 
     * @param {string} xmlContent - 名前空間XML文字列
     * @returns {Property[]} Property配列
     * @throws {Error} XML解析エラー
     */
    const parseNamespaceXml = (xmlContent: string): Property[] => {
      try {
        // 1. XML文字列をxml-js Element形式でパース（compact: false）
        const result = xml2js(xmlContent, {
          compact: false,
          ignoreComment: true,
          alwaysChildren: true
        }) as XmlJsNonCompactElement;
        
        // 2. ルート要素を特定（keyDictionary または property）
        let rootElement: XmlJsNonCompactElement | undefined;
        
        if (result.type === 'element') {
          if (result.name === 'keyDictionary') {
            rootElement = result;
          } else if (result.name === 'property') {
            // property直下の場合（単一property）
            return [parsePropertyElement(result)];
          }
        } else if (result.elements && result.elements.length > 0) {
          // declaration等が含まれる場合、最初のelement要素を探す
          rootElement = result.elements.find(
            (el: XmlJsNonCompactElement) => el.type === 'element' && el.name === 'keyDictionary'
          );
        }
        
        if (!rootElement) {
          throw new Error('Root element <keyDictionary> not found in XML');
        }
        
        // 3. property要素を抽出
        const properties: Property[] = [];
        
        if (rootElement.elements) {
          rootElement.elements.forEach((child: XmlJsNonCompactElement) => {
            if (child.type === 'element' && child.name === 'property') {
              properties.push(parsePropertyElement(child));
            }
          });
        }
        
        return properties;
      } catch (error) {
        console.error('❌ parseNamespaceXml() failed:', error);
        throw new Error(`Namespace XML parse error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    
    /**
     * Property要素をパース
     * 
     * @param {XmlJsNonCompactElement} element - xml-js Element
     * @returns {Property} 解析されたProperty
     * @private
     */
    const parsePropertyElement = (element: XmlJsNonCompactElement): Property => {
      const prop: Property = {
        key: element.attributes?.key as string || '',
        xsiType: element.attributes?.['xsi:type'] as string || 'stringType',
        customElements: {},
        properties: [],
        contents: []
      };
      
      // 属性の抽出
      if (element.attributes) {
        if (element.attributes.units) {
          prop.units = element.attributes.units as string;
        }
        if (element.attributes.formatString) {
          prop.formatString = element.attributes.formatString as string;
        }
        if (element.attributes.scaleFactor) {
          prop.scaleFactor = parseFloat(element.attributes.scaleFactor as string);
        }
      }
      
      // 子要素の処理
      if (element.elements) {
        element.elements.forEach((child: XmlJsNonCompactElement) => {
          if (child.type !== 'element') return;
          
          const tagName = child.name as string;
          
          // 標準要素の処理
          if (isStandardPropertyElement(tagName)) {
            if (tagName === 'description') {
              prop.description = extractTextContent(child);
            } else if (tagName === 'value') {
              const valueText = extractTextContent(child);
              // 数値変換を試みる
              const numValue = parseFloat(valueText);
              prop.value = isNaN(numValue) ? valueText : numValue;
            } else if (tagName === 'property') {
              // ネストされたproperty
              if (!prop.properties) {
                prop.properties = [];
              }
              prop.properties.push(parsePropertyElement(child));
            }
          } else {
            // カスタム要素の処理
            if (!prop.customElements) {
              prop.customElements = {};
            }
            prop.customElements[tagName] = parseCustomElement(child);
          }
        });
      }
      
      // customElementsが空の場合は削除
      if (prop.customElements && Object.keys(prop.customElements).length === 0) {
        delete prop.customElements;
      }
      
      return prop;
    };
    
    /**
     * PropertyCustomElementを再帰的に解析
     * 
     * @param {XmlJsNonCompactElement} element - xml-js Element
     * @param {number} depth - 再帰の深さ（最大10階層）
     * @returns {PropertyCustomElement} 解析されたカスタム要素
     * @private
     */
    const parseCustomElement = (
      element: XmlJsNonCompactElement,
      depth: number = 0
    ): PropertyCustomElement => {
      // 深さ制限チェック
      if (depth > 10) {
        console.warn('⚠️ Max depth exceeded in parseCustomElement');
        return {};
      }
      
      const customElement: PropertyCustomElement = {};
      
      // 属性の抽出
      if (element.attributes && Object.keys(element.attributes).length > 0) {
        customElement.attributes = {};
        Object.entries(element.attributes).forEach(([key, value]) => {
          customElement.attributes![key] = String(value);
        });
      }
      
      // 子要素の処理
      let hasChildren = false;
      if (element.elements && element.elements.length > 0) {
        const textContent = extractTextContent(element);
        
        // テキストノードのみの場合
        const hasOnlyText = element.elements.every(
          (el: XmlJsNonCompactElement) => el.type === 'text'
        );
        
        if (hasOnlyText && textContent) {
          // 数値変換を試みる
          const numValue = parseFloat(textContent);
          customElement.value = isNaN(numValue) ? textContent : numValue;
        } else {
          // 子要素がある場合
          customElement.children = {};
          
          element.elements.forEach((child: XmlJsNonCompactElement) => {
            if (child.type === 'element' && child.name) {
              hasChildren = true;
              customElement.children![child.name] = parseCustomElement(child, depth + 1);
            }
          });
          
          // children が空の場合は削除
          if (!hasChildren) {
            delete customElement.children;
            // テキストコンテンツがあれば value として設定
            if (textContent) {
              const numValue = parseFloat(textContent);
              customElement.value = isNaN(numValue) ? textContent : numValue;
            }
          }
        }
      }
      
      return customElement;
    };
    
    /**
     * 標準Property要素かどうかを判定
     * 
     * @param {string} tagName - タグ名
     * @returns {boolean} 標準要素の場合true
     * @private
     */
    const isStandardPropertyElement = (tagName: string): boolean => {
      const standardTags = [
        'description',
        'value',
        'values',
        'property',
        'content',
        'uncertainty'
      ];
      return standardTags.includes(tagName);
    };
    
    /**
     * 要素からテキストコンテンツを抽出
     * 
     * @param {XmlJsNonCompactElement} element - xml-js Element
     * @returns {string} 抽出されたテキスト
     * @private
     */
    const extractTextContent = (element: XmlJsNonCompactElement): string => {
      if (!element.elements) {
        return '';
      }
      
      const textParts: string[] = [];
      
      element.elements.forEach((child: XmlJsNonCompactElement) => {
        if (child.type === 'text' && child.text) {
          textParts.push(String(child.text).trim());
        } else if (child.type === 'cdata' && child.cdata) {
          textParts.push(String(child.cdata).trim());
        }
      });
      
      return textParts.join(' ').trim();
    };
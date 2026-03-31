/**
 * Template to XML Converter（TypeScript版）
 *
 * TemplateEditorDialogで編集されたテンプレートデータをMaiML準拠のXML形式に変換
 *
 * @version 1.0.0
 */

import { escapeXml } from './reactFlowToMaiml';
import { Insertion, Hash } from '@/types/maiml-unified';
import type { PropertyData } from '../../components/NestedPropertyEditor';

// ===== 型定義 =====

/**
 * NestedPropertyEditor形式のプロパティ/コンテントデータ
 * NestedPropertyEditor の PropertyData と同一構造
 */
export type NestedPropertyData = PropertyData;

/**
 * NestedPropertyEditor形式のコンテントデータ（PropertyData と同一構造）
 */
export type NestedContentData = PropertyData;

/** convertTemplateToXML に渡すテンプレートデータ */
export interface TemplateEditorData {
  /** テンプレートID */
  id?: string;
  /** テンプレートID（後方互換） */
  templateId?: string;
  /** UUID */
  uuid?: string;
  /** 名前 */
  name?: string;
  /** 説明 */
  description?: string;
  /** 継承元テンプレート参照（#id 形式） */
  href?: string;
  /** ファイル挿入情報 */
  insertion?: Insertion;
  /** プロパティ（NestedPropertyEditor形式） */
  properties?: Record<string, NestedPropertyData>;
  /** コンテント（NestedPropertyEditor形式、resultTemplateのみ） */
  contents?: Record<string, NestedContentData>;
  /** placeRef の ref 文字列配列 */
  placeRefs?: string[];
  /** 後方互換：単一placeRef */
  placeRef?: string;
}

/** parseXMLToTemplate の戻り値 */
export interface ParseXMLResult {
  success: boolean;
  data: TemplateEditorData | null;
  errors: ParseError[];
}

/** バリデーション・パースエラー */
export interface ParseError {
  type: string;
  message: string;
  details?: string;
}

/** validateTemplateXML の戻り値 */
export interface ValidateXMLResult {
  isValid: boolean;
  errors: ParseError[];
}

// ===== メイン関数 =====

/**
 * テンプレートデータをXML文字列に変換（TemplateEditorDialog用）
 * @param templateData - TemplateEditorDialogのテンプレートデータ
 * @param templateType - テンプレートタイプ（material/condition/result）
 * @returns XML文字列
 */
export function convertTemplateToXML(
  templateData: TemplateEditorData,
  templateType: string
): string {
  console.log('📝 [convertTemplateToXML] 変換開始:', { templateType, templateData });

  const templateTagMap: Record<string, string> = {
    material: 'materialTemplate',
    condition: 'conditionTemplate',
    result: 'resultTemplate',
  };

  const templateTag = templateTagMap[templateType] || 'materialTemplate';
  const templateId = templateData.id || templateData.templateId || 'template_1';

  let xml = `<${templateTag} id="${escapeXml(templateId)}"\n`;
  xml += `  xmlns="http://www.jsbba.or.jp/maiml/1.0"\n`;
  xml += `  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;

  // UUID
  if (templateData.uuid) {
    xml += `  <uuid>${escapeXml(templateData.uuid)}</uuid>\n`;
  }

  // templateRef（継承元テンプレート参照）
  if (templateData.href) {
    const templateRefId = `templateRef_${templateId}`;
    const refId = templateData.href.startsWith('#')
      ? templateData.href.substring(1)
      : templateData.href;
    xml += `  <templateRef id="${escapeXml(templateRefId)}" ref="${escapeXml(refId)}"/>\n`;
  }

  // insertion要素（MaterialTemplate・ResultTemplateのみ）
  if (
    (templateType === 'material' || templateType === 'result') &&
    templateData.insertion
  ) {
    xml += `  <insertion>\n`;
    if (templateData.insertion.uri !== undefined) {
      xml += `    <uri>${escapeXml(templateData.insertion.uri || '')}</uri>\n`;
    }
    if (templateData.insertion.hash !== undefined) {
      const hash = templateData.insertion.hash;
      if (typeof hash === 'string') {
        // 文字列形式の場合（後方互換）
        xml += `    <hash>${escapeXml(hash)}</hash>\n`;
      } else if (hash && typeof hash === 'object') {
        // オブジェクト形式 { method, value } の場合
        const method = (hash as Hash).method || '';
        const value = (hash as Hash).value || '';
        if (method) {
          xml += `    <hash method="${escapeXml(method)}">${escapeXml(value)}</hash>\n`;
        } else {
          xml += `    <hash>${escapeXml(value)}</hash>\n`;
        }
      }
    }
    if (templateData.insertion.format) {
      xml += `    <format>${escapeXml(templateData.insertion.format)}</format>\n`;
    }
    xml += `  </insertion>\n`;
  }

  // name
  if (templateData.name) {
    xml += `  <name>${escapeXml(templateData.name)}</name>\n`;
  }

  // description
  if (templateData.description) {
    xml += `  <description>${escapeXml(templateData.description)}</description>\n`;
  }

  // properties（NestedPropertyEditor形式）
  if (templateData.properties && typeof templateData.properties === 'object') {
    Object.entries(templateData.properties).forEach(([key, propData]) => {
      xml += buildPropertyXMLFromNested(propData, key, 1);
    });
  }

  // contents（ResultTemplateのみ）
  if (
    templateType === 'result' &&
    templateData.contents &&
    typeof templateData.contents === 'object'
  ) {
    Object.entries(templateData.contents).forEach(([key, contentData]) => {
      xml += buildContentXMLFromNested(contentData, key, 1);
    });
  }

  // placeRef（複数対応）
  if (templateData.placeRefs && Array.isArray(templateData.placeRefs)) {
    templateData.placeRefs.forEach((placeRef, index) => {
      const placeRefId =
        index === 0 ? `${templateId}TL` : `${templateId}TL_ref${index}`;
      xml += `  <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(placeRef)}"/>\n`;
    });
  } else if (templateData.placeRef) {
    // 後方互換性：単一placeRef
    const placeRefId = `${templateId}TL`;
    xml += `  <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(templateData.placeRef)}"/>\n`;
  }

  xml += `</${templateTag}>`;

  console.log('✅ [convertTemplateToXML] 変換完了');
  return xml;
}

/**
 * NestedPropertyEditor形式のプロパティをXMLに変換（内部関数）
 */
function buildPropertyXMLFromNested(
  propData: NestedPropertyData,
  key: string,
  indentLevel: number = 1
): string {
  const indent = '  '.repeat(indentLevel);
  const tagName = propData.tagName || 'property';

  let xml = `${indent}<${tagName} key="${escapeXml(key)}"`;

  // attributes
  if (propData.attributes && typeof propData.attributes === 'object') {
    Object.entries(propData.attributes).forEach(([attrName, attrValue]) => {
      if (attrValue !== undefined && attrValue !== null && attrValue !== '') {
        xml += ` ${attrName}="${escapeXml(String(attrValue))}"`;
      }
    });
  }

  const hasElements =
    propData.elements && Object.keys(propData.elements).length > 0;
  const hasChildren =
    propData.children && propData.children.length > 0;

  if (!hasElements && !hasChildren) {
    xml += `/>\n`;
    return xml;
  }

  xml += `>\n`;

  if (hasElements && propData.elements) {
    Object.entries(propData.elements).forEach(([elemName, elemValue]) => {
      if (elemValue !== undefined && elemValue !== null && elemValue !== '') {
        xml += `${indent}  <${elemName}>${escapeXml(String(elemValue))}</${elemName}>\n`;
      }
    });
  }

  if (hasChildren && propData.children) {
    propData.children.forEach((child) => {
      const childKey = child.key || 'property';
      xml += buildPropertyXMLFromNested(child, childKey, indentLevel + 1);
    });
  }

  xml += `${indent}</${tagName}>\n`;
  return xml;
}

/**
 * NestedPropertyEditor形式のcontentをXMLに変換（内部関数）
 */
function buildContentXMLFromNested(
  contentData: NestedContentData,
  key: string,
  indentLevel: number = 1
): string {
  const indent = '  '.repeat(indentLevel);
  const tagName = contentData.tagName || 'content';

  let xml = `${indent}<${tagName} key="${escapeXml(key)}"`;

  if (contentData.attributes && typeof contentData.attributes === 'object') {
    Object.entries(contentData.attributes).forEach(([attrName, attrValue]) => {
      if (attrValue !== undefined && attrValue !== null && attrValue !== '') {
        xml += ` ${attrName}="${escapeXml(String(attrValue))}"`;
      }
    });
  }

  const hasElements =
    contentData.elements && Object.keys(contentData.elements).length > 0;
  const hasChildren =
    contentData.children && contentData.children.length > 0;

  if (!hasElements && !hasChildren) {
    xml += `/>\n`;
    return xml;
  }

  xml += `>\n`;

  if (hasElements && contentData.elements) {
    Object.entries(contentData.elements).forEach(([elemName, elemValue]) => {
      if (elemValue !== undefined && elemValue !== null && elemValue !== '') {
        xml += `${indent}  <${elemName}>${escapeXml(String(elemValue))}</${elemName}>\n`;
      }
    });
  }

  if (hasChildren && contentData.children) {
    contentData.children.forEach((child) => {
      const childKey = child.key || 'content';
      xml += buildContentXMLFromNested(child, childKey, indentLevel + 1);
    });
  }

  xml += `${indent}</${tagName}>\n`;
  return xml;
}

// ===== XML → テンプレートデータ =====

/**
 * XML文字列をテンプレートデータ構造にパース（TemplateEditorDialog用）
 * @param xmlString - XML文字列
 * @returns ParseXMLResult
 */
export function parseXMLToTemplate(xmlString: string): ParseXMLResult {
  console.log('📖 [parseXMLToTemplate] パース開始');

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error('❌ [parseXMLToTemplate] XMLパースエラー:', parseError.textContent);
      return {
        success: false,
        data: null,
        errors: [
          {
            type: 'parse_error',
            message: 'XML形式が不正です',
            details: parseError.textContent ?? undefined,
          },
        ],
      };
    }

    const rootElement = xmlDoc.documentElement;
    const templateTag = rootElement.tagName;

    if (
      !['materialTemplate', 'conditionTemplate', 'resultTemplate'].includes(
        templateTag
      )
    ) {
      return {
        success: false,
        data: null,
        errors: [
          {
            type: 'invalid_root',
            message: `不正なルート要素: ${templateTag}`,
            details:
              'materialTemplate, conditionTemplate, resultTemplate のいずれかが必要です',
          },
        ],
      };
    }

    const templateData: TemplateEditorData = {
      id: rootElement.getAttribute('id') || '',
      uuid: getElementText(rootElement, 'uuid'),
      name: getElementText(rootElement, 'name'),
      description: getElementText(rootElement, 'description'),
      properties: {},
      contents: {},
      placeRefs: [],
    };

    // templateRef
    const templateRefElement = rootElement.querySelector(':scope > templateRef');
    if (templateRefElement) {
      const refId = templateRefElement.getAttribute('ref');
      templateData.href = refId ? `#${refId}` : '';
    }

    // insertion
    const insertionElement = rootElement.querySelector(':scope > insertion');
    if (insertionElement) {
      const hashElement = insertionElement.querySelector(':scope > hash');
      const hashValue = hashElement ? (hashElement.textContent?.trim() ?? '') : '';
      const hashMethod = hashElement ? (hashElement.getAttribute('method') ?? '') : '';
      const hashObj: Hash = hashMethod ? { method: hashMethod, value: hashValue } : { value: hashValue };
      templateData.insertion = {
        uri: getElementText(insertionElement, 'uri') || '',
        hash: hashObj,
        format: getElementText(insertionElement, 'format'),
      };
    }

    // properties
    const propertyElements = rootElement.querySelectorAll(':scope > property');
    propertyElements.forEach((propEl) => {
      const key = propEl.getAttribute('key');
      if (key && templateData.properties) {
        templateData.properties[key] = parsePropertyElement(propEl);
      }
    });

    // contents（ResultTemplateのみ）
    if (templateTag === 'resultTemplate') {
      const contentElements = rootElement.querySelectorAll(':scope > content');
      contentElements.forEach((contentEl) => {
        const key = contentEl.getAttribute('key');
        if (key && templateData.contents) {
          templateData.contents[key] = parseContentElement(contentEl);
        }
      });
    }

    // placeRefs
    const placeRefElements = rootElement.querySelectorAll(':scope > placeRef');
    placeRefElements.forEach((placeRefEl) => {
      const ref = placeRefEl.getAttribute('ref');
      if (ref && templateData.placeRefs) {
        templateData.placeRefs.push(ref);
      }
    });

    console.log('✅ [parseXMLToTemplate] パース成功:', {
      id: templateData.id,
      propertyCount: Object.keys(templateData.properties ?? {}).length,
      contentCount: Object.keys(templateData.contents ?? {}).length,
      placeRefCount: templateData.placeRefs?.length ?? 0,
    });

    return { success: true, data: templateData, errors: [] };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('❌ [parseXMLToTemplate] パースエラー:', err);
    return {
      success: false,
      data: null,
      errors: [
        {
          type: 'exception',
          message: 'XMLパース中にエラーが発生しました',
          details: err.message,
        },
      ],
    };
  }
}

/** property要素をパースして NestedPropertyData に変換（内部関数） */
function parsePropertyElement(propElement: Element): NestedPropertyData {
  const propData: NestedPropertyData = {
    key: propElement.getAttribute('key') ?? '',
    tagName: propElement.tagName,
    attributes: {},
    elements: {},
    children: [],
  };

  Array.from(propElement.attributes).forEach((attr) => {
    if (attr.name !== 'key' && propData.attributes) {
      propData.attributes[attr.name] = attr.value;
    }
  });

  Array.from(propElement.children).forEach((child) => {
    const childTagName = child.tagName;
    if (['property', 'content', 'parameter'].includes(childTagName.toLowerCase())) {
      propData.children?.push(parsePropertyElement(child));
    } else {
      const textContent = child.textContent?.trim() ?? '';
      if (textContent && propData.elements) {
        propData.elements[childTagName] = textContent;
      }
    }
  });

  return propData;
}

/** content要素をパースして NestedContentData に変換（内部関数） */
function parseContentElement(contentElement: Element): NestedContentData {
  const contentData: NestedContentData = {
    key: contentElement.getAttribute('key') ?? '',
    tagName: contentElement.tagName,
    attributes: {},
    elements: {},
    children: [],
  };

  Array.from(contentElement.attributes).forEach((attr) => {
    if (attr.name !== 'key' && contentData.attributes) {
      contentData.attributes[attr.name] = attr.value;
    }
  });

  Array.from(contentElement.children).forEach((child) => {
    const childTagName = child.tagName;
    if (['property', 'content', 'parameter'].includes(childTagName.toLowerCase())) {
      contentData.children?.push(parseContentElement(child));
    } else {
      const textContent = child.textContent?.trim() ?? '';
      if (textContent && contentData.elements) {
        contentData.elements[childTagName] = textContent;
      }
    }
  });

  return contentData;
}

/** ヘルパー：要素のテキストコンテンツを取得 */
function getElementText(parentElement: Element, tagName: string): string {
  const element = parentElement.querySelector(`:scope > ${tagName}`);
  return element ? (element.textContent?.trim() ?? '') : '';
}

// ===== バリデーション =====

/**
 * XMLバリデーション（基本チェック）
 * @param xmlString - XML文字列
 * @returns ValidateXMLResult
 */
export function validateTemplateXML(xmlString: string): ValidateXMLResult {
  console.log('🔍 [validateTemplateXML] バリデーション開始');

  const errors: ParseError[] = [];

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      errors.push({
        type: 'xml_syntax_error',
        message: 'XML構文エラー',
        details: parseError.textContent ?? undefined,
      });
      return { isValid: false, errors };
    }

    const rootElement = xmlDoc.documentElement;
    const templateTag = rootElement.tagName;

    if (
      !['materialTemplate', 'conditionTemplate', 'resultTemplate'].includes(
        templateTag
      )
    ) {
      errors.push({
        type: 'invalid_root_element',
        message: `不正なルート要素: ${templateTag}`,
        details:
          'materialTemplate, conditionTemplate, resultTemplate のいずれかが必要です',
      });
    }

    const templateId = rootElement.getAttribute('id');
    if (!templateId) {
      errors.push({
        type: 'missing_id',
        message: 'テンプレートIDが指定されていません',
        details: 'id属性は必須です',
      });
    }

    const propertyElements = rootElement.querySelectorAll('property');
    propertyElements.forEach((propEl, index) => {
      const key = propEl.getAttribute('key');
      if (!key) {
        errors.push({
          type: 'missing_property_key',
          message: `property要素[${index}]にkey属性がありません`,
          details: 'すべてのproperty要素にはkey属性が必要です',
        });
      }
    });

    if (templateTag === 'resultTemplate') {
      const contentElements = rootElement.querySelectorAll('content');
      contentElements.forEach((contentEl, index) => {
        const key = contentEl.getAttribute('key');
        if (!key) {
          errors.push({
            type: 'missing_content_key',
            message: `content要素[${index}]にkey属性がありません`,
            details: 'すべてのcontent要素にはkey属性が必要です',
          });
        }
      });
    }

    console.log('✅ [validateTemplateXML] バリデーション完了:', {
      isValid: errors.length === 0,
      errorCount: errors.length,
    });

    return { isValid: errors.length === 0, errors };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('❌ [validateTemplateXML] バリデーションエラー:', err);
    errors.push({
      type: 'validation_exception',
      message: 'バリデーション中にエラーが発生しました',
      details: err.message,
    });
    return { isValid: false, errors };
  }
}

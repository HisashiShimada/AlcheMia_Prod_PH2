/**
 * Template Extractor
 * MaiMLデータからテンプレート情報を抽出
 */

import type { Template, Property, ValidationResult, ValidationError } from '../types';

/**
 * テンプレート抽出結果
 */
export interface ExtractedTemplates {
  material: Template[];
  condition: Template[];
  result: Template[];
}

/**
 * テンプレートエラーマップ
 */
export interface TemplateErrorMap {
  [templateId: string]: ValidationError[];
}

/**
 * エラー分類結果
 */
export interface ClassifiedErrors {
  critical: ValidationError[];
  nonCritical: ValidationError[];
}

/**
 * property要素を再帰的に完全抽出（MaiMLParser.js形式）
 */
const extractPropertyRecursive = (propEl: Element): Property => {
  const key = propEl.getAttribute('key') || propEl.getAttribute('id') || '';
  const xsiType = propEl.getAttribute('xsi:type') || 'stringType';
  const units = propEl.getAttribute('units') || '';
  const formatString = propEl.getAttribute('formatString') || '';
  const scaleFactor = propEl.getAttribute('scaleFactor') || '';
  
  // value要素
  const valueEl = propEl.querySelector(':scope > value');
  const defaultValue = valueEl ? valueEl.textContent?.trim() || '' : '';
  
  // description要素
  const descriptionEl = propEl.querySelector(':scope > description');
  const description = descriptionEl ? descriptionEl.textContent?.trim() || '' : '';
  
  const property: Property = {
    id: key,
    name: key,
    type: xsiType,
    value: defaultValue,
    description
  };
  
  // units, formatString, scaleFactorを追加
  if (units) property.unit = units;
  if (formatString) property.formatString = formatString;
  if (scaleFactor) property.scaleFactor = parseFloat(scaleFactor) || 1.0;
  
  // 子property要素を再帰的に抽出
  const childProperties = Array.from(propEl.querySelectorAll<Element>(':scope > property'));
  if (childProperties.length > 0) {
    property.properties = childProperties.map(extractPropertyRecursive);
  }
  
  // content要素も抽出
  const contentElements = Array.from(propEl.querySelectorAll<Element>(':scope > content'));
  if (contentElements.length > 0) {
    if (!property.properties) property.properties = [];
    contentElements.forEach(contentEl => {
      const contentKey = contentEl.getAttribute('key') || '';
      const contentType = contentEl.getAttribute('xsi:type') || 'contentDoubleListType';
      const axis = contentEl.getAttribute('axis') || '';
      const size = parseInt(contentEl.getAttribute('size') || '0') || 0;
      const contentUnits = contentEl.getAttribute('units') || '';
      
      property.properties!.push({
        id: contentKey,
        name: contentKey,
        type: contentType,
        value: '',
        tagName: 'content',
        axis,
        size,
        unit: contentUnits
      });
    });
  }
  
  return property;
};

/**
 * テンプレート要素から情報を抽出
 */
const extractTemplateInfo = (type: string, templateEl: Element): Template => {
  const id = templateEl.getAttribute('id') || '';
  
  // name要素（必須ではない。ない場合は空文字）
  const nameEl = templateEl.querySelector('name');
  const name = nameEl?.textContent || '';
  
  // description要素
  const descriptionEl = templateEl.querySelector('description');
  const description = descriptionEl?.textContent || '';
  
  // uuid要素（存在する場合）
  const uuidEl = templateEl.querySelector('uuid');
  const uuid = uuidEl?.textContent || '';
  
  // property要素を完全に抽出（MaiMLParser.js形式）
  const properties = Array.from(templateEl.querySelectorAll<Element>(':scope > property')).map(propEl => {
    return extractPropertyRecursive(propEl);
  });
  
  // placeRef要素
  const placeRefs = Array.from(templateEl.querySelectorAll('placeRef')).map(refEl => {
    return refEl.getAttribute('ref') || 
           refEl.getAttribute('idref') || 
           refEl.getAttribute('href')?.replace('#', '') || '';
  }).filter(ref => ref);
  
  return {
    id,
    uuid: uuid || id,
    name,
    description,
    type,
    properties,
    placeRefs,
    propertiesCount: properties.length,
    placeRefsCount: placeRefs.length
  };
};

/**
 * MaiMLデータからテンプレート情報を抽出
 */
export const extractTemplatesFromMaiML = (maimlData: string | null | undefined): ExtractedTemplates => {
  if (!maimlData) {
    return { material: [], condition: [], result: [] };
  }

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(maimlData, 'text/xml');

    // パースエラーチェック
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error('❌ [TemplateExtractor] XML parse error:', parseError.textContent);
      return { material: [], condition: [], result: [] };
    }

    // Material Templates
    const materialTemplates = Array.from(xmlDoc.querySelectorAll('materialTemplate')).map(
      el => extractTemplateInfo('material', el)
    );

    // Condition Templates
    const conditionTemplates = Array.from(xmlDoc.querySelectorAll('conditionTemplate')).map(
      el => extractTemplateInfo('condition', el)
    );

    // Result Templates
    const resultTemplates = Array.from(xmlDoc.querySelectorAll('resultTemplate')).map(
      el => extractTemplateInfo('result', el)
    );

    console.log('✅ [TemplateExtractor] テンプレート抽出完了:', {
      material: materialTemplates.length,
      condition: conditionTemplates.length,
      result: resultTemplates.length
    });

    return {
      material: materialTemplates,
      condition: conditionTemplates,
      result: resultTemplates
    };
  } catch (error) {
    console.error('❌ [TemplateExtractor] テンプレート抽出エラー:', error);
    return { material: [], condition: [], result: [] };
  }
};

/**
 * バリデーション結果からテンプレート関連エラーを抽出してマッピング
 */
export const mapValidationErrorsToTemplates = (
  validationResult: ValidationResult | null | undefined,
  templates: ExtractedTemplates
): TemplateErrorMap => {
  if (!validationResult || !validationResult.errors) {
    return {};
  }

  const errorMap: TemplateErrorMap = {};

  // 全テンプレートのIDリストを作成
  const allTemplateIds = [
    ...templates.material.map(t => t.id),
    ...templates.condition.map(t => t.id),
    ...templates.result.map(t => t.id)
  ];

  // エラーをテンプレートにマッピング
  validationResult.errors.forEach(error => {
    // xpathからテンプレートIDを抽出
    if (error.xpath) {
      // materialTemplate[@id='xxx'], conditionTemplate[@id='xxx'], resultTemplate[@id='xxx']
      const match = error.xpath.match(/(?:material|condition|result)Template\[@id='([^']+)'\]/);
      if (match) {
        const templateId = match[1];
        if (allTemplateIds.includes(templateId)) {
          if (!errorMap[templateId]) {
            errorMap[templateId] = [];
          }
          errorMap[templateId].push(error);
        }
      }
    }
    
    // pathsからも抽出
    if (error.paths && Array.isArray(error.paths)) {
      error.paths.forEach(path => {
        const match = path.match(/(?:material|condition|result)Template\[@id='([^']+)'\]/);
        if (match) {
          const templateId = match[1];
          if (allTemplateIds.includes(templateId)) {
            if (!errorMap[templateId]) {
              errorMap[templateId] = [];
            }
            // 重複チェック
            const isDuplicate = errorMap[templateId].some(e => 
              e.type === error.type && e.message === error.message
            );
            if (!isDuplicate) {
              errorMap[templateId].push(error);
            }
          }
        }
      });
    }
  });

  console.log('✅ [TemplateExtractor] エラーマッピング完了:', {
    templateCount: allTemplateIds.length,
    errorsCount: validationResult.errors.length,
    templatesWithErrors: Object.keys(errorMap).length,
    errorMap
  });

  return errorMap;
};

/**
 * テンプレートエラーを critical/non-critical に分類
 */
export const classifyTemplateErrors = (errors: ValidationError[] | null | undefined): ClassifiedErrors => {
  if (!errors || !Array.isArray(errors)) {
    return { critical: [], nonCritical: [] };
  }

  const criticalTypes = ['syntax_error', 'invalid_structure'];
  
  const critical = errors.filter(err => criticalTypes.includes(err.type));
  const nonCritical = errors.filter(err => !criticalTypes.includes(err.type));

  return { critical, nonCritical };
};
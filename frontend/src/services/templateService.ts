/**
 * Template Service
 * テンプレート抽出サービス（純粋関数）
 * PetriNetEditorへの依存なし
 * 
 * @version 1.0.0
 * @date 2026-01-28
 */

import { TemplatesByCategory } from "@/components/editorv2/components/TemplateViewer/TemplateList";
import { Template } from "@/types/maiml-unified";
import { TemplateError } from "@/components/editorv2/components/TemplateViewer/TemplateItem";

import { MaimlParserTyped } from "@/utils/maimlParserTyped";

/**
 * Property型定義（内部使用）
 */
interface PropertyRecursive {
  key: string;
  type: string;
  xsiType: string;
  defaultValue: string;
  description: string;
  units?: string;
  formatString?: string;
  scaleFactor?: number;
  properties?: PropertyRecursive[];
  tagName?: string;
  axis?: string;
  size?: number;
}

/**
 * ValidationResult型定義
 */
interface ValidationResult {
  errors?: Array<{
    message?: string;
    type?: string;
    xpath?: string;
    paths?: string[];
    ref?: string;
    '@_ref'?: string;
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }>;
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * ✅ 新規: property要素を再帰的に完全抽出（MaiMLParser.js形式）
 * @param propEl - property要素
 * @returns プロパティ情報（MaiMLParser形式）
 */
const extractPropertyRecursive = (propEl: Element): PropertyRecursive => {
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

  const property: PropertyRecursive = {
    key,
    type: xsiType,
    xsiType,
    defaultValue,
    description,
  };

  // ✅ units, formatString, scaleFactorを追加
  if (units) property.units = units;
  if (formatString) property.formatString = formatString;
  if (scaleFactor) property.scaleFactor = parseFloat(scaleFactor) || 1.0;

  // ✅ 子property要素を再帰的に抽出
  const childProperties = Array.from(propEl.querySelectorAll(':scope > property'));
  if (childProperties.length > 0) {
    property.properties = childProperties.map(extractPropertyRecursive);
  }

  // ✅ content要素も抽出
  const contentElements = Array.from(propEl.querySelectorAll(':scope > content'));
  if (contentElements.length > 0) {
    if (!property.properties) property.properties = [];
    contentElements.forEach((contentEl) => {
      const contentKey = contentEl.getAttribute('key') || '';
      const contentType = contentEl.getAttribute('xsi:type') || 'contentDoubleListType';
      const axis = contentEl.getAttribute('axis') || '';
      const size = parseInt(contentEl.getAttribute('size') || '0') || 0;
      const contentUnits = contentEl.getAttribute('units') || '';

      property.properties!.push({
        key: contentKey,
        type: contentType,
        xsiType: contentType,
        tagName: 'content',
        axis,
        size,
        units: contentUnits,
        defaultValue: '',
        description: '',
      });
    });
  }

  return property;
};

/**
 * テンプレート要素から情報を抽出
 * @param type - テンプレートタイプ ('material' | 'condition' | 'result')
 * @param templateEl - テンプレート要素
 * @returns テンプレート情報
 */
// const extractTemplateInfo = (
//   type: 'material' | 'condition' | 'result',
//   templateEl: Element
// ): Template => {
//   const id = templateEl.getAttribute('id') || '';

//   // ✅ 新規: 祖先要素からmethodIdを取得
//   let methodId: string | null = null;
//   let parent = templateEl.parentElement;

//   while (parent) {
//     const parentLocalName = parent.localName || parent.tagName;
//     if (parentLocalName === 'method') {
//       methodId = parent.getAttribute('id');
//       break;
//     }
//     parent = parent.parentElement;
//   }

//   // uuid要素（子要素として）
//   const uuidEl = templateEl.querySelector(':scope > uuid');
//   const uuid = uuidEl?.textContent?.trim() || '';

//   // name要素（定義値のみ、フォールバックなし）
//   const nameEl = templateEl.querySelector(':scope > name');
//   const name = nameEl?.textContent?.trim() || '';

//   // description要素
//   const descriptionEl = templateEl.querySelector(':scope > description');
//   const description = descriptionEl?.textContent?.trim() || '';

//   // ✅ 修正: property要素を完全に抽出（MaiMLParser.js形式）
//   const properties = Array.from(templateEl.querySelectorAll(':scope > property')).map((propEl) => {
//     return extractPropertyRecursive(propEl);
//   });

//   // placeRef要素
//   const placeRefs = Array.from(templateEl.querySelectorAll(':scope > placeRef'))
//     .map((refEl) => {
//       return (
//         refEl.getAttribute('ref') ||
//         refEl.getAttribute('idref') ||
//         refEl.getAttribute('href')?.replace('#', '') ||
//         ''
//       );
//     })
//     .filter((ref) => ref);

//   // templateRef要素（共有テンプレート参照）
//   const templateRefs = Array.from(templateEl.querySelectorAll(':scope > templateRef'))
//     .map((refEl) => {
//       return (
//         refEl.getAttribute('ref') ||
//         refEl.getAttribute('idref') ||
//         refEl.getAttribute('href')?.replace('#', '') ||
//         ''
//       );
//     })
//     .filter((ref) => ref);

//   return {
//     id,
//     name,
//     propertiesCount: properties.length,
//     placeRefsCount: placeRefs.length,
//     type,
//     description,
//     data: {
//       id,
//       uuid,
//       name,
//       description,
//       methodId, // ✅ 追加: 所属メソッドID（nullの場合は共通テンプレート）
//       properties: properties as any, // eslint-disable-line @typescript-eslint/no-explicit-any
//       placeRefs,
//       templateRefs,
//       templateRefsCount: templateRefs.length,
//     },
//   };
// };

/**
 * MaiMLデータからテンプレート情報を抽出
 * @param maimlData - MaiML XML文字列
 * @returns テンプレート情報 { material: [], condition: [], result: [] }
 */
// export const extractTemplatesFromMaiML = (maimlData: string): TemplatesByCategory => {
//   if (!maimlData) {
//     return { material: [], condition: [], result: [] };
//   }

//   try {
//     // ✅ 修正: 空の名前空間宣言を削除してからパース
//     // "xmlns:xsi=""のような空の名前空間宣言を削除
//     const cleanedMaimlData = maimlData.replace(/xmlns:[a-zA-Z]+=""\s*/g, '');

//     console.log('🔍 [TemplateService] XMLパース前処理:', {
//       originalLength: maimlData.length,
//       cleanedLength: cleanedMaimlData.length,
//       removedBytes: maimlData.length - cleanedMaimlData.length,
//     });

//     // const parser = new DOMParser();
//     // const xmlDoc = parser.parseFromString(cleanedMaimlData, 'text/xml');
//     const parser = new MaimlParserTyped(maimlData);

//     // パースエラーチェック
//     const parseError = xmlDoc.querySelector('parsererror');
//     if (parseError) {
//       console.error('❌ [TemplateService] XML parse error:', parseError.textContent);
//       console.error(
//         '❌ [TemplateService] Line 335付近:',
//         cleanedMaimlData.split('\n').slice(333, 338).join('\n')
//       );
//       return { material: [], condition: [], result: [] };
//     }

//     // ✅ 修正: 名前空間を考慮した要素取得
//     // querySelector('materialTemplate')は名前空間付き要素を見つけられない
//     // getElementsByTagName('materialTemplate')または'*'で全要素取得して手動フィルタ

//     const allElements = xmlDoc.getElementsByTagName('*');
//     const materialTemplates: Template[] = [];
//     const conditionTemplates: Template[] = [];
//     const resultTemplates: Template[] = [];

//     for (let i = 0; i < allElements.length; i++) {
//       const el = allElements[i];
//       const localName = el.localName || el.tagName;

//       if (localName === 'materialTemplate') {
//         materialTemplates.push(extractTemplateInfo('material', el));
//       } else if (localName === 'conditionTemplate') {
//         conditionTemplates.push(extractTemplateInfo('condition', el));
//       } else if (localName === 'resultTemplate') {
//         resultTemplates.push(extractTemplateInfo('result', el));
//       }
//     }

//     console.log('✅ [TemplateService] テンプレート抽出完了:', {
//       material: materialTemplates.length,
//       condition: conditionTemplates.length,
//       result: resultTemplates.length,
//     });

//     return {
//       material: materialTemplates,
//       condition: conditionTemplates,
//       result: resultTemplates,
//     };
//   } catch (error) {
//     console.error('❌ [TemplateService] テンプレート抽出エラー:', error);
//     return { material: [], condition: [], result: [] };
//   }
// };

/**
 * バリデーション結果からテンプレート関連エラーを抽出してマッピング
 * @param validationResult - バリデーション結果
 * @param templates - テンプレート情報
 * @returns テンプレートIDをキーとするエラーマップ { templateId: [errors] }
 */
export const mapValidationErrorsToTemplates = (
  validationResult: ValidationResult,
  templates: TemplatesByCategory
): Record<string, TemplateError[]> => {
  if (!validationResult || !validationResult.errors) {
    return {};
  }

  const errorMap: Record<string, TemplateError[]> = {};

  // 全テンプレートのIDリストを作成
  const allTemplateIds = [
    ...templates.material.map((t) => t.id),
    ...templates.condition.map((t) => t.id),
    ...templates.result.map((t) => t.id),
  ];

  // デバッグ: エラーのサンプルを出力
  console.log('🔍 [TemplateService] バリデーションエラーサンプル:', {
    totalErrors: validationResult.errors.length,
    sampleError: validationResult.errors[0],
    errorTypes: [...new Set(validationResult.errors.map((e) => e.type))],
  });

  // デバッグ: テンプレートIDリストのサンプル
  console.log('🔍 [TemplateService] テンプレートIDサンプル:', {
    totalTemplates: allTemplateIds.length,
    firstFewIds: allTemplateIds.slice(0, 5),
    hasReferenceError: validationResult.errors.some((e) => e.type === 'reference_error'),
  });

  // エラーをテンプレートにマッピング
  validationResult.errors.forEach((error, errorIndex) => {
    const processedTemplateIds = new Set<string>(); // 重複防止

    // 1. reference_errorの場合、error.refまたは@_refからテンプレートIDを抽出
    if (error.type === 'reference_error') {
      console.log(`🔍 [TemplateService] reference_error処理中 (${errorIndex}):`, {
        hasRef: !!error.ref,
        ref: error.ref,
        hasAtRef: !!error['@_ref'],
        atRef: error['@_ref'],
        message: error.message,
        errorKeys: Object.keys(error),
      });
      // error.refから直接取得
      if (error.ref && allTemplateIds.includes(error.ref)) {
        if (!errorMap[error.ref]) {
          errorMap[error.ref] = [];
        }
        errorMap[error.ref].push({
          level: 'error',
          message: error.message || 'Unknown error',
        });
        processedTemplateIds.add(error.ref);
      }

      // @_refフィールドから取得（JSONオブジェクト内）
      if (error['@_ref'] && allTemplateIds.includes(error['@_ref'])) {
        if (!errorMap[error['@_ref']]) {
          errorMap[error['@_ref']] = [];
        }
        if (!processedTemplateIds.has(error['@_ref'])) {
          errorMap[error['@_ref']].push({
            level: 'error',
            message: error.message || 'Unknown error',
          });
          processedTemplateIds.add(error['@_ref']);
        }
      }

      // messageから正規表現で抽出
      const refMatch = error.message?.match(/"((?:material|condition|result)Template_[^"]+)"/);
      if (refMatch) {
        const templateId = refMatch[1];
        if (allTemplateIds.includes(templateId) && !processedTemplateIds.has(templateId)) {
          if (!errorMap[templateId]) {
            errorMap[templateId] = [];
          }
          errorMap[templateId].push({
            level: 'error',
            message: error.message || 'Unknown error',
          });
          processedTemplateIds.add(templateId);
        }
      }
    }

    // 2. xpathからテンプレートIDを抽出
    if (error.xpath) {
      // materialTemplate[@id='xxx'], conditionTemplate[@id='xxx'], resultTemplate[@id='xxx']
      const match = error.xpath.match(/(?:material|condition|result)Template\[@id='([^']+)'\]/);
      if (match) {
        const templateId = match[1];
        if (allTemplateIds.includes(templateId) && !processedTemplateIds.has(templateId)) {
          if (!errorMap[templateId]) {
            errorMap[templateId] = [];
          }
          errorMap[templateId].push({
            level: 'error',
            message: error.message || 'Unknown error',
          });
          processedTemplateIds.add(templateId);
        }
      }
    }

    // 3. pathsからも抽出
    if (error.paths && Array.isArray(error.paths)) {
      error.paths.forEach((path) => {
        const match = path.match(/(?:material|condition|result)Template\[@id='([^']+)'\]/);
        if (match) {
          const templateId = match[1];
          if (allTemplateIds.includes(templateId) && !processedTemplateIds.has(templateId)) {
            if (!errorMap[templateId]) {
              errorMap[templateId] = [];
            }
            errorMap[templateId].push({
              level: 'error',
              message: error.message || 'Unknown error',
            });
            processedTemplateIds.add(templateId);
          }
        }
      });
    }
  });

  console.log('✅ [TemplateService] エラーマッピング完了:', {
    templateCount: allTemplateIds.length,
    errorsCount: validationResult.errors.length,
    templatesWithErrors: Object.keys(errorMap).length,
  });

  return errorMap;
};
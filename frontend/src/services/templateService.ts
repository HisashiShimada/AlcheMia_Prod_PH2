/**
 * Template Service
 * テンプレート抽出サービス（純粋関数）
 * PetriNetEditorへの依存なし
 * 
 * @version 1.0.0
 * @date 2026-01-28
 */

import { TemplatesByCategory, TemplateError } from "@/types/editor";

import type { ValidationResult } from '@/types/maimlValidation';

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
/**
 * Template Context
 * グローバルテンプレートState管理
 * テンプレート一覧表示機能のContext API実装
 * 
 * @version 1.0.0
 * @date 2026-01-28
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { TemplateError, TemplatesByCategory, MethodData } from '@/types/editor';
import { Template } from '@/types/maiml-unified';
import {
  mapValidationErrorsToTemplates,
} from '@/services/templateService';
import { MaimlParserTyped } from '@/utils/maimlParserTyped';
import { AnalysisResult } from '@/types/maimlValidation';

/**
 * TemplateContext型定義
 */
interface TemplateContextType {
  templates: TemplatesByCategory;
  allTemplates: TemplatesByCategory;
  commonTemplates: TemplatesByCategory;
  templateErrors: Record<string, TemplateError[]>;
  isLoading: boolean;
  addTemplate: (templateData: { category: 'material' | 'condition' | 'result'; template: Template }) => void;
  deleteTemplate: (templateId: string) => void;
  updateTemplate: (templateId: string, updatedTemplate: Template) => void;
}

const TemplateContext = createContext<TemplateContextType | null>(null);

/**
 * useTemplates Hook
 * TemplateContext を使用するためのカスタムフック
 */
export const useTemplates = (): TemplateContextType => {
  const context = useContext(TemplateContext);
  if (!context) {
    throw new Error('useTemplates must be used within TemplateProvider');
  }
  return context;
};

/**
 * TemplateProvider Props
 */
interface TemplateProviderProps {
  children: React.ReactNode;
  maimlData: string | null;
  validationResult?: AnalysisResult | null;
  activeMethodIndex?: number;
  methods?: MethodData[];
}

/**
 * TemplateProvider
 * テンプレート状態をグローバルに提供するProvider
 */
export const TemplateProvider: React.FC<TemplateProviderProps> = ({
  children,
  maimlData,
  validationResult,
  activeMethodIndex,
  methods,
}) => {
  const [templates, setTemplates] = useState<TemplatesByCategory>({
    material: [],
    condition: [],
    result: [],
  });
  const [templateErrors, setTemplateErrors] = useState<Record<string, TemplateError[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  // テンプレート抽出（maimlData変更時）
  useEffect(() => {
    if (maimlData) {
      console.log('🔍 [TemplateContext] テンプレート抽出開始:', {
        maimlDataLength: maimlData.length,
        maimlDataPreview: maimlData.substring(0, 200),
      });
      setIsLoading(true);

      try {
        const parser = new MaimlParserTyped(maimlData);
        const extracted = parser.getTemplates();
        setTemplates(extracted);

        console.log('✅ [TemplateContext] テンプレート抽出完了:', {
          material: extracted.material.length,
          condition: extracted.condition.length,
          result: extracted.result.length,
        });
      } catch (err) {
        console.error('❌ [TemplateContext] テンプレート抽出エラー:', err);
        setTemplates({ material: [], condition: [], result: [] });
      } finally {
        setIsLoading(false);
      }
    } else {
      console.log('⚠️ [TemplateContext] maimlDataがnull - テンプレートをリセット');
      setTemplates({ material: [], condition: [], result: [] });
      setTemplateErrors({});
    }
  }, [maimlData]);

  // エラーマッピング（validationResult変更時）
  useEffect(() => {
    if (validationResult && templates) {
      console.log('🔍 [TemplateContext] エラーマッピング開始');

      try {
        const errorMap = mapValidationErrorsToTemplates(validationResult, templates);
        setTemplateErrors(errorMap);

        console.log('✅ [TemplateContext] エラーマッピング完了:', {
          templatesWithErrors: Object.keys(errorMap).length,
        });
      } catch (err) {
        console.error('❌ [TemplateContext] エラーマッピングエラー:', err);
        setTemplateErrors({});
      }
    } else {
      setTemplateErrors({});
    }
  }, [validationResult, templates]);

  // フィルタリングされたテンプレート（activeMethodIndexに基づく）
  const filteredTemplates = useMemo(() => {
    // ✅ reference版のロジック: メソッド情報がない場合のみフィルタリングをスキップ
    // 単一メソッドでも、共通テンプレートと区別するためにフィルタリングを実行
    if (!methods || methods.length === 0 || activeMethodIndex === undefined) {
      return templates;
    }

    const currentMethod = methods[activeMethodIndex];
    const currentMethodId = currentMethod?.methodId;

    console.log('🔍 [TemplateContext] テンプレートフィルタリング:', {
      activeMethodIndex,
      currentMethodId,
      methodsCount: methods.length,
      allTemplatesCount: {
        material: templates.material.length,
        condition: templates.condition.length,
        result: templates.result.length,
      },
      // ✅ reference版: 全テンプレートのmethodIdをログ出力
      allTemplateMethodIds: {
        material: templates.material.map((t : Template) => ({ id: t.id, methodId: t.methodId })), 
        condition: templates.condition.map((t : Template) => ({ id: t.id, methodId: t.methodId })),
        result: templates.result.map((t : Template) => ({ id: t.id, methodId: t.methodId })),
      },
    });

    // ✅ reference版: methodIdでフィルタリング（現在のメソッドに属するテンプレートのみ）
    const filtered: TemplatesByCategory = {
      material: templates.material.filter((t : Template) => {
        const templateMethodId = t.methodId;
        const match = templateMethodId === currentMethodId;
        if (!match && templateMethodId) {
          console.log(`⚠️ [TemplateContext] Material template除外:`, {
            templateId: t.id,
            templateMethodId,
            currentMethodId,
            match,
          });
        }
        return match;
      }),
      condition: templates.condition.filter((t: Template) => {
        const templateMethodId = t.methodId;
        const match = templateMethodId === currentMethodId;
        if (!match && templateMethodId) {
          console.log(`⚠️ [TemplateContext] Condition template除外:`, {
            templateId: t.id,
            templateMethodId,
            currentMethodId,
            match,
          });
        }
        return match;
      }),
      result: templates.result.filter((t : Template) => {
        const templateMethodId = t.methodId;
        const match = templateMethodId === currentMethodId;
        if (!match && templateMethodId) {
          console.log(`⚠️ [TemplateContext] Result template除外:`, {
            templateId: t.id,
            templateMethodId,
            currentMethodId,
            match,
          });
        }
        return match;
      }),
    };

    console.log('✅ [TemplateContext] フィルタリング完了:', {
      filteredCount: {
        material: filtered.material.length,
        condition: filtered.condition.length,
        result: filtered.result.length,
      },
      filteredIds: {
        material: filtered.material.map((t) => t.id),
        condition: filtered.condition.map((t) => t.id),
        result: filtered.result.map((t) => t.id),
      },
    });

    return filtered;
  }, [templates, activeMethodIndex, methods]);

  // 共通テンプレート（methodIdがnull）
  const commonTemplates = useMemo(() => {
    const common: TemplatesByCategory = {
      material: templates.material.filter((t : Template) => !t.methodId),
      condition: templates.condition.filter((t : Template) => !t.methodId),
      result: templates.result.filter((t : Template) => !t.methodId),
    };

    console.log('🔍 [TemplateContext] 共通テンプレート:', {
      material: common.material.length,
      condition: common.condition.length,
      result: common.result.length,
    });

    return common;
  }, [templates]);

  // テンプレート追加メソッド
  const addTemplate = useCallback(
    (templateData: { category: 'material' | 'condition' | 'result'; template: Template }) => {
      console.log('➕ [TemplateContext] テンプレート追加:', templateData);

      const { category, template } = templateData;

      setTemplates((prevTemplates) => {
        const updated = { ...prevTemplates };
        updated[category] = [...updated[category], template];
        return updated;
      });

      console.log('✅ [TemplateContext] テンプレート追加完了');
    },
    []
  );

  // テンプレート削除メソッド
  const deleteTemplate = useCallback((templateId: string) => {
    console.log('🗑️ [TemplateContext] テンプレート削除:', templateId);

    setTemplates((prevTemplates) => {
      const updated = { ...prevTemplates };

      // 全カテゴリから該当テンプレートを削除
      (['material', 'condition', 'result'] as const).forEach((category) => {
        updated[category] = updated[category].filter((t) => t.id !== templateId);
      });

      return updated;
    });

    console.log('✅ [TemplateContext] テンプレート削除完了');
  }, []);

  // テンプレート更新メソッド
  const updateTemplate = useCallback((templateId: string, updatedTemplate: Template) => {
    console.log('🔄 [TemplateContext] テンプレート更新:', {
      templateId,
      updatedTemplate,
    });

    setTemplates((prevTemplates) => {
      const updated = { ...prevTemplates };

      // 全カテゴリから該当テンプレートを更新
      (['material', 'condition', 'result'] as const).forEach((category) => {
        const index = updated[category].findIndex((t) => t.id === templateId);
        if (index !== -1) {
          updated[category][index] = updatedTemplate;
          console.log(`✅ [TemplateContext] ${category}テンプレート更新完了`);
        }
      });

      return updated;
    });

    console.log('✅ [TemplateContext] テンプレート更新完了');
  }, []);

  // Context value（メモ化してパフォーマンス最適化）
  const value = useMemo(
    () => ({
      templates: filteredTemplates,
      allTemplates: templates,
      commonTemplates,
      templateErrors,
      isLoading,
      addTemplate,
      deleteTemplate,
      updateTemplate,
    }),
    [
      filteredTemplates,
      templates,
      commonTemplates,
      templateErrors,
      isLoading,
      addTemplate,
      deleteTemplate,
      updateTemplate,
    ]
  );

  return <TemplateContext.Provider value={value}>{children}</TemplateContext.Provider>;
};
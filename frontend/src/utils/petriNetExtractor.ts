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
} from '@/types/maiml-unified';

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
    templates.materials.forEach((t: Template) => {
      // ✅ 新方式: maimlParserTypedからメタデータを取得
      const placeId = parser.getPlaceRefByTemplateId(t.id);
      
      // ✅ 新方式: typedMaimlから取得したメタデータを使用
      templateMap[placeId] = {
        id: t.id,
        name: t.name,
        description: t.description,
        annotation: t.annotation,
        properties: t.properties ?? [],
        stereoType: 'MaterialTemplate',
        uuid: t.uuid,
        placeRefs: t.placeRefs,
        templateRef: t.templateRef,
      };
    });
    
    // Conditions
    templates.conditions.forEach((t: Template) => {
      // ✅ 新方式: maimlParserTypedからメタデータを取得
      const placeId = parser.getPlaceRefByTemplateId(t.id);
      
      // ✅ 新方式: typedMaimlから取得したメタデータを使用
      templateMap[placeId] = {
        id: t.id,
        name: t.name,
        description: t.description,
        annotation: t.annotation,
        properties: t.properties ?? [],
        stereoType: 'MaterialTemplate',
        uuid: t.uuid,
        placeRefs: t.placeRefs,
        templateRef: t.templateRef,
      };
    });
    
    // Results
    templates.results.forEach((t: Template) => {
      // ✅ 新方式: maimlParserTypedからメタデータを取得
      const placeId = parser.getPlaceRefByTemplateId(t.id);
      
      // ✅ 新方式: typedMaimlから取得したメタデータを使用
      templateMap[placeId] = {
        id: t.id,
        name: t.name,
        description: t.description,
        annotation: t.annotation,
        properties: t.properties ?? [],
        stereoType: 'MaterialTemplate',
        uuid: t.uuid,
        placeRefs: t.placeRefs,
        templateRef: t.templateRef,
      };
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

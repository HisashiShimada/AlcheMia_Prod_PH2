/**
 * petriNetExtractor.ts - ペトリネット構造抽出ユーティリティ
 * 型安全なMaimlParserTypedを使用してペトリネット構造を抽出
 * 
 * Phase 5-4: maimlParserExp → maimlParserTyped に完全移行
 */

import { MaimlParserTyped } from './maimlParserTyped';

// XSD準拠型（maiml-unified.ts）
import type {
  MaterialTemplate,
  ConditionTemplate,
  ResultTemplate,
  Property as XsdProperty
} from '@/types/maiml-unified';

// エディタ型（editorv2/types）
import type {
  PetriNetExtractResult,
  Place,
  Transition,
  Arc,
  TemplateMapEntry,
  InsertionData,
  NestedPropertyNode,
  Property,
  PlaceRefObject,
  TemplateRefObject,
  TransitionNode
} from '@/components/editorv2/types';

// Template型のユニオン型
type TemplateItem = MaterialTemplate | ConditionTemplate | ResultTemplate;

/**
 * MAIMLデータからペトリネット構造を抽出
 * @param maimlData - MaiML XML文字列
 * @returns { places: [], transitions: [], arcs: [] }
 */
export const extractPetriNetStructure = (maimlData: string): PetriNetExtractResult => {
  if (!maimlData) {
    console.warn('[petriNetExtractor] maimlDataが空です');
    return { places: [], transitions: [], arcs: [] };
  }

  try {
    console.log('🔍 [petriNetExtractor] ペトリネット構造抽出開始');
    
    // 型安全なMaimlParserTypedを使用
    const parser = new MaimlParserTyped(maimlData);
    
    // Validation（オプション）
    const validation = parser.validateForExperimentManager();
    if (!validation.isValid) {
      console.warn('⚠️ [petriNetExtractor] MaiML検証警告:', validation.errors);
      // 警告のみで続行（validationが厳しすぎる可能性があるため）
    }
    
    // Transitionsを取得
    const transitionsResult = parser.getTransitions();
    if (!transitionsResult.success) {
      console.error('❌ [petriNetExtractor] Transition抽出エラー:', transitionsResult.error);
      // エラーでも空のtransitionsで続行
    }
    
    const transitions = transitionsResult.transitions || [];
    
    // Templatesを取得（Places用）
    const templates = parser.getTemplates();
    
    console.log('📊 [petriNetExtractor] Templates取得完了:', {
      materials: templates.materials.length,
      conditions: templates.conditions.length,
      results: templates.results.length
    });
    
    // ✅ 新方式: maimlParserTypedを使用してplaceRef情報を取得
    const getPlaceIdFromTemplate = (templateId: string): string => {
      return parser.getPlaceRefByTemplateId(templateId);
    };
    
    // ✅ Places配列を構築（place IDを使用）
    const places: Place[] = [
      ...templates.materials.map((t) => {
        const placeId = getPlaceIdFromTemplate(t.id);
        return {
          id: placeId,
          data: {
            label: t.name || placeId,
            stereotype: 'MaterialTemplate',
            template: t ,
            templateId: t.id, // ✅ template IDも保持
            properties: (t.property || [])
          }
        };
      }),
      ...templates.conditions.map((t) => {
        const placeId = getPlaceIdFromTemplate(t.id);
        return {
          id: placeId,
          data: {
            label: t.name || placeId,
            stereotype: 'ConditionTemplate',
            template: t ,
            templateId: t.id, // ✅ template IDも保持
            properties: (t.property || [])
          }
        };
      }),
      ...templates.results.map((t) => {
        const placeId = getPlaceIdFromTemplate(t.id);
        return {
          id: placeId,
          data: {
            label: t.name || placeId,
            stereotype: 'ResultTemplate',
            template: t,
            templateId: t.id, // ✅ template IDも保持
            properties: (t.property || [])
          }
        };
      })
    ];
    
    console.log('✅ [petriNetExtractor] Place ID変換完了:', {
      totalPlaces: places.length,
      sampleMapping: places.slice(0, 3).map(p => ({
        placeId: p.id,
        templateId: p.data.templateId
      }))
    });
    
    // Transitions配列を構築
    const transitionNodes = transitions.map(t => ({
      id: t.id,
      type: 'transition',
      data: {
        label: t.name || t.id,
        transition: t,
        description: t.description || '',
        hasInstruction: t.hasInstruction || false
      }
    }));
    
    // Arcsを取得
    const arcs = parser.getArcs();
    
    console.log('✅ [petriNetExtractor] ペトリネット構造抽出完了:', {
      places: places.length,
      transitions: transitionNodes.length,
      arcs: arcs.length
    });
    
    return { 
      places, 
      transitions: transitionNodes, 
      arcs 
    };
    
  } catch (error) {
    console.error('❌ [petriNetExtractor] ペトリネット構造抽出エラー:', error);
    return { places: [], transitions: [], arcs: [] };
  }
};

/**
 * テンプレートマップを構築
 * @param parserOrData - MaiMLParserインスタンスまたはMaiML XML文字列
 * @returns テンプレートIDをキーとするマップ
 */
export const buildTemplateMap = (parserOrData: MaimlParserTyped | string): Record<string, TemplateMapEntry> => {
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
    
    const templateMap: Record<string, TemplateMapEntry> = {};
    
    // Materials
    templates.materials.forEach((t: MaterialTemplate) => {
      // ✅ 新方式: maimlParserTypedからメタデータを取得
      const metadata = parser.getTemplateMetadata(t.id);
      const placeId = parser.getPlaceRefByTemplateId(t.id);
      
      console.log(`🔍 [buildTemplateMap] ${t.id} のメタデータ:`, {
        placeId,
        uuidLength: metadata.uuid.length,
        placeRefsCount: metadata.placeRefs.length,
        templateRefsCount: metadata.templateRefs.length
      });
      
      const { insertion, properties } = extractInsertionFromProperties(t.property || [], t.id);
      const nestedProperties = convertPropertiesArrayToNestedFormat(properties);
      
      // ✅ 新方式: typedMaimlから取得したメタデータを使用
      templateMap[placeId] = {
        id: t.id,
        name: t.name,
        description: t.description,
        annotation: t.annotation,
        properties: properties,
        propertiesNested: nestedProperties,
        insertion: insertion,
        templateId: t.id,
        type: 'material',
        stereotype: 'MaterialTemplate',
        element: null,  // ✅ DOMエレメントは不要（段階的に削除）
        uuid: metadata.uuid,
        placeRefs: metadata.placeRefs,
        templateRefs: metadata.templateRefs,
      };
    });
    
    // Conditions
    templates.conditions.forEach((t: ConditionTemplate) => {
      // ✅ 新方式: maimlParserTypedからメタデータを取得
      const metadata = parser.getTemplateMetadata(t.id);
      const placeId = parser.getPlaceRefByTemplateId(t.id);
      
      const { insertion, properties } = extractInsertionFromProperties(t.property || [], t.id);
      const nestedProperties = convertPropertiesArrayToNestedFormat(properties);
      
      // ✅ 新方式: typedMaimlから取得したメタデータを使用
      templateMap[placeId] = {
        id: t.id,
        name: t.name,
        description: t.description,
        annotation: t.annotation,
        properties: properties,
        propertiesNested: nestedProperties,
        insertion: insertion,
        templateId: t.id,
        type: 'condition',
        stereotype: 'ConditionTemplate',
        element: null,  // ✅ DOMエレメントは不要（段階的に削除）
        uuid: metadata.uuid,
        placeRefs: metadata.placeRefs,
        templateRefs: metadata.templateRefs,
      };
    });
    
    // Results
    templates.results.forEach((t: ResultTemplate) => {
      // ✅ 新方式: maimlParserTypedからメタデータを取得
      const metadata = parser.getTemplateMetadata(t.id);
      const placeId = parser.getPlaceRefByTemplateId(t.id);
      
      const { insertion, properties} = extractInsertionFromProperties(t.property || [], t.id);
      const nestedProperties = convertPropertiesArrayToNestedFormat(properties);
      
      // ✅ 新方式: typedMaimlから取得したメタデータを使用
      templateMap[placeId] = {
        id: t.id,
        name: t.name,
        description: t.description,
        annotation: t.annotation,
        properties: properties,
        propertiesNested: nestedProperties,
        insertion: insertion,
        templateId: t.id,
        type: 'result',
        stereotype: 'ResultTemplate',
        element: null,  // ✅ DOMエレメントは不要（段階的に削除）
        uuid: metadata.uuid,
        placeRefs: metadata.placeRefs,
        templateRefs: metadata.templateRefs,
      };
    });
    
    const insertionCount = Object.values(templateMap).filter((t: TemplateMapEntry) => t.insertion).length;
    
    console.log('✅ [petriNetExtractor] テンプレートマップ構築完了:', {
      totalTemplates: Object.keys(templateMap).length,
      withElements: Object.values(templateMap).filter((t: TemplateMapEntry) => t.element).length,
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

/**
 * トランジションIDからサブネットデータを生成
 * （旧実装のgenerateSimpleSubnetData相当の機能）
 * @param transitionId - トランジションID
 * @param maimlData - MaiML XML文字列
 * @param templateMap - テンプレートマップ
 * @param transitionNode - トランジションノードオブジェクト（pnmlId取得用）
 * @param arcsData - 🎯 複数method対応: 事前に取得したarcsデータ（オプション）
 * @returns DOT形式のサブネットデータ
 */
export const generateSubnetData = async (
  transitionId: string, 
  maimlData: string, 
  templateMap: Record<string, TemplateMapEntry>, 
  transitionNode: TransitionNode | null = null, 
  arcsData: Arc[] | null = null
): Promise<string | null> => {
  if (!transitionId || !maimlData) {
    console.warn('[petriNetExtractor] transitionIdまたはmaimlDataが空です');
    return null;
  }
  
  try {
    console.log('🔍 [petriNetExtractor] サブネットデータ生成:', {
      transitionId,
      hasArcsData: !!arcsData,
      arcsDataLength: arcsData?.length || 0
    });
    
    let allArcs: Arc[] = [];
    
    // 🎯 複数method対応: arcsDataが渡されている場合は直接使用（APIを呼ばない）
    if (arcsData && Array.isArray(arcsData)) {
      console.log('✅ [petriNetExtractor] 渡されたarcsDataを使用:', arcsData.length);
      allArcs = arcsData;
    } else {
      // 🔄 フォールバック: arcsDataがない場合のみAPIを使用してアークを取得
      console.log('🔄 [petriNetExtractor] APIからarcsを取得（フォールバック）');
      
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';
      const base64Data = btoa(unescape(encodeURIComponent(maimlData)));
      
      const response = await fetch(`${API_BASE_URL}/worker/petri-net-structure-from-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ maimlContent: base64Data }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'ペトリネット構造の取得に失敗しました');
      }
      
      const petriNetData = result.data;
      allArcs = petriNetData.arcs || [];
    }
    
    console.log('🔍 [petriNetExtractor] 全アーク数:', allArcs.length);
    
    // トランジションに接続されたアークをフィルタリング
    const transitionArcs = allArcs.filter((arc: Arc) => 
      arc.source === transitionId || arc.target === transitionId
    );
    
    console.log('🔍 [petriNetExtractor] トランジション接続アーク:', {
      transitionId,
      arcsFound: transitionArcs.length,
      sampleArcs: transitionArcs.slice(0, 3).map((a: Arc) => ({
        id: a.id,
        source: a.source,
        target: a.target,
        pnmlId: a.pnmlId
      }))
    });
    
    if (transitionArcs.length === 0) {
      console.warn('⚠️ [petriNetExtractor] トランジションに接続されたアークがありません:', transitionId);
      return null;
    }
    
    // 🎯 複数PNML対応: トランジションのpnmlIdを取得
    const transitionPnmlId = transitionNode?.data?.pnmlId;
    
    console.log('🎯 [petriNetExtractor] transitionPnmlId:', transitionPnmlId);
    
    // 🎯 複数PNML対応: 同じpnmlId内のアークのみをフィルタリング
    const filteredArcs = transitionPnmlId 
      ? transitionArcs.filter((arc: Arc) => {
          const arcPnmlId = arc.pnmlId;
          const matches = !arcPnmlId || arcPnmlId === transitionPnmlId;
          
          if (!matches) {
            console.log('🎯 [petriNetExtractor] アークをフィルタ:', {
              arcId: arc.id,
              arcPnmlId,
              transitionPnmlId,
              source: arc.source,
              target: arc.target
            });
          }
          
          return matches;
        })
      : transitionArcs; // transitionPnmlIdがない場合は全てのアークを使用（後方互換性）
    
    console.log('🎯 [petriNetExtractor] フィルタリング結果:', {
      totalArcs: transitionArcs.length,
      filteredArcs: filteredArcs.length,
      transitionPnmlId
    });
    
    if (filteredArcs.length === 0) {
      console.warn('⚠️ [petriNetExtractor] フィルタリング後のアークがありません:', transitionId);
      return null;
    }
    
    // 簡易的なDOT形式生成（旧実装互換）
    let dotContent = 'digraph subnet {\n';
    dotContent += `  "${transitionId}" [shape=box];\n`;
    
    filteredArcs.forEach((arc: Arc) => {
      const source = arc.source;
      const target = arc.target;
      
      if (source !== transitionId) {
        // incoming arc
        const template = templateMap[source];
        if (template) {
          dotContent += `  "${source}" [label="${template.name || source}"];\n`;
          dotContent += `  "${source}" -> "${transitionId}";\n`;
        }
      }
      
      if (target !== transitionId) {
        // outgoing arc
        const template = templateMap[target];
        if (template) {
          dotContent += `  "${target}" [label="${template.name || target}"];\n`;
          dotContent += `  "${transitionId}" -> "${target}";\n`;
        }
      }
    });
    
    dotContent += '}\n';
    
    console.log('✅ [petriNetExtractor] サブネットデータ生成完了');
    return dotContent;
    
  } catch (error) {
    console.error('❌ [petriNetExtractor] サブネットデータ生成エラー:', error);
    return null;
  }
};

/**
 * ✅ Phase 1 Step 1-1: insertion要素をproperties配列から分離
 * MaiMLParser.jsがinsertionをtype='insertion'のpropertyとして解析するため、
 * これをtemplate直下の要素として分離する
 * 
 * @param properties - プロパティ配列
 * @param templateId - テンプレートID（ログ用）
 * @returns { insertion: Object|null, properties: Array }
 */
const extractInsertionFromProperties = (properties: any[], templateId: string): { insertion: any | null; properties: any[] } => {
  if (!properties || !Array.isArray(properties)) {
    return { insertion: null, properties: [] };
  }
  
  // insertion typeのプロパティを検索
  const insertionIndex = properties.findIndex(p => p.type === 'insertion');
  
  if (insertionIndex === -1) {
    // insertion要素なし
    return { insertion: null, properties };
  }
  
  const insertionProp = properties[insertionIndex];
  
  console.log(`📎 [extractInsertion] insertion要素検出: ${templateId}`, {
    hasElements: !!insertionProp.elements,
    elementCount: insertionProp.elements ? Object.keys(insertionProp.elements).length : 0
  });
  
  // insertion要素のデータを抽出
  const insertion = {
    uri: insertionProp.elements?.uri?.defaultValue || '',
    hash: insertionProp.elements?.hash?.defaultValue || '',
    format: insertionProp.elements?.format?.defaultValue || 'application/octet-stream'
  };
  
  // insertion要素をproperties配列から除外
  const filteredProperties = properties.filter((_, index) => index !== insertionIndex);
  
  console.log(`✅ [extractInsertion] insertion要素分離完了: ${templateId}`, {
    uri: insertion.uri ? insertion.uri.substring(0, 30) + '...' : 'なし',
    hash: insertion.hash ? insertion.hash.substring(0, 20) + '...' : 'なし',
    format: insertion.format,
    remainingProperties: filteredProperties.length
  });
  
  return { insertion, properties: filteredProperties };
};

/**
 * ✅ 新規: MaiMLParser配列形式をNestedPropertyEditor形式に変換
 * @param propertiesArray - MaiMLParser形式の配列
 * @returns NestedPropertyEditor形式のオブジェクト {key: {attributes, elements, children}}
 */
const convertPropertiesArrayToNestedFormat = (propertiesArray: any[]): Record<string, any> => {
  if (!Array.isArray(propertiesArray)) {
    console.warn('[convertPropertiesArrayToNestedFormat] 配列ではありません:', typeof propertiesArray);
    return {};
  }
  
  const result: Record<string, any> = {};
  
  propertiesArray.forEach((prop: any) => {
    // ✅ 修正: insertion typeはスキップ（既にextractInsertionFromPropertiesで除外されているはずだが念のため）
    if (prop.type === 'insertion' || prop.xsiType === 'insertion') {
      console.warn('[convertPropertiesArrayToNestedFormat] insertion typeをスキップ:', prop.key || prop.name);
      return;
    }
    
    const key = prop.key || prop.name || `prop_${Date.now()}`;
    
    // NestedPropertyEditor形式に変換
    (result as any)[key] = {
      key: key,
      tagName: prop.tagName || 'property',
      attributes: {
        'xsi:type': prop.type || prop.xsiType || 'stringType',
        ...(prop.units && { units: prop.units }),
        ...(prop.formatString && { formatString: prop.formatString }),
        ...(prop.scaleFactor && { scaleFactor: prop.scaleFactor.toString() })
      },
      elements: {} as Record<string, any>,
      children: [] as any[]
    };
    
    // defaultValueがあればelements.valueとして追加
    if (prop.defaultValue !== undefined && prop.defaultValue !== '') {
      result[key].elements.value = prop.defaultValue;
    }
    
    // descriptionがあればelements.descriptionとして追加
    if (prop.description !== undefined && prop.description !== '') {
      result[key].elements.description = prop.description;
    }
    
    // 子プロパティがある場合（propertyListType）
    if (prop.properties && Array.isArray(prop.properties) && prop.properties.length > 0) {
      result[key].children = convertPropertiesArrayToChildren(prop.properties);
    }
  });
  
  return result;
};

/**
 * ✅ 新規: 子プロパティ配列をchildren配列に変換（再帰処理用）
 * @param propertiesArray - 子プロパティ配列
 * @returns children配列
 */
const convertPropertiesArrayToChildren = (propertiesArray: any[]): any[] => {
  if (!Array.isArray(propertiesArray)) return [];
  
  return propertiesArray.map(childProp => {
    const childNode = {
      key: childProp.key || childProp.name || `child_${Date.now()}`,
      tagName: childProp.tagName || 'property',
      attributes: {
        'xsi:type': childProp.type || childProp.xsiType || 'stringType',
        ...(childProp.units && { units: childProp.units }),
        ...(childProp.formatString && { formatString: childProp.formatString }),
        ...(childProp.scaleFactor && { scaleFactor: childProp.scaleFactor.toString() })
      },
      elements: {} as Record<string, any>,
      children: [] as any[]
    };
    
    // defaultValueがあればelements.valueとして追加
    if (childProp.defaultValue !== undefined && childProp.defaultValue !== '') {
      childNode.elements.value = childProp.defaultValue;
    }
    
    // descriptionがあればelements.descriptionとして追加
    if (childProp.description !== undefined && childProp.description !== '') {
      childNode.elements.description = childProp.description;
    }
    
    // さらに子要素がある場合は再帰処理
    if (childProp.properties && Array.isArray(childProp.properties) && childProp.properties.length > 0) {
      childNode.children = convertPropertiesArrayToChildren(childProp.properties);
    }
    
    return childNode;
  });
};

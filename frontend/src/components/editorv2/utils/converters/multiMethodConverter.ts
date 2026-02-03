/**
 * Multi-Method MaiML Converter
 * 
 * 複数method要素を持つMaiMLファイルの生成
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import { 
  escapeXml, 
  generateUUID, 
  buildPropertyXML, 
  buildDocumentXML,
  validatePetriNet 
} from './reactFlowToMaiml';

import type { 
  NodeData,
  Property,
  DocumentData,
  Template
} from '../../types';

import type { Node, Edge } from 'reactflow';

// ✅ Method型をeditorTypes.tsからインポート
import type { Method, EdgeData } from '../../types/editorTypes';

/**
 * メタデータ
 */
export interface Metadata {
  name?: string;
  [key: string]: unknown;
}

/**
 * Template情報（TemplateContext）
 */
export interface TemplateInfo {
  id: string;
  uuid?: string;
  name?: string;
  description?: string;
  properties?: Property[];
  placeRefs?: string[];
  templateRefs?: string[];
  methodId?: string | null;
}

/**
 * 全テンプレート（TemplateMapと互換性を持つ）
 */
export interface AllTemplates {
  material?: TemplateInfo[];
  condition?: TemplateInfo[];
  result?: TemplateInfo[];
  [key: string]: TemplateInfo[] | undefined;
}

/**
 * ✅ 新関数: TemplateContextから取得したテンプレート情報を使って共通テンプレートXMLを生成
 */
function buildCommonTemplateXMLFromTemplate(
  node: Node<NodeData>, 
  templateType: 'materialTemplate' | 'conditionTemplate' | 'resultTemplate'
): string {
  const template = node.data.template;
  if (!template) {
    throw new Error('template is required');
  }
  
  const templateId = template.id;
  
  let xml = `    <${templateType} id="${escapeXml(templateId)}">\n`;
  
  // uuid
  if (template.uuid) {
    xml += `      <uuid>${escapeXml(template.uuid)}</uuid>\n`;
  } else {
    xml += `      <uuid>${generateUUID()}</uuid>\n`;
  }
  
  // テンプレート継承（templateRef要素）
  if (template.templateRefs && template.templateRefs.length > 0) {
    template.templateRefs.forEach((ref: string) => {
      const templateRefId = `templateRef_${templateId}_${ref}`;
      xml += `      <templateRef id="${escapeXml(templateRefId)}" ref="${escapeXml(ref)}"/>\n`;
    });
  }
  
  // insertion要素
  if (template.insertion) {
    xml += `      <insertion>\n`;
    if (template.insertion.uri !== undefined) {
      xml += `        <uri>${escapeXml(template.insertion.uri || '')}</uri>\n`;
    }
    if (template.insertion.hash !== undefined) {
      xml += `        <hash>${escapeXml(template.insertion.hash || '')}</hash>\n`;
    }
    if (template.insertion.format) {
      xml += `        <format>${escapeXml(template.insertion.format)}</format>\n`;
    }
    xml += `      </insertion>\n`;
  }
  
  // name
  if (template.name) {
    xml += `      <name>${escapeXml(template.name)}</name>\n`;
  }
  
  // description
  if (template.description) {
    xml += `      <description>${escapeXml(template.description)}</description>\n`;
  }
  
  // property要素群
  if (template.properties && template.properties.length > 0) {
    template.properties
      .filter((prop: Property) => prop.type !== 'insertion')
      .forEach((prop: Property) => {
        xml += buildPropertyXML(prop, 3);
      });
  }
  
  // ✅ placeRefsから複数のplaceRefを出力
  const placeRefs = template.placeRefs || [];
  console.log(`📋 共通テンプレート ${templateId}: placeRefs数 ${placeRefs.length}`, placeRefs);
  
  placeRefs.forEach((placeRefNodeId: string, index: number) => {
    const placeRefId = index === 0 
      ? (template.placeRefId || `${templateId}TL`)
      : `${templateId}TL_ref${index}`;
    
    xml += `      <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(placeRefNodeId)}"/>\n`;
    console.log(`  ✅ placeRef追加: id="${placeRefId}" ref="${placeRefNodeId}"`);
  });
  
  xml += `    </${templateType}>\n`;
  return xml;
}

/**
 * 複数methodを含むMaiML XMLを生成
 */
export function convertMultipleMethodsToMaiML(
  methods: Method[],
  metadata: Metadata = {},
  documentData: DocumentData | null = null,
  allTemplates: AllTemplates | null = null
): string {
  if (!methods || methods.length === 0) {
    throw new Error('methodsが空です');
  }
  
  // バリデーション: 全メソッドのノードとエッジを収集
  const allNodesForValidation: Node<NodeData>[] = [];
  const allEdgesForValidation: Edge<EdgeData>[] = [];
  methods.forEach((method: Method) => {
    allNodesForValidation.push(...method.nodes);
    allEdgesForValidation.push(...method.edges);
  });
  
  // バリデーション実行
  // Method型はそのまま使用（既にmethodIndex, name, viewportを持っている）
  const methodsForValidation = methods;
  
  const validation = validatePetriNet(
    allNodesForValidation, 
    allEdgesForValidation, 
    allTemplates as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    methodsForValidation
  );
  
  if (!validation.valid) {
    throw new Error(`バリデーションエラー:\n${validation.errors.join('\n')}`);
  }
  
  const fileName = (documentData && documentData.name) ? documentData.name : (metadata.name || 'document');
  
  // XMLヘッダー
  let maiml = `<?xml version="1.0" encoding="utf-8" standalone="no"?>\n`;
  maiml += `<maiml version="1.0" xmlns="http://www.maiml.org/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.maiml.org/schemas maiml.xsd">\n`;
  
  // Document要素
  if (documentData) {
    maiml += buildDocumentXML(documentData);
  } else {
    const defaultDoc: DocumentData = {
      id: 'documentID',
      uuid: generateUUID(),
      name: fileName,
      description: '',
      date: new Date().toISOString(),
      creators: [],
      vendors: [],
      owners: [],
      instruments: [],
      protocolId: 'protocolID',
      methodId: 'methodID',
      pnmlId: 'pnmlID',
      programId: 'programID'
    };
    maiml += buildDocumentXML(defaultDoc);
  }
  
  // Protocol要素
  const protocolId = documentData?.protocolId || 'protocolID';
  const protocolUuid = generateUUID();
  
  maiml += `  <protocol id="${protocolId}">\n`;
  maiml += `    <uuid>${protocolUuid}</uuid>\n`;
  
  // ✅ TemplateContextから共通テンプレートを取得
  const allCommonTemplates: Node<NodeData>[] = [];
  
  if (allTemplates) {
    console.log('📋 [multiMethodConverter] TemplateContextから共通テンプレート取得');
    
    // Material共通テンプレート
    if (allTemplates.material) {
      const commonMaterials = allTemplates.material.filter(
        (t: TemplateInfo) => t.methodId === null && t.placeRefs && t.placeRefs.length > 0
      );
      commonMaterials.forEach((template: TemplateInfo) => {
        const fakeNode: Node<NodeData> = {
          id: template.id,
          type: 'materialTemplate',
          position: { x: 0, y: 0 },
          data: {
            id: template.id,
            name: template.name || template.id,
            description: template.description || '',
            nodeType: 'place',
            placeType: 'material',
            template: {
              id: template.id,
              uuid: template.uuid || '',
              name: template.name || '',
              description: template.description || '',
              type: 'MaterialTemplate',
              properties: template.properties || [],
              placeRefs: template.placeRefs || [],
              templateRefs: template.templateRefs || []
            },
            isCommonTemplate: true
          }
        };
        allCommonTemplates.push(fakeNode);
        console.log('✅ [multiMethodConverter] 共通MaterialTemplate追加:', template.id);
      });
    }
    
    // Condition共通テンプレート
    if (allTemplates.condition) {
      const commonConditions = allTemplates.condition.filter(
        (t: TemplateInfo) => t.methodId === null && t.placeRefs && t.placeRefs.length > 0
      );
      commonConditions.forEach((template: TemplateInfo) => {
        const fakeNode: Node<NodeData> = {
          id: template.id,
          type: 'conditionTemplate',
          position: { x: 0, y: 0 },
          data: {
            id: template.id,
            name: template.name || template.id,
            description: template.description || '',
            nodeType: 'place',
            placeType: 'condition',
            template: {
              id: template.id,
              uuid: template.uuid || '',
              name: template.name || '',
              description: template.description || '',
              type: 'ConditionTemplate',
              properties: template.properties || [],
              placeRefs: template.placeRefs || [],
              templateRefs: template.templateRefs || []
            },
            isCommonTemplate: true
          }
        };
        allCommonTemplates.push(fakeNode);
        console.log('✅ [multiMethodConverter] 共通ConditionTemplate追加:', template.id);
      });
    }
    
    // Result共通テンプレート
    if (allTemplates.result) {
      const commonResults = allTemplates.result.filter(
        (t: TemplateInfo) => t.methodId === null && t.placeRefs && t.placeRefs.length > 0
      );
      commonResults.forEach((template: TemplateInfo) => {
        const fakeNode: Node<NodeData> = {
          id: template.id,
          type: 'resultTemplate',
          position: { x: 0, y: 0 },
          data: {
            id: template.id,
            name: template.name || template.id,
            description: template.description || '',
            nodeType: 'place',
            placeType: 'result',
            template: {
              id: template.id,
              uuid: template.uuid || '',
              name: template.name || '',
              description: template.description || '',
              type: 'ResultTemplate',
              properties: template.properties || [],
              placeRefs: template.placeRefs || [],
              templateRefs: template.templateRefs || []
            },
            isCommonTemplate: true
          }
        };
        allCommonTemplates.push(fakeNode);
        console.log('✅ [multiMethodConverter] 共通ResultTemplate追加:', template.id);
      });
    }
  }
  
  // ✅ 共通テンプレートを<protocol>直下に出力（<method>の前）
  if (allCommonTemplates.length > 0) {
    console.log('📋 共通テンプレート出力:', allCommonTemplates.length, '個');
    
    // タイプ別に分類して出力
    const commonMaterialTemplates = allCommonTemplates.filter(
      (n: Node<NodeData>) => n.data.placeType === 'material'
    );
    const commonConditionTemplates = allCommonTemplates.filter(
      (n: Node<NodeData>) => n.data.placeType === 'condition'
    );
    const commonResultTemplates = allCommonTemplates.filter(
      (n: Node<NodeData>) => n.data.placeType === 'result'
    );
    
    // materialTemplate
    commonMaterialTemplates.forEach((node: Node<NodeData>) => {
      maiml += buildCommonTemplateXMLFromTemplate(node, 'materialTemplate');
    });
    
    // conditionTemplate
    commonConditionTemplates.forEach((node: Node<NodeData>) => {
      maiml += buildCommonTemplateXMLFromTemplate(node, 'conditionTemplate');
    });
    
    // resultTemplate
    commonResultTemplates.forEach((node: Node<NodeData>) => {
      maiml += buildCommonTemplateXMLFromTemplate(node, 'resultTemplate');
    });
  }
  
  // 各method要素を出力（allTemplatesを渡す）
  methods.forEach((method: Method, index: number) => {
    maiml += buildMethodXML(method, index, fileName, allTemplates);
  });
  
  maiml += `  </protocol>\n`;
  
  // data/eventLog要素
  maiml += `  <data id="dataID">\n`;
  maiml += `  </data>\n`;
  maiml += `  <eventLog id="eventLogID">\n`;
  maiml += `  </eventLog>\n`;
  
  maiml += `</maiml>`;
  
  return maiml;
}

/**
 * 単一method要素のXMLを生成
 */
function buildMethodXML(
  method: Method,
  index: number,
  fileName: string,
  allTemplates: AllTemplates | null = null
): string {
  const { nodes, edges, methodId } = method;
  const methodUuid = generateUUID();
  const pnmlId = `pnml_${methodId}`;
  const pnmlUuid = generateUUID();
  const programId = `program_${methodId}`;
  const programUuid = generateUUID();
  
  // ノードを種類別に分類
  const places = nodes.filter((n: Node<NodeData>) => n.type !== 'transition');
  const transitions = nodes.filter((n: Node<NodeData>) => n.type === 'transition');
  
  let methodXml = `    <method id="${methodId}">\n`;
  methodXml += `      <uuid>${methodUuid}</uuid>\n`;
  methodXml += `      <pnml id="${pnmlId}">\n`;
  methodXml += `        <uuid>${pnmlUuid}</uuid>\n`;
  methodXml += `        <name>${fileName}_${methodId}</name>\n`;
  
  // Place要素群
  places.forEach((place: Node<NodeData>) => {
    const hasDescription = place.data.description && 
      place.data.description !== 'インポート済み' && 
      place.data.description !== '既存プレース' && 
      place.data.description !== 'imported';
    
    if (hasDescription) {
      methodXml += `        <place id="${place.id}">\n`;
      methodXml += `          <description>${place.data.description}</description>\n`;
      methodXml += `        </place>\n`;
    } else {
      methodXml += `        <place id="${place.id}"/>\n`;
    }
  });
  
  // Transition要素群
  transitions.forEach((transition: Node<NodeData>) => {
    methodXml += `        <transition id="${transition.id}"/>\n`;
  });
  
  // Arc要素群
  edges.forEach((arc: Edge) => {
    methodXml += `        <arc id="${arc.id}" source="${arc.source}" target="${arc.target}">\n`;
    methodXml += `        </arc>\n`;
  });
  
  methodXml += `      </pnml>\n`;
  
  // Program要素
  methodXml += `      <program id="${programId}">\n`;
  methodXml += `        <uuid>${programUuid}</uuid>\n`;
  
  // Instruction要素群
  transitions.forEach((transition: Node<NodeData>) => {
    const instructionId = transition.data.instructionId || `instruction_${transition.id}`;
    methodXml += `        <instruction id="${instructionId}">\n`;
    methodXml += `          <uuid>${generateUUID()}</uuid>\n`;
    methodXml += `          <description>${transition.data.description || transition.data.name || transition.id}</description>\n`;
    methodXml += `          <transitionRef id="TR_${transition.id}" ref="${transition.id}"/>\n`;
    methodXml += `        </instruction>\n`;
  });
  
  // Template要素群（✅ TemplateContextのmethodIdで判定）
  const templateNodes = places.filter((place: Node<NodeData>) => {
    // テンプレートが存在しない場合は除外
    if (!place.data.template || !place.data.template.type) {
      return false;
    }
    
    // テンプレートIDを取得
    const template = place.data.template;
    const templateId = template.id || template.templateId;
    
    // ✅ TemplateContextから該当テンプレートを検索
    if (allTemplates && templateId) {
      const placeType = place.data.placeType;
      const category = placeType === 'material' ? 'material' :
                      placeType === 'condition' ? 'condition' : 'result';
      
      if (allTemplates[category as keyof AllTemplates]) {
        const templates = allTemplates[category as keyof AllTemplates];
        if (templates) {
          const templateInContext = templates.find((t: TemplateInfo) => t.id === templateId);
          
          if (templateInContext) {
            // methodIdがnullの場合は共通テンプレート → 除外
            if (templateInContext.methodId === null) {
              return false;
            }
            
            // methodIdが現在のmethodと異なる場合 → 除外
            if (templateInContext.methodId !== methodId) {
              return false;
            }
          }
        }
      }
    }
    
    // 共通テンプレート参照ノード（commonTemplateRef）も除外
    if (place.data.commonTemplateRef) {
      return false;
    }
    
    return true;
  });
  
  const materialTemplates = templateNodes.filter((n: Node<NodeData>) => n.data.placeType === 'material');
  const conditionTemplates = templateNodes.filter((n: Node<NodeData>) => n.data.placeType === 'condition');
  const resultTemplates = templateNodes.filter((n: Node<NodeData>) => n.data.placeType === 'result');
  
  // materialTemplate要素群
  materialTemplates.forEach((node: Node<NodeData>) => {
    methodXml += buildTemplateXML(node, 'materialTemplate', places);
  });
  
  // conditionTemplate要素群
  conditionTemplates.forEach((node: Node<NodeData>) => {
    methodXml += buildTemplateXML(node, 'conditionTemplate', places);
  });
  
  // resultTemplate要素群
  resultTemplates.forEach((node: Node<NodeData>) => {
    methodXml += buildTemplateXML(node, 'resultTemplate', places);
  });
  
  methodXml += `      </program>\n`;
  methodXml += `    </method>\n`;
  
  return methodXml;
}

/**
 * Template要素のXMLを生成
 */
function buildTemplateXML(
  node: Node<NodeData>,
  templateType: 'materialTemplate' | 'conditionTemplate' | 'resultTemplate',
  allNodes: Node<NodeData>[] = []
): string {
  const template = node.data.template;
  if (!template) {
    throw new Error('template is required');
  }
  
  const prefix = templateType === 'materialTemplate' ? 'MT' :
                 templateType === 'conditionTemplate' ? 'CT' : 'RT';
  const templateId = template.templateId || template.id || `${prefix}${node.id}`;
  
  let templateXml = `        <${templateType} id="${templateId}">\n`;
  
  // uuid
  if (template.uuid) {
    templateXml += `          <uuid>${template.uuid}</uuid>\n`;
  } else {
    templateXml += `          <uuid>${generateUUID()}</uuid>\n`;
  }
  
  // テンプレート継承（templateRef要素）
  if (template.href) {
    const inheritNodeId = template.href.startsWith('#') ? template.href.substring(1) : template.href;
    const inheritNode = allNodes.find((p: Node<NodeData>) => p.id === inheritNodeId && p.type !== 'transition');
    if (inheritNode && inheritNode.data.template) {
      const inheritTemplateId = inheritNode.data.template.templateId || inheritNode.data.template.id || `${prefix}${inheritNode.id}`;
      const templateRefId = `templateRef_${templateId}`;
      templateXml += `          <templateRef id="${templateRefId}" ref="${inheritTemplateId}"/>\n`;
    }
  }
  
  // insertion要素
  if (template.insertion) {
    templateXml += `          <insertion>\n`;
    if (template.insertion.uri !== undefined) {
      templateXml += `            <uri>${template.insertion.uri || ''}</uri>\n`;
    }
    if (template.insertion.hash !== undefined) {
      templateXml += `            <hash>${template.insertion.hash || ''}</hash>\n`;
    }
    if (template.insertion.format) {
      templateXml += `            <format>${template.insertion.format}</format>\n`;
    }
    templateXml += `          </insertion>\n`;
  }
  
  // name
  if (template.name) {
    templateXml += `          <name>${template.name}</name>\n`;
  }
  
  // description
  if (template.description) {
    templateXml += `          <description>${template.description}</description>\n`;
  }
  
  // property要素群
  if (template.properties && template.properties.length > 0) {
    template.properties
      .filter((prop: Property) => prop.type !== 'insertion')
      .forEach((prop: Property) => {
        templateXml += buildPropertyXML(prop, 5);
      });
  }
  
  // placeRef
  const placeRefId = template.placeRefId || `${templateId}TL`;
  templateXml += `          <placeRef id="${placeRefId}" ref="${node.id}"/>\n`;
  templateXml += `        </${templateType}>\n`;
  
  return templateXml;
}
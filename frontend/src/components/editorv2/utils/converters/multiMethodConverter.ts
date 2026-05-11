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
import { PLACE_DESC_IMPORTED, PLACE_DESC_EXISTING, PLACE_DESC_IMPORTED_EN } from '@/constants/placeDescriptions';

import type { 
  NodeData,
  DocumentData,
  MethodData,
  EdgeData,
  TemplatesByCategory
} from '../../../../types/editor';

import type { Node, Edge } from 'reactflow';

import type { Property, PlaceRef, Template } from '@/types/maiml-unified';

/**
 * メタデータ
 */
export interface Metadata {
  name?: string;
  [key: string]: unknown;
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
  
  // XSD準拠: insertionType の uri/hash は必須（minOccurs=1）
  if (template.insertion) {
    xml += `      <insertion>\n`;
    // uri は必須（undefinedでも空文字で出力）
    xml += `        <uri>${escapeXml(template.insertion.uri ?? '')}</uri>\n`;
    // hash は必須（undefinedでも空文字で出力）
    xml += `        <hash>${escapeXml(template.insertion.hash?.value ?? '')}</hash>\n`;
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
    template.properties.forEach((prop: Property) => {
      xml += buildPropertyXML(prop, 3);
    });
  }
  
  // XSD準拠: placeRef → templateRef の順で出力
  const placeRefs = template.placeRefs || [];
  console.log(`📋 共通テンプレート ${templateId}: placeRefs数 ${placeRefs.length}`, placeRefs);
  
  placeRefs.forEach((placeRef: PlaceRef, index: number) => {
    const placeRefId = index === 0 
      ? (template.placeRefs[0].id || `${templateId}TL`)
      : `${templateId}TL_ref${index}`;
    xml += `      <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(placeRef.ref)}"/>\n`;
    console.log(`  ✅ placeRef追加: id="${placeRefId}" ref="${placeRef.ref}"`);
  });

  // XSD準拠: templateRef は placeRef の後に出力
  if (template.templateRef) {
    const templateRefId = `templateRef_${templateId}_${template.templateRef.ref}`;
    xml += `      <templateRef id="${escapeXml(templateRefId)}" ref="${escapeXml(template.templateRef.ref)}"/>\n`;
  }
  
  xml += `    </${templateType}>\n`;
  return xml;
}

/**
 * 複数methodを含むMaiML XMLを生成
 */
export function convertMultipleMethodsToMaiML(
  methods: MethodData[],
  metadata: Metadata = {},
  documentData: DocumentData | null = null,
  allTemplates: TemplatesByCategory | null = null
): string {
  if (!methods || methods.length === 0) {
    throw new Error('methodsが空です');
  }
  
  // バリデーション: 全メソッドのノードとエッジを収集
  const allNodesForValidation: Node<NodeData>[] = [];
  const allEdgesForValidation: Edge<EdgeData>[] = [];
  methods.forEach((method: MethodData) => {
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
      programId: 'programID',
      chains: [],
      parents: []
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
    
    // Material共通テンプレート（methodIdがnullまたはundefinedのもの）
    // ※ placeRefs が空でも出力する（フォーマットのテンプレート＝追加先テンプレートはplaceRefsが空）
    if (allTemplates.material) {
      const commonMaterials = allTemplates.material.filter(
        (t: Template) => t.methodId === null || t.methodId === undefined
      );
      commonMaterials.forEach((template: Template) => {
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
              category: 'material',
              properties: template.properties || [],
              contents: template.contents || [],
              placeRefs: template.placeRefs || [],
              templateRef: template.templateRef
            },
            isCommonTemplate: true
          }
        };
        allCommonTemplates.push(fakeNode);
        console.log('✅ [multiMethodConverter] 共通MaterialTemplate追加:', template.id);
      });
    }
    
    // Condition共通テンプレート（methodIdがnullまたはundefinedのもの）
    // ※ placeRefs が空でも出力する（フォーマットのテンプレート＝追加先テンプレートはplaceRefsが空）
    if (allTemplates.condition) {
      const commonConditions = allTemplates.condition.filter(
        (t: Template) => t.methodId === null || t.methodId === undefined
      );
      commonConditions.forEach((template: Template) => {
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
              category: 'condition',
              properties: template.properties || [],
              contents: template.contents || [],
              placeRefs: template.placeRefs || [],
              templateRef: template.templateRef
            },
            isCommonTemplate: true
          }
        };
        allCommonTemplates.push(fakeNode);
        console.log('✅ [multiMethodConverter] 共通ConditionTemplate追加:', template.id);
      });
    }
    
    // Result共通テンプレート（methodIdがnullまたはundefinedのもの）
    // ※ placeRefs が空でも出力する（フォーマットのテンプレート＝追加先テンプレートはplaceRefsが空）
    if (allTemplates.result) {
      const commonResults = allTemplates.result.filter(
        (t: Template) => t.methodId === null || t.methodId === undefined
      );
      commonResults.forEach((template: Template) => {
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
              category: 'result',
              properties: template.properties || [],
              contents: template.contents || [],
              placeRefs: template.placeRefs || [],
              templateRef: template.templateRef
            },
            isCommonTemplate: true
          }
        };
        allCommonTemplates.push(fakeNode);
        console.log('✅ [multiMethodConverter] 共通ResultTemplate追加:', template.id);
      });
    }
  }
  
  // XSD準拠: protocolType は uuid → method+ → materialTemplate* → conditionTemplate* → resultTemplate* の順
  // 共通テンプレートは method の後に出力する

  // 各method要素を出力（allTemplatesを渡す）
  methods.forEach((method: MethodData, index: number) => {
    maiml += buildMethodXML(method, index, fileName, allTemplates);
  });

  // 共通テンプレートを method の後に出力
  if (allCommonTemplates.length > 0) {
    console.log('📋 共通テンプレート出力（method後）:', allCommonTemplates.length, '個');
    
    const commonMaterialTemplates = allCommonTemplates.filter(
      (n: Node<NodeData>) => n.data.placeType === 'material'
    );
    const commonConditionTemplates = allCommonTemplates.filter(
      (n: Node<NodeData>) => n.data.placeType === 'condition'
    );
    const commonResultTemplates = allCommonTemplates.filter(
      (n: Node<NodeData>) => n.data.placeType === 'result'
    );
    
    commonMaterialTemplates.forEach((node: Node<NodeData>) => {
      maiml += buildCommonTemplateXMLFromTemplate(node, 'materialTemplate');
    });
    commonConditionTemplates.forEach((node: Node<NodeData>) => {
      maiml += buildCommonTemplateXMLFromTemplate(node, 'conditionTemplate');
    });
    commonResultTemplates.forEach((node: Node<NodeData>) => {
      maiml += buildCommonTemplateXMLFromTemplate(node, 'resultTemplate');
    });
  }
  
  maiml += `  </protocol>\n`;
  
  // XSD準拠: data/eventLog は globalObjectContentGroup により uuid が必須
  maiml += `  <data id="dataID">\n`;
  maiml += `    <uuid>${generateUUID()}</uuid>\n`;
  maiml += `  </data>\n`;
  maiml += `  <eventLog id="eventLogID">\n`;
  maiml += `    <uuid>${generateUUID()}</uuid>\n`;
  maiml += `  </eventLog>\n`;
  
  maiml += `</maiml>`;
  
  return maiml;
}

/**
 * 単一method要素のXMLを生成
 */
function buildMethodXML(
  method: MethodData,
  index: number,
  fileName: string,
  allTemplates: TemplatesByCategory | null = null
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
      place.data.description !== PLACE_DESC_IMPORTED &&
      place.data.description !== PLACE_DESC_EXISTING &&
      place.data.description !== PLACE_DESC_IMPORTED_EN;
    const hasPosition = !!place.position;

    if (hasDescription || hasPosition) {
      methodXml += `        <place id="${place.id}">\n`;
      if (hasDescription) {
        methodXml += `          <description>${place.data.description}</description>\n`;
      }
      // ノード座標を <position> タグとして書き出す
      if (hasPosition) {
        methodXml += `          <position x="${place.position.x}" y="${place.position.y}"/>\n`;
      }
      methodXml += `        </place>\n`;
    } else {
      methodXml += `        <place id="${place.id}"/>\n`;
    }
  });
  
  // Transition要素群
  transitions.forEach((transition: Node<NodeData>) => {
    const hasName = transition.data.name && transition.data.name.trim() !== '';
    const hasDescription = transition.data.description && transition.data.description.trim() !== '';
    const hasPosition = !!transition.position;
    if (hasName || hasDescription || hasPosition) {
      methodXml += `        <transition id="${escapeXml(transition.id)}">\n`;
      if (hasName) {
        methodXml += `          <name>${escapeXml(transition.data.name)}</name>\n`;
      }
      if (hasDescription) {
        methodXml += `          <description>${escapeXml(transition.data.description)}</description>\n`;
      }
      // ノード座標を <position> タグとして書き出す
      if (hasPosition) {
        methodXml += `          <position x="${transition.position.x}" y="${transition.position.y}"/>\n`;
      }
      methodXml += `        </transition>\n`;
    } else {
      methodXml += `        <transition id="${escapeXml(transition.id)}"/>\n`;
    }
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
  
  // ✅ Template要素群
  // allTemplatesが提供されている場合: TemplateContextから直接取得（convertReactFlowToMaiMLと同じアプローチ）
  // allTemplatesが提供されていない場合: place.data.templateからフォールバック取得
  const materialTemplates: Node<NodeData>[] = [];
  const conditionTemplates: Node<NodeData>[] = [];
  const resultTemplates: Node<NodeData>[] = [];

  if (allTemplates) {
    console.log(`📋 [buildMethodXML] TemplateContextからテンプレート取得 (methodId: ${methodId})`);

    // materialTemplates: allTemplatesからmethodIdが一致するもののみ取得
    if (allTemplates.material) {
      const contextMaterials = allTemplates.material.filter((t: Template) =>
        t.methodId === methodId && t.placeRefs && t.placeRefs.length > 0
      );
      contextMaterials.forEach((template: Template) => {
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
              category: 'material',
              properties: template.properties || [],
              contents: template.contents || [],
              placeRefs: template.placeRefs || [],
              templateRef: template.templateRef,
            },
          },
        };
        materialTemplates.push(fakeNode);
        console.log(`  ✅ [buildMethodXML] MaterialTemplate追加: ${template.id}`);
      });
    }

    // conditionTemplates: allTemplatesからmethodIdが一致するもののみ取得
    if (allTemplates.condition) {
      const contextConditions = allTemplates.condition.filter((t: Template) =>
        t.methodId === methodId && t.placeRefs && t.placeRefs.length > 0
      );
      contextConditions.forEach((template: Template) => {
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
              category: 'condition',
              properties: template.properties || [],
              contents: template.contents || [],
              placeRefs: template.placeRefs || [],
              templateRef: template.templateRef,
            },
          },
        };
        conditionTemplates.push(fakeNode);
        console.log(`  ✅ [buildMethodXML] ConditionTemplate追加: ${template.id}`);
      });
    }

    // resultTemplates: allTemplatesからmethodIdが一致するもののみ取得
    if (allTemplates.result) {
      const contextResults = allTemplates.result.filter((t: Template) =>
        t.methodId === methodId && t.placeRefs && t.placeRefs.length > 0
      );
      contextResults.forEach((template: Template) => {
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
              category: 'result',
              properties: template.properties || [],
              contents: template.contents || [],
              placeRefs: template.placeRefs || [],
              templateRef: template.templateRef,
            },
          },
        };
        resultTemplates.push(fakeNode);
        console.log(`  ✅ [buildMethodXML] ResultTemplate追加: ${template.id}`);
      });
    }

    console.log(`📊 [buildMethodXML] テンプレート統計 (methodId: ${methodId}):`, {
      material: materialTemplates.length,
      condition: conditionTemplates.length,
      result: resultTemplates.length,
    });
  } else {
    // フォールバック: allTemplatesが提供されていない場合は place.data.template から取得
    console.log(`📋 [buildMethodXML] フォールバック: place.data.templateからテンプレート取得 (methodId: ${methodId})`);

    const templateNodes = places.filter((place: Node<NodeData>) => {
      if (!place.data.template) return false;
      // 共通テンプレート参照ノード（commonTemplateRef）は除外
      if (place.data.commonTemplateRef) return false;
      return true;
    });

    templateNodes.filter((n: Node<NodeData>) => n.data.placeType === 'material')
      .forEach((n: Node<NodeData>) => materialTemplates.push(n));
    templateNodes.filter((n: Node<NodeData>) => n.data.placeType === 'condition')
      .forEach((n: Node<NodeData>) => conditionTemplates.push(n));
    templateNodes.filter((n: Node<NodeData>) => n.data.placeType === 'result')
      .forEach((n: Node<NodeData>) => resultTemplates.push(n));
  }

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
  const templateId = template.id || `${prefix}${node.id}`;
  
  let templateXml = `        <${templateType} id="${templateId}">\n`;
  
  // uuid
  if (template.uuid) {
    templateXml += `          <uuid>${template.uuid}</uuid>\n`;
  } else {
    templateXml += `          <uuid>${generateUUID()}</uuid>\n`;
  }
  
  // XSD準拠: insertionType の uri/hash は必須（minOccurs=1）
  if (template.insertion) {
    templateXml += `          <insertion>\n`;
    // uri は必須（undefinedでも空文字で出力）
    templateXml += `            <uri>${escapeXml(template.insertion.uri ?? '')}</uri>\n`;
    // hash は必須（undefinedでも空文字で出力）
    templateXml += `            <hash>${escapeXml(template.insertion.hash?.value ?? '')}</hash>\n`;
    if (template.insertion.format) {
      templateXml += `            <format>${escapeXml(template.insertion.format)}</format>\n`;
    }
    templateXml += `          </insertion>\n`;
  }
  
  // name
  if (template.name) {
    templateXml += `          <name>${escapeXml(template.name)}</name>\n`;
  }
  
  // description
  if (template.description) {
    templateXml += `          <description>${escapeXml(template.description)}</description>\n`;
  }
  
  // property要素群
  if (template.properties && template.properties.length > 0) {
    template.properties.forEach((prop: Property) => {
      templateXml += buildPropertyXML(prop, 5);
    });
  }
  
  // XSD準拠: placeRef → templateRef の順で出力
  const placeRefs = template.placeRefs && template.placeRefs.length > 0
    ? template.placeRefs
    : [{ id: '', ref: node.id }];

  placeRefs.forEach((placeRef: PlaceRef, index: number) => {
    const placeRefId = index === 0
      ? (placeRef.id || `${templateId}TL`)
      : `${templateId}TL_${index}`;
    templateXml += `          <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(placeRef.ref)}"/>\n`;
  });

  // XSD準拠: templateRef は placeRef の後に出力
  if (template.templateRef) {
    const inheritNodeId = template.templateRef.ref;
    const inheritNode = allNodes.find((p: Node<NodeData>) => p.id === inheritNodeId && p.type !== 'transition');
    if (inheritNode && inheritNode.data.template) {
      const inheritTemplateId = inheritNode.data.template.id || `${prefix}${inheritNode.id}`;
      const templateRefId = `templateRef_${templateId}`;
      templateXml += `          <templateRef id="${escapeXml(templateRefId)}" ref="${escapeXml(inheritTemplateId)}"/>\n`;
    }
  }

  templateXml += `        </${templateType}>\n`;
  
  return templateXml;
}

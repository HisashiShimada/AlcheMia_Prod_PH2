// frontend/src/components/viewer/utils/maimlGenerator.ts
// MAIML XML生成ユーティリティ

import { Node, Edge } from 'reactflow';

/**
 * Document情報
 */
export interface DocumentInfo {
  id?: string;
  name: string;
  description?: string;
  date?: string;
  creator?: { id: string; name: string };
  vendor?: { id: string; name: string };
}

/**
 * React FlowのノードとエッジからMAIML XMLを生成
 */
export function generateMaimlXml(
  nodes: Node[],
  edges: Edge[],
  documentInfo: DocumentInfo
): string {
  const timestamp = new Date().toISOString();
  const docId = documentInfo.id || `doc_${Date.now()}`;
  const docName = documentInfo.name || 'Untitled';
  const docDescription = documentInfo.description || '';

  // XMLヘッダー
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<maiml xmlns="http://www.example.com/maiml" version="1.0">\n';

  // Document要素
  xml += `  <document id="${escapeXml(docId)}">\n`;
  xml += `    <name>${escapeXml(docName)}</name>\n`;
  if (docDescription) {
    xml += `    <description>${escapeXml(docDescription)}</description>\n`;
  }
  xml += `    <date>${timestamp}</date>\n`;
  if (documentInfo.creator) {
    xml += `    <creator id="${escapeXml(documentInfo.creator.id)}">${escapeXml(documentInfo.creator.name)}</creator>\n`;
  }
  xml += `  </document>\n`;

  // Method要素
  xml += `  <method id="method_${Date.now()}">\n`;
  xml += `    <name>Method 1</name>\n`;

  // PNML要素（Petri Net Markup Language）
  xml += `    <pnml>\n`;
  xml += `      <net id="net_${Date.now()}" type="http://www.pnml.org/version-2009/grammar/petrinetdata">\n`;

  // Page要素
  xml += `        <page id="page_${Date.now()}">\n`;

  // Placesを出力
  const placeNodes = nodes.filter(node => node.data.nodeType === 'place');
  placeNodes.forEach(node => {
    xml += `          <place id="${escapeXml(node.id)}">\n`;
    xml += `            <name>${escapeXml(node.data.label || node.data.name || node.id)}</name>\n`;
    
    // 位置情報
    xml += `            <graphics>\n`;
    xml += `              <position x="${node.position.x}" y="${node.position.y}"/>\n`;
    xml += `            </graphics>\n`;
    
    xml += `          </place>\n`;
  });

  // Transitionsを出力
  const transitionNodes = nodes.filter(node => node.data.nodeType === 'transition');
  transitionNodes.forEach(node => {
    xml += `          <transition id="${escapeXml(node.id)}">\n`;
    xml += `            <name>${escapeXml(node.data.label || node.data.name || node.id)}</name>\n`;
    
    // 位置情報
    xml += `            <graphics>\n`;
    xml += `              <position x="${node.position.x}" y="${node.position.y}"/>\n`;
    xml += `            </graphics>\n`;
    
    xml += `          </transition>\n`;
  });

  // Arcsを出力
  edges.forEach(edge => {
    xml += `          <arc id="${escapeXml(edge.id)}" source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}">\n`;
    if (edge.label) {
      xml += `            <name>${escapeXml(String(edge.label))}</name>\n`;
    }
    xml += `          </arc>\n`;
  });

  xml += `        </page>\n`;
  xml += `      </net>\n`;
    xml += `    </pnml>\n`;

  // Templates（簡易版：ノードのtemplateTypeに基づいて生成）
  const materialNodes = nodes.filter(node => node.data.templateType === 'material');
  materialNodes.forEach(node => {
    xml += `    <materialTemplate id="${escapeXml(node.id)}">\n`;
    xml += `      <name>${escapeXml(node.data.label || node.data.name || node.id)}</name>\n`;
    if (node.data.description) {
      xml += `      <description>${escapeXml(node.data.description)}</description>\n`;
    }
    xml += `      <placeRef ref="${escapeXml(node.id)}"/>\n`;
    xml += `    </materialTemplate>\n`;
  });

  const conditionNodes = nodes.filter(node => node.data.templateType === 'condition');
  conditionNodes.forEach(node => {
    xml += `    <conditionTemplate id="${escapeXml(node.id)}">\n`;
    xml += `      <name>${escapeXml(node.data.label || node.data.name || node.id)}</name>\n`;
    if (node.data.description) {
      xml += `      <description>${escapeXml(node.data.description)}</description>\n`;
    }
    xml += `      <placeRef ref="${escapeXml(node.id)}"/>\n`;
    xml += `    </conditionTemplate>\n`;
  });

  const resultNodes = nodes.filter(node => node.data.templateType === 'result');
  resultNodes.forEach(node => {
    xml += `    <resultTemplate id="${escapeXml(node.id)}">\n`;
    xml += `      <name>${escapeXml(node.data.label || node.data.name || node.id)}</name>\n`;
    if (node.data.description) {
      xml += `      <description>${escapeXml(node.data.description)}</description>\n`;
    }
    xml += `      <placeRef ref="${escapeXml(node.id)}"/>\n`;
    xml += `    </resultTemplate>\n`;
  });

  xml += `  </method>\n`;
  xml += '</maiml>\n';

  return xml;
}

/**
 * XML特殊文字のエスケープ
 */
function escapeXml(text: string): string {
  if (typeof text !== 'string') {
    return String(text);
  }
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * バリデーション: ペトリネットの基本的な検証
 */
export function validatePetriNet(nodes: Node[], edges: Edge[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ノードが存在するか
  if (nodes.length === 0) {
    errors.push('ノードが1つも存在しません');
  }

  // PlaceとTransitionが両方存在するか
  const hasPlace = nodes.some(node => node.data.nodeType === 'place');
  const hasTransition = nodes.some(node => node.data.nodeType === 'transition');
  
  if (!hasPlace) {
    warnings.push('Placeノードが存在しません');
  }
  
  if (!hasTransition) {
    warnings.push('Transitionノードが存在しません');
  }

  // エッジの検証
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode) {
      errors.push(`エッジ "${edge.id}" のソースノード "${edge.source}" が存在しません`);
    }
    
    if (!targetNode) {
      errors.push(`エッジ "${edge.id}" のターゲットノード "${edge.target}" が存在しません`);
    }
  });

  // 孤立ノードの警告
  const connectedNodeIds = new Set<string>();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });
  
  nodes.forEach(node => {
    if (!connectedNodeIds.has(node.id)) {
      warnings.push(`ノード "${node.data.label || node.id}" は孤立しています（エッジがありません）`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * maimlLoader - MAIML読み込みユーティリティ
 * 
 * XMLからReactFlowノード・エッジへの変換処理
 * 
 * @version 1.0.0
 * @date 2026-01-30
 */

import type { Node, Edge } from 'reactflow';
import { maimlToReactFlow } from '../utils/converters/maimlToReactFlow';
import type { NodeData, EdgeData } from '../../../types/editor';
import { getTranslation } from '../../../contexts/LanguageContext';

export interface LoadMaimlResult {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  success: boolean;
  error?: string;
}

/**
 * MAIML XMLを読み込んでノード・エッジに変換
 */
export const loadMaimlFromXml = async (
  xmlContent: string
): Promise<LoadMaimlResult> => {
  try {
    console.log('📂 [maimlLoader] MAIML読み込み開始');
    
    // maimlToReactFlowを使用して変換
    const { nodes, edges } = maimlToReactFlow(xmlContent);
    
    if (!nodes || nodes.length === 0) {
      return {
        nodes: [],
        edges: [],
        success: false,
        error: getTranslation('editor.loader.xmlParseFailed'),
      };
    }

    console.log('✅ [maimlLoader] 読み込み完了:', nodes.length, 'ノード,', edges.length, 'エッジ');
    
    return {
      nodes,
      edges,
      success: true,
    };
  } catch (error) {
    console.error('❌ [maimlLoader] 読み込みエラー:', error);
    return {
      nodes: [],
      edges: [],
      success: false,
      error: error instanceof Error ? error.message : getTranslation('editor.loader.unknownError'),
    };
  }
};

/**
 * ファイルからMAIMLを読み込み
 */
export const loadMaimlFromFile = async (
  file: File
): Promise<LoadMaimlResult> => {
  try {
    const xmlContent = await file.text();
    return await loadMaimlFromXml(xmlContent);
  } catch (error) {
    console.error('❌ [maimlLoader] ファイル読み込みエラー:', error);
    return {
      nodes: [],
      edges: [],
      success: false,
      error: error instanceof Error ? error.message : getTranslation('editor.loader.fileReadError'),
    };
  }
};

/**
 * URLからMAIMLを読み込み
 */
export const loadMaimlFromUrl = async (
  url: string
): Promise<LoadMaimlResult> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const xmlContent = await response.text();
    return await loadMaimlFromXml(xmlContent);
  } catch (error) {
    console.error('❌ [maimlLoader] URL読み込みエラー:', error);
    return {
      nodes: [],
      edges: [],
      success: false,
      error: error instanceof Error ? error.message : getTranslation('editor.loader.urlReadError'),
    };
  }
};

/**
 * バリデーション付きロード
 */
export const loadMaimlWithValidation = async (
  xmlContent: string
): Promise<LoadMaimlResult & { warnings: string[] }> => {
  const result = await loadMaimlFromXml(xmlContent);
  const warnings: string[] = [];

  if (result.success) {
    // 孤立ノードチェック
    const connectedNodeIds = new Set<string>();
    for (const edge of result.edges) {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }

    const isolatedNodes = result.nodes.filter(
      node => !connectedNodeIds.has(node.id)
    );
    
    if (isolatedNodes.length > 0) {
      warnings.push(
        `${getTranslation('editor.validation.isolatedNodesPrefix')}${isolatedNodes.length}${getTranslation('editor.validation.isolatedNodesSuffix')}`
      );
    }

    // 空のテンプレートチェック
    const nodesWithoutTemplates = result.nodes.filter(
      node =>
        node.data.placeType &&
        (!node.data.template)
    );
    
    if (nodesWithoutTemplates.length > 0) {
      warnings.push(
        `${getTranslation('editor.loader.noTemplateNodesPrefix')}${nodesWithoutTemplates.length}${getTranslation('editor.loader.noTemplateNodesSuffix')}`
      );
    }
  }

  return {
    ...result,
    warnings,
  };
};

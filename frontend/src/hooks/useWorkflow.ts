/**
 * useWorkflow - ワークフロー追加機能フック
 * 
 * V1のMaiMLペトリネット追加機能をV2のReact Flowアーキテクチャに移植
 * 
 * @version 1.0.0
 * @date 2025-12-23
 */

import { useCallback } from 'react';
import { Node, Edge } from 'reactflow';

/**
 * テンプレート情報の型定義
 */
export interface Templates {
  materialTemplates: Record<string, any>;
  conditionTemplates: Record<string, any>;
  resultTemplates: Record<string, any>;
}

/**
 * useWorkflowパラメータの型定義
 */
export interface UseWorkflowParams {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  addToHistory: (action: string, data: any) => void;
  templates: Templates;
  setTemplates: React.Dispatch<React.SetStateAction<Templates>>;
}

/**
 * クリック座標の型定義
 */
export interface ClickPosition {
  x: number;
  y: number;
}

/**
 * ワークフロー追加結果の型定義
 */
export interface AddWorkflowResult {
  success: boolean;
  nodes?: Node[];
  edges?: Edge[];
  templates?: Templates;
  message?: string;
  error?: string;
}

/**
 * 境界情報の型定義
 */
interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  center: {
    x: number;
    y: number;
  };
}

/**
 * ID重複解決結果の型定義
 */
interface IdConflictResolution {
  mappedNodes: Node[];
  mappedEdges: Edge[];
  idMapping: Record<string, string>;
}

/**
 * ワークフロー追加カスタムフック
 * 
 * @param params - フックパラメータ
 * @returns ワークフロー操作関数
 */
export const useWorkflow = ({
  nodes,
  edges,
  setNodes,
  setEdges,
  addToHistory,
  templates,
  setTemplates
}: UseWorkflowParams) => {
  
  /**
   * ワークフロー追加メイン処理
   * 
   * @param clickPosition - クリック座標 { x, y }
   * @param maimlContent - 追加するMaiML XML文字列
   * @param fileName - ファイル名（履歴用）
   * @returns 追加結果
   */
  const addWorkflow = useCallback(async (
    clickPosition: ClickPosition,
    maimlContent: string,
    fileName: string = 'workflow.maiml'
  ): Promise<AddWorkflowResult> => {
    try {
      console.log('🚀 [useWorkflow] ワークフロー追加開始:', {
        clickPosition,
        fileName,
        currentNodes: nodes.length,
        currentEdges: edges.length
      });
      
      // Step 1: MaiML → React Flow変換
      // TODO: maimlToReactFlow実装後に有効化
      // const { nodes: newNodes, edges: newEdges } = maimlToReactFlow(maimlContent);
      
      // 暫定的に空配列を返す（後で実装）
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];
      
      if (!newNodes || newNodes.length === 0) {
        throw new Error('変換されたノードが空です');
      }
      
      console.log('✅ [useWorkflow] MaiML変換完了:', {
        newNodesCount: newNodes.length,
        newEdgesCount: newEdges.length
      });
      
      // Step 2: 座標オフセット計算
      const bounds = calculateNodeBounds(newNodes);
      const offsetX = clickPosition.x - bounds.center.x;
      const offsetY = clickPosition.y - bounds.center.y;
      
      console.log('📐 [useWorkflow] 座標オフセット計算:', {
        clickPosition,
        boundsCenter: bounds.center,
        offset: { x: offsetX, y: offsetY }
      });
      
      // Step 3: ノード座標調整
      const adjustedNodes = newNodes.map(node => ({
        ...node,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY
        }
      }));
      
      // Step 4: ID重複解決
      const { mappedNodes, mappedEdges, idMapping } = resolveIdConflicts(
        adjustedNodes,
        newEdges,
        nodes,
        edges
      );
      
      console.log('🔄 [useWorkflow] ID重複解決完了:', {
        totalMappings: Object.keys(idMapping).length,
        sampleMappings: Object.entries(idMapping).slice(0, 3)
      });
      
      // Step 5: テンプレート情報の抽出と統合
      const newTemplates = extractTemplatesFromNodes(mappedNodes, idMapping);
      
      // テンプレート統合
      const mergedTemplates = mergeTemplates(templates, newTemplates);
      
      console.log('📋 [useWorkflow] テンプレート統合完了:', {
        originalTemplateCount: countTemplates(templates),
        newTemplateCount: countTemplates(newTemplates),
        mergedTemplateCount: countTemplates(mergedTemplates)
      });
      
      // Step 6: React Flow状態更新
      setNodes(prev => [...prev, ...mappedNodes]);
      setEdges(prev => [...prev, ...mappedEdges]);
      setTemplates(mergedTemplates);
      
      // Step 7: Undo/Redo履歴追加
      addToHistory('addWorkflow', {
        description: `ワークフロー追加: ${fileName}`,
        nodes: mappedNodes,
        edges: mappedEdges,
        templates: newTemplates,
        fileName
      });
      
      console.log('✅ [useWorkflow] ワークフロー追加完了:', {
        addedNodes: mappedNodes.length,
        addedEdges: mappedEdges.length,
        totalNodes: nodes.length + mappedNodes.length,
        totalEdges: edges.length + mappedEdges.length
      });
      
      return {
        success: true,
        nodes: mappedNodes,
        edges: mappedEdges,
        templates: newTemplates,
        message: `ワークフロー追加完了: ${mappedNodes.length}ノード, ${mappedEdges.length}エッジ`
      };
      
    } catch (error) {
      console.error('❌ [useWorkflow] ワークフロー追加エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, [nodes, edges, setNodes, setEdges, addToHistory, templates, setTemplates]);
  
  return {
    addWorkflow
  };
};

/**
 * ノード群の境界を計算
 * @param nodes - ノード配列
 * @returns 境界情報
 */
const calculateNodeBounds = (nodes: Node[]): Bounds => {
  if (!nodes || nodes.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      center: { x: 0, y: 0 }
    };
  }
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  nodes.forEach(node => {
    const x = node.position.x;
    const y = node.position.y;
    
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    center: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2
    }
  };
};

/**
 * ID重複を解決
 * @param newNodes - 新しいノード配列
 * @param newEdges - 新しいエッジ配列
 * @param existingNodes - 既存ノード配列
 * @param existingEdges - 既存エッジ配列
 * @returns ID重複解決結果
 */
const resolveIdConflicts = (
  newNodes: Node[],
  newEdges: Edge[],
  existingNodes: Node[],
  existingEdges: Edge[]
): IdConflictResolution => {
  const idMapping: Record<string, string> = {};
  const existingIds = new Set<string>([
    ...existingNodes.map(n => n.id),
    ...existingEdges.map(e => e.id)
  ]);
  
  // ノードID重複解決
  newNodes.forEach(node => {
    if (existingIds.has(node.id)) {
      const newId = generateUniqueId(node.id, existingIds);
      idMapping[node.id] = newId;
      existingIds.add(newId);
    } else {
      idMapping[node.id] = node.id;
      existingIds.add(node.id);
    }
  });
  
  // エッジID重複解決
  newEdges.forEach(edge => {
    if (existingIds.has(edge.id)) {
      const newId = generateUniqueId(edge.id, existingIds);
      idMapping[edge.id] = newId;
      existingIds.add(newId);
    } else {
      idMapping[edge.id] = edge.id;
      existingIds.add(edge.id);
    }
  });
  
  // IDマッピング適用
  const mappedNodes = newNodes.map(node => ({
    ...node,
    id: idMapping[node.id],
    data: {
      ...node.data,
      originalId: node.id // 元のIDを保持
    }
  }));
  
  const mappedEdges = newEdges.map(edge => ({
    ...edge,
    id: idMapping[edge.id],
    source: idMapping[edge.source] || edge.source,
    target: idMapping[edge.target] || edge.target
  }));
  
  return {
    mappedNodes,
    mappedEdges,
    idMapping
  };
};

/**
 * ユニークなIDを生成
 * @param baseId - 基本ID
 * @param existingIds - 既存ID集合
 * @returns ユニークなID
 */
const generateUniqueId = (baseId: string, existingIds: Set<string>): string => {
  let counter = 1;
  let newId = `${baseId}_added`;
  
  while (existingIds.has(newId)) {
    newId = `${baseId}_added_${counter}`;
    counter++;
  }
  
  return newId;
};

/**
 * ノードからテンプレート情報を抽出
 * @param nodes - ノード配列
 * @param idMapping - IDマッピング
 * @returns テンプレート情報
 */
const extractTemplatesFromNodes = (nodes: Node[], idMapping: Record<string, string>): Templates => {
  const templates: Templates = {
    materialTemplates: {},
    conditionTemplates: {},
    resultTemplates: {}
  };
  
  nodes.forEach(node => {
    if (node.data.template || node.data.templateRef) {
      const template = node.data.template || node.data.templateRef;
      const templateType = getTemplateTypeFromNode(node);
      
      if (templateType && template) {
        // テンプレートIDも更新
        const originalTemplateId = template.id;
        const newTemplateId = idMapping[originalTemplateId] || originalTemplateId;
        
        const updatedTemplate = {
          ...template,
          id: newTemplateId,
          placeRef: node.id // 新しいノードIDに更新
        };
        
        templates[templateType][newTemplateId] = updatedTemplate;
      }
    }
  });
  
  return templates;
};

/**
 * ノードからテンプレートタイプを判定
 * @param node - ノード
 * @returns テンプレートタイプ
 */
const getTemplateTypeFromNode = (node: Node): keyof Templates | null => {
  // V2のノードタイプに対応
  if (node.type === 'materialTemplate' || node.data.placeType === 'material') {
    return 'materialTemplates';
  } else if (node.type === 'conditionTemplate' || node.data.placeType === 'condition') {
    return 'conditionTemplates';
  } else if (node.type === 'resultTemplate' || node.data.placeType === 'result') {
    return 'resultTemplates';
  }
  return null;
};

/**
 * テンプレートを統合
 * @param existingTemplates - 既存テンプレート
 * @param newTemplates - 新しいテンプレート
 * @returns 統合されたテンプレート
 */
const mergeTemplates = (existingTemplates: Templates, newTemplates: Templates): Templates => {
  return {
    materialTemplates: {
      ...existingTemplates.materialTemplates,
      ...newTemplates.materialTemplates
    },
    conditionTemplates: {
      ...existingTemplates.conditionTemplates,
      ...newTemplates.conditionTemplates
    },
    resultTemplates: {
      ...existingTemplates.resultTemplates,
      ...newTemplates.resultTemplates
    }
  };
};

/**
 * テンプレート数をカウント
 * @param templates - テンプレート情報
 * @returns テンプレート総数
 */
const countTemplates = (templates: Templates): number => {
  return (
    Object.keys(templates.materialTemplates || {}).length +
    Object.keys(templates.conditionTemplates || {}).length +
    Object.keys(templates.resultTemplates || {}).length
  );
};

export default useWorkflow;

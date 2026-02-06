/**
 * useWorkflow - ワークフロー管理フック（Phase 9拡張版）
 * 
 * ReactFlow状態管理の中核フック
 * - ノード・エッジの追加・削除・更新
 * - MaiML読み込み・エクスポート
 * - ワークフロー追加機能
 * - メソッド管理
 * 
 * @version 2.0.0 (Phase 9)
 * @date 2026-01-29
 */

import { useState, useCallback, useMemo } from 'react';
import { Node, Edge, Connection, XYPosition, NodeChange, EdgeChange } from 'reactflow';
import { maimlToReactFlow } from '../utils/converters/maimlToReactFlow';
import { Template } from '@/types/maiml-unified';
import { TemplatesByCategory } from '../components/TemplateViewer/TemplateList';
import { NodeData,EdgeData } from '../types';

/**
 * ノード境界情報の型定義
 */
interface NodeBounds {
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
  mappedNodes: Node<NodeData>[];
  mappedEdges: Edge<EdgeData>[];
  idMapping: Record<string, string>;
}

/**
 * ワークフロー追加結果の型定義
 */
export interface WorkflowAddResult {
  success: boolean;
  nodes?: Node<NodeData>[];
  edges?: Edge<EdgeData>[];
  templates?: TemplatesByCategory;
  message?: string;
  error?: string;
}

/**
 * メソッドデータの型定義
 */
export interface MethodData {
  methodId: string;
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
}

/**
 * ノードタイプ定義
 */
export type NodeType = 
  | 'materialPlace'
  | 'conditionPlace'
  | 'resultPlace'
  | 'transition'
  | 'materialTemplate'
  | 'conditionTemplate'
  | 'resultTemplate';

/**
 * useWorkflowパラメータの型定義（Phase 9拡張版）
 */
export interface UseWorkflowParams {
  projectId: string;
  addToHistory: (action: string, data: unknown) => void;
}

/**
 * useWorkflowの返り値型（Phase 9拡張版）
 */
export interface UseWorkflowReturn {
  // 状態
  methods: MethodData[];
  activeMethodIndex: number;
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  templates: TemplatesByCategory;
  
  // メソッド操作
  setActiveMethodIndex: (index: number) => void;
  
  // ノード操作
  addNode: (nodeType: NodeType, position: XYPosition) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  deleteNode: (nodeId: string) => void;
  
  // エッジ操作
  addEdge: (connection: Connection) => void;
  deleteEdge: (edgeId: string) => void;
  
  // ReactFlow連携
  updateNodesFromChanges: (changes: NodeChange[]) => void;
  updateEdgesFromChanges: (changes: EdgeChange[]) => void;
  
  // ワークフロー追加
  addWorkflow: (
    clickPosition: { x: number; y: number },
    maimlContent: string,
    fileName?: string
  ) => Promise<WorkflowAddResult>;
  
  // データ読み込み・保存
  loadMaimlData: (maimlContent: string) => Promise<void>;
  exportToMaiml: () => string;
}

/**
 * ワークフロー管理カスタムフック（Phase 9完全実装版）
 * 
 * @param params - useWorkflowパラメータ
 * @returns ワークフロー操作関数と状態
 */
export const useWorkflow = ({
  projectId,
  addToHistory
}: UseWorkflowParams): UseWorkflowReturn => {
  
  // ========================
  // 状態管理
  // ========================
  
  // メソッド配列（複数メソッド対応）
  const [methods, setMethods] = useState<MethodData[]>([
    { methodId: 'method1', nodes: [], edges: [] }
  ]);
  
  // アクティブメソッドインデックス
  const [activeMethodIndex, setActiveMethodIndex] = useState<number>(0);
  
  // テンプレート情報
  const [templates, setTemplates] = useState<TemplatesByCategory>({
    material: [],
    condition: [],
    result: []
  });
  
  // ========================
  // 現在のメソッドの状態（メモ化）
  // ========================
  
  const currentMethod = useMemo(() => {
    return methods[activeMethodIndex] || methods[0];
  }, [methods, activeMethodIndex]);
  
  const nodes = useMemo(() => currentMethod.nodes, [currentMethod]);
  const edges = useMemo(() => currentMethod.edges, [currentMethod]);
  
  // ========================
  // 内部ヘルパー関数
  // ========================
  
  /**
   * 現在のメソッドを更新
   */
  const updateCurrentMethod = useCallback((updates: Partial<MethodData>) => {
    setMethods(prev => {
      const newMethods = [...prev];
      newMethods[activeMethodIndex] = {
        ...newMethods[activeMethodIndex],
        ...updates
      };
      return newMethods;
    });
  }, [activeMethodIndex]);
  
  /**
   * ノード配列を更新
   */
  const setNodes = useCallback((updater: React.SetStateAction<Node[]>) => {
    setMethods(prev => {
      const newMethods = [...prev];
      const currentNodes = newMethods[activeMethodIndex].nodes;
      const newNodes = typeof updater === 'function' ? updater(currentNodes) : updater;
      newMethods[activeMethodIndex] = {
        ...newMethods[activeMethodIndex],
        nodes: newNodes
      };
      return newMethods;
    });
  }, [activeMethodIndex]);
  
  /**
   * エッジ配列を更新
   */
  const setEdges = useCallback((updater: React.SetStateAction<Edge[]>) => {
    setMethods(prev => {
      const newMethods = [...prev];
      const currentEdges = newMethods[activeMethodIndex].edges;
      const newEdges = typeof updater === 'function' ? updater(currentEdges) : updater;
      newMethods[activeMethodIndex] = {
        ...newMethods[activeMethodIndex],
        edges: newEdges
      };
      return newMethods;
    });
  }, [activeMethodIndex]);
  
  // ========================
  // ノード操作
  // ========================
  
  /**
   * ノード追加
   */
  const addNode = useCallback((nodeType: NodeType, position: XYPosition) => {
    const newNode: Node = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      position,
      data: {
        label: getNodeLabelFromType(nodeType),
        placeType: getPlaceTypeFromNodeType(nodeType),
        properties: {}
      }
    };
    
    setNodes(prev => [...prev, newNode]);
    addToHistory('addNode', { node: newNode });
    
    console.log('✅ [useWorkflow] ノード追加:', newNode);
  }, [setNodes, addToHistory]);
  
  /**
   * ノード更新
   */
  const updateNode = useCallback((nodeId: string, updates: Partial<Node>) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId ? { ...node, ...updates } : node
    ));
    addToHistory('updateNode', { nodeId, updates });
    
    console.log('✅ [useWorkflow] ノード更新:', nodeId, updates);
  }, [setNodes, addToHistory]);
  
  /**
   * ノード削除
   */
  const deleteNode = useCallback((nodeId: string) => {
    const deletedNode = nodes.find(n => n.id === nodeId);
    
    // ノード削除
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    
    // 関連エッジも削除
    setEdges(prev => prev.filter(edge =>
      edge.source !== nodeId && edge.target !== nodeId
    ));
    
    addToHistory('deleteNode', { node: deletedNode });
    
    console.log('✅ [useWorkflow] ノード削除:', nodeId);
  }, [nodes, setNodes, setEdges, addToHistory]);
  
  // ========================
  // エッジ操作
  // ========================
  
  /**
   * エッジ追加
   */
  const addEdge = useCallback((connection: Connection) => {
    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      source: connection.source!,
      target: connection.target!,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'smoothstep'
    };
    
    setEdges(prev => [...prev, newEdge]);
    addToHistory('addEdge', { edge: newEdge });
    
    console.log('✅ [useWorkflow] エッジ追加:', newEdge);
  }, [setEdges, addToHistory]);
  
  /**
   * エッジ削除
   */
  const deleteEdge = useCallback((edgeId: string) => {
    const deletedEdge = edges.find(e => e.id === edgeId);
    
    setEdges(prev => prev.filter(edge => edge.id !== edgeId));
    addToHistory('deleteEdge', { edge: deletedEdge });
    
    console.log('✅ [useWorkflow] エッジ削除:', edgeId);
  }, [edges, setEdges, addToHistory]);
  
  // ========================
  // ReactFlow連携
  // ========================
  
  /**
   * ReactFlowのノード変更を反映
   */
  const updateNodesFromChanges = useCallback((changes: NodeChange[]) => {
    setNodes(prev => {
      let updated = [...prev];
      
      changes.forEach(change => {
        if (change.type === 'position' && change.position) {
          // ノード位置の更新
          const index = updated.findIndex(n => n.id === change.id);
          if (index !== -1) {
            updated[index] = {
              ...updated[index],
              position: change.position
            };
          }
        } else if (change.type === 'remove') {
          // ノードの削除
          updated = updated.filter(n => n.id !== change.id);
        }
      });
      
      return updated;
    });
  }, [setNodes]);
  
  /**
   * ReactFlowのエッジ変更を反映
   */
  const updateEdgesFromChanges = useCallback((changes: EdgeChange[]) => {
    setEdges(prev => {
      let updated = [...prev];
      
      changes.forEach(change => {
        if (change.type === 'remove') {
          // エッジの削除
          updated = updated.filter(e => e.id !== change.id);
        }
      });
      
      return updated;
    });
  }, [setEdges]);
  
  // ========================
  // データ読み込み・保存
  // ========================
  
  /**
   * MaiMLデータ読み込み
   */
  const loadMaimlData = useCallback(async (maimlContent: string) => {
    try {
      console.log('🚀 [useWorkflow] MaiMLデータ読み込み開始');
      
      const { nodes: loadedNodes, edges: loadedEdges } = maimlToReactFlow(maimlContent);
      
      updateCurrentMethod({
        nodes: loadedNodes,
        edges: loadedEdges
      });
      
      // テンプレート抽出
      const extractedTemplates = extractTemplatesFromNodes(loadedNodes, {});
      setTemplates(extractedTemplates);
      
      addToHistory('loadMaimlData', {
        nodesCount: loadedNodes.length,
        edgesCount: loadedEdges.length
      });
      
      console.log('✅ [useWorkflow] MaiMLデータ読み込み完了:', {
        nodes: loadedNodes.length,
        edges: loadedEdges.length
      });
    } catch (error) {
      console.error('❌ [useWorkflow] MaiMLデータ読み込みエラー:', error);
      throw error;
    }
  }, [updateCurrentMethod, addToHistory]);
  
  /**
   * MaiMLエクスポート（Phase 10で実装予定）
   */
  const exportToMaiml = useCallback((): string => {
    try {
      console.log('🚀 [useWorkflow] MaiMLエクスポート開始（モック）');
      
      // TODO: Phase 10でreactFlowToMaimlを実装
      const maimlContent = '<?xml version="1.0"?><maiml></maiml>';
      
      console.log('✅ [useWorkflow] MaiMLエクスポート完了（モック）');
      return maimlContent;
    } catch (error) {
      console.error('❌ [useWorkflow] MaiMLエクスポートエラー:', error);
      throw error;
    }
  }, [nodes, edges, templates]);
  
  
  /**
   * ワークフロー追加メイン処理
   * 
   * @param clickPosition - クリック座標 { x, y }
   * @param maimlContent - 追加するMaiML XML文字列
   * @param fileName - ファイル名（履歴用）
   * @returns 追加結果
   */
  const addWorkflow = useCallback(async (
    clickPosition: { x: number; y: number },
    maimlContent: string,
    fileName = 'workflow.maiml'
  ): Promise<WorkflowAddResult> => {
    try {
      console.log('🚀 [useWorkflow] ワークフロー追加開始:', {
        clickPosition,
        fileName,
        currentNodes: nodes.length,
        currentEdges: edges.length
      });
      
      // Step 1: MaiML → React Flow変換
      const { nodes: newNodes, edges: newEdges } = maimlToReactFlow(maimlContent);
      
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [useWorkflow] ワークフロー追加エラー:', error);
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [nodes, edges, setNodes, setEdges, addToHistory, templates, setTemplates]);
  
  return {
    // 状態
    methods,
    activeMethodIndex,
    nodes,
    edges,
    templates,
    
    // メソッド操作
    setActiveMethodIndex,
    
    // ノード操作
    addNode,
    updateNode,
    deleteNode,
    
    // エッジ操作
    addEdge,
    deleteEdge,
    
    // ReactFlow連携
    updateNodesFromChanges,
    updateEdgesFromChanges,
    
    // ワークフロー追加
    addWorkflow,
    
    // データ読み込み・保存
    loadMaimlData,
    exportToMaiml
  };
};

/**
 * ノードタイプからラベルを取得
 * @param nodeType - ノードタイプ
 * @returns ラベル文字列
 */
const getNodeLabelFromType = (nodeType: NodeType): string => {
  const labels: Record<NodeType, string> = {
    materialPlace: 'Material',
    conditionPlace: 'Condition',
    resultPlace: 'Result',
    transition: 'Transition',
    materialTemplate: 'Material Template',
    conditionTemplate: 'Condition Template',
    resultTemplate: 'Result Template'
  };
  return labels[nodeType] || 'Unknown';
};

/**
 * ノードタイプからプレイスタイプを取得
 * @param nodeType - ノードタイプ
 * @returns プレイスタイプ文字列
 */
const getPlaceTypeFromNodeType = (nodeType: NodeType): string | undefined => {
  if (nodeType.includes('material')) return 'material';
  if (nodeType.includes('condition')) return 'condition';
  if (nodeType.includes('result')) return 'result';
  return undefined;
};

/**
 * ノード群の境界を計算
 * @param nodes - ノード配列
 * @returns 境界情報
 */
const calculateNodeBounds = (nodes: Node[]): NodeBounds => {
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
const extractTemplatesFromNodes = (nodes: Node<NodeData>[], idMapping: Record<string, string>): TemplatesByCategory => {
  const templates: TemplatesByCategory = {
    material: [],
    condition: [],
    result: []
  };
  
  nodes.forEach(node => {
    const nodeData = node.data;
    const template = nodeData.template || nodeData.templateRef;
    if (template) {
      const templateType = getTemplateTypeFromNode(node);
      
      if (templateType && template) {
        // テンプレートIDも更新
        const originalTemplateId = template.id;
        const newTemplateId = idMapping[originalTemplateId] || originalTemplateId;
        
        const updatedTemplate: Template = {
          ...template,
          id: newTemplateId,
          placeRefs: [{id : '', ref : node.id}] // 新しいノードIDに更新
        };
        
        templates[templateType].push(updatedTemplate)
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
const getTemplateTypeFromNode = (node: Node<NodeData>): keyof TemplatesByCategory | null => {
  const nodeData = node.data;
  
  // V2のノードタイプに対応
  if (node.type === 'materialTemplate' || nodeData.placeType === 'material') {
    return 'material';
  } else if (node.type === 'conditionTemplate' || nodeData.placeType === 'condition') {
    return 'condition';
  } else if (node.type === 'resultTemplate' || nodeData.placeType === 'result') {
    return 'result';
  }
  return null;
};

/**
 * テンプレートを統合
 * @param existingTemplates - 既存テンプレート
 * @param newTemplates - 新しいテンプレート
 * @returns 統合されたテンプレート
 */
const mergeTemplates = (existingTemplates: TemplatesByCategory, newTemplates: TemplatesByCategory): TemplatesByCategory => {
  return {
    material: {
      ...existingTemplates.material,
      ...newTemplates.material
    },
    condition: {
      ...existingTemplates.condition,
      ...newTemplates.condition
    },
    result: {
      ...existingTemplates.result,
      ...newTemplates.result
    }
  };
};

/**
 * テンプレート数をカウント
 * @param templates - テンプレート情報
 * @returns テンプレート総数
 */
const countTemplates = (templates: TemplatesByCategory): number => {
  return (
    Object.keys(templates.material).length +
    Object.keys(templates.condition).length +
    Object.keys(templates.result).length
  );
};

export default useWorkflow;
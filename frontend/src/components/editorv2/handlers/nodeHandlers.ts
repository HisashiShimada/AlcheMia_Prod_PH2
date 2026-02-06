/**
 * nodeHandlers - ノード操作ハンドラー集約
 * 
 * ノードの追加・更新・削除・選択などの操作を管理
 * 
 * @version 1.0.0
 * @date 2026-01-30
 */

import type { Node, Edge } from 'reactflow';
import { NodeData, EdgeData } from '../types';

export interface NodeHandlersProps {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  setNodes: (nodes: Node<NodeData>) => void;
  setEdges: (edges: Edge<EdgeData>[]) => void;
  setSelectedNode: (node: Node<NodeData>) => void;
  setSelectedEdge: (edge: Edge<EdgeData>) => void;
  pushState: (state: any) => void;
  setTemplateEditorOpen: (open: boolean) => void;
  setEditingTemplateType: (type: string | null) => void;
  setEditingNodeId: (id: string | null) => void;
  setEditingNodeName: (name: string | null) => void;
}

export interface NodeHandlersResult {
  handleAddNode: (type: string, position: { x: number; y: number }) => void;
  handleNodeClick: (_event: any, node: Node<NodeData>) => void;
  handleNodeDoubleClick: (_event: any, node: Node<NodeData>) => void;
  handleNodesChange: (changes: Node<NodeData>[]) => void;
  handleNodeDragStop: (_event: any, node: Node<NodeData>) => void;
  handleDeleteNode: (nodeId: string) => void;
  handleOpenPropertyEditor: (node: Node<NodeData>) => void;
}

/**
 * ノード操作ハンドラーを生成
 */
export const createNodeHandlers = ({
  nodes,
  edges,
  setNodes,
  setEdges,
  setSelectedNode,
  setSelectedEdge,
  pushState,
  setTemplateEditorOpen,
  setEditingTemplateType,
  setEditingNodeId,
  setEditingNodeName,
}: NodeHandlersProps): NodeHandlersResult => {
  
  /**
   * ノード追加
   */
  const handleAddNode = (type: string, position: { x: number; y: number }) => {
    const timestamp = Date.now();
    let newNode: Node<NodeData> | null = null;

    if (type === 'material') {
      const newId = `material-${timestamp}`;
      newNode = {
        id: newId,
        type: 'materialTemplateNode',
        position,
        data: {
          id: newId,
          name: 'Material',
          placeType: 'material',
          description: '',
          nodeType: 'place'
        },
      };
    } else if (type === 'condition') {
      const newId = `condition-${timestamp}`;
      newNode = {
        id: newId,
        type: 'conditionTemplateNode',
        position,
        data: {
          id: newId,
          name: 'Condition',
          placeType: 'condition',
          description: '',
          nodeType: 'place'
        },
      };
    } else if (type === 'result') {
      const newId = `result-${timestamp}`;
      newNode = {
        id: newId,
        type: 'resultTemplateNode',
        position,
        data: {
          id: newId,
          name: 'Result',
          placeType: 'result',
          description: '',
          nodeType: 'place'
        },
      };
    } else if (type === 'transition') {
      const newId = `transition-${timestamp}`;
      newNode = {
        id: newId,
        type: 'transitionNode',
        position,
        data: {
          id: newId,
          name: 'Transition',
          placeType: '',
          nodeType: 'transition',
          description: '',
        },
      };
    }

    if (newNode) {
      setNodes((nds: Node<NodeData>[]) => {
        const newNodes = [...nds, newNode as Node<NodeData>];
        pushState({ nodes: newNodes, edges });
        return newNodes;
      });
      setSelectedNode(newNode);
      console.log('➕ [nodeHandlers] ノード追加:', type, newNode.data.name);
    }
  };

  /**
   * ノードクリック
   */
  const handleNodeClick = (_event: any, node: Node<NodeData>) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    console.log('🖱️ [nodeHandlers] ノード選択:', node.data.name);
  };

  /**
   * ノードダブルクリック
   */
  const handleNodeDoubleClick = (_event: any, node: Node<NodeData>) => {
    handleOpenPropertyEditor(node);
  };

  /**
   * ノード変更（ReactFlow組み込み）
   */
  const handleNodesChange = (changes: Node<NodeData>[]) => {
    setNodes((nds: Node<NodeData>[]) => {
      const newNodes = nds.map((node: Node<NodeData>) => {
        const change = changes.find((c: Node<NodeData>) => c.id === node.id);
        if (!change) return node;

        if (change.type === 'position' && change.position) {
          return { ...node, position: change.position };
        }
        if (change.type === 'select') {
          return { ...node, selected: change.selected };
        }
        if (change.type === 'remove') {
          return null;
        }
        return node;
      }).filter(Boolean);

      return newNodes;
    });
  };

  /**
   * ノードドラッグ停止（履歴保存）
   */
  const handleNodeDragStop = (_event: any, node: Node<NodeData>) => {
    setNodes((nds: Node<NodeData>[]) => {
      pushState({ nodes: nds, edges });
      return nds;
    });
    console.log('🖐️ [nodeHandlers] ノードドラッグ停止:', node.data.name);
  };

  /**
   * ノード削除
   */
  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds: Node<NodeData>[]) => {
      const newNodes = nds.filter((n: Node<NodeData>) => n.id !== nodeId);
      pushState({ nodes: newNodes, edges });
      return newNodes;
    });

    setEdges((eds: Edge<EdgeData>[]) => {
      const newEdges = eds.filter(
        (e: Edge<EdgeData>) => e.source !== nodeId && e.target !== nodeId
      );
      return newEdges;
    });

    setSelectedNode(null);
    console.log('🗑️ [nodeHandlers] ノード削除:', nodeId);
  };

  /**
   * プロパティエディタを開く
   */
  const handleOpenPropertyEditor = (node: Node<NodeData>) => {
    const placeType = node.data.placeType;
    
    if (placeType === 'material' || placeType === 'condition' || placeType === 'result') {
      setEditingNodeId(node.id);
      setEditingNodeName(node.data.name);
      setEditingTemplateType(placeType);
      setTemplateEditorOpen(true);
      console.log('📝 [nodeHandlers] テンプレートエディタ開く:', placeType, node.data.name);
    } else if (node.data.nodeType === 'transition') {
      console.log('📝 [nodeHandlers] トランジションプロパティ開く:', node.data.name);
      // トランジションのプロパティエディタは別途実装
    }
  };

  return {
    handleAddNode,
    handleNodeClick,
    handleNodeDoubleClick,
    handleNodesChange,
    handleNodeDragStop,
    handleDeleteNode,
    handleOpenPropertyEditor,
  };
};
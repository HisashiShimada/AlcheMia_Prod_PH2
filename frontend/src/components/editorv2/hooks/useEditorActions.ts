/**
 * useEditorActions - エディタアクション管理フック
 * 
 * コピー・ペースト・削除などの編集操作を集約
 * 
 * @version 1.0.0
 * @date 2026-01-30
 */

import { useCallback } from 'react';
import type { Node, Edge } from 'reactflow';

export interface UseEditorActionsProps {
  nodes: Node<any>[];
  edges: Edge<any>[];
  selectedNodes: Node<any>[];
  clipboard: any;
  setNodes: (nodes: any) => void;
  setEdges: (edges: any) => void;
  setClipboard: (clipboard: any) => void;
  setSelectedNode: (node: any) => void;
  setSelectedEdge: (edge: any) => void;
  pushState: (state: any) => void;
}

export interface UseEditorActionsResult {
  handleCopy: () => void;
  handlePaste: () => void;
}

/**
 * エディタアクションフック
 */
export const useEditorActions = ({
  nodes,
  edges,
  selectedNodes,
  clipboard,
  setNodes,
  setEdges,
  setClipboard,
  setSelectedNode,
  setSelectedEdge,
  pushState,
}: UseEditorActionsProps): UseEditorActionsResult => {
  
  // コピーハンドラー（複数選択対応）
  const handleCopy = useCallback(() => {
    if (selectedNodes.length === 0) return;
    
    if (selectedNodes.length === 1) {
      // 単一ノードコピー
      const node = selectedNodes[0];
      setClipboard({
        type: node.type,
        position: node.position,
        data: { ...node.data },
      });
      console.log('📋 [useEditorActions] コピー:', node.data.name);
    } else {
      // 複数ノードコピー
      setClipboard({
        multiple: true,
        nodes: selectedNodes.map(node => ({
          type: node.type,
          position: node.position,
          data: { ...node.data },
        })),
      });
      console.log('📋 [useEditorActions] 複数コピー:', selectedNodes.length, 'ノード');
    }
  }, [selectedNodes, setClipboard]);

  // ペーストハンドラー（複数選択対応）
  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    
    if (clipboard.multiple) {
      // 複数ノードペースト
      const newNodes = clipboard.nodes.map((clipNode: any, index: number) => {
        const timestamp = Date.now() + index;
        const newId = `${clipNode.data.placeType || clipNode.data.nodeType}-${timestamp}`;
        return {
          id: newId,
          type: clipNode.type,
          position: {
            x: clipNode.position.x + 50,
            y: clipNode.position.y + 50,
          },
          data: {
            ...clipNode.data,
            id: newId,
            name: `${clipNode.data.name} (Copy)`,
          },
        };
      });
      
      setNodes((nds: any) => {
        const updatedNodes = [...nds, ...newNodes];
        pushState({ nodes: updatedNodes, edges });
        return updatedNodes;
      });
      
      console.log('📋 [useEditorActions] 複数ペースト:', newNodes.length, 'ノード');
    } else {
      // 単一ノードペースト
      const timestamp = Date.now();
      const newId = `${clipboard.data.placeType || clipboard.data.nodeType}-${timestamp}`;
      
      const newNode = {
        id: newId,
        type: clipboard.type,
        position: {
          x: clipboard.position.x + 50,
          y: clipboard.position.y + 50,
        },
        data: {
          ...clipboard.data,
          id: newId,
          name: `${clipboard.data.name} (Copy)`,
        },
      };
      
      setNodes((nds: any) => {
        const newNodes = [...nds, newNode];
        pushState({ nodes: newNodes, edges });
        return newNodes;
      });
      
      setSelectedNode(newNode);
      
      console.log('📋 [useEditorActions] ペースト:', newNode.data.name);
    }
  }, [clipboard, edges, pushState, setNodes, setSelectedNode]);

  return {
    handleCopy,
    handlePaste,
  };
};
/**
 * canvasHandlers - キャンバス操作ハンドラー集約
 * 
 * キャンバスクリック、ドラッグ、ダイアログ制御などを管理
 * 
 * @version 1.0.0
 * @date 2026-01-30
 */

import type { Node, Edge } from 'reactflow';
import { NodeData,EdgeData } from '../types';

export interface CanvasHandlersProps {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  setSelectedNode: (node: Node<NodeData>) => void;
  setSelectedEdge: (edge: Edge<EdgeData>) => void;
  setSaveDialogOpen: (open: boolean) => void;
  setWorkflowDialogOpen: (open: boolean) => void;
  pushState: (state: any) => void;
}

export interface CanvasHandlersResult {
  handlePaneClick: () => void;
  handleOpenSaveConfirmDialog: () => void;
  handleCloseSaveConfirmDialog: () => void;
  handleOpenWorkflowDialog: () => void;
  handleCloseWorkflowDialog: () => void;
}

/**
 * キャンバス操作ハンドラーを生成
 */
export const createCanvasHandlers = ({
  nodes,
  edges,
  setSelectedNode,
  setSelectedEdge,
  setSaveDialogOpen,
  setWorkflowDialogOpen,
  pushState,
}: CanvasHandlersProps): CanvasHandlersResult => {
  
  /**
   * キャンバスクリック（選択解除）
   */
  const handlePaneClick = () => {
    setSelectedNode(null);
    setSelectedEdge(null);
    console.log('🖱️ [canvasHandlers] キャンバスクリック: 選択解除');
  };

  /**
   * 保存確認ダイアログを開く
   */
  const handleOpenSaveConfirmDialog = () => {
    if (nodes.length === 0) {
      console.warn('⚠️ [canvasHandlers] ノードが存在しないため保存不可');
      return;
    }
    setSaveDialogOpen(true);
    console.log('💾 [canvasHandlers] 保存確認ダイアログ開く');
  };

  /**
   * 保存確認ダイアログを閉じる
   */
  const handleCloseSaveConfirmDialog = () => {
    setSaveDialogOpen(false);
    console.log('💾 [canvasHandlers] 保存確認ダイアログ閉じる');
  };

  /**
   * ワークフロー読み込みダイアログを開く
   */
  const handleOpenWorkflowDialog = () => {
    setWorkflowDialogOpen(true);
    console.log('📂 [canvasHandlers] ワークフロー読み込みダイアログ開く');
  };

  /**
   * ワークフロー読み込みダイアログを閉じる
   */
  const handleCloseWorkflowDialog = () => {
    setWorkflowDialogOpen(false);
    console.log('📂 [canvasHandlers] ワークフロー読み込みダイアログ閉じる');
  };

  return {
    handlePaneClick,
    handleOpenSaveConfirmDialog,
    handleCloseSaveConfirmDialog,
    handleOpenWorkflowDialog,
    handleCloseWorkflowDialog,
  };
};
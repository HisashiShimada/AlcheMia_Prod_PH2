/**
 * nodeUtils - ノード操作ユーティリティ
 * 
 * ノードの生成・検証・変換などの純粋関数
 * 
 * @version 1.0.0
 * @date 2026-01-30
 */

import type { Node } from 'reactflow';
import { NodeData } from '../../../types/editor';
import { getTranslation } from '../../../contexts/LanguageContext';

/**
 * ノードタイプの定義
 */
export type NodeType = 'material' | 'condition' | 'result' | 'transition';

/**
 * ノードタイプの判定
 */
export const getNodeType = (node: Node<NodeData>): NodeType | null => {
  if (node.data.placeType) {
    return node.data.placeType as NodeType;
  }
  if (node.data.nodeType === 'transition') {
    return 'transition';
  }
  return null;
};

/**
 * ノードの検証
 */
export const validateNode = (node: Node<NodeData>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!node.id) {
    errors.push(getTranslation('editor.validation.nodeIdMissing'));
  }
  
  if (!node.data) {
    errors.push(getTranslation('editor.validation.nodeDataMissing'));
  }
  
  if (!node.data.name || node.data.name.trim() === '') {
    errors.push(getTranslation('editor.validation.nodeNameEmpty'));
  }
  
  const nodeType = getNodeType(node);
  if (!nodeType) {
    errors.push(getTranslation('editor.validation.unknownNodeType'));
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};
/**
 * validationUtils - バリデーションユーティリティ
 * 
 * ワークフロー全体の検証を行う純粋関数
 * 
 * @version 1.0.0
 * @date 2026-01-30
 */

import type { Node, Edge } from 'reactflow';
import { validateNode } from './nodeUtils';
import { validateEdge, detectCycle } from './edgeUtils';
import { NodeData,EdgeData } from '../types/editor';
import { getTranslation } from '../contexts/LanguageContext';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * ワークフロー全体の検証
 */
export const validateWorkflow = (
  nodes: Node<NodeData>[],
  edges: Edge<EdgeData>[]
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ノード数チェック
  if (nodes.length === 0) {
    errors.push(getTranslation('editor.validation.noNodes'));
    return { valid: false, errors, warnings };
  }

  // 各ノードの検証
  for (const node of nodes) {
    const result = validateNode(node);
    if (!result.valid) {
      errors.push(`${getTranslation('editor.validation.nodePrefix')} ${node.id}: ${result.errors.join(', ')}`);
    }
  }

  // 各エッジの検証
  for (const edge of edges) {
    const result = validateEdge(edge, nodes);
    if (!result.valid) {
      errors.push(`${getTranslation('editor.validation.edgePrefix')} ${edge.id}: ${result.errors.join(', ')}`);
    }
  }

  // 孤立ノードの検出
  const connectedNodeIds = new Set<string>();
  for (const edge of edges) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }

  const isolatedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));
  if (isolatedNodes.length > 0) {
    warnings.push(
      `${getTranslation('editor.validation.isolatedNodesPrefix')}${isolatedNodes.length}${getTranslation('editor.validation.isolatedNodesSuffix')}: ${isolatedNodes.map(n => n.data.name).join(', ')}`
    );
  }

  // 循環参照の検出
  for (const node of nodes) {
    if (detectCycle(node.id, edges)) {
      warnings.push(`${getTranslation('editor.validation.cycleDetectedPrefix')} ${node.id} ${getTranslation('editor.validation.cycleDetectedSuffix')}`);
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};
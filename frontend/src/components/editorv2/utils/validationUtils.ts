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
import { NodeData,EdgeData } from '../../../types/editor';

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
    errors.push('ノードが1つも存在しません');
    return { valid: false, errors, warnings };
  }

  // 各ノードの検証
  for (const node of nodes) {
    const result = validateNode(node);
    if (!result.valid) {
      errors.push(`ノード ${node.id}: ${result.errors.join(', ')}`);
    }
  }

  // 各エッジの検証
  for (const edge of edges) {
    const result = validateEdge(edge, nodes);
    if (!result.valid) {
      errors.push(`エッジ ${edge.id}: ${result.errors.join(', ')}`);
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
      `孤立ノードが${isolatedNodes.length}個存在します: ${isolatedNodes.map(n => n.data.name).join(', ')}`
    );
  }

  // 循環参照の検出
  for (const node of nodes) {
    if (detectCycle(node.id, edges)) {
      warnings.push(`循環参照が検出されました: ノード ${node.id} から`);
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};
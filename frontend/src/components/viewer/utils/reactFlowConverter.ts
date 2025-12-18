// frontend/src/components/viewer/utils/reactFlowConverter.ts
// React Flow形式への変換ユーティリティ

import { Node, Edge } from 'reactflow';
import { PetriNetStructure, Template } from './maimlParser';

/**
 * ペトリネット構造をReact Flow形式に変換
 */
export function convertToReactFlow(structure: PetriNetStructure): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Placesをノードに変換
  structure.places.forEach((place) => {
    const template = structure.templates[place.id];
    const nodeType = template
      ? `${template.type}Template`
      : 'default';

    const node: Node = {
      id: place.id,
      type: nodeType,
      position: {
        x: place.x !== undefined ? place.x * 2 : Math.random() * 500,
        y: place.y !== undefined ? place.y * 2 : Math.random() * 500,
      },
      data: {
        label: place.name || place.id,
        nodeType: 'place',
        templateType: template?.type,
        description: template?.description,
        properties: template?.properties?.reduce((acc, prop) => {
          acc[prop.key] = prop.defaultValue || '';
          return acc;
        }, {} as Record<string, string>),
        template,
      },
    };

    nodes.push(node);
  });

  // Transitionsをノードに変換
  structure.transitions.forEach((transition) => {
    const node: Node = {
      id: transition.id,
      type: 'transition',
      position: {
        x: transition.x !== undefined ? transition.x * 2 : Math.random() * 500,
        y: transition.y !== undefined ? transition.y * 2 : Math.random() * 500,
      },
      data: {
        label: transition.name || transition.id,
        nodeType: 'transition',
        description: transition.description,
      },
    };

    nodes.push(node);
  });

  // Arcsをエッジに変換
  structure.arcs.forEach((arc) => {
    const edge: Edge = {
      id: arc.id,
      source: arc.source,
      target: arc.target,
      label: arc.name,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#8c8c8c', strokeWidth: 2 },
      data: { name: arc.name },
    };

    edges.push(edge);
  });

  // 自動レイアウト調整（簡易版）
  const adjustedNodes = autoLayout(nodes, edges);

  console.log('🔄 [convertToReactFlow] 変換結果:', {
    nodes: adjustedNodes.length,
    edges: edges.length,
  });

  return { nodes: adjustedNodes, edges };
}

/**
 * 自動レイアウト調整（簡易版）
 * ノードが重ならないように配置を調整
 */
function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  // 位置情報がない場合のみ自動配置
  const hasPositions = nodes.every(
    (node) => node.position.x !== undefined && node.position.y !== undefined
  );

  if (hasPositions) {
    // 既に位置情報がある場合はそのまま返す
    return nodes;
  }

  // 簡易的な階層レイアウト
  const nodeMap = new Map<string, Node>();
  nodes.forEach((node) => nodeMap.set(node.id, node));

  const visited = new Set<string>();
  const levels: string[][] = [];

  // 開始ノード（入力がないノード）を見つける
  const hasIncoming = new Set<string>();
  edges.forEach((edge) => hasIncoming.add(edge.target));

  const startNodes = nodes
    .filter((node) => !hasIncoming.has(node.id))
    .map((node) => node.id);

  // BFSで階層を構築
  let currentLevel = startNodes;
  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    currentLevel.forEach((nodeId) => visited.add(nodeId));

    const nextLevel = new Set<string>();
    currentLevel.forEach((nodeId) => {
      edges
        .filter((edge) => edge.source === nodeId)
        .forEach((edge) => {
          if (!visited.has(edge.target)) {
            nextLevel.add(edge.target);
          }
        });
    });

    currentLevel = Array.from(nextLevel);
  }

  // 残りのノード（孤立ノード）を追加
  const unvisitedNodes = nodes
    .filter((node) => !visited.has(node.id))
    .map((node) => node.id);
  if (unvisitedNodes.length > 0) {
    levels.push(unvisitedNodes);
  }

  // 階層ごとに配置
  const horizontalSpacing = 250;
  const verticalSpacing = 200;

  const adjustedNodes = nodes.map((node) => {
    const levelIndex = levels.findIndex((level) => level.includes(node.id));
    const positionInLevel = levels[levelIndex]?.indexOf(node.id) || 0;
    const levelSize = levels[levelIndex]?.length || 1;

    // 中央揃え
    const offsetX = (levelSize - 1) * horizontalSpacing / 2;

    return {
      ...node,
      position: {
        x: positionInLevel * horizontalSpacing - offsetX + 400,
        y: levelIndex * verticalSpacing + 100,
      },
    };
  });

  return adjustedNodes;
}

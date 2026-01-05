// frontend/src/components/viewer/utils/reactFlowConverter.ts
// React Flow形式への変換ユーティリティ

import { Node, Edge, MarkerType } from 'reactflow';
import { PetriNetStructure, Template } from './maimlParser';

/**
 * ペトリネット構造をReact Flow形式に変換
 * ハイブリッドアプローチ: XML座標がある場合は尊重、ない場合はトポロジカルソート
 */
export function convertToReactFlow(structure: PetriNetStructure): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // 1. 座標の有無をチェック
  const allHavePositions = structure.places.every(
    (place) => place.x !== undefined && place.y !== undefined
  ) && structure.transitions.every(
    (transition) => transition.x !== undefined && transition.y !== undefined
  );

  console.log('🔍 [convertToReactFlow] 座標チェック:', {
    allHavePositions,
    placesWithPosition: structure.places.filter(p => p.x !== undefined).length,
    totalPlaces: structure.places.length,
    transitionsWithPosition: structure.transitions.filter(t => t.x !== undefined).length,
    totalTransitions: structure.transitions.length,
  });

  // 2. 座標計算
  let nodePositions: Map<string, { x: number; y: number }>;

  if (allHavePositions) {
    // すべてに座標がある → XML座標を使用（スケーリングのみ）
    console.log('📍 [convertToReactFlow] XML座標を使用');
    nodePositions = new Map();
    structure.places.forEach(place => {
      nodePositions.set(place.id, { x: place.x! * 2, y: place.y! * 2 });
    });
    structure.transitions.forEach(transition => {
      nodePositions.set(transition.id, { x: transition.x! * 2, y: transition.y! * 2 });
    });
  } else {
    // 座標なし、または一部のみ → トポロジカルソートで自動配置
    console.log('🔄 [convertToReactFlow] トポロジカルソートで自動配置');
    nodePositions = calculateTopologicalLayout(
      structure.places,
      structure.transitions,
      structure.arcs
    );
  }

  // 3. Placesをノードに変換（共通テンプレートフラグ付き）
  structure.places.forEach((place) => {
    const template = structure.templates[place.id];
    const nodeType = template
      ? `${template.type}Template`
      : 'default';

    const position = nodePositions.get(place.id) || { x: 0, y: 0 };

    // 🎯 共通テンプレートフラグの設定
    const placeId = place.id;
    const templateId = template?.id;
    
    // 共通テンプレート参照の場合（このplaceは別のplaceへの参照）
    const isCommonTemplateRef = structure.commonTemplateRefMap?.[placeId];
    const commonTemplateRef = isCommonTemplateRef ? structure.commonTemplateRefMap?.[placeId] : undefined;
    
    // 共通テンプレートの定義元の場合（このplaceは他から参照される）
    const isCommonTemplate = templateId && structure.commonTemplateIds?.has(templateId);

    if (isCommonTemplateRef) {
      console.log('🔗 [convertToReactFlow] 共通テンプレート参照設定:', {
        placeId,
        referencedPlaceId: commonTemplateRef,
        templateId
      });
    }

    if (isCommonTemplate) {
      console.log('✅ [convertToReactFlow] 共通テンプレートフラグ設定:', {
        placeId,
        templateId
      });
    }

    const node: Node = {
      id: place.id,
      type: nodeType,
      position: position,
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
        // 🎯 共通テンプレート情報を追加
        isCommonTemplate: isCommonTemplate || false,
        commonTemplateRef: commonTemplateRef,
      },
    };

    nodes.push(node);
  });

  // 4. Transitionsをノードに変換
  structure.transitions.forEach((transition) => {
    const position = nodePositions.get(transition.id) || { x: 0, y: 0 };

    const node: Node = {
      id: transition.id,
      type: 'transition',
      position: position,
      data: {
        label: transition.name || transition.id,
        nodeType: 'transition',
        description: transition.description,
      },
    };

    nodes.push(node);
  });

  // 5. Arcsをエッジに変換（reference版互換）
  structure.arcs.forEach((arc, index) => {
    const edge: Edge = {
      id: arc.id || `arc-${index}`,
      source: arc.source,
      target: arc.target,
      label: arc.name,  // アーク名がある場合のみ表示
      type: 'default',
      animated: false,
      style: { 
        stroke: '#555', 
        strokeWidth: 2 
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#555'
      },
      data: { name: arc.name },
    };

    edges.push(edge);
  });

  console.log('🔄 [convertToReactFlow] 変換結果:', {
    nodes: nodes.length,
    edges: edges.length,
  });

  return { nodes, edges };
}

/**
 * トポロジカルソートベースのレイアウト計算
 * reference版のcalculateSimpleLayoutを移植
 */
function calculateTopologicalLayout(
  places: PetriNetStructure['places'],
  transitions: PetriNetStructure['transitions'],
  arcs: PetriNetStructure['arcs']
): Map<string, { x: number; y: number }> {
  const nodePositions = new Map<string, { x: number; y: number }>();
  const horizontalSpacing = 250;
  const nodeSpacing = 80;
  const startX = 50;

  console.log('🔍 [calculateTopologicalLayout] レイアウト計算開始:', {
    places: places.length,
    transitions: transitions.length,
    arcs: arcs.length
  });

  // トポロジカルソートでTransitionの階層を決定
  const transitionLevels = new Map<string, number>();
  const inDegree = new Map<string, number>();

  // 初期化
  transitions.forEach(t => {
    inDegree.set(t.id, 0);
    transitionLevels.set(t.id, 0);
  });

  // Transition間の依存関係を計算（Place経由）
  transitions.forEach(t => {
    const inputPlaces = arcs.filter(arc => arc.target === t.id).map(arc => arc.source);
    inputPlaces.forEach(placeId => {
      const sourceTrans = arcs
        .filter(arc => arc.target === placeId && transitions.some(tr => tr.id === arc.source))
        .map(arc => arc.source);

      sourceTrans.forEach(sourceTransId => {
        inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1);
      });
    });
  });

  // BFSでレベル計算
  const queue: string[] = [];
  transitions.forEach(t => {
    if (inDegree.get(t.id) === 0) {
      queue.push(t.id);
      transitionLevels.set(t.id, 0);
    }
  });

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentLevel = transitionLevels.get(currentId)!;

    const outputPlaces = arcs.filter(arc => arc.source === currentId).map(arc => arc.target);
    outputPlaces.forEach(placeId => {
      const nextTrans = arcs
        .filter(arc => arc.source === placeId && transitions.some(t => t.id === arc.target))
        .map(arc => arc.target);

      nextTrans.forEach(nextTransId => {
        const nextLevel = currentLevel + 1;
        if (nextLevel > (transitionLevels.get(nextTransId) || 0)) {
          transitionLevels.set(nextTransId, nextLevel);
        }

        const degree = (inDegree.get(nextTransId) || 1) - 1;
        inDegree.set(nextTransId, degree);

        if (degree === 0 && !queue.includes(nextTransId)) {
          queue.push(nextTransId);
        }
      });
    });
  }

  // レベルごとにグループ化
  const transitionsByLevel = new Map<number, typeof transitions>();
  transitions.forEach(t => {
    const level = transitionLevels.get(t.id) || 0;
    if (!transitionsByLevel.has(level)) {
      transitionsByLevel.set(level, []);
    }
    transitionsByLevel.get(level)!.push(t);
  });

  const maxLevel = Math.max(...Array.from(transitionLevels.values()), 0);

  console.log('📊 [Transitions by Level]:', Array.from(transitionsByLevel.entries()).map(([level, trans]) => ({
    level,
    count: trans.length
  })));

  // レベルごとに処理
  for (let level = 0; level <= maxLevel; level++) {
    const transitionsAtLevel = transitionsByLevel.get(level) || [];
    let currentY = 0;

    transitionsAtLevel.forEach((transition) => {
      // このTransitionの入力Place
      const inputPlaceIds = arcs
        .filter(arc => arc.target === transition.id)
        .map(arc => arc.source);

      const inputPlaces = places.filter(p => inputPlaceIds.includes(p.id));

      // 従属ノード（他のTransitionの出力）のみ配置
      const dependentInputPlaces = inputPlaces.filter(place => {
        return arcs.some(arc =>
          arc.target === place.id &&
          transitions.some(t => t.id === arc.source)
        );
      });

      // 従属ノードを配置
      dependentInputPlaces.forEach((place, i) => {
        if (!nodePositions.has(place.id)) {
          const x = startX + (level * horizontalSpacing);
          const y = currentY + (i * nodeSpacing);
          nodePositions.set(place.id, { x, y });
        }
      });

      // Transitionの位置計算
      const allInputYs = dependentInputPlaces
        .map(p => nodePositions.get(p.id)?.y)
        .filter(y => y !== undefined) as number[];

      const transitionY = allInputYs.length > 0
        ? (Math.min(...allInputYs) + Math.max(...allInputYs)) / 2
        : currentY;

      const transitionX = startX + (level * horizontalSpacing) + (horizontalSpacing * 0.5);
      nodePositions.set(transition.id, { x: transitionX, y: transitionY });

      // 出力Placeを配置
      const outputPlaceIds = arcs
        .filter(arc => arc.source === transition.id)
        .map(arc => arc.target);

      const outputPlaces = places.filter(p => outputPlaceIds.includes(p.id));

      outputPlaces.forEach((place, i) => {
        if (!nodePositions.has(place.id)) {
          const x = startX + ((level + 1) * horizontalSpacing);
          const y = transitionY + (i * nodeSpacing) - ((outputPlaces.length - 1) * nodeSpacing / 2);
          nodePositions.set(place.id, { x, y });
        }
      });

      // 次のTransition用にY座標を更新
      const maxInputY = allInputYs.length > 0 ? Math.max(...allInputYs) : currentY;
      currentY = maxInputY + nodeSpacing * 3;
    });
  }

  // 独立ノード（入力専用Place）を配置
  places.forEach(place => {
    if (nodePositions.has(place.id)) return;

    const isIndependent = !arcs.some(arc =>
      arc.target === place.id &&
      transitions.some(t => t.id === arc.source)
    );

    if (!isIndependent) return;

    // このPlaceが出力するTransitionを探す
    const outputTransitions = arcs
      .filter(arc => arc.source === place.id)
      .map(arc => transitions.find(t => t.id === arc.target))
      .filter(t => t);

    if (outputTransitions.length === 0) return;

    const targetTransition = outputTransitions[0]!;
    const transitionPos = nodePositions.get(targetTransition.id);
    const transitionLevel = transitionLevels.get(targetTransition.id) || 0;

    if (!transitionPos) return;

    const x = startX + (transitionLevel * horizontalSpacing);
    let y = transitionPos.y;

    // 衝突回避
    const minDistance = nodeSpacing * 0.8;
    let attempts = 0;
    while (attempts < 50) {
      let collision = false;

      for (const [, pos] of nodePositions.entries()) {
        if (Math.abs(pos.x - x) < horizontalSpacing * 0.3 &&
            Math.abs(pos.y - y) < minDistance) {
          collision = true;
          break;
        }
      }

      if (!collision) break;
      y += nodeSpacing;
      attempts++;
    }

    nodePositions.set(place.id, { x, y });
  });

  console.log('✅ [calculateTopologicalLayout] レイアウト計算完了:', nodePositions.size);

  return nodePositions;
}

/**
 * reactFlowConverter.ts - React Flow形式変換ユーティリティ
 * ペトリネット構造をReact Flowのノード・エッジ形式に変換
 */

import { MarkerType, Node, Edge } from 'reactflow';
import type {
  NodeData,
  EdgeData,
  Position,
  PetriNetData,
  ReactFlowFormat,
} from '@/types/editor';
// XSD準拠型（maiml-unified.ts）
import type {
  Template,
  Transition,
  Arc,
  Place,
  Method,
} from '@/types/maiml-unified';
import { MaimlParserTyped } from './maimlParserTyped';

/**
 * ペトリネット構造をReact Flow形式に変換
 */
export const convertToReactFlowFormat = (
  parserOrData: MaimlParserTyped | string,
  petriNetData: PetriNetData,
  templateMap: Record<string, Template>
): ReactFlowFormat => {
    
  // MaimlParserTypedインスタンスかmaimlData文字列かを判定
  let parser: MaimlParserTyped;
  
  if (typeof parserOrData === 'string') {
    // 文字列の場合は新しいparserインスタンスを作成
    parser = new MaimlParserTyped(parserOrData);
  } else if (parserOrData instanceof MaimlParserTyped) {
    // MaimlParserTypedインスタンスの場合はそのまま使用
    parser = parserOrData;
  } else {
    throw new Error('Invalid argument type: expected MaimlParserTyped instance or string');
  }
  const { places, transitions, arcs } = petriNetData;
  
  if (!places || !transitions || !arcs) {
    console.warn('[reactFlowConverter] ペトリネットデータが不完全です');
    return { nodes: [], edges: [] };
  }
  
  console.log('🔄 [reactFlowConverter] React Flow形式変換開始:', {
    places: places.length,
    transitions: transitions.length,
    arcs: arcs.length
  });
  
  try {
    // レイアウト計算
    const nodePositions = calculateSimpleLayout(places, transitions, arcs);
    
    console.log('📐 [reactFlowConverter] レイアウト計算完了:', nodePositions.size);
    
    // Placesをノード化（templateMap使用 - 完全反映版）
    const placeNodes: Node<NodeData>[] = places.map(place => {
      // MAIMLの <position> タグが存在する場合はそれを優先、なければ自動レイアウト結果を使用
      const position = place.position ?? nodePositions.get(place.id) ?? { x: 0, y: 0 };
      
      // templateMapからtemplate情報を取得（Place IDをキーとして）
      const template = templateMap[place.id];
      
      if (template) {
        console.log(`📋 [reactFlowConverter] Place ${place.id} にtemplate完全反映:`, {
          templateId: template.id,
          name: template.name,
          uuid: template.uuid,
          placeRefs: template.placeRefs,
          placeRefsLength: template.placeRefs?.length,
          placeRefsDetail: template.placeRefs?.map(pr => ({ id: typeof pr === 'object' ? pr.id : pr, ref: typeof pr === 'object' ? pr.ref : undefined, uuid: typeof pr === 'object' })),
          templateRefs: template.templateRef,
          propertiesType: typeof template.properties,
          hasDescription: !!template.description,
          hasAnnotation: !!template.annotation
        });
      } else {
        console.warn(`⚠️ [reactFlowConverter] Place ${place.id} のtemplate未検出、templateMapKeys:`, Object.keys(templateMap));
      }
      
      // templateRefはオブジェクト全体を格納
      if (template && template.placeRefs) {
        console.log(`🔍 [reactFlowConverter] templateRef作成前 Place ${place.id} template.placeRefs:`, {
          placeRefsType: Array.isArray(template.placeRefs) ? 'array' : typeof template.placeRefs,
          placeRefsLength: template.placeRefs?.length,
          placeRefsDetail: template.placeRefs?.map((pr, i) => ({
            index: i,
            type: typeof pr,
            isObject: typeof pr === 'object' && pr !== null,
            isString: typeof pr === 'string',
            value: pr,
            keys: typeof pr === 'object' && pr !== null ? Object.keys(pr) : null
          }))
        });
      }
      
      const templateRef: Template | undefined = template ? {
        ...template
      } : undefined;
      
      if (templateRef && templateRef.placeRefs) {
        console.log(`🎯 [reactFlowConverter] templateRef作成直後 Place ${place.id} templateRef.placeRefs:`, {
          placeRefsType: Array.isArray(templateRef.placeRefs) ? 'array' : typeof templateRef.placeRefs,
          placeRefsLength: templateRef.placeRefs?.length,
          placeRefsDetail: templateRef.placeRefs?.map((pr, i) => ({
            index: i,
            type: typeof pr,
            isObject: typeof pr === 'object' && pr !== null,
            isString: typeof pr === 'string',
            value: pr,
            keys: typeof pr === 'object' && pr !== null ? Object.keys(pr) : null
          }))
        });
      }
      
      const nodeData: NodeData = {
        // 基本情報
        id: place.id,
        name: place.name || template?.name || '',
        nodeId: place.id,
        nodeType: 'place',
        
        // メタデータの完全反映
        description: place.description || template?.description || '',
        annotation: template?.annotation || place.annotation || '',
        
        // プロパティの完全反映
        properties: template?.properties || [],
        
        // テンプレート参照情報
        templateRef: templateRef,
        
        // template全体を保持（後方互換性のため）
        template: template || undefined,
        templateId: template?.id ||  undefined,
        
        // placeType（テンプレートなしの場合は 'material' にフォールバック）
        placeType: template?.category || 'material',
        
        // 複数PNML要素対応 - pnmlId
        pnmlId: parser.getPnmlIdByPlaceId(place.id) || null
      };
      
      if (nodeData.template && nodeData.template.placeRefs) {
        console.log(`🎨 [reactFlowConverter] nodeData.template.placeRefs (Place ${place.id}):`, {
          placeRefsType: Array.isArray(nodeData.template.placeRefs) ? 'array' : typeof nodeData.template.placeRefs,
          placeRefsLength: nodeData.template.placeRefs?.length,
          placeRefsDetail: nodeData.template.placeRefs?.map((pr, i) => ({
            index: i,
            type: typeof pr,
            isObject: typeof pr === 'object' && pr !== null,
            isString: typeof pr === 'string',
            value: pr,
            keys: typeof pr === 'object' && pr !== null ? Object.keys(pr) : null
          }))
        });
      }
      
      if (nodeData.templateRef && nodeData.templateRef.placeRefs) {
        console.log(`🎨 [reactFlowConverter] nodeData.templateRef.placeRefs (Place ${place.id}):`, {
          placeRefsType: Array.isArray(nodeData.templateRef.placeRefs) ? 'array' : typeof nodeData.templateRef.placeRefs,
          placeRefsLength: nodeData.templateRef.placeRefs?.length,
          placeRefsDetail: nodeData.templateRef.placeRefs?.map((pr, i) => ({
            index: i,
            type: typeof pr,
            isObject: typeof pr === 'object' && pr !== null,
            isString: typeof pr === 'string',
            value: pr,
            keys: typeof pr === 'object' && pr !== null ? Object.keys(pr) : null
          }))
        });
      }
      
      return {
        id: place.id,
        type: getNodeTypeFromCategory(template?.category),
        position: position,
        data: nodeData
      };
    });
    
    // Transitionsをノード化
    const transitionNodes: Node<NodeData>[] = transitions.map(transition => {
      // MAIMLの <position> タグが存在する場合はそれを優先、なければ自動レイアウト結果を使用
      const position = transition.position ?? nodePositions.get(transition.id) ?? { x: 0, y: 0 };
      
      return {
        id: transition.id,
        type: 'transition',
        position: position,
        data: {
          id: transition.id,
          // MAIMLの<name>タグ値のみ（なければ空文字）
          // reactFlowToMaiml.ts が hasName チェックで空文字を弾くため、<name>タグが不正追加されない
          name: transition.name ?? '',
          nodeId: transition.id,
          nodeType: 'transition',
          placeType: 'transition',
          
          // メタデータの完全反映
          description: transition.description || '',
          instructionId: parser.getInstructionIdByTransitionId(transition.id),
          
          // transition全体を保持
          transition: transition || undefined,
          
          // 複数PNML要素対応 - pnmlId
          pnmlId: parser.getPnmlIdByTransitionId(transition.id) || null 
        }
      };
    });
    
    // Arcsをエッジ化
    const edges: Edge<EdgeData>[] = arcs.map((arc, index) => ({
      id: arc.id || `arc-${index}`,
      source: arc.source,
      target: arc.target,
      type: 'default',
      animated: false,
      style: { 
        stroke: '#555', 
        strokeWidth: 2 
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#555'
      }
    }));
    
    const allNodes = [...placeNodes, ...transitionNodes];
    
    console.log('✅ [reactFlowConverter] React Flow形式変換完了:', {
      totalNodes: allNodes.length,
      placeNodes: placeNodes.length,
      transitionNodes: transitionNodes.length,
      edges: edges.length,
      placesWithTemplateRef: placeNodes.filter(n => n.data.templateRef).length
    });
    
    return {
      nodes: allNodes,
      edges: edges
    };
    
  } catch (error) {
    console.error('❌ [reactFlowConverter] React Flow形式変換エラー:', error);
    return { nodes: [], edges: [] };
  }
};

/**
 * カテゴリからノードタイプを判定
 */
const getNodeTypeFromCategory = (category?: string): string => {
  if (!category) {
    console.warn('[reactFlowConverter] stereotypeが空、デフォルトでmaterialTemplateを使用');
    return 'materialTemplate';
  }
  
  if (category === 'material') {
    return 'materialTemplate';
  }
  
  if (category ==='condition') {
    return 'conditionTemplate';
  }
  
  if (category ==='result') {
    return 'resultTemplate';
  }
  
  console.warn(`[reactFlowConverter] 未知のcategory: ${category}、デフォルトでmaterialTemplateを使用`);
  return 'materialTemplate';
};

/**
 * ノードIDからノード情報を取得
 */
export const getNodeById = (nodeId: string, nodes: Node<NodeData>[]): Node<NodeData> | null => {
  if (!nodeId || !nodes) {
    return null;
  }
  
  return nodes.find(node => node.id === nodeId) || null;
};

/**
 * Transitionに接続されているPlaceノードを取得
 */
export const getConnectedPlaces = (
  transitionId: string,
  edges: Edge<EdgeData>[],
  nodes: Node<NodeData>[]
): { inputPlaces: Node<NodeData>[]; outputPlaces: Node<NodeData>[] } => {
  if (!transitionId || !edges || !nodes) {
    return { inputPlaces: [], outputPlaces: [] };
  }
  
  // 入力Place（Place → Transition）
  const inputEdges = edges.filter(edge => edge.target === transitionId);
  const inputPlaces = inputEdges
    .map(edge => getNodeById(edge.source, nodes))
    .filter((node): node is Node<NodeData> => node !== null);
  
  // 出力Place（Transition → Place）
  const outputEdges = edges.filter(edge => edge.source === transitionId);
  const outputPlaces = outputEdges
    .map(edge => getNodeById(edge.target, nodes))
    .filter((node): node is Node<NodeData> => node !== null);
  
  return {
    inputPlaces,
    outputPlaces
  };
};

/**
 * Placeに接続されているTransitionノードを取得
 */
export const getConnectedTransitions = (
  placeId: string,
  edges: Edge<EdgeData>[],
  nodes: Node<NodeData>[]
): { inputTransitions: Node<NodeData>[]; outputTransitions: Node<NodeData>[] } => {
  if (!placeId || !edges || !nodes) {
    return { inputTransitions: [], outputTransitions: [] };
  }
  
  // 入力Transition（Transition → Place）
  const inputEdges = edges.filter(edge => edge.target === placeId);
  const inputTransitions = inputEdges
    .map(edge => getNodeById(edge.source, nodes))
    .filter((node): node is Node<NodeData> => node !== null);
  
  // 出力Transition（Place → Transition）
  const outputEdges = edges.filter(edge => edge.source === placeId);
  const outputTransitions = outputEdges
    .map(edge => getNodeById(edge.target, nodes))
    .filter((node): node is Node<NodeData> => node !== null);
  
  return {
    inputTransitions,
    outputTransitions
  };
};

/**
 * WorkerDashboard準拠のレイアウト計算（トポロジカルソート）
 */
const calculateSimpleLayout = (
  places: Place[],
  transitions: Transition[],
  arcs: { source: string; target: string }[]
): Map<string, Position> => {
  const nodePositions = new Map<string, Position>();
  const horizontalSpacing = 250;
  const nodeSpacing = 80;
  const startX = 50;
  
  console.log('🔍 [calculateSimpleLayout] レイアウト計算開始:', {
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
    const currentId = queue.shift();
    if (!currentId) continue;
    
    const currentLevel = transitionLevels.get(currentId) || 0;
    
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
  const transitionsByLevel = new Map<number, Transition[]>();
  transitions.forEach(t => {
    const level = transitionLevels.get(t.id) || 0;
    if (!transitionsByLevel.has(level)) {
      transitionsByLevel.set(level, []);
    }
    transitionsByLevel.get(level)?.push(t);
  });
  
  const maxLevel = Math.max(...Array.from(transitionLevels.values()), 0);
  
  console.log('📊 [Transitions by Level]:', Array.from(transitionsByLevel.entries()).map(([level, trans]) => ({
    level,
    count: trans.length
  })));
  
  // レベルごとに処理
  Array.from(transitionsByLevel.entries()).forEach(([level, transitionsAtLevel]) => {
    if (level > maxLevel) return;
    
    let currentY = 0;
    
    (transitionsAtLevel || []).forEach((transition) => {
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
        .filter((y): y is number => y !== undefined);
      
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
  });
  
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
      .filter((t): t is Transition => !!t);
    
    if (outputTransitions.length === 0) return;
    
    const targetTransition = outputTransitions[0];
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
      
      Array.from(nodePositions.entries()).forEach(([, pos]) => {
        if (Math.abs(pos.x - x) < horizontalSpacing * 0.3 && 
            Math.abs(pos.y - y) < minDistance) {
          collision = true;
        }
      });
      
      if (!collision) break;
      y += nodeSpacing;
      attempts++;
    }
    
    nodePositions.set(place.id, { x, y });
  });
  
  console.log('✅ [calculateSimpleLayout] レイアウト計算完了:', nodePositions.size);
  
  return nodePositions;
};


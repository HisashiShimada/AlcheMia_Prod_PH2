/**
 * EditorV2 Custom Nodes
 * 
 * PetriNetEditorV2で使用するカスタムノードのエクスポート
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

export { default as EditablePlaceNode } from './EditablePlaceNode';
export type { 
  EditablePlaceNodeData, 
  EditablePlaceNodeProps,
  PlaceType 
} from './EditablePlaceNode';

export { default as EditableTransitionNode } from './EditableTransitionNode';
export type { 
  EditableTransitionNodeData, 
  EditableTransitionNodeProps 
} from './EditableTransitionNode';
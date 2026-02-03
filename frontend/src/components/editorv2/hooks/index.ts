/**
 * EditorV2 Custom Hooks
 * 
 * PetriNetEditorV2で使用するカスタムフックのエクスポート
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

// 履歴管理フック
export { default as useHistory } from './useHistory';
export type {
  EditorState,
  History,
  UseHistoryReturn
} from './useHistory';

// ワークフロー追加フック
export { useWorkflow } from './useWorkflow';
export type {
  NodeType,
  Template,
  Templates,
  WorkflowAddResult,
  UseWorkflowParams,
  UseWorkflowReturn
} from './useWorkflow';

// Draft管理フック
export { default as useDraftManager } from './useDraftManager';
export type {
  Draft,
  EditState,
  DraftSaveData,
  UseDraftManagerOptions,
  UseDraftManagerReturn
} from './useDraftManager';

// 名前空間操作フック
export { default as useNamespaceOperations } from './useNamespaceOperations';
export type {
  S3File,
  S3Folder,
  ParsedElement,
  NamespaceData,
  UseNamespaceOperationsReturn
} from './useNamespaceOperations';
/**
 * useKeyboardShortcuts - キーボードショートカット管理フック
 * 
 * キーボード操作の集約管理
 * 
 * @version 1.0.0
 * @date 2026-01-30
 */

import { useEffect, useState, useCallback } from 'react';
import { Node } from 'reactflow';
import { NodeData, EdgeData } from '../types/editor';
import { ClipboardData } from '../types/editor';

export interface UseKeyboardShortcutsProps {
  // 状態
  nodes: Node<NodeData>[];
  clipboard: ClipboardData | null;
  canUndo: boolean;
  canRedo: boolean;
  selectedNodes: Node<NodeData>[];
  
  // ダイアログ状態
  templateEditorOpen: boolean;
  saveDialogOpen: boolean;
  workflowDialogOpen: boolean;
  
  // ハンドラー
  undo: () => void;
  redo: () => void;
  handleCopy: () => void;
  handlePaste: () => void;
  handleOpenSaveConfirmDialog: () => void;
}

export interface UseKeyboardShortcutsResult {
  pressedKeys: Set<string>;
}

/**
 * キーボードショートカットフック
 */
export const useKeyboardShortcuts = ({
  nodes,
  clipboard,
  canUndo,
  canRedo,
  selectedNodes,
  templateEditorOpen,
  saveDialogOpen,
  workflowDialogOpen,
  undo,
  redo,
  handleCopy,
  handlePaste,
  handleOpenSaveConfirmDialog,
}: UseKeyboardShortcutsProps): UseKeyboardShortcutsResult => {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  // キーボードショートカット処理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Dialogやモーダルが開いている場合はキーボードショートカットを無効化
      if (templateEditorOpen || saveDialogOpen || workflowDialogOpen) {
        return;
      }
      
      // event.keyがundefinedの場合は処理しない
      if (!event.key) {
        return;
      }
      
      // テキストBOX（input/textarea）にフォーカスがある場合、Ctrl+C/Ctrl+Vは無効化しない
      const target = event.target as HTMLElement | null;
      const isTextInput = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );
      
      // Ctrl (Windows/Linux) または Cmd (Mac)
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 's') {
          // Ctrl+S → Save
          event.preventDefault();
          if (nodes.length > 0) {
            handleOpenSaveConfirmDialog();
            console.log('⌨️ [useKeyboardShortcuts] Ctrl+S: Save');
          }
        } else if (event.key === 'z') {
          event.preventDefault();
          if (event.shiftKey) {
            // Ctrl+Shift+Z → Redo
            if (canRedo) {
              redo();
              console.log('⌨️ [useKeyboardShortcuts] Ctrl+Shift+Z: Redo');
            }
          } else {
            // Ctrl+Z → Undo
            if (canUndo) {
              undo();
              console.log('⌨️ [useKeyboardShortcuts] Ctrl+Z: Undo');
            }
          }
        } else if (event.key === 'y') {
          // Ctrl+Y → Redo
          event.preventDefault();
          if (canRedo) {
            redo();
            console.log('⌨️ [useKeyboardShortcuts] Ctrl+Y: Redo');
          }
        } else if (event.key === 'c') {
          // Ctrl+C → Copy
          if (!isTextInput) {
            event.preventDefault();
            if (selectedNodes.length > 0) {
              handleCopy();
              console.log('⌨️ [useKeyboardShortcuts] Ctrl+C: Copy');
            }
          }
        } else if (event.key === 'v') {
          // Ctrl+V → Paste
          if (!isTextInput) {
            event.preventDefault();
            if (clipboard) {
              handlePaste();
              console.log('⌨️ [useKeyboardShortcuts] Ctrl+V: Paste');
            }
          }
        }
      } else if (!event.ctrlKey && !event.metaKey) {
        // ノード追加キー（押されている間有効）
        const key = event.key.toLowerCase();
        if (key === 'm' || key === 'c' || key === 'r' || key === 't') {
          setPressedKeys(prev => new Set(prev).add(key));
          console.log('⌨️ [useKeyboardShortcuts] キー押下:', key);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Dialogやモーダルが開いている場合は処理しない
      if (templateEditorOpen || saveDialogOpen || workflowDialogOpen) {
        return;
      }
      
      if (!event.key) {
        return;
      }
      
      const key = event.key.toLowerCase();
      if (key === 'm' || key === 'c' || key === 'r' || key === 't') {
        setPressedKeys(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
        console.log('⌨️ [useKeyboardShortcuts] キー解放:', key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    selectedNodes, 
    clipboard, 
    nodes,
    templateEditorOpen,
    saveDialogOpen,
    workflowDialogOpen,
    handleCopy,
    handlePaste,
    handleOpenSaveConfirmDialog,
  ]);

  // ウィンドウフォーカス時にキー状態をクリア
  useEffect(() => {
    const handleBlur = () => {
      setPressedKeys(new Set());
      console.log('⌨️ [useKeyboardShortcuts] フォーカス喪失: キー状態クリア');
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  return {
    pressedKeys,
  };
};
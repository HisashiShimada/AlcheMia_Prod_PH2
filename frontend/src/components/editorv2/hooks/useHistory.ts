/**
 * useHistory - 履歴管理カスタムフック
 * 
 * Undo/Redo機能のためのCommandパターン実装
 * Phase 3C: Undo/Redo基本機能
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import { useState, useCallback } from 'react';
import { Node, Edge } from 'reactflow';

/**
 * 最大履歴保持数
 */
const MAX_HISTORY_SIZE = 50;

/**
 * エディタの状態を表す型
 */
export interface EditorState {
  nodes: Node[];
  edges: Edge[];
}

/**
 * 履歴構造を表す型
 */
export interface History {
  past: EditorState[];      // 過去の状態配列
  present: EditorState;     // 現在の状態
  future: EditorState[];    // やり直し可能な状態配列
}

/**
 * useHistoryの返り値型
 */
export interface UseHistoryReturn {
  history: History;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  pushState: (newState: EditorState) => void;
  reset: (newState: EditorState) => void;
}

/**
 * useHistory - 履歴管理フック
 * 
 * Undo/Redo機能を提供するカスタムフック
 * CommandパターンでReact Flowのノードとエッジの状態を管理
 * 
 * @param initialState - 初期状態（nodes, edges）
 * @returns 履歴管理オブジェクト
 * 
 * @example
 * ```typescript
 * const { undo, redo, canUndo, canRedo, pushState } = useHistory({
 *   nodes: [],
 *   edges: []
 * });
 * 
 * // 状態変更時
 * pushState({ nodes: newNodes, edges: newEdges });
 * 
 * // Undo実行
 * if (canUndo) {
 *   undo();
 * }
 * ```
 */
const useHistory = (initialState: EditorState): UseHistoryReturn => {
  const [history, setHistory] = useState<History>({
    past: [],
    present: initialState,
    future: [],
  });

  // Undo可能かどうか
  const canUndo = history.past.length > 0;

  // Redo可能かどうか
  const canRedo = history.future.length > 0;

  /**
   * Undo - 操作を取り消す
   * 
   * 現在の状態をfutureに移動し、pastから最後の状態を取り出してpresentに設定
   */
  const undo = useCallback(() => {
    if (!canUndo) {
      console.log('⚠️ [useHistory] Undo不可: 履歴がありません');
      return;
    }

    setHistory((prevHistory) => {
      const newPast = prevHistory.past.slice(0, -1);
      const newPresent = prevHistory.past[prevHistory.past.length - 1];
      const newFuture = [prevHistory.present, ...prevHistory.future];

      console.log('↶ [useHistory] Undo実行:', {
        pastLength: newPast.length,
        futureLength: newFuture.length,
      });

      return {
        past: newPast,
        present: newPresent,
        future: newFuture,
      };
    });
  }, [canUndo]);

  /**
   * Redo - 操作をやり直す
   * 
   * 現在の状態をpastに追加し、futureから最初の状態を取り出してpresentに設定
   */
  const redo = useCallback(() => {
    if (!canRedo) {
      console.log('⚠️ [useHistory] Redo不可: やり直し履歴がありません');
      return;
    }

    setHistory((prevHistory) => {
      const newPast = [...prevHistory.past, prevHistory.present];
      const newPresent = prevHistory.future[0];
      const newFuture = prevHistory.future.slice(1);

      console.log('↷ [useHistory] Redo実行:', {
        pastLength: newPast.length,
        futureLength: newFuture.length,
      });

      return {
        past: newPast,
        present: newPresent,
        future: newFuture,
      };
    });
  }, [canRedo]);

  /**
   * pushState - 新しい状態を履歴に追加
   * 
   * 新しい操作が実行されたときに呼び出す
   * futureはクリアされ、現在の状態がpastに追加される
   * 
   * @param newState - 新しい状態
   */
  const pushState = useCallback((newState: EditorState) => {
    setHistory((prevHistory) => {
      // 履歴サイズ制限を適用
      const newPast = [...prevHistory.past, prevHistory.present]
        .slice(-MAX_HISTORY_SIZE);

      console.log('📝 [useHistory] 履歴追加:', {
        pastLength: newPast.length,
        nodesCount: newState.nodes?.length ?? 0,
        edgesCount: newState.edges?.length ?? 0,
      });

      return {
        past: newPast,
        present: newState,
        future: [], // 新しい操作で future をクリア
      };
    });
  }, []);

  /**
   * reset - 履歴をリセット
   * 
   * ファイルを新規作成・読み込み時などに使用
   * すべての履歴をクリアして新しい初期状態を設定
   * 
   * @param newState - 新しい初期状態
   */
  const reset = useCallback((newState: EditorState) => {
    console.log('🔄 [useHistory] 履歴リセット');
    setHistory({
      past: [],
      present: newState,
      future: [],
    });
  }, []);

  return {
    history,
    undo,
    redo,
    canUndo,
    canRedo,
    pushState,
    reset,
  };
};

export default useHistory;
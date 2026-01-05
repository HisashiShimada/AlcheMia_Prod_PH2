/**
 * useHistory - 履歴管理カスタムフック
 * 
 * Undo/Redo機能のためのCommandパターン実装
 * Phase 3C: Undo/Redo基本機能
 * 
 * @version 2.0.0-beta (reference版と同じ)
 * @date 2025-12-23
 */

import { useState, useCallback } from 'react';
import { Node, Edge } from 'reactflow';

const MAX_HISTORY_SIZE = 50; // 履歴の最大保持数

/**
 * 履歴状態の型定義
 */
export interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

/**
 * 履歴管理の型定義
 */
interface History {
  past: HistoryState[];
  present: HistoryState;
  future: HistoryState[];
}

/**
 * useHistory戻り値の型定義
 */
interface UseHistoryReturn {
  history: History;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  pushState: (newState: HistoryState) => void;
  reset: (newState: HistoryState) => void;
}

/**
 * useHistory
 * 
 * @param initialState - 初期状態（nodes, edges）
 * @returns 履歴管理オブジェクト
 */
const useHistory = (initialState: HistoryState): UseHistoryReturn => {
  const [history, setHistory] = useState<History>({
    past: [],                // 過去の状態配列
    present: initialState,   // 現在の状態
    future: [],              // やり直し可能な状態配列
  });

  // Undo可能かどうか
  const canUndo = history.past.length > 0;

  // Redo可能かどうか
  const canRedo = history.future.length > 0;

  /**
   * Undo - 操作を取り消す
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
   * @param newState - 新しい状態
   */
  const pushState = useCallback((newState: HistoryState) => {
    setHistory((prevHistory) => {
      // 履歴サイズ制限を適用
      const newPast = [...prevHistory.past, prevHistory.present]
        .slice(-MAX_HISTORY_SIZE);

      console.log('📝 [useHistory] 履歴追加:', {
        pastLength: newPast.length,
        nodesCount: newState.nodes?.length,
        edgesCount: newState.edges?.length,
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
   * @param newState - 新しい初期状態
   */
  const reset = useCallback((newState: HistoryState) => {
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

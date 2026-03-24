/**
 * useLocalStorageAutoSave.ts
 *
 * MaiML編集中のデータをLocalStorageに定期自動保存するカスタムフック。
 * setInterval を使い、指定間隔（デフォルト30秒）ごとに編集状態を保存する。
 *
 * @remarks
 * - 保存間隔は環境変数 NEXT_PUBLIC_MAIML_LOCALSTORAGE_AUTOSAVE_INTERVAL（ミリ秒）から取得
 * - projectId が未設定の場合はスキップ
 * - コンポーネントアンマウント時にタイマーを自動クリア
 */

import { useEffect, useRef, useState } from 'react';
import type { EditState } from '../../../types/editor';
import { saveDraftToLocalStorage } from '../../../services/localStorageDraftService';

// ===== 型定義 =====

export interface UseLocalStorageAutoSaveOptions {
  /** プロジェクトID（PetriNetEditorInner の initialDocumentId） */
  projectId: string;
  /** 現在のエディタ状態 */
  editState: EditState | null;
  /** 自動保存間隔（ミリ秒）。省略時は環境変数 or デフォルト30秒 */
  interval?: number;
}

export interface UseLocalStorageAutoSaveReturn {
  /** 最後にLocalStorageへ保存した日時（未保存の場合は null） */
  localLastSavedAt: Date | null;
}

// ===== デフォルト値 =====

const DEFAULT_AUTOSAVE_INTERVAL_MS = 30_000; // 30秒

/**
 * 環境変数から自動保存間隔（ミリ秒）を取得する
 * 未設定 or 不正値の場合はデフォルト値を返す
 */
function getAutoSaveInterval(overrideMs?: number): number {
  if (overrideMs !== undefined && overrideMs > 0) {
    return overrideMs;
  }

  const envValue = process.env.NEXT_PUBLIC_MAIML_LOCALSTORAGE_AUTOSAVE_INTERVAL;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
    console.warn(
      '⚠️ [useLocalStorageAutoSave] NEXT_PUBLIC_MAIML_LOCALSTORAGE_AUTOSAVE_INTERVAL が不正値のためデフォルト使用:',
      envValue
    );
  }

  return DEFAULT_AUTOSAVE_INTERVAL_MS;
}

// ===== フック本体 =====

/**
 * LocalStorage自動保存フック
 *
 * @example
 * ```tsx
 * const { localLastSavedAt } = useLocalStorageAutoSave({
 *   projectId: initialDocumentId || '',
 *   editState: currentEditState,
 * });
 * ```
 */
export function useLocalStorageAutoSave(
  options: UseLocalStorageAutoSaveOptions
): UseLocalStorageAutoSaveReturn {
  const { projectId, editState, interval } = options;

  const [localLastSavedAt, setLocalLastSavedAt] = useState<Date | null>(null);

  // 最新の editState を ref で保持（setInterval コールバック内で常に最新値を参照するため）
  const editStateRef = useRef<EditState | null>(editState);
  useEffect(() => {
    editStateRef.current = editState;
  }, [editState]);

  // 最新の projectId を ref で保持
  const projectIdRef = useRef<string>(projectId);
  useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);

  useEffect(() => {
    const intervalMs = getAutoSaveInterval(interval);

    console.log(
      `⏱️ [useLocalStorageAutoSave] 自動保存タイマー開始 (間隔: ${intervalMs}ms, projectId: "${projectId}")`
    );

    const timerId = setInterval(() => {
      const currentProjectId = projectIdRef.current;
      const currentEditState = editStateRef.current;

      // projectId 未設定はスキップ
      if (!currentProjectId) {
        console.log('⏭️ [useLocalStorageAutoSave] projectId 未設定のためスキップ');
        return;
      }

      // editState 未設定はスキップ
      if (!currentEditState) {
        console.log('⏭️ [useLocalStorageAutoSave] editState 未設定のためスキップ');
        return;
      }

      // LocalStorageに保存
      saveDraftToLocalStorage(currentProjectId, {
        fileName: currentEditState.fileName,
        nodes: currentEditState.nodes,
        edges: currentEditState.edges,
        templates: currentEditState.templates ?? [],
        documentData: currentEditState.documentData ?? null,
      });

      const now = new Date();
      setLocalLastSavedAt(now);

      console.log('✅ [useLocalStorageAutoSave] 自動保存完了:', {
        projectId: currentProjectId,
        savedAt: now.toISOString(),
        nodesCount: currentEditState.nodes.length,
        edgesCount: currentEditState.edges.length,
      });
    }, intervalMs);

    // アンマウント時にタイマーをクリア
    return () => {
      clearInterval(timerId);
      console.log('🛑 [useLocalStorageAutoSave] 自動保存タイマー停止');
    };
  // interval が変更された場合は再起動する
  // projectId / editState は ref で参照するため deps に含めない
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval]);

  return { localLastSavedAt };
}

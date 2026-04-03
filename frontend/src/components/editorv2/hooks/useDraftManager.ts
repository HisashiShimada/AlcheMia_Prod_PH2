/**
 * useDraftManager - Draft管理カスタムフック（V2版）
 * 
 * PetriNetEditorV2用にReact Flowデータ構造に対応
 * 3世代管理対応の自動保存機能
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Draft,
  EditState,
} from '../../../types/editor';
import * as draftService from '@/services/draftService';

/**
 * useDraftManagerオプションの型定義
 */
export interface UseDraftManagerOptions {
  userId?: string;
  autoSaveInterval?: number;
  autoSaveGenerations?: number;
  onAutoSaveSuccess?: (result: { draft_key: string }) => void;
  onAutoSaveError?: (error: Error) => void;
  /** プロジェクトID（Draft保存時に記録し、復元時のプロジェクト特定に使用） */
  projectId?: string;
}

/**
 * useDraftManagerの返り値型
 */
export interface UseDraftManagerReturn {
  // 状態
  drafts: Draft[];
  isLoading: boolean;
  error: string | null;
  autoSaveEnabled: boolean;
  lastSavedDraft: Draft | null;
  lastAutoSaveTime: Date | null;
  
  // 操作関数
  fetchDrafts: () => Promise<Draft[] | undefined>;
  saveDraft: (draftData: Draft) => Promise<Draft>;
  deleteDraft: (draftKey: string) => Promise<unknown>;
  
  // 自動保存制御
  setAutoSaveEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  startAutoSaveTimer: () => void;
  stopAutoSaveTimer: () => void;
  cleanupOldAutoSaves: () => Promise<void>;
}

/**
 * useDraftManager - Draft管理カスタムフック
 * 
 * @param currentEditState - 現在の編集状態
 * @param options - オプション設定
 * @returns Draft管理機能
 */
const useDraftManager = (
  currentEditState: EditState | null,
  options: UseDraftManagerOptions = {}
): UseDraftManagerReturn => {
  const {
    userId = 'default-user',
    autoSaveInterval = 30 * 1000, // デフォルト30秒
    autoSaveGenerations = 3, // 保持する世代数
    onAutoSaveSuccess,
    onAutoSaveError,
    projectId,
  } = options;

  // 状態管理
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSavedDraft, setLastSavedDraft] = useState<Draft | null>(null);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null);

  // タイマー参照
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const FETCH_COOLDOWN = 2000;

  // ==================== API関数 ====================

  /**
   * Draft一覧取得
   */
  const fetchDrafts = useCallback(async (): Promise<Draft[] | undefined> => {
    const now = Date.now();
    if (now - lastFetchTimeRef.current < FETCH_COOLDOWN) {
      console.log('⏸️ [useDraftManager V2] 取得クールダウン中');
      return;
    }
    lastFetchTimeRef.current = now;

    setIsLoading(true);
    setError(null);
    
    try {
      const data = await draftService.fetchDrafts();
      
      setDrafts(data || []);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ [useDraftManager V2] Draft取得エラー:', err);
      setError(errorMessage);
      setDrafts([]);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Draft保存
   */
  const saveDraft = useCallback(async (draftData: Draft): Promise<Draft> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await draftService.saveDraft(draftData);
      
      setLastSavedDraft(data);
      
      // 保存後にDraft一覧を再取得
      await fetchDrafts();
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ [useDraftManager V2] Draft保存エラー:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchDrafts]);

  /**
   * Draft削除
   */
  const deleteDraft = useCallback(async (draftKey: string): Promise<unknown> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await draftService.deleteDraft(draftKey);
      
      await fetchDrafts();
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ [useDraftManager V2] Draft削除エラー:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchDrafts]);

  /**
   * 古い自動保存を削除（3世代より古いものを削除）
   */
  const cleanupOldAutoSaves = useCallback(async (): Promise<void> => {
    try {
      const currentDrafts = await fetchDrafts();
      
      if (!currentDrafts) {
        return;
      }
      
      // 自動保存のみフィルタ（draft_nameに「自動保存」を含む）
      const autoSaves = currentDrafts
        .filter(d => d.draftName && d.draftName.includes('自動保存'))
        .sort((a, b) => new Date(b.lastSavedAt || new Date()).getTime() - new Date(a.lastSavedAt || new Date()).getTime());
      
      console.log(`🧹 [useDraftManager V2] 自動保存クリーンアップ: 総数${autoSaves.length}, 保持世代${autoSaveGenerations}`);
      
      // 3世代より古いものを削除
      if (autoSaves.length > autoSaveGenerations) {
        const toDelete = autoSaves.slice(autoSaveGenerations);
        console.log(`🗑️ [useDraftManager V2] ${toDelete.length}件の古い自動保存を削除`);
        
        for (const draft of toDelete) {
          await deleteDraft(draft.draftKey);
        }
      }
    } catch (err) {
      console.error('❌ [useDraftManager V2] 自動保存クリーンアップエラー:', err);
    }
  }, [fetchDrafts, deleteDraft, autoSaveGenerations]);

  // ==================== 自動保存ロジック ====================

  /**
   * 自動保存タイマーの開始
   */
  const startAutoSaveTimer = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    if (!autoSaveEnabled) {
      console.log('🔕 [useDraftManager V2] 自動保存無効');
      return;
    }

    if (!currentEditState?.nodes || !currentEditState?.fileName) {
      console.log('⚠️ [useDraftManager V2] 編集状態なし - 自動保存スキップ');
      return;
    }

    console.log('⏰ [useDraftManager V2] 自動保存タイマー開始:', {
      interval: `${autoSaveInterval / 1000}秒`,
      fileName: currentEditState.fileName,
    });

    autoSaveTimerRef.current = setInterval(async () => {
      try {
        console.log('💾 [useDraftManager V2] 自動保存実行');
        
        const draftKey = `draft_auto_${Date.now()}`;
        
        const draftPayload: Draft = {
          draftKey,
          draftName: `自動保存 - ${currentEditState.fileName}`,
          originalFileKey: currentEditState.fileName,
          nodes: currentEditState.nodes || [],
          edges: currentEditState.edges || [],
          templates: currentEditState.templates || [],
          documentData: currentEditState.documentData,
          lastSavedAt: new Date().toISOString(),
          projectId: projectId || null,
        };
        
        await saveDraft(draftPayload);
        
        // 最終保存時刻を更新
        setLastAutoSaveTime(new Date());
        
        // 古い自動保存を削除
        await cleanupOldAutoSaves();
        
        if (onAutoSaveSuccess) {
          onAutoSaveSuccess({ draft_key: draftKey });
        }
      } catch (error) {
        console.error('❌ [useDraftManager V2] 自動保存エラー:', error);
        if (onAutoSaveError && error instanceof Error) {
          onAutoSaveError(error);
        }
      }
    }, autoSaveInterval);
  }, [
    autoSaveEnabled,
    autoSaveInterval,
    currentEditState,
    saveDraft,
    cleanupOldAutoSaves,
    onAutoSaveSuccess,
    onAutoSaveError,
    projectId,
  ]);

  /**
   * 自動保存タイマーの停止
   */
  const stopAutoSaveTimer = useCallback(() => {
    if (autoSaveTimerRef.current) {
      console.log('🛑 [useDraftManager V2] 自動保存タイマー停止');
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  // ==================== エフェクト ====================

  /**
   * 自動保存の開始/停止
   */
  useEffect(() => {
    if (autoSaveEnabled) {
      startAutoSaveTimer();
    } else {
      stopAutoSaveTimer();
    }

    return () => {
      stopAutoSaveTimer();
    };
  }, [autoSaveEnabled, autoSaveInterval, startAutoSaveTimer, stopAutoSaveTimer]);

  /**
   * コンポーネントアンマウント時のクリーンアップ
   */
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, []);

  // ==================== 戻り値 ====================

  return {
    // 状態
    drafts,
    isLoading,
    error,
    autoSaveEnabled,
    lastSavedDraft,
    lastAutoSaveTime,
    
    // 操作関数
    fetchDrafts,
    saveDraft,
    deleteDraft,
    
    // 自動保存制御
    setAutoSaveEnabled,
    startAutoSaveTimer,
    stopAutoSaveTimer,
    cleanupOldAutoSaves,
  };
};

export default useDraftManager;
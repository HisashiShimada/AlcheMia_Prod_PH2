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
import { isAutoSaveDraft } from '@/constants/draftConstants';

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
  resumeAutoSaveTimer: () => void;
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
  // 一時停止フラグ（ダイアログ表示中などに外部からstopAutoSaveTimerで立てる）
  const isPausedRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);
  const FETCH_COOLDOWN = 2000;

  // draftsステートの最新値を常に参照するためのref
  // useCallbackのクロージャでdraftsが古い値になる問題を回避する
  const draftsRef = useRef<Draft[]>([]);

  // draftsが更新されるたびにrefを同期する
  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

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
      
      const draftsData = data || [];
      setDrafts(draftsData);
      // refもここで直接更新することで、useEffectのレンダー遅延を回避する
      // cleanupOldAutoSaves()がfetchDrafts()直後に呼ばれる場合でも最新値を参照できる
      draftsRef.current = draftsData;
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
   * 
   * saveDraft()内でfetchDrafts()が呼ばれているため、このメソッド呼び出し時点で
   * draftsステートは既に最新の状態になっている。
   * fetchDrafts()を再呼び出しするとFETCH_COOLDOWNにより早期リターン（undefined）になるため、
   * draftsステートを直接使用する。
   */
  const cleanupOldAutoSaves = useCallback(async (): Promise<void> => {
    try {
      // draftsRefを使用することで、useCallbackのクロージャ問題を回避し
      // 常に最新のdraftsリストを参照する
      // （setDrafts()はReactの非同期更新のため、draftsステートは古い値になる場合がある）
      const autoSaves = draftsRef.current
        .filter(d => isAutoSaveDraft(d.draftName))
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
  }, [deleteDraft, autoSaveGenerations]);
  // draftsRef はrefなので依存配列に含めない（refの変更はre-renderをトリガーしない）

  // ==================== 自動保存ロジック ====================

  /**
   * 自動保存タイマーの開始
   */
  const startAutoSaveTimer = useCallback(() => {
    // 一時停止中はタイマーを開始しない
    if (isPausedRef.current) {
      console.log('⏸️ [useDraftManager V2] 一時停止中 - タイマー開始スキップ');
      return;
    }

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
   * 自動保存タイマーの停止（一時停止フラグを立てて、再生成された startAutoSaveTimer からも保護）
   */
  const stopAutoSaveTimer = useCallback(() => {
    isPausedRef.current = true;
    if (autoSaveTimerRef.current) {
      console.log('🛑 [useDraftManager V2] 自動保存タイマー停止');
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  /**
   * 自動保存タイマーの再開（一時停止フラグを解除してからタイマーを開始）
   */
  const resumeAutoSaveTimer = useCallback(() => {
    isPausedRef.current = false;
    if (autoSaveEnabled) {
      startAutoSaveTimer();
    }
  }, [autoSaveEnabled, startAutoSaveTimer]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // startAutoSaveTimer/stopAutoSaveTimerを依存配列に含めると、
    // currentEditState（ノード/エッジ編集）が変化するたびに関数が再生成され、
    // このuseEffectが再実行されてタイマーが意図せず再起動する問題を防ぐため除外する
  }, [autoSaveEnabled, autoSaveInterval]);

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
    resumeAutoSaveTimer,
    cleanupOldAutoSaves,
  };
};

export default useDraftManager;
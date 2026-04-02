/**
 * ProjectMaimlContext
 * 
 * プロジェクトのMAIMLデータを管理するContext
 * プロジェクト選択時に自動的にMAIMLファイルを取得・パースし、各タブで参照可能にする
 * 
 * @author Cline
 * @date 2026-02-24
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { MaimlParserTyped } from '@/utils/maimlParserTyped';
import type { MaimlRoot } from '@/types/maiml-unified';
import { getProjectMaiml } from '@/services/projectApiService';
import { message } from 'antd';

/**
 * Context値の型定義
 */
interface ProjectMaimlContextValue {
  /** MAIMLルートデータ（パース済みオブジェクト） */
  maimlRoot: MaimlRoot | null;
  
  /** MAIMLファイルの生の文字列データ */
  maimlContent: string | null;
  
  /** MAIMLパーサーインスタンス */
  parser: MaimlParserTyped | null;
  
  /** ローディング状態 */
  isLoading: boolean;
  
  /** エラー状態 */
  error: Error | null;
  
  /** 現在読み込み中のプロジェクト名 */
  currentProjectName: string | null;
  
  /** MAIMLファイルを読み込む */
  loadMaiml: (projectName: string) => Promise<void>;
  
  /** 現在のプロジェクトのMAIMLをリロード */
  reloadMaiml: () => Promise<void>;
  
  /** MAIMLデータをクリア */
  clearMaiml: () => void;
}

/**
 * Context定義
 */
const ProjectMaimlContext = createContext<ProjectMaimlContextValue | undefined>(undefined);

/**
 * Provider Props
 */
interface ProjectMaimlProviderProps {
  children: React.ReactNode;
}

/**
 * ProjectMaimlProvider
 * 
 * MAIMLデータの取得・パース・管理を行う
 */
export const ProjectMaimlProvider: React.FC<ProjectMaimlProviderProps> = ({ children }) => {
  const [maimlRoot, setMaimlRoot] = useState<MaimlRoot | null>(null);
  const [maimlContent, setMaimlContent] = useState<string | null>(null);
  const [parser, setParser] = useState<MaimlParserTyped | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null);
  
  // 現在実行中のリクエストを追跡（重複リクエスト防止）
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * MAIMLファイルを読み込む
   * 
   * @param projectName - プロジェクト名
   */
  const loadMaiml = useCallback(async (projectName: string) => {
    // 既存のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 新しいAbortControllerを作成
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      console.log('📂 [ProjectMaimlContext] MAIMLファイル読み込み開始:', projectName);
      setIsLoading(true);
      setError(null);

      // API呼び出し
      const response = await getProjectMaiml(projectName);

      // リクエストがキャンセルされた場合は処理を中断
      if (abortController.signal.aborted) {
        console.log('⏸️ [ProjectMaimlContext] リクエストがキャンセルされました');
        return;
      }

      // MAIMLファイルが存在しない場合（プロジェクト作成直後など）
      if (!response.success) {
        if (response.error?.code === 'FILE_NOT_FOUND') {
          console.log('ℹ️ [ProjectMaimlContext] MAIMLファイルが存在しません（プロジェクト作成直後）');
          setMaimlRoot(null);
          setMaimlContent(null);
          setParser(null);
          setCurrentProjectName(projectName);
          setError(null);
          return;
        }
        throw new Error(response.error?.message || 'MAIMLファイルの取得に失敗しました');
      }

      const fetchedMaimlContent = response.data?.maimlContent;

      // MAIMLファイルの中身が空の場合
      if (!fetchedMaimlContent || fetchedMaimlContent.trim() === '') {
        console.log('ℹ️ [ProjectMaimlContext] MAIMLファイルの内容が空です');
        setMaimlRoot(null);
        setMaimlContent(null);
        setParser(null);
        setCurrentProjectName(projectName);
        setError(null);
        return;
      }

      console.log('✅ [ProjectMaimlContext] MAIMLファイル取得成功:', {
        contentLength: fetchedMaimlContent.length,
        projectName,
      });

      // MAIMLをパース（パースエラーは握り潰し、生コンテンツは保持）
      let maimlParser: MaimlParserTyped | null = null;
      let parsedMaiml = null;
      try {
        maimlParser = new MaimlParserTyped(fetchedMaimlContent);
        parsedMaiml = maimlParser.getTypedMaiml();
        console.log('✅ [ProjectMaimlContext] MAIMLパース成功:', {
          hasProtocol: !!parsedMaiml.protocol,
          methodCount: parsedMaiml.protocol?.methods?.length || 0,
        });
      } catch (parseErr) {
        // パースエラーはログのみ。生コンテンツは引き続き利用可能にする
        console.warn('⚠️ [ProjectMaimlContext] MAIMLパースエラー（生コンテンツは保持）:', parseErr);
      }

      // Stateを更新（パース失敗でも maimlContent は保持する）
      setMaimlRoot(parsedMaiml);
      setMaimlContent(fetchedMaimlContent);
      setParser(maimlParser);
      setCurrentProjectName(projectName);
      setError(null);
    } catch (err) {
      // リクエストがキャンセルされた場合はエラーを無視
      if (abortController.signal.aborted) {
        return;
      }

      // ネットワーク・API エラーのみログ出力（パースエラーは上で処理済み）
      console.error('❌ [ProjectMaimlContext] MAIMLファイル読み込み失敗:', err);

      const error = err instanceof Error ? err : new Error('不明なエラーが発生しました');
      setError(error);
      setMaimlRoot(null);
      setMaimlContent(null);
      setParser(null);
      setCurrentProjectName(null);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * 現在のプロジェクトのMAIMLをリロード
   */
  const reloadMaiml = useCallback(async () => {
    if (!currentProjectName) {
      console.warn('⚠️ [ProjectMaimlContext] リロード対象のプロジェクトがありません');
      return;
    }

    console.log('🔄 [ProjectMaimlContext] MAIMLリロード開始:', currentProjectName);
    await loadMaiml(currentProjectName);
  }, [currentProjectName, loadMaiml]);

  /**
   * MAIMLデータをクリア
   */
  const clearMaiml = useCallback(() => {
    console.log('🗑️ [ProjectMaimlContext] MAIMLデータをクリア');
    
    // 実行中のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setMaimlRoot(null);
    setMaimlContent(null);
    setParser(null);
    setError(null);
    setCurrentProjectName(null);
  }, []);

  const value: ProjectMaimlContextValue = {
    maimlRoot,
    maimlContent,
    parser,
    isLoading,
    error,
    currentProjectName,
    loadMaiml,
    reloadMaiml,
    clearMaiml,
  };

  return (
    <ProjectMaimlContext.Provider value={value}>
      {children}
    </ProjectMaimlContext.Provider>
  );
};

/**
 * useProjectMaiml
 * 
 * ProjectMaimlContextを使用するカスタムフック
 * 
 * @returns ProjectMaimlContextValue
 * @throws Providerの外で使用された場合
 */
export const useProjectMaiml = (): ProjectMaimlContextValue => {
  const context = useContext(ProjectMaimlContext);
  
  if (context === undefined) {
    throw new Error('useProjectMaiml must be used within a ProjectMaimlProvider');
  }
  
  return context;
};

export default ProjectMaimlContext;

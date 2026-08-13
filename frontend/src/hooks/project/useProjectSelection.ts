'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { App } from 'antd';
import { useProjectMaiml } from '@/contexts/ProjectMaimlContext';
import { getProjectFiles } from '@/services/projectApiService';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Project, ProjectFilesData } from '@/types/project';

type TabKey = 'file_management' | 'task_registration' | 'project_instruction' | 'experiment_instruction' | 'evaluation_registration';

interface UseProjectSelectionParams {
  projects: Project[];
  refetchProjects: () => Promise<void>;
  setProjectFilesData: React.Dispatch<React.SetStateAction<Record<string, ProjectFilesData>>>;
}

/**
 * プロジェクト選択・タブ切り替え・sessionStorage 保存を管理する hook
 */
export const useProjectSelection = ({
  projects,
  refetchProjects,
  setProjectFilesData,
}: UseProjectSelectionParams) => {
  const { message } = App.useApp();
  const { t } = useLanguage();
  const { loadMaiml } = useProjectMaiml();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('projectManagement_selectedProjectId') ?? null;
    }
    return null;
  });

  const [currentTab, setCurrentTab] = useState<TabKey>('file_management');
  const [isLoadingTabData, setIsLoadingTabData] = useState(false);

  // selectedProject の導出
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  // selectedProjectId を sessionStorage に保存
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedProjectId) {
      sessionStorage.setItem('projectManagement_selectedProjectId', selectedProjectId);
    } else {
      sessionStorage.removeItem('projectManagement_selectedProjectId');
    }
  }, [selectedProjectId]);

  // 初回マウント時に selectedProjectId が復元済みの場合リフレッシュ
  const hasInitialRefreshRef = useRef(false);
  useEffect(() => {
    if (hasInitialRefreshRef.current) return;
    hasInitialRefreshRef.current = true;
    if (selectedProjectId) {
      console.log('🔄 [ProjectManagement] 初期マウント - selectedProjectId 復元検知、リフレッシュ実行:', selectedProjectId);
      handleRefresh();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // プロジェクト選択ハンドラ
  const handleProjectSelect = useCallback(
    async (projectId: string) => {
      setSelectedProjectId(projectId);

      const project = projects.find((p) => p.id === projectId);
      if (!project) return;

      console.log('🎯 [ProjectManagement] プロジェクト選択 - MAIML読み込み開始:', project.id);
      try {
        await loadMaiml(project.id);
        console.log('✅ [ProjectManagement] MAIML読み込み完了');
      } catch (error) {
        console.error('❌ [ProjectManagement] MAIML読み込み失敗:', error);
      }

      try {
        setIsLoadingTabData(true);
        // file_management タブのみここでデータ取得。他タブはコンポーネント側で自動更新
        const fileResponse = await getProjectFiles(project.id, true);
        setProjectFilesData((prev) => ({
          ...prev,
          [projectId]: {
            root: fileResponse.files || [],
            subFolderFiles: fileResponse.subFolderFiles || {},
          },
        }));
      } catch (error) {
        console.error('❌ [ProjectManagement] タブデータ取得失敗:', error);
        message.error(t('project.dataFetchFailed'));
      } finally {
        setIsLoadingTabData(false);
      }
    },
    [projects, loadMaiml, setProjectFilesData] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // タブ切り替えハンドラ
  const handleTabChange = useCallback((key: string) => {
    setCurrentTab(key as TabKey);
  }, []);

  // リフレッシュ（一覧 + MAIML 更新）
  const handleRefresh = useCallback(async () => {
    console.log('Refreshing project list...');
    await refetchProjects();
    if (selectedProjectId) {
      try {
        await loadMaiml(selectedProjectId);
      } catch {
        // Context 側でハンドリング済み
      }
    }
  }, [refetchProjects, selectedProjectId, loadMaiml]);

  return {
    selectedProjectId,
    setSelectedProjectId,
    selectedProject,
    currentTab,
    setCurrentTab,
    isLoadingTabData,
    setIsLoadingTabData,
    handleProjectSelect,
    handleTabChange,
    handleRefresh,
  };
};

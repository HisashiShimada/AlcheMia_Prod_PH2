'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { App, Modal } from 'antd';
import { getProjectFiles } from '@/services/projectApiService';
import { downloadFolderAsZip, deleteFileByKey, deleteFolderByPath } from '@/services/fileAccessService';
import { useLanguage } from '@/contexts/LanguageContext';
import { AxiosError } from 'axios';
import { mapErrorToMessage } from '@/utils/errorUtils';
import type { Project, ProjectFilesData } from '@/types/project';
import type { ProjectFile } from '@/types/file';

interface UseProjectFilesParams {
  selectedProjectId: string | null;
  selectedProject: Project | null;
  refetchProjects: () => Promise<void>;
  reloadMaiml: () => Promise<void>;
  setUploadDialogOpen: (open: boolean) => void;
}

/** プロジェクトのファイル管理 hook */
export const useProjectFiles = ({
  selectedProjectId,
  selectedProject,
  refetchProjects,
  reloadMaiml,
  setUploadDialogOpen,
}: UseProjectFilesParams) => {
  const { message } = App.useApp();
  const { t } = useLanguage();

  const [projectFilesData, setProjectFilesData] = useState<Record<string, ProjectFilesData>>({});
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['folder_active']));
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!selectedProjectId || !selectedProject) return;
    const loadProjectFiles = async () => {
      try {
        const fileResponse = await getProjectFiles(selectedProject.id, true);
        setProjectFilesData((prev) => ({
          ...prev,
          [selectedProjectId]: { root: fileResponse.files || [], subFolderFiles: fileResponse.subFolderFiles || {} },
        }));
      } catch (error) {
        console.error('❌ Failed to fetch project files:', error);
        message.error(t('formatManagement.messages.file_list_load_failed'));
      }
    };
    loadProjectFiles();
  }, [selectedProjectId, selectedProject?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentFiles = useMemo((): ProjectFile[] => {
    if (!selectedProjectId) return [];
    const projectData = projectFilesData[selectedProjectId];
    if (!projectData) return [];
    if (currentFolder === 'root') {
      const subFolderFiles = projectData.subFolderFiles || {};
      return (projectData.root || []).filter((file) => {
        if (!file.isFolder) return true;
        if (file.name === 'archive') return (subFolderFiles['archive']?.length ?? 0) > 0;
        return true;
      });
    }
    const segments = currentFolder.split('/');
    const topFolder = segments[0];
    const allFilesInFolder = (projectData.subFolderFiles || {})[topFolder] || [];
    const projectName = selectedProject?.name || '';
    const subPath = segments.slice(1).join('/');
    const directFiles: ProjectFile[] = [];
    const childFolders = new Set<string>();
    for (const file of allFilesInFolder) {
      const prefix = `projects/${projectName}/${topFolder}/`;
      const relFromTop = file.path.startsWith(prefix) ? file.path.substring(prefix.length) : '';
      const checkPath = subPath ? `${subPath}/` : '';
      if (!relFromTop.startsWith(checkPath)) continue;
      const remainder = relFromTop.substring(checkPath.length);
      const parts = remainder.split('/').filter((s) => s !== '');
      if (parts.length === 1) directFiles.push(file);
      else if (parts.length >= 2) childFolders.add(parts[0]);
    }
    const folderEntries: ProjectFile[] = Array.from(childFolders).map((n) => ({
      id: `folder_${n}`, name: n,
      path: `projects/${projectName}/${currentFolder}/${n}`,
      size: 0, lastModified: '', type: 'folder', isFolder: true,
    }));
    const back: ProjectFile = { id: 'back', name: t('projectManagement.backButton'), path: '', size: 0, lastModified: '', type: 'folder', isFolder: true };
    return [back, ...folderEntries, ...directFiles];
  }, [selectedProjectId, currentFolder, selectedProject, projectFilesData, t]);

  const hasProjectFiles = useMemo(() => {
    if (!selectedProjectId) return false;
    const d = projectFilesData[selectedProjectId];
    if (!d) return false;
    if ((d.root || []).filter((f) => !f.isFolder).length > 0) return true;
    return Object.values(d.subFolderFiles || {}).some((files) => files.length > 0);
  }, [selectedProjectId, projectFilesData]);

  const handleOpenUploadDialog = useCallback(() => setUploadDialogOpen(true), [setUploadDialogOpen]);
  const handleCloseUploadDialog = useCallback(() => setUploadDialogOpen(false), [setUploadDialogOpen]);

  const handleUploadComplete = useCallback(async (result: { mode: string; fileCount: number; success: boolean; hasMaimlFile?: boolean }) => {
    await refetchProjects();
    if (selectedProject) {
      try {
        const fr = await getProjectFiles(selectedProject.id, true);
        setProjectFilesData((prev) => ({ ...prev, [selectedProject.id]: { root: fr.files || [], subFolderFiles: fr.subFolderFiles || {} } }));
      } catch { /* ignore */ }
      if (result.hasMaimlFile) { try { await reloadMaiml(); } catch { /* ignore */ } }
    }
  }, [selectedProject, refetchProjects, reloadMaiml]);

  const handleToggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => { const n = new Set(prev); if (n.has(folderId)) n.delete(folderId); else n.add(folderId); return n; });
  }, []);

  const handleFolderClick = useCallback((folderId: string) => {
    if (folderId === 'back') {
      const parts = currentFolder.split('/');
      setCurrentFolder(parts.length <= 1 ? 'root' : parts.slice(0, -1).join('/'));
    } else {
      const n = folderId.startsWith('folder_') ? folderId.substring('folder_'.length) : folderId;
      setCurrentFolder(currentFolder === 'root' ? n : `${currentFolder}/${n}`);
    }
  }, [currentFolder]);


  const handleDeleteMaimlFile = useCallback(async (file: ProjectFile) => {
    if (!selectedProject) { message.warning(t('project.selectProjectWarning')); return; }
    const isMaimlFile = file.type === 'maiml';
    Modal.confirm({
      title: isMaimlFile ? t('project.maimlFileDeleteConfirmTitle').replace('{name}', file.name) : t('project.fileDeleteConfirmTitle').replace('{name}', file.name),
      content: isMaimlFile ? (<div><p>{t('project.fileDeleteCannotUndo')}</p><p style={{ fontSize: '0.9em', marginTop: '8px' }}>{t('project.maimlFileDeleteNote')}</p></div>) : (<div><p>{t('project.fileDeleteCannotUndo')}</p></div>),
      okText: t('common.delete'), cancelText: t('common.cancel'),
      okButtonProps: { danger: true, 'data-testid': 'maiml-delete-confirm-button', id: 'maiml-delete-confirm-button' } as any,
      cancelButtonProps: { 'data-testid': 'maiml-delete-cancel-button', id: 'maiml-delete-cancel-button' } as any,
      onOk: async () => {
        try {
          if (isMaimlFile) {
            await deleteFileByKey(file.path, true);
            message.success(t('project.maimlDeleteSuccess').replace('{name}', file.name));
            await refetchProjects();
            await reloadMaiml();
          } else {
            await deleteFileByKey(file.path);
            message.success(t('project.fileDeleteSuccess').replace('{name}', file.name));
          }
          const fr = await getProjectFiles(selectedProject.id, true);
          setProjectFilesData((prev) => ({ ...prev, [selectedProject.id]: { root: fr.files || [], subFolderFiles: fr.subFolderFiles || {} } }));
        } catch (error) {
          if (error instanceof AxiosError && error.response?.data?.error?.code) message.error(mapErrorToMessage(error.response.data.error.code));
          else message.error(t('project.fileDeleteFailed'));
        }
      },
    });
  }, [selectedProject, refetchProjects, reloadMaiml, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteFolder = useCallback(async (folder: ProjectFile) => {
    if (!selectedProject) { message.warning(t('project.selectProjectWarning')); return; }
    if (folder.id === 'back') return;
    Modal.confirm({
      title: t('project.folderDeleteConfirmTitle').replace('{name}', folder.name),
      content: <div><p>{t('project.folderDeleteWarning')}</p></div>,
      okText: t('common.delete'), cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteFolderByPath(folder.path);
          message.success(t('project.folderDeleteSuccess').replace('{name}', folder.name));
          const fr = await getProjectFiles(selectedProject.id, true);
          setProjectFilesData((prev) => ({ ...prev, [selectedProject.id]: { root: fr.files || [], subFolderFiles: fr.subFolderFiles || {} } }));
          if (currentFolder !== 'root') setCurrentFolder('root');
        } catch (error) {
          if (error instanceof AxiosError && error.response?.data?.error?.code) message.error(mapErrorToMessage(error.response.data.error.code));
          else message.error(t('project.folderDeleteFailed'));
        }
      },
    });
  }, [selectedProject, currentFolder, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProjectDownload = useCallback(async () => {
    if (!selectedProject) { message.warning(t('project.selectProjectWarning')); return; }
    try {
      setIsDownloading(true);
      await downloadFolderAsZip(`projects/${selectedProject.name}`);
      message.success(t('project.zipDownloadSuccess').replace('{name}', selectedProject.name));
    } catch { message.error(t('project.downloadFailed')); }
    finally { setIsDownloading(false); }
  }, [selectedProject]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    projectFilesData, setProjectFilesData,
    currentFolder, setCurrentFolder,
    expandedFolders, isDownloading,
    currentFiles, hasProjectFiles,
    handleOpenUploadDialog, handleCloseUploadDialog, handleUploadComplete,
    handleToggleFolder, handleFolderClick,
    handleDeleteMaimlFile, handleDeleteFolder, handleProjectDownload,
  };
};

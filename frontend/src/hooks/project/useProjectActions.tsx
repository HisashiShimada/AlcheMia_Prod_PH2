'use client';

import { useMemo, useCallback } from 'react';
import { App } from 'antd';
import {
  checkoutProject, checkinProject,
  sendInstructions,
  createProject as createProjectApi,
  deleteProject as deleteProjectApi,
  getProjectFiles,
} from '@/services/projectApiService';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProjectMaiml } from '@/contexts/ProjectMaimlContext';
import { ProjectStatus, TaskStatus } from '@/constants/codeMaster';
import { AxiosError } from 'axios';
import { mapErrorToMessage } from '@/utils/errorUtils';
import type { Project, Task, ProjectFilesData, CreateProjectRequest } from '@/types/project';
import type { CreateProjectData } from '@/types/project';

interface UseProjectActionsParams {
  selectedProject: Project | null;
  selectedProjectId: string | null;
  currentTab: string;
  refetchProjects: () => Promise<void>;
  setSelectedProjectId: (id: string | null) => void;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setProjectFilesData: React.Dispatch<React.SetStateAction<Record<string, ProjectFilesData>>>;
  setRenameModalOpen: (open: boolean) => void;
  setCreateModalOpen: (open: boolean) => void;
  setIssueManagementModalOpen: (open: boolean) => void;
  projectTasksData: Record<string, { tasks: Task[]; statistics: unknown }>;
}

/** プロジェクト操作アクション hook */
export const useProjectActions = ({
  selectedProject, selectedProjectId, currentTab,
  refetchProjects, setSelectedProjectId, setProjects,
  setProjectFilesData, setRenameModalOpen, setCreateModalOpen,
  setIssueManagementModalOpen, projectTasksData,
}: UseProjectActionsParams) => {
  const { message, modal } = App.useApp();
  const { t } = useLanguage();
  const { reloadMaiml } = useProjectMaiml();

  const isProjectCheckedOut = useMemo(() => selectedProject?.isCheckedOut === true, [selectedProject]);
  const isOrderChangeLocked = useMemo(() => {
    if (!selectedProject) return false;
    return selectedProject.status !== ProjectStatus.PLANNING;
  }, [selectedProject]);

  const taskResults = useMemo((): Task[] => {
    if (!selectedProjectId) return [];
    return projectTasksData[selectedProjectId]?.tasks || [];
  }, [selectedProjectId, projectTasksData]);

  const taskStats = useMemo(() => {
    const stats = { total: taskResults.length, pending: 0, in_progress: 0, forced_terminated: 0, review_waiting: 0, completed: 0 };
    taskResults.forEach((result) => {
      switch (result.workStatus) {
        case TaskStatus.PENDING: stats.pending++; break;
        case TaskStatus.IN_PROGRESS: stats.in_progress++; break;
        case TaskStatus.FORCED_TERMINATED: stats.forced_terminated++; break;
        case TaskStatus.REVIEW_WAITING: stats.review_waiting++; break;
        case TaskStatus.COMPLETED: stats.completed++; break;
      }
    });
    return stats;
  }, [taskResults]);

  const handleToggleCheckout = useCallback(async () => {
    if (!selectedProject) return;
    try {
      if (isProjectCheckedOut) {
        await checkinProject(selectedProject.id);
        await refetchProjects();
        message.success(t('project.checkinSuccess', { name: selectedProject.name }));
      } else {
        await sendInstructions(selectedProject.id, {});
        await checkoutProject(selectedProject.id);
        await refetchProjects();
        message.success(t('project.checkoutSuccess', { name: selectedProject.name }));
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data) {
        const errorData = error.response.data;
        const errorCode = errorData.error?.code || 'UNKNOWN_ERROR';
        const errorMessage = errorData.error?.message || t('project.checkInOutError');
        const errorDetails = errorData.error?.details;
        switch (errorCode) {
          case 'TASK_IN_PROGRESS': message.error(t('project.checkinErrorTaskInProgress')); break;
          case 'CHECKOUT_NO_MAIML_FILE': message.error(t('project.checkoutErrorNoMaiml')); break;
          case 'CHECKOUT_INVALID_STATUS': message.error(t('project.checkoutErrorInvalidStatus', { status: errorDetails?.currentStatusName || t('common.unknown') })); break;
          case 'CHECKOUT_NO_TASKS': message.error(t('project.checkoutErrorNoTasks')); break;
          case 'PROJECT_ALREADY_CHECKED_OUT': message.warning(t('project.checkoutWarningAlreadyCheckedOut', { user: errorDetails?.checkedOutBy || t('common.otherUser') })); break;
          case 'RESOURCE_NOT_FOUND': message.error(t('project.notFound')); break;
          default: message.error(errorMessage);
        }
      } else { message.error(t('project.checkInOutError')); }
    }
  }, [selectedProject, isProjectCheckedOut, refetchProjects]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenIssueManagement = useCallback(() => {
    if (!selectedProject) { message.warning(t('project.selectProjectWarning')); return; }
    setIssueManagementModalOpen(true);
  }, [selectedProject, setIssueManagementModalOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCloseIssueManagement = useCallback(() => setIssueManagementModalOpen(false), [setIssueManagementModalOpen]);

  const handleRenameSuccess = useCallback(async (newName: string) => {
    setRenameModalOpen(false);
    setProjects((prev) => prev.map((p) => p.id === selectedProjectId ? { ...p, name: newName, folderName: newName } : p));
    if (selectedProjectId && currentTab === 'file_management') {
      try {
        const fr = await getProjectFiles(selectedProjectId, true);
        setProjectFilesData((prev) => ({ ...prev, [selectedProjectId]: { root: fr.files || [], subFolderFiles: fr.subFolderFiles || {} } }));
      } catch { /* ignore */ }
    }
    try { await reloadMaiml(); } catch { /* ignore */ }
  }, [selectedProjectId, currentTab, setRenameModalOpen, setProjects, setProjectFilesData, reloadMaiml]);

  const handleCloseCreateModal = useCallback(() => setCreateModalOpen(false), [setCreateModalOpen]);

  const handleCreateProject = useCallback(async (data: CreateProjectData) => {
    try {
      const requestData: CreateProjectRequest = {
        projectName: data.projectName,
        description: data.description || undefined,
        organizationGroupCd: data.organizationGroupCd,
      };
      const createdProject = await createProjectApi(requestData);
      await refetchProjects();
      setSelectedProjectId(createdProject.projectId);
      message.success({ content: t('projectManagement.create.success'), duration: 3 });
      handleCloseCreateModal();
    } catch (error) {
      let errorMessage: string;
      if (error instanceof AxiosError && error.response?.data?.error?.message) errorMessage = error.response.data.error.message;
      else if (error instanceof AxiosError && error.response?.data?.error?.code) errorMessage = mapErrorToMessage(error.response.data.error.code);
      else errorMessage = t('projectManagement.create.error');
      throw new Error(errorMessage);
    }
  }, [t, handleCloseCreateModal, refetchProjects, setSelectedProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProjectDelete = useCallback(async () => {
    if (!selectedProject) { message.warning(t('project.selectProjectWarning')); return; }
    modal.confirm({
      title: t('projectManagement.deleteProjectTitle', { name: selectedProject.name }),
      content: (
        <div>
          <p>{t('projectManagement.deleteProjectContent')}</p>
          <p style={{ color: 'red', fontWeight: 'bold' }}>{t('projectManagement.deleteProjectCannotUndo')}</p>
          <p style={{ fontSize: '0.9em', marginTop: '8px' }}>{t('projectManagement.deleteProjectMaimlNote')}</p>
        </div>
      ),
      okText: t('common.delete'), cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const result = await deleteProjectApi(selectedProject.id);
          message.success(t('projectManagement.deleteSuccess', { name: selectedProject.name, count: String(result.deletedCount) }));
          await refetchProjects();
          setSelectedProjectId(null);
        } catch (error) {
          if (error instanceof AxiosError && error.response?.data?.error?.code) message.error(mapErrorToMessage(error.response.data.error.code));
          else message.error(t('project.deleteFailed'));
        }
      },
    });
  }, [selectedProject, refetchProjects, setSelectedProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isProjectCheckedOut, isOrderChangeLocked,
    taskResults, taskStats,
    handleToggleCheckout,
    handleOpenIssueManagement, handleCloseIssueManagement,
    handleRenameSuccess, handleCloseCreateModal,
    handleCreateProject, handleProjectDelete,
  };
};


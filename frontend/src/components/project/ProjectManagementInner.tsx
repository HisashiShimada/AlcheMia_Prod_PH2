'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { App, Card, Tabs, Tag, Space, Typography, theme, Tooltip, Button } from 'antd';
import {
  DownloadOutlined, UploadOutlined, EditOutlined, DeleteOutlined,
  FileTextOutlined, ExclamationCircleOutlined,
  SafetyCertificateOutlined, WarningOutlined, TeamOutlined,
  // TODO: 暗号化・署名機能は本実装まで無効化 -- LockOutlined,
} from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProjectMaiml } from '@/contexts/ProjectMaimlContext';
import { usePublishStatusPoller } from '@/hooks/usePublishStatusPoller';
import { ProjectStatus } from '@/constants/codeMaster';
import { getProjectFiles, getPublishStatus } from '@/services/projectApiService';

import { useProjectList } from '@/hooks/project/useProjectList';
import { useProjectSelection } from '@/hooks/project/useProjectSelection';
import { useProjectFiles } from '@/hooks/project/useProjectFiles';
import { useProjectActions } from '@/hooks/project/useProjectActions';
import { useProjectMaimlEditor } from '@/hooks/project/useProjectMaimlEditor';
import { useProjectDialogs } from '@/hooks/project/useProjectDialogs';

import ProjectToolbar from './subcomponents/ProjectToolbar';
import ProjectModals from './subcomponents/ProjectModals';
import FileManagementTabContent from './subcomponents/tabs/FileManagementTabContent';
import TaskRegistrationTabContent from './subcomponents/tabs/TaskRegistrationTabContent';
import ProjectInstructionTabContent from './subcomponents/tabs/ProjectInstructionTabContent';
import ExperimentInstructionTabContent from './subcomponents/tabs/ExperimentInstructionTabContent';
import EvaluationRegistrationTabContent from './subcomponents/tabs/EvaluationRegistrationTabContent';
import OverallEvaluationTabContent from './subcomponents/tabs/OverallEvaluationTabContent';
import ProjectFolderTree from './ProjectFolderTree';

import type { User } from '@/types/auth';
import type { Task, ProjectFilesData, PublishStatusResponse } from '@/types/project';
import type { MaimlEditorParams } from '@/types/maimlEditor';
import type { ProjectFile } from '@/types/file';

const { Title, Text } = Typography;

interface ProjectManagementInnerProps {
  onEdit?: (params: MaimlEditorParams) => void;
  onOpenWorkerScreen?: (projectId: string, projectName: string) => void;
  user?: User;
  onNavigateToGroupManagement?: () => void;
}

const ProjectManagementInner: React.FC<ProjectManagementInnerProps> = ({
  onEdit, onOpenWorkerScreen, user, onNavigateToGroupManagement,
}) => {
  const { message } = App.useApp();
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const { maimlContent, reloadMaiml } = useProjectMaiml();

  const dialogs = useProjectDialogs();

  const listState = useProjectList(user);
  const {
    projects, setProjects, visibleGroups, refetchProjects, isUnassignedToGroup,
    searchQuery, setSearchQuery, ownerFilter, setOwnerFilter, groupFilter, setGroupFilter,
    checkoutFilter, setCheckoutFilter, projectStatusFilter, setProjectStatusFilter,
    sortBy, sortOrder, handleSortChange, sortedProjects,
  } = listState;

  const [projectTasksData] = useState<Record<string, { tasks: Task[]; statistics: unknown }>>({});
  const [allTasksCompleted, setAllTasksCompleted] = useState(false);
  const [projectFilesDataState, setProjectFilesDataState] = useState<Record<string, ProjectFilesData>>({});

  const selectionState = useProjectSelection({
    projects,
    refetchProjects,
    setProjectFilesData: setProjectFilesDataState,
  });
  const {
    selectedProjectId, setSelectedProjectId, selectedProject,
    currentTab, handleProjectSelect, handleTabChange, handleRefresh,
  } = selectionState;

  const filesState = useProjectFiles({
    selectedProjectId,
    selectedProject,
    refetchProjects,
    reloadMaiml,
    setUploadDialogOpen: dialogs.setUploadDialogOpen,
  });
  const {
    projectFilesData, setProjectFilesData, currentFolder,
    expandedFolders, isDownloading, currentFiles, hasProjectFiles,
    handleOpenUploadDialog, handleCloseUploadDialog, handleUploadComplete,
    handleToggleFolder, handleFolderClick, handleDeleteMaimlFile, handleDeleteFolder, handleProjectDownload,
  } = filesState;

  const actionsState = useProjectActions({
    selectedProject, selectedProjectId, currentTab,
    refetchProjects, setSelectedProjectId, setProjects,
    setProjectFilesData, setRenameModalOpen: dialogs.setRenameModalOpen,
    setCreateModalOpen: dialogs.setCreateModalOpen,
    setIssueManagementModalOpen: dialogs.setIssueManagementModalOpen,
    projectTasksData,
  });
  const {
    isProjectCheckedOut, taskResults, taskStats,
    handleToggleCheckout,
    handleOpenIssueManagement, handleCloseIssueManagement,
    handleRenameSuccess, handleCloseCreateModal, handleCreateProject, handleProjectDelete,
  } = actionsState;

  const maimlEditorState = useProjectMaimlEditor({
    selectedProject, projects, setSelectedProjectId, onEdit,
  });
  const {
    isValidating, savedValidationRow, maimlHasErrors,
    draftRestoreDialogOpen, setDraftRestoreDialogOpen,
    hasBackendDraft, draftToRestore,
    handleValidate, handleEditButtonClick,
    handleRestoreDraft, handleCreateNewOrExisting, buildEditorParams,
  } = maimlEditorState;

  // 公開ステータス
  const [publishStatus, setPublishStatus] = useState<PublishStatusResponse | null>(null);
  const [publishStatusLoading, setPublishStatusLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isReloadingProject, setIsReloadingProject] = useState(false);

  const isPublished = useMemo(() => {
    if (!publishStatus) return false;
    return publishStatus.job_type === 'publish' && publishStatus.status === 'done' && publishStatus.asset_id !== null;
  }, [publishStatus]);

  useEffect(() => {
    if (!selectedProject) { setPublishStatus(null); return; }
    setPublishStatusLoading(true);
    getPublishStatus(selectedProject.id)
      .then((s) => setPublishStatus(s))
      .catch(() => setPublishStatus(null))
      .finally(() => setPublishStatusLoading(false));
  }, [selectedProject]);

  const handleProjectReload = useCallback(async () => {
    try {
      setIsReloadingProject(true);
      await refetchProjects();
      if (!selectedProject) { message.success(t('projectManagement.listReloadSuccess')); return; }
      await reloadMaiml();
      if (currentTab === 'file_management') {
        const fr = await getProjectFiles(selectedProject.id, true);
        setProjectFilesData((prev) => ({ ...prev, [selectedProject.id]: { root: fr.files || [], subFolderFiles: fr.subFolderFiles || {} } }));
      }
      message.success(t('projectManagement.reloadSuccess'));
    } catch { message.error(t('projectManagement.reloadFailed')); }
    finally { setIsReloadingProject(false); }
  }, [selectedProject, currentTab, refetchProjects, reloadMaiml, setProjectFilesData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePollingComplete = useCallback(async (status: PublishStatusResponse) => {
    setIsPolling(false);
    if (status.status === 'done') {
      if (status.job_type === 'publish') message.success(t('project.publishSuccess').replace('{name}', selectedProject?.name ?? ''));
      else message.success(t('project.unpublishSuccess').replace('{name}', selectedProject?.name ?? ''));
      try { await handleProjectReload(); } catch { /* ignore */ }
      const latest = await getPublishStatus(selectedProject!.id).catch(() => null);
      if (latest) setPublishStatus(latest);
    }
  }, [selectedProject, handleProjectReload]); // eslint-disable-line react-hooks/exhaustive-deps

  const { start: startPoller } = usePublishStatusPoller({
    projectId: selectedProject?.id ?? '',
    onComplete: handlePollingComplete,
    onError: () => { setIsPolling(false); message.error(t('project.statusFetchFailed')); },
  });

  const handlePublish = useCallback(() => { if (!selectedProject) return; dialogs.setPublishDialogOpen(true); }, [selectedProject, dialogs.setPublishDialogOpen]);
  const handleUnpublish = useCallback(() => { if (!selectedProject) return; dialogs.setUnpublishDialogOpen(true); }, [selectedProject, dialogs.setUnpublishDialogOpen]);
  const handlePublishSuccess = useCallback(async (_jobId: string) => { setIsPolling(true); startPoller(); try { await handleProjectReload(); } catch { /* ignore */ } }, [startPoller, handleProjectReload]);
  const handleUnpublishSuccess = useCallback(async (_jobId: string) => { setIsPolling(true); startPoller(); try { await handleProjectReload(); } catch { /* ignore */ } }, [startPoller, handleProjectReload]);

  // ViewRenderer ダイアログ管理
  interface OpenDialog { id: string; contentType: 'file' | 'subnet'; file?: ProjectFile; fileContent?: string | null; subnetData?: any; zIndex: number; position: { x: number; y: number }; }
  const [openDialogs, setOpenDialogs] = useState<OpenDialog[]>([]);
  const [nextZIndex, setNextZIndex] = useState(1000);
  const handleCloseDialog = useCallback((id: string) => setOpenDialogs((prev) => prev.filter((d) => d.id !== id)), []);
  const handleFocusDialog = useCallback((id: string) => { setOpenDialogs((prev) => prev.map((d) => d.id === id ? { ...d, zIndex: nextZIndex } : d)); setNextZIndex((prev) => prev + 1); }, [nextZIndex]);
  const handleViewSubnet = useCallback((subnetData: any) => {
    if (openDialogs.length >= 5) { message.warning(t('project.maxDialogsWarning')); return; }
    const id = `subnet-${subnetData.transitionName}-${Date.now()}`;
    const offset = openDialogs.length * 30;
    setOpenDialogs((prev) => [...prev, { id, contentType: 'subnet', subnetData, zIndex: nextZIndex, position: { x: 150 + offset, y: 150 + offset } }]);
    setNextZIndex((prev) => prev + 1);
  }, [openDialogs, nextZIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // バリデーションアイコン表示ヘルパー
  const parseField = (v: unknown): unknown[] => {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } }
    return [];
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: token.colorBgLayout }}>
      <ProjectToolbar
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        ownerFilter={ownerFilter} setOwnerFilter={setOwnerFilter}
        groupFilter={groupFilter} setGroupFilter={setGroupFilter}
        checkoutFilter={checkoutFilter} setCheckoutFilter={setCheckoutFilter}
        projectStatusFilter={projectStatusFilter} setProjectStatusFilter={setProjectStatusFilter}
        visibleGroups={visibleGroups}
        isReloadingProject={isReloadingProject}
        onCreateProject={() => dialogs.setCreateModalOpen(true)}
        onReload={handleProjectReload}
        onSemanticSearch={() => dialogs.setSemanticSearchModalOpen(true)}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左側: プロジェクト一覧 */}
        <div style={{ width: '20%', minWidth: 280, maxWidth: 380, flexShrink: 0 }}>
          {isUnassignedToGroup ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
              <TeamOutlined style={{ fontSize: 40, color: token.colorTextTertiary }} />
              <Typography.Text type="secondary" style={{ textAlign: 'center' }}>{t('projectManagement.no_group_assigned_title')}</Typography.Text>
              {onNavigateToGroupManagement && (
                <Button type="primary" icon={<TeamOutlined />} onClick={onNavigateToGroupManagement}>{t('projectManagement.go_to_group_management')}</Button>
              )}
            </div>
          ) : (
            <ProjectFolderTree projects={sortedProjects} selectedProjectId={selectedProjectId} onProjectSelect={handleProjectSelect} sortBy={sortBy} sortOrder={sortOrder} onSortChange={handleSortChange} />
          )}
        </div>

        {/* 右側: 詳細ビュー */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedProject ? (
            <>
              {/* プロジェクト情報ヘッダー */}
              <Card variant="borderless" style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, borderRadius: 0 }} styles={{ body: { padding: token.margin } }}>
                <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                  <Space size="small">
                    <Title level={5} style={{ margin: 0, fontWeight: token.fontWeightStrong }}>{selectedProject.name}</Title>
                    {selectedProject.status !== undefined && (
                      <Tag color={selectedProject.status === ProjectStatus.PLANNING ? 'default' : selectedProject.status === ProjectStatus.TASK_PENDING ? 'blue' : selectedProject.status === ProjectStatus.TASK_IN_PROGRESS ? 'cyan' : selectedProject.status === ProjectStatus.REVIEW_WAITING ? 'purple' : selectedProject.status === ProjectStatus.COMPLETED ? 'success' : selectedProject.status === ProjectStatus.ERROR ? 'error' : 'default'}>
                        {selectedProject.status === ProjectStatus.PLANNING ? t('projectManagement.status_planning') : selectedProject.status === ProjectStatus.TASK_PENDING ? t('projectManagement.status_pending') : selectedProject.status === ProjectStatus.TASK_IN_PROGRESS ? t('projectManagement.status_in_progress') : selectedProject.status === ProjectStatus.REVIEW_WAITING ? t('projectManagement.status_review_waiting') : selectedProject.status === ProjectStatus.COMPLETED ? t('projectManagement.status_completed') : selectedProject.status === ProjectStatus.ERROR ? t('projectManagement.status_error') : String(selectedProject.status)}
                      </Tag>
                    )}
                    {selectedProject.isCheckedOut && <Tag color="orange" data-testid="checkout-status-tag">{t('projectManagement.checking_out')}</Tag>}
                    {savedValidationRow && (() => {
                      let errCount = 0; let warnCount = 0;
                      try { errCount = parseField(savedValidationRow.errors).length; } catch {}
                      try { warnCount = parseField(savedValidationRow.warnings).length; } catch {}
                      if (errCount > 0) return <Tooltip title={t('project.validationErrorTooltip').replace('{count}', String(errCount))}><WarningOutlined style={{ color: token.colorError, fontSize: 18 }} /></Tooltip>;
                      if (warnCount > 0) return <Tooltip title={t('project.validationWarningTooltip').replace('{count}', String(warnCount))}><WarningOutlined style={{ color: token.colorWarning, fontSize: 18 }} /></Tooltip>;
                      return null;
                    })()}
                  </Space>
                  {selectedProject.description && <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{selectedProject.description}</Text>}
                </Space>
              </Card>


              {/* アクションボタン */}
              <Card variant="borderless" style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, borderRadius: 0 }} styles={{ body: { padding: token.margin } }}>
                <Space size="small" wrap>
                  <Button type="primary" icon={<DownloadOutlined />} onClick={handleProjectDownload} loading={isDownloading} disabled={!selectedProject || isDownloading || !hasProjectFiles} data-testid="project-download-button">{isDownloading ? t('projectManagement.project_downloading') : t('projectManagement.project_download')}</Button>
                  <Button type="primary" icon={<UploadOutlined />} style={{ backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }} onClick={handleOpenUploadDialog} disabled={!selectedProject || isProjectCheckedOut || selectedProject.status === 4 || selectedProject.status === 5 || selectedProject.isEditable === false}>{t('projectManagement.upload')}</Button>
                  <Button type="primary" icon={<EditOutlined />} onClick={handleEditButtonClick} disabled={!selectedProject || isProjectCheckedOut || selectedProject.status === 4 || selectedProject.status === 5 || selectedProject.isEditable === false}>{t('projectManagement.edit')}</Button>
                  <Button danger icon={<DeleteOutlined />} onClick={handleProjectDelete} disabled={!selectedProject || isProjectCheckedOut || selectedProject.status === 4 || selectedProject.status === 5 || selectedProject.isEditable === false}>{t('projectManagement.deleteButton')}</Button>
                  <Button type="primary" icon={<FileTextOutlined />} onClick={handleToggleCheckout} disabled={selectedProject?.status === ProjectStatus.COMPLETED || selectedProject?.status === ProjectStatus.ERROR || selectedProject?.isEditable === false} style={isProjectCheckedOut ? { backgroundColor: token.colorWarning, borderColor: token.colorWarning } : { backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }} data-testid="checkout-checkin-button">{isProjectCheckedOut ? t('projectManagement.checkin') : t('projectManagement.checkout_action')}</Button>
                  <Button type="primary" icon={<ExclamationCircleOutlined />} onClick={handleOpenIssueManagement} style={{ backgroundColor: token.colorWarning, borderColor: token.colorWarning }}>{t('projectManagement.issueCheck')}</Button>
                  {isPublished ? (<Button type="primary" data-testid="maiml-toolbar-unpublish-button" style={{ backgroundColor: token.colorError, borderColor: token.colorError }} onClick={handleUnpublish} loading={publishStatusLoading || isPolling} disabled={!selectedProject || publishStatusLoading || isPolling || selectedProject?.isEditable === false}>{isPolling ? t('projectManagement.processing') : t('projectManagement.unpublish')}</Button>) : (<Button type="primary" data-testid="maiml-toolbar-publish-button" style={{ backgroundColor: token.colorInfo, borderColor: token.colorInfo }} onClick={handlePublish} loading={publishStatusLoading || isPolling} disabled={!selectedProject || !(selectedProject?.status === ProjectStatus.REVIEW_WAITING || selectedProject?.status === ProjectStatus.COMPLETED) || publishStatusLoading || isPolling || selectedProject?.isEditable === false}>{isPolling ? t('projectManagement.processing') : t('projectManagement.publish')}</Button>)}
                  <Tooltip title={!allTasksCompleted ? t('projectManagement.completionDisabledTooltip') : selectedProject?.isEditable === false ? t('projectManagement.editDisabledTitle') : undefined}>
                    <Button type="primary" disabled={!allTasksCompleted || selectedProject?.isEditable === false} style={allTasksCompleted && selectedProject?.isEditable !== false ? { backgroundColor: '#52c41a', borderColor: '#52c41a' } : undefined} onClick={() => dialogs.setCompletionDialogOpen(true)}>{t('projectManagement.completionButton')}</Button>
                  </Tooltip>
                  <Button icon={<EditOutlined />} onClick={() => dialogs.setRenameModalOpen(true)} disabled={!selectedProject || isProjectCheckedOut || selectedProject?.status === 4 || selectedProject?.status === 5 || selectedProject?.isEditable === false}>{t('projectManagement.renameProject')}</Button>
                  <Button icon={<SafetyCertificateOutlined />} onClick={() => dialogs.setValidationDialogOpen(true)} disabled={!selectedProject}>{t('projectManagement.validationConfirmButton')}</Button>
                  {/* TODO: 暗号化・署名機能は本実装まで無効化 */}
                  {/* <Button icon={<LockOutlined />} onClick={() => dialogs.setEncryptionModalOpen(true)} disabled={!selectedProject || isProjectCheckedOut || selectedProject?.status === 4 || selectedProject?.status === 5 || selectedProject?.isEditable === false}>{t('projectManagement.encryptionButton')}</Button> */}
                  {/* <Button icon={<SafetyCertificateOutlined />} onClick={() => dialogs.setSignatureModalOpen(true)} disabled={!selectedProject || isProjectCheckedOut || selectedProject?.status === 4 || selectedProject?.status === 5 || selectedProject?.isEditable === false}>{t('projectManagement.signatureButton')}</Button> */}
                </Space>
              </Card>


              {/* タブ */}
              <Tabs
                activeKey={currentTab}
                onChange={handleTabChange}
                items={[
                  { key: 'file_management', label: t('projectManagement.tabs.file_management'), children: <FileManagementTabContent selectedProject={selectedProject} currentFolder={currentFolder} expandedFolders={expandedFolders} currentFiles={currentFiles} projectFilesData={projectFilesData} onFolderClick={handleFolderClick} onToggleFolder={handleToggleFolder} onDeleteFile={handleDeleteMaimlFile} onDeleteFolder={handleDeleteFolder} /> },
                  { key: 'task_registration', label: t('projectManagement.tabs.task_registration'), children: <TaskRegistrationTabContent selectedProject={selectedProject} isActive={currentTab === 'task_registration'} isProjectCheckedOut={isProjectCheckedOut} maimlHasErrors={maimlHasErrors} /> },
                  { key: 'project_instruction', label: t('projectManagement.tabProjectInstruction'), children: <ProjectInstructionTabContent selectedProject={selectedProject} isActive={currentTab === 'project_instruction'} isProjectCheckedOut={isProjectCheckedOut} /> },
                  { key: 'task_results', label: t('projectManagement.tabs.task_results'), children: <ExperimentInstructionTabContent selectedProject={selectedProject} isProjectCheckedOut={isProjectCheckedOut} /> },
                  { key: 'evaluation_registration', label: t('projectManagement.tabEvaluationRegistration'), children: <EvaluationRegistrationTabContent selectedProject={selectedProject} isProjectCheckedOut={isProjectCheckedOut} /> },
                  { key: 'overall_evaluation', label: t('projectManagement.tabOverallEvaluation'), children: <OverallEvaluationTabContent selectedProject={selectedProject} isProjectCheckedOut={isProjectCheckedOut} /> },
                ]}
                tabBarStyle={{ marginLeft: 8 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}
              />
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <Title level={5} type="secondary">{t('projectManagement.select_project')}</Title>
                <Typography.Text type="secondary">{t('projectManagement.select_project_description')}</Typography.Text>
              </div>
            </div>
          )}
        </div>
      </div>

      <ProjectModals
        selectedProject={selectedProject}
        uploadDialogOpen={dialogs.uploadDialogOpen}
        onCloseUploadDialog={handleCloseUploadDialog}
        onUploadComplete={handleUploadComplete}
        createModalOpen={dialogs.createModalOpen}
        onCancelCreate={handleCloseCreateModal}
        onSubmitCreate={handleCreateProject}
        openDialogs={openDialogs}
        onCloseDialog={handleCloseDialog}
        onFocusDialog={handleFocusDialog}
        onOpenSubNetViewer={handleViewSubnet}
        hasBackendDraft={hasBackendDraft}
        draftRestoreDialogOpen={draftRestoreDialogOpen}
        draftToRestore={draftToRestore}
        onCloseDraftRestore={() => setDraftRestoreDialogOpen(false)}
        onRestoreDraft={handleRestoreDraft}
        onCreateNew={handleCreateNewOrExisting}
        onRestoreBackendDraft={() => {
          setDraftRestoreDialogOpen(false);
          const target = selectedProject ?? (draftToRestore?.projectId ? projects.find((p) => p.id === draftToRestore.projectId) ?? null : null);
          if (target) onEdit?.(buildEditorParams(target, true));
        }}
        issueManagementModalOpen={dialogs.issueManagementModalOpen}
        onCloseIssueManagement={handleCloseIssueManagement}
        publishDialogOpen={dialogs.publishDialogOpen}
        unpublishDialogOpen={dialogs.unpublishDialogOpen}
        onClosePublishDialog={() => dialogs.setPublishDialogOpen(false)}
        onCloseUnpublishDialog={() => dialogs.setUnpublishDialogOpen(false)}
        onPublishSuccess={handlePublishSuccess}
        onUnpublishSuccess={handleUnpublishSuccess}
        renameModalOpen={dialogs.renameModalOpen}
        onCancelRename={() => dialogs.setRenameModalOpen(false)}
        onRenameSuccess={handleRenameSuccess}
        validationDialogOpen={dialogs.validationDialogOpen}
        onCloseValidationDialog={() => dialogs.setValidationDialogOpen(false)}
        savedValidationRow={savedValidationRow}
        isValidating={isValidating}
        maimlContent={maimlContent}
        onValidate={handleValidate}
        semanticSearchModalOpen={dialogs.semanticSearchModalOpen}
        onCloseSemanticSearch={() => dialogs.setSemanticSearchModalOpen(false)}
        onOpenProject={(projectName) => { const target = projects.find((p) => p.name === projectName); if (target) handleProjectSelect(target.id); }}
        completionDialogOpen={dialogs.completionDialogOpen}
        onCloseCompletionDialog={() => dialogs.setCompletionDialogOpen(false)}
        // TODO: 暗号化・署名機能は本実装まで無効化
        // encryptionModalOpen={dialogs.encryptionModalOpen}
        // onCloseEncryptionModal={() => dialogs.setEncryptionModalOpen(false)}
        // signatureModalOpen={dialogs.signatureModalOpen}
        // onCloseSignatureModal={() => dialogs.setSignatureModalOpen(false)}
      />
    </div>
  );
};

export default ProjectManagementInner;


'use client';

import React from 'react';
import BulkUploadDialog from '../BulkUploadDialog';
import CreateProjectModal from '../CreateProjectModal';
import RenameProjectModal from '../RenameProjectModal';
import MaimlPublishDialog from '../MaimlPublishDialog';
import MaimlUnpublishDialog from '../MaimlUnpublishDialog';
import MaimlValidationModal from '../MaimlValidationModal';
import ProjectCompletionDialog from '../ProjectCompletionDialog';
import ViewRendererDialog from '@/components/viewer/ViewRendererDialog';
import DraftRestoreDialog from '@/components/viewer/DraftRestoreDialog';
import IssueManagementModal from '@/components/ExperimentWorker/IssueManagementModal';
import TransitionSetSearchModal from '@/components/TransitionSetSearch/TransitionSetSearchModal';
// TODO: 暗号化・署名機能は本実装まで無効化 -- import EncryptionManagementModal from '@/components/encryption/EncryptionManagementModal';
// TODO: 暗号化・署名機能は本実装まで無効化 -- import SignatureManagementModal from '@/components/signature/SignatureManagementModal';
import { ProjectStatus } from '@/constants/codeMaster';
import type { Project } from '@/types/project';
import type { MaimlAnalysisResultRow } from '@/types/maimlEditor';
import type { Draft } from '@/types/editor';
import type { ProjectFile } from '@/types/file';

interface OpenDialog {
  id: string;
  contentType: 'file' | 'subnet';
  file?: ProjectFile;
  fileContent?: string | null;
  subnetData?: any;
  zIndex: number;
  position: { x: number; y: number };
}

export interface ProjectModalsProps {
  selectedProject: Project | null;
  uploadDialogOpen: boolean;
  onCloseUploadDialog: () => void;
  onUploadComplete: (result: any) => void;
  createModalOpen: boolean;
  onCancelCreate: () => void;
  onSubmitCreate: (data: any) => Promise<void>;
  openDialogs: OpenDialog[];
  onCloseDialog: (id: string) => void;
  onFocusDialog: (id: string) => void;
  onOpenSubNetViewer: (subnetData: any) => void;
  hasBackendDraft: boolean;
  draftRestoreDialogOpen: boolean;
  draftToRestore: Draft | null;
  onCloseDraftRestore: () => void;
  onRestoreDraft: () => void;
  onCreateNew: () => void;
  onRestoreBackendDraft: () => void;
  issueManagementModalOpen: boolean;
  onCloseIssueManagement: () => void;
  publishDialogOpen: boolean;
  unpublishDialogOpen: boolean;
  onClosePublishDialog: () => void;
  onCloseUnpublishDialog: () => void;
  onPublishSuccess: (jobId: string) => void;
  onUnpublishSuccess: (jobId: string) => void;
  renameModalOpen: boolean;
  onCancelRename: () => void;
  onRenameSuccess: (newName: string) => void;
  validationDialogOpen: boolean;
  onCloseValidationDialog: () => void;
  savedValidationRow: MaimlAnalysisResultRow | null;
  isValidating: boolean;
  maimlContent: string | null;
  onValidate: () => void;
  semanticSearchModalOpen: boolean;
  onCloseSemanticSearch: () => void;
  onOpenProject: (projectName: string) => void;
  completionDialogOpen: boolean;
  onCloseCompletionDialog: () => void;
  completionCriteriaList?: any[];
  onCompletionComplete?: () => Promise<void>;
  // TODO: 暗号化・署名機能は本実装まで無効化
  // encryptionModalOpen: boolean;
  // onCloseEncryptionModal: () => void;
  // signatureModalOpen: boolean;
  // onCloseSignatureModal: () => void;
}

const ProjectModals: React.FC<ProjectModalsProps> = (p) => (
  <>
    <BulkUploadDialog open={p.uploadDialogOpen} onClose={p.onCloseUploadDialog} onUploadComplete={p.onUploadComplete} projectId={p.selectedProject?.id || ''} preselectedFolder={p.selectedProject?.folderName || ''} />
    <CreateProjectModal open={p.createModalOpen} onCancel={p.onCancelCreate} onSubmit={p.onSubmitCreate} />
    {p.openDialogs.map((d) => (
      <ViewRendererDialog key={d.id} id={d.id} contentType={d.contentType} file={d.file} fileContent={d.fileContent} subnetData={d.subnetData} zIndex={d.zIndex} initialPosition={d.position} onClose={p.onCloseDialog} onFocus={p.onFocusDialog} onOpenSubNetViewer={p.onOpenSubNetViewer} />
    ))}
    {p.hasBackendDraft && (
      <DraftRestoreDialog open={p.draftRestoreDialogOpen} onClose={p.onCloseDraftRestore} onRestoreDraft={p.onRestoreDraft} onCreateNew={p.onCreateNew} hasBackendDraft={p.hasBackendDraft} onRestoreBackendDraft={p.onRestoreBackendDraft} />
    )}
    {p.issueManagementModalOpen && p.selectedProject && (
      <IssueManagementModal open={p.issueManagementModalOpen} targetName={p.selectedProject.name} projectId={p.selectedProject.id} projectName={p.selectedProject.name} onClose={p.onCloseIssueManagement} viewMode={p.selectedProject.status === ProjectStatus.COMPLETED} />
    )}
    {p.selectedProject && <MaimlPublishDialog open={p.publishDialogOpen} projectName={p.selectedProject.name} projectId={p.selectedProject.id} onClose={p.onClosePublishDialog} onSuccess={p.onPublishSuccess} />}
    {p.selectedProject && <MaimlUnpublishDialog open={p.unpublishDialogOpen} projectName={p.selectedProject.name} projectId={p.selectedProject.id} onClose={p.onCloseUnpublishDialog} onSuccess={p.onUnpublishSuccess} />}
    {p.selectedProject && <RenameProjectModal open={p.renameModalOpen} projectId={p.selectedProject.id} currentProjectName={p.selectedProject.name} onCancel={p.onCancelRename} onSuccess={p.onRenameSuccess} />}
    <MaimlValidationModal open={p.validationDialogOpen} onClose={p.onCloseValidationDialog} savedValidationRow={p.savedValidationRow} isValidating={p.isValidating} hasMaimlContent={!!p.maimlContent} onValidate={p.onValidate} />
    <TransitionSetSearchModal open={p.semanticSearchModalOpen} onClose={p.onCloseSemanticSearch} initialProjectName={p.selectedProject?.name} onOpenProject={p.onOpenProject} />
    {p.completionDialogOpen && p.selectedProject && (
      <ProjectCompletionDialog open={p.completionDialogOpen} projectId={p.selectedProject.id} projectName={p.selectedProject.name} criteriaList={p.completionCriteriaList ?? []} onCancel={p.onCloseCompletionDialog} onComplete={p.onCompletionComplete ?? (async () => {})} />
    )}
    {/* TODO: 暗号化・署名機能は本実装まで無効化 */}
    {/* {p.selectedProject && <EncryptionManagementModal open={p.encryptionModalOpen} projectName={p.selectedProject.name} onClose={p.onCloseEncryptionModal} />} */}
    {/* {p.selectedProject && <SignatureManagementModal open={p.signatureModalOpen} projectName={p.selectedProject.name} onClose={p.onCloseSignatureModal} />} */}
  </>
);

export default ProjectModals;

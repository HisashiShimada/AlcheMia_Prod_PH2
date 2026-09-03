'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { App } from 'antd';
import { useProjectMaiml } from '@/contexts/ProjectMaimlContext';
import { validateMaiml, getAnalysisResult } from '@/services/maimlApiService';
import { fetchDrafts, deleteDraft } from '@/services/draftService';
import { getUserInfo } from '@/utils/sessionStorageHelper';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Project } from '@/types/project';
import type { MaimlEditorParams, MaimlAnalysisResultRow } from '@/types/maimlEditor';
import type { Draft } from '@/types/editor';

interface UseProjectMaimlEditorParams {
  selectedProject: Project | null;
  projects: Project[];
  setSelectedProjectId: (id: string | null) => void;
  onEdit?: (params: MaimlEditorParams) => void;
}

/** MAIMLエディタ・バリデーション・Draft復元を管理する hook */
export const useProjectMaimlEditor = ({
  selectedProject, projects, setSelectedProjectId, onEdit,
}: UseProjectMaimlEditorParams) => {
  const { message } = App.useApp();
  const { t } = useLanguage();
  const { loadMaiml, maimlContent } = useProjectMaiml();

  const [isValidating, setIsValidating] = useState(false);
  const [savedValidationRow, setSavedValidationRow] = useState<MaimlAnalysisResultRow | null>(null);
  const [draftRestoreDialogOpen, setDraftRestoreDialogOpen] = useState(false);
  const [hasBackendDraft, setHasBackendDraft] = useState(false);
  const [draftToRestore, setDraftToRestore] = useState<Draft | null>(null);

  const resolvedMaimlFileKey = useMemo((): string | null => {
    if (!selectedProject) return null;
    if (selectedProject.maimlFileKey) return selectedProject.maimlFileKey;
    const orgId = getUserInfo()?.organizationId ?? '';
    if (!orgId) return null;
    return `${orgId}/projects/${selectedProject.name}/${selectedProject.name}.maiml`;
  }, [selectedProject]);

  useEffect(() => {
    if (!resolvedMaimlFileKey) { setSavedValidationRow(null); return; }
    getAnalysisResult(resolvedMaimlFileKey)
      .then((res) => setSavedValidationRow(res.data ?? null))
      .catch(() => setSavedValidationRow(null));
  }, [resolvedMaimlFileKey]);

  const handleValidate = useCallback(async () => {
    if (!resolvedMaimlFileKey || !maimlContent) return;
    setIsValidating(true);
    try {
      const b64 = btoa(unescape(encodeURIComponent(maimlContent)));
      await validateMaiml(b64, { fileKey: resolvedMaimlFileKey, skipAnalysisSave: false });
      const res = await getAnalysisResult(resolvedMaimlFileKey);
      setSavedValidationRow(res.data ?? null);
    } catch { message.error(t('project.validationFailed')); }
    finally { setIsValidating(false); }
  }, [resolvedMaimlFileKey, maimlContent]); // eslint-disable-line react-hooks/exhaustive-deps

  const maimlHasErrors = useMemo(() => {
    if (!savedValidationRow) return false;
    const v = savedValidationRow.errors;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') {
      try { const p = JSON.parse(v); return Array.isArray(p) && p.length > 0; } catch { return false; }
    }
    return false;
  }, [savedValidationRow]);

  const buildEditorParams = useCallback(
    (project: Project, openDraftManagerOnStart?: boolean): MaimlEditorParams => {
      const orgId = getUserInfo()?.organizationId ?? '';
      const sourceS3Key = project.maimlFileKey ?? `${orgId}/projects/${project.name}/${project.name}.maiml`;
      return {
        editMode: 'project',
        editingFileName: `${project.name}.maiml`,
        originalFileName: project.name,
        sourceS3Key,
        displayTitle: project.name,
        displaySubtitle: project.description || undefined,
        documentId: project.id,
        description: project.description || undefined,
        organizationGroupCd: project.organizationGroup || undefined,
        ...(openDraftManagerOnStart ? { openDraftManagerOnStart: true } : {}),
      };
    },
    []
  );


  const handleEditButtonClick = useCallback(() => {
    if (!selectedProject) { message.warning(t('project.selectProjectWarning')); return; }
    onEdit?.(buildEditorParams(selectedProject));
  }, [selectedProject, onEdit, buildEditorParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRestoreDraft = useCallback(() => {
    setDraftRestoreDialogOpen(false);
    const target = selectedProject ?? (draftToRestore?.projectId ? projects.find((p) => p.id === draftToRestore.projectId) ?? null : null);
    if (target) onEdit?.(buildEditorParams(target));
    else console.warn('⚠️ handleRestoreDraft: プロジェクトを特定できませんでした');
  }, [selectedProject, draftToRestore, projects, onEdit, buildEditorParams]);

  const handleCreateNewOrExisting = useCallback(async () => {
    setDraftRestoreDialogOpen(false);
    if (draftToRestore?.projectId) {
      try {
        const all = await fetchDrafts();
        for (const d of (all || []).filter((d) => d.projectId === draftToRestore.projectId)) {
          await deleteDraft(d.draftKey);
        }
      } catch { /* ignore */ }
    }
    setDraftToRestore(null);
    setHasBackendDraft(false);
    setSelectedProjectId(null);
  }, [draftToRestore, setSelectedProjectId]);

  // 初回マウント時の Draft 確認
  useEffect(() => {
    const savedId = typeof window !== 'undefined' ? sessionStorage.getItem('projectManagement_selectedProjectId') : null;
    if (savedId) return;
    fetchDrafts().then((drafts) => {
      if (Array.isArray(drafts) && drafts.length > 0) {
        setDraftToRestore(drafts[0]);
        setHasBackendDraft(true);
        setDraftRestoreDialogOpen(true);
      }
    }).catch(() => { /* ignore */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // draftToRestore と projects が揃ったら selectedProjectId を設定
  useEffect(() => {
    if (!draftToRestore?.projectId || projects.length === 0) return;
    const savedId = typeof window !== 'undefined' ? sessionStorage.getItem('projectManagement_selectedProjectId') : null;
    if (savedId) return;
    const target = projects.find((p) => p.id === draftToRestore.projectId);
    if (target) {
      setSelectedProjectId(target.id);
      loadMaiml(target.id).catch(() => { /* ignore */ });
    }
  }, [draftToRestore, projects]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isValidating, savedValidationRow, setSavedValidationRow, maimlHasErrors,
    draftRestoreDialogOpen, setDraftRestoreDialogOpen,
    hasBackendDraft, draftToRestore,
    handleValidate, handleEditButtonClick,
    handleRestoreDraft, handleCreateNewOrExisting, buildEditorParams,
  };
};

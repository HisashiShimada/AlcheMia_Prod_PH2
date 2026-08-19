'use client';

import React from 'react';
import { ProjectMaimlProvider } from '@/contexts/ProjectMaimlContext';
import ProjectManagementInner from './ProjectManagementInner';
import type { MaimlEditorParams } from '@/types/maimlEditor';
import type { User } from '@/types/auth';

interface ProjectManagementProps {
  onEdit?: (params: MaimlEditorParams) => void;
  /** 作業者画面を開くコールバック（プロジェクトID・プロジェクト名を渡す） */
  onOpenWorkerScreen?: (projectId: string, projectName: string) => void;
  /** ログイン中ユーザー情報（チーム未所属判定に使用） */
  user?: User;
  /** チーム管理タブへ遷移するコールバック */
  onNavigateToTeamManagement?: () => void;
}

const ProjectManagement: React.FC<ProjectManagementProps> = (props) => {
  return (
    <ProjectMaimlProvider>
      <ProjectManagementInner {...props} />
    </ProjectMaimlProvider>
  );
};

export default ProjectManagement;

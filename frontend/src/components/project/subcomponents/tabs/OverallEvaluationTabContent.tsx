'use client';

import React from 'react';
import OverallEvaluationTab from '../../OverallEvaluationTab';
import { ProjectStatus } from '@/constants/codeMaster';
import type { Project } from '@/types/project';

interface OverallEvaluationTabContentProps {
  selectedProject: Project;
  isProjectCheckedOut: boolean;
  maimlHasErrors: boolean;
}

const OverallEvaluationTabContent: React.FC<OverallEvaluationTabContentProps> = ({
  selectedProject,
  isProjectCheckedOut,
  maimlHasErrors,
}) => {
  const isProjectCompleted =
    selectedProject.status === ProjectStatus.COMPLETED ||
    selectedProject.status === ProjectStatus.ERROR;
  return (
    <div style={{ height: '100%', padding: '8px 16px', overflowY: 'auto' }}>
      <OverallEvaluationTab
        projectId={selectedProject.id}
        projectName={selectedProject.name}
        isEditable={selectedProject.isEditable !== false}
        isProjectCompleted={isProjectCompleted}
        isCheckoutLocked={isProjectCheckedOut}
        maimlHasErrors={maimlHasErrors}
      />
    </div>
  );
};

export default OverallEvaluationTabContent;

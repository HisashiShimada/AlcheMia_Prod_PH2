'use client';

import React from 'react';
import EvaluationRegistrationTab from '../../EvaluationRegistrationTab';
import { ProjectStatus } from '@/constants/codeMaster';
import type { Project } from '@/types/project';

interface EvaluationRegistrationTabContentProps {
  selectedProject: Project;
  isProjectCheckedOut: boolean;
  maimlHasErrors: boolean;
}

const EvaluationRegistrationTabContent: React.FC<EvaluationRegistrationTabContentProps> = ({
  selectedProject,
  isProjectCheckedOut,
  maimlHasErrors,
}) => {
  const isProjectCompleted =
    selectedProject.status === ProjectStatus.COMPLETED ||
    selectedProject.status === ProjectStatus.ERROR;
  const isProjectPlanning = selectedProject.status === ProjectStatus.PLANNING;
  return (
    <div style={{ height: '100%', padding: '8px 16px', overflowY: 'auto' }}>
      <EvaluationRegistrationTab
        projectId={selectedProject.id}
        isEditable={selectedProject.isEditable !== false}
        isProjectCompleted={isProjectCompleted}
        isProjectPlanning={isProjectPlanning}
        isCheckoutLocked={isProjectCheckedOut}
        maimlHasErrors={maimlHasErrors}
      />
    </div>
  );
};

export default EvaluationRegistrationTabContent;

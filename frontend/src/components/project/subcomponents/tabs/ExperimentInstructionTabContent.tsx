'use client';

import React from 'react';
import ExperimentInstructionTab from '../../ExperimentInstructionTab';
import { ProjectStatus } from '@/constants/codeMaster';
import type { Project } from '@/types/project';

interface ExperimentInstructionTabContentProps {
  selectedProject: Project;
  isProjectCheckedOut: boolean;
  maimlHasErrors: boolean;
  onAfterCheckout?: () => Promise<void>;
}

const ExperimentInstructionTabContent: React.FC<ExperimentInstructionTabContentProps> = ({
  selectedProject,
  isProjectCheckedOut,
  maimlHasErrors,
  onAfterCheckout,
}) => {
  const isProjectCompleted =
    selectedProject.status === ProjectStatus.COMPLETED ||
    selectedProject.status === ProjectStatus.ERROR;
  return (
    <div style={{ height: '100%', padding: '4px 16px' }}>
      <ExperimentInstructionTab
        projectId={selectedProject.id}
        projectName={selectedProject.name}
        isEditable={selectedProject.isEditable !== false}
        isProjectCompleted={isProjectCompleted}
        isCheckoutLocked={isProjectCheckedOut}
        maimlHasErrors={maimlHasErrors}
        organizationGroupCd={selectedProject.organizationGroup}
        onAfterCheckout={onAfterCheckout}
      />
    </div>
  );
};

export default ExperimentInstructionTabContent;

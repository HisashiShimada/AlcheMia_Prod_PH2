'use client';

import React from 'react';
import ExperimentInstructionTab from '../../ExperimentInstructionTab';
import type { Project } from '@/types/project';

interface ExperimentInstructionTabContentProps {
  selectedProject: Project;
  isProjectCheckedOut: boolean;
}

const ExperimentInstructionTabContent: React.FC<ExperimentInstructionTabContentProps> = ({
  selectedProject,
  isProjectCheckedOut,
}) => {
  const isProjectCompleted = selectedProject.status === 4 || selectedProject.status === 5;
  return (
    <div style={{ height: '100%', padding: '4px 0' }}>
      <ExperimentInstructionTab
        projectId={selectedProject.id}
        projectName={selectedProject.name}
        isEditable={selectedProject.isEditable !== false}
        isProjectCompleted={isProjectCompleted}
        isCheckoutLocked={isProjectCheckedOut}
      />
    </div>
  );
};

export default ExperimentInstructionTabContent;

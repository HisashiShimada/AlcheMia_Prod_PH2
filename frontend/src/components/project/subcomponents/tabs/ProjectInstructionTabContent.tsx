'use client';

import React from 'react';
import InstructionRegistrationTab from '../../InstructionRegistrationTab';
import type { Project } from '@/types/project';
import type { InstructionData } from '@/types/instructionRegistration';

interface ProjectInstructionTabContentProps {
  selectedProject: Project;
  isActive: boolean;
  isProjectCheckedOut: boolean;
  onInstructionsSubmit: (instructions: InstructionData[]) => void;
}

const ProjectInstructionTabContent: React.FC<ProjectInstructionTabContentProps> = ({
  selectedProject,
  isActive,
  isProjectCheckedOut,
  onInstructionsSubmit,
}) => {
  const isProjectCompleted = selectedProject.status === 4 || selectedProject.status === 5;
  return (
    <InstructionRegistrationTab
      projectId={selectedProject.id}
      projectName={selectedProject.name}
      isActive={isActive}
      isCheckoutLocked={isProjectCheckedOut}
      isEditable={selectedProject.isEditable !== false}
      isProjectCompleted={isProjectCompleted}
      onInstructionsSubmit={onInstructionsSubmit}
    />
  );
};

export default ProjectInstructionTabContent;

'use client';

import React from 'react';
import InstructionRegistrationTab from '../../InstructionRegistrationTab';
import { ProjectStatus } from '@/constants/codeMaster';
import type { Project } from '@/types/project';

interface ProjectInstructionTabContentProps {
  selectedProject: Project;
  isActive: boolean;
  isProjectCheckedOut: boolean;
  maimlHasErrors: boolean;
}

const ProjectInstructionTabContent: React.FC<ProjectInstructionTabContentProps> = ({
  selectedProject,
  isActive,
  isProjectCheckedOut,
  maimlHasErrors,
}) => {
  const isProjectCompleted =
    selectedProject.status === ProjectStatus.COMPLETED ||
    selectedProject.status === ProjectStatus.ERROR;
  return (
    <InstructionRegistrationTab
      projectId={selectedProject.id}
      projectName={selectedProject.name}
      isActive={isActive}
      isCheckoutLocked={isProjectCheckedOut}
      isEditable={selectedProject.isEditable !== false}
      isProjectCompleted={isProjectCompleted}
      maimlHasErrors={maimlHasErrors}
    />
  );
};

export default ProjectInstructionTabContent;

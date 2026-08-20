'use client';

import React from 'react';
import InstructionRegistrationTab from '../../InstructionRegistrationTab';
import type { Project } from '@/types/project';

interface ProjectInstructionTabContentProps {
  selectedProject: Project;
  isActive: boolean;
  isProjectCheckedOut: boolean;
}

const ProjectInstructionTabContent: React.FC<ProjectInstructionTabContentProps> = ({
  selectedProject,
  isActive,
  isProjectCheckedOut,
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
    />
  );
};

export default ProjectInstructionTabContent;

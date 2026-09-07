'use client';

import React from 'react';
import TaskRegistrationTab from '../../TaskRegistrationTab';
import { ProjectStatus } from '@/constants/codeMaster';
import type { Project } from '@/types/project';

interface TaskRegistrationTabContentProps {
  selectedProject: Project;
  isActive: boolean;
  isProjectCheckedOut: boolean;
  maimlHasErrors: boolean;
}

const TaskRegistrationTabContent: React.FC<TaskRegistrationTabContentProps> = ({
  selectedProject,
  isActive,
  isProjectCheckedOut,
  maimlHasErrors,
}) => {
  const isProjectCompleted =
    selectedProject.status === ProjectStatus.COMPLETED ||
    selectedProject.status === ProjectStatus.ERROR;
  return (
    <TaskRegistrationTab
      projectId={selectedProject.id}
      projectName={selectedProject.name}
      isActive={isActive}
      isCheckoutLocked={isProjectCheckedOut}
      maimlHasErrors={maimlHasErrors}
      isProjectCompleted={isProjectCompleted}
      isEditable={selectedProject.isEditable !== false}
      organizationGroupCd={selectedProject.organizationGroup}
    />
  );
};

export default TaskRegistrationTabContent;

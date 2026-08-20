'use client';

import React from 'react';
import EvaluationRegistrationTab from '../../EvaluationRegistrationTab';
import type { Project } from '@/types/project';

interface EvaluationRegistrationTabContentProps {
  selectedProject: Project;
  isProjectCheckedOut: boolean;
}

const EvaluationRegistrationTabContent: React.FC<EvaluationRegistrationTabContentProps> = ({
  selectedProject,
  isProjectCheckedOut,
}) => {
  const isProjectCompleted = selectedProject.status === 4 || selectedProject.status === 5;
  return (
    <div style={{ height: '100%', padding: '8px 0', overflowY: 'auto' }}>
      <EvaluationRegistrationTab
        projectId={selectedProject.id}
        isEditable={selectedProject.isEditable !== false}
        isProjectCompleted={isProjectCompleted}
        isCheckoutLocked={isProjectCheckedOut}
      />
    </div>
  );
};

export default EvaluationRegistrationTabContent;

'use client';

import React from 'react';
import FileListTable from '../../FileListTable';
import type { Project, ProjectFilesData } from '@/types/project';
import type { ProjectFile } from '@/types/file';

interface FileManagementTabContentProps {
  selectedProject: Project;
  currentFolder: string;
  expandedFolders: Set<string>;
  currentFiles: ProjectFile[];
  projectFilesData: Record<string, ProjectFilesData>;
  onFolderClick: (folderId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onDeleteFile: (file: ProjectFile) => void;
  onDeleteFolder: (folder: ProjectFile) => void;
}

const FileManagementTabContent: React.FC<FileManagementTabContentProps> = ({
  selectedProject, currentFolder, currentFiles,
  onFolderClick, onDeleteFile, onDeleteFolder,
}) => (
  <div style={{ height: '100%', overflow: 'hidden' }}>
    <FileListTable
      files={currentFiles}
      currentFolder={currentFolder}
      isEditable={selectedProject.isEditable !== false}
      isProjectCompleted={selectedProject.status === 4 || selectedProject.status === 5}
      isCheckoutLocked={selectedProject.isCheckedOut}
      onDeleteFile={onDeleteFile}
      onDeleteFolder={onDeleteFolder}
      onFolderClick={onFolderClick}
    />
  </div>
);

export default FileManagementTabContent;

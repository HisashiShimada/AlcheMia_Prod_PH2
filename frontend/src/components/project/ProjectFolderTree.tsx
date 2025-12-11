'use client';

import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem as MuiMenuItem,
} from '@mui/material';
import { Folder, FolderOpen, ChevronRight, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  folderName: string;
  fileCount: number;
  status: string;
}

interface ProjectFolderTreeProps {
  projects: Project[];
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (folderId: string) => void;
  sortBy: 'name' | 'status' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: 'name' | 'status' | 'createdAt') => void;
}

/**
 * プロジェクトフォルダツリーコンポーネント
 * 左側のサイドバーに表示されるフォルダ階層
 */
const ProjectFolderTree: React.FC<ProjectFolderTreeProps> = ({
  projects,
  selectedProjectId,
  onProjectSelect,
  expandedFolders,
  onToggleFolder,
  sortBy,
  sortOrder,
  onSortChange,
}) => {
  const getStatusChipColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      planning: 'default',
      pending: 'info',
      in_progress: 'primary',
      completed: 'success',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      planning: 'プロジェクト計画中',
      pending: 'タスク実行待ち',
      in_progress: 'タスク実行中',
      completed: 'プロジェクト完了',
    };
    return labels[status] || status;
  };

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSortSelect = (newSortBy: 'name' | 'status' | 'createdAt') => {
    onSortChange(newSortBy);
    handleClose();
  };

  const getSortIcon = () => {
    if (sortOrder === 'asc') {
      return <ArrowUp size={14} />;
    } else {
      return <ArrowDown size={14} />;
    }
  };

  const getSortLabel = (sort: 'name' | 'status' | 'createdAt'): string => {
    const labels = {
      name: 'プロジェクト名',
      status: 'ステータス',
      createdAt: '作成日',
    };
    return labels[sort];
  };

  return (
    <Box
      sx={{
        height: '100%',
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        overflowY: 'auto',
      }}
    >
      {/* ヘッダー */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              プロジェクト一覧
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {projects.length} プロジェクト
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleClick}
            sx={{ ml: 1 }}
          >
            <ArrowUpDown size={16} />
          </IconButton>
        </Box>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
        >
          <MuiMenuItem onClick={() => handleSortSelect('name')}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Typography variant="body2">プロジェクト名</Typography>
              {sortBy === 'name' && getSortIcon()}
            </Box>
          </MuiMenuItem>
          <MuiMenuItem onClick={() => handleSortSelect('status')}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Typography variant="body2">ステータス</Typography>
              {sortBy === 'status' && getSortIcon()}
            </Box>
          </MuiMenuItem>
          <MuiMenuItem onClick={() => handleSortSelect('createdAt')}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Typography variant="body2">作成日</Typography>
              {sortBy === 'createdAt' && getSortIcon()}
            </Box>
          </MuiMenuItem>
        </Menu>
      </Box>

      {/* プロジェクト一覧 */}
      <List sx={{ py: 1 }}>
        {projects.map((project) => (
          <ListItemButton
            key={project.id}
            selected={selectedProjectId === project.id}
            onClick={() => onProjectSelect(project.id)}
            sx={{
              py: 1,
              px: 2,
              '&.Mui-selected': {
                bgcolor: 'primary.lighter',
                borderLeft: '3px solid',
                borderLeftColor: 'primary.main',
                '&:hover': {
                  bgcolor: 'primary.light',
                },
              },
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: selectedProjectId === project.id ? 600 : 400,
                    }}
                  >
                    {project.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip
                      label={getStatusLabel(project.status)}
                      size="small"
                      color={getStatusChipColor(project.status)}
                      sx={{ 
                        fontSize: '0.65rem',
                        height: '18px',
                        '& .MuiChip-label': {
                          px: 0.75,
                        }
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {project.fileCount} ファイル
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

export default ProjectFolderTree;

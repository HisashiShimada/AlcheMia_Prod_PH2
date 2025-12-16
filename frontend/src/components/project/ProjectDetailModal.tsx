'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  IconButton,
} from '@mui/material';
import { X, Folder, Users, FileText, HardDrive, Calendar } from 'lucide-react';
import FileListTable from './FileListTable';
import { formatFileSize, formatRelativeTime, formatProjectStatus, getStatusColor } from '@/utils/formatters';

interface ProjectDetailModalProps {
  open: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    folderName: string;
    description: string;
    status: string;
    fileCount: number;
    totalSize: number;
    createdAt: string;
    updatedAt: string;
    owner: string;
    members: string[];
    tags: string[];
  } | null;
  files: Array<{
    id: string;
    name: string;
    path: string;
    size: number;
    lastModified: string;
    type: string;
    isCheckedOut: boolean;
    checkedOutBy: string | null;
    checkedOutAt: string | null;
  }>;
}

/**
 * プロジェクト詳細モーダルコンポーネント
 */
const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  open,
  onClose,
  project,
  files,
}) => {
  if (!project) return null;

  const statusColor = getStatusColor(project.status);
  const statusText = formatProjectStatus(project.status);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '80vh',
          maxHeight: '90vh',
        },
      }}
    >
      {/* ヘッダー */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
              {project.name}
            </Typography>
            <Chip label={statusText} color={statusColor} size="small" />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Folder size={16} color="#757575" />
            <Typography variant="body2" color="text.secondary">
              {project.folderName}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        {/* プロジェクト情報 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            プロジェクト情報
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {project.description}
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
            {/* 所有者 */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                所有者
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Users size={16} color="#757575" />
                <Typography variant="body2">{project.owner}</Typography>
              </Box>
            </Box>

            {/* メンバー */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                メンバー
              </Typography>
              <Typography variant="body2">
                {project.members.join(', ')}
              </Typography>
            </Box>

            {/* ファイル数 */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                ファイル数
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FileText size={16} color="#757575" />
                <Typography variant="body2">{project.fileCount} ファイル</Typography>
              </Box>
            </Box>

            {/* ストレージ使用量 */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                ストレージ使用量
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <HardDrive size={16} color="#757575" />
                <Typography variant="body2">{formatFileSize(project.totalSize)}</Typography>
              </Box>
            </Box>

            {/* 作成日 */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                作成日
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Calendar size={16} color="#757575" />
                <Typography variant="body2">{formatRelativeTime(project.createdAt)}</Typography>
              </Box>
            </Box>

            {/* 最終更新日 */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                最終更新日
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Calendar size={16} color="#757575" />
                <Typography variant="body2">{formatRelativeTime(project.updatedAt)}</Typography>
              </Box>
            </Box>
          </Box>

          {/* タグ */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              タグ
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {project.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* ファイル一覧 */}
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            ファイル一覧 ({files.length})
          </Typography>
          <FileListTable
            files={files}
            onFileClick={(file) => console.log('File clicked:', file.name)}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>閉じる</Button>
        <Button variant="contained" color="primary">
          プロジェクトを開く
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProjectDetailModal;

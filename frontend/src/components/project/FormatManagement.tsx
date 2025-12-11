'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
} from '@mui/material';
import { 
  RefreshCw, 
  Upload, 
  Plus,
} from 'lucide-react';
import ProjectFolderTree from './ProjectFolderTree';
import FileListTable from './FileListTable';
import ProjectDetailModal from './ProjectDetailModal';
import mockProjectsData from '@/data/mock/mockProjects.json';
import mockFilesData from '@/data/mock/mockFiles.json';

/**
 * フォーマット管理画面メインコンポーネント
 * ProjectManagement.tsxをベースに作成
 */
const FormatManagement: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['folder_active']));

  // モックデータの読み込み
  useEffect(() => {
    setProjects(mockProjectsData.projects);
  }, []);

  // フィルタリングされたプロジェクト一覧
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // 検索クエリでフィルタリング
      const matchesSearch =
        searchQuery === '' ||
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // ステータスフィルタリング
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'checked_out') {
          matchesStatus = project.isCheckedOut === true;
        } else if (statusFilter === 'checked_in') {
          matchesStatus = project.isCheckedOut === false;
        }
      }

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  // フォルダの展開/折りたたみ
  const handleToggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  // プロジェクト選択時
  const handleProjectSelect = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentFolder('root');
  }, []);

  // フォルダクリック時
  const handleFolderClick = useCallback((folderId: string) => {
    if (folderId === 'back') {
      setCurrentFolder('root');
    } else {
      setCurrentFolder(folderId);
    }
  }, []);

  // モーダルを閉じる
  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  // リフレッシュ
  const handleRefresh = () => {
    console.log('Refreshing format list...');
    setProjects([...mockProjectsData.projects]);
  };

  // 選択したプロジェクトとそのファイル一覧を取得
  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const projectFiles = useMemo(() => {
    if (!selectedProjectId) return [];
    const projectData = (mockFilesData.files as any)[selectedProjectId];
    if (!projectData) return [];
    
    if (currentFolder === 'root') {
      const rootFiles = projectData.root || [];
      const archiveFiles = projectData.archive || [];
      
      if (archiveFiles.length > 0) {
        return [
          ...rootFiles,
          {
            id: 'archive',
            name: 'archive',
            path: `${selectedProject?.folderName}/archive`,
            size: 0,
            lastModified: '',
            type: 'folder',
            isFolder: true,
            fileCount: archiveFiles.length,
          },
        ];
      }
      return rootFiles;
    } else if (currentFolder === 'archive') {
      const archiveFiles = projectData.archive || [];
      return [
        {
          id: 'back',
          name: '↑ 戻る',
          path: '',
          size: 0,
          lastModified: '',
          type: 'folder',
          isFolder: true,
          fileCount: undefined,
        },
        ...archiveFiles,
      ];
    }
    
    return [];
  }, [selectedProjectId, currentFolder, selectedProject]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#fafafa' }}>
      {/* ツールバー */}
      <Paper
        elevation={0}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: 3,
          py: 2,
        }}
      >
        {/* 検索・フィルタ */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* 検索バー */}
          <TextField
            size="small"
            placeholder="フォーマット名で検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: 250 }}
          />

          {/* 詳細検索ボタン */}
          <Button variant="contained" size="small" color="primary">
            詳細検索
          </Button>

          {/* ステータス絞込 */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>ステータス絞込</InputLabel>
            <Select
              value={statusFilter}
              label="ステータス絞込"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">全て</MenuItem>
              <MenuItem value="checked_in">チェックイン済み</MenuItem>
              <MenuItem value="checked_out">チェックアウト済み</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ flex: 1 }} />

          {/* 右側のアクションボタン */}
          <Button
            variant="contained"
            size="small"
            color="success"
            startIcon={<Plus size={16} />}
          >
            新規フォーマット
          </Button>
          <Button
            variant="contained"
            size="small"
            color="primary"
            startIcon={<Upload size={16} />}
          >
            インポート
          </Button>
          <Button
            variant="contained"
            size="small"
            color="primary"
            startIcon={<RefreshCw size={16} />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {/* メインコンテンツ: 2カラムレイアウト */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左側: フォーマット一覧（画面の約1/3） */}
        <Box sx={{ width: '33%', minWidth: 350, maxWidth: 500, flexShrink: 0 }}>
          <ProjectFolderTree
            projects={filteredProjects}
            selectedProjectId={selectedProjectId}
            onProjectSelect={handleProjectSelect}
            expandedFolders={expandedFolders}
            onToggleFolder={handleToggleFolder}
          />
        </Box>

        {/* 右側: ファイル一覧 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedProject ? (
            <>
              {/* フォーマット情報ヘッダー */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {selectedProject.name}
                  </Typography>
                </Box>
              </Paper>

              {/* フォーマット操作ツールバー */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  gap: 1,
                }}
              >
                <Button
                  variant="contained"
                  size="small"
                  color="primary"
                >
                  編集
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="success"
                >
                  エクスポート
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                >
                  削除
                </Button>
              </Box>

              {/* ファイル一覧 */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                <FileListTable
                  files={projectFiles}
                  onFileClick={(file) => console.log('File clicked:', file.name)}
                  onFolderClick={handleFolderClick}
                />
              </Box>
            </>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  フォーマットを選択してください
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  左側のフォルダツリーからフォーマットを選択すると、詳細が表示されます
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* プロジェクト詳細モーダル */}
      <ProjectDetailModal
        open={modalOpen}
        onClose={handleCloseModal}
        project={selectedProject}
        files={projectFiles}
      />
    </Box>
  );
};

export default FormatManagement;

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Paper,
  Toolbar,
  Divider,
  Chip,
} from '@mui/material';
import { 
  Search, 
  Plus, 
  RefreshCw, 
  Upload, 
  Edit, 
  Download,
  FileCheck,
  Send,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';
import ProjectFolderTree from './ProjectFolderTree';
import FileListTable from './FileListTable';
import ProjectDetailModal from './ProjectDetailModal';
import mockProjectsData from '@/data/mock/mockProjects.json';
import mockFilesData from '@/data/mock/mockFiles.json';

/**
 * プロジェクト管理画面メインコンポーネント
 */
const ProjectManagement: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkoutFilter, setCheckoutFilter] = useState<string>('all'); // all, checked_in, checked_out
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('all'); // all, planning, pending, in_progress, completed
  const [showMaimlOnly, setShowMaimlOnly] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'createdAt'>('createdAt'); // ソート項目
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // ソート順序
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

      // チェックアウト状態でフィルタリング（プロジェクト単位）
      let matchesCheckout = true;
      if (checkoutFilter !== 'all') {
        if (checkoutFilter === 'checked_out') {
          // チェックアウト済み：プロジェクトがチェックアウト中
          matchesCheckout = project.isCheckedOut === true;
        } else if (checkoutFilter === 'checked_in') {
          // チェックイン済み：プロジェクトがチェックアウト中でない
          matchesCheckout = project.isCheckedOut === false;
        }
      }

      // プロジェクトステータスでフィルタリング
      let matchesProjectStatus = true;
      if (projectStatusFilter !== 'all') {
        matchesProjectStatus = project.status === projectStatusFilter;
      }

      // MaiMLファイルフィルタ
      const matchesMaiml = !showMaimlOnly || (mockFilesData.files as any)[project.id]?.root?.some(
        (file: any) => file.type === 'maiml'
      ) || (mockFilesData.files as any)[project.id]?.archive?.some(
        (file: any) => file.type === 'maiml'
      );

      return matchesSearch && matchesCheckout && matchesProjectStatus && matchesMaiml;
    });
  }, [projects, searchQuery, checkoutFilter, projectStatusFilter, showMaimlOnly]);

  // ソート済みプロジェクト一覧
  const sortedProjects = useMemo(() => {
    const sorted = [...filteredProjects];
    sorted.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'status') {
        const statusOrder = { planning: 0, pending: 1, in_progress: 2, completed: 3 };
        comparison = (statusOrder[a.status as keyof typeof statusOrder] || 0) - (statusOrder[b.status as keyof typeof statusOrder] || 0);
      } else if (sortBy === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredProjects, sortBy, sortOrder]);

  // ソート変更ハンドラ
  const handleSortChange = useCallback((newSortBy: 'name' | 'status' | 'createdAt') => {
    if (sortBy === newSortBy) {
      // 同じ項目をクリックした場合は順序を反転
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 異なる項目をクリックした場合は新しい項目で降順ソート
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  }, [sortBy, sortOrder]);

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
    setCurrentFolder('root'); // プロジェクト切り替え時はルートフォルダを表示
  }, []);

  // フォルダクリック時
  const handleFolderClick = useCallback((folderId: string) => {
    if (folderId === 'back') {
      // 戻るボタン
      setCurrentFolder('root');
    } else {
      setCurrentFolder(folderId);
    }
  }, []);

  // モーダルを閉じる
  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  // プロジェクト詳細を開く
  const handleOpenProjectDetail = useCallback(() => {
    if (selectedProjectId) {
      setModalOpen(true);
    }
  }, [selectedProjectId]);

  // リフレッシュ
  const handleRefresh = () => {
    console.log('Refreshing project list...');
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
      // ルートフォルダの場合、rootファイル + archiveフォルダを表示
      const rootFiles = projectData.root || [];
      const archiveFiles = projectData.archive || [];
      
      if (archiveFiles.length > 0) {
        // archiveフォルダを追加
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
      // archiveフォルダの中身を表示 - 戻るボタンを先頭に追加
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

  // プロジェクトがチェックアウト中かどうかを判定（プロジェクト単位）
  const isProjectCheckedOut = useMemo(() => {
    return selectedProject?.isCheckedOut === true;
  }, [selectedProject]);

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
            placeholder="プロジェクト名で検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: 250 }}
          />

          {/* 詳細検索ボタン */}
          <Button variant="contained" size="small" color="primary">
            詳細検索
          </Button>

          {/* プロジェクトステータス絞込 */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>プロジェクトステータス</InputLabel>
            <Select
              value={projectStatusFilter}
              label="プロジェクトステータス"
              onChange={(e) => setProjectStatusFilter(e.target.value)}
            >
              <MenuItem value="all">全て</MenuItem>
              <MenuItem value="planning">プロジェクト計画中</MenuItem>
              <MenuItem value="pending">タスク実行待ち</MenuItem>
              <MenuItem value="in_progress">タスク実行中</MenuItem>
              <MenuItem value="completed">プロジェクト完了</MenuItem>
            </Select>
          </FormControl>

          {/* チェックアウトステータス絞込 */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>チェックアウト</InputLabel>
            <Select
              value={checkoutFilter}
              label="チェックアウト"
              onChange={(e) => setCheckoutFilter(e.target.value)}
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
            新規プロジェクト
          </Button>
          <Button
            variant="contained"
            size="small"
            color="success"
            startIcon={<Upload size={16} />}
          >
            アップロード
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
        {/* 左側: プロジェクト一覧（画面の約1/3） */}
        <Box sx={{ width: '35%', minWidth: 400, maxWidth: 550, flexShrink: 0 }}>
          <ProjectFolderTree
            projects={sortedProjects}
            selectedProjectId={selectedProjectId}
            onProjectSelect={handleProjectSelect}
            expandedFolders={expandedFolders}
            onToggleFolder={handleToggleFolder}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
          />
        </Box>

        {/* 右側: ファイル一覧 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedProject ? (
            <>
              {/* プロジェクト情報ヘッダー */}
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
                  {/* プロジェクトステータス表示 */}
                  {selectedProject.status === 'planning' && (
                    <Chip
                      label="プロジェクト計画中"
                      size="small"
                      color="default"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  )}
                  {selectedProject.status === 'pending' && (
                    <Chip
                      label="タスク実行待ち"
                      size="small"
                      color="info"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  )}
                  {selectedProject.status === 'in_progress' && (
                    <Chip
                      label="タスク実行中"
                      size="small"
                      color="primary"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  )}
                  {selectedProject.status === 'completed' && (
                    <Chip
                      label="プロジェクト完了"
                      size="small"
                      color="success"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  )}
                  {/* チェックアウト状態表示 - プロジェクト単位 */}
                  {selectedProject.isCheckedOut && (
                    <Chip
                      label="チェックアウト中"
                      size="small"
                      color="warning"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  )}
                </Box>
              </Paper>

              {/* ファイル操作ツールバー */}
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
                  startIcon={<Download size={16} />}
                >
                  プロジェクトダウンロード
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="primary"
                  startIcon={<Edit size={16} />}
                >
                  編集
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color={isProjectCheckedOut ? 'warning' : 'success'}
                  startIcon={<FileCheck size={16} />}
                >
                  {isProjectCheckedOut ? 'チェックイン' : 'チェックアウト'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Send size={16} />}
                  disabled
                >
                  指示送信
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="info"
                >
                  公開
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
                  プロジェクトを選択してください
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  左側のフォルダツリーからプロジェクトを選択すると、ファイル一覧が表示されます
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

export default ProjectManagement;

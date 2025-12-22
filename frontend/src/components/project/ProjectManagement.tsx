'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Input,
  Button,
  Select,
  Space,
  Tag,
  Tabs,
  Typography,
  Flex,
  theme,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
  EditOutlined,
  DownloadOutlined,
  FileTextOutlined,
  SendOutlined,
} from '@ant-design/icons';
import ProjectFolderTree from './ProjectFolderTree';
import FileListTable from './FileListTable';
import ProjectDetailModal from './ProjectDetailModal';
import ProjectSearchModal from './ProjectSearchModal';
import TaskResultsTable from './TaskResultsTable';
import BulkUploadDialog from './BulkUploadDialog';
import InstructionDialog from './InstructionDialog';
import CreateProjectModal, { CreateProjectData } from './CreateProjectModal';
import ViewRendererDialog from '@/components/viewer/ViewRendererDialog';
import mockFilesData from '@/data/mock/mockFiles.json';
import { useLanguage } from '@/contexts/LanguageContext';
import { message } from 'antd';
import { useApi } from '@/hooks/useApi';
import { fetchProjects, fetchProjectFiles } from '@/utils/apiClient';
import type { ApiResponse } from '@/types/api';
import type { ProjectListResponse } from '@/types/project';
import type { ProjectFilesResponse } from '@/types/file';

const { Title, Text } = Typography;

/**
 * プロジェクト管理画面メインコンポーネント
 */
const ProjectManagement: React.FC = () => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [projects, setProjects] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>('my_only'); // my_only, all
  const [checkoutFilter, setCheckoutFilter] = useState<string>('all'); // all, checked_in, checked_out
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('all'); // all, planning, pending, in_progress, completed
  const [departmentFilter, setDepartmentFilter] = useState<string>('all'); // 初期値: 全部門
  const [showMaimlOnly, setShowMaimlOnly] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'createdAt'>('createdAt'); // ソート項目
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // ソート順序
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [modalOpen, setModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [instructionDialogOpen, setInstructionDialogOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['folder_active']));
  const [currentTab, setCurrentTab] = useState<'file_management' | 'task_results'>('file_management');
  
  // 複数ダイアログ管理
  interface OpenDialog {
    id: string;
    contentType: 'file' | 'subnet';
    file?: any;
    subnetData?: {
      transitionName: string;
      maimlData: string;
      templateMap: Record<string, { element: Element }>;
      petriNetData: any;
    };
    zIndex: number;
    position: { x: number; y: number };
  }
  const [openDialogs, setOpenDialogs] = useState<OpenDialog[]>([]);
  const [nextZIndex, setNextZIndex] = useState(1000);

  // プロジェクト一覧をAPI経由で取得
  const { 
    data: projectsData, 
    isLoading: isLoadingProjects, 
    error: projectsError, 
    refetch: refetchProjects 
  } = useApi<ApiResponse<ProjectListResponse>>(
    fetchProjects,
    []
  );

  // プロジェクトデータが取得できたらstateを更新
  useEffect(() => {
    if (projectsData?.data.projects) {
      // Data synchronization in useEffect is a valid pattern
      // eslint-disable-next-line
      setProjects(projectsData.data.projects);
    }
  }, [projectsData]);

  // ユニークな部門リストを取得
  const departments = useMemo(() => {
    const uniqueDepartments = Array.from(new Set(projects.map(p => p.department)));
    return ['all', ...uniqueDepartments];
  }, [projects]);

  // フィルタリングされたプロジェクト一覧
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // プロジェクトステータスの表示名を取得
      const getProjectStatusLabel = (status: string) => {
        switch (status) {
          case 'planning':
            return t('projectManagement.status_planning');
          case 'pending':
            return t('projectManagement.status_pending');
          case 'in_progress':
            return t('projectManagement.status_in_progress');
          case 'review_waiting':
            return t('projectManagement.status_review_waiting');
          case 'completed':
            return t('projectManagement.status_completed');
          case 'error':
            return t('projectManagement.status_error');
          default:
            return status;
        }
      };

      // チェックアウトステータスの表示名を取得
      const getCheckoutStatusLabel = (isCheckedOut: boolean) => {
        if (isCheckedOut) {
          return t('projectManagement.checking_out');
        } else {
          return t('projectManagement.checked_in');
        }
      };

      const projectStatusLabel = getProjectStatusLabel(project.status);
      const checkoutStatusLabel = getCheckoutStatusLabel(project.isCheckedOut);

      // 検索クエリでフィルタリング - すべての項目を対象（表示名も含む）
      const matchesSearch =
        searchQuery === '' ||
        project.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.folderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        projectStatusLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        checkoutStatusLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.createdAt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.updatedAt.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

      // 部門でフィルタリング
      let matchesDepartment = true;
      if (departmentFilter !== 'all') {
        matchesDepartment = project.department === departmentFilter;
      }

      // MaiMLファイルフィルタ
      const matchesMaiml = !showMaimlOnly || (mockFilesData.files as any)[project.id]?.root?.some(
        (file: any) => file.type === 'maiml'
      ) || (mockFilesData.files as any)[project.id]?.archive?.some(
        (file: any) => file.type === 'maiml'
      );

      return matchesSearch && matchesCheckout && matchesProjectStatus && matchesDepartment && matchesMaiml;
    });
  }, [projects, searchQuery, checkoutFilter, projectStatusFilter, departmentFilter, showMaimlOnly, t]);

  // ソート済みプロジェクト一覧
  const sortedProjects = useMemo(() => {
    const sorted = [...filteredProjects];
    sorted.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'status') {
        const statusOrder = { planning: 0, pending: 1, in_progress: 2, review_waiting: 3, completed: 4, error: 5 };
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
  const handleRefresh = useCallback(() => {
    console.log('Refreshing project list...');
    refetchProjects();
  }, [refetchProjects]);

  // アップロードダイアログを開く
  const handleOpenUploadDialog = useCallback(() => {
    setUploadDialogOpen(true);
  }, []);

  // アップロードダイアログを閉じる
  const handleCloseUploadDialog = useCallback(() => {
    setUploadDialogOpen(false);
  }, []);

  // アップロード完了ハンドラ
  const handleUploadComplete = useCallback((result: {
    mode: string;
    fileCount: number;
    success: boolean;
  }) => {
    console.log('Upload completed:', result);
    // TODO: ファイル一覧を更新
    handleRefresh();
  }, [handleRefresh]);

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

  // タスク結果一覧を取得（統合されたmockProjects.jsonから取得）
  const taskResults = useMemo(() => {
    if (!selectedProjectId) return [];
    const project = projects.find(p => p.id === selectedProjectId);
    return project?.tasks || [];
  }, [selectedProjectId, projects]);

  // タスク結果の統計情報を計算（workStatus基準）
  const taskStats = useMemo(() => {
    const stats = {
      total: taskResults.length,
      pending: 0,
      in_progress: 0,
      error: 0,
      review_waiting: 0,
      completed: 0,
    };

    taskResults.forEach((result: any) => {
      switch (result.workStatus) {
        case 'pending':
          stats.pending++;
          break;
        case 'in_progress':
          stats.in_progress++;
          break;
        case 'error':
          stats.error++;
          break;
        case 'review_waiting':
          stats.review_waiting++;
          break;
        case 'completed':
          stats.completed++;
          break;
      }
    });

    return stats;
  }, [taskResults]);

  // タスク結果確認ハンドラ
  const handleViewTaskResult = useCallback((result: any) => {
    console.log('View task result:', result);
    // TODO: タスク結果詳細モーダルを表示
  }, []);

  // プロジェクトがチェックアウト中かどうかを判定（プロジェクト単位）
  const isProjectCheckedOut = useMemo(() => {
    return selectedProject?.isCheckedOut === true;
  }, [selectedProject]);

  // チェックイン/チェックアウト切り替えハンドラ
  const handleToggleCheckout = useCallback(() => {
    if (!selectedProject) return;

    // プロジェクトのチェックアウトステータスを切り替え
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id === selectedProject.id) {
          return {
            ...project,
            isCheckedOut: !project.isCheckedOut,
          };
        }
        return project;
      })
    );

    // メッセージ表示
    if (isProjectCheckedOut) {
      console.log('チェックイン:', selectedProject.name);
      // TODO: 実際のAPI呼び出しを実装
    } else {
      console.log('チェックアウト:', selectedProject.name);
      // TODO: 実際のAPI呼び出しを実装
    }
  }, [selectedProject, isProjectCheckedOut]);

  // 指示送信ダイアログを開く
  const handleOpenInstructionDialog = useCallback(() => {
    setInstructionDialogOpen(true);
  }, []);

  // 指示送信ダイアログを閉じる
  const handleCloseInstructionDialog = useCallback(() => {
    setInstructionDialogOpen(false);
  }, []);

  // 指示送信ハンドラ
  const handleInstructionSubmit = useCallback((data: any) => {
    console.log('指示データ送信:', data);
    // TODO: チェックアウトAPIを呼び出す
    // TODO: 成功時にプロジェクトをチェックアウト状態に更新
  }, []);

  // 新規プロジェクト作成モーダルを開く
  const handleOpenCreateModal = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  // 新規プロジェクト作成モーダルを閉じる
  const handleCloseCreateModal = useCallback(() => {
    setCreateModalOpen(false);
  }, []);

  // ダイアログを開く
  const handleViewFile = useCallback((file: any) => {
    // 上限チェック（5個まで）
    if (openDialogs.length >= 5) {
      message.warning('同時に開けるダイアログは5個までです');
      return;
    }

    const id = `${file.id}-${Date.now()}`;
    const offset = openDialogs.length * 30;  // カスケード配置
    
    const newDialog: OpenDialog = {
      id,
      contentType: 'file',  // ファイル表示
      file,
      zIndex: nextZIndex,
      position: { x: 100 + offset, y: 100 + offset }
    };
    
    setOpenDialogs(prev => [...prev, newDialog]);
    setNextZIndex(prev => prev + 1);
  }, [openDialogs, nextZIndex]);

  // ダイアログを閉じる
  const handleCloseDialog = useCallback((id: string) => {
    setOpenDialogs(prev => prev.filter(d => d.id !== id));
  }, []);

  // ダイアログをフォーカス（最前面に）
  const handleFocusDialog = useCallback((id: string) => {
    setOpenDialogs(prev => 
      prev.map(d => 
        d.id === id 
          ? { ...d, zIndex: nextZIndex }
          : d
      )
    );
    setNextZIndex(prev => prev + 1);
  }, [nextZIndex]);

  // SubNetViewerを開く
  const handleViewSubnet = useCallback((subnetData: {
    transitionName: string;
    maimlData: string;
    templateMap: Record<string, { element: Element }>;
    petriNetData: {
      places: Array<{
        id: string;
        data: {
          label?: string;
          stereotype?: string;
          template?: { id: string };
          templateId?: string;
        };
      }>;
      arcs: Array<{
        id: string;
        source: string;
        target: string;
      }>;
    };
  }) => {
    // 上限チェック（5個まで）
    if (openDialogs.length >= 5) {
      message.warning('同時に開けるダイアログは5個までです');
      return;
    }

    const id = `subnet-${subnetData.transitionName}-${Date.now()}`;
    const offset = openDialogs.length * 30;  // カスケード配置
    
    const newDialog: OpenDialog = {
      id,
      contentType: 'subnet',
      subnetData,
      zIndex: nextZIndex,
      position: { x: 150 + offset, y: 150 + offset }
    };
    
    setOpenDialogs(prev => [...prev, newDialog]);
    setNextZIndex(prev => prev + 1);
  }, [openDialogs, nextZIndex]);

  // 新規プロジェクト作成ハンドラ
  const handleCreateProject = useCallback(async (data: CreateProjectData) => {
    try {
      console.log('新規プロジェクト作成:', data);
      
      // 新しいプロジェクトIDを生成
      const newProjectId = `proj_${String(projects.length + 1).padStart(3, '0')}`;
      
      // 新しいプロジェクトオブジェクトを作成
      const newProject = {
        id: newProjectId,
        name: data.name,
        folderName: data.folderName,
        description: data.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'planning',
        fileCount: 0,
        totalSize: 0,
        owner: data.owner,
        department: data.department,
        members: [data.owner],
        tags: [],
        isCheckedOut: false,
        checkedOutBy: null,
        checkedOutAt: null,
      };
      
      // プロジェクト一覧に追加
      setProjects((prev) => [newProject, ...prev]);
      
      // 新しいプロジェクトを選択状態にする
      setSelectedProjectId(newProjectId);
      
      // 成功メッセージを表示
      message.success({
        content: t('projectManagement.create.success') || 'プロジェクトが正常に作成されました',
        duration: 3,
      });
      
      // モーダルを閉じる
      handleCloseCreateModal();
      
      // TODO: 実際のAPI呼び出しを実装
      // await apiService.post('/api/projects', data);
    } catch (error) {
      console.error('プロジェクト作成エラー:', error);
      message.error({
        content: t('projectManagement.create.error') || 'プロジェクトの作成に失敗しました',
        duration: 3,
      });
      throw error;
    }
  }, [projects, t, handleCloseCreateModal]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: token.colorBgLayout }}>
      {/* ツールバー */}
      <Card
        bordered={false}
        style={{
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: 0,
        }}
        bodyStyle={{ padding: `${token.margin}px ${token.paddingLG}px` }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {/* 検索・フィルタ */}
        <Space direction="horizontal" size="small" wrap>
          {/* 所有者絞込 */}
          <Space size={4} direction="horizontal">
            <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
              {t('projectManagement.filter_labels.owner')}
            </Text>
            <Select
              style={{ width: 150 }}
              value={ownerFilter}
              onChange={setOwnerFilter}
              options={[
                { value: 'my_only', label: t('projectManagement.my_only') },
                { value: 'all', label: t('projectManagement.all_projects') },
              ]}
            />
          </Space>

          {/* 部門絞込 */}
          <Space size={4} direction="horizontal">
            <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
              {t('projectManagement.filter_labels.department')}
            </Text>
            <Select
              style={{ width: 150 }}
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={[
                { value: 'all', label: t('projectManagement.all') },
                ...departments.filter(d => d !== 'all').map(dept => ({
                  value: dept,
                  label: dept,
                })),
              ]}
            />
          </Space>

          {/* プロジェクトステータス絞込 */}
          <Space size={4} direction="horizontal">
            <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
              {t('projectManagement.filter_labels.project_status')}
            </Text>
            <Select
              style={{ width: 200 }}
              value={projectStatusFilter}
              onChange={setProjectStatusFilter}
              options={[
                { value: 'all', label: t('projectManagement.all') },
                { value: 'planning', label: t('projectManagement.status_planning') },
                { value: 'pending', label: t('projectManagement.status_pending') },
                { value: 'in_progress', label: t('projectManagement.status_in_progress') },
                { value: 'review_waiting', label: t('projectManagement.status_review_waiting') },
                { value: 'completed', label: t('projectManagement.status_completed') },
                { value: 'error', label: t('projectManagement.status_error') },
              ]}
            />
          </Space>

          {/* チェックアウトステータス絞込 */}
          <Space size={4} direction="horizontal">
            <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
              {t('projectManagement.filter_labels.checkout_status')}
            </Text>
            <Select
              style={{ width: 150 }}
              value={checkoutFilter}
              onChange={setCheckoutFilter}
              options={[
                { value: 'all', label: t('projectManagement.all') },
                { value: 'checked_in', label: t('projectManagement.checked_in') },
                { value: 'checked_out', label: t('projectManagement.checked_out') },
              ]}
            />
          </Space>

          {/* 検索バー */}
          <Space size={4} direction="horizontal">
            <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
              {t('projectManagement.filter_labels.search')}
            </Text>
            <Input
              prefix={<SearchOutlined />}
              placeholder={t('projectManagement.filter_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
          </Space>

          {/* 詳細検索ボタン */}
          <Button 
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => setSearchModalOpen(true)}
          >
            {t('projectManagement.advanced_search')}
          </Button>
        </Space>

        {/* 右側のアクションボタン */}
        <Space size="small">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }}
            onClick={handleOpenCreateModal}
          >
            {t('projectManagement.new_project')}
          </Button>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            style={{ backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }}
            onClick={handleOpenUploadDialog}
          >
            {t('projectManagement.upload')}
          </Button>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            {t('progress.refresh')}
          </Button>
        </Space>
        </div>
      </Card>

      {/* メインコンテンツ: 2カラムレイアウト */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左側: プロジェクト一覧（画面の約1/3） */}
        <div style={{ width: '35%', minWidth: 400, maxWidth: 550, flexShrink: 0 }}>
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
        </div>

        {/* 右側: 詳細ビュー */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedProject ? (
            <>
              {/* プロジェクト情報ヘッダー */}
              <Card
                bordered={false}
                style={{
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: 0,
                }}
                bodyStyle={{ padding: token.margin }}
              >
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Space size="small">
                    <Title level={5} style={{ margin: 0, fontWeight: token.fontWeightStrong }}>
                      {selectedProject.name}
                    </Title>
                    {/* プロジェクトステータス表示 */}
                    {selectedProject.status === 'planning' && (
                      <Tag>{t('projectManagement.status_planning')}</Tag>
                    )}
                    {selectedProject.status === 'pending' && (
                      <Tag color="blue">{t('projectManagement.status_pending')}</Tag>
                    )}
                    {selectedProject.status === 'in_progress' && (
                      <Tag color="cyan">{t('projectManagement.status_in_progress')}</Tag>
                    )}
                    {selectedProject.status === 'review_waiting' && (
                      <Tag color="purple">{t('projectManagement.status_review_waiting')}</Tag>
                    )}
                    {selectedProject.status === 'completed' && (
                      <Tag color="success">{t('projectManagement.status_completed')}</Tag>
                    )}
                    {selectedProject.status === 'error' && (
                      <Tag color="error">{t('projectManagement.status_error')}</Tag>
                    )}
                    {/* チェックアウト状態表示 - プロジェクト単位 */}
                    {selectedProject.isCheckedOut && (
                      <Tag color="orange">{t('projectManagement.checking_out')}</Tag>
                    )}
                  </Space>
                  {/* プロジェクト概要 */}
                  {selectedProject.description && (
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      {selectedProject.description}
                    </Text>
                  )}
                </Space>
              </Card>

              {/* ファイル操作ツールバー */}
              <Card
                bordered={false}
                style={{
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: 0,
                }}
                bodyStyle={{ padding: token.margin }}
              >
                <Space size="small">
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                  >
                    {t('projectManagement.project_download')}
                  </Button>
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                  >
                    {t('projectManagement.edit')}
                  </Button>
                  <Button
                    type="primary"
                    icon={<FileTextOutlined />}
                    onClick={handleToggleCheckout}
                    style={isProjectCheckedOut ? { backgroundColor: token.colorWarning, borderColor: token.colorWarning } : { backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }}
                  >
                    {isProjectCheckedOut ? t('projectManagement.checkin') : t('projectManagement.checkout_action')}
                  </Button>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleOpenInstructionDialog}
                  >
                    {t('projectManagement.send_instruction')}
                  </Button>
                  <Button
                    type="primary"
                    style={{ backgroundColor: token.colorInfo, borderColor: token.colorInfo }}
                  >
                    {t('projectManagement.publish')}
                  </Button>
                </Space>
              </Card>

              {/* タブ */}
              <Tabs
                activeKey={currentTab}
                onChange={(key) => setCurrentTab(key as 'file_management' | 'task_results')}
                items={[
                  {
                    key: 'file_management',
                    label: t('projectManagement.tabs.file_management'),
                  },
                  {
                    key: 'task_results',
                    label: t('projectManagement.tabs.task_results'),
                  },
                ]}
                style={{
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  backgroundColor: token.colorBgContainer,
                  padding: `0 ${token.margin}px`,
                }}
              />

              {/* タブコンテンツ */}
              <div style={{ flex: 1, overflow: 'auto', padding: token.margin }}>
                {currentTab === 'file_management' && (
                  <FileListTable
                    files={projectFiles}
                    onFileClick={(file) => console.log('File clicked:', file.name)}
                    onFolderClick={handleFolderClick}
                    onViewFile={handleViewFile}
                  />
                )}
                
                {currentTab === 'task_results' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* 統計カード */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: token.margin }}>
                      <Card
                        bordered={false}
                        style={{ backgroundColor: token.colorBgContainer, borderRadius: token.borderRadius }}
                        bodyStyle={{ padding: token.margin }}
                      >
                        <Flex vertical align="center">
                          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                            {t('projectManagement.task_results.stats.total_tasks') || '総タスク数'}
                          </Text>
                          <Title level={3} style={{ margin: `${token.marginXS}px 0 0 0`, color: token.colorText }}>
                            {taskStats.total}
                          </Title>
                        </Flex>
                      </Card>
                      
                      <Card
                        bordered={false}
                        style={{ backgroundColor: token.colorBgContainer, borderRadius: token.borderRadius }}
                        bodyStyle={{ padding: token.margin }}
                      >
                        <Flex vertical align="center">
                          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                            {t('projectManagement.task_results.stats.pending_count') || '実行待ち'}
                          </Text>
                          <Title level={3} style={{ margin: `${token.marginXS}px 0 0 0`, color: token.colorTextSecondary }}>
                            {taskStats.pending}
                          </Title>
                        </Flex>
                      </Card>
                      
                      <Card
                        bordered={false}
                        style={{ backgroundColor: token.colorPrimaryBg, borderRadius: token.borderRadius }}
                        bodyStyle={{ padding: token.margin }}
                      >
                        <Flex vertical align="center">
                          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                            {t('projectManagement.task_results.stats.in_progress_count') || '実行中'}
                          </Text>
                          <Title level={3} style={{ margin: `${token.marginXS}px 0 0 0`, color: token.colorPrimary }}>
                            {taskStats.in_progress}
                          </Title>
                        </Flex>
                      </Card>
                      
                      <Card
                        bordered={false}
                        style={{ backgroundColor: token.colorErrorBg, borderRadius: token.borderRadius }}
                        bodyStyle={{ padding: token.margin }}
                      >
                        <Flex vertical align="center">
                          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                            {t('projectManagement.task_results.stats.error_count') || '異常終了'}
                          </Text>
                          <Title level={3} style={{ margin: `${token.marginXS}px 0 0 0`, color: token.colorError }}>
                            {taskStats.error}
                          </Title>
                        </Flex>
                      </Card>
                      
                      <Card
                        bordered={false}
                        style={{ backgroundColor: token.colorWarningBg, borderRadius: token.borderRadius }}
                        bodyStyle={{ padding: token.margin }}
                      >
                        <Flex vertical align="center">
                          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                            {t('projectManagement.task_results.stats.review_waiting_count') || 'レビュー待ち'}
                          </Text>
                          <Title level={3} style={{ margin: `${token.marginXS}px 0 0 0`, color: token.colorWarning }}>
                            {taskStats.review_waiting}
                          </Title>
                        </Flex>
                      </Card>
                      
                      <Card
                        bordered={false}
                        style={{ backgroundColor: token.colorSuccessBg, borderRadius: token.borderRadius }}
                        bodyStyle={{ padding: token.margin }}
                      >
                        <Flex vertical align="center">
                          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                            {t('projectManagement.task_results.stats.completed_count') || '完了'}
                          </Text>
                          <Title level={3} style={{ margin: `${token.marginXS}px 0 0 0`, color: token.colorSuccess }}>
                            {taskStats.completed}
                          </Title>
                        </Flex>
                      </Card>
                    </div>

                    {/* タスク結果テーブル */}
                    <TaskResultsTable
                      results={taskResults}
                      onViewResult={handleViewTaskResult}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <Title level={5} type="secondary">
                  {t('projectManagement.select_project')}
                </Title>
                <Typography.Text type="secondary">
                  {t('projectManagement.select_project_description')}
                </Typography.Text>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* プロジェクト詳細モーダル */}
      <ProjectDetailModal
        open={modalOpen}
        onClose={handleCloseModal}
        project={selectedProject}
        files={projectFiles}
      />

      {/* プロジェクト検索モーダル */}
      <ProjectSearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onProjectSelect={(projectId: string) => {
          console.log('検索結果からプロジェクトが選択されました:', projectId);
          // プロジェクトを選択状態にする
          handleProjectSelect(projectId);
        }}
      />

      {/* 一括アップロードダイアログ */}
      <BulkUploadDialog
        open={uploadDialogOpen}
        onClose={handleCloseUploadDialog}
        onUploadComplete={handleUploadComplete}
        preselectedFolder={selectedProject?.folderName || ''}
      />

      {/* 指示送信ダイアログ */}
      {selectedProject && (
        <InstructionDialog
          open={instructionDialogOpen}
          onClose={handleCloseInstructionDialog}
          onSubmit={handleInstructionSubmit}
          fileKey={selectedProject.folderName}
          managerId="current_manager_id"
          projectName={selectedProject.name}
          projectOwner={selectedProject.owner}
          projectStatus={(() => {
            switch (selectedProject.status) {
              case 'planning':
                return t('projectManagement.status_planning');
              case 'pending':
                return t('projectManagement.status_pending');
              case 'in_progress':
                return t('projectManagement.status_in_progress');
              case 'review_waiting':
                return t('projectManagement.status_review_waiting');
              case 'completed':
                return t('projectManagement.status_completed');
              case 'error':
                return t('projectManagement.status_error');
              default:
                return selectedProject.status;
            }
          })()}
          availableWorkers={[]}
        />
      )}

      {/* 新規プロジェクト作成モーダル */}
      <CreateProjectModal
        open={createModalOpen}
        onCancel={handleCloseCreateModal}
        onSubmit={handleCreateProject}
      />

      {/* 複数のフローティングダイアログ */}
      {openDialogs.map(dialog => (
        <ViewRendererDialog
          key={dialog.id}
          id={dialog.id}
          contentType={dialog.contentType}
          file={dialog.file}
          subnetData={dialog.subnetData}
          zIndex={dialog.zIndex}
          initialPosition={dialog.position}
          onClose={handleCloseDialog}
          onFocus={handleFocusDialog}
          onOpenSubNetViewer={handleViewSubnet}
        />
      ))}
    </div>
  );
};

export default ProjectManagement;

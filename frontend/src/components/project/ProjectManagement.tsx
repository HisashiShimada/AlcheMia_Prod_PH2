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
  ExclamationCircleOutlined,
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
import DraftRestoreDialog from '../viewer/DraftRestoreDialog';
import IssueManagementModal from '../ExperimentWorker/IssueManagementModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { message } from 'antd';
import { useApi } from '@/hooks/useApi';
import {
  downloadFolderAsZip,
} from '@/api/fileAccessService';
import { getProjects } from '@/api/projectApiService';
import {
  getProjectFiles, 
  getProjectTasks,
  createProject as createProjectApi,
  type CreateProjectRequest,
  type ApiResponse,
  type ProjectListResponse,
  type FileListResponse,
  type TaskListResponse
} from '@/api/projectApiService';
import type { Project, Task, ProjectEditParams } from '@/types/project';
import type { ProjectFile } from '@/types/file';

const { Title, Text } = Typography;

/**
 * プロジェクトファイルデータ
 */
interface ProjectFilesData {
  root: ProjectFile[];
  archive: ProjectFile[];
}

/**
 * プロジェクト管理画面メインコンポーネント
 */
interface ProjectManagementProps {
  onEdit?: (params: ProjectEditParams) => void;
}

const ProjectManagement: React.FC<ProjectManagementProps> = ({ onEdit }) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>('my_only'); // my_only, all
  const [checkoutFilter, setCheckoutFilter] = useState<string>('all'); // all, checked_in, checked_out
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('all'); // all, planning, pending, in_progress, completed
  const [departmentFilter, setDepartmentFilter] = useState<string>('all'); // 初期値: 全部門
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'createdAt'>('createdAt'); // ソート項目
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // ソート順序
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [modalOpen, setModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [instructionDialogOpen, setInstructionDialogOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [issueManagementModalOpen, setIssueManagementModalOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['folder_active']));
  
  // Phase 6追加: Draft関連のステート
  const [draftRestoreDialogOpen, setDraftRestoreDialogOpen] = useState(false);
  const [draftInfo, setDraftInfo] = useState<{
    savedAt: string;
    methodCount: number;
    nodeCount: number;
  } | null>(null);
  const [currentTab, setCurrentTab] = useState<'file_management' | 'task_results'>('file_management');
  const [projectFilesData, setProjectFilesData] = useState<Record<string, ProjectFilesData>>({});
  const [projectTasksData, setProjectTasksData] = useState<Record<string, { tasks: Task[]; statistics: unknown }>>({});
  const [isLoadingTabData, setIsLoadingTabData] = useState(false);
  
  // 複数ダイアログ管理
  interface OpenDialog {
    id: string;
    contentType: 'file' | 'subnet';
    file?: ProjectFile;
    subnetData?: {
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
    };
    zIndex: number;
    position: { x: number; y: number };
  }
  const [openDialogs, setOpenDialogs] = useState<OpenDialog[]>([]);
  const [nextZIndex, setNextZIndex] = useState(1000);

  // ダウンロード状態管理
  const [isDownloading, setIsDownloading] = useState(false);
  
  // プロジェクトリロード状態管理
  const [isReloadingProject, setIsReloadingProject] = useState(false);

  // プロジェクト一覧をAPI経由で取得
  const {
    data: projectsData,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects
  } = useApi<ApiResponse<ProjectListResponse>>(
    async () => await getProjects(),
    []
  );

  // プロジェクトデータが取得できたらstateを更新
  useEffect(() => {
    console.log('📊 [ProjectManagement] projectsData received:', projectsData);
    
    if (!projectsData) {
      console.log('⏳ [ProjectManagement] Waiting for projectsData...');
      return;
    }
    
    if (projectsError) {
      console.error('❌ [ProjectManagement] API error:', projectsError);
      message.error('プロジェクト一覧の取得に失敗しました');
      return;
    }
    
    if (projectsData.success && projectsData.data) {
      // バックエンドのレスポンス構造を正しく参照
      // ApiResponse<ProjectListResponse> なので data.projects でアクセス
      const projectsList = Array.isArray(projectsData.data) 
        ? projectsData.data 
        : ((projectsData.data as ProjectListResponse)?.projects || []);
      
      console.log('✅ [ProjectManagement] Setting projects:', projectsList.length, 'projects');
      console.log('📋 [ProjectManagement] Projects data:', projectsList);
      setProjects(projectsList);
    } else {
      console.warn('⚠️ [ProjectManagement] Invalid projectsData structure:', projectsData);
      setProjects([]);
    }
  }, [projectsData, projectsError]);

  // ユニークな部署リストを取得（CD→名前のマッピング付き）
  const departments = useMemo(() => {
    if (!projects || projects.length === 0) {
      return [];
    }
    
    // 部署CDと部署名のマッピングを作成
    const departmentMap = new Map<string, string>();
    projects.forEach(p => {
      if (p.department && !departmentMap.has(p.department)) {
        // 部署名がある場合は名前、ない場合はCDをそのまま使用
        departmentMap.set(p.department, p.departmentName || p.department);
      }
    });
    
    // ソート済みの部署リストを返す（名前順）
    return Array.from(departmentMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1], 'ja'))
      .map(([code, name]) => ({ code, name }));
  }, [projects]);

  // フィルタリングされたプロジェクト一覧
  const filteredProjects = useMemo(() => {
    if (!projects || projects.length === 0) {
      return [];
    }
    
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

      return matchesSearch && matchesCheckout && matchesProjectStatus && matchesDepartment;
    });
  }, [projects, searchQuery, checkoutFilter, projectStatusFilter, departmentFilter, t]);

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
    if (!projects || projects.length === 0 || !selectedProjectId) {
      return null;
    }
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // プロジェクトのファイル一覧を取得
  useEffect(() => {
    const loadProjectFiles = async () => {
      if (!selectedProjectId || !selectedProject) {
        console.log('⏳ [ProjectManagement] No project selected, skipping file load');
        return;
      }
      
      try {
        console.log('📂 [ProjectManagement] Loading files for project:', selectedProject.name);
        const fileResponse = await getProjectFiles(selectedProject.name, true); // archiveファイルも取得
        
        const filesData: ProjectFilesData = {
          root: fileResponse.files || [],
          archive: fileResponse.archiveFiles || [],
        };
        
        console.log('✅ [ProjectManagement] Files loaded:', {
          root: filesData.root.length,
          archive: filesData.archive.length
        });
        
        setProjectFilesData(prev => ({
          ...prev,
          [selectedProjectId]: filesData
        }));
      } catch (error) {
        console.error('❌ [ProjectManagement] Failed to fetch project files:', error);
        message.error('ファイル一覧の取得に失敗しました');
      }
    };
    
    loadProjectFiles();
  }, [selectedProjectId, selectedProject]);

  const projectFiles = useMemo((): ProjectFile[] => {
    if (!selectedProjectId) {
      return [];
    }
    
    const projectData = projectFilesData[selectedProjectId];
    if (!projectData) {
      return [];
    }
    
    if (currentFolder === 'root') {
      // ルートフォルダの場合、rootファイル + archiveフォルダを表示
      const rootFiles = projectData.root || [];
      const archiveFiles = projectData.archive || [];
      
      // archiveフォルダはファイルが存在する場合のみ表示
      if (selectedProject && archiveFiles.length > 0) {
        const archiveFolder: ProjectFile = {
          id: 'archive',
          name: 'archive',
          path: `${selectedProject.folderName}/archive`,
          size: 0,
          lastModified: '',
          type: 'folder',
          isFolder: true,
          fileCount: archiveFiles.length, // ファイル数を表示
        };
        return [...rootFiles, archiveFolder];
      }
      return rootFiles;
    } else if (currentFolder === 'archive') {
      // archiveフォルダの中身を表示 - 戻るボタンを先頭に追加
      const archiveFiles = projectData.archive || [];
      const backButton: ProjectFile = {
        id: 'back',
        name: '↑ 戻る',
        path: '',
        size: 0,
        lastModified: '',
        type: 'folder',
        isFolder: true,
      };
      return [backButton, ...archiveFiles];
    }
    
    return [];
  }, [selectedProjectId, currentFolder, selectedProject, projectFilesData]);

  // タスク結果一覧を取得（projectTasksDataから取得）
  const taskResults = useMemo((): Task[] => {
    if (!selectedProjectId) {
      return [];
    }
    const projectData = projectTasksData[selectedProjectId];
    return projectData?.tasks || [];
  }, [selectedProjectId, projectTasksData]);

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

    taskResults.forEach((result) => {
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
  const handleViewTaskResult = useCallback((result: Task) => {
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
  const handleInstructionSubmit = useCallback((data: {
    instructions: Array<{
      instructionId: string;
      content: string;
      priority: string;
      instructionType: string;
      type: string;
      timestamp: string;
      targetType: string;
      transitionId: string | null;
      targetTransitionId?: string;
      taskNumber?: number;
    }>;
    fileKey: string;
    managerId: string;
    assignedWorkerId: string | null;
  }) => {
    console.log('指示データ送信:', data);
    // TODO: チェックアウトAPIを呼び出す
    // TODO: 成功時にプロジェクトをチェックアウト状態に更新
  }, []);

  // 問題確認モーダルを開く
  const handleOpenIssueManagement = useCallback(() => {
    if (!selectedProject) {
      message.warning('プロジェクトを選択してください');
      return;
    }
    setIssueManagementModalOpen(true);
  }, [selectedProject]);

  // 問題確認モーダルを閉じる
  const handleCloseIssueManagement = useCallback(() => {
    setIssueManagementModalOpen(false);
  }, []);

  // モックの問題データ（将来的にAPIから取得）
  const mockIssues = useMemo(() => {
    if (!selectedProject) return [];
    // TODO: 実際のAPIから取得する
    return [];
  }, [selectedProject]);

  // Phase 6追加: 編集ボタンクリックハンドラー
  const handleEditButtonClick = useCallback(() => {
    if (!selectedProject) {
      message.warning('プロジェクトを選択してください');
      return;
    }

    console.log('✏️ [ProjectManagement] Edit button clicked:', selectedProject.id);

    // Draftチェック
    const draftKey = `petri-net-draft-${selectedProject.id}`;
    const draftData = localStorage.getItem(draftKey);
    
    if (draftData) {
      try {
        const draft = JSON.parse(draftData);
        const info = {
          savedAt: draft.savedAt || new Date().toISOString(),
          methodCount: draft.methods?.length || 0,
          nodeCount: draft.nodes?.length || 0
        };
        
        console.log('💾 [ProjectManagement] Draft found:', info);
        setDraftInfo(info);
        setDraftRestoreDialogOpen(true);
        return;
      } catch (error) {
        console.error('❌ [ProjectManagement] Draft parse error:', error);
      }
    }

    // Draftがない場合は直接エディタへ
    console.log('➡️ [ProjectManagement] No draft, opening editor directly');
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '');
    const sourceS3Key = userInfo ? `/projects/${selectedProject.name}/${selectedProject.name}.maiml` : '';
    const params: ProjectEditParams = {
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      projectOverview: selectedProject.description,
      sourceS3Key: sourceS3Key
    };
    onEdit?.(params);
  }, [selectedProject, onEdit]);

  // Phase 6追加: Draft復元ハンドラー
  const handleRestoreDraft = useCallback(() => {
    console.log('💾 [ProjectManagement] Restoring draft');
    setDraftRestoreDialogOpen(false);
    if (selectedProject) {
      const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '');
      const sourceS3Key = userInfo ? `/org_${userInfo.organizationPrefix}/projects/${selectedProject.name}/${selectedProject.name}.maiml` : '';
      const params: ProjectEditParams = {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        projectOverview: selectedProject.description,
        sourceS3Key: sourceS3Key
      };
      onEdit?.(params);
    }
  }, [selectedProject, onEdit]);

  // Phase 6追加: 新規作成/既存ファイルハンドラー
  const handleCreateNewOrExisting = useCallback(() => {
    console.log('🆕 [ProjectManagement] Create new or open existing');
    setDraftRestoreDialogOpen(false);
    if (selectedProject) {
      // Draftを削除してから開く
      const draftKey = `petri-net-draft-${selectedProject.id}`;
      localStorage.removeItem(draftKey);
      const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '');
      const sourceS3Key = userInfo ? `/org_${userInfo.organizationPrefix}/projects/${selectedProject.name}/${selectedProject.name}.maiml` : '';
      const params: ProjectEditParams = {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        projectOverview: selectedProject.description,
        sourceS3Key: sourceS3Key
      };
      onEdit?.(params);
    }
  }, [selectedProject, onEdit]);

  // 新規プロジェクト作成モーダルを開く
  const handleOpenCreateModal = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  // 新規プロジェクト作成モーダルを閉じる
  const handleCloseCreateModal = useCallback(() => {
    setCreateModalOpen(false);
  }, []);

  // ダイアログを開く
  const handleViewFile = useCallback((file: ProjectFile) => {
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

  // プロジェクト一括ダウンロードハンドラ（ZIP形式）
  const handleProjectDownload = useCallback(async () => {
    if (!selectedProject) {
      message.warning('プロジェクトを選択してください');
      return;
    }

    try {
      setIsDownloading(true);
      
      // フォルダパスを構築（projects/プロジェクト名）
      const folderPath = `projects/${selectedProject.name}`;
      
      console.log('📦 [ProjectManagement] ZIPダウンロード開始:', folderPath);
      
      // ZIPダウンロード実行
      await downloadFolderAsZip(folderPath);
      
      message.success(`プロジェクト「${selectedProject.name}」をZIPファイルでダウンロードしました`);
    } catch (error) {
      console.error('❌ [ProjectManagement] ZIP download failed:', error);
      message.error('プロジェクトのダウンロードに失敗しました');
    } finally {
      setIsDownloading(false);
    }
  }, [selectedProject]);

  /**
   * プロジェクトリロードハンドラー
   * 
   * 処理フロー:
   * 1. プロジェクト一覧を最新化
   * 2. 選択中のプロジェクトを復元
   * 3. 選択中のタブのデータを最新化
   */
  const handleProjectReload = useCallback(async () => {
    if (!selectedProject) {
      message.warning('プロジェクトを選択してください');
      return;
    }

    try {
      setIsReloadingProject(true);
      
      console.log('🔄 [ProjectManagement] リロード開始:', {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        currentTab,
      });
      
      // 1. 現在の選択状態を保存
      const currentProjectId = selectedProject.id;
      const currentProjectName = selectedProject.name;
      const currentTabKey = currentTab;
      
      // 2. プロジェクト一覧を最新化
      console.log('📋 [ProjectManagement] プロジェクト一覧を最新化');
      await refetchProjects();
      
      // 3. プロジェクト選択を復元
      console.log('🎯 [ProjectManagement] プロジェクト選択を復元:', currentProjectId);
      setSelectedProjectId(currentProjectId);
      
      // 4. 選択中のタブに応じてデータを最新化
      if (currentTabKey === 'file_management') {
        console.log('📂 [ProjectManagement] ファイル一覧を最新化');
        const fileResponse = await getProjectFiles(currentProjectName, true);
        setProjectFilesData(prev => ({
          ...prev,
          [currentProjectId]: {
            root: fileResponse.files || [],
            archive: fileResponse.archiveFiles || [],
          }
        }));
        console.log('✅ [ProjectManagement] ファイル一覧更新完了:', {
          root: fileResponse.files?.length || 0,
          archive: fileResponse.archiveFiles?.length || 0,
        });
      } else if (currentTabKey === 'task_results') {
        console.log('📋 [ProjectManagement] タスク一覧を最新化');
        const taskResponse = await getProjectTasks(currentProjectName, 'all');
        setProjectTasksData(prev => ({
          ...prev,
          [currentProjectId]: {
            tasks: taskResponse.tasks || [],
            statistics: taskResponse.statistics || {},
          }
        }));
        console.log('✅ [ProjectManagement] タスク一覧更新完了:', {
          tasks: taskResponse.tasks?.length || 0,
        });
      }
      
      // 成功メッセージ
      message.success('プロジェクトの最新情報を読み込みました');
      console.log('✅ [ProjectManagement] リロード完了');
    } catch (error) {
      console.error('❌ [ProjectManagement] リロードエラー:', error);
      message.error('プロジェクトの最新情報の取得に失敗しました');
    } finally {
      setIsReloadingProject(false);
    }
  }, [selectedProject, currentTab, refetchProjects]);

  // 新規プロジェクト作成ハンドラ
  const handleCreateProject = useCallback(async (data: CreateProjectData) => {
    try {
      console.log('🆕 [ProjectManagement] Creating new project:', data);
      
      // API呼び出し用のリクエストデータを作成
      const requestData: CreateProjectRequest = {
        projectName: data.projectName,
        description: data.description || undefined,
      };
      
      // プロジェクト作成APIを呼び出し
      const createdProject = await createProjectApi(requestData);
      
      console.log('✅ [ProjectManagement] Project created successfully:', createdProject);
      
      // プロジェクト一覧を再取得
      await refetchProjects();
      
      // 新しいプロジェクトを選択状態にする
      setSelectedProjectId(createdProject.projectId);
      
      // 成功メッセージを表示
      message.success({
        content: t('projectManagement.create.success') || 'プロジェクトが正常に作成されました',
        duration: 3,
      });
      
      // モーダルを閉じる
      handleCloseCreateModal();
    } catch (error) {
      console.error('❌ [ProjectManagement] Project creation failed:', error);
      
      // エラーメッセージをユーザーに表示
      const errorMessage = error instanceof Error 
        ? error.message 
        : (t('projectManagement.create.error') || 'プロジェクトの作成に失敗しました');
      
      message.error({
        content: errorMessage,
        duration: 5,
      });
      
      // エラーを再スローしてCreateProjectModalでキャッチさせる
      throw error;
    }
  }, [t, handleCloseCreateModal, refetchProjects]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: token.colorBgLayout }}>
      {/* ツールバー */}
      <Card
        variant="borderless"
        style={{
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: 0,
        }}
        styles={{ body: { padding: `${token.margin}px ${token.paddingLG}px` } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {/* 検索・フィルタ */}
        <Space orientation="horizontal" size="small" wrap>
          {/* 所有者絞込 */}
          {/* 所有者絞込 */}
          <Space size={4} orientation="horizontal">
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
          <Space size={4} orientation="horizontal">
            <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
              {t('projectManagement.filter_labels.department')}
            </Text>
            <Select
              style={{ width: 150 }}
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={[
                { value: 'all', label: t('projectManagement.all') },
                ...departments.map(dept => ({
                  value: dept.code,
                  label: dept.name,
                })),
              ]}
            />
          </Space>

          {/* プロジェクトステータス絞込 */}
          <Space size={4} orientation="horizontal">
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
          <Space size={4} orientation="horizontal">
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
          <Space size={4} orientation="horizontal">
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
            onClick={handleProjectReload}
            loading={isReloadingProject}
            disabled={!selectedProject || isReloadingProject}
          >
            {isReloadingProject ? 'リロード中...' : 'リロード'}
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
                variant="borderless"
                style={{
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: 0,
                }}
                styles={{ body: { padding: token.margin } }}
              >
                <Space orientation="vertical" size="small" style={{ width: '100%' }}>
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
                variant="borderless"
                style={{
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: 0,
                }}
                styles={{ body: { padding: token.margin } }}
              >
                <Space size="small">
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={handleProjectDownload}
                    loading={isDownloading}
                    disabled={!selectedProject || isDownloading}
                  >
                    {isDownloading 
                      ? 'ZIPダウンロード中...'
                      : t('projectManagement.project_download')
                    }
                  </Button>
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={handleEditButtonClick}
                    disabled={!selectedProject}
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
                    icon={<ExclamationCircleOutlined />}
                    onClick={handleOpenIssueManagement}
                    style={{ backgroundColor: token.colorWarning, borderColor: token.colorWarning }}
                  >
                    問題確認
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

              {/* タブとコンテンツ */}
              <Tabs
                activeKey={currentTab}
                onChange={async (key) => {
                  const newTab = key as 'file_management' | 'task_results';
                  setCurrentTab(newTab);
                  
                  // タブ切り替え時に最新データを取得
                  if (!selectedProjectId || !selectedProject) return;
                  
                  try {
                    setIsLoadingTabData(true);
                    
                    if (newTab === 'file_management') {
                      // ファイル一覧を最新取得（APIサービスは既に展開済み）
                      console.log('📂 [ProjectManagement] Loading files for tab switch:', selectedProject.name);
                      const fileResponse = await getProjectFiles(selectedProject.name, true); // archiveファイルも取得
                      setProjectFilesData(prev => ({
                        ...prev,
                        [selectedProjectId]: {
                          root: fileResponse.files || [],
                          archive: fileResponse.archiveFiles || [],
                        }
                      }));
                    } else if (newTab === 'task_results') {
                      // タスク一覧を最新取得（APIサービスは既に展開済み）
                      console.log('📋 [ProjectManagement] Loading tasks for tab switch:', selectedProject.name);
                      const taskResponse = await getProjectTasks(selectedProject.name, 'all');
                      setProjectTasksData(prev => ({
                        ...prev,
                        [selectedProjectId]: {
                          tasks: taskResponse.tasks || [],
                          statistics: taskResponse.statistics || {},
                        }
                      }));
                    }
                  } catch (error) {
                    console.error('❌ [ProjectManagement] Tab data loading failed:', error);
                    message.error('データの取得に失敗しました');
                  } finally {
                    setIsLoadingTabData(false);
                  }
                }}
                items={[
                  {
                    key: 'file_management',
                    label: t('projectManagement.tabs.file_management'),
                    children: (
                      <FileListTable
                        files={projectFiles}
                        projectId={selectedProject.id}
                        onFileClick={(file) => console.log('File clicked:', file.name)}
                        onFolderClick={handleFolderClick}
                        onViewFile={handleViewFile}
                      />
                    ),
                  },
                  {
                    key: 'task_results',
                    label: t('projectManagement.tabs.task_results'),
                    children: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* 統計カード */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: token.margin }}>
                      <Card
                        variant="borderless"
                        style={{ backgroundColor: token.colorBgContainer, borderRadius: token.borderRadius }}
                        styles={{ body: { padding: token.margin } }}
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
                        variant="borderless"
                        style={{ backgroundColor: token.colorBgContainer, borderRadius: token.borderRadius }}
                        styles={{ body: { padding: token.margin } }}
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
                        variant="borderless"
                        style={{ backgroundColor: token.colorPrimaryBg, borderRadius: token.borderRadius }}
                        styles={{ body: { padding: token.margin } }}
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
                        variant="borderless"
                        style={{ backgroundColor: token.colorErrorBg, borderRadius: token.borderRadius }}
                        styles={{ body: { padding: token.margin } }}
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
                        variant="borderless"
                        style={{ backgroundColor: token.colorWarningBg, borderRadius: token.borderRadius }}
                        styles={{ body: { padding: token.margin } }}
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
                        variant="borderless"
                        style={{ backgroundColor: token.colorSuccessBg, borderRadius: token.borderRadius }}
                        styles={{ body: { padding: token.margin } }}
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
                    ),
                  },
                ]}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              />
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
        projectId={selectedProject?.id || ''}
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

      {/* Phase 6追加: Draft復元確認ダイアログ */}
      {draftInfo && (
        <DraftRestoreDialog
          open={draftRestoreDialogOpen}
          onClose={() => setDraftRestoreDialogOpen(false)}
          onRestoreDraft={handleRestoreDraft}
          onCreateNew={handleCreateNewOrExisting}
          draftInfo={draftInfo}
        />
      )}

      {/* 問題確認モーダル */}
      {selectedProject && (
        <IssueManagementModal
          visible={issueManagementModalOpen}
          transitionId={selectedProject.id}
          transitionName={selectedProject.name}
          issues={mockIssues}
          onClose={handleCloseIssueManagement}
          viewMode={true}
        />
      )}
    </div>
  );
};

export default ProjectManagement;

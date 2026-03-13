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
  ExclamationCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import ProjectFolderTree from './ProjectFolderTree';
import FileListTable from './FileListTable';
import TaskResultsTable from './TaskResultsTable';
import BulkUploadDialog from './BulkUploadDialog';
import TaskRegistrationTab from './TaskRegistrationTab';
import InstructionRegistrationTab from './InstructionRegistrationTab';
import CreateProjectModal, { CreateProjectData } from './CreateProjectModal';
import ViewRendererDialog from '@/components/viewer/ViewRendererDialog';
import DraftRestoreDialog from '../viewer/DraftRestoreDialog';
import IssueManagementModal from '../ExperimentWorker/IssueManagementModal';
import TransitionSetSearchModal from '@/components/TransitionSetSearch/TransitionSetSearchModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProjectMaimlProvider, useProjectMaiml } from '@/contexts/ProjectMaimlContext';
import { message } from 'antd';
import { useApi } from '@/hooks/useApi';
import {
  downloadFolderAsZip,
} from '@/services/fileAccessService';
import { getProjects } from '@/services/projectApiService';
import {
  getProjectFiles, 
  getProjectTasks,
  createProject as createProjectApi,
  checkoutProject,
  checkinProject,
  completeReviewTasks,
  publishProject,
  type CreateProjectRequest,
  type ApiResponse,
  type ProjectListResponse,
  type MaimlPublishRequest,
} from '@/services/projectApiService';
import { AxiosError } from 'axios';
import type { Project, Task } from '@/types/project';
import type { MaimlEditorParams } from '@/types/maimlEditor';
import { getUserInfo } from '@/utils/sessionStorageHelper';
import type { ProjectFile } from '@/types/file';
import type { InstructionData } from '@/types/instructionRegistration';

const { Title, Text } = Typography;

/**
 * プロジェクトファイルデータ
 */
interface ProjectFilesData {
  root: ProjectFile[];
  archive: ProjectFile[];
}

/**
 * プロジェクト管理画面メインコンポーネント（内部実装）
 */
interface ProjectManagementInnerProps {
  onEdit?: (params: MaimlEditorParams) => void;
  /** 作業者画面を開くコールバック（プロジェクトID・プロジェクト名を渡す） */
  onOpenWorkerScreen?: (projectId: string, projectName: string) => void;
}

const ProjectManagementInner: React.FC<ProjectManagementInnerProps> = ({ onEdit, onOpenWorkerScreen }) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  
  // ProjectMaimlContextを使用
  const { loadMaiml, reloadMaiml, maimlRoot, maimlContent, isLoading: isMaimlLoading } = useProjectMaiml();
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
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [issueManagementModalOpen, setIssueManagementModalOpen] = useState(false);
  const [semanticSearchModalOpen, setSemanticSearchModalOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['folder_active']));
  
  // Phase 6追加: Draft関連のステート
  const [draftRestoreDialogOpen, setDraftRestoreDialogOpen] = useState(false);
  const [draftInfo, setDraftInfo] = useState<{
    savedAt: string;
    methodCount: number;
    nodeCount: number;
  } | null>(null);
  const [currentTab, setCurrentTab] = useState<'file_management' | 'task_results' | 'task_registration' | 'instruction_registration'>('file_management');
  const [projectFilesData, setProjectFilesData] = useState<Record<string, ProjectFilesData>>({});
  const [projectTasksData, setProjectTasksData] = useState<Record<string, { tasks: Task[]; statistics: unknown }>>({});
  const [isLoadingTabData, setIsLoadingTabData] = useState(false);
  
  // 複数ダイアログ管理
  interface OpenDialog {
    id: string;
    contentType: 'file' | 'subnet';
    file?: ProjectFile;
    /** ファイルコンテンツ（Context から渡す場合に使用。未指定時は ViewRendererDialog 内で API 取得） */
    fileContent?: string | null;
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
      // チェックアウトステータスの表示名を取得
      const getCheckoutStatusLabel = (isCheckedOut: boolean) => {
        if (isCheckedOut) {
          return t('projectManagement.checking_out');
        } else {
          return t('projectManagement.checked_in');
        }
      };

      const checkoutStatusLabel = getCheckoutStatusLabel(project.isCheckedOut);

      // 検索クエリでフィルタリング - すべての項目を対象（statusNameも含む）
      const matchesSearch =
        searchQuery === '' ||
        project.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.folderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.statusName && project.statusName.toLowerCase().includes(searchQuery.toLowerCase())) ||
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

      // プロジェクトステータスでフィルタリング（数値で比較）
      let matchesProjectStatus = true;
      if (projectStatusFilter !== 'all') {
        const filterStatusNum = parseInt(projectStatusFilter, 10);
        if (!isNaN(filterStatusNum)) {
          matchesProjectStatus = project.status === filterStatusNum;
        }
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
        // statusは数値なので直接比較
        comparison = a.status - b.status;
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
  const handleProjectSelect = useCallback(async (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentFolder('root'); // プロジェクト切り替え時はルートフォルダを表示
    
    // 選択したプロジェクトのMAIMLを読み込み
    const project = projects.find(p => p.id === projectId);
    if (project) {
      console.log('🎯 [ProjectManagement] プロジェクト選択 - MAIML読み込み開始:', project.name);
      try {
        await loadMaiml(project.name);
        console.log('✅ [ProjectManagement] MAIML読み込み完了');
      } catch (error) {
        console.error('❌ [ProjectManagement] MAIML読み込み失敗:', error);
        // エラーはContextで処理済み（メッセージ表示済み）
      }
    }
  }, [projects, loadMaiml]);

  // フォルダクリック時
  const handleFolderClick = useCallback((folderId: string) => {
    if (folderId === 'back') {
      // 戻るボタン
      setCurrentFolder('root');
    } else {
      setCurrentFolder(folderId);
    }
  }, []);

  // リフレッシュ
  const handleRefresh = useCallback(() => {
    console.log('Refreshing project list...');
    refetchProjects();
  }, [refetchProjects]);

  /**
   * 指示登録タブからの指示送信ハンドラ
   * 
   * @remarks
   * 指示送信後にプロジェクト一覧を再取得して、
   * プロジェクトステータスの更新を反映します。
   */
  const handleInstructionsSubmit = useCallback(async (instructions: InstructionData[]) => {
    console.log('📤 [ProjectManagement] Instructions submitted:', instructions);
    
    try {
      // プロジェクト一覧を再取得してステータス更新を反映
      console.log('🔄 [ProjectManagement] プロジェクト一覧を再取得中...');
      await refetchProjects();
      console.log('✅ [ProjectManagement] プロジェクト一覧の再取得完了');
    } catch (error) {
      console.error('❌ [ProjectManagement] プロジェクト一覧の再取得に失敗:', error);
      // エラーメッセージは表示しない（指示送信自体は成功しているため）
    }
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

  // メソッドの順序変更可否を判定（プロジェクトステータスベース）
  // プロジェクト計画中（status=0）のみ順序変更可能、それ以外は不可
  const isOrderChangeLocked = useMemo(() => {
    if (!selectedProject) return false;
    // プロジェクトステータスが0（プロジェクト計画中）以外は順序変更不可
    return selectedProject.status !== 0;
  }, [selectedProject]);

  // チェックイン/チェックアウト切り替えハンドラ
  const handleToggleCheckout = useCallback(async () => {
    if (!selectedProject) return;

    try {
      if (isProjectCheckedOut) {
        // チェックイン処理
        console.log('🔓 [ProjectManagement] チェックイン開始:', selectedProject.name);
        
        const result = await checkinProject(selectedProject.name);
        
        // チェックイン成功
        console.log('✅ [ProjectManagement] チェックイン成功:', result);
        
        // プロジェクト一覧を再取得してステータス更新を反映
        await refetchProjects();
        
        message.success(`プロジェクト「${selectedProject.name}」をチェックインしました`);
      } else {
        // チェックアウト処理
        console.log('🔒 [ProjectManagement] チェックアウト開始:', selectedProject.name);
        
        const result = await checkoutProject(selectedProject.name);
        
        // チェックアウト成功
        console.log('✅ [ProjectManagement] チェックアウト成功:', result);
        
        // プロジェクト一覧を再取得してステータス更新を反映
        await refetchProjects();
        
        message.success(`プロジェクト「${selectedProject.name}」をチェックアウトしました`);
      }
    } catch (error) {
      console.error('❌ [ProjectManagement] チェックイン/チェックアウトエラー:', error);
      
      // AxiosErrorからエラーレスポンスを取得
      if (error instanceof AxiosError && error.response?.data) {
        const errorData = error.response.data;
        const errorCode = errorData.error?.code || 'UNKNOWN_ERROR';
        const errorMessage = errorData.error?.message || 'チェックイン/チェックアウトに失敗しました';
        const errorDetails = errorData.error?.details;
        
        // エラーコード別のメッセージ表示
        switch (errorCode) {
          case 'TASK_IN_PROGRESS':
            message.error('実行中のタスクが存在するため、チェックインできません');
            break;
          case 'CHECKOUT_NO_MAIML_FILE':
            message.error('MAIMLファイルが存在しません。先にプロジェクトを編集してMAIMLファイルを作成してください。');
            break;
          case 'CHECKOUT_INVALID_STATUS':
            const currentStatus = errorDetails?.currentStatusName || '不明';
            message.error(`プロジェクトステータスがタスク実行待ちではありません（現在: ${currentStatus}）`);
            break;
          case 'CHECKOUT_NO_TASKS':
            message.error('タスクが登録されていません。先にタスク登録タブからタスクを登録してください。');
            break;
          case 'CHECKOUT_UNSENT_INSTRUCTIONS':
            message.error('未送信の指示が存在します。先に指示送信タブから指示を送信してください。');
            break;
          case 'PROJECT_ALREADY_CHECKED_OUT':
            const checkedOutBy = errorDetails?.checkedOutBy || '他のユーザー';
            message.warning(`このプロジェクトは既に${checkedOutBy}によってチェックアウトされています。`);
            break;
          case 'RESOURCE_NOT_FOUND':
            message.error('プロジェクトが見つかりません');
            break;
          default:
            message.error(errorMessage);
        }
      } else {
        message.error('チェックイン/チェックアウト処理中にエラーが発生しました');
      }
    }
  }, [selectedProject, isProjectCheckedOut, refetchProjects]);

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
    const userInfo = getUserInfo();
    const orgId = userInfo?.organizationId ?? '';
    const sourceS3Key = `${orgId}/projects/${selectedProject.name}/${selectedProject.name}.maiml`;
    const params: MaimlEditorParams = {
      editMode: 'project',
      editingFileName: `${selectedProject.name}.maiml`,
      originalFileName: selectedProject.name,
      sourceS3Key,
      displayTitle: selectedProject.name,
      displaySubtitle: selectedProject.description || undefined,
      documentId: selectedProject.id,
      description: selectedProject.description || undefined,
    };
    onEdit?.(params);
  }, [selectedProject, onEdit]);

  // Phase 6追加: Draft復元ハンドラー
  const handleRestoreDraft = useCallback(() => {
    console.log('💾 [ProjectManagement] Restoring draft');
    setDraftRestoreDialogOpen(false);
    if (selectedProject) {
      const userInfo = getUserInfo();
      const orgId = userInfo?.organizationId ?? '';
      const sourceS3Key = `${orgId}/projects/${selectedProject.name}/${selectedProject.name}.maiml`;
      const params: MaimlEditorParams = {
        editMode: 'project',
        editingFileName: `${selectedProject.name}.maiml`,
        originalFileName: selectedProject.name,
        sourceS3Key,
        displayTitle: selectedProject.name,
        displaySubtitle: selectedProject.description || undefined,
        documentId: selectedProject.id,
        description: selectedProject.description || undefined,
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
      const userInfo = getUserInfo();
      const orgId = userInfo?.organizationId ?? '';
      const sourceS3Key = `${orgId}/projects/${selectedProject.name}/${selectedProject.name}.maiml`;
      const params: MaimlEditorParams = {
        editMode: 'project',
        editingFileName: `${selectedProject.name}.maiml`,
        originalFileName: selectedProject.name,
        sourceS3Key,
        displayTitle: selectedProject.name,
        displaySubtitle: selectedProject.description || undefined,
        documentId: selectedProject.id,
        description: selectedProject.description || undefined,
      };
      onEdit?.(params);
    }
  }, [selectedProject, onEdit]);

  // 公開ボタンハンドラ
  const handlePublish = useCallback(async () => {
    if (!selectedProject) {
      message.warning('プロジェクトを選択してください');
      return;
    }
    const request: MaimlPublishRequest = {
      template_only: false,
      store_raw_series: true,
      retention: null,
      keep_raw_on_unpublish: false,
    };
    try {
      console.log('📢 [ProjectManagement] 公開開始:', selectedProject.name);
      await publishProject(selectedProject.name, request);
      message.success(`プロジェクト「${selectedProject.name}」の公開を受け付けました`);
    } catch (error) {
      console.error('❌ [ProjectManagement] 公開エラー:', error);
      if (error instanceof AxiosError && error.response?.data) {
        const msg = error.response.data.error?.message || '公開処理に失敗しました';
        message.error(msg);
      } else {
        message.error('公開処理に失敗しました');
      }
    }
  }, [selectedProject]);

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

    /**
     * プロジェクト直下（root）の最新 MAIMLファイルであれば
     * Context に既にロード済みの maimlContent を渡す（API 二重取得を防ぐ）。
     * アーカイブファイルや非 MAIML ファイルは undefined を渡し、
     * ViewRendererDialog 内で都度 API 取得させる。
     */
    let passedFileContent: string | null | undefined = undefined;
    if (
      file.type === 'maiml' &&
      currentFolder === 'root' &&
      selectedProject &&
      maimlContent !== undefined
    ) {
      // Context のキャッシュを渡す（null = ファイルなし も正常値として渡す）
      passedFileContent = maimlContent;
      console.log(
        '📋 [ProjectManagement] Context の maimlContent をビューアに渡す:',
        file.name,
        { contentLength: maimlContent?.length ?? 0 }
      );
    }

    const newDialog: OpenDialog = {
      id,
      contentType: 'file',  // ファイル表示
      file,
      fileContent: passedFileContent,
      zIndex: nextZIndex,
      position: { x: 100 + offset, y: 100 + offset }
    };
    
    setOpenDialogs(prev => [...prev, newDialog]);
    setNextZIndex(prev => prev + 1);
  }, [openDialogs, nextZIndex, currentFolder, selectedProject, maimlContent]);

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
   * 2. 選択中のプロジェクトを復元（プロジェクト選択中の場合のみ）
   * 3. 選択中のタブのデータを最新化（プロジェクト選択中の場合のみ）
   * 4. MAIMLデータを最新化（プロジェクト選択中の場合のみ）
   * 
   * @remarks プロジェクト未選択時はプロジェクト一覧のみ再取得する
   */
  const handleProjectReload = useCallback(async () => {
    try {
      setIsReloadingProject(true);
      
      console.log('🔄 [ProjectManagement] リロード開始:', {
        projectId: selectedProject?.id,
        projectName: selectedProject?.name,
        currentTab,
      });
      
      // 1. プロジェクト一覧を最新化（プロジェクト未選択時もこれだけ実行）
      console.log('📋 [ProjectManagement] プロジェクト一覧を最新化');
      await refetchProjects();
      
      // プロジェクトが選択されていない場合はここで終了
      if (!selectedProject) {
        message.success('プロジェクト一覧を更新しました');
        console.log('✅ [ProjectManagement] プロジェクト一覧のみ更新完了（プロジェクト未選択）');
        return;
      }
      
      // 2. 現在の選択状態を保存
      const currentProjectId = selectedProject.id;
      const currentProjectName = selectedProject.name;
      const currentTabKey = currentTab;
      
      // 3. プロジェクト選択を復元
      console.log('🎯 [ProjectManagement] プロジェクト選択を復元:', currentProjectId);
      setSelectedProjectId(currentProjectId);
      
      // 4. MAIMLデータを最新化
      console.log('📄 [ProjectManagement] MAIMLデータを最新化');
      try {
        await reloadMaiml();
        console.log('✅ [ProjectManagement] MAIML更新完了');
      } catch (error) {
        console.error('❌ [ProjectManagement] MAIML更新失敗:', error);
        // エラーはContextで処理済み（メッセージ表示済み）
      }
      
      // 5. 選択中のタブに応じてデータを最新化
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
  }, [selectedProject, currentTab, refetchProjects, reloadMaiml]);

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
                { value: '0', label: t('projectManagement.status_planning') },
                { value: '1', label: t('projectManagement.status_pending') },
                { value: '2', label: t('projectManagement.status_in_progress') },
                { value: '3', label: t('projectManagement.status_review_waiting') },
                { value: '4', label: t('projectManagement.status_completed') },
                { value: '5', label: t('projectManagement.status_error') },
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

        </Space>

        {/* 右側のアクションボタン */}
        <Space size="small">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }}
            onClick={handleOpenCreateModal}
            data-testid="create-project-button"
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
            disabled={isReloadingProject}
          >
            {isReloadingProject ? 'リロード中...' : 'リロード'}
          </Button>
          <Button
            icon={<SearchOutlined />}
            onClick={() => setSemanticSearchModalOpen(true)}
          >
            トランジション検索
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
                    {/* プロジェクトステータス表示（statusNameを使用） */}
                    {selectedProject.statusName && (
                      <Tag 
                        color={
                          selectedProject.status === 0 ? 'default' : // プロジェクト計画中
                          selectedProject.status === 1 ? 'blue' :     // タスク実行待ち
                          selectedProject.status === 2 ? 'cyan' :     // タスク実行中
                          selectedProject.status === 3 ? 'purple' :   // 承認待ち
                          selectedProject.status === 4 ? 'success' :  // プロジェクト完了
                          selectedProject.status === 5 ? 'error' :    // タスク異常終了
                          'default'
                        }
                      >
                        {selectedProject.statusName}
                      </Tag>
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
                    data-testid="project-download-button"
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
                    style={{ backgroundColor: token.colorInfo, borderColor: token.colorInfo }}
                    onClick={handlePublish}
                    disabled={!selectedProject}
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
                    key: 'task_registration',
                    label: t('projectManagement.tabs.task_registration'),
                    children: (
                      <TaskRegistrationTab
                        projectId={selectedProject.id}
                        projectName={selectedProject.name}
                        isActive={currentTab === 'task_registration'}
                        isCheckoutLocked={isProjectCheckedOut}
                      />
                    ),
                  },
                  {
                    key: 'instruction_registration',
                    label: t('projectManagement.tabs.instruction_registration'),
                    children: (
                      <InstructionRegistrationTab
                        projectId={selectedProject.id}
                        projectName={selectedProject.name}
                        isActive={currentTab === 'instruction_registration'}
                        isCheckoutLocked={isProjectCheckedOut}
                        onInstructionsSubmit={handleInstructionsSubmit}
                      />
                    ),
                  },
                  {
                    key: 'task_results',
                    label: t('projectManagement.tabs.task_results'),
                    children: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* ボタンエリア */}
                        <Flex justify="flex-end" gap="small">
                          <Button
                            type="default"
                            icon={<UserOutlined />}
                            onClick={() => onOpenWorkerScreen?.(selectedProject.id, selectedProject.name)}
                            disabled={!isProjectCheckedOut}
                            title={!isProjectCheckedOut ? 'チェックアウト後に操作できます' : undefined}
                          >
                            作業確認
                          </Button>
                          <Button
                            type="primary"
                            style={{ marginRight: 16 }}
                            disabled={taskStats.review_waiting === 0}
                            title={taskStats.review_waiting === 0 ? 'レビュー待ちのタスクがありません' : undefined}
                            onClick={async () => {
                              if (!selectedProject) return;
                              try {
                                const res = await completeReviewTasks(selectedProject.name);
                                message.success(res.data?.message || 'レビュー待ちタスクを完了に更新しました');
                                // タスク一覧を再取得
                                const taskResponse = await getProjectTasks(selectedProject.name, 'all');
                                setProjectTasksData(prev => ({
                                  ...prev,
                                  [selectedProjectId!]: {
                                    tasks: taskResponse.tasks || [],
                                    statistics: taskResponse.statistics || {},
                                  }
                                }));
                              } catch {
                                message.error('タスク確認完了処理に失敗しました');
                              }
                            }}
                          >
                            タスク確認完了
                          </Button>
                        </Flex>
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

      {/* 一括アップロードダイアログ */}
      <BulkUploadDialog
        open={uploadDialogOpen}
        onClose={handleCloseUploadDialog}
        onUploadComplete={handleUploadComplete}
        projectId={selectedProject?.id || ''}
        preselectedFolder={selectedProject?.folderName || ''}
      />

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
          fileContent={dialog.fileContent}
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
          targetName={selectedProject.name}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          onClose={handleCloseIssueManagement}
          viewMode={selectedProject.status === 4}
        />
      )}

      {/* セマンティック検索モーダル */}
      <TransitionSetSearchModal
        open={semanticSearchModalOpen}
        onClose={() => setSemanticSearchModalOpen(false)}
        initialProjectName={selectedProject?.name}
        onOpenProject={(projectName) => {
          // プロジェクト名からIDを検索して選択する
          const target = projects.find((p) => p.name === projectName);
          if (target) {
            handleProjectSelect(target.id);
          }
        }}
      />
    </div>
  );
};

/**
 * プロジェクト管理画面メインコンポーネント（Provider付き）
 */
interface ProjectManagementProps {
  onEdit?: (params: MaimlEditorParams) => void;
  /** 作業者画面を開くコールバック（プロジェクトID・プロジェクト名を渡す） */
  onOpenWorkerScreen?: (projectId: string, projectName: string) => void;
}

const ProjectManagement: React.FC<ProjectManagementProps> = (props) => {
  return (
    <ProjectMaimlProvider>
      <ProjectManagementInner {...props} />
    </ProjectMaimlProvider>
  );
};

export default ProjectManagement;

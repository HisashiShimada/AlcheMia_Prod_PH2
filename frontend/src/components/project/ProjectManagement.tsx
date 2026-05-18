'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  App,
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
  Modal,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
  EditOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import MaimlValidationModal from './MaimlValidationModal';
import ProjectFolderTree from './ProjectFolderTree';
import FileListTable from './FileListTable';
import TaskResultsTable from './TaskResultsTable';
import BulkUploadDialog from './BulkUploadDialog';
import TaskRegistrationTab from './TaskRegistrationTab';
import InstructionRegistrationTab from './InstructionRegistrationTab';
import CreateProjectModal from './CreateProjectModal';
import type { CreateProjectData } from '@/types/project';
import RenameProjectModal from './RenameProjectModal';
import MaimlPublishDialog from './MaimlPublishDialog';
import MaimlUnpublishDialog from './MaimlUnpublishDialog';
import { usePublishStatusPoller } from '@/hooks/usePublishStatusPoller';
import ViewRendererDialog from '@/components/viewer/ViewRendererDialog';
import DraftRestoreDialog from '../viewer/DraftRestoreDialog';
import { fetchDrafts, deleteDraft } from '@/services/draftService';
import IssueManagementModal from '../ExperimentWorker/IssueManagementModal';
import TransitionSetSearchModal from '@/components/TransitionSetSearch/TransitionSetSearchModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProjectStatus } from '@/constants/codeMaster';
import { ProjectMaimlProvider, useProjectMaiml } from '@/contexts/ProjectMaimlContext';
import { useApi } from '@/hooks/useApi';
import {
  downloadFolderAsZip,
  deleteFileByKey,
  deleteFolderByPath,
} from '@/services/fileAccessService';
import { getProjects, getProjectMaiml } from '@/services/projectApiService';
import {
  getProjectFiles, 
  getProjectTasks,
  createProject as createProjectApi,
  checkoutProject,
  checkinProject,
  completeReviewTasks,
  getPublishStatus,
  deleteProject as deleteProjectApi,
} from '@/services/projectApiService';
import type { CreateProjectRequest, ProjectListResponse, PublishStatusResponse } from '@/types/project';
import type { ServiceApiResponse as ApiResponse } from '@/types/api';
import { AxiosError } from 'axios';
import { mapErrorToMessage } from '@/utils/errorUtils';
import type { Project, Task, ProjectFilesData } from '@/types/project';
import type { MaimlEditorParams } from '@/types/maimlEditor';
import type { Draft } from '@/types/editor';
import { getUserInfo } from '@/utils/sessionStorageHelper';
import type { ProjectFile } from '@/types/file';
import type { InstructionData } from '@/types/instructionRegistration';
import {
  validateMaiml,
  getAnalysisResult,
} from '@/services/maimlApiService';
import type { MaimlAnalysisResultRow } from '@/types/maimlEditor';
import { Tooltip } from 'antd';

const { Title, Text } = Typography;

/**
 * プロジェクト管理画面メインコンポーネント（内部実装）
 */
interface ProjectManagementInnerProps {
  onEdit?: (params: MaimlEditorParams) => void;
  /** 作業者画面を開くコールバック（プロジェクトID・プロジェクト名を渡す） */
  onOpenWorkerScreen?: (projectId: string, projectName: string) => void;
}

const ProjectManagementInner: React.FC<ProjectManagementInnerProps> = ({ onEdit, onOpenWorkerScreen }) => {
  const { message } = App.useApp();
  const { t } = useLanguage();
  const { token } = theme.useToken();
  
  // ProjectMaimlContextを使用
  const { loadMaiml, reloadMaiml, maimlRoot, maimlContent, isLoading: isMaimlLoading } = useProjectMaiml();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    // ペトリネット編集画面から戻った際に検索クエリを復元
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('projectManagement_searchQuery') ?? '';
    }
    return '';
  });
  const [ownerFilter, setOwnerFilter] = useState<string>(() => {
    // ペトリネット編集画面から戻った際にオーナーフィルタを復元
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('projectManagement_ownerFilter') ?? 'my_only';
    }
    return 'my_only';
  }); // my_only, all
  const [checkoutFilter, setCheckoutFilter] = useState<string>(() => {
    // ペトリネット編集画面から戻った際にチェックアウトフィルタを復元
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('projectManagement_checkoutFilter') ?? 'all';
    }
    return 'all';
  }); // all, checked_in, checked_out
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>(() => {
    // ペトリネット編集画面から戻った際にプロジェクトステータスフィルタを復元
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('projectManagement_projectStatusFilter') ?? 'all';
    }
    return 'all';
  }); // all, planning, pending, in_progress, completed
  const [departmentFilter, setDepartmentFilter] = useState<string>(() => {
    // ペトリネット編集画面から戻った際に部門フィルタを復元
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('projectManagement_departmentFilter') ?? 'all';
    }
    return 'all';
  }); // 初期値: 全部門
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    // 編集画面から戻った際に直前の選択状態を復元
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('projectManagement_selectedProjectId') ?? null;
    }
    return null;
  });
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'createdAt'>(() => {
    // ペトリネット編集画面から戻った際にソート項目を復元
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('projectManagement_sortBy');
      if (saved === 'name' || saved === 'status' || saved === 'createdAt') {
        return saved;
      }
    }
    return 'createdAt';
  }); // ソート項目
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    // ペトリネット編集画面から戻った際にソート順序を復元
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('projectManagement_sortOrder');
      if (saved === 'asc' || saved === 'desc') {
        return saved;
      }
    }
    return 'desc';
  }); // ソート順序
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [issueManagementModalOpen, setIssueManagementModalOpen] = useState(false);
  const [semanticSearchModalOpen, setSemanticSearchModalOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['folder_active']));
  
  // Phase 6追加: Draft関連のステート
  const [draftRestoreDialogOpen, setDraftRestoreDialogOpen] = useState(false);
  /** バックエンドDraft（DB保存）が存在するかどうか */
  const [hasBackendDraft, setHasBackendDraft] = useState(false);
  /** 復元対象のDraftオブジェクト（projectId特定用） */
  const [draftToRestore, setDraftToRestore] = useState<Draft | null>(null);
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

  // 公開ステータス状態管理
  const [publishStatus, setPublishStatus] = useState<PublishStatusResponse | null>(null);
  const [publishStatusLoading, setPublishStatusLoading] = useState(false);

  // 公開/非公開ダイアログ状態
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);

  // ポーリング中フラグ（ボタンにスピナー表示用）
  const [isPolling, setIsPolling] = useState(false);

  // プロジェクト名変更モーダル状態
  const [renameModalOpen, setRenameModalOpen] = useState(false);

  // バリデーション関連ステート
  const [isValidating, setIsValidating] = useState(false);
  const [savedValidationRow, setSavedValidationRow] = useState<MaimlAnalysisResultRow | null>(null);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);

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
      message.error(t('project.fetchListFailed'));
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

      // 検索クエリでフィルタリング - 一覧表示項目かつドロップダウンフィルタなしの項目のみ
      // 対象: プロジェクト名、説明、オーナー名
      // 除外: ステータス名・チェックアウト状態・部門（ドロップダウンフィルタあり）、
      //       内部ID・日時・タグ（非表示・重複・未実装）
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        (project.name ?? '').toLowerCase().includes(q) ||
        (project.description ?? '').toLowerCase().includes(q) ||
        (project.ownerName ?? '').toLowerCase().includes(q);

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
    if (!project) return;

    console.log('🎯 [ProjectManagement] プロジェクト選択 - MAIML読み込み開始:', project.id);
    try {
      await loadMaiml(project.id);
      console.log('✅ [ProjectManagement] MAIML読み込み完了');
    } catch (error) {
      console.error('❌ [ProjectManagement] MAIML読み込み失敗:', error);
      // エラーはContextで処理済み（メッセージ表示済み）
    }

    // 現在選択中のタブのデータを再取得（プロジェクト変更時）
    try {
      setIsLoadingTabData(true);

      if (currentTab === 'file_management') {
        console.log('📂 [ProjectManagement] プロジェクト変更 - ファイル一覧を再取得:', project.name);
        const fileResponse = await getProjectFiles(project.id, true);
        setProjectFilesData(prev => ({
          ...prev,
          [projectId]: {
            root: fileResponse.files || [],
            subFolderFiles: fileResponse.subFolderFiles || {},
          }
        }));
      } else if (currentTab === 'task_results') {
        console.log('📋 [ProjectManagement] プロジェクト変更 - タスク一覧を再取得:', project.name);
        const taskResponse = await getProjectTasks(project.id, 'all');
        setProjectTasksData(prev => ({
          ...prev,
          [projectId]: {
            tasks: taskResponse.tasks || [],
            statistics: taskResponse.statistics || {},
          }
        }));
      }
      // task_registration / instruction_registration は
      // コンポーネント内部で projectId の変更を検知して自動更新するため不要
    } catch (error) {
      console.error('❌ [ProjectManagement] タブデータ取得失敗:', error);
      message.error(t('project.dataFetchFailed'));
    } finally {
      setIsLoadingTabData(false);
    }
  }, [projects, loadMaiml, currentTab, getProjectFiles, getProjectTasks]);

  // フォルダクリック時
  const handleFolderClick = useCallback((folderId: string) => {
    if (folderId === 'back') {
      // 戻るボタン: 1階層上へ
      const parts = currentFolder.split('/');
      if (parts.length <= 1) {
        setCurrentFolder('root');
      } else {
        parts.pop();
        setCurrentFolder(parts.join('/'));
      }
    } else {
      // サブフォルダへ潜る
      // バックエンドのフォルダエントリ id は "folder_${folderName}" 形式のため
      // "folder_" プレフィックスを除去してフォルダ名のみを currentFolder にセットする
      const folderName = folderId.startsWith('folder_')
        ? folderId.substring('folder_'.length)
        : folderId;
      if (currentFolder === 'root') {
        setCurrentFolder(folderName);
      } else {
        setCurrentFolder(`${currentFolder}/${folderName}`);
      }
    }
  }, [currentFolder]);

  // リフレッシュ
  // プロジェクト一覧を最新化し、プロジェクトが選択されていれば MAIML も再取得する。
  // リロードボタン押下時・編集画面から戻った際の両方で使用する共通処理。
  const handleRefresh = useCallback(async () => {
    console.log('Refreshing project list...');
    await refetchProjects();

    // プロジェクトが選択されていれば MAIML も最新化（編集後のキャッシュ更新）
    if (selectedProjectId) {
      try {
        console.log('🔄 [ProjectManagement] リフレッシュ後 MAIML 更新開始:', selectedProjectId);
        await loadMaiml(selectedProjectId);
        console.log('✅ [ProjectManagement] リフレッシュ後 MAIML 更新完了');
      } catch (error) {
        // エラーは Context 側でハンドリング済み
      }
    }
  }, [refetchProjects, selectedProjectId, loadMaiml]);

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
  const handleUploadComplete = useCallback(async (result: {
    mode: string;
    fileCount: number;
    success: boolean;
    hasMaimlFile?: boolean;
  }) => {
    console.log('Upload completed:', result);

    // refetchProjects() の前に currentProject を取得する。
    // refetchProjects() は非同期 state 更新のため、呼び出し後に projects.find() しても
    // Reactの state がまだ古い値のままである可能性があり、project_uuid などの最新値が
    // 取得できない。そのため先に取得しておく。
    const currentProject = selectedProjectId
      ? projects.find(p => p.id === selectedProjectId) ?? null
      : null;

    // MAIMLアップロードが更新か新規かを判断するため、refetch前に保持する
    // project_uuid が設定済み、または maimlFileKey が存在する場合は「既存MAIMLあり」と判断する
    // （project_uuid は古いプロジェクトでは未設定の場合があるため maimlFileKey も判定に使用）
    const hadProjectUuid = result.hasMaimlFile
      ? (currentProject?.project_uuid != null || currentProject?.maimlFileKey != null)
      : false;

    // プロジェクト一覧を再取得（MAIMLファイルのフラグ更新は削除API側で自動実行）
    await refetchProjects();
    handleRefresh();

    if (currentProject) {
      try {
        console.log('📂 [ProjectManagement] アップロード後ファイル一覧を最新化:', currentProject.name);
        const fileResponse = await getProjectFiles(currentProject.id, true);
        setProjectFilesData(prev => ({
          ...prev,
          [currentProject.id]: {
            root: fileResponse.files || [],
            subFolderFiles: fileResponse.subFolderFiles || {},
          }
        }));
        console.log('✅ [ProjectManagement] アップロード後ファイル一覧更新完了');
      } catch (error) {
        console.error('❌ [ProjectManagement] アップロード後ファイル一覧更新失敗:', error);
      }

        // MAIMLファイルがアップロードされた場合はMAIMLもリロード
      if (result.hasMaimlFile) {
        try {
          console.log('📄 [ProjectManagement] アップロード後MAIMLをリロード');
          await reloadMaiml();
          console.log('✅ [ProjectManagement] アップロード後MAIMLリロード完了');
        } catch (error) {
          console.error('❌ [ProjectManagement] アップロード後MAIMLリロード失敗:', error);
          // エラーはContextで処理済み
        }

        // アップロード後にバリデーションを再実行してDBに最新結果を保存し、表示を更新する
        // refetchProjects() は React state を非同期更新するため、コンポーネントの再レンダリング前は
        // selectedProject / currentProject が古い値（maimlFileKey=null）のまま。
        // そのため getProjects() を直接呼び出して最新の maimlFileKey を確定させてから実行する。
        try {
          console.log('🔍 [ProjectManagement] アップロード後バリデーション再実行（最新プロジェクト情報を直接取得）');
          const latestProjectsRes = await getProjects();
          const latestProjectsList = Array.isArray(latestProjectsRes.data)
            ? latestProjectsRes.data
            : ((latestProjectsRes.data as ProjectListResponse)?.projects || []);
          const latestProject = latestProjectsList.find((p: Project) => p.id === currentProject.id) ?? null;
          // 最新プロジェクト情報から maimlFileKey を取得。取得できない場合は currentProject の値をフォールバックとして使用
          const fileKeyForValidation = latestProject?.maimlFileKey ?? currentProject?.maimlFileKey;
          if (fileKeyForValidation) {
            // reloadMaiml() は Context の state を更新するが、React state はレンダリングが完了するまで
            // クロージャ内で古い値のままとなる。そのため getProjectMaiml() を直接呼んで
            // 最新のMAIMLコンテンツを取得してからバリデーションを実行する。
            setIsValidating(true);
            try {
              const maimlRes = await getProjectMaiml(currentProject.id);
              const latestMaimlContent = maimlRes.data?.maimlContent ?? null;
              if (latestMaimlContent) {
                const base64Content = btoa(unescape(encodeURIComponent(latestMaimlContent)));
                await validateMaiml(base64Content, {
                  fileKey: fileKeyForValidation,
                  skipAnalysisSave: false,
                });
              }
            } catch {
              console.warn('⚠️ [ProjectManagement] アップロード後バリデーション実行失敗（無視）');
            } finally {
              setIsValidating(false);
            }
            // DB から最新バリデーション結果を取得して表示を更新
            const analysisRes = await getAnalysisResult(fileKeyForValidation);
            setSavedValidationRow(analysisRes.data ?? null);
            console.log('✅ [ProjectManagement] バリデーション結果リフレッシュ完了:', fileKeyForValidation);
          } else {
            console.warn('⚠️ [ProjectManagement] maimlFileKey が取得できなかったためバリデーション結果の取得をスキップ');
          }
        } catch (error) {
          console.warn('⚠️ [ProjectManagement] バリデーション結果リフレッシュ失敗（無視）:', error);
        }

        // UUID一致による更新アップロードだった場合の警告
        // refetch前に保持した hadProjectUuid で判断する
        if (hadProjectUuid) {
          message.warning(
            t('project.maimlFileUpdatedWarning'),
            8  // 8秒間表示
          );
        }
      }
    }
  }, [handleRefresh, refetchProjects, selectedProjectId, projects, getProjectFiles, reloadMaiml]);

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
        const fileResponse = await getProjectFiles(selectedProject.id, true); // archiveファイルも取得
        
        const filesData: ProjectFilesData = {
          root: fileResponse.files || [],
          subFolderFiles: fileResponse.subFolderFiles || {},
        };
        
        console.log('✅ [ProjectManagement] Files loaded:', {
          root: filesData.root.length,
          subFolderKeys: Object.keys(filesData.subFolderFiles),
        });
        
        setProjectFilesData(prev => ({
          ...prev,
          [selectedProjectId]: filesData
        }));
      } catch (error) {
        console.error('❌ [ProjectManagement] Failed to fetch project files:', error);
        message.error(t('formatManagement.messages.file_list_load_failed'));
      }
    };
    
    loadProjectFiles();
  // selectedProject?.id を依存に追加:
  // 再マウント時に selectedProjectId は sessionStorage から即座に復元されるが、
  // その時点では projects が空で selectedProject === null になる。
  // その後 API レスポンスで projects が揃い selectedProject が有効になった時点で
  // 再実行されるようにするために selectedProject?.id を依存配列に含める。
  // selectedProject の参照変化（楽観的更新など ID が変わらないケース）では
  // selectedProject?.id は変化しないため、不要な再発火は発生しない。
  }, [selectedProjectId, selectedProject?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const projectFiles = useMemo((): ProjectFile[] => {
    if (!selectedProjectId) {
      return [];
    }
    
    const projectData = projectFilesData[selectedProjectId];
    if (!projectData) {
      return [];
    }
    
    if (currentFolder === 'root') {
      // ルートフォルダの場合、バックエンドが files[] にルート直下ファイル +
      // サブフォルダエントリ（isFolder:true）を含めて返すのでそのまま返す。
      // archive フォルダはファイルが空の場合にフォルダエントリごと非表示にする。
      const rootFiles = projectData.root || [];
      const subFolderFiles = projectData.subFolderFiles || {};

        return rootFiles.filter((file) => {
        if (!file.isFolder) return true;
        // archive フォルダはファイルが存在する場合のみ表示
        if (file.name === 'archive') {
          return (subFolderFiles['archive']?.length ?? 0) > 0;
        }
        return true;
      });
    } else {
      // サブフォルダの中身を表示
      // currentFolder例: "rawdata" or "rawdata/sub"
      // バックエンドは topFolder (先頭セグメント) をキーとして全ファイルをフラットに持つ
      const segments = currentFolder.split('/');
      const topFolder = segments[0];
      const allFilesInFolder = (projectData.subFolderFiles || {})[topFolder] || [];

      // currentFolder 直下のみ表示するためにフィルタリング
      // file.path 例: "projects/ProjectName/rawdata/sub/file.csv"
      // projectName を除去した相対パスで判定する
      const projectName = selectedProject?.name || '';

      // currentFolder 相対パスのプレフィックス (topFolder以降)
      // currentFolder="rawdata"   → subPath=""
      // currentFolder="rawdata/sub" → subPath="sub"
      const subPath = segments.slice(1).join('/'); // topFolder より下のパス

      // 直下のファイルとサブフォルダを収集
      const directFiles: ProjectFile[] = [];
      const childFolders = new Set<string>();

      for (const file of allFilesInFolder) {
        // file.path = "projects/ProjectName/rawdata/..."
        // topFolder 以降の相対パスを取得
        const prefix = `projects/${projectName}/${topFolder}/`;
        const relFromTop = file.path.startsWith(prefix)
          ? file.path.substring(prefix.length)
          : '';

        // subPath が空 → rawdata 直下を見る
        // subPath が "sub" → rawdata/sub 直下を見る
        const checkPath = subPath ? `${subPath}/` : '';
        if (!relFromTop.startsWith(checkPath)) continue;

        const remainder = relFromTop.substring(checkPath.length); // checkPath以降
        const remainderParts = remainder.split('/').filter(s => s !== '');

        if (remainderParts.length === 1) {
          // 直下のファイル
          directFiles.push(file);
        } else if (remainderParts.length >= 2) {
          // さらに深いサブフォルダ → フォルダエントリとして表示
          childFolders.add(remainderParts[0]);
        }
      }

      // サブフォルダエントリを生成
      const folderEntries: ProjectFile[] = Array.from(childFolders).map(folderName => ({
        id: `folder_${folderName}`,
        name: folderName,
        path: `projects/${projectName}/${currentFolder}/${folderName}`,
        size: 0,
        lastModified: '',
        type: 'folder',
        isFolder: true,
      }));

      const backButton: ProjectFile = {
        id: 'back',
        name: t('projectManagement.backButton'),
        path: '',
        size: 0,
        lastModified: '',
        type: 'folder',
        isFolder: true,
      };
      return [backButton, ...folderEntries, ...directFiles];
    }
    
    return [];
  }, [selectedProjectId, currentFolder, selectedProject, projectFilesData]);

  // プロジェクトにファイルが存在するかを判定（ダウンロードボタンの活性化制御）
  const hasProjectFiles = useMemo(() => {
    if (!selectedProjectId) return false;
    const projectData = projectFilesData[selectedProjectId];
    if (!projectData) return false;
    // ルート直下に実ファイル（フォルダ以外）が存在するか確認
    const rootFiles = (projectData.root || []).filter(f => !f.isFolder);
    if (rootFiles.length > 0) return true;
    // サブフォルダにファイルが存在するか確認
    const subFolderFiles = projectData.subFolderFiles || {};
    return Object.values(subFolderFiles).some(files => files.length > 0);
  }, [selectedProjectId, projectFilesData]);

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
      forced_terminated: 0,
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
        case 'forced_terminated':
          stats.forced_terminated++;
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

  // プロジェクトがチェックアウト中かどうかを判定（プロジェクト単位）
  const isProjectCheckedOut = useMemo(() => {
    return selectedProject?.isCheckedOut === true;
  }, [selectedProject]);

  // メソッドの順序変更可否を判定（プロジェクトステータスベース）
  // プロジェクト計画中（status=0）のみ順序変更可能、それ以外は不可
  const isOrderChangeLocked = useMemo(() => {
    if (!selectedProject) return false;
    // プロジェクトステータスが0（プロジェクト計画中）以外は順序変更不可
    return selectedProject.status !== ProjectStatus.PLANNING;
  }, [selectedProject]);

  // チェックイン/チェックアウト切り替えハンドラ
  const handleToggleCheckout = useCallback(async () => {
    if (!selectedProject) return;

    try {
      if (isProjectCheckedOut) {
        // チェックイン処理
        console.log('🔓 [ProjectManagement] チェックイン開始:', selectedProject.name);
        
        const result = await checkinProject(selectedProject.id);
        
        // チェックイン成功
        console.log('✅ [ProjectManagement] チェックイン成功:', result);
        
        // プロジェクト一覧を再取得してステータス更新を反映
        await refetchProjects();
        
        message.success(t('project.checkinSuccess').replace('{name}', selectedProject.name));
      } else {
        // チェックアウト処理
        console.log('🔒 [ProjectManagement] チェックアウト開始:', selectedProject.name);
        
        const result = await checkoutProject(selectedProject.id);
        
        // チェックアウト成功
        console.log('✅ [ProjectManagement] チェックアウト成功:', result);
        
        // プロジェクト一覧を再取得してステータス更新を反映
        await refetchProjects();
        
        message.success(t('project.checkoutSuccess').replace('{name}', selectedProject.name));
      }
    } catch (error) {
      console.error('❌ [ProjectManagement] チェックイン/チェックアウトエラー:', error);
      
      // AxiosErrorからエラーレスポンスを取得
      if (error instanceof AxiosError && error.response?.data) {
        const errorData = error.response.data;
        const errorCode = errorData.error?.code || 'UNKNOWN_ERROR';
        const errorMessage = errorData.error?.message || t('project.checkInOutError');
        const errorDetails = errorData.error?.details;
        
        // エラーコード別のメッセージ表示
        switch (errorCode) {
          case 'TASK_IN_PROGRESS':
            message.error(t('project.checkinErrorTaskInProgress'));
            break;
          case 'CHECKOUT_NO_MAIML_FILE':
            message.error(t('project.checkoutErrorNoMaiml'));
            break;
          case 'CHECKOUT_INVALID_STATUS':
            const currentStatus = errorDetails?.currentStatusName || t('common.unknown');
            message.error(t('project.checkoutErrorInvalidStatus').replace('{status}', currentStatus));
            break;
          case 'CHECKOUT_NO_TASKS':
            message.error(t('project.checkoutErrorNoTasks'));
            break;
          case 'CHECKOUT_UNSENT_INSTRUCTIONS':
            message.error(t('project.checkoutErrorUnsentInstructions'));
            break;
          case 'PROJECT_ALREADY_CHECKED_OUT':
            const checkedOutBy = errorDetails?.checkedOutBy || t('common.otherUser');
            message.warning(t('project.checkoutWarningAlreadyCheckedOut').replace('{user}', checkedOutBy));
            break;
          case 'RESOURCE_NOT_FOUND':
            message.error(t('project.notFound'));
            break;
          default:
            message.error(errorMessage);
        }
      } else {
        message.error(t('project.checkInOutError'));
      }
    }
  }, [selectedProject, isProjectCheckedOut, refetchProjects]);

  // 問題確認モーダルを開く
  const handleOpenIssueManagement = useCallback(() => {
    if (!selectedProject) {
      message.warning(t('project.selectProjectWarning'));
      return;
    }
    setIssueManagementModalOpen(true);
  }, [selectedProject]);

  // 問題確認モーダルを閉じる
  const handleCloseIssueManagement = useCallback(() => {
    setIssueManagementModalOpen(false);
  }, []);

  // selectedProjectId を sessionStorage に保存（編集画面から戻った際に復元するため）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedProjectId) {
      sessionStorage.setItem('projectManagement_selectedProjectId', selectedProjectId);
    } else {
      sessionStorage.removeItem('projectManagement_selectedProjectId');
    }
  }, [selectedProjectId]);

  // フィルタ・ソート状態を sessionStorage に保存（ペトリネット編集画面から戻った際に復元するため）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('projectManagement_searchQuery', searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('projectManagement_ownerFilter', ownerFilter);
  }, [ownerFilter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('projectManagement_checkoutFilter', checkoutFilter);
  }, [checkoutFilter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('projectManagement_projectStatusFilter', projectStatusFilter);
  }, [projectStatusFilter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('projectManagement_departmentFilter', departmentFilter);
  }, [departmentFilter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('projectManagement_sortBy', sortBy);
  }, [sortBy]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('projectManagement_sortOrder', sortOrder);
  }, [sortOrder]);

  // 編集画面から戻った際のリフレッシュ処理
  // 初回マウント時に selectedProjectId が sessionStorage から復元済みの場合、
  // handleRefresh を呼び出してプロジェクト一覧と MAIML を最新化する。
  // hasInitialRefreshRef により Strict Mode の二重発火を防ぐ。
  const hasInitialRefreshRef = useRef(false);
  useEffect(() => {
    if (hasInitialRefreshRef.current) return;
    hasInitialRefreshRef.current = true;

    if (selectedProjectId) {
      console.log('🔄 [ProjectManagement] 初期マウント - selectedProjectId 復元検知、リフレッシュ実行:', selectedProjectId);
      handleRefresh();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 5-2追加: 初期表示時のDraft確認（プロジェクト未選択時のみ）
  useEffect(() => {
    // すでにプロジェクトが選択されている場合（編集画面から戻った場合など）はスキップ
    if (selectedProjectId) return;

    const checkDraftOnMount = async () => {
      try {
        const drafts = await fetchDrafts();
        if (Array.isArray(drafts) && drafts.length > 0) {
          const draft = drafts[0];
          setDraftToRestore(draft); // 最新Draftを保持
          setHasBackendDraft(true);
          setDraftRestoreDialogOpen(true);
        }
      } catch {
        // 取得失敗は無視
      }
    };
    checkDraftOnMount();
  }, []);

  // draftToRestore と projects が揃ったら selectedProjectId を設定する
  useEffect(() => {
    if (!draftToRestore?.projectId || projects.length === 0) return;
    // すでに選択済みの場合はスキップ
    if (selectedProjectId) return;
    const targetProject = projects.find(p => p.id === draftToRestore.projectId);
    if (targetProject) {
      console.log('🎯 [ProjectManagement] Draft projectId からプロジェクトを自動選択:', targetProject.id);
      setSelectedProjectId(targetProject.id);
      loadMaiml(targetProject.id).catch(() => {/* 失敗は無視 */});
    }
  }, [draftToRestore, projects]);

  // Phase 6追加: 編集ボタンクリックハンドラー（Draftチェックなし・直接エディタへ）
  const handleEditButtonClick = useCallback(() => {
    if (!selectedProject) {
      message.warning(t('project.selectProjectWarning'));
      return;
    }

    console.log('✏️ [ProjectManagement] Edit button clicked:', selectedProject.id);

    const userInfo = getUserInfo();
    const orgId = userInfo?.organizationId ?? '';
    // maimlFileKey が存在する場合はそれを使用（ファイル名がプロジェクト名と異なるケースに対応）
    const sourceS3Key = selectedProject.maimlFileKey
      ?? `${orgId}/projects/${selectedProject.name}/${selectedProject.name}.maiml`;
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

    // selectedProject が null の場合（初期表示時）は draftToRestore.projectId からプロジェクトを特定
    const targetProject = selectedProject
      ?? (draftToRestore?.projectId ? projects.find(p => p.id === draftToRestore.projectId) ?? null : null);

    if (targetProject) {
      const userInfo = getUserInfo();
      const orgId = userInfo?.organizationId ?? '';
      // maimlFileKey が存在する場合はそれを使用（ファイル名がプロジェクト名と異なるケースに対応）
      const sourceS3Key = targetProject.maimlFileKey
        ?? `${orgId}/projects/${targetProject.name}/${targetProject.name}.maiml`;
      const params: MaimlEditorParams = {
        editMode: 'project',
        editingFileName: `${targetProject.name}.maiml`,
        originalFileName: targetProject.name,
        sourceS3Key,
        displayTitle: targetProject.name,
        displaySubtitle: targetProject.description || undefined,
        documentId: targetProject.id,
        description: targetProject.description || undefined,
      };
      onEdit?.(params);
    } else {
      console.warn('⚠️ [ProjectManagement] handleRestoreDraft: プロジェクトを特定できませんでした');
    }
  }, [selectedProject, draftToRestore, projects, onEdit]);

  // Phase 6追加: 復元しないハンドラー（projectId同一のDraftを全削除してダイアログを閉じる）
  const handleCreateNewOrExisting = useCallback(async () => {
    console.log('🗑️ [ProjectManagement] Draft discarded (no restore)');
    setDraftRestoreDialogOpen(false);

    // 同じprojectIdを持つDraftを全て削除する
    if (draftToRestore?.projectId) {
      try {
        const allDrafts = await fetchDrafts();
        const draftsToDelete = (allDrafts || []).filter(
          (d) => d.projectId === draftToRestore.projectId
        );
        console.log(`🗑️ [ProjectManagement] Deleting ${draftsToDelete.length} drafts for projectId:`, draftToRestore.projectId);
        for (const d of draftsToDelete) {
          await deleteDraft(d.draftKey);
        }
        console.log('✅ [ProjectManagement] All drafts deleted for projectId:', draftToRestore.projectId);
      } catch (error) {
        console.warn('⚠️ [ProjectManagement] Draft deletion failed (ignored):', error);
      }
    }

    // 状態をリセット（プロジェクト選択もクリア）
    setDraftToRestore(null);
    setHasBackendDraft(false);
    setSelectedProjectId(null);
  }, [draftToRestore]);

  /**
   * 選択中プロジェクトの有効な maimlFileKey を返すヘルパー。
   * - project_uuid が設定済み → file_metadata 経由で取得された maimlFileKey を使用
   * - project_uuid 未設定（旧プロジェクト）→ 命名規則から推定したパスをフォールバックとして使用
   */
  const resolvedMaimlFileKey = useMemo((): string | null => {
    if (!selectedProject) return null;
    if (selectedProject.maimlFileKey) return selectedProject.maimlFileKey;
    // フォールバック: 組織ID + 命名規則からパスを推定
    const userInfo = getUserInfo();
    const orgId = userInfo?.organizationId ?? '';
    if (!orgId) return null;
    return `${orgId}/projects/${selectedProject.name}/${selectedProject.name}.maiml`;
  }, [selectedProject]);

  // プロジェクト選択時にDB保存済みバリデーション結果を取得
  useEffect(() => {
    if (!resolvedMaimlFileKey) {
      setSavedValidationRow(null);
      return;
    }
    getAnalysisResult(resolvedMaimlFileKey)
      .then(res => setSavedValidationRow(res.data ?? null))
      .catch(() => setSavedValidationRow(null));
  }, [resolvedMaimlFileKey]);

  // バリデーション実行ハンドラ
  const handleValidate = useCallback(async () => {
    if (!resolvedMaimlFileKey || !maimlContent) return;
    setIsValidating(true);
    try {
      const base64Content = btoa(unescape(encodeURIComponent(maimlContent)));
      await validateMaiml(base64Content, {
        fileKey: resolvedMaimlFileKey,
        skipAnalysisSave: false, // DB保存する（プロジェクト切り替え後も結果を引き当てられるよう）
      });
      // バリデーション後にDBから最新結果を取得（DBが唯一の情報源）
      const analysisRes = await getAnalysisResult(resolvedMaimlFileKey);
      setSavedValidationRow(analysisRes.data ?? null);
    } catch {
      message.error(t('project.validationFailed'));
    } finally {
      setIsValidating(false);
    }
  }, [resolvedMaimlFileKey, maimlContent]);

  // MAIMLエラー有無の算出（TaskRegistrationTab に渡す）
  const maimlHasErrors = useMemo(() => {
    if (!savedValidationRow) return false;
    // JSONB は node-postgres が自動で配列に変換する場合がある。
    // 配列ならそのまま使い、文字列なら JSON.parse する。
    const v = savedValidationRow.errors;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) && parsed.length > 0;
      } catch {
        return false;
      }
    }
    return false;
  }, [savedValidationRow]);

  // 選択プロジェクト変更時に公開ステータスを取得
  useEffect(() => {
    if (!selectedProject) {
      setPublishStatus(null);
      return;
    }

    const fetchStatus = async () => {
      setPublishStatusLoading(true);
      try {
        const status = await getPublishStatus(selectedProject.id);
        setPublishStatus(status);
        console.log('[ProjectManagement] publishStatus:', status);
      } catch (error) {
        console.error('[ProjectManagement] getPublishStatus error:', error);
        setPublishStatus(null);
      } finally {
        setPublishStatusLoading(false);
      }
    };

    fetchStatus();
  }, [selectedProject]);

  /**
   * 現在のプロジェクトが「公開済み」かどうかを判定する
   * 条件: job_type === 'publish' && status === 'done' && asset_id が存在する
   */
  const isPublished = useMemo(() => {
    if (!publishStatus) return false;
    return (
      publishStatus.job_type === 'publish' &&
      publishStatus.status === 'done' &&
      publishStatus.asset_id !== null
    );
  }, [publishStatus]);

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
        message.success(t('projectManagement.listReloadSuccess'));
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
        const fileResponse = await getProjectFiles(currentProjectId, true);
        setProjectFilesData(prev => ({
          ...prev,
          [currentProjectId]: {
            root: fileResponse.files || [],
            subFolderFiles: fileResponse.subFolderFiles || {},
          }
        }));
        console.log('✅ [ProjectManagement] ファイル一覧更新完了:', {
          root: fileResponse.files?.length || 0,
          subFolderKeys: Object.keys(fileResponse.subFolderFiles || {}),
        });
      } else if (currentTabKey === 'task_results') {
        console.log('📋 [ProjectManagement] タスク一覧を最新化');
        const taskResponse = await getProjectTasks(currentProjectId, 'all');
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
      message.success(t('projectManagement.reloadSuccess'));
      console.log('✅ [ProjectManagement] リロード完了');
    } catch (error) {
      console.error('❌ [ProjectManagement] リロードエラー:', error);
      message.error(t('projectManagement.reloadFailed'));
    } finally {
      setIsReloadingProject(false);
    }
  }, [selectedProject, currentTab, refetchProjects, reloadMaiml]);

  // 公開完了/非公開完了時にポーリングを停止してステータスを再取得
  const handlePollingComplete = useCallback(async (status: PublishStatusResponse) => {
    setIsPolling(false);
    if (status.status === 'done') {
      if (status.job_type === 'publish') {
        message.success(t('project.publishSuccess').replace('{name}', selectedProject?.name ?? ''));
      } else {
        message.success(t('project.unpublishSuccess').replace('{name}', selectedProject?.name ?? ''));
      }
    } else if (status.status === 'error') {
      message.error(status.error_message ?? t('project.processingFailed'));
    }
    // publishStatus を再取得
    if (selectedProject) {
      try {
        const latest = await getPublishStatus(selectedProject.id);
        setPublishStatus(latest);
      } catch {
        setPublishStatus(null);
      }
    }
    // リロードボタンと同等の処理でプロジェクト一覧・MAIML・タブデータを最新化
    try {
      await handleProjectReload();
    } catch {
      console.warn('[ProjectManagement] handlePollingComplete: handleProjectReload failed');
    }
  }, [selectedProject, handleProjectReload]);

  // ポーリングフック
  const { start: startPoller } = usePublishStatusPoller({
    projectId: selectedProject?.id ?? '',
    onComplete: handlePollingComplete,
    onError: () => {
      setIsPolling(false);
      message.error(t('project.statusFetchFailed'));
    },
  });

  // 公開ボタンハンドラ → 確認ダイアログを開く
  const handlePublish = useCallback(() => {
    if (!selectedProject) {
      message.warning(t('project.selectProjectWarning'));
      return;
    }
    setPublishDialogOpen(true);
  }, [selectedProject]);

  // 非公開ボタンハンドラ → 確認ダイアログを開く
  const handleUnpublish = useCallback(() => {
    if (!selectedProject) {
      message.warning(t('project.selectProjectWarning'));
      return;
    }
    setUnpublishDialogOpen(true);
  }, [selectedProject]);

  // 公開ダイアログ成功時
  const handlePublishSuccess = useCallback(async (_jobId: string) => {
    setIsPolling(true);
    startPoller();
    // API受付完了時点でリロードボタンと同等の処理を実行（ステータスが即座に更新されるため）
    try {
      await handleProjectReload();
    } catch {
      console.warn('[ProjectManagement] handlePublishSuccess: handleProjectReload failed');
    }
  }, [startPoller, handleProjectReload]);

  // 非公開ダイアログ成功時
  const handleUnpublishSuccess = useCallback(async (_jobId: string) => {
    setIsPolling(true);
    startPoller();
    // API受付完了時点でリロードボタンと同等の処理を実行（ステータスが即座に更新されるため）
    try {
      await handleProjectReload();
    } catch {
      console.warn('[ProjectManagement] handleUnpublishSuccess: handleProjectReload failed');
    }
  }, [startPoller, handleProjectReload]);

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
      message.warning(t('project.maxDialogsWarning'));
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
      message.warning(t('project.maxDialogsWarning'));
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

  // プロジェクト削除ハンドラ
  const handleProjectDelete = useCallback(async () => {
    if (!selectedProject) {
      message.warning(t('project.selectProjectWarning'));
      return;
    }

    Modal.confirm({
      title: t('projectManagement.deleteProjectTitle').replace('{{name}}', selectedProject.name),
      content: (
        <div>
          <p>{t('projectManagement.deleteProjectContent')}</p>
          <p style={{ color: 'red', fontWeight: 'bold' }}>{t('projectManagement.deleteProjectCannotUndo')}</p>
          <p style={{ fontSize: '0.9em', marginTop: '8px' }}>
            {t('projectManagement.deleteProjectMaimlNote')}
          </p>
        </div>
      ),
      okText: t('common.delete'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          console.log('🗑️ [ProjectManagement] プロジェクト削除開始:', selectedProject.name);
          
          // プロジェクト削除API呼び出し
          const result = await deleteProjectApi(selectedProject.id);
          
          console.log('✅ [ProjectManagement] プロジェクト削除成功:', result);
          
          message.success(t('projectManagement.deleteSuccess').replace('{{name}}', selectedProject.name).replace('{{count}}', String(result.deletedCount)));
          
          // プロジェクト一覧を再取得
          await refetchProjects();
          
          // 選択を解除
          setSelectedProjectId(null);
        } catch (error) {
          console.error('❌ [ProjectManagement] プロジェクト削除失敗:', error);
          
          // エラーレスポンスから詳細メッセージを取得
          if (error instanceof AxiosError && error.response?.data?.error?.code) {
            message.error(mapErrorToMessage(error.response.data.error.code));
          } else {
            message.error(t('project.deleteFailed'));
          }
        }
      },
    });
  }, [selectedProject, refetchProjects]);

  // ファイル削除ハンドラ（MAIMLファイル + 一般ファイル）
  const handleDeleteMaimlFile = useCallback(async (file: ProjectFile) => {
    if (!selectedProject) {
      message.warning(t('project.selectProjectWarning'));
      return;
    }

    // MAIMLファイルかどうかで処理を分ける
    const isMaimlFile = file.type === 'maiml';
    
    // 確認ダイアログの内容を設定
    const confirmTitle = isMaimlFile
      ? t('project.maimlFileDeleteConfirmTitle').replace('{name}', file.name)
      : t('project.fileDeleteConfirmTitle').replace('{name}', file.name);
    
    const confirmContent = isMaimlFile ? (
      <div>
        <p>{t('project.fileDeleteCannotUndo')}</p>
        <p style={{ fontSize: '0.9em', marginTop: '8px' }}>
          {t('project.maimlFileDeleteNote')}
        </p>
      </div>
    ) : (
      <div>
        <p>{t('project.fileDeleteCannotUndo')}</p>
      </div>
    );

    Modal.confirm({
      title: confirmTitle,
      content: confirmContent,
      okText: t('common.delete'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true, 'data-testid': 'maiml-delete-confirm-button', id: 'maiml-delete-confirm-button' } as any,
      cancelButtonProps: { 'data-testid': 'maiml-delete-cancel-button', id: 'maiml-delete-cancel-button' } as any,
      onOk: async () => {
        try {
          console.log(`🗑️ [ProjectManagement] ファイル削除開始:`, file.name);
          
          if (isMaimlFile) {
            // MAIMLファイル: 共通削除API（project_statusチェック付き）
            // フラグ更新は削除API側で自動実行
            await deleteFileByKey(file.path, true);
            console.log('✅ [ProjectManagement] MAIMLファイル削除成功:', file.path);
            
            message.success(t('project.maimlDeleteSuccess').replace('{name}', file.name));
            
            // プロジェクト一覧を再取得（project_maiml_flgの更新反映）
            await refetchProjects();
            
            // MAIMLコンテキストを再読み込み
            await reloadMaiml();
          } else {
            // 一般ファイル: 共通削除API（無条件削除）
            await deleteFileByKey(file.path);
            console.log('✅ [ProjectManagement] 一般ファイル削除成功:', file.path);
            message.success(t('project.fileDeleteSuccess').replace('{name}', file.name));
          }
          
          // ファイル一覧を再取得
          const fileResponse = await getProjectFiles(selectedProject.id, true);
          setProjectFilesData(prev => ({
            ...prev,
            [selectedProject.id]: {
              root: fileResponse.files || [],
              subFolderFiles: fileResponse.subFolderFiles || {},
            }
          }));
          
        } catch (error) {
          console.error('❌ [ProjectManagement] ファイル削除失敗:', error);
          
          // エラーレスポンスから詳細メッセージを取得
          if (error instanceof AxiosError && error.response?.data?.error?.code) {
            message.error(mapErrorToMessage(error.response.data.error.code));
          } else {
            message.error(t('project.fileDeleteFailed'));
          }
        }
      },
    });
  }, [selectedProject, refetchProjects, reloadMaiml]);

  // フォルダ削除ハンドラ
  const handleDeleteFolder = useCallback(async (folder: ProjectFile) => {
    if (!selectedProject) {
      message.warning(t('project.selectProjectWarning'));
      return;
    }
    // 戻るボタン行は除外
    if (folder.id === 'back') return;

    Modal.confirm({
      title: t('project.folderDeleteConfirmTitle').replace('{name}', folder.name),
      content: (
        <div>
          <p>{t('project.folderDeleteWarning')}</p>
        </div>
      ),
      okText: t('common.delete'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          console.log('🗑️ [ProjectManagement] フォルダ削除開始:', folder.path);
          await deleteFolderByPath(folder.path);
          console.log('✅ [ProjectManagement] フォルダ削除成功:', folder.path);
          message.success(t('project.folderDeleteSuccess').replace('{name}', folder.name));

          // ファイル一覧を再取得
          const fileResponse = await getProjectFiles(selectedProject.id, true);
          setProjectFilesData(prev => ({
            ...prev,
            [selectedProject.id]: {
              root: fileResponse.files || [],
              subFolderFiles: fileResponse.subFolderFiles || {},
            }
          }));

          // 削除したフォルダを表示中だった場合はルートに戻す
          if (currentFolder !== 'root') {
            setCurrentFolder('root');
          }
        } catch (error) {
          console.error('❌ [ProjectManagement] フォルダ削除失敗:', error);
          if (error instanceof AxiosError && error.response?.data?.error?.code) {
            message.error(mapErrorToMessage(error.response.data.error.code));
          } else {
            message.error(t('project.folderDeleteFailed'));
          }
        }
      },
    });
  }, [selectedProject, currentFolder]);

  // プロジェクト一括ダウンロードハンドラ（ZIP形式）
  const handleProjectDownload = useCallback(async () => {
    if (!selectedProject) {
      message.warning(t('project.selectProjectWarning'));
      return;
    }

    try {
      setIsDownloading(true);
      
      // フォルダパスを構築（projects/プロジェクト名）
      const folderPath = `projects/${selectedProject.name}`;
      
      console.log('📦 [ProjectManagement] ZIPダウンロード開始:', folderPath);
      
      // ZIPダウンロード実行
      await downloadFolderAsZip(folderPath);
      
      message.success(t('project.zipDownloadSuccess').replace('{name}', selectedProject.name));
    } catch (error) {
      console.error('❌ [ProjectManagement] ZIP download failed:', error);
      message.error(t('project.downloadFailed'));
    } finally {
      setIsDownloading(false);
    }
  }, [selectedProject]);

  // プロジェクト名変更成功ハンドラ
  const handleRenameSuccess = useCallback(async (newName: string) => {
    console.log('✅ [ProjectManagement] プロジェクト名変更成功:', newName);
    setRenameModalOpen(false);

    // 楽観的更新: name と folderName を即時反映
    setProjects(prev =>
      prev.map(p =>
        p.id === selectedProjectId
          ? { ...p, name: newName, folderName: newName }
          : p
      )
    );

    // リネームで直接影響を受けるデータを最新化
    // （ファイル一覧: パスが変わったため再取得が必要）
    if (selectedProjectId && currentTab === 'file_management') {
      try {
        console.log('📂 [ProjectManagement] リネーム後ファイル一覧を最新化:', selectedProjectId);
        const fileResponse = await getProjectFiles(selectedProjectId, true);
        setProjectFilesData(prev => ({
          ...prev,
          [selectedProjectId]: {
            root: fileResponse.files || [],
            subFolderFiles: fileResponse.subFolderFiles || {},
          },
        }));
        console.log('✅ [ProjectManagement] ファイル一覧更新完了');
      } catch (err) {
        console.error('❌ [ProjectManagement] リネーム後ファイル一覧更新失敗:', err);
      }
    }

    // MAIML Context をリロード（新パスのファイルを参照させる）
    try {
      console.log('📄 [ProjectManagement] リネーム後 MAIML をリロード');
      await reloadMaiml();
      console.log('✅ [ProjectManagement] MAIML リロード完了');
    } catch (err) {
      console.error('❌ [ProjectManagement] リネーム後 MAIML リロード失敗:', err);
      // エラーは Context 側でメッセージ表示済みのため続行
    }
  }, [selectedProjectId, currentTab, getProjectFiles, setProjectFilesData, reloadMaiml]);

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
        content: t('projectManagement.create.success'),
        duration: 3,
      });
      
      // モーダルを閉じる
      handleCloseCreateModal();
    } catch (error) {
      console.error('❌ [ProjectManagement] Project creation failed:', error);
      
      // AxiosError からバックエンドのエラーメッセージを抽出する
      // 優先順位: response.data.error.message → response.data.error.code → デフォルト
      let errorMessage: string;
      if (error instanceof AxiosError && error.response?.data?.error?.message) {
        // バックエンドの日本語メッセージを優先（例: "プロジェクト名が既に存在します"）
        errorMessage = error.response.data.error.message;
      } else if (error instanceof AxiosError && error.response?.data?.error?.code) {
        // エラーコードから翻訳メッセージに変換（例: E7001）
        errorMessage = mapErrorToMessage(error.response.data.error.code);
      } else {
        errorMessage = t('projectManagement.create.error');
      }
      
      // CreateProjectModal の Alert で表示するため、message.error トーストは出さない（二重表示防止）
      // エラーを再スローしてCreateProjectModalでキャッチさせる
      throw new Error(errorMessage);
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
              data-testid="project-status-filter"
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
              data-testid="checkout-status-filter"
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
              data-testid="project-search-input"
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
            icon={<ReloadOutlined />}
            onClick={handleProjectReload}
            loading={isReloadingProject}
            disabled={isReloadingProject}
          >
            {isReloadingProject ? t('common.reloading') : t('common.reload')}
          </Button>
          <Button
            icon={<SearchOutlined />}
            onClick={() => setSemanticSearchModalOpen(true)}
          >
            {t('projectManagement.transitionSearch')}
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
                    {/* プロジェクトステータス表示（翻訳済みラベルを使用） */}
                    {selectedProject.status !== undefined && (
                      <Tag 
                        color={
                          selectedProject.status === ProjectStatus.PLANNING ? 'default' :
                          selectedProject.status === ProjectStatus.TASK_PENDING ? 'blue' :
                          selectedProject.status === ProjectStatus.TASK_IN_PROGRESS ? 'cyan' :
                          selectedProject.status === ProjectStatus.REVIEW_WAITING ? 'purple' :
                          selectedProject.status === ProjectStatus.COMPLETED ? 'success' :
                          selectedProject.status === ProjectStatus.ERROR ? 'error' :
                          'default'
                        }
                      >
                        {
                          selectedProject.status === ProjectStatus.PLANNING ? t('projectManagement.status_planning') :
                          selectedProject.status === ProjectStatus.TASK_PENDING ? t('projectManagement.status_pending') :
                          selectedProject.status === ProjectStatus.TASK_IN_PROGRESS ? t('projectManagement.status_in_progress') :
                          selectedProject.status === ProjectStatus.REVIEW_WAITING ? t('projectManagement.status_review_waiting') :
                          selectedProject.status === ProjectStatus.COMPLETED ? t('projectManagement.status_completed') :
                          selectedProject.status === ProjectStatus.ERROR ? t('projectManagement.status_error') :
                          String(selectedProject.status)
                        }
                      </Tag>
                    )}
                    {/* チェックアウト状態表示 - プロジェクト単位 */}
                    {selectedProject.isCheckedOut && (
                      <Tag color="orange" data-testid="checkout-status-tag">{t('projectManagement.checking_out')}</Tag>
                    )}
                    {/* バリデーション警告アイコン（エラーあり: 赤、警告のみ: 黄） */}
                    {savedValidationRow && (() => {
                      // JSONB は node-postgres が自動でオブジェクトに変換する場合がある。
                      // 文字列なら JSON.parse、すでに配列ならそのまま使う。
                      const parseField = (v: unknown): unknown[] => {
                        if (Array.isArray(v)) return v;
                        if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } }
                        return [];
                      };
                      let errCount = 0;
                      let warnCount = 0;
                      try { errCount = parseField(savedValidationRow.errors).length; } catch {}
                      try { warnCount = parseField(savedValidationRow.warnings).length; } catch {}
                      if (errCount > 0) {
                        return (
                          <Tooltip title={t('project.validationErrorTooltip').replace('{count}', String(errCount))}>
                            <WarningOutlined style={{ color: token.colorError, fontSize: 18 }} />
                          </Tooltip>
                        );
                      }
                      if (warnCount > 0) {
                        return (
                          <Tooltip title={t('project.validationWarningTooltip').replace('{count}', String(warnCount))}>
                            <WarningOutlined style={{ color: token.colorWarning, fontSize: 18 }} />
                          </Tooltip>
                        );
                      }
                      return null;
                    })()}
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
                    disabled={!selectedProject || isDownloading || !hasProjectFiles}
                    data-testid="project-download-button"
                  >
                    {isDownloading 
                      ? t('projectManagement.project_downloading')
                      : t('projectManagement.project_download')
                    }
                  </Button>
                  <Button
                    type="primary"
                    icon={<UploadOutlined />}
                    style={{ backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }}
                    onClick={handleOpenUploadDialog}
                    disabled={!selectedProject || selectedProject.status === 4}
                    title={selectedProject?.status === 4 ? t('projectManagement.uploadDisabledTitle') : undefined}
                  >
                    {t('projectManagement.upload')}
                  </Button>
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={handleEditButtonClick}
                    disabled={!selectedProject || isProjectCheckedOut || selectedProject.status === 4}
                    title={selectedProject?.status === 4 ? t('projectManagement.editDisabledTitle') : isProjectCheckedOut ? t('projectManagement.editCheckedOutTitle') : undefined}
                  >
                    {t('projectManagement.edit')}
                  </Button>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleProjectDelete}
                    disabled={!selectedProject || selectedProject.status === 4}
                    title={selectedProject?.status === 4 ? t('projectManagement.deleteDisabledTitle') : undefined}
                  >
                    {t('projectManagement.deleteButton')}
                  </Button>
                  <Button
                    type="primary"
                    icon={<FileTextOutlined />}
                    onClick={handleToggleCheckout}
                    disabled={selectedProject?.status === ProjectStatus.COMPLETED}
                    title={selectedProject?.status === ProjectStatus.COMPLETED ? t('projectManagement.checkinDisabledTitle') : undefined}
                    style={isProjectCheckedOut ? { backgroundColor: token.colorWarning, borderColor: token.colorWarning } : { backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }}
                    data-testid="checkout-checkin-button"
                  >
                    {isProjectCheckedOut ? t('projectManagement.checkin') : t('projectManagement.checkout_action')}
                  </Button>
                  <Button
                    type="primary"
                    icon={<ExclamationCircleOutlined />}
                    onClick={handleOpenIssueManagement}
                    style={{ backgroundColor: token.colorWarning, borderColor: token.colorWarning }}
                  >
                    {t('projectManagement.issueCheck')}
                  </Button>
                  {isPublished ? (
                    <Button
                      type="primary"
                      danger
                      data-testid="maiml-toolbar-unpublish-button"
                      onClick={handleUnpublish}
                      loading={publishStatusLoading || isPolling}
                      disabled={!selectedProject || publishStatusLoading || isPolling}
                    >
                      {isPolling ? t('projectManagement.processing') : t('projectManagement.unpublish')}
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      data-testid="maiml-toolbar-publish-button"
                      style={{ backgroundColor: token.colorInfo, borderColor: token.colorInfo }}
                      onClick={handlePublish}
                      loading={publishStatusLoading || isPolling}
                      disabled={!selectedProject || !(selectedProject?.status === ProjectStatus.REVIEW_WAITING || selectedProject?.status === ProjectStatus.COMPLETED) || publishStatusLoading || isPolling}
                    >
                      {isPolling ? t('projectManagement.processing') : t('projectManagement.publish')}
                    </Button>
                  )}
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => setRenameModalOpen(true)}
                    disabled={!selectedProject}
                  >
                    {t('projectManagement.renameProject')}
                  </Button>
                  <Button
                    icon={<SafetyCertificateOutlined />}
                    onClick={() => setValidationDialogOpen(true)}
                    disabled={!selectedProject}
                  >
                    {t('projectManagement.validationConfirmButton')}
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
                      const fileResponse = await getProjectFiles(selectedProject.id, true); // archiveファイルも取得
                      setProjectFilesData(prev => ({
                        ...prev,
                        [selectedProjectId]: {
                          root: fileResponse.files || [],
                          subFolderFiles: fileResponse.subFolderFiles || {},
                        }
                      }));
                    } else if (newTab === 'task_results') {
                      // タスク一覧を最新取得（APIサービスは既に展開済み）
                      console.log('📋 [ProjectManagement] Loading tasks for tab switch:', selectedProject.name);
                      const taskResponse = await getProjectTasks(selectedProject.id, 'all');
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
                    message.error(t('project.dataFetchFailed'));
                  } finally {
                    setIsLoadingTabData(false);
                  }
                }}
                items={[
                  {
                    key: 'file_management',
                    label: t('projectManagement.tabs.file_management'),
                    children: (
                      <div style={{ overflow: 'auto', height: '100%' }}>
                        <FileListTable
                          files={projectFiles}
                          maimlValidationRow={savedValidationRow}
                          onFileClick={(file) => console.log('File clicked:', file.name)}
                          onFolderClick={handleFolderClick}
                          onViewFile={handleViewFile}
                          onDeleteFile={handleDeleteMaimlFile}
                          onDeleteFolder={handleDeleteFolder}
                          onRenameFile={async () => {
                            // ファイルリネーム成功後にファイル一覧を再取得
                            const fileResponse = await getProjectFiles(selectedProject.id, true);
                            setProjectFilesData(prev => ({
                              ...prev,
                              [selectedProject.id]: {
                                root: fileResponse.files || [],
                                subFolderFiles: fileResponse.subFolderFiles || {},
                              }
                            }));
                          }}
                        />
                      </div>
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
                        maimlHasErrors={maimlHasErrors}
                        isProjectCompleted={selectedProject?.status === 4}
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
                            title={!isProjectCheckedOut ? t('projectManagement.workerScreenDisabledTitle') : undefined}
                          >
                            {t('projectManagement.workerScreenButton')}
                          </Button>
                          <Button
                            type="primary"
                            style={{ marginRight: 16 }}
                            data-testid="complete-review-button"
                            disabled={taskStats.review_waiting === 0}
                            title={taskStats.review_waiting === 0 ? t('projectManagement.completeReviewDisabledTitle') : undefined}
                            onClick={async () => {
                              if (!selectedProject) return;
                              try {
                                const res = await completeReviewTasks(selectedProject.id);
                                message.success(res.data?.message || t('projectManagement.completeReviewSuccess'));
                                // タスク一覧を再取得
                                const taskResponse = await getProjectTasks(selectedProject.id, 'all');
                                setProjectTasksData(prev => ({
                                  ...prev,
                                  [selectedProjectId!]: {
                                    tasks: taskResponse.tasks || [],
                                    statistics: taskResponse.statistics || {},
                                  }
                                }));
                              } catch {
                                message.error(t('projectManagement.completeReviewFailed'));
                              }
                            }}
                          >
                            {t('projectManagement.completeReviewButton')}
                          </Button>
                        </Flex>
                        {/* 統計カード: コード値順 total / pending(0) / in_progress(1) / review_waiting(2) / completed(3) / forced_terminated(4) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: token.margin, paddingLeft: token.paddingLG, paddingRight: token.paddingLG }}>
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

                      {/* 0: 実行待ち */}
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

                      {/* 1: 実行中 */}
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

                      {/* 2: レビュー待ち */}
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

                      {/* 3: 完了 */}
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

                      {/* 4: 強制終了（異常終了） */}
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
                            {taskStats.forced_terminated}
                          </Title>
                        </Flex>
                      </Card>
                    </div>

                    {/* タスク結果テーブル */}
                    <TaskResultsTable
                      results={taskResults}
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
                  minHeight: 0,
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
      {hasBackendDraft && (
        <DraftRestoreDialog
          open={draftRestoreDialogOpen}
          onClose={() => setDraftRestoreDialogOpen(false)}
          onRestoreDraft={handleRestoreDraft}
          onCreateNew={handleCreateNewOrExisting}
          hasBackendDraft={hasBackendDraft}
          onRestoreBackendDraft={() => {
            // バックエンドDraft復元: ダイアログを閉じてエディタのDraft管理画面へ
            setDraftRestoreDialogOpen(false);
            // selectedProject が null の場合（初期表示でプロジェクト未選択時）は
            // draftToRestore.projectId からプロジェクトを特定する
            const targetProject = selectedProject
              ?? (draftToRestore?.projectId ? projects.find(p => p.id === draftToRestore.projectId) ?? null : null);
            if (targetProject) {
              const userInfo = getUserInfo();
              const orgId = userInfo?.organizationId ?? '';
              // maimlFileKey が存在する場合はそれを使用（ファイル名がプロジェクト名と異なるケースに対応）
              const sourceS3Key = targetProject.maimlFileKey
                ?? `${orgId}/projects/${targetProject.name}/${targetProject.name}.maiml`;
              const params: MaimlEditorParams = {
                editMode: 'project',
                editingFileName: `${targetProject.name}.maiml`,
                originalFileName: targetProject.name,
                sourceS3Key,
                displayTitle: targetProject.name,
                displaySubtitle: targetProject.description || undefined,
                documentId: targetProject.id,
                description: targetProject.description || undefined,
                openDraftManagerOnStart: true,
              };
              onEdit?.(params);
            } else {
              console.warn('⚠️ [ProjectManagement] onRestoreBackendDraft: プロジェクトを特定できませんでした', {
                selectedProject,
                draftToRestoreProjectId: draftToRestore?.projectId,
                projectsCount: projects.length,
              });
            }
          }}
        />
      )}

      {/* 問題確認モーダル */}
      {issueManagementModalOpen && selectedProject && (
        <IssueManagementModal
          open={issueManagementModalOpen}
          targetName={selectedProject.name}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          onClose={handleCloseIssueManagement}
          viewMode={selectedProject.status === ProjectStatus.COMPLETED}
        />
      )}

      {/* 公開確認ダイアログ */}
      {selectedProject && (
        <MaimlPublishDialog
          open={publishDialogOpen}
          projectName={selectedProject.name}
          projectId={selectedProject.id}
          onClose={() => setPublishDialogOpen(false)}
          onSuccess={handlePublishSuccess}
        />
      )}

      {/* 非公開確認ダイアログ */}
      {selectedProject && (
        <MaimlUnpublishDialog
          open={unpublishDialogOpen}
          projectName={selectedProject.name}
          projectId={selectedProject.id}
          onClose={() => setUnpublishDialogOpen(false)}
          onSuccess={handleUnpublishSuccess}
        />
      )}

      {/* プロジェクト名変更モーダル */}
      {selectedProject && (
        <RenameProjectModal
          open={renameModalOpen}
          projectId={selectedProject.id}
          currentProjectName={selectedProject.name}
          onCancel={() => setRenameModalOpen(false)}
          onSuccess={handleRenameSuccess}
        />
      )}

      {/* バリデーション結果ダイアログ（外出しコンポーネント） */}
      <MaimlValidationModal
        open={validationDialogOpen}
        onClose={() => setValidationDialogOpen(false)}
        savedValidationRow={savedValidationRow}
        isValidating={isValidating}
        hasMaimlContent={!!maimlContent}
        onValidate={handleValidate}
      />

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

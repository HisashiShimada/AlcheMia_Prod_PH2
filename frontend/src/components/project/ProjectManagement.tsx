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
import TaskResultsTable from './TaskResultsTable';
import mockProjectsData from '@/data/mock/mockProjects.json';
import mockFilesData from '@/data/mock/mockFiles.json';
import mockTaskResultsData from '@/data/mock/mockTaskResults.json';
import { useLanguage } from '@/contexts/LanguageContext';

const { Title, Text } = Typography;

/**
 * プロジェクト管理画面メインコンポーネント
 */
const ProjectManagement: React.FC = () => {
  const { t } = useLanguage();
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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['folder_active']));
  const [currentTab, setCurrentTab] = useState<'file_management' | 'task_results'>('file_management');

  // モックデータの読み込み
  useEffect(() => {
    setProjects(mockProjectsData.projects);
  }, []);

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

  // タスク結果一覧を取得
  const taskResults = useMemo(() => {
    if (!selectedProjectId) return [];
    return (mockTaskResultsData.taskResults as any)[selectedProjectId] || [];
  }, [selectedProjectId]);

  // タスク結果確認ハンドラ
  const handleViewTaskResult = useCallback((result: any) => {
    console.log('View task result:', result);
    // TODO: タスク結果詳細モーダルを表示
  }, []);

  // プロジェクトがチェックアウト中かどうかを判定（プロジェクト単位）
  const isProjectCheckedOut = useMemo(() => {
    return selectedProject?.isCheckedOut === true;
  }, [selectedProject]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#fafafa' }}>
      {/* ツールバー */}
      <Card
        bordered={false}
        style={{
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          borderRadius: 0,
        }}
        bodyStyle={{ padding: '16px 24px' }}
      >
        {/* 検索・フィルタ */}
        <Space direction="horizontal" size="small" wrap>
          {/* 所有者絞込 */}
          <Space size={4} direction="horizontal">
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
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
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
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
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
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
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
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
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
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
          <Button type="primary">
            {t('projectManagement.advanced_search')}
          </Button>

          <div style={{ flex: 1 }} />

          {/* 右側のアクションボタン */}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ backgroundColor: '#2e7d32', borderColor: '#2e7d32' }}
          >
            {t('projectManagement.new_project')}
          </Button>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            style={{ backgroundColor: '#2e7d32', borderColor: '#2e7d32' }}
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
                  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                  borderRadius: 0,
                }}
                bodyStyle={{ padding: 16 }}
              >
                <Space size="small">
                  <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
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
              </Card>

              {/* ファイル操作ツールバー */}
              <Card
                bordered={false}
                style={{
                  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                  borderRadius: 0,
                }}
                bodyStyle={{ padding: 16 }}
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
                    style={isProjectCheckedOut ? { backgroundColor: '#ed6c02', borderColor: '#ed6c02' } : { backgroundColor: '#2e7d32', borderColor: '#2e7d32' }}
                  >
                    {isProjectCheckedOut ? t('projectManagement.checkin') : t('projectManagement.checkout_action')}
                  </Button>
                  <Button
                    icon={<SendOutlined />}
                    disabled
                  >
                    {t('projectManagement.send_instruction')}
                  </Button>
                  <Button
                    type="primary"
                    style={{ backgroundColor: '#0093CF', borderColor: '#0093CF' }}
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
                  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                  backgroundColor: '#ffffff',
                  padding: '0 16px',
                }}
              />

              {/* タブコンテンツ */}
              <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                {currentTab === 'file_management' && (
                  <FileListTable
                    files={projectFiles}
                    onFileClick={(file) => console.log('File clicked:', file.name)}
                    onFolderClick={handleFolderClick}
                  />
                )}
                
                {currentTab === 'task_results' && (
                  <TaskResultsTable
                    results={taskResults}
                    onViewResult={handleViewTaskResult}
                  />
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
    </div>
  );
};

export default ProjectManagement;

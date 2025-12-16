'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Typography,
  Input,
  Button,
  Select,
  Space,
  Flex,
  Card,
  Tag,
} from 'antd';
import { 
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
  EditOutlined,
  DownloadOutlined,
  CheckOutlined,
  SendOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import ProjectFolderTree from './ProjectFolderTree';
import FileListTable from './FileListTable';
import ProjectDetailModal from './ProjectDetailModal';
import mockProjectsData from '@/data/mock/mockProjects.json';
import mockFilesData from '@/data/mock/mockFiles.json';

const { Title, Text } = Typography;

// プロジェクトの型定義
interface Project {
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
  isCheckedOut?: boolean;
}

// ファイルの型定義
interface FileData {
  id: string;
  name: string;
  path: string;
  size: number;
  lastModified: string;
  type: string;
  isFolder?: boolean;
  fileCount?: number;
  isCheckedOut?: boolean;
  checkedOutBy?: string | null;
  checkedOutAt?: string | null;
}

// ファイルデータの型定義
interface FilesData {
  root?: FileData[];
  archive?: FileData[];
}

/**
 * プロジェクト管理画面メインコンポーネント
 */
const ProjectManagement: React.FC = () => {
  // モックデータを初期値として直接設定
  const [projects, setProjects] = useState<Project[]>(mockProjectsData.projects as Project[]);
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
          matchesCheckout = project.isCheckedOut === true;
        } else if (checkoutFilter === 'checked_in') {
          matchesCheckout = project.isCheckedOut === false;
        }
      }

      // プロジェクトステータスでフィルタリング
      let matchesProjectStatus = true;
      if (projectStatusFilter !== 'all') {
        matchesProjectStatus = project.status === projectStatusFilter;
      }

      // MaiMLファイルフィルタ
      const filesData = mockFilesData.files as Record<string, FilesData>;
      const matchesMaiml = !showMaimlOnly || filesData[project.id]?.root?.some(
        (file) => file.type === 'maiml'
      ) || filesData[project.id]?.archive?.some(
        (file) => file.type === 'maiml'
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

  const projectFiles = useMemo((): FileData[] => {
    if (!selectedProjectId) return [];
    const filesData = mockFilesData.files as Record<string, FilesData>;
    const projectData = filesData[selectedProjectId];
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

  // プロジェクトがチェックアウト中かどうかを判定（プロジェクト単位）
  const isProjectCheckedOut = useMemo(() => {
    return selectedProject?.isCheckedOut === true;
  }, [selectedProject]);

  // ステータスタグの取得
  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      planning: { label: 'プロジェクト計画中', color: 'default' },
      pending: { label: 'タスク実行待ち', color: 'processing' },
      in_progress: { label: 'タスク実行中', color: 'blue' },
      completed: { label: 'プロジェクト完了', color: 'success' },
    };
    const config = statusMap[status] || { label: status, color: 'default' };
    return <Tag color={config.color} style={{ fontSize: 12 }}>{config.label}</Tag>;
  };

  return (
    <Flex vertical style={{ height: '100%', backgroundColor: '#fafafa' }}>
      {/* ツールバー */}
      <Card
        bordered={false}
        style={{
          borderRadius: 0,
          borderBottom: '1px solid #f0f0f0',
        }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        {/* 検索・フィルタ */}
        <Space size="small" wrap>
          {/* 検索バー */}
          <Input
            placeholder="プロジェクト名で検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
          />

          {/* 詳細検索ボタン */}
          <Button type="primary" size="middle">
            詳細検索
          </Button>

          {/* プロジェクトステータス絞込 */}
          <Select
            value={projectStatusFilter}
            onChange={(value) => setProjectStatusFilter(value)}
            style={{ minWidth: 180 }}
            options={[
              { value: 'all', label: '全て' },
              { value: 'planning', label: 'プロジェクト計画中' },
              { value: 'pending', label: 'タスク実行待ち' },
              { value: 'in_progress', label: 'タスク実行中' },
              { value: 'completed', label: 'プロジェクト完了' },
            ]}
          />

          {/* チェックアウトステータス絞込 */}
          <Select
            value={checkoutFilter}
            onChange={(value) => setCheckoutFilter(value)}
            style={{ minWidth: 150 }}
            options={[
              { value: 'all', label: '全て' },
              { value: 'checked_in', label: 'チェックイン済み' },
              { value: 'checked_out', label: 'チェックアウト済み' },
            ]}
          />

          <div style={{ flex: 1 }} />

          {/* 右側のアクションボタン */}
          <Button
            type="primary"
            size="middle"
            icon={<PlusOutlined />}
            style={{ backgroundColor: '#52c41a' }}
          >
            新規プロジェクト
          </Button>
          <Button
            type="primary"
            size="middle"
            icon={<UploadOutlined />}
            style={{ backgroundColor: '#52c41a' }}
          >
            アップロード
          </Button>
          <Button
            type="primary"
            size="middle"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </Space>
      </Card>

      {/* メインコンテンツ: 2カラムレイアウト */}
      <Flex style={{ flex: 1, overflow: 'hidden' }}>
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

        {/* 右側: ファイル一覧 */}
        <Flex vertical style={{ flex: 1, overflow: 'hidden' }}>
          {selectedProject ? (
            <>
              {/* プロジェクト情報ヘッダー */}
              <Card
                bordered={false}
                style={{
                  borderRadius: 0,
                  borderBottom: '1px solid #f0f0f0',
                }}
                styles={{ body: { padding: 16 } }}
              >
                <Space align="center" size="small">
                  <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
                    {selectedProject.name}
                  </Title>
                  {/* プロジェクトステータス表示 */}
                  {getStatusTag(selectedProject.status)}
                  {/* チェックアウト状態表示 */}
                  {selectedProject.isCheckedOut && (
                    <Tag color="warning" style={{ fontSize: 12 }}>チェックアウト中</Tag>
                  )}
                </Space>
              </Card>

              {/* ファイル操作ツールバー */}
              <Card
                bordered={false}
                style={{
                  borderRadius: 0,
                  borderBottom: '1px solid #f0f0f0',
                }}
                styles={{ body: { padding: 16 } }}
              >
                <Space size="small">
                  <Button
                    type="primary"
                    size="middle"
                    icon={<DownloadOutlined />}
                  >
                    プロジェクトダウンロード
                  </Button>
                  <Button
                    type="primary"
                    size="middle"
                    icon={<EditOutlined />}
                  >
                    編集
                  </Button>
                  <Button
                    type="primary"
                    size="middle"
                    icon={<CheckOutlined />}
                    style={{ backgroundColor: isProjectCheckedOut ? '#faad14' : '#52c41a' }}
                  >
                    {isProjectCheckedOut ? 'チェックイン' : 'チェックアウト'}
                  </Button>
                  <Button
                    size="middle"
                    icon={<SendOutlined />}
                    disabled
                  >
                    指示送信
                  </Button>
                  <Button
                    type="primary"
                    size="middle"
                    icon={<GlobalOutlined />}
                    style={{ backgroundColor: '#1890ff' }}
                  >
                    公開
                  </Button>
                </Space>
              </Card>

              {/* ファイル一覧 */}
              <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                <FileListTable
                  files={projectFiles}
                  onFileClick={(file) => console.log('File clicked:', file.name)}
                  onFolderClick={handleFolderClick}
                />
              </div>
            </>
          ) : (
            <Flex
              align="center"
              justify="center"
              style={{ flex: 1 }}
            >
              <div style={{ textAlign: 'center' }}>
                <Title level={5} type="secondary" style={{ marginBottom: 8 }}>
                  プロジェクトを選択してください
                </Title>
                <Text type="secondary">
                  左側のフォルダツリーからプロジェクトを選択すると、ファイル一覧が表示されます
                </Text>
              </div>
            </Flex>
          )}
        </Flex>
      </Flex>

      {/* プロジェクト詳細モーダル */}
      <ProjectDetailModal
        open={modalOpen}
        onClose={handleCloseModal}
        project={selectedProject}
        files={projectFiles}
      />
    </Flex>
  );
};

export default ProjectManagement;

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
} from 'antd';
import { 
  ReloadOutlined,
  UploadOutlined,
  PlusOutlined,
  EditOutlined,
  ExportOutlined,
  DeleteOutlined,
  SearchOutlined,
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
 * フォーマット管理画面メインコンポーネント
 * ProjectManagement.tsxをベースに作成
 */
const FormatManagement: React.FC = () => {
  // モックデータを初期値として直接設定
  const [projects, setProjects] = useState<Project[]>(mockProjectsData.projects as Project[]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['folder_active']));
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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
            placeholder="フォーマット名で検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
          />

          {/* 詳細検索ボタン */}
          <Button type="primary" size="middle">
            詳細検索
          </Button>

          {/* ステータス絞込 */}
          <Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
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
            新規フォーマット
          </Button>
          <Button
            type="primary"
            size="middle"
            icon={<UploadOutlined />}
          >
            インポート
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
        {/* 左側: フォーマット一覧（画面の約1/3） */}
        <div style={{ width: '33%', minWidth: 350, maxWidth: 500, flexShrink: 0 }}>
          <ProjectFolderTree
            projects={filteredProjects}
            selectedProjectId={selectedProjectId}
            onProjectSelect={handleProjectSelect}
            expandedFolders={expandedFolders}
            onToggleFolder={handleToggleFolder}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(newSortBy) => {
              setSortBy(newSortBy);
              // ソート順序のトグル
              setSortOrder((prev) => prev === 'asc' ? 'desc' : 'asc');
            }}
          />
        </div>

        {/* 右側: ファイル一覧 */}
        <Flex vertical style={{ flex: 1, overflow: 'hidden' }}>
          {selectedProject ? (
            <>
              {/* フォーマット情報ヘッダー */}
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
                </Space>
              </Card>

              {/* フォーマット操作ツールバー */}
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
                    icon={<EditOutlined />}
                  >
                    編集
                  </Button>
                  <Button
                    type="primary"
                    size="middle"
                    icon={<ExportOutlined />}
                    style={{ backgroundColor: '#52c41a' }}
                  >
                    エクスポート
                  </Button>
                  <Button
                    danger
                    size="middle"
                    icon={<DeleteOutlined />}
                  >
                    削除
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
                  フォーマットを選択してください
                </Title>
                <Text type="secondary">
                  左側のフォルダツリーからフォーマットを選択すると、詳細が表示されます
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

export default FormatManagement;

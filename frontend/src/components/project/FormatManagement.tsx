'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ReactFlowProvider } from 'reactflow';
import {
  Card,
  Input,
  Button,
  Select,
  Space,
  Typography,
  theme,
  Breadcrumb,
  Spin,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  UploadOutlined,
  PlusOutlined,
  HomeOutlined,
  FolderOutlined,
  FolderAddOutlined,
} from '@ant-design/icons';
import FormatFolderTree from './FormatFolderTree';
import FormatFileListTable from './FormatFileListTable';
import FormatSearchModal from './FormatSearchModal';
import FormatUploadDialog from './FormatUploadDialog';
import CreateFormatFileModal, { CreateFormatFileData } from './CreateFormatFileModal';
import CreateFormatFolderModal, { CreateFormatFolderData } from './CreateFormatFolderModal';
import FormatFileDetailModal, { FormatFileDetailData } from './FormatFileDetailModal';
import PetriNetEditorInner from '@/components/editorv2/PetriNetEditorInner';
import TemplateEditorDialog from '@/components/editorv2/components/TemplateEditorDialog';
import mockFormatFilesData from '@/data/mock/mockFormatFiles.json';
import { useLanguage } from '@/contexts/LanguageContext';
import { message } from 'antd';
import { User } from '@/types/auth';
import { useApi } from '@/hooks/useApi';
import { fetchFormats } from '@/utils/apiClient';
import type { ApiResponse } from '@/types/api';
import type { FormatListResponse } from '@/types/format';

const { Title, Text } = Typography;

/**
 * フォーマットの型定義
 */
interface Format {
  id: string;
  name: string;
  folderName: string;
  description: string;
  fileCount: number;
  fileType: 'xml' | 'maiml';
  category: string;
  department: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

/**
 * フォーマットファイルの型定義
 */
interface FormatFile {
  root: Array<{
    id: string;
    name: string;
    path: string;
    size: number;
    lastModified: string;
    type: string;
    version?: string;
    description?: string;
  }>;
}

/**
 * FormatManagementのProps型定義
 */
interface FormatManagementProps {
  user: User;
}

/**
 * フォーマット管理画面メインコンポーネント
 * XMLフォーマットファイルの管理に特化
 */
const FormatManagement: React.FC<FormatManagementProps> = ({ user }) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [formats, setFormats] = useState<Format[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'xml' | 'maiml'>('all');
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createFileModalOpen, setCreateFileModalOpen] = useState(false);
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FormatFileDetailData | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'updatedAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentFolderPath, setCurrentFolderPath] = useState<string[]>([]);
  
  // PetriNetEditor表示用State
  const [showPetriNetEditor, setShowPetriNetEditor] = useState(false);
  const [editingMaimlFile, setEditingMaimlFile] = useState<FormatFileDetailData | null>(null);
  const [maimlFileContent, setMaimlFileContent] = useState<string | null>(null);
  const [isLoadingMaimlContent, setIsLoadingMaimlContent] = useState(false);
  
  // TemplateEditorDialog表示用State
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingXmlFile, setEditingXmlFile] = useState<FormatFileDetailData | null>(null);

  // フォーマット一覧をAPI経由で取得
  const { 
    data: formatsData, 
    isLoading: isLoadingFormats, 
    error: formatsError, 
    refetch: refetchFormats 
  } = useApi<ApiResponse<FormatListResponse>>(
    fetchFormats,
    []
  );

  // フォーマットデータが取得できたらstateを更新
  React.useEffect(() => {
    if (formatsData?.data.folders) {
      // Data synchronization in useEffect is a valid pattern
       
      setFormats(formatsData.data.folders as Format[]);
    }
  }, [formatsData]);

  // サブフォルダのモックデータ（実際はAPIから取得）
  // 各取引先会社のフォルダ（1階層のみ）
  const subFolders = useMemo(() => {
    if (!selectedFormatId) return [];
    
    // フォーマットIDに応じてサブフォルダを返す（モック）
    // 取引先会社のフォルダ
    return [
      { value: 'company_a', label: 'company_a (A社)' },
      { value: 'company_b', label: 'company_b (B社)' },
      { value: 'company_c', label: 'company_c (C社)' },
      { value: 'company_d', label: 'company_d (D社)' },
      { value: 'company_e', label: 'company_e (E社)' },
    ];
  }, [selectedFormatId]);

  // ソート処理
  const handleSortChange = useCallback((newSortBy: 'name' | 'category' | 'updatedAt') => {
    if (sortBy === newSortBy) {
      // 同じ項目をクリックした場合、順序を反転
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 異なる項目をクリックした場合、昇順でソート
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);

  // フィルタリングとソート
  const filteredAndSortedFormats = useMemo(() => {
    const filtered = formats.filter((format) => {
      // カテゴリの表示値を取得
      const getCategoryLabel = (category: string) => {
        const key = `formatManagement.${category}`;
        return t(key) || category;
      };
      
      // ファイルタイプの表示値（そのまま大文字）
      const fileTypeLabel = format.fileType.toUpperCase();
      
      // 検索クエリでフィルタリング - すべての項目を対象（表示値も含む）
      const matchesSearch =
        searchQuery === '' ||
        format.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        format.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        format.folderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        format.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        format.fileType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fileTypeLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        format.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getCategoryLabel(format.category).toLowerCase().includes(searchQuery.toLowerCase()) ||
        format.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        format.createdAt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        format.updatedAt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        format.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // カテゴリフィルタリング
      const matchesCategory = categoryFilter === 'all' || format.category === categoryFilter;

      // ファイルタイプフィルタリング
      const matchesFileType = fileTypeFilter === 'all' || format.fileType === fileTypeFilter;

      return matchesSearch && matchesCategory && matchesFileType;
    });

    // ソート処理
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'ja');
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [formats, searchQuery, categoryFilter, fileTypeFilter, sortBy, sortOrder, t]);

  // フォーマット選択時
  const handleFormatSelect = useCallback((formatId: string) => {
    setSelectedFormatId(formatId);
  }, []);

  // リフレッシュ
  const handleRefresh = React.useCallback(() => {
    console.log('Refreshing format list...');
    refetchFormats();
  }, [refetchFormats]);

  // 新規ファイル作成モーダルを開く
  const handleOpenCreateFileModal = useCallback(() => {
    if (!selectedFormatId) {
      message.warning(t('formatManagement.select_format') || 'フォーマットを選択してください');
      return;
    }
    setCreateFileModalOpen(true);
  }, [selectedFormatId, t]);

  // 新規ファイル作成モーダルを閉じる
  const handleCloseCreateFileModal = useCallback(() => {
    setCreateFileModalOpen(false);
  }, []);

  // 新規ファイル作成ハンドラ
  const handleCreateFormatFile = useCallback(async (data: CreateFormatFileData) => {
    try {
      console.log('📝 [FormatManagement] 新規フォーマットファイル作成:', data);
      
      // XMLファイルの場合、templateTypeに応じたメッセージ
      if (data.fileType === 'xml' && data.templateType) {
        console.log(`✅ [FormatManagement] テンプレートタイプ: ${data.templateType}`);
        
        // TODO: Phase 6 - templateTypeに応じたデフォルトXML生成
        // const xmlContent = generateDefaultXmlContent(data.templateType, data.fileName);
        // console.log('生成されたXML:', xmlContent);
      }
      
      // TODO: 実際のAPI呼び出しを実装
      // await apiService.post(`/api/formats/${data.formatId}/files`, {
      //   ...data,
      //   // XMLファイルの場合、生成したコンテンツを含める
      //   // content: data.fileType === 'xml' ? xmlContent : undefined
      // });
      
      // 成功メッセージを表示（テンプレートタイプを含む）
      const successMessage = data.fileType === 'xml' && data.templateType
        ? `${data.templateType}テンプレートが作成されました`
        : 'ファイルが正常に作成されました';
      
      message.success({
        content: t('formatManagement.create.success') || successMessage,
        duration: 3,
      });
      
      // モーダルを閉じる
      handleCloseCreateFileModal();
      
      // ファイル一覧を更新
      handleRefresh();
    } catch (error) {
      console.error('❌ [FormatManagement] ファイル作成エラー:', error);
      message.error({
        content: t('formatManagement.create.error') || 'ファイルの作成に失敗しました',
        duration: 3,
      });
      throw error;
    }
  }, [t, handleCloseCreateFileModal, handleRefresh]);

  // 新規フォルダ作成モーダルを開く
  const handleOpenCreateFolderModal = useCallback(() => {
    if (!selectedFormatId) {
      message.warning(t('formatManagement.select_format') || 'フォーマットを選択してください');
      return;
    }
    setCreateFolderModalOpen(true);
  }, [selectedFormatId, t]);

  // 新規フォルダ作成モーダルを閉じる
  const handleCloseCreateFolderModal = useCallback(() => {
    setCreateFolderModalOpen(false);
  }, []);

  // ファイル編集ハンドラ
  const handleFileEdit = useCallback(async (file: FormatFileDetailData) => {
    console.log('ファイル編集:', file);
    
    // ファイル拡張子で判定
    const fileName = file.name.toLowerCase();
    const isMaimlFile = fileName.endsWith('.maiml');
    const isXmlFile = fileName.endsWith('.xml');
    
    if (isMaimlFile) {
      // MAIMLファイル: PetriNetEditorを開く
      console.log('📝 [FormatManagement] MAIMLファイル編集:', file.name);
      setEditingMaimlFile(file);
      
      // ファイル内容を読み込む
      setIsLoadingMaimlContent(true);
      setMaimlFileContent(null);
      
      try {
        // ファイルパスがある場合は読み込みを試みる
        if (file.path && file.path.trim() !== '') {
          console.log('📂 [FormatManagement] ファイル内容読み込み開始:', file.path);
          
          try {
            const response = await fetch('/api/worker/load-maiml-file', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                s3Key: file.path,
              }),
            });
            
            if (response.ok) {
              const result = await response.json();
              
              // 成功かつ中身がある場合のみ、既存ファイルとして扱う
              if (result.success && result.data?.content) {
                const maimlContent = atob(result.data.content);
                
                // 中身が実質空（空白のみ、非常に短い）の場合は新規扱い
                if (maimlContent.trim().length > 0) {
                  console.log('✅ [FormatManagement] ファイル内容読み込み完了（既存ファイル）');
                  setMaimlFileContent(maimlContent);
                } else {
                  console.log('🆕 [FormatManagement] ファイルは存在するが中身が空 - 新規扱い');
                  setMaimlFileContent(null);
                }
              } else {
                // APIは成功したがコンテンツがない場合は新規扱い
                console.log('🆕 [FormatManagement] ファイルは存在するが中身が取得できない - 新規扱い');
                setMaimlFileContent(null);
              }
            } else {
              // ファイルが存在しない、または読み込みエラーの場合は新規扱い
              console.log('🆕 [FormatManagement] ファイル読み込み失敗 - 新規扱い:', response.status);
              setMaimlFileContent(null);
            }
          } catch (fetchError) {
            // ネットワークエラーなどの場合は新規扱い
            console.log('🆕 [FormatManagement] ファイル読み込みエラー - 新規扱い:', fetchError);
            setMaimlFileContent(null);
          }
        } else {
          // パスがない場合は新規作成
          console.log('🆕 [FormatManagement] パス未設定 - 新規作成モード');
          setMaimlFileContent(null);
        }
        
        setShowPetriNetEditor(true);
      } catch (error) {
        console.error('❌ [FormatManagement] ファイル読み込みエラー:', error);
        message.error('ファイルの読み込みに失敗しました: ' + (error as Error).message);
        setEditingMaimlFile(null);
      } finally {
        setIsLoadingMaimlContent(false);
      }
    } else if (isXmlFile) {
      // XMLファイル: TemplateEditorDialogを開く
      console.log('📝 [FormatManagement] XMLファイル編集:', file.name);
      setEditingXmlFile(file);
      setShowTemplateEditor(true);
    } else {
      // その他のファイル: エラーメッセージ
      message.error('編集できないファイル形式です');
    }
  }, []);
  
  // ファイル詳細表示ハンドラ
  const handleFileDetail = useCallback((file: FormatFileDetailData) => {
    console.log('ファイル詳細表示:', file);
    // 作成者情報を付与（現在はログインユーザー情報を使用）
    const fileWithCreator: FormatFileDetailData = {
      ...file,
      createdBy: user.id,
      createdByName: user.displayName,
      createdAt: file.createdAt || file.lastModified, // 作成日がない場合は最終更新日を使用
    };
    setSelectedFile(fileWithCreator);
    setDetailModalOpen(true);
  }, [user]);

  // 詳細モーダルを閉じる
  const handleCloseDetailModal = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedFile(null);
  }, []);

  // 新規フォルダ作成ハンドラ
  const handleCreateFormatFolder = useCallback(async (data: CreateFormatFolderData) => {
    try {
      console.log('新規フォーマットフォルダ作成:', data);
      
      // TODO: 実際のAPI呼び出しを実装
      // await apiService.post(`/api/formats/${data.formatId}/folders`, data);
      
      // 成功メッセージを表示
      message.success({
        content: t('formatManagement.folder_create_success') || 'フォルダが正常に作成されました',
        duration: 3,
      });
      
      // モーダルを閉じる
      handleCloseCreateFolderModal();
      
      // ファイル一覧を更新
      handleRefresh();
    } catch (error) {
      console.error('フォルダ作成エラー:', error);
      message.error({
        content: t('formatManagement.folder_create_error') || 'フォルダの作成に失敗しました',
        duration: 3,
      });
      throw error;
    }
  }, [t, handleCloseCreateFolderModal, handleRefresh]);

  // 選択したフォーマットとそのファイル一覧を取得
  const selectedFormat = useMemo(() => {
    return formats.find((f) => f.id === selectedFormatId) || null;
  }, [formats, selectedFormatId]);

  // 選択されたフォーマットのファイルタイプ
  const selectedFileType = selectedFormat?.fileType || null;

  // フォルダクリックハンドラ
  const handleFolderClick = useCallback((folderId: string) => {
    if (folderId === 'back') {
      // 戻るボタン
      setCurrentFolderPath([]);
    } else {
      setCurrentFolderPath([...currentFolderPath, folderId]);
    }
  }, [currentFolderPath]);

  // パンくずリストクリックハンドラ
  const handleBreadcrumbClick = useCallback((index: number) => {
    if (index === -1) {
      // ルートに戻る
      setCurrentFolderPath([]);
    } else {
      // 指定されたフォルダまで戻る
      setCurrentFolderPath(currentFolderPath.slice(0, index + 1));
    }
  }, [currentFolderPath]);

  // フォーマット選択時にパスをリセット
  const handleFormatSelectWithReset = useCallback((formatId: string) => {
    setSelectedFormatId(formatId);
    setCurrentFolderPath([]);
  }, []);

  const formatFiles = useMemo(() => {
    if (!selectedFormatId) return [];
    
    const formatData = mockFormatFilesData.files as Record<string, {
      root: Array<{
        id: string;
        name: string;
        path: string;
        size: number;
        lastModified: string;
        type: string;
      }>;
      subfolders?: Record<string, {
        name: string;
        files: Array<{
          id: string;
          name: string;
          path: string;
          size: number;
          lastModified: string;
          type: string;
        }>;
      }>;
    }>;
    const data = formatData[selectedFormatId];
    if (!data) return [];

    // ルートの場合
    if (currentFolderPath.length === 0) {
      const rootFiles = data.root || [];
      const result: Array<{
        id: string;
        name: string;
        path: string;
        size: number;
        lastModified: string;
        type: string;
        isFolder?: boolean;
        fileCount?: number;
      }> = [...rootFiles];

      // サブフォルダを追加
      if (data.subfolders) {
        Object.entries(data.subfolders).forEach(([key, subfolder]) => {
          result.push({
            id: key,
            name: key,
            path: `${selectedFormat?.folderName}/${key}`,
            size: 0,
            lastModified: new Date().toISOString(),
            type: 'folder',
            isFolder: true,
            fileCount: subfolder.files?.length || 0,
          });
        });
      }

      return result;
    }

    // サブフォルダ内の場合 - 戻るボタンを先頭に追加
    if (currentFolderPath.length === 1 && data.subfolders) {
      const subfolderId = currentFolderPath[0];
      const subfolder = data.subfolders[subfolderId];
      if (subfolder && subfolder.files) {
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
          ...subfolder.files,
        ];
      }
    }

    return [];
  }, [selectedFormatId, selectedFormat, currentFolderPath]);

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
          {/* カテゴリ絞込 */}
          {/* カテゴリ絞込 */}
          <Space size={4} orientation="horizontal">
            <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
              {t('formatManagement.filter_labels.category')}
            </Text>
            <Select
              style={{ width: 150 }}
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'all', label: t('formatManagement.all') },
                { value: 'protocol', label: t('formatManagement.protocol') },
                { value: 'material', label: t('formatManagement.material') },
                { value: 'measurement', label: t('formatManagement.measurement') },
                { value: 'analysis', label: t('formatManagement.analysis') },
                { value: 'sample', label: t('formatManagement.sample') },
                { value: 'device', label: t('formatManagement.device') },
              ]}
            />
          </Space>

          {/* ファイルタイプ絞込 */}
          <Space size={4} orientation="horizontal">
            <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
              {t('formatManagement.filter_labels.file_type')}
            </Text>
            <Select
              style={{ width: 150 }}
              value={fileTypeFilter}
              onChange={(value) => setFileTypeFilter(value as 'all' | 'xml' | 'maiml')}
              options={[
                { value: 'all', label: t('formatManagement.all') },
                { value: 'xml', label: 'XML' },
                { value: 'maiml', label: 'MaiML' },
              ]}
            />
          </Space>

          {/* 検索バー */}
          <Space size={4} orientation="horizontal">
            <Text type="secondary" style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}>
              {t('formatManagement.filter_labels.search')}
            </Text>
            <Input
              prefix={<SearchOutlined />}
              placeholder={t('formatManagement.filter_placeholder')}
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
            {t('formatManagement.advanced_search')}
          </Button>
        </Space>

        {/* 右側のアクションボタン */}
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
        >
          {t('progress.refresh')}
        </Button>
        </div>
      </Card>

      {/* メインコンテンツ: 2カラムレイアウト */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左側: フォーマット一覧（画面の約1/3） */}
        <div style={{ width: '33%', minWidth: 350, maxWidth: 500, flexShrink: 0 }}>
          <FormatFolderTree
            formats={filteredAndSortedFormats}
            selectedFormatId={selectedFormatId}
            onFormatSelect={handleFormatSelect}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
          />
        </div>

        {/* 右側: XMLファイル一覧 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedFormat ? (
            <>
              {/* フォーマット情報ヘッダー */}
              <Card
                variant="borderless"
                style={{
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: 0,
                }}
                styles={{ body: { padding: token.margin } }}
              >
                <div>
                  <Title level={5} style={{ margin: 0, fontWeight: token.fontWeightStrong }}>
                    {selectedFormat.name}
                  </Title>
                  <Text type="secondary" style={{ marginTop: token.marginXS, display: 'block' }}>
                    {selectedFormat.description}
                  </Text>
                </div>
              </Card>

              {/* フォーマット操作ツールバー */}
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
                    icon={<PlusOutlined />}
                    style={{ backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }}
                    onClick={handleOpenCreateFileModal}
                  >
                    {selectedFileType === 'xml' ? t('formatManagement.new_xml_file') : t('formatManagement.new_maiml_file')}
                  </Button>
                  <Button
                    type="primary"
                    icon={<FolderAddOutlined />}
                    style={{ backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }}
                    onClick={handleOpenCreateFolderModal}
                  >
                    {t('formatManagement.new_folder')}
                  </Button>
                  <Button
                    type="primary"
                    icon={<UploadOutlined />}
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    {t('formatManagement.upload')}
                  </Button>
                </Space>
              </Card>

              {/* XMLファイル一覧 */}
              <div style={{ flex: 1, overflow: 'auto', padding: token.margin }}>
                <FormatFileListTable
                  files={formatFiles}
                  onFileClick={(file) => console.log('File clicked:', file.name)}
                  onFolderClick={handleFolderClick}
                  onDetail={handleFileDetail}
                  onEdit={handleFileEdit}
                  onDelete={(file) => console.log('Delete file:', file.name)}
                />
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
                  {t('formatManagement.select_format')}
                </Title>
                <Text type="secondary">
                  {t('formatManagement.select_format_description')}
                </Text>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* フォーマットファイル検索モーダル */}
      <FormatSearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onFileSelect={(file) => {
          console.log('検索結果からファイルが選択されました:', file);
          // TODO: ファイル選択時の処理を実装
          // 例: ファイルエディタを開く、ファイルダウンロードなど
        }}
      />

      {/* フォーマットファイルアップロードダイアログ */}
      <FormatUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        baseFolder={selectedFormat ? {
          id: selectedFormat.id,
          name: selectedFormat.name,
          folderName: selectedFormat.folderName,
        } : null}
        subFolders={subFolders}
        onUploadComplete={(result) => {
          console.log('アップロード完了:', result);
          // TODO: ファイル一覧の再読み込み
          handleRefresh();
        }}
      />

      {/* 新規フォーマットファイル作成モーダル */}
      <CreateFormatFileModal
        open={createFileModalOpen}
        onCancel={handleCloseCreateFileModal}
        onSubmit={handleCreateFormatFile}
        formatId={selectedFormatId}
        formatName={selectedFormat?.name || null}
        fileType={selectedFileType}
        createdBy={user.id}
        createdByName={user.displayName}
      />

      {/* 新規フォルダ作成モーダル */}
      <CreateFormatFolderModal
        open={createFolderModalOpen}
        onCancel={handleCloseCreateFolderModal}
        onSubmit={handleCreateFormatFolder}
        formatId={selectedFormatId}
        formatName={selectedFormat?.name || null}
      />

      {/* ファイル詳細表示モーダル */}
      <FormatFileDetailModal
        open={detailModalOpen}
        onClose={handleCloseDetailModal}
        file={selectedFile}
      />

      {/* PetriNetEditor表示エリア（フルスクリーンモーダル） */}
      {showPetriNetEditor && editingMaimlFile && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: token.colorBgLayout,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* ヘッダー: 閉じるボタン */}
          <div style={{ 
            padding: token.padding, 
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            backgroundColor: token.colorBgContainer,
          }}>
            <Space>
              <Button 
                onClick={() => {
                  setShowPetriNetEditor(false);
                  setEditingMaimlFile(null);
                }}
              >
                閉じる
              </Button>
              <Text strong>編集中: {editingMaimlFile.name}</Text>
            </Space>
          </div>
          
          {/* PetriNetEditor */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {isLoadingMaimlContent ? (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%' 
              }}>
                <Spin size="large" tip="ファイル読み込み中..." >
              <div style={{ minHeight: 100 }} />
            </Spin>
              <div style={{ minHeight: 100 }} />
              </div>
            ) : (
              <ReactFlowProvider>
                <PetriNetEditorInner
                  maimlData={maimlFileContent}
                  editingFileName={editingMaimlFile.name}
                  editMode="format"
                />
              </ReactFlowProvider>
            )}
          </div>
        </div>
      )}

      {/* TemplateEditorDialog表示エリア */}
      {showTemplateEditor && editingXmlFile && (() => {
        // 一時的なノードを作成（Date.now()の警告を回避するためuseMemoの代わりに即時関数を使用）
        const tempId = `temp_${editingXmlFile.id}_${editingXmlFile.lastModified}`;
        const tempNode = {
          id: tempId,
          type: 'materialTemplate', // TODO: Phase 5でtemplateTypeから判定
          position: { x: 0, y: 0 },
          data: {
            id: tempId,
            name: editingXmlFile.name.replace('.xml', ''),
            description: '',
            placeType: 'material' as const,
            nodeType: 'place' as const,
          },
        };
        
        return (
          <TemplateEditorDialog
            open={showTemplateEditor}
            onClose={() => {
              setShowTemplateEditor(false);
              setEditingXmlFile(null);
            }}
            node={tempNode}
            onSave={(nodeId, templateRef, isNewTemplate, templateCategory, isCommonTemplate, methodId) => {
              console.log('💾 [FormatManagement] XML保存:', editingXmlFile.name, {
                nodeId,
                templateRef,
                isNewTemplate,
                templateCategory,
                isCommonTemplate,
                methodId
              });
              // TODO: 実際の保存処理を実装
              message.success('保存しました（モック）');
              setShowTemplateEditor(false);
              setEditingXmlFile(null);
            }}
          />
        );
      })()}
    </div>
  );
};

export default FormatManagement;

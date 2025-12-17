'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Card,
  Input,
  Button,
  Select,
  Space,
  Typography,
  theme,
  Breadcrumb,
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
import mockFormatsData from '@/data/mock/mockFormats.json';
import mockFormatFilesData from '@/data/mock/mockFormatFiles.json';
import { useLanguage } from '@/contexts/LanguageContext';
import { message } from 'antd';

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
 * フォーマット管理画面メインコンポーネント
 * XMLフォーマットファイルの管理に特化
 */
const FormatManagement: React.FC = () => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [formats] = useState<Format[]>(mockFormatsData.folders as Format[]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'xml' | 'maiml'>('all');
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createFileModalOpen, setCreateFileModalOpen] = useState(false);
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'updatedAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentFolderPath, setCurrentFolderPath] = useState<string[]>([]);

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
  const handleRefresh = () => {
    console.log('Refreshing format list...');
    // モックデータの場合、既に初期化されているため処理なし
    // 実際のAPIでは、ここでデータを再取得する
  };

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
      console.log('新規フォーマットファイル作成:', data);
      
      // TODO: 実際のAPI呼び出しを実装
      // await apiService.post(`/api/formats/${data.formatId}/files`, data);
      
      // 成功メッセージを表示
      message.success({
        content: t('formatManagement.create.success') || 'ファイルが正常に作成されました',
        duration: 3,
      });
      
      // モーダルを閉じる
      handleCloseCreateFileModal();
      
      // ファイル一覧を更新
      handleRefresh();
    } catch (error) {
      console.error('ファイル作成エラー:', error);
      message.error({
        content: t('formatManagement.create.error') || 'ファイルの作成に失敗しました',
        duration: 3,
      });
      throw error;
    }
  }, [t, handleCloseCreateFileModal]);

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
  }, [t, handleCloseCreateFolderModal]);

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
          {/* カテゴリ絞込 */}
          <Space size={4} direction="horizontal">
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
          <Space size={4} direction="horizontal">
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
          <Space size={4} direction="horizontal">
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
                bordered={false}
                style={{
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: 0,
                }}
                bodyStyle={{ padding: token.margin }}
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
                  onEdit={(file) => console.log('Edit file:', file.name)}
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
      />

      {/* 新規フォルダ作成モーダル */}
      <CreateFormatFolderModal
        open={createFolderModalOpen}
        onCancel={handleCloseCreateFolderModal}
        onSubmit={handleCreateFormatFolder}
        formatId={selectedFormatId}
        formatName={selectedFormat?.name || null}
      />
    </div>
  );
};

export default FormatManagement;

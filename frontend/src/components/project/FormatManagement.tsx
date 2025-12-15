'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Card,
  Input,
  Button,
  Select,
  Space,
  Typography,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  UploadOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import FormatFolderTree from './FormatFolderTree';
import FormatFileListTable from './FormatFileListTable';
import mockFormatsData from '@/data/mock/mockFormats.json';
import mockFormatFilesData from '@/data/mock/mockFormatFiles.json';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const [formats] = useState<Format[]>(mockFormatsData.folders as Format[]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'xml' | 'maiml'>('all');
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'updatedAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  // 選択したフォーマットとそのファイル一覧を取得
  const selectedFormat = useMemo(() => {
    return formats.find((f) => f.id === selectedFormatId) || null;
  }, [formats, selectedFormatId]);

  // 選択されたフォーマットのファイルタイプ
  const selectedFileType = selectedFormat?.fileType || null;

  const formatFiles = useMemo(() => {
    if (!selectedFormatId) return [];
    const formatData = (mockFormatFilesData.files as Record<string, FormatFile>)[selectedFormatId];
    if (!formatData) return [];
    // 選択したフォーマットのfileTypeに合致するファイルのみをフィルタリング
    const files = formatData.root || [];
    return selectedFormat ? files.filter(file => file.type === selectedFormat.fileType) : files;
  }, [selectedFormatId, selectedFormat]);

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
          {/* カテゴリ絞込 */}
          <Space size={4} direction="horizontal">
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
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
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
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
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
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
          <Button type="primary">
            {t('formatManagement.advanced_search')}
          </Button>

          <div style={{ flex: 1 }} />

          {/* 右側のアクションボタン */}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ backgroundColor: '#2e7d32', borderColor: '#2e7d32' }}
          >
            {t('formatManagement.new_format')}
          </Button>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            style={{ backgroundColor: '#2e7d32', borderColor: '#2e7d32' }}
          >
            {t('formatManagement.upload')}
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
                  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                  borderRadius: 0,
                }}
                bodyStyle={{ padding: 16 }}
              >
                <div>
                  <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
                    {selectedFormat.name}
                  </Title>
                  <Text type="secondary" style={{ marginTop: 4, display: 'block' }}>
                    {selectedFormat.description}
                  </Text>
                </div>
              </Card>

              {/* フォーマット操作ツールバー */}
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
                    icon={<PlusOutlined />}
                    style={{ backgroundColor: '#2e7d32', borderColor: '#2e7d32' }}
                  >
                    {selectedFileType === 'xml' ? t('formatManagement.new_xml_file') : t('formatManagement.new_maiml_file')}
                  </Button>
                  <Button
                    type="primary"
                    icon={<UploadOutlined />}
                  >
                    {t('formatManagement.upload')}
                  </Button>
                </Space>
              </Card>

              {/* XMLファイル一覧 */}
              <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                <FormatFileListTable
                  files={formatFiles}
                  onFileClick={(file) => console.log('File clicked:', file.name)}
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
    </div>
  );
};

export default FormatManagement;

'use client';

import React, { useState, useMemo } from 'react';
import {
  Modal,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Typography,
  Divider,
  Alert,
  Card,
  Empty,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  CloseOutlined,
  ReloadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SearchCriteria, FormatSearchResult, SearchStats } from '@/types/format';

const { Text } = Typography;

/**
 * プロップスの型定義
 */
interface FormatSearchModalProps {
  open: boolean;
  onClose: () => void;
  onFileSelect: (file: FormatSearchResult) => void;
}

/**
 * 検索属性カテゴリの定義（アイコン・カラーのみ）
 */
const ATTRIBUTE_CATEGORY_STYLES: Record<string, { icon: string; color: string }> = {
  document: { icon: '📄', color: '#CF0027' },
  data: { icon: '📊', color: '#0093CF' },
  structure: { icon: '🏗️', color: '#ed6c02' },
  attributes: { icon: '🏷️', color: '#2e7d32' },
};

/**
 * 検索可能な属性の定義（valueとcategoryのみ。labelはt()で生成）
 */
const SEARCHABLE_ATTRIBUTE_DEFS: Array<{
  value: string;
  labelKey: string;
  category: string;
  isNew?: boolean;
}> = [
  // Document情報
  { value: 'document.uuid', labelKey: 'format.search.attr.documentUuid', category: 'document' },
  { value: 'document.name', labelKey: 'format.search.attr.documentName', category: 'document' },
  { value: 'document.description', labelKey: 'format.search.attr.documentDescription', category: 'document' },

  // 測定データ
  { value: 'measurement_value', labelKey: 'format.search.attr.measurementValue', category: 'data' },
  { value: 'units', labelKey: 'format.search.attr.units', category: 'data' },

  // ファイル構造
  { value: 'section_type', labelKey: 'format.search.attr.sectionType', category: 'structure' },

  // MaiML属性（新規追加）
  { value: 'id', labelKey: 'format.search.attr.idAttr', category: 'attributes', isNew: true },
  { value: 'ref', labelKey: 'format.search.attr.refAttr', category: 'attributes', isNew: true },
  { value: 'key', labelKey: 'format.search.attr.keyAttr', category: 'attributes', isNew: true },
  { value: 'element', labelKey: 'format.search.attr.elementName', category: 'attributes', isNew: true },
  { value: 'value', labelKey: 'format.search.attr.genericValue', category: 'attributes', isNew: true },
];

/**
 * フォーマット管理画面用検索モーダルコンポーネント
 */
const FormatSearchModal: React.FC<FormatSearchModalProps> = ({
  open,
  onClose,
  onFileSelect,
}) => {
  const { t, locale } = useLanguage();
  const dateLocale = locale === 'en' ? 'en-US' : 'ja-JP';
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria[]>([
    { attribute: '', value: '' },
  ]);
  const [searchResults, setSearchResults] = useState<FormatSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchStats, setSearchStats] = useState<SearchStats | null>(null);

  /**
   * モーダルを閉じる際の処理
   */
  const handleClose = () => {
    setSearchCriteria([{ attribute: '', value: '' }]);
    setSearchResults([]);
    setError(null);
    setSearchStats(null);
    onClose();
  };

  /**
   * 検索条件の更新
   */
  const updateSearchCriteria = (index: number, field: 'attribute' | 'value', value: string) => {
    const newCriteria = [...searchCriteria];
    newCriteria[index][field] = value;
    setSearchCriteria(newCriteria);
  };

  /**
   * 検索条件の追加
   */
  const addSearchCriteria = () => {
    if (searchCriteria.length < 5) {
      setSearchCriteria([...searchCriteria, { attribute: '', value: '' }]);
    }
  };

  /**
   * 検索条件の削除
   */
  const removeSearchCriteria = (index: number) => {
    if (searchCriteria.length > 1) {
      const newCriteria = searchCriteria.filter((_, i) => i !== index);
      setSearchCriteria(newCriteria);
    }
  };

  /**
   * 検索のリセット
   */
  const handleReset = () => {
    setSearchCriteria([{ attribute: '', value: '' }]);
    setSearchResults([]);
    setError(null);
    setSearchStats(null);
  };

  /**
   * 検索実行
   */
  const handleSearch = async () => {
    setError(null);
    setSearchStats(null);

    const validCriteria = searchCriteria.filter(
      (criteria) => criteria.attribute && criteria.value.trim()
    );

    if (validCriteria.length === 0) {
      setError(t('formatSearch.emptyCondition'));
      return;
    }

    const searchStartTime = Date.now();

    try {
      setIsSearching(true);
      console.log('🔍 フォーマットファイル検索開始:', validCriteria);

      // TODO: 実際のAPI呼び出しに置き換える
      // const results = await searchFormatFilesEnhanced(validCriteria);
      
      // モックデータ（開発用）
      const mockResults: FormatSearchResult[] = [
        {
          id: 'format_file_001',
          name: 'material_template_v1.xml',
          path: 'formats/material/material_template_v1.xml',
          size: 15360,
          lastModified: '2024-11-20T10:30:00Z',
          type: 'xml',
          version: '1.0',
          description: '材料データのテンプレートファイル',
          formatName: '材料データフォーマット',
          category: 'material',
          matchCount: 2,
          matchedAttributes: validCriteria.map(c => ({
            attribute: t(SEARCHABLE_ATTRIBUTE_DEFS.find(a => a.value === c.attribute)?.labelKey || c.attribute),
            value: c.value,
          })),
        },
        {
          id: 'format_file_002',
          name: 'measurement_protocol.maiml',
          path: 'formats/measurement/measurement_protocol.maiml',
          size: 23040,
          lastModified: '2024-12-01T14:45:00Z',
          type: 'maiml',
          version: '2.1',
          description: '測定プロトコルのMAIMLファイル',
          formatName: '測定プロトコルフォーマット',
          category: 'measurement',
          matchCount: 1,
          matchedAttributes: validCriteria.slice(0, 1).map(c => ({
            attribute: t(SEARCHABLE_ATTRIBUTE_DEFS.find(a => a.value === c.attribute)?.labelKey || c.attribute),
            value: c.value,
          })),
        },
      ];

      const searchDuration = Date.now() - searchStartTime;

      setSearchResults(mockResults);
      setSearchStats({
        totalFiles: mockResults.length,
        totalMatches: mockResults.reduce((sum, file) => sum + file.matchCount, 0),
        searchDuration,
        totalCriteria: validCriteria.length,
      });

      if (mockResults.length === 0) {
        setError(t('formatSearch.noResults'));
      }
    } catch (err) {
      console.error('❌ 検索エラー:', err);
      const errorMessage = err instanceof Error ? err.message : t('formatSearch.unknownError');
      setError(`${t('formatSearch.unknownError')}: ${errorMessage}`);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * ファイル選択
   */
  const handleFileSelect = (file: FormatSearchResult) => {
    console.log('📄 ファイル選択:', file.name);
    onFileSelect(file);
    handleClose();
  };

  /**
   * カテゴリ表示名の取得
   */
  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      protocol: t('format.search.category.protocol'),
      material: t('format.search.category.material'),
      measurement: t('format.search.category.measurement'),
      analysis: t('format.search.category.analysis'),
      sample: t('format.search.category.sample'),
      device: t('format.search.category.device'),
    };
    return categoryMap[category] || category;
  };

  /**
   * 検索条件が有効かチェック
   */
  const hasValidCriteria = useMemo(() => {
    return searchCriteria.some(c => c.attribute && c.value.trim());
  }, [searchCriteria]);

  /**
   * 属性セレクトのオプション生成
   */
  const attributeOptions = useMemo(() => {
    const categoryLabelKeys: Record<string, string> = {
      document: 'format.search.categoryLabel.document',
      data: 'format.search.categoryLabel.data',
      structure: 'format.search.categoryLabel.structure',
      attributes: 'format.search.categoryLabel.attributes',
    };
    return Object.entries(ATTRIBUTE_CATEGORY_STYLES).map(([category, catStyle]) => ({
      label: (
        <span>
          <span style={{ marginRight: 8 }}>{catStyle.icon}</span>
          {t(categoryLabelKeys[category] ?? category)}
        </span>
      ),
      options: SEARCHABLE_ATTRIBUTE_DEFS.filter(attr => attr.category === category).map(attr => ({
        value: attr.value,
        label: (
          <span>
            {t(attr.labelKey)}
            {attr.isNew && (
              <Tag color="success" style={{ marginLeft: 8, fontSize: 10 }}>
                NEW
              </Tag>
            )}
          </span>
        ),
      })),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  /**
   * ファイルサイズをフォーマット
   */
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal
      title={
        <Space>
          <SearchOutlined style={{ color: '#CF0027' }} />
          <span>{t('format.search.title')}</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={900}
      footer={null}
      destroyOnHidden
      styles={{
        body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' },
      }}
    >
      {/* 検索説明 */}
      <Alert
        message={t('format.search.integratedSearchTitle')}
        description={t('formatSearch.description')}
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* 検索条件セクション */}
      <Card
        title={
          <Space>
            <SearchOutlined />
            <span>{t('format.search.conditionsLabel')}</span>
          </Space>
        }
        variant="borderless"
        style={{ marginBottom: 24, backgroundColor: '#fafafa' }}
        extra={
          <Space size="small">
            {searchCriteria.length < 5 && (
              <Button
                type="text"
                icon={<PlusOutlined />}
                onClick={addSearchCriteria}
                size="small"
              >
                {t('format.search.addCondition')}
              </Button>
            )}
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={handleReset}
              size="small"
            >
                {t('format.search.reset')}
            </Button>
          </Space>
        }
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          {searchCriteria.map((criteria, index) => (
            <div key={index}>
              <Space align="start" style={{ width: '100%' }}>
                <div
                  style={{
                    width: 28,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#CF0027',
                    color: 'white',
                    borderRadius: 4,
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {index + 1}
                </div>

                <Select
                  placeholder={t('format.search.attrPlaceholder')}
                  value={criteria.attribute || undefined}
                  onChange={(value) => updateSearchCriteria(index, 'attribute', value)}
                  style={{ width: 280 }}
                  options={attributeOptions}
                  showSearch
                  optionFilterProp="children"
                />

                <Input
                  placeholder={t('format.search.valuePlaceholder')}
                  value={criteria.value}
                  onChange={(e) => updateSearchCriteria(index, 'value', e.target.value)}
                  style={{ flex: 1 }}
                  onPressEnter={handleSearch}
                />

                {searchCriteria.length > 1 && (
                  <Button
                    type="text"
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => removeSearchCriteria(index)}
                  />
                )}
              </Space>
              {index < searchCriteria.length - 1 && (
                <Divider style={{ margin: '12px 0' }}>AND</Divider>
              )}
            </div>
          ))}
        </Space>

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            disabled={isSearching || !hasValidCriteria}
            loading={isSearching}
            size="large"
          >
            {t('common.search')}
          </Button>
        </div>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Alert
          message={t('format.search.errorLabel')}
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 検索統計 */}
      {searchStats && (
        <Card
          size="small"
          variant="borderless"
          style={{ marginBottom: 16, backgroundColor: '#E8F5E9' }}
        >
          <Space split={<Divider type="vertical" />} wrap>
            <Text>
              <Text strong>{t('format.search.fileCount')} </Text>
              <Text style={{ color: '#2e7d32', fontWeight: 600 }}>
                {searchStats.totalFiles}{t('format.search.fileCountUnit')}
              </Text>
            </Text>
            <Text>
              <Text strong>{t('format.search.matchCount')} </Text>
              <Text style={{ color: '#2e7d32', fontWeight: 600 }}>
                {searchStats.totalMatches}{t('format.search.matchCountUnit')}
              </Text>
            </Text>
            <Text>
              <Text strong>{t('format.search.searchTime')} </Text>
              <Text style={{ color: '#2e7d32', fontWeight: 600 }}>
                {searchStats.searchDuration}ms
              </Text>
            </Text>
            <Text>
              <Text strong>{t('format.search.conditionText')} </Text>
              <Text style={{ color: '#2e7d32', fontWeight: 600 }}>
                {searchStats.totalCriteria}{t('common.countUnit')}
              </Text>
            </Text>
          </Space>
        </Card>
      )}

      {/* 検索結果 */}
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>{t('format.search.resultsLabel')}</span>
            {searchResults.length > 0 && (
              <Tag color="success">{searchResults.length}{t('common.countUnit')}</Tag>
            )}
          </Space>
        }
        variant="borderless"
      >
        {searchResults.length > 0 ? (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            {searchResults.map((file, index) => (
              <Card
                key={`${file.id}-${index}`}
                size="small"
                hoverable
                onClick={() => handleFileSelect(file)}
                style={{
                  borderColor: 'rgba(0, 0, 0, 0.12)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                styles={{
                  body: { padding: 16 },
                }}
              >
                {/* ファイル名とタイプ */}
                <Space align="center" style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
                  <Space align="center">
                    <FileTextOutlined style={{ fontSize: 16, color: '#CF0027' }} />
                    <Text strong style={{ fontSize: 14 }}>
                      {file.name}
                    </Text>
                  </Space>
                  <Space size="small">
                    <Tag color={file.type === 'maiml' ? 'blue' : 'green'}>
                      {file.type.toUpperCase()}
                    </Tag>
                    {file.version && (
                      <Tag color="default">v{file.version}</Tag>
                    )}
                    <Tag color="success">{file.matchCount}{t('format.search.matchTag')}</Tag>
                  </Space>
                </Space>

                {/* ファイルパス */}
                <div
                  style={{
                    fontSize: 12,
                    color: '#757575',
                    marginBottom: 8,
                    fontFamily: 'monospace',
                    backgroundColor: '#f5f5f5',
                    padding: '4px 8px',
                    borderRadius: 4,
                    wordBreak: 'break-all',
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    📂 {file.path}
                  </Text>
                </div>

                {/* ファイル説明 */}
                {file.description && (
                  <div style={{ fontSize: 12, color: '#757575', marginBottom: 8 }}>
                    <Text type="secondary">{file.description}</Text>
                  </div>
                )}

                {/* ファイル情報 */}
                <Space wrap size="small" style={{ marginBottom: 8 }}>
                  <Tag icon={<span>📁</span>} color="default">
                    {getCategoryLabel(file.category)}
                  </Tag>
                  <Tag icon={<span>📦</span>} color="default">
                    {formatFileSize(file.size)}
                  </Tag>
                  <Tag icon={<span>📅</span>} color="default">
                    {new Date(file.lastModified).toLocaleDateString(dateLocale)}
                  </Tag>
                </Space>

                {/* ヒット属性情報 */}
                {file.matchedAttributes && file.matchedAttributes.length > 0 && (
                  <div>
                    <Text
                      type="secondary"
                      style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, display: 'block' }}
                    >
                      {t('formatSearch.hitAttributes')}
                    </Text>
                    <Space wrap size="small">
                      {file.matchedAttributes.map((match, matchIndex) => (
                        <Tag
                          key={matchIndex}
                          color="cyan"
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 4,
                          }}
                        >
                          <Text strong style={{ fontSize: 11 }}>
                            {match.attribute}:
                          </Text>{' '}
                          <Text style={{ fontSize: 11 }}>{match.value}</Text>
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}
              </Card>
            ))}
          </Space>
        ) : (
          <Empty
            description={
              isSearching
                ? t('formatSearch.searching')
                : searchStats
                ? t('formatSearch.noResults')
                : t('formatSearch.noResultsHint')
            }
            style={{ padding: '40px 0' }}
          />
        )}
      </Card>
    </Modal>
  );
};

export default FormatSearchModal;

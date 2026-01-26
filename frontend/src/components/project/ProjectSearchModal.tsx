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

const { Text, Title } = Typography;

/**
 * 検索条件の型定義
 */
interface SearchCriteria {
  attribute: string;
  value: string;
}

/**
 * 検索結果の型定義（プロジェクト）
 */
interface SearchResult {
  id: string;
  name: string;
  description: string;
  owner: string;
  department: string;
  status: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isCheckedOut: boolean;
  matchCount: number;
  matchedAttributes?: Array<{
    attribute: string;
    value: string;
  }>;
}

/**
 * 検索統計の型定義
 */
interface SearchStats {
  totalFiles: number;
  totalMatches: number;
  searchDuration: number;
  totalCriteria: number;
}

/**
 * プロップスの型定義
 */
interface ProjectSearchModalProps {
  open: boolean;
  onClose: () => void;
  onProjectSelect: (projectId: string) => void;
}

/**
 * 検索属性カテゴリの定義
 */
const ATTRIBUTE_CATEGORIES = {
  document: { label: 'Document情報', icon: '📄', color: '#CF0027' },
  data: { label: '測定データ', icon: '📊', color: '#0093CF' },
  structure: { label: 'ファイル構造', icon: '🏗️', color: '#ed6c02' },
  attributes: { label: 'MaiML属性', icon: '🏷️', color: '#2e7d32' },
};

/**
 * 検索可能な属性の定義
 */
const SEARCHABLE_ATTRIBUTES: Array<{
  value: string;
  label: string;
  category: string;
  isNew?: boolean;
}> = [
  // Document情報
  { value: 'document.uuid', label: 'Document UUID', category: 'document' },
  { value: 'document.name', label: 'Document名', category: 'document' },
  { value: 'document.description', label: 'Document説明', category: 'document' },
  
  // 測定データ
  { value: 'measurement_value', label: '測定値', category: 'data' },
  { value: 'units', label: '単位', category: 'data' },
  
  // ファイル構造
  { value: 'section_type', label: 'セクション種別', category: 'structure' },
  
  // MaiML属性（新規追加）
  { value: 'id', label: 'ID属性', category: 'attributes', isNew: true },
  { value: 'ref', label: 'Ref属性', category: 'attributes', isNew: true },
  { value: 'key', label: 'Key属性', category: 'attributes', isNew: true },
  { value: 'element', label: 'Element名', category: 'attributes', isNew: true },
  { value: 'value', label: '汎用Value', category: 'attributes', isNew: true },
];

/**
 * プロジェクト管理画面用検索モーダルコンポーネント
 */
const ProjectSearchModal: React.FC<ProjectSearchModalProps> = ({
  open,
  onClose,
  onProjectSelect,
}) => {
  const { t } = useLanguage();
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria[]>([
    { attribute: '', value: '' },
  ]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
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
      setError('検索条件を1つ以上設定してください');
      return;
    }

    const searchStartTime = Date.now();

    try {
      setIsSearching(true);
      console.log('🔍 MAIML検索開始:', validCriteria);

      // TODO: 実際のAPI呼び出しに置き換える
      // const results = await searchProjectsEnhanced(validCriteria);
      
      // モックデータ（開発用）
      const mockResults: SearchResult[] = [
        {
          id: 'project_001',
          name: '新材料開発プロジェクト',
          description: '新しい材料の開発に関するプロジェクト',
          owner: '山田太郎',
          department: '研究開発部',
          status: 'in_progress',
          tags: ['材料開発', '実験'],
          createdAt: '2024-01-15',
          updatedAt: '2024-12-10',
          isCheckedOut: false,
          matchCount: 2,
          matchedAttributes: validCriteria.map(c => ({
            attribute: SEARCHABLE_ATTRIBUTES.find(a => a.value === c.attribute)?.label || c.attribute,
            value: c.value,
          })),
        },
        {
          id: 'project_002',
          name: '材料特性評価プロジェクト',
          description: '材料の特性評価に関するプロジェクト',
          owner: '佐藤花子',
          department: '研究開発部',
          status: 'pending',
          tags: ['材料評価', '分析'],
          createdAt: '2024-02-20',
          updatedAt: '2024-12-08',
          isCheckedOut: true,
          matchCount: 1,
          matchedAttributes: validCriteria.slice(0, 1).map(c => ({
            attribute: SEARCHABLE_ATTRIBUTES.find(a => a.value === c.attribute)?.label || c.attribute,
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
        setError('検索条件に一致するプロジェクトが見つかりませんでした');
      }
    } catch (err) {
      console.error('❌ 検索エラー:', err);
      const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(`検索エラー: ${errorMessage}`);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * プロジェクト選択
   */
  const handleProjectSelect = (project: SearchResult) => {
    console.log('📋 プロジェクト選択:', project.name);
    onProjectSelect(project.id);
    handleClose();
  };

  /**
   * ステータス表示名の取得
   */
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      planning: { label: '計画中', color: 'default' },
      pending: { label: '保留', color: 'blue' },
      in_progress: { label: '進行中', color: 'cyan' },
      review_waiting: { label: 'レビュー待ち', color: 'purple' },
      completed: { label: '完了', color: 'success' },
      error: { label: 'エラー', color: 'error' },
    };
    return statusMap[status] || { label: status, color: 'default' };
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
    return Object.entries(ATTRIBUTE_CATEGORIES).map(([category, catInfo]) => ({
      label: (
        <span>
          <span style={{ marginRight: 8 }}>{catInfo.icon}</span>
          {catInfo.label}
        </span>
      ),
      options: SEARCHABLE_ATTRIBUTES.filter(attr => attr.category === category).map(attr => ({
        value: attr.value,
        label: (
          <span>
            {attr.label}
            {attr.isNew && (
              <Tag color="success" style={{ marginLeft: 8, fontSize: 10 }}>
                NEW
              </Tag>
            )}
          </span>
        ),
      })),
    }));
  }, []);

  return (
    <Modal
      title={
        <Space>
          <SearchOutlined style={{ color: '#CF0027' }} />
          <span>プロジェクト詳細検索</span>
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
        message="MAIML統合テーブル高速検索"
        description="高速化されたMaiML統合テーブル検索で、検索条件に一致するMAIMLファイルを含むプロジェクトを表示します。最大5つまで検索条件を組み合わせることができます。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* 検索条件セクション */}
      <Card
        title={
          <Space>
            <SearchOutlined />
            <span>検索条件</span>
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
                条件追加
              </Button>
            )}
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={handleReset}
              size="small"
            >
              リセット
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
                  placeholder="属性を選択"
                  value={criteria.attribute || undefined}
                  onChange={(value) => updateSearchCriteria(index, 'attribute', value)}
                  style={{ width: 280 }}
                  options={attributeOptions}
                  showSearch
                  optionFilterProp="children"
                />

                <Input
                  placeholder="検索値を入力"
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
            検索
          </Button>
        </div>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Alert
          message="エラー"
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
              <Text strong>プロジェクト数: </Text>
              <Text style={{ color: '#2e7d32', fontWeight: 600 }}>
                {searchStats.totalFiles}件
              </Text>
            </Text>
            <Text>
              <Text strong>マッチ数: </Text>
              <Text style={{ color: '#2e7d32', fontWeight: 600 }}>
                {searchStats.totalMatches}箇所
              </Text>
            </Text>
            <Text>
              <Text strong>検索時間: </Text>
              <Text style={{ color: '#2e7d32', fontWeight: 600 }}>
                {searchStats.searchDuration}ms
              </Text>
            </Text>
            <Text>
              <Text strong>検索条件: </Text>
              <Text style={{ color: '#2e7d32', fontWeight: 600 }}>
                {searchStats.totalCriteria}件
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
            <span>検索結果</span>
            {searchResults.length > 0 && (
              <Tag color="success">{searchResults.length}件</Tag>
            )}
          </Space>
        }
        variant="borderless"
      >
        {searchResults.length > 0 ? (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            {searchResults.map((project, index) => {
              const statusInfo = getStatusLabel(project.status);
              return (
                <Card
                  key={`${project.id}-${index}`}
                  size="small"
                  hoverable
                  onClick={() => handleProjectSelect(project)}
                  style={{
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  styles={{
                    body: { padding: 16 },
                  }}
                >
                  {/* プロジェクト名とステータス */}
                  <Space align="center" style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
                    <Space align="center">
                      <FileTextOutlined style={{ fontSize: 16, color: '#CF0027' }} />
                      <Text strong style={{ fontSize: 14 }}>
                        {project.name}
                      </Text>
                    </Space>
                    <Space size="small">
                      <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
                      {project.isCheckedOut && (
                        <Tag color="orange">チェックアウト中</Tag>
                      )}
                      <Tag color="success">{project.matchCount}マッチ</Tag>
                    </Space>
                  </Space>

                  {/* プロジェクトID */}
                  <div
                    style={{
                      fontSize: 12,
                      color: '#757575',
                      marginBottom: 8,
                      fontFamily: 'monospace',
                      backgroundColor: '#f5f5f5',
                      padding: '4px 8px',
                      borderRadius: 4,
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      📋 ID: {project.id}
                    </Text>
                  </div>

                  {/* プロジェクト説明 */}
                  {project.description && (
                    <div style={{ fontSize: 12, color: '#757575', marginBottom: 8 }}>
                      <Text type="secondary">{project.description}</Text>
                    </div>
                  )}

                  {/* 組織情報 */}
                  <Space wrap size="small" style={{ marginBottom: 8 }}>
                    <Tag icon={<span>👤</span>} color="default">
                      {project.owner}
                    </Tag>
                    <Tag icon={<span>🏢</span>} color="default">
                      {project.department}
                    </Tag>
                    <Tag icon={<span>📅</span>} color="default">
                      {project.createdAt}
                    </Tag>
                  </Space>

                  {/* タグ */}
                  {project.tags && project.tags.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <Space wrap size="small">
                        {project.tags.map((tag, tagIndex) => (
                          <Tag key={tagIndex} color="blue" style={{ fontSize: 11 }}>
                            {tag}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  )}

                  {/* ヒット属性情報 */}
                  {project.matchedAttributes && project.matchedAttributes.length > 0 && (
                    <div>
                      <Text
                        type="secondary"
                        style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, display: 'block' }}
                      >
                        🎯 ヒット属性:
                      </Text>
                      <Space wrap size="small">
                        {project.matchedAttributes.map((match, matchIndex) => (
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
              );
            })}
          </Space>
        ) : (
          <Empty
            description={
              isSearching
                ? '検索中...'
                : searchStats
                ? '検索条件に一致するプロジェクトが見つかりませんでした'
                : '検索条件を設定して「検索」ボタンを押してください'
            }
            style={{ padding: '40px 0' }}
          />
        )}
      </Card>
    </Modal>
  );
};

export default ProjectSearchModal;

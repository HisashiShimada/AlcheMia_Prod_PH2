/**
 * トランジション検索モーダル
 *
 * @description 統合クエリ入力・クイック検索・重み調整・検索結果表示を統合したモーダルコンポーネント
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  Modal,
  Tabs,
  Input,
  Button,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Badge,
  Collapse,
  Tooltip,
  Alert,
  message,
} from 'antd';
import {
  SearchOutlined,
  SettingOutlined,
  CloudUploadOutlined,
  ThunderboltOutlined,
  AccountBookOutlined,
  InboxOutlined,
  ExportOutlined,
  ApartmentOutlined,
  StarOutlined,
} from '@ant-design/icons';
import WeightSliders from './WeightSliders';
import SearchResults from './SearchResults';
import TransitionSetBatchProcessingPanel from './TransitionSetBatchProcessingPanel';
import { useSemanticSearch, DEFAULT_WEIGHTS, WEIGHT_PRESETS } from '@/hooks/useSemanticSearch';
import { decomposeNaturalLanguageQuery } from '@/services/semanticSearchService';
import type { SearchWeights, SemanticSearchRequest, DecomposedQuery } from '@/types/semanticSearch';
import { useLanguage } from '@/contexts/LanguageContext';

const { TextArea } = Input;
const { Text } = Typography;

interface TransitionSetSearchModalProps {
  open: boolean;
  onClose: () => void;
  /** プロジェクト名クリック時のコールバック（ProjectManagementでプロジェクトを選択するため） */
  onOpenProject?: (projectName: string) => void;
  /** 初期フィルター：プロジェクト名 */
  initialProjectName?: string;
}

/** クイック検索ボタン定義（labelはt()で解決するためkeyのみ持つ） */
const QUICK_SEARCH_BUTTON_DEFS = [
  { key: 'structureFocused', icon: <ApartmentOutlined /> },
  { key: 'procedureFocused', icon: <ThunderboltOutlined /> },
  { key: 'inputFocused', icon: <InboxOutlined /> },
  { key: 'outputFocused', icon: <ExportOutlined /> },
  { key: 'balanced', icon: <StarOutlined /> },
] as const;

/**
 * トランジション検索モーダル
 */
const TransitionSetSearchModal: React.FC<TransitionSetSearchModalProps> = ({
  open,
  onClose,
  onOpenProject,
  initialProjectName,
}) => {
  const { t } = useLanguage();

  // 統合クエリ（メイン入力）
  const [query, setQuery] = useState('');

  // 重み
  const [weights, setWeights] = useState<SearchWeights>(DEFAULT_WEIGHTS);

  // AI分解結果表示用
  const [decomposed, setDecomposed] = useState<DecomposedQuery | null>(null);
  const [decomposing, setDecomposing] = useState(false);

  // 検索フック
  const { hits, loading, error, searched, elapsedMs, search, clearResults } =
    useSemanticSearch();

  /**
   * クエリをAI分解して検索リクエストを生成する
   */
  const buildRequest = useCallback(
    async (customWeights?: SearchWeights): Promise<SemanticSearchRequest | null> => {
      if (!query.trim()) return null;
      setDecomposing(true);
      try {
        const result = await decomposeNaturalLanguageQuery(query.trim());
        setDecomposed(result);
        return {
          ...(result.q_in && { input_query: result.q_in }),
          ...(result.q_tr && { transition_query: result.q_tr }),
          ...(result.q_out && { output_query: result.q_out }),
          ...(result.q_struct && { structure_query: result.q_struct }),
          top_k: 50,
          weights: customWeights ?? weights,
        };
      } catch (err) {
        console.error('[TransitionSetSearchModal] decompose error:', err);
        // フォールバック：クエリをtransition_queryとして渡す
        return {
          transition_query: query.trim(),
          top_k: 50,
          weights: customWeights ?? weights,
        };
      } finally {
        setDecomposing(false);
      }
    },
    [query, weights]
  );

  /**
   * 通常検索
   */
  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      message.warning(t('transitionSearch.queryRequired'));
      return;
    }
    const request = await buildRequest();
    if (!request) return;
    await search(request);
  }, [query, buildRequest, search]);

  /**
   * クイック検索：プリセット重みで即時検索
   */
  const handleQuickSearch = useCallback(
    async (presetKey: string) => {
      if (!query.trim()) {
        message.warning(t('transitionSearch.quickSearchQueryRequired'));
        return;
      }
      const preset = WEIGHT_PRESETS[presetKey];
      if (!preset) return;

      // 重みをUIに反映
      setWeights(preset.weights);

      const request = await buildRequest(preset.weights);
      if (!request) return;
      await search(request);
    },
    [query, buildRequest, search]
  );

  const handleClear = () => {
    setQuery('');
    setDecomposed(null);
    clearResults();
  };

  const handleClose = () => {
    handleClear();
    onClose();
  };

  const isProcessing = loading || decomposing;

  return (
    <Modal
      title={
        <Space>
          <AccountBookOutlined />
          <span>{t('projectManagement.transitionSearch')}</span>
          {searched && hits.length > 0 && (
            <Badge count={hits.length} showZero color="blue" />
          )}
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={960}
      footer={null}
      destroyOnHidden={false}
      styles={{ body: { padding: '16px 24px', maxHeight: '80vh', overflowY: 'auto' } }}
    >
      <Tabs
        defaultActiveKey="search"
        size="small"
        items={[
          {
            key: 'search',
            label: t('transitionSearch.searchTab'),
            children: (
              <div>
                {/* ── 検索クエリ入力 ── */}
                <div style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12 }}>{t('transitionSearch.queryLabel')}</Text>
                  <TextArea
                    rows={3}
                    placeholder={t('transitionSearch.queryPlaceholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    style={{ marginTop: 4, fontSize: 12 }}
                  />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {t('transitionSearch.queryHint')}
                  </Text>
                </div>

                {/* ── 検索ボタン ── */}
                <Space style={{ marginBottom: 12 }}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<SearchOutlined />}
                    loading={isProcessing}
                    disabled={!query.trim()}
                    onClick={handleSearch}
                    style={{ minWidth: 140 }}
                  >
                    {isProcessing ? t('transitionSearch.searching') : t('transitionSearch.searchButton')}
                  </Button>
                  <Button onClick={handleClear} disabled={isProcessing}>
                    {t('transitionSearch.reset')}
                  </Button>
                </Space>

                {/* ── クイック検索 ── */}
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                    {t('transitionSearch.quickSearchLabel')}
                  </Text>
                  <Space wrap>
                    {QUICK_SEARCH_BUTTON_DEFS.map(({ key, icon }) => (
                      <Tooltip
                        key={key}
                        title={WEIGHT_PRESETS[key]?.description ?? ''}
                      >
                        <Button
                          icon={icon}
                          size="small"
                          onClick={() => handleQuickSearch(key)}
                          disabled={isProcessing || !query.trim()}
                        >
                          {t(`transitionSearch.quickSearch.${key}`)}
                        </Button>
                      </Tooltip>
                    ))}
                  </Space>
                </div>

                {/* ── AI分解結果表示 ── */}
                {decomposed && (
                  <div
                    style={{
                      padding: '8px 12px',
                      background: '#f9f0ff',
                      border: '1px solid #d3adf7',
                      borderRadius: 4,
                      marginBottom: 12,
                    }}
                  >
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                      {t('transitionSearch.aiAnalysis')}
                    </Text>
                    <Row gutter={8}>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 11 }}>{t('transitionSearch.decomposed.input')}</Text>
                        <Text style={{ fontSize: 11, display: 'block' }}>
                          {decomposed.q_in || '-'}
                        </Text>
                      </Col>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 11 }}>{t('transitionSearch.decomposed.procedure')}</Text>
                        <Text style={{ fontSize: 11, display: 'block' }}>
                          {decomposed.q_tr || '-'}
                        </Text>
                      </Col>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 11 }}>{t('transitionSearch.decomposed.output')}</Text>
                        <Text style={{ fontSize: 11, display: 'block' }}>
                          {decomposed.q_out || '-'}
                        </Text>
                      </Col>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 11 }}>{t('transitionSearch.decomposed.structure')}</Text>
                        <Text style={{ fontSize: 11, display: 'block' }}>
                          {decomposed.q_struct || '-'}
                        </Text>
                      </Col>
                    </Row>
                  </div>
                )}

                {/* ── 重み設定（折りたたみ） ── */}
                <Collapse
                  size="small"
                  style={{ marginBottom: 8 }}
                  items={[
                    {
                      key: 'weights',
                      label: (
                        <Space size="small">
                          <SettingOutlined />
                          <span style={{ fontSize: 12 }}>{t('transitionSearch.advancedWeights')}</span>
                        </Space>
                      ),
                      children: (
                        <div style={{ padding: '4px 0' }}>
                          <WeightSliders
                            weights={weights}
                            onChange={setWeights}
                            disabled={isProcessing}
                          />
                        </div>
                      ),
                    },
                  ]}
                />

                <Divider style={{ margin: '8px 0' }} />

                {/* エラー表示 */}
                {error && (
                  <Alert
                    type="error"
                    message={error}
                    showIcon
                    style={{ marginBottom: 12 }}
                    closable
                  />
                )}

                {/* 未検索時のヒント */}
                {!searched && !loading && (
                  <div
                    style={{
                      padding: 24,
                      textAlign: 'center',
                      background: '#fafafa',
                      border: '1px dashed #d9d9d9',
                      borderRadius: 4,
                    }}
                  >
                    <SearchOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 12 }} />
                    <Typography.Title level={5} type="secondary" style={{ marginBottom: 8 }}>
                      {t('transitionSearch.startHint')}
                    </Typography.Title>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                      {t('transitionSearch.startHintDesc')}
                    </Text>
                    <div style={{ textAlign: 'left', maxWidth: 480, margin: '0 auto' }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                        {t('transitionSearch.exampleInput')}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                        {t('transitionSearch.exampleProcedure')}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                        {t('transitionSearch.exampleOutput')}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                        {t('transitionSearch.exampleStructure')}
                      </Text>
                    </div>
                  </div>
                )}

                {/* 検索結果 */}
                <SearchResults
                  hits={hits}
                  loading={loading}
                  error={null}
                  searched={searched}
                  elapsedMs={elapsedMs}
                  onOpenProject={(name) => {
                    if (onOpenProject) {
                      onOpenProject(name);
                      handleClose();
                    }
                  }}
                />
              </div>
            ),
          },
          {
            key: 'batch',
            label: (
              <Space size="small">
                <CloudUploadOutlined />
                {t('transitionSearch.batchTab')}
              </Space>
            ),
            children: <TransitionSetBatchProcessingPanel />,
          },
        ]}
      />
    </Modal>
  );
};

export default TransitionSetSearchModal;

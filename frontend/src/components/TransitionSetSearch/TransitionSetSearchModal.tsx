/**
 * セマンティック検索モーダル
 *
 * @description 4軸クエリ入力・重み調整・検索結果表示を統合したモーダルコンポーネント
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
  InputNumber,
  Row,
  Col,
  Badge,
  Collapse,
} from 'antd';
import { SearchOutlined, SettingOutlined, CloudUploadOutlined } from '@ant-design/icons';
import WeightSliders from './WeightSliders';
import SearchResults from './SearchResults';
import TransitionSetBatchProcessingPanel from './TransitionSetBatchProcessingPanel';
import { useSemanticSearch, DEFAULT_WEIGHTS } from '@/hooks/useSemanticSearch';
import type { SearchWeights, SemanticSearchRequest } from '@/types/semanticSearch';

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

/**
 * セマンティック検索モーダル
 */
const TransitionSetSearchModal: React.FC<TransitionSetSearchModalProps> = ({
  open,
  onClose,
  onOpenProject,
  initialProjectName,
}) => {
  // 検索クエリ
  const [inputQuery, setInputQuery] = useState('');
  const [transitionQuery, setTransitionQuery] = useState('');
  const [outputQuery, setOutputQuery] = useState('');
  const [structureQuery, setStructureQuery] = useState('');

  // フィルター
  const [projectNameFilter, setProjectNameFilter] = useState(initialProjectName ?? '');
  const [techniqueFilter, setTechniqueFilter] = useState('');
  const [topK, setTopK] = useState(10);

  // 重み
  const [weights, setWeights] = useState<SearchWeights>(DEFAULT_WEIGHTS);

  // 検索フック
  const { hits, loading, error, searched, elapsedMs, search, clearResults } =
    useSemanticSearch();

  const handleSearch = useCallback(async () => {
    const request: SemanticSearchRequest = {
      ...(inputQuery.trim() && { input_query: inputQuery.trim() }),
      ...(transitionQuery.trim() && { transition_query: transitionQuery.trim() }),
      ...(outputQuery.trim() && { output_query: outputQuery.trim() }),
      ...(structureQuery.trim() && { structure_query: structureQuery.trim() }),
      top_k: topK,
      ...(projectNameFilter.trim() && { project_name: projectNameFilter.trim() }),
      ...(techniqueFilter.trim() && { technique: techniqueFilter.trim() }),
      weights,
    };
    await search(request);
  }, [
    inputQuery,
    transitionQuery,
    outputQuery,
    structureQuery,
    topK,
    projectNameFilter,
    techniqueFilter,
    weights,
    search,
  ]);

  const handleClear = () => {
    setInputQuery('');
    setTransitionQuery('');
    setOutputQuery('');
    setStructureQuery('');
    clearResults();
  };

  const handleClose = () => {
    handleClear();
    onClose();
  };

  const hasAnyQuery =
    inputQuery.trim() ||
    transitionQuery.trim() ||
    outputQuery.trim() ||
    structureQuery.trim();

  return (
    <Modal
      title={
        <Space>
          <SearchOutlined />
          <span>セマンティック検索</span>
          {searched && hits.length > 0 && (
            <Badge count={hits.length} showZero color="blue" />
          )}
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={900}
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
            label: '検索',
            children: (
              <div>
                {/* クエリ入力エリア */}
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 12 }}>入力（Input）クエリ</Text>
                      <TextArea
                        rows={2}
                        placeholder="サンプルの種類・前処理条件など"
                        value={inputQuery}
                        onChange={(e) => setInputQuery(e.target.value)}
                        style={{ marginTop: 4, fontSize: 12 }}
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 12 }}>出力（Output）クエリ</Text>
                      <TextArea
                        rows={2}
                        placeholder="期待される測定結果・生成物など"
                        value={outputQuery}
                        onChange={(e) => setOutputQuery(e.target.value)}
                        style={{ marginTop: 4, fontSize: 12 }}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 12 }}>手法（Transition）クエリ</Text>
                      <TextArea
                        rows={2}
                        placeholder="使用する分析・処理手法など"
                        value={transitionQuery}
                        onChange={(e) => setTransitionQuery(e.target.value)}
                        style={{ marginTop: 4, fontSize: 12 }}
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 12 }}>構造（Structure）クエリ</Text>
                      <TextArea
                        rows={2}
                        placeholder="プレース数・テンプレート数など構造的特徴"
                        value={structureQuery}
                        onChange={(e) => setStructureQuery(e.target.value)}
                        style={{ marginTop: 4, fontSize: 12 }}
                      />
                    </div>
                  </Col>
                </Row>

                {/* フィルター */}
                <Row gutter={16} style={{ marginBottom: 8 }}>
                  <Col span={8}>
                    <Text style={{ fontSize: 12 }}>プロジェクト名フィルター</Text>
                    <Input
                      size="small"
                      placeholder="例: my_project"
                      value={projectNameFilter}
                      onChange={(e) => setProjectNameFilter(e.target.value)}
                      style={{ marginTop: 4 }}
                      allowClear
                    />
                  </Col>
                  <Col span={8}>
                    <Text style={{ fontSize: 12 }}>手法コードフィルター</Text>
                    <Input
                      size="small"
                      placeholder="例: RAMAN, XRF"
                      value={techniqueFilter}
                      onChange={(e) => setTechniqueFilter(e.target.value)}
                      style={{ marginTop: 4 }}
                      allowClear
                    />
                  </Col>
                  <Col span={4}>
                    <Text style={{ fontSize: 12 }}>上位件数</Text>
                    <InputNumber
                      size="small"
                      min={1}
                      max={50}
                      value={topK}
                      onChange={(v) => setTopK(v ?? 10)}
                      style={{ marginTop: 4, width: '100%' }}
                    />
                  </Col>
                </Row>

                {/* 重み設定（折りたたみ） */}
                <Collapse
                  size="small"
                  style={{ marginBottom: 8 }}
                  items={[
                    {
                      key: 'weights',
                      label: (
                        <Space size="small">
                          <SettingOutlined />
                          <span style={{ fontSize: 12 }}>詳細な重み調整（上級者向け）</span>
                        </Space>
                      ),
                      children: (
                        <div style={{ padding: '4px 0' }}>
                          <WeightSliders
                            weights={weights}
                            onChange={setWeights}
                            disabled={loading}
                          />
                        </div>
                      ),
                    },
                  ]}
                />

                <Divider style={{ margin: '8px 0' }} />

                {/* ボタン */}
                <Space>
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    loading={loading}
                    disabled={!hasAnyQuery}
                    onClick={handleSearch}
                  >
                    検索
                  </Button>
                  <Button onClick={handleClear} disabled={loading}>
                    クリア
                  </Button>
                </Space>

                <Divider style={{ margin: '12px 0' }} />

                {/* 検索結果 */}
                <SearchResults
                  hits={hits}
                  loading={loading}
                  error={error}
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
                バッチ処理
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

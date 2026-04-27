/**
 * セマンティック検索結果コンポーネント
 *
 * @description 検索結果の一覧表示と詳細情報の展開表示を担当
 */

'use client';

import React, { useState } from 'react';
import {
  Typography,
  Tag,
  Space,
  Button,
  Collapse,
  Progress,
  Empty,
  Spin,
  Alert,
} from 'antd';
import {
  FolderOpenOutlined,
  FileTextOutlined,
  DownOutlined,
} from '@ant-design/icons';
import type { SemanticSearchHit } from '@/types/semanticSearch';

const { Text, Paragraph } = Typography;

interface SearchResultsProps {
  hits: SemanticSearchHit[];
  loading: boolean;
  error: string | null;
  searched: boolean;
  elapsedMs: number | null;
  onOpenProject?: (projectName: string) => void;
}

/** スコアを色に変換（0〜1） */
function scoreToColor(score: number): string {
  if (score >= 0.8) return '#52c41a';
  if (score >= 0.6) return '#1677ff';
  if (score >= 0.4) return '#faad14';
  return '#ff4d4f';
}

/**
 * 検索結果リスト
 */
const SearchResults: React.FC<SearchResultsProps> = ({
  hits,
  loading,
  error,
  searched,
  elapsedMs,
  onOpenProject,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" tip="検索中...">
          <div />
        </Spin>
      </div>
    );
  }

  if (error) {
    return <Alert type="error" message="検索エラー" description={error} showIcon />;
  }

  if (!searched) {
    return (
      <Empty
        description="検索条件を入力して「検索」ボタンを押してください"
        style={{ padding: 40 }}
      />
    );
  }

  if (hits.length === 0) {
    return <Empty description="検索結果が見つかりませんでした" style={{ padding: 40 }} />;
  }

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {hits.length}件 {elapsedMs != null ? `（${elapsedMs}ms）` : ''}
        </Text>
      </div>

      {hits.map((hit, index) => {
        const isExpanded = expandedIds.has(hit.transition_set_id);
        const scorePercent = Math.round(hit.score * 100);

        return (
          <div
            key={hit.transition_set_id}
            style={{
              padding: '8px 0',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <div style={{ width: '100%' }}>
              {/* ヘッダー行 */}
              <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space size="small">
                  <Text strong style={{ fontSize: 13 }}>
                    #{index + 1}
                  </Text>
                  <Tag color="blue" icon={<FileTextOutlined />}>
                    {hit.transition_id}
                  </Tag>
                  {hit.technique && <Tag color="purple">{hit.technique}</Tag>}
                  {hit.project_name && (
                    <Tag
                      color="green"
                      icon={<FolderOpenOutlined />}
                      style={{ cursor: onOpenProject ? 'pointer' : 'default' }}
                      onClick={() => onOpenProject && hit.project_name && onOpenProject(hit.project_name)}
                    >
                      {hit.project_name}
                    </Tag>
                  )}
                </Space>

                <Space size="small">
                  <Progress
                    type="circle"
                    size={36}
                    percent={scorePercent}
                    strokeColor={scoreToColor(hit.score)}
                    format={(p) => (
                      <span style={{ fontSize: 10 }}>{p}%</span>
                    )}
                  />
                  <Button
                    size="small"
                    type="text"
                    icon={<DownOutlined rotate={isExpanded ? 180 : 0} />}
                    onClick={() => toggleExpand(hit.transition_set_id)}
                  >
                    詳細
                  </Button>
                </Space>
              </Space>

              {/* ファイルパス */}
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {hit.file_path}
                </Text>
              </div>

              {/* 展開コンテンツ */}
              {isExpanded && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 8,
                    background: '#fafafa',
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  {/* スコア内訳 */}
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      スコア内訳:
                    </Text>
                    <Space size="small" style={{ marginLeft: 8 }}>
                      <Tag>入力 {Math.round(hit.score_detail.input_score * 100)}%</Tag>
                      <Tag>手法 {Math.round(hit.score_detail.transition_score * 100)}%</Tag>
                      <Tag>出力 {Math.round(hit.score_detail.output_score * 100)}%</Tag>
                      <Tag>構造 {Math.round(hit.score_detail.structure_score * 100)}%</Tag>
                    </Space>
                  </div>

                  {/* 4軸テキスト */}
                  <Collapse
                    size="small"
                    ghost
                    items={[
                      {
                        key: 'input',
                        label: <Text style={{ fontSize: 11 }}>Input テキスト</Text>,
                        children: (
                          <Paragraph
                            style={{ fontSize: 11, whiteSpace: 'pre-wrap', margin: 0 }}
                          >
                            {hit.input_text}
                          </Paragraph>
                        ),
                      },
                      {
                        key: 'transition',
                        label: <Text style={{ fontSize: 11 }}>Transition テキスト</Text>,
                        children: (
                          <Paragraph
                            style={{ fontSize: 11, whiteSpace: 'pre-wrap', margin: 0 }}
                          >
                            {hit.transition_text}
                          </Paragraph>
                        ),
                      },
                      {
                        key: 'output',
                        label: <Text style={{ fontSize: 11 }}>Output テキスト</Text>,
                        children: (
                          <Paragraph
                            style={{ fontSize: 11, whiteSpace: 'pre-wrap', margin: 0 }}
                          >
                            {hit.output_text}
                          </Paragraph>
                        ),
                      },
                    ]}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SearchResults;

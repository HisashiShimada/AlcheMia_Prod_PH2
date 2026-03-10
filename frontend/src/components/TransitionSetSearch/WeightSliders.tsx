/**
 * 4軸重みスライダーコンポーネント
 *
 * @description セマンティック検索の4軸（input/transition/output/structure）の重みを
 *              スライダーで調整するUIコンポーネント
 */

'use client';

import React, { useState } from 'react';
import { Slider, Typography, Space, Button, Row, Col, Tag, Tooltip } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { SearchWeights } from '@/types/semanticSearch';
import { WEIGHT_PRESETS, DEFAULT_WEIGHTS } from '@/hooks/useSemanticSearch';

const { Text } = Typography;

interface WeightSlidersProps {
  weights: SearchWeights;
  onChange: (weights: SearchWeights) => void;
  disabled?: boolean;
}

const AXIS_LABELS: Record<keyof SearchWeights, string> = {
  input: '📥 入力条件',
  transition: '⚡ 手順',
  output: '📤 出力',
  structure: '🕸️ 構造',
};

/**
 * 4軸重みスライダー
 */
const WeightSliders: React.FC<WeightSlidersProps> = ({ weights, onChange, disabled }) => {
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handleAxisChange = (axis: keyof SearchWeights, value: number) => {
    onChange({ ...weights, [axis]: value / 100 });
    setActivePreset(null);
  };

  const handlePresetClick = (presetKey: string) => {
    const preset = WEIGHT_PRESETS[presetKey];
    if (preset) {
      onChange(preset.weights);
      setActivePreset(presetKey);
    }
  };

  const handleReset = () => {
    onChange(DEFAULT_WEIGHTS);
    setActivePreset('balanced');
  };

  const total = Object.values(weights).reduce((sum, v) => sum + v, 0);
  const totalPercent = Math.round(total * 100);

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size="small">
      {/* ヘッダー */}
      <Row justify="space-between" align="middle">
        <Col>
          <Text strong style={{ fontSize: 12 }}>
            🎚️ 検索重み設定
          </Text>
        </Col>
        <Col>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleReset}
            disabled={disabled}
            style={{ fontSize: 12 }}
          >
            デフォルト
          </Button>
        </Col>
      </Row>

      {/* プリセットボタン群 */}
      <div>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
          プリセット
        </Text>
        <Row gutter={[4, 4]}>
          {Object.entries(WEIGHT_PRESETS).map(([key, preset]) => (
            <Col key={key} xs={12} sm={8}>
              <Tooltip title={preset.description}>
                <Button
                  size="small"
                  type={activePreset === key ? 'primary' : 'default'}
                  block
                  onClick={() => handlePresetClick(key)}
                  disabled={disabled}
                  style={{ fontSize: 11 }}
                >
                  {preset.name}
                </Button>
              </Tooltip>
            </Col>
          ))}
        </Row>
      </div>

      {/* 合計表示 */}
      <Row>
        <Col>
          <Tag color={totalPercent === 100 ? 'success' : 'warning'}>
            合計: {totalPercent}%
          </Tag>
        </Col>
      </Row>

      {/* 各軸スライダー */}
      {(Object.keys(weights) as (keyof SearchWeights)[]).map((axis) => (
        <Row key={axis} gutter={8} align="middle">
          <Col span={8}>
            <Text style={{ fontSize: 12 }}>{AXIS_LABELS[axis]}</Text>
          </Col>
          <Col span={12}>
            <Slider
              min={0}
              max={100}
              step={5}
              value={Math.round(weights[axis] * 100)}
              onChange={(val) => handleAxisChange(axis, val)}
              disabled={disabled}
            />
          </Col>
          <Col span={4}>
            <Text style={{ fontSize: 12 }}>{Math.round(weights[axis] * 100)}%</Text>
          </Col>
        </Row>
      ))}

      {/* ヒント */}
      <div
        style={{
          padding: '8px 12px',
          background: '#f0f5ff',
          border: '1px solid #adc6ff',
          borderRadius: 4,
        }}
      >
        <Text type="secondary" style={{ fontSize: 11 }}>
          💡 スライダーを調整すると自動的に重みが変更されます。
          プリセットを選択すると推奨バランスが適用されます。
        </Text>
      </div>
    </Space>
  );
};

export default WeightSliders;

/**
 * 4軸重みスライダーコンポーネント
 *
 * @description セマンティック検索の4軸（input/transition/output/structure）の重みを
 *              スライダーで調整するUIコンポーネント
 */

'use client';

import React from 'react';
import { Slider, Typography, Space, Select, Row, Col, Tag } from 'antd';
import type { SearchWeights } from '@/types/semanticSearch';
import { WEIGHT_PRESETS } from '@/hooks/useSemanticSearch';

const { Text } = Typography;

interface WeightSlidersProps {
  weights: SearchWeights;
  onChange: (weights: SearchWeights) => void;
  disabled?: boolean;
}

const AXIS_LABELS: Record<keyof SearchWeights, string> = {
  input: '入力（Input）',
  transition: '手法（Transition）',
  output: '出力（Output）',
  structure: '構造（Structure）',
};

/**
 * 4軸重みスライダー
 */
const WeightSliders: React.FC<WeightSlidersProps> = ({ weights, onChange, disabled }) => {
  const handleAxisChange = (axis: keyof SearchWeights, value: number) => {
    onChange({ ...weights, [axis]: value / 100 });
  };

  const handlePresetSelect = (index: number) => {
    onChange(WEIGHT_PRESETS[index].weights);
  };

  const total = Object.values(weights).reduce((sum, v) => sum + v, 0);
  const totalPercent = Math.round(total * 100);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <Row align="middle" gutter={8}>
        <Col>
          <Text type="secondary" style={{ fontSize: 12 }}>
            プリセット:
          </Text>
        </Col>
        <Col>
          <Select
            size="small"
            style={{ width: 200 }}
            placeholder="プリセットを選択"
            disabled={disabled}
            onChange={handlePresetSelect}
            options={WEIGHT_PRESETS.map((p, i) => ({ value: i, label: p.label }))}
          />
        </Col>
        <Col>
          <Tag color={totalPercent === 100 ? 'success' : 'warning'}>
            合計: {totalPercent}%
          </Tag>
        </Col>
      </Row>

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
    </Space>
  );
};

export default WeightSliders;

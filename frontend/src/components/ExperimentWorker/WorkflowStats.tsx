'use client';

import React from 'react';
import { Row, Col, Space, Typography } from 'antd';
import { WorkflowStatistics } from '@/types/experimentWorker';

const { Text } = Typography;

interface WorkflowStatsProps {
  statistics: WorkflowStatistics;
}

/**
 * ワークフロー統計情報バー
 * タスクのステータス別件数と進捗率を表示する
 */
export default function WorkflowStats({ statistics }: WorkflowStatsProps) {
  return (
    <div
      style={{
        background: '#E8F5E9',
        padding: '16px 24px',
        borderRadius: '8px',
        marginBottom: '16px'
      }}
    >
      <Row gutter={[16, 8]} align="middle">
        {/* 開始前のトランジション */}
        <Col xs={24} sm={12} md={6}>
          <Space direction="vertical" size={0}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              開始前のトランジション
            </Text>
            <Text strong style={{ fontSize: '18px', color: '#212121' }}>
              {statistics.notStarted}
            </Text>
          </Space>
        </Col>

        {/* 開始 */}
        <Col xs={12} sm={6} md={4}>
          <Space direction="vertical" size={0}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              開始
            </Text>
            <Text strong style={{ fontSize: '18px', color: '#0093CF' }}>
              {statistics.started}
            </Text>
          </Space>
        </Col>

        {/* 作業中 */}
        <Col xs={12} sm={6} md={4}>
          <Space direction="vertical" size={0}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              作業中
            </Text>
            <Text strong style={{ fontSize: '18px', color: '#0093CF' }}>
              {statistics.inProgress}
            </Text>
          </Space>
        </Col>

        {/* 完了 */}
        <Col xs={12} sm={6} md={4}>
          <Space direction="vertical" size={0}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              完了
            </Text>
            <Text strong style={{ fontSize: '18px', color: '#CF0027' }}>
              {statistics.completed}
            </Text>
          </Space>
        </Col>

        {/* 進捗率 */}
        <Col xs={12} sm={6} md={6}>
          <Space direction="vertical" size={0}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              進捗率
            </Text>
            <Text strong style={{ fontSize: '20px', color: '#CF0027' }}>
              {statistics.progressRate}%
            </Text>
          </Space>
        </Col>
      </Row>
    </div>
  );
}

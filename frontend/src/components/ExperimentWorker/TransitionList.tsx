'use client';

import React from 'react';
import { Card, Space, Tag, Typography, Empty } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { Transition } from '@/types/experimentWorker';

const { Title, Text, Paragraph } = Typography;

interface TransitionListProps {
  transitions: Transition[];
  methodName?: string;
  selectedTaskId?: string;
  onTaskCreated?: (taskId: string) => void;
}

/**
 * トランジション一覧表示コンポーネント（簡略版）
 * 選択されたメソッドに含まれるトランジションを一覧表示
 */
export default function TransitionList({
  transitions,
  methodName,
}: TransitionListProps) {
  if (!transitions || transitions.length === 0) {
    return (
      <Card>
        <Empty
          description={
            methodName
              ? `「${methodName}」にはトランジションが登録されていません`
              : 'メソッドを選択してください'
          }
        />
      </Card>
    );
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        📋 トランジション一覧
        {methodName && (
          <Text type="secondary" style={{ fontSize: 14, marginLeft: 8 }}>
            （{methodName}）
          </Text>
        )}
      </Title>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {transitions.map((transition, index) => (
          <Card
            key={transition.transitionId}
            hoverable
            style={{ cursor: 'pointer' }}
            onClick={() => alert(`${transition.transitionName}の詳細（未実装）`)}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space align="center" wrap>
                <Title level={5} style={{ margin: 0, color: '#CF0027' }}>
                  {index + 1}. {transition.transitionName}
                </Title>
                {transition.category && (
                  <Tag color="blue">{transition.category}</Tag>
                )}
                {transition.estimatedDuration && (
                  <Tag icon={<ClockCircleOutlined />}>
                    {transition.estimatedDuration}
                  </Tag>
                )}
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ID: {transition.transitionId}
              </Text>
              {transition.description && (
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  {transition.description}
                </Paragraph>
              )}
            </Space>
          </Card>
        ))}
      </Space>
    </div>
  );
}

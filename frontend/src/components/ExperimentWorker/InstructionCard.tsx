import React from 'react';
import { Card, Tag, Space, Typography } from 'antd';
import type { Instruction } from '@/types/experimentWorker';
import {
  getPriorityColor,
  getPriorityLabel,
  getTypeLabel,
  formatRelativeTime,
} from '@/utils/instructionHelpers';
import { CalendarOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface InstructionCardProps {
  instruction: Instruction;
  isClient: boolean;
}

/**
 * 指示カードコンポーネント
 * 個別の作業指示を表示するカード
 */
export default function InstructionCard({
  instruction,
  isClient,
}: InstructionCardProps) {
  return (
    <Card
      style={{
        borderLeft: `4px solid ${getPriorityColor(instruction.priority)}`,
        backgroundColor: instruction.priority === 'high' ? '#fef2f2' : 'white',
      }}
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Space size="small" wrap>
          <Tag
            color={getPriorityColor(instruction.priority)}
            style={{ fontWeight: 'bold' }}
          >
            {getPriorityLabel(instruction.priority)}
          </Tag>
          <Tag>{getTypeLabel(instruction.instructionType)}</Tag>
        </Space>
        
        {instruction.transitionName && (
          <Tag icon={<span>🎯</span>} color="default">
            {instruction.transitionName}
          </Tag>
        )}
        
        {instruction.methodName && (
          <Tag icon={<span>🔧</span>} color="default">
            {instruction.methodName}
          </Tag>
        )}
        
        <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
          {instruction.content}
        </Paragraph>
        
        {isClient && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            <CalendarOutlined /> {formatRelativeTime(instruction.createdAt)}
          </Text>
        )}
      </Space>
    </Card>
  );
}

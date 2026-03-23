import React from 'react';
import { Card, Tag, Space, Typography, Flex } from 'antd';
import type { Instruction, ProjectStatus } from '@/types/experimentWorker';
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
  projectStatus: ProjectStatus | null;
  isClient: boolean;
}

/**
 * 指示カードコンポーネント
 * 個別の作業指示を表示するカード
 */
export default function InstructionCard({
  instruction,
  projectStatus,
  isClient,
}: InstructionCardProps) {
  // 現在InstructionCardには確認完了ボタンがないため、
  // projectStatusは将来の拡張に備えて受け取るのみ
  return (
    <Card
      data-testid={`instruction-card-${instruction.instructionId}`}
      style={{
        borderLeft: `4px solid ${getPriorityColor(instruction.priority)}`,
        backgroundColor: instruction.priority === 'high' ? '#fef2f2' : 'white',
      }}
      styles={{
        body: {
          padding: '8px',
        },
      }}
    >
      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
        {/* 優先度・タイプと日付を横並びに配置 */}
        <Flex justify="space-between" align="center">
          <Space size="small" wrap>
            <Tag
              data-testid={`instruction-card-priority-tag-${instruction.instructionId}`}
              color={getPriorityColor(instruction.priority)}
              style={{ fontWeight: 'bold' }}
            >
              {getPriorityLabel(instruction.priority)}
            </Tag>
            <Tag data-testid={`instruction-card-type-tag-${instruction.instructionId}`}>
              {getTypeLabel(instruction.instructionType)}
            </Tag>
          </Space>
          
          {isClient && (
            <Text
              data-testid={`instruction-card-date-${instruction.instructionId}`}
              type="secondary"
              style={{ fontSize: 12, whiteSpace: 'nowrap' }}
            >
              <CalendarOutlined /> {formatRelativeTime(instruction.createdAt)}
            </Text>
          )}
        </Flex>
        
        {/* 指示内容 */}
        <Paragraph
          data-testid={`instruction-card-content-${instruction.instructionId}`}
          style={{ marginTop: 8, marginBottom: 0 }}
        >
          {instruction.content}
        </Paragraph>
      </Space>
    </Card>
  );
}

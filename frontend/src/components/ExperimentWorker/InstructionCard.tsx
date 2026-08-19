import React from 'react';
import { Card, Space, Typography, Flex } from 'antd';
import type { Instruction, ProjectStatus } from '@/types/experimentWorker';
import {
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
      styles={{
        body: {
          padding: '8px',
        },
      }}
    >
      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
        {/* 日付 */}
        <Flex justify="flex-end" align="center">
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

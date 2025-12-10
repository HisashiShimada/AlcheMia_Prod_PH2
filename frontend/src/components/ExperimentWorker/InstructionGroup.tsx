import React from 'react';
import { Card, Button, Space, Typography, Empty } from 'antd';
import { CheckCircleOutlined, FileOutlined, ToolOutlined, AimOutlined } from '@ant-design/icons';
import type { Instruction } from '@/types/experimentWorker';
import InstructionCard from './InstructionCard';

const { Title } = Typography;

interface InstructionGroupProps {
  title: string;
  instructions: Instruction[];
  emoji: string;
  isClient: boolean;
}

// アイコンマッピング
const getIcon = (iconType: string) => {
  const iconStyle = { marginRight: 8 };
  switch (iconType) {
    case 'file':
      return <FileOutlined style={iconStyle} />;
    case 'tool':
      return <ToolOutlined style={iconStyle} />;
    case 'aim':
      return <AimOutlined style={iconStyle} />;
    default:
      return <FileOutlined style={iconStyle} />;
  }
};

/**
 * 指示グループコンポーネント
 * 全体指示、メソッド単位指示、トランジション単位指示をグループ表示
 */
export default function InstructionGroup({
  title,
  instructions: groupInstructions,
  emoji,
  isClient,
}: InstructionGroupProps) {
  // メッセージのマッピング
  const noDataMessages: Record<string, string> = {
    '全体指示': '実験全体への作業指示がありません',
    'メソッド単位指示': 'メソッドへの作業指示がありません',
    'トランジション単位指示': 'トランジションへの作業指示がありません',
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <Title level={4} style={{ marginBottom: 16 }}>
        {getIcon(emoji)}
        {title} ({groupInstructions.length}件)
      </Title>

      {groupInstructions.length === 0 ? (
        // データがない場合のメッセージ
        <Card>
          <Empty description={noDataMessages[title] || '作業指示がありません'} />
        </Card>
      ) : (
        <>
          {/* データがある場合の表示 */}
          <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
            {groupInstructions.map((instruction) => (
              <InstructionCard
                key={instruction.instructionId}
                instruction={instruction}
                isClient={isClient}
              />
            ))}
          </Space>

          {/* 確認完了ボタン（データがある場合のみ表示） */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <Button
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              onClick={() => alert(`${title}の確認完了（モック）`)}
              style={{ minWidth: 250, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              {title}の確認完了
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Card, Space, Tag, Typography, Empty, message } from 'antd';
import { ClockCircleOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Transition, ExperimentDataValue } from '@/types/experimentWorker';
import DataRecordDialog from './DataRecordDialog';

const { Title, Text, Paragraph } = Typography;

interface TransitionListProps {
  transitions: Transition[];
  methodName?: string;
  selectedTaskId?: string;
  onTaskCreated?: (taskId: string) => void;
}

/**
 * トランジション一覧表示コンポーネント
 * 選択されたメソッドに含まれるトランジションを一覧表示
 * トランジションクリック時に実験データ記録ダイアログを表示
 */
export default function TransitionList({
  transitions,
  methodName,
}: TransitionListProps) {
  const [selectedTransition, setSelectedTransition] = useState<Transition | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // トランジションをクリックしてダイアログを開く
  const handleTransitionClick = (transition: Transition) => {
    setSelectedTransition(transition);
    setDialogOpen(true);
  };

  // ダイアログを閉じる
  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedTransition(null);
  };

  // データ保存ハンドラ
  const handleDataSave = (data: ExperimentDataValue[]) => {
    console.log('保存されたデータ:', data);
    // TODO: バックエンドAPIへの保存処理を実装
    message.success('実験データを保存しました');
  };

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
    <>
      <div>
        <Title level={4} style={{ marginBottom: 16 }}>
          <UnorderedListOutlined style={{ marginRight: 8 }} />
          トランジション一覧
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
              onClick={() => handleTransitionClick(transition)}
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
                  {transition.templates && transition.templates.length > 0 && (
                    <Tag color="purple">
                      テンプレート: {transition.templates.length}件
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

      {/* データ記録ダイアログ */}
      <DataRecordDialog
        open={dialogOpen}
        transition={selectedTransition}
        onClose={handleDialogClose}
        onSave={handleDataSave}
      />
    </>
  );
}

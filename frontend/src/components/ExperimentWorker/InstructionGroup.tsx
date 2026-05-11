import React, { useState } from 'react';
import { Card, Button, Space, Typography, Empty, theme } from 'antd';
import { CheckCircleOutlined, ToolOutlined, AimOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import type { Instruction, ProjectStatus } from '@/types/experimentWorker';
import { InstructionType, InstructionEmptyMessageKey } from '@/constants/instructionType';
import InstructionCard from './InstructionCard';

const { Title } = Typography;

interface InstructionGroupProps {
  title: string;
  instructions: Instruction[];
  emoji: string;
  projectStatus: ProjectStatus | null;
  isClient: boolean;
  onConfirmInstructions?: (instructions: Instruction[]) => void;
  confirmLoading?: boolean;
}

/**
 * 指示グループコンポーネント
 * 全体指示、メソッド単位指示、トランジション単位指示をグループ表示
 */
export default function InstructionGroup({
  title,
  instructions: groupInstructions,
  emoji,
  projectStatus,
  isClient,
  onConfirmInstructions,
  confirmLoading,
}: InstructionGroupProps) {
  const { token } = theme.useToken();

  // 各メソッド/トランジションの展開状態を管理
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // 項目の展開/折りたたみを切り替え
  const toggleItem = (itemKey: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }));
  };

  // メッセージのマッピング（InstructionEmptyMessage を使用、不足分はフォールバック）
  const noDataMessages: Record<string, string> = {
    ...InstructionEmptyMessageKey,
    [InstructionType.TRANSITION_UNIT_INSTRUCTION]: 'トランジションへの作業指示がありません',
    [InstructionType.METHOD_UNIT_INSTRUCTION]: 'メソッドへの作業指示がありません',
  };

  // メソッド単位指示の場合、メソッドごとにグループ化
  const groupByMethod = () => {
    const groups: Record<string, Instruction[]> = {};
    groupInstructions.forEach((instruction) => {
      const key = instruction.methodId || 'unknown';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(instruction);
    });
    return groups;
  };

  // タスク単位指示の場合、タスクごとにグループ化
  const groupByTask = () => {
    const groups: Record<string, Instruction[]> = {};
    groupInstructions.forEach((instruction) => {
      const key = instruction.taskId || 'unknown';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(instruction);
    });
    return groups;
  };

  // トランジション単位指示の場合、トランジションごとにグループ化
  const groupByTransition = () => {
    const groups: Record<string, Instruction[]> = {};
    groupInstructions.forEach((instruction) => {
      const key = instruction.transitionId || 'unknown';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(instruction);
    });
    return groups;
  };

  // プロジェクト指示の場合（カードなしで表示）
  if (emoji === 'file') {
    return (
      <div data-testid="instruction-group-file" style={{ marginBottom: 32 }}>
        {groupInstructions.length === 0 ? (
          <Card>
            <Empty description={noDataMessages[title] || '作業指示がありません'} />
          </Card>
        ) : (
          <Space orientation="vertical" size={8} style={{ width: '100%' }}>
            {groupInstructions.map((instruction) => (
              <InstructionCard
                key={instruction.instructionId}
                instruction={instruction}
                projectStatus={projectStatus}
                isClient={isClient}
              />
            ))}
          </Space>
        )}
      </div>
    );
  }

  // タスク指示の場合
  if (emoji === 'checkSquare') {
    const taskGroups = groupByTask();
    const taskIds = Object.keys(taskGroups);

    if (taskIds.length === 0) {
      return (
        <div data-testid="instruction-group-task-empty" style={{ marginBottom: 32 }}>
          <Card>
            <Empty description={noDataMessages[title] || '作業指示がありません'} />
          </Card>
        </div>
      );
    }

    return (
      <div data-testid="instruction-group-task" style={{ marginBottom: 32 }}>
        <Space orientation="vertical" size={8} style={{ width: '100%' }}>
          {taskIds.map((taskId) => {
            const taskInstructions = taskGroups[taskId];
            const taskName = taskInstructions[0]?.taskName || `タスク ${taskId}`;
            const isExpanded = expandedItems[taskId] !== false; // デフォルトで展開

            return (
              <Card
                key={taskId}
                data-testid={`instruction-task-item-${taskId}`}
                style={{
                  borderRadius: token.borderRadius,
                  backgroundColor: token.colorBgContainer,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  margin: '8px 0',
                }}
                styles={{
                  body: {
                    padding: '8px',
                  },
                }}
              >
                {/* タイトル行（タスク名と確認完了ボタン） */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px',
                    margin: '-8px',
                    borderRadius: token.borderRadiusSM,
                  }}
                >
                  {/* 展開/折りたたみアイコンとタイトル */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flex: 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleItem(taskId)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = token.colorFillSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {isExpanded ? <DownOutlined style={{ marginRight: 8, fontSize: 12 }} /> : <RightOutlined style={{ marginRight: 8, fontSize: 12 }} />}
                    <Title level={5} style={{ margin: 0, flex: 1 }}>
                      <ToolOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
                      {taskName} ({taskInstructions.length}件)
                    </Title>
                  </div>
                  
                  {/* 確認完了ボタン（展開時のみ表示） */}
                  {isExpanded && onConfirmInstructions && (
                    <Button
                      data-testid={`instruction-task-confirm-button-${taskId}`}
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onConfirmInstructions(taskInstructions);
                      }}
                      loading={confirmLoading}
                      disabled={
                        confirmLoading || 
                        taskInstructions.every((i) => i.isAcknowledged)
                      }
                      style={{ 
                        backgroundColor: token.colorSuccess, 
                        borderColor: token.colorSuccess 
                      }}
                    >
                      確認完了
                    </Button>
                  )}
                </div>

                {/* 展開時のみ指示カードを表示 */}
                {isExpanded && (
                  <Space orientation="vertical" size={8} style={{ width: '100%', marginTop: 8 }}>
                    {taskInstructions.map((instruction) => (
                      <InstructionCard
                        key={instruction.instructionId}
                        instruction={instruction}
                        projectStatus={projectStatus}
                        isClient={isClient}
                      />
                    ))}
                  </Space>
                )}
              </Card>
            );
          })}
        </Space>
      </div>
    );
  }

  // メソッド単位指示の場合
  if (emoji === 'branches') {
    const methodGroups = groupByMethod();
    const methodIds = Object.keys(methodGroups);

    if (methodIds.length === 0) {
      return (
        <div style={{ marginBottom: 32 }}>
          <Card>
            <Empty description={noDataMessages[title] || '作業指示がありません'} />
          </Card>
        </div>
      );
    }

    return (
      <div style={{ marginBottom: 32 }}>
        <Space orientation="vertical" size={8} style={{ width: '100%' }}>
          {methodIds.map((methodId) => {
            const methodInstructions = methodGroups[methodId];
            const methodName = methodInstructions[0]?.methodName || `メソッド ${methodId}`;
            const isExpanded = expandedItems[methodId] !== false; // デフォルトで展開

            return (
              <Card
                key={methodId}
                style={{
                  borderRadius: token.borderRadius,
                  backgroundColor: token.colorBgContainer,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  margin: '8px 0',
                }}
                styles={{
                  body: {
                    padding: '8px',
                  },
                }}
              >
                {/* タイトル行（メソッド名と確認完了ボタン） */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px',
                    margin: '-8px',
                    borderRadius: token.borderRadiusSM,
                  }}
                >
                  {/* 展開/折りたたみアイコンとタイトル */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flex: 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleItem(methodId)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = token.colorFillSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {isExpanded ? <DownOutlined style={{ marginRight: 8, fontSize: 12 }} /> : <RightOutlined style={{ marginRight: 8, fontSize: 12 }} />}
                    <Title level={5} style={{ margin: 0, flex: 1 }}>
                      <ToolOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
                      {methodName} ({methodInstructions.length}件)
                    </Title>
                  </div>
                  
                  {/* 確認完了ボタン（展開時のみ表示） */}
                  {isExpanded && onConfirmInstructions && (
                    <Button
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onConfirmInstructions(methodInstructions);
                      }}
                      loading={confirmLoading}
                      disabled={
                        confirmLoading || 
                        methodInstructions.every((i) => i.isAcknowledged)
                      }
                      style={{ 
                        backgroundColor: token.colorSuccess, 
                        borderColor: token.colorSuccess 
                      }}
                    >
                      確認完了
                    </Button>
                  )}
                </div>

                {/* 展開時のみ指示カードを表示 */}
                {isExpanded && (
                  <Space orientation="vertical" size={8} style={{ width: '100%', marginTop: 8 }}>
                    {methodInstructions.map((instruction) => (
                      <InstructionCard
                        key={instruction.instructionId}
                        instruction={instruction}
                        projectStatus={projectStatus}
                        isClient={isClient}
                      />
                    ))}
                  </Space>
                )}
              </Card>
            );
          })}
        </Space>
      </div>
    );
  }

  // トランジション単位指示の場合
  if (emoji === 'aim') {
    const transitionGroups = groupByTransition();
    const transitionIds = Object.keys(transitionGroups);

    if (transitionIds.length === 0) {
      return (
        <div style={{ marginBottom: 32 }}>
          <Card>
            <Empty description={noDataMessages[title] || '作業指示がありません'} />
          </Card>
        </div>
      );
    }

    return (
      <div data-testid="instruction-group-transition" style={{ marginBottom: 32 }}>
        <Space orientation="vertical" size={8} style={{ width: '100%' }}>
          {transitionIds.map((transitionId) => {
            const transitionInstructions = transitionGroups[transitionId];
            const transitionName = transitionInstructions[0]?.transitionName || `トランジション ${transitionId}`;
            const isExpanded = expandedItems[transitionId] !== false; // デフォルトで展開

            return (
              <Card
                key={transitionId}
                data-testid={`instruction-transition-item-${transitionId}`}
                style={{
                  borderRadius: token.borderRadius,
                  backgroundColor: token.colorBgContainer,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  margin: '8px 0',
                }}
                styles={{
                  body: {
                    padding: '8px',
                  },
                }}
              >
                {/* タイトル行（トランジション名と確認完了ボタン） */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px',
                    margin: '-8px',
                    borderRadius: token.borderRadiusSM,
                  }}
                >
                  {/* 展開/折りたたみアイコンとタイトル */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flex: 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleItem(transitionId)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = token.colorFillSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {isExpanded ? <DownOutlined style={{ marginRight: 8, fontSize: 12 }} /> : <RightOutlined style={{ marginRight: 8, fontSize: 12 }} />}
                    <Title level={5} style={{ margin: 0, flex: 1 }}>
                      <AimOutlined style={{ marginRight: 8, color: token.colorInfo }} />
                      {transitionName} ({transitionInstructions.length}件)
                    </Title>
                  </div>
                  
                  {/* 確認完了ボタン（展開時のみ表示） */}
                  {isExpanded && onConfirmInstructions && (
                    <Button
                      data-testid={`instruction-transition-confirm-button-${transitionId}`}
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onConfirmInstructions(transitionInstructions);
                      }}
                      loading={confirmLoading}
                      disabled={
                        confirmLoading || 
                        transitionInstructions.every((i) => i.isAcknowledged)
                      }
                      style={{ 
                        backgroundColor: token.colorSuccess, 
                        borderColor: token.colorSuccess 
                      }}
                    >
                      確認完了
                    </Button>
                  )}
                </div>

                {/* 展開時のみ指示カードを表示 */}
                {isExpanded && (
                  <Space orientation="vertical" size={8} style={{ width: '100%', marginTop: 8 }}>
                    {transitionInstructions.map((instruction) => (
                      <InstructionCard
                        key={instruction.instructionId}
                        instruction={instruction}
                        projectStatus={projectStatus}
                        isClient={isClient}
                      />
                    ))}
                  </Space>
                )}
              </Card>
            );
          })}
        </Space>
      </div>
    );
  }

  // その他のケース（念のため）
  return (
    <div style={{ marginBottom: 32 }}>
      <Card>
        <Empty description={noDataMessages[title] || '作業指示がありません'} />
      </Card>
    </div>
  );
}
